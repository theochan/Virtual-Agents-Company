import { DatabaseSync, backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
const source = path.resolve(process.env.VAC_DATA_DIR || 'data', 'workspace.sqlite');
const destination = process.argv[2];
if (!destination) throw new Error('Usage: node scripts/backup.mjs /absolute/path/to/new-backup.sqlite');
if (!path.isAbsolute(destination) || fs.existsSync(destination)) throw new Error('Choose a new absolute backup path');
const database = new DatabaseSync(source, { readOnly: true });
try { await backup(database, destination); fs.chmodSync(destination, 0o600); console.log('Workspace database backup completed. Protect this file as private data.'); }
finally { database.close(); }
