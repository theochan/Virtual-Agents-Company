import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { INITIAL_AGENTS } from './src/data/initialData';
import type { Agent, Project, MemoryItem, Artifact, WorkItem, ChatMessage } from './src/types';
import { MemoryManager } from './src/lib/memory/memoryManager';
import { Store } from './src/server/store';
import { HttpError, installSecurity, now, uid, validateEndpoint } from './src/server/security';
import { allowedEndpoints, defaultSettings, discover, providerKey, setProviderKey, type ProviderSettings } from './src/server/providers';
import { RunEngine, type Run, type Approval } from './src/server/runs';
import { toolCatalog } from './src/server/tools';

const directory = path.resolve(process.env.VAC_DATA_DIR || 'data');
const port = z.coerce.number().int().min(1).max(65535).parse(process.env.PORT || '3001');
const workspaceId = 'ws-default';
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
// Only one worker process may own a workspace. SQLite alone does not establish worker ownership.
const lockPath = path.join(directory, 'server.pid');
if (fs.existsSync(lockPath)) {
  const pid = Number(fs.readFileSync(lockPath, 'utf8'));
  let alive = false;
  try { process.kill(pid, 0); alive = true; } catch (error: any) { if (error.code !== 'ESRCH') alive = true; }
  if (alive) throw new Error('This workspace is already open in another server process');
  fs.unlinkSync(lockPath);
}
fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx', mode: 0o600 });
process.on('exit', () => { try { if (fs.readFileSync(lockPath, 'utf8') === String(process.pid)) fs.unlinkSync(lockPath); } catch {} });
const store = new Store(directory);
const settings = () => store.get<ProviderSettings>('settings', 'providers') || structuredClone(defaultSettings);
const engine = new RunEngine(store, settings);
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));
installSecurity(app, directory, port);

