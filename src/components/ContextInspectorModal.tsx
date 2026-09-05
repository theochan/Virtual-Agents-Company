import React from 'react';
import { Agent, ContextPacket, Project } from '../types';
import { X, Layers, Brain, Cpu, Shield, FileText, CheckCircle2 } from 'lucide-react';

interface ContextInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  contextPacket?: ContextPacket;
  project?: Project;
}

export const ContextInspectorModal: React.FC<ContextInspectorModalProps> = ({
  isOpen,
  onClose,
  agent,
  contextPacket,
  project
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-serif">LLM Context Inspector & 4-Layer Memory Packet</h3>
              <p className="text-[11px] text-slate-500">
                Active Prompt State for <span className="font-semibold text-slate-800">{agent.displayName}</span> ({agent.llmConfig.provider} / {agent.llmConfig.model})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs bg-[#F8F9FA]">
          {/* 1. Identity & System Persona */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block font-mono">
              1. Persistent Behavioral Persona
            </span>
            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Communication Mode</span>
                <span className="capitalize font-mono text-slate-900 font-semibold">
                  {agent.communicationStyle?.mode
                    ? agent.communicationStyle.mode.replace('_', ' ')
                    : (agent.communicationMode || 'Conclusion first')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Temperament</span>
                <span className="capitalize font-mono text-slate-900 font-semibold">{agent.temperament || 'Calm'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Analytical vs Intuitive</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {(agent.personalityDimensions?.analyticalVsIntuitive ??
                    agent.personalityDimensions?.analyticalIntuitive ??
                    80)}/100
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-medium">Autonomy Clearance</span>
                <span className="font-mono text-slate-900 font-semibold">Level {agent.autonomyLevel ?? 3} / 4</span>
              </div>
            </div>
          </div>

          {/* 2. Priority 4-Layer Memories in Compact Packet */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Brain className="w-3.5 h-3.5 text-amber-700" />
                2. Compact 4-Layer Memory Packet (Priority Retrieved)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Weight: Conv(1.0) &gt; Proj(0.9) &gt; Agent(0.75) &gt; Org(0.6)
              </span>
            </div>

            {contextPacket ? (
              <div className="space-y-3">
                {/* Project Memories */}
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 space-y-1">
                  <span className="text-[10px] font-semibold text-amber-900 uppercase block font-mono">
                    Project Memory ({project?.name || 'Project Phoenix'})
                  </span>
                  {contextPacket.relevantProjectMemories.length > 0 ? (
                    contextPacket.relevantProjectMemories.map((m) => (
                      <p key={m.id} className="text-slate-800 pl-3 border-l-2 border-amber-400">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No specific project memories retrieved</span>
                  )}
                </div>

                {/* Agent Memories */}
                <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/60 space-y-1">
                  <span className="text-[10px] font-semibold text-indigo-900 uppercase block font-mono">
                    Agent Personal Memory ({agent.firstName})
                  </span>
                  {contextPacket.relevantAgentMemories.length > 0 ? (
                    contextPacket.relevantAgentMemories.map((m) => (
                      <p key={m.id} className="text-slate-800 pl-3 border-l-2 border-indigo-400">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No specific personal memories retrieved</span>
                  )}
                </div>

                {/* Organization Memories */}
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-900 uppercase block font-mono">
                    Organization Memory (Company-Wide)
                  </span>
                  {contextPacket.relevantOrganizationMemories.length > 0 ? (
                    contextPacket.relevantOrganizationMemories.map((m) => (
                      <p key={m.id} className="text-slate-800 pl-3 border-l-2 border-emerald-400">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">No organization memories retrieved</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">Context packet is generated dynamically on each chat exchange.</p>
            )}
          </div>

          {/* 3. Connected Tools */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block font-mono">
              3. Connected Tools & Security Clearance
            </span>
            <div className="flex flex-wrap gap-2">
              {((agent.tools && agent.tools.length > 0) ? agent.tools : (agent.toolIds || [])).map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px]">
                  {t}
                </span>
              ))}
              {(!agent.tools?.length && !agent.toolIds?.length) && (
                <span className="text-slate-400 italic text-[11px]">No external tools connected.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
