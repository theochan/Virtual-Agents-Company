import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateReview,semanticReviewSchema,reviewPacket} from '../src/server/semanticReview';
const policy=semanticReviewSchema.parse({reviewerId:'reviewer',criteria:['Output matches input'],inputNames:['source.txt'],outputNames:['report.txt']});
const files=[{name:'source.txt',fileId:'a',sha256:'a',version:1,role:'input',text:'The total is 42.'},{name:'report.txt',fileId:'b',sha256:'b',version:1,role:'output',text:'The total is 99.'}];
test('uncited reports remain reviewable while reviewer references and structured decisions stay mandatory',async()=>{
 const {reviewEvidenceCatalog,reviewConfirmationPacket}=await import('../src/server/semanticReview');
 const job:any={id:'run',projectId:'p',objective:'Check source support',semanticReview:policy};
 const packet=reviewPacket({file:(_p:string,name:string)=>({id:name,sha256:name,version:1,mime:'text/plain',runId:'run',base64:Buffer.from(name==='source.txt'?'Delivery remains 20 November; the proposed extension requires missing written confirmation.':'The agreed date is 25 November.').toString('base64')})}as any,job,'Review the report.');
 const catalog=reviewEvidenceCatalog(packet.files);
 const evidence=[{inputReference:catalog.find(e=>e.name==='source.txt')!.id,outputReference:catalog.find(e=>e.name==='report.txt')!.id}];
 const check={criterion:0,reason:'The conditional extension lacks the required confirmation.',evidence,verdict:'fail'};
 assert.equal(validateReview({checks:[check]},policy,packet.files).checks[0].grounded,true);
 assert.equal(validateReview({checks:[check]},policy,packet.files).passed,false);
 assert.throws(()=>validateReview({action:'blocked',reason:'Report contains no citations'},policy,packet.files));
 assert.equal(validateReview({checks:[{...check,evidence:[]}]},policy,packet.files).checks[0].verdict,'inconclusive');
 assert.match(packet.messages[0].content,/evidence references belong in YOUR submit_review response/);
 assert.match(packet.messages[0].content,/unless a numbered criterion explicitly requires them/);
 const provisional=validateReview({checks:[{...check,verdict:'pass'}]},policy,packet.files);
 const confirmation=reviewConfirmationPacket(packet,policy,provisional);
 assert.ok(confirmation.messages[0].content.startsWith(packet.messages[0].content));
});
test('semantic review requires every criterion and exact input/output evidence',()=>{
 const base={criterion:0,verdict:'pass',reason:'supported',evidence:[{name:'source.txt',quote:'42'},{name:'report.txt',quote:'99'}]};
 assert.equal(validateReview({checks:[{...base,verdict:'fail'}]},policy,files).passed,false);
 assert.equal(validateReview({checks:[{...base,evidence:[]}]},policy,files).checks[0].verdict,'inconclusive');
 assert.equal(validateReview({checks:[{...base,evidence:[{name:'report.txt',quote:'99'}]}]},policy,files).passed,false);
 assert.equal(validateReview({checks:[{...base,evidence:[{name:'source.txt',quote:'42'},{name:'report.txt',quote:'42'}]}]},policy,files).passed,false);
 assert.throws(()=>validateReview({checks:[base,base]},policy,files),/every criterion/);
});
test('review packet refuses stale, binary or oversized evidence rather than silently truncating',()=>{
 const job:any={id:'run',projectId:'p',objective:'Check total',semanticReview:policy};
 const source={id:'id',sha256:'hash',version:1,mime:'text/plain',base64:Buffer.from('42').toString('base64'),runId:'run'};
 assert.throws(()=>reviewPacket({file:()=>({...source,runId:'old'})}as any,job,'draft'),/current-run/);
 assert.throws(()=>reviewPacket({file:()=>({...source,mime:'application/pdf'})}as any,job,'draft'),/text\/JSON/);
 assert.throws(()=>reviewPacket({file:()=>({...source,base64:Buffer.from('x'.repeat(16000)).toString('base64')})}as any,job,'draft'),/context envelope/);
});

test('confirmation preserves original evidence and refuses oversized review context',async()=>{
 const {reviewConfirmationPacket}=await import('../src/server/semanticReview');
 const packet={files,messages:[{role:'system',content:'You are an independent reviewer.'},{role:'user',content:'original source packet'}]as any,inputBound:10,packetHash:'original'};
 const verdict=validateReview({checks:[{criterion:0,verdict:'pass',reason:'provisional',evidence:[{name:'source.txt',quote:'42'},{name:'report.txt',quote:'99'}]}]},policy,files);
 const confirmation=reviewConfirmationPacket(packet,policy,verdict);
 assert.equal(confirmation.files,files);assert.match(confirmation.messages[0].content,/CONSISTENCY CONFIRMATION/);assert.equal(confirmation.messages[1],packet.messages[1]);assert.notEqual(confirmation.packetHash,packet.packetHash);
 assert.throws(()=>reviewConfirmationPacket(packet,policy,{...verdict,passed:false}),/Only a provisional/);
 assert.throws(()=>reviewConfirmationPacket({...packet,messages:[packet.messages[0],{role:'user',content:'x'.repeat(15000)}]},policy,verdict),/context envelope/);
});

test('server-resolved references preserve exact complete text and reject invented or stale evidence',async()=>{
 const {reviewEvidenceCatalog,reviewToolFor}=await import('../src/server/semanticReview');
 const catalog=reviewEvidenceCatalog(files);
 for(const f of files)assert.equal(catalog.filter(e=>e.name===f.name).map(e=>e.quote).join(''),f.text);
 const decision={checks:[{criterion:0,verdict:'fail',reason:'Source and report disagree',evidence:catalog.map(e=>({reference:e.id}))}]};
 const verified=validateReview(decision,policy,files);assert.equal(verified.passed,false);assert.equal(verified.checks[0].grounded,true);
 assert.deepEqual(verified.checks[0].evidence.map(e=>e.quote),files.map(f=>f.text));
 assert.throws(()=>validateReview({...decision,checks:[{...decision.checks[0],evidence:[{reference:'e_invented'}]}]},policy,files),/Unknown or stale/);
 assert.throws(()=>validateReview(decision,policy,files.map(f=>({...f,version:2}))),/Unknown or stale/);
 assert.throws(()=>validateReview(decision,policy,files.map(f=>({...f,text:f.text+' changed'}))),/Unknown or stale/);
 const schema:any=reviewToolFor(policy,files).schema;
 assert.deepEqual(schema.properties.checks.items.properties.evidence.items.properties.inputReference.enum,[catalog[0].id]);
 assert.deepEqual(schema.properties.checks.items.properties.evidence.items.properties.outputReference.enum,[catalog[1].id]);
 const paired={checks:[{...decision.checks[0],evidence:[{inputReference:catalog[0].id,outputReference:catalog[1].id}]}]};
 assert.equal(validateReview(paired,policy,files).checks[0].grounded,true);
 assert.throws(()=>validateReview({checks:[{...decision.checks[0],evidence:[{inputReference:catalog[1].id,outputReference:catalog[0].id}]}]},policy,files),/role mismatch/);
 const long=[{...files[0],text:('JSON, text.\n').repeat(120)}];const chunks=reviewEvidenceCatalog(long);
 assert.equal(chunks.map(e=>e.quote).join(''),long[0].text);assert.ok(chunks.every(e=>e.quote.length<=500));
});
