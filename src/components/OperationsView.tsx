import React, { useEffect, useState } from 'react';

export function OperationsView() {
  const [state, setState] = useState<any>();
  const [diagnostics, setDiagnostics] = useState<any>();
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const [response, diagnosticsResponse] = await Promise.all([fetch('/api/ready'), fetch('/api/setup/diagnostics')]);
        if (response.status === 401) { window.dispatchEvent(new Event('workspace-signed-out')); return; }
        if (!response.ok || !diagnosticsResponse.ok) throw new Error('diagnostics failed');
        const next = await response.json();
        const nextDiagnostics = await diagnosticsResponse.json();
        if (!disposed) { setState(next); setDiagnostics(nextDiagnostics); setError(''); }
      } catch { if (!disposed) setError('Cannot reach the workspace. Check the service and private operations log.'); }
    };
    void refresh(); const timer = setInterval(refresh, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, []);
  return <section className="flex-1 overflow-auto p-6 space-y-4">
    <h1 className="text-xl font-semibold">Operations</h1>
    <p className="text-sm">AI Swarm supports local Ollama coordination, temporary specialists and existing teams under shared resource limits. Manual chat remains available. Host scripts are disabled. Runtime readiness does not establish task accuracy or time savings.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {diagnostics && <section aria-labelledby="setup-diagnostics" className="space-y-4">
      <div className="flex items-center justify-between gap-4"><div><h2 id="setup-diagnostics" className="font-semibold">First-run capability diagnostics</h2><p className="text-xs text-slate-500">Checked {new Date(diagnostics.checkedAt).toLocaleString()}. Presence checks do not prove model quality or business-task accuracy.</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${diagnostics.status === 'ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{diagnostics.status}</span></div>
      <div className="grid gap-3 md:grid-cols-2">{diagnostics.checks.map((check: any) => <article key={check.id} className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{check.label}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${check.status === 'pass' ? 'bg-emerald-100 text-emerald-800' : check.status === 'warn' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-800'}`}>{check.status}</span></div>
        <p className="mt-2 text-xs text-slate-600">{check.detail}</p>{check.remediation && <p className="mt-2 rounded bg-slate-50 p-2 text-xs font-medium text-slate-800">Next: {check.remediation}</p>}
      </article>)}</div>
      <div className="rounded-xl border bg-white p-4"><h3 className="text-sm font-semibold">Safe update contract</h3><p className="mt-1 text-xs text-slate-600">Updates are deliberately manual. VAC will not overwrite the running release or claim rollback safety without a verified backup and staged smoke test.</p><ol className="mt-3 grid gap-2 md:grid-cols-2">{diagnostics.updateWorkflow.stages.map((stage: any) => <li key={stage.order} className="rounded-lg bg-slate-50 p-3 text-xs"><strong>{stage.order}. {stage.name}</strong><p className="mt-1 text-slate-600">{stage.evidence}</p></li>)}</ol></div>
    </section>}
    {state && <>
      <p role="status">Runtime: {state.status}. Live model and search quality require separate evaluation.</p>
      {(!state.worker?.healthy || !state.swarm?.healthy || !state.storage?.writable) && <p role="alert" className="text-red-800">Runtime degraded. Review the last worker failure, overdue run leases and operations log. Preserve uncertain work before restarting.</p>}
      {state.worker?.expiredApprovals?.length > 0 && <p className="text-amber-800">Expired approvals need owner review. Cancel the affected runs; expired approval cannot authorize execution.</p>}
      <p className="text-sm">Request limits count attempts, including failures. They are not verified billing totals. Usage and exact prices can be unknown.</p>
      <pre className="whitespace-pre-wrap text-xs bg-slate-50 border rounded p-4">{JSON.stringify(state, null, 2)}</pre>
    </>}
  </section>;
}
