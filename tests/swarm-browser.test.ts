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
 assert.deepEqual(Object.keys(read.properties),['action','focus','offset']);
 assert.equal(read.additionalProperties,false);
 assert.ok(navigate.required.includes('url'));
 const browser=new SwarmBrowser(async()=>{throw new Error('must not dispatch');});
 await assert.rejects(()=>browser.execute('invalid',{action:'read',url:'https://example.com'},policy,signal(),()=>{throw new Error('must not reserve');}),/Unrecognized key/);
 assert.equal(browser.size,0);
});

test('bounded browser excerpts can locate later evidence without inventing omitted content',async()=>{
 const long='<nav>Unrelated navigation</nav><main><h1>Report</h1><p>'+('Early section words '.repeat(1200))+'</p><h2>Cash flow table</h2><p>Operating cash flow 300 million</p></main>';
 const browser=new SwarmBrowser(async()=>response(long));
 try{const first=await browser.execute('focus',{action:'navigate',url:'https://example.com'},policy,signal(),()=>{});assert.equal(first.truncated,true);assert.doesNotMatch(first.text,/Unrelated navigation|Operating cash flow/);
 const later=await browser.execute('focus',{action:'read',focus:'Cash flow table'},policy,signal(),()=>{});assert.equal(later.focusFound,true);assert.ok(later.offset>9000);assert.match(later.text,/Operating cash flow 300 million/);assert.ok(later.text.length<=9000);
 const missing=await browser.execute('focus',{action:'read',focus:'Absent evidence'},policy,signal(),()=>{});assert.equal(missing.focusFound,false);assert.doesNotMatch(missing.text,/Absent evidence/);
 await assert.rejects(()=>browser.execute('focus',{action:'read',offset:-1},policy,signal(),()=>{}));
 }finally{await browser.closeAll();}
});

test('approved navigation redirects stay on guarded transport with final URL provenance',async()=>{
 const sent:string[]=[];let reservations=0;const browser=new SwarmBrowser(async r=>{sent.push(r.url);return r.url.endsWith('/start')?{status:302,headers:{location:'/final'},body:Buffer.alloc(0)}:response('<h1>Final guarded document</h1>');});
 try{const page=await browser.execute('redirect',{action:'navigate',url:'https://example.com/start'},policy,signal(),()=>reservations++);assert.equal(page.url,'https://example.com/final');assert.match(page.text,/Final guarded document/);assert.deepEqual(sent,['https://example.com/start','https://example.com/final']);assert.equal(reservations,2);}finally{await browser.closeAll();}
});

test('redirect chains cannot evade destination checks or request and hop limits',async()=>{
 for(const mode of ['origin','budget','loop']){let calls=0,reserved=0;const browser=new SwarmBrowser(async()=>{calls++;return{status:302,headers:{location:mode==='origin'?'https://other.example/':'/again'},body:Buffer.alloc(0)};});
 try{await assert.rejects(()=>browser.execute(mode,{action:'navigate',url:'https://example.com'},policy,signal(),()=>{if(mode==='budget'&&++reserved>1)throw new Error('network cap');}));assert.equal(browser.size,0);assert.equal(calls,mode==='loop'?9:1);}finally{await browser.closeAll();}}
});

