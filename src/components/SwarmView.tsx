import { SwarmOwnerReview } from './SwarmOwnerReview';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, ChevronRight, Clock3, FileText, FolderKanban, Network, Paperclip, ShieldCheck, Square } from 'lucide-react';
import type { Agent, Project } from '../types';
import type { SwarmView as Run, SwarmLimits } from '../swarmTypes';
import { api } from '../lib/api';

const live = (r: Run) => ['queued', 'working', 'waiting_children', 'waiting_approval'].includes(r.status);
const label = (s: string) => s.replaceAll('_', ' ');
const toolNames: Record<string, string> = {
  'tool-read-project': 'Read project', 'tool-calculator': 'Calculator', 'tool-web-search': 'Web search',
  'tool-browser': 'Browser automation', 'tool-files': 'Read project files', 'tool-write-file': 'Write draft files',
  'tool-code': 'Sandboxed Python / shell', 'tool-memory': 'Project memory', 'tool-connector': 'Approved connectors',
  'tool-peer': 'Message teammates', 'tool-evidence': 'Read teammate evidence',
};

// This is the server-enforced capability ceiling, not a user-authored tool plan.
// The coordinator and its planner select the working subset for each task.
const autonomousToolGrant = [
  'tool-read-project', 'tool-calculator', 'tool-web-search', 'tool-browser', 'tool-files', 'tool-write-file',
  'tool-code', 'tool-memory', 'tool-peer', 'tool-evidence',
];
export function automaticToolGrant() { return [...autonomousToolGrant]; }

