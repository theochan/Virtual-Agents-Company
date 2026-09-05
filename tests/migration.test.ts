import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { INITIAL_AGENTS } from '../src/data/initialData';
import { readJson } from '../src/server/http';

async function launch(directory: string) {
  const socket = http.createServer(); await new Promise<void>(r => socket.listen(0, '127.0.0.1', r));
  const port = (socket.address() as any).port; await new Promise<void>(r => socket.close(() => r()));
  const child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(port), VAC_DATA_DIR: directory, VAC_ACCESS_TOKEN: 'migration-test-access-token-000000000000' }, stdio: 'pipe' });
  let log = ''; child.stdout!.on('data', b => log += b); child.stderr!.on('data', b => log += b);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return { child, port, log: () => log }; } catch {}
    await new Promise(r => setTimeout(r, 30));
  }
  return { child, port, log: () => log };
}

test('migration backs up original JSON and retains runtime-only records as unverified data', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-migrate-'));
  const project = { id: 'p', workspaceId: 'ws-default', name: 'Existing project', description: '', members: [], recentDecisions: [], status: 'active' };
  const original = JSON.stringify({ agents: [INITIAL_AGENTS[0]], projects: [project], workItems: [], artifacts: [], serverMessagesByAgent: { old: [{ content: 'Unscoped history' }] } });
  fs.writeFileSync(path.join(directory, 'state.json'), original);
  fs.writeFileSync(path.join(directory, 'pre-hardening-runtime.json'), JSON.stringify({ agents: [{ ...INITIAL_AGENTS[0], displayName: 'Runtime edit' }], projects: [project], workItems: [], artifacts: [], memories: [{ id: 'memory-runtime', workspaceId: 'ws-default', content: 'Unsaved memory', scope: 'project', projectId: 'p' }], serverMessagesByAgent: { old: [] }, tools: [{ id: 'untrusted-tool', scriptPaths: ['../bad.py'] }] }));
  const server = await launch(directory);
  try {
    assert.equal(server.child.exitCode, null, server.log());
    assert.equal(fs.readFileSync(path.join(directory, 'state.json'), 'utf8'), original);
    assert.equal(fs.readFileSync(path.join(directory, 'state.pre-sqlite.json'), 'utf8'), original);
    const db = new DatabaseSync(path.join(directory, 'workspace.sqlite'), { readOnly: true });
    const get = (kind: string, id: string) => JSON.parse((db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id) as any).data);
    assert.equal(get('agents', INITIAL_AGENTS[0].id).displayName, 'Runtime edit');
    assert.equal(get('memories', 'memory-runtime').reviewStatus, 'candidate');
    assert.equal(get('legacy-archive', 'runtime').tools[0].id, 'untrusted-tool');
    assert.equal((db.prepare("SELECT count(*) AS n FROM records WHERE kind='messages'").get() as any).n, 0);
    db.close();
    const collision = await launch(directory);
    assert.equal(collision.child.exitCode, 1); assert.match(collision.log(), /already open/);
  } finally { if (server.child.exitCode === null) { server.child.kill('SIGTERM'); await new Promise(r => server.child.once('exit', r)); } fs.rmSync(directory, { recursive: true }); }
});
test('corrupt legacy storage stops startup without silently reseeding or overwriting it', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-corrupt-'));
  fs.writeFileSync(path.join(directory, 'state.json'), '{bad-json');
  const server = await launch(directory);
  assert.equal(server.child.exitCode, 1); assert.equal(fs.readFileSync(path.join(directory, 'state.json'), 'utf8'), '{bad-json');
  fs.rmSync(directory, { recursive: true });
});
test('provider-controlled responses are bounded before JSON parsing', async () => {
  await assert.rejects(readJson(new Response(JSON.stringify({ data: 'x'.repeat(200) })), 20), /exceeds size limit/);
  assert.deepEqual(await readJson(new Response('{"ok":true}')), { ok: true });
});
