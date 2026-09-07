import { delegationSchema, DELEGATE_TOOL } from './delegation';
import { reserveRequest } from './operations';
import { readJson } from './http';
import { z } from 'zod';
import type { Agent, Artifact, Project, Tool } from '../types';
import { HttpError, hash, now } from './security';
import { Store } from './store';
import { searchKey } from './providers';

export type SearchResultItem = {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  score?: number;
  pageDate?: string;
};

export type SearchOutput = {
  originalQuery: string;
  executedQuery: string;
  provider: 'tavily' | 'brave' | 'duckduckgo';
  retrievedAt: string;
  found: boolean;
  coverage: 'partial' | 'none';
  attempts?: { provider: string; query: string; status: 'results' | 'empty' | 'failed'; error?: string }[];
  results: SearchResultItem[];
  guidance?: string;
  error?: string;
};

const sourceUrl = z.string().url().refine(value => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}, 'Invalid source URL');
const tavilyResponse = z.object({ query: z.string().optional(), results: z.array(z.object({
  title: z.string(), url: sourceUrl, content: z.string(), published_date: z.string().optional(), score: z.number().finite().optional(),
})) });
const braveResponse = z.object({ query: z.object({ altered: z.string().optional() }).optional(), web: z.object({ results: z.array(z.object({
  title: z.string(), url: sourceUrl, description: z.string(), page_age: z.string().optional(),
})) }).optional() });
const searchGuidance = 'Search snippets are partial evidence, not verified page contents or live market quotes. Verify relevance and freshness; missing dates are unknown.';

export async function fetchTavily(query: string, apiKey: string, signal: AbortSignal, fetchFn = fetch): Promise<SearchOutput> {
  const url = 'https://api.tavily.com/search';
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    redirect: 'error',
    body: JSON.stringify({ query, search_depth: 'basic', max_results: 5, include_answer: false }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!res.ok) throw new Error(`Tavily search returned HTTP ${res.status}`);
  const data = tavilyResponse.parse(await readJson(res));
  const results: SearchResultItem[] = data.results.slice(0, 5).map((r: any) => ({
    title: r.title.slice(0, 300),
    url: String(r.url || ''),
    snippet: r.content.slice(0, 2000),
    publishedDate: r.published_date ? String(r.published_date) : undefined,
    score: typeof r.score === 'number' ? r.score : undefined,
  }));
  const found = results.length > 0;
  return {
    originalQuery: query,
    executedQuery: data.query || query,
    provider: 'tavily',
    retrievedAt: now(),
    found,
    coverage: found ? 'partial' : 'none',
    results,
    guidance: found ? searchGuidance : 'No web search results were found for the executed query.',
  };
}

export async function fetchBrave(query: string, apiKey: string, signal: AbortSignal, fetchFn = fetch): Promise<SearchOutput> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  const res = await fetchFn(url, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
  });
  if (!res.ok) throw new Error(`Brave search returned HTTP ${res.status}`);
  const data = braveResponse.parse(await readJson(res));
  const results: SearchResultItem[] = (data.web?.results || []).slice(0, 5).map((r: any) => ({
    title: r.title.replace(/<[^>]+>/g, '').slice(0, 300),
    url: String(r.url || ''),
    snippet: r.description.replace(/<[^>]+>/g, '').slice(0, 2000),
    pageDate: r.page_age || undefined,
  }));
  const found = results.length > 0;
  return {
    originalQuery: query,
    executedQuery: data.query?.altered || query,
    provider: 'brave',
    retrievedAt: now(),
    found,
    coverage: found ? 'partial' : 'none',
    results,
    guidance: found ? searchGuidance : 'No web search results were found for the executed query.',
  };
}

