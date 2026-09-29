import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { ProviderSettings } from './providers';

export type DiagnosticCheck = {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
  remediation?: string;
};

type Dependencies = {
  env: NodeJS.ProcessEnv;
  nodeVersion: string;
  findExecutable: (name: string) => string | undefined;
  run: (file: string, args: string[]) => string;
  browserPath: () => string;
  fetch: typeof globalThis.fetch;
};

function defaultFindExecutable(name: string, env = process.env) {
  for (const directory of (env.PATH || '').split(path.delimiter)) {
    if (!directory || !path.isAbsolute(directory)) continue;
    const candidate = path.join(directory, name);
    try { if (fs.statSync(candidate).isFile() && (fs.statSync(candidate).mode & 0o111)) return candidate; } catch {}
  }
}

const defaults: Dependencies = {
  env: process.env,
  nodeVersion: process.versions.node,
  findExecutable: name => defaultFindExecutable(name),
  run: (file, args) => execFileSync(file, args, { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH || '' } }).trim(),
  browserPath: () => chromium.executablePath(),
  fetch: globalThis.fetch,
};

export class SetupDiagnostics {
  constructor(private readonly settings: () => ProviderSettings, private readonly dependencies: Dependencies = defaults) {}

  async inspect(): Promise<{ status: 'ready' | 'attention-required'; checks: DiagnosticCheck[]; updateWorkflow: unknown; checkedAt: string }> {
    const checks: DiagnosticCheck[] = [];
    const major = Number(this.dependencies.nodeVersion.split('.')[0]);
    checks.push(major === 24
      ? { id: 'node', label: 'Node.js runtime', status: 'pass', detail: `Node ${this.dependencies.nodeVersion} matches the supported 24.x line.` }
      : { id: 'node', label: 'Node.js runtime', status: 'fail', detail: `Node ${this.dependencies.nodeVersion} is unsupported.`, remediation: 'Install Node 24.x and reinstall locked dependencies.' });

    const docker = this.dependencies.findExecutable('docker');
    if (!docker) checks.push({ id: 'docker-cli', label: 'Docker CLI', status: 'fail', detail: 'Docker CLI was not found on the server PATH.', remediation: 'Install Docker Desktop and restart VAC from a shell where docker is on PATH.' });
    else {
      try {
        const version = this.dependencies.run(docker, ['version', '--format', '{{.Server.Version}}']);
        checks.push({ id: 'docker-daemon', label: 'Docker daemon', status: 'pass', detail: `Docker server ${version} answered a bounded local check.` });
        try {
          const imageId = this.dependencies.run(docker, ['image', 'inspect', 'vac-sandbox:2026-09-21', '--format', '{{.Id}}']);
          checks.push({ id: 'sandbox-image', label: 'Sandbox image', status: 'pass', detail: `Pinned vac-sandbox:2026-09-21 is present (${imageId.slice(0, 24)}…).` });
        } catch { checks.push({ id: 'sandbox-image', label: 'Sandbox image', status: 'fail', detail: 'Pinned vac-sandbox:2026-09-21 is absent.', remediation: 'Run: docker build -t vac-sandbox:2026-09-21 sandbox' }); }
      } catch { checks.push({ id: 'docker-daemon', label: 'Docker daemon', status: 'fail', detail: 'Docker CLI exists but the daemon did not answer.', remediation: 'Start Docker Desktop, then rerun diagnostics.' }); }
    }

    try {
      const browser = this.dependencies.browserPath();
      checks.push(fs.existsSync(browser)
        ? { id: 'browser', label: 'Chromium runtime', status: 'pass', detail: 'The pinned Playwright browser is installed.' }
        : { id: 'browser', label: 'Chromium runtime', status: 'fail', detail: 'The Playwright Chromium executable is missing.', remediation: 'Run: npx playwright install chromium' });
    } catch { checks.push({ id: 'browser', label: 'Chromium runtime', status: 'fail', detail: 'Playwright could not resolve Chromium.', remediation: 'Run: npx playwright install chromium' }); }

    const ollama = this.settings().ollama;
    if (!ollama?.enabled) checks.push({ id: 'ollama', label: 'Local inference', status: 'warn', detail: 'Ollama is disabled. Paid providers still require explicit spend authorization.' });
    else {
      try {
        const response = await this.dependencies.fetch(`${ollama.endpoint}/api/tags`, { redirect: 'error', signal: AbortSignal.timeout(3000) });
        if (!response.ok) throw new Error('not ok');
        const body: any = await response.json();
        const count = Array.isArray(body.models) ? body.models.length : 0;
        checks.push(count > 0
          ? { id: 'ollama', label: 'Local inference', status: 'pass', detail: `Ollama answered and reported ${count} model(s). Model quality requires a separate smoke run.` }
          : { id: 'ollama', label: 'Local inference', status: 'warn', detail: 'Ollama answered but reported no models.', remediation: 'Pull an approved local model, select it in Configuration, then run the existing connection test.' });
      } catch { checks.push({ id: 'ollama', label: 'Local inference', status: 'fail', detail: 'Ollama did not answer the configured local endpoint.', remediation: 'Start Ollama and verify its endpoint under Configuration.' }); }
    }

    const backupDirectory = this.dependencies.env.VAC_BACKUP_DIR;
    checks.push(backupDirectory && path.isAbsolute(backupDirectory)
      ? { id: 'backup', label: 'Backup target', status: 'pass', detail: 'An absolute private backup target is configured. A successful backup still requires integrity verification.' }
      : { id: 'backup', label: 'Backup target', status: 'warn', detail: 'VAC_BACKUP_DIR is not configured.', remediation: 'Set an absolute private VAC_BACKUP_DIR and run npm run backup:policy before an update.' });

    return {
      status: checks.some(check => check.status === 'fail') ? 'attention-required' : 'ready', checks,
      updateWorkflow: {
        automaticUpdate: false,
        stages: [
          { order: 1, name: 'Preflight', evidence: 'All required diagnostics pass; preserve the current build identity.' },
          { order: 2, name: 'Backup', evidence: 'Run the backup policy and retain its verified SQLite hash receipt.' },
          { order: 3, name: 'Stage', evidence: 'Build and verify a new release in a new directory; never overwrite the running release.' },
          { order: 4, name: 'Smoke', evidence: 'Start on a separate data copy/port and pass readiness plus browser smoke checks.' },
          { order: 5, name: 'Cut over', evidence: 'Stop old runtime, switch supervisor target, and verify readiness.' },
          { order: 6, name: 'Rollback', evidence: 'On failure, stop the new runtime and restore the preserved release and compatible database snapshot.' },
        ],
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
