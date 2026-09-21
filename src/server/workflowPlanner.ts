import { z } from 'zod';
import { validateWorkflowTopology } from './workflowTopology';

// The model specifies leaf tasks and supervisor paths. The compiler constructs
// hierarchy and least-privilege grants; it never invents tasks or tool actions.
export function workflowPlannerSchema(tools: string[], profiles: string[], maxDepth: number, maxWorkers: number, coordinatorTools: string[] = []) {
  const workerTools=tools.filter(tool=>!coordinatorTools.includes(tool));
  const tool = workerTools.length ? z.enum(workerTools as [string, ...string[]]) : z.never();
  const rootTools=coordinatorTools.length?coordinatorTools:tools;
  const rootTool=rootTools.length?z.enum(rootTools as [string,...string[]]):z.never();
  const profile = z.enum(profiles as [string, ...string[]]);
  return z.object({
    tasks: z.array(z.discriminatedUnion('executor', [
      z.object({executor:z.literal('coordinator'),toolSequence:z.array(rootTool).min(coordinatorTools.length).max(11)}).strict(),
      z.object({executor:z.literal('worker'),
      key: z.string().regex(/^[a-zA-Z0-9_-]{1,40}$/),
      name: z.string().min(1).max(100),
      instructions: z.string().min(1).max(2000),
      agentId: profile,
      supervisors: z.array(z.object({name:z.string().min(1).max(100),agentId:profile}).strict()).max(maxDepth-1),
      dependsOn: z.array(z.string().min(1).max(40)).max(8),
      toolSequence: z.array(tool).max(11),
      requiredToolIds: z.array(tool).max(11),
    }).strict(),
    ])).min(1).max(maxWorkers+1),
  }).strict();
}

export function compileWorkflowTasks(raw: z.infer<ReturnType<typeof workflowPlannerSchema>>) {
  const plan: any[] = [];
  const supervisors = new Map<string, any>();
  const unique = (items: string[], label: string) => {
    if (new Set(items).size !== items.length) throw new Error(label + ': sequence tools must be unique');
    return items;
  };
  const coordinators=raw.tasks.filter(task=>task.executor==='coordinator');
  if(coordinators.length>1)throw new Error('Submit exactly one coordinator assignment');
  const toolSequence=unique(coordinators[0]?.toolSequence||[], 'coordinator');
  const tasks=raw.tasks.filter(task=>task.executor==='worker');
  if(!tasks.length)throw new Error('Workflow needs at least one delegated worker task');
  for (const task of tasks) {
    const tools = unique(task.toolSequence, task.key);
    if (task.requiredToolIds.some(tool => !tools.includes(tool))) throw new Error(task.key + ': required tools must appear in toolSequence');
    let parentKey: string | undefined;
    const path: string[] = [];
    for (const supervisor of task.supervisors) {
      path.push(supervisor.name);
      const identity = JSON.stringify(path);
      let node = supervisors.get(identity);
      if (node && node.agentId !== (supervisor.agentId || undefined)) throw new Error('Conflicting saved profile for supervisor ' + supervisor.name);
      if (!node) {
        node = {key:'supervisor_' + supervisors.size, parentKey, name:supervisor.name,
          agentId:supervisor.agentId || undefined, role:'Workflow supervisor',
          instructions:'Summarize the completed child evidence. Do not repeat their tools or create more workers.',
          objective:'Summarize the assigned child tasks and disclose any missing evidence.',
          toolIds:[], requiredToolIds:[], toolSequence:[], dependsOn:[],
          acceptanceCriteria:['Summarize actual child results and disclose failures.']};
        supervisors.set(identity,node); plan.push(node);
      }
      node.toolIds = [...new Set([...node.toolIds, ...tools])];
      parentKey = node.key;
    }
    plan.push({key:task.key, parentKey, name:task.name, agentId:task.agentId || undefined,
      role:'Workflow specialist', instructions:task.instructions, objective:task.instructions,
      toolIds:[...tools], toolSequence:[...tools], requiredToolIds:[...task.requiredToolIds],
      dependsOn:[...task.dependsOn], acceptanceCriteria:['Complete the assigned task using successful tool evidence.']});
  }
  // References submitted by the model may name task keys only; generated
  // supervisor keys cannot be used to smuggle in implicit completion waits.
  const keys = new Set(tasks.map(task => task.key));
  for (const task of tasks) for (const key of task.dependsOn) {
    if (!keys.has(key)) throw new Error(`${task.key}: dependency ${key} must name a task key`);
  }
  validateWorkflowTopology(plan);
  return {plan, toolSequence:[...toolSequence]};
}
