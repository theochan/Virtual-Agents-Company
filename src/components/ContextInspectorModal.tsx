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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[85vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F0F0F0]">LLM Context Inspector & 4-Layer Memory Packet</h3>
              <p className="text-[11px] text-[#777]">
                Active Prompt State for {agent.displayName} ({agent.llmConfig.provider} / {agent.llmConfig.model})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* 1. Identity & System Persona */}
          <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
            <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
              1. Persistent Behavioral Persona
            </span>
            <div className="grid grid-cols-2 gap-3 text-[#AAA]">
              <div>
                <span className="text-[#666] block text-[10px]">Communication Mode</span>
                <span className="capitalize font-mono text-[#DDD]">
                  {agent.communicationStyle?.mode
                    ? agent.communicationStyle.mode.replace('_', ' ')
                    : (agent.communicationMode || 'Conclusion first')}
                </span>
              </div>
              <div>
                <span className="text-[#666] block text-[10px]">Temperament</span>
                <span className="capitalize font-mono text-[#DDD]">{agent.temperament || 'Calm'}</span>
              </div>
              <div>
                <span className="text-[#666] block text-[10px]">Analytical vs Intuitive</span>
                <span className="font-mono text-[#DDD]">
                  {(agent.personalityDimensions?.analyticalVsIntuitive ??
                    agent.personalityDimensions?.analyticalIntuitive ??
                    80)}/100
                </span>
              </div>
              <div>
                <span className="text-[#666] block text-[10px]">Autonomy Clearance</span>
                <span className="font-mono text-[#DDD]">Level {agent.autonomyLevel ?? 3} / 4</span>
              </div>
            </div>
          </div>

          {/* 2. Priority 4-Layer Memories in Compact Packet */}
          <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-[#C5A358]" />
                2. Compact 4-Layer Memory Packet (Priority Retrieved)
              </span>
              <span className="text-[10px] text-[#555] font-mono">
                Weight: Conv(1.0) &gt; Proj(0.9) &gt; Agent(0.75) &gt; Org(0.6)
              </span>
            </div>

            {contextPacket ? (
              <div className="space-y-3">
                {/* Project Memories */}
                <div className="p-3 rounded border border-amber-800/40 bg-amber-950/15 space-y-1">
                  <span className="text-[10px] font-semibold text-amber-300 uppercase block font-mono">
                    Project Memory ({project?.name || 'Project Phoenix'})
                  </span>
                  {contextPacket.relevantProjectMemories.length > 0 ? (
                    contextPacket.relevantProjectMemories.map((m) => (
                      <p key={m.id} className="text-[#CCC] pl-3 border-l border-amber-600/50">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-[#666] italic">No specific project memories retrieved</span>
                  )}
                </div>

                {/* Agent Memories */}
                <div className="p-3 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 space-y-1">
                  <span className="text-[10px] font-semibold text-[#C5A358] uppercase block font-mono">
                    Agent Personal Memory ({agent.firstName})
                  </span>
                  {contextPacket.relevantAgentMemories.length > 0 ? (
                    contextPacket.relevantAgentMemories.map((m) => (
                      <p key={m.id} className="text-[#CCC] pl-3 border-l border-[#C5A358]/50">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-[#666] italic">No specific personal memories retrieved</span>
                  )}
                </div>

                {/* Organization Memories */}
                <div className="p-3 rounded border border-emerald-800/40 bg-emerald-950/15 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase block font-mono">
                    Organization Memory (Company-Wide)
                  </span>
                  {contextPacket.relevantOrganizationMemories.length > 0 ? (
                    contextPacket.relevantOrganizationMemories.map((m) => (
                      <p key={m.id} className="text-[#CCC] pl-3 border-l border-emerald-600/50">
                        • {m.content}
                      </p>
                    ))
                  ) : (
                    <span className="text-[#666] italic">No organization memories retrieved</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[#666]">Context packet is generated dynamically on each chat exchange.</p>
            )}
          </div>

          {/* 3. Connected Tools */}
          <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
            <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
              3. Connected Tools & Security Clearance
            </span>
            <div className="flex flex-wrap gap-2">
              {((agent.tools && agent.tools.length > 0) ? agent.tools : (agent.toolIds || [])).map((t) => (
                <span key={t} className="px-2 py-1 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-[#888] font-mono text-[11px]">
                  {t}
                </span>
              ))}
              {(!agent.tools?.length && !agent.toolIds?.length) && (
                <span className="text-[#666] italic text-[11px]">No external tools connected.</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
