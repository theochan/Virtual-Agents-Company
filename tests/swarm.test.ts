import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { Store } from '../src/server/store';
import { SwarmEngine, SPAWN_TOOL } from '../src/server/swarm';
import { INITIAL_AGENTS } from '../src/data/initialData';
import { defaultSettings, decisionFormat, type Decision } from '../src/server/providers';
import { executeSearch } from '../src/server/tools';

const worker=(name='Analyst',objective='Calculate 19 plus 23')=>({name,role:'Analyst',instructions:'Use the calculator and report evidence.',objective,toolIds:['tool-calculator'],requiredToolIds:['tool-calculator'],acceptanceCriteria:['Give the verified numeric result.']});
function fixture(decide?:(messages:any[],call:number,tools?:any[])=>Promise<Decision>|Decision){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vac-swarm-')),store=new Store(dir);let calls=0;
 const manager={...structuredClone(INITIAL_AGENTS[0]),id:'manager',workspaceId:'ws-default',displayName:'Coordinator',autonomyLevel:3 as const,toolIds:[],llmConfig:{provider:'ollama',model:'fixture',temperature:0,maxTokens:1024}};
 store.put('agents',manager.id,manager);store.put('projects','project',{id:'project',workspaceId:'ws-default',name:'Project',description:'Test project',members:[]});
 const inference=async(_config:any,messages:any[],_signal:any,tools:any[])=>{
  calls++;const root=messages[0].content.includes('You are the coordinator.');
  const childResult=messages.some(m=>m.content.startsWith('UNTRUSTED CHILD RESULT'));
  const toolResult=messages.some(m=>m.content.startsWith('UNTRUSTED TOOL RESULT'));
  const decision=decide?await decide(messages,calls,tools):root?!childResult?{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('A'),worker('B','Calculate 30 plus 12')]}}:{action:'final',reply:'Both specialists independently calculated 42.'}:!toolResult?{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:19,b:23}}:{action:'final',reply:'42'};
  return {decision:decision as Decision,receipt:{provider:'ollama',model:'fixture',inputTokens:10,outputTokens:20,cost:null}};
 };
 const engine=new SwarmEngine(store,()=>defaultSettings,inference as any);
 const create=(override:any={})=>engine.create({coordinatorId:'manager',projectId:'project',objective:'Calculate independently and synthesize.',...override},'swarm-request-123');
 const finish=async(id:string)=>{for(let i=0;i<40;i++){if(!['queued','working','waiting_children'].includes(engine.get(id).status))break;await engine.tick();}return engine.get(id);};
 const cleanup=()=>{engine.stop();store.close();fs.rmSync(dir,{recursive:true,force:true});};
 return{store,engine,create,finish,cleanup,manager,inference,get calls(){return calls;}};
}
test('dynamic batch produces durable temporary profiles, parallel children, receipts and final synthesis',async()=>{
 const f=fixture();try{const r=f.create({mode:'dynamic'});assert.equal(f.create({mode:'dynamic'}).id,r.id);const done=await f.finish(r.id);assert.equal(done.status,'completed');assert.equal(done.nodes.length,3);assert.equal(done.budget.spawned,2);assert.equal(done.budget.modelCalls,6);assert.equal(done.budget.reportedInputTokens,60);assert.equal(f.store.all('agents').length,1);assert.equal(done.nodes[1].sourceAgentId,undefined);assert.equal(done.nodes[1].receipts.filter(r=>r.toolId).length,1);assert.match(done.result!,/42/);assert.throws(()=>f.create({objective:'Different'}),/different swarm/);}finally{f.cleanup();}
});
test('manual mode dispatches equipped existing profiles without creating permanent duplicates',async()=>{
 const f=fixture(messages=>messages[0].content.includes('You are the coordinator.')?messages.some(m=>m.content.startsWith('UNTRUSTED CHILD'))?{action:'final',reply:'42'}:{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[{...worker(),agentId:'existing'}]}}:messages.some(m=>m.content.startsWith('UNTRUSTED TOOL'))?{action:'final',reply:'42'}:{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:19,b:23}});
 try{f.store.put('agents','existing',{...f.manager,id:'existing',toolIds:['tool-calculator']});const r=f.create({mode:'manual'});const done=await f.finish(r.id);assert.equal(done.status,'completed');assert.equal(done.nodes[1].sourceAgentId,'existing');assert.equal(f.store.all('agents').length,2);}finally{f.cleanup();}
});
test('invalid mode, tool grants, missing authority and duplicate objectives fail atomically before child creation',async()=>{
 for(const scenario of ['tool','mode','duplicate','agents','foreign']){
  const workers=scenario==='duplicate'?[worker(),worker()]:[{...worker(),...(scenario==='tool'?{toolIds:['tool-doc-gen']}:{}),...(scenario==='foreign'?{agentId:'foreign'}:{})}];
  const f=fixture(()=>({action:'tool',toolId:SPAWN_TOOL,parameters:{workers}}));
  try{f.store.put('agents','foreign',{...f.manager,id:'foreign',workspaceId:'another',toolIds:['tool-calculator']});const r=f.create({mode:scenario==='mode'?'manual':'hybrid',...(scenario==='agents'?{limits:{maxAgents:1}}:{})});const done=await f.finish(r.id);assert.notEqual(done.status,'completed');assert.equal(done.nodes.length,1);assert.equal(done.budget.spawned,0);}finally{f.cleanup();}
 }
});
test('depth-one children cannot recurse, invent tool evidence or exceed immutable grants; parent receives disclosed failures',async()=>{
 for(const bad of [{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker()]}},{action:'tool',toolId:'tool-doc-gen',parameters:{title:'x',content:'x'}},{action:'final',reply:'42 without calculator'}] as Decision[]){
  const f=fixture(messages=>messages[0].content.includes('You are the coordinator.')?messages.some(m=>m.content.startsWith('UNTRUSTED CHILD'))?{action:'final',reply:'Evidence missing.'}:{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker()]}}:bad);
  try{const r=f.create({limits:{maxDepth:1}});const done=await f.finish(r.id);assert.equal(done.status,'partial');assert.equal(done.nodes.length,2);assert.equal(f.store.all('artifacts').length,0);}finally{f.cleanup();}
 }
});
test('concurrent siblings cannot consume the coordinator synthesis reservation',async()=>{
 const f=fixture();try{const r=f.create({limits:{maxModelCalls:4}});const done=await f.finish(r.id);assert.ok(done.budget.modelCalls<=4);assert.equal(done.status,'partial');assert.equal(done.budget.modelCalls,4);assert.ok(done.nodes.slice(1).some(n=>n.status==='budget_exhausted'));}finally{f.cleanup();}
});
test('late provider receipts survive cancellation without reviving root or children',async()=>{
 let release!:()=>void,started!:()=>void;const ready=new Promise<void>(r=>started=r),pause=new Promise<void>(r=>release=r);
 const f=fixture(async()=>{started();await pause;return{action:'final',reply:'Late result'};});
 try{const r=f.create();const pending=f.engine.tick();await ready;f.engine.cancel(r.id);release();await pending;const done=f.engine.get(r.id);assert.equal(done.status,'cancelled');assert.equal(done.nodes[0].status,'cancelled');assert.equal(done.budget.reportedOutputTokens,20);assert.doesNotMatch(done.result!,/Late/);}finally{f.cleanup();}
});
test('existing profile revocation prevents specialist inference and preserves partial result',async()=>{
 const f=fixture();try{const r=f.create();await f.engine.tick();await f.engine.tick();const agent=f.store.get<any>('agents','manager');agent.autonomyLevel=1;f.store.put('agents','manager',agent);const calls=f.calls;await f.engine.tick();assert.equal(f.calls,calls);const done=await f.finish(r.id);assert.notEqual(done.status,'completed');}finally{f.cleanup();}
});
test('restart requires explicit recovery and retains budgets without replaying uncertain work',async()=>{
 const f=fixture();try{const r=f.create();await f.engine.tick();await f.engine.tick();const child=f.store.get<any>('swarm-nodes',f.engine.get(r.id).nodes[1].id);child.status='working';f.store.put('swarm-nodes',child.id,child);
 const restarted=new SwarmEngine(f.store,()=>defaultSettings,f.inference as any);restarted.recover();assert.equal(restarted.get(r.id).interrupted,true);assert.equal(restarted.get(r.id).status,'blocked');const calls=f.calls;await restarted.tick();assert.equal(f.calls,calls);restarted.resume(r.id);await restarted.tick();assert.equal(restarted.get(r.id).status,'partial');assert.equal(f.calls,calls+1);assert.equal(restarted.get(r.id).budget.modelCalls,2);restarted.stop();}finally{f.cleanup();}
});
test('deadline and total input allowance stop before inference and are not reset by another engine',async()=>{
 for(const scenario of ['deadline','input']){const f=fixture();try{const r=f.create();const b=f.engine.budget(r.id);if(scenario==='deadline')b.deadline=Date.now()-1;else b.reservedInputTokens=r.limits.maxInputTokens;f.store.put('swarm-budgets',r.id,b);const restarted=new SwarmEngine(f.store,()=>defaultSettings,f.inference as any);await restarted.tick();assert.equal(f.calls,0);assert.equal(restarted.get(r.id).status,'budget_exhausted');restarted.stop();}finally{f.cleanup();}}
});
test('non-Ollama coordinator is rejected before queuing inference',()=>{const f=fixture();try{f.store.put('agents','manager',{...f.manager,llmConfig:{...f.manager.llmConfig,provider:'openai'}});assert.throws(()=>f.create(),/Ollama/);assert.equal(f.calls,0);assert.equal(f.store.all('swarms').length,0);}finally{f.cleanup();}});
test('per-provider search reservation stops fallback before another network request',async()=>{
 const f=fixture();const old=process.env.TAVILY_API_KEY,oldBrave=process.env.BRAVE_SEARCH_API_KEY,limit=process.env.VAC_SEARCH_REQUESTS_PER_DAY;
 try{process.env.TAVILY_API_KEY='fixture';process.env.BRAVE_SEARCH_API_KEY='fixture';process.env.VAC_SEARCH_REQUESTS_PER_DAY='10';let reservations=0,calls=0;
 await assert.rejects(()=>executeSearch('test',f.store,new AbortController().signal,(async()=>{calls++;return new Response('',{status:503});}) as any,()=>{if(++reservations>1)throw new Error('Root search budget exhausted');}),/Root search budget/);assert.equal(calls,1);
 }finally{for(const [key,value]of Object.entries({TAVILY_API_KEY:old,BRAVE_SEARCH_API_KEY:oldBrave,VAC_SEARCH_REQUESTS_PER_DAY:limit})){if(value===undefined)delete process.env[key];else process.env[key]=value;}f.cleanup();}
});

