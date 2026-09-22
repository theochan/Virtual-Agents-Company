import fs from 'node:fs';
import path from 'node:path';
import { Store } from './store';

/** Operational logs deliberately exclude prompts, arguments, credentials and raw errors. */
export class OperationsLog {
  private file: string;
  constructor(directory: string, private maxBytes = 1_000_000) { this.file = path.join(directory, 'operations.jsonl'); }
  record(event: string, fields: { runId?: string; requestId?: string; status?: number | string; durationMs?: number } = {}) {
    try {
      if (fs.existsSync(this.file) && fs.statSync(this.file).size >= this.maxBytes) {
        for (let n = 2; n >= 1; n--) {
          const old = `${this.file}.${n}`;
          if (fs.existsSync(old)) fs.renameSync(old, `${this.file}.${n + 1}`);
        }
        fs.renameSync(this.file, `${this.file}.1`);
      }
      fs.appendFileSync(this.file, JSON.stringify({ at: new Date().toISOString(), event, ...fields }) + '\n', { mode: 0o600 });
    } catch { console.error('Operational log write failed'); }
  }
}

/** Reserve request attempts before external access; unknown billing is never refunded. */
export class RequestBudgetError extends Error {
  constructor(category: 'inference' | 'search', maximum: number) {
    const guidance = category === 'search' && maximum === 0
      ? ' Paid search and Test Connection are disabled locally. Set VAC_SEARCH_REQUESTS_PER_DAY to an approved positive limit in .env and restart VAC.'
      : ' The daily allowance resets at midnight UTC.';
    super(`${category} daily request budget exhausted (${maximum}); no external request sent.${guidance}`);
    this.name = 'RequestBudgetError';
  }
}

export function requestLimit(category: 'inference' | 'search'): number | null {
  const name = category === 'search' ? 'VAC_SEARCH_REQUESTS_PER_DAY' : 'VAC_INFERENCE_REQUESTS_PER_DAY';
  const raw = process.env[name] ?? (category === 'search' ? '0' : '100');
  if (raw === 'unlimited') return null;
  const maximum = Number(raw);
  if (!Number.isSafeInteger(maximum) || maximum < 0 || maximum > 10000) throw new Error(`Invalid ${name}: expected unlimited or integer 0..10000`);
  return maximum;
}
export function remainingRequestBudget(store:Store,category:'inference'|'search'){
  store=store.requestBudgetStore||store;
  const maximum=requestLimit(category),day=new Date().toISOString().slice(0,10);
  const used=store.get<{count:number}>('request-budgets',`${day}:${category}`)?.count||0;
  return {day,used,maximum,remaining:maximum===null?null:Math.max(0,maximum-used)};
}
export function reserveRequest(store: Store, category: 'inference' | 'search') {
  store = store.requestBudgetStore || store;
  const maximum = requestLimit(category);
  return store.transaction(() => {
    const day = new Date().toISOString().slice(0, 10);
    const id = `${day}:${category}`;
    const usage = store.get<{ count: number }>('request-budgets', id) || { count: 0 };
    if (maximum !== null && usage.count >= maximum) throw new RequestBudgetError(category, maximum);
    store.put('request-budgets', id, { count: usage.count + 1, maximum, day, category });
    return { day, reservedAttempt: usage.count + 1, maximum };
  });
}
