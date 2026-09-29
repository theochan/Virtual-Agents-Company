import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Store } from '../src/server/store';
import { AttentionInbox } from '../src/server/attention';

function fixture() { const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-attention-')); const store = new Store(directory); return { store, inbox: new AttentionInbox(store), close: () => { store.close(); fs.rmSync(directory, { recursive: true, force: true }); } }; }

test('attention inbox aggregates sources without exposing approval parameters', () => {
  const f = fixture();
  try {
    f.store.put('approvals', 'a', { id: 'a', status: 'pending', actionSummary: 'Write report', details: { token: 'do-not-expose' }, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10000).toISOString() });
    f.store.put('swarm-approvals', 's', { id: 's', rootId: 'root', status: 'pending', toolId: 'tool-connector', parameters: { secret: 'do-not-expose' }, createdAt: new Date().toISOString(), expiresAt: Date.now() + 10000 });
    f.store.put('runs', 'r', { id: 'r', workspaceId: 'ws-default', projectId: 'p', status: 'blocked', title: 'Task', result: 'Needs owner input', createdAt: new Date().toISOString() });
    const result = f.inbox.list();
    assert.deepEqual(new Set(result.items.map(item => item.kind)), new Set(['approval', 'swarm_approval', 'blocked_run']));
    assert.doesNotMatch(JSON.stringify(result), /do-not-expose/);
    assert.equal(result.counts.urgent, 2);
  } finally { f.close(); }
});

test('read state is durable while required reviews cannot be dismissed', () => {
  const f = fixture();
  try {
    f.store.put('approvals', 'a', { id: 'a', status: 'pending', actionSummary: 'Write report', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 10000).toISOString() });
    f.inbox.setState('approval:a', 'read');
    assert.equal(f.inbox.list().items[0].read, true);
    assert.equal(f.inbox.list({ unreadOnly: true }).items.length, 0);
    assert.throws(() => f.inbox.setState('approval:a', 'dismiss'), /Resolve this required review/);
  } finally { f.close(); }
});

test('completed notifications can be dismissed without mutating source evidence', () => {
  const f = fixture();
  try {
    f.store.put('terminal-agent-runs', 't', { id: 't', status: 'completed', changedPaths: ['a.txt'], createdAt: new Date().toISOString() });
    f.inbox.setState('terminal:t:completed', 'dismiss');
    assert.equal(f.inbox.list().items.length, 0);
    assert.equal((f.store.get<any>('terminal-agent-runs', 't')).status, 'completed');
  } finally { f.close(); }
});
