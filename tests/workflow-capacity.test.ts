import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertWorkflowCapacity} from '../src/server/workflowCapacity';
const limits={maxModelCalls:12,maxCallsPerAgent:8,maxToolCalls:9};
const nodes=[{name:'root',calls:2,toolSequence:['read','write']},{name:'lead',toolSequence:[]},{name:'leaf',toolSequence:['read','read','write']}];
test('capacity includes every repeated operation, supervisor completion, prior planning and review',()=>{
 assert.deepEqual(assertWorkflowCapacity(nodes,limits,{modelCalls:2,toolCalls:2},1),{minimumRemainingModelCalls:9,minimumRemainingToolCalls:5,lowerBoundOnly:true});
 assert.throws(()=>assertWorkflowCapacity(nodes,{...limits,maxModelCalls:10},{modelCalls:2,toolCalls:2},1),/9 more model calls/);
 assert.throws(()=>assertWorkflowCapacity(nodes,{...limits,maxToolCalls:6},{modelCalls:2,toolCalls:2},1),/5 more tool calls/);
 assert.throws(()=>assertWorkflowCapacity(nodes,{...limits,maxCallsPerAgent:5},{modelCalls:2,toolCalls:2},1),/root needs at least 6/);
});
test('required tools absent from sequences still need decisions; duplicate grants are not extra operations',()=>{
 const n=[{name:'root',toolSequence:['read','read'],requiredToolIds:['read','write','write']}];
 assert.equal(assertWorkflowCapacity(n,limits,{modelCalls:0,toolCalls:0}).minimumRemainingModelCalls,4);
});
