import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {Store} from '../src/server/store';
import {SwarmEngine} from '../src/server/swarm';
import {INITIAL_AGENTS} from '../src/data/initialData';
import {defaultSettings,infer} from '../src/server/providers';

const output=path.resolve(process.argv[2]||'data/evaluations/repeated-tools.json');
if(fs.existsSync(output))throw new Error('Use a new evidence filename');
const model=process.argv[3]||'qwen3.5:9b';
const files:string[]=[];
const visit=(dir:string)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())visit(f);else if(e.isFile())files.push(f);}};
for(const dir of ['src','scripts','sandbox'])visit(dir);
files.push('server.ts','package.json','package-lock.json','index.html','vite.config.ts','tsconfig.json');
const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const sourceHash=sha(files.sort().map(f=>f+':'+sha(fs.readFileSync(f))).join('\n'));
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vac-repeat-live-'));
const budgetStore=new Store(path.resolve('data'));
const store=new Store(directory,budgetStore);
const tools=['tool-browser','tool-calculator','tool-write-file'];
store.put('agents','manager',{...structuredClone(INITIAL_AGENTS[0]),id:'manager',workspaceId:'ws-default',displayName:'Coordinator',autonomyLevel:3,toolIds:tools,llmConfig:{provider:'ollama',model,temperature:0,maxTokens:2048}});
store.put('projects','project',{id:'project',workspaceId:'ws-default',name:'Repeated-tool live acceptance',description:'Public documentation pages only; not investment research.',members:[]});
const engine=new SwarmEngine(store,()=>defaultSettings,infer);
const objective='Delegate one Researcher under a ResearchLead supervisor. The Researcher must navigate https://example.com then navigate https://www.iana.org/help/example-domains in two separate tool-browser calls. Read both actual pages and describe their documentation-domain purpose. The Researcher must personally calculate 10+5 with tool-calculator. Then write sources.json with numeric sum=15 and a sources array of the two visited URLs, and separately write memo.md explaining what the two pages actually say. Use two tool-write-file calls, one per filename, expectedVersion=0. Do not repeat a successful write. The existing coordinator must personally calculate 19+23 with tool-calculator after child work, then summarize the actual evidence. This independent calculation is distinct from the researcher calculation. Do not assign coordinator duties to the worker. All tools and files are explicit; no other tasks or artifacts are needed.';
let run=engine.create({harness:'deepagents',coordinatorId:'manager',projectId:'project',objective,mode:'dynamic',allowedToolIds:tools,requiredToolIds:['tool-calculator'],requiredDepth:2,browserPolicy:{allowedOrigins:['https://example.com','https://www.iana.org'],allowActions:false},contracts:[{name:'sources.json',kind:'json_equals',path:['sum'],expected:15},{name:'sources.json',kind:'json_equals',path:['sources','0'],expected:'https://example.com'},{name:'sources.json',kind:'json_equals',path:['sources','1'],expected:'https://www.iana.org/help/example-domains'},{name:'memo.md',kind:'exists'}],limits:{maxAgents:4,maxDepth:2,concurrency:2,maxModelCalls:32,maxCallsPerAgent:16,maxInputTokens:750000,maxOutputTokens:100000,maxTokensPerCall:2048,maxToolCalls:24,maxSearchAttempts:0,maxMinutes:20}},'repeat-'+randomUUID());
const report:any={sourceHash,model,objective,directory,startedAt:new Date().toISOString(),limits:run.limits,scope:'Focused live repeated-tool and shared-grant development trial; not the ticker-research acceptance workflow.'};
const started=Date.now();fs.mkdirSync(path.dirname(output),{recursive:true});
const save=()=>fs.writeFileSync(output,JSON.stringify({...report,run},null,2));save();
try{
 for(let i=0;i<100&&['queued','working','waiting_children'].includes(run.status);i++){
  await engine.tick();run=engine.get(run.id);save();console.log(run.nodes.map(n=>`${n.name}:${n.status}:${n.calls}`).join(' | '));
  if(run.nodes.some(n=>['failed','partial','blocked','budget_exhausted'].includes(n.status))){report.failure='Required node failed; preserve attempt without retry';if(['queued','working','waiting_children'].includes(run.status))run=engine.cancel(run.id);break;}
 }
 const leaf=run.nodes.find(n=>n.depth===2);
 const receipts=leaf?.receipts.filter(r=>r.toolId&&r.status==='succeeded')||[];
 const browser=receipts.filter(r=>r.toolId==='tool-browser');
 let summary:any;try{summary=JSON.parse(Buffer.from(engine.workspace.file('project','sources.json').base64,'base64').toString());}catch{}
 const artifacts=engine.workspace.files('project');
 report.checks={completed:run.status==='completed',contracts:run.verification?.every(c=>c.passed)===true,depth:leaf?.status==='completed',twoBrowserSteps:browser.length===2&&new Set(browser.map(r=>r.sequenceStep)).size===2,twoWrites:receipts.filter(r=>r.toolId==='tool-write-file').length===2,sourceUrls:Array.isArray(summary?.sources)&&summary.sources.includes('https://example.com')&&summary.sources.includes('https://www.iana.org/help/example-domains'),workerCalculation:receipts.some(r=>r.toolId==='tool-calculator'&&r.output?.result===15),coordinatorCalculation:run.nodes[0].receipts.some(r=>r.toolId==='tool-calculator'&&r.status==='succeeded'&&r.output?.result===42),artifacts:artifacts.length===2&&artifacts.every(f=>f.runId===run.id&&f.version===1)};
 report.passed=Object.values(report.checks).every(v=>v===true);report.durationSeconds=(Date.now()-started)/1000;report.artifacts=artifacts;save();
 const exported=output.replace(/\.json$/,'-files');fs.mkdirSync(exported,{recursive:true});for(const f of artifacts)fs.writeFileSync(path.join(exported,f.name),Buffer.from(engine.workspace.file('project',f.name).base64,'base64'));
 console.log(JSON.stringify({passed:report.passed,checks:report.checks,durationSeconds:report.durationSeconds}));if(!report.passed)process.exitCode=1;
}finally{engine.stop();store.close();budgetStore.close();}
