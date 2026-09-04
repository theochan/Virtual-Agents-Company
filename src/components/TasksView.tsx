import React, { useState, useMemo } from 'react';
import { WorkItem, WorkItemStatus, Agent, Project, Artifact, Task, TaskEvent } from '../types';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  Play,
  Check,
  Layers,
  FileText,
  Trash2,
  Bot,
  Zap,
  GitMerge,
  Filter,
  Kanban,
  ListFilter,
  X,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface TasksViewProps {
  workItems: WorkItem[];
  agents: Agent[];
  projects: Project[];
  activeProject?: Project;
  onAddWorkItem: (item: Partial<WorkItem>) => Promise<void>;
  onUpdateWorkItem: (id: string, updates: Partial<WorkItem> & { updatedByAgentId?: string; comment?: string }) => Promise<void>;
  onAgentWorkOnItem: (id: string, agentId: string, actionType: string, customPrompt?: string) => Promise<void>;
  onAgentGenerateItems: (agentId: string, projectId: string, goal?: string) => Promise<void>;
  onDeleteWorkItem: (id: string) => Promise<void>;
  onOpenArtifact: (artifact: Artifact) => void;
  // Multi-agent orchestration pipeline integration
  tasks: Task[];
  activeTask?: Task;
  events: TaskEvent[];
  onTriggerMultiAgentTask: (instruction: string, leadAgentId: string, projectId: string) => Promise<void>;
  isCollaborating: boolean;
}

