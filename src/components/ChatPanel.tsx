import React, { useState, useRef, useEffect } from 'react';
import { Agent, ChatMessage, Task, Project, Artifact, LLMConfig, MemoryItem } from '../types';
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
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Zap,
  Check,
  Globe,
  Search,
  AlertCircle,
  MoreHorizontal,
  Smile,
  FileSpreadsheet,
  PanelRightClose,
  PanelRightOpen,
  Type
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
  artifacts?: Artifact[];
  memories?: MemoryItem[];
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
  artifacts = [],
  memories = [],
  onViewProject,
  onSelectProject
}) => {
  const [inputText, setInputText] = useState('');
  const [isThoughtProcessCollapsed, setIsThoughtProcessCollapsed] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
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
    <div className="flex-1 flex h-screen bg-[#F8F9FA] text-slate-800 overflow-hidden">
      {/* Center Conversational Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
        {/* Chat Header */}
        <div className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <img
                src={agent.avatarUrl}
                alt={agent.displayName}
                referrerPolicy="no-referrer"
                onError={(e) => handleAvatarError(e)}
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                  agent.runtimeState.status === 'working' || agent.runtimeState.status === 'thinking'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif italic font-semibold text-slate-900 tracking-tight">
                  {agent.displayName} — {agent.jobTitle}
                </h2>
                {/* Linked Project Selector */}
                {projects.length > 0 && onSelectProject ? (
                  <div className="relative inline-flex items-center">
                    <select
                      value={activeProject?.id || projects[0].id}
                      onChange={(e) => onSelectProject(e.target.value)}
                      className="appearance-none text-[10px] pl-2 pr-5 py-0.5 rounded-md border border-amber-300/80 bg-amber-50 text-amber-900 font-mono cursor-pointer hover:bg-amber-100/80 focus:outline-none"
                      title="Select project board for task execution"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white text-slate-800">
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronRight className="w-2.5 h-2.5 text-amber-700 absolute right-1.5 pointer-events-none rotate-90" />
                  </div>
                ) : activeProject ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-md border border-amber-300/80 bg-amber-50 text-amber-900 font-mono">
                    {activeProject.name}
                  </span>
                ) : null}
              </div>
            </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2">

            {onViewProject && activeProject && (
              <button
                onClick={() => onViewProject(activeProject.id)}
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition cursor-pointer shadow-xs"
                title="Open Project Kanban Board"
              >
                <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
            )}

            {onUpdateAgentLLM && (
              <ModelSelector
                agent={agent}
                onUpdateLLMConfig={onUpdateAgentLLM}
              />
            )}

            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-xs font-medium transition cursor-pointer shadow-xs ${
                isRightPanelOpen
                  ? 'border-amber-400 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
              title="Toggle Live Context Packet Inspector"
            >
              {isRightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5 text-amber-700" /> : <PanelRightOpen className="w-3.5 h-3.5 text-slate-500" />}
              <span className="hidden sm:inline">Context Inspector</span>
            </button>

            <button
              id="btn-open-agent-profile"
              onClick={() => onOpenProfile(agent)}
              className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          </div>
        </div>

        {/* Messages Feed with Thought Process Disclosure & Delegation Cards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Wireframe Interactive Thought Process Disclosure Card */}
          <div className="p-4 rounded-2xl border border-amber-200/90 bg-[#FFFDF7] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100/80 border border-amber-300/60 flex items-center justify-center text-amber-700">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 font-serif">Thought Process Disclosure</span>
              </div>
              <button
                type="button"
                onClick={() => setIsThoughtProcessCollapsed(!isThoughtProcessCollapsed)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition cursor-pointer"
                title={isThoughtProcessCollapsed ? 'Expand Thought Process' : 'Collapse Thought Process'}
              >
                {isThoughtProcessCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {!isThoughtProcessCollapsed && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs">
                    Analyze Request
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs">
                    Context Retrieval
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs">
                    Strategic Options
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs">
                    Simulation
                  </span>
                  <ArrowRight className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs">
                    Recommendation
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsThoughtProcessCollapsed(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#E8C57C] hover:bg-[#DFC075] active:bg-[#D5B569] text-amber-950 text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Collapse Thought Process
                </button>
              </div>
            )}
          </div>

          {messages.length === 0 ? (
            /* Wireframe Default Command Center Conversation Preview */
            <div className="space-y-6">
              {/* Agent Bubble */}
              <div className="flex gap-3.5 justify-start">
                <img
                  src={agent.avatarUrl}
                  alt={agent.displayName}
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarError(e)}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
                <div className="max-w-2xl space-y-1.5 items-start">
                  <div className="flex items-center gap-2 text-xs text-slate-400 justify-start">
                    <span className="font-semibold text-slate-800">{agent.displayName}</span>
                    <span className="font-mono text-[10px] text-slate-400">Just now</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs text-xs leading-relaxed">
                    <p>
                      {agent.displayName}&apos;s recommendation for corporate strategy. Continuing with comprehensive market benchmark analysis, security posture verification, and risk assessment. In alignment with corporate operations guidelines, focusing on high-ROI phased implementation.
                    </p>
                  </div>
                </div>
              </div>

              {/* User Bubble */}
              <div className="flex gap-3.5 justify-end">
                <div className="max-w-xl space-y-1.5 items-end">
                  <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
                    <span className="font-semibold text-slate-700">You</span>
                    <span className="font-mono text-[10px] text-slate-400">Just now</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white rounded-tr-none shadow-xs text-xs leading-relaxed">
                    <p>Have you reviewed the preliminary market data, risk factors, and team feedback?</p>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-amber-400 shadow-2xs">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* Delegated Subtasks to Coworkers Card (Direct Wireframe Replica) */}
              <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4 max-w-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 font-serif">
                    Delegated Subtasks to coworkers
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">2 Active</span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
                        alt="Sarah J."
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 block">Sarah J. - Market Analysis</span>
                        <span className="text-[10px] text-slate-500">VP Operations</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-mono font-medium">Due 3pm</span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-800 rounded-full w-3/4" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
                        alt="Mark L."
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <span className="font-semibold text-slate-900 block">Mark L. - Risk Assessment</span>
                        <span className="text-[10px] text-slate-500">Security Lead</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-mono font-medium">Due 5pm</span>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-800 rounded-full w-2/5" />
                      </div>
                    </div>
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
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 mt-0.5 shadow-2xs"
                    />
                  )}

                  <div className={`max-w-2xl space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    {/* Sender Name & Timestamp */}
                    <div className={`flex items-center gap-2 text-xs text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-semibold text-slate-700">
                        {isUser ? 'You' : senderAgent?.displayName || agent.displayName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-slate-900 border border-slate-800 text-white rounded-tr-none shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Internal Activities Card (Sarah -> Marcus, etc.) */}
                    {msg.metadata?.internalActivities && msg.metadata.internalActivities.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 bg-slate-50/80 -mx-2 -mb-2 p-2.5 rounded-lg">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                          Internal Multi-Agent Execution
                        </span>
                        {msg.metadata.internalActivities.map((act, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            <span>{act.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Promoted Memories Banner */}
                    {msg.metadata?.promotedMemories && msg.metadata.promotedMemories.length > 0 && (
                      <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 text-[11px] space-y-1 shadow-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Durable Memory Promoted to Project Phoenix</span>
                        </div>
                        {msg.metadata.promotedMemories.map((m) => (
                          <p key={m.id} className="text-[10px] text-slate-700 pl-5 font-mono">
                            • [{m.type.toUpperCase()}] {m.content}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Autonomous Delegation Pipeline Visualizer (Agent 1 -> Subordinate Agent 2 with Web Search) */}
                    {(msg.metadata?.delegationChain || msg.metadata?.isDelegated) && (
                      <div className="mt-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                              <Globe className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <span className="text-[11px] font-bold text-slate-900 block font-serif">
                                Autonomous Multi-Agent Web Research Delegation
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {msg.metadata.delegationChain?.delegatorName || agent.displayName} (No Web Search) → {msg.metadata.delegationChain?.subordinateName || 'Emma Vance'} (Web Search Equipped)
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                              msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                            }`}
                          >
                            {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                              ? 'Delivered & Closed'
                              : 'Background Execution Active'}
                          </span>
                        </div>

                        {/* Pipeline Stepper */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 1</span>
                            <span className="text-emerald-700 font-semibold block flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Todo Created
                            </span>
                            <span className="text-[9px] text-slate-500">Assigned to Emma</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 2</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : 'text-amber-600'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              )}
                              In Progress
                            </span>
                            <span className="text-[9px] text-slate-500">Picked up by Emma</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 3</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Done (100%)
                            </span>
                            <span className="text-[9px] text-slate-500">Web search closed</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-slate-200 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 4</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.delegationChain?.status === 'completed' || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Chat Reply
                            </span>
                            <span className="text-[9px] text-slate-500">Synthesized by Sarah</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Async background process: safe to close browser & return anytime to view response</span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Multi-Agent Backlog Queue & Concurrency Pipeline Visualizer */}
                    {msg.metadata?.isBacklogPipeline && msg.metadata?.backlogPipeline && (
                      <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-md bg-purple-100 border border-purple-300 text-purple-700">
                              <Layers className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-[11px] font-bold text-purple-900 block">
                                Autonomous Multi-Agent Backlog Queue & Concurrency Engine
                              </span>
                              <span className="text-[9px] text-slate-500">
                                {msg.metadata.backlogPipeline.leadAgentName || agent.displayName} decomposed task → Backlog status → Sequential execution
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                              msg.metadata.backlogPipeline.status === 'completed' || msg.metadata.executionStatus === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : msg.metadata.backlogPipeline.status === 'holding_busy'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                : 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse'
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
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[10px] text-amber-900 flex items-start gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold block">Cross-Project Concurrency Constraint:</span>
                              <span>
                                {msg.metadata.backlogPipeline.busyAgentsNotice[0].agentName} is currently active on{' '}
                                <strong className="text-amber-800">{msg.metadata.backlogPipeline.busyAgentsNotice[0].otherProjectName}</strong> (
                                <em>{msg.metadata.backlogPipeline.busyAgentsNotice[0].activeWorkItemTitle}</em>). His new work items will remain in{' '}
                                <strong className="text-purple-800">Backlog</strong> until that task finishes.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 5-Step Progress Stepper */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          <div className="p-2 rounded-lg bg-white border border-purple-100 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 1</span>
                            <span className="text-emerald-700 font-semibold block flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Backlog
                            </span>
                            <span className="text-[9px] text-slate-500">Decomposed (4 items)</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-purple-100 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 2</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : msg.metadata.backlogPipeline.step === 2
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : msg.metadata.backlogPipeline.step === 2 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Atlas Check
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {msg.metadata.backlogPipeline.step >= 3 || msg.metadata.executionStatus === 'completed' ? 'Atlas Done' : 'Marcus Busy'}
                            </span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-purple-100 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 3</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 4 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : msg.metadata.backlogPipeline.step === 3
                                  ? 'text-sky-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 4 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : msg.metadata.backlogPipeline.step === 3 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Todo Queue
                            </span>
                            <span className="text-[9px] text-slate-500">Staged (2+ items)</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-purple-100 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 4</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : msg.metadata.backlogPipeline.step === 4
                                  ? 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : msg.metadata.backlogPipeline.step === 4 ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Sequential
                            </span>
                            <span className="text-[9px] text-slate-500">One by one execution</span>
                          </div>

                          <div className="p-2 rounded-lg bg-white border border-purple-100 text-[10px] space-y-0.5 shadow-xs">
                            <span className="text-amber-700 font-mono text-[9px] font-bold block">STEP 5</span>
                            <span
                              className={`font-semibold block flex items-center gap-1 ${
                                msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed'
                                  ? 'text-emerald-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {msg.metadata.backlogPipeline.step >= 5 || msg.metadata.executionStatus === 'completed' ? (
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              ) : (
                                <Clock className="w-2.5 h-2.5" />
                              )}
                              Chat Reply
                            </span>
                            <span className="text-[9px] text-slate-500">Sarah synthesis</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Asynchronous background queue: safe to close browser & return anytime to view response</span>
                        </div>
                      </div>
                    )}

                    {/* Autonomous Work Execution & Work Items Card */}
                    {msg.metadata?.autoCreatedWorkItems && msg.metadata.autoCreatedWorkItems.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 bg-slate-50/80 -mx-2 -mb-2 p-3 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                            <div>
                              <span className="text-[11px] font-bold text-emerald-900 block">
                                Autonomous Work Execution • {msg.metadata.autoCreatedWorkItems.length}{' '}
                                {msg.metadata.autoCreatedWorkItems.length === 1 ? 'Item' : 'Items'} Managed
                              </span>
                              <span className="text-[9px] text-slate-500">
                                Delivered to {msg.metadata.linkedProjectName || activeProject?.name || 'Project'} Kanban
                              </span>
                            </div>
                          </div>
                          {onViewProject && (
                            <button
                              onClick={() => onViewProject(msg.metadata?.linkedProjectId || activeProject?.id || '')}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-semibold transition cursor-pointer shadow-xs"
                            >
                              <span>View in Kanban</span>
                              <ChevronRight className="w-3 h-3 text-amber-700" />
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
                                className="p-3 rounded-lg border border-slate-200 bg-white hover:border-amber-300 transition space-y-2 shadow-xs"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isDone ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center gap-1">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          DONE (100%)
                                        </span>
                                      ) : isInProgress ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 border border-amber-300 text-amber-800 flex items-center gap-1 animate-pulse">
                                          <RotateCw className="w-2.5 h-2.5 animate-spin" />
                                          IN PROGRESS ({item.progressPercent || 40}%)
                                        </span>
                                      ) : isBacklog ? (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-100 border border-purple-300 text-purple-800 flex items-center gap-1">
                                          <Layers className="w-2.5 h-2.5" />
                                          BACKLOG (0%)
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 border border-blue-300 text-blue-800 flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5" />
                                          TODO (0%)
                                        </span>
                                      )}

                                      {isBacklog && item.assignedAgentId === 'agent-marcus' && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 border border-amber-300 text-amber-800">
                                          ⚠️ Waiting on Project Atlas task
                                        </span>
                                      )}

                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                                        item.priority === 'urgent'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : item.priority === 'high'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {item.priority}
                                      </span>
                                      {item.tags?.map((t, idx) => (
                                        <span key={idx} className="text-[9px] text-slate-500 font-mono">
                                          #{t}
                                        </span>
                                      ))}
                                    </div>
                                    <h4 className="text-xs font-semibold text-slate-900 pt-0.5">{item.title}</h4>
                                  </div>

                                  {assigned && (
                                    <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded bg-slate-100 border border-slate-200">
                                      <img
                                        src={assigned.avatarUrl}
                                        alt={assigned.displayName}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => handleAvatarError(e)}
                                        className="w-4 h-4 rounded object-cover"
                                      />
                                      <span className="text-[10px] text-slate-700 font-medium">{assigned.displayName.split(' ')[0]}</span>
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.description}</p>
                                )}

                                {lastLog?.comment && (
                                  <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-700 flex items-start gap-2">
                                    <Sparkles className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">
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
                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">
                          Generated Reusable Artifacts
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.attachments.map((art) => (
                            <div
                              key={art.id}
                              onClick={() => onOpenArtifact(art)}
                              className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-amber-300 hover:bg-white flex items-center justify-between transition cursor-pointer group shadow-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <div className="truncate">
                                  <span className="text-[11px] font-semibold text-slate-900 block truncate">{art.title}</span>
                                  <span className="text-[9px] text-slate-500 font-mono">{art.filename}</span>
                                </div>
                              </div>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-amber-600 shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-amber-400 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Active Task Progress Card (if collaborating) */}
        {isCollaborating && activeTask && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                <span className="text-xs font-bold text-slate-900 font-serif">Multi-Agent Task In Progress</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-amber-300 bg-white text-amber-900 font-mono font-medium shadow-xs">
                Lead: {agent.displayName}
              </span>
            </div>

            <p className="text-xs text-slate-700 font-medium">{activeTask.description}</p>

            <div className="space-y-1.5">
              {activeTask.subtasks.map((st) => {
                const subAgent = getAgentById(st.assignedAgentId);
                return (
                  <div
                    key={st.id}
                    className="p-2.5 rounded-lg bg-white border border-amber-200/80 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={subAgent?.avatarUrl}
                        alt={subAgent?.displayName}
                        className="w-5 h-5 rounded-md object-cover"
                      />
                      <span className="font-semibold text-slate-900">{subAgent?.displayName}:</span>
                      <span className="text-slate-600 truncate max-w-xs">{st.description}</span>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-md capitalize font-mono ${
                        st.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium'
                          : 'bg-amber-100 text-amber-800 border border-amber-300 font-medium'
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

      {/* Input Bar & Action Chips */}
      <div className="p-4 border-t border-slate-200 bg-white">
        {/* Quick Action Prompt Chips (Matching Wireframe Page 1) */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {[
            { label: 'Draft email', icon: '✉', prompt: 'Draft email summarizing market benchmarks and strategic risk factors.' },
            { label: 'Create task', icon: '☑', prompt: 'Create task on Project Phoenix Kanban board for technical migration.' },
            { label: 'Run simulation', icon: '⚡', prompt: 'Run simulation and scenario forecasting for Q4 rollout.' },
            { label: 'Generate report', icon: '📊', prompt: 'Generate report summarizing key decisions and architecture deliverables.' }
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(chip.prompt)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer flex items-center gap-1.5 shrink-0 hover:border-amber-400"
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative flex items-center">
            <input
              id="chat-message-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending || isCollaborating}
              placeholder={`Message ${agent.displayName} (delegates tasks, references 4-layer memory)...`}
              className="w-full py-2.5 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              type="button"
              className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
              title="Insert reaction"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>

          <button
            id="btn-send-message"
            type="submit"
            disabled={!inputText.trim() || isSending || isCollaborating}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isSending ? (
              <RotateCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Priority Retrieval: Ephemeral → Working ({activeProject?.name || 'Phoenix'}) → Long-Term → Global</span>
          <span>Lead Agent Synthesizer Active</span>
        </div>
      </div>
    </div>

    {/* Right Column: Live Context Packet Inspector & Active Artifacts (Matching Wireframe Page 1) */}
    {isRightPanelOpen && (
      <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-y-auto p-5 space-y-5 hidden xl:flex">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Live Context Packet Inspector
          </span>
          <button
            onClick={() => setIsRightPanelOpen(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
            title="Close panel"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* Active Context Card */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wide">
              {agent.displayName} ACTIVE CONTEXT
            </span>
            <button onClick={onOpenContextInspector} className="text-slate-400 hover:text-slate-600" title="Inspect Full Context">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[11px] text-slate-500 block">4-layer memory scopes</span>

          {/* 4 Scope Items */}
          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Ephemeral</span>
                <span className="text-[10px] text-slate-400 font-mono">2m ago</span>
              </div>
              <span className="text-[11px] text-slate-600">Query: Strategy Plan</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Working</span>
                <span className="text-[10px] text-slate-400 font-mono">5 Files</span>
              </div>
              <span className="text-[11px] text-slate-600">Project: {activeProject?.name || 'Q4 Growth'}</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Long-Term</span>
                <span className="text-[10px] text-slate-400 font-mono">110 Assets</span>
              </div>
              <span className="text-[11px] text-slate-600">Market Data, User Profile</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900">Global</span>
                <span className="text-[10px] text-slate-400 font-mono">45 Sources</span>
              </div>
              <span className="text-[11px] text-slate-600">Industry Trends, Guidelines</span>
            </div>
          </div>
        </div>

        {/* Active Artifacts Card */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 font-serif">Active Artifacts</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {artifacts && artifacts.length > 0 ? artifacts.length : 3} Ready
            </span>
          </div>

          <div className="space-y-2.5">
            {/* If real artifacts exist, display them; otherwise display the wireframe documents */}
            {artifacts && artifacts.length > 0 ? (
              artifacts.slice(0, 4).map((art) => (
                <div
                  key={art.id}
                  onClick={() => onOpenArtifact(art)}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-amber-300 hover:bg-white flex items-center justify-between transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-900 block truncate group-hover:text-amber-800 transition">
                        {art.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{art.filename}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </div>
              ))
            ) : (
              <>
                <div
                  onClick={() => {}}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-amber-300 hover:bg-white flex items-center justify-between transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-900 block truncate group-hover:text-amber-800 transition">
                        Competitive Analysis.pdf
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">10m ago</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </div>

                <div
                  onClick={() => {}}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-amber-300 hover:bg-white flex items-center justify-between transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-900 block truncate group-hover:text-amber-800 transition">
                        Q4 Sales Data.xlsx
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">1h ago</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </div>

                <div
                  onClick={() => {}}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-amber-300 hover:bg-white flex items-center justify-between transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-900 block truncate group-hover:text-amber-800 transition">
                        Strategy Draft.docx
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">2h ago</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);
};
