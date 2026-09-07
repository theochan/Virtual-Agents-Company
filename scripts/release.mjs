import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination) || fs.existsSync(destination)) throw new Error('Supply a new absolute release directory');
const build = JSON.parse(fs.readFileSync('dist/build.json', 'utf8'));
for (const asset of build.assets) {
  const value = crypto.createHash('sha256').update(fs.readFileSync(path.join('dist', asset.path))).digest('hex');
  if (value !== asset.sha256) throw new Error(`Built asset drift: ${asset.path}`);
}
fs.mkdirSync(destination, { mode: 0o700 });
// Runtime allowlist: no working data, env files, vendored scripts, or Git history.
for (const file of ['dist', 'package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) fs.cpSync(file, path.join(destination, file), { recursive: true });
fs.mkdirSync(path.join(destination, 'scripts'));
for (const file of ['backup.mjs', 'backup-policy.mjs', 'supervise.mjs']) fs.copyFileSync(`scripts/${file}`, path.join(destination, 'scripts', file));
console.log(JSON.stringify({ release: destination, sourceHash: build.sourceHash, next: 'npm ci --omit=dev inside the release; use an explicit private VAC_DATA_DIR' }));
