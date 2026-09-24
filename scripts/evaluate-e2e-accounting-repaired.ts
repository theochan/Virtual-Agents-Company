import 'dotenv/config';
import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/server/store';import {SwarmEngine,isSwarmLive} from '../src/server/swarm';
import {INITIAL_AGENTS} from '../src/data/initialData';import {infer,defaultSettings} from '../src/server/providers';
import {remainingRequestBudget} from '../src/server/operations';
import {reviewPacket} from '../src/server/semanticReview';
import {ledgerChecks} from './evaluation/ledger-checks';
import {documentCases} from './evaluation/e2e-accounting-corpus';
import {extractTextRecords} from '../src/server/textRecords';
import {reconcileSources} from '../src/server/reconciliation';
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
function sourceIdentity(){const files:string[]=[];const visit=(d:string)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())visit(f);else files.push(f);}};for(const d of ['src','scripts','sandbox'])visit(d);files.push('server.ts','package.json','package-lock.json');return sha(files.sort().map(f=>f+':'+sha(fs.readFileSync(f))).join('\n'));}
const [mode,filename,requestedCase]=process.argv.slice(2);if(!['--prepare','--run'].includes(mode)||!filename?.endsWith('.json'))throw Error('Use --prepare new-manifest.json or --run manifest.json');
const model='qwen3.5:9b',manifestPath=path.resolve(filename);
const caseSelection=mode==='--run'?JSON.parse(fs.readFileSync(manifestPath,'utf8')).declaration.caseSelection:requestedCase;
const cases=caseSelection?documentCases.filter(c=>c.id===caseSelection):documentCases;if(!cases.length)throw Error('Unknown case selection');
const declaration={candidateStage:'Post-repair development regression on exposed fixture; not fresh qualification',caseSelection:caseSelection||null,model,temperature:0,cases,maximumCalls:cases.length*42,
 limits:{maxAgents:3,maxDepth:1,concurrency:2,maxModelCalls:14,maxCallsPerAgent:14,maxToolCalls:16,maxSearchAttempts:0,maxSandboxRuns:0,maxMinutes:5,maxInputTokens:250000,maxOutputTokens:30000,maxTokensPerCall:1536},
 success:'Completed current-run ledger; independent fixed totals/counts; all input reads; exact span and coverage contract; automated semantic acceptance. No repair or rerun within campaign.',
 scope:'One exposed synthetic structured-accounting task, one attempt per mode in fixed S/P/A order. Identical inputs and acceptance rules. Author-visible ground truth; not independent holdout, general extraction or demonstrated swarm advantage. Human correction time and monetary cost unmeasured.',
 costPolicy:'Local existing model only. Shared real owner inference ledger; no paid/search/app tools, no daily or per-root cap changes.'};