test('scheduler executes siblings concurrently but never exceeds the root limit',async()=>{
 let inFlight=0,peak=0,release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const f=fixture(async messages=>{
  if(messages[0].content.includes('You are the coordinator.'))return{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('A'),worker('B','second calculation'),worker('C','third calculation')]}};
  inFlight++;peak=Math.max(peak,inFlight);if(inFlight===2)release();await gate;inFlight--;return{action:'final',reply:'Missing tools'};
 });
 try{const r=f.create({limits:{concurrency:2}});await f.engine.tick();await f.engine.tick();await f.engine.tick();assert.equal(peak,2);assert.equal(f.engine.get(r.id).nodes.filter(n=>n.status==='queued'&&n.calls===0).length,1);f.engine.cancel(r.id);}finally{f.cleanup();}
});
test('shutdown blocks uncertain work and explicit recovery has no executable tools',async()=>{
 let started!:()=>void,release!:()=>void;const ready=new Promise<void>(r=>started=r),pause=new Promise<void>(r=>release=r);
 const f=fixture(async()=>{started();await pause;return{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:1,b:2}};});
 try{const r=f.create();const pending=f.engine.tick();await ready;f.engine.stop();release();await pending;assert.equal(f.engine.get(r.id).interrupted,true);
 const restarted=new SwarmEngine(f.store,()=>defaultSettings,f.inference as any);restarted.recover();const resumed=restarted.resume(r.id);assert.deepEqual(resumed.nodes[0].toolIds,[]);assert.equal(resumed.budget.modelCalls,1);await restarted.tick();assert.equal(restarted.get(r.id).status,'failed');assert.equal(f.store.all('tool-results').length,0);restarted.stop();}finally{f.cleanup();}
});
test('DuckDuckGo query rewrite consumes an additional root search reservation',async()=>{
 const f=fixture();try{f.store.put('settings','search',{activeProvider:'duckduckgo'});let calls=0,reservations=0;
 const result=await executeSearch('latest news about SQLite',f.store,new AbortController().signal,(async()=>{calls++;return new Response('{}');}) as any,()=>{if(++reservations>1)throw new Error('Root limit');});assert.equal(calls,1);assert.equal(result.found,false);assert.equal(result.attempts?.at(-1)?.status,'failed');}finally{f.cleanup();}
});

