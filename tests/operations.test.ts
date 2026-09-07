import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/server/store';
import { RunEngine } from '../src/server/runs';
import { OperationsLog, reserveRequest } from '../src/server/operations';
import { acquireWorkspaceLock } from '../src/server/workspaceLock';

function temporary() { const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-ops-')); return { directory, store: new Store(directory) }; }
test('workspace lock rejects duplicate workers and safely recognizes PID reuse', () => {
  const { directory, store } = temporary();
  try {
    const release = acquireWorkspaceLock(directory);
    assert.throws(() => acquireWorkspaceLock(directory), /already open/);
    release();
    fs.writeFileSync(path.join(directory, 'server.pid'), JSON.stringify({ pid: process.pid, birth: 'different process start time' }));
    const recovered = acquireWorkspaceLock(directory); recovered();
    assert.ok(!fs.existsSync(path.join(directory, 'server.pid')));
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('indexed queue selects pending work without loading historical receipts at 10,000 runs', () => {
  const { directory, store } = temporary();
  try {
    store.transaction(() => {
      for (let i = 0; i < 10000; i++) store.put('runs', `history-${i}`, { id: `history-${i}`, status: 'completed', receipts: ['x'.repeat(1000)] });
      store.put('runs', 'pending', { id: 'pending', status: 'queued' });
    });
    const started = performance.now();
    for (let i = 0; i < 100; i++) assert.equal(store.matching<any>('runs', 'status', ['queued'], 1)[0].id, 'pending');
    assert.ok(performance.now() - started < 2000, '100 indexed polls should finish within 2 seconds');
    const plan = store.db.prepare("EXPLAIN QUERY PLAN SELECT data FROM records WHERE kind='runs' AND json_extract(data,'$.status')='queued'").all();
    assert.match(JSON.stringify(plan), /records_status/);
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('daily attempt reservation survives restart and fails before further provider access', () => {
  const { directory, store } = temporary();
  process.env.VAC_SEARCH_REQUESTS_PER_DAY = '2';
  try {
    reserveRequest(store, 'search'); reserveRequest(store, 'search'); store.close();
    const restored = new Store(directory);
    try { assert.throws(() => reserveRequest(restored, 'search'), /exhausted/); }
    finally { restored.close(); }
  } finally { delete process.env.VAC_SEARCH_REQUESTS_PER_DAY; fs.rmSync(directory, { recursive: true, force: true }); }
});
test('worker read failure is caught and reported as degraded rather than an unhandled rejection', async () => {
  const { directory, store } = temporary();
  const engine = new RunEngine(store, () => ({}));
  const original = store.matching.bind(store);
  try {
    engine.start(); store.matching = () => { throw new Error('injected storage failure'); };
    await engine.tick(); store.matching = original;
    const stats = engine.stats();
    assert.equal(stats.healthy, false); assert.ok(stats.lastFailureAt);
    assert.match(fs.readFileSync(path.join(directory, 'operations.jsonl'), 'utf8'), /WORKER_PERSISTENCE_FAILURE/);
  } finally { engine.stop(); store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
test('log retention is bounded and owner-only', () => {
  const { directory, store } = temporary();
  try {
    const log = new OperationsLog(directory, 100);
    for (let i = 0; i < 100; i++) log.record('TEST_EVENT', { runId: String(i), status: 'failed' });
    const files = fs.readdirSync(directory).filter(f => f.startsWith('operations.jsonl'));
    assert.equal(files.length, 4);
    for (const file of files) assert.equal(fs.statSync(path.join(directory, file)).mode & 0o777, 0o600);
  } finally { store.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});
