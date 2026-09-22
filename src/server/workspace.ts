import { reconcileSources, verifyReconciliation, verifyPartitions } from './reconciliation';
import { discoverMcp } from './mcp';
import { invokeConnector } from './connectorTransport';
import { canonicalWorkflowArguments } from './workflowSequence';
import { tabularReportCode } from './reportRecipe';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Store } from './store';
import { hash, now, uid, HttpError } from './security';
import type { SwarmJob } from '../swarmTypes';
import { publicRequest } from './browser';

export const fileName = z.string().min(1).max(160).regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/).refine(s=>s.split('/').every(v=>v&&v!=='.'&&v!=='..'&&!v.startsWith('.')),'Invalid project-relative filename');
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
export interface ProjectFile {id:string;projectId:string;name:string;version:number;sha256:string;bytes:number;mime:string;base64:string;createdAt:string;source:string;runId?:string}
export interface MemoryRecord {id:string;projectId:string;content:string;sourceRunId:string;sourceNodeId:string;status:'proposed'|'approved'|'rejected';createdAt:string}
export const contractSchema=z.object({name:fileName,kind:z.enum(['exists','text_contains','json_equals','reconciliation']),path:z.array(z.string().min(1).max(100)).max(8).default([]),expected:z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.null()]).optional(),sources:z.array(z.object({name:fileName,version:z.number().int().positive(),sha256:z.string().regex(/^[a-f0-9]{64}$/)}).strict()).min(1).max(20).optional(),partitions:z.array(fileName).min(1).max(16).optional(),minBytes:z.number().int().min(1).max(6000000).default(1)}).strict().refine(c=>c.kind==='reconciliation'?!!c.sources&&!c.path.length&&c.expected===undefined:!c.sources&&!c.partitions,'Accounting sources are required only for reconciliation contracts');
export type Contract=z.infer<typeof contractSchema>;
const readSchema=z.object({name:fileName.optional(),version:z.number().int().positive().optional(),reconcileContract:fileName.optional()}).strict().refine(a=>!a.reconcileContract||(!a.name&&a.version===undefined),'Choose a file read or reconciliation');
const writeSchema=z.object({name:fileName,content:z.string().max(64000),expectedVersion:z.number().int().min(0)}).strict();
const rawCodeSchema=z.object({language:z.enum(['python','shell']).default('python'),code:z.string().min(1).max(24000),inputNames:z.array(fileName).max(20).default([])}).strict();
const recipeSchema=z.object({recipe:z.literal('tabular_report'),inputName:fileName,valueColumns:z.array(z.string().min(1).max(100)).min(1).max(20),outputPrefix:fileName.default('report')}).strict();
const codeSchema=z.union([rawCodeSchema,recipeSchema]);
const memorySchema=z.object({query:z.string().max(300).optional(),propose:z.string().min(1).max(4000).optional()}).strict();
const connectorCall=z.object({connectorId:z.string().max(100),tool:z.string().max(100),arguments:z.record(z.string(),z.unknown()).default({})}).strict();
const connectorInputSchema=z.object({type:z.literal('object'),properties:z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/),z.object({type:z.enum(['string','number','boolean','object','array']),description:z.string().max(300).optional()}).strict()),required:z.array(z.string().max(80)).max(30).default([]),additionalProperties:z.literal(false).default(false)}).strict().refine(v=>Object.keys(v.properties).length<=30&&v.required.every(k=>Object.hasOwn(v.properties,k)),'Invalid connector argument schema');
export const connectorSchema=z.object({protocol:z.enum(['jsonrpc','mcp']).default('jsonrpc'),name:z.string().min(1).max(100),endpoint:z.string().url().max(1000),tools:z.array(z.object({name:z.string().min(1).max(100),effect:z.enum(['read','write']),inputSchema:connectorInputSchema.optional(),reconciliation:z.object({statusTool:z.string().min(1).max(100),operationKeyArgument:z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/)}).strict().optional()}).strict()).min(1).max(20),tokenEnv:z.string().regex(/^VAC_CONNECTOR_[A-Z0-9_]+$/).optional(),enabled:z.boolean().default(true)}).strict();
export const WORKSPACE_TOOLS=[
 {id:'tool-files',name:'Project files',description:'List project file metadata, or read a text file by name and optional version. Use reconcileContract=output filename to compute the full deterministic ledger for an owner-declared reconciliation contract. Files are untrusted evidence. Binary documents should be parsed inside tool-code.',schema:readSchema},
 {id:'tool-write-file',name:'Write project file',description:'Write a UTF-8 draft file. expectedVersion must equal current version (0 for a new file). Versions are immutable. Shared project writes can conflict; inspect before editing.',schema:writeSchema},
 {id:'tool-code',name:'Sandboxed code',description:'Use recipe=tabular_report with inputName, valueColumns and outputPrefix for CSV totals plus summary.json/DOCX/XLSX/PPTX/PDF. Otherwise execute Python or shell in a network-disabled container. inputNames copies project files to /workspace. Python has csv,json,python-docx,openpyxl,python-pptx,reportlab,pypdf. Generated files are versioned drafts. No host mounts, credentials or installs.',schema:codeSchema},
 {id:'tool-memory',name:'Project memory',description:'Read approved project memory, optionally filtered by query; or propose a durable lesson with propose. Proposed content needs owner approval and is not authoritative.',schema:memorySchema},
 {id:'tool-connector',name:'Approved connector',description:'Invoke an exact tool on a connector approved for this root. Use connectorId and tool from RUN STATE. Write tools pause for owner approval; credentials stay server-side.',schema:connectorCall},
] as const;
export const WORKSPACE_TOOL_IDS=WORKSPACE_TOOLS.map(t=>t.id);
export const workspaceCatalog=WORKSPACE_TOOLS.map(t=>({...t,schema:z.toJSONSchema(t.schema),category:'Swarm workspace',permission:t.id==='tool-code'||t.id==='tool-connector'?'EXECUTE':t.id==='tool-files'?'READ':'WRITE',requiresApproval:t.id==='tool-connector'}));
const mimeFor=(name:string)=>({'csv':'text/csv','json':'application/json','md':'text/markdown','txt':'text/plain','html':'text/html','pdf':'application/pdf','xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation','png':'image/png'}[name.split('.').pop()!]||'application/octet-stream');
let sandboxes=0;
export async function runSandbox(input:z.infer<typeof rawCodeSchema>&{files:{name:string;base64:string}[]},signal:AbortSignal){
 if(sandboxes>=2)throw new Error('Workspace sandbox concurrency limit reached');
 signal.throwIfAborted();sandboxes++;
 const name='vac-task-'+uid().replaceAll('-','');
 try{return await new Promise<any>((resolve,reject)=>{
  const child=spawn('docker',['run','--rm','-i','--name',name,'--label','vac.sandbox=true','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit','32','--memory','512m','--memory-swap','512m','--cpus','1','--user','65534:65534','--tmpfs','/workspace:rw,noexec,nosuid,size=32m,mode=1777','--tmpfs','/tmp:rw,noexec,nosuid,size=16m,mode=1777',process.env.VAC_SANDBOX_IMAGE||'vac-sandbox:2026-09-21'],{stdio:['pipe','pipe','pipe']});
  let output=Buffer.alloc(0),error='',settled=false;
  const finish=(err?:Error,value?:any)=>{if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',abort);err?reject(err):resolve(value);};
  const abort=()=>{const cleanup=spawn('docker',['rm','-f',name],{stdio:'ignore'});cleanup.on('error',()=>{});child.kill('SIGKILL');finish(new Error('Sandbox cancelled or timed out; no output accepted'));};
  const timer=setTimeout(abort,60000);signal.addEventListener('abort',abort,{once:true});
  child.on('error',e=>finish(new Error('Sandbox unavailable: '+e.message)));child.stdout.on('data',b=>{output=Buffer.concat([output,b]);if(output.length>9*1024*1024)abort();});child.stderr.on('data',b=>{error=(error+b.toString()).slice(-2000);});
  child.on('close',code=>{if(settled)return;if(code!==0)return finish(new Error('Sandbox failed: '+error));try{finish(undefined,JSON.parse(output.toString()));}catch{finish(new Error('Invalid sandbox output; no artifacts accepted'));}});
  child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(input));
 });}finally{sandboxes--;}
}
export class Workspace {
 constructor(readonly store:Store,private sandbox=runSandbox){}
 project(id:string){const p=this.store.get<any>('projects',id);if(!p||p.workspaceId!=='ws-default'||p.status==='archived')throw new HttpError(404,'Active project not found');return p;}
 files(projectId:string){this.project(projectId);const versions=this.store.all<ProjectFile>('project-files').filter(f=>f.projectId===projectId);return [...new Map(versions.sort((a,b)=>a.version-b.version).map(f=>[f.name,f])).values()].map(({base64,...f})=>f);}
 file(projectId:string,name:string,version?:number){this.project(projectId);fileName.parse(name);const f=this.store.all<ProjectFile>('project-files').filter(f=>f.projectId===projectId&&f.name===name&&(version===undefined||f.version===version)).sort((a,b)=>b.version-a.version)[0];if(!f)throw new HttpError(404,'Project file not found');return f;}
 write(projectId:string,name:string,data:Buffer,expectedVersion:number,source:string,runId?:string){
  this.project(projectId);fileName.parse(name);if(data.length>6*1024*1024)throw new HttpError(413,'File exceeds 6 MiB');
  return this.store.transaction(()=>{
   const all=this.store.all<ProjectFile>('project-files').filter(f=>f.projectId===projectId);const current=all.filter(f=>f.name===name).sort((a,b)=>b.version-a.version)[0];
   if((current?.version||0)!==expectedVersion)throw new HttpError(409,'File version changed; read it before overwriting');
   if(all.length>=1000||all.reduce((s,f)=>s+f.bytes,0)+data.length>50*1024*1024)throw new HttpError(413,'Project file history quota exhausted');
   const f:ProjectFile={id:uid(),projectId,name,version:expectedVersion+1,sha256:sha(data),bytes:data.length,mime:mimeFor(name),base64:data.toString('base64'),createdAt:now(),source,runId};this.store.put('project-files',f.id,f);const{base64,...metadata}=f;return metadata;
  });
 }
 accounting(projectId:string,c:Contract){
  if(c.kind!=='reconciliation'||!c.sources)throw new Error('Reconciliation contract required');
  if(new Set(c.sources.map(s=>s.name)).size!==c.sources.length)throw new Error('Duplicate accounting source');
  if(new Set(c.partitions||[]).size!==(c.partitions||[]).length)throw new Error('Duplicate partition file');
  if(c.sources.some(s=>s.name===c.name||c.partitions?.includes(s.name))||c.partitions?.includes(c.name))throw new Error('Accounting inputs and outputs must be distinct');
  return reconcileSources(c.sources.map(ref=>{
   const f=this.file(projectId,ref.name,ref.version);
   if(f.source!=='owner'||f.runId||f.sha256!==ref.sha256||f.mime!=='application/json')throw new Error('Accounting requires pinned owner JSON sources');
   return {name:f.name,version:f.version,sha256:f.sha256,text:Buffer.from(f.base64,'base64').toString('utf8')};
  }));
 }
 contracts(j:Pick<SwarmJob,'id'|'projectId'>&{contracts?:Contract[]}){
  return (j.contracts||[]).map(c=>{try{const f=this.file(j.projectId,c.name);const body=Buffer.from(f.base64,'base64');let passed=f.runId===j.id&&body.length>=c.minBytes;
   if(c.kind==='reconciliation'){const expected=this.accounting(j.projectId,c);verifyReconciliation(JSON.parse(body.toString('utf8')),expected);if(c.partitions)verifyPartitions(c.partitions.map(name=>{const part=this.file(j.projectId,name);if(part.runId!==j.id)throw new Error('Partition must belong to current run');return JSON.parse(Buffer.from(part.base64,'base64').toString('utf8'));}),expected);}
   if(c.kind==='text_contains')passed=passed&&body.toString('utf8').includes(String(c.expected??''));
   if(c.kind==='json_equals'){let value=JSON.parse(body.toString('utf8'));for(const key of c.path){if(['__proto__','prototype','constructor'].includes(key))throw new Error('Invalid JSON path');value=value?.[key];}passed=passed&&JSON.stringify(value)===JSON.stringify(c.expected);}
   return{...c,passed,fileId:f.id,sha256:f.sha256,reason:passed?'Verified current-run artifact':'Artifact missing expected content, size or current-run provenance'};
  }catch{return{...c,passed:false,reason:'Required artifact unavailable or invalid'};}});
 }
 memories(projectId:string){this.project(projectId);return this.store.all<MemoryRecord>('swarm-memory').filter(m=>m.projectId===projectId);}
 decideMemory(id:string,status:'approved'|'rejected'){const m=this.store.get<MemoryRecord>('swarm-memory',id);if(!m)throw new HttpError(404,'Memory not found');this.project(m.projectId);m.status=status;this.store.put('swarm-memory',id,m);return m;}
 connectors(){return this.store.all<any>('swarm-connectors').map(({tokenEnv,...r})=>({...r,credentialConfigured:!!tokenEnv&&!!process.env[tokenEnv]}));}
 saveConnector(raw:unknown){const c=connectorSchema.parse(raw);const u=new URL(c.endpoint);if(u.username||u.password||u.search||u.hash||!['http:','https:'].includes(u.protocol))throw new Error('Invalid connector endpoint');
  const local=(process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS||'').split(',').includes(c.endpoint);if(!local&&u.protocol!=='https:')throw new Error('Public connectors require HTTPS; local endpoints require server configuration');
  if(new Set(c.tools.map(t=>t.name)).size!==c.tools.length)throw new HttpError(400,'Connector tool names must be unique');
  for(const tool of c.tools)if(tool.reconciliation){const r=tool.reconciliation,status=c.tools.find(t=>t.name===r.statusTool);if(tool.effect!=='write'||!status||status.effect!=='read'||status.reconciliation||tool.inputSchema?.properties[r.operationKeyArgument])throw new HttpError(400,'Reconciliation needs a separate read tool and a reserved server operation-key argument');}
  const id=uid();this.store.put('swarm-connectors',id,{...c,id});return this.connectors().find(x=>x.id===id);
 }
 async discoverConnector(id:string,signal:AbortSignal){const c=this.store.get<any>('swarm-connectors',id);if(!c?.enabled||c.protocol!=='mcp')throw new HttpError(400,'Enabled MCP connector required');const result=await discoverMcp(c,signal);const secret=c.tokenEnv?process.env[c.tokenEnv]:undefined;return JSON.parse(secret?JSON.stringify(result).replaceAll(secret,'[REDACTED]'):JSON.stringify(result));}
 connector(j:SwarmJob,raw:unknown){const args=connectorCall.parse(raw);const c=this.store.get<any>('swarm-connectors',args.connectorId);if(!j.connectorIds?.includes(args.connectorId)||!c?.enabled)throw new Error('Connector not approved for this run');const t=c.tools.find((t:any)=>t.name===args.tool);if(!t)throw new Error('Connector tool is not approved');if(t.inputSchema){const types:any={string:z.string().max(16000),number:z.number().finite(),boolean:z.boolean(),object:z.record(z.string(),z.unknown()),array:z.array(z.unknown()).max(100)};const shape=Object.fromEntries(Object.entries(t.inputSchema.properties).map(([key,p]:[string,any])=>[key,t.inputSchema.required.includes(key)?types[p.type]:types[p.type].optional()]));z.object(shape).strict().parse(args.arguments);}return{args,config:c,write:t.effect==='write'};}
 connectorDefinition(j:SwarmJob){const variants=this.store.all<any>('swarm-connectors').filter(c=>c.enabled&&j.connectorIds?.includes(c.id)).flatMap(c=>c.tools.map((t:any)=>({type:'object',properties:{connectorId:{const:c.id},tool:{const:t.name},arguments:t.inputSchema||{type:'object',additionalProperties:true}},required:['connectorId','tool','arguments'],additionalProperties:false})));return variants.length?{schema:variants.length===1?variants[0]:{anyOf:variants}}:{};}
 async reconcileOperation(id:string,signal:AbortSignal){
  const op=this.store.get<any>('connector-operations',id);if(!op)throw new HttpError(404,'Operation not found');
  const job=this.store.get<SwarmJob>('swarms',op.rootId);if(!job)throw new HttpError(404,'Operation run not found');this.project(job.projectId);
  if(['queued','working','waiting_children','waiting_approval'].includes(job.status))throw new HttpError(409,'Stop the run before reconciling its operation');
  if(!['outcome_unknown','reconciled_not_applied'].includes(op.status))throw new HttpError(409,'Operation is already resolved');
  const config=this.store.get<any>('swarm-connectors',op.connectorId),policy=op.reconciliation;
  if(!config?.enabled||!policy||op.classification!=='uncertain_side_effect')throw new HttpError(409,'No supported remote reconciliation contract; repeat remains blocked');
  if(op.configHash!==hash({endpoint:config.endpoint,protocol:config.protocol,tools:config.tools,tokenEnv:config.tokenEnv})||!config.tools.some((t:any)=>t.name===policy.statusTool&&t.effect==='read'))throw new HttpError(409,'Connector configuration changed; repeat remains blocked');
  const checkId=uid();this.store.transaction(()=>{this.store.put('connector-reconciliation',checkId,{id:checkId,operationId:id,status:'checking',startedAt:now()});this.store.put('connector-operations',id,{...op,status:'outcome_unknown',reconciliationCheckId:checkId,retryAuthorizedAt:undefined});});
  try{
   const raw=await invokeConnector(config,policy.statusTool,{[policy.operationKeyArgument]:id},checkId,signal);signal.throwIfAborted();
   const result=z.object({operationKey:z.literal(id),status:z.enum(['applied','not_applied','unknown']),final:z.boolean()}).strict().parse(config.protocol==='mcp'?raw.structuredContent:raw);
   // Only the provider can assert that an absent operation will never apply later.
   const resolved=result.final&&result.status!=='unknown';
   this.store.transaction(()=>{
    const current=this.store.get<any>('connector-operations',id);
    if(current.reconciliationCheckId!==checkId||!['outcome_unknown','reconciled_not_applied'].includes(current.status))throw new HttpError(409,'Operation changed during remote check');
    this.store.put('connector-reconciliation',checkId,{id:checkId,operationId:id,status:'verified',checkedAt:now(),responseHash:hash(result),result});
    this.store.put('connector-operations',id,{...current,status:resolved?'reconciled_'+result.status:'outcome_unknown',reconciledAt:now(),reconciliationCheckId:checkId,retryAuthorizedAt:undefined});
   });
   return this.store.get<any>('connector-operations',id);
  }catch(error){this.store.put('connector-reconciliation',checkId,{id:checkId,operationId:id,status:'failed',completedAt:now()});throw new HttpError(409,'Remote reconciliation failed; no repeat authorized');}
 }
 authorizeOperationRepeat(id:string){
  return this.store.transaction(()=>{
   const op=this.store.get<any>('connector-operations',id);if(!op)throw new HttpError(404,'Operation not found');
   const job=this.store.get<SwarmJob>('swarms',op.rootId);if(!job)throw new HttpError(404,'Operation run not found');this.project(job.projectId);
   if(op.status!=='reconciled_not_applied'||Date.now()-Date.parse(op.reconciledAt)>300000)throw new HttpError(409,'Fresh final remote non-application evidence required');
   const updated={...op,retryAuthorizedAt:now(),retryAuthorizedBy:'owner'};this.store.put('connector-operations',id,updated);return updated;
  });
 }
 async execute(j:SwarmJob,nodeId:string,toolId:string,raw:unknown,callId:string,signal:AbortSignal){
  let connectorIntent:string|undefined,dispatchArguments:Record<string,unknown>|undefined;
  if(toolId==='tool-connector'){
   const {args,config,write}=this.connector(j,raw);connectorIntent=hash({rootId:j.id,nodeId,args:canonicalWorkflowArguments(args)});
   const tool=config.tools.find((t:any)=>t.name===args.tool),reconciliation=tool.reconciliation;
   if(reconciliation&&Object.hasOwn(args.arguments,reconciliation.operationKeyArgument))throw new Error('Operation key is server-owned');
   const operationHash=hash({connectorId:args.connectorId,tool:args.tool,arguments:canonicalWorkflowArguments(args.arguments)});
   const configHash=hash({endpoint:config.endpoint,protocol:config.protocol,tools:config.tools,tokenEnv:config.tokenEnv});
   dispatchArguments=reconciliation?{...args.arguments,[reconciliation.operationKeyArgument]:callId}:args.arguments;
   const attempt=this.store.get<any>('connector-operations',callId);
   if(attempt&&attempt.intentHash!==connectorIntent)throw new Error('Conflicting connector operation identity');
   const prior=this.store.get<any>('swarm-tool-results',callId);if(prior)return prior;
   this.store.transaction(()=>{
    if(this.store.get('connector-operations',callId))throw new Error('Connector outcome may be unknown; reconcile before starting a new operation. Replay blocked');
    if(write){
     const operations=this.store.all<any>('connector-operations');
     if(operations.some(o=>o.connectorId===args.connectorId&&o.tool===args.tool&&o.status==='outcome_unknown'&&!o.operationHash))throw new Error('Legacy uncertain write lacks safe identity; repeat remains blocked');
     const previous=operations.filter(o=>o.operationHash===operationHash&&o.classification==='uncertain_side_effect');
     if(previous.some(o=>['outcome_unknown','reconciled_applied'].includes(o.status)))throw new Error('Equivalent uncertain write blocked; verify remote outcome before an owner-approved repeat');
     for(const o of previous.filter(o=>o.status==='reconciled_not_applied')){
      if(o.configHash!==configHash||Date.now()-Date.parse(o.reconciledAt)>300000)throw new Error('Remote reconciliation is stale; check again before repeating');
      if(!o.retryAuthorizedAt)throw new Error('Owner must authorize a repeat after remote reconciliation');
      this.store.put('connector-operations',o.id,{...o,status:'retry_consumed',replacementCallId:callId});
     }
    }
    this.store.put('connector-operations',callId,{id:callId,rootId:j.id,nodeId,connectorId:args.connectorId,tool:args.tool,intentHash:connectorIntent,operationHash,configHash,reconciliation,classification:write?'uncertain_side_effect':'read',status:'outcome_unknown',startedAt:now()});
   });
  }else{const prior=this.store.get<any>('swarm-tool-results',callId);if(prior)return prior;}
  let output:any;
  if(toolId==='tool-files'){
   const args=readSchema.parse(raw);if(args.reconcileContract){const contract=j.contracts?.find(c=>c.name===args.reconcileContract&&c.kind==='reconciliation');if(!contract)throw new Error('Owner reconciliation contract not found');output=this.accounting(j.projectId,contract);if(Buffer.byteLength(JSON.stringify(output))>10000)throw new Error('Ledger exceeds tool context envelope; use pinned files and code, no truncated ledger returned');}else if(!args.name)output={files:this.files(j.projectId)};else{const f=this.file(j.projectId,args.name,args.version);const{base64,...meta}=f;output={...meta,text:f.mime.startsWith('text/')||f.mime==='application/json'?Buffer.from(base64,'base64').toString('utf8').slice(0,16000):undefined,guidance:'Use sandbox document parsers for binary files. Text may be an excerpt.'};}
  }else if(toolId==='tool-write-file'){
   const a=writeSchema.parse(raw);output=this.write(j.projectId,a.name,Buffer.from(a.content),a.expectedVersion,nodeId,j.id);
  }else if(toolId==='tool-code'){
   const parsedCode=codeSchema.parse(raw);const a='recipe'in parsedCode?{language:'python' as const,code:tabularReportCode(parsedCode.inputName,parsedCode.valueColumns,parsedCode.outputPrefix),inputNames:[parsedCode.inputName]}:parsedCode;const selected=a.inputNames.map(name=>this.file(j.projectId,name));const snapshot=new Map(this.files(j.projectId).map(f=>[f.name,f.version]));
   if(selected.reduce((s,f)=>s+f.bytes,0)>3*1024*1024)throw new Error('Sandbox input limit exceeded');
   const result=await this.sandbox({...a,files:selected.map(({name,base64})=>({name,base64}))},signal);signal.throwIfAborted();
   if(result.exitCode!==0)throw new Error('Sandbox code failed: '+String(result.stderr).slice(0,2000));
   const parsed=z.array(z.object({name:fileName,base64:z.string().max(8*1024*1024)}).strict()).max(40).parse(result.files);
   output=this.store.transaction(()=>{const artifacts=[];for(const f of parsed){const data=Buffer.from(f.base64,'base64');if(data.toString('base64')!==f.base64)throw new Error('Invalid binary output');if(selected.some(s=>s.name===f.name&&s.sha256===sha(data)))continue;artifacts.push(this.write(j.projectId,f.name,data,snapshot.get(f.name)||0,nodeId,j.id));}return{exitCode:0,stdout:String(result.stdout).slice(0,12000),stderr:String(result.stderr).slice(0,6000),artifacts};});
  }else if(toolId==='tool-memory'){
   const a=memorySchema.parse(raw);if(a.propose){const m:MemoryRecord={id:uid(),projectId:j.projectId,content:a.propose,sourceRunId:j.id,sourceNodeId:nodeId,status:'proposed',createdAt:now()};this.store.put('swarm-memory',m.id,m);output=m;}else output=this.memories(j.projectId).filter(m=>m.status==='approved'&&(!a.query||m.content.toLowerCase().includes(a.query.toLowerCase()))).slice(-20);
  }else if(toolId==='tool-connector'){
   const {args,config}=this.connector(j,raw);
   const result=await invokeConnector(config,args.tool,dispatchArguments||args.arguments,callId,signal);
   const rendered=JSON.stringify(result),secret=config.tokenEnv?process.env[config.tokenEnv]:undefined;
   output={connectorId:args.connectorId,tool:args.tool,...(config.protocol==='mcp'?{protocol:'mcp'}:{}),result:(secret?rendered.replaceAll(secret,'[REDACTED]'):rendered).slice(0,12000)};
  }else throw new Error('Unknown workspace tool');
  signal.throwIfAborted();const receipt={toolId,callId,status:'succeeded',output,timestamp:now()};this.store.transaction(()=>{this.store.put('swarm-tool-results',callId,receipt);if(connectorIntent){const op=this.store.get<any>('connector-operations',callId);this.store.put('connector-operations',callId,{...op,status:'confirmed',completedAt:now()});}});return receipt;
 }
}
