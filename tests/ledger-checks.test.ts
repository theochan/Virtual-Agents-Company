import {test} from 'node:test';import assert from 'node:assert/strict';
import {ledgerChecks} from '../scripts/evaluation/ledger-checks';
test('evaluator rejects malformed ledger without hiding other evidence or throwing',()=>{
 for(const value of [undefined,null,{}, {contract:'ledger.json',sources:[]}, {totals:7,rows:[]}]){
  const r=ledgerChecks(value,{totals:[],rows:4,duplicates:1});assert.equal(r.schema,false);assert.equal(r.totals,false);assert.ok(r.error);
 }
});