test('workspace identity is enforced even when foreign coordinator and project match each other',()=>{
 const f=fixture();try{f.store.put('agents','manager',{...f.manager,workspaceId:'foreign'});f.store.put('projects','project',{id:'project',workspaceId:'foreign',members:[]});assert.throws(()=>f.create(),/workspace and project/);f.store.put('swarms','foreign-run',{id:'foreign-run',workspaceId:'foreign',status:'completed'});assert.throws(()=>f.engine.get('foreign-run'),/not found/);assert.equal(f.engine.list().length,0);}finally{f.cleanup();}
});

test('required coordinator verification permits one bounded correction then blocks unsupported completion',async()=>{
 const f=fixture(()=>({action:'final',reply:'I verified it.'}));try{const r=f.create({requiredToolIds:['tool-calculator']});const done=await f.finish(r.id);assert.equal(done.status,'blocked');assert.equal(done.budget.modelCalls,2);assert.equal(done.events.filter(e=>e.type==='COMPLETION_REJECTED').length,1);assert.throws(()=>f.create({requiredToolIds:['tool-web-search']}),/must be approved/);}finally{f.cleanup();}
});
test('required coordinator verification completes only after a real tool receipt',async()=>{
 const f=fixture((messages,call)=>call===1?{action:'final',reply:'Skipped verification'}:call===2?{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:391,b:400}}:{action:'final',reply:'Verified total: 791'});
 try{const r=f.create({requiredToolIds:['tool-calculator']});const done=await f.finish(r.id);assert.equal(done.status,'completed');assert.equal(done.budget.modelCalls,3);assert.ok(done.nodes[0].receipts.some(r=>r.toolId==='tool-calculator'&&r.output?.result===791));}finally{f.cleanup();}
});

