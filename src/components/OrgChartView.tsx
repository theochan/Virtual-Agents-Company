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
          className={`w-72 rounded-xl border p-4 transition-all duration-200 shadow-xs relative ${
            isSelectedInChain
              ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-400/50 shadow-md'
              : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-md'
          }`}
        >
          {/* Top meta strip */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 uppercase">
              {agent.seniority}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  agent.runtimeState.status === 'working'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="text-[10px] text-slate-500 capitalize font-medium">{agent.runtimeState.status}</span>
            </div>
          </div>

          {/* Identity & Department */}
          <div className="flex items-start gap-3">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
              referrerPolicy="no-referrer"
              onError={(e) => handleAvatarError(e)}
              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0 shadow-xs"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-serif font-bold text-slate-900 truncate">
                  {agent.displayName}
                </h4>
                <span className="text-[9px] text-slate-500 font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                  L{agent.autonomyLevel}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate font-sans">{agent.jobTitle}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                  {agent.department}
                </span>
                {agent.departmentRole === 'lead' && (
                  <span className="text-[9px] text-amber-800 font-bold px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300">
                    Lead
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Direct Reports Count & Quick Actions */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {directReports.length} {directReports.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedAgentForChain(selectedAgentForChain === agent.id ? null : agent.id)}
                title="View Escalation & Approval Chain"
                className={`p-1.5 rounded-md transition cursor-pointer text-[10px] flex items-center gap-1 ${
                  selectedAgentForChain === agent.id
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onOpenProfile(agent)}
                title="Open Dossier"
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => onSelectAgent(agent.id)}
                title="Start Direct Chat"
                className="p-1.5 rounded-md text-slate-500 hover:text-amber-800 hover:bg-amber-50 transition cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Manager Reassignment Dropdown */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Reports to:</span>
            {isReassigning ? (
              <select
                autoFocus
                defaultValue={agent.reportsTo || 'none'}
                onChange={(e) => handleManagerSelect(agent.id, e.target.value)}
                onBlur={() => setReassigningAgentId(null)}
                className="bg-white text-slate-800 border border-amber-400 rounded-md px-1.5 py-0.5 text-[10px] focus:outline-none shadow-xs"
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
                className="text-amber-800 hover:text-amber-900 font-semibold cursor-pointer flex items-center gap-1 font-mono truncate max-w-[140px]"
              >
                <span>{agent.reportsTo && agentMap.has(agent.reportsTo) ? agentMap.get(agent.reportsTo)!.displayName : 'Executive'}</span>
                <span className="text-[9px] text-slate-400">✎</span>
              </button>
            )}
          </div>

          {/* Expand/Collapse Handle */}
          {hasReports && (
            <button
              onClick={() => toggleCollapse(agent.id)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-slate-300 hover:border-amber-500 text-slate-600 hover:text-amber-800 flex items-center justify-center transition shadow-md cursor-pointer z-10"
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
            <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-amber-400/80" />

            {/* Subordinates container */}
            <div className="flex items-start justify-center gap-6 relative">
              {directReports.length > 1 && (
                <div
                  className="absolute top-0 h-0.5 bg-amber-400/80 rounded-full"
                  style={{
                    left: `calc(18rem / 2)`,
                    right: `calc(18rem / 2)`
                  }}
                />
              )}

              {directReports.map((subordinate) => (
                <div key={subordinate.id} className="relative flex flex-col items-center">
                  {/* Vertical connector connecting down to child node */}
                  <div className="w-0.5 h-6 bg-amber-400/80 mb-0" />
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
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-amber-300/80 bg-amber-50 flex items-center justify-center text-amber-700 shadow-2xs">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-slate-900 tracking-tight">
              Organizational Hierarchy & Chain of Command
            </h2>
            <p className="text-xs text-slate-500">
              Governance topology • Delegation authority • Escalation paths • Reporting relationships
            </p>
          </div>
        </div>

        {/* Feedback alert */}
        {feedbackMessage && (
          <div className="px-3.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-1.5 shadow-2xs animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* Governance Summary Dashboard Bar */}
      <div className="p-4 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-4 gap-3 text-xs shadow-2xs">
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Total AI Coworkers</span>
            <span className="text-lg font-mono text-slate-900 font-semibold">{agents.length}</span>
          </div>
          <Users className="w-4 h-4 text-amber-600" />
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Active Departments</span>
            <span className="text-lg font-mono text-slate-900 font-semibold">
              {Object.keys(departmentStats).length}
            </span>
          </div>
          <Building2 className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Executive Leads</span>
            <span className="text-lg font-mono text-slate-900 font-semibold">
              {agents.filter((a) => a.seniority.includes('Lead') || a.seniority.includes('Executive')).length}
            </span>
          </div>
          <Shield className="w-4 h-4 text-sky-600" />
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">Escalation Resolver</span>
            <span className="text-xs text-amber-800 font-medium block truncate max-w-[130px]">
              {rootAgents[0]?.displayName || 'Sarah'} (Chief of Staff)
            </span>
          </div>
          <GitBranch className="w-4 h-4 text-amber-600" />
        </div>
      </div>

      {/* Escalation Path Inspector (shows when an agent is selected) */}
      {selectedAgentForChain && escalationChain.length > 0 && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Escalation & Approval Route for {escalationChain[0].displayName}
              </h4>
            </div>
            <p className="text-[11px] text-slate-600">
              Decisions exceeding Autonomy Level {escalationChain[0].autonomyLevel} or tool disputes automatically bubble up along this chain.
            </p>
          </div>

          {/* Chain visualization */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {escalationChain.map((member, idx) => (
              <React.Fragment key={member.id}>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 shadow-2xs shrink-0">
                  <img src={member.avatarUrl} alt="" className="w-6 h-6 rounded-md object-cover border border-slate-200" />
                  <div>
                    <span className="text-xs font-medium text-slate-900 block leading-tight">{member.displayName}</span>
                    <span className="text-[9px] text-slate-500 block">{member.seniority}</span>
                  </div>
                </div>
                {idx < escalationChain.length - 1 && (
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-100/70 text-emerald-800 text-[10px] font-medium shrink-0 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
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
      <div className="p-6 border-t border-slate-200 bg-white shrink-0 shadow-2xs">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          <span>Departmental Governance & Autonomy Matrix</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {(Object.entries(departmentStats) as [string, DepartmentStat][]).map(([deptName, stat]) => (
            <div key={deptName} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{deptName}</span>
                <span className="text-[10px] text-slate-500 font-mono">{stat.count} members</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Lead: <span className="text-amber-800 font-medium">{stat.lead?.displayName || 'Shared'}</span>
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-200">
                <span>Avg Autonomy:</span>
                <span className="font-mono text-slate-800 font-medium">Level {stat.avgAutonomy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
