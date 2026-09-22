import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateWorkflowRequirements} from '../src/server/workflowRequirements';
const req={tasks:[{id:'Research',minimumTools:{'tool-files':2},dependsOn:[]},{id:'Review',minimumTools:{'tool-peer':1},dependsOn:['Research']}],coordinatorMinimumTools:{'tool-files':2}};
const plan=[{key:'a',assignmentId:'Research',toolSequence:['tool-files','tool-files'],dependsOn:[]},{key:'b',assignmentId:'Review',toolSequence:['tool-peer'],dependsOn:['a']}];
test('requirements reject missing reads, peer messaging, prerequisites and coordinator occurrences',()=>{
 assert.doesNotThrow(()=>validateWorkflowRequirements(req,plan,['tool-files','tool-files'],['tool-files','tool-peer']));
 for(const p of [[{...plan[0],toolSequence:['tool-files']},plan[1]],[plan[0],{...plan[1],toolSequence:[]}],[plan[0],{...plan[1],dependsOn:[]}],[plan[0],{...plan[1],assignmentId:'Research'}]])assert.throws(()=>validateWorkflowRequirements(req,p,['tool-files','tool-files'],['tool-files','tool-peer']));
 assert.throws(()=>validateWorkflowRequirements(req,plan,['tool-files'],['tool-files','tool-peer']));
 assert.throws(()=>validateWorkflowRequirements(req,plan,['tool-files','tool-files'],['tool-files']));
});

test('all missing operations are returned together within one planning correction',()=>{
 assert.throws(()=>validateWorkflowRequirements(req,[{...plan[0],toolSequence:[]},{...plan[1],toolSequence:[],dependsOn:[]}],[],['tool-files','tool-peer']),error=>{
  const message=String(error);assert.match(message,/Research: tool-files/);assert.match(message,/Review: tool-peer/);assert.match(message,/missing prerequisite Research/);assert.match(message,/Coordinator: tool-files/);assert.ok(message.length<800);return true;
 });
});

test('minimum model allowance includes every required operation, node final and planning call',async()=>{
 const {minimumWorkflowModelCalls}=await import('../src/server/workflowRequirements');assert.equal(minimumWorkflowModelCalls(req,3),9);assert.equal(minimumWorkflowModelCalls({tasks:[6,5,5,8,10,8].map((n,i)=>({id:String(i),minimumTools:{operation:n},dependsOn:[]})),coordinatorMinimumTools:{operation:5}},9),57);
});
