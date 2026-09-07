import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vac-browser-'));
const provider = http.createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  const instruction = body.messages.findLast(m => m.role === 'user' && !m.content.startsWith('UNTRUSTED TOOL'))?.content || '';
  if (instruction.includes('PROVIDER_FAIL')) { res.writeHead(503).end(); return; }
  const observed = body.messages.some(m => m.content.startsWith('UNTRUSTED TOOL'));
  const childObserved = body.messages.some(m => m.content.startsWith('UNTRUSTED CHILD'));
  const system = body.messages.find(m => m.role === 'system')?.content || '';
  const subordinate = JSON.parse(system.match(/DIRECT SUBORDINATES: ([^\n]+)/)?.[1] || '[]')[0];
  const decision = instruction.includes('DELEGATE_BROWSER') && !childObserved ? { action: 'tool', toolId: 'tool-delegate', parameters: { subordinateId: subordinate.id, objective: 'CALCULATE_BROWSER', requiredToolIds: ['tool-calculator'] } }
    : instruction.includes('CALCULATE_BROWSER') && !observed ? { action: 'tool', toolId: 'tool-calculator', parameters: { operation: 'add', a: 19, b: 23 } }
    : instruction.includes('DELEGATE_BROWSER') || instruction.includes('CALCULATE_BROWSER') ? { action: 'final', reply: 'The child calculator result is 42.' }
    : instruction.includes('SAVE_DOCUMENT') && !observed
    ? { action: 'tool', toolId: 'tool-doc-gen', parameters: { title: 'Browser draft', content: 'A draft from the browser fixture.' } }
    : { action: 'final', reply: 'Browser fixture draft is ready for review.' };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(decision) } }], usage: { prompt_tokens: 10, completion_tokens: 10 } }));
});
await new Promise(r => provider.listen(3328, '127.0.0.1', r));
const child = spawn(process.execPath, ['dist/server.cjs'], { env: { PATH: process.env.PATH, NODE_ENV: 'production', VAC_ENABLE_DELEGATION: '1', PORT: '3327', VAC_DATA_DIR: directory, VAC_ACCESS_TOKEN: 'browser-fixture-owner-token-00000000000000', OPENAI_API_KEY: 'fixture-only-key', VAC_ALLOW_PAID_INFERENCE: '1', VAC_OPENAI_ENDPOINTS: 'http://127.0.0.1:3328/v1', DOTENV_CONFIG_PATH: path.join(directory, 'absent') }, stdio: 'inherit' });
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(r => child.once('exit', r)); }
  provider.close(); fs.rmSync(directory, { recursive: true, force: true }); process.exit(0);
}
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', () => { if (!stopping) void stop(); });
