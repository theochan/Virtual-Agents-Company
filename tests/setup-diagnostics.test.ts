import assert from 'node:assert/strict';
import test from 'node:test';
import { SetupDiagnostics } from '../src/server/setupDiagnostics';

const settings = () => ({ ollama: { endpoint: 'http://127.0.0.1:11434', enabled: true, downloadedModels: [], defaultModel: '' } });

test('diagnostics distinguish installed tools from daemon and image readiness', async () => {
  const diagnostics = new SetupDiagnostics(settings, {
    env: { PATH: '/bin', VAC_BACKUP_DIR: '/private/backups', SECRET_TOKEN: 'never-return-this' }, nodeVersion: '24.4.0',
    findExecutable: name => name === 'docker' ? '/usr/bin/docker' : undefined,
    run: (_file, args) => { if (args[0] === 'version') return '29.0.0'; if (args[0] === 'image') throw new Error('absent'); return ''; },
    browserPath: () => process.execPath,
    fetch: (async () => new Response(JSON.stringify({ models: [{ name: 'local' }] }), { status: 200 })) as typeof fetch,
  });
  const result = await diagnostics.inspect();
  assert.equal(result.checks.find(check => check.id === 'docker-daemon')?.status, 'pass');
  assert.equal(result.checks.find(check => check.id === 'sandbox-image')?.status, 'fail');
  assert.equal(result.checks.find(check => check.id === 'ollama')?.status, 'pass');
  assert.doesNotMatch(JSON.stringify(result), /never-return-this/);
  assert.equal((result.updateWorkflow as any).automaticUpdate, false);
});

test('diagnostics fail closed when required capabilities are missing', async () => {
  const diagnostics = new SetupDiagnostics(settings, {
    env: {}, nodeVersion: '23.0.0', findExecutable: () => undefined, run: () => '', browserPath: () => '/missing/browser',
    fetch: (async () => { throw new Error('offline'); }) as typeof fetch,
  });
  const result = await diagnostics.inspect();
  assert.equal(result.status, 'attention-required');
  assert.equal(result.checks.find(check => check.id === 'node')?.status, 'fail');
  assert.equal(result.checks.find(check => check.id === 'docker-cli')?.status, 'fail');
  assert.equal(result.checks.find(check => check.id === 'ollama')?.status, 'fail');
  assert.equal(result.checks.find(check => check.id === 'backup')?.status, 'warn');
});