const text = z.string().trim().max(12000);
const id = z.string().min(1).max(100);
const stringList = z.array(z.string().max(200)).max(100);
const llm = z.object({ provider: z.string().max(40), model: z.string().max(200), temperature: z.number().min(0).max(1), maxTokens: z.number().int().min(128).max(8192), localSource: z.string().optional(), localEndpoint: z.string().url().optional(), isLocal: z.boolean().optional() });
const agentSchema = z.object({
  firstName: text, lastName: text, displayName: text.min(1), jobTitle: text, department: text,
  departmentRole: z.enum(['lead', 'member']).optional(), reportsTo: id.nullish(),
  avatarUrl: z.string().max(2000).refine(v => !v || /^https?:\/\//i.test(v), 'Use an HTTP(S) portrait URL'),
  gender: z.enum(['female', 'male', 'non-binary']), seniority: text, primaryResponsibility: text,
  secondaryResponsibilities: stringList, expertise: stringList, skills: stringList.optional(),
  personalityDimensions: z.record(z.string(), z.number().min(0).max(100)), temperament: text,
  personalityDescription: text, communicationMode: text,
  communicationStyle: z.object({ mode: text, verbosity: text, jargonLevel: text, humorLevel: text, challengesUserDecisions: z.boolean(), proactivelySuggestsImprovements: z.boolean() }).optional(),
  communicationTraits: z.object({ verbosity: z.number(), jargon: z.number(), humor: z.number(), emotionalExpressiveness: z.number(), challengesUser: z.boolean(), proactiveSuggestions: z.boolean() }).optional(),
  autonomyLevel: z.number().int().min(1).max(4), llmConfig: llm,
  toolIds: stringList, tools: stringList.optional(), defaultModel: text.optional(),
});
const projectSchema = z.object({ name: text.min(1), description: text, objective: text.optional(), status: z.enum(['active', 'planning', 'paused', 'completed', 'archived']), leadAgentId: id.optional(), ownerAgentId: id.optional(), assignedAgentIds: stringList.optional(), members: z.array(z.object({ projectId: z.string().max(100), agentId: id, role: text, permissions: z.enum(['lead', 'contributor', 'reviewer', 'viewer']) })).max(100), releaseAgents: z.boolean().optional() });
const workSchema = z.object({ title: text.min(1), description: text, projectId: id, status: z.enum(['backlog', 'todo', 'in_progress', 'done']), priority: z.enum(['low', 'medium', 'high', 'urgent']), assignedAgentId: id.optional(), tags: stringList, estimatedHours: z.number().nonnegative().max(100000).optional(), actualHours: z.number().nonnegative().max(100000).optional(), progressPercent: z.number().min(0).max(100).optional(), comment: text.optional() });
const memorySchema = z.object({ content: text.min(1), summary: text.optional(), scope: z.enum(['agent', 'project', 'organization']), projectId: id.optional(), agentId: id.optional(), tags: stringList.default([]), importance: z.number().min(1).max(10).default(5), confidence: z.number().min(0).max(1).default(0.5), type: z.enum(['decision', 'preference', 'lesson', 'fact', 'policy', 'technical_discovery', 'constraint', 'insight']).default('insight') });
function get<T extends { workspaceId?: string }>(kind: string, identifier: string): T {
  const value = store.get<T>(kind, identifier);
  if (!value || value.workspaceId !== workspaceId) throw new HttpError(404, 'Record not found in this workspace');
  return value;
}
const all = <T extends { workspaceId?: string }>(kind: string) => store.all<T>(kind).filter(v => v.workspaceId === workspaceId);
function checkTools(ids: string[]) { if (ids.some(t => !toolCatalog.some(allowed => allowed.id === t))) throw new HttpError(422, 'Only tools in the server registry can be equipped'); }
function activeReference(agentId?: string, projectId?: string) {
  if (store.all<Run>('runs').some(r => ['queued', 'working', 'waiting'].includes(r.status) && (!agentId || r.leadAgentId === agentId) && (!projectId || r.projectId === projectId))) throw new HttpError(409, 'Cancel active runs before removing their agent or project');
}
const route = (fn: any) => (req: any, res: any, next: any) => Promise.resolve().then(() => fn(req, res)).catch(next);

// One-time migration leaves the old JSON and a backup intact. Malformed files abort startup.
if (!store.get('settings', 'initialized')) {
  const legacyPath = path.join(directory, 'state.json');
  let legacy: any;
  if (fs.existsSync(legacyPath)) {
    legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
    for (const key of ['agents', 'projects', 'workItems', 'artifacts']) if (!Array.isArray(legacy[key])) throw new Error(`Invalid legacy ${key}; migration stopped`);
    const backup = path.join(directory, 'state.pre-sqlite.json');
    if (!fs.existsSync(backup)) { fs.copyFileSync(legacyPath, backup, fs.constants.COPYFILE_EXCL); fs.chmodSync(backup, 0o600); }
  }
  const runtimePath = path.join(directory, 'pre-hardening-runtime.json');
  const runtimeSnapshot = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, 'utf8')) : undefined;
  if (runtimeSnapshot) {
    for (const key of ['agents', 'projects', 'workItems', 'artifacts', 'memories']) if (!Array.isArray(runtimeSnapshot[key])) throw new Error(`Invalid runtime snapshot ${key}; migration stopped`);
    legacy = { ...legacy, ...runtimeSnapshot };
  }
  store.transaction(() => {
    if (runtimeSnapshot) store.put('legacy-archive', 'runtime', runtimeSnapshot);
    const sourceAgents = legacy?.agents || INITIAL_AGENTS;
    for (const a of sourceAgents) {
      const toolIds = (a.toolIds || a.tools || []).filter((t: string) => toolCatalog.some(tool => tool.id === t));
      store.put('agents', a.id, { ...a, workspaceId, toolIds, tools: toolIds, runtimeState: { status: 'idle' }, tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCost: null } });
    }
    const projects = legacy?.projects || [{ id: 'proj-general', workspaceId, name: 'General Operations', description: '', status: 'active', members: [], recentDecisions: [], createdAt: now(), updatedAt: now() }];
    for (const project of projects) store.put('projects', project.id, { ...project, workspaceId, legacyUnverified: Boolean(legacy) });
    for (const [key, kind] of [['workItems', 'work-items'], ['artifacts', 'artifacts'], ['memories', 'memories']]) {
      for (const value of legacy?.[key] || []) store.put(kind, value.id, { ...value, workspaceId, legacyUnverified: true, ...(kind === 'memories' ? { reviewStatus: 'candidate' } : {}) });
    }
    // Old messages lacked reliable project/conversation scope. Archive them, never inject them into a new project.
    if (legacy?.serverMessagesByAgent) store.put('legacy-archive', 'messages', legacy.serverMessagesByAgent);
    store.put('settings', 'providers', defaultSettings);
    store.put('settings', 'initialized', { at: now(), migrated: Boolean(legacy), schema: 1 });
  });
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: 'experimental', execution: 'single-agent', hostScripts: 'disabled' }));
app.get('/api/agents', (_req, res) => {
  const runs = store.all<Run>('runs');
  res.json(all<Agent>('agents').map(agent => {
    const receipts = runs.filter(r => r.leadAgentId === agent.id).flatMap(r => r.receipts);
    const active = runs.find(r => r.leadAgentId === agent.id && ['working', 'waiting', 'queued'].includes(r.status));
    return { ...agent, runtimeState: { status: active ? active.status === 'waiting' ? 'needs_approval' : 'working' : 'idle', currentTaskId: active?.id }, tokenUsage: { inputTokens: receipts.reduce((n, r) => n + (r.inputTokens || 0), 0), outputTokens: receipts.reduce((n, r) => n + (r.outputTokens || 0), 0), estimatedCost: null }, usageStatus: 'reported tokens only; cost unknown' };
  }));
});
app.get('/api/agents/:id', route((req, res) => res.json(get<Agent>('agents', req.params.id))));
app.post('/api/agents', route((req, res) => {
  const base = structuredClone(INITIAL_AGENTS[0]);
  const parsed = agentSchema.parse({ ...base, ...req.body, toolIds: req.body.toolIds || req.body.tools || [] });
  checkTools(parsed.toolIds);
  if (parsed.reportsTo) get<Agent>('agents', parsed.reportsTo);
  const value = { ...parsed, id: uid(), workspaceId, runtimeState: { status: 'idle' }, tokenUsage: { inputTokens: 0, outputTokens: 0, estimatedCost: null }, tools: parsed.toolIds, createdAt: now() };
  store.put('agents', value.id, value); res.status(201).json(value);
}));
app.patch('/api/agents/:id/llm', route((req, res) => {
  const agent = get<Agent>('agents', req.params.id);
  const changes = llm.partial().parse(req.body);
  if (changes.model !== undefined && changes.model !== agent.llmConfig.model || changes.provider !== undefined && changes.provider !== agent.llmConfig.provider) {
    delete agent.llmConfig.localEndpoint; delete agent.llmConfig.localSource;
  }
  agent.llmConfig = llm.parse({ ...agent.llmConfig, ...changes }) as any;
  store.put('agents', agent.id, agent); res.json({ success: true, agent });
}));
app.patch('/api/agents/:id', route((req, res) => {
  const agent = get<Agent>('agents', req.params.id);
  const updates = agentSchema.partial().parse(req.body);
  if (updates.tools && !updates.toolIds) updates.toolIds = updates.tools;
  if (updates.toolIds) { checkTools(updates.toolIds); updates.tools = updates.toolIds; }
  if (updates.reportsTo) {
    let parent = updates.reportsTo; const seen = new Set([agent.id]);
    while (parent) { if (seen.has(parent)) throw new HttpError(422, 'Reporting hierarchy cannot contain a cycle'); seen.add(parent); parent = get<Agent>('agents', parent).reportsTo; }
  }
  const updated = { ...agent, ...updates };
  store.put('agents', agent.id, updated); res.json(updated);
}));
app.delete('/api/agents/:id', route((req, res) => {
  const agent = get<Agent>('agents', req.params.id); activeReference(agent.id);
  store.transaction(() => {
    store.delete('agents', agent.id);
    for (const a of all<Agent>('agents')) if (a.reportsTo === agent.id) { a.reportsTo = undefined; store.put('agents', a.id, a); }
    for (const p of all<Project>('projects')) { p.members = p.members.filter(m => m.agentId !== agent.id); p.assignedAgentIds = p.assignedAgentIds?.filter(a => a !== agent.id); if (p.leadAgentId === agent.id) p.leadAgentId = undefined; store.put('projects', p.id, p); }
  });
  res.json({ success: true });
}));
app.get('/api/projects', (_req, res) => res.json(all<Project>('projects')));
app.post('/api/projects', route((req, res) => {
  const data = projectSchema.parse({ description: '', status: 'active', members: [], ...req.body });
  for (const member of data.members) get<Agent>('agents', member.agentId);
  const value = { ...data, id: uid(), workspaceId, recentDecisions: [], createdAt: now(), updatedAt: now() };
  value.members = value.members.map(member => ({ ...member, projectId: value.id }));
  store.put('projects', value.id, value); res.status(201).json(value);
}));
app.patch('/api/projects/:id', route((req, res) => {
  const project = get<Project>('projects', req.params.id); const data = projectSchema.partial().parse(req.body);
  if (data.members) for (const member of data.members) get<Agent>('agents', member.agentId);
  const value = { ...project, ...data, ...(data.releaseAgents ? { members: [], assignedAgentIds: [] } : {}), updatedAt: now() };
  value.members = value.members.map(member => ({ ...member, projectId: project.id }));
  store.put('projects', project.id, value); res.json(value);
}));
app.delete('/api/projects/:id/members/:agentId', route((req, res) => {
  const project = get<Project>('projects', req.params.id);
  project.members = project.members.filter(m => m.agentId !== req.params.agentId);
  project.assignedAgentIds = project.assignedAgentIds?.filter(a => a !== req.params.agentId);
  store.put('projects', project.id, project); res.json({ success: true, project });
}));
app.delete('/api/projects/:id', route((req, res) => {
  const project = get<Project>('projects', req.params.id); activeReference(undefined, project.id);
  // Preserve run evidence and artifacts; deletion archives the project.
  project.status = 'archived'; store.put('projects', project.id, project); res.json({ success: true, archived: true });
}));

