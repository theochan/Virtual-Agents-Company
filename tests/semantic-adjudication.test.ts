import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/server/store';
import { Workspace } from '../src/server/workspace';
import { SemanticAdjudication } from '../src/server/semanticAdjudication';
import { semanticReviewSchema, reviewPacket } from '../src/server/semanticReview';

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-owner-review-'));
  const store = new Store(directory), workspace = new Workspace(store);
  store.put('projects', 'p', { id: 'p', workspaceId: 'ws-default' });
  workspace.write('p', 'source.txt', Buffer.from('Total: 42.'), 0, 'owner');
  workspace.write('p', 'report.txt', Buffer.from('Total: 99.'), 0, 'producer', 'run');
  const job: any = { id: 'run', projectId: 'p', objective: 'Compare totals', status: 'blocked', semanticReview: semanticReviewSchema.parse({ reviewerId: 'reviewer', criteria: ['Correct total'], inputNames: ['source.txt'], outputNames: ['report.txt'] }) };
  const packet = reviewPacket(workspace, job, 'Total: 99.');
  job.semanticReviewResult = { passed: false, packetHash: packet.packetHash, evidence: packet.files.map(({ text, ...ref }) => ref) };
  store.put('swarms', 'run', job);
  store.put('swarm-budgets', 'run', { modelCalls: 2, toolCalls: 1 });
  const review = new SemanticAdjudication(store, workspace);
  const input = (verdict = 'fail') => ({ revision: review.context('run').revision, checks: [{ criterion: 0, verdict, reason: 'Source says 42 but the report says 99.' }] });
  return { store, workspace, review, input, directory, close() { store.close(); fs.rmSync(directory, { recursive: true, force: true }); } };
}

test('owner adjudication appends version-bound judgments and survives restart without overriding execution', () => {
  const f = fixture();
  try {
    const original = f.store.get('swarms', 'run'), budget = f.store.get('swarm-budgets', 'run');
    const first = f.review.record('run', f.input());
    const second = f.review.record('run', f.input('pass'));
    assert.equal(first.actor, 'owner'); assert.equal(first.verdict, 'fail');
    assert.equal(second.previousId, first.id); assert.equal(second.verdict, 'pass');
    assert.equal(f.review.context('run').history.length, 2);
    assert.deepEqual(f.store.get('swarms', 'run'), original);
    assert.deepEqual(f.store.get('swarm-budgets', 'run'), budget);
    const restored = new Store(f.directory);
    try { assert.equal(new SemanticAdjudication(restored, new Workspace(restored)).context('run').history[0].snapshot.files[1].text, 'Total: 99.'); }
    finally { restored.close(); }
  } finally { f.close(); }
});

test('owner adjudication rejects stale submissions, preserves original versions and checks complete criteria', () => {
  const f = fixture();
  try {
    const stale = f.input();
    f.workspace.write('p', 'report.txt', Buffer.from('Total: 42.'), 1, 'producer', 'another-run');
    assert.throws(() => f.review.record('run', stale), /reload evidence/);
    const context = f.review.context('run');
    assert.equal(context.files[1].text, 'Total: 99.'); assert.equal(context.files[1].latestVersion, 2);
    const input = f.input(); f.review.record('run', input);
    assert.throws(() => f.review.record('run', input), /reload evidence/);
    assert.throws(() => f.review.record('run', { ...f.input(), actor: 'someone-else' }));
    assert.throws(() => f.review.record('run', { ...f.input(), checks: [{ criterion: 1, verdict: 'pass', reason: 'A sufficient explanation.' }] }), /every criterion/);
    assert.equal(f.review.context('run').history.length, 1);
  } finally { f.close(); }
});

test('owner adjudication refuses active runs, cross-project evidence and corrupt or incomplete evidence', () => {
  const f = fixture();
  try {
    const job: any = f.store.get('swarms', 'run');
    for (const status of ['queued', 'working', 'waiting_children', 'waiting_approval']) {
      f.store.put('swarms', 'run', { ...job, status });
      assert.throws(() => f.review.context('run'), /Stop the run/);
    }
    f.store.put('swarms', 'run', { ...job, semanticReviewResult: { ...job.semanticReviewResult, evidence: job.semanticReviewResult.evidence.slice(1) } });
    assert.throws(() => f.review.context('run'), /coverage/);
    f.store.put('projects', 'other', { id: 'other', workspaceId: 'ws-default' });
    f.store.put('swarms', 'run', { ...job, projectId: 'other' });
    assert.throws(() => f.review.context('run'), /not found/);
    f.store.put('swarms', 'run', job);
    const file = f.workspace.file('p', 'source.txt');
    f.store.put('project-files', file.id, { ...file, base64: Buffer.from('changed').toString('base64') });
    assert.throws(() => f.review.record('run', { revision: 'a'.repeat(64), checks: [{ criterion: 0, verdict: 'pass', reason: 'A sufficient explanation.' }] }), /identity mismatch/);
    assert.equal(f.store.all('semantic-adjudications').length, 0);
  } finally { f.close(); }
});
