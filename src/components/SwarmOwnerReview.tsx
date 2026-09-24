import React, { useState } from 'react';
import { api } from '../lib/api';

type Check = { criterion: number; verdict: 'pass' | 'fail' | 'inconclusive'; reason: string };
type Context = {
  revision: string; policy: { criteria: string[] }; machineReview: { passed?: boolean };
  files: { name: string; version: number; latestVersion: number; sha256: string; role: string; text: string }[];
  history: { id: string; createdAt: string; verdict: string; checks: Check[] }[];
};

export function SwarmOwnerReview({ runId }: { runId: string }) {
  const [context, setContext] = useState<Context>();
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false);
  async function load() {
    const next = await api<Context>(`/api/swarms/${runId}/owner-review`);
    setContext(next); setChecks(next.policy.criteria.map((_, criterion) => ({ criterion, verdict: 'inconclusive', reason: '' })));
  }
  async function act(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  return <section aria-label="Owner semantic review" className="bg-white border rounded-2xl p-5 space-y-3">
    <h2 className="font-semibold">Owner assessment</h2>
    <p className="text-sm">Inspect the source and output versions used by the reviewer, then judge each criterion. Your assessment is recorded separately. It does not resume execution or change the automated verdict.</p>
    <button className="underline text-sm" disabled={busy} onClick={() => void act(async () => { setSaved(false); await load(); })}>{context ? 'Reload review evidence' : 'Inspect review evidence'}</button>
    {error && <p role="alert" className="text-red-800 text-sm">{error}</p>}
    {saved && <p role="status">Owner assessment saved.</p>}
    {context && <>
      <p className="text-sm">Automated verdict: {context.machineReview.passed ? 'passed' : 'not accepted'}</p>
      {context.files.map(file => <details key={file.name} className="border rounded p-3">
        <summary className="cursor-pointer text-sm break-all">{file.role}: {file.name} · version {file.version}{file.latestVersion !== file.version ? ` (latest is ${file.latestVersion}; reviewing the original)` : ''}</summary>
        <p className="text-xs break-all my-2">SHA-256: {file.sha256}</p>
        <pre className="text-xs whitespace-pre-wrap break-words max-h-80 overflow-auto">{file.text}</pre>
      </details>)}
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void act(async () => {
        await api(`/api/swarms/${runId}/owner-review`, 'POST', { revision: context.revision, checks });
        await load(); setSaved(true);
      }); }}>
        {context.policy.criteria.map((criterion, index) => <fieldset key={index} className="space-y-2">
          <legend className="text-sm font-medium">{index + 1}. {criterion}</legend>
          <label className="block text-sm">Judgment {index + 1}<select className="block border rounded p-2 w-full" value={checks[index]?.verdict} onChange={e => setChecks(old => old.map((c, i) => i === index ? { ...c, verdict: e.target.value as Check['verdict'] } : c))}>
            <option value="inconclusive">Inconclusive</option><option value="pass">Pass</option><option value="fail">Fail</option>
          </select></label>
          <label className="block text-sm">Evidence and reasoning {index + 1}<textarea required minLength={10} maxLength={2000} rows={3} className="block border rounded p-2 w-full" value={checks[index]?.reason || ''} onChange={e => setChecks(old => old.map((c, i) => i === index ? { ...c, reason: e.target.value } : c))}/></label>
        </fieldset>)}
        <button disabled={busy || checks.some(c => c.reason.trim().length < 10)} className="bg-slate-900 text-white rounded px-3 py-2 disabled:opacity-40">Record owner assessment</button>
      </form>
      <h3 className="text-sm font-semibold">Assessment history</h3>
      {!context.history.length && <p className="text-xs">No owner assessment recorded.</p>}
      {context.history.map(entry => <article key={entry.id} className="border-t pt-2 text-xs">
        <p>{entry.createdAt} · Owner: {entry.verdict}</p>
        {entry.checks.map(check => <p key={check.criterion} className="whitespace-pre-wrap break-words">Criterion {check.criterion + 1}: {check.verdict} — {check.reason}</p>)}
      </article>)}
    </>}
  </section>;
}