const preparation=JSON.parse(fs.readFileSync('docs/evaluations/2026-09-23-e2e-preparation.json','utf8'));
// This is a separately frozen development regression on the exposed fixture; original run is preserved.
const oracle=JSON.parse(fs.readFileSync('docs/evaluations/2026-09-23-e2e-oracle.json','utf8'));
for(const task of cases){
 if(JSON.stringify(task.totals)!==JSON.stringify(oracle.totals)||task.rows!==oracle.rows||task.duplicates!==oracle.duplicates)throw Error('Independent oracle mismatch');
 const sources=Object.entries(task.inputs).map(([name,text])=>({name,text,version:1,sha256:sha(text)}));
 const ledger=reconcileSources(sources,extractTextRecords);
 if(JSON.stringify(ledger.totals.map(t=>[t.entity,t.currency,t.amount]))!==JSON.stringify(oracle.totals)||ledger.rows.length!==oracle.rows||ledger.rows.filter(r=>r.disposition==='duplicate').length!==oracle.duplicates)throw Error('Application reconciliation differs from independent oracle');
 const files=[...sources.map(f=>({...f,id:f.name,mime:'text/plain',base64:Buffer.from(f.text).toString('base64')})),{name:'ledger.json',id:'ledger',mime:'application/json',version:1,sha256:sha(JSON.stringify(ledger)),base64:Buffer.from(JSON.stringify(ledger)).toString('base64'),runId:'preflight'}];
 reviewPacket({file:(_p:string,name:string)=>files.find(f=>f.name===name)}as any,{id:'preflight',projectId:'p',objective:'Check ledger',semanticReview:{reviewerId:'reviewer',criteria:['Verify result'],inputNames:Object.keys(task.inputs),outputNames:['ledger.json']}}as any,'Review ledger.');
}
if(mode==='--prepare'){fs.mkdirSync(path.dirname(manifestPath),{recursive:true});fs.writeFileSync(manifestPath,JSON.stringify({createdAt:new Date().toISOString(),model:await modelIdentity(),oracleHash:sha(fs.readFileSync('docs/evaluations/2026-09-23-e2e-oracle.json')),sourceHash:sourceIdentity(),declarationHash:sha(JSON.stringify(declaration)),declaration},null,2),{flag:'wx'});console.log('Frozen '+manifestPath);process.exit(0);}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const frozen=()=>{if(manifest.oracleHash!==sha(fs.readFileSync('docs/evaluations/2026-09-23-e2e-oracle.json'))||manifest.sourceHash!==sourceIdentity()||manifest.declarationHash!==sha(JSON.stringify(declaration)))throw Error('Frozen source/declaration drift');};frozen();
const output=manifestPath.replace(/\.json$/,'-results.json');const budgets=new Store(path.resolve('data'));
const report:any={startedAt:new Date().toISOString(),manifestHash:sha(fs.readFileSync(manifestPath)),sourceHash:manifest.sourceHash,declarationHash:manifest.declarationHash,admission:remainingRequestBudget(budgets,'inference'),calls:0,arms:[],reviewer:[],status:'preflight'};
// Exclusive creation makes interrupted/failed campaigns non-replayable as well.
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});const save=()=>fs.writeFileSync(output,JSON.stringify(report,null,2));
const guarded:typeof infer=async(...args)=>{if(args[0].provider!=='ollama'||args[0].model!==model||args[0].endpoint!=='http://127.0.0.1:11434')throw Error('Provider substitution denied');if(report.calls>=declaration.maximumCalls)throw Error('Campaign allowance exhausted');frozen();report.calls++;save();return infer(args[0],args[1],AbortSignal.any([args[2],AbortSignal.timeout(90000)]),args[3]);};
async function modelIdentity(){const res=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(5000)});if(!res.ok)throw Error('Ollama discovery failed');const tags:any=await res.json();const item=tags.models?.find((m:any)=>m.name===model);if(!item?.digest)throw Error('Pinned model unavailable');return {name:model,digest:item.digest};}
try{
 if(report.admission.remaining!==null&&report.admission.remaining<declaration.maximumCalls)throw Error('Insufficient daily allowance');report.model=await modelIdentity();if(report.model.digest!==manifest.model.digest)throw Error('Frozen model changed');report.status='running';save();
 for(const task of cases)for(const arm of task.order){
  frozen();if((await modelIdentity()).digest!==manifest.model.digest)throw Error('Frozen model changed');const directory=path.join(path.dirname(manifestPath),path.basename(manifestPath,'.json')+'-'+task.id+'-'+arm);fs.mkdirSync(directory,{recursive:false});
  const store=new Store(directory,budgets),tools=['tool-files','tool-write-file'];
  const agent={...structuredClone(INITIAL_AGENTS[0]),id:'manager',workspaceId:'ws-default',displayName:'Coordinator',autonomyLevel:3,toolIds:tools,llmConfig:{provider:'ollama',model,temperature:0,maxTokens:1536}};
  store.put('agents','manager',agent);store.put('agents','reviewer',{...agent,id:'reviewer',displayName:'Reviewer',toolIds:[]});store.put('projects','p',{id:'p',workspaceId:'ws-default',name:'Document accounting',members:[]});
  const engine=new SwarmEngine(store,()=>defaultSettings,guarded),start=Date.now();const result:any={task:task.id,arm,startedAt:new Date().toISOString(),humanCorrectionMinutes:null,monetaryCost:null};report.arms.push(result);save();
  try{
   const names=Object.keys(task.inputs),sources=Object.entries(task.inputs).map(([name,text])=>{const f=engine.workspace.write('p',name,Buffer.from(text),0,'owner');return{name,version:f.version,sha256:f.sha256};});
   const objective=`Read every supplied source file (${names.join(', ')}), reconcile every invoice/credit and duplicate across files, and produce ledger.json. Use the owner-declared reconciliation contract and tool-write-file with reconcileContract="ledger.json", expectedVersion=0 to materialize the checked ledger directly from original source bytes. The final artifact must preserve all source rows and field evidence; do not retype or guess ledger rows. Credits reverse their signed amount; currencies stay separate. If evidence is unsupported report blocked, never invent values. No other output files.`;
   const plan=names.map((name,index)=>({key:'source'+index,name:'Source '+index,role:'Source reader',instructions:`Read ${name} using tool-files name=${name}, then summarize its records and ambiguities. Do not write files or delegate.`,objective:`Inspect ${name}.`,toolIds:['tool-files'],toolSequence:['tool-files'],requiredToolIds:['tool-files'],dependsOn:[],acceptanceCriteria:['Read the assigned original file and report evidence.']}));
   const instruction=arm==='single'?' Complete the task yourself without delegation.':arm==='planned'?' Wait for the two planned source readers, then materialize ledger.json.':' Delegate exactly two independent source readers, one for each file, with tool-files only. Wait for both, then personally materialize ledger.json. Do not delegate calculation or writing.';
   let run=engine.create({coordinatorId:'manager',projectId:'p',objective:objective+instruction,mode:'dynamic',allowedToolIds:tools,requiredToolIds:['tool-write-file'],...(arm==='planned'?{plan,toolSequence:['tool-write-file']}:{}),...(arm==='autonomous'?{requiredDepth:1}:{}),contracts:[{name:'ledger.json',kind:'reconciliation',sourceFormat:'text-records-v1',sources}],semanticReview:{reviewerId:'reviewer',criteria:['Result-only: verify ledger totals, duplicate decisions and signed credit treatment against the original inputs; keep currencies separate and normalize explicit units. A credit reverses its signed source amount, so a negative credit adds to payable. Recompute from source. Prose workings are not required; source-row field evidence is required by the deterministic contract.'],inputNames:names,outputNames:['ledger.json']},limits:{...declaration.limits,maxAgents:arm==='single'?1:3}},'docs-'+randomUUID());
   result.run=run;save();
   for(let ticks=0;ticks<90&&isSwarmLive(run.status);ticks++){await engine.tick();run=engine.get(run.id);result.run=run;save();console.log(JSON.stringify({task:task.id,arm,status:run.status,calls:run.budget.modelCalls}));if(run.status==='waiting_approval')break;}
   if(isSwarmLive(run.status)){run=engine.cancel(run.id);result.error='Execution stopped at bounded campaign limit';}
   result.run=run;let content:any;try{const f=engine.workspace.file('p','ledger.json');content=JSON.parse(Buffer.from(f.base64,'base64').toString());result.artifact={sha256:f.sha256,runId:f.runId,version:f.version,content};}catch{}
   const readNames=run.nodes.flatMap(n=>n.receipts.filter(r=>r.toolId==='tool-files'&&r.status==='succeeded').map((r:any)=>r.output?.name));
   result.checks={completed:run.status==='completed',currentArtifact:result.artifact?.runId===run.id&&result.artifact?.version===1,...(({error,...checks})=>{if(error)result.artifactError=error;return checks;})(ledgerChecks(content,task)),contract:run.verification.length===1&&run.verification.every(c=>c.passed),reads:names.every(n=>readNames.includes(n)),semantic:run.semanticReviewResult?.passed===true,topology:run.nodes.length===(arm==='single'?1:3)};
   result.passed=Object.values(result.checks).every(Boolean);
  }catch(e){result.error=e instanceof Error?e.message:String(e);result.passed=false;}finally{result.durationMs=Date.now()-start;engine.stop();store.close();save();console.log(JSON.stringify({task:task.id,arm,passed:result.passed,checks:result.checks,error:result.error}));}
 }
 frozen();if((await modelIdentity()).digest!==report.model.digest)throw Error('Model digest changed');
 report.summary={arms:['single','planned','autonomous'].map(arm=>({arm,attempts:report.arms.filter((r:any)=>r.arm===arm).length,passed:report.arms.filter((r:any)=>r.arm===arm&&r.passed).length,calls:report.arms.filter((r:any)=>r.arm===arm).reduce((s:number,r:any)=>s+(r.run?.budget?.modelCalls||0),0),durationMs:report.arms.filter((r:any)=>r.arm===arm).reduce((s:number,r:any)=>s+r.durationMs,0)})),advantage:'NOT_QUALIFIED',independentAdjudication:'PENDING',humanCorrectionTime:'NOT_MEASURED'};
 report.status='finished';report.completedAt=new Date().toISOString();report.budgetAfter=remainingRequestBudget(budgets,'inference');save();console.log(JSON.stringify(report.summary));
}catch(e){report.status='blocked';report.error=e instanceof Error?e.message:String(e);save();throw e;}finally{budgets.close();}