app.get(['/api/memory', '/api/memories'], route((req, res) => {
  const manager = new MemoryManager(all<MemoryItem>('memories'));
  if (req.query.topic) return res.json(manager.retrieveContext({ workspaceId, topic: String(req.query.topic), projectId: req.query.projectId as string, agentId: req.query.agentId as string }));
  res.json(manager.getAllMemories().filter(m => (!req.query.scope || m.scope === req.query.scope) && (!req.query.projectId || m.projectId === req.query.projectId) && (!req.query.agentId || m.agentId === req.query.agentId)));
}));
app.post('/api/memories', route((req, res) => {
  const data = memorySchema.parse(req.body);
  if (data.scope === 'project') get<Project>('projects', data.projectId || '');
  if (data.scope === 'agent') get<Agent>('agents', data.agentId || '');
  const value = { ...data, id: uid(), workspaceId, summary: data.summary || data.content.slice(0, 120), status: 'active', reviewStatus: 'reviewed', sourceType: 'user_instruction', createdAt: now(), updatedAt: now(), provenance: { originalSource: 'Authenticated owner instruction', originalAgentId: 'workspace-owner', timestamp: now(), promotionHistory: [] } };
  store.put('memories', value.id, value); res.status(201).json(value);
}));
app.post('/api/memories/candidate', route((req, res) => {
  const candidate = z.object({ candidate: z.object({ content: text.min(1), summary: text, proposedScope: z.enum(['agent', 'project', 'organization']), importance: z.number().min(1).max(10), confidence: z.number().min(0).max(1), reason: text, type: memorySchema.shape.type, projectId: id.optional(), agentId: id.optional() }), authorAgentId: id, taskId: id }).parse(req.body);
  const run = engine.get(candidate.taskId);
  if (run.status !== 'completed' || run.leadAgentId !== candidate.authorAgentId || candidate.candidate.projectId && candidate.candidate.projectId !== run.projectId) throw new HttpError(422, 'Candidate requires an accepted run with matching provenance');
  if (candidate.candidate.proposedScope === 'project' && candidate.candidate.projectId !== run.projectId) throw new HttpError(422, 'Project candidate must match its source run');
  if (candidate.candidate.proposedScope === 'agent' && candidate.candidate.agentId && candidate.candidate.agentId !== candidate.authorAgentId) throw new HttpError(422, 'Agent candidate must match its author');
  const manager = new MemoryManager(all<MemoryItem>('memories'));
  const saved = manager.evaluateAndPersistCandidate(candidate.candidate, candidate.authorAgentId, run.id);
  if (saved) store.put('memories', saved.id, saved);
  res.status(saved ? 201 : 200).json(saved || { status: 'rejected_ephemeral' });
}));
app.post('/api/memories/promote', route((req, res) => {
  const data = z.object({ memoryId: id, targetScope: z.enum(['agent', 'project', 'organization']), reason: text.min(1), targetProjectId: id.optional() }).parse(req.body);
  const original = get<MemoryItem>('memories', data.memoryId);
  if (data.targetProjectId) {
    get<Project>('projects', data.targetProjectId);
    if (original.projectId && original.projectId !== data.targetProjectId) throw new HttpError(422, 'Promotion cannot transfer a project memory to another project');
  }
  const manager = new MemoryManager(all<MemoryItem>('memories'));
  const result = manager.promoteMemory({ ...data, promotedByAgentId: 'workspace-owner' });
  if (!result) throw new HttpError(404, 'Memory not found');
  store.transaction(() => { for (const memory of manager.getAllMemories()) store.put('memories', memory.id, memory); });
  res.json(result);
}));
app.get('/api/artifacts', (req, res) => res.json(all<Artifact>('artifacts').filter(a => (!req.query.projectId || req.query.projectId === 'all' || a.projectId === req.query.projectId) && (!req.query.agentId || a.createdByAgentId === req.query.agentId))));
app.get('/api/artifacts/:id', route((req, res) => res.json(get<Artifact>('artifacts', req.params.id))));
app.get('/api/work-items', (req, res) => res.json(all<WorkItem>('work-items').filter(w => (!req.query.projectId || req.query.projectId === 'all' || w.projectId === req.query.projectId) && (!req.query.status || req.query.status === 'all' || w.status === req.query.status) && (!req.query.agentId || req.query.agentId === 'all' || w.assignedAgentId === req.query.agentId))));
app.post('/api/work-items', route((req, res) => {
  const data = workSchema.parse({ description: '', status: 'backlog', priority: 'medium', tags: [], ...req.body });
  get<Project>('projects', data.projectId); if (data.assignedAgentId) get<Agent>('agents', data.assignedAgentId);
  const value = { ...data, id: uid(), workspaceId, createdByName: 'Workspace owner', history: [{ id: uid(), authorName: 'Workspace owner', timestamp: now(), newStatus: data.status, comment: 'Manually created by owner; not an agent execution claim.' }], createdAt: now(), updatedAt: now() };
  store.put('work-items', value.id, value); res.status(201).json(value);
}));
app.patch('/api/work-items/:id', route((req, res) => {
  const item = get<WorkItem>('work-items', req.params.id); const data = workSchema.partial().parse(req.body);
  if (data.projectId) get<Project>('projects', data.projectId); if (data.assignedAgentId) get<Agent>('agents', data.assignedAgentId);
  const value = { ...item, ...data, updatedAt: now(), history: [...item.history, { id: uid(), authorName: 'Workspace owner', timestamp: now(), newStatus: data.status || item.status, comment: data.comment || 'Manual owner update; not an agent execution claim.' }] };
  store.put('work-items', item.id, value); res.json(value);
}));
app.delete('/api/work-items/:id', route((req, res) => {
  get<WorkItem>('work-items', req.params.id);
  if (store.all<Run>('runs').some(r => r.workItemId === req.params.id)) throw new HttpError(409, 'Work item has run evidence; retain it for audit');
  store.delete('work-items', req.params.id); res.json({ success: true });
}));
const key = (req: any) => req.get('Idempotency-Key') || '';
app.post('/api/work-items/:id/agent-work', route((req, res) => {
  const item = get<WorkItem>('work-items', req.params.id);
  const input = z.object({ agentId: id, customPrompt: text.optional() }).parse(req.body);
  const run = engine.create({ agentId: input.agentId, projectId: item.projectId, workItemId: item.id, userMessage: `${input.customPrompt || 'Produce a draft deliverable for this work item.'}\n${item.title}\n${item.description}` }, key(req));
  res.status(202).json({ item, run, comment: 'Run queued; work is not yet complete.' });
}));
app.post('/api/work-items/agent-generate', route((req, res) => {
  const data = z.object({ agentId: id, projectId: id, goal: text.optional() }).parse(req.body);
  const run = engine.create({ ...data, userMessage: `Draft a concrete plan with proposed backlog items and acceptance criteria. Do not claim execution. Goal: ${data.goal || 'Plan next steps for the current project.'}` }, key(req));
  res.status(202).json({ run, createdItems: [] });
}));
app.get('/api/chat/messages', route((req, res) => {
  const query = z.object({ agentId: id, projectId: id, conversationId: id.optional() }).parse(req.query);
  get<Agent>('agents', query.agentId); get<Project>('projects', query.projectId);
  res.json(engine.history(query.agentId, query.projectId, query.conversationId));
}));
app.post('/api/chat/agent', route((req, res) => res.status(202).json({ run: engine.create(req.body, key(req)) })));
app.post('/api/orchestrate/run', route((req, res) => {
  const data = z.object({ userInstruction: text.min(1), leadAgentId: id, projectId: id }).parse(req.body);
  const run = engine.create({ agentId: data.leadAgentId, projectId: data.projectId, userMessage: data.userInstruction }, key(req));
  res.status(202).json({ task: run, mode: 'single-agent', message: 'Delegation is not enabled; the selected agent will produce a draft for review.' });
}));
app.get(['/api/runs', '/api/tasks'], (_req, res) => res.json(store.all<Run>('runs').map(publicRun)));
app.get(['/api/runs/:id', '/api/tasks/:id'], route((req, res) => res.json(publicRun(engine.get(req.params.id)))));
app.get('/api/tasks/:id/events', route((req, res) => res.json(engine.get(req.params.id).events)));
app.post('/api/runs/:id/cancel', route((req, res) => res.json(publicRun(engine.cancel(req.params.id)))));
app.post('/api/runs/:id/resume', route((req, res) => res.json(publicRun(engine.resume(req.params.id)))));
app.post('/api/runs/:id/accept', route((req, res) => {
  const { reason } = z.object({ reason: text.min(1) }).parse(req.body); res.json(publicRun(engine.accept(req.params.id, reason)));
}));
function publicRun(run: Run) { const { messages, ...result } = run; return result; }
app.get('/api/tools', (_req, res) => res.json(toolCatalog));
app.post('/api/tools', (_req, res) => res.status(403).json({ error: 'Tool registration is server-controlled. Imported skills and host scripts are disabled.' }));
app.post('/api/tools/execute', route((req, res) => {
  const data = z.object({ agentId: id, projectId: id, toolId: id, parameters: z.record(z.string(), z.unknown()).default({}) }).parse(req.body);
  const run = engine.create({ agentId: data.agentId, projectId: data.projectId, userMessage: `Execute ${data.toolId} with the supplied arguments.` }, key(req), { toolId: data.toolId, parameters: data.parameters });
  res.status(202).json({ status: 'queued', run: publicRun(run) });
}));
app.get('/api/approvals', (_req, res) => res.json(store.all<Approval>('approvals')));
app.post('/api/approvals/:id', route((req, res) => {
  const { decision } = z.object({ decision: z.enum(['approved', 'rejected']) }).parse(req.body); res.json(engine.decide(req.params.id, decision));
}));
app.post('/api/agents/communicate', (_req, res) => res.status(422).json({ error: 'Multi-agent communication is not enabled in the verified single-agent runtime' }));
app.post('/api/seed', (_req, res) => res.status(403).json({ error: 'Runtime reseeding is disabled to preserve evidence. Use a separate data directory for experiments.' }));
app.get('/api/admin/llm-settings', (_req, res) => res.json(publicSettings()));
function publicSettings() {
  return Object.fromEntries(Object.entries(settings()).map(([name, value]) => [name, { ...value, status: 'not-tested', isConfigured: Boolean(providerKey(name)) || name === 'ollama', apiKeyMasked: providerKey(name) ? '••••••••' : '', hfTokenMasked: providerKey(name) ? '••••••••' : '', credentialPersistence: 'environment only; UI key changes expire on restart' }]));
}
app.post('/api/admin/llm-settings', route((req, res) => {
  const data = z.object({ provider: z.enum(['claude', 'openai', 'qwen', 'ollama', 'huggingface', 'omniroute']), defaultModel: text.optional(), endpoint: z.string().url().optional(), enabled: z.boolean().optional(), apiKey: z.string().max(4096).optional() }).parse(req.body);
  const current = settings();
  if (data.endpoint) validateEndpoint(data.endpoint, allowedEndpoints(data.provider));
  const { provider, apiKey, ...update } = data;
  current[provider] = { ...current[provider], ...update };
  store.put('settings', 'providers', current);
  if (apiKey) setProviderKey(provider, apiKey.trim());
  res.json({ success: true, settings: publicSettings(), message: 'Settings saved. Keys entered here last until restart; use environment variables for durable credentials.' });
}));
app.post(['/api/admin/omniroute/test-connection', '/api/admin/local-models/test-connection'], route(async (req, res) => {
  const provider = req.path.includes('omniroute') ? 'omniroute' : z.enum(['ollama', 'huggingface']).parse(req.body.source);
  const endpoint = req.body.endpoint || settings()[provider].endpoint;
  validateEndpoint(endpoint, allowedEndpoints(provider));
  const started = Date.now();
  try {
    const models = await discover(provider, endpoint);
    const current = settings(); current[provider].downloadedModels = models; store.put('settings', 'providers', current);
    res.json({ success: true, connected: true, models, latencyMs: Date.now() - started, message: `Model discovery succeeded (${models.length} models). Inference has not been tested.` });
  } catch (error) { res.json({ success: false, connected: false, models: [], message: error instanceof Error ? error.message : 'Discovery failed' }); }
}));
app.post('/api/admin/local-models/add', (_req, res) => res.status(422).json({ error: 'Install models in the provider, then refresh discovery. Adding a label does not download a model.' }));
app.delete('/api/admin/local-models/remove', (_req, res) => res.status(422).json({ error: 'Manage installed models in the provider, then refresh discovery.' }));
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((error: any, _req: any, res: any, _next: any) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', issues: error.issues.map(i => ({ path: i.path, message: i.message })) });
  const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : 500;
  console.error('API error:', error instanceof Error ? error.message : 'unknown');
  res.status(status).json({ error: status === 500 ? 'Operation failed; no success was acknowledged. Check server logs.' : error.message });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    app.use((await createServer({ server: { middlewareMode: true }, appType: 'spa' })).middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve('dist/index.html')));
  }
  const server = app.listen(port, '127.0.0.1', () => { engine.start(); console.log(`Experimental workspace: http://127.0.0.1:${port}`); });
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => { engine.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); });
}
start().catch(error => { console.error(error); process.exit(1); });
