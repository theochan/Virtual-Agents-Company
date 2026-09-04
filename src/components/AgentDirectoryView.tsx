import React, { useState } from 'react';
import { Agent } from '../types';
import {
  Users,
  Search,
  MessageSquare,
  Sliders,
  DollarSign,
  Cpu,
  Brain,
  Shield,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Network,
  LayoutGrid
} from 'lucide-react';
import { OrgChartView } from './OrgChartView';

interface AgentDirectoryViewProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onOpenProfile: (agent: Agent) => void;
  onUpdateReportingLine?: (agentId: string, newReportsToId: string | undefined) => void;
  initialMode?: 'grid' | 'org_chart';
}

export const AgentDirectoryView: React.FC<AgentDirectoryViewProps> = ({
  agents,
  onSelectAgent,
  onOpenProfile,
  onUpdateReportingLine,
  initialMode = 'grid'
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'org_chart'>(initialMode);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const departments = ['all', ...Array.from(new Set(agents.map((a) => a.department)))];

  const filtered = agents.filter((a) => {
    const matchSearch =
      a.displayName.toLowerCase().includes(search.toLowerCase()) ||
      a.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      (a.skills && a.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))) ||
      (a.expertise && a.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase())));
    if (!matchSearch) return false;
    if (departmentFilter !== 'all' && a.department !== departmentFilter) return false;
    return true;
  });

  if (viewMode === 'org_chart') {
    return (
      <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-hidden">
        {/* Switcher Bar in Org Chart mode */}
        <div className="px-6 py-3 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888]">Directory View:</span>
            <div className="flex items-center gap-1 bg-[#0F0F0F] p-0.5 rounded border border-[#222]">
              <button
                id="btn-switch-to-grid"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#888] hover:text-[#FFF] cursor-pointer transition"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                id="btn-switch-to-org"
                onClick={() => setViewMode('org_chart')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/30 font-medium cursor-pointer shadow-sm"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Org Hierarchy</span>
              </button>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded border border-[#C5A358]/30 bg-[#C5A358]/5 font-mono text-[#C5A358]">
            {agents.length} AI Agents
          </span>
        </div>

        <OrgChartView
          agents={agents}
          onSelectAgent={onSelectAgent}
          onOpenProfile={onOpenProfile}
          onUpdateReportingLine={onUpdateReportingLine}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-[#F0F0F0] tracking-tight">Persistent Coworker Directory</h2>
            <p className="text-xs text-[#888]">
              Autonomous AI Team • Capability Index • Runtime States • LLM Token Budget Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#0F0F0F] p-0.5 rounded border border-[#222]">
            <button
              id="btn-view-grid"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer transition ${
                viewMode === 'grid'
                  ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#888] hover:text-[#FFF]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              id="btn-view-org"
              onClick={() => setViewMode('org_chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer transition ${
                viewMode === 'org_chart'
                  ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#888] hover:text-[#FFF]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Org Hierarchy</span>
            </button>
          </div>

          <span className="text-xs px-3 py-1 rounded border border-[#C5A358]/30 bg-[#C5A358]/5 font-mono text-[#C5A358]">
            {agents.length} Deployed Agents
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition cursor-pointer ${
                  departmentFilter === dept
                    ? 'bg-[#C5A358] text-black font-semibold'
                    : 'bg-[#0A0A0A] border border-[#1A1A1A] text-[#888] hover:text-[#E0E0E0]'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or skill..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0A0A0A] border border-[#1A1A1A] rounded text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((agent) => {
            const isWorking = agent.runtimeState.status === 'working' || agent.runtimeState.status === 'thinking';

            return (
              <div
                key={agent.id}
                className="p-5 rounded bg-[#0A0A0A] border border-[#1A1A1A] hover:border-[#C5A358]/40 transition space-y-4 flex flex-col justify-between shadow-sm group"
              >
                <div>
                  {/* Top Row: Portrait, Status & Role */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.displayName}
                        className="w-13 h-13 rounded object-cover border border-[#222] shadow"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#0A0A0A] ${
                          isWorking ? 'bg-[#C5A358] animate-pulse' : 'bg-emerald-400'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-[#F0F0F0] truncate">{agent.displayName}</h3>
                        <span className="text-[9px] px-1.5 py-0.2 rounded border border-[#1A1A1A] bg-[#070707] text-[#888] font-mono">
                          Lvl {agent.autonomyLevel}
                        </span>
                      </div>
                      <p className="text-xs text-[#C5A358] truncate">{agent.jobTitle}</p>
                      <p className="text-[11px] text-[#666] capitalize">{agent.department} • {agent.seniority}</p>
                    </div>
                  </div>

                  {/* Personality & Temperament */}
                  <div className="mt-3 p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#666]">Temperament:</span>
                      <span className="font-semibold text-[#BBB] capitalize">{agent.temperament}</span>
                    </div>
                    <p className="text-[11px] text-[#888] italic line-clamp-2">
                      &quot;{agent.personalityDescription}&quot;
                    </p>
                  </div>

                  {/* Top Skills Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(agent.skills || agent.expertise || []).slice(0, 4).map((sk) => (
                      <span
                        key={sk}
                        className="text-[9px] px-2 py-0.5 rounded border border-[#1A1A1A] bg-[#070707] text-[#888] font-mono"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>

                  {/* Token & Cost Tracker (Section 56) */}
                  <div className="mt-3 pt-3 border-t border-[#1A1A1A] space-y-1.5 text-[11px] text-[#666]">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-[#888] flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-[#C5A358]" />
                        {agent.llmConfig?.model || 'gemini-3.8-flash'}
                      </span>
                      <span className="text-[#666]">{(agent.llmConfig?.temperature ?? 0.2).toFixed(2)} temp</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span>{((agent.tokenUsage?.inputTokens || 0) + (agent.tokenUsage?.outputTokens || 0)).toLocaleString()} Tokens</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <DollarSign className="w-3 h-3 text-[#555]" />
                        <span>${(agent.tokenUsage?.estimatedCost || 0).toFixed(3)} USD</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-[#1A1A1A] flex items-center gap-2">
                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className="flex-1 py-1.5 px-3 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat / Task</span>
                  </button>

                  <button
                    onClick={() => onOpenProfile(agent)}
                    className="py-1.5 px-3 rounded border border-[#1A1A1A] bg-[#070707] hover:bg-[#111] text-[#AAA] hover:text-[#FFF] text-xs font-medium transition cursor-pointer"
                    title="View Full Behavioral Profile"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
