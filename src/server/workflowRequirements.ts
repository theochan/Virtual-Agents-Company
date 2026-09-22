import {z} from 'zod';
const minimumTools=z.record(z.string().min(1),z.number().int().min(1).max(24));
export const workflowRequirementsSchema=z.object({tasks:z.array(z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),briefName:z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/).optional(),minimumTools,dependsOn:z.array(z.string()).max(8)}).strict()).min(1).max(16),coordinatorMinimumTools:minimumTools}).strict();
export type WorkflowRequirements=z.infer<typeof workflowRequirementsSchema>;
export function validateWorkflowRequirements(requirements:WorkflowRequirements|undefined,plan:Array<{key:string;assignmentId?:string;parentKey?:string;toolSequence:string[];dependsOn:string[]}>,rootSequence:string[],allowedTools:string[]){
 if(!requirements)return;
 const errors:string[]=[];
 const count=(sequence:string[],minimum:Record<string,number>,label:string)=>{for(const[tool,n]of Object.entries(minimum)){if(!allowedTools.includes(tool))errors.push(`${label}: ${tool} outside owner grant`);const actual=sequence.filter(t=>t===tool).length;if(actual<n)errors.push(`${label}: ${tool} needs ${n} steps, got ${actual}`);}};
 const ids=new Set(requirements.tasks.map(t=>t.id));if(ids.size!==requirements.tasks.length)errors.push('Task requirement IDs must be unique');
 const leaves=plan.filter(p=>!plan.some(c=>c.parentKey===p.key));
 if(leaves.length!==ids.size)errors.push('Exactly one worker per required assignment');
 for(const task of requirements.tasks){const matches=leaves.filter(p=>p.assignmentId===task.id);if(matches.length!==1){errors.push(`${task.id}: assignment must appear exactly once`);continue;}const p=matches[0];count(p.toolSequence,task.minimumTools,task.id);
  for(const dep of task.dependsOn){if(!ids.has(dep))errors.push('Unknown required prerequisite '+dep);const target=leaves.find(p=>p.assignmentId===dep);if(!target||!p.dependsOn.includes(target.key))errors.push(`${task.id}: missing prerequisite ${dep}`);}
 }
 count(rootSequence,requirements.coordinatorMinimumTools,'Coordinator');
 if(errors.length)throw new Error('Plan requirement mismatches: '+errors.join('; ')+'. Include each brief and input read; keep operations in their assigned worker.');
}

/** Lower bound only: one model decision per required operation and per node final. */
export function minimumWorkflowModelCalls(requirements:WorkflowRequirements,nodeCount:number,planningCalls=1){
 return [...requirements.tasks.map(t=>t.minimumTools),requirements.coordinatorMinimumTools].reduce((sum,tools)=>sum+Object.values(tools).reduce((a,b)=>a+b,0),nodeCount+planningCalls);
}
