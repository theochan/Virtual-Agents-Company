import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { MemoryManager } from '../src/lib/memory/memoryManager';
import { Store } from '../src/server/store';
import { validateEndpoint } from '../src/server/security';

let directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-regression-'));
const token = 'test-only-workspace-access-token-000000000000';
let child: ChildProcess;
let port: number;
let providerPort: number;
let agentId: string;
let projectId: string;
let requests: any[] = [];
let output = '';
const mock = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  if (req.url === '/v1/models') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ data: [{ id: 'fixture-model' }] })); return; }
  const body = JSON.parse(raw); requests.push(body);
  const instruction = body.messages.findLast((m: any) => m.role === 'user' && !m.content.startsWith('UNTRUSTED TOOL'))?.content || '';
  const hasObservation = body.messages.some((m: any) => m.content.startsWith('UNTRUSTED TOOL'));
  let decision: any = { action: 'final', reply: 'Candles glow bright,\nFriends laugh tonight,\nWishes take flight,\nSleep warm and light.' };
  if (instruction.includes('PROVIDER_FAIL')) { res.writeHead(503); res.end('unavailable'); return; }
  if (instruction.includes('SLOW')) await new Promise(resolve => setTimeout(resolve, 1500));
  if (instruction.includes('CALCULATE') && !hasObservation) decision = { action: 'tool', toolId: 'tool-calculator', parameters: { operation: 'add', a: 19, b: 23 } };
  if (instruction.includes('CALCULATE') && hasObservation) decision = { action: 'final', reply: 'The tool returned 42.' };
  if (instruction.includes('SAVE_DOCUMENT') && !hasObservation) decision = { action: 'tool', toolId: 'tool-doc-gen', parameters: { title: 'Requested poem', content: 'A real draft from the fixture model.' } };
  if (instruction.includes('UNSAFE_TOOL')) decision = { action: 'tool', toolId: 'skill-escape', parameters: { script: '../probe.py' } };
  if (instruction.includes('LOOP')) decision = { action: 'tool', toolId: 'tool-calculator', parameters: { operation: 'add', a: 1, b: 1 } };
  if (instruction.includes('ZERO_DIVISION')) decision = { action: 'tool', toolId: 'tool-calculator', parameters: { operation: 'divide', a: 1, b: 0 } };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ id: `fixture-${requests.length}`, choices: [{ message: { content: instruction.includes('MALFORMED') ? 'not a JSON decision' : JSON.stringify(decision) } }], usage: { prompt_tokens: 12, completion_tokens: 8 } }));
});
async function freePort() { const server = http.createServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); const p = (server.address() as any).port; await new Promise<void>(r => server.close(() => r())); return p; }
async function start() {
  output = '';
  child = spawn(process.execPath, process.env.VAC_TEST_BUILT ? ['dist/server.cjs'] : ['--import', 'tsx', 'server.ts'], { cwd: process.cwd(), env: {
    PATH: process.env.PATH, VAC_ALLOW_PAID_INFERENCE: '1', NODE_ENV: 'production', PORT: String(port), VAC_DATA_DIR: directory, VAC_ACCESS_TOKEN: token,
    VAC_OPENAI_ENDPOINTS: `http://127.0.0.1:${providerPort}/v1`, OPENAI_API_KEY: 'fixture-not-a-real-provider-key',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => output += chunk); child.stderr!.on('data', chunk => output += chunk);
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return; } catch {}
    if (child.exitCode !== null) throw new Error(output);
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Server did not start: ' + output);
}
async function stop() { if (child?.exitCode === null) { child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)); } }
async function api(url: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/api${url}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...extra }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
async function until(id: string, statuses: string[]) {
  for (let i = 0; i < 150; i++) {
    const result = await api(`/runs/${id}`);
    if (statuses.includes(result.body.status)) return result.body;
    await new Promise(r => setTimeout(r, 40));
  }
  throw new Error('Run never reached ' + statuses.join(',') + '\n' + output);
}
async function createRun(userMessage: string, project = projectId) {
  const result = await api('/chat/agent', 'POST', { agentId, projectId: project, userMessage });
  assert.equal(result.status, 202, JSON.stringify(result.body)); return result.body.run.id;
}
before(async () => {
  port = await freePort(); await new Promise<void>(r => mock.listen(0, '127.0.0.1', r)); providerPort = (mock.address() as any).port;
  await start();
  const agents = await api('/agents'); agentId = agents.body[0].id;
  projectId = (await api('/projects')).body[0].id;
  await api(`/agents/${agentId}`, 'PATCH', { autonomyLevel: 3, toolIds: ['tool-read-project', 'tool-doc-gen', 'tool-calculator'] });
  const result = await api(`/agents/${agentId}/llm`, 'PATCH', { provider: 'openai', model: 'fixture-model', localEndpoint: `http://127.0.0.1:${providerPort}/v1`, temperature: 0.2, maxTokens: 2048 });
  assert.equal(result.status, 200);
});
after(async () => { await stop(); await new Promise<void>(r => mock.close(() => r())); fs.rmSync(directory, { recursive: true, force: true }); });

