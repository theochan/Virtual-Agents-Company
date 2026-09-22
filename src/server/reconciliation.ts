import { z } from 'zod';
import { createHash } from 'node:crypto';

// Amounts are signed integer minor units. A credit reverses that sign; no floats,
// FX conversion, inferred classifications or model-supplied source subsets.
const label = z.string().min(1).max(100);
export const accountingRecordSchema = z.object({
  id: label, entity: label, currency: z.string().regex(/^[A-Z]{3}$/),
  unit: z.literal('minor'), type: z.enum(['invoice', 'credit']),
  amount: z.number().int().safe(),
}).strict();
export const accountingSourceSchema = z.object({ records: z.array(accountingRecordSchema).min(1).max(1000) }).strict();
export interface AccountingSource { name: string; version: number; sha256: string; text: string }
const referenceSchema = z.object({ name: z.string().min(1).max(160), version: z.number().int().positive(), sha256: z.string().regex(/^[a-f0-9]{64}$/), row: z.number().int().positive() }).strict();
const ledgerRowSchema = accountingRecordSchema.extend({ source: referenceSchema, disposition: z.enum(['include','duplicate']), duplicateOf: referenceSchema.optional(), signedAmount: z.number().int().safe() }).strict();
const totalSchema = z.object({ entity: label, currency: z.string().regex(/^[A-Z]{3}$/), unit: z.literal('minor'), amount: z.number().int().safe() }).strict();
export const reconciliationResultSchema = z.object({ rows: z.array(ledgerRowSchema).min(1).max(1000), totals: z.array(totalSchema).min(1).max(1000) }).strict();
export type ReconciliationResult = z.infer<typeof reconciliationResultSchema>;
const key = (v: unknown) => JSON.stringify(v);
const refKey = (v: z.infer<typeof referenceSchema>) => key([v.name,v.version,v.sha256,v.row]);
const totalKey = (v: z.infer<typeof totalSchema>) => key([v.entity,v.currency,v.unit]);

export function reconcileSources(sources: AccountingSource[]): ReconciliationResult {
  if (!sources.length || sources.length > 20 || new Set(sources.map(s=>s.name)).size !== sources.length) throw new Error('Unique accounting sources required');
  if (sources.reduce((sum,s)=>sum+Buffer.byteLength(s.text),0)>256000) throw new Error('Accounting source envelope exceeded');
  const rows: ReconciliationResult['rows'] = [], identities = new Map<string, ReconciliationResult['rows'][number]>();
  const totals = new Map<string,{entity:string;currency:string;unit:'minor';amount:bigint}>();
  for (const source of [...sources].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)) {
    if (createHash('sha256').update(source.text).digest('hex') !== source.sha256) throw new Error('Accounting source hash mismatch');
    const records = accountingSourceSchema.parse(JSON.parse(source.text)).records;
    for (const [index, record] of records.entries()) {
      if (rows.length>=1000) throw new Error('Accounting row envelope exceeded');
      const ref = referenceSchema.parse({name:source.name,version:source.version,sha256:source.sha256,row:index+1});
      // Identity is entity + record ID, so changed currency/type/amount conflicts.
      const identity = key([record.entity,record.id]), previous = identities.get(identity);
      if (previous && ['currency','unit','type','amount'].some(field=>previous[field]!==record[field])) throw new Error('Conflicting duplicate accounting identity');
      const signedAmount = record.type==='credit' ? -record.amount : record.amount;
      const row: ReconciliationResult['rows'][number] = {...record,source:ref,disposition:previous?'duplicate':'include',...(previous?{duplicateOf:previous.source}:{}),signedAmount:previous?0:signedAmount};
      rows.push(row);
      if (!previous) {
        identities.set(identity,row);
        const k=key([record.entity,record.currency,record.unit]);
        const total=totals.get(k)||{entity:record.entity,currency:record.currency,unit:record.unit,amount:0n};
        total.amount+=BigInt(signedAmount);totals.set(k,total);
      }
    }
  }
  return reconciliationResultSchema.parse({rows,totals:[...totals.values()].map(t=>{
    if(t.amount>BigInt(Number.MAX_SAFE_INTEGER)||t.amount<BigInt(Number.MIN_SAFE_INTEGER))throw new Error('Accounting total exceeds safe integer range');
    return {...t,amount:Number(t.amount)};
  }).sort((a,b)=>totalKey(a)<totalKey(b)?-1:totalKey(a)>totalKey(b)?1:0)});
}

export function verifyReconciliation(raw: unknown, expected: ReconciliationResult) {
  const result=reconciliationResultSchema.parse(raw);
  const expectedRows=new Map(expected.rows.map(row=>[refKey(row.source),row]));
  if(result.rows.length!==expected.rows.length)throw new Error('Incomplete source-row coverage');
  for(const row of result.rows){const k=refKey(row.source),original=expectedRows.get(k);
    // Schema parsing canonicalizes field order before comparison.
    if(!original||key(row)!==key(ledgerRowSchema.parse(original)))throw new Error('Altered, overlapping or unknown source row');
    expectedRows.delete(k);
  }
  const expectedTotals=new Map(expected.totals.map(t=>[totalKey(t),t.amount]));
  if(result.totals.length!==expectedTotals.size)throw new Error('Incomplete accounting totals');
  for(const total of result.totals){const k=totalKey(total);if(!expectedTotals.has(k)||expectedTotals.get(k)!==total.amount)throw new Error('Incorrect accounting total or unit');expectedTotals.delete(k);}
  return result;
}

// Specialist partitions contain full typed rows, not unverifiable subtotal claims.
export function verifyPartitions(raw: unknown[], expected: ReconciliationResult) {
  const partitions=raw.map(value=>z.object({rows:z.array(ledgerRowSchema).min(1).max(1000)}).strict().parse(value));
  verifyReconciliation({rows:partitions.flatMap(p=>p.rows),totals:expected.totals},expected);
}
