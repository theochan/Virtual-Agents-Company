import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const corpusPath = 'docs/evaluations/local-release-v1.json';
const corpus = JSON.parse(fs.readFileSync(corpusPath, 'utf8'));
const output = process.argv[2];
if (!output || fs.existsSync(output)) throw new Error('Supply a new evidence JSON path; previous observations are never overwritten');
const dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-evaluation-'));
const token = crypto.randomBytes(32).toString('hex');
const port = process.env.VAC_EVAL_PORT || '3318';
const env = { PATH: process.env.PATH, NODE_ENV: 'production', PORT: port, VAC_DATA_DIR: dataDirectory, VAC_ACCESS_TOKEN: token,
  OLLAMA_ENDPOINT: 'http://127.0.0.1:11434', VAC_SEARCH_REQUESTS_PER_DAY: '10', VAC_INFERENCE_REQUESTS_PER_DAY: '100', LLM_TIMEOUT_MS: '120000', RUN_TIMEOUT_MS: '240000', DOTENV_CONFIG_PATH: path.join(dataDirectory, 'no-env') };
// Explicit opt-in loads only the search key, never workspace content, into the disposable server.
if (process.argv.includes('--use-local-search-key')) {
  let key = process.env.TAVILY_API_KEY;
  if (fs.existsSync('data/search-credentials.json')) key ||= JSON.parse(fs.readFileSync('data/search-credentials.json', 'utf8')).tavily;
  if (!key && fs.existsSync('data/workspace.sqlite')) {
    const db = new DatabaseSync('data/workspace.sqlite', { readOnly: true });
    const row = db.prepare("SELECT data FROM records WHERE kind='settings' AND id='search'").get() as any;
    key = row ? JSON.parse(row.data).tavilyApiKey : undefined; db.close();
  }
  if (key) Object.assign(env, { TAVILY_API_KEY: key });
}
const child = spawn(process.execPath, ['dist/server.cjs'], { env, stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/api`;
async function api(route: string, method = 'GET', body?: any) {
  const res = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const data = await res.json(); if (!res.ok) throw new Error(`${route}: HTTP ${res.status}`); return data;
}
const report: any = { startedAt: new Date().toISOString(), corpusHash: crypto.createHash('sha256').update(fs.readFileSync(corpusPath)).digest('hex'), build: JSON.parse(fs.readFileSync('dist/build.json', 'utf8')), model: corpus.model, cases: [], quality: 'Requires content review; automatic checks do not certify factual correctness' };
function persist() { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 }); }
try {
  let ready = false;
  for (let n = 0; n < 100; n++) { try { await api('/health'); ready = true; break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  if (!ready) throw new Error('Disposable server did not start');
  const agent = (await api('/agents'))[0]; const project = (await api('/projects'))[0];
  await api(`/agents/${agent.id}`, 'PATCH', { autonomyLevel: 3, toolIds: ['tool-read-project', 'tool-calculator', 'tool-web-search', 'tool-doc-gen'] });
  await api(`/agents/${agent.id}/llm`, 'PATCH', { provider: 'ollama', model: corpus.model, temperature: 0, maxTokens: 1024 });
  await api(`/projects/${project.id}`, 'PATCH', { description: corpus.projectDescription });
  for (const item of (process.argv.includes('--lifecycle-only') ? [] : corpus.cases)) {
    const start = Date.now();
    const submitted = await api('/chat/agent', 'POST', { agentId: agent.id, projectId: project.id, conversationId: item.id, userMessage: item.prompt });
    let run: any;
    while (Date.now() - start < 250000) {
      run = await api(`/runs/${submitted.run.id}`);
      if (!['queued', 'working'].includes(run.status)) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (['queued', 'working', 'waiting'].includes(run.status)) await api(`/runs/${run.id}/cancel`, 'POST', {});
    const tool = run.receipts.find((r: any) => r.toolId === item.requiredTool && r.status === 'succeeded');
    const urls = tool?.output?.results?.map((r: any) => r.url) || [];
    const checks = {
      draft: run.status === 'reviewing', tool: Boolean(tool), latency: Date.now() - start <= corpus.thresholds.maxCaseMs,
      expected: item.expectedNumber === undefined || tool?.output?.result === item.expectedNumber && String(run.result).includes(String(item.expectedNumber)),
      markers: !item.markers || item.markers.every((m: string) => String(run.result).toLowerCase().includes(m.toLowerCase())),
      source: !item.requireSource || urls.some((url: string) => String(run.result).includes(url)),
      safeTools: run.receipts.every((r: any) => !r.toolId || ['tool-read-project', 'tool-calculator', 'tool-web-search', 'tool-doc-gen'].includes(r.toolId)),
    };
    report.cases.push({ id: item.id, workflow: item.workflow, ms: Date.now() - start, status: run.status, checks, pass: Object.values(checks).every(Boolean), reply: run.result, receipts: run.receipts });
    persist(); console.log(`${item.id}: ${report.cases.at(-1).pass ? 'PASS' : 'FAIL'} (${Date.now() - start}ms)`);
  }
  if (process.argv.includes('--lifecycle-only')) {
    report.lifecycle = [];
    for (const decision of ['approved', 'rejected', 'cancelled']) {
      const submitted = await api('/chat/agent', 'POST', { agentId: agent.id, projectId: project.id, conversationId: `lifecycle-${decision}`, userMessage: 'Use the Save draft document tool to save a document titled Supplier checklist containing exactly: Collect supplier registration documents. Do not just describe saving; request the tool.' });
      let run: any;
      for (let n = 0; n < 240; n++) {
        run = await api(`/runs/${submitted.run.id}`);
        if (!['queued', 'working'].includes(run.status)) break;
        await new Promise(r => setTimeout(r, 500));
      }
      if (run.status !== 'waiting') throw new Error(`Expected live model approval request, got ${run.status}`);
      const approval = (await api('/approvals')).find((a: any) => a.taskId === run.id);
      if (decision === 'cancelled') await api(`/runs/${run.id}/cancel`, 'POST', {});
      else await api(`/approvals/${approval.id}`, 'POST', { decision });
      for (let n = 0; n < 240; n++) {
        run = await api(`/runs/${run.id}`); if (!['queued', 'working'].includes(run.status)) break;
        await new Promise(r => setTimeout(r, 500));
      }
      if (decision === 'approved') await api(`/approvals/${approval.id}`, 'POST', { decision });
      const artifacts = (await api('/artifacts')).filter((a: any) => a.taskId === run.id);
      report.lifecycle.push({ decision, status: run.status, artifactCount: artifacts.length, receipts: run.receipts, pass: decision === 'approved' ? run.status === 'reviewing' && artifacts.length === 1 : artifacts.length === 0 && run.status === (decision === 'rejected' ? 'blocked' : 'cancelled') });
      persist(); console.log(`live ${decision}: ${report.lifecycle.at(-1).pass ? 'PASS' : 'FAIL'}`);
    }
    const submitted = await api('/chat/agent', 'POST', { agentId: agent.id, projectId: project.id, conversationId: 'research-disclosure', userMessage: 'Search for SQLite WAL documentation and briefly summarize it with one source URL.' });
    let run: any;
    for (let n = 0; n < 240; n++) {
      run = await api(`/runs/${submitted.run.id}`); if (!['queued', 'working'].includes(run.status)) break;
      await new Promise(r => setTimeout(r, 500));
    }
    report.disclosure = { status: run.status, reply: run.result, receipts: run.receipts, pass: run.status === 'reviewing' && run.result.includes('[Workspace evidence note:') };
    console.log(`live evidence disclosure: ${report.disclosure.pass ? 'PASS' : 'FAIL'}`);
  }
  report.finishedAt = new Date().toISOString(); report.runtime = await api('/ready');
  report.summary = Object.fromEntries(['calculation', 'project-summary', 'research'].map(workflow => { const cases = report.cases.filter((c: any) => c.workflow === workflow); return [workflow, { passed: cases.filter((c: any) => c.pass).length, total: cases.length }]; }));
} catch (error) { report.error = error instanceof Error ? error.message : 'Evaluation failed'; process.exitCode = 1; }
finally { persist(); child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)); fs.rmSync(dataDirectory, { recursive: true, force: true }); }