export const TasksView: React.FC<TasksViewProps> = ({
  workItems,
  agents,
  projects,
  activeProject,
  onAddWorkItem,
  onUpdateWorkItem,
  onAgentWorkOnItem,
  onAgentGenerateItems,
  onDeleteWorkItem,
  onOpenArtifact,
  tasks,
  activeTask,
  events,
  onTriggerMultiAgentTask,
  isCollaborating
}) => {
  // Navigation & View Mode
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'pipeline'>('board');
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAutoPlanModalOpen, setIsAutoPlanModalOpen] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<WorkItem | null>(null);

  // New Item Form State
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemStatus, setNewItemStatus] = useState<WorkItemStatus>('backlog');
  const [newItemPriority, setNewItemPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newItemProject, setNewItemProject] = useState(activeProject?.id || projects[0]?.id || 'proj-phoenix');
  const [newItemAgent, setNewItemAgent] = useState('agent-sarah');
  const [newItemTags, setNewItemTags] = useState('Architecture, Engineering');
  const [newItemHours, setNewItemHours] = useState('12');

  // Agent Auto-Planning Modal State
  const [planAgentId, setPlanAgentId] = useState('agent-sarah');
  const [planProjectId, setPlanProjectId] = useState(activeProject?.id || projects[0]?.id || 'proj-phoenix');
  const [planGoal, setPlanGoal] = useState('Break down database migration and compliance verification work items');
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);

  // Item Detail Agent Action State
  const [activeAgentActionId, setActiveAgentActionId] = useState('agent-marcus');
  const [agentActionType, setAgentActionType] = useState<'advance_stage' | 'update_progress' | 'complete'>('advance_stage');
  const [agentActionPrompt, setAgentActionPrompt] = useState('');
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);

  // Drag-and-drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Helper to retrieve agent
  const getAgent = (id?: string) => {
    if (!id) return undefined;
    return agents.find((a) => a.id === id);
  };

  // Helper to retrieve project
  const getProject = (id?: string) => {
    if (!id) return undefined;
    return projects.find((p) => p.id === id);
  };

  // Filtered work items
  const filteredItems = useMemo(() => {
    return workItems.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const agent = getAgent(item.assignedAgentId);
        const matchesAgent = agent?.displayName.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesAgent) return false;
      }

      // Project filter
      if (selectedProjectId !== 'all' && item.projectId !== selectedProjectId) {
        return false;
      }

      // Agent filter
      if (selectedAgentFilter !== 'all' && item.assignedAgentId !== selectedAgentFilter && item.createdByAgentId !== selectedAgentFilter) {
        return false;
      }

      // Priority filter
      if (selectedPriorityFilter !== 'all' && item.priority !== selectedPriorityFilter) {
        return false;
      }

      return true;
    });
  }, [workItems, searchQuery, selectedProjectId, selectedAgentFilter, selectedPriorityFilter]);

  // Group into the 4 requested columns
  const columnData: Record<WorkItemStatus, WorkItem[]> = useMemo(() => {
    return {
      backlog: filteredItems.filter((i) => i.status === 'backlog'),
      todo: filteredItems.filter((i) => i.status === 'todo'),
      in_progress: filteredItems.filter((i) => i.status === 'in_progress'),
      done: filteredItems.filter((i) => i.status === 'done')
    };
  }, [filteredItems]);

  const curPipelineTask = activeTask || (tasks.length > 0 ? tasks[tasks.length - 1] : undefined);
  const pipelineLead = curPipelineTask ? getAgent(curPipelineTask.leadAgentId) : undefined;

  // Priority badge styling
  const getPriorityBadge = (priority: WorkItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-950/50 text-rose-300 border-rose-800/40';
      case 'high':
        return 'bg-amber-950/50 text-amber-300 border-amber-800/40';
      case 'medium':
        return 'bg-sky-950/50 text-sky-300 border-sky-800/40';
      case 'low':
      default:
        return 'bg-neutral-800/60 text-neutral-300 border-neutral-700/40';
    }
  };

  // Handle Quick Move
  const handleQuickMove = async (item: WorkItem, targetStatus: WorkItemStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const assignedAgent = getAgent(item.assignedAgentId) || agents[0];
    await onUpdateWorkItem(item.id, {
      status: targetStatus,
      updatedByAgentId: assignedAgent.id,
      comment: `Agent ${assignedAgent.displayName} transferred item to ${targetStatus.toUpperCase()}`
    });
    if (selectedItemDetail && selectedItemDetail.id === item.id) {
      setSelectedItemDetail((prev) => prev ? { ...prev, status: targetStatus } : null);
    }
  };

  // Handle Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: WorkItemStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!id) return;
    const item = workItems.find((w) => w.id === id);
    if (!item || item.status === targetStatus) {
      setDraggedItemId(null);
      return;
    }

    const assignedAgent = getAgent(item.assignedAgentId) || agents[0];
    await onUpdateWorkItem(id, {
      status: targetStatus,
      updatedByAgentId: assignedAgent.id,
      comment: `Moved to ${targetStatus.toUpperCase()} via board dispatch.`
    });
    setDraggedItemId(null);
  };

  // Handle Quick Agent Work on Item
  const handleTriggerAgentWork = async (item: WorkItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const agentId = item.assignedAgentId || 'agent-marcus';
    await onAgentWorkOnItem(item.id, agentId, 'advance_stage');
  };

  // Submit New Work Item
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const tagsArray = newItemTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await onAddWorkItem({
      title: newItemTitle.trim(),
      description: newItemDescription.trim(),
      status: newItemStatus,
      priority: newItemPriority,
      projectId: newItemProject,
      assignedAgentId: newItemAgent,
      createdByAgentId: newItemAgent,
      tags: tagsArray.length > 0 ? tagsArray : ['Task'],
      estimatedHours: Number(newItemHours) || 8
    });

    setNewItemTitle('');
    setNewItemDescription('');
    setIsAddModalOpen(false);
  };

  // Submit Agent Auto Planning
  const handleRunAutoPlan = async () => {
    setIsPlanningLoading(true);
    try {
      await onAgentGenerateItems(planAgentId, planProjectId, planGoal);
      setIsAutoPlanModalOpen(false);
    } finally {
      setIsPlanningLoading(false);
    }
  };

  // Submit Agent Update in Detail Modal
  const handleExecuteAgentUpdate = async () => {
    if (!selectedItemDetail) return;
    setIsAgentExecuting(true);
    try {
      await onAgentWorkOnItem(
        selectedItemDetail.id,
        activeAgentActionId,
        agentActionType,
        agentActionPrompt
      );
      setAgentActionPrompt('');
      // Refresh selected item from updated workItems
      const updated = workItems.find((w) => w.id === selectedItemDetail.id);
      if (updated) setSelectedItemDetail(updated);
    } finally {
      setIsAgentExecuting(false);
    }
  };

  // Column metadata
  const COLUMNS: Array<{
    id: WorkItemStatus;
    title: string;
    subtitle: string;
    badgeColor: string;
    borderAccent: string;
    dotColor: string;
  }> = [
    {
      id: 'backlog',
      title: 'Backlogs',
      subtitle: 'Exploration & Backlog Triage',
      badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      borderAccent: 'border-t-neutral-600',
      dotColor: 'bg-neutral-400'
    },
    {
      id: 'todo',
      title: 'Todo',
      subtitle: 'Scoped & Ready for Agent Pickup',
      badgeColor: 'bg-sky-950/80 text-sky-300 border-sky-800/50',
      borderAccent: 'border-t-sky-500',
      dotColor: 'bg-sky-400'
    },
    {
      id: 'in_progress',
      title: 'In-progress',
      subtitle: 'Active Autonomous Agent Work',
      badgeColor: 'bg-[#C5A358]/20 text-[#C5A358] border-[#C5A358]/40',
      borderAccent: 'border-t-[#C5A358]',
      dotColor: 'bg-[#C5A358] animate-pulse'
    },
    {
      id: 'done',
      title: 'Done',
      subtitle: 'Verified Deliverables & Artifacts',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50',
      borderAccent: 'border-t-emerald-500',
      dotColor: 'bg-emerald-400'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358] shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-serif italic text-[#F0F0F0] tracking-tight">Executive Work Items & Tasks</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                {workItems.length} Total
              </span>
            </div>
            <p className="text-xs text-[#888] mt-0.5">
              Backlogs • Todo • In-progress • Done • Real-time Agent Dispatch & Updates
            </p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                viewMode === 'board'
                  ? 'bg-[#161616] text-[#C5A358] border border-[#C5A358]/30 shadow-xs'
                  : 'text-[#888] hover:text-[#CCC]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                viewMode === 'list'
                  ? 'bg-[#161616] text-[#C5A358] border border-[#C5A358]/30 shadow-xs'
                  : 'text-[#888] hover:text-[#CCC]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-medium ${
                viewMode === 'pipeline'
                  ? 'bg-[#161616] text-[#C5A358] border border-[#C5A358]/30 shadow-xs'
                  : 'text-[#888] hover:text-[#CCC]'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>
          </div>

          {/* AI Auto-Plan Tasks */}
          <button
            id="btn-agent-auto-plan-tasks"
            onClick={() => setIsAutoPlanModalOpen(true)}
            className="py-1.5 px-3 rounded border border-[#C5A358]/40 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-xs font-medium flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A358]" />
            <span className="hidden sm:inline">Agent Planning</span>
          </button>

          {/* Add Work Item */}
          <button
            id="btn-add-work-item"
            onClick={() => setIsAddModalOpen(true)}
            className="py-1.5 px-3.5 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add Work Item</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Filters, Search, Metric Summary */}
      <div className="px-5 py-3 border-b border-[#1A1A1A] bg-[#0A0A0A] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-3xl">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, tag, or agent..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
            />
          </div>

          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="py-1.5 px-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#BBB] focus:outline-none focus:border-[#C5A358]"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Agent Filter */}
          <select
            value={selectedAgentFilter}
            onChange={(e) => setSelectedAgentFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#BBB] focus:outline-none focus:border-[#C5A358]"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName} ({a.jobTitle})
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="py-1.5 px-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#BBB] focus:outline-none focus:border-[#C5A358]"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#888]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            Backlogs: <strong className="text-[#E0E0E0] font-bold">{columnData.backlog.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Todo: <strong className="text-[#E0E0E0] font-bold">{columnData.todo.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C5A358] animate-pulse" />
            In-Progress: <strong className="text-[#C5A358] font-bold">{columnData.in_progress.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Done: <strong className="text-emerald-400 font-bold">{columnData.done.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full min-h-[600px] items-start">
            {COLUMNS.map((col) => {
              const items = columnData[col.id];
              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex flex-col h-full min-h-[550px] rounded-lg border border-[#1A1A1A] bg-[#090909] border-t-2 ${col.borderAccent} overflow-hidden shadow-xs`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-[#1A1A1A] bg-[#0B0B0B] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <h3 className="text-xs font-semibold text-[#F0F0F0] tracking-wide uppercase font-mono">
                        {col.title}
                      </h3>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${col.badgeColor}`}>
                        {items.length}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setNewItemStatus(col.id);
                        setIsAddModalOpen(true);
                      }}
                      title={`Add item to ${col.title}`}
                      className="p-1 rounded hover:bg-[#1A1A1A] text-[#888] hover:text-[#C5A358] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtitle / Description */}
                  <div className="px-3.5 py-1.5 bg-[#080808] border-b border-[#141414] text-[10px] text-[#666] italic">
                    {col.subtitle}
                  </div>

                  {/* Column Item List */}
                  <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-230px)]">
                    {items.length === 0 ? (
                      <div className="h-36 border border-dashed border-[#1A1A1A] rounded flex flex-col items-center justify-center text-center p-4 text-[#555] text-xs">
                        <span>No work items in {col.title}</span>
                        <button
                          onClick={() => {
                            setNewItemStatus(col.id);
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 text-[11px] text-[#C5A358] hover:underline cursor-pointer"
                        >
                          + Add item here
                        </button>
                      </div>
                    ) : (
                      items.map((item) => {
                        const assignedAgent = getAgent(item.assignedAgentId);
                        const creatorAgent = getAgent(item.createdByAgentId);
                        const project = getProject(item.projectId);
                        const latestHistory = item.history[item.history.length - 1];

                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onClick={() => setSelectedItemDetail(item)}
                            className="p-3 rounded-md bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#C5A358]/50 transition cursor-pointer space-y-2.5 group relative shadow-xs"
                          >
                            {/* Card Top: Priority, Project, and ID */}
                            <div className="flex items-center justify-between text-[10px]">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded border font-mono capitalize ${getPriorityBadge(item.priority)}`}>
                                  {item.priority}
                                </span>
                                {project && (
                                  <span className="text-[#666] font-mono truncate max-w-[110px]">
                                    {project.name}
                                  </span>
                                )}
                              </div>

                              <span className="text-[#555] font-mono text-[9px]">{item.id}</span>
                            </div>

                            {/* Card Title & Description */}
                            <div>
                              <h4 className="text-xs font-medium text-[#F0F0F0] group-hover:text-[#C5A358] transition line-clamp-2 leading-snug">
                                {item.title}
                              </h4>
                              {item.description && (
                                <p className="text-[11px] text-[#777] mt-1 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Tags */}
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.tags.slice(0, 3).map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] px-1.5 py-0.2 rounded bg-[#141414] text-[#888] border border-[#202020]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-[9px] text-[#555] font-mono">+{item.tags.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Backlog Busy Agent Warning */}
                            {item.status === 'backlog' &&
                              workItems.some(
                                (w) =>
                                  w.assignedAgentId === item.assignedAgentId &&
                                  w.projectId !== item.projectId &&
                                  w.status === 'in_progress'
                              ) && (
                                <div className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 font-mono">
                                  <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                  <span>Agent busy on another project</span>
                                </div>
                              )}

                            {/* Progress Bar (For in-progress or done) */}
                            {(item.status === 'in_progress' || item.status === 'done') && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9px] text-[#666] font-mono">
                                  <span>Progress</span>
                                  <span className={item.status === 'done' ? 'text-emerald-400' : 'text-[#C5A358]'}>
                                    {item.progressPercent ?? (item.status === 'done' ? 100 : 25)}%
                                  </span>
                                </div>
                                <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      item.status === 'done' ? 'bg-emerald-500' : 'bg-[#C5A358]'
                                    }`}
                                    style={{ width: `${item.progressPercent ?? (item.status === 'done' ? 100 : 25)}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Linked Artifacts */}
                            {item.artifacts && item.artifacts.length > 0 && (
                              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-[#C5A358]">
                                <FileText className="w-3 h-3 text-[#C5A358]" />
                                <span className="font-mono underline truncate max-w-[180px]">
                                  {item.artifacts[0].filename}
                                </span>
                              </div>
                            )}

                            {/* Card Footer: Assigned Agent & Provenance */}
                            <div className="pt-2 border-t border-[#181818] flex items-center justify-between text-[11px]">
                              {/* Assigned Agent */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {assignedAgent ? (
                                  <>
                                    <img
                                      src={assignedAgent.avatarUrl}
                                      alt={assignedAgent.displayName}
                                      className="w-5 h-5 rounded-full object-cover border border-[#222] shrink-0"
                                    />
                                    <span className="text-[#AAA] text-[10px] truncate max-w-[95px]">
                                      {assignedAgent.firstName} {assignedAgent.lastName[0]}.
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[#555] text-[10px] flex items-center gap-1">
                                    <Bot className="w-3 h-3" /> Unassigned
                                  </span>
                                )}
                              </div>

                              {/* Card Action Controls */}
                              <div className="flex items-center gap-1">
                                {/* Quick Agent Work Trigger */}
                                <button
                                  onClick={(e) => handleTriggerAgentWork(item, e)}
                                  title="Trigger Agent to Work / Advance Item"
                                  className="p-1 rounded bg-[#161616] hover:bg-[#C5A358]/20 text-[#888] hover:text-[#C5A358] border border-[#222] transition cursor-pointer"
                                >
                                  <Zap className="w-3 h-3" />
                                </button>

                                {/* Left Move arrow */}
                                {col.id !== 'backlog' && (
                                  <button
                                    onClick={(e) => {
                                      const prevMap: Record<WorkItemStatus, WorkItemStatus> = {
                                        backlog: 'backlog',
                                        todo: 'backlog',
                                        in_progress: 'todo',
                                        done: 'in_progress'
                                      };
                                      handleQuickMove(item, prevMap[col.id], e);
                                    }}
                                    title="Move Left"
                                    className="p-1 rounded bg-[#161616] hover:bg-[#222] text-[#888] hover:text-[#E0E0E0] border border-[#222] transition cursor-pointer"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}

                                {/* Right Move arrow */}
                                {col.id !== 'done' && (
                                  <button
                                    onClick={(e) => {
                                      const nextMap: Record<WorkItemStatus, WorkItemStatus> = {
                                        backlog: 'todo',
                                        todo: 'in_progress',
                                        in_progress: 'done',
                                        done: 'done'
                                      };
                                      handleQuickMove(item, nextMap[col.id], e);
                                    }}
                                    title="Move Right"
                                    className="p-1 rounded bg-[#161616] hover:bg-[#222] text-[#888] hover:text-[#E0E0E0] border border-[#222] transition cursor-pointer"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Latest Agent Log Snippet */}
                            {latestHistory?.comment && (
                              <div className="text-[10px] text-[#666] italic bg-[#080808] p-1.5 rounded border border-[#141414] line-clamp-1">
                                "{latestHistory.comment}"
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List / Table Mode */}
        {viewMode === 'list' && (
          <div className="rounded border border-[#1A1A1A] bg-[#0A0A0A] overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1A1A1A] bg-[#0E0E0E] text-[10px] uppercase font-mono text-[#777]">
                  <th className="py-3 px-4">Work Item</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {filteredItems.map((item) => {
                  const agent = getAgent(item.assignedAgentId);
                  const project = getProject(item.projectId);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemDetail(item)}
                      className="hover:bg-[#0F0F0F] transition cursor-pointer"
                    >
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-medium text-[#F0F0F0] line-clamp-1 hover:text-[#C5A358] transition">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#666] line-clamp-1">{item.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded border uppercase text-[9px] ${
                            item.status === 'backlog'
                              ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                              : item.status === 'todo'
                              ? 'bg-sky-950/80 text-sky-300 border-sky-800/50'
                              : item.status === 'in_progress'
                              ? 'bg-[#C5A358]/20 text-[#C5A358] border-[#C5A358]/40'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase ${getPriorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {agent ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={agent.avatarUrl}
                              alt={agent.displayName}
                              className="w-5 h-5 rounded-full object-cover border border-[#222]"
                            />
                            <span className="text-[#CCC]">{agent.displayName}</span>
                          </div>
                        ) : (
                          <span className="text-[#555]">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#888] font-mono text-[11px]">{project?.name || item.projectId}</td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {item.progressPercent ?? (item.status === 'done' ? 100 : 0)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleTriggerAgentWork(item)}
                            title="Agent Work"
                            className="p-1 rounded bg-[#161616] hover:bg-[#C5A358]/20 text-[#C5A358] border border-[#222]"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Multi-Agent Orchestration Pipeline View */}
        {viewMode === 'pipeline' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif italic text-[#F0F0F0]">Autonomous Multi-Agent Mission Pipeline</h3>
                  <p className="text-xs text-[#888]">
                    Lead Agent orchestration blackboard and live execution tree. Dispatches high-level objectives into work items.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs">
                  <span className={`w-2 h-2 rounded-full ${isCollaborating ? 'bg-[#C5A358] animate-ping' : 'bg-emerald-400'}`} />
                  <span className="font-mono text-[11px] text-[#AAA]">{isCollaborating ? 'Orchestration Active' : 'Ready'}</span>
                </div>
              </div>

              {/* Form to trigger orchestration */}
              <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-3">
                <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                  Dispatch Multi-Agent Objective
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    defaultValue="Determine whether Phoenix should migrate from Firebase to PostgreSQL. Use the team."
                    id="input-pipeline-mission"
                    className="flex-1 p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('input-pipeline-mission') as HTMLInputElement;
                      if (el && el.value.trim()) {
                        onTriggerMultiAgentTask(el.value.trim(), 'agent-sarah', activeProject?.id || 'proj-phoenix');
                      }
                    }}
                    disabled={isCollaborating}
                    className="py-2.5 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-black" />
                    <span>{isCollaborating ? 'Coordinating...' : 'Execute Mission'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Orchestration Task or latest task */}
            {curPipelineTask ? (
              <div className="space-y-5">
                <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C5A358]" />
                      <h4 className="text-sm font-semibold text-[#F0F0F0]">{curPipelineTask.title}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono capitalize">
                        {curPipelineTask.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#666] font-mono">{new Date(curPipelineTask.createdAt).toLocaleTimeString()}</span>
                  </div>

                  {/* Delegation Tree */}
                  <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-3">
                    <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                      Hierarchical Delegation Hierarchy
                    </span>
                    <div className="flex items-center gap-3 p-3 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                      <img src={pipelineLead?.avatarUrl} alt={pipelineLead?.displayName} className="w-8 h-8 rounded object-cover" />
                      <div>
                        <span className="font-semibold text-xs text-[#F0F0F0]">{pipelineLead?.displayName} (Lead Agent Owner)</span>
                        <p className="text-[11px] text-[#777]">Synthesizes findings, resolves specialist disputes, generates deliverables.</p>
                      </div>
                    </div>

                    <div className="pl-6 border-l-2 border-[#1A1A1A] ml-4 space-y-2">
                      {curPipelineTask.subtasks.map((st) => {
                        const spec = getAgent(st.assignedAgentId);
                        return (
                          <div key={st.id} className="p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <img src={spec?.avatarUrl} alt={spec?.displayName} className="w-6 h-6 rounded object-cover" />
                              <div>
                                <span className="font-medium text-[#F0F0F0]">{spec?.displayName}:</span>
                                <span className="text-[#AAA] ml-1.5">{st.title}</span>
                              </div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded capitalize font-mono bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                              {st.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* =========================================================
          MODAL 1: ADD WORK ITEM
          ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#F0F0F0] uppercase tracking-wider font-mono">
                <Plus className="w-4 h-4 text-[#C5A358]" />
                <span>Add Work Item to Stage</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#666] hover:text-[#E0E0E0] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-[#CCC] mb-1">Work Item Title *</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g., Audit OAuth 2.0 PKCE Flow for Mobile Clients"
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#CCC] mb-1">Description & Deliverable Criteria</label>
                <textarea
                  rows={3}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Provide technical scope, requirements, and validation criteria..."
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Target Stage</label>
                  <select
                    value={newItemStatus}
                    onChange={(e) => setNewItemStatus(e.target.value as WorkItemStatus)}
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  >
                    <option value="backlog">Backlogs</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In-progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Priority</label>
                  <select
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as any)}
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Assigned Agent</label>
                  <select
                    value={newItemAgent}
                    onChange={(e) => setNewItemAgent(e.target.value)}
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} ({a.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Project Scope</label>
                  <select
                    value={newItemProject}
                    onChange={(e) => setNewItemProject(e.target.value)}
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Tags (Comma-Separated)</label>
                  <input
                    type="text"
                    value={newItemTags}
                    onChange={(e) => setNewItemTags(e.target.value)}
                    placeholder="Database, Security, DDL"
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={newItemHours}
                    onChange={(e) => setNewItemHours(e.target.value)}
                    min="1"
                    max="200"
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-3.5 rounded bg-[#161616] hover:bg-[#202020] text-[#AAA] text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold shadow transition cursor-pointer"
                >
                  Register Work Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: AGENT PLANNING / AUTO-GENERATE WORK ITEMS
          ========================================================= */}
      {isAutoPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C5A358] uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4 text-[#C5A358]" />
                <span>Autonomous Agent Sprint Planning</span>
              </div>
              <button
                onClick={() => setIsAutoPlanModalOpen(false)}
                className="text-[#666] hover:text-[#E0E0E0] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-[#AAA] leading-relaxed">
                Instruct an executive or specialist agent to analyze the project roadmap and autonomously synthesize 3 structured work items categorized into Backlogs and Todo.
              </p>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Planning Agent Owner</label>
                <select
                  value={planAgentId}
                  onChange={(e) => setPlanAgentId(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} — {a.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Target Project</label>
                <select
                  value={planProjectId}
                  onChange={(e) => setPlanProjectId(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Sprint Objective / Direction</label>
                <textarea
                  rows={3}
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value)}
                  className="w-full p-2.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                  placeholder="Describe focus areas (e.g. data residency, pgvector tuning, budget caps)..."
                />
              </div>

              <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setIsAutoPlanModalOpen(false)}
                  disabled={isPlanningLoading}
                  className="py-2 px-3.5 rounded bg-[#161616] hover:bg-[#202020] text-[#AAA] text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunAutoPlan}
                  disabled={isPlanningLoading || !planGoal.trim()}
                  className="py-2 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-2 shadow transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-black ${isPlanningLoading ? 'animate-spin' : ''}`} />
                  <span>{isPlanningLoading ? 'Synthesizing Tasks...' : 'Generate 3 Work Items'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: WORK ITEM DETAIL & AGENT UPDATE CONSOLE
          ========================================================= */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-lg border border-[#1A1A1A] bg-[#0A0A0A] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[9px] px-2 py-0.5 rounded border uppercase font-mono ${
                    selectedItemDetail.status === 'backlog'
                      ? 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      : selectedItemDetail.status === 'todo'
                      ? 'bg-sky-950/80 text-sky-300 border-sky-800/50'
                      : selectedItemDetail.status === 'in_progress'
                      ? 'bg-[#C5A358]/20 text-[#C5A358] border-[#C5A358]/40'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                  }`}
                >
                  {selectedItemDetail.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-[#555] font-mono">{selectedItemDetail.id}</span>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="text-[#666] hover:text-[#E0E0E0] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Title & Description */}
              <div>
                <h3 className="text-base font-serif italic text-[#F0F0F0] leading-snug">
                  {selectedItemDetail.title}
                </h3>
                <p className="text-xs text-[#AAA] mt-2 leading-relaxed">
                  {selectedItemDetail.description}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-[#070707] border border-[#1A1A1A]">
                <div>
                  <span className="text-[9px] uppercase font-mono text-[#666] block">Project</span>
                  <span className="font-medium text-[#CCC] mt-0.5 block truncate">
                    {getProject(selectedItemDetail.projectId)?.name || selectedItemDetail.projectId}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-[#666] block">Priority</span>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded border text-[9px] font-mono uppercase ${getPriorityBadge(selectedItemDetail.priority)}`}>
                    {selectedItemDetail.priority}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-[#666] block">Assigned Agent</span>
                  <span className="font-medium text-[#CCC] mt-0.5 block truncate">
                    {getAgent(selectedItemDetail.assignedAgentId)?.displayName || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-[#666] block">Progress</span>
                  <span className="font-mono text-[#C5A358] mt-0.5 block font-bold">
                    {selectedItemDetail.progressPercent ?? 0}%
                  </span>
                </div>
              </div>

              {/* Tags */}
              {selectedItemDetail.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedItemDetail.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#111] text-[#999] border border-[#222]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Stage Transition Buttons */}
              <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
                <span className="text-[10px] uppercase font-mono text-[#777] block">Transition Work Item Stage</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['backlog', 'todo', 'in_progress', 'done'] as WorkItemStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleQuickMove(selectedItemDetail, st)}
                      className={`py-1.5 px-2 rounded text-[11px] font-mono uppercase font-semibold transition cursor-pointer border ${
                        selectedItemDetail.status === st
                          ? 'bg-[#C5A358] text-black border-[#C5A358]'
                          : 'bg-[#0E0E0E] text-[#888] border-[#1A1A1A] hover:text-[#CCC] hover:border-[#333]'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* AGENT UPDATE CONSOLE (Section for agents to add & update work items) */}
              <div className="p-4 rounded border border-[#C5A358]/30 bg-[#0C0B08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest font-mono">
                    <Zap className="w-3.5 h-3.5 text-[#C5A358]" />
                    <span>Agent Work Console (Autonomous Update)</span>
                  </div>
                  <span className="text-[10px] text-[#666] font-mono">Real-Time Autonomous Sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Executing Agent</label>
                    <select
                      value={activeAgentActionId}
                      onChange={(e) => setActiveAgentActionId(e.target.value)}
                      className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.displayName} ({a.jobTitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">Action Type</label>
                    <select
                      value={agentActionType}
                      onChange={(e) => setAgentActionType(e.target.value as any)}
                      className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                    >
                      <option value="advance_stage">Advance Stage (Next Column)</option>
                      <option value="update_progress">Progress Work & Log Deliverable</option>
                      <option value="complete">Complete & Mark Done (100%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-[#777] mb-1">
                    Agent Directive / Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={agentActionPrompt}
                    onChange={(e) => setAgentActionPrompt(e.target.value)}
                    placeholder="e.g., Audit SQL query performance or verify Frankfurt data residency..."
                    className="w-full p-2 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#888]">
                    Agent will analyze context, update progress, and log audit history.
                  </span>
                  <button
                    onClick={handleExecuteAgentUpdate}
                    disabled={isAgentExecuting}
                    className="py-2 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-2 shadow transition disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 text-black ${isAgentExecuting ? 'animate-spin' : ''}`} />
                    <span>{isAgentExecuting ? 'Agent Executing...' : 'Execute Agent Update'}</span>
                  </button>
                </div>
              </div>

              {/* Provenance & Update Timeline */}
              <div className="space-y-3">
                <span className="text-[10px] font-semibold text-[#777] uppercase tracking-widest block font-mono">
                  Agent Audit History & Provenance ({selectedItemDetail.history.length})
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-[11px]">
                  {selectedItemDetail.history.map((log) => {
                    const authorAgent = getAgent(log.agentId);
                    return (
                      <div key={log.id} className="p-2.5 rounded bg-[#070707] border border-[#1A1A1A] space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {authorAgent && (
                              <img
                                src={authorAgent.avatarUrl}
                                alt={authorAgent.displayName}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            )}
                            <span className="font-semibold text-[#CCC]">{log.authorName}</span>
                          </div>
                          <span className="text-[#555]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[#999] leading-relaxed font-sans">{log.comment}</p>
                        {log.newStatus && (
                          <div className="text-[9px] text-[#666]">
                            Stage: <span className="text-[#C5A358] uppercase">{log.newStatus}</span>
                            {log.progressPercent !== undefined && ` (${log.progressPercent}%)`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between shrink-0">
              <button
                onClick={async () => {
                  if (confirm('Delete this work item?')) {
                    await onDeleteWorkItem(selectedItemDetail.id);
                    setSelectedItemDetail(null);
                  }
                }}
                className="py-1.5 px-2.5 rounded border border-rose-900/40 text-rose-400 hover:bg-rose-950/30 text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedItemDetail(null)}
                className="py-1.5 px-4 rounded bg-[#161616] hover:bg-[#222] text-[#CCC] text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
