import { test, expect } from '@playwright/test';
const token = 'browser-fixture-owner-token-00000000000000';
let sessionCookies: any[] = [];
test.beforeAll(async ({ request }) => {
 const response = await request.post('/api/session', { data: { token } });
 expect(response.ok()).toBeTruthy(); sessionCookies = (await request.storageState()).cookies;
});
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('sign-out')) {
    await page.goto('/');
    await page.getByLabel('Workspace access token').fill(token);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  } else { await page.context().addCookies(sessionCookies); await page.goto('/'); }
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
});
test('sign-out returns to the locked workspace and readiness UI displays runtime state', async ({ page }) => {
  await expect(page.getByText('Local workspace · Human-reviewed drafts')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Operations', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Operations', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('runtime-ready');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unlock your workspace' })).toBeVisible();
});
test('search keys can be saved, read back after reload and removed without disclosing them', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Tavily API Key', { exact: true }).fill('browser-test-key-only');
  await page.getByRole('button', { name: 'Save Tavily Key' }).click();
  await expect(page.getByLabel('Tavily API Key', { exact: true })).toHaveValue('');
  await page.reload(); await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Tavily API Key', { exact: true })).toHaveAttribute('placeholder', '••••••••');
  await page.getByRole('button', { name: 'Remove key', exact: true }).first().click();
  await expect(page.getByLabel('Tavily API Key', { exact: true })).toHaveAttribute('placeholder', 'tvly-...');
});
test('real UI submission, approval, automatic completion and provider failure preserve truthful outcomes', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${token}` };
  const agents = await (await request.get('/api/agents', { headers })).json(); const agent = agents[0];
  await request.patch(`/api/agents/${agent.id}`, { headers, data: { autonomyLevel: 3, toolIds: ['tool-doc-gen'] } });
  await request.patch(`/api/agents/${agent.id}/llm`, { headers, data: { provider: 'openai', model: 'fixture', localEndpoint: 'http://127.0.0.1:3328/v1', temperature: 0, maxTokens: 128 } });
  await page.getByLabel('Message', { exact: true }).fill('SAVE_DOCUMENT');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await page.getByRole('button', { name: 'Approve exact operation' }).click();
  await expect(page.getByRole('button', { name: 'Accept deliverable' })).toHaveCount(0);
  await expect(page.getByText('completed', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Message', { exact: true }).fill('PROVIDER_FAIL');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByText('failed', { exact: true })).toBeVisible();
  await expect(page.getByText('Provider returned HTTP 503', { exact: true })).toBeVisible();
});
test('agent creation completes all wizard steps and persists after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'New Agent', exact: true }).click();
  await page.getByPlaceholder('e.g. Elena, Alex, Jordan...').fill('BrowserTest');
  for (let step = 0; step < 4; step++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Deploy Coworker', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'BrowserTest', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('BrowserTest', { exact: true })).toBeVisible();
});
test('rejected operation remains blocked and creates no artifact', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${token}` };
  const agents = await (await request.get('/api/agents', { headers })).json();
  const projects = await (await request.get('/api/projects', { headers })).json();
  const before = await (await request.get('/api/artifacts', { headers })).json();
  const result = await (await request.post('/api/chat/agent', { headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() }, data: { agentId: agents[0].id, projectId: projects[0].id, conversationId: 'reject-browser', userMessage: 'SAVE_DOCUMENT' } })).json();
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByText('Owner rejected the requested tool operation.', { exact: true })).toBeVisible();
  expect((await (await request.get(`/api/runs/${result.run.id}`, { headers })).json()).status).toBe('blocked');
  expect((await (await request.get('/api/artifacts', { headers })).json()).length).toBe(before.length);
});
test('project creation persists the owner-supplied scope', async ({ page }) => {
  await page.getByRole('button', { name: /^Projects \d+/ }).click();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByPlaceholder('e.g. Project Apollo, Compliance Framework').fill('Browser project');
  await page.getByPlaceholder('Brief description of deliverables and scope...').fill('Fixture scope for release verification.');
  await page.getByRole('button', { name: 'Create Project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Browser project', exact: true })).toBeVisible();
});
test('missing search is blocked and selecting a subordinate does not start it or grant tools', async ({ page, request }) => {
 const headers={Authorization:`Bearer ${token}`};
 const agents=await(await request.get('/api/agents',{headers})).json();const projects=await(await request.get('/api/projects',{headers})).json();const parent=agents[0];
 await request.patch(`/api/agents/${parent.id}`,{headers,data:{autonomyLevel:3,toolIds:[]}});
 const child=await(await request.post('/api/agents',{headers,data:{displayName:'SearchChoice',reportsTo:parent.id,autonomyLevel:3,toolIds:['tool-web-search']}})).json();
 const submitted=await(await request.post('/api/chat/agent',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data:{agentId:parent.id,projectId:projects[0].id,conversationId:'missing-search',userMessage:'Search the web for SQLite backup'}})).json();
 expect(submitted.run.status).toBe('blocked');expect(submitted.run.receipts).toEqual([]);
 const count=(await(await request.get('/api/runs',{headers})).json()).length;
 await page.getByRole('button',{name:'Audit',exact:true}).click();
 await page.getByRole('button',{name:'Select SearchChoice (subordinate)',exact:true}).click();
 await expect(page.getByRole('heading',{name:'SearchChoice',exact:true})).toBeVisible();
 expect((await(await request.get('/api/runs',{headers})).json()).length).toBe(count);
 expect((await(await request.get(`/api/agents/${parent.id}`,{headers})).json()).toolIds).toEqual([]);
 expect(child.reportsTo).toBe(parent.id);
});
test('Team hierarchy drives a real read-only child run and parent evidence display',async({page,request},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`};const llmConfig={provider:'openai',model:'fixture',localEndpoint:'http://127.0.0.1:3328/v1',temperature:0,maxTokens:128};
 const manager=await(await request.post('/api/agents',{headers,data:{displayName:'DelegationManager',toolIds:['tool-delegate'],autonomyLevel:3,llmConfig}})).json();
 const child=await(await request.post('/api/agents',{headers,data:{displayName:'DelegationChild',reportsTo:manager.id,toolIds:['tool-calculator'],autonomyLevel:3,llmConfig}})).json();
 const project=await(await request.post('/api/projects',{headers,data:{name:'Delegation browser project',members:[]}})).json();
 const result=await(await request.post('/api/chat/agent',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data:{agentId:manager.id,projectId:project.id,userMessage:'DELEGATE_BROWSER',requiredToolIds:['tool-calculator']}})).json();
 await expect.poll(async()=>((await(await request.get(`/api/runs/${result.run.id}`,{headers})).json()).status)).toBe('completed');
 const tree=await(await request.get(`/api/runs/${result.run.id}/tree`,{headers})).json();const items=await(await request.get('/api/work-items',{headers})).json();const delegated=items.find((w:any)=>w.delegatedRunId===tree.children[0].id);expect(delegated.assignedAgentId).toBe(child.id);expect(delegated.status).toBe('done');expect((await request.patch(`/api/work-items/${delegated.id}`,{headers,data:{status:'done'}})).status()).toBe(409);expect(tree.children).toHaveLength(1);expect(tree.children[0].leadAgentId).toBe(child.id);expect(tree.children[0].parentRunId).toBe(result.run.id);expect(tree.root.receipts.some((r:any)=>r.toolId==='tool-delegate')).toBe(true);
 await page.getByRole('button',{name:'Audit',exact:true}).click();await expect(page.getByText('Child of',{exact:false})).toBeVisible();await expect(page.getByText(/Shared tree:/).first()).toBeVisible();await expect(page.getByRole('button',{name:'Accept deliverable',exact:true})).toHaveCount(0);await expect(page.getByText(/Delegated to DelegationChild:/)).toBeVisible();
 await page.getByRole('button',{name:/^Team/}).click();await expect(page.getByRole('heading',{name:'Team hierarchy'})).toBeVisible();await expect(page.getByRole('button',{name:'DelegationChild',exact:true})).toBeVisible();await expect(page.getByText(/Delegation: permitted/)).toBeVisible();await expect(page.getByTestId('hierarchy-connectors').first()).toBeVisible();const priorZoom=await page.getByText(/^Zoom \d+%$/).textContent();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await expect(page.getByText(/^Zoom \d+%$/)).not.toHaveText(priorZoom!);await page.getByRole('button',{name:'Fit hierarchy',exact:true}).click();await page.screenshot({path:testInfo.outputPath('team-hierarchy.png'),fullPage:true});await page.getByRole('button',{name:/^Tasks/}).click();await expect(page.getByTestId('delegated-work-status').first()).toContainText('Completed');await page.getByRole('button',{name:'Open parent run',exact:true}).first().click();await expect(page.getByText('Child of',{exact:false})).toBeVisible();
});
test('reading earlier chat stays in place across polling and new replies',async({page,request})=>{
 const headers={Authorization:`Bearer ${token}`};const agent=await(await request.post('/api/agents',{headers,data:{displayName:'ScrollReader',toolIds:[],llmConfig:{provider:'openai',model:'fixture',localEndpoint:'http://127.0.0.1:3328/v1',temperature:0,maxTokens:128}}})).json();const projects=await(await request.get('/api/projects',{headers})).json();
 const submit=async(text:string)=>{const r=await(await request.post('/api/chat/agent',{headers:{...headers,'Idempotency-Key':crypto.randomUUID()},data:{agentId:agent.id,projectId:projects[0].id,userMessage:text}})).json();await expect.poll(async()=>(await(await request.get(`/api/runs/${r.run.id}`,{headers})).json()).status).toBe('completed');};
 await submit(Array.from({length:100},(_,i)=>`Earlier history line ${i}`).join('\n'));await expect(page.getByText('ScrollReader',{exact:true}).first()).toBeVisible();await page.getByText('ScrollReader',{exact:true}).first().click();const history=page.getByTestId('chat-history');await expect(history.getByText(/Earlier history line 0/)).toBeVisible();await history.evaluate(el=>{el.scrollTop=0;el.dispatchEvent(new Event('scroll'));});await submit('A new incoming reply must not move my reading position.');await expect(history.getByText('A new incoming reply must not move my reading position.',{exact:true})).toBeVisible();await page.waitForTimeout(3500);expect(await history.evaluate(el=>el.scrollTop)).toBeLessThan(5);
});
test('local model dropdown lists both models regardless of current selection and saves changes',async({page,request})=>{
 const headers={Authorization:`Bearer ${token}`};const gemma='Agen/gemma-4-26B-A4B-it-uncensored-heretic:latest';await page.route('**/api/admin/local-models/test-connection',route=>route.fulfill({json:{success:true,models:['qwen2.5:7b',gemma]}}));
 const agent=await(await request.post('/api/agents',{headers,data:{displayName:'ModelChooser',llmConfig:{provider:'ollama',model:gemma,temperature:0.1,maxTokens:128}}})).json();await expect(page.getByText('ModelChooser',{exact:true}).first()).toBeVisible();await page.getByText('ModelChooser',{exact:true}).first().click();await page.locator('summary').filter({hasText:'Model:'}).click();const selector=page.getByRole('combobox',{name:'Model ID',exact:true});await expect(selector.locator('option')).toHaveCount(3);await expect(selector).toHaveValue(gemma);await selector.selectOption('qwen2.5:7b');await page.getByRole('button',{name:'Save model',exact:true}).click();await expect.poll(async()=>{const agents=await(await request.get('/api/agents',{headers})).json();return agents.find((a:any)=>a.id===agent.id).llmConfig.model;}).toBe('qwen2.5:7b');await expect(selector.locator('option')).toHaveCount(3);
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByText('Default Local Model',{exact:true})).toHaveCount(0);const row=page.getByTestId(`model-assignment-${agent.id}`);await expect(row.locator('summary')).toHaveText('Model: qwen2.5:7b');await row.locator('summary').click();await expect(row.getByRole('combobox',{name:'Model ID',exact:true})).toHaveValue('qwen2.5:7b');await row.getByRole('combobox',{name:'Model ID',exact:true}).selectOption(gemma);await row.getByRole('button',{name:'Save model',exact:true}).click();await expect.poll(async()=>{const agents=await(await request.get('/api/agents',{headers})).json();return agents.find((a:any)=>a.id===agent.id).llmConfig;}).toMatchObject({model:gemma,provider:'ollama'});await page.getByText('ModelChooser',{exact:true}).first().click();await expect(page.locator('summary').filter({hasText:'Model:'})).toHaveText(`Model: ${gemma}`);
});

test('AI Swarm UI submits dynamic work, renders actual specialists and survives reload',async({page,request},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`};
 const manager=await(await request.post('/api/agents',{headers,data:{displayName:'SwarmCoordinator',autonomyLevel:3,toolIds:[],llmConfig:{provider:'ollama',model:'fixture',localEndpoint:'http://127.0.0.1:3328',temperature:0,maxTokens:1024}}})).json();
 const project=await(await request.post('/api/projects',{headers,data:{name:'Swarm browser project',members:[]}})).json();
 await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();
 await page.getByLabel('Swarm coordinator').selectOption(manager.id);await page.getByLabel('Swarm project').selectOption(project.id);
 await page.getByLabel('Team composition').selectOption('dynamic');
 await page.getByLabel('Swarm objective').fill('Calculate 19 plus 23 with two independent specialists.');
 await page.getByRole('button',{name:'Start swarm',exact:true}).click();
 await expect(page.getByText('Swarm verified: both specialists calculated 42.',{exact:true})).toBeVisible({timeout:20000});
 await expect(page.getByText('Temporary specialist',{exact:true})).toHaveCount(2);
 await expect(page.getByText('Execution tree',{exact:true})).toBeVisible();
 const swarms=await(await request.get('/api/swarms',{headers})).json();const r=swarms.find((r:any)=>r.coordinatorId===manager.id);
 expect(r.status).toBe('completed');expect(r.nodes).toHaveLength(3);expect(r.budget.modelCalls).toBe(6);expect(r.nodes[1].receipts.some((x:any)=>x.toolId==='tool-calculator')).toBe(true);
 const permanent=await(await request.get('/api/agents',{headers})).json();expect(permanent.some((a:any)=>a.id===r.nodes[1].id)).toBe(false);
 await page.setViewportSize({width:1600,height:1100});await page.getByRole('main',{name:'AI Swarm workspace'}).evaluate(el=>el.scrollTop=0);
 await page.screenshot({path:testInfo.outputPath('swarm-completed.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();await expect(page.getByText('Swarm verified: both specialists calculated 42.',{exact:true})).toBeVisible();
});


test('recursive swarm UI saves browser permissions and renders depth-two evidence',async({page,request},testInfo)=>{
 const headers={Authorization:`Bearer ${token}`};
 const manager=await(await request.post('/api/agents',{headers,data:{displayName:'NestedCoordinator',autonomyLevel:3,toolIds:[],llmConfig:{provider:'ollama',model:'fixture',localEndpoint:'http://127.0.0.1:3328',temperature:0,maxTokens:1024}}})).json();
 const project=await(await request.post('/api/projects',{headers,data:{name:'Nested UI project',members:[]}})).json();
 await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();
 await page.getByLabel('Swarm coordinator').selectOption(manager.id);await page.getByLabel('Swarm project').selectOption(project.id);
 await page.getByLabel('Swarm objective').fill('RECURSIVE_UI verify nested delegation');
 await page.getByLabel('Browser automation',{exact:true}).check();await page.getByLabel('Browser origins').fill('https://example.com');
 await page.getByRole('button',{name:'Show resource limits'}).click();await page.getByLabel('maxDepth',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Start swarm',exact:true}).click();
 await expect(page.getByText('Nested UI evidence: 42.',{exact:true})).toBeVisible({timeout:20000});
 const runs=await(await request.get('/api/swarms',{headers})).json();const run=runs.find((r:any)=>r.coordinatorId===manager.id);
 expect(run.status).toBe('completed');expect(run.nodes.map((n:any)=>n.depth)).toEqual([0,1,2]);expect(run.browserPolicy).toEqual({allowedOrigins:['https://example.com'],allowActions:false});
 await page.getByRole('button').filter({hasText:'NestedLeaf'}).click();await expect(page.getByText(/Depth 2/)).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('nested-swarm.png'),fullPage:true});
});

test('persistent workspace uploads and downloads files and saves capped routine templates',async({page,request})=>{
 const headers={Authorization:`Bearer ${token}`};const projects=await(await request.get('/api/projects',{headers})).json();const runs=await(await request.get('/api/swarms',{headers})).json();const project=projects.find((p:any)=>p.id===runs[0].projectId);
 await page.getByRole('button',{name:'AI Swarm',exact:true}).click();await page.getByLabel('Swarm project').selectOption(project.id);
 const bytes=Buffer.from('product,revenue\nA,600\n');await page.getByLabel('Upload project file').setInputFiles({name:'sales-ui.csv',mimeType:'text/csv',buffer:bytes});
 const link=page.getByRole('link',{name:'sales-ui.csv',exact:true});await expect(link).toBeVisible();const download=await request.get((await link.getAttribute('href'))!,{headers});expect(download.headers()['content-disposition']).toContain('attachment');expect(await download.body()).toEqual(bytes);
 const conflict=await request.post(`/api/projects/${project.id}/files`,{headers,data:{name:'sales-ui.csv',base64:bytes.toString('base64'),expectedVersion:0}});expect(conflict.status()).toBe(409);
 await page.getByText('Reusable skills and scheduled routines',{exact:true}).click();await page.getByLabel('Skill name').fill('UI saved workflow');await page.getByRole('button',{name:'Save selected run as skill'}).click();await expect(page.getByLabel('Routine skill').locator('option')).toContainText(['Choose pinned skill version','UI saved workflow']);
 const skills=await(await request.get(`/api/projects/${project.id}/skills`,{headers})).json();expect(skills.at(-1).version).toBe(1);
 const create=await request.post('/api/swarm-routines',{headers,data:{skillId:skills.at(-1).id,intervalMinutes:60,maxRuns:1,startsAt:new Date(Date.now()+3600000).toISOString()}});expect(create.status()).toBe(201);const routine=await create.json();await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();await page.getByLabel('Swarm project').selectOption(project.id);await page.getByText('Reusable skills and scheduled routines',{exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByText(/UI saved workflow · paused/)).toBeVisible();expect((await(await request.get(`/api/projects/${project.id}/routines`,{headers})).json()).find((r:any)=>r.id===routine.id).status).toBe('paused');
});

test('repeatable plan UI compiles a worker before inference and retains its evidence contract',async({page,request})=>{
 const headers={Authorization:`Bearer ${token}`};const manager=await(await request.post('/api/agents',{headers,data:{displayName:'PlanCoordinator',autonomyLevel:3,toolIds:[],llmConfig:{provider:'ollama',model:'fixture',localEndpoint:'http://127.0.0.1:3328',temperature:0,maxTokens:1024}}})).json();const project=await(await request.post('/api/projects',{headers,data:{name:'Planned UI project',members:[]}})).json();await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();await page.getByLabel('Swarm coordinator').selectOption(manager.id);await page.getByLabel('Swarm project').selectOption(project.id);await page.getByText('Repeatable workflow plan (optional)',{exact:true}).click();await page.getByLabel('Workflow plan').fill(JSON.stringify([{key:'compute',name:'Planned calculator',role:'Calculator',instructions:'Use calculator',objective:'Calculate 19 plus 23',toolIds:['tool-calculator'],requiredToolIds:['tool-calculator'],acceptanceCriteria:['42']} ]));await page.getByLabel('Swarm objective').fill('Verify the planned calculator result');await page.getByRole('button',{name:'Start swarm',exact:true}).click();await expect(page.getByText('Swarm verified: both specialists calculated 42.',{exact:true})).toBeVisible();const runs=await(await request.get('/api/swarms',{headers})).json();const r=runs.find((r:any)=>r.projectId===project.id);expect(r.status).toBe('completed');expect(r.nodes).toHaveLength(2);expect(r.budget.modelCalls).toBe(3);expect(r.events.some((e:any)=>e.type==='PLAN_COMPILED')).toBe(true);expect(r.nodes[1].requiredToolIds).toEqual(['tool-calculator']);
});

test('Deep Agents planning selection persists generated workflow and budget evidence',async({page,request})=>{
 const headers={Authorization:`Bearer ${token}`};const manager=await(await request.post('/api/agents',{headers,data:{displayName:'HarnessCoordinator',autonomyLevel:3,toolIds:['tool-calculator'],llmConfig:{provider:'ollama',model:'fixture',localEndpoint:'http://127.0.0.1:3328',temperature:0,maxTokens:1024}}})).json();const project=await(await request.post('/api/projects',{headers,data:{name:'Harness UI project',members:[]}})).json();
 await page.reload();await page.getByRole('button',{name:'AI Swarm',exact:true}).click();await page.getByLabel('Swarm coordinator').selectOption(manager.id);await page.getByLabel('Swarm project').selectOption(project.id);await page.getByLabel('Planning engine').selectOption('deepagents');await page.getByLabel('Swarm objective').fill('Delegate calculation of 19 plus 23 and report its evidence.');await page.getByRole('button',{name:'Start swarm',exact:true}).click();await expect(page.getByText('Swarm verified: both specialists calculated 42.',{exact:true})).toBeVisible();
 const runs=await(await request.get('/api/swarms',{headers})).json();const r=runs.find((r:any)=>r.projectId===project.id);expect(r.harness).toBe('deepagents');expect(r.harnessResult.harness).toBe('deepagents@1.14.0');expect(r.nodes).toHaveLength(2);expect(r.budget.modelCalls).toBe(4);expect(r.events.some((e:any)=>e.type==='HARNESS_DECISION')).toBe(true);
});
