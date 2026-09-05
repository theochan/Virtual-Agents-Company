import React, { useState, useEffect } from 'react';
import { Agent, Project, Task } from '../types';
import {
  MessageSquare,
  FolderKanban,
  GitMerge,
  Users,
  Brain,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Sparkles,
  Settings,
  Wrench,
  Network
} from 'lucide-react';
import { handleAvatarError } from '../lib/avatarCatalog';

interface SidebarProps {
  currentTab: 'chat' | 'projects' | 'collaborate' | 'agents' | 'org_chart' | 'memory' | 'security' | 'settings';
  onSelectTab: (tab: 'chat' | 'projects' | 'collaborate' | 'agents' | 'org_chart' | 'memory' | 'security' | 'settings') => void;
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  activeTasks: Task[];
  onOpenWizard: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  agents,
  selectedAgentId,
  onSelectAgent,
  projects,
  selectedProjectId,
  onSelectProject,
  activeTasks,
  onOpenWizard
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<'all' | 'working' | 'idle'>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Reset search when switching tabs
  useEffect(() => {
    setSearchQuery('');
  }, [currentTab]);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (agentStatusFilter === 'working') return a.runtimeState.status === 'working' || a.runtimeState.status === 'thinking';
    if (agentStatusFilter === 'idle') return a.runtimeState.status === 'idle';
    return true;
  });

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.objective.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (projectStatusFilter === 'active') return p.status !== 'archived';
    if (projectStatusFilter === 'archived') return p.status === 'archived';
    return true;
  });

  const getStatusColor = (status: Agent['runtimeState']['status']) => {
    switch (status) {
      case 'working':
      case 'thinking':
        return 'bg-[#C5A358] ring-[#C5A358]/30 animate-pulse';
      case 'waiting':
        return 'bg-[#888] ring-[#888]/30';
      case 'needs_approval':
        return 'bg-rose-400 ring-rose-400/30 animate-ping';
      case 'offline':
        return 'bg-[#444] ring-[#444]/30';
      default:
        return 'bg-emerald-400 ring-emerald-400/30';
    }
  };

  return (
    <aside className="w-72 h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 select-none text-slate-800">
      {/* Workspace Header with Sophisticated Branding */}
      <div className="p-5 border-b border-slate-200 bg-[#F8F9FA]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-amber-800 font-serif italic text-2xl tracking-tight leading-none">Cognis.</div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-semibold">
              Agent Company • Executive View
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-300 text-emerald-700 bg-emerald-50 font-mono">
            Online
          </span>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="p-2 border-b border-slate-200 bg-slate-50/50 grid grid-cols-3 gap-1 text-xs">
        <button
          id="nav-tab-chat"
          onClick={() => onSelectTab('chat')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'chat'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          id="nav-tab-projects"
          onClick={() => onSelectTab('projects')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'projects'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Projects</span>
        </button>

        <button
          id="nav-tab-collaborate"
          onClick={() => onSelectTab('collaborate')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'collaborate'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Tasks</span>
        </button>

        <button
          id="nav-tab-agents"
          onClick={() => onSelectTab('agents')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'agents'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Agents</span>
        </button>

        <button
          id="nav-tab-org-chart"
          onClick={() => onSelectTab('org_chart')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'org_chart'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Executive Tree & Organizational Hierarchy"
        >
          <Network className="w-3.5 h-3.5" />
          <span>Org Chart</span>
        </button>

        <button
          id="nav-tab-memory"
          onClick={() => onSelectTab('memory')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'memory'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Memory</span>
        </button>
      </div>

      {/* Utilities bar: Tools & Admin Settings */}
      <div className="px-3 pb-2 pt-1 grid grid-cols-2 gap-1.5">
        <button
          id="nav-tab-tools"
          onClick={() => onSelectTab('security')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'security'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
          title="Enterprise Tools & Security Approvals"
        >
          <Wrench className="w-3.5 h-3.5 text-amber-700" />
          <span>Tools</span>
        </button>

        <button
          id="nav-tab-settings"
          onClick={() => onSelectTab('settings')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'settings'
              ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
          title="LLM Models & API Keys Settings"
        >
          <Settings className="w-3.5 h-3.5 text-amber-700" />
          <span>Settings</span>
        </button>
      </div>

      {/* Agents / Projects Selector Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            {currentTab === 'projects'
              ? 'Active Workstreams'
              : currentTab === 'chat' || currentTab === 'agents'
              ? 'Persistent Coworkers'
              : 'Team Directory'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded border border-slate-200 bg-white text-slate-700 font-mono">
            {currentTab === 'projects' ? filteredProjects.length : filteredAgents.length}
          </span>
        </div>

        {currentTab !== 'projects' && (
          <button
            id="btn-sidebar-create-agent"
            onClick={onOpenWizard}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-amber-400/80 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium transition cursor-pointer"
            title="Create New AI Coworker"
          >
            <Plus className="w-3 h-3" />
            <span>New Agent</span>
          </button>
        )}
      </div>

      {/* Contextual Search and Status Filters */}
      {currentTab === 'projects' ? (
        // Project Search & Status Filter
        <div className="px-3 pt-2 pb-2 space-y-2 border-b border-slate-200 bg-slate-50/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-project-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or objectives..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setProjectStatusFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'all'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setProjectStatusFilter('active')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'active'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setProjectStatusFilter('archived')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'archived'
                  ? 'bg-slate-200 text-slate-700 border border-slate-300 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      ) : currentTab === 'chat' || currentTab === 'agents' ? (
        // Agent Search & Status Filter
        <div className="px-3 pt-2 pb-2 space-y-2 border-b border-slate-200 bg-slate-50/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-agent-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents or skills..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setAgentStatusFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'all'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAgentStatusFilter('working')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'working'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setAgentStatusFilter('idle')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'idle'
                  ? 'bg-slate-200 text-slate-700 border border-slate-300 font-medium'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Idle
            </button>
          </div>
        </div>
      ) : null}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {currentTab === 'projects' ? (
          // Projects List
          <div className="p-2 space-y-1.5">
            {filteredProjects.map((proj) => {
              const isSelected = proj.id === selectedProjectId;
              return (
                <div
                  key={proj.id}
                  id={`project-item-${proj.id}`}
                  onClick={() => onSelectProject(proj.id)}
                  className={`p-3 rounded border transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/40 border-amber-500 border-l-2 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-amber-900 font-serif' : 'text-slate-800'}`}>
                      {proj.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 capitalize font-mono">
                      {proj.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 italic leading-relaxed">{proj.objective}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>{proj.members?.length || 0} specialists</span>
                    <span>{proj.recentDecisions?.length || 0} decisions</span>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No projects match your filter.
              </div>
            )}
          </div>
        ) : (
          // Agents List
          <div className="p-1.5 space-y-1">
            {filteredAgents.map((agent) => {
              const isSelected = agent.id === selectedAgentId;
              const isLead =
                agent.jobTitle.toLowerCase().includes('chief') || agent.jobTitle.toLowerCase().includes('lead');

              return (
                <div
                  key={agent.id}
                  id={`agent-item-${agent.id}`}
                  onClick={() => onSelectAgent(agent.id)}
                  className={`p-2.5 rounded border flex items-center gap-3 transition cursor-pointer relative group ${
                    isSelected
                      ? 'bg-amber-50/40 border-l-2 border-amber-500 border-t-slate-200 border-r-slate-200 border-b-slate-200 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  {/* Portrait Avatar with Status Pip */}
                  <div className="relative shrink-0">
                    <img
                      src={agent.avatarUrl}
                      alt={agent.displayName}
                      referrerPolicy="no-referrer"
                      onError={(e) => handleAvatarError(e)}
                      className="w-9 h-9 rounded object-cover border border-slate-200"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${getStatusColor(
                        agent.runtimeState.status
                      )}`}
                      title={`Status: ${agent.runtimeState.status}`}
                    />
                  </div>

                  {/* Agent Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-amber-900 font-semibold' : 'text-slate-800'}`}>
                          {agent.displayName}
                        </span>
                        {isLead && (
                          <span className="text-[8px] px-1 py-0.2 rounded border border-amber-300 bg-amber-50 text-amber-800 font-mono">
                            LEAD
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono shrink-0">
                        {agent.runtimeState.status === 'working' ? 'Busy' : 'Idle'}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 truncate">{agent.jobTitle}</p>

                    <p className="text-[9px] text-slate-400 truncate mt-0.5 font-mono">
                      {agent.runtimeState.statusMessage || agent.primaryResponsibility.slice(0, 36) + '...'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Organization Summary - Executive View */}
      <div
        id="btn-footer-llm-settings"
        onClick={() => onSelectTab('settings')}
        className="p-3.5 border-t border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between cursor-pointer transition group"
        title="Open Admin LLM Model & Key Settings"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 shrink-0 border border-amber-400/40 flex items-center justify-center text-white font-serif font-bold text-xs group-hover:scale-105 transition shadow-xs">
            C
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-800 text-xs leading-none group-hover:text-amber-800 transition">Executive View</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Settings • LLM Config</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-800 transition" />
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Nominal" />
        </div>
      </div>
    </aside>
  );
};
