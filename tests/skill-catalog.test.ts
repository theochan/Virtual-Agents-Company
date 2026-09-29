import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { Store } from '../src/server/store';
import { SkillCatalog } from '../src/server/skillCatalog';

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-skill-catalog-'));
  const store = new Store(directory);
  return { store, catalog: new SkillCatalog(store, 'ws-test', process.cwd()), close: () => { store.close(); fs.rmSync(directory, { recursive: true, force: true }); } };
}

test('catalog is bounded, searchable, and discloses fail-closed execution policy', () => {
  const value = fixture();
  try {
    const result = value.catalog.list({ search: 'agent', limit: 5 });
    assert.equal(result.items.length <= 5, true);
    assert.equal(result.total > 0, true);
    assert.equal(result.policy.executableSkillsEnabled, 0);
    assert.ok(result.items.every(item => item.executableStatus === 'disabled'));
    assert.ok(result.items.every(item => /^[a-f0-9]{64}$/.test(item.sha256)));
  } finally { value.close(); }
});

test('owner decisions are hash-bound, versioned, and never enable scripts', () => {
  const value = fixture();
  try {
    const skill = value.catalog.list({ limit: 1 }).items[0];
    assert.throws(() => value.catalog.decide(skill.id, { action: 'enabled', expectedSha256: '0'.repeat(64), reason: 'Reviewed documentation scope.' }), /content changed/);
    const enabled = value.catalog.decide(skill.id, { action: 'enabled', expectedSha256: skill.sha256, reason: 'Reviewed for documentation discovery only.' });
    assert.equal(enabled.documentationStatus, 'enabled');
    assert.equal(enabled.executableStatus, 'disabled');
    assert.equal(value.catalog.list({ status: 'enabled' }).items.some(item => item.id === skill.id), true);
    const disabled = value.catalog.decide(skill.id, { action: 'disabled', expectedSha256: skill.sha256, reason: 'Retired from owner-facing discovery.' });
    assert.equal(disabled.documentationStatus, 'disabled');
    assert.equal(disabled.executableStatus, 'disabled');
    assert.deepEqual(value.catalog.history(skill.id).map(item => [item.version, item.action]), [[1, 'enabled'], [2, 'disabled']]);
  } finally { value.close(); }
});

test('unknown skills and weak reasons are rejected', () => {
  const value = fixture();
  try {
    assert.throws(() => value.catalog.get('../escape'), /not found/);
    const skill = value.catalog.list({ limit: 1 }).items[0];
    assert.throws(() => value.catalog.decide(skill.id, { action: 'enabled', expectedSha256: skill.sha256, reason: 'yes' }), /8 to 1000/);
  } finally { value.close(); }
});
