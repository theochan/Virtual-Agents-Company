import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateReview,semanticReviewSchema,reviewPacket} from '../src/server/semanticReview';
const policy=semanticReviewSchema.parse({reviewerId:'reviewer',criteria:['Output matches input'],inputNames:['source.txt'],outputNames:['report.txt']});
const files=[{name:'source.txt',fileId:'a',sha256:'a',version:1,role:'input',text:'The total is 42.'},{name:'report.txt',fileId:'b',sha256:'b',version:1,role:'output',text:'The total is 99.'}];
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
