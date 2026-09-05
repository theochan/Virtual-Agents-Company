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
        return 'border border-blue-200 bg-blue-50 text-blue-800 font-medium';
      case 'agent':
        return 'border border-indigo-200 bg-indigo-50 text-indigo-800 font-medium';
      case 'project':
        return 'border border-amber-200 bg-amber-50 text-amber-900 font-medium';
      case 'organization':
        return 'border border-emerald-200 bg-emerald-50 text-emerald-900 font-medium';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-slate-900 tracking-tight">Four-Layer Memory Architecture Hub</h2>
            <p className="text-xs text-slate-500">
              Conversation • Agent • Project/Workstream • Organization Memory with Priority Retrieval
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full border border-amber-300 bg-amber-50 font-mono text-amber-900 font-semibold shadow-2xs">
            {memories.length} Stored Memories
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* 4-Layer Concept Card (Section 36) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setSelectedScope('conversation')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              selectedScope === 'conversation'
                ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-800 font-medium">
                Layer 1 (Weight: 1.0)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-slate-900 mt-2 font-serif">1. Conversation Memory</h4>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Temporary task & thread discussions. Only retrieved for that specific conversation.
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('agent')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              selectedScope === 'agent'
                ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <User className="w-4 h-4 text-indigo-600" />
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-800 font-medium">
                Layer 2 (Weight: 0.75)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-slate-900 mt-2 font-serif">2. Agent Memory</h4>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Persistent agent traits, heuristics, specialized tools, personal notes & domain mastery.
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('project')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              selectedScope === 'project'
                ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <FolderKanban className="w-4 h-4 text-amber-600" />
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-900 font-medium">
                Layer 3 (Weight: 0.90)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-slate-900 mt-2 font-serif">3. Project Memory</h4>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Strictly isolated workstream decisions, deliverables, schemas, and milestones (e.g. Phoenix).
            </p>
          </div>

          <div
            onClick={() => setSelectedScope('organization')}
            className={`p-4 rounded-xl border transition cursor-pointer ${
              selectedScope === 'organization'
                ? 'bg-amber-50/70 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200 hover:border-amber-300/80 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 font-medium">
                Layer 4 (Weight: 0.60)
              </span>
            </div>
            <h4 className="text-xs font-semibold text-slate-900 mt-2 font-serif">4. Organization Memory</h4>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              Company-wide policy, EU data residency compliance, security guidelines, and brand standards.
            </p>
          </div>
        </div>

        {/* Priority Retrieval Simulation Tester (Section 37, 50) */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              Local Memory Text Preview
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Priority: Conversation → Project → Agent → Org
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Search topic across scopes (e.g. 'database migration' or 'EU compliance')..."
              className="flex-1 py-2 px-3.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs"
            />
            <button
              onClick={() => setSimulationActive(true)}
              className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition shadow-xs"
            >
              Preview Matches
            </button>
          </div>

          {simulationActive && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="text-slate-900 font-semibold block text-[11px] font-serif">
                Local text preview (not runtime retrieval) for: &quot;{testQuery}&quot;
              </span>
              <div className="space-y-1.5 divide-y divide-slate-200">
                {memories
                  .filter((m) => m.status === 'active' && m.content.toLowerCase().includes(testQuery.toLowerCase()))
                  .slice(0, 4)
                  .map((m, idx) => (
                    <div key={m.id} className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">#{idx + 1}</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${getScopeBadge(m.scope)}`}>
                          {m.scope.toUpperCase()}
                        </span>
                        <span className="text-slate-800 truncate max-w-xl">{m.content}</span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-mono font-semibold">
                        {m.reviewStatus === 'reviewed' ? 'Owner reviewed' : 'Unreviewed'}
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedScope === 'all'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              All Scopes ({memories.length})
            </button>
            <button
              onClick={() => setSelectedScope('conversation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedScope === 'conversation'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              Conversation
            </button>
            <button
              onClick={() => setSelectedScope('agent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedScope === 'agent'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              Agent
            </button>
            <button
              onClick={() => setSelectedScope('project')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedScope === 'project'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              Project
            </button>
            <button
              onClick={() => setSelectedScope('organization')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedScope === 'organization'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              Organization
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories or tags..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-2xs"
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
                className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${
                  isSuperseded
                    ? 'bg-slate-100/60 border-slate-200/60 opacity-60'
                    : 'bg-white border-slate-200/90 hover:border-amber-300/80 shadow-2xs'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase ${getScopeBadge(mem.scope)}`}>
                        {mem.scope}
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-mono capitalize font-medium">
                        {mem.type}
                      </span>
                      {isSuperseded && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-semibold">
                          SUPERSEDED
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono">
                      Imp: {mem.importance}/10 • Conf: {Math.round(mem.confidence * 100)}%
                    </span>
                  </div>

                  {/* Content */}
                  <h4 className="text-xs font-semibold text-slate-900 font-serif">{mem.summary}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{mem.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {mem.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 font-mono"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer & Promotion Action (Section 38) */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
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
                      className="flex items-center gap-1 text-xs text-amber-800 hover:text-amber-900 font-semibold shrink-0 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 font-serif">
                <ArrowUpRight className="w-4 h-4 text-amber-700" />
                Promote Memory Upward (Sections 38 & 39)
              </h3>
              <button
                onClick={() => setPromotingMemory(null)}
                className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 italic leading-relaxed">
              &quot;{promotingMemory.content}&quot;
            </p>

            <form onSubmit={handlePromoteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Scope</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as MemoryScope)}
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 cursor-pointer"
                >
                  <option value="project">Project Memory (Shared to workstream)</option>
                  <option value="organization">Organization Memory (Shared company-wide)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Promotion</label>
                <input
                  type="text"
                  value={promotionReason}
                  onChange={(e) => setPromotionReason(e.target.value)}
                  placeholder="e.g. Official architecture decision ratified by leadership"
                  required
                  className="w-full p-2.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotingMemory(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 text-xs cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs transition"
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
