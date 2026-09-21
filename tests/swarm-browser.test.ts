import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SwarmBrowser, checkedUrl, publicIPv4, publicRequest, browserPolicySchema } from '../src/server/browser';
const policy={allowedOrigins:['https://example.com'],allowActions:false};
const signal=()=>new AbortController().signal;
const html=`<title>Browser acceptance</title><h1>Verified page</h1><a id="next" href="/next">Next page</a><form action="/submitted" method="POST"><input id="name" name="name"><select id="choice" name="choice"><option value="a">A</option><option value="b">B</option></select><button id="submit">Submit</button></form><button id="change" onclick="document.querySelector('h1').innerText='Changed locally'">Change</button><script>document.body.dataset.session=localStorage.getItem('x')||'clean';document.body.insertAdjacentHTML('beforeend','<p>Session '+document.body.dataset.session+'</p>');localStorage.setItem('x','dirty');</script>`;
const response=(body=html)=>({status:200,headers:{'content-type':'text/html'},body:Buffer.from(body)});
test('browser origin and DNS policy rejects private, reserved, credentialed and non-web targets',async()=>{
 for(const address of ['127.0.0.1','10.0.0.1','172.16.1.1','192.168.0.1','169.254.169.254','100.64.0.1','198.18.0.1','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicIPv4(address),false);
 assert.equal(publicIPv4('93.184.216.34'),true);
 for(const url of ['http://127.1','http://2130706433','http://localhost','http://[::1]','file:///tmp/a','https://user:pass@example.com','https://example.com:3001'])assert.throws(()=>checkedUrl(url));
 assert.throws(()=>checkedUrl('https://other.example',policy),/approved/);
 assert.throws(()=>browserPolicySchema.parse({allowedOrigins:['https://example.com/']}));
 await assert.rejects(()=>publicRequest({url:'http://127.0.0.1',method:'GET',headers:{},body:null},signal()),/public/);
});
test('real Chromium navigates, follows links, blocks writes and isolates sessions',async()=>{
 const requests:string[]=[];let count=0;
 const browser=new SwarmBrowser(async r=>{requests.push(r.method+' '+r.url);return response(r.url.endsWith('/next')?'<title>Second</title><h1>Second page evidence</h1>':html);});
 try{
  const first=await browser.execute('a',{action:'navigate',url:'https://example.com'},policy,signal(),()=>count++);assert.match(first.text,/Verified page/);assert.match(first.text,/Session clean/);
  await assert.rejects(()=>browser.execute('a',{action:'fill',selector:'#name',value:'test'},policy,signal(),()=>count++),/not approved/);
  await assert.rejects(()=>browser.execute('b',{action:'navigate',url:'http://127.0.0.1'},policy,signal(),()=>count++),/public/);
  const next=await browser.execute('a',{action:'click',selector:'#next'},policy,signal(),()=>count++);assert.match(next.text,/Second page evidence/);assert.ok(count>=2);
  const isolated=await browser.execute('b',{action:'navigate',url:'https://example.com'},policy,signal(),()=>count++);assert.match(isolated.text,/Verified page/);assert.match(isolated.text,/Session clean/);assert.equal(browser.size,2);assert.ok(requests.every(r=>r.startsWith('GET')));
 }finally{await browser.closeAll();assert.equal(browser.size,0);}
});
test('interactive permission enables fill, select, clicks and form submission in real Chromium',async()=>{
 const requests:any[]=[];const browser=new SwarmBrowser(async r=>{requests.push(r);return response(r.method==='POST'?'<h1>Form received</h1>':html);});const writable={...policy,allowActions:true};
 try{
  await browser.execute('a',{action:'navigate',url:'https://example.com'},writable,signal(),()=>{});
  await browser.execute('a',{action:'fill',selector:'#name',value:'Acceptance'},writable,signal(),()=>{});
  await browser.execute('a',{action:'select',selector:'#choice',value:'b'},writable,signal(),()=>{});
  const changed=await browser.execute('a',{action:'click',selector:'#change'},writable,signal(),()=>{});assert.match(changed.text,/Changed locally/);
  await browser.execute('a',{action:'click',selector:'#submit'},writable,signal(),()=>{});
  assert.ok(requests.some(r=>r.method==='POST'&&r.body.toString().includes('name=Acceptance')));
 }finally{await browser.closeAll();}
});
test('network cap, unapproved redirect and cancellation close browser sessions',async()=>{
 for(const mode of ['budget','redirect','cancel']){
  const controller=new AbortController();let entered!:()=>void;const started=new Promise<void>(r=>entered=r);let calls=0;
  const browser=new SwarmBrowser(async(_r,s)=>{calls++;entered();if(mode==='cancel')await new Promise((_,reject)=>s.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));return mode==='redirect'?{status:302,headers:{location:'http://127.0.0.1/'},body:Buffer.alloc(0)}:response();});
  try{
   const operation=browser.execute('a',{action:'navigate',url:'https://example.com'},policy,controller.signal,()=>{if(mode==='budget')throw new Error('Shared browser network allowance exhausted');});
   if(mode==='cancel'){await started;controller.abort();}
   await assert.rejects(()=>operation);assert.equal(browser.size,0);if(mode==='budget')assert.equal(calls,0);
  }finally{await browser.closeAll();}
 }
});


test('page scripts cannot POST in read mode or bypass approved origins',async()=>{
 const sent:string[]=[];const browser=new SwarmBrowser(async r=>{sent.push(r.method+' '+r.url);return response(`<h1>Read page</h1><script>fetch('/write',{method:'POST',body:'no'}).catch(()=>{});fetch('https://other.example/secret').catch(()=>{});</script>`);});
 try{const page=await browser.execute('read',{action:'navigate',url:'https://example.com'},policy,signal(),()=>{});assert.deepEqual(sent,['GET https://example.com/']);assert.ok(page.blockedRequests.some(e=>e.includes('write request')));assert.ok(page.blockedRequests.some(e=>e.includes('not owner-approved')));}finally{await browser.closeAll();}
});


test('returned selectors work for elements without ids',async()=>{
 const browser=new SwarmBrowser(async r=>response(r.url.endsWith('/next')?'<h1>Followed generated selector</h1>':'<main><p><a href="/next">Follow</a></p></main>'));
 try{const first=await browser.execute('a',{action:'navigate',url:'https://example.com'},policy,signal(),()=>{});assert.equal(first.elements.length,1);const next=await browser.execute('a',{action:'click',selector:first.elements[0].selector},policy,signal(),()=>{});assert.match(next.text,/Followed generated selector/);}finally{await browser.closeAll();}
});

test('saved browser state survives a new session, stays project scoped and rejects concurrent reuse',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vac-profile-'));
 const b=new SwarmBrowser(async()=>response(),dir);const p={...policy,profileId:'test'};
 try{await b.execute('one',{action:'navigate',url:'https://example.com'},p,signal(),()=>{},'project');await assert.rejects(()=>b.execute('two',{action:'navigate',url:'https://example.com'},p,signal(),()=>{},'project'),/in use/);await b.close('one');const second=await b.execute('two',{action:'navigate',url:'https://example.com'},p,signal(),()=>{},'project');assert.match(second.text,/Session dirty/);const other=await b.execute('other',{action:'navigate',url:'https://example.com'},p,signal(),()=>{},'different');assert.match(other.text,/Session clean/);assert.equal(b.profiles('project').length,1);assert.throws(()=>b.deleteProfile('project','test'),/in use/);await b.close('two');b.deleteProfile('project','test');assert.equal(b.profiles('project').length,0);}finally{await b.closeAll();fs.rmSync(dir,{recursive:true,force:true});}
});

test('browser advertises action-specific arguments and rejects the old read-with-url shape before launch',async()=>{
 const {browserTool}=await import('../src/server/browser');
 const schema:any=browserTool.schema;
 const branches=schema.oneOf||schema.anyOf;
 const read=branches.find((b:any)=>b.properties.action.const==='read');
 const navigate=branches.find((b:any)=>b.properties.action.const==='navigate');
 assert.deepEqual(Object.keys(read.properties),['action']);
 assert.equal(read.additionalProperties,false);
 assert.ok(navigate.required.includes('url'));
 const browser=new SwarmBrowser(async()=>{throw new Error('must not dispatch');});
 await assert.rejects(()=>browser.execute('invalid',{action:'read',url:'https://example.com'},policy,signal(),()=>{throw new Error('must not reserve');}),/Unrecognized key/);
 assert.equal(browser.size,0);
});
