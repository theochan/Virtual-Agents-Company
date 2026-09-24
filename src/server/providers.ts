import { readJson } from './http';
import { z } from 'zod';
import type { Agent } from '../types';
import { HttpError, validateEndpoint } from './security';

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type ProviderConfig = { allowFinal?: boolean; requiredTool?: string; provider: string; model: string; endpoint: string; temperature: number; maxTokens: number };
export type ProviderSettings = Record<string, { defaultModel: string; endpoint: string; enabled: boolean; downloadedModels: string[] }>;
const defaults: Record<string, string> = {
  ollama: process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434',
  huggingface: process.env.HF_LOCAL_ENDPOINT || 'http://127.0.0.1:8000/v1',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
};
const keyNames: Record<string, string> = { openai: 'OPENAI_API_KEY', claude: 'ANTHROPIC_API_KEY', huggingface: 'HF_TOKEN', qwen: 'DASHSCOPE_API_KEY' };
export const defaultSettings: ProviderSettings = Object.fromEntries(Object.entries(defaults).map(([provider, endpoint]) => [provider, {
  endpoint, enabled: true, downloadedModels: [], defaultModel: '',
}]));
export function allowedEndpoints(provider: string) {
  return [defaults[provider], ...(process.env[`VAC_${provider.toUpperCase()}_ENDPOINTS`] || '').split(',').filter(Boolean)].filter(Boolean);
}
export function providerKey(provider: string) { return process.env[keyNames[provider]] || ''; }
export function setProviderKey(provider: string, key: string) {
  if (!keyNames[provider]) throw new HttpError(400, 'Provider does not accept a key');
  process.env[keyNames[provider]] = key;
}
export function resolveProvider(agent: Agent, settings: ProviderSettings): ProviderConfig {
  const config = agent.llmConfig;
  let model = config.model;
  let provider = String(config.provider).toLowerCase();
  if (provider === 'anthropic') provider = 'claude';
  for (const [prefix, name] of Object.entries({ 'ollama:': 'ollama', 'hf:': 'huggingface' })) {
    if (model.startsWith(prefix)) { provider = name; model = model.slice(prefix.length); }
  }
  if (provider === 'local' && config.localSource) provider = config.localSource;
  const setting = settings[provider];
  if (!Object.hasOwn(defaults, provider) || !setting || !setting.enabled) throw new HttpError(422, 'Provider is unsupported or disabled');
  const endpoint = validateEndpoint(config.localEndpoint || setting.endpoint, allowedEndpoints(provider));
  if (!model) throw new HttpError(422, 'Choose a model');
  return { provider, model, endpoint, temperature: Math.max(0, Math.min(1, config.temperature ?? 0.2)), maxTokens: Math.max(128, Math.min(2048, config.maxTokens || 2048)) };
}
export const decisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('final'), reply: z.string().min(1).max(20000) }).strict(),
  z.object({ action: z.literal('tool'), toolId: z.string().max(100), parameters: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ action: z.literal('blocked'), reason: z.string().min(1).max(4000) }).strict(),
]);
export type Decision = z.infer<typeof decisionSchema>;

export function decisionFormat(tools?: { id: string; schema?: unknown }[], allowFinal = true, requiredTool?: string) {
  if (requiredTool && !tools?.some(t => t.id === requiredTool)) throw new Error('Required tool is not available');
  if (requiredTool) return { anyOf: tools!.filter(t => t.id === requiredTool).map(tool => ({ type: 'object', properties: { action: { const: 'tool' }, toolId: { const: tool.id }, parameters: tool.schema }, required: ['action', 'toolId', 'parameters'], additionalProperties: false })) };
  if (!tools) return z.toJSONSchema(decisionSchema);
  return { anyOf: [
    ...(allowFinal ? [z.toJSONSchema(decisionSchema.options[0])] : []), z.toJSONSchema(decisionSchema.options[2]),
    ...tools.map(tool => ({ type: 'object', properties: { action: { const: 'tool' }, toolId: { const: tool.id }, parameters: tool.schema }, required: ['action', 'toolId', 'parameters'], additionalProperties: false })),
  ] };
}

export const INFERENCE_TIMEOUT_SCHEMA = z.coerce.number().int().min(5000).max(900000);
export const INFERENCE_TIMEOUT_MS = (() => {
  const val = process.env.LLM_TIMEOUT_MS;
  if (!val) return 300000;
  const parsed = INFERENCE_TIMEOUT_SCHEMA.safeParse(val);
  if (!parsed.success) throw new Error('Invalid LLM_TIMEOUT_MS: must be an integer between 5000 and 900000 ms');
  return parsed.data;
})();

export function searchKey(provider: 'tavily' | 'brave'): string {
  if (provider === 'tavily') return process.env.TAVILY_API_KEY || '';
  if (provider === 'brave') return process.env.BRAVE_SEARCH_API_KEY || '';
  return '';
}

export function setSearchKey(provider: 'tavily' | 'brave', key: string) {
  if (provider === 'tavily') process.env.TAVILY_API_KEY = key.trim();
  if (provider === 'brave') process.env.BRAVE_SEARCH_API_KEY = key.trim();
}

