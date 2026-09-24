import 'dotenv/config';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {Store} from '../src/server/store';
import {infer} from '../src/server/providers';
import {reserveRequest,remainingRequestBudget} from '../src/server/operations';
import {reviewPacket,reviewConfirmationPacket,reviewToolFor,validateReview} from '../src/server/semanticReview';
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
function identity(){const files:string[]=[];function visit(d:string){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())visit(p);else files.push(p);}}visit('src');files.push('server.ts','package.json','package-lock.json','scripts/evaluate-reviewer-models.ts');return sha(files.sort().map(p=>p+':'+sha(fs.readFileSync(p))).join('\n'));}
const [mode,filename]=process.argv.slice(2);if(!['--prepare','--run'].includes(mode)||!filename?.endsWith('.json'))throw Error('Use --prepare new-manifest.json or --run manifest.json');
const models=['qwen3.5:9b','qwen3.5:27b'];
async function installed(){const response=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Model discovery failed');const data:any=await response.json();return models.map(name=>{const m=data.models.find((m:any)=>m.name===name);if(!m?.digest)throw Error('Installed model missing: '+name);return {name,digest:m.digest,size:m.size};});}
if(mode==='--prepare'){
 const baselinePath='data/evaluations/2026-09-22-document-accounting-v3-results.json',baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
 if(baseline.status!=='finished')throw Error('Finish original frozen campaign before model comparison');
 const arm=baseline.arms.find((a:any)=>a.arm==='planned'),db=new DatabaseSync('data/evaluations/2026-09-22-document-accounting-v3-labeled-signed-planned/workspace.sqlite',{readOnly:true});
 let files:any[];try{files=db.prepare("SELECT data FROM records WHERE kind='project-files'").all().map((r:any)=>JSON.parse(r.data));}finally{db.close();}
 const suffix='\n\n[Independent semantic review did not accept this output. Inspect the review findings.]';if(!arm.run.result.endsWith(suffix))throw Error('Expected preserved failed-review suffix');const draft=arm.run.result.slice(0,-suffix.length);
 const workspace=(values:any[])=>({file:(_project:string,name:string)=>values.find(f=>f.name===name)}as any);
 const packet=reviewPacket(workspace(files),arm.run,draft),policy=arm.run.semanticReview;
 if(packet.packetHash!==arm.run.semanticReviewResult.stages[0].packetHash)throw Error('Original failed packet reconstruction mismatch');
 const changed=structuredClone(files),output=changed.find(f=>f.name==='ledger.json'),bad=JSON.parse(Buffer.from(output.base64,'base64').toString());
 if(bad.totals[0].amount!==7200||bad.rows.find((r:any)=>r.id==='C7').signedAmount!==200)throw Error('Unexpected ground truth');
 bad.rows.find((r:any)=>r.id==='C7').signedAmount=-200;bad.totals[0].amount=6800;
 const bytes=Buffer.from(JSON.stringify(bad));output.base64=bytes.toString('base64');output.sha256=sha(bytes);output.id+='-incorrect-comparison';
 const wrong=reviewPacket(workspace(changed),arm.run,draft);
 const declaration={sourceHash:identity(),models:await installed(),baselineReportHash:sha(fs.readFileSync(baselinePath)),maximumCalls:8,temperature:0,maxTokens:1536,timeoutMs:90000,
  cases:[{id:'original-correct-ledger',expected:true,policy,packet,order:models},{id:'wrong-credit-ledger',expected:false,policy,packet:wrong,order:[...models].reverse()}],
  scope:'Two known-development packets, one correct and one deliberately incorrect. Same evidence, schemas, tokens and timeout for both already-installed local models. Sequential requests; model-loading latency included. No independent holdout, repeated reliability estimate or default-model change.',
  thresholds:'Correct packet accepted, wrong packet rejected, zero errors. No reruns or tuning within this comparison.'};
 fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,JSON.stringify({createdAt:new Date().toISOString(),declarationHash:sha(JSON.stringify(declaration)),declaration},null,2),{flag:'wx'});console.log('Frozen model comparison '+filename);process.exit(0);
}
const manifest=JSON.parse(fs.readFileSync(filename,'utf8')),d=manifest.declaration;
const frozen=async()=>{if(identity()!==d.sourceHash||sha(JSON.stringify(d))!==manifest.declarationHash)throw Error('Comparison source/declaration changed');if(JSON.stringify(await installed())!==JSON.stringify(d.models))throw Error('Installed model identity changed');};await frozen();
const output=filename.replace(/\.json$/,'-results.json'),store=new Store(path.resolve('data'));
const report:any={startedAt:new Date().toISOString(),manifestHash:sha(fs.readFileSync(filename)),sourceHash:d.sourceHash,models:d.models,admission:remainingRequestBudget(store,'inference'),calls:0,trials:[],status:'preflight'};
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
try{
 if(report.admission.remaining!==null&&report.admission.remaining<d.maximumCalls)throw Error('Insufficient shared inference allowance');report.status='running';save();
 for(const c of d.cases)for(const model of c.order){
  await frozen();const start=Date.now(),trial:any={case:c.id,model,expected:c.expected,packetHash:c.packet.packetHash,stages:[]};report.trials.push(trial);save();
  try{
   for(const stage of ['assessment','confirmation']){
    if(stage==='confirmation'&&!trial.stages[0].validated.passed)break;
    const packet=stage==='assessment'?c.packet:reviewConfirmationPacket(c.packet,c.policy,trial.stages[0].validated);
    if(report.calls>=d.maximumCalls)throw Error('Comparison call cap reached');reserveRequest(store,'inference');report.calls++;save();
    const response=await infer({provider:'ollama',model,endpoint:'http://127.0.0.1:11434',temperature:d.temperature,maxTokens:d.maxTokens,allowFinal:false},packet.messages,AbortSignal.timeout(d.timeoutMs),[reviewToolFor(c.policy,c.packet.files)]);
    const item:any={stage,receipt:response.receipt,decision:response.decision};trial.stages.push(item);save();
    if(response.decision.action!=='tool'||response.decision.toolId!=='submit_review')throw Error('No structured review');item.validated=validateReview(response.decision.parameters,c.policy,c.packet.files);save();
   }
   trial.accepted=trial.stages.length===2&&trial.stages.every((s:any)=>s.validated?.passed);trial.correct=trial.accepted===c.expected;
  }catch(e){trial.error=e instanceof Error?e.message:String(e);trial.correct=false;}finally{trial.durationMs=Date.now()-start;save();console.log(JSON.stringify({case:trial.case,model,accepted:trial.accepted,correct:trial.correct,error:trial.error,durationMs:trial.durationMs}));}
 }
 await frozen();report.summary=models.map(model=>({model,correct:report.trials.filter((t:any)=>t.model===model&&t.correct).length,total:2,falseAcceptances:report.trials.filter((t:any)=>t.model===model&&!t.expected&&t.accepted).length,errors:report.trials.filter((t:any)=>t.model===model&&t.error).length,durationMs:report.trials.filter((t:any)=>t.model===model).reduce((s:number,t:any)=>s+t.durationMs,0)}));report.status='finished';report.completedAt=new Date().toISOString();report.budgetAfter=remainingRequestBudget(store,'inference');save();console.log(JSON.stringify(report.summary));
}catch(e){report.status='blocked';report.error=e instanceof Error?e.message:String(e);save();throw e;}finally{store.close();}
