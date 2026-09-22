import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { reconcileSources, verifyReconciliation, verifyPartitions } from '../src/server/reconciliation';
const record=(id:string,amount:number,extra:any={})=>({id,entity:'North',currency:'USD',unit:'minor',type:'invoice',amount,...extra});
const source=(name:string,records:any[])=>{const text=JSON.stringify({records});return {name,version:1,text,sha256:createHash('sha256').update(text).digest('hex')};};

test('reconciliation accounts for every row with cross-file duplicates and signed credits',()=>{
 const result=reconcileSources([source('b.json',[record('N2',7300),record('S1',9200,{entity:'South'}),record('S2',4800,{entity:'South'}),record('S3',650,{entity:'South',type:'credit'})]),source('a.json',[record('N1',12500),record('N2',7300),record('N3',1800,{type:'credit'})])]);
 assert.deepEqual(result.totals.map(t=>t.amount),[18000,13350]);assert.equal(result.rows.length,7);
 const duplicate=result.rows.find(r=>r.disposition==='duplicate')!;assert.equal(duplicate.source.name,'b.json');assert.equal(duplicate.duplicateOf?.name,'a.json');assert.equal(duplicate.signedAmount,0);
 assert.doesNotThrow(()=>verifyReconciliation({...result,rows:[...result.rows].reverse(),totals:[...result.totals].reverse()},result));
 assert.doesNotThrow(()=>verifyPartitions([{rows:result.rows.slice(0,3)},{rows:result.rows.slice(3)}],result));
});

test('reordered source rows preserve totals; zero, negatives and separate currencies are explicit',()=>{
 const records=[record('zero',0),record('negative',-100),record('credit',-50,{type:'credit'}),record('eur',30,{currency:'EUR'})];
 const a=reconcileSources([source('a.json',records)]),b=reconcileSources([source('a.json',[...records].reverse())]);
 assert.deepEqual(a.totals,b.totals);assert.deepEqual(a.totals.map(t=>[t.currency,t.amount]),[['EUR',30],['USD',-50]]);
 assert.notEqual(a.rows[0].source.sha256,b.rows[0].source.sha256);
});

test('conflicts, uncertain types, invalid units, floats, unsafe totals and hash mismatches fail closed',()=>{
 for(const extra of [{amount:2},{currency:'EUR'},{type:'credit'}])assert.throws(()=>reconcileSources([source('a.json',[record('x',1)]),source('b.json',[record('x',1,extra)])]),/Conflicting/);
 for(const extra of [{type:'unknown'},{unit:'dollars'},{amount:0.1},{amount:Number.MAX_SAFE_INTEGER+1}])assert.throws(()=>reconcileSources([source('a.json',[record('x',1,extra)])]));
 assert.throws(()=>reconcileSources([source('a.json',[record('x',Number.MAX_SAFE_INTEGER),record('y',1)])]),/safe integer/);
 const input=source('a.json',[record('x',1)]);assert.throws(()=>reconcileSources([{...input,sha256:'0'.repeat(64)}]),/hash mismatch/);
 assert.throws(()=>reconcileSources([input,input]),/Unique/);
});

test('matching totals cannot conceal omitted offsetting rows, overlap or altered provenance',()=>{
 const expected=reconcileSources([source('a.json',[record('a',100),record('b',100,{type:'credit'}),record('c',50)])]);
 const variants=[{...expected,rows:expected.rows.slice(2)}, {...expected,rows:[expected.rows[0],expected.rows[0],expected.rows[2]]}, {...expected,rows:expected.rows.map((r,i)=>i? r:{...r,source:{...r.source,version:2}})}, {...expected,totals:expected.totals.map(t=>({...t,amount:51}))}];
 for(const variant of variants)assert.throws(()=>verifyReconciliation(variant,expected));
 assert.throws(()=>verifyPartitions([{rows:expected.rows.slice(0,2)},{rows:expected.rows.slice(1)}],expected));
 assert.throws(()=>verifyPartitions([{rows:expected.rows.slice(2)}],expected));
});
