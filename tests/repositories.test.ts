import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { Store } from '../src/server/store';
import { RepositoryWorkspaceManager } from '../src/server/repositories';

function run(cwd:string,args:string[]){return execFileSync('git',args,{cwd,encoding:'utf8',env:{PATH:process.env.PATH||'/usr/bin:/bin',HOME:os.tmpdir(),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();}
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vac-repositories-'));const repo=path.join(root,'repo');const data=path.join(root,'data');const worktrees=path.join(root,'worktrees');fs.mkdirSync(repo);
 run(repo,['init','-q','-b','main']);run(repo,['config','user.email','vac@example.invalid']);run(repo,['config','user.name','VAC Test']);fs.writeFileSync(path.join(repo,'README.md'),'base\n');run(repo,['add','README.md']);run(repo,['commit','-q','-m','base']);
 const store=new Store(data);const manager=new RepositoryWorkspaceManager(store,worktrees);return{root,repo,worktrees,store,manager,cleanup(){store.close();fs.rmSync(root,{recursive:true,force:true});}};
}

test('registers only exact real Git roots and records dirty base state without modifying it',()=>{const f=fixture();try{
 fs.writeFileSync(path.join(f.repo,'owner.txt'),'do not copy\n');const before=run(f.repo,['status','--porcelain=v1']);
 const repository=f.manager.register({name:'Fixture',rootPath:f.repo});assert.equal(repository.rootRealPath,fs.realpathSync.native(f.repo));assert.equal(repository.dirtyAtRegistration,true);assert.equal(run(f.repo,['status','--porcelain=v1']),before);
 const child=path.join(f.repo,'child');fs.mkdirSync(child);assert.throws(()=>f.manager.register({name:'Child',rootPath:child}),/exact Git top-level/);
 const link=path.join(f.root,'link');fs.symlinkSync(f.repo,link);assert.throws(()=>f.manager.register({name:'Link',rootPath:link}),/not a symlink/);
}finally{f.cleanup();}});

test('rejects repositories with submodules or executable Git configuration',()=>{for(const unsafe of ['submodule','hooks']){const f=fixture();try{
 if(unsafe==='submodule')fs.writeFileSync(path.join(f.repo,'.gitmodules'),'[submodule "x"]\npath=x\nurl=https://example.invalid/x\n');
 else run(f.repo,['config','core.hooksPath',path.join(f.root,'hooks')]);
 assert.throws(()=>f.manager.register({name:'Unsafe',rootPath:f.repo}),/submodules|Unsafe local Git configuration/);
 }finally{f.cleanup();}}});

test('rejects repositories nested inside managed worktree storage',()=>{const f=fixture();try{
 const nested=path.join(f.worktrees,'nested');fs.mkdirSync(nested,{recursive:true});run(nested,['init','-q','-b','main']);run(nested,['config','user.email','vac@example.invalid']);run(nested,['config','user.name','VAC Test']);fs.writeFileSync(path.join(nested,'a.txt'),'a\n');run(nested,['add','.']);run(nested,['commit','-q','-m','base']);
 assert.throws(()=>f.manager.register({name:'Nested',rootPath:nested}),/must not overlap/);
}finally{f.cleanup();}});

test('creates collision-free worktrees from pinned commits and preserves isolated changes',()=>{const f=fixture();try{
 const baseStatus=run(f.repo,['status','--porcelain=v1']);const repository=f.manager.register({name:'Fixture',rootPath:f.repo});const first=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'worker1',baseRef:'main'});const second=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'worker2',baseRef:'main'});
 assert.notEqual(first.path,second.path);assert.notEqual(first.branch,second.branch);assert.equal(first.baseCommit,second.baseCommit);assert.equal(fs.existsSync(path.join(first.path,'owner.txt')),false);
 fs.writeFileSync(path.join(first.path,'first.txt'),'first\n');fs.writeFileSync(path.join(second.path,'second.txt'),'second\n');
 assert.deepEqual(f.manager.inspect(first.id).changedPaths,['first.txt']);assert.deepEqual(f.manager.inspect(second.id).changedPaths,['second.txt']);assert.equal(run(f.repo,['status','--porcelain=v1']),baseStatus);
 assert.throws(()=>f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'worker1',baseRef:'main'}),/already owns/);
 assert.throws(()=>f.manager.createWorktree(repository.id,{runId:'bad/node',nodeId:'x',baseRef:'main'}));
}finally{f.cleanup();}});

test('refuses cleanup of dirty work and requires reviewed head identity for clean garbage collection',()=>{const f=fixture();try{
 const repository=f.manager.register({name:'Fixture',rootPath:f.repo});const dirty=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'dirty'});fs.writeFileSync(path.join(dirty.path,'keep.txt'),'preserve me\n');
 const retained=f.manager.retain(dirty.id);assert.equal(retained.status,'retained');assert.throws(()=>f.manager.markReadyForGc(dirty.id),/must be retained/);assert.equal(fs.readFileSync(path.join(dirty.path,'keep.txt'),'utf8'),'preserve me\n');
 const clean=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'clean'});const ready=f.manager.markReadyForGc(clean.id);assert.equal(ready.status,'ready_for_gc');assert.throws(()=>f.manager.gc(clean.id,{expectedHead:'0'.repeat(40)}),/head changed/);
 const removed=f.manager.gc(clean.id,{expectedHead:ready.headCommit});assert.equal(removed.status,'removed');assert.equal(fs.existsSync(clean.path),false);assert.equal(run(f.repo,['show-ref','--verify',`refs/heads/${clean.branch}`]).length>0,true);
}finally{f.cleanup();}});

test('untracked evidence uses bounded hashes rather than silently omitting files',()=>{const f=fixture();try{
 const repository=f.manager.register({name:'Fixture',rootPath:f.repo});const worktree=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'worker'});fs.writeFileSync(path.join(worktree.path,'new.txt'),'evidence\n');const inspected=f.manager.inspect(worktree.id);
 assert.match(inspected.patch,/UNTRACKED new\.txt size=9 sha256=[0-9a-f]{64}/);assert.match(inspected.patchSha256,/^[0-9a-f]{64}$/);
}finally{f.cleanup();}});

test('rejects untracked symlinks rather than reading outside-worktree evidence',()=>{const f=fixture();try{
 const repository=f.manager.register({name:'Fixture',rootPath:f.repo});const worktree=f.manager.createWorktree(repository.id,{runId:'run1',nodeId:'worker'});const outside=path.join(f.root,'secret.txt');fs.writeFileSync(outside,'secret\n');fs.symlinkSync(outside,path.join(worktree.path,'link.txt'));
 assert.throws(()=>f.manager.inspect(worktree.id),/symbolic links/);
}finally{f.cleanup();}});