async function inferRequest(config: ProviderConfig, messages: Message[], signal: AbortSignal, tools?: { id: string; schema?: unknown }[]) {
  const { provider, endpoint, model } = config;
  const format = decisionFormat(tools, config.allowFinal, config.requiredTool);
  if (!Object.hasOwn(defaults, provider)) throw new Error('Provider is unsupported; select a supported model before running');
  validateEndpoint(endpoint, allowedEndpoints(provider));
  const key = providerKey(provider);
  if (['openai', 'claude', 'qwen'].includes(provider) && process.env.VAC_ALLOW_PAID_INFERENCE !== '1') throw new Error('Paid inference is disabled. Configure provider-side spending limits and explicitly set VAC_ALLOW_PAID_INFERENCE=1 to enable it');
  if (['openai', 'claude', 'qwen'].includes(provider) && (!key || key.startsWith('your_'))) throw new Error('Provider API key is not configured');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = `${endpoint}/chat/completions`;
  let body: any = { model, messages, temperature: config.temperature, max_tokens: config.maxTokens };
  if (provider === 'claude') {
    url = `${endpoint}/messages`;
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    body = { ...body, system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n'), messages: messages.filter(m => m.role !== 'system') };
  } else if (provider === 'ollama') {
    url = `${endpoint}/api/chat`;
    body = { model, messages, stream: false, think: false, format, options: { temperature: config.temperature, num_predict: config.maxTokens, num_ctx: 16384 } };
  } else if (key) headers.Authorization = `Bearer ${key}`;
  const started = Date.now();
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(INFERENCE_TIMEOUT_MS)]) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  const data: any = await readJson(response);
  const content = provider === 'claude' ? data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
    : provider === 'ollama' ? data.message?.content : data.choices?.[0]?.message?.content;
  const rawInput = provider === 'ollama' ? data.prompt_eval_count : data.usage?.input_tokens ?? data.usage?.prompt_tokens;
  const rawOutput = provider === 'ollama' ? data.eval_count : data.usage?.output_tokens ?? data.usage?.completion_tokens;
  const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
  const receipt = { provider, model, returnedModel: typeof data.model === 'string' ? data.model : null, responseId: typeof data.id === 'string' ? data.id : null, latencyMs: Date.now() - started, inputTokens: count(rawInput), outputTokens: count(rawOutput), cost: null, inferenceLocation: 'provider-dependent' };
  try {
    if (typeof content !== 'string' || content.length > 30000) throw new Error('Provider returned missing or oversized output');
    const decision = decisionSchema.parse(JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
    if (config.requiredTool && (decision.action !== 'tool' || decision.toolId !== config.requiredTool)) throw new Error('Required structured tool response missing');
    return { decision, receipt };
  } catch {
    throw Object.assign(new Error('Provider did not return a valid decision; no work was marked complete'), { receipt: { ...receipt, status: 'failed' } });
  }
}

export async function discover(provider: string, endpoint: string) {
  validateEndpoint(endpoint, allowedEndpoints(provider));
  if (provider === 'claude') throw new HttpError(422, 'Use a real run to check Anthropic inference');
  const key = providerKey(provider);
  const response = await fetch(`${endpoint}${provider === 'ollama' ? '/api/tags' : '/models'}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {}, redirect: 'error', signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Model discovery returned HTTP ${response.status}`);
  const data: any = await readJson(response);
  const models = provider === 'ollama' ? data.models?.map((m: any) => m.name) : data.data?.map((m: any) => m.id);
  if (!Array.isArray(models) || !models.every(m => typeof m === 'string')) throw new Error('Invalid model catalog');
  return models.slice(0, 200);
}

// Shared by manual runs and swarm nodes. No independent path can bypass the local model ceiling.
let localActive = 0;
const localWaiters: Array<() => void> = [];
export function localInferenceLimit() {
  const limit = Number(process.env.VAC_OLLAMA_CONCURRENCY || 2);
  if (!Number.isInteger(limit) || limit < 1 || limit > 4) throw new Error('VAC_OLLAMA_CONCURRENCY must be 1..4');
  return limit;
}
async function acquireLocal(signal: AbortSignal) {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const start = () => { signal.removeEventListener('abort', abort); localActive++; resolve(); };
    const abort = () => { const i = localWaiters.indexOf(start); if (i >= 0) localWaiters.splice(i, 1); reject(signal.reason); };
    if (localActive < localInferenceLimit()) start();
    else { localWaiters.push(start); signal.addEventListener('abort', abort, { once: true }); }
  });
  return () => { localActive--; localWaiters.shift()?.(); };
}
export async function infer(config: ProviderConfig, messages: Message[], signal: AbortSignal, tools?: { id: string; schema?: unknown }[]) {
  const release = config.provider === 'ollama' ? await acquireLocal(signal) : () => {};
  try { signal.throwIfAborted(); return await inferRequest(config, messages, signal, tools); }
  finally { release(); }
}
