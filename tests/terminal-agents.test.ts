import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import {Store} from '../src/server/store';
import {RepositoryWorkspaceManager} from '../src/server/repositories';
import {TerminalAgentManager,runCodexCli} from '../src/server/terminalAgents';

function git(cwd:string,args:string[]){return execFileSync('git',args,{cwd,encoding:'utf8'}).trim();}
function fixture(script:string){const root=fs.mkdtempSync(path.join(os.tmpdir(),'vac-terminal-'));const repo=path.join(root,'repo'),data=path.join(root,'data'),worktrees=path.join(root,'worktrees'),binary=path.join(root,'codex');fs.mkdirSync(repo);git(repo,['init','-q','-b','main']);git(repo,['config','user.email','vac@example.invalid']);git(repo,['config','user.name','VAC Test']);fs.writeFileSync(path.join(repo,'README.md'),'base\n');git(repo,['add','.']);git(repo,['commit','-q','-m','base']);fs.writeFileSync(binary,script,{mode:0o700});const store=new Store(data),repositories=new RepositoryWorkspaceManager(store,worktrees),manager=new TerminalAgentManager(store,repositories,runCodexCli,binary),registered=repositories.register({name:'Fixture',rootPath:repo}),worktree=repositories.createWorktree(registered.id,{runId:'run1',nodeId:'worker1'});return{root,repo,binary,store,repositories,manager,worktree,cleanup(){store.close();fs.rmSync(root,{recursive:true,force:true});}};}
const fake=`#!/bin/sh
if [ "$1" = "--version" ]; then echo 'codex-cli 1.0.0-test'; exit 0; fi
if [ -n "$PLANE_API_KEY" ] || [ -n "$OPENAI_API_KEY" ]; then echo secret-leak >&2; exit 9; fi
cat >/dev/null
printf 'changed by bounded agent\n' > result.txt
printf '{"type":"item.completed","item":{"type":"agent_message","text":"done"}}\n'
`;

test('runs only a named Codex adapter in a clean managed worktree with secret-minimal environment',async()=>{const f=fixture(fake);const oldPlane=process.env.PLANE_API_KEY,oldOpenAI=process.env.OPENAI_API_KEY;process.env.PLANE_API_KEY='must-not-leak';process.env.OPENAI_API_KEY='must-not-leak';try{const adapter=f.manager.adapter();assert.equal(adapter.available,true);const run=await f.manager.execute(f.worktree.id,{objective:'Create the bounded result.'});assert.equal(run.status,'completed',run.error);assert.deepEqual(run.changedPaths,['result.txt']);assert.match(run.patchSha256!,/^[0-9a-f]{64}$/);assert.match(run.binarySha256,/^[0-9a-f]{64}$/);assert.equal(run.events,1);assert.equal(f.repositories.inspect(f.worktree.id).dirty,true);}finally{if(oldPlane===undefined)delete process.env.PLANE_API_KEY;else process.env.PLANE_API_KEY=oldPlane;if(oldOpenAI===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldOpenAI;f.cleanup();}});

test('rejects symlinked or non-Codex executables and dirty worktree baselines',async()=>{const f=fixture(fake);try{fs.writeFileSync(path.join(f.worktree.path,'dirty.txt'),'dirty\n');await assert.rejects(()=>f.manager.execute(f.worktree.id,{objective:'Do work'}),/clean worktree/);const link=path.join(f.root,'codex-link');fs.symlinkSync(f.binary,link);const linked=new TerminalAgentManager(f.store,f.repositories,runCodexCli,link);assert.equal(linked.adapter().available,false);}finally{f.cleanup();}
 const g=fixture('#!/bin/sh\necho not-codex\n');try{assert.equal(g.manager.adapter().available,false);}finally{g.cleanup();}});

test('kills hung process groups at the deadline and retains a failed durable run',async()=>{const f=fixture(`#!/bin/sh\nif [ "$1" = "--version" ]; then echo 'codex-cli 1.0.0-test'; exit 0; fi\nsleep 30\n`);try{const started=Date.now();const run=await f.manager.execute(f.worktree.id,{objective:'Hang',timeoutMs:1000});assert.equal(run.status,'failed');assert.match(run.error!,/timed out/);assert.ok(Date.now()-started<5000);assert.equal(f.manager.run(run.id).status,'failed');}finally{f.cleanup();}});

test('does not expose arbitrary adapter arguments or dangerous bypass flags',()=>{const source=fs.readFileSync(new URL('../src/server/terminalAgents.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/dangerously-bypass-approvals-and-sandbox/);assert.match(source,/--sandbox','workspace-write/);assert.match(source,/--ignore-user-config/);assert.match(source,/approval_policy="never"/);});
