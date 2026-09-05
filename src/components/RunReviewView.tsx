import React, { useState } from 'react';
import type { Task, ApprovalRequest } from '../types';

export function RunReviewView({ runs, approvals, onAction, onDecide }: {
  runs: Task[]; approvals: ApprovalRequest[];
  onAction: (id: string, action: string, reason?: string) => Promise<void>;
  onDecide: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return <div className="flex-1 p-6 overflow-auto bg-slate-50 space-y-4">
    <h1 className="text-xl font-semibold">Runs and evidence</h1>
    <p className="text-sm text-slate-600">Single-agent runs. Drafts require your acceptance. Tool approval authorizes the displayed operation; it does not certify the content.</p>
    {!runs.length && <p>No runs yet. Send a request from chat to begin.</p>}
    {[...runs].reverse().map(run => <article key={run.id} className="border rounded-xl bg-white p-5 space-y-3">
      <div className="flex justify-between gap-4"><h2 className="font-semibold">{run.title}</h2><span className="font-mono text-sm">{run.status}</span></div>
      <p className="text-xs text-slate-500">{run.id} · {run.createdAt}</p>
      {run.result && <pre className="whitespace-pre-wrap text-sm max-h-80 overflow-auto border rounded p-3">{run.result}</pre>}
      {approvals.filter(a => a.taskId === run.id && a.status === 'pending').map(approval => <div key={approval.id} className="border border-amber-300 bg-amber-50 p-3 rounded space-y-2">
        <p>{approval.actionSummary}</p><pre className="whitespace-pre-wrap text-xs max-h-52 overflow-auto">{JSON.stringify(approval.details, null, 2)}</pre>
        <button className="px-3 py-1 border rounded mr-2" onClick={() => void onDecide(approval.id, 'approved')}>Approve exact operation</button>
        <button className="px-3 py-1 border rounded" onClick={() => void onDecide(approval.id, 'rejected')}>Reject</button>
      </div>)}
      {run.status === 'reviewing' && <div className="flex gap-2">
        <input aria-label="Acceptance evidence" placeholder="Why does this satisfy your request?" value={reasons[run.id] || ''} onChange={e => setReasons({ ...reasons, [run.id]: e.target.value })} className="border rounded p-2 flex-1" />
        <button disabled={!reasons[run.id]?.trim()} className="bg-slate-900 text-white px-3 rounded disabled:opacity-40" onClick={() => void onAction(run.id, 'accept', reasons[run.id])}>Accept deliverable</button>
      </div>}
      {run.status === 'blocked' && run.result?.startsWith('Interrupted by process restart.') && <button className="border rounded px-3 py-1" onClick={() => void onAction(run.id, 'resume')}>Resume interrupted run</button>}
      {['queued', 'working', 'waiting', 'reviewing', 'blocked'].includes(run.status) && <button className="border rounded px-3 py-1" onClick={() => void onAction(run.id, 'cancel')}>Cancel run</button>}
      <details><summary className="text-sm cursor-pointer">Execution receipts and events</summary><pre className="text-xs whitespace-pre-wrap max-h-80 overflow-auto">{JSON.stringify({ receipts: (run as any).receipts, events: (run as any).events, acceptance: (run as any).acceptance }, null, 2)}</pre></details>
    </article>)}
  </div>;
}
