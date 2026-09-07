import React from 'react';
import type { Task, ApprovalRequest } from '../types';

export function RunReviewView({ runs, approvals, onAction, onDecide, onSelectAgent }: {
  onSelectAgent?: (agentId: string, projectId: string) => void;
  runs: Task[]; approvals: ApprovalRequest[];
  onAction: (id: string, action: string, reason?: string) => Promise<void>;
  onDecide: (id: string, decision: 'approved' | 'rejected') => Promise<void>;
}) {
  return <div className="flex-1 p-6 overflow-auto bg-slate-50 space-y-4">
    <h1 className="text-xl font-semibold">Audit</h1>
    <p className="text-sm text-slate-600">Successful runs and delegated subtasks complete automatically. Request corrections through agent chat. Tool approval authorizes the displayed operation; it does not certify the content.</p>
    {!runs.length && <p>No runs yet. Send a request from chat to begin.</p>}
    {[...runs].reverse().map(run => <article id={`run-${run.id}`} key={run.id} className="border rounded-xl bg-white p-5 space-y-3">
      <div className="flex justify-between gap-4"><h2 className="font-semibold">{run.title}</h2><span className="font-mono text-sm">{run.status}</span></div>
      <p className="text-xs text-slate-500">{run.id} · {run.createdAt}</p>
      {(run as any).parentRunId && <p className="text-sm">Child of <a className="underline" href={`#run-${(run as any).parentRunId}`}>{(run as any).parentRunId}</a></p>}
      {(run as any).childRunIds?.length > 0 && <div className="text-sm">Subtasks: {(run as any).childRunIds.map((id: string) => <a key={id} className="underline mr-3" href={`#run-${id}`}>{id.slice(0,8)} · {runs.find(r => r.id === id)?.status || 'see persisted tree'}</a>)}</div>}
      {(run as any).treeBudget && <p className="text-xs">Shared tree: {(run as any).treeBudget.attempts}/12 model attempts · {(run as any).treeBudget.reservedOutputTokens}/12000 output tokens reserved · {(run as any).treeBudget.searchToolAttempts}/4 search tool attempts · deadline {new Date((run as any).treeBudget.deadline).toLocaleTimeString()}</p>}
      {(run as any).events?.filter((e: any) => e.payload?.delegationSelection).map((e: any) => <p key={e.id} className="text-sm"><strong>Delegated to {e.payload.delegationSelection.selectedAgentName}:</strong> {e.payload.delegationSelection.reason}</p>)}
      {run.result && <pre className="whitespace-pre-wrap text-sm max-h-80 overflow-auto border rounded p-3">{run.result}</pre>}
      {approvals.filter(a => a.taskId === run.id && a.status === 'pending').map(approval => <div key={approval.id} className="border border-amber-300 bg-amber-50 p-3 rounded space-y-2">
        <p>{approval.actionSummary}</p><pre className="whitespace-pre-wrap text-xs max-h-52 overflow-auto">{JSON.stringify(approval.details, null, 2)}</pre>
        <button className="px-3 py-1 border rounded mr-2" onClick={() => void onDecide(approval.id, 'approved')}>Approve exact operation</button>
        <button className="px-3 py-1 border rounded" onClick={() => void onDecide(approval.id, 'rejected')}>Reject</button>
      </div>)}
      {(run as any).capabilityBlock?.candidates?.map((candidate: any) => <button key={candidate.id} className="border rounded px-3 py-1 mr-2" onClick={() => onSelectAgent?.(candidate.id, run.projectId!)}>Select {candidate.name}{candidate.directSubordinate ? ' (subordinate)' : ''}</button>)}
      {(run as any).capabilityBlock && <p className="text-xs">Selection opens chat. Submit a new request explicitly; no tools are granted and no subordinate is run automatically.</p>}
      {run.status === 'blocked' && !(run as any).parentRunId && run.result?.startsWith('Interrupted by process restart.') && <button className="border rounded px-3 py-1" onClick={() => void onAction(run.id, 'resume')}>Resume interrupted run</button>}
      {['queued', 'working', 'waiting', 'waiting_children', 'reviewing', 'blocked'].includes(run.status) && <button className="border rounded px-3 py-1" onClick={() => void onAction(run.id, 'cancel')}>{(run as any).pilot ? 'Cancel entire task tree' : 'Cancel run'}</button>}
      <details><summary className="text-sm cursor-pointer">Execution receipts and events</summary><pre className="text-xs whitespace-pre-wrap max-h-80 overflow-auto">{JSON.stringify({ receipts: (run as any).receipts, events: (run as any).events, acceptance: (run as any).acceptance }, null, 2)}</pre></details>
    </article>)}
  </div>;
}
