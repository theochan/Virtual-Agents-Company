import { readJson } from './http';
import { z } from 'zod';
import type { Agent, Artifact, Project, Tool } from '../types';
import { HttpError, hash, now } from './security';
import { Store } from './store';

const projectSchema = z.object({}).strict();
const documentSchema = z.object({ title: z.string().min(1).max(200), content: z.string().min(1).max(20000) }).strict();
const calculatorSchema = z.object({ operation: z.enum(['add', 'subtract', 'multiply', 'divide']), a: z.number().finite(), b: z.number().finite() }).strict();
const searchSchema = z.object({ query: z.string().min(1).max(500) }).strict();
const definitions = [
  { id: 'tool-read-project', name: 'Read current project', permission: 'READ', requiresApproval: false, description: 'Read the run’s assigned project and its saved artifacts only.', schema: projectSchema },
  { id: 'tool-calculator', name: 'Calculator', permission: 'READ', requiresApproval: false, description: 'Arithmetic on two finite numbers. No code execution.', schema: calculatorSchema },
  { id: 'tool-web-search', name: 'Web reference lookup', permission: 'READ', requiresApproval: false, description: 'DuckDuckGo instant-answer lookup; may return no results. This is not exhaustive web research.', schema: searchSchema },
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
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
    if (!response.ok) throw new Error(`Reference lookup returned HTTP ${response.status}`);
    const data: any = await readJson(response);
    if (!data.AbstractText || !data.AbstractURL) throw new Error('No instant-answer reference found; no research was verified');
    output = { query, text: String(data.AbstractText).slice(0, 6000), sourceUrl: String(data.AbstractURL), retrievedAt: now() };
  }
  const result = { status: 'succeeded', toolId, version: TOOL_VERSION, callId, output, timestamp: now() };
  store.put('tool-results', callId, result);
  return result;
}
