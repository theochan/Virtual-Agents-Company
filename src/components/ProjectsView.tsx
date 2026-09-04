import React, { useState, useRef, useEffect } from 'react';
import { Project, Agent, MemoryItem, Artifact, Task } from '../types';
import {
  FolderKanban,
  Target,
  Users,
  CheckCircle2,
  FileText,
  Brain,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  Plus,
  Search,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  AlertTriangle,
  Check
} from 'lucide-react';

interface ProjectsViewProps {
  project?: Project;
  allProjects: Project[];
  onSelectProject: (projectId: string) => void;
  agents: Agent[];
  memories: MemoryItem[];
  artifacts: Artifact[];
  tasks: Task[];
  onOpenArtifact: (artifact: Artifact) => void;
  isCollaborating?: boolean;
  onCreateProject?: (newProj: Partial<Project>) => void;
  onUpdateProjectStatus?: (projectId: string, status: Project['status']) => void;
  onDeleteProject?: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  project,
  allProjects = [],
  onSelectProject,
  agents,
  memories,
  artifacts,
  tasks,
  onOpenArtifact,
  isCollaborating,
  onCreateProject,
  onUpdateProjectStatus,
  onDeleteProject
}) => {
  // Selector and modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // New project form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [newLeadId, setNewLeadId] = useState(agents[0]?.id || 'agent-sarah');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const getAgent = (agentId: string) => {
    return agents.find((a) => a.id === agentId);
  };

  // Filter projects by search
  const filteredProjects = allProjects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProjects = filteredProjects.filter((p) => p.status !== 'archived');
  const archivedProjects = filteredProjects.filter((p) => p.status === 'archived');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onCreateProject) return;

    const leadAgent = getAgent(newLeadId);
    onCreateProject({
      name: newName.trim(),
      description: newDesc.trim() || 'Custom initiative in Acme Corp workspace.',
      objective: newObjective.trim() || 'Deliver milestone with multi-agent coordination.',
      status: 'active',
      ownerAgentId: newLeadId,
      members: leadAgent
        ? [
            {
              projectId: '',
              agentId: leadAgent.id,
              role: `${leadAgent.displayName} (Lead)`,
              permissions: 'lead'
            }
          ]
        : []
    });

    setNewName('');
    setNewDesc('');
    setNewObjective('');
    setIsCreateModalOpen(false);
  };

  const handleDeleteCurrent = () => {
    if (!project || !onDeleteProject) return;
    onDeleteProject(project.id);
    setIsDeleteConfirmOpen(false);
  };

  // 1. EMPTY STATE: When all projects are deleted or none exist
  if (!project || allProjects.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
        {/* Top Header */}
        <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif italic text-[#F0F0F0]">Initiatives & Projects</h2>
              <span className="text-[10px] uppercase tracking-widest text-[#555] font-mono">Workspace: Acme Corp</span>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-[#C5A358] hover:bg-[#d4b465] text-black font-semibold text-xs transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Empty State Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#0A0A0A] border border-[#222] flex items-center justify-center text-[#C5A358] mb-4 shadow-inner">
            <FolderKanban className="w-8 h-8 opacity-90" />
          </div>
          <h3 className="text-xl font-serif text-[#F0F0F0] mb-2 tracking-tight">No Active Projects</h3>
          <p className="text-xs text-[#888] leading-relaxed mb-6">
            All projects have been deleted or archived. Projects establish workstream boundaries, isolated memory scopes, and assigned coworker squads so autonomous agents collaborate with zero cross-tenant contamination.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded bg-[#C5A358] hover:bg-[#d4b465] text-black font-semibold text-xs shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Initiative</span>
          </button>
        </div>

        {/* Create Project Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0A0A0A] border border-[#222] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
                <div className="flex items-center gap-2 text-[#C5A358]">
                  <FolderKanban className="w-4 h-4" />
                  <h3 className="text-sm font-semibold text-[#F0F0F0]">Create Workspace Project</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-[#666] hover:text-[#CCC] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Project Apollo, Compliance Framework"
                    className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                    Lead Agent
                  </label>
                  <select
                    value={newLeadId}
                    onChange={(e) => setNewLeadId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition cursor-pointer"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} — {a.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                    High-Level Objective
                  </label>
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="e.g. Deploy SOC2 audit controls before Q4"
                    className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of deliverables and scope..."
                    className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 rounded text-xs text-[#888] hover:text-[#DDD] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-[#C5A358] hover:bg-[#d4b465] text-black font-semibold text-xs transition cursor-pointer"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter project-specific memories & artifacts
  const projectMemories = memories.filter((m) => m.scope === 'project' && m.projectId === project.id);
  const projectArtifacts = artifacts.filter((a) => a.projectId === project.id);

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Top Banner & Project Selector */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4 min-w-[280px]">
          <div className="w-12 h-12 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358] shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-serif italic text-[#F0F0F0] tracking-tight">{project.name}</h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded capitalize font-medium ${
                  project.status === 'active'
                    ? 'border border-emerald-800/40 bg-emerald-950/40 text-emerald-400'
                    : project.status === 'archived'
                    ? 'border border-zinc-700 bg-zinc-800 text-zinc-400'
                    : 'border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358]'
                }`}
              >
                {project.status}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#555] font-mono">Workspace: Acme Corp</span>
            </div>
            <p className="text-xs text-[#888] mt-1 max-w-xl line-clamp-1">{project.description}</p>
          </div>
        </div>

        {/* Scalable Project Switcher & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dropdown Project Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-[#121212] border border-[#222] hover:border-[#333] transition cursor-pointer text-xs font-medium text-[#F0F0F0] shadow-sm"
              title="Switch project"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#C5A358]" />
              <span className="max-w-[140px] truncate">{project.name}</span>
              <span className="text-[10px] text-[#666] font-mono">({allProjects.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#777] transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0A0A0A] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Search Bar if multiple projects */}
                {allProjects.length > 3 && (
                  <div className="p-2.5 border-b border-[#1A1A1A]">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#050505] border border-[#1E1E1E]">
                      <Search className="w-3.5 h-3.5 text-[#666]" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full bg-transparent text-xs text-[#EEE] placeholder-[#666] outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Projects List */}
                <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-[#141414]">
                  {/* Active Projects */}
                  <div className="space-y-1">
                    <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#666]">
                      Active Projects ({activeProjects.length})
                    </div>
                    {activeProjects.map((p) => {
                      const isSelected = p.id === project.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProject(p.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#C5A358]/15 text-[#C5A358] border border-[#C5A358]/30 font-medium'
                              : 'text-[#DDD] hover:bg-[#141414] hover:text-[#FFF]'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold block truncate">{p.name}</span>
                            <span className="text-[10px] text-[#777] block truncate">
                              {p.members?.length || 0} members • {p.status}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A358] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Archived Projects */}
                  {archivedProjects.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#555]">
                        Archived ({archivedProjects.length})
                      </div>
                      {archivedProjects.map((p) => {
                        const isSelected = p.id === project.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              onSelectProject(p.id);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer opacity-70 hover:opacity-100 ${
                              isSelected
                                ? 'bg-[#222] text-[#E0E0E0] font-medium'
                                : 'text-[#888] hover:bg-[#141414] hover:text-[#CCC]'
                            }`}
                          >
                            <span className="truncate mr-2 italic">{p.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1A1A1A] text-[#666] font-mono">
                              Archived
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredProjects.length === 0 && (
                    <div className="py-4 text-center text-xs text-[#666]">
                      No matching projects found
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-2 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between">
                  <span className="text-[10px] text-[#666] font-mono">Workspace Acme</span>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#C5A358]/10 hover:bg-[#C5A358]/20 border border-[#C5A358]/30 text-[#C5A358] text-[11px] font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Archive / Restore Button */}
          {onUpdateProjectStatus && (
            <button
              onClick={() => {
                const nextStatus = project.status === 'archived' ? 'active' : 'archived';
                onUpdateProjectStatus(project.id, nextStatus);
              }}
              title={project.status === 'archived' ? 'Restore project to active' : 'Archive project'}
              className="p-2 rounded-lg border border-[#222] bg-[#0A0A0A] hover:bg-[#141414] text-[#888] hover:text-[#E0E0E0] transition cursor-pointer"
            >
              {project.status === 'archived' ? (
                <ArchiveRestore className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Delete Project Button */}
          {onDeleteProject && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              title="Delete this project"
              className="p-2 rounded-lg border border-[#222] bg-[#0A0A0A] hover:bg-rose-950/30 hover:border-rose-900/40 text-[#888] hover:text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* New Project Quick Button */}
          {onCreateProject && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              title="Create new project"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222] bg-[#0A0A0A] hover:bg-[#141414] text-[#CCC] text-xs font-medium transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A358]" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Project Dashboard */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Memory Isolation Alert */}
        {project.id === 'proj-atlas' ? (
          <div className="p-4 rounded border border-amber-800/40 bg-amber-950/20 text-amber-200 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold block">Multi-Tenant Workstream Isolation Active</span>
              <span>
                Atlas agents have access ONLY to Project Atlas memory and global Organization memory. They cannot access Project Phoenix decisions or PostgreSQL benchmarks unless explicitly shared.
              </span>
            </div>
          </div>
        ) : null}

        {/* 1. OBJECTIVE SECTION (Section 41) */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-2">
          <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
            <Target className="w-3.5 h-3.5 text-[#C5A358]" />
            <span>OBJECTIVE</span>
          </div>
          <p className="text-sm font-medium text-[#F0F0F0] font-serif">{project.objective}</p>
          <p className="text-xs text-[#888] leading-relaxed">{project.description}</p>
        </div>

        {/* Grid of Team and Active Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. TEAM SECTION */}
          <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
                <Users className="w-3.5 h-3.5 text-[#C5A358]" />
                <span>TEAM ({project.members?.length || 0})</span>
              </div>
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Assigned Persistent Coworkers</span>
            </div>

            <div className="divide-y divide-[#1A1A1A]">
              {(project.members || []).map((member) => {
                const agent = getAgent(member.agentId);
                if (!agent) return null;
                return (
                  <div key={member.agentId} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.displayName}
                        className="w-9 h-9 rounded object-cover border border-[#222]"
                      />
                      <div>
                        <span className="text-xs font-semibold text-[#F0F0F0] block">{agent.displayName}</span>
                        <span className="text-[11px] text-[#777]">{member.role}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded capitalize font-mono ${
                        member.permissions === 'lead'
                          ? 'border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-semibold'
                          : 'border border-[#1A1A1A] bg-[#070707] text-[#888]'
                      }`}
                    >
                      {member.permissions}
                    </span>
                  </div>
                );
              })}
              {(!project.members || project.members.length === 0) && (
                <div className="py-4 text-center text-xs text-[#666]">
                  No agents assigned yet to this initiative.
                </div>
              )}
            </div>
          </div>

          {/* 3. ACTIVE TASKS SECTION */}
          <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
                <Activity className="w-3.5 h-3.5 text-[#C5A358]" />
                <span>ACTIVE TASKS</span>
              </div>
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Task Engine</span>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#F0F0F0] block">Architecture Review: Backend Rebuild</span>
                  <span className="text-[11px] text-[#777]">Owned by Marcus • Completed</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  Done
                </span>
              </div>

              <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#F0F0F0] block">Database Migration Assessment</span>
                  <span className="text-[11px] text-[#777]">Owned by Sarah • Synthesized</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358]">
                  Approved
                </span>
              </div>

              <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A] flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#F0F0F0] block">Authentication & Session Architecture</span>
                  <span className="text-[11px] text-[#777]">Auth.js specification review</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                  Done
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. RECENT DECISIONS (Section 41) */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A358]" />
              <span>RECENT DECISIONS</span>
            </div>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Authoritative Project Record</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(project.recentDecisions || []).map((dec) => {
              const decAgent = getAgent(dec.agentId);
              return (
                <div key={dec.id} className="p-3.5 rounded bg-[#070707] border border-[#1A1A1A] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F0F0F0]">{dec.title}</span>
                    <span className="text-[10px] text-[#666] font-mono">
                      {new Date(dec.decidedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#BBB] leading-relaxed italic">{dec.decision}</p>
                  {decAgent && (
                    <span className="text-[10px] text-[#C5A358] block pt-1 font-mono">Decided by: {decAgent.displayName}</span>
                  )}
                </div>
              );
            })}
            {(!project.recentDecisions || project.recentDecisions.length === 0) && (
              <div className="col-span-2 py-4 text-center text-xs text-[#666]">
                No authoritative architectural decisions logged yet for this project.
              </div>
            )}
          </div>
        </div>

        {/* 5. PROJECT MEMORY (Section 36, 41) */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
              <Brain className="w-3.5 h-3.5 text-[#C5A358]" />
              <span>PROJECT MEMORY ({projectMemories.length} durable memories)</span>
            </div>
            <span className="text-[10px] text-[#555] font-mono">Scope: Shared to {project.name} Members Only</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectMemories.map((mem) => {
              const isSuperseded = mem.status === 'superseded';
              const author = getAgent(mem.provenance.originalAgentId);

              return (
                <div
                  key={mem.id}
                  className={`p-3.5 rounded border transition ${
                    isSuperseded
                      ? 'bg-[#070707]/50 border-[#1A1A1A]/50 opacity-50'
                      : 'bg-[#070707] border-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                        isSuperseded
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40 line-through'
                          : 'border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358]'
                      }`}
                    >
                      {mem.type} {isSuperseded && '(SUPERSEDED)'}
                    </span>
                    <span className="text-[10px] text-[#666] font-mono">
                      Importance: {mem.importance}/10 • Conf: {Math.round(mem.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-[#CCC] leading-relaxed">{mem.content}</p>

                  <div className="mt-2.5 pt-2 border-t border-[#1A1A1A] flex items-center justify-between text-[10px] text-[#666]">
                    <span>Origin: {author?.displayName || 'System'}</span>
                    {mem.provenance.promotionHistory.length > 0 && (
                      <span className="text-[#C5A358] font-mono">
                        Promoted: {mem.provenance.promotionHistory[0].fromScope} → {mem.scope}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {projectMemories.length === 0 && (
              <div className="col-span-2 py-4 text-center text-xs text-[#666]">
                No project-scoped memories yet. Important decisions from agent collaborations will be promoted here.
              </div>
            )}
          </div>
        </div>

        {/* 6. FILES & ARTIFACTS SECTION */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5 text-[#C5A358]" />
              <span>FILES & REUSABLE ARTIFACTS ({projectArtifacts.length})</span>
            </div>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Cross-Agent Artifact Hub</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projectArtifacts.map((art) => {
              const author = getAgent(art.createdByAgentId);
              return (
                <div
                  key={art.id}
                  onClick={() => onOpenArtifact(art)}
                  className="p-3 rounded bg-[#070707] border border-[#1A1A1A] hover:border-[#C5A358]/40 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <FileText className="w-4 h-4 text-[#C5A358]" />
                    <span className="text-[9px] font-mono text-[#666] uppercase">{art.type}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2 group-hover:text-[#C5A358] transition truncate">
                    {art.title}
                  </h4>
                  <p className="text-[10px] font-mono text-[#666] mt-0.5">{art.filename}</p>
                  <p className="text-[10px] text-[#666] mt-2">By: {author?.displayName || 'Unknown'}</p>
                </div>
              );
            })}
            {projectArtifacts.length === 0 && (
              <div className="col-span-3 py-4 text-center text-xs text-[#666]">
                No generated artifacts linked to this project yet.
              </div>
            )}
          </div>
        </div>

        {/* 7. ACTIVITY TIMELINE */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-3">
          <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
            <Calendar className="w-3.5 h-3.5 text-[#C5A358]" />
            <span>ACTIVITY</span>
          </div>

          <div className="space-y-2 text-xs text-[#BBB]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A358]" />
              <span><strong className="text-[#F0F0F0]">Sarah</strong> approved phased migration plan to PostgreSQL.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A358]" />
              <span><strong className="text-[#F0F0F0]">Daniel</strong> submitted cost analysis & recommended Q1 production cutover.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A358]" />
              <span><strong className="text-[#F0F0F0]">Emma</strong> added 4 research benchmarks on Drizzle ORM and PostgreSQL adoption.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A358]" />
              <span><strong className="text-[#F0F0F0]">Marcus</strong> completed architecture assessment & verified EU data residency compliance.</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#222] rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
              <div className="flex items-center gap-2 text-[#C5A358]">
                <FolderKanban className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-[#F0F0F0]">Create Workspace Project</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#666] hover:text-[#CCC] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Project Apollo, Compliance Framework"
                  className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                  Lead Agent
                </label>
                <select
                  value={newLeadId}
                  onChange={(e) => setNewLeadId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition cursor-pointer"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} — {a.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                  High-Level Objective
                </label>
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="e.g. Deploy SOC2 audit controls before Q4"
                  className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#777] block mb-1 font-medium">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of deliverables and scope..."
                  className="w-full px-3 py-2 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs text-[#888] hover:text-[#DDD] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#C5A358] hover:bg-[#d4b465] text-black font-semibold text-xs transition cursor-pointer"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-rose-900/40 rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-[#F0F0F0]">Delete {project.name}?</h3>
            </div>
            <p className="text-xs text-[#999] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#FFF]">{project.name}</strong>? Any associated work items will be safely unlinked rather than deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-[#888] hover:text-[#DDD] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCurrent}
                className="px-3.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
