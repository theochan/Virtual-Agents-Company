import {reconciliationResultSchema} from '../../src/server/reconciliation';
export function ledgerChecks(content:unknown,expected:{totals:unknown;rows:number;duplicates:number}){
 const parsed=reconciliationResultSchema.safeParse(content);
 if(!parsed.success)return {schema:false,totals:false,rows:false,duplicates:false,error:'Artifact does not satisfy the reconciliation ledger schema'};
 const ledger=parsed.data;
 return {schema:true,totals:JSON.stringify(ledger.totals.map(t=>[t.entity,t.currency,t.amount]))===JSON.stringify(expected.totals),rows:ledger.rows.length===expected.rows,duplicates:ledger.rows.filter(r=>r.disposition==='duplicate').length===expected.duplicates};
}
