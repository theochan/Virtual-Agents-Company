import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = 'claude-skills';
// Inventory the distributed repository, excluding ignored local documents and caches.
const files = execFileSync('git', ['ls-files', '-z', '--', root], { encoding: 'utf8' })
  .split('\0').filter(file => file && fs.lstatSync(file).isFile()).sort();
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const licenses = files.filter(file => /^licen[sc]e(?:\.[^/]+)?$/i.test(path.basename(file)));
const inventory = files.filter(file => path.basename(file) === 'SKILL.md').map(file => {
  const directory = path.dirname(file);
  const notices = licenses.filter(license => directory === path.dirname(license) || directory.startsWith(path.dirname(license) + path.sep)).sort((a,b) => b.length-a.length);
  const scripts = files.filter(candidate => candidate.startsWith(directory + path.sep) && candidate.endsWith('.py'));
  return { path: file, sha256: digest(file), origin: 'vendored claude-skills; consult original file and notices', upstreamRevision: '19392f7a08264ed00486a251f5b2098321771f94', licenseNotices: notices, scripts: scripts.map(script => ({ path: script, sha256: digest(script) })), execution: 'disabled', inputSchema: null, outputSchema: null, requiredCapabilities: 'not reviewed', validation: 'inventory only; not certified safe or license-cleared' };
});
const result = { schemaVersion: 1, skillCount: inventory.length, executableSkillsEnabled: 0, licenseNotices: licenses.map(file => ({ path: file, sha256: digest(file) })), skills: inventory };
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/skill-inventory.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Inventoried ${inventory.length} skill documents and ${licenses.length} license notices. No scripts enabled.`);