export function SwarmView({ agents, projects }: { agents: Agent[]; projects: Project[] }) {
  const [runs, setRuns] = useState<Run[]>([]), [selected, setSelected] = useState('');
  const [coordinator, setCoordinator] = useState(''), [project, setProject] = useState(() => localStorage.getItem('vac-swarm-project') || ''), [objective, setObjective] = useState('');
  const [limits, setLimits] = useState<SwarmLimits>(), [error, setError] = useState(''), [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]), [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let disposed = false;
    const poll = async () => { try { const value = await api<Run[]>('/api/swarms'); if (!disposed) setRuns(value); } catch (e) { if (!disposed) setError(String(e)); } };
    void api<{ defaults: SwarmLimits }>('/api/swarms/config').then(c => { if (!disposed) setLimits(c.defaults); }).catch(e => setError(String(e)));
    void poll(); const timer = setInterval(() => void poll(), 1500); return () => { disposed = true; clearInterval(timer); };
  }, []);

  const selectedProject = projects.find(p => p.id === project);
  const assigned = Boolean(selectedProject && (selectedProject.members?.length || selectedProject.assignedAgentIds?.length || selectedProject.leadAgentId));
  const eligibleCoordinators = agents.filter(a => a.autonomyLevel >= 3 && (a.llmConfig.provider === 'ollama' || a.llmConfig.localSource === 'ollama' || a.llmConfig.model.startsWith('ollama:')) && (!assigned || selectedProject?.members?.some(m => m.agentId === a.id) || selectedProject?.assignedAgentIds?.includes(a.id) || selectedProject?.leadAgentId === a.id));
  useEffect(() => { setProject(old => projects.some(p => p.id === old) ? old : projects[0]?.id || ''); }, [projects]);
  useEffect(() => { setCoordinator(old => eligibleCoordinators.some(a => a.id === old) ? old : eligibleCoordinators[0]?.id || ''); }, [project, agents, projects]);
  useEffect(() => { if (project) localStorage.setItem('vac-swarm-project', project); }, [project]);

  const current = runs.find(r => r.id === selected && r.projectId === project) || runs.find(r => r.projectId === project);
  const projectRuns = runs.filter(r => r.projectId === project);
  const treeNodes: Run['nodes'] = []; const visited = new Set<string>();
  const visit = (parentId?: string) => { for (const n of current?.nodes || []) if (n.parentId === parentId && !visited.has(n.id)) { visited.add(n.id); treeNodes.push(n); visit(n.id); } };
  visit();
  const selectedAgent = agents.find(a => a.id === coordinator);
  const ollama = selectedAgent?.llmConfig.provider === 'ollama' || selectedAgent?.llmConfig.localSource === 'ollama' || selectedAgent?.llmConfig.model.startsWith('ollama:');

  const upload = async (file: File) => {
    if (!project) throw new Error('Choose a project before attaching files.');
    if (file.size > 6 * 1024 * 1024) throw new Error('Maximum upload is 6 MiB.');
    const data = await file.arrayBuffer(); let binary = ''; for (const b of new Uint8Array(data)) binary += String.fromCharCode(b);
    await api(`/api/projects/${project}/files`, 'POST', { name: file.name, base64: btoa(binary), expectedVersion: 0 });
    setAttachments(old => [...new Set([...old, file.name])]);
  };
  const attach = async (files: FileList | null) => {
    if (!files?.length) return; setUploading(true); setError('');
    try { for (const file of Array.from(files)) await upload(file); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!limits) return; setSubmitting(true); setError('');
    try {
      const r = await api<Run>('/api/swarms', 'POST', {
        harness: 'deepagents', coordinatorId: coordinator, projectId: project, objective, mode: 'hybrid',
        allowedToolIds: automaticToolGrant(), requiredToolIds: [], requiredDepth: 0, toolSequence: [], plan: [],
        contracts: [], connectorIds: [], browserPolicy: { allowedOrigins: [], allowActions: false, requireDiscoveredUrls: true, documentOnly: true }, limits,
      });
      setRuns(old => [r, ...old.filter(o => o.id !== r.id)]); setSelected(r.id); setObjective(''); setAttachments([]);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setSubmitting(false); }
  };
  const action = async (kind: string) => { if (!current) return; try { const r = await api<Run>(`/api/swarms/${current.id}/${kind}`, 'POST', {}); setRuns(old => old.map(o => o.id === r.id ? r : o)); } catch (e) { setError(String(e)); } };
  const recoverOperation = async (id: string, kind: string) => { try { await api(`/api/connector-operations/${id}/${kind}`, 'POST', {}); setRuns(await api<Run[]>('/api/swarms')); } catch (e) { setError(String(e)); } };

  return <main className="flex-1 min-w-0 overflow-auto p-5 md:p-8" aria-label="AI Swarm workspace">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center gap-4 mb-7"><div className="p-3 bg-amber-100 rounded-2xl"><Network className="text-amber-800" /></div><div><h1 className="text-2xl font-semibold">AI Swarm</h1><p className="text-sm text-slate-500">Describe what you want to achieve. VAC assembles the right team and gets to work.</p></div></header>
      {error && <p role="alert" className="p-3 mb-4 rounded-xl bg-red-50 text-red-800">{error}</p>}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 md:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <label className="block text-sm font-medium md:w-80">Project
            <span className="relative mt-2 block"><FolderKanban size={17} className="absolute left-3 top-3 text-slate-400 pointer-events-none" /><select aria-label="Swarm project" value={project} onChange={e => { setProject(e.target.value); setAttachments([]); }} className="border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 w-full bg-white">{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></span>
          </label>
          <p className="text-xs text-slate-500">Your last project is remembered.</p>
        </div>
        <label className="block text-sm font-medium">What would you like to achieve?
          <textarea aria-label="Swarm objective" required maxLength={12000} value={objective} onChange={e => setObjective(e.target.value)} rows={6} placeholder="Describe the outcome, important context, constraints, and what success looks like…" className="mt-2 border border-slate-300 rounded-xl p-4 w-full text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-amber-300" />
        </label>
        {attachments.length > 0 && <div role="region" aria-label="Attached files" className="flex flex-wrap gap-2">{attachments.map(name => <span key={name} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"><FileText size={13} />{name}</span>)}</div>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input ref={fileInput} aria-label="Attach files" type="file" multiple className="sr-only" onChange={e => void attach(e.target.files)} />
          <button type="button" disabled={!project || uploading} onClick={() => fileInput.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"><Paperclip size={16} />{uploading ? 'Attaching…' : 'Attach files'}</button>
          <span className="sm:ml-auto text-xs text-slate-400">{objective.length.toLocaleString()}/12,000</span>
          <button disabled={!objective.trim() || !project || !coordinator || !ollama || submitting || !limits || uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"><span>{submitting ? 'Starting…' : 'Start work'}</span><ArrowRight size={16} /></button>
        </div>
        <section aria-label="Automatic orchestration" className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3.5 text-amber-950"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-700" /><div><h2 className="text-sm font-semibold">VAC chooses the team, tools, and approach automatically.</h2><p className="mt-1 text-xs leading-relaxed text-amber-800">You set the outcome. Provider allowances and workspace safety policies still apply; sensitive or consequential actions ask for permission only when needed.</p></div></section>
        {!ollama && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">No eligible local coordinator is ready. Configure an Ollama model in Team before starting work.</p>}
      </form>

      <section className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" aria-labelledby="recent-work-heading">
        <div className="flex items-end justify-between gap-4 px-5 md:px-7 py-5 border-b border-slate-100"><div><h2 id="recent-work-heading" className="font-semibold">Recent work</h2><p className="text-xs text-slate-500 mt-1">Your latest swarms and outcomes.</p></div></div>
        {projectRuns.length === 0 ? <p className="px-5 md:px-7 py-8 text-sm text-slate-500">Your first swarm will appear here.</p> : <div className="divide-y divide-slate-100">{projectRuns.map(r => <button key={r.id} onClick={() => setSelected(r.id)} className={`grid w-full grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_140px_120px] items-center gap-4 px-5 md:px-7 py-4 text-left hover:bg-slate-50 ${current?.id === r.id ? 'bg-amber-50/60' : ''}`}><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{r.objective}</span><span className="mt-1 block text-xs text-slate-500">{r.nodes.length > 1 ? `${r.nodes.length - 1} specialists` : 'Coordinator working independently'}</span></span><span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} />{new Date(r.createdAt).toLocaleDateString()}</span><span className="inline-flex justify-self-end rounded-full bg-slate-100 px-2.5 py-1 text-xs capitalize text-slate-600">{label(r.status)}</span></button>)}</div>}
      </section>

      {current && <section className="mt-6 space-y-5" aria-label="Selected swarm">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm"><div className="flex flex-col sm:flex-row gap-3 sm:items-start sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current work</p><h2 className="font-semibold mt-1 break-words">{current.objective}</h2></div><span className="shrink-0 self-start rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">{label(current.status)}</span></div><div className="flex flex-wrap gap-3 mt-5">{live(current) && <button onClick={() => void action('cancel')} className="border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm flex gap-2 items-center"><Square size={14} />Stop work</button>}{current.interrupted && <button onClick={() => void action('resume')} className="border rounded-lg px-3 py-2 text-sm">Resume with retained evidence</button>}</div></div>
        {current.approvals?.filter(a => a.status === 'pending').map(a => <section key={a.id} className="border border-amber-300 bg-amber-50 rounded-2xl p-5"><h2 className="font-semibold">Action needs your approval</h2><p className="text-sm mt-1">{a.toolId} · expires {new Date(a.expiresAt).toLocaleTimeString()}</p><pre className="text-xs overflow-auto whitespace-pre-wrap my-3">{a.preview}</pre><div className="flex gap-4">{['approved', 'rejected'].map(decision => <button key={decision} className="border rounded px-3 py-2 text-sm" onClick={() => void api(`/api/swarm-approvals/${a.id}/decision`, 'POST', { decision }).catch(e => setError(String(e)))}>{decision === 'approved' ? 'Allow this action once' : 'Deny'}</button>)}</div></section>)}
        {current.result && <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-7 shadow-sm"><h2 className="font-semibold flex items-center gap-2 mb-3"><CheckCircle2 size={18} />{current.status === 'completed' ? 'Deliverable' : 'Result and limitations'}</h2><p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{current.result}</p><p className="text-xs text-slate-500 mt-4">Completion records execution, not independent verification of factual accuracy.</p></div>}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-7 shadow-sm"><h2 className="font-semibold mb-4">Team progress</h2><div className="divide-y divide-slate-100">{treeNodes.map(n => <article key={n.id}><button onClick={() => setExpanded(expanded === n.id ? undefined : n.id)} className="w-full py-4 flex items-center gap-3 text-left"><Bot size={19} className="text-slate-500 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{n.name} <span className="text-xs font-normal text-slate-400">{!n.parentId ? 'Coordinator' : n.sourceAgentId ? 'Team member' : 'Specialist'}</span></p><p className="text-xs text-slate-500 truncate">{n.objective}</p></div><span className="text-xs capitalize text-slate-500 shrink-0">{label(n.status)}</span><ChevronRight size={14} /></button>{expanded === n.id && <div className="pb-4 pl-8 space-y-3 text-sm"><p className="whitespace-pre-wrap">{n.result || 'No result yet.'}</p><details><summary className="cursor-pointer text-xs text-slate-500">Technical evidence</summary><p className="text-xs text-slate-500 mt-2">{n.role} · {n.calls} calls · Tools: {n.toolIds.map(t => toolNames[t] || t).join(', ') || 'None'}</p><pre className="overflow-auto text-xs bg-slate-50 rounded-lg p-3 mt-2 max-h-96">{JSON.stringify(n.receipts, null, 2)}</pre></details></div>}</article>)}</div></div>
        {!!current.verification?.length && <section className="bg-white border rounded-2xl p-5"><h2 className="font-semibold">Deliverable verification</h2>{current.verification.map((v, i) => <p className="text-sm mt-2" key={i}>{v.passed ? '✓' : '○'} {v.name} · {v.kind} · {v.reason}</p>)}</section>}
        {current.connectorOperations?.some(o => o.status !== 'confirmed') && <section aria-label="Connector recovery" className="bg-amber-50 border rounded-2xl p-5"><h2 className="font-semibold">Connector recovery</h2><p className="text-xs mt-2">Stop the run, then check the remote operation status. A repeat requires a final not-applied response and your authorization.</p>{current.connectorOperations.filter(o => o.status !== 'confirmed').map(o => <article key={o.id} className="text-xs border-t mt-3 pt-3"><p>{o.tool} · {label(o.status)}</p>{['outcome_unknown', 'reconciled_not_applied'].includes(o.status) && <button disabled={live(current) || !o.reconciliation} className="underline mr-4 disabled:opacity-40" onClick={() => void recoverOperation(o.id, 'reconcile')}>Check remote status</button>}{o.status === 'reconciled_not_applied' && !o.retryAuthorizedAt && <button className="underline" onClick={() => void recoverOperation(o.id, 'authorize-repeat')}>Authorize one repeat</button>}{o.retryAuthorizedAt && <p className="mt-2 text-amber-900">Repeat authorized once by {o.retryAuthorizedBy || 'owner'}.</p>}</article>)}</section>}
        {current.semanticReviewResult && <section aria-label="Independent review result" className="bg-white border rounded-2xl p-5"><h2 className="font-semibold">Independent review: {current.semanticReviewResult.passed ? 'passed' : 'not accepted'}</h2><pre className="text-xs whitespace-pre-wrap break-words mt-2">{JSON.stringify(current.semanticReviewResult, null, 2)}</pre></section>}
        {current.semanticReviewResult && !live(current) && <div key={current.id}><SwarmOwnerReview runId={current.id} /></div>}
        <details className="bg-white rounded-2xl border border-slate-200 p-5"><summary className="font-semibold cursor-pointer">Technical run details</summary><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">{[['Agents', `${current.nodes.length}/${current.limits.maxAgents}`], ['Model calls', `${current.budget.modelCalls}/${current.limits.maxModelCalls}`], ['Tool calls', `${current.budget.toolCalls}/${current.limits.maxToolCalls}`], ['Searches', `${current.budget.searchAttempts}/${current.limits.maxSearchAttempts}`]].map(([name, value]) => <div key={name} className="bg-slate-50 p-3 rounded-xl"><p className="text-xs text-slate-500">{name}</p><p className="font-mono text-lg mt-1">{value}</p></div>)}</div><ol className="mt-4 space-y-2">{current.events.map((e, i) => <li key={i} className="text-xs text-slate-600"><time>{new Date(e.at).toLocaleTimeString()}</time> · {e.type}: {e.detail}</li>)}</ol></details>
      </section>}
    </div>
  </main>;
}
