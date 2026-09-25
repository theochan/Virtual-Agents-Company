import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Store} from '../src/server/store';
import {Workspace,runSandbox} from '../src/server/workspace';
import {SwarmEngine,SWARM_TOOL_IDS,SPAWN_TOOL} from '../src/server/swarm';
import {Routines} from '../src/server/routines';
import {INITIAL_AGENTS} from '../src/data/initialData';
import {defaultSettings} from '../src/server/providers';
function setup(decide:(messages:any[])=>any=()=>({action:'final',reply:'Done'})){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vac-workspace-')),store=new Store(dir);let calls=0;
 const agent={...structuredClone(INITIAL_AGENTS[0]),id:'manager',workspaceId:'ws-default',displayName:'Coordinator',autonomyLevel:3,toolIds:[...SWARM_TOOL_IDS],llmConfig:{provider:'ollama',model:'fixture',temperature:0,maxTokens:1024}};
 store.put('agents','manager',agent);store.put('projects','project',{id:'project',workspaceId:'ws-default',name:'Project',description:'Test',members:[]});
 const engine=new SwarmEngine(store,()=>defaultSettings,(async(_p:any,m:any[])=>{calls++;return{decision:decide(m),receipt:{provider:'ollama',model:'fixture',inputTokens:10,outputTokens:10,cost:null}};})as any);
 const input={coordinatorId:'manager',projectId:'project',objective:'Complete test work',mode:'dynamic',allowedToolIds:[...SWARM_TOOL_IDS],browserPolicy:{allowedOrigins:['https://example.com']}};
 const create=(extra={})=>engine.create({...input,...extra},'test-'+crypto.randomUUID());
 const finish=async(id:string)=>{for(let i=0;i<60&&['queued','working','waiting_children'].includes(engine.get(id).status);i++)await engine.tick();return engine.get(id);};
 return{store,engine,input,create,finish,get calls(){return calls;},cleanup(){engine.stop();store.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
test('full registry fits model context and completes a no-tool objective',async()=>{const f=setup();try{const r=await f.finish(f.create().id);assert.equal(r.status,'completed',r.result);assert.equal(f.calls,1);}finally{f.cleanup();}});
test('file versions isolate projects, reject traversal and stale overwrites; contracts require current run provenance',()=>{const f=setup();try{const w=f.engine.workspace;w.write('project','summary.json',Buffer.from('{"total":600}'),0,'owner');assert.throws(()=>w.write('project','summary.json',Buffer.from('x'),0,'owner'),/version changed/);assert.throws(()=>w.write('project','../escape',Buffer.from('x'),0,'owner'));assert.throws(()=>w.file('foreign','summary.json'));const job=f.create({contracts:[{name:'summary.json',kind:'json_equals',path:['total'],expected:600}]});assert.equal(w.contracts(job)[0].passed,false);w.write('project','summary.json',Buffer.from('{"total":600}'),1,'worker',job.id);assert.equal(w.contracts(job)[0].passed,true);assert.equal(w.file('project','summary.json',1).source,'owner');}finally{f.cleanup();}});
test('sandbox output writes versioned files atomically and reuses durable call receipts',async()=>{const f=setup();try{const w=new Workspace(f.store,async()=>({exitCode:0,stdout:'',stderr:'',files:[{name:'new.txt',base64:Buffer.from('new').toString('base64')},{name:'same.txt',base64:Buffer.from('changed').toString('base64')}]}));w.write('project','same.txt',Buffer.from('old'),0,'owner');const j=f.create();await w.execute(j,'node','tool-code',{code:'ignored',inputNames:[]},'code1',new AbortController().signal);assert.equal(w.file('project','same.txt').version,2);assert.equal(w.file('project','new.txt').version,1);assert.deepEqual(await w.execute(j,'node','tool-code',{code:'ignored'},'code1',new AbortController().signal),f.store.get('swarm-tool-results','code1'));}finally{f.cleanup();}});
test('memory proposals are excluded until approved and indexed retrieval carries provenance and freshness',async()=>{const f=setup();try{const w=f.engine.workspace,j=f.create();await w.execute(j,'node','tool-memory',{propose:'Use USD for quarterly forecasts',subject:'forecast currency'},'memory1',new AbortController().signal);const read=await w.execute(j,'node','tool-memory',{query:'quarter'},'memory2',new AbortController().signal);assert.deepEqual(read.output.results,[]);w.decideMemory(w.memories('project')[0].id,'approved');const accepted=await w.execute(j,'node','tool-memory',{query:'quarterly'},'memory3',new AbortController().signal);assert.equal(accepted.output.results[0].sourceRunId,j.id);assert.equal(accepted.output.results[0].freshness.state,'owner_approved_historical');assert.match(accepted.output.provenance,/sourceRunId/);}finally{f.cleanup();}});

test('memory retrieval withholds conflicts and explicit owner-approved supersession restores one current result',async()=>{const f=setup();try{const w=f.engine.workspace,j=f.create();for(const [call,content] of [['a','Use USD'],['b','Use SGD']] as const){await w.execute(j,'node','tool-memory',{propose:content,subject:'reporting currency'},call,new AbortController().signal);w.decideMemory(w.memories('project').find(m=>m.content===content)!.id,'approved');}let read=await w.execute(j,'node','tool-memory',{query:'use'},'conflict-read',new AbortController().signal);assert.equal(read.output.results.length,0);assert.equal(read.output.withheldConflicts[0].subject,'reporting currency');const previous=w.memories('project').find(m=>m.content==='Use SGD')!;await w.execute(j,'node','tool-memory',{propose:'Use EUR',subject:'reporting currency',supersedesId:previous.id},'c',new AbortController().signal);const proposed=w.memories('project').find(m=>m.content==='Use EUR')!;w.decideMemory(proposed.id,'approved');assert.equal(w.memories('project').find(m=>m.id===previous.id)!.status,'superseded');assert.throws(()=>w.decideMemory(proposed.id,'approved'),/already reviewed/);read=await w.execute(j,'node','tool-memory',{query:'EUR'},'resolved-read',new AbortController().signal);assert.equal(read.output.results[0].content,'Use EUR');assert.equal(read.output.withheldSuperseded,2);}finally{f.cleanup();}});

test('indexed memory retrieval remains bounded, paginated and project-isolated without loading memory history',()=>{const f=setup();try{for(let i=0;i<2500;i++)f.store.put('swarm-memory',`m-${i}`,{id:`m-${i}`,projectId:'project',content:`quarterly forecast evidence token-${i}`,sourceRunId:'run',sourceNodeId:'node',status:'approved',createdAt:new Date(1700000000000+i).toISOString()});f.store.put('projects','other',{id:'other',workspaceId:'ws-default',status:'active'});f.store.put('swarm-memory','foreign',{id:'foreign',projectId:'other',content:'quarterly forecast evidence foreign',sourceRunId:'run',sourceNodeId:'node',status:'approved',createdAt:new Date().toISOString()});const original=f.store.all.bind(f.store);(f.store as any).all=(kind:string)=>{if(kind==='swarm-memory')throw new Error('unbounded memory scan');return original(kind);};const page=f.engine.workspace.retrieveMemory('project','quarterly forecast',7,7);assert.equal(page.results.length,7);assert.equal(page.offset,7);assert.equal(page.hasMore,true);assert.ok(page.results.every((m:any)=>m.projectId==='project'));}finally{f.cleanup();}});
const worker=(name:string,dependsOn:string[]=[])=>({name,role:'Analyst',objective:'Work '+name,instructions:'Report your dependency evidence',toolIds:[],acceptanceCriteria:['Report result'],dependsOn});
test('impossible execution plans are rejected atomically before workers or inference',()=>{
 const f=setup();try{
  const step={...worker('Research'),key:'research',toolIds:['tool-calculator'],toolSequence:['tool-calculator','tool-calculator','tool-calculator'],requiredToolIds:[]};
  assert.throws(()=>f.create({plan:[step],limits:{maxModelCalls:4}}),/cannot fit immutable/);
  assert.equal(f.store.all('swarms').length,0);assert.equal(f.store.all('swarm-nodes').length,0);assert.equal(f.calls,0);
  assert.throws(()=>f.create({harness:'deepagents',allowedToolIds:['tool-calculator'],workflowRequirements:{tasks:[{id:'Research',minimumTools:{'tool-calculator':3},dependsOn:[]}],coordinatorMinimumTools:{}},limits:{maxModelCalls:4}}),/cannot fit immutable/);
  assert.equal(f.store.all('swarms').length,0);assert.equal(f.calls,0);
 }finally{f.cleanup();}
});
test('DAG dependencies wait for completed siblings, deliver evidence once, and reject cycles atomically',async()=>{for(const cycle of [false,true]){const seen:string[]=[];const f=setup(m=>{const root=m[0].content.includes('You are the coordinator.');if(root)return m.some(x=>x.content.startsWith('UNTRUSTED CHILD'))?{action:'final',reply:'Merged'}:{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('A',cycle?['B']:[]),worker('B',['A'])]}};if(m[0].content.includes('You are B,')){assert.ok(seen.includes('A'));assert.ok(m.some(x=>x.content.startsWith('UNTRUSTED DEPENDENCY')));seen.push('B');}else seen.push('A');return{action:'final',reply:'Evidence'};});try{const r=await f.finish(f.create({allowedToolIds:[]}).id);if(cycle){assert.equal(r.status,'failed');assert.equal(r.nodes.length,1);}else{assert.equal(r.status,'completed');assert.deepEqual(seen,['A','B']);}}finally{f.cleanup();}}});
test('write connector pauses before any side effect and rejection never executes it',async()=>{const old=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS='http://127.0.0.1:49999/tools';let connector:any;const f=setup(()=>({action:'tool',toolId:'tool-connector',parameters:{connectorId:connector.id,tool:'write',arguments:{value:600}}}));try{connector=f.engine.workspace.saveConnector({name:'Fixture',endpoint:process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS,tools:[{name:'write',effect:'write'}]});const r=await f.finish(f.create({allowedToolIds:['tool-connector'],connectorIds:[connector.id]}).id);assert.equal(r.status,'waiting_approval');assert.equal(r.budget.toolCalls,0);const a=r.approvals![0];f.engine.decideApproval(a.id,'rejected');const done=await f.finish(r.id);assert.equal(done.status,'failed');assert.equal(done.budget.toolCalls,0);assert.throws(()=>f.engine.decideApproval(a.id,'approved'));}finally{if(old===undefined)delete process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;else process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=old;f.cleanup();}});
test('pinned skill routines survive scheduler recreation, prevent overlap, stop at cap and preserve versions',async()=>{const f=setup();try{let scheduler=new Routines(f.engine);const v1=scheduler.saveSkill({name:'Weekly',template:{...f.input,allowedToolIds:[]}}),v2=scheduler.saveSkill({name:'Weekly',template:{...f.input,objective:'New objective',allowedToolIds:[]}});assert.equal(v2.version,2);const routine=scheduler.create({skillId:v1.id,intervalMinutes:1,maxRuns:2,startsAt:new Date().toISOString()});scheduler.tick();let saved=f.store.get<any>('swarm-routines',routine.id);assert.equal(saved.runs,1);saved.nextAt=0;f.store.put('swarm-routines',saved.id,saved);scheduler=new Routines(f.engine);scheduler.tick();assert.equal(f.store.get<any>('swarm-routines',saved.id).runs,1);await f.finish(saved.lastRunId);scheduler.tick();saved=f.store.get<any>('swarm-routines',saved.id);assert.equal(saved.runs,2);assert.equal(saved.status,'completed');assert.equal(f.engine.get(saved.lastRunId).objective,f.input.objective);scheduler.tick();assert.equal(f.store.all('swarms').length,2);}finally{f.cleanup();}});

test('reviewed trace capture replays two distinct workflows on changed inputs and fails closed on missing inputs',async()=>{
 const f=setup(()=>({action:'final',reply:'Bearer incidental-output-must-not-be-captured'}));
 try{
  const routines=new Routines(f.engine),sources=[
   await f.finish(f.create({allowedToolIds:[]}).id),
   await f.finish(f.create({allowedToolIds:[],plan:[{...worker('Reader'),key:'reader'}]}).id),
  ];
  for(const [workflowIndex,source] of sources.entries()){
   assert.equal(source.status,'completed');
   const draft=routines.capture({runId:source.id,name:`Reviewed workflow ${workflowIndex+1}`});
   assert.equal(draft.status,'draft');assert.ok(draft.traceDigest);assert.equal(draft.redactionPaths.length,0);
   assert.doesNotMatch(JSON.stringify(draft),/incidental-output/);
   const approved:any=routines.reviewDraft(draft.id,{decision:'approved',reason:'Owner verified steps, boundaries and declared input.'});
   assert.equal(approved.skill.review.sourceRunId,source.id);assert.equal(approved.skill.parameters[0].path,'objective');
   assert.throws(()=>routines.replay(approved.skill.id,{},`missing-${workflowIndex}-input`),/missing: objective/);
   assert.throws(()=>routines.replay(approved.skill.id,{objective:'valid',toolIds:'expand'},`extra-${workflowIndex}-input`),/unexpected: toolIds/);
   for(let caseIndex=0;caseIndex<3;caseIndex++){
    const objective=`Changed workflow ${workflowIndex+1} input ${caseIndex+1}`;
    const replay=routines.replay(approved.skill.id,{objective},`reviewed-${workflowIndex}-${caseIndex}`);
    assert.equal(replay.objective,objective);assert.deepEqual(replay.allowedToolIds,[]);
    const done=await f.finish(replay.id);assert.equal(done.status,'completed',done.result);
   }
  }
 }finally{f.cleanup();}
});

test('skill capture redacts secrets, requires reviewed replacement, reports version diff and rolls back immutably',async()=>{
 const f=setup();try{
  const routines=new Routines(f.engine),source=await f.finish(f.create({objective:'Prepare report with api_key=supersecretvalue123',allowedToolIds:[]}).id);
  const draft=routines.capture({runId:source.id,name:'Redacted workflow'});assert.deepEqual(draft.redactionPaths,['objective']);assert.match(draft.template.objective,/REDACTED/);
  assert.throws(()=>routines.reviewDraft(draft.id,{decision:'approved',reason:'Approve without replacement'}),/Replace all redacted/);
  const safe={...draft.template,objective:'Prepare the report for the declared account.'};
  const first:any=routines.reviewDraft(draft.id,{decision:'approved',template:safe,reason:'Owner replaced secret-bearing text.'});assert.equal(first.skill.version,1);
  const second:any=routines.saveSkill({name:first.skill.name,template:{...safe,objective:'Prepare the revised report.'},parameters:first.skill.parameters});
  assert.equal(second.version,2);assert.deepEqual(second.diff.changedPaths,['objective']);
  const rolled:any=routines.rollback(second.id,{toVersion:1,reason:'Owner rejected the revised wording.'});
  assert.equal(rolled.version,3);assert.equal(rolled.template.objective,safe.objective);assert.equal(rolled.review.rollbackTarget,1);assert.equal(routines.skills('project').length,3);
 }finally{f.cleanup();}
});
test('real sandbox generates documents and denies network, host filesystem and secrets',{skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
 const r=await runSandbox({language:'python',inputNames:[],files:[],code:`import os,json,socket\nfrom docx import Document\nfrom openpyxl import Workbook\nfrom pptx import Presentation\nfrom reportlab.pdfgen import canvas\nassert not os.path.exists('/Users/theo')\nassert 'VAC_ACCESS_TOKEN' not in os.environ\ntry:\n socket.create_connection(('1.1.1.1',443),timeout=1)\n raise AssertionError('network available')\nexcept OSError: pass\nd=Document();d.add_paragraph('Revenue 600');d.save('report.docx')\nw=Workbook();w.active.append(['Revenue',600]);w.save('report.xlsx')\np=Presentation();p.slides.add_slide(p.slide_layouts[0]).shapes.title.text='Revenue 600';p.save('report.pptx')\nc=canvas.Canvas('report.pdf');c.drawString(72,700,'Revenue 600');c.save()\nopen('summary.json','w').write(json.dumps({'total':600}))\nprint('isolation and documents passed')`},new AbortController().signal);assert.equal(r.exitCode,0,r.stderr);assert.equal(r.files.length,5);assert.match(r.stdout,/passed/);
});

test('concurrent sandbox output conflict rolls back all new artifacts',async()=>{const f=setup();try{const w=new Workspace(f.store,async()=>{f.engine.workspace.write('project','existing.txt',Buffer.from('concurrent'),1,'owner');return{exitCode:0,stdout:'',stderr:'',files:[{name:'new.txt',base64:Buffer.from('new').toString('base64')},{name:'existing.txt',base64:Buffer.from('changed').toString('base64')}]};});w.write('project','existing.txt',Buffer.from('old'),0,'owner');await assert.rejects(()=>w.execute(f.create(),'node','tool-code',{code:'ignored'},'conflict',new AbortController().signal),/version changed/);assert.throws(()=>w.file('project','new.txt'),/not found/);assert.equal(w.file('project','existing.txt').version,2);assert.equal(f.store.get('swarm-tool-results','conflict'),undefined);}finally{f.cleanup();}});

test('code-capable nodes receive real CSV headers, not guessed schemas',async()=>{let saw=false;const f=setup(m=>{const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);assert.equal(state.projectFiles[0].csvHeader,'product,revenue,cost');saw=true;return{action:'final',reply:'Inspected header'};});try{f.engine.workspace.write('project','sales.csv',Buffer.from('product,revenue,cost\nA,100,60\n'),0,'owner');const r=await f.finish(f.create({allowedToolIds:['tool-code']}).id);assert.equal(r.status,'completed');assert.equal(saw,true);}finally{f.cleanup();}});

