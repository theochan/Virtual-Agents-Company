import React, { useEffect, useState } from 'react';
import App from '../App';

export function WorkspaceGate() {
  const [signedIn, setSignedIn] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/session').then(r => r.json()).then(data => setSignedIn(data.authenticated)).catch(() => setError('Workspace server is unavailable.')); }, []);
  useEffect(() => { const expired = () => setSignedIn(false); window.addEventListener('workspace-signed-out', expired); return () => window.removeEventListener('workspace-signed-out', expired); }, []);
  if (signedIn) return <App />;
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <form className="w-full max-w-md bg-white border rounded-xl p-8 space-y-4" onSubmit={async event => {
      event.preventDefault(); setError('');
      try {
        const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setToken(''); setSignedIn(true);
      } catch (e) { setError(e instanceof Error ? e.message : 'Sign-in failed'); }
    }}>
      <h1 className="text-xl font-semibold">Unlock your workspace</h1>
      <p className="text-sm text-slate-600">Use the access token in the file shown by the server at startup, or your configured workspace token.</p>
      <label className="block text-sm">Workspace access token<input type="password" autoComplete="current-password" required value={token} onChange={e => setToken(e.target.value)} className="block w-full border rounded p-2 mt-1" /></label>
      {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
      <button className="bg-slate-900 text-white rounded px-4 py-2">Sign in</button>
    </form>
  </main>;
}
