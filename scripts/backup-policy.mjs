import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
process.umask(0o077);
const source = path.resolve(process.env.VAC_DATA_DIR || 'data', 'workspace.sqlite');
const directory = process.env.VAC_BACKUP_DIR;
if (!directory || !path.isAbsolute(directory)) throw new Error('Set an absolute private VAC_BACKUP_DIR on the intended backup volume');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); fs.chmodSync(directory, 0o700);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const file = path.join(directory, `vac-backup-${stamp}-${crypto.randomUUID()}.sqlite`);
const db = new DatabaseSync(source, { readOnly: true });
try { await backup(db, file); fs.chmodSync(file, 0o600); }
finally { db.close(); }
const verify = new DatabaseSync(file, { readOnly: true });
try { if (verify.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Backup failed integrity verification'); }
finally { verify.close(); }
fs.writeFileSync(file + '.json', JSON.stringify({ createdAt: new Date().toISOString(), sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), credentialFilesIncluded: false }) + '\n', { mode: 0o600, flag: 'wx' });
// Only prune this policy's recognizable completed snapshots, after new backup validation.
const files = fs.readdirSync(directory).filter(name => /^vac-backup-\d{4}-\d{2}-\d{2}T[\w-]+\.sqlite$/.test(name) && fs.existsSync(path.join(directory, name + '.json'))).sort().reverse();
for (const old of files.slice(30)) {
  const full = path.join(directory, old);
  if (fs.lstatSync(full).isFile() && Date.now() - fs.statSync(full).mtimeMs > 30 * 86400000) { fs.unlinkSync(full); fs.unlinkSync(full + '.json'); }
}
console.log(JSON.stringify({ status: 'backup-verified', file: path.basename(file) }));