test('research navigation schema and dispatch reject invented URLs before network use',async()=>{
 const {discoveredBrowserUrls,discoveredBrowserTool}=await import('../src/server/browser');
 const strict={...policy,requireDiscoveredUrls:true};
 const urls=discoveredBrowserUrls([{receipts:[{toolId:'tool-web-search',status:'succeeded',output:{results:[{url:'https://example.com/discovered'},{url:'https://outside.example/denied'}]}},{toolId:'tool-browser',status:'succeeded',output:{url:'https://example.com/report',elements:[{href:'/filing'}]}},{toolId:'tool-web-search',status:'failed',output:{results:[{url:'https://example.com/failed'}]}}]}],strict);
 assert.deepEqual(urls,['https://example.com/discovered','https://example.com/filing']);
 const schema:any=discoveredBrowserTool(urls).schema;assert.deepEqual((schema.oneOf||schema.anyOf).find((b:any)=>b.properties.action.const==='navigate').properties.url.enum,urls);
 const empty:any=discoveredBrowserTool([]).schema;assert.equal((empty.oneOf||empty.anyOf).some((b:any)=>b.properties.action.const==='navigate'),false);
 let requests=0;const browser=new SwarmBrowser(async()=>{requests++;return response();});
 try{await assert.rejects(()=>browser.execute('invented',{action:'navigate',url:'https://example.com/invented'},strict,signal(),()=>{},undefined,urls),/exact discovered URL/);assert.equal(requests,0);assert.equal(browser.size,0);
 const page=await browser.execute('discovered',{action:'navigate',url:urls[0]},strict,signal(),()=>{},undefined,urls);assert.equal(page.url,urls[0]);assert.ok(requests>0);
 }finally{await browser.closeAll();}
});
test('strict document research derives authority only from current-run discovered URLs when no origins were predeclared',async()=>{
 const {discoveredBrowserUrls}=await import('../src/server/browser');
 const strict={allowedOrigins:[],allowActions:false,requireDiscoveredUrls:true,documentOnly:true};
 const urls=discoveredBrowserUrls([{receipts:[{toolId:'tool-web-search',status:'succeeded',output:{results:[{url:'https://research.example/blocked'},{url:'https://research.example/report'},{url:'https://research.example/filing.pdf'}]}},{toolId:'tool-browser',status:'failed',input:{action:'navigate',url:'https://research.example/blocked'},error:'HTTP 403'}]}],strict);
 assert.deepEqual(urls,['https://research.example/report']);
});

test('strict research does not offer an already opened page as a new source',async()=>{
 const {discoveredBrowserUrls}=await import('../src/server/browser');
 const strict={allowedOrigins:[],allowActions:false,requireDiscoveredUrls:true,documentOnly:true};
 const urls=discoveredBrowserUrls([{receipts:[{toolId:'tool-web-search',status:'succeeded',output:{results:[{url:'https://research.example/report'},{url:'https://research.example/second'}]}},{toolId:'tool-browser',status:'succeeded',input:{action:'navigate',url:'https://research.example/report'},output:{url:'https://research.example/report',elements:[]}}]}],strict);
 assert.deepEqual(urls,['https://research.example/second']);
});

test('document-only research preserves document text without executing scripts or spending requests on assets',async()=>{
 const sent:string[]=[];const browser=new SwarmBrowser(async r=>{sent.push(r.url);return response('<link rel="stylesheet" href="/asset.css"><h1>Original evidence</h1><script src="/asset.js"></script><script>document.querySelector("h1").innerText="Changed by script";fetch("/extra")</script>');});const p={...policy,documentOnly:true};
 try{const page=await browser.execute('doc',{action:'navigate',url:'https://example.com'},p,signal(),()=>{});assert.match(page.text,/Original evidence/);assert.doesNotMatch(page.text,/Changed by script/);assert.deepEqual(sent,['https://example.com/']);
 await assert.rejects(()=>browser.execute('doc',{action:'read'},policy,signal(),()=>{}),/rendering mode/);await assert.rejects(()=>browser.execute('other',{action:'navigate',url:'https://example.com'},{...p,allowActions:true},signal(),()=>{}),/does not permit/);
 }finally{await browser.closeAll();}
});

test('browser preserves the original request budget exception instead of a generic navigation error',async()=>{
 const failure=new Error('Original shared request cap');const browser=new SwarmBrowser(async()=>response());
 try{await assert.rejects(()=>browser.execute('cap',{action:'navigate',url:'https://example.com'},policy,signal(),()=>{throw failure;}),error=>error===failure);assert.equal(browser.size,0);}finally{await browser.closeAll();}
});