test('deterministic report recipe validates CSV columns and produces inspectable document contents',{skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
 const f=setup();try{const w=f.engine.workspace;w.write('project','sales.csv',Buffer.from('product,revenue,cost\nA,100,60\nB,200,120\nC,300,180\n'),0,'owner');const j=f.create();await w.execute(j,'node','tool-code',{recipe:'tabular_report',inputName:'sales.csv',valueColumns:['revenue','cost'],outputPrefix:'report'},'recipe1',new AbortController().signal);assert.deepEqual(JSON.parse(Buffer.from(w.file('project','summary.json').base64,'base64').toString()),{revenue:600,cost:360,profit:240,rows:3});const files=w.files('project').filter(f=>f.runId===j.id).map(f=>w.file('project',f.name));const check=await runSandbox({language:'python',inputNames:[],files:files.map(({name,base64})=>({name,base64})),code:`from docx import Document\nfrom openpyxl import load_workbook\nfrom pptx import Presentation\nfrom pypdf import PdfReader\nassert '600' in '\\n'.join(p.text for p in Document('report.docx').paragraphs)\nassert load_workbook('report.xlsx').active.cell(2,1).value==600\nassert '600' in '\\n'.join(s.text for slide in Presentation('report.pptx').slides for s in slide.shapes if s.has_text_frame)\nassert '600' in PdfReader('report.pdf').pages[0].extract_text()\nprint('All four binary document formats inspected')`},new AbortController().signal);assert.equal(check.exitCode,0,check.stderr);await assert.rejects(()=>w.execute(j,'node','tool-code',{recipe:'tabular_report',inputName:'sales.csv',valueColumns:['missing'],outputPrefix:'bad'},'recipe2',new AbortController().signal),/column missing/);}finally{f.cleanup();}
});

