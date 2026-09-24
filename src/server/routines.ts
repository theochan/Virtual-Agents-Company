import { z } from 'zod';
import { SwarmEngine, swarmInput, isSwarmLive } from './swarm';
import { HttpError, hash, uid, now } from './security';

const parameterPath = z.string().regex(/^(objective|plan\.\d+\.(objective|instructions|acceptanceCriteria\.\d+)|semanticReview\.criteria\.\d+)$/,
  'Only task text and review criteria can be parameterized; authority, tools, connectors, limits and approvals stay frozen');
const parameterDefinition = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), path: parameterPath,
  description: z.string().trim().min(1).max(300), example: z.string().max(12000),
}).strict();
const parametersSchema = z.record(z.string(), z.string().max(12000));
const secretPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*[^\s,;]{8,}/i,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}/i,
  /\b(?:sk|xox[baprs]|gh[opusr])[-_][A-Za-z0-9_-]{12,}/,
];
type ParameterDefinition = z.infer<typeof parameterDefinition>;

function inputFromRun(run:any){const raw:any={};for(const key of Object.keys(swarmInput.shape))if(run[key]!==undefined)raw[key]=run[key];return swarmInput.parse(raw);}
function inspectSecrets(value:unknown,path:string[]=[]):string[]{
 if(typeof value==='string'&&secretPatterns.some(pattern=>pattern.test(value)))return[path.join('.')];
 if(Array.isArray(value))return value.flatMap((item,index)=>inspectSecrets(item,[...path,String(index)]));
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,item])=>inspectSecrets(item,[...path,key]));return[];
}
function redact(value:any,redactions:Set<string>,path:string[]=[]):any{
 if(redactions.has(path.join('.')))return '[REDACTED: owner replacement required]';
 if(Array.isArray(value))return value.map((item,index)=>redact(item,redactions,[...path,String(index)]));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,redact(item,redactions,[...path,key])]));return value;
}
function atPath(value:any,path:string){return path.split('.').reduce((item,key)=>item?.[Number.isInteger(Number(key))&&String(Number(key))===key?Number(key):key],value);}
function setPath(value:any,path:string,replacement:string){
 const keys=path.split('.');let target=value;
 for(const key of keys.slice(0,-1)){const index=Number(key);target=target[Number.isInteger(index)&&String(index)===key?index:key];if(target===undefined)throw new HttpError(400,`Parameter path no longer exists: ${path}`);}
 const final=keys.at(-1)!;const index=Number(final);const slot=Number.isInteger(index)&&String(index)===final?index:final;
 if(typeof target[slot]!=='string')throw new HttpError(400,`Parameter path is not text: ${path}`);target[slot]=replacement;
}
function changedPaths(before:any,after:any,path:string[]=[]):string[]{
 if(JSON.stringify(before)===JSON.stringify(after))return[];
 if(!before||!after||typeof before!=='object'||typeof after!=='object'||Array.isArray(before)!==Array.isArray(after))return[path.join('.')||'$'];
 return[...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>changedPaths(before[key],after[key],[...path,key]));
}

