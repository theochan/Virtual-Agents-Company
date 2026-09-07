import React, { useEffect, useState, useRef } from 'react';
import type { Agent } from '../types';
import { GitBranch, MessageSquare, Shield, Users } from 'lucide-react';
import { handleAvatarError } from '../lib/avatarCatalog';
interface OrgChartViewProps {
 agents: Agent[];
 onSelectAgent: (id: string) => void;
 onOpenProfile: (agent: Agent) => void;
 onUpdateReportingLine: (id: string, reportsTo?: string) => void;
 onSetDelegation?: (id: string, enabled: boolean) => void;
}
export const OrgChartView: React.FC<OrgChartViewProps> = ({ agents, onSelectAgent, onOpenProfile, onUpdateReportingLine, onSetDelegation }) => {
 const canvas=useRef<HTMLDivElement>(null);
 const [enabled,setEnabled]=useState(false),[zoom,setZoom]=useState(1),[department,setDepartment]=useState('');
 useEffect(()=>{let disposed=false;void fetch('/api/ready').then(r=>r.ok?r.json():undefined).then(r=>{if(!disposed)setEnabled(Boolean(r?.delegation?.enabled));}).catch(()=>{});return()=>{disposed=true;};},[]);
 const reports=(id:string)=>agents.filter(a=>a.reportsTo===id);
 const visible=(a:Agent,seen:string[]=[]):boolean=>!seen.includes(a.id)&&( !department || a.department===department || reports(a.id).some(c=>visible(c,[...seen,a.id])) );
 const width=(a:Agent,seen:string[]=[]):number=>seen.includes(a.id)?288:Math.max(288,reports(a.id).filter(c=>visible(c)).reduce((n,c)=>n+width(c,[...seen,a.id]),0));
 const descendant=(candidate:Agent,id:string):boolean=>{const seen=new Set<string>();let current:Agent|undefined=candidate;while(current&&!seen.has(current.id)){if(current.id===id)return true;seen.add(current.id);current=agents.find(a=>a.id===current?.reportsTo);}return false;};
 const render=(agent:Agent,ancestors:string[]=[]):React.ReactNode=>{
  if(ancestors.includes(agent.id))return <p key={agent.id} role="alert">Invalid reporting cycle: {agent.displayName}</p>;
  const children=reports(agent.id).filter(c=>visible(c));const total=width(agent);let offset=0;
  const positions=children.map(c=>{const w=width(c);const x=offset+w/2;offset+=w;return x;});
  const permission=agent.toolIds.includes('tool-delegate'),permitted=enabled&&permission&&agent.autonomyLevel>=3;
  return <div key={agent.id} className="flex flex-col items-center shrink-0" style={{width:total}}>
   <article data-testid="hierarchy-card" className={`w-64 rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition ${ancestors.length?'border border-slate-200/90 hover:border-amber-300':'border-2 border-amber-300/80'}`}>
    <button aria-label={agent.displayName} className="flex items-center gap-3 text-left w-full group" onClick={()=>onOpenProfile(agent)}>
     <img src={agent.avatarUrl} alt="" referrerPolicy="no-referrer" onError={handleAvatarError} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
     <span><span className={`${ancestors.length?'font-semibold text-sm':'font-serif italic font-bold text-base'} text-slate-900 group-hover:text-amber-800 block`}>{agent.displayName}</span><span className="text-[11px] text-slate-500 block">{agent.jobTitle}</span></span>
    </button>
    <span className="inline-block mt-3 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 text-[10px] font-medium border border-slate-200">{agent.department || 'Unassigned department'}</span>
    <div className="mt-3 pt-3 border-t border-slate-100 flex items-end justify-between">
     <div><span className="text-[10px] text-slate-500 block mb-1">Autonomy · {agent.autonomyLevel}/4</span><svg aria-hidden="true" className="w-16 h-8" viewBox="0 0 60 32"><path d="M 5 30 A 25 25 0 0 1 55 30" pathLength="100" stroke="#E2E8F0" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M 5 30 A 25 25 0 0 1 55 30" pathLength="100" stroke="#D97706" strokeDasharray={`${agent.autonomyLevel*25} 100`} strokeWidth="5" fill="none" strokeLinecap="round"/></svg></div>
     <div className="text-right"><span className="text-2xl font-bold font-mono text-slate-900">{reports(agent.id).length}</span><span className="text-[10px] text-slate-500 flex items-center gap-1"><Users size={11}/>direct reports</span></div>
    </div>
    <p className={`text-[10px] mt-3 flex gap-1.5 items-center ${permitted?'text-amber-800':'text-slate-500'}`}><Shield size={12}/>Delegation: {permitted?'permitted':'disabled'}</p>
    <details className="mt-3 border-t border-slate-100 pt-2 text-xs"><summary className="cursor-pointer text-slate-600 hover:text-amber-800">Reporting & permissions</summary><label className="block mt-3 text-slate-500">Reports to<select aria-label={`Reports to for ${agent.displayName}`} value={agent.reportsTo||''} onChange={e=>onUpdateReportingLine(agent.id,e.target.value||undefined)} className="border border-slate-200 rounded-lg p-2 mt-1 w-full bg-white text-slate-800"><option value="">No manager</option>{agents.filter(a=>!descendant(a,agent.id)).map(a=><option key={a.id} value={a.id}>{a.displayName}</option>)}</select></label><button className="mt-2 text-amber-800 underline" disabled={!onSetDelegation} onClick={()=>onSetDelegation?.(agent.id,!permission)}>{permission?'Remove delegation permission':'Grant delegation permission'}</button>{permission&&!permitted&&<p className="text-amber-800 mt-2">Requires the pilot switch and autonomy level 3 or 4.</p>}<p className="text-slate-500 mt-2">Child tools and project access are checked at dispatch.</p></details>
    <button onClick={()=>onSelectAgent(agent.id)} className="mt-3 text-xs text-slate-600 hover:text-amber-800 flex items-center gap-1.5"><MessageSquare size={12}/>Open chat</button>
   </article>
   {children.length>0&&<><svg data-testid="hierarchy-connectors" aria-hidden="true" width={total} height="64" viewBox={`0 0 ${total} 64`} fill="none"><path d={`M ${total/2} 0 V 24`} stroke="#D97706" strokeWidth="2"/>{positions.map((x,i)=><path key={children[i].id} d={`M ${total/2} 24 C ${total/2} 44, ${x} 24, ${x} 64`} stroke="#C5A358" strokeWidth="2"/>)}</svg><div className="flex items-start">{children.map(c=>render(c,[...ancestors,agent.id]))}</div></>}
  </div>;
 };
 const roots=agents.filter(a=>!a.reportsTo||!agents.some(p=>p.id===a.reportsTo)).filter(a=>visible(a));
 const fit=()=>setZoom(Math.min(1,Math.max(.35,((canvas.current?.clientWidth||1000)-64)/(roots.reduce((n,a)=>n+width(a),0)+Math.max(0,roots.length-1)*32))));
 useEffect(()=>{fit();},[agents.length,department]);
 return <section className="flex-1 flex flex-col h-full min-h-0 bg-[#FBFBFA] text-slate-800 overflow-hidden">
  <header className="px-6 py-4 border-b border-slate-200/90 bg-white flex flex-wrap gap-4 items-center justify-between shrink-0"><div className="flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-700"><GitBranch size={17}/></span><h1 className="font-serif text-lg">Team hierarchy</h1></div><div className="flex flex-wrap items-center gap-3"><div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-xs"><button aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.25,z-.1))} className="px-3 py-2">−</button><span className="px-3 border-x border-slate-200">Zoom {Math.round(zoom*100)}%</span><button aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(1.4,z+.1))} className="px-3 py-2">+</button></div><button className="text-xs text-slate-600 rounded-xl border border-slate-200 px-3 py-2" onClick={fit}>Fit hierarchy</button><label className="text-xs text-slate-500">Department: <select aria-label="Department filter" value={department} onChange={e=>setDepartment(e.target.value)} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"><option value="">All departments</option>{[...new Set(agents.map(a=>a.department).filter(Boolean))].sort().map(d=><option key={d}>{d}</option>)}</select></label></div></header>
  <p className="px-6 py-2 text-xs text-slate-500 border-b border-slate-100">Read-only delegation pilot: {enabled?'enabled':'disabled'} · Explicit manager permission required · Human-reviewed drafts</p>
  <div ref={canvas} className="flex-1 overflow-auto p-8"><div className="flex items-start justify-center gap-8 mx-auto" style={{width:'max-content',minWidth:'100%',zoom}}>{roots.map(a=>render(a))}</div>{!roots.length&&<p className="text-slate-500" role="status">No matching hierarchy roots. Check the filter and reporting relationships.</p>}</div>
 </section>;
};
