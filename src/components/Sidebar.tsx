import React, { useState } from 'react';
import { Agent, Project, Task } from '../types';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  Network,
  BarChart2,
  Brain,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
  Wrench,
  Bot
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
  const [isAgentsExpanded, setIsAgentsExpanded] = useState(true);

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shrink-0 select-none text-slate-800">
      {/* 1. Top Branding: SYNTHESIS AI */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-700 shadow-2xs">
            <Sparkles className="w-4.5 h-4.5 text-amber-600" />
          </div>
          <div className="flex items-center gap-1 font-bold tracking-wider text-sm text-slate-900 font-sans uppercase">
            <span>SYNTHESIS</span>
            <span className="text-amber-600">AI</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('chat')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'chat' && !isAgentsExpanded
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        {/* Agents (Collapsible Section matching Wireframe) */}
        <div>
          <button
            onClick={() => setIsAgentsExpanded(!isAgentsExpanded)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              currentTab === 'chat' || currentTab === 'agents'
                ? 'bg-slate-100/80 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Agents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-600 font-mono">
                {agents.length}
              </span>
              {isAgentsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </div>
          </button>

          {/* Expanded Nested Coworkers List matching Wireframe */}
          {isAgentsExpanded && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-200 space-y-1">
              {agents.map((agent) => {
                const isSelected = agent.id === selectedAgentId && currentTab === 'chat';
                const isBusy = agent.runtimeState.status === 'working' || agent.runtimeState.status === 'thinking';
                const statusLabel = isBusy ? 'Busy' : agent.runtimeState.status === 'offline' ? 'Offline' : 'Online';
                const statusDotColor = isBusy
                  ? 'bg-amber-500'
                  : agent.runtimeState.status === 'offline'
                  ? 'bg-slate-400'
                  : 'bg-emerald-500';

                return (
                  <div
                    key={agent.id}
                    onClick={() => {
                      onSelectAgent(agent.id);
                      onSelectTab('chat');
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition cursor-pointer group ${
                      isSelected
                        ? 'bg-amber-50/70 text-amber-950 font-semibold shadow-2xs border border-amber-200/60'
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="relative shrink-0">
                        <img
                          src={agent.avatarUrl}
                          alt={agent.displayName}
                          referrerPolicy="no-referrer"
                          onError={(e) => handleAvatarError(e)}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white ${statusDotColor}`}
                        />
                      </div>
                      <span className="text-xs truncate font-medium">{agent.displayName}</span>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono shrink-0 capitalize">
                      {statusLabel}
                    </span>
                  </div>
                );
              })}

              {/* + New Agent Button */}
              <button
                onClick={onOpenWizard}
                className="w-full mt-1.5 py-1.5 px-2.5 rounded-xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/50 text-[11px] font-medium text-slate-600 hover:text-amber-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>New Agent</span>
              </button>
            </div>
          )}
        </div>

        {/* Projects */}
        <button
          onClick={() => onSelectTab('projects')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'projects'
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <FolderKanban className="w-4 h-4 text-slate-500" />
            <span>Projects</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-600 font-mono">
            {projects.length}
          </span>
        </button>

        {/* History / Tasks */}
        <button
          onClick={() => onSelectTab('collaborate')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'collaborate'
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Tasks</span>
          </div>
          {activeTasks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono font-medium">
              {activeTasks.length}
            </span>
          )}
        </button>

        {/* Team / Org Chart */}
        <button
          onClick={() => onSelectTab('org_chart')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'org_chart'
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Network className="w-4 h-4 text-slate-500" />
          <span>Team</span>
        </button>

        {/* Reports / Memory Hub */}
        <button
          onClick={() => onSelectTab('memory')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'memory'
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-slate-500" />
          <span>Reports</span>
        </button>

        {/* Tools & Security */}
        <button
          onClick={() => onSelectTab('security')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'security'
              ? 'bg-slate-100/90 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <span>Tools</span>
        </button>
      </div>

      {/* 4. Bottom Section: Settings */}
      <div className="p-4 border-t border-slate-100 shrink-0">
        <button
          onClick={() => onSelectTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            currentTab === 'settings'
              ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-500" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