test('nested specialists synthesize bottom up using inherited evidence and a single durable budget',async()=>{
 const f=fixture(messages=>{
  const root=messages[0].content.includes('You are the coordinator.');
  const child=messages.some(m=>m.content.startsWith('UNTRUSTED CHILD RESULT'));
  const tool=messages.some(m=>m.content.startsWith('UNTRUSTED TOOL RESULT'));
  if(child||tool)return{action:'final',reply:'42 from verified descendant evidence'};
  if(root)return{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('Lead','Delegate arithmetic to a calculator specialist')]}};
  if(messages[0].content.startsWith('You are Lead,'))return{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('Leaf','Calculate 19 plus 23 at leaf')]}};
  return{action:'tool',toolId:'tool-calculator',parameters:{operation:'add',a:19,b:23}};
 });
 try{const r=f.create({requiredDepth:2,limits:{maxDepth:2}});const done=await f.finish(r.id);assert.equal(done.status,'completed');assert.deepEqual(done.nodes.map(n=>n.depth),[0,1,2]);assert.equal(done.nodes[2].parentId,done.nodes[1].id);assert.equal(done.budget.spawned,2);assert.equal(done.budget.modelCalls,6);assert.equal(done.budget.toolCalls,1);assert.equal(done.nodes[1].receipts.filter(r=>r.toolId).length,0);}finally{f.cleanup();}
});
test('recursive dispatch rejects ancestor duplicates, depth overflow and parent grant expansion atomically',async()=>{
 for(const scenario of ['ancestor','depth','grant']){
  const f=fixture(messages=>{
   if(messages.some(m=>m.content.startsWith('UNTRUSTED CHILD RESULT')))return{action:'final',reply:'Failed work disclosed'};
   const root=messages[0].content.includes('You are the coordinator.');
   return{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[root?worker('Lead','Delegate bounded work'):{...worker('Leaf',scenario==='ancestor'?'Calculate independently and synthesize.':'Distinct nested work'),...(scenario==='grant'?{toolIds:['tool-read-project']}:{})}]}};
  });
  try{const r=f.create({limits:{maxDepth:scenario==='depth'?1:3}});const done=await f.finish(r.id);assert.notEqual(done.status,'completed');assert.equal(done.nodes.length,2);assert.equal(done.budget.spawned,1);}finally{f.cleanup();}
 }
});
test('root cancellation reaches queued grandchildren and prevents late dispatch',async()=>{
 const f=fixture(messages=>({action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('Depth worker',messages[1].content+' next')]}}));
 try{const r=f.create();for(let i=0;i<4;i++)await f.engine.tick();assert.equal(f.engine.get(r.id).nodes.length,3);f.engine.cancel(r.id);const calls=f.calls;await f.engine.tick();assert.equal(f.calls,calls);assert.ok(f.engine.get(r.id).nodes.every(n=>n.status==='cancelled'));}finally{f.cleanup();}
});
test('recursive existing ancestor revocation prevents grandchild inference',async()=>{
 const f=fixture(messages=>({action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[messages[0].content.includes('You are the coordinator.')?{...worker('Lead','Delegate calculator work'),agentId:'existing'}:worker('Leaf','Calculate nested result')]}}));
 try{f.store.put('agents','existing',{...f.manager,id:'existing',toolIds:['tool-calculator']});const r=f.create();for(let i=0;i<4;i++)await f.engine.tick();assert.equal(f.engine.get(r.id).nodes.length,3);const a=f.store.get<any>('agents','existing');a.toolIds=[];f.store.put('agents','existing',a);const calls=f.calls;await f.engine.tick();assert.equal(f.calls,calls);assert.equal(f.engine.get(r.id).nodes[2].status,'failed');}finally{f.cleanup();}
});
test('browser authority requires origins; recovery with a lost session never replays pending navigation',()=>{
 const f=fixture();try{
  assert.throws(()=>f.create({allowedToolIds:['tool-browser']}),/origins/);
  const r=f.create({allowedToolIds:['tool-browser'],browserPolicy:{allowedOrigins:['https://example.com']}});
  const n=f.store.get<any>('swarm-nodes',r.rootNodeId);n.receipts.push({toolId:'tool-browser',status:'succeeded'});n.pending={decision:{action:'tool',toolId:'tool-browser',parameters:{action:'navigate',url:'https://example.com'}},callId:'old'};f.store.put('swarm-nodes',n.id,n);
  f.engine.recover();assert.equal(f.engine.get(r.id).interrupted,true);const resumed=f.engine.resume(r.id);assert.deepEqual(resumed.nodes[0].toolIds,[]);assert.equal(f.store.get<any>('swarm-nodes',n.id).pending,undefined);
 }finally{f.cleanup();}
});

