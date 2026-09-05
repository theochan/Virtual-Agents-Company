import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, Task, Project, Artifact, LLMConfig } from '../types';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Shield,
  FileText,
  Brain,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  RotateCw,
  GitBranch,
  Layers,
  ChevronRight,
  FolderKanban,
  Zap,
  Check,
  Globe,
  Search,
  AlertCircle
} from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { handleAvatarError } from '../lib/avatarCatalog';

interface ChatPanelProps {
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
  onViewProject?: (projectId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  agent,
  allAgents,
  projects,
  activeProject,
  messages,
  onSendMessage,
  isSending,
  onOpenProfile,
  onOpenContextInspector,
  onOpenArtifact,
  onTriggerMultiAgentTask,
  onUpdateAgentLLM,
  activeTask,
  isCollaborating,
  onViewProject,
  onSelectProject
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, activeTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  const getAgentById = (id?: string) => {
    if (!id) return null;
    return allAgents.find((a) => a.id === id);
  };

  const isLeadAgent = agent.jobTitle.toLowerCase().includes('chief') || agent.jobTitle.toLowerCase().includes('lead');

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => handleAvatarError(e)}
              className="w-10 h-10 rounded object-cover border border-[#222]"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#070707] ${
                agent.runtimeState.status === 'working' || agent.runtimeState.status === 'thinking'
                  ? 'bg-[#C5A358] animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#F0F0F0] font-serif">{agent.displayName}</h2>
              <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#1A1A1A] bg-[#0A0A0A] text-[#888]">
                {agent.jobTitle}
              </span>
              {/* Linked Project Selector */}
              {projects.length > 0 && onSelectProject ? (
                <div className="relative inline-flex items-center">
                  <select
                    value={activeProject?.id || projects[0].id}
                    onChange={(e) => onSelectProject(e.target.value)}
                    className="appearance-none text-[10px] pl-2 pr-5 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono cursor-pointer hover:bg-[#C5A358]/20 focus:outline-none"
                    title="Select project board for task execution"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#111] text-[#E0E0E0]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="w-2.5 h-2.5 text-[#C5A358] absolute right-1.5 pointer-events-none rotate-90" />
                </div>
              ) : activeProject ? (
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#C5A358]/20 bg-[#C5A358]/5 text-[#C5A358] font-mono">
                  {activeProject.name}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-[#777] flex items-center gap-1.5">
              <span className="capitalize text-[#C5A358]">{agent.runtimeState.status}</span>
              <span>•</span>
              <span className="text-[#888] font-mono">{agent.llmConfig?.model || 'gemini-3.8-flash'}</span>
              <span className="text-[#555]">({(agent.llmConfig?.temperature ?? 0.2).toFixed(2)} temp)</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onViewProject && activeProject && (
            <button
              onClick={() => onViewProject(activeProject.id)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-xs font-medium transition cursor-pointer"
              title="Open Project Kanban Board"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban Board</span>
            </button>
          )}

          {onUpdateAgentLLM && (
            <ModelSelector
              agent={agent}
              onUpdateLLMConfig={onUpdateAgentLLM}
            />
          )}

          <button
            id="btn-open-context-inspector"
            onClick={onOpenContextInspector}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 hover:text-[#C5A358] text-[#BBB] text-xs font-medium transition cursor-pointer"
            title="Inspect 4-layer memory retrieval and LLM context"
          >
            <Layers className="w-3.5 h-3.5 text-[#C5A358]" />
            <span className="hidden sm:inline">Context</span>
          </button>

          <button
            id="btn-open-agent-profile"
            onClick={() => onOpenProfile(agent)}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 hover:text-[#C5A358] text-[#BBB] text-xs font-medium transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        </div>
      </div>


      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => handleAvatarError(e)}
              className="w-16 h-16 rounded object-cover border border-[#C5A358]/40 shadow-lg mb-4"
            />
            <h3 className="text-lg font-serif italic text-[#C5A358]">{agent.displayName}</h3>
            <p className="text-xs text-[#888] mt-1">{agent.jobTitle} • {agent.department}</p>
            <p className="text-xs text-[#BBB] mt-3 leading-relaxed italic">
              &quot;{agent.personalityDescription}&quot;
            </p>

            <div className="mt-6 w-full p-4 rounded border border-[#1A1A1A] bg-[#0A0A0A] text-left space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#C5A358] font-semibold block">
                Equipped 4-Layer Context
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#BBB]">
                <div className="p-2.5 rounded bg-[#070707] border border-[#1A1A1A]">
                  <span className="text-[#555] block text-[10px] uppercase tracking-wider">Project Scope</span>
                  <span className="text-[#F0F0F0] font-medium">{activeProject?.name || 'Assigned Workstream'}</span>
                </div>
                <div className="p-2.5 rounded bg-[#070707] border border-[#1A1A1A]">
                  <span className="text-[#555] block text-[10px] uppercase tracking-wider">Autonomy</span>
                  <span className="text-[#C5A358] font-mono">Level {agent.autonomyLevel} / 4</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.senderType === 'user';
            const senderAgent = msg.agentId ? getAgentById(msg.agentId) : agent;

            return (
              <div key={msg.id} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <img
                    src={senderAgent?.avatarUrl || agent.avatarUrl}
                    alt={senderAgent?.displayName || agent.displayName}
                    referrerPolicy="no-referrer"
                    onError={(e) => handleAvatarError(e)}
                    className="w-8 h-8 rounded object-cover border border-[#222] shrink-0 mt-0.5"
                  />
                )}

                <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name & Timestamp */}
                  <div className={`flex items-center gap-2 text-xs text-[#666] ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-medium text-[#BBB]">
                      {isUser ? 'Executive You' : senderAgent?.displayName || agent.displayName}
                    </span>
                    <span className="font-mono text-[10px] text-[#555]">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`p-4 rounded-xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#141414] border border-[#282828] text-[#F0F0F0] rounded-tr-none'
                        : 'bg-[#0A0A0A] border border-[#1A1A1A] text-[#D4D4D4] rounded-tl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Internal Activities Card (Sarah -> Marcus, etc.) */}
                    {msg.metadata?.internalActivities && msg.metadata.internalActivities.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1A1A1A] space-y-1.5">
                        <span className="text-[9px] font-semibold text-[#666] uppercase tracking-widest block">
                          Internal Multi-Agent Execution
                        </span>
                        {msg.metadata.internalActivities.map((act, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-[#888]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A358]" />
                            <span>{act.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Promoted Memories Banner */}
                    {msg.metadata?.promotedMemories && msg.metadata.promotedMemories.length > 0 && (
                      <div className="mt-3 p-2.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A358]" />
                          <span>Durable Memory Promoted to Project Phoenix</span>
                        </div>
                        {msg.metadata.promotedMemories.map((m) => (
                          <p key={m.id} className="text-[10px] text-[#E0E0E0] pl-5 font-mono">
                            • [{m.type.toUpperCase()}] {m.content}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Autonomous Delegation Pipeline Visualizer (Agent 1 -> Subordinate Agent 2 with Web Search) */}
                    {(msg.metadata?.delegationChain || msg.metadata?.isDelegated) && (
                      <div className="mt-3 p-3 rounded-lg border border-[#C5A358]/30 bg-[#0B0B0B] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-[#C5A358]/10 text-[#C5A358] border border-[#C5A358]/30">
                              <Globe className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <span className="text-[11px] font-semibold text-[#F0F0F0] block font-serif">
                                Autonomous Multi-Agent Web Research Delegation
                              </span>
                              <span className="text-[9px] text-[#888]">
                                {msg.metadata.delegationChain?.delegatorName || agent.displayName} (No Web Search) → {msg.metadata.delegationChain?.subordinateName || 'Emma Vance'} (Web Search Equipped)
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                              msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                : 'bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse'
                            }`}
                          >
                            {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                              ? 'Delivered & Closed'
                              : 'Background Execution Active'}
                          </span>
                        </div>

                        {/* Pipeline Stepper */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 1</span>
                            <span className="text-emerald-400 font-semibold block flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Todo Created
                            </span>
                            <span className="text-[9px] text-[#777]">Assigned to Emma</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 2</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              )}
                              In Progress
                            </span>
                            <span className="text-[9px] text-[#777]">Picked up by Emma</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 3</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Done (100%)
                            </span>
                            <span className="text-[9px] text-[#777]">Web search closed</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 4</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Chat Reply
                            </span>
                            <span className="text-[9px] text-[#777]">Synthesized by Sarah</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#888] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Async background process: safe to close browser & return anytime to view response</span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Multi-Agent Backlog Queue & Concurrency Pipeline Visualizer */}
                    {msg.metadata?.isBacklogPipeline && msg.metadata?.backlogPipeline && (
                      <div className="p-3.5 rounded-lg border border-[#2A2035] bg-[#0C0A10] space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-400">
                              <Layers className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-[11px] font-semibold text-purple-300 block">
                                Autonomous Multi-Agent Backlog Queue & Concurrency Engine
                              </span>
                              <span className="text-[9px] text-[#888]">
                                {msg.metadata.backlogPipeline.leadAgentName || agent.displayName} decomposed task → Backlog status → Sequential execution
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                              msg.metadata.backlogPipeline.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                : msg.metadata.backlogPipeline.status === 'holding_busy'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse'
                                : 'bg-sky-950/60 text-sky-300 border border-sky-800/60 animate-pulse'
                            }`}
                          >
                            {msg.metadata.backlogPipeline.status === 'completed' || msg.metadata.executionStatus === 'completed'
                              ? 'Initiative Completed'
                              : msg.metadata.backlogPipeline.status === 'holding_busy'
                              ? 'Concurrency Hold (Busy on Project Atlas)'
                              : msg.metadata.backlogPipeline.status === 'staged_todo'
                              ? 'Staged to Todo Queue'
                              : 'Sequential Execution Active'}
                          </span>
                        </div>

                        {/* Active Concurrency Warning Banner when Marcus is busy */}
                        {msg.metadata.backlogPipeline.busyAgentsNotice && msg.metadata.backlogPipeline.busyAgentsNotice.length > 0 && (
                          <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/40 text-[10px] text-amber-200 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold block">Cross-Project Concurrency Constraint:</span>
                              <span>
                                {msg.metadata.backlogPipeline.busyAgentsNotice[0].agentName} is currently active on{' '}
                                <strong className="text-amber-300">{msg.metadata.backlogPipeline.busyAgentsNotice[0].otherProjectName}</strong> (
                                <em>{msg.metadata.backlogPipeline.busyAgentsNotice[0].activeWorkItemTitle}</em>). His new work items will remain in{' '}
                                <strong className="text-purple-300">Backlog</strong> until that task finishes.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 5-Step Progress Stepper */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 1</span>
                            <span className="text-emerald-400 font-semibold block flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" /> Backlog
                            </span>
                            <span className="text-[9px] text-[#777]">Decomposed (4 items)</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 2</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : msg.metadata.backlogPipeline.step === 2
                                  ? 'text-amber-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : msg.metadata.backlogPipeline.step === 2 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Atlas Check
                            </span>
                            <span className="text-[9px] text-[#777]">
                              {msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed' ? 'Atlas Done' : 'Marcus Busy'}
                            </span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 3</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 4 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : msg.metadata.backlogPipeline.step === 3
                                  ? 'text-sky-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 4 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : msg.metadata.backlogPipeline.step === 3 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Todo Queue
                            </span>
                            <span className="text-[9px] text-[#777]">Staged (2+ items)</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 4</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : msg.metadata.backlogPipeline.step === 4
                                  ? 'text-amber-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : msg.metadata.backlogPipeline.step === 4 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Sequential
                            </span>
                            <span className="text-[9px] text-[#777]">One by one execution</span>
                          </div>

                          <div className="p-2 rounded bg-[#101010] border border-[#1F1F1F] text-[10px] space-y-0.5">
                            <span className="text-[#C5A358] font-mono text-[9px] block">STEP 5</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-400'
                                  : 'text-[#666]'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Chat Reply
                            </span>
                            <span className="text-[9px] text-[#777]">Sarah synthesis</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#888] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Asynchronous background queue: safe to close browser & return anytime to view response</span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Work Execution & Work Items Card */}
                    {msg.metadata?.autoCreatedWorkItems && msg.metadata.autoCreatedWorkItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1E1E1E] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <span className="text-[11px] font-semibold text-emerald-300 block">
                                Autonomous Work Execution • {msg.metadata.autoCreatedWorkItems.length}{' '}
                                {msg.metadata.autoCreatedWorkItems.length === 1 ? 'Item' : 'Items'} Managed
                              </span>
                              <span className="text-[9px] text-[#777]">
                                Delivered to {msg.metadata.linkedProjectName || activeProject?.name || 'Project'} Kanban
                              </span>
                            </div>
                          </div>
                          {onViewProject && (
                            <button
                              onClick={() => onViewProject(msg.metadata?.linkedProjectId || activeProject?.id || '')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#C5A358]/40 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-[10px] font-medium transition cursor-pointer"
                            >
                              <span>View in Kanban</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {msg.metadata.autoCreatedWorkItems.map((item) => {
                            const assigned = getAgentById(item.assignedAgentId);
                            const lastLog = item.history && item.history.length > 0 ? item.history[item.history.length - 1] : null;

                            const isBacklog = item.status === 'backlog';
                            const isTodo = item.status === 'todo';
                            const isInProgress = item.status === 'in_progress';
                            const isDone = item.status === 'done';

                            return (
                              <div
                                key={item.id}
                                className="p-3 rounded-lg border border-[#202020] bg-[#070707] hover:border-[#333] transition space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isDone ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center gap-1">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          DONE (100%)
                                        </span>
                                      ) : isInProgress ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-800/50 text-amber-300 flex items-center gap-1 animate-pulse">
                                          <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                          IN PROGRESS ({item.progressPercent || 40}%)
                                        </span>
                                      ) : isBacklog ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-950/60 border border-purple-800/50 text-purple-300 flex items-center gap-1">
                                          <Layers className="w-2.5 h-2.5" />
                                          BACKLOG (0%)
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-950/60 border border-blue-800/50 text-blue-300 flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5" />
                                          TODO (0%)
                                        </span>
                                      )}

                                      {isBacklog && item.assignedAgentId === 'agent-marcus' && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-950/40 border border-amber-800/40 text-amber-300">
                                          ⚠️ Waiting on Project Atlas task
                                        </span>
                                      )}

                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                                        item.priority === 'urgent'
                                          ? 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
                                          : item.priority === 'high'
                                          ? 'bg-amber-950/40 text-amber-300 border border-amber-900/40'
                                          : 'bg-[#181818] text-[#999] border border-[#2A2A2A]'
                                      }`}>
                                        {item.priority}
                                      </span>
                                      {item.tags?.map((t, idx) => (
                                        <span key={idx} className="text-[9px] text-[#666] font-mono">
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                    <h4 className="text-xs font-semibold text-[#F0F0F0] pt-0.5">{item.title}</h4>
                                  </div>

                                  {assigned && (
                                    <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-[#101010] border border-[#222]">
                                      <img
                                        src={assigned.avatarUrl}
                                        alt={assigned.displayName}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => handleAvatarError(e)}
                                        className="w-4 h-4 rounded object-cover"
                                      />
                                      <span className="text-[10px] text-[#AAA]">{assigned.displayName.split(' ')[0]}</span>
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-[#888] leading-relaxed">{item.description}</p>
                                )}

                                {lastLog?.comment && (
                                  <div className="p-2 rounded bg-[#0D0D0D] border border-[#1A1A1A] text-[10px] text-[#CCC] flex items-start gap-2">
                                    <Sparkles className="w-3 h-3 text-[#C5A358] shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] font-medium text-[#C5A358] uppercase tracking-wider block">
                                        {isDone ? 'Closed Deliverable Log' : 'Execution Log'}
                                      </span>
                                      <span>{lastLog.comment}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reusable Artifacts Attachment */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#1A1A1A] space-y-1.5">
                        <span className="text-[9px] font-semibold text-[#666] uppercase tracking-widest block">
                          Generated Reusable Artifacts
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.attachments.map((art) => (
                            <div
                              key={art.id}
                              onClick={() => onOpenArtifact(art)}
                              className="p-2.5 rounded bg-[#070707] border border-[#1A1A1A] hover:border-[#C5A358]/40 flex items-center justify-between transition cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-[#C5A358] shrink-0" />
                                <div className="truncate">
                                  <span className="text-[11px] font-medium text-[#F0F0F0] block truncate">{art.title}</span>
                                  <span className="text-[9px] text-[#666] font-mono">{art.filename}</span>
                                </div>
                              </div>
                              <ExternalLink className="w-3 h-3 text-[#555] group-hover:text-[#C5A358] shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded bg-[#141414] border border-[#282828] flex items-center justify-center shrink-0 mt-0.5 text-[#C5A358]">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Active Task Progress Card (if collaborating) */}
        {isCollaborating && activeTask && (
          <div className="p-4 rounded border border-[#C5A358]/40 bg-[#0A0A0A] shadow-[0_0_15px_rgba(197,163,88,0.08)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#C5A358] animate-ping" />
                <span className="text-xs font-semibold text-[#F0F0F0] font-serif">Multi-Agent Task In Progress</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                Lead: {agent.displayName}
              </span>
            </div>

            <p className="text-xs text-[#CCC] font-medium">{activeTask.description}</p>

            <div className="space-y-1.5">
              {activeTask.subtasks.map((st) => {
                const subAgent = getAgentById(st.assignedAgentId);
                return (
                  <div
                    key={st.id}
                    className="p-2 rounded bg-[#070707] border border-[#1A1A1A] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={subAgent?.avatarUrl}
                        alt={subAgent?.displayName}
                        className="w-5 h-5 rounded object-cover"
                      />
                      <span className="font-medium text-[#F0F0F0]">{subAgent?.displayName}:</span>
                      <span className="text-[#888] truncate max-w-xs">{st.description}</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded capitalize font-mono ${
                        st.status === 'completed'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                          : 'bg-[#C5A358]/10 text-[#C5A358] border border-[#C5A358]/30'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-[#1A1A1A] bg-[#070707]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            id="chat-message-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending || isCollaborating}
            placeholder={`Message ${agent.displayName} (delegates tasks, references 4-layer memory)...`}
            className="flex-1 py-2.5 px-4 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358] disabled:opacity-50"
          />

          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isSending || isCollaborating}
            className="py-2.5 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSending ? (
              <RotateCw className="w-4 h-4 animate-spin text-black" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[#555] font-mono">
          <span>Priority Retrieval: Conversation → Project ({activeProject?.name || 'Phoenix'}) → Agent → Organization</span>
          <span>Lead Agent Synthesizer Active</span>
        </div>
      </div>
    </div>
  );
};
