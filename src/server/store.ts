import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/** Single-process repository. Every update is committed before it is acknowledged. */
export class Store {
  readonly db: DatabaseSync;
  constructor(readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    this.db = new DatabaseSync(path.join(directory, 'workspace.sqlite'), { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
        PRIMARY KEY(kind,id));
      INSERT OR IGNORE INTO migrations VALUES(1);`);
    const version = (this.db.prepare('SELECT max(version) AS version FROM migrations').get() as any).version;
    if (version > 2) { this.db.close(); throw new Error('Database schema is newer than this application; restore a compatible release'); }
    this.db.exec(`CREATE INDEX IF NOT EXISTS records_status ON records(kind, json_extract(data,'$.status'));
      CREATE INDEX IF NOT EXISTS records_conversation ON records(kind, json_extract(data,'$.conversationId'));
      INSERT OR IGNORE INTO migrations VALUES(2);`);
    fs.chmodSync(path.join(directory, 'workspace.sqlite'), 0o600);
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id) as any;
    return row ? JSON.parse(row.data) : undefined;
  }
  all<T>(kind: string): T[] {
    return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid').all(kind).map((r: any) => JSON.parse(r.data));
  }
  matching<T>(kind: string, field: 'status' | 'conversationId', values: string[], limit = 10000, descending = false): T[] {
    if (!values.length) return [];
    return this.db.prepare(`SELECT data FROM records WHERE kind=? AND json_extract(data,'$.${field}') IN (${values.map(() => '?').join(',')}) ORDER BY rowid ${descending ? 'DESC' : 'ASC'} LIMIT ?`)
      .all(kind, ...values, limit).map((r: any) => JSON.parse(r.data));
  }
  page<T>(kind: string, limit: number, offset = 0): T[] {
    return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid DESC LIMIT ? OFFSET ?').all(kind, limit, offset).map((r: any) => JSON.parse(r.data));
  }
  put(kind: string, id: string, value: unknown) {
    this.db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data')
      .run(kind, id, JSON.stringify(value));
  }
  delete(kind: string, id: string) { this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
