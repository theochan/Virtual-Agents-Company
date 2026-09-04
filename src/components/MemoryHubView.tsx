import React, { useState } from 'react';
import { MemoryItem, MemoryScope, Agent, Project } from '../types';
import {
  Brain,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  User,
  Building2,
  MessageSquare,
  History,
  Tag
} from 'lucide-react';

interface MemoryHubViewProps {
  memories: MemoryItem[];
  agents: Agent[];
  projects: Project[];
  onPromoteMemory: (params: {
    memoryId: string;
    targetScope: MemoryScope;
    promotedByAgentId: string;
    reason: string;
    targetProjectId?: string;
  }) => void;
}

export const MemoryHubView: React.FC<MemoryHubViewProps> = ({
  memories,
  agents,
  projects,
  onPromoteMemory
}) => {
  const [selectedScope, setSelectedScope] = useState<MemoryScope | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-phoenix');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-marcus');

  // Promotion modal state
  const [promotingMemory, setPromotingMemory] = useState<MemoryItem | null>(null);
  const [targetScope, setTargetScope] = useState<MemoryScope>('project');
  const [promotionReason, setPromotionReason] = useState('');
  const [promoterAgentId, setPromoterAgentId] = useState('agent-sarah');

  // Retrieval simulation query tester state
  const [testQuery, setTestQuery] = useState('database migration compliance');
  const [simulationActive, setSimulationActive] = useState(false);

  const getAgent = (id?: string) => agents.find((a) => a.id === id);
  const getProject = (id?: string) => projects.find((p) => p.id === id);

  const filteredMemories = memories.filter((m) => {
    if (selectedScope !== 'all' && m.scope !== selectedScope) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingMemory || !promotionReason.trim()) return;
    onPromoteMemory({
      memoryId: promotingMemory.id,
      targetScope,
      promotedByAgentId: promoterAgentId,
      reason: promotionReason,
      targetProjectId: targetScope === 'project' ? selectedProjectId : undefined
    });
    setPromotingMemory(null);
    setPromotionReason('');
  };

  const getScopeBadge = (scope: MemoryScope) => {
    switch (scope) {
      case 'conversation':
        return 'border border-blue-900/40 bg-blue-950/30 text-blue-300';
      case 'agent':
        return 'border border-[#C5A358]/40 bg-[#C5A358]/10 text-[#C5A358]';
      case 'project':
        return 'border border-amber-800/40 bg-amber-950/20 text-amber-300';
      case 'organization':
        return 'border border-emerald-800/40 bg-emerald-950/20 text-emerald-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-[#F0F0F0] tracking-tight">Four-Layer Memory Architecture Hub</h2>
            <p className="text-xs text-[#888]">
              Conversation • Agent • Project/Workstream • Organization Memory with Priority Retrieval
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded border border-[#C5A358]/30 bg-[#C5A358]/5 font-mono text-[#C5A358]">
            {memories.length} Stored Memories
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* 4-Layer Concept Card (Section 36) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setSelectedScope('conversation')}
            className={`p-4 rounded border transition cursor-pointer ${
              selectedScope === 'conversation'
                ? 'bg-[#0E0E0E] border-[#C5A358] shadow-sm'
                : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#C5A358]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-blue-900/40 bg-blue-950/30 text-blue-300">
                Layer 1 (Weight: 1.0)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2">1. Conversation Memory</h4>
            <p className="text-[11px] text-[#888] mt-1 leading-relaxed">
              Temporary task & thread discussions. Only retrieved for that specific conversation.
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('agent')}
            className={`p-4 rounded border transition cursor-pointer ${
              selectedScope === 'agent'
                ? 'bg-[#0E0E0E] border-[#C5A358] shadow-sm'
                : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#C5A358]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <User className="w-4 h-4 text-[#C5A358]" />
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358]">
                Layer 2 (Weight: 0.75)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2">2. Agent Memory</h4>
            <p className="text-[11px] text-[#888] mt-1 leading-relaxed">
              Persistent agent traits, heuristics, specialized tools, personal notes & domain mastery.
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('project')}
            className={`p-4 rounded border transition cursor-pointer ${
              selectedScope === 'project'
                ? 'bg-[#0E0E0E] border-[#C5A358] shadow-sm'
                : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#C5A358]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <FolderKanban className="w-4 h-4 text-amber-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-amber-800/40 bg-amber-950/20 text-amber-300">
                Layer 3 (Weight: 0.90)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2">3. Project Memory</h4>
            <p className="text-[11px] text-[#888] mt-1 leading-relaxed">
              Strictly isolated workstream decisions, deliverables, schemas, and milestones (e.g. Phoenix).
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('organization')}
            className={`p-4 rounded border transition cursor-pointer ${
              selectedScope === 'organization'
                ? 'bg-[#0E0E0E] border-[#C5A358] shadow-sm'
                : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#C5A358]/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border border-emerald-800/40 bg-emerald-950/20 text-emerald-300">
                Layer 4 (Weight: 0.60)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2">4. Organization Memory</h4>
            <p className="text-[11px] text-[#888] mt-1 leading-relaxed">
              Company-wide policy, EU data residency compliance, security guidelines, and brand standards.
            </p>
          </div>
        </div>

        {/* Priority Retrieval Simulation Tester (Section 37, 50) */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A358]" />
              Interactive Priority Retrieval Tester
            </span>
            <span className="text-[10px] text-[#555] font-mono">
              Priority: Conversation → Project → Agent → Org
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Search topic across scopes (e.g. 'database migration' or 'EU compliance')..."
              className="flex-1 py-2 px-3 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
            <button
              onClick={() => setSimulationActive(true)}
              className="py-2 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer transition"
            >
              Test Scoring
            </button>
          </div>

          {simulationActive && (
            <div className="mt-3 p-4 rounded bg-[#070707] border border-[#1A1A1A] text-xs space-y-2">
              <span className="text-[#C5A358] font-semibold block text-[11px]">
                Ranked Compact Context Packet for Query: &quot;{testQuery}&quot;
              </span>
              <div className="space-y-1.5 divide-y divide-[#1A1A1A]">
                {memories
                  .filter((m) => m.status === 'active')
                  .slice(0, 4)
                  .map((m, idx) => (
                    <div key={m.id} className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#555]">#{idx + 1}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${getScopeBadge(m.scope)}`}>
                          {m.scope.toUpperCase()}
                        </span>
                        <span className="text-[#CCC] truncate max-w-xl">{m.content}</span>
                      </div>
                      <span className="text-[10px] text-[#C5A358] font-mono">
                        Score: {(0.95 - idx * 0.08).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedScope('all')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                selectedScope === 'all'
                  ? 'bg-[#C5A358] text-black font-semibold'
                  : 'border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] hover:text-[#E0E0E0]'
              }`}
            >
              All Scopes ({memories.length})
            </button>
            <button
              onClick={() => setSelectedScope('conversation')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                selectedScope === 'conversation'
                  ? 'bg-[#C5A358] text-black font-semibold'
                  : 'border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] hover:text-[#E0E0E0]'
              }`}
            >
              Conversation
            </button>
            <button
              onClick={() => setSelectedScope('agent')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                selectedScope === 'agent'
                  ? 'bg-[#C5A358] text-black font-semibold'
                  : 'border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] hover:text-[#E0E0E0]'
              }`}
            >
              Agent
            </button>
            <button
              onClick={() => setSelectedScope('project')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                selectedScope === 'project'
                  ? 'bg-[#C5A358] text-black font-semibold'
                  : 'border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] hover:text-[#E0E0E0]'
              }`}
            >
              Project
            </button>
            <button
              onClick={() => setSelectedScope('organization')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer ${
                selectedScope === 'organization'
                  ? 'bg-[#C5A358] text-black font-semibold'
                  : 'border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] hover:text-[#E0E0E0]'
              }`}
            >
              Organization
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories or tags..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0A0A0A] border border-[#1A1A1A] rounded text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
          </div>
        </div>

        {/* Memories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((mem) => {
            const isSuperseded = mem.status === 'superseded';
            const author = getAgent(mem.provenance.originalAgentId);

            return (
              <div
                key={mem.id}
                className={`p-4 rounded border transition relative flex flex-col justify-between ${
                  isSuperseded
                    ? 'bg-[#070707]/50 border-[#1A1A1A]/50 opacity-50'
                    : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#C5A358]/30'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase ${getScopeBadge(mem.scope)}`}>
                        {mem.scope}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-[#1A1A1A] bg-[#070707] text-[#888] font-mono capitalize">
                        {mem.type}
                      </span>
                      {isSuperseded && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950/40 text-rose-400 border border-rose-800/40 font-mono">
                          SUPERSEDED
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-[#666] font-mono">
                      Imp: {mem.importance}/10 • Conf: {Math.round(mem.confidence * 100)}%
                    </span>
                  </div>

                  {/* Content */}
                  <h4 className="text-xs font-semibold text-[#F0F0F0]">{mem.summary}</h4>
                  <p className="text-xs text-[#AAA] mt-1 leading-relaxed">{mem.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {mem.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-2 py-0.5 rounded border border-[#1A1A1A] bg-[#070707] text-[#777] font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer & Promotion Action (Section 38) */}
                <div className="mt-4 pt-3 border-t border-[#1A1A1A] flex items-center justify-between text-[11px] text-[#666]">
                  <div className="truncate pr-2">
                    <span>Origin: {author?.displayName || 'Organization'}</span>
                    {mem.projectId && <span> • Project: {getProject(mem.projectId)?.name || mem.projectId}</span>}
                  </div>

                  {mem.scope !== 'organization' && mem.status !== 'superseded' && (
                    <button
                      onClick={() => {
                        setPromotingMemory(mem);
                        setTargetScope(mem.scope === 'agent' ? 'project' : 'organization');
                      }}
                      className="flex items-center gap-1 text-xs text-[#C5A358] hover:text-[#D4B56C] font-medium shrink-0 cursor-pointer"
                    >
                      <span>Promote</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Promotion Dialog Modal */}
      {promotingMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded border border-[#1A1A1A] bg-[#0A0A0A] p-6 space-y-4 shadow-2xl text-[#E0E0E0]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F0F0F0] flex items-center gap-2 font-serif">
                <ArrowUpRight className="w-4 h-4 text-[#C5A358]" />
                Promote Memory Upward (Sections 38 & 39)
              </h3>
              <button
                onClick={() => setPromotingMemory(null)}
                className="text-[#666] hover:text-[#FFF] text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#AAA] bg-[#070707] p-3 rounded border border-[#1A1A1A] italic leading-relaxed">
              &quot;{promotingMemory.content}&quot;
            </p>

            <form onSubmit={handlePromoteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#CCC] mb-1">Target Scope</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as MemoryScope)}
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:border-[#C5A358]"
                >
                  <option value="project" className="bg-[#0A0A0A]">Project Memory (Shared to workstream)</option>
                  <option value="organization" className="bg-[#0A0A0A]">Organization Memory (Shared company-wide)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CCC] mb-1">Reason for Promotion</label>
                <input
                  type="text"
                  value={promotionReason}
                  onChange={(e) => setPromotionReason(e.target.value)}
                  placeholder="e.g. Official architecture decision ratified by leadership"
                  required
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:border-[#C5A358]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotingMemory(null)}
                  className="px-4 py-2 rounded border border-[#1A1A1A] bg-[#070707] text-[#888] hover:text-[#E0E0E0] text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
                >
                  Confirm Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
