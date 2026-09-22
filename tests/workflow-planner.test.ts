import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workflowPlannerSchema,compileWorkflowTasks} from '../src/server/workflowPlanner';
const task=(key:string,extra:any={})=>({executor:'worker',key,name:key,instructions:'Do assigned work',agentId:'',supervisors:[],dependsOn:[],toolSequence:[],requiredToolIds:[],...extra});
const schema=workflowPlannerSchema(['tool-code','tool-files'],['','saved'],4,8);
const compile=(tasks:any[],toolSequence:string[]=[])=>compileWorkflowTasks(schema.parse({tasks:[{executor:'coordinator',toolSequence},...tasks]}));
test('task compiler shares supervisor paths and derives exactly the descendant tool union',()=>{
 const {plan}=compile([
  task('compute',{supervisors:[{name:'Lead',agentId:''},{name:'Sublead',agentId:''}],toolSequence:['tool-code'],requiredToolIds:['tool-code']}),
  task('review',{supervisors:[{name:'Lead',agentId:''}],dependsOn:['compute'],toolSequence:['tool-files'],agentId:'saved'}),
 ]);
 assert.equal(plan.length,4);
 assert.deepEqual(plan[0].toolIds,['tool-code','tool-files']);
 assert.deepEqual(plan[1].toolIds,['tool-code']);
 assert.deepEqual(plan[2].toolIds,['tool-code']);
 assert.deepEqual(plan[3].toolIds,['tool-files']);
 assert.equal(plan[2].parentKey,plan[1].key);
 assert.equal(plan[3].parentKey,plan[0].key);
 assert.deepEqual(plan[3].dependsOn,['compute']);
 assert.deepEqual(plan[0].toolSequence,[]);
 assert.deepEqual(plan[0].requiredToolIds,[]);
 assert.equal(plan[3].agentId,'saved');
});
test('task compiler rejects ambiguous profiles, duplicate keys, cycles and invented prerequisites',()=>{
 assert.throws(()=>compile([task('a'),task('a')]),/unique/);
 assert.throws(()=>compile([task('a',{dependsOn:['b']}),task('b',{dependsOn:['a']})]),/cycle/);
 assert.throws(()=>compile([task('a',{dependsOn:['missing']})]),/task key/);
 assert.throws(()=>compile([task('a',{supervisors:[{name:'Lead',agentId:''}]}),task('b',{supervisors:[{name:'Lead',agentId:'saved'}]})]),/Conflicting/);
 assert.throws(()=>compile([task('supervisor_0',{supervisors:[{name:'Lead',agentId:''}]})]),/unique/);
});
test('task compiler rejects grant expansion and missing required evidence',()=>{
 assert.throws(()=>compile([task('a',{toolSequence:['tool-connector']})]));
 assert.deepEqual(compile([task('a',{toolSequence:['tool-code','tool-code']})]).plan[0].toolSequence,['tool-code','tool-code']);
 assert.deepEqual(compile([task('a')],['tool-code','tool-code']).toolSequence,['tool-code','tool-code']);
 assert.throws(()=>compile([task('a',{requiredToolIds:['tool-code']})]),/required tools/);
 assert.throws(()=>compile([task('a',{toolIds:['tool-code']})]));
 const manual=workflowPlannerSchema([],['saved'],1,1);
 assert.throws(()=>manual.parse({tasks:[task('a')]}));
 assert.throws(()=>manual.parse({tasks:[task('a',{agentId:'saved',supervisors:[{name:'Lead',agentId:'saved'}]})]}));
});

test('task compiler keeps same-named supervisors in different branches distinct',()=>{
 const {plan}=compile([
  task('a',{supervisors:[{name:'A',agentId:''},{name:'Shared',agentId:''}],toolSequence:['tool-code']}),
  task('b',{supervisors:[{name:'B',agentId:''},{name:'Shared',agentId:''}],toolSequence:['tool-files']}),
 ]);
 const shared=plan.filter(p=>p.name==='Shared');
 assert.equal(shared.length,2);assert.notEqual(shared[0].parentKey,shared[1].parentKey);
 assert.deepEqual(shared.map(p=>p.toolIds),[['tool-code'],['tool-files']]);
});

test('coordinator assignment binds to the existing root and cannot create duplicate root work',()=>{
 const raw={tasks:[{executor:'coordinator',toolSequence:['tool-files']},task('a',{toolSequence:['tool-code']})]};
 const workflow=compileWorkflowTasks(schema.parse(raw));
 assert.equal(workflow.plan.length,1);assert.equal(workflow.plan[0].key,'a');
 assert.deepEqual(workflow.toolSequence,['tool-files']);assert.deepEqual(workflow.plan[0].toolIds,['tool-code']);
 assert.throws(()=>compileWorkflowTasks(schema.parse({tasks:[...raw.tasks,{executor:'coordinator',toolSequence:[]}]})),/one coordinator/);
 assert.throws(()=>compileWorkflowTasks(schema.parse({tasks:[{executor:'coordinator',toolSequence:[]}]})),/delegated worker/);
 assert.throws(()=>schema.parse({tasks:[{executor:'coordinator',toolSequence:[],agentId:'saved'},task('a')]}));
});

test('planner shares tool types without removing coordinator evidence requirements',()=>{
 const scoped=workflowPlannerSchema(['tool-code','tool-files','tool-connector'],[''],2,5,['tool-connector']);
 assert.ok(scoped.parse({tasks:[task('a',{toolSequence:['tool-connector']})]}));
 assert.throws(()=>scoped.parse({tasks:[{executor:'coordinator',toolSequence:['tool-code']},task('a')]}));
 assert.throws(()=>scoped.parse({tasks:[{executor:'coordinator',toolSequence:[]},task('a')]}));
 const result=compileWorkflowTasks(scoped.parse({tasks:[{executor:'coordinator',toolSequence:['tool-connector']},task('a',{toolSequence:['tool-code']})]}));
 assert.deepEqual(result.toolSequence,['tool-connector']);assert.deepEqual(result.plan[0].toolIds,['tool-code']);
});


test('repeated operations have unique grants and bounded sequences',()=>{
 const repeated=Array(24).fill('tool-code');
 const {plan}=compile([task('a',{toolSequence:repeated})]);
 assert.equal(plan[0].toolSequence.length,24);assert.deepEqual(plan[0].toolIds,['tool-code']);
 assert.throws(()=>compile([task('a',{toolSequence:[...repeated,'tool-code']})]));
});

test('required assignments preserve explicit identity independently of display names',()=>{
 const scoped=workflowPlannerSchema(['tool-files','tool-peer'],[''],2,3,[],['Research','Review']);
 const result=compileWorkflowTasks(scoped.parse({tasks:[{executor:'coordinator',toolSequence:[]},task('a',{assignmentId:'Research',name:'Research Specialist',toolSequence:['tool-files','tool-files']}),task('b',{assignmentId:'Review',dependsOn:['a'],toolSequence:['tool-peer']})]}));
 assert.equal(result.plan[0].assignmentId,'Research');assert.equal(result.plan[1].assignmentId,'Review');
 assert.throws(()=>scoped.parse({tasks:[task('bad',{assignmentId:'Invented'})]}));
});
