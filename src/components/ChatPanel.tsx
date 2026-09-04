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
  ChevronRight
} from 'lucide-react';
import { ModelSelector } from './ModelSelector';

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
  isCollaborating
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
              {activeProject && (
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#C5A358]/20 bg-[#C5A358]/5 text-[#C5A358] font-mono">
                  {activeProject.name}
                </span>
              )}
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

      {/* Quick Scenario Triggers Bar */}
      <div className="px-6 py-2.5 bg-[#070707]/60 border-b border-[#1A1A1A] flex items-center gap-2 overflow-x-auto text-xs shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-[#555] font-semibold shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#C5A358]" />
          Test Workflows:
        </span>

        {isLeadAgent ? (
          <button
            onClick={() =>
              onTriggerMultiAgentTask(
                'Determine whether Phoenix should migrate from Firebase to PostgreSQL. Use the team.'
              )
            }
            className="px-2.5 py-1 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 text-[#BBB] hover:text-[#C5A358] text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            &quot;Work with Marcus, Emma and Daniel on Phoenix database migration&quot;
          </button>
        ) : agent.id === 'agent-emma' ? (
          <button
            onClick={() =>
              onSendMessage('What database did Phoenix decide to use and why?')
            }
            className="px-2.5 py-1 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 text-[#BBB] hover:text-[#C5A358] text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            &quot;What database did Phoenix decide to use and why?&quot; (Retrieves Project Memory)
          </button>
        ) : (
          <button
            onClick={() =>
              onSendMessage(`What is our architectural standard for data residency and schema migration?`)
            }
            className="px-2.5 py-1 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 text-[#BBB] hover:text-[#C5A358] text-[11px] whitespace-nowrap transition cursor-pointer"
          >
            &quot;What is our architectural standard for data residency?&quot; (Retrieves Org Memory)
          </button>
        )}

        <button
          onClick={() =>
            onSendMessage('Review our organizational principles and summarize our current top technical constraints.')
          }
          className="px-2.5 py-1 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/40 text-[#888] hover:text-[#BBB] text-[11px] whitespace-nowrap transition cursor-pointer"
        >
          &quot;Summarize our top constraints from Organization Memory&quot;
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-12">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
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
