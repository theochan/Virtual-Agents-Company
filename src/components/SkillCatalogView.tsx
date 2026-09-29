import React, { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck, TerminalSquare } from 'lucide-react';
import { api } from '../lib/api';

type Decision = { version: number; action: 'enabled' | 'disabled'; reason: string; createdAt: string };
type CatalogSkill = {
  id: string; name: string; description: string; category: string; permission: string;
  skillPath: string; sha256: string; upstreamRevision: string; licenseNotices: string[];
  inventoriedScripts: { path: string; sha256: string }[];
  documentationStatus: 'enabled' | 'disabled'; executableStatus: 'disabled';
  validation: string; currentDecision?: Decision;
  content?: string;
};
type CatalogResponse = {
  items: CatalogSkill[]; total: number; limit: number; offset: number; categories: string[];
  policy: { documentationActivationOnly: boolean; executableSkillsEnabled: number; executablePolicy: string };
};

export function SkillCatalogView() {
  const [result, setResult] = useState<CatalogResponse>();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<CatalogSkill>();
  const [history, setHistory] = useState<Decision[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const query = new URLSearchParams({ limit: '50' });
    if (search.trim()) query.set('search', search.trim());
    if (category) query.set('category', category);
    if (status) query.set('status', status);
    const next = await api<CatalogResponse>(`/api/skill-catalog?${query}`);
    setResult(next);
    setSelected(old => old ? next.items.find(item => item.id === old.id) : undefined);
  }, [search, category, status]);

  useEffect(() => { const timer = setTimeout(() => void refresh().catch(e => setError(String(e))), 150); return () => clearTimeout(timer); }, [refresh]);
  const open = async (skill: CatalogSkill) => {
    setReason(''); setError('');
    const detail = await api<CatalogSkill>(`/api/skill-catalog/${encodeURIComponent(skill.id)}`);
    setSelected(detail);
    setHistory(await api<Decision[]>(`/api/skill-catalog/${encodeURIComponent(skill.id)}/history`));
  };
  const decide = async (action: 'enable' | 'disable') => {
    if (!selected) return;
    setBusy(true); setError('');
    try {
      const next = await api<CatalogSkill>(`/api/skill-catalog/${encodeURIComponent(selected.id)}/${action}`, 'POST', { expectedSha256: selected.sha256, reason });
      setSelected(next); setReason('');
      setHistory(await api<Decision[]>(`/api/skill-catalog/${encodeURIComponent(selected.id)}/history`));
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Decision failed'); }
    finally { setBusy(false); }
  };

  return <section className="flex-1 min-w-0 overflow-y-auto bg-slate-50 p-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-slate-950">Skill catalog</h1>
        <p className="mt-1 text-sm text-slate-600">Review immutable vendored documentation. Catalog activation improves discovery only; it never authorizes scripts.</p>
      </header>
      {result?.policy && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="status">
        <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Execution remains fail-closed</div>
        <p className="mt-1">{result.policy.executablePolicy} Enabled executables: {result.policy.executableSkillsEnabled}.</p>
      </div>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
        <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><span className="sr-only">Search skills</span><input className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search skills" /></label>
        <select aria-label="Skill category" className="rounded-lg border border-slate-300 bg-white px-3 text-sm" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{result?.categories.map(value => <option key={value}>{value}</option>)}</select>
        <select aria-label="Documentation status" className="rounded-lg border border-slate-300 bg-white px-3 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="">All decisions</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select>
      </div>
      <p className="text-xs text-slate-500">Showing {result?.items.length || 0} of {result?.total || 0}. Refine the filters to inspect more than 50 matches.</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">{result?.items.map(skill => <button key={skill.id} onClick={() => void open(skill)} className={`w-full rounded-xl border bg-white p-4 text-left shadow-sm ${selected?.id === skill.id ? 'border-amber-500 ring-1 ring-amber-300' : 'border-slate-200 hover:border-slate-300'}`}>
          <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-950">{skill.name}</h2><p className="mt-1 line-clamp-2 text-sm text-slate-600">{skill.description}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs ${skill.documentationStatus === 'enabled' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{skill.documentationStatus}</span></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{skill.category}</span><span>•</span><span>{skill.permission}</span>{skill.inventoriedScripts.length > 0 && <><span>•</span><span>{skill.inventoriedScripts.length} blocked scripts</span></>}</div>
        </button>)}</div>
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          {!selected ? <p className="text-sm text-slate-500">Select a skill to inspect its provenance and record an owner decision.</p> : <div className="space-y-4">
            <div><h2 className="font-semibold">{selected.name}</h2><p className="mt-1 break-all font-mono text-[11px] text-slate-500">SHA-256 {selected.sha256}</p></div>
            <dl className="space-y-2 text-xs"><div><dt className="font-semibold text-slate-700">Upstream revision</dt><dd className="break-all font-mono text-slate-500">{selected.upstreamRevision}</dd></div><div><dt className="font-semibold text-slate-700">Source path</dt><dd className="break-all text-slate-500">{selected.skillPath}</dd></div><div><dt className="font-semibold text-slate-700">License notices</dt><dd className="text-slate-500">{selected.licenseNotices.join(', ') || 'None inventoried'}</dd></div></dl>
            {selected.content && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold">Reviewed document bytes</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-[11px] text-slate-600">{selected.content}</pre></details>}
            <div className="rounded-lg border border-slate-200 p-3 text-xs"><div className="flex items-center gap-2 font-semibold text-slate-800"><TerminalSquare className="h-4 w-4" />Executable content: disabled</div><p className="mt-1 text-slate-500">{selected.inventoriedScripts.length ? `${selected.inventoriedScripts.length} script(s) inventoried but not qualified.` : 'No scripts inventoried.'}</p></div>
            <label className="block text-xs font-semibold text-slate-700">Owner decision reason<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this documentation should be discoverable or retired." /></label>
            <div className="grid grid-cols-2 gap-2"><button disabled={busy || reason.trim().length < 8} onClick={() => void decide('enable')} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40">Enable docs</button><button disabled={busy || reason.trim().length < 8} onClick={() => void decide('disable')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">Disable docs</button></div>
            <div><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision history</h3>{history.length ? <ol className="mt-2 space-y-2">{[...history].reverse().map(item => <li key={item.version} className="border-l-2 border-slate-200 pl-3 text-xs"><span className="font-semibold">v{item.version} {item.action}</span><p className="text-slate-600">{item.reason}</p><time className="text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></li>)}</ol> : <p className="mt-2 text-xs text-slate-500">No owner decision recorded.</p>}</div>
          </div>}
        </aside>
      </div>
    </div>
  </section>;
}
