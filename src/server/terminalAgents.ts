import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { z } from 'zod';
import type { Store } from './store';
import type { RepositoryWorkspaceManager } from './repositories';
import { now, uid } from './security';

const objective = z.string().trim().min(1).max(12000);
const model = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/);
export const terminalRunSchema = z.object({objective,model:model.optional(),timeoutMs:z.number().int().min(1000).max(30*60_000).default(10*60_000)}).strict();

export type TerminalAgentRun = {
 id:string;workspaceId:string;adapter:'codex';worktreeId:string;objectiveHash:string;model?:string;
 binaryPath:string;binarySha256:string;binaryVersion:string;status:'working'|'completed'|'failed'|'cancelled';
 startedAt:string;completedAt?:string;exitCode?:number;error?:string;events:number;stdoutSha256?:string;
 changedPaths?:string[];patchSha256?:string;headCommit?:string;
};

export type TerminalProcessResult={exitCode:number;stdout:string;stderr:string;events:number};
type Runner=(input:{binaryPath:string;worktreePath:string;objective:string;model?:string;timeoutMs:number;signal?:AbortSignal})=>Promise<TerminalProcessResult>;

function restrictedEnvironment(){
 const result:Record<string,string>={
  PATH:process.env.PATH||'/usr/bin:/bin',HOME:process.env.HOME||os.homedir(),TMPDIR:process.env.TMPDIR||os.tmpdir(),
  LANG:process.env.LANG||'en_US.UTF-8',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_TERMINAL_PROMPT:'0',
 };
 if(process.env.CODEX_HOME)result.CODEX_HOME=process.env.CODEX_HOME;
 return result;
}

function terminateProcess(child:ReturnType<typeof spawn>){
 if(!child.pid)return;
 try{process.kill(-child.pid,'SIGKILL');}catch{try{child.kill('SIGKILL');}catch{}}
}

export async function runCodexCli(input:{binaryPath:string;worktreePath:string;objective:string;model?:string;timeoutMs:number;signal?:AbortSignal}):Promise<TerminalProcessResult>{
 const args=['exec','--sandbox','workspace-write','--ephemeral','--ignore-user-config','--ignore-rules','--strict-config','-c','approval_policy="never"','-c','sandbox_workspace_write.network_access=false','-C',input.worktreePath,'--json','--color','never'];
 if(input.model)args.push('--model',input.model);
 args.push('-');
 return new Promise((resolve,reject)=>{
  const child=spawn(input.binaryPath,args,{cwd:input.worktreePath,env:restrictedEnvironment(),stdio:['pipe','pipe','pipe'],detached:true});
  let stdout='',stderr='',settled=false,events=0;
  const finish=(error?:Error,code?:number)=>{if(settled)return;settled=true;clearTimeout(timer);input.signal?.removeEventListener('abort',abort);if(error)reject(error);else resolve({exitCode:code??-1,stdout,stderr,events});};
  const abort=()=>{terminateProcess(child);finish(new Error(input.signal?.aborted?'Terminal agent cancelled':'Terminal agent timed out'));};
  const timer=setTimeout(abort,input.timeoutMs);input.signal?.addEventListener('abort',abort,{once:true});
  child.on('error',error=>finish(error));
  child.stdout.on('data',chunk=>{stdout+=chunk.toString();if(Buffer.byteLength(stdout)>4_000_000){terminateProcess(child);finish(new Error('Terminal agent output exceeded limit'));return;}events+=(chunk.toString().match(/\n/g)||[]).length;});
  child.stderr.on('data',chunk=>{stderr+=chunk.toString();if(Buffer.byteLength(stderr)>1_000_000){terminateProcess(child);finish(new Error('Terminal agent error output exceeded limit'));}});
  child.on('close',code=>finish(undefined,code??-1));
  child.stdin.end(`${input.objective}\n`);
 });
}

export class TerminalAgentManager{
 private active=0;
 constructor(readonly store:Store,readonly repositories:RepositoryWorkspaceManager,private runner:Runner=runCodexCli,private configuredBinary=process.env.VAC_CODEX_CLI_PATH){ }

