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
  ChevronDown,
  MoreHorizontal
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
      if (selectedProjectId !== 'all') {
        if (item.projectId !== selectedProjectId) return false;
      } else {
        // Only show items that belong to an active project
        const projectExists = projects.some((p) => p.id === item.projectId);
        if (!projectExists) return false;
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
  }, [workItems, projects, searchQuery, selectedProjectId, selectedAgentFilter, selectedPriorityFilter]);

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
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'low':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
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

  // Column metadata (Matching Wireframe Page 2)
  const COLUMNS: Array<{
    id: WorkItemStatus;
    title: string;
    subtitle: string;
    badgeColor: string;
    borderAccent: string;
    dotColor: string;
    columnBg: string;
  }> = [
    {
      id: 'backlog',
      title: 'Backlog',
      subtitle: 'Exploration & Backlog Triage',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
      borderAccent: 'border-t-slate-400',
      dotColor: 'bg-slate-400',
      columnBg: 'bg-slate-100/70 border-slate-200'
    },
    {
      id: 'todo',
      title: 'In Progress',
      subtitle: 'Active Execution & Engineering',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      borderAccent: 'border-t-amber-500',
      dotColor: 'bg-amber-500',
      columnBg: 'bg-slate-100/70 border-slate-200'
    },
    {
      id: 'in_progress',
      title: 'Review',
      subtitle: 'Quality Review & Verification',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold',
      borderAccent: 'border-t-sky-500',
      dotColor: 'bg-sky-500 animate-pulse',
      columnBg: 'bg-slate-100/70 border-slate-200'
    },
    {
      id: 'done',
      title: 'Completed',
      subtitle: 'Verified Deliverables & Artifacts',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
      borderAccent: 'border-t-emerald-500',
      dotColor: 'bg-emerald-500',
      columnBg: 'bg-slate-100/70 border-slate-200'
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-hidden">
      {/* Top Header - Matching Wireframe Page 2 */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-6 flex-wrap">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
            {activeProject?.name || 'Project Phoenix'}
          </h2>

          {/* Project Health Circular Gauge (70% in Wireframe) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              Project Health <span className="text-slate-400 font-mono text-[11px]" title="Calculated from milestone completion">ⓘ</span>
            </span>
            <div className="relative w-10 h-10 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeDasharray="70, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-bold text-slate-800 font-mono">70%</span>
            </div>
          </div>

          {/* Sprint Velocity Sparkline Trend */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-600">Sprint Velocity</span>
            <svg className="w-24 h-7 overflow-visible" viewBox="0 0 80 28" fill="none">
              <path
                d="M 2 22 Q 18 26, 30 14 T 55 10 T 78 5"
                stroke="#D97706"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="78" cy="5" r="3.5" fill="#B45309" stroke="#FFF" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Right Header Actions: Search, View Switcher, AI Plan, Add Work Item */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-44 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 transition shadow-2xs"
            />
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                viewMode === 'board'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden md:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer font-medium ${
                viewMode === 'pipeline'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pipeline</span>
            </button>
          </div>

          {/* Agent Planning */}
          <button
            id="btn-agent-auto-plan-tasks"
            onClick={() => setIsAutoPlanModalOpen(true)}
            className="py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Auto-plan work items with AI agents"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden lg:inline">Agent Planning</span>
          </button>

          {/* Add Work Item (Dark Obsidian Button) */}
          <button
            id="btn-add-work-item"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Work Item</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Project & Agent Filters */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-3xl">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filters:</span>
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-amber-500 shadow-2xs"
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
            className="py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-amber-500 shadow-xs"
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
            className="py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-amber-500 shadow-xs"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Backlogs: <strong className="text-slate-900 font-bold">{columnData.backlog.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Todo: <strong className="text-slate-900 font-bold">{columnData.todo.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            In-Progress: <strong className="text-amber-800 font-bold">{columnData.in_progress.length}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Done: <strong className="text-emerald-700 font-bold">{columnData.done.length}</strong>
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
                  className={`flex flex-col h-full min-h-[550px] rounded-xl border border-slate-200/90 ${col.columnBg} border-t-4 ${col.borderAccent} overflow-hidden shadow-xs`}
                >
                  {/* Column Header - Matching Wireframe Page 2 */}
                  <div className="p-4 bg-white/80 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                        {col.title}
                      </h3>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {items.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setNewItemStatus(col.id);
                          setIsAddModalOpen(true);
                        }}
                        title={`Add item to ${col.title}`}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                        title="Column options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Column Item List */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-210px)]">
                    {items.length === 0 ? (
                      <div className="h-36 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs bg-white/40 font-serif italic">
                        <span>No work items in {col.title}</span>
                        <button
                          onClick={() => {
                            setNewItemStatus(col.id);
                            setIsAddModalOpen(true);
                          }}
                          className="mt-2 text-[11px] text-amber-800 font-sans font-semibold hover:underline cursor-pointer"
                        >
                          + Add work item
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
                            className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 hover:shadow-md transition cursor-pointer space-y-3 group relative shadow-2xs"
                          >
                            {/* Card Title */}
                            <h4 className="text-xs font-semibold text-slate-900 group-hover:text-amber-800 transition line-clamp-2 leading-snug">
                              {item.title}
                            </h4>

                            {/* Priority Pill Badge */}
                            <div>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium capitalize inline-block ${
                                  item.priority === 'urgent' || item.priority === 'high'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                    : item.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                    : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                                }`}
                              >
                                {item.priority === 'urgent' ? 'High' : item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                              </span>
                            </div>

                            {/* Assigned Coworker & Time Estimate */}
                            <div className="flex items-center justify-between text-xs pt-0.5">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <img
                                    src={assignedAgent?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                    alt={assignedAgent?.displayName || 'Agent'}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shadow-2xs"
                                  />
                                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-700">
                                  {assignedAgent ? assignedAgent.displayName.split(' ')[0] : 'AI-1'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{item.estimatedHours ? `${item.estimatedHours}h` : '1h 30m'}</span>
                              </div>
                            </div>

                            {/* Mini Checklist Progress Bar (Direct Wireframe Replica) */}
                            <div className="pt-0.5 flex items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Mini checklist</span>
                              </div>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                <div
                                  className="h-full bg-slate-700 rounded-full transition-all"
                                  style={{ width: `${item.progressPercent || 40}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-600 font-mono shrink-0">
                                {item.progressPercent ? `${Math.max(1, Math.round(item.progressPercent / 20))}/5` : '2/5'}
                              </span>
                            </div>

                            {/* Card Footer: Assigned Agent & Provenance */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                              {/* Assigned Agent */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {assignedAgent ? (
                                  <>
                                    <img
                                      src={assignedAgent.avatarUrl}
                                      alt={assignedAgent.displayName}
                                      className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                                    />
                                    <span className="text-slate-700 font-medium text-[10px] truncate max-w-[95px]">
                                      {assignedAgent.firstName} {assignedAgent.lastName[0]}.
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-400 text-[10px] flex items-center gap-1">
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
                                  className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition cursor-pointer shadow-xs"
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
                                    className="p-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer shadow-xs"
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
                                    className="p-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer shadow-xs"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Latest Agent Log Snippet */}
                            {latestHistory?.comment && (
                              <div className="text-[10px] text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-1">
                                &quot;{latestHistory.comment}&quot;
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
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase font-mono text-slate-500 font-semibold">
                  <th className="py-3 px-4">Work Item</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const agent = getAgent(item.assignedAgentId);
                  const project = getProject(item.projectId);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemDetail(item)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-slate-900 line-clamp-1 hover:text-amber-800 transition">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{item.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span
                          className={`px-2 py-0.5 rounded border uppercase text-[9px] font-semibold ${
                            item.status === 'backlog'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : item.status === 'todo'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : item.status === 'in_progress'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-semibold ${getPriorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {agent ? (
                          <div className="flex items-center gap-1.5">
                            <img
                              src={agent.avatarUrl}
                              alt={agent.displayName}
                              className="w-5 h-5 rounded-full object-cover border border-slate-200"
                            />
                            <span className="text-slate-800 font-medium">{agent.displayName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{project?.name || item.projectId}</td>
                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-800">
                        {item.progressPercent ?? (item.status === 'done' ? 100 : 0)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleTriggerAgentWork(item)}
                            title="Agent Work"
                            className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-xs cursor-pointer"
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
            <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900">Autonomous Multi-Agent Mission Pipeline</h3>
                  <p className="text-xs text-slate-500">
                    Lead Agent orchestration blackboard and live execution tree. Dispatches high-level objectives into work items.
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <span className={`w-2 h-2 rounded-full ${isCollaborating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                  <span className="font-mono text-[11px] text-slate-700 font-medium">{isCollaborating ? 'Orchestration Active' : 'Ready'}</span>
                </div>
              </div>

              {/* Form to trigger orchestration */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                  Dispatch Multi-Agent Objective
                </span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    defaultValue="Determine whether Phoenix should migrate from Firebase to PostgreSQL. Use the team."
                    id="input-pipeline-mission"
                    className="flex-1 p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('input-pipeline-mission') as HTMLInputElement;
                      if (el && el.value.trim()) {
                        onTriggerMultiAgentTask(el.value.trim(), 'agent-sarah', activeProject?.id || 'proj-phoenix');
                      }
                    }}
                    disabled={isCollaborating}
                    className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 text-white" />
                    <span>{isCollaborating ? 'Coordinating...' : 'Execute Mission'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Orchestration Task or latest task */}
            {curPipelineTask ? (
              <div className="space-y-5">
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <h4 className="text-sm font-bold text-slate-900">{curPipelineTask.title}</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 font-mono font-semibold capitalize">
                        {curPipelineTask.status}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(curPipelineTask.createdAt).toLocaleTimeString()}</span>
                  </div>

                  {/* Delegation Tree */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
                      Hierarchical Delegation Hierarchy
                    </span>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <img src={pipelineLead?.avatarUrl} alt={pipelineLead?.displayName} className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                      <div>
                        <span className="font-bold text-xs text-slate-900">{pipelineLead?.displayName} (Lead Agent Owner)</span>
                        <p className="text-[11px] text-slate-500">Synthesizes findings, resolves specialist disputes, generates deliverables.</p>
                      </div>
                    </div>

                    <div className="pl-6 border-l-2 border-slate-200 ml-4 space-y-2">
                      {curPipelineTask.subtasks.map((st) => {
                        const spec = getAgent(st.assignedAgentId);
                        return (
                          <div key={st.id} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                            <div className="flex items-center gap-2.5">
                              <img src={spec?.avatarUrl} alt={spec?.displayName} className="w-6 h-6 rounded-md object-cover border border-slate-200" />
                              <div>
                                <span className="font-semibold text-slate-900">{spec?.displayName}:</span>
                                <span className="text-slate-600 ml-1.5">{st.title}</span>
                              </div>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-md capitalize font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                <Plus className="w-4 h-4 text-amber-600" />
                <span>Add Work Item to Stage</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Work Item Title *</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="e.g., Audit OAuth 2.0 PKCE Flow for Mobile Clients"
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description & Deliverable Criteria</label>
                <textarea
                  rows={3}
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Provide technical scope, requirements, and validation criteria..."
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Target Stage</label>
                  <select
                    value={newItemStatus}
                    onChange={(e) => setNewItemStatus(e.target.value as WorkItemStatus)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                  >
                    <option value="backlog">Backlogs</option>
                    <option value="todo">Todo</option>
                    <option value="in_progress">In-progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Priority</label>
                  <select
                    value={newItemPriority}
                    onChange={(e) => setNewItemPriority(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
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
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Assigned Agent</label>
                  <select
                    value={newItemAgent}
                    onChange={(e) => setNewItemAgent(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                  >
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} ({a.jobTitle})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Project Scope</label>
                  <select
                    value={newItemProject}
                    onChange={(e) => setNewItemProject(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
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
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Tags (Comma-Separated)</label>
                  <input
                    type="text"
                    value={newItemTags}
                    onChange={(e) => setNewItemTags(e.target.value)}
                    placeholder="Database, Security, DDL"
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Est. Hours</label>
                  <input
                    type="number"
                    value={newItemHours}
                    onChange={(e) => setNewItemHours(e.target.value)}
                    min="1"
                    max="200"
                    className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-amber-100 bg-amber-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Autonomous Agent Sprint Planning</span>
              </div>
              <button
                onClick={() => setIsAutoPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Instruct an executive or specialist agent to analyze the project roadmap and autonomously synthesize 3 structured work items categorized into Backlogs and Todo.
              </p>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Planning Agent Owner</label>
                <select
                  value={planAgentId}
                  onChange={(e) => setPlanAgentId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} — {a.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Target Project</label>
                <select
                  value={planProjectId}
                  onChange={(e) => setPlanProjectId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono text-slate-500 font-semibold mb-1">Sprint Objective / Direction</label>
                <textarea
                  rows={3}
                  value={planGoal}
                  onChange={(e) => setPlanGoal(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                  placeholder="Describe focus areas (e.g. data residency, pgvector tuning, budget caps)..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setIsAutoPlanModalOpen(false)}
                  disabled={isPlanningLoading}
                  className="py-2 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRunAutoPlan}
                  disabled={isPlanningLoading || !planGoal.trim()}
                  className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-white ${isPlanningLoading ? 'animate-spin' : ''}`} />
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[9px] px-2 py-0.5 rounded border uppercase font-mono font-semibold ${
                    selectedItemDetail.status === 'backlog'
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : selectedItemDetail.status === 'todo'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : selectedItemDetail.status === 'in_progress'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {selectedItemDetail.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedItemDetail.id}</span>
              </div>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Title & Description */}
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900 leading-snug">
                  {selectedItemDetail.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {selectedItemDetail.description}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-500 font-semibold block">Project</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                    {getProject(selectedItemDetail.projectId)?.name || selectedItemDetail.projectId}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-500 font-semibold block">Priority</span>
                  <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase font-semibold ${getPriorityBadge(selectedItemDetail.priority)}`}>
                    {selectedItemDetail.priority}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-500 font-semibold block">Assigned Agent</span>
                  <span className="font-semibold text-slate-900 mt-0.5 block truncate">
                    {getAgent(selectedItemDetail.assignedAgentId)?.displayName || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono text-slate-500 font-semibold block">Progress</span>
                  <span className="font-mono text-amber-800 mt-0.5 block font-bold">
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
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Quick Stage Transition Buttons */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold block">Transition Work Item Stage</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['backlog', 'todo', 'in_progress', 'done'] as WorkItemStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleQuickMove(selectedItemDetail, st)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-mono uppercase font-bold transition cursor-pointer border shadow-xs ${
                        selectedItemDetail.status === st
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* AGENT UPDATE CONSOLE (Section for agents to add & update work items) */}
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 text-[10px] font-bold uppercase tracking-widest font-mono">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>Agent Work Console (Autonomous Update)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Real-Time Autonomous Sync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-600 font-semibold mb-1">Executing Agent</label>
                    <select
                      value={activeAgentActionId}
                      onChange={(e) => setActiveAgentActionId(e.target.value)}
                      className="w-full p-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.displayName} ({a.jobTitle})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-600 font-semibold mb-1">Action Type</label>
                    <select
                      value={agentActionType}
                      onChange={(e) => setAgentActionType(e.target.value as any)}
                      className="w-full p-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-xs"
                    >
                      <option value="advance_stage">Advance Stage (Next Column)</option>
                      <option value="update_progress">Progress Work & Log Deliverable</option>
                      <option value="complete">Complete & Mark Done (100%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-600 font-semibold mb-1">
                    Agent Directive / Focus (Optional)
                  </label>
                  <input
                    type="text"
                    value={agentActionPrompt}
                    onChange={(e) => setAgentActionPrompt(e.target.value)}
                    placeholder="e.g., Audit SQL query performance or verify Frankfurt data residency..."
                    className="w-full p-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Agent will analyze context, update progress, and log audit history.
                  </span>
                  <button
                    onClick={handleExecuteAgentUpdate}
                    disabled={isAgentExecuting}
                    className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 text-white ${isAgentExecuting ? 'animate-spin' : ''}`} />
                    <span>{isAgentExecuting ? 'Agent Executing...' : 'Execute Agent Update'}</span>
                  </button>
                </div>
              </div>

              {/* Provenance & Update Timeline */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block font-mono">
                  Agent Audit History & Provenance ({selectedItemDetail.history.length})
                </span>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 font-mono text-[11px]">
                  {selectedItemDetail.history.map((log) => {
                    const authorAgent = getAgent(log.agentId);
                    return (
                      <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {authorAgent && (
                              <img
                                src={authorAgent.avatarUrl}
                                alt={authorAgent.displayName}
                                className="w-4 h-4 rounded-full object-cover"
                              />
                            )}
                            <span className="font-semibold text-slate-800">{log.authorName}</span>
                          </div>
                          <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-sans">{log.comment}</p>
                        {log.newStatus && (
                          <div className="text-[9px] text-slate-500">
                            Stage: <span className="text-amber-800 font-bold uppercase">{log.newStatus}</span>
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
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={async () => {
                  if (confirm('Delete this work item?')) {
                    await onDeleteWorkItem(selectedItemDetail.id);
                    setSelectedItemDetail(null);
                  }
                }}
                className="py-1.5 px-3 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 bg-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>

              <button
                onClick={() => setSelectedItemDetail(null)}
                className="py-1.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs"
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
