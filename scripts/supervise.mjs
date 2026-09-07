import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
if (!process.env.VAC_DATA_DIR || !path.isAbsolute(process.env.VAC_DATA_DIR)) throw new Error('Supervised service requires an absolute VAC_DATA_DIR');
const directory = process.env.VAC_DATA_DIR;
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const file = path.join(directory, 'service.jsonl');
function record(event, code) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1_000_000) fs.renameSync(file, file + '.1');
  fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), event, code }) + '\n', { mode: 0o600 });
}
record('start');
const child = spawn(process.execPath, ['dist/server.cjs'], { env: { ...process.env, NODE_ENV: 'production' }, stdio: 'ignore' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', () => { record('spawn-failed'); process.exit(1); });
child.on('exit', code => { record('exit', code); process.exit(code ?? 1); });
