import { test } from 'node:test';import assert from 'node:assert/strict';
import { infer, localInferenceLimit } from '../src/server/providers';
const config={provider:'ollama',model:'fixture',endpoint:'http://127.0.0.1:11434',temperature:0,maxTokens:128};
test('required review tool constrains provider format and rejects alternative actions without retry',async()=>{
 const original=globalThis.fetch;let calls=0;let next:any={action:'blocked',reason:'No citations'};
 const tools=[{id:'submit_review',schema:{type:'object'}},{id:'other',schema:{type:'object'}}];
 try{
 globalThis.fetch=(async(_url:any,init:any)=>{calls++;const body=JSON.parse(init.body);
 assert.deepEqual(body.format.anyOf.map((x:any)=>[x.properties.action.const,x.properties.toolId.const]),[['tool','submit_review']]);
 return new Response(JSON.stringify({message:{content:JSON.stringify(next)},prompt_eval_count:2,eval_count:3}));}) as any;
 for(const decision of [{action:'blocked',reason:'No citations'},{action:'final',reply:'pass'},{action:'tool',toolId:'other',parameters:{}}]){
 next=decision;await assert.rejects(()=>infer({...config,requiredTool:'submit_review'},[],new AbortController().signal,tools),(e:any)=>e.receipt.status==='failed');
 }
 assert.equal(calls,3);
 next={action:'tool',toolId:'submit_review',parameters:{checks:[{verdict:'inconclusive'}]}};
 assert.deepEqual((await infer({...config,requiredTool:'submit_review'},[],new AbortController().signal,tools)).decision,next);
 await assert.rejects(()=>infer({...config,requiredTool:'missing'},[],new AbortController().signal,tools),/Required tool is not available/);
 assert.equal(calls,4);
 }finally{globalThis.fetch=original;}
});
test('malformed provider decision retains reported usage and model identity',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=(async()=>new Response(JSON.stringify({model:'fixture',message:{content:'invalid JSON'},prompt_eval_count:21,eval_count:17}))) as any;
 await assert.rejects(()=>infer(config,[{role:'user',content:'test'}],new AbortController().signal),(error:any)=>{assert.equal(error.receipt.inputTokens,21);assert.equal(error.receipt.outputTokens,17);assert.equal(error.receipt.status,'failed');return true;});
 }finally{globalThis.fetch=original;}
});
test('shared Ollama semaphore bounds inference and cancellation removes waiting requests',async()=>{
 const original=globalThis.fetch,old=process.env.VAC_OLLAMA_CONCURRENCY;let release!:()=>void,started!:()=>void;const gate=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>started=r);let calls=0;
 try{process.env.VAC_OLLAMA_CONCURRENCY='1';assert.equal(localInferenceLimit(),1);
 globalThis.fetch=(async()=>{calls++;started();await gate;return new Response(JSON.stringify({message:{content:'{"action":"final","reply":"done"}'},prompt_eval_count:1,eval_count:1}));}) as any;
 const a=infer(config,[],new AbortController().signal);await ready;const controller=new AbortController();const b=infer(config,[],controller.signal);controller.abort();await assert.rejects(b);assert.equal(calls,1);release();await a;await infer(config,[],new AbortController().signal);assert.equal(calls,2);
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.VAC_OLLAMA_CONCURRENCY;else process.env.VAC_OLLAMA_CONCURRENCY=old;}
});
