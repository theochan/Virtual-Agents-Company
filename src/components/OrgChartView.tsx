import React, { useState, useMemo } from 'react';
import { Agent } from '../types';
import {
  Network,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  UserCheck,
  MessageSquare,
  Sliders,
  Sparkles,
  ArrowUpRight,
  GitBranch,
  Building2,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { handleAvatarError } from '../lib/avatarCatalog';

interface DepartmentStat {
  count: number;
  lead?: Agent;
  members: Agent[];
  avgAutonomy: number;
}

interface OrgChartViewProps {
  agents: Agent[];
  onSelectAgent: (agentId: string) => void;
  onOpenProfile: (agent: Agent) => void;
  onUpdateReportingLine?: (agentId: string, newReportsToId: string | undefined) => void;
}

export const OrgChartView: React.FC<OrgChartViewProps> = ({
  agents,
  onSelectAgent,
  onOpenProfile,
  onUpdateReportingLine
}) => {
  const [selectedAgentForChain, setSelectedAgentForChain] = useState<string | null>(null);
  const [reassigningAgentId, setReassigningAgentId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Map of agents by ID
  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    agents.forEach((a) => map.set(a.id, a));
    return map;
  }, [agents]);

  // Group children by manager ID
  const reportsMap = useMemo(() => {
    const map = new Map<string, Agent[]>();
    agents.forEach((agent) => {
      const managerId = agent.reportsTo || 'root';
      if (!map.has(managerId)) {
        map.set(managerId, []);
      }
      map.get(managerId)!.push(agent);
    });
    return map;
  }, [agents]);

  // Root agents (those with no reportsTo or whose reportsTo is not found)
  const rootAgents = useMemo(() => {
    return agents.filter((a) => !a.reportsTo || !agentMap.has(a.reportsTo));
  }, [agents, agentMap]);

  // Department groupings
  const departmentStats = useMemo<Record<string, DepartmentStat>>(() => {
    const depts: Record<string, DepartmentStat> = {};

    agents.forEach((agent) => {
      const dept = agent.department || 'General';
      if (!depts[dept]) {
        depts[dept] = { count: 0, members: [], avgAutonomy: 0 };
      }
      depts[dept].count += 1;
      depts[dept].members.push(agent);
      if (agent.departmentRole === 'lead' || agent.seniority.includes('Lead') || agent.seniority.includes('Executive')) {
        if (!depts[dept].lead) depts[dept].lead = agent;
      }
    });

    Object.keys(depts).forEach((d) => {
      const sum = depts[d].members.reduce((acc, m) => acc + (m.autonomyLevel || 1), 0);
      depts[d].avgAutonomy = Math.round((sum / depts[d].members.length) * 10) / 10;
    });

    return depts;
  }, [agents]);

  // Calculate the escalation chain from selected agent up to root
  const escalationChain = useMemo(() => {
    if (!selectedAgentForChain) return [];
    const chain: Agent[] = [];
    let current = agentMap.get(selectedAgentForChain);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      chain.push(current);
      visited.add(current.id);
      if (current.reportsTo && agentMap.has(current.reportsTo)) {
        current = agentMap.get(current.reportsTo);
      } else {
        break;
      }
    }
    return chain;
  }, [selectedAgentForChain, agentMap]);

  const toggleCollapse = (agentId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const handleManagerSelect = (agentId: string, newManagerId: string) => {
    const val = newManagerId === 'none' ? undefined : newManagerId;
    if (val === agentId) return; // Cannot report to self
    onUpdateReportingLine?.(agentId, val);
    setReassigningAgentId(null);
    setFeedbackMessage(`Reporting line updated successfully.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Helper to render an agent node and its recursive subordinates
  const renderAgentNode = (agent: Agent, depth = 0) => {
    const directReports = reportsMap.get(agent.id) || [];
    const hasReports = directReports.length > 0;
    const isCollapsed = collapsedNodes.has(agent.id);
    const isSelectedInChain = escalationChain.some((a) => a.id === agent.id);
    const isReassigning = reassigningAgentId === agent.id;

    return (
      <div key={agent.id} className="relative flex flex-col items-center">
        {/* Node Card */}
        <div
          id={`org-node-${agent.id}`}
          className={`w-72 rounded border p-4 transition-all duration-200 shadow-md backdrop-blur-sm relative ${
            isSelectedInChain
              ? 'border-[#C5A358] bg-[#121008] ring-1 ring-[#C5A358]/60'
              : 'border-[#222] bg-[#0A0A0A] hover:border-[#333]'
          }`}
        >
          {/* Top meta strip */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] uppercase">
              {agent.seniority}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  agent.runtimeState.status === 'working'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="text-[10px] text-[#777] capitalize">{agent.runtimeState.status}</span>
            </div>
          </div>

          {/* Identity & Department */}
          <div className="flex items-start gap-3">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => handleAvatarError(e)}
              className="w-12 h-12 rounded object-cover border border-[#222] shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-serif italic text-[#F0F0F0] truncate font-medium">
                  {agent.displayName}
                </h4>
                <span className="text-[9px] text-[#888] font-mono">
                  L{agent.autonomyLevel}
                </span>
              </div>
              <p className="text-[11px] text-[#AAA] truncate font-sans">{agent.jobTitle}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-[#777] bg-[#141414] px-1.5 py-0.5 rounded border border-[#222]">
                  {agent.department}
                </span>
                {agent.departmentRole === 'lead' && (
                  <span className="text-[9px] text-amber-300 font-semibold px-1 rounded bg-amber-950/40 border border-amber-800/40">
                    Lead
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Direct Reports Count & Quick Actions */}
          <div className="mt-3.5 pt-2.5 border-t border-[#1C1C1C] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[#888] text-[11px]">
              <Users className="w-3.5 h-3.5 text-[#666]" />
              <span>
                {directReports.length} {directReports.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedAgentForChain(selectedAgentForChain === agent.id ? null : agent.id)}
                title="View Escalation & Approval Chain"
                className={`p-1 rounded transition cursor-pointer text-[10px] flex items-center gap-1 ${
                  selectedAgentForChain === agent.id
                    ? 'bg-[#C5A358]/20 text-[#C5A358]'
                    : 'text-[#777] hover:text-[#E0E0E0] hover:bg-[#141414]'
                }`}
              >
                <GitBranch className="w-3 h-3" />
              </button>

              <button
                onClick={() => onOpenProfile(agent)}
                title="Open Dossier"
                className="p-1 rounded text-[#777] hover:text-[#E0E0E0] hover:bg-[#141414] transition cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
              </button>

              <button
                onClick={() => onSelectAgent(agent.id)}
                title="Start Direct Chat"
                className="p-1 rounded text-[#777] hover:text-[#C5A358] hover:bg-[#141414] transition cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Manager Reassignment Dropdown */}
          <div className="mt-2 text-[10px] text-[#666] flex items-center justify-between">
            <span>Reports to:</span>
            {isReassigning ? (
              <select
                autoFocus
                defaultValue={agent.reportsTo || 'none'}
                onChange={(e) => handleManagerSelect(agent.id, e.target.value)}
                onBlur={() => setReassigningAgentId(null)}
                className="bg-[#111] text-[#E0E0E0] border border-[#C5A358]/50 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
              >
                <option value="none">None (Top Executive)</option>
                {agents
                  .filter((a) => a.id !== agent.id)
                  .map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.displayName} ({mgr.jobTitle})
                    </option>
                  ))}
              </select>
            ) : (
              <button
                onClick={() => setReassigningAgentId(agent.id)}
                className="text-[#C5A358] hover:underline cursor-pointer flex items-center gap-1 font-mono truncate max-w-[140px]"
              >
                <span>{agent.reportsTo && agentMap.has(agent.reportsTo) ? agentMap.get(agent.reportsTo)!.displayName : 'Executive'}</span>
                <span className="text-[9px] text-[#555]">✎</span>
              </button>
            )}
          </div>

          {/* Expand/Collapse Handle */}
          {hasReports && (
            <button
              onClick={() => toggleCollapse(agent.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#111] border border-[#333] hover:border-[#C5A358] text-[#AAA] hover:text-[#FFF] flex items-center justify-center transition shadow-lg cursor-pointer z-10"
              title={isCollapsed ? 'Expand Reports' : 'Collapse Reports'}
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Subordinate Branches */}
        {hasReports && !isCollapsed && (
          <div className="relative pt-8 flex flex-col items-center">
            {/* Vertical connector coming down from parent */}
            <div className="absolute top-0 left-1/2 w-px h-8 bg-[#2A2A2A]" />

            {/* Subordinates container */}
            <div className="flex items-start justify-center gap-6 relative">
              {directReports.length > 1 && (
                <div
                  className="absolute top-0 h-px bg-[#2A2A2A]"
                  style={{
                    left: `calc(18rem / 2)`,
                    right: `calc(18rem / 2)`
                  }}
                />
              )}

              {directReports.map((subordinate) => (
                <div key={subordinate.id} className="relative flex flex-col items-center">
                  {/* Vertical connector connecting down to child node */}
                  <div className="w-px h-6 bg-[#2A2A2A] mb-0" />
                  {renderAgentNode(subordinate, depth + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-[#F0F0F0] tracking-tight">
              Organizational Hierarchy & Chain of Command
            </h2>
            <p className="text-xs text-[#888]">
              Governance topology • Delegation authority • Escalation paths • Reporting relationships
            </p>
          </div>
        </div>

        {/* Feedback alert */}
        {feedbackMessage && (
          <div className="px-3 py-1.5 rounded border border-emerald-800/40 bg-emerald-950/30 text-emerald-300 text-xs flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* Governance Summary Dashboard Bar */}
      <div className="p-4 border-b border-[#141414] bg-[#080808] grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded border border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777] uppercase tracking-wider block">Total AI Coworkers</span>
            <span className="text-lg font-mono text-[#F0F0F0] font-semibold">{agents.length}</span>
          </div>
          <Users className="w-4 h-4 text-[#C5A358]" />
        </div>

        <div className="p-3 rounded border border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777] uppercase tracking-wider block">Active Departments</span>
            <span className="text-lg font-mono text-[#F0F0F0] font-semibold">
              {Object.keys(departmentStats).length}
            </span>
          </div>
          <Building2 className="w-4 h-4 text-emerald-400" />
        </div>

        <div className="p-3 rounded border border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777] uppercase tracking-wider block">Executive Leads</span>
            <span className="text-lg font-mono text-[#F0F0F0] font-semibold">
              {agents.filter((a) => a.seniority.includes('Lead') || a.seniority.includes('Executive')).length}
            </span>
          </div>
          <Shield className="w-4 h-4 text-blue-400" />
        </div>

        <div className="p-3 rounded border border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#777] uppercase tracking-wider block">Escalation Resolver</span>
            <span className="text-xs text-[#C5A358] font-medium block truncate max-w-[130px]">
              {rootAgents[0]?.displayName || 'Sarah'} (Chief of Staff)
            </span>
          </div>
          <GitBranch className="w-4 h-4 text-[#C5A358]" />
        </div>
      </div>

      {/* Escalation Path Inspector (shows when an agent is selected) */}
      {selectedAgentForChain && escalationChain.length > 0 && (
        <div className="mx-6 mt-4 p-4 rounded border border-[#C5A358]/40 bg-[#0E0C06] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A358]" />
              <h4 className="text-xs font-semibold text-[#F0F0F0] uppercase tracking-wider">
                Escalation & Approval Route for {escalationChain[0].displayName}
              </h4>
            </div>
            <p className="text-[11px] text-[#888]">
              Decisions exceeding Autonomy Level {escalationChain[0].autonomyLevel} or tool disputes automatically bubble up along this chain.
            </p>
          </div>

          {/* Chain visualization */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {escalationChain.map((member, idx) => (
              <React.Fragment key={member.id}>
                <div className="flex items-center gap-2 p-2 rounded bg-[#16140E] border border-[#C5A358]/30 shrink-0">
                  <img src={member.avatarUrl} alt="" className="w-6 h-6 rounded object-cover border border-[#222]" />
                  <div>
                    <span className="text-xs font-medium text-[#E0E0E0] block leading-tight">{member.displayName}</span>
                    <span className="text-[9px] text-[#888] block">{member.seniority}</span>
                  </div>
                </div>
                {idx < escalationChain.length - 1 && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A358] shrink-0" />
                )}
              </React.Fragment>
            ))}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-emerald-800/40 bg-emerald-950/20 text-emerald-300 text-[10px] shrink-0">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Human User</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Tree Area */}
      <div className="p-8 flex-1 overflow-x-auto flex justify-center items-start min-h-[500px]">
        <div className="flex items-start justify-center gap-12 pt-4">
          {rootAgents.map((root) => renderAgentNode(root))}
        </div>
      </div>

      {/* Department Breakdown Matrix */}
      <div className="p-6 border-t border-[#1A1A1A] bg-[#070707] shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#C5A358] mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" />
          <span>Departmental Governance & Autonomy Matrix</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {(Object.entries(departmentStats) as [string, DepartmentStat][]).map(([deptName, stat]) => (
            <div key={deptName} className="p-3 rounded border border-[#1C1C1C] bg-[#0A0A0A] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#E0E0E0]">{deptName}</span>
                <span className="text-[10px] text-[#777] font-mono">{stat.count} members</span>
              </div>
              <p className="text-[11px] text-[#888]">
                Lead: <span className="text-[#C5A358]">{stat.lead?.displayName || 'Shared'}</span>
              </p>
              <div className="flex items-center justify-between text-[10px] text-[#666] pt-1 border-t border-[#141414]">
                <span>Avg Autonomy:</span>
                <span className="font-mono text-[#AAA]">Level {stat.avgAutonomy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
