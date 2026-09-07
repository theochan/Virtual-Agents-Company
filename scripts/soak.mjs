import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const [release, output] = process.argv.slice(2);
if (!release || !path.isAbsolute(release) || !output || fs.existsSync(output)) throw new Error('Supply absolute installed release directory and new report path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-release-soak-'));
const token = crypto.randomBytes(32).toString('hex');
const port = '3337'; const base = `http://127.0.0.1:${port}/api`;
const env = { PATH: process.env.PATH, NODE_ENV: 'production', VAC_DATA_DIR: directory, VAC_ACCESS_TOKEN: token, PORT: port, DOTENV_CONFIG_PATH: path.join(directory, 'absent') };
let child;
async function api(route, method = 'GET', body) {
  const started = Date.now(); const res = await fetch(base + route, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000) });
  const data = await res.json(); if (!res.ok) throw new Error(`${route}: HTTP ${res.status}`); return { data, ms: Date.now() - started };
}
async function start() {
  child = spawn(process.execPath, ['scripts/supervise.mjs'], { cwd: release, env, stdio: 'ignore' });
  for (let i = 0; i < 100; i++) { try { await api('/ready'); return; } catch {} await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Supervised release did not become ready');
}
async function stop() { if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)); } }
const report = { startedAt: new Date().toISOString(), durationTargetMs: 900000, build: JSON.parse(fs.readFileSync(path.join(release, 'dist/build.json'), 'utf8')), samples: [], tasks: [], plannedRestarts: 0, failures: [] };
const persist = () => { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); };
try {
  await start();
  const agent = (await api('/agents')).data[0]; const project = (await api('/projects')).data[0];
  await api(`/agents/${agent.id}`, 'PATCH', { autonomyLevel: 3, toolIds: ['tool-calculator'] });
  const startTime = Date.now(); let lastTask = 0;
  while (Date.now() - startTime < report.durationTargetMs) {
    if (!report.plannedRestarts && Date.now() - startTime > 450000) { await stop(); await start(); report.plannedRestarts++; }
    const readiness = await api('/ready');
    if (readiness.data.build.sourceHash !== report.build.sourceHash) throw new Error('Installed build identity changed');
    report.samples.push({ at: new Date().toISOString(), latencyMs: readiness.ms, status: readiness.data.status });
    if (Date.now() - lastTask > 60000) {
      const submitted = (await api('/tools/execute', 'POST', { agentId: agent.id, projectId: project.id, toolId: 'tool-calculator', parameters: { operation: 'add', a: 19, b: 23 } })).data;
      const id = submitted.run?.id || submitted.taskId || submitted.id;
      if (!id) throw new Error('Missing direct run ID');
      let run;
      for (let i = 0; i < 100; i++) { run = (await api(`/runs/${id}`)).data; if (!['queued', 'working'].includes(run.status)) break; await new Promise(r => setTimeout(r, 100)); }
      if (run.status !== 'reviewing' || run.receipts[0]?.output?.result !== 42) throw new Error('Calculator failed in soak');
      report.tasks.push({ id, result: 42, status: run.status }); lastTask = Date.now();
      console.log(`soak ${Math.round((Date.now() - startTime) / 60000)}m: ${report.samples.length} readiness samples, ${report.tasks.length} tasks`);
    }
    persist(); await new Promise(r => setTimeout(r, 5000));
  }
  const backupDir = path.join(directory, 'backups');
  const backup = spawn(process.execPath, ['scripts/backup-policy.mjs'], { cwd: release, env: { ...env, VAC_BACKUP_DIR: backupDir }, stdio: 'ignore' });
  if (await new Promise(resolve => backup.once('exit', resolve)) !== 0) throw new Error('Scheduled backup policy failed');
  const db = new DatabaseSync(path.join(directory, 'workspace.sqlite'), { readOnly: true });
  report.integrity = db.prepare('PRAGMA integrity_check').get().integrity_check; db.close();
  report.backupCount = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite')).length;
  report.pass = report.integrity === 'ok' && report.backupCount === 1 && report.plannedRestarts === 1 && report.tasks.length >= 14;
} catch (error) { report.failures.push(error.message); report.pass = false; process.exitCode = 1; }
finally { report.finishedAt = new Date().toISOString(); persist(); await stop(); fs.rmSync(directory, { recursive: true, force: true }); }