test('a claimed hierarchy cannot satisfy required depth without a completed descendant',async()=>{
 const f=fixture(()=>({action:'final',reply:'I created a nested team and completed everything.'}));
 try{const r=f.create({requiredDepth:2});const done=await f.finish(r.id);assert.equal(done.status,'blocked');assert.equal(done.nodes.length,1);assert.equal(done.budget.modelCalls,2);assert.equal(done.events.filter(e=>e.type==='COMPLETION_REJECTED').length,1);assert.match(done.result!,/depth 2/);}finally{f.cleanup();}
});
test('nested synthesis reserves model allowance for every ancestor and shares lifetime slots across branches',async()=>{
 const f=fixture(messages=>messages.some(m=>m.content.startsWith('UNTRUSTED CHILD'))?{action:'final',reply:'Partial evidence retained'}:{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[{...worker('Nested',messages[1].content+' child'),toolIds:[],requiredToolIds:[]}]}});
 try{const r=f.create({limits:{maxAgents:3,maxModelCalls:4}});const done=await f.finish(r.id);assert.ok(done.budget.modelCalls<=4);assert.equal(done.nodes.length,3);assert.equal(done.budget.spawned,2);assert.equal(done.nodes[2].status,'budget_exhausted');assert.equal(done.status,'partial');}finally{f.cleanup();}
});


