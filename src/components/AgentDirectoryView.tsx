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
  LayoutGrid,
  Trash2
} from 'lucide-react';
import { OrgChartView } from './OrgChartView';
import { handleAvatarError } from '../lib/avatarCatalog';

interface AgentDirectoryViewProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onOpenProfile: (agent: Agent) => void;
  onUpdateReportingLine?: (agentId: string, newReportsToId: string | undefined) => void;
  onDeleteAgent?: (agentId: string) => void;
  initialMode?: 'grid' | 'org_chart';
}

export const AgentDirectoryView: React.FC<AgentDirectoryViewProps> = ({
  agents,
  onSelectAgent,
  onOpenProfile,
  onUpdateReportingLine,
  onDeleteAgent,
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
      <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-hidden">
        {/* Switcher Bar in Org Chart mode */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Directory View:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                id="btn-switch-to-grid"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-slate-600 hover:text-slate-900 cursor-pointer transition font-medium"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                id="btn-switch-to-org"
                onClick={() => setViewMode('org_chart')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white text-amber-900 border border-amber-300 font-semibold cursor-pointer shadow-xs"
              >
                <Network className="w-3.5 h-3.5 text-amber-600" />
                <span>Org Hierarchy</span>
              </button>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 font-mono text-amber-900 font-medium shadow-2xs">
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
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-amber-300/80 bg-amber-50 flex items-center justify-center text-amber-700 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-slate-900 tracking-tight">Persistent Coworker Directory</h2>
            <p className="text-xs text-slate-500">
              Autonomous AI Team • Capability Index • Runtime States • LLM Token Budget Monitoring
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              id="btn-view-grid"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition ${
                viewMode === 'grid'
                  ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              id="btn-view-org"
              onClick={() => setViewMode('org_chart')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs cursor-pointer transition ${
                viewMode === 'org_chart'
                  ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Org Hierarchy</span>
            </button>
          </div>

          <span className="text-xs px-3 py-1 rounded-lg border border-amber-300 bg-amber-50 font-mono text-amber-900 font-medium shadow-2xs">
            {agents.length} Deployed Agents
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {departments.map((dept) => (
              <button
                key={dept}
                onClick={() => setDepartmentFilter(dept)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                  departmentFilter === dept
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          <div className="relative w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or skill..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 shadow-2xs"
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
                className="p-5 rounded-xl bg-white border border-slate-200 hover:border-amber-400/70 transition-all duration-200 space-y-4 flex flex-col justify-between shadow-xs hover:shadow-md group"
              >
                <div>
                  {/* Top Row: Portrait, Status & Role */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.displayName}
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e)}
                        className="w-13 h-13 rounded-xl object-cover border border-slate-200 shadow-2xs"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                          isWorking ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{agent.displayName}</h3>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 font-mono">
                          Lvl {agent.autonomyLevel}
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 font-medium truncate">{agent.jobTitle}</p>
                      <p className="text-[11px] text-slate-500 capitalize">{agent.department} • {agent.seniority}</p>
                    </div>
                  </div>

                  {/* Personality & Temperament */}
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Temperament:</span>
                      <span className="font-semibold text-slate-700 capitalize">{agent.temperament}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic line-clamp-2">
                      &quot;{agent.personalityDescription}&quot;
                    </p>
                  </div>

                  {/* Top Skills Tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(agent.skills || agent.expertise || []).slice(0, 4).map((sk) => (
                      <span
                        key={sk}
                        className="text-[9px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-600 font-mono shadow-2xs"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>

                  {/* Token & Cost Tracker (Section 56) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-slate-700 flex items-center gap-1 font-medium">
                        <Cpu className="w-3 h-3 text-amber-600" />
                        {agent.llmConfig?.model || 'claude-3-5-sonnet'}
                      </span>
                      <span className="text-slate-500">{(agent.llmConfig?.temperature ?? 0.2).toFixed(2)} temp</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                        <span>{((agent.tokenUsage?.inputTokens || 0) + (agent.tokenUsage?.outputTokens || 0)).toLocaleString()} Tokens</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end font-mono text-slate-600">
                        <DollarSign className="w-3 h-3 text-slate-400" />
                        <span>{agent.tokenUsage?.estimatedCost == null ? 'Cost unknown' : `$${agent.tokenUsage.estimatedCost.toFixed(3)} USD`}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat / Task</span>
                  </button>

                  <button
                    onClick={() => onOpenProfile(agent)}
                    className="py-2 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer shadow-2xs"
                    title="View Full Behavioral Profile"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>

                  {onDeleteAgent && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete ${agent.displayName}? This will permanently remove them from the company directory.`
                          )
                        ) {
                          onDeleteAgent(agent.id);
                        }
                      }}
                      className="py-2 px-2.5 rounded-lg border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs font-medium transition cursor-pointer shadow-2xs"
                      title={`Delete ${agent.displayName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
