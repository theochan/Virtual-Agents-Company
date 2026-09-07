import React, { useState, useRef, useLayoutEffect } from 'react';
import type { Agent, ChatMessage, Task, Project, Artifact, LLMConfig, MemoryItem } from '../types';
import { Send, FileText, Sliders, User } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { handleAvatarError } from '../lib/avatarCatalog';

interface ChatPanelProps {
  runs?: Task[];
  agent: Agent;
  allAgents: Agent[];
  projects: Project[];
  activeProject?: Project;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  onOpenProfile: (agent: Agent) => void;
  onOpenContextInspector: () => void;
  onOpenArtifact: (artifact: Artifact) => void;
  onTriggerMultiAgentTask: (instruction: string) => void;
  onUpdateAgentLLM?: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  activeTask?: Task;
  isCollaborating: boolean;
  artifacts?: Artifact[];
  memories?: MemoryItem[];
  onViewProject?: (projectId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ runs = [], agent, projects, activeProject, messages, onSendMessage, isSending,
  onOpenProfile, onOpenArtifact, onUpdateAgentLLM, activeTask, artifacts = [], memories = [], onSelectProject }) => {
  const [input, setInput] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const conversation = `${agent.id}:${activeProject?.id || ''}`;
  const previousConversation = useRef('');
  const messageVersion = messages.map(m => `${m.id}:${m.content}:${m.metadata?.executionStatus || ''}`).join('\n');
  useLayoutEffect(() => {
    const container = bottom.current?.parentElement;
    if (previousConversation.current !== conversation) { followLatest.current = true; previousConversation.current = conversation; }
    if (container && followLatest.current) container.scrollTop = container.scrollHeight;
  }, [conversation, messageVersion, isSending]);
  const projectArtifacts = artifacts.filter(a => a.projectId === activeProject?.id);
  const reviewedMemories = memories.filter(m => m.status === 'active' && m.reviewStatus === 'reviewed'
    && (m.scope === 'organization' || m.scope === 'agent' && m.agentId === agent.id || m.scope === 'project' && m.projectId === activeProject?.id));
  return <div className="flex flex-1 min-w-0 h-full">
    <section className="flex flex-col flex-1 min-w-0">
      <header className="bg-white border-b p-5 space-y-3">
        <div className="flex items-center gap-3">
          <img src={agent.avatarUrl} onError={e => handleAvatarError(e, agent)} alt={agent.displayName} className="w-12 h-12 object-cover rounded-xl" />
          <div className="flex-1"><h1 className="text-lg font-semibold">{agent.displayName}</h1><p className="text-xs text-slate-500">{agent.jobTitle}</p></div>
          <button aria-label="Edit agent profile" onClick={() => onOpenProfile(agent)} className="p-2 border rounded-lg"><Sliders size={18} /></button>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="text-xs text-slate-600">Project <select aria-label="Conversation project" className="border rounded p-2 bg-white ml-1" value={activeProject?.id || ''} onChange={e => onSelectProject?.(e.target.value)}>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select></label>
          {onUpdateAgentLLM && <ModelSelector agent={agent} onUpdateLLMConfig={onUpdateAgentLLM} />}
        </div>

      </header>
      <div data-testid="chat-history" onScroll={e => { const el = e.currentTarget; followLatest.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64; }} className="flex-1 min-h-0 overflow-auto p-6 space-y-5">
        {!messages.length && <p className="text-sm text-slate-500">No messages in this project conversation. Ask for a concrete answer or draft.</p>}
        {messages.map(message => { const run = runs.find(r => r.id === message.taskId) || (message.taskId && message.metadata?.runReview ? { id: message.taskId, ...message.metadata.runReview } : undefined); const child = Boolean((run as any)?.parentRunId); const accepted = run?.status === 'completed' || message.metadata?.executionStatus === 'completed'; return <article key={message.id} className={`max-w-3xl rounded-xl p-4 border ${message.senderType === 'user' ? 'ml-auto bg-amber-50 border-amber-100' : message.senderType === 'system' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><User size={13} /><span>{message.senderType === 'user' ? 'You' : message.senderType === 'system' ? 'Execution status' : agent.displayName}</span><time className="ml-auto">{new Date(message.timestamp).toLocaleTimeString()}</time></div>
          {message.metadata?.executionStatus && message.metadata.executionStatus !== 'review_required' && <p className="text-xs font-semibold text-amber-800 mb-2">{accepted ? 'Completed' : message.metadata.executionStatus.replaceAll('_', ' ')}</p>}
          <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{message.content.replace('Check source relevance and freshness before accepting this draft.', 'Check source relevance and freshness before relying on this answer.')}</div>
          {message.attachments?.map(artifact => <button key={artifact.id} onClick={() => onOpenArtifact(artifact)} className="mt-3 flex items-center gap-2 text-sm underline"><FileText size={16} />{artifact.title}</button>)}
          {message.senderType === 'agent' && child && <p className="mt-3 text-xs text-slate-500">Delegated result. View the parent run in Audit.</p>}
        </article>; })}
        {isSending && <p role="status" className="text-sm text-slate-600">Run {activeTask?.status || 'being submitted'}. Open Audit to inspect progress, approve an operation or cancel.</p>}
        <div ref={bottom} />
      </div>
      <form className="border-t bg-white p-4 flex gap-3" onSubmit={async event => { event.preventDefault(); if (!input.trim() || isSending) return; const message = input; followLatest.current = true; await onSendMessage(message); setInput(''); }}>
        <textarea aria-label="Message" className="flex-1 resize-none border rounded-xl p-3 text-sm" rows={3} value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask ${agent.displayName} for an answer or draft…`} />
        <button disabled={!input.trim() || isSending} className="self-end bg-slate-900 text-white rounded-xl p-3 disabled:opacity-40" aria-label="Send message"><Send size={20} /></button>
      </form>
    </section>
    <aside className="hidden xl:block w-72 border-l bg-white p-5 overflow-auto space-y-6">
      <div><h2 className="font-semibold text-sm">Available reviewed memory</h2><p className="text-xs text-slate-500 mt-2">{reviewedMemories.length} records eligible by scope. Relevance and context limits determine what enters each run.</p></div>
      <div><h2 className="font-semibold text-sm">Project artifacts ({projectArtifacts.length})</h2><div className="space-y-2 mt-3">{projectArtifacts.slice(-10).reverse().map(artifact => <button key={artifact.id} onClick={() => onOpenArtifact(artifact)} className="block w-full border rounded-lg p-3 text-left text-xs">{artifact.title}</button>)}{!projectArtifacts.length && <p className="text-xs text-slate-500">No saved artifacts.</p>}</div></div>
    </aside>
  </div>;
};
