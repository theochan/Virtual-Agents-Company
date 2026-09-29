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
// Runtime allowlist: no working data, env files, loose vendored scripts, or Git history.
// The qualified imported adapter bundles one reviewed source and its MIT notice.
for (const file of ['dist', 'package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) fs.cpSync(file, path.join(destination, file), { recursive: true });
fs.mkdirSync(path.join(destination, 'scripts'));
for (const file of ['backup.mjs', 'backup-policy.mjs', 'supervise.mjs']) fs.copyFileSync(`scripts/${file}`, path.join(destination, 'scripts', file));
// Ship reviewed documentation and its license notices, never the adjacent executable scripts.
const skillInventory = JSON.parse(fs.readFileSync('docs/skill-inventory.json', 'utf8'));
for (const relative of new Set([...skillInventory.skills.map(skill => skill.path), ...skillInventory.licenseNotices.map(notice => notice.path)])) {
  const source = path.resolve(relative), root = path.resolve('claude-skills');
  if (!(source.startsWith(root + path.sep) || source === root) || !fs.lstatSync(source).isFile()) throw new Error(`Unsafe skill documentation path: ${relative}`);
  const target = path.join(destination, relative); fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 }); fs.copyFileSync(source, target);
}
console.log(JSON.stringify({ release: destination, sourceHash: build.sourceHash, next: 'npm ci --omit=dev inside the release; use an explicit private VAC_DATA_DIR' }));