export class Routines {
 private timer?: ReturnType<typeof setInterval>;
 constructor(readonly engine:SwarmEngine){}
 skills(projectId:string){this.engine.workspace.project(projectId);return this.engine.store.all<any>('swarm-skills').filter(s=>s.projectId===projectId);}
 drafts(projectId:string){this.engine.workspace.project(projectId);return this.engine.store.all<any>('swarm-skill-drafts').filter(s=>s.projectId===projectId);}
 saveSkill(raw:unknown,review?:Record<string,unknown>){
  const a=z.object({name:z.string().trim().min(1).max(100),template:swarmInput,parameters:z.array(parameterDefinition).max(12).default([])}).strict().parse(raw);
  this.engine.workspace.project(a.template.projectId);
  if(new Set(a.parameters.map(p=>p.path)).size!==a.parameters.length||new Set(a.parameters.map(p=>p.name)).size!==a.parameters.length)throw new HttpError(400,'Skill parameter names and paths must be unique');
  for(const parameter of a.parameters)if(typeof atPath(a.template,parameter.path)!=='string')throw new HttpError(400,`Parameter path does not identify text: ${parameter.path}`);
  if(inspectSecrets(a.template).length)throw new HttpError(400,'Skill template contains secret-like content and cannot be saved');
  const previous=this.skills(a.template.projectId).filter(s=>s.name===a.name),prior=previous.at(-1);
  const skill={id:uid(),projectId:a.template.projectId,name:a.name,version:previous.length+1,template:a.template,parameters:a.parameters,createdAt:now(),review,
   previousVersionId:prior?.id,diff:prior?{fromVersion:prior.version,changedPaths:changedPaths(prior.template,a.template),parameterizationChanged:hash(prior.parameters||[])!==hash(a.parameters)}:undefined};
  this.engine.store.put('swarm-skills',skill.id,skill);return skill;
 }
 capture(raw:unknown){
  const a=z.object({runId:z.string().min(1).max(100),name:z.string().trim().min(1).max(100)}).strict().parse(raw);
  const run=this.engine.get(a.runId);if(run.status!=='completed')throw new HttpError(409,'Only a completed run can be captured as a skill draft');
  const original=inputFromRun(run),redactionPaths=inspectSecrets(original),template=swarmInput.parse(redact(original,new Set(redactionPaths)));
  const trace=run.nodes.map(node=>({name:node.name,parentId:node.parentId?'child':undefined,status:node.status,tools:node.receipts.filter(r=>r.toolId).map(r=>({toolId:r.toolId,status:r.status,sequenceStep:r.sequenceStep}))}));
  const draft={id:uid(),projectId:run.projectId,sourceRunId:run.id,name:a.name,status:'draft',template,
   parameters:[{name:'objective',path:'objective',description:'The owner-supplied task input for this reviewed workflow.',example:original.objective}] satisfies ParameterDefinition[],
   redactionPaths,traceDigest:hash(trace),trace,createdAt:now()};
  this.engine.store.put('swarm-skill-drafts',draft.id,draft);return draft;
 }
 reviewDraft(id:string,raw:unknown){
  const draft=this.engine.store.get<any>('swarm-skill-drafts',id);if(!draft)throw new HttpError(404,'Skill draft not found');if(draft.status!=='draft')throw new HttpError(409,'Skill draft was already reviewed');
  const a=z.object({decision:z.enum(['approved','rejected']),template:swarmInput.optional(),parameters:z.array(parameterDefinition).max(12).optional(),reason:z.string().trim().min(1).max(1000)}).strict().parse(raw);
  if(a.decision==='rejected'){draft.status='rejected';draft.reviewedAt=now();draft.reviewReason=a.reason;this.engine.store.put('swarm-skill-drafts',id,draft);return draft;}
  const template=a.template||draft.template;
  if(inspectSecrets(template).length||JSON.stringify(template).includes('[REDACTED:'))throw new HttpError(400,'Replace all redacted or secret-like content before approval');
  if(template.projectId!==draft.projectId)throw new HttpError(400,'Review cannot move a skill to another project');
  const skill=this.saveSkill({name:draft.name,template,parameters:a.parameters||draft.parameters},{draftId:id,sourceRunId:draft.sourceRunId,reason:a.reason,reviewedAt:now()});
  draft.status='approved';draft.reviewedAt=now();draft.reviewReason=a.reason;draft.skillId=skill.id;this.engine.store.put('swarm-skill-drafts',id,draft);return{draft,skill};
 }
 materialize(skill:any,raw:unknown){
  const supplied=parametersSchema.parse(raw||{}),definitions:ParameterDefinition[]=skill.parameters||[],expected=new Set(definitions.map(p=>p.name));
  const missing=[...expected].filter(name=>supplied[name]===undefined),unexpected=Object.keys(supplied).filter(name=>!expected.has(name));
  if(missing.length||unexpected.length)throw new HttpError(400,`Skill parameters mismatch${missing.length?`; missing: ${missing.join(', ')}`:''}${unexpected.length?`; unexpected: ${unexpected.join(', ')}`:''}`);
  const template=structuredClone(skill.template);for(const definition of definitions)setPath(template,definition.path,supplied[definition.name]);return swarmInput.parse(template);
 }
 replay(id:string,raw:unknown,key:string){const skill=this.engine.store.get<any>('swarm-skills',id);if(!skill)throw new HttpError(404,'Skill not found');return this.engine.create(this.materialize(skill,raw),key);}
 rollback(id:string,raw:unknown){
  const current=this.engine.store.get<any>('swarm-skills',id);if(!current)throw new HttpError(404,'Skill not found');
  const a=z.object({toVersion:z.number().int().positive(),reason:z.string().trim().min(1).max(1000)}).strict().parse(raw);
  const target=this.skills(current.projectId).find(skill=>skill.name===current.name&&skill.version===a.toVersion);if(!target)throw new HttpError(404,'Target skill version not found');
  return this.saveSkill({name:current.name,template:target.template,parameters:target.parameters||[]},{rolledBackFrom:current.version,rollbackTarget:target.version,reason:a.reason,reviewedAt:now()});
 }
 list(projectId:string){this.engine.workspace.project(projectId);return this.engine.store.all<any>('swarm-routines').filter(r=>r.projectId===projectId);}
 create(raw:unknown){
  const a=z.object({skillId:z.string().max(100),parameters:parametersSchema.default({}),intervalMinutes:z.number().int().min(1).max(525600),maxRuns:z.number().int().min(1).max(100),startsAt:z.string().datetime()}).strict().parse(raw);
  const skill=this.engine.store.get<any>('swarm-skills',a.skillId);if(!skill)throw new HttpError(404,'Skill not found');this.engine.workspace.project(skill.projectId);this.materialize(skill,a.parameters);
  if(Date.parse(a.startsAt)<Date.now()-60000)throw new HttpError(400,'Start must be current or future');if(this.list(skill.projectId).filter(r=>r.status==='active').length>=10)throw new HttpError(429,'Active routine limit reached');
  const r={...a,id:uid(),projectId:skill.projectId,status:'active',nextAt:Date.parse(a.startsAt),runs:0,history:[],createdAt:now()};this.engine.store.put('swarm-routines',r.id,r);return r;
 }
 pause(id:string){const r=this.engine.store.get<any>('swarm-routines',id);if(!r)throw new HttpError(404,'Routine not found');r.status='paused';this.engine.store.put('swarm-routines',id,r);return r;}
 tick(){for(const r of this.engine.store.all<any>('swarm-routines').filter(r=>r.status==='active'&&r.nextAt<=Date.now())){
  if(r.lastRunId&&isSwarmLive(this.engine.get(r.lastRunId).status))continue;if(r.runs>=r.maxRuns){r.status='completed';this.engine.store.put('swarm-routines',r.id,r);continue;}
  try{const skill=this.engine.store.get<any>('swarm-skills',r.skillId);if(!skill)throw new Error('Pinned skill version missing');this.engine.store.transaction(()=>{
   const job=this.engine.create(this.materialize(skill,r.parameters||{}),`routine-${r.id}-${r.runs}`);r.history.push({runId:job.id,scheduledAt:r.nextAt,startedAt:now()});r.lastRunId=job.id;r.runs++;r.nextAt=Date.now()+r.intervalMinutes*60000;
   if(r.runs>=r.maxRuns)r.status='completed';this.engine.store.put('swarm-routines',r.id,r);
  });}catch(e){r.status='paused';r.error=e instanceof Error?e.message:'Routine failed';this.engine.store.put('swarm-routines',r.id,r);}
 }}
 start(){this.tick();this.timer=setInterval(()=>{try{this.tick();}catch(e){console.error('Routine scheduler failed',e instanceof Error?e.message:'unknown');}},1000);this.timer.unref();}
 stop(){if(this.timer)clearInterval(this.timer);}
}
