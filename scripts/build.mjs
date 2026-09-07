import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const run = (bin, args) => execFileSync(bin, args, { stdio: 'inherit' });
run('node_modules/.bin/vite', ['build']);
run('node_modules/.bin/esbuild', ['server.ts', '--bundle', '--platform=node', '--format=cjs', '--packages=external', '--sourcemap', '--outfile=dist/server.cjs']);
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const files = [];
function visit(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) visit(file); else if (entry.isFile()) files.push(file); } }
visit('src'); visit('scripts');
files.push('server.ts', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'tsconfig.json');
const sourceHash = hash(files.sort().map(file => `${file}:${hash(fs.readFileSync(file))}`).join('\n'));
const assets = [];
function inventory(directory) { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) inventory(file); else if (entry.isFile() && file !== 'dist/build.json') assets.push({ path: file.slice(5), sha256: hash(fs.readFileSync(file)) }); } }
inventory('dist');
let revision = 'unknown'; try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch {}
fs.writeFileSync('dist/build.json', JSON.stringify({ schema: 1, builtAt: new Date().toISOString(), revision, sourceHash, node: process.version, assets }, null, 2) + '\n');
console.log(`Built source ${sourceHash}`);