test('authentication, host/origin checks, and immutable registry block the reviewed escape paths', async () => {
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/agents`)).status, 401);
  assert.equal((await api('/agents', 'GET', undefined, { Origin: 'https://attacker.invalid' })).status, 403);
  const badHostStatus = await new Promise<number>(resolve => {
    http.get({ hostname: '127.0.0.1', port, path: '/api/agents', headers: { Host: 'attacker.invalid', Authorization: `Bearer ${token}` } }, response => { response.resume(); resolve(response.statusCode!); });
  });
  assert.equal(badHostStatus, 403);
  assert.equal((await api('/tools', 'POST', { id: 'skill-escape', name: 'escape', skillPath: '../marker', scriptPaths: ['../probe.py'], permission: 'READ' })).status, 403);
  assert.equal((await api('/tools/execute', 'POST', { agentId: 'missing', projectId, toolId: 'tool-calculator', parameters: {} })).status, 404);
  assert.equal((await api('/tools/execute', 'POST', { agentId, projectId, toolId: 'skill-escape', parameters: {} })).status, 403);
  assert.equal((await api(`/agents/${agentId}`, 'PATCH', { toolIds: ['skill-escape'] })).status, 422);
  assert.equal((await api('/admin/llm-settings', 'POST', { provider: 'openai', endpoint: 'https://attacker.invalid/v1' })).status, 403);
});
test('session cookie authenticates without exposing the token to application responses', async () => {
  const response = await fetch(`http://127.0.0.1:${port}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.ok(!cookie.includes(token));
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/agents`, { headers: { Cookie: cookie.split(';')[0] } })).status, 200);
});
test('search settings require owner access, mask keys, persist outside SQLite, and support removal', async () => {
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/admin/search-settings`)).status, 401);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/ready`)).status, 401);
  const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
  assert.ok(!JSON.stringify(health).includes(directory));
  const key = 'fixture-search-key-not-real';
  const saved = await api('/admin/search-settings', 'POST', { activeProvider: 'brave', braveApiKey: key });
  assert.equal(saved.status, 200);
  assert.ok(!JSON.stringify(saved.body).includes(key));
  await stop();
  const store = new Store(directory);
  assert.deepEqual(store.get('settings', 'search'), { activeProvider: 'brave' });
  store.close();
  await start();
  const reread = await api('/admin/search-settings');
  assert.equal(reread.body.brave.isConfigured, true);
  assert.ok(!JSON.stringify(reread.body).includes(key));
  assert.equal((await api('/admin/llm-settings')).body.omniroute, undefined);
  assert.equal((await api('/admin/llm-settings', 'POST', { provider: 'omniroute' })).status, 400);
  assert.equal((await api('/admin/search-settings', 'POST', { activeProvider: 'invalid' })).status, 400);
  await api('/admin/search-settings', 'POST', { activeProvider: 'auto', braveApiKey: '' });
  await stop(); await start();
  assert.equal((await api('/admin/search-settings')).body.brave.isConfigured, false);
});
test('birthday task produces its own draft, real usage, and no automatic completed work or memory', async () => {
  const id = await createRun('Write a four-line birthday poem. Do not discuss databases or migrations.');
  const run = await until(id, ['reviewing']);
  assert.equal(run.result.split('\n').length, 4); assert.doesNotMatch(run.result, /postgres|firebase/i);
  assert.equal((await api('/work-items')).body.length, 0); assert.equal((await api('/memories')).body.length, 0);
  assert.equal(run.receipts[0].inputTokens, 12); assert.equal(run.receipts[0].cost, null);
  assert.equal((await api(`/runs/${id}/accept`, 'POST', { reason: 'Four lines and birthday theme checked.' })).body.status, 'completed');
});
test('tool observation feeds the model and exact request retries reuse the durable run', async () => {
  const key = crypto.randomUUID(); const body = { agentId, projectId, userMessage: 'CALCULATE 19 plus 23.' };
  const first = await api('/chat/agent', 'POST', body, { 'Idempotency-Key': key });
  const retry = await api('/chat/agent', 'POST', body, { 'Idempotency-Key': key });
  assert.equal(first.body.run.id, retry.body.run.id);
  assert.equal((await api('/chat/agent', 'POST', { ...body, userMessage: 'different' }, { 'Idempotency-Key': key })).status, 409);
  const run = await until(first.body.run.id, ['reviewing']);
  assert.equal(run.result, 'The tool returned 42.\n\n[Calculator evidence]\nadd(19, 23) = 42'); assert.equal(run.steps, 2);
  assert.equal(run.receipts.find((r: any) => r.toolId === 'tool-calculator').output.result, 42);
});
test('provider errors, malformed decisions, invalid tools, tool failures and budget exhaustion fail closed', async () => {
  for (const instruction of ['PROVIDER_FAIL', 'MALFORMED', 'UNSAFE_TOOL', 'ZERO_DIVISION', 'LOOP']) {
    const id = await createRun(instruction);
    const run = await until(id, ['failed']);
    assert.ok(run.result); assert.ok(run.steps <= 6); assert.equal(run.acceptance, undefined);
    assert.equal((await api(`/runs/${id}/accept`, 'POST', { reason: 'cannot accept' })).status, 409);
  }
});
test('approval survives restart, resumes exact operation once, and persists evidence', async () => {
  const id = await createRun('SAVE_DOCUMENT: save a short poem as a draft.');
  await until(id, ['waiting']);
  const approval = (await api('/approvals')).body.find((a: any) => a.taskId === id);
  assert.equal((await api('/artifacts')).body.length, 0);
  await stop(); await start();
  assert.equal((await api(`/runs/${id}`)).body.status, 'waiting');
  assert.equal((await api(`/approvals/${approval.id}`, 'POST', { decision: 'approved' })).status, 200);
  const run = await until(id, ['reviewing']);
  assert.equal(run.workspace.artifacts.length, 1);
  assert.equal((await api(`/approvals/${approval.id}`, 'POST', { decision: 'approved' })).status, 200);
  assert.equal((await api(`/approvals/${approval.id}`, 'POST', { decision: 'rejected' })).status, 409);
  await stop(); await start();
  assert.equal((await api('/artifacts')).body.length, 1);
  assert.equal((await api(`/runs/${id}`)).body.status, 'reviewing');
});
test('rejection and cancellation cannot execute the pending operation', async () => {
  const id = await createRun('SAVE_DOCUMENT another draft'); await until(id, ['waiting']);
  const approval = (await api('/approvals')).body.find((a: any) => a.taskId === id);
  await api(`/approvals/${approval.id}`, 'POST', { decision: 'rejected' });
  assert.equal((await api(`/runs/${id}`)).body.status, 'blocked');
  assert.equal((await api('/artifacts')).body.length, 1);
  const slow = await createRun('SLOW birthday poem'); await until(slow, ['working']);
  await api(`/runs/${slow}/cancel`, 'POST', {}); await until(slow, ['cancelled']);
  await new Promise(r => setTimeout(r, 100)); assert.equal((await api(`/runs/${slow}`)).body.status, 'cancelled');
});
test('agent edits preserve runs; interrupted work is blocked and explicitly resumable', async () => {
  const id = await createRun('SLOW interrupted poem'); await until(id, ['working']);
  await api(`/agents/${agentId}`, 'PATCH', { displayName: 'Renamed during run' });
  assert.equal((await api(`/runs/${id}`)).status, 200);
  child.kill('SIGKILL'); await new Promise(r => child.once('exit', r)); await start();
  assert.equal((await api(`/runs/${id}`)).body.status, 'blocked');
  assert.equal((await api(`/runs/${id}/resume`, 'POST', {})).status, 200);
  await until(id, ['reviewing']);
});
test('project conversations are isolated and recent turns reach inference', async () => {
  const other = (await api('/projects', 'POST', { name: 'Other project', description: '' })).body.id;
  const beforeCount = requests.length;
  const id = await createRun('A fresh birthday poem in another project.', other); await until(id, ['reviewing']);
  const messages = requests[beforeCount].messages;
  assert.equal(messages.filter((m: any) => m.role === 'user').length, 1);
  assert.equal((await api(`/chat/messages?agentId=${agentId}&projectId=${other}`)).body.length, 2);
  const followup = await createRun('What did I just ask?', other); await until(followup, ['reviewing']);
  assert.ok(requests.at(-1).messages.some((m: any) => m.content === 'A fresh birthday poem in another project.'));
});
test('memory creation/promotion is durable and preserves immutable provenance', async () => {
  const created = await api('/memories', 'POST', { content: 'Review every produced draft.', scope: 'project', projectId });
  assert.equal(created.status, 201);
  const promoted = await api('/memories/promote', 'POST', { memoryId: created.body.id, targetScope: 'organization', reason: 'Owner applies this standard across the workspace.' });
  assert.equal(promoted.status, 200); assert.notEqual(promoted.body.id, created.body.id);
  assert.equal(promoted.body.provenance.promotionHistory.length, 1);
  await stop(); await start();
  const memories = (await api('/memories')).body;
  assert.equal(memories.length, 2); assert.equal(memories.find((m: any) => m.id === created.body.id).status, 'superseded');
});
test('workspace isolation, trust gates and expiration exclude untrusted memories', () => {
  const base: any = { id: 'm', workspaceId: 'other', scope: 'organization', status: 'active', reviewStatus: 'reviewed', importance: 10, confidence: 1, content: 'policy', summary: 'policy', tags: [], createdAt: new Date().toISOString() };
  const manager = new MemoryManager([base, { ...base, id: 'candidate', workspaceId: 'ws-default', reviewStatus: 'candidate' }, { ...base, id: 'expired', workspaceId: 'ws-default', expiresAt: '2000-01-01T00:00:00Z' }]);
  assert.deepEqual(manager.retrieveContext({ workspaceId: 'ws-default' }).allRanked, []);
});
test('transaction failure rolls back and endpoint redirects/destination substitution are not permitted', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-transaction-')); const db = new Store(temp);
  assert.throws(() => db.transaction(() => { db.put('x', '1', { value: 'uncommitted' }); throw new Error('disk operation failed'); }));
  assert.equal(db.get('x', '1'), undefined); db.close(); fs.rmSync(temp, { recursive: true });
  assert.throws(() => validateEndpoint('https://example.com/v1', ['https://api.openai.com/v1']));
  assert.throws(() => validateEndpoint('http://user:pass@127.0.0.1/v1', ['http://127.0.0.1/v1']));
});

test('tool entitlement and request schemas reject forged authority and malformed data', async () => {
  const otherAgent = (await api('/agents')).body.find((a: any) => a.id !== agentId);
  const result = await api('/tools/execute', 'POST', { agentId: otherAgent.id, projectId, toolId: 'tool-calculator', parameters: { operation: 'add', a: 1, b: 2 } });
  assert.equal(result.status, 403);
  assert.equal((await api('/memories', 'POST', { content: 'bad scope', scope: 'root' })).status, 400);
  const project = await api('/projects', 'POST', { id: 'forged', workspaceId: 'foreign', name: 'Server-owned identity', members: [{ projectId: '', agentId, role: 'Lead', permissions: 'lead' }] });
  assert.equal(project.status, 201); assert.notEqual(project.body.id, 'forged'); assert.equal(project.body.workspaceId, 'ws-default'); assert.equal(project.body.members[0].projectId, project.body.id);
});
test('expired and tampered approvals fail before executing a write', async () => {
  for (const mode of ['expired', 'tampered']) {
    const id = await createRun(`SAVE_DOCUMENT ${mode}`); await until(id, ['waiting']);
    const approval = (await api('/approvals')).body.find((a: any) => a.taskId === id);
    await stop();
    const db = new Store(directory);
    if (mode === 'expired') { approval.expiresAt = '2000-01-01T00:00:00.000Z'; db.put('approvals', approval.id, approval); }
    else { const run = db.get<any>('runs', id)!; run.pending.decision.parameters.content = 'Different content'; db.put('runs', id, run); }
    db.close(); await start();
    const decision = await api(`/approvals/${approval.id}`, 'POST', { decision: 'approved' });
    if (mode === 'expired') { assert.equal(decision.status, 409); await api(`/runs/${id}/cancel`, 'POST', {}); }
    else { assert.equal(decision.status, 200); const run = await until(id, ['failed']); assert.match(run.result, /does not match/); }
    assert.equal((await api('/artifacts')).body.length, 1);
  }
});
test('backup creates a restorable snapshot including accepted runs and memory versions', async () => {
  const backupPath = path.join(directory, 'snapshot.sqlite');
  const backup = spawn(process.execPath, ['scripts/backup.mjs', backupPath], { env: { PATH: process.env.PATH, VAC_DATA_DIR: directory }, stdio: 'pipe' });
  const exit = await new Promise<number>(resolve => backup.once('exit', code => resolve(code!)));
  assert.equal(exit, 0);
  const { DatabaseSync } = await import('node:sqlite'); const db = new DatabaseSync(backupPath, { readOnly: true });
  const row = db.prepare("SELECT count(*) AS n FROM records WHERE kind='runs'").get() as any;
  assert.ok(row.n > 0); db.close();
});
test('full restore starts the application, preserves approval and memory evidence, and executes once', async () => {
  const waitingId = await createRun('SAVE_DOCUMENT restore drill');
  await until(waitingId, ['waiting']);
  const approval = (await api('/approvals')).body.find((a: any) => a.taskId === waitingId);
  const originalArtifacts = (await api('/artifacts')).body;
  const originalMemories = (await api('/memories')).body;
  const originalDirectory = directory;
  const snapshot = path.join(originalDirectory, 'restore-drill.sqlite');
  const backup = spawn(process.execPath, ['scripts/backup.mjs', snapshot], { env: { PATH: process.env.PATH, VAC_DATA_DIR: originalDirectory }, stdio: 'pipe' });
  assert.equal(await new Promise(resolve => backup.once('exit', resolve)), 0);
  await stop();
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-restored-'));
  try {
    fs.copyFileSync(snapshot, path.join(directory, 'workspace.sqlite'));
    await start();
    assert.deepEqual((await api('/artifacts')).body, originalArtifacts);
    assert.deepEqual((await api('/memories')).body, originalMemories);
    assert.equal((await api(`/runs/${waitingId}`)).body.status, 'waiting');
    assert.equal((await api(`/approvals/${approval.id}`, 'POST', { decision: 'approved' })).status, 200);
    await until(waitingId, ['reviewing']);
    await api(`/approvals/${approval.id}`, 'POST', { decision: 'approved' });
    const artifacts = (await api('/artifacts')).body;
    assert.equal(artifacts.length, originalArtifacts.length + 1);
    const saved = artifacts.find((a: any) => a.taskId === waitingId);
    const { hash } = await import('../src/server/security');
    assert.equal(saved.contentHash, hash(saved.content));
    const fresh = await createRun('CALCULATE after restore');
    assert.match((await until(fresh, ['reviewing'])).result, /42/);
    const db = new Store(directory);
    assert.equal((db.db.prepare('PRAGMA integrity_check').get() as any).integrity_check, 'ok');
    db.close();
  } finally {
    await stop(); fs.rmSync(directory, { recursive: true, force: true }); directory = originalDirectory; await start();
    await api(`/runs/${waitingId}/cancel`, 'POST', {});
  }
});
test('logout invalidates one cookie; revoke-all invalidates all cookies; headers protect static content', async () => {
  const login = async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    return res.headers.get('set-cookie')!.split(';')[0];
  };
  const cookieA = await login(); const cookieB = await login();
  const cookieGet = (cookie: string) => fetch(`http://127.0.0.1:${port}/api/agents`, { headers: { Cookie: cookie } });
  await fetch(`http://127.0.0.1:${port}/api/session`, { method: 'DELETE', headers: { Cookie: cookieA } });
  assert.equal((await cookieGet(cookieA)).status, 401);
  assert.equal((await cookieGet(cookieB)).status, 200);
  await api('/session/revoke-all', 'POST', {});
  assert.equal((await cookieGet(cookieB)).status, 401);
  assert.equal((await api('/session/rotate-token', 'POST', { currentToken: 'wrong' })).status, 403);
  assert.equal((await api('/session/rotate-token', 'POST', { currentToken: token })).status, 409);
  const page = await fetch(`http://127.0.0.1:${port}${process.env.VAC_TEST_BUILT ? '/' : '/api/health'}`);
  assert.match(page.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
});
