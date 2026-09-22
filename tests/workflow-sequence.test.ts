import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextWorkflowStep} from '../src/server/workflowSequence';
const receipt=(sequenceStep:number,status='succeeded')=>({toolId:'tool-browser',sequenceStep,status});
test('each occurrence requires its own successful receipt, failures and duplicate receipts cannot skip steps',()=>{
 const sequence=['tool-browser','tool-browser'];
 assert.deepEqual(nextWorkflowStep(sequence,[receipt(0)]),{index:1,toolId:'tool-browser'});
 assert.deepEqual(nextWorkflowStep(sequence,[receipt(0),receipt(0),receipt(1,'failed')]),{index:1,toolId:'tool-browser'});
 assert.deepEqual(nextWorkflowStep(sequence,[receipt(1)]),{index:0,toolId:'tool-browser'});
 assert.equal(nextWorkflowStep(sequence,[receipt(0),receipt(1)]),undefined);
 assert.deepEqual(nextWorkflowStep(sequence,[{toolId:'tool-browser',status:'succeeded'}]),{index:0,toolId:'tool-browser'});
});
test('historical unique sequences use ordered legacy receipts without rewriting them',()=>{
 const receipts=[{toolId:'tool-files',status:'failed'},{toolId:'tool-files',status:'succeeded'}];
 assert.deepEqual(nextWorkflowStep(['tool-files','tool-calculator'],receipts),{index:1,toolId:'tool-calculator'});
 assert.equal(nextWorkflowStep([],receipts),undefined);
});

test('operation identity ignores nested object key order but preserves array order and values',async()=>{
 const {canonicalWorkflowArguments:canonical}=await import('../src/server/workflowSequence');
 assert.equal(JSON.stringify(canonical({b:{y:2,x:1},a:[1,2]})),JSON.stringify(canonical({a:[1,2],b:{x:1,y:2}})));
 assert.notDeepEqual(canonical({a:[1,2]}),canonical({a:[2,1]}));
});
