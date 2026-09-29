import React, { useCallback, useEffect, useState } from 'react';
import { BellRing, Check, ExternalLink, X } from 'lucide-react';
import { api } from '../lib/api';

type AttentionItem = {
  id: string; kind: string; sourceId: string; title: string; detail: string;
  severity: 'urgent' | 'action' | 'info'; createdAt: string; read: boolean; dismissible: boolean;
  sourceTab: 'runs' | 'swarm' | 'skills';
};
type Response = { items: AttentionItem[]; counts: { total: number; unread: number; urgent: number } };

export function AttentionInboxView({ onNavigate, onChanged }: { onNavigate: (tab: 'runs' | 'swarm' | 'skills') => void; onChanged: () => void }) {
  const [result, setResult] = useState<Response>();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [kind, setKind] = useState('');
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const query = new URLSearchParams(); if (unreadOnly) query.set('unread', '1'); if (kind) query.set('kind', kind);
    setResult(await api<Response>(`/api/attention?${query}`));
  }, [unreadOnly, kind]);
  useEffect(() => { void refresh().catch(e => setError(String(e))); }, [refresh]);
  const state = async (item: AttentionItem, action: 'read' | 'unread' | 'dismiss') => {
    try { await api('/api/attention/state', 'POST', { itemId: item.id, action }); await refresh(); onChanged(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Inbox update failed'); }
  };
  const decide = async (item: AttentionItem, decision: 'approved' | 'rejected') => {
    try {
      const url = item.kind === 'approval' ? `/api/approvals/${encodeURIComponent(item.sourceId)}` : `/api/swarm-approvals/${encodeURIComponent(item.sourceId)}/decision`;
      await api(url, 'POST', { decision }); await refresh(); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'Decision failed'); }
  };
  const open = async (item: AttentionItem) => { if (!item.read) await state(item, 'read'); onNavigate(item.sourceTab); };
  const kinds = Array.from(new Set<string>(result?.items.map(item => item.kind) || []));
  return <section className="flex-1 overflow-y-auto bg-slate-50 p-6"><div className="mx-auto max-w-5xl space-y-5">
    <header className="flex items-start justify-between gap-4"><div><h1 className="flex items-center gap-2 text-xl font-semibold"><BellRing className="h-5 w-5 text-amber-600" />Attention inbox</h1><p className="mt-1 text-sm text-slate-600">One queue for approvals, blocked work, completed outcomes, skill drafts, and semantic review. Source evidence stays in its original record.</p></div>{result && <div className="flex gap-2 text-xs"><span className="rounded-full bg-red-100 px-2 py-1 text-red-800">{result.counts.urgent} urgent</span><span className="rounded-full bg-slate-200 px-2 py-1">{result.counts.unread} unread</span></div>}</header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} />Unread only</label><select aria-label="Attention type" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={kind} onChange={event => setKind(event.target.value)}><option value="">All types</option>{kinds.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div>
    <div className="space-y-3">{result?.items.map(item => <article key={item.id} className={`rounded-xl border bg-white p-4 shadow-sm ${item.read ? 'border-slate-200 opacity-80' : item.severity === 'urgent' ? 'border-red-300' : 'border-amber-300'}`}>
      <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className={`rounded-full px-2 py-0.5 text-[11px] ${item.severity === 'urgent' ? 'bg-red-100 text-red-800' : item.severity === 'action' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'}`}>{item.severity}</span>{!item.read && <span className="text-[11px] font-semibold text-amber-700">unread</span>}</div><p className="mt-1 text-sm text-slate-600">{item.detail}</p><p className="mt-2 text-xs text-slate-400">{item.kind.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleString()}</p></div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">{['approval', 'swarm_approval'].includes(item.kind) && <><button aria-label={`Approve ${item.title}`} onClick={() => void decide(item, 'approved')} className="rounded-lg bg-emerald-700 p-2 text-white"><Check className="h-4 w-4" /></button><button aria-label={`Reject ${item.title}`} onClick={() => void decide(item, 'rejected')} className="rounded-lg bg-red-700 p-2 text-white"><X className="h-4 w-4" /></button></>}<button onClick={() => void open(item)} className="flex items-center gap-1 rounded-lg border px-3 py-2 text-xs"><ExternalLink className="h-3.5 w-3.5" />Open</button>{item.dismissible && <button onClick={() => void state(item, 'dismiss')} className="rounded-lg border px-3 py-2 text-xs">Dismiss</button>}</div>
      </div>
    </article>)}{result?.items.length === 0 && <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500">No attention items match these filters.</p>}</div>
  </div></section>;
}
