import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import { INITIAL_PROJECTS, INITIAL_MEMORIES, INITIAL_ARTIFACTS } from '../src/data/initialData';
import { INITIAL_WORK_ITEMS } from '../src/data/initialWorkItems';

const [directory, output, mode] = process.argv.slice(2);
if (!directory || !path.isAbsolute(directory) || !output || fs.existsSync(output)) throw Error('Supply absolute data directory and a new report path; optional --apply');
const apply = mode === '--apply';
if (apply && fs.existsSync(path.join(directory, 'server.pid'))) throw Error('Stop the workspace service before applying a legacy review');
const db = new DatabaseSync(path.join(directory, 'workspace.sqlite'));
const sha = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const fixtures: Record<string, any[]> = { projects: INITIAL_PROJECTS, memories: INITIAL_MEMORIES, artifacts: INITIAL_ARTIFACTS, 'work-items': INITIAL_WORK_ITEMS };
const archive = db.prepare("SELECT data FROM records WHERE kind='legacy-archive' AND id='messages'").get() as any;
const messages: any[] = archive ? Object.values(JSON.parse(archive.data)).flat() as any[] : [];
const rows = db.prepare("SELECT kind,id,data FROM records WHERE json_extract(data,'$.legacyUnverified')=1 ORDER BY kind,id").all() as any[];
const decisions = rows.map(row => {
  const value = JSON.parse(row.data); const fixture = fixtures[row.kind]?.find(x => x.id === row.id);
  const sample = fixture && Object.keys(fixture).every(key => JSON.stringify(fixture[key]) === JSON.stringify(value[key]));
  const linked = messages.filter(m => m.metadata?.autoCreatedWorkItems?.some((w: any) => w.id === row.id));
  const unsupported = row.kind === 'work-items' && !fixture && value.status === 'done' && linked.length && linked.every(m => /cannot provide a verified|registered the completed findings/.test(m.content)) && !db.prepare("SELECT id FROM records WHERE kind='runs' AND json_extract(data,'$.workItemId')=?").get(row.id);
  return { kind: row.kind, id: row.id, originalHash: sha(row.data), title: value.title || value.name || value.summary, disposition: sample ? 'archived-sample' : unsupported ? 'unsupported-completion-withdrawn' : 'unresolved', evidence: sample ? { fixture: row.kind === 'work-items' ? 'src/data/initialWorkItems.ts' : 'src/data/initialData.ts', allFixtureFieldsMatch: true } : { archivedMessageIds: linked.map(m => m.id), conclusion: 'No durable execution receipts support the completion claim' } };
});
const report: any = { at: new Date().toISOString(), apply, decisions, unresolved: decisions.filter(d => d.disposition === 'unresolved').length };
if (apply) {
 if (report.unresolved) throw Error('Unresolved records require review; no changes applied');
 if (db.prepare("SELECT id FROM records WHERE kind='runs' AND json_extract(data,'$.status') IN ('queued','working','waiting')").get()) throw Error('Active runs prevent maintenance');
 const backupPath = path.join(directory, `legacy-review-before-${Date.now()}.sqlite`); await backup(db, backupPath); fs.chmodSync(backupPath,0o600); report.backup = path.basename(backupPath);
 const untouched = db.prepare("SELECT kind,id,data FROM records WHERE kind IN ('runs','messages','agents','approvals','legacy-archive') ORDER BY kind,id").all();
 const before = sha(JSON.stringify(untouched));
 db.exec('BEGIN IMMEDIATE');
 try {
  for (let i=0;i<rows.length;i++) {const row=rows[i], decision=decisions[i];
   if (db.prepare("SELECT id FROM records WHERE kind='legacy-quarantine' AND id=?").get(`${row.kind}:${row.id}`)) throw Error('Already reviewed record');
   db.prepare('INSERT INTO records VALUES(?,?,?)').run('legacy-quarantine',`${row.kind}:${row.id}`,JSON.stringify({ ...decision, reviewedAt:report.at, original:JSON.parse(row.data), originalJson:row.data }));
   if(row.kind==='projects') { const value=JSON.parse(row.data); value.status='archived'; value.name=`Archived sample: ${value.name}`;value.description='Bundled demonstration project, archived after source comparison. Its original claims and contents are preserved in the legacy quarantine; they are not verified business facts.';value.objective='Archived demonstration data';value.recentDecisions=[];value.legacyReview={disposition:decision.disposition,reviewedAt:report.at,originalHash:decision.originalHash};db.prepare('UPDATE records SET data=? WHERE kind=? AND id=?').run(JSON.stringify(value),row.kind,row.id); }
   else db.prepare('DELETE FROM records WHERE kind=? AND id=?').run(row.kind,row.id);
  }
  const after=sha(JSON.stringify(db.prepare("SELECT kind,id,data FROM records WHERE kind IN ('runs','messages','agents','approvals','legacy-archive') ORDER BY kind,id").all()));if(before!==after)throw Error('Unrelated evidence changed');
  for(const d of decisions){const stored=JSON.parse((db.prepare("SELECT data FROM records WHERE kind='legacy-quarantine' AND id=?").get(`${d.kind}:${d.id}`) as any).data);if(sha(stored.originalJson)!==d.originalHash)throw Error('Archive hash mismatch');}
  db.exec('COMMIT');report.preservedEvidenceHash=before;report.originalHashesVerified=true;
 }catch(e){db.exec('ROLLBACK');throw e;}
 report.integrity=(db.prepare('PRAGMA integrity_check').get() as any).integrity_check;
}
db.close();fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({apply,reviewed:decisions.length,unresolved:report.unresolved,counts:decisions.reduce((a:any,d)=>{a[d.disposition]=(a[d.disposition]||0)+1;return a;},{})}));