test('interactive browser approvals bind the current target and are consumed exactly once',async()=>{
 const {SwarmBrowser}=await import('../src/server/browser');let calls=0;const requests:string[]=[];
 const f=setup(()=>{calls++;return calls===1?{action:'tool',toolId:'tool-browser',parameters:{action:'navigate',url:'https://example.com'}}:calls===2?{action:'tool',toolId:'tool-browser',parameters:{action:'fill',selector:'#name',value:'Synthetic'}}:calls===3?{action:'tool',toolId:'tool-browser',parameters:{action:'click',selector:'#submit'}}:{action:'final',reply:'Submitted test form'};});
 const browser=new SwarmBrowser(async r=>{requests.push(r.method);return{status:200,headers:{'content-type':'text/html'},body:Buffer.from(r.method==='POST'?'<h1>Saved</h1>':'<form method="POST" action="/save"><input id="name" name="name"><button id="submit">Save</button></form>')};});(f.engine as any).browsers=browser;
 try{let r=await f.finish(f.create({allowedToolIds:['tool-browser'],browserPolicy:{allowedOrigins:['https://example.com'],allowActions:true}}).id);assert.equal(r.status,'waiting_approval');assert.deepEqual(requests,['GET']);const first=r.approvals![0];assert.match(first.preview,/https:\/\/example.com/);f.engine.decideApproval(first.id,'approved');assert.throws(()=>f.engine.decideApproval(first.id,'approved'),/no longer/);r=await f.finish(r.id);assert.equal(r.status,'waiting_approval');assert.deepEqual(requests,['GET']);const next=r.approvals!.find(a=>a.status==='pending')!;f.engine.decideApproval(next.id,'approved');r=await f.finish(r.id);assert.equal(r.status,'completed',r.result);assert.deepEqual(requests,['GET','POST']);assert.ok(r.approvals!.every(a=>a.status==='consumed'));}finally{await browser.closeAll();f.cleanup();}
});

test('owner-defined workflow compiles hierarchy and dependencies atomically without planner calls',async()=>{
 const seen:string[]=[];const f=setup(m=>{seen.push(m[0].content.match(/^You are ([^,]+)/)?.[1]);return{action:'final',reply:'Verified subtask'};});
 try{const plan=[{...worker('Lead'),key:'lead'},{...worker('Leaf'),key:'leaf',parentKey:'lead'},{...worker('Review',['lead']),key:'review'}];const run=f.create({allowedToolIds:[],requiredDepth:2,plan});assert.equal(run.nodes.length,4);assert.equal(f.calls,0);assert.equal(run.nodes[1].status,'waiting_children');const done=await f.finish(run.id);assert.equal(done.status,'completed',done.result);assert.ok(seen.indexOf('Leaf')<seen.indexOf('Lead'));assert.ok(seen.indexOf('Lead')<seen.indexOf('Review'));const before=f.store.all('swarms').length;assert.throws(()=>f.create({plan:[{...worker('A'),key:'a',parentKey:'b'},{...worker('B'),key:'b',parentKey:'a'}]}),/cycle/);assert.equal(f.store.all('swarms').length,before);assert.throws(()=>f.create({plan:[{...worker('A',['b']),key:'a'},{...worker('B',['a']),key:'b'}]}),/cycle/);}finally{f.cleanup();}
});

test('ordered tool steps expose only the next authorized action and prevent repeated successful work',async()=>{
 const f=setup(m=>{const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);return state.nextRequiredTool?{action:'tool',toolId:state.nextRequiredTool,parameters:state.nextRequiredTool==='tool-calculator'?{operation:'add',a:2,b:3}:{}}:{action:'final',reply:'Sequence complete'};});try{const r=await f.finish(f.create({allowedToolIds:['tool-read-project','tool-calculator'],toolSequence:['tool-read-project','tool-calculator']}).id);assert.equal(r.status,'completed',r.result);assert.deepEqual(r.nodes[0].receipts.filter(r=>r.toolId).map(r=>r.toolId),['tool-read-project','tool-calculator']);assert.equal(r.budget.modelCalls,3);assert.throws(()=>f.create({allowedToolIds:['tool-calculator'],toolSequence:['tool-files']}),/grant/);}finally{f.cleanup();}
 const bad=setup(()=>({action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:1,b:2}}));try{const r=await bad.finish(bad.create({allowedToolIds:['tool-read-project','tool-calculator'],toolSequence:['tool-read-project','tool-calculator']}).id);assert.equal(r.status,'failed');assert.equal(r.budget.toolCalls,0);}finally{bad.cleanup();}
});

test('connector argument schemas reach the model and reject malformed values before approval or dispatch',()=>{const f=setup();try{const c=f.engine.workspace.saveConnector({name:'Typed gateway',endpoint:'https://gateway.example/tools',tools:[{name:'save',effect:'write',inputSchema:{type:'object',properties:{revenue:{type:'number'},profit:{type:'number'}},required:['revenue','profit'],additionalProperties:false}}]});const j=f.create({connectorIds:[c.id]});const def:any=f.engine.workspace.connectorDefinition(j);assert.equal(def.schema.properties.arguments.properties.revenue.type,'number');assert.throws(()=>f.engine.workspace.connector(j,{connectorId:c.id,tool:'save',arguments:{revenue:{value:600},profit:240}}));assert.equal(f.engine.workspace.connector(j,{connectorId:c.id,tool:'save',arguments:{revenue:600,profit:240}}).write,true);assert.throws(()=>f.engine.workspace.connector(j,{connectorId:c.id,tool:'save',arguments:{revenue:600,profit:240,extra:'no'}}));}finally{f.cleanup();}});

test('planned depth confusion receives one factual correction without bypassing tool evidence',async()=>{for(const persistent of [false,true]){let rootCalls=0;const f=setup(m=>{if(!m[0].content.includes('You are the coordinator.'))return{action:'final',reply:'Child finished'};rootCalls++;return rootCalls===1||persistent?{action:'blocked',reason:'Depth cap prevents further tool execution'}:rootCalls===2?{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:2,b:3}}:{action:'final',reply:'5'};});try{const r=await f.finish(f.create({allowedToolIds:['tool-calculator'],toolSequence:['tool-calculator'],plan:[{...worker('Child'),key:'child'}]}).id);assert.equal(r.status,persistent?'blocked':'completed',r.result);assert.equal(r.events.filter(e=>e.type==='BLOCK_REVIEW').length,1);assert.equal(r.budget.toolCalls,persistent?0:1);}finally{f.cleanup();}}});

test('rich dynamic context retains room for child evidence and typed connectors without raising the envelope',async()=>{
 let rootCalls=0;const f=setup(m=>{if(!m[0].content.includes('You are the coordinator.'))return{action:'final',reply:'Evidence '.repeat(120)};rootCalls++;return rootCalls===1?{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('A'),worker('B'),worker('C')]}}:rootCalls===2?{action:'tool',toolId:'tool-select-tools',parameters:{toolIds:['tool-read-project','tool-calculator','tool-memory']}}:rootCalls===3?{action:'tool',toolId:'tool-read-project',parameters:{}}:rootCalls===4?{action:'tool',toolId:'tool-calculator',parameters:{operation:'subtract',a:600,b:360}}:rootCalls===5?{action:'tool',toolId:'tool-memory',parameters:{propose:'Retain verified totals.'}}:{action:'final',reply:'Verified 240'};});
 try{const c=f.engine.workspace.saveConnector({name:'Typed connector',endpoint:'https://gateway.example/tools',tools:[{name:'save',effect:'write',inputSchema:{type:'object',properties:{revenue:{type:'number'},profit:{type:'number'}},required:['revenue','profit'],additionalProperties:false}}]});const contracts=Array.from({length:6},(_,i)=>({name:`file${i}.json`,kind:'json_equals',path:['total'],expected:600}));const r=f.create({objective:'Prepare a source-backed sales report with verified current-run artifacts and bounded collaboration. '.repeat(16),connectorIds:[c.id],contracts,requiredToolIds:['tool-read-project','tool-calculator','tool-memory']});for(let i=0;i<20;i++)f.engine.workspace.write('project',`file${i}.json`,Buffer.from('{"total":600}'),0,'fixture',r.id);const done=await f.finish(r.id);assert.equal(done.status,'completed',done.result);assert.equal(rootCalls,6);assert.ok(done.verification?.every(v=>v.passed));}finally{f.cleanup();}
});

const plannerTask=(key:string,extra:any={})=>({executor:'worker',key,name:key,instructions:'Complete task with evidence.',agentId:'',supervisors:[],dependsOn:[],toolSequence:[],requiredToolIds:[],...extra});

const plannerSubmission=(tasks:any[],toolSequence:string[]=[])=>({tasks:[{executor:'coordinator',toolSequence},...tasks]});

test('Deep Agents generates and atomically compiles a workflow using the shared budget',async()=>{
 const f=setup(m=>m[0].content.includes('VAC workflow planner')?{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf')],[])}:{action:'final',reply:'Done'});
 try{const r=await f.finish(f.create({harness:'deepagents',allowedToolIds:[]}).id);assert.equal(r.status,'completed',r.result);assert.equal(r.nodes.length,2);assert.equal(r.budget.modelCalls,3);assert.equal(r.budget.toolCalls,1);assert.equal(r.budget.spawned,1);assert.equal(r.harnessResult?.harness,'deepagents@1.14.0');assert.equal(r.nodes[0].receipts.filter(x=>x.phase==='harness-planning').length,1);assert.throws(()=>f.create({harness:'deepagents',plan:[{...worker('Leaf'),key:'leaf'}]}),/generates its own/);}finally{f.cleanup();}
});

test('invalid harness plans never create nodes and repeated attempts stop at the planning cap',async()=>{
 const f=setup(()=>({action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('bad',{toolSequence:['tool-code']})],[])}));
 try{const r=await f.finish(f.create({harness:'deepagents',allowedToolIds:[]}).id);assert.notEqual(r.status,'completed');assert.equal(r.nodes.length,1);assert.equal(r.budget.spawned,0);assert.equal(r.budget.modelCalls,4);assert.equal(f.store.all('swarm-nodes').length,1);assert.match(r.nodes[0].result!,/planning limit/);}finally{f.cleanup();}
});

