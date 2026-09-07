import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import { Store } from '../src/server/store';
import { RunEngine } from '../src/server/runs';
import { INITIAL_AGENTS } from '../src/data/initialData';
import { capabilityCheck, requiredToolsForRequest } from '../src/server/capabilities';
import { decisionFormat, infer } from '../src/server/providers';
import { toolCatalog } from '../src/server/tools';

test('missing required search blocks before provider resolution, preserves idempotency, and suggests only equipped workspace agents', async () => {
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'vac-cap-')),store=new Store(directory);let calls=0;
 try{
 const parent={...structuredClone(INITIAL_AGENTS[0]),id:'parent',workspaceId:'ws',toolIds:[],autonomyLevel:3};
 const child={...parent,id:'child',displayName:'Search specialist',reportsTo:'parent',toolIds:['tool-web-search']};
 for(const agent of [parent,child,{...child,id:'foreign',workspaceId:'other'},{...child,id:'low',autonomyLevel:2}])store.put('agents',agent.id,agent);
 store.put('projects','project',{id:'project',workspaceId:'ws',name:'Test',description:'',members:[]});
 const engine=new RunEngine(store,()=>({}),async()=>{calls++;throw Error('must not infer')});
 const input={agentId:'parent',projectId:'project',userMessage:'Search the web for SQLite documentation'};
 const run=engine.create(input,'request-123');assert.equal(run.status,'blocked');assert.deepEqual(run.capabilityBlock?.candidates,[{id:'child',name:'Search specialist',directSubordinate:true}]);assert.equal(engine.create(input,'request-123').id,run.id);await engine.tick();assert.equal(calls,0);assert.equal(store.all('request-budgets').length,0);assert.equal(store.all('runs').length,1);assert.equal(store.all('tool-results').length,0);
 }finally{store.close();fs.rmSync(directory,{recursive:true,force:true});}
});
test('explicit capabilities do not become grants and no-tool schema excludes tool actions',()=>{
 const a={...INITIAL_AGENTS[0],toolIds:[],autonomyLevel:3 as const};assert.deepEqual(requiredToolsForRequest('Retrieve current facts',['tool-web-search']),['tool-web-search']);assert.equal(capabilityCheck(a,[a],['tool-web-search']).missing.length,1);assert.equal(decisionFormat([]).anyOf.length,2);
 const schema=decisionFormat(toolCatalog.filter(t=>t.id==='tool-calculator'));assert.equal(schema.anyOf.length,3);assert.match(JSON.stringify(schema),/tool-calculator/);assert.doesNotMatch(JSON.stringify(schema),/tool-web-search/);
});
test('Ollama receives exact tool parameter schema while invalid model decisions still fail validation',async()=>{
 const original=globalThis.fetch;let request:any;
 try{
 globalThis.fetch=(async(_url:any,options:any)=>{request=JSON.parse(options.body);return new Response(JSON.stringify({message:{content:JSON.stringify({action:'final',reply:'Draft'})},model:'test'}));}) as any;
 await infer({provider:'ollama',endpoint:'http://127.0.0.1:11434',model:'test',temperature:0,maxTokens:128},[{role:'user',content:'Add numbers'}],new AbortController().signal,toolCatalog.filter(t=>t.id==='tool-calculator'));
 assert.equal(typeof request.format,'object');assert.ok(JSON.stringify(request.format).includes('multiply'));assert.ok(JSON.stringify(request.format).includes('additionalProperties'));
 globalThis.fetch=(async()=>new Response(JSON.stringify({message:{content:'{"action":"final","reply":"Draft","invented":true}'}}))) as any;
 await assert.rejects(()=>infer({provider:'ollama',endpoint:'http://127.0.0.1:11434',model:'test',temperature:0,maxTokens:128},[],new AbortController().signal,[]),/valid decision/);
 }finally{globalThis.fetch=original;}
});