export async function fetchDuckDuckGo(query: string, signal: AbortSignal, fetchFn = fetch): Promise<SearchOutput> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetchFn(url, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
  if (!res.ok) throw new Error(`DuckDuckGo lookup returned HTTP ${res.status}`);
  let data: any = await readJson(res);
  let executedQuery = query;
  const attempts: NonNullable<SearchOutput['attempts']> = [{ provider: 'duckduckgo', query, status: data.AbstractText && data.AbstractURL ? 'results' : 'empty' }];
  if ((!data.AbstractText || !data.AbstractURL) && query.length > 10) {
    const simplified = query.replace(/\b(share price|stock price|stock|stocks|shares|investment assessment|investing|worth|price|check|if|it|is|good|to|in|right now|current|latest|news|and|or|about|for)\b/gi, ' ').replace(/\s+/g, ' ').trim();
    if (simplified && simplified.toLowerCase() !== query.toLowerCase()) {
      const fallbackUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(simplified)}&format=json&no_html=1&skip_disambig=1`;
      executedQuery = simplified;
      const fallbackRes = await fetchFn(fallbackUrl, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
      attempts.push({ provider: 'duckduckgo', query: simplified, status: fallbackRes.ok ? 'empty' : 'failed', ...(!fallbackRes.ok ? { error: `HTTP ${fallbackRes.status}` } : {}) });
      if (fallbackRes.ok) {
        const fallbackData: any = await readJson(fallbackRes);
        if (fallbackData.AbstractText && fallbackData.AbstractURL) {
          attempts[attempts.length - 1].status = 'results';
          data = fallbackData;
          executedQuery = simplified;
        }
      }
    }
  }
  const hasFinancialIntent = /\b(stock|stocks|share|shares|price|prices|ticker|invest|investing|investment|quote|quotes|market cap|valuation|trading)\b/i.test(query);
  const guidance = hasFinancialIntent
    ? 'DuckDuckGo instant-answer only provides static encyclopedia summaries. Live market stock prices and ticker quotes are not available via this encyclopedia lookup. Report missing evidence; do not infer current valuation or prices from an encyclopedia summary.'
    : undefined;
  if (!data.AbstractText || !data.AbstractURL) {
    return {
      originalQuery: query,
      executedQuery,
      provider: 'duckduckgo',
      attempts,
      retrievedAt: now(),
      found: false,
      coverage: 'none',
      results: [],
      guidance: guidance || 'No encyclopedia instant-answer found on DuckDuckGo for this query.',
    };
  }
  return {
    originalQuery: query,
    executedQuery,
    provider: 'duckduckgo',
    attempts,
    retrievedAt: now(),
    found: true,
    coverage: 'partial',
    results: [
      {
        title: String(data.Heading || executedQuery),
        url: sourceUrl.parse(data.AbstractURL),
        snippet: String(data.AbstractText).slice(0, 4000),
      }
    ],
    guidance,
  };
}

export async function executeSearch(query: string, store: Store, signal: AbortSignal, fetchFn = fetch): Promise<SearchOutput> {
  const searchSettings = store.get<any>('settings', 'search') || {};
  const activePref = searchSettings.activeProvider || 'auto';
  const tavilyKey = searchKey('tavily');
  const braveKey = searchKey('brave');

  signal.throwIfAborted();
  const attempts: NonNullable<SearchOutput['attempts']> = [];
  const providersToTry: ('tavily' | 'brave' | 'duckduckgo')[] = activePref === 'auto'
    ? [...(tavilyKey ? ['tavily' as const] : []), ...(braveKey ? ['brave' as const] : []), 'duckduckgo']
    : [z.enum(['tavily', 'brave', 'duckduckgo']).parse(activePref)];
  for (const provider of providersToTry) {
    signal.throwIfAborted();
    try {
      if (provider !== 'duckduckgo' && !searchKey(provider)) throw new Error(`${provider} API key is not configured`);
      if (provider !== 'duckduckgo') reserveRequest(store, 'search');
      const output = provider === 'tavily' ? await fetchTavily(query, tavilyKey, signal, fetchFn)
        : provider === 'brave' ? await fetchBrave(query, braveKey, signal, fetchFn)
        : await fetchDuckDuckGo(query, signal, fetchFn);
      signal.throwIfAborted();
      return { ...output, attempts: [...attempts, ...(output.attempts || [{ provider, query: output.executedQuery, status: output.found ? 'results' as const : 'empty' as const }])] };
    } catch (error) {
      signal.throwIfAborted();
      // Never retain raw provider bodies or schema values, which can contain secrets.
      const message = error instanceof Error && /^((Tavily search|Brave search|DuckDuckGo lookup) returned HTTP \d{3}|search daily request budget exhausted.*)$/.test(error.message)
        ? error.message : `${provider} search failed (configuration, network, or invalid response)`;
      attempts.push({ provider, query, status: 'failed', error: message });
      if (activePref !== 'auto' || provider === 'duckduckgo') {
        return { originalQuery: query, executedQuery: query, provider, retrievedAt: now(), found: false, coverage: 'none', results: [], attempts, error: message, guidance: 'Search failed; no research evidence was retrieved.' };
      }
    }
  }
  throw new Error('No search provider selected');
}

const projectSchema = z.object({}).strict();
const documentSchema = z.object({ title: z.string().min(1).max(200), content: z.string().min(1).max(20000) }).strict();
const calculatorSchema = z.object({ operation: z.enum(['add', 'subtract', 'multiply', 'divide']), a: z.number().finite(), b: z.number().finite() }).strict();
const searchSchema = z.object({ query: z.string().min(1).max(500) }).strict();
const definitions = [
  { id: DELEGATE_TOOL, name: 'Delegate read-only subtask', permission: 'READ', requiresApproval: false, description: 'Ask an authorized direct subordinate for a bounded read-only subtask in this project. The parent waits and receives child evidence. Maximum two children, one level; no writes or further delegation.', schema: delegationSchema },
  { id: 'tool-read-project', name: 'Read current project', permission: 'READ', requiresApproval: false, description: 'Read the run’s assigned project and its saved artifacts only.', schema: projectSchema },
  { id: 'tool-calculator', name: 'Calculator', permission: 'READ', requiresApproval: false, description: 'Arithmetic on two finite numbers. No code execution.', schema: calculatorSchema },
  { id: 'tool-web-search', name: 'Web search', permission: 'READ', requiresApproval: false, description: 'Retrieve bounded web snippets using configured Tavily or Brave search, or limited DuckDuckGo encyclopedia summaries. Not a live market data feed; results require verification. Inspect found, error, coverage and attempts before claiming research succeeded.', schema: searchSchema },
  { id: 'tool-doc-gen', name: 'Save draft document', permission: 'WRITE', requiresApproval: true, description: 'Save supplied Markdown as a draft artifact in this project. Requires owner approval. Does not edit host files.', schema: documentSchema },
] as const;
export const TOOL_VERSION = '1';
export const toolCatalog: Tool[] = definitions.map(d => ({ ...d, category: 'Built-in', schema: z.toJSONSchema(d.schema), description: `${d.description} Registry version ${TOOL_VERSION}.` }));
export function validateTool(agent: Agent, toolId: string, parameters: unknown) {
  const def = definitions.find(d => d.id === toolId);
  if (!def) throw new HttpError(403, 'Tool is disabled or not in the server registry; host scripts are not supported');
  if (!agent || !(agent.toolIds || []).includes(toolId) || agent.autonomyLevel < 3) throw new HttpError(403, 'Agent does not have permission to execute this tool');
  return { definition: def, parameters: def.schema.parse(parameters) };
}

export async function executeTool(store: Store, agent: Agent, project: Project, toolId: string, parameters: unknown, callId: string, signal: AbortSignal) {
  if (toolId === DELEGATE_TOOL) throw new HttpError(403, 'Delegation must use the durable run scheduler');
  const { parameters: args } = validateTool(agent, toolId, parameters);
  signal.throwIfAborted();
  // Durable receipts make internal writes idempotent. No arbitrary host or external writes exist.
  const previous = store.get<any>('tool-results', callId);
  if (previous) return previous;
  let output: unknown;
  if (toolId === 'tool-read-project') {
    output = { project, artifacts: store.all<Artifact>('artifacts').filter(a => a.projectId === project.id && a.workspaceId === project.workspaceId).slice(-10) };
  } else if (toolId === 'tool-calculator') {
    const { a, b, operation } = calculatorSchema.parse(args);
    if (operation === 'divide' && b === 0) throw new Error('Division by zero');
    const result = operation === 'add' ? a + b : operation === 'subtract' ? a - b : operation === 'multiply' ? a * b : a / b;
    if (!Number.isFinite(result)) throw new Error('Arithmetic overflow');
    output = { result };
  } else if (toolId === 'tool-doc-gen') {
    const { title, content } = documentSchema.parse(args);
    const artifact = { id: `artifact-${callId}`, workspaceId: project.workspaceId, projectId: project.id, taskId: callId.split(':')[0], createdByAgentId: agent.id, title, content, filename: `${callId.replace(/[^a-zA-Z0-9-]/g, '_')}.md`, type: 'markdown', version: 1, createdAt: now(), updatedAt: now(), contentHash: hash(content), validation: 'draft; owner approved saving, not accuracy' };
    output = { artifactId: artifact.id, title, validation: artifact.validation };
    return store.transaction(() => {
      store.put('artifacts', artifact.id, artifact);
      const result = { status: 'succeeded', toolId, version: TOOL_VERSION, callId, output, timestamp: now() };
      store.put('tool-results', callId, result);
      return result;
    });
  } else {
    const { query } = searchSchema.parse(args);
    output = await executeSearch(query, store, signal);
  }
  const result = { status: (output as SearchOutput)?.error ? 'failed' : 'succeeded', toolId, version: TOOL_VERSION, callId, input: args, output, timestamp: now() };
  store.put('tool-results', callId, result);
  return result;
}
