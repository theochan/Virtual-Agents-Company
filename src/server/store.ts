import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

/** Single-process repository. Every update is committed before it is acknowledged. */
export class Store {
  readonly db: DatabaseSync;
  constructor(readonly directory: string, readonly requestBudgetStore?: Store) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    this.db = new DatabaseSync(path.join(directory, 'workspace.sqlite'), { timeout: 5000 });
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS records(kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
        PRIMARY KEY(kind,id));
      INSERT OR IGNORE INTO migrations VALUES(1);`);
    const version = (this.db.prepare('SELECT max(version) AS version FROM migrations').get() as any).version;
    if (version > 3) { this.db.close(); throw new Error('Database schema is newer than this application; restore a compatible release'); }
    this.db.exec(`CREATE INDEX IF NOT EXISTS records_status ON records(kind, json_extract(data,'$.status'));
      CREATE INDEX IF NOT EXISTS records_root ON records(kind, json_extract(data,'$.rootId'));
      CREATE INDEX IF NOT EXISTS records_conversation ON records(kind, json_extract(data,'$.conversationId'));
      CREATE INDEX IF NOT EXISTS records_memory_project_status ON records(kind, json_extract(data,'$.projectId'), json_extract(data,'$.status'));
      INSERT OR IGNORE INTO migrations VALUES(2);`);
    this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, project_id UNINDEXED, content, subject UNINDEXED, status UNINDEXED, created_at UNINDEXED);
      DELETE FROM memory_fts;
      INSERT INTO memory_fts(id,project_id,content,subject,status,created_at)
        SELECT id,json_extract(data,'$.projectId'),json_extract(data,'$.content'),coalesce(json_extract(data,'$.subject'),''),json_extract(data,'$.status'),json_extract(data,'$.createdAt')
        FROM records WHERE kind='swarm-memory';
      INSERT OR IGNORE INTO migrations VALUES(3);`);
    fs.chmodSync(path.join(directory, 'workspace.sqlite'), 0o600);
  }
  get<T>(kind: string, id: string): T | undefined {
    const row = this.db.prepare('SELECT data FROM records WHERE kind=? AND id=?').get(kind, id) as any;
    return row ? JSON.parse(row.data) : undefined;
  }
  all<T>(kind: string): T[] {
    return this.db.prepare('SELECT data FROM records WHERE kind=? ORDER BY rowid').all(kind).map((r: any) => JSON.parse(r.data));
  }
  matching<T>(kind: string, field: 'status' | 'conversationId' | 'rootId', values: string[], limit = 10000, descending = false): T[] {
    if (!['status','conversationId','rootId'].includes(field)) throw new Error('Unsupported indexed field');
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
    if(kind==='swarm-memory'){
      const memory=value as any;
      this.db.prepare('DELETE FROM memory_fts WHERE id=?').run(id);
      this.db.prepare('INSERT INTO memory_fts(id,project_id,content,subject,status,created_at) VALUES(?,?,?,?,?,?)')
        .run(id,memory.projectId,memory.content,memory.subject||'',memory.status,memory.createdAt);
    }
  }
  delete(kind: string, id: string) { this.db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(kind, id);if(kind==='swarm-memory')this.db.prepare('DELETE FROM memory_fts WHERE id=?').run(id); }
  searchMemory<T>(projectId:string,query:string,limit=200):T[]{
    const terms=query.toLocaleLowerCase().match(/[\p{L}\p{N}_-]+/gu)?.slice(0,20)||[];
    if(!terms.length)return [];
    const match=terms.map(term=>`"${term.replaceAll('"','""')}"*`).join(' AND ');
    return this.db.prepare(`SELECT r.data FROM memory_fts f JOIN records r ON r.kind='swarm-memory' AND r.id=f.id
      WHERE f.project_id=? AND f.status='approved' AND memory_fts MATCH ? ORDER BY bm25(memory_fts), f.created_at DESC LIMIT ?`)
      .all(projectId,match,Math.min(Math.max(limit,1),500)).map((row:any)=>JSON.parse(row.data));
  }
  recentMemory<T>(projectId:string,limit=200):T[]{return this.db.prepare(`SELECT data FROM records WHERE kind='swarm-memory' AND json_extract(data,'$.projectId')=? AND json_extract(data,'$.status')='approved' ORDER BY json_extract(data,'$.createdAt') DESC LIMIT ?`).all(projectId,Math.min(Math.max(limit,1),500)).map((row:any)=>JSON.parse(row.data));}
  memoryConflicts(projectId:string):{subject:string;memoryIds:string[]}[]{return this.db.prepare(`SELECT json_extract(data,'$.subject') subject,json_group_array(id) ids FROM records WHERE kind='swarm-memory' AND json_extract(data,'$.projectId')=? AND json_extract(data,'$.status')='approved' AND json_extract(data,'$.subject') IS NOT NULL GROUP BY subject HAVING count(*)>1`).all(projectId).map((row:any)=>({subject:row.subject,memoryIds:JSON.parse(row.ids)}));}
  countMemory(projectId:string,status:string):number{return Number((this.db.prepare(`SELECT count(*) count FROM records WHERE kind='swarm-memory' AND json_extract(data,'$.projectId')=? AND json_extract(data,'$.status')=?`).get(projectId,status) as any).count);}
  private transactionDepth = 0;
  transaction<T>(fn: () => T): T {
    if(this.transactionDepth){const name=`nested_${this.transactionDepth++}`;this.db.exec(`SAVEPOINT ${name}`);try{const value=fn();this.db.exec(`RELEASE ${name}`);return value;}catch(e){this.db.exec(`ROLLBACK TO ${name}`);this.db.exec(`RELEASE ${name}`);throw e;}finally{this.transactionDepth--;}}
    this.db.exec('BEGIN IMMEDIATE');
    this.transactionDepth++;
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; } finally { this.transactionDepth--; }
  }
  close() { this.db.close(); }
}