test('mandatory depth constrains the model schema and rejects premature parallel fan-out',async()=>{
 let inspected=false;
 const f=fixture((_messages,_call,tools)=>{
  const schema=tools!.find(t=>t.id===SPAWN_TOOL).schema;assert.equal(schema.properties.workers.maxItems,1);assert.equal(schema.properties.workers.items.properties.agentId,undefined);inspected=true;
  return{action:'tool',toolId:SPAWN_TOOL,parameters:{workers:[worker('A','A subtask'),worker('B','B subtask')]}};
 });
 try{const r=f.create({mode:'dynamic',requiredDepth:2});const done=await f.finish(r.id);assert.ok(inspected);assert.equal(done.status,'failed');assert.equal(done.nodes.length,1);assert.match(done.result!,/one child/);}finally{f.cleanup();}
});


test('Ollama schema excludes unsupported completion while preserving blocked decisions',()=>{
 const blocked=decisionFormat([],false) as any;assert.equal(blocked.anyOf.length,1);assert.equal(blocked.anyOf[0].properties.action.const,'blocked');
 const ready=decisionFormat([],true) as any;assert.ok(ready.anyOf.some((s:any)=>s.properties.action.const==='final'));
});

test('multiple tools and a large saved team retain room for child evidence',async()=>{
 const f=fixture();try{
  for(let i=0;i<40;i++)f.store.put('agents','candidate-'+i,{...f.manager,id:'candidate-'+i,displayName:'Eligible specialist '+i,jobTitle:'Research and operations specialist',expertise:['Analysis','Research'],toolIds:['tool-calculator','tool-read-project','tool-web-search','tool-browser']});
  const r=f.create({allowedToolIds:['tool-calculator','tool-read-project','tool-web-search','tool-browser'],browserPolicy:{allowedOrigins:['https://example.com']}});const done=await f.finish(r.id);assert.equal(done.status,'completed');assert.equal(done.nodes.length,3);
  const root=f.store.get<any>('swarm-nodes',r.rootNodeId);assert.ok(root.receipts.length>0);
 }finally{f.cleanup();}
});

test('zero browser step budget fails before launch and remains consumed across restart',async()=>{
 const f=fixture(()=>({action:'tool',toolId:'tool-browser',parameters:{action:'navigate',url:'https://example.com'}}));
 try{const r=f.create({allowedToolIds:['tool-browser'],browserPolicy:{allowedOrigins:['https://example.com']},limits:{maxBrowserSteps:0}});const done=await f.finish(r.id);assert.equal(done.status,'budget_exhausted');assert.equal(done.budget.browserSteps,0);assert.equal(done.budget.toolCalls,1);assert.equal(done.budget.browserRequests,0);assert.equal(f.engine.stats().activeBrowserSessions,0);const restarted=new SwarmEngine(f.store,()=>defaultSettings,f.inference as any);assert.equal(restarted.get(r.id).budget.toolCalls,1);restarted.stop();}finally{f.cleanup();}
});
