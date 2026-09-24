import 'dotenv/config';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {Store} from '../src/server/store';import {Workspace} from '../src/server/workspace';import {infer} from '../src/server/providers';
import {reserveRequest,remainingRequestBudget} from '../src/server/operations';
import {semanticReviewSchema,reviewPacket,reviewToolFor,reviewConfirmationPacket,validateReview} from '../src/server/semanticReview';
import {reviewerChallenges} from './evaluation/priority-one-corpus';
const [baselinePath,outputPath]=process.argv.slice(2);if(!baselinePath||!outputPath||fs.existsSync(outputPath))throw new Error('Provide the retained baseline and a new result path');
const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));const retained=baseline.reviewer.find((r:any)=>r.id==='credit-net-wrong');if(!retained?.review?.passed)throw new Error('Expected recorded false acceptance is absent');
const sha=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
const sources=['src/server/semanticReview.ts','src/server/providers.ts','src/server/swarm.ts','scripts/evaluate-review-confirmation.ts'];
const sourceHash=()=>sha(sources.map(f=>f+':'+sha(fs.readFileSync(f))).join('\n'));
const report:any={sourceHash:sourceHash(),baselineSha256:sha(fs.readFileSync(baselinePath)),startedAt:new Date().toISOString(),declaration:{maximumModelCalls:3,model:'qwen3.5:9b',temperature:0,cases:['credit-net-wrong','credit-net-correct'],requiredResults:[false,true],repetitions:1,noRetries:true,scope:'Known-failure regression after a failed frozen pilot. Wrong case replays its original passing assessment and invokes live confirmation; correct control invokes live assessment and confirmation. Not a holdout or a repeated full workflow.'},results:[],providerCalls:0};
const budget=new Store(path.resolve('data'));const save=()=>fs.writeFileSync(outputPath,JSON.stringify(report,null,2));save();
try{
 const remaining=remainingRequestBudget(budget,'inference');report.admission=remaining;if(remaining.remaining!==null&&remaining.remaining<3)throw new Error('Insufficient unchanged daily allowance');
 for(const id of report.declaration.cases){
  const c=reviewerChallenges.find(x=>x.id===id)!;const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vac-review-confirm-'));const store=new Store(dir,budget),w=new Workspace(store);const result:any={id,expected:c.expected,stages:[]};report.results.push(result);
  try{
   w.store.put('projects','p',{id:'p',workspaceId:'ws-default'});w.write('p','source.txt',Buffer.from(c.source),0,'owner');w.write('p','report.txt',Buffer.from(c.report),0,'producer','run');
   const policy=semanticReviewSchema.parse({reviewerId:'reviewer',criteria:[c.criterion],inputNames:['source.txt'],outputNames:['report.txt']});const packet=reviewPacket(w,{id:'run',projectId:'p',objective:'Review source support.',semanticReview:policy}as any,'Check the report.');
   const call=async(p:ReturnType<typeof reviewPacket>,stage:string)=>{if(sourceHash()!==report.sourceHash)throw new Error('Regression source changed');if(report.providerCalls>=3)throw new Error('Regression cap reached');reserveRequest(store,'inference');report.providerCalls++;save();const response=await infer({provider:'ollama',model:'qwen3.5:9b',endpoint:'http://127.0.0.1:11434',temperature:0,maxTokens:1536,allowFinal:false},p.messages,AbortSignal.timeout(90000),[reviewToolFor(policy,packet.files)]);result.stages.push({stage,packetHash:p.packetHash,receipt:response.receipt,decision:response.decision});save();if(response.decision.action!=='tool'||response.decision.toolId!=='submit_review')throw new Error('No structured review');return validateReview(response.decision.parameters,policy,packet.files);};
   let initial;
   if(id==='credit-net-wrong'){initial=validateReview({checks:retained.review.checks.map(({grounded,...c}:any)=>c)},policy,packet.files);result.replayedInitial=initial;}
   else initial=await call(packet,'assessment');
   const confirmation=initial.passed?await call(reviewConfirmationPacket(packet,policy,initial),'confirmation'):undefined;
   result.initial=initial;result.confirmation=confirmation;result.accepted=!!initial.passed&&!!confirmation?.passed;result.correct=result.accepted===c.expected;
  }catch(e){result.error=e instanceof Error?e.message:String(e);result.correct=false;}finally{store.close();save();}
  console.log(JSON.stringify({id,accepted:result.accepted,correct:result.correct,error:result.error}));
 }
 report.passed=report.results.every((r:any)=>r.correct&&!r.error);report.completedAt=new Date().toISOString();report.budgetAfter=remainingRequestBudget(budget,'inference');save();if(!report.passed)process.exitCode=1;
}finally{budget.close();}
