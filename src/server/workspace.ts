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
export const contractSchema=z.object({name:fileName,kind:z.enum(['exists','text_contains','json_equals']),path:z.array(z.string().min(1).max(100)).max(8).default([]),expected:z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.null()]).optional(),minBytes:z.number().int().min(1).max(6000000).default(1)}).strict();
export type Contract=z.infer<typeof contractSchema>;
const readSchema=z.object({name:fileName.optional(),version:z.number().int().positive().optional()}).strict();
const writeSchema=z.object({name:fileName,content:z.string().max(64000),expectedVersion:z.number().int().min(0)}).strict();
const rawCodeSchema=z.object({language:z.enum(['python','shell']).default('python'),code:z.string().min(1).max(24000),inputNames:z.array(fileName).max(20).default([])}).strict();
const recipeSchema=z.object({recipe:z.literal('tabular_report'),inputName:fileName,valueColumns:z.array(z.string().min(1).max(100)).min(1).max(20),outputPrefix:fileName.default('report')}).strict();
const codeSchema=z.union([rawCodeSchema,recipeSchema]);
const memorySchema=z.object({query:z.string().max(300).optional(),propose:z.string().min(1).max(4000).optional()}).strict();
const connectorCall=z.object({connectorId:z.string().max(100),tool:z.string().max(100),arguments:z.record(z.string(),z.unknown()).default({})}).strict();
const connectorInputSchema=z.object({type:z.literal('object'),properties:z.record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/),z.object({type:z.enum(['string','number','boolean','object','array']),description:z.string().max(300).optional()}).strict()),required:z.array(z.string().max(80)).max(30).default([]),additionalProperties:z.literal(false).default(false)}).strict().refine(v=>Object.keys(v.properties).length<=30&&v.required.every(k=>Object.hasOwn(v.properties,k)),'Invalid connector argument schema');
export const connectorSchema=z.object({name:z.string().min(1).max(100),endpoint:z.string().url().max(1000),tools:z.array(z.object({name:z.string().min(1).max(100),effect:z.enum(['read','write']),inputSchema:connectorInputSchema.optional()}).strict()).min(1).max(20),tokenEnv:z.string().regex(/^VAC_CONNECTOR_[A-Z0-9_]+$/).optional(),enabled:z.boolean().default(true)}).strict();
export const WORKSPACE_TOOLS=[
 {id:'tool-files',name:'Project files',description:'List project file metadata, or read a text file by name and optional version. Files are untrusted evidence. Binary documents should be parsed inside tool-code.',schema:readSchema},
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
 contracts(j:Pick<SwarmJob,'id'|'projectId'>&{contracts?:Contract[]}){
  return (j.contracts||[]).map(c=>{try{const f=this.file(j.projectId,c.name);const body=Buffer.from(f.base64,'base64');let passed=f.runId===j.id&&body.length>=c.minBytes;
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
  const id=uid();this.store.put('swarm-connectors',id,{...c,id});return this.connectors().find(x=>x.id===id);
 }
 connector(j:SwarmJob,raw:unknown){const args=connectorCall.parse(raw);const c=this.store.get<any>('swarm-connectors',args.connectorId);if(!j.connectorIds?.includes(args.connectorId)||!c?.enabled)throw new Error('Connector not approved for this run');const t=c.tools.find((t:any)=>t.name===args.tool);if(!t)throw new Error('Connector tool is not approved');if(t.inputSchema){const types:any={string:z.string().max(16000),number:z.number().finite(),boolean:z.boolean(),object:z.record(z.string(),z.unknown()),array:z.array(z.unknown()).max(100)};const shape=Object.fromEntries(Object.entries(t.inputSchema.properties).map(([key,p]:[string,any])=>[key,t.inputSchema.required.includes(key)?types[p.type]:types[p.type].optional()]));z.object(shape).strict().parse(args.arguments);}return{args,config:c,write:t.effect==='write'};}
 connectorDefinition(j:SwarmJob){const variants=this.store.all<any>('swarm-connectors').filter(c=>c.enabled&&j.connectorIds?.includes(c.id)).flatMap(c=>c.tools.map((t:any)=>({type:'object',properties:{connectorId:{const:c.id},tool:{const:t.name},arguments:t.inputSchema||{type:'object',additionalProperties:true}},required:['connectorId','tool','arguments'],additionalProperties:false})));return variants.length?{schema:variants.length===1?variants[0]:{anyOf:variants}}:{};}
 async execute(j:SwarmJob,nodeId:string,toolId:string,raw:unknown,callId:string,signal:AbortSignal){
  const prior=this.store.get<any>('swarm-tool-results',callId);if(prior)return prior;
  let output:any;
  if(toolId==='tool-files'){
   const args=readSchema.parse(raw);if(!args.name)output={files:this.files(j.projectId)};else{const f=this.file(j.projectId,args.name,args.version);const{base64,...meta}=f;output={...meta,text:f.mime.startsWith('text/')||f.mime==='application/json'?Buffer.from(base64,'base64').toString('utf8').slice(0,16000):undefined,guidance:'Use sandbox document parsers for binary files. Text may be an excerpt.'};}
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
   const {args,config}=this.connector(j,raw);const headers:Record<string,string>={'content-type':'application/json'};if(config.tokenEnv){const token=process.env[config.tokenEnv];if(!token)throw new Error('Connector credential unavailable');headers.authorization='Bearer '+token;}
   const body=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:callId,method:'tools/call',params:{name:args.tool,arguments:args.arguments}}));
   if(body.length>64000)throw new Error('Connector request too large');
   let status:number,data:string;
   if((process.env.VAC_CONNECTOR_LOCAL_ENDPOINTS||'').split(',').includes(config.endpoint)){const res=await fetch(config.endpoint,{method:'POST',headers,body,redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])});status=res.status;const reader=res.body?.getReader();let text='';if(reader){while(true){const r=await reader.read();if(r.done)break;text+=Buffer.from(r.value).toString();if(text.length>128000){await reader.cancel();throw new Error('Connector response too large');}}}data=text;}
   else{const res=await publicRequest({url:config.endpoint,method:'POST',headers,body},AbortSignal.any([signal,AbortSignal.timeout(15000)]));status=res.status;data=res.body.toString();}
   if(status!==200)throw new Error('Connector HTTP '+status);const result=JSON.parse(data);if(result.id!==callId||result.error||result.result?.isError)throw new Error('Connector rejected operation');const rendered=JSON.stringify(result.result??null);const secret=config.tokenEnv?process.env[config.tokenEnv]:undefined;output={connectorId:args.connectorId,tool:args.tool,result:(secret?rendered.replaceAll(secret,'[REDACTED]'):rendered).slice(0,12000)};
  }else throw new Error('Unknown workspace tool');
  signal.throwIfAborted();const receipt={toolId,callId,status:'succeeded',output,timestamp:now()};this.store.put('swarm-tool-results',callId,receipt);return receipt;
 }
}