 adapter(){
  if(!this.configuredBinary)return{adapter:'codex',available:false,reason:'VAC_CODEX_CLI_PATH is not configured'};
  if(!fs.existsSync(this.configuredBinary))return{adapter:'codex',available:false,reason:'Configured Codex binary does not exist'};
  const stat=fs.lstatSync(this.configuredBinary);if(stat.isSymbolicLink()||!stat.isFile()||(stat.mode&0o111)===0)return{adapter:'codex',available:false,reason:'Configured Codex binary must be a real executable file'};
  const binaryPath=fs.realpathSync.native(this.configuredBinary);const bytes=fs.readFileSync(binaryPath);const binarySha256=crypto.createHash('sha256').update(bytes).digest('hex');
  const check=spawnSync(binaryPath,['--version'],{env:restrictedEnvironment(),encoding:'utf8',timeout:10_000,maxBuffer:100_000});
  const binaryVersion=String(check.stdout||'').trim();if(check.status!==0||!/^codex-cli\s+\S+/.test(binaryVersion))return{adapter:'codex',available:false,reason:'Configured executable did not identify as Codex CLI'};
  return{adapter:'codex' as const,available:true,binaryPath,binarySha256,binaryVersion};
 }

 runs(){return this.store.all<TerminalAgentRun>('terminal-agent-runs').filter(value=>value.workspaceId==='ws-default');}
 run(id:string){const value=this.store.get<TerminalAgentRun>('terminal-agent-runs',id);if(!value||value.workspaceId!=='ws-default')throw new Error('Terminal-agent run not found');return value;}

 async execute(worktreeId:string,raw:unknown,signal?:AbortSignal){
  if(this.active>=1)throw new Error('Terminal-agent concurrency limit reached');
  const input=terminalRunSchema.parse(raw);const adapter=this.adapter();if(!adapter.available||!('binaryPath'in adapter))throw new Error(adapter.reason);
  const worktree=this.repositories.inspect(worktreeId);if(worktree.status!=='active')throw new Error('Terminal agents require an active worktree');if(worktree.dirty)throw new Error('Terminal agents require a clean worktree baseline');
  const value:TerminalAgentRun={id:uid(),workspaceId:'ws-default',adapter:'codex',worktreeId,objectiveHash:crypto.createHash('sha256').update(input.objective).digest('hex'),model:input.model,binaryPath:adapter.binaryPath,binarySha256:adapter.binarySha256,binaryVersion:adapter.binaryVersion,status:'working',startedAt:now(),events:0};
  this.store.put('terminal-agent-runs',value.id,value);this.active++;
  try{
   const result=await this.runner({binaryPath:adapter.binaryPath,worktreePath:worktree.path,objective:`VAC OWNER OBJECTIVE:\n${input.objective}\n\nBOUNDARY: Work only inside the current repository worktree. Do not commit, merge, push, change remotes, access credentials, use network services, or modify files outside this worktree. If the task needs any of those actions, stop and report blocked.`,model:input.model,timeoutMs:input.timeoutMs,signal});
   const inspected=this.repositories.inspect(worktreeId);const completed:TerminalAgentRun={...value,status:result.exitCode===0?'completed':'failed',completedAt:now(),exitCode:result.exitCode,error:result.exitCode===0?undefined:(result.stderr||'Codex CLI failed').slice(0,2000),events:result.events,stdoutSha256:crypto.createHash('sha256').update(result.stdout).digest('hex'),changedPaths:inspected.changedPaths,patchSha256:inspected.patchSha256,headCommit:inspected.headCommit};
   this.store.put('terminal-agent-runs',value.id,completed);return completed;
  }catch(error){const failed:TerminalAgentRun={...value,status:signal?.aborted?'cancelled':'failed',completedAt:now(),error:(error instanceof Error?error.message:'Terminal agent failed').slice(0,2000)};this.store.put('terminal-agent-runs',value.id,failed);return failed;}finally{this.active--;}
 }
}