test('harness cannot bypass root context budgets or call filesystem and task tools',async()=>{
 for(const toolId of ['execute','task','write_file','write_todos']){const f=setup(()=>({action:'tool',toolId,parameters:{}}));try{const r=await f.finish(f.create({harness:'deepagents'}).id);assert.equal(r.status,'failed');assert.equal(r.nodes.length,1);assert.equal(r.budget.toolCalls,0);assert.match(r.nodes[0].result!,/unavailable tool|planning authority/);}finally{f.cleanup();}}
 const f=setup();try{const r=await f.finish(f.create({harness:'deepagents',limits:{maxInputTokens:4096}}).id);assert.equal(r.status,'budget_exhausted');assert.equal(f.calls,0);}finally{f.cleanup();}
});

test('cancellation during harness inference cannot compile or resurrect a plan',async()=>{
 const f=setup();let release:any,started:any;const entered=new Promise<void>(r=>started=r);
 (f.engine as any).inference=async()=>{started();await new Promise<void>(r=>release=r);return{decision:{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf')],[])},receipt:{inputTokens:12,outputTokens:10}};};
 try{const r=f.create({harness:'deepagents',allowedToolIds:[]});const ticking=f.engine.tick();await entered;f.engine.cancel(r.id);release();await ticking;const done=f.engine.get(r.id);assert.equal(done.status,'cancelled');assert.equal(done.nodes.length,1);assert.equal(done.budget.spawned,0);assert.equal(done.budget.modelCalls,1);}finally{f.cleanup();}
});

test('harness corrects aggregate topology feedback without persisting rejected workers',async()=>{
 let planning=0;const f=setup(m=>{
  if(!m[0].content.includes('VAC workflow planner'))return{action:'final',reply:'Done'};
  planning++;
  return{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf',{supervisors:[{name:'Lead',agentId:''}],dependsOn:planning===1?['supervisor_0']:[]})],[])};
 });try{const r=await f.finish(f.create({harness:'deepagents',allowedToolIds:[],requiredDepth:2}).id);assert.equal(r.status,'completed',r.result);assert.equal(r.nodes.length,3);assert.equal(r.budget.spawned,2);assert.equal(r.budget.toolCalls,2);assert.equal(r.events.filter(e=>e.type==='HARNESS_REJECTED').length,1);assert.match(r.events.find(e=>e.type==='HARNESS_REJECTED')!.detail,/task key/);assert.equal(f.store.all('swarm-nodes').length,3);}finally{f.cleanup();}
});

test('generated root sequences are revalidated before workflow compilation',async()=>{
 const f=setup(()=>({action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf')],Array(25).fill('tool-calculator'))}));try{const r=await f.finish(f.create({harness:'deepagents',allowedToolIds:['tool-calculator']}).id);assert.equal(r.status,'failed');assert.equal(r.nodes.length,1);assert.equal(r.budget.spawned,0);assert.match(r.nodes[0].result!,/planning limit/);}finally{f.cleanup();}
});

test('independent semantic review is isolated, grounded, budgeted and blocks false acceptance',async()=>{
 for(const verdict of ['pass','fail','ungrounded']){
  let isolated=false;
  const f=setup(m=>{
   if(m[0].content.startsWith('You are an independent')){isolated=!m.some(x=>x.content.includes('RUN STATE'));return {action:'tool',toolId:'submit_review',parameters:{checks:[{criterion:0,verdict:verdict==='fail'?'fail':'pass',reason:'Compare source total',evidence:[{name:'source.txt',quote:'total 42'},{name:'result.txt',quote:verdict==='ungrounded'?'invented quote':'total 42'}]}]}};}
   if(!m.some(x=>x.content.includes('UNTRUSTED TOOL')))return{action:'tool',toolId:'tool-write-file',parameters:{name:'result.txt',content:'total 42',expectedVersion:0}};
   return{action:'final',reply:'Produced total 42'};
  });
  try{
   f.store.put('agents','reviewer',{...f.store.get<any>('agents','manager'),id:'reviewer',displayName:'Independent reviewer',toolIds:[]});
   f.engine.workspace.write('project','source.txt',Buffer.from('total 42'),0,'owner');
   const semanticReview={reviewerId:'reviewer',criteria:['Output total matches source'],inputNames:['source.txt'],outputNames:['result.txt']};
   assert.throws(()=>f.create({semanticReview:{...semanticReview,reviewerId:'manager'}}),/different eligible/);
   const done=await f.finish(f.create({allowedToolIds:['tool-write-file'],toolSequence:['tool-write-file'],semanticReview}).id);
   assert.equal(done.status,verdict==='pass'?'completed':'blocked',done.result);assert.equal(isolated,true);assert.equal(done.budget.modelCalls,verdict==='pass'?4:3);
   assert.equal(done.semanticReviewResult?.passed,verdict==='pass');assert.ok(done.semanticReviewResult?.packetHash);
   assert.equal(done.nodes[0].receipts.filter(r=>r.purpose==='independent_review').length,verdict==='pass'?2:1);
  }finally{f.cleanup();}
 }
});

test('uncertain connector operation is durable across reconstruction and cannot be replayed',async()=>{
 const http=await import('node:http');let writes=0;
 const server=http.createServer((_req,res)=>{writes++;res.writeHead(503).end('lost result');});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,previous=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;
 const f=setup();try{
  const c=f.engine.workspace.saveConnector({name:'write fixture',endpoint,tools:[{name:'save',effect:'write'}]})!;
  const j=f.create({allowedToolIds:['tool-connector'],connectorIds:[c.id]});const args={connectorId:c.id,tool:'save',arguments:{value:42}};
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',args,'uncertain',new AbortController().signal),/503/);
  assert.equal(writes,1);assert.equal(f.store.get<any>('connector-operations','uncertain').status,'outcome_unknown');
  const reopened=new Workspace(f.store);await assert.rejects(reopened.execute(j,'node','tool-connector',args,'uncertain',new AbortController().signal),/Replay blocked/);
  await assert.rejects(reopened.execute(j,'node','tool-connector',{...args,arguments:{value:99}},'uncertain',new AbortController().signal),/Conflicting/);
  assert.equal(writes,1);assert.equal(f.engine.get(j.id).connectorOperations?.[0].status,'outcome_unknown');
 }finally{f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=previous||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('planned dependencies across branches wait for evidence and block after prerequisite failure',async()=>{
 for(const fail of [false,true]){
  const seen:string[]=[];
  const f=setup(m=>{
   const name=m[0].content.match(/^You are ([^,]+)/)?.[1];seen.push(name);
   if(name==='Research')return fail?{action:'blocked',reason:'Source unavailable'}:{action:'final',reply:'Source verified'};
   if(name==='Review')assert.ok(m.some(x=>x.content.startsWith('UNTRUSTED DEPENDENCY')&&x.content.includes('Source verified')));
   return{action:'final',reply:'Done'};
  });
  try{
   const plan=[{...worker('Lead A'),key:'a'},{...worker('Lead B'),key:'b'},
    {...worker('Review',['research']),key:'review',parentKey:'b'},
    {...worker('Research'),key:'research',parentKey:'a'}];
   const done=await f.finish(f.create({allowedToolIds:[],plan}).id);
   const reviewer=done.nodes.find(n=>n.name==='Review')!;
   assert.equal(reviewer.status,fail?'blocked':'completed');
   if(fail){assert.ok(!seen.includes('Review'));assert.notEqual(done.status,'completed');}
   else{assert.equal(done.status,'completed',done.result);assert.ok(seen.indexOf('Research')<seen.indexOf('Review'));}
  }finally{f.cleanup();}
 }
});

test('planned completion cycles include implicit supervisor waits and reject atomically',()=>{
 const f=setup();
 try{
  const invalid=[
   [{...worker('Lead'),key:'lead'},{...worker('Leaf',['lead']),key:'leaf',parentKey:'lead'}],
   [{...worker('A'),key:'a'},{...worker('B'),key:'b'},
    {...worker('X',['b']),key:'x',parentKey:'a'},{...worker('Y',['a']),key:'y',parentKey:'b'}],
   [{...worker('A',['foreign-node-id']),key:'a'}],
   [{...worker('A',['a']),key:'a'}],
  ];
  for(const plan of invalid){assert.throws(()=>f.create({allowedToolIds:[],plan}),/cycle|not a plan key|self dependency/);assert.equal(f.store.all('swarms').length,0);assert.equal(f.store.all('swarm-nodes').length,0);assert.equal(f.store.all('swarm-budgets').length,0);}
  assert.equal(f.calls,0);
 }finally{f.cleanup();}
});

test('harness accepts cross-branch dependencies without expanding inherited grants',async()=>{
 for(const excess of [false,true]){
  const f=setup(m=>m[0].content.includes('VAC workflow planner')?{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('research',{supervisors:[{name:'Lead',agentId:''}],toolSequence:excess?['tool-code']:[]}),plannerTask('review',{dependsOn:['research']})],[])}:{action:'final',reply:'Done'});
  try{const done=await f.finish(f.create({harness:'deepagents',allowedToolIds:['tool-calculator'],requiredDepth:2}).id);
   assert.equal(done.status,excess?'failed':'completed',done.result);
   assert.equal(done.budget.spawned,excess?0:3);
   if(excess)assert.equal(done.budget.modelCalls,4);else assert.equal(done.events.filter(e=>e.type==='HARNESS_REJECTED').length,0);
  }finally{f.cleanup();}
 }
});

test('compiled supervisor unions remain bounded by saved-profile eligibility and root node allowance',async()=>{
 for(const mode of ['profile','count']){
  const f=setup(()=>({action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf',{supervisors:[{name:'Lead',agentId:mode==='profile'?'limited':''}],toolSequence:['tool-calculator']})],[])}));
  try{
   f.store.put('agents','limited',{...f.store.get<any>('agents','manager'),id:'limited',toolIds:[]});
   const r=await f.finish(f.create({harness:'deepagents',mode:'hybrid',allowedToolIds:['tool-calculator'],limits:{maxAgents:mode==='count'?2:4}}).id);
   assert.equal(r.status,'failed');assert.equal(r.budget.spawned,0);assert.equal(f.store.all('swarm-nodes').length,1);
   assert.ok(r.events.some(e=>e.type==='HARNESS_REJECTED'&&e.detail.includes(mode==='count'?'agent allowance':'not eligible')));
  }finally{f.cleanup();}
 }
});

test('coordinator assignment executes root tools personally after child completion',async()=>{
 let planned=false;
 const f=setup(m=>{
  if(!planned){planned=true;return{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('leaf')],['tool-calculator'])};}
  const state=JSON.parse(m.find(x=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);
  if(state.nextRequiredTool)return{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:2,b:3}};
  return{action:'final',reply:'Done'};
 });
 try{const r=await f.finish(f.create({harness:'deepagents',allowedToolIds:['tool-calculator'],requiredToolIds:['tool-calculator']}).id);
  assert.equal(r.status,'completed',r.result);assert.equal(r.nodes.length,2);
  assert.equal(r.nodes[0].receipts.filter(x=>x.toolId==='tool-calculator'&&x.status==='succeeded').length,1);
  assert.equal(r.nodes[1].receipts.filter(x=>x.toolId).length,0);
 }finally{f.cleanup();}
});

test('autonomous plan repeats file operations and shares calculator grants with personal root evidence',async()=>{
 const f=setup(m=>{
  if(m[0].content.includes('VAC workflow planner'))return{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('Analyst',{toolSequence:['tool-calculator','tool-write-file','tool-write-file','tool-files','tool-files'],requiredToolIds:['tool-calculator','tool-write-file','tool-files'],instructions:'Compute and write two distinct outputs, then read them.'})],['tool-calculator'])};
  const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);
  if(!state.nextRequiredTool)return{action:'final',reply:'Verified'};
  const i=state.nextSequenceStep;
  if(m[0].content.includes('You are Analyst,'))assert.ok(state.contracts.some((c:any)=>c.name==='first.json'));
  const parameters=state.nextRequiredTool==='tool-calculator'?{operation:'add',a:19,b:23}:state.nextRequiredTool==='tool-write-file'?{name:i===1?'first.json':'second.json',content:'{"value":42}',expectedVersion:0}:{name:i===3?'first.json':'second.json'};
  return{action:'tool',toolId:state.nextRequiredTool,parameters};
 });
 try{const done=await f.finish(f.create({harness:'deepagents',allowedToolIds:['tool-calculator','tool-files','tool-write-file'],requiredToolIds:['tool-calculator'],contracts:[{name:'first.json',kind:'json_equals',path:['value'],expected:42}],limits:{maxCallsPerAgent:12}}).id);
  assert.equal(done.status,'completed',done.result);
  const child=done.nodes.find(n=>n.parentId)!;
  assert.deepEqual(child.receipts.filter(r=>r.toolId).map(r=>r.sequenceStep),[0,1,2,3,4]);
  assert.equal(done.nodes[0].receipts.filter(r=>r.toolId==='tool-calculator'&&r.status==='succeeded').length,1);
  for(const name of ['first.json','second.json'])assert.equal(f.engine.workspace.file('project',name).version,1);
 }finally{f.cleanup();}
});

test('repeated successful side effect is rejected before a second dispatch',async()=>{
 const f=setup(()=>({action:'tool',toolId:'tool-memory',parameters:{propose:'Do not duplicate this proposal.'}}));
 try{const done=await f.finish(f.create({allowedToolIds:['tool-memory'],toolSequence:['tool-memory','tool-memory']}).id);
 assert.equal(done.status,'failed');assert.match(done.result!,/must not be replayed/);assert.equal(f.engine.workspace.memories('project').length,1);
 assert.equal(done.nodes[0].receipts.filter(r=>r.status==='succeeded'&&r.toolId==='tool-memory').length,1);
 }finally{f.cleanup();}
});

test('failed repeated step cannot be skipped by the prior successful receipt',async()=>{
 const f=setup(m=>{const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);return{action:'tool',toolId:'tool-files',parameters:{name:state.nextSequenceStep===0?'exists.txt':'missing.txt'}};});
 try{f.engine.workspace.write('project','exists.txt',Buffer.from('evidence'),0,'owner');const done=await f.finish(f.create({allowedToolIds:['tool-files'],toolSequence:['tool-files','tool-files']}).id);
 assert.equal(done.status,'failed');const receipts=done.nodes[0].receipts.filter(r=>r.toolId==='tool-files');assert.deepEqual(receipts.map(r=>[r.sequenceStep,r.status]),[[0,'succeeded'],[1,'failed']]);
 }finally{f.cleanup();}
});

test('planned browser worker opens separate source pages with separate completion receipts',async()=>{
 const {SwarmBrowser}=await import('../src/server/browser');const requests:string[]=[];
 const browser=new SwarmBrowser(async r=>{requests.push(r.url);return{status:200,headers:{'content-type':'text/html'},body:Buffer.from('<h1>'+r.url+'</h1>')};});
 const f=setup(m=>{const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);return state.nextRequiredTool?{action:'tool',toolId:'tool-browser',parameters:{action:'navigate',url:state.nextSequenceStep===0?'https://example.com/quote':'https://example.com/filing'}}:{action:'final',reply:'Read both sources'};});(f.engine as any).browsers=browser;
 try{const done=await f.finish(f.create({allowedToolIds:['tool-browser'],toolSequence:['tool-browser','tool-browser']}).id);assert.equal(done.status,'completed',done.result);assert.deepEqual(requests,['https://example.com/quote','https://example.com/filing']);assert.deepEqual(done.nodes[0].receipts.filter(r=>r.toolId==='tool-browser').map(r=>r.sequenceStep),[0,1]);}
 finally{await browser.closeAll();f.cleanup();}
});

test('repeated connector steps do not reuse approval or dispatch an already successful write',async()=>{
 const http=await import('node:http');let writes=0;const server=http.createServer(async(req,res)=>{let body='';for await(const b of req)body+=b;const x=JSON.parse(body);writes++;res.setHeader('content-type','application/json');res.end(JSON.stringify({jsonrpc:'2.0',id:x.id,result:{content:[{type:'text',text:'saved'}]}}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,previous=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;let connector:any;
 let calls=0;const f=setup(()=>({action:'tool',toolId:'tool-connector',parameters:++calls===1?{connectorId:connector.id,tool:'save',arguments:{value:42}}:{arguments:{value:42},tool:'save',connectorId:connector.id}}));
 try{connector=f.engine.workspace.saveConnector({name:'once',endpoint,tools:[{name:'save',effect:'write'}]});let r=await f.finish(f.create({allowedToolIds:['tool-connector'],toolSequence:['tool-connector','tool-connector'],connectorIds:[connector.id]}).id);assert.equal(r.status,'waiting_approval');assert.equal(writes,0);f.engine.decideApproval(r.approvals![0].id,'approved');r=await f.finish(r.id);assert.equal(r.status,'failed');assert.match(r.result!,/must not be replayed/);assert.equal(writes,1);assert.equal(r.approvals!.length,1);assert.equal(r.approvals![0].status,'consumed');}
 finally{f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=previous||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('interrupted repeated-write sequence cannot replay writes on recovery and explicit resume',async()=>{
 const f=setup(m=>{const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);return state.nextRequiredTool?{action:'tool',toolId:'tool-write-file',parameters:{name:state.nextSequenceStep===0?'first.txt':'second.txt',content:'evidence',expectedVersion:0}}:{action:'final',reply:'Retained evidence'};});
 try{const j=f.create({allowedToolIds:['tool-write-file'],toolSequence:['tool-write-file','tool-write-file']});await f.engine.tick();await f.engine.tick();
  const n=f.store.get<any>('swarm-nodes',j.rootNodeId);assert.equal(n.pending.sequenceStep,1);assert.equal(n.receipts.filter((r:any)=>r.toolId==='tool-write-file'&&r.status==='succeeded').length,1);
  n.status='working';f.store.put('swarm-nodes',n.id,n);f.engine.recover();assert.equal(f.engine.get(j.id).status,'blocked');f.engine.resume(j.id);await f.finish(j.id);
  assert.equal(f.engine.workspace.file('project','first.txt').version,1);assert.throws(()=>f.engine.workspace.file('project','second.txt'),/not found/);
 }finally{f.cleanup();}
});

test('required dynamic delegation precedes root sequence without consuming its first step',async()=>{
 let rootCalls=0;const f=setup(m=>{if(!m[0].content.includes('You are the coordinator.'))return{action:'final',reply:'Child done'};rootCalls++;return rootCalls===1?{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('Child')]}}:rootCalls===2?{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:1,b:2}}:{action:'final',reply:'3'};});
 try{const r=await f.finish(f.create({requiredDepth:1,allowedToolIds:['tool-calculator'],toolSequence:['tool-calculator']}).id);assert.equal(r.status,'completed',r.result);assert.equal(r.nodes[0].receipts.find(r=>r.toolId==='tool-calculator').sequenceStep,0);}finally{f.cleanup();}
});

test('harness rejects omitted task operations before dispatch and preserves assignment identity',async()=>{
 let planning=0;const f=setup(m=>{
  if(m[0].content.includes('VAC workflow planner')){planning++;return{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission([plannerTask('research',{assignmentId:'Research',name:'Named differently',toolSequence:planning===1?['tool-files']:['tool-files','tool-files']})])};}
  const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);return state.nextRequiredTool?{action:'tool',toolId:'tool-files',parameters:{}}:{action:'final',reply:'Verified'};
 });
 try{const done=await f.finish(f.create({harness:'deepagents',allowedToolIds:['tool-files'],workflowRequirements:{tasks:[{id:'Research',minimumTools:{'tool-files':2},dependsOn:[]}],coordinatorMinimumTools:{}}}).id);assert.equal(done.status,'completed',done.result);assert.equal(done.nodes.length,2);assert.equal(done.nodes[1].assignmentId,'Research');assert.equal(planning,2);assert.equal(done.events.filter(e=>e.type==='HARNESS_REJECTED').length,1);assert.equal(done.nodes[1].receipts.filter(r=>r.toolId==='tool-files').length,2);}finally{f.cleanup();}
});

test('nine-node research context retains brief and source observations inside unchanged envelope',async()=>{
 const {browserTool}=await import('../src/server/browser');const f=setup();
 try{const task=(name:string,key:string,parentKey?:string)=>({...worker(name),key,parentKey,instructions:'Read the assigned brief, search current sources, open the original pages and preserve exact evidence.',toolIds:['tool-files','tool-browser','tool-write-file'],toolSequence:parentKey?['tool-files','tool-browser','tool-browser','tool-write-file']:[]});
 const plan=[task('Research Lead','research'),...['Price','Fundamentals','Events'].map(x=>task(x+' Research Specialist',x,'research')),task('Investment Lead','investment'),...['Valuation','Reviewer','Decision'].map(x=>task(x+' Specialist',x,'investment'))];
 for(let i=0;i<6;i++)f.engine.workspace.write('project',`brief-${i}.txt`,Buffer.from('BRIEF POLICY '+ 'bounded requirements '.repeat(90)),0,'owner');
 const j=f.create({objective:'Research MSFT current price, filings and events. '.repeat(45),allowedToolIds:['tool-files','tool-browser','tool-write-file'],plan,contracts:Array.from({length:7},(_,i)=>({name:`output-${i}.json`,kind:'exists'})),limits:{maxAgents:9}});
 const n=f.store.get<any>('swarm-nodes',j.nodes[2].id);n.messages.push({role:'user',content:'BRIEF POLICY '+ 'bounded requirements '.repeat(90)},{role:'user',content:'SOURCE EVIDENCE '+ 'retrieved source words '.repeat(90)});
 const messages=(f.engine as any).modelMessages(j,n,[browserTool]);const serialized=JSON.stringify({messages,tools:[browserTool]});assert.ok(Buffer.byteLength(serialized)+1024<=14336);assert.match(serialized,/BRIEF POLICY/);assert.match(serialized,/SOURCE EVIDENCE/);
 }finally{f.cleanup();}
});

test('assignment briefs are frozen owner instructions and cannot be promoted from worker output',()=>{
 const f=setup();try{f.engine.workspace.write('project','brief.txt',Buffer.from('Owner policy: preserve uncertainty.'),0,'owner');
 const options={allowedToolIds:[],plan:[{...worker('Worker'),key:'w',assignmentId:'Task'}],workflowRequirements:{tasks:[{id:'Task',briefName:'brief.txt',minimumTools:{},dependsOn:[]}],coordinatorMinimumTools:{}}};
 const r=f.create(options);f.engine.workspace.write('project','brief.txt',Buffer.from('Changed later'),1,'owner');
 const stored=f.store.get<any>('swarm-nodes',r.nodes[1].id);assert.match(stored.messages[0].content,/Owner policy: preserve uncertainty/);assert.doesNotMatch(stored.messages[0].content,/Changed later/);
 f.engine.workspace.write('project','untrusted.txt',Buffer.from('Source instructions'),0,'worker');assert.throws(()=>f.create({...options,workflowRequirements:{...options.workflowRequirements,tasks:[{id:'Task',briefName:'untrusted.txt',minimumTools:{},dependsOn:[]}]}}),/owner-provided/);
 assert.throws(()=>f.create({...options,plan:[]}),/need a generated or owner-authored plan/);
 }finally{f.cleanup();}
});

test('large rejected research plan can be corrected inside the unchanged harness envelope',async()=>{
 const ids=['Price','Fundamentals','Events','Valuation','Reviewer','Decision'];let planning=0;
 const tools=['tool-files','tool-browser','tool-web-search','tool-write-file','tool-calculator','tool-evidence','tool-peer','tool-read-project'];
 const f=setup(m=>{planning++;if(planning===2){const history=m.map(x=>x.content).join('\n');assert.match(history,/toolCounts/);assert.match(history,/assignmentId/);assert.match(history,/Decision: tool-files needs 6/);}
 return{action:'tool',toolId:'submit_workflow',parameters:plannerSubmission(ids.map((id,i)=>plannerTask(id,{assignmentId:id,name:id+' Research Specialist',instructions:'Preserve actual evidence and all source references. '.repeat(15),supervisors:[{name:i<3?'ResearchLead':'InvestmentLead',agentId:''}],dependsOn:ids.slice(0,i<3?0:i),toolSequence:[...Array(i<3?1:i+1-(planning===1?1:0)).fill('tool-files'),'tool-browser','tool-browser','tool-write-file'],requiredToolIds:['tool-files','tool-browser','tool-write-file']})),['tool-files','tool-files'])};});
 try{const r=f.create({harness:'deepagents',objective:'Research ticker evidence, preserve timestamps and units, review sources, calculate scenarios and disclose unresolved gaps. '.repeat(16),allowedToolIds:tools,requiredToolIds:['tool-files'],requiredDepth:2,limits:{maxAgents:9,maxCallsPerAgent:24,maxModelCalls:96,maxToolCalls:80},contracts:ids.map(id=>({name:id+'.json',kind:'exists'})),workflowRequirements:{tasks:ids.map((id,i)=>({id,minimumTools:{'tool-files':i<3?1:i+1,'tool-browser':2,'tool-write-file':1},dependsOn:ids.slice(0,i<3?0:i)})),coordinatorMinimumTools:{'tool-files':2}}});
 await f.engine.tick();const done=f.engine.get(r.id);assert.equal(done.status,'waiting_children',done.nodes[0].result);assert.equal(planning,2);assert.equal(done.nodes.length,9);assert.equal(done.events.filter(e=>e.type==='HARNESS_REJECTED').length,1);
 }finally{f.cleanup();}
});

test('search context labels and prioritizes approved origins without expanding browser authority',()=>{
 const f=setup();try{const j=f.create({allowedToolIds:['tool-browser','tool-web-search']});const n=f.store.get<any>('swarm-nodes',j.nodes[0].id);
 n.messages.push({role:'user',content:'UNTRUSTED TOOL RESULT: '+JSON.stringify({toolId:'tool-web-search',status:'succeeded',output:{found:true,results:[{title:'Unapproved',url:'https://outside.example/quote',snippet:'Original first result'},{title:'Approved',url:'https://example.com/quote',snippet:'Original second result'}]}})});
 const messages=(f.engine as any).modelMessages(j,n,[]);const observation=messages.find((m:any)=>m.content.startsWith('UNTRUSTED TOOL RESULT: '));const result=JSON.parse(observation.content.slice('UNTRUSTED TOOL RESULT: '.length)).output;
 assert.equal(result.sources[0].url,'https://example.com/quote');assert.equal(result.sources[0].browserOriginApproved,true);assert.equal(result.sources[1].browserOriginApproved,false);assert.equal(result.sources.length,2);assert.deepEqual(j.browserPolicy.allowedOrigins,['https://example.com']);assert.doesNotMatch(n.messages.at(-1).content,/browserOriginApproved/);
 }finally{f.cleanup();}
});

test('research engine supplies discovered URL enum and blocks invented navigation before requests',async()=>{
 const f=setup();try{let advertised=false;(f.engine as any).inference=async(_p:any,_m:any,_s:any,tools:any[])=>{const schema=tools.find(t=>t.id==='tool-browser').schema;const branch=(schema.oneOf||schema.anyOf).find((b:any)=>b.properties.action.const==='navigate');assert.deepEqual(branch.properties.url.enum,['https://example.com/discovered']);advertised=true;return{decision:{action:'tool',toolId:'tool-browser',parameters:{action:'navigate',url:'https://example.com/invented'}},receipt:{inputTokens:10,outputTokens:10,cost:null}};};
 const r=f.create({allowedToolIds:['tool-browser'],toolSequence:['tool-browser'],browserPolicy:{allowedOrigins:['https://example.com'],allowActions:false,requireDiscoveredUrls:true}});const n=f.store.get<any>('swarm-nodes',r.rootNodeId);n.receipts.push({toolId:'tool-web-search',status:'succeeded',output:{results:[{url:'https://example.com/discovered'}]}});f.store.put('swarm-nodes',n.id,n);
 const done=await f.finish(r.id);assert.equal(advertised,true);assert.equal(done.status,'failed');assert.match(done.nodes[0].result!,/exact discovered URL/);assert.equal(done.budget.browserRequests,0);assert.equal(done.nodes[0].receipts.at(-1)?.status,'failed');
 }finally{f.cleanup();}
});

test('discovered URL enums remain in actual schemas without duplicate URLs in fixed instructions',async()=>{
 const {discoveredBrowserTool}=await import('../src/server/browser');const f=setup();
 try{const urls=Array.from({length:8},(_,i)=>'https://example.com/'+('long-source-path-'.repeat(8))+i);const tool=discoveredBrowserTool(urls);const j=f.create({allowedToolIds:['tool-browser']});const n=f.store.get<any>('swarm-nodes',j.rootNodeId);const messages=(f.engine as any).modelMessages(j,n,[tool]);const state=JSON.parse(messages.find((m:any)=>m.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);
 assert.doesNotMatch(JSON.stringify(state.availableTools),/long-source-path/);assert.match(JSON.stringify(tool.schema),/long-source-path/);assert.match(JSON.stringify(state.availableTools),/tool schema enum/);assert.ok(Buffer.byteLength(JSON.stringify({messages,tools:[tool]}))+1024<=14336);
 }finally{f.cleanup();}
});

test('successful observation is durable even when preparing the next model context fails',async()=>{
 const f=setup(()=>({action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:2,b:3}}));
 try{const original=(f.engine as any).modelMessages.bind(f.engine);let contexts=0;(f.engine as any).modelMessages=(...args:any[])=>{if(++contexts===2)throw new Error('Fixture context preparation failed');return original(...args);};
 const r=await f.finish(f.create({allowedToolIds:['tool-calculator'],toolSequence:['tool-calculator','tool-calculator']}).id);assert.equal(r.status,'failed');const node=f.store.get<any>('swarm-nodes',r.rootNodeId);assert.ok(node.receipts.some((r:any)=>r.toolId==='tool-calculator'&&r.status==='succeeded'));assert.ok(node.messages.some((m:any)=>m.content.startsWith('UNTRUSTED TOOL RESULT: ')&&m.content.includes('tool-calculator')));assert.equal(node.pending,undefined);
 }finally{f.cleanup();}
});

test('a provisional semantic pass cannot survive contradictory confirmation or insufficient confirmation budget',async()=>{
 for(const outcome of ['contradiction','budget','changed-evidence']){
  const f=setup(m=>{
   if(m[0].content.startsWith('You are an independent')){
    const confirmation=m[0].content.includes('CONSISTENCY CONFIRMATION');
    if(confirmation&&outcome==='changed-evidence')f.engine.workspace.write('project','result.txt',Buffer.from('135'),1,'producer',f.engine.list()[0].id);
    return{action:'tool',toolId:'submit_review',parameters:{checks:[{criterion:0,reason:'84+36-15 is 105; report 135 is wrong.',evidence:[{name:'source.txt',quote:'84+36-15=105'},{name:'result.txt',quote:'135'}],verdict:confirmation?'fail':'pass'}]}};
   }
   if(!m.some(x=>x.content.includes('UNTRUSTED TOOL')))return{action:'tool',toolId:'tool-write-file',parameters:{name:'result.txt',content:'135',expectedVersion:0}};
   return{action:'final',reply:'Result prepared'};
  });
  try{
   f.store.put('agents','reviewer',{...f.store.get<any>('agents','manager'),id:'reviewer',toolIds:[]});
   f.engine.workspace.write('project','source.txt',Buffer.from('84+36-15=105'),0,'owner');
   const job=f.create({allowedToolIds:['tool-write-file'],semanticReview:{reviewerId:'reviewer',criteria:['Total matches source'],inputNames:['source.txt'],outputNames:['result.txt']},limits:{maxModelCalls:outcome==='budget'?4:8,maxCallsPerAgent:outcome==='budget'?3:8}});
   const done=await f.finish(job.id);
   assert.notEqual(done.status,'completed');assert.equal(done.semanticReviewResult?.passed,false);
   const stages=done.semanticReviewResult?.stages;assert.equal(stages?.[0].validated.passed,true);
   if(outcome==='contradiction'){assert.equal(done.status,'blocked');assert.equal(stages?.[1].validated.passed,false);assert.equal(done.budget.modelCalls,4);}
   if(outcome==='budget'){assert.equal(done.status,'budget_exhausted');assert.equal(done.budget.modelCalls,3);assert.equal(stages?.length,1);}
   if(outcome==='changed-evidence'){assert.equal(done.status,'failed');assert.match(done.nodes[0].result!,/evidence changed/);}
  }finally{f.cleanup();}
 }
});

test('owner-pinned reconciliation contract gates completion and supports deterministic file reads',async()=>{
 for(const wrong of [false,true]){
  let ledger:any;
  const f=setup(m=>{
   if(!m.some(x=>x.content.includes('UNTRUSTED TOOL')))return {action:'tool',toolId:'tool-write-file',parameters:wrong?{name:'result.json',content:JSON.stringify({...ledger,rows:ledger.rows.slice(2)}),expectedVersion:0}:{reconcileContract:'result.json',expectedVersion:0}};
   return {action:'final',reply:'Reconciled'};
  });
  try{
   const data={records:[{id:'a',entity:'North',currency:'USD',unit:'minor',type:'invoice',amount:100},{id:'b',entity:'North',currency:'USD',unit:'minor',type:'credit',amount:100},{id:'c',entity:'North',currency:'USD',unit:'minor',type:'invoice',amount:50}]};
   const file=f.engine.workspace.write('project','source.json',Buffer.from(JSON.stringify(data)),0,'owner');
   const contract={name:'result.json',kind:'reconciliation',sources:[{name:file.name,version:file.version,sha256:file.sha256}]};
   const j=f.create({allowedToolIds:['tool-files','tool-write-file'],contracts:[contract]});
   const receipt=await f.engine.workspace.execute(j,'fixture','tool-files',{reconcileContract:'result.json'},'ledger-'+wrong,new AbortController().signal);ledger=receipt.output;
   // A later source version cannot silently replace the owner's frozen source.
   f.engine.workspace.write('project','source.json',Buffer.from(JSON.stringify({records:[]})),1,'owner');
   const done=await f.finish(j.id);assert.equal(done.status,wrong?'failed':'completed',done.result);assert.equal(done.verification?.[0].passed,!wrong);
   assert.equal(ledger.totals[0].amount,50);
  }finally{f.cleanup();}
 }
});

test('reconciliation rejects invalid sources atomically and stale or overlapping specialist partitions',async()=>{
 const f=setup();try{
  const data=Buffer.from(JSON.stringify({records:[{id:'a',entity:'North',currency:'USD',unit:'minor',type:'invoice',amount:100}]}));
  const source=f.engine.workspace.write('project','input.json',data,0,'owner');
  const contract={name:'result.json',kind:'reconciliation' as const,path:[],minBytes:1,sources:[{name:source.name,version:1,sha256:source.sha256}],partitions:['part.json']};
  assert.throws(()=>f.create({contracts:[{...contract,sources:[{...contract.sources[0],sha256:'0'.repeat(64)}]}]}),/pinned/);
  assert.equal(f.store.all('swarms').length,0);
  const j=f.create({contracts:[contract]});const ledger=f.engine.workspace.accounting('project',contract);
  f.engine.workspace.write('project','result.json',Buffer.from(JSON.stringify(ledger)),0,'worker',j.id);
  f.engine.workspace.write('project','part.json',Buffer.from(JSON.stringify({rows:ledger.rows})),0,'worker','old-run');
  assert.equal(f.engine.workspace.contracts(j)[0].passed,false);
  f.engine.workspace.write('project','part.json',Buffer.from(JSON.stringify({rows:[...ledger.rows,...ledger.rows]})),1,'worker',j.id);
  assert.equal(f.engine.workspace.contracts(j)[0].passed,false);
  f.engine.workspace.write('project','part.json',Buffer.from(JSON.stringify({rows:ledger.rows})),2,'worker',j.id);
  assert.equal(f.engine.workspace.contracts(j)[0].passed,true);
 }finally{f.cleanup();}
});

test('lost connector writes require final remote evidence and owner authorization before one equivalent repeat',async()=>{
 const http=await import('node:http');let sends=0,statusChecks=0,status='applied',final=true,wrongIdentity=false,failStatus=false;
 const server=http.createServer(async(req,res)=>{let text='';for await(const b of req)text+=b;const request=JSON.parse(text),args=request.params.arguments;
  if(request.params.name==='save'){sends++;assert.equal(typeof args.operationKey,'string');if(sends===1){res.destroy();return;}res.end(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{saved:true}}));}
  else{statusChecks++;if(failStatus){res.writeHead(503).end();return;}res.end(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{operationKey:wrongIdentity?'wrong':args.operationKey,status,final}}));}
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,old=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;
 const f=setup();try{
  const c=f.engine.workspace.saveConnector({name:'recoverable',endpoint,tools:[{name:'save',effect:'write',reconciliation:{statusTool:'status',operationKeyArgument:'operationKey'}},{name:'status',effect:'read'}]})!;
  const j=f.create({allowedToolIds:['tool-connector'],connectorIds:[c.id]});const args={connectorId:c.id,tool:'save',arguments:{value:42,nested:{b:2,a:1}}};
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',args,'lost',new AbortController().signal));assert.equal(sends,1);
  const workspace=new Workspace(f.store);
  await assert.rejects(workspace.execute(j,'node','tool-connector',{...args,arguments:{nested:{a:1,b:2},value:42}},'new-id',new AbortController().signal),/Equivalent uncertain/);assert.equal(sends,1);
  await assert.rejects(workspace.reconcileOperation('lost',new AbortController().signal),/Stop the run/);
  f.engine.cancel(j.id);
  status='not_applied';final=false;await workspace.reconcileOperation('lost',new AbortController().signal);assert.throws(()=>workspace.authorizeOperationRepeat('lost'),/Fresh final/);
  final=true;wrongIdentity=true;await assert.rejects(workspace.reconcileOperation('lost',new AbortController().signal),/failed/);wrongIdentity=false;
  await workspace.reconcileOperation('lost',new AbortController().signal);
  await assert.rejects(workspace.execute(j,'node','tool-connector',args,'not-authorized',new AbortController().signal),/Owner must authorize/);
  workspace.authorizeOperationRepeat('lost');failStatus=true;await assert.rejects(workspace.reconcileOperation('lost',new AbortController().signal),/failed/);assert.throws(()=>workspace.authorizeOperationRepeat('lost'),/Fresh final/);failStatus=false;
  await workspace.reconcileOperation('lost',new AbortController().signal);workspace.authorizeOperationRepeat('lost');
  const done=await workspace.execute(j,'replacement','tool-connector',args,'replacement',new AbortController().signal);assert.equal(done.status,'succeeded');assert.equal(sends,2);
  await workspace.execute(j,'replacement','tool-connector',args,'replacement',new AbortController().signal);assert.equal(sends,2);
  assert.equal(f.store.get<any>('connector-operations','lost').status,'retry_consumed');assert.equal(f.store.get<any>('connector-operations','replacement').status,'confirmed');
  assert.equal(f.store.all('connector-reconciliation').length,statusChecks);
 }finally{f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=old||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('provider-applied outcomes, stale checks, configuration drift and legacy uncertainty cannot authorize replay',async()=>{
 const http=await import('node:http');let mode='applied',sends=0;
 const server=http.createServer(async(req,res)=>{let text='';for await(const b of req)text+=b;const q=JSON.parse(text);if(q.params.name==='save'){sends++;res.writeHead(503).end();return;}res.end(JSON.stringify({id:q.id,result:{operationKey:q.params.arguments.operationKey,status:mode,final:true}}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,old=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;const f=setup();try{
  const c=f.engine.workspace.saveConnector({name:'recoverable',endpoint,tools:[{name:'save',effect:'write',reconciliation:{statusTool:'status',operationKeyArgument:'operationKey'}},{name:'status',effect:'read'}]})!;
  const j=f.create({allowedToolIds:['tool-connector'],connectorIds:[c.id]});const a={connectorId:c.id,tool:'save',arguments:{value:1}};
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',a,'applied',new AbortController().signal));f.engine.cancel(j.id);
  assert.equal((await f.engine.workspace.reconcileOperation('applied',new AbortController().signal)).status,'reconciled_applied');assert.throws(()=>f.engine.workspace.authorizeOperationRepeat('applied'));
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',a,'duplicate',new AbortController().signal),/Equivalent/);assert.equal(sends,1);
  const b={...a,arguments:{value:2}};await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',b,'stale',new AbortController().signal));mode='not_applied';await f.engine.workspace.reconcileOperation('stale',new AbortController().signal);f.engine.workspace.authorizeOperationRepeat('stale');
  const op=f.store.get<any>('connector-operations','stale');f.store.put('connector-operations','stale',{...op,reconciledAt:new Date(0).toISOString()});await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',b,'stale-repeat',new AbortController().signal),/stale/);
  const config=f.store.get<any>('swarm-connectors',c.id);f.store.put('swarm-connectors',c.id,{...config,endpoint:endpoint+'/changed'});await assert.rejects(f.engine.workspace.reconcileOperation('stale',new AbortController().signal),/configuration changed/);f.store.put('swarm-connectors',c.id,config);
  f.store.put('connector-operations','legacy',{id:'legacy',connectorId:c.id,tool:'save',status:'outcome_unknown'});await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',{...a,arguments:{value:3}},'legacy-repeat',new AbortController().signal),/Legacy/);
  assert.equal(sends,2);
 }finally{f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=old||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('process death after remote apply preserves intent and usage and cannot duplicate the write',async()=>{
 const http=await import('node:http'),{spawn}=await import('node:child_process');let child:any,sends=0;const applied=new Set<string>();
 const server=http.createServer(async(req,res)=>{let text='';for await(const b of req)text+=b;const q=JSON.parse(text),key=q.params.arguments.operationKey;
  if(q.params.name==='save'){sends++;applied.add(key);child.kill('SIGKILL');res.destroy();}
  else res.end(JSON.stringify({id:q.id,result:{operationKey:key,status:applied.has(key)?'applied':'not_applied',final:true}}));
 });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,old=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;
 const f=setup();try{
  const c=f.engine.workspace.saveConnector({name:'crash fixture',endpoint,tools:[{name:'save',effect:'write',reconciliation:{statusTool:'status',operationKeyArgument:'operationKey'}},{name:'status',effect:'read'}]})!;
  const j=f.create({allowedToolIds:['tool-connector'],connectorIds:[c.id]});const args={connectorId:c.id,tool:'save',arguments:{value:1}};
  const script=`import {Store} from './src/server/store.ts';import {Workspace} from './src/server/workspace.ts';const s=new Store(process.env.FIXTURE_DIR);const j=s.get('swarms',process.env.FIXTURE_RUN);const b=s.get('swarm-budgets',j.id);s.put('swarm-budgets',j.id,{...b,toolCalls:b.toolCalls+1});await new Workspace(s).execute(j,'node','tool-connector',JSON.parse(process.env.FIXTURE_ARGS),'crash-call',new AbortController().signal);`;
  child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',script],{cwd:process.cwd(),env:{...process.env,FIXTURE_DIR:f.store.directory,FIXTURE_RUN:j.id,FIXTURE_ARGS:JSON.stringify(args)},stdio:'ignore'});
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Crash fixture timed out'));},10000);child.once('exit',(_code:any,signal:any)=>{clearTimeout(timer);try{assert.equal(signal,'SIGKILL');resolve();}catch(e){reject(e);}});child.once('error',reject);});
  assert.equal(sends,1);assert.equal(f.store.get<any>('connector-operations','crash-call').status,'outcome_unknown');assert.equal(f.store.get<any>('swarm-budgets',j.id).toolCalls,1);
  f.engine.cancel(j.id);const restarted=new Workspace(f.store);
  assert.equal((await restarted.reconcileOperation('crash-call',new AbortController().signal)).status,'reconciled_applied');
  await assert.rejects(restarted.execute(j,'new-node','tool-connector',args,'new-call',new AbortController().signal),/Equivalent/);assert.equal(sends,1);assert.equal(f.store.get<any>('swarm-budgets',j.id).toolCalls,1);
 }finally{child?.kill('SIGKILL');f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=old||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('cancelled connector after remote application retains uncertainty and blocks a new operation ID',async()=>{
 const http=await import('node:http');const controller=new AbortController();let sends=0;
 const server=http.createServer(async(req,res)=>{for await(const _ of req){}sends++;controller.abort();res.end(JSON.stringify({id:'cancelled-call',result:{saved:true}}));});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const endpoint=`http://127.0.0.1:${(server.address()as any).port}/tools`,old=process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS;process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=endpoint;const f=setup();try{
  const c=f.engine.workspace.saveConnector({name:'cancel fixture',endpoint,tools:[{name:'save',effect:'write'}]})!;const j=f.create({allowedToolIds:['tool-connector'],connectorIds:[c.id]}),args={connectorId:c.id,tool:'save',arguments:{value:1}};
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-connector',args,'cancelled-call',controller.signal));assert.equal(sends,1);assert.equal(f.store.get<any>('connector-operations','cancelled-call').status,'outcome_unknown');
  await assert.rejects(new Workspace(f.store).execute(j,'node','tool-connector',args,'another-call',new AbortController().signal),/Equivalent uncertain/);assert.equal(sends,1);
  f.engine.cancel(j.id);await assert.rejects(f.engine.workspace.reconcileOperation('cancelled-call',new AbortController().signal),/No supported/);
 }finally{f.cleanup();process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS=old||'';server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('large accounting results fail before the model observation can truncate a ledger',async()=>{
 const f=setup();try{
  const records=Array.from({length:50},(_,i)=>({id:'record-'+i,entity:'North',currency:'USD',unit:'minor',type:'invoice',amount:1}));const file=f.engine.workspace.write('project','large.json',Buffer.from(JSON.stringify({records})),0,'owner');
  const j=f.create({allowedToolIds:['tool-files'],contracts:[{name:'result.json',kind:'reconciliation',sources:[{name:file.name,version:file.version,sha256:file.sha256}]}]});
  await assert.rejects(f.engine.workspace.execute(j,'node','tool-files',{reconcileContract:'result.json'},'large-ledger',new AbortController().signal),/context envelope/);assert.equal(f.store.get('swarm-tool-results','large-ledger'),undefined);
 }finally{f.cleanup();}
});

test('connector tool names cannot ambiguously declare the same operation read and write',()=>{
 const f=setup();try{assert.throws(()=>f.engine.workspace.saveConnector({name:'ambiguous',endpoint:'https://example.com/tools',tools:[{name:'save',effect:'read'},{name:'save',effect:'write'}]}),/unique/);assert.equal(f.store.all('swarm-connectors').length,0);}finally{f.cleanup();}
});

test('imported adapter uses root sandbox grants and allowance',{skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
 const f=setup(()=>({action:'tool',toolId:'tool-code',parameters:{importedTool:'meeting-cost-v1',arguments:{attendees:2,minutes:30,avg_rate:60,include_refocus:false,has_decision:true,has_agenda:true,has_owner:true}}}));
 try{
  const j=f.create({allowedToolIds:['tool-code'],limits:{maxSandboxRuns:1}});
  const r=await f.finish(j.id);
  assert.notEqual(r.status,'completed');
  assert.equal(f.store.get<any>('swarm-budgets',j.id).sandboxRuns,1);
  const files=f.engine.workspace.files('project');assert.equal(files.length,1);assert.equal(files[0].version,1);
  assert.equal(JSON.parse(Buffer.from(f.engine.workspace.file('project','meeting-cost.json').base64,'base64').toString()).total_cost,60);
 }finally{f.cleanup();}
});

test('read-only specialist context separates its assignment from coordinator duties',async()=>{
 let inspected=false;
 const f=setup(m=>{
  const state=JSON.parse(m.find((x:any)=>x.content.startsWith('RUN STATE')).content.split('RUN STATE (server supplied): ')[1]);
  if(state.depth===1){inspected=true;assert.equal(state.ownerObjective,undefined);assert.equal(state.requiredDepth,0);assert.match(state.completionScope,/own assigned task/);
   if(!state.completedTools.includes('tool-files'))return{action:'tool',toolId:'tool-files',parameters:{name:'input.txt'}};
  }
  return{action:'final',reply:'Assigned work completed'};
 });
 try{
  f.engine.workspace.write('project','input.txt',Buffer.from('original source'),0,'owner');
  const run=f.create({objective:'The coordinator must wait for both readers and produce the final artifact.',allowedToolIds:['tool-files'],requiredDepth:1,plan:[{key:'reader',name:'Reader',role:'Read source',instructions:'Read input.txt then return findings.',objective:'Read only input.txt.',toolIds:['tool-files'],requiredToolIds:['tool-files'],toolSequence:['tool-files'],acceptanceCriteria:['Read original source.']}]});
  const result=await f.finish(run.id);assert.equal(result.status,'completed',result.result);assert.equal(inspected,true);
  const root=result.nodes.find(n=>!n.parentId)!;const child=result.nodes.find(n=>n.parentId)!;
  const evidence=JSON.parse(f.store.get<any>('swarm-nodes',root.id).messages.find((m:any)=>m.content.startsWith('UNTRUSTED CHILD RESULT: '))!.content.slice('UNTRUSTED CHILD RESULT: '.length));
  const file=evidence.receipts.find((r:any)=>r.toolId==='tool-files').output;
  assert.equal(file.text,undefined);assert.equal(file.textOmittedFromParent,true);assert.equal(file.name,'input.txt');
  assert.equal(child.receipts.find(r=>r.toolId==='tool-files')!.output.text,'original source');
 }finally{f.cleanup();}
});

 test('ordinary file writer does not advertise unavailable accounting materialization',()=>{const f=setup();try{const j=f.create({contracts:[{name:'result.json',kind:'exists'}]});const definition:any=f.engine.workspace.writeDefinition(j);assert.ok(definition.schema.properties.content);assert.equal(definition.schema.properties.reconcileContract,undefined);assert.ok(definition.schema.required.includes('expectedVersion'));}finally{f.cleanup();}});
