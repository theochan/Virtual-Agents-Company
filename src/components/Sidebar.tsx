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
  Wrench
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'chat' | 'projects' | 'collaborate' | 'agents' | 'memory' | 'security' | 'settings';
  onSelectTab: (tab: 'chat' | 'projects' | 'collaborate' | 'agents' | 'memory' | 'security' | 'settings') => void;
  agents: Agent[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  activeTasks: Task[];
  onOpenWizard: () => void;
  onRunSuccessDemo: () => void;
  isDemoRunning: boolean;
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
  onOpenWizard,
  onRunSuccessDemo,
  isDemoRunning
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
    <aside className="w-72 h-screen bg-[#050505] border-r border-[#1A1A1A] flex flex-col shrink-0 select-none text-[#E0E0E0]">
      {/* Workspace Header with Sophisticated Branding */}
      <div className="p-5 border-b border-[#1A1A1A] bg-[#070707]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[#C5A358] font-serif italic text-2xl tracking-tight leading-none">Cognis.</div>
            <p className="text-[10px] uppercase tracking-widest text-[#555] mt-1 font-semibold">
              Agent Company • Executive View
            </p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#C5A358]/20 text-[#C5A358] bg-[#C5A358]/5 font-mono">
            Online
          </span>
        </div>

        {/* Quick Workflow Demo Trigger */}
        <button
          id="btn-run-success-scenario"
          onClick={onRunSuccessDemo}
          disabled={isDemoRunning}
          className="mt-3 w-full py-2 px-3 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-xs font-medium flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className={`w-3.5 h-3.5 text-[#C5A358] ${isDemoRunning ? 'animate-spin' : ''}`} />
          <span>{isDemoRunning ? 'Orchestrating Specialists...' : 'Run Phoenix Multi-Agent Demo'}</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="p-2 border-b border-[#1A1A1A] bg-[#070707]/40 grid grid-cols-3 gap-1 text-xs">
        <button
          id="nav-tab-chat"
          onClick={() => onSelectTab('chat')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'chat'
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
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
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
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
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
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
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Agents</span>
        </button>

        <button
          id="nav-tab-memory"
          onClick={() => onSelectTab('memory')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'memory'
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Memory</span>
        </button>

        <button
          id="nav-tab-tools"
          onClick={() => onSelectTab('security')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'security'
              ? 'bg-[#111] text-[#C5A358] border border-[#C5A358]/30 shadow-sm'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E]'
          }`}
          title="Enterprise Tools & Security Approvals"
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Tools</span>
        </button>
      </div>

      {/* Admin LLM Settings Dedicated Bar */}
      <div className="px-3 pb-2">
        <button
          id="nav-tab-settings"
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded font-medium transition cursor-pointer text-xs ${
            currentTab === 'settings'
              ? 'bg-[#C5A358]/15 text-[#C5A358] border border-[#C5A358]/40 shadow-sm font-semibold'
              : 'text-[#888] hover:text-[#E0E0E0] hover:bg-[#0E0E0E] border border-[#1A1A1A]'
          }`}
          title="LLM Models & API Keys Settings"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-[#C5A358]" />
            <span>Admin Settings</span>
          </div>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#C5A358]/10 text-[#C5A358] border border-[#C5A358]/20">
            LLM Config
          </span>
        </button>
      </div>

      {/* Agents / Projects Selector Header */}
      <div className="p-3 border-b border-[#1A1A1A] bg-[#070707]/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#555] font-semibold">
            {currentTab === 'projects'
              ? 'Active Workstreams'
              : currentTab === 'chat' || currentTab === 'agents'
              ? 'Persistent Coworkers'
              : 'Team Directory'}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded border border-[#1A1A1A] bg-[#0A0A0A] text-[#888] font-mono">
            {currentTab === 'projects' ? filteredProjects.length : filteredAgents.length}
          </span>
        </div>

        {currentTab !== 'projects' && (
          <button
            id="btn-sidebar-create-agent"
            onClick={onOpenWizard}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-[#C5A358]/40 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-xs font-medium transition cursor-pointer"
            title="Create New AI Coworker"
          >
            <Plus className="w-3 h-3" />
            <span>New Agent</span>
          </button>
        )}
      </div>

      {/* Contextual Search and Status Filters */}
      {currentTab === 'projects' ? (
        // Project Search & Status Filter (All, Active, Archived — NO "Idle" since projects aren't execution threads)
        <div className="px-3 pt-2 pb-2 space-y-2 border-b border-[#1A1A1A] bg-[#070707]/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-project-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or objectives..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0A0A0A] border border-[#1A1A1A] rounded text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setProjectStatusFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'all'
                  ? 'bg-[#141414] text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setProjectStatusFilter('active')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'active'
                  ? 'bg-[#C5A358]/15 text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setProjectStatusFilter('archived')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                projectStatusFilter === 'archived'
                  ? 'bg-[#0E0E0E] text-[#BBB] border border-[#222] font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      ) : currentTab === 'chat' || currentTab === 'agents' ? (
        // Agent Search & Status Filter (All, Active, Idle — filters working vs idle agents)
        <div className="px-3 pt-2 pb-2 space-y-2 border-b border-[#1A1A1A] bg-[#070707]/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-agent-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents or skills..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0A0A0A] border border-[#1A1A1A] rounded text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setAgentStatusFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'all'
                  ? 'bg-[#141414] text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAgentStatusFilter('working')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'working'
                  ? 'bg-[#C5A358]/15 text-[#C5A358] border border-[#C5A358]/30 font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setAgentStatusFilter('idle')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                agentStatusFilter === 'idle'
                  ? 'bg-[#0E0E0E] text-[#BBB] border border-[#222] font-medium'
                  : 'text-[#666] hover:text-[#BBB]'
              }`}
            >
              Idle
            </button>
          </div>
        </div>
      ) : null}

      {/* List Content */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1A1A1A]/40">
        {currentTab === 'projects' ? (
          // Projects List (uses filteredProjects)
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
                      ? 'bg-[#0E0E0E] border-[#C5A358] border-l-2'
                      : 'border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[#C5A358] font-serif' : 'text-[#F0F0F0]'}`}>
                      {proj.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#1A1A1A] bg-[#050505] text-[#888] capitalize">
                      {proj.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#888] line-clamp-1 mt-1 italic leading-relaxed">{proj.objective}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1A1A1A] text-[10px] text-[#555]">
                    <span>{proj.members?.length || 0} specialists</span>
                    <span>{proj.recentDecisions?.length || 0} decisions</span>
                  </div>
                </div>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="p-4 text-center text-xs text-[#666]">
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
                      ? 'bg-[#0E0E0E] border-l-2 border-[#C5A358] border-t-[#1A1A1A] border-r-[#1A1A1A] border-b-[#1A1A1A]'
                      : 'border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#C5A358]/30'
                  }`}
                >
                  {/* Portrait Avatar with Status Pip */}
                  <div className="relative shrink-0">
                    <img
                      src={agent.avatarUrl}
                      alt={agent.displayName}
                      className="w-9 h-9 rounded object-cover border border-[#222]"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#050505] ${getStatusColor(
                        agent.runtimeState.status
                      )}`}
                      title={`Status: ${agent.runtimeState.status}`}
                    />
                  </div>

                  {/* Agent Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`text-xs font-medium truncate ${isSelected ? 'text-[#C5A358]' : 'text-[#F0F0F0]'}`}>
                          {agent.displayName}
                        </span>
                        {isLead && (
                          <span className="text-[8px] px-1 py-0.2 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                            LEAD
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#555] font-mono shrink-0">
                        {agent.runtimeState.status === 'working' ? 'Busy' : 'Idle'}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#888] truncate">{agent.jobTitle}</p>

                    <p className="text-[9px] text-[#555] truncate mt-0.5 font-mono">
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
        className="p-3.5 border-t border-[#1A1A1A] bg-[#050505] hover:bg-[#0A0A0A] flex items-center justify-between cursor-pointer transition group"
        title="Open Admin LLM Model & Key Settings"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C5A358] to-[#634E1C] shrink-0 border border-[#C5A358]/40 flex items-center justify-center text-black font-serif font-bold text-xs group-hover:scale-105 transition">
            C
          </div>
          <div className="text-xs">
            <p className="font-semibold text-[#F0F0F0] text-xs leading-none group-hover:text-[#C5A358] transition">Executive View</p>
            <p className="text-[10px] text-[#777] mt-0.5">Admin Settings • LLM Config</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-[#666] group-hover:text-[#C5A358] transition" />
          <div className="w-2 h-2 rounded-full bg-[#C5A358] animate-pulse" title="System Nominal" />
        </div>
      </div>
    </aside>
  );
};
