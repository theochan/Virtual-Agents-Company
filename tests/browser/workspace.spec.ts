import { test, expect } from '@playwright/test';
const token = 'browser-fixture-owner-token-00000000000000';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Workspace access token').fill(token);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
});
test('sign-out returns to the locked workspace and readiness UI displays runtime state', async ({ page }) => {
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
test('real UI submission, approval, acceptance and provider failure preserve truthful outcomes', async ({ page, request }) => {
  const headers = { Authorization: `Bearer ${token}` };
  const agents = await (await request.get('/api/agents', { headers })).json(); const agent = agents[0];
  await request.patch(`/api/agents/${agent.id}`, { headers, data: { autonomyLevel: 3, toolIds: ['tool-doc-gen'] } });
  await request.patch(`/api/agents/${agent.id}/llm`, { headers, data: { provider: 'openai', model: 'fixture', localEndpoint: 'http://127.0.0.1:3328/v1', temperature: 0, maxTokens: 128 } });
  await page.getByLabel('Message', { exact: true }).fill('SAVE_DOCUMENT');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: /Runs and approvals/ }).click();
  await page.getByRole('button', { name: 'Approve exact operation' }).click();
  await page.getByLabel('Acceptance evidence').fill('Matches the fixture deliverable and saved artifact.');
  await page.getByRole('button', { name: 'Accept deliverable' }).click();
  await expect(page.getByText('completed', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Message', { exact: true }).fill('PROVIDER_FAIL');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: /Runs and approvals/ }).click();
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
  await page.getByRole('button', { name: /Runs and approvals/ }).click();
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
 await page.getByRole('button',{name:/Runs and approvals/}).click();
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
 await expect.poll(async()=>((await(await request.get(`/api/runs/${result.run.id}`,{headers})).json()).status)).toBe('reviewing');
 const tree=await(await request.get(`/api/runs/${result.run.id}/tree`,{headers})).json();expect(tree.children).toHaveLength(1);expect(tree.children[0].leadAgentId).toBe(child.id);expect(tree.children[0].parentRunId).toBe(result.run.id);expect(tree.root.receipts.some((r:any)=>r.toolId==='tool-delegate')).toBe(true);
 await page.getByRole('button',{name:/Runs and approvals/}).click();await expect(page.getByText('Child of',{exact:false})).toBeVisible();await expect(page.getByText(/Shared tree:/).first()).toBeVisible();
 await page.getByRole('button',{name:/^Team/}).click();await expect(page.getByRole('heading',{name:'Team hierarchy'})).toBeVisible();await expect(page.getByRole('button',{name:'DelegationChild',exact:true})).toBeVisible();await expect(page.getByText(/Delegation: permitted/)).toBeVisible();await expect(page.getByTestId('hierarchy-connectors').first()).toBeVisible();const priorZoom=await page.getByText(/^Zoom \d+%$/).textContent();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await expect(page.getByText(/^Zoom \d+%$/)).not.toHaveText(priorZoom!);await page.getByRole('button',{name:'Fit hierarchy',exact:true}).click();await page.screenshot({path:testInfo.outputPath('team-hierarchy.png'),fullPage:true});
});
