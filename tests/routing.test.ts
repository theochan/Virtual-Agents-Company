import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_AGENTS } from '../src/data/initialData';
import { routeSubordinate, subordinateProfile, validateSubordinate } from '../src/server/delegation';
const emma = {...structuredClone(INITIAL_AGENTS[0]), id:'agent-emma', displayName:'Emma', jobTitle:'Senior Research Analyst', department:'Market Research', expertise:['Company research'], primaryResponsibility:'Research public companies', secondaryResponsibilities:['Verify sources']};
const marcus = {...emma, id:'agent-marcus', displayName:'Marcus', jobTitle:'Software Architect', department:'Engineering', expertise:['Software architecture']};
const candidates = [marcus,emma];
test('finance routes to Emma even when the model proposes Marcus; engineering routes to Marcus',()=>{
 for(const q of ['BKNG share price','company research on AMD','financial analysis of a company']) {const r=routeSubordinate(q,candidates,marcus.id);assert.equal(r.agent.id,emma.id);assert.match(r.reason,/research/);}
 assert.equal(routeSubordinate('Design software architecture',candidates,emma.id).agent.id,marcus.id);
});
test('ambiguous or mixed requests retain the model choice, explicit user naming wins, unavailable specialists do not gain access',()=>{
 for(const q of ['Investigate this company','Research share price API design'])assert.equal(routeSubordinate(q,candidates,emma.id).agent.id,emma.id);
 assert.equal(routeSubordinate('Marcus, find the share price',candidates,emma.id).agent.id,marcus.id);
 assert.equal(routeSubordinate('Find the share price',[marcus],marcus.id).agent.id,marcus.id);
 assert.throws(()=>routeSubordinate('share price',[emma],marcus.id),/not eligible/);
});
test('subordinate context carries role, expertise and responsibilities',()=>{
 const p=subordinateProfile(emma);assert.equal(p.role,'Senior Research Analyst');assert.deepEqual(p.expertise,['Company research']);assert.deepEqual(p.responsibilities,['Research public companies','Verify sources']);
});
