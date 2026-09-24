import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { importedToolSchema, validateImportedOutput } from '../src/server/importedTools';
import meeting from '../src/server/importedMeetingCost.json';
import { runSandbox, Workspace } from '../src/server/workspace';
import { Store } from '../src/server/store';

const input={importedTool:'meeting-cost-v1',arguments:{attendees:6,minutes:60,avg_rate:90,include_refocus:true,has_decision:true,has_agenda:true,has_owner:true}};
function fixture(sandbox?:any){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vac-imported-')),store=new Store(dir);
  store.put('projects','project',{id:'project',workspaceId:'ws-default',name:'Test'});
  return {store,w:new Workspace(store,sandbox),j:{id:'imported-run',projectId:'project'} as any,
    cleanup(){store.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
test('imported allowlist pins exact reviewed source and rejects executable input before dispatch',async()=>{
  assert.equal(createHash('sha256').update(fs.readFileSync(meeting.path)).digest('hex'),meeting.sha256);
  let calls=0;const f=fixture(async()=>{calls++;throw new Error('Unexpected execution');});
  try{
    const bad=[{...input,importedTool:'../../etc/passwd'}, {...input,code:'print(1)'}, {...input,path:meeting.path},
      {...input,arguments:{...input.arguments,avg_rate:'__import__("os").system("id")'}},
      {...input,arguments:{...input.arguments,avg_rate:Infinity}}, {...input,arguments:{...input.arguments,avg_rate:-1}},
      {...input,arguments:{...input.arguments,attendees:0}}, {...input,arguments:{...input.arguments,minutes:1441}},
      {...input,arguments:{...input.arguments,has_owner:'true'}}, {...input,arguments:{...input.arguments,output:'../escape'}}];
    for(const raw of bad)await assert.rejects(()=>f.w.execute(f.j,'node','tool-code',raw,crypto.randomUUID(),new AbortController().signal));
    assert.equal(calls,0);assert.equal(f.w.files('project').length,0);
    assert.ok(importedToolSchema.safeParse(input).success);
  }finally{f.cleanup();}
});
test('imported output validator rejects extra artifacts and fabricated arithmetic without writing files',async()=>{
  const f=fixture(async()=>({exitCode:0,stdout:'',stderr:'',files:[{name:'evil.txt',base64:'eA=='}]}));
  try{await assert.rejects(()=>f.w.execute(f.j,'node','tool-code',input,'bad-output',new AbortController().signal),/Unexpected imported/);
    assert.equal(f.w.files('project').length,0);assert.equal(f.store.get('swarm-tool-results','bad-output'),undefined);
    assert.throws(()=>validateImportedOutput(input,[{name:'meeting-cost.json',base64:Buffer.from('{}').toString('base64')}]));
  }finally{f.cleanup();}
});
test('qualified imported tool runs real sandbox branches, rejects altered results, and persists immutable provenance', {skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
  const f=fixture();try{
    const cases=[
      {args:input.arguments,expected:['MEET',540,207,747]},
      {args:{...input.arguments,has_decision:false},expected:['ASYNC',540,207,747]},
      {args:{...input.arguments,has_owner:false},expected:['NOT-READY',540,207,747]},
      {args:{...input.arguments,has_agenda:false,has_owner:false},expected:['NOT-READY',540,207,747]},
      {args:{...input.arguments,attendees:1,minutes:30,avg_rate:10,include_refocus:false},expected:['MEET',5,0,5]},
      {args:{...input.arguments,attendees:10000,minutes:1440,avg_rate:100000},expected:['MEET',24000000000,383333333.33,24383333333.33]},
      {args:{...input.arguments,avg_rate:0},expected:['MEET',0,0,0]},
    ];
    for(let i=0;i<cases.length;i++){
      const c=cases[i],raw={...input,arguments:c.args};
      const receipt=await f.w.execute(f.j,'node','tool-code',raw,`imported-${i}`,new AbortController().signal);
      const file=f.w.file('project','meeting-cost.json'),result=JSON.parse(Buffer.from(file.base64,'base64').toString());
      assert.deepEqual([result.verdict,result.direct_cost,result.refocus_cost,result.total_cost],c.expected);
      assert.equal(file.runId,f.j.id);assert.equal(file.source,'node');assert.equal(file.version,i+1);
      assert.equal(receipt.output.importedTool.sha256,meeting.sha256);assert.equal(receipt.output.importedTool.outputHash,file.sha256);
      const corrupt={...result,total_cost:result.total_cost+2};
      assert.throws(()=>validateImportedOutput(raw,[{name:file.name,base64:Buffer.from(JSON.stringify(corrupt)).toString('base64')}]),/independent checks/);
    }
    assert.equal(f.w.file('project','meeting-cost.json',1).version,1);
    assert.deepEqual(await f.w.execute(f.j,'node','tool-code',input,'imported-0',new AbortController().signal),f.store.get('swarm-tool-results','imported-0'));
    assert.equal(f.w.file('project','meeting-cost.json').version,cases.length);
    assert.throws(()=>f.w.file('other-project','meeting-cost.json'),/not found/);
  }finally{f.cleanup();}
});
test('real imported execution cancellation accepts no artifact or receipt', {skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
  const f=fixture(async(request:any,signal:AbortSignal)=>runSandbox({...request,code:'import time\ntime.sleep(30)\n'+request.code},signal));
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1500);
  try{await assert.rejects(()=>f.w.execute(f.j,'node','tool-code',input,'cancelled',controller.signal),/cancelled|aborted/);
    assert.equal(f.w.files('project').length,0);assert.equal(f.store.get('swarm-tool-results','cancelled'),undefined);
  }finally{clearTimeout(timer);f.cleanup();}
});
test('real sandbox contains subprocess/network attempts and rejects traversal before execution', {skip:process.env.VAC_TEST_SANDBOX!=='1'},async()=>{
  const code=`import os,pathlib,subprocess,socket,json\nassert os.getuid()==65534\nassert pathlib.Path('/sys/fs/cgroup/memory.max').read_text().strip()=='536870912'\nassert pathlib.Path('/sys/fs/cgroup/pids.max').read_text().strip()=='32'\nassert pathlib.Path('/sys/fs/cgroup/cpu.max').read_text().strip()=='100000 100000'\nassert 'NoNewPrivs:\\t1' in pathlib.Path('/proc/self/status').read_text()\ntry:\n pathlib.Path('/escape').write_text('bad')\n raise AssertionError('root writable')\nexcept OSError: pass\nchild=subprocess.run(['python','-I','-c',\"import socket,os; assert 'VAC_ACCESS_TOKEN' not in os.environ; socket.create_connection(('1.1.1.1',443),timeout=1)\"],capture_output=True)\nassert child.returncode!=0\nassert b'Network is unreachable' in child.stderr\nprint('subprocess remained isolated')`;
  const request={language:'python' as const,inputNames:[],files:[],code};
  const r=await runSandbox(request,new AbortController().signal);assert.equal(r.exitCode,0,r.stderr);assert.match(r.stdout,/isolated/);
  const traversal=await runSandbox({...request,files:[{name:'../escape',base64:'eA=='}]},new AbortController().signal);
  assert.equal(traversal.exitCode,1);assert.match(traversal.stderr,/Invalid workspace path/);assert.deepEqual(traversal.files,[]);
});
