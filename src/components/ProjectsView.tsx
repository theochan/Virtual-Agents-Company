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

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !onCreateProject) return;

    const leadAgent = getAgent(newLeadId);
    const saved = await onCreateProject({
      name: newName.trim(),
      description: newDesc.trim() || '',
      objective: newObjective.trim() || '',
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

    if (!saved) return;
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
      <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif italic text-slate-900 tracking-tight">Initiatives & Projects</h2>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Local workspace</span>
            </div>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>

        {/* Empty State Body */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-amber-700 mb-4 shadow-2xs">
            <FolderKanban className="w-8 h-8 opacity-90" />
          </div>
          <h3 className="text-xl font-serif text-slate-900 mb-2 tracking-tight">No Active Projects</h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            All projects have been deleted or archived. Create a project to organize conversations, reviewed memories and draft deliverables.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Initiative</span>
          </button>
        </div>

        {/* Create Project Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <FolderKanban className="w-4 h-4" />
                  <h3 className="text-sm font-semibold text-slate-900 font-serif">Create Workspace Project</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Project Apollo, Compliance Framework"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                    Lead Agent
                  </label>
                  <select
                    value={newLeadId}
                    onChange={(e) => setNewLeadId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition cursor-pointer focus:ring-2 focus:ring-amber-500/20"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} — {a.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                    High-Level Objective
                  </label>
                  <input
                    type="text"
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    placeholder="e.g. Deploy SOC2 audit controls before Q4"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Brief description of deliverables and scope..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition resize-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
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
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Top Banner & Project Selector */}
      <div className="p-6 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-4 min-w-[280px]">
          <div className="w-12 h-12 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <FolderKanban className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-serif italic text-slate-900 tracking-tight">{project.name}</h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded capitalize font-semibold ${
                  project.status === 'active'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                    : project.status === 'archived'
                    ? 'border border-slate-200 bg-slate-100 text-slate-600'
                    : 'border border-amber-300 bg-amber-50 text-amber-900'
                }`}
              >
                {project.status}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">Local workspace</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl line-clamp-1">{project.description}</p>
          </div>
        </div>

        {/* Scalable Project Switcher & Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Dropdown Project Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 transition cursor-pointer text-xs font-semibold text-slate-900 shadow-2xs"
              title="Switch project"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
              <span className="max-w-[140px] truncate">{project.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">({allProjects.length})</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {/* Search Bar if multiple projects */}
                {allProjects.length > 3 && (
                  <div className="p-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Projects List */}
                <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 divide-y divide-slate-100">
                  {/* Active Projects */}
                  <div className="space-y-1">
                    <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
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
                              ? 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-semibold block truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {p.members?.length || 0} members • {p.status}
                            </span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Archived Projects */}
                  {archivedProjects.length > 0 && (
                    <div className="pt-2 space-y-1">
                      <div className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono">
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
                                ? 'bg-slate-100 text-slate-900 font-medium'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                          >
                            <span className="truncate mr-2 italic">{p.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              Archived
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredProjects.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No matching projects found
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-2.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">Local workspace</span>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
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
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
            >
              {project.status === 'archived' ? (
                <ArchiveRestore className="w-4 h-4 text-emerald-600" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Archive Project Button */}
          {onDeleteProject && (
            <button
              onClick={() => setIsDeleteConfirmOpen(true)}
              title="Archive this project and preserve evidence"
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-600 transition cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* New Project Quick Button */}
          {onCreateProject && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              title="Create new project"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-700" />
              <span>New</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Project Dashboard */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* 1. OBJECTIVE SECTION (Section 41) */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
            <Target className="w-3.5 h-3.5 text-amber-700" />
            <span>OBJECTIVE</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 font-serif">{project.objective}</p>{(project as any).legacyUnverified && <p className="text-xs text-amber-800">Imported legacy record. Prior decisions and completion claims have not been verified.</p>}
          <p className="text-xs text-slate-600 leading-relaxed">{project.description}</p>
        </div>

        {/* Grid of Team and Active Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. TEAM SECTION */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                <span>TEAM ({project.members?.length || 0})</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Assigned Persistent Coworkers</span>
            </div>

            <div className="divide-y divide-slate-100">
              {(project.members || []).map((member) => {
                const agent = getAgent(member.agentId);
                if (!agent) return null;
                return (
                  <div key={member.agentId} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={agent.avatarUrl}
                        alt={agent.displayName}
                        className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">{agent.displayName}</span>
                        <span className="text-[11px] text-slate-500">{member.role}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-2.5 py-0.5 rounded capitalize font-mono ${
                        member.permissions === 'lead'
                          ? 'border border-amber-300 bg-amber-50 text-amber-900 font-semibold'
                          : 'border border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {member.permissions}
                    </span>
                  </div>
                );
              })}
              {(!project.members || project.members.length === 0) && (
                <div className="py-4 text-center text-xs text-slate-400">
                  No agents assigned yet to this initiative.
                </div>
              )}
            </div>
          </div>

          {/* 3. ACTIVE TASKS SECTION */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
                <Activity className="w-3.5 h-3.5 text-amber-700" />
                <span>ACTIVE TASKS</span>
              </div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Task Engine</span>
            </div>

            <div className="space-y-2">
              {tasks.filter(task => task.projectId === project.id).map(task => <div key={task.id} className="border rounded-xl p-3 text-xs flex justify-between gap-3"><span>{task.title}</span><span className="font-mono">{task.status}</span></div>)}
              {!tasks.some(task => task.projectId === project.id) && <p className="text-xs text-slate-500">No recorded runs for this project.</p>}
            </div>
          </div>
        </div>

        {/* 4. RECENT DECISIONS (Section 41) */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
              <span>RECENT DECISIONS</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Stored record; legacy entries are unverified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(project.recentDecisions || []).map((dec) => {
              const decAgent = getAgent(dec.agentId);
              return (
                <div key={dec.id} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{dec.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(dec.decidedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">{dec.decision}</p>
                  {decAgent && (
                    <span className="text-[10px] text-amber-800 block pt-1 font-mono font-medium">Decided by: {decAgent.displayName}</span>
                  )}
                </div>
              );
            })}
            {(!project.recentDecisions || project.recentDecisions.length === 0) && (
              <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                No decisions recorded for this project.
              </div>
            )}
          </div>
        </div>

        {/* 5. PROJECT MEMORY (Section 36, 41) */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
              <Brain className="w-3.5 h-3.5 text-amber-700" />
              <span>PROJECT MEMORY ({projectMemories.length} durable memories)</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Scope: Project {project.name}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projectMemories.map((mem) => {
              const isSuperseded = mem.status === 'superseded';
              const author = getAgent(mem.provenance?.originalAgentId);

              return (
                <div
                  key={mem.id}
                  className={`p-3.5 rounded-xl border transition ${
                    isSuperseded
                      ? 'bg-slate-100/50 border-slate-200/60 opacity-60'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                        isSuperseded
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 line-through'
                          : 'border border-amber-300 bg-amber-50 text-amber-900'
                      }`}
                    >
                      {mem.type} {isSuperseded && '(SUPERSEDED)'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Importance: {mem.importance}/10 • Conf: {Math.round(mem.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{mem.content}</p>

                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Origin: {author?.displayName || 'System'}</span>
                    {mem.provenance.promotionHistory.length > 0 && (
                      <span className="text-amber-800 font-mono font-medium">
                        Promoted: {mem.provenance.promotionHistory[0].fromScope} → {mem.scope}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {projectMemories.length === 0 && (
              <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                No project-scoped memories yet. Reviewed memories can be added here by the owner.
              </div>
            )}
          </div>
        </div>

        {/* 6. FILES & ARTIFACTS SECTION */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>FILES & REUSABLE ARTIFACTS ({projectArtifacts.length})</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Cross-Agent Artifact Hub</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {projectArtifacts.map((art) => {
              const author = getAgent(art.createdByAgentId);
              return (
                <div
                  key={art.id}
                  onClick={() => onOpenArtifact(art)}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-amber-400/80 hover:bg-white transition cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <FileText className="w-4 h-4 text-amber-700" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase">{art.type}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-900 mt-2 group-hover:text-amber-800 transition truncate">
                    {art.title}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">{art.filename}</p>
                  <p className="text-[10px] text-slate-500 mt-2">By: {author?.displayName || 'Unknown'}</p>
                </div>
              );
            })}
            {projectArtifacts.length === 0 && (
              <div className="col-span-3 py-4 text-center text-xs text-slate-400">
                No generated artifacts linked to this project yet.
              </div>
            )}
          </div>
        </div>

        {/* 7. ACTIVITY TIMELINE */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest font-mono">
            <Calendar className="w-3.5 h-3.5 text-amber-700" />
            <span>ACTIVITY</span>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            {tasks.filter(task => task.projectId === project.id).slice(-5).reverse().map(task => <p key={task.id}>{task.createdAt}: {task.title} — {task.status}</p>)}
            {!tasks.some(task => task.projectId === project.id) && <p>No recorded run activity.</p>}
          </div>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-800">
                <FolderKanban className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-slate-900 font-serif">Create Workspace Project</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Project Apollo, Compliance Framework"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                  Lead Agent
                </label>
                <select
                  value={newLeadId}
                  onChange={(e) => setNewLeadId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition cursor-pointer focus:ring-2 focus:ring-amber-500/20"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} — {a.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                  High-Level Objective
                </label>
                <input
                  type="text"
                  value={newObjective}
                  onChange={(e) => setNewObjective(e.target.value)}
                  placeholder="e.g. Deploy SOC2 audit controls before Q4"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-700 block mb-1 font-semibold font-mono">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of deliverables and scope..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition resize-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900 font-serif">Archive {project.name}?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to archive <strong className="text-slate-900">{project.name}</strong>? Work items, run evidence and artifacts will be retained.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-50 border border-slate-300 transition cursor-pointer shadow-2xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCurrent}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
