import React, { useEffect, useState } from 'react';

export function OperationsView() {
  const [state, setState] = useState<any>();
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      try {
        const response = await fetch('/api/ready');
        if (response.status === 401) { window.dispatchEvent(new Event('workspace-signed-out')); return; }
        const next = await response.json();
        if (!disposed) { setState(next); setError(''); }
      } catch { if (!disposed) setError('Cannot reach the workspace. Check the service and private operations log.'); }
    };
    void refresh(); const timer = setInterval(refresh, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, []);
  return <section className="flex-1 overflow-auto p-6 space-y-4">
    <h1 className="text-xl font-semibold">Operations</h1>
    <p className="text-sm">AI Swarm supports local Ollama coordination, temporary specialists and existing teams under shared resource limits. Manual chat remains available. Host scripts are disabled. Runtime readiness does not establish task accuracy or time savings.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {state && <>
      <p role="status">Runtime: {state.status}. Live model and search quality require separate evaluation.</p>
      {(!state.worker?.healthy || !state.swarm?.healthy || !state.storage?.writable) && <p role="alert" className="text-red-800">Runtime degraded. Review the last worker failure, overdue run leases and operations log. Preserve uncertain work before restarting.</p>}
      {state.worker?.expiredApprovals?.length > 0 && <p className="text-amber-800">Expired approvals need owner review. Cancel the affected runs; expired approval cannot authorize execution.</p>}
      <p className="text-sm">Request limits count attempts, including failures. They are not verified billing totals. Usage and exact prices can be unknown.</p>
      <pre className="whitespace-pre-wrap text-xs bg-slate-50 border rounded p-4">{JSON.stringify(state, null, 2)}</pre>
    </>}
  </section>;
}
