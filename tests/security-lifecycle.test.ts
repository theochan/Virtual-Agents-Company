import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installSecurity } from '../src/server/security';

test('file token rotation invalidates the old bearer and every session without returning new credentials', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-token-test-'));
  const prior = process.env.VAC_ACCESS_TOKEN; delete process.env.VAC_ACCESS_TOKEN;
  const app = express(); app.use(express.json());
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const port = (server.address() as any).port;
  try {
    installSecurity(app, directory, port);
    app.get('/api/private', (_req, res) => res.json({ ok: true }));
    const base = `http://127.0.0.1:${port}`;
    const file = path.join(directory, 'access-token'); const old = fs.readFileSync(file, 'utf8');
    const login = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: old }) });
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const rotated = await fetch(base + '/api/session/rotate-token', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentToken: old }) });
    assert.equal(rotated.status, 200);
    const next = fs.readFileSync(file, 'utf8'); assert.notEqual(next, old);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    const reply = await rotated.text(); assert.ok(!reply.includes(next)); assert.ok(!reply.includes(old));
    assert.equal((await fetch(base + '/api/private', { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await fetch(base + '/api/private', { headers: { Authorization: `Bearer ${old}` } })).status, 401);
    assert.equal((await fetch(base + '/api/private', { headers: { Authorization: `Bearer ${next}` } })).status, 200);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (prior !== undefined) process.env.VAC_ACCESS_TOKEN = prior;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
