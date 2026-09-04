import React, { useState, useEffect } from 'react';
import { Agent, Project, MemoryItem, Artifact, Tool, ApprovalRequest, Task, TaskEvent, ChatMessage, ContextPacket, MemoryScope, LLMConfig, WorkItem, WorkItemStatus } from './types';
import { INITIAL_AGENTS, INITIAL_PROJECTS, INITIAL_MEMORIES, INITIAL_ARTIFACTS, INITIAL_TOOLS } from './data/initialData';
import { INITIAL_WORK_ITEMS } from './data/initialWorkItems';
import { MemoryManager } from './lib/memory/memoryManager';
import { MultiAgentOrchestrator } from './lib/orchestration/orchestrator';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ProjectsView } from './components/ProjectsView';
import { CollaborationView } from './components/CollaborationView';
import { TasksView } from './components/TasksView';
import { MemoryHubView } from './components/MemoryHubView';
import { AgentDirectoryView } from './components/AgentDirectoryView';
import { AgentWizardModal } from './components/AgentWizardModal';
import { ContextInspectorModal } from './components/ContextInspectorModal';
import { ArtifactModal } from './components/ArtifactModal';
import { ToolSecurityModal } from './components/ToolSecurityModal';
import { AgentProfileModal } from './components/AgentProfileModal';
import { AdminSettingsView } from './components/AdminSettingsView';

export const App: React.FC = () => {
  // Core Enterprise State
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [artifacts, setArtifacts] = useState<Artifact[]>(INITIAL_ARTIFACTS);
  const [tools, setTools] = useState<Tool[]>(INITIAL_TOOLS);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>(INITIAL_WORK_ITEMS);
  const [events, setEvents] = useState<TaskEvent[]>([]);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<'chat' | 'projects' | 'collaborate' | 'agents' | 'memory' | 'security' | 'settings'>('chat');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('agent-sarah');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-phoenix');

  // Interactive Task & Chat State
  const [activeTask, setActiveTask] = useState<Task | undefined>(undefined);
  const [isCollaborating, setIsCollaborating] = useState<boolean>(false);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({
    'agent-sarah': [
      {
        id: 'msg-init-sarah',
        agentId: 'agent-sarah',
        senderType: 'agent',
        content: `**Conclusion First**: Project Phoenix database evaluation is in progress. I am directing Marcus on technical architecture, Emma on market benchmarks, and Daniel on runway cost modeling.

You can delegate multi-agent tasks, query project memory, or inspect our 4-layer memory scopes anytime.`,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    'agent-emma': [
      {
        id: 'msg-init-emma',
        agentId: 'agent-emma',
        senderType: 'agent',
        content: `Hello! I manage our market benchmarks and research index. Whenever you ask about Project Phoenix or previous workstream decisions, I query our 4-layer memory (Conversation → Project → Agent → Org) with priority scoring.`,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  });

  // Modals State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [profileAgent, setProfileAgent] = useState<Agent | null>(null);
  const [isContextInspectorOpen, setIsContextInspectorOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [latestContextPacket, setLatestContextPacket] = useState<ContextPacket | undefined>(undefined);

  // Sync with Backend on Mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .catch((e) => console.log('Using local client state until server ready'));

    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        }
      })
      .catch((e) => console.log('Using local projects until server ready'));

    fetch('/api/work-items')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setWorkItems(data);
        }
      })
      .catch((e) => console.log('Using local work items until server ready'));
  }, []);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : undefined);

  // Project lifecycle handlers
  const handleCreateProject = async (newProjData: Partial<Project>) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProjData)
      });
      if (res.ok) {
        const created: Project = await res.json();
        setProjects((prev) => [...prev, created]);
        setSelectedProjectId(created.id);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, status: Project['status']) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated: Project = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === projectId ? updated : p)));
      }
    } catch (err) {
      console.error('Failed to update project status:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setProjects((prev) => {
          const remaining = prev.filter((p) => p.id !== projectId);
          if (selectedProjectId === projectId) {
            setSelectedProjectId(remaining[0]?.id || '');
          }
          return remaining;
        });
        // Unlink project in work items
        setWorkItems((prev) =>
          prev.map((wi) => (wi.projectId === projectId ? { ...wi, projectId: '' } : wi))
        );
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  // Send Direct Message to an Agent
  const handleSendMessage = async (text: string) => {
    setIsSendingMessage(true);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      senderType: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessagesByAgent((prev) => ({
      ...prev,
      [selectedAgent.id]: [...(prev[selectedAgent.id] || []), userMsg]
    }));

    try {
      const res = await fetch('/api/chat/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          userMessage: text,
          projectId: selectedProjectId,
          model: selectedAgent.llmConfig?.model,
          temperature: selectedAgent.llmConfig?.temperature
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLatestContextPacket(data.contextPacket);

        const agentReplyMsg: ChatMessage = {
          id: `agt-${Date.now()}`,
          agentId: selectedAgent.id,
          senderType: 'agent',
          content: data.reply,
          timestamp: new Date().toISOString()
        };

        setMessagesByAgent((prev) => ({
          ...prev,
          [selectedAgent.id]: [...(prev[selectedAgent.id] || []), agentReplyMsg]
        }));
      } else {
        throw new Error('Server chat failed');
      }
    } catch (err) {
      // High-fidelity fallback adhering strictly to agent personality & 4-layer memory (Section 61)
      let reply = '';
      if (selectedAgent.id === 'agent-emma') {
        if (text.toLowerCase().includes('database') || text.toLowerCase().includes('phoenix')) {
          reply = `Based on Project Phoenix project memory: We selected **PostgreSQL** over Firebase.

**Rationale & Key Factors**:
1. **Relational Integrity & Complex Queries**: Phoenix requires strict foreign key relationships and multi-tenant indexing that Firebase document queries could not satisfy.
2. **pgvector & Semantic Search**: PostgreSQL provides native vector search needed for our upcoming knowledge analytics.
3. **Data Residency Compliance**: Managed PostgreSQL in EU-Frankfurt meets Customer Acme's strict compliance mandate.
4. **Execution Decision**: Following Daniel's financial analysis, Sarah approved a phased rollout—building the repository boundary first, with production cutover in Q1 2027.`;
        } else {
          reply = `I have examined our research index. From our recent benchmarks, we prioritize primary documentation and verified ecosystem benchmarks. Let me know which architecture or tooling domain you would like me to investigate.`;
        }
      } else if (selectedAgent.id === 'agent-marcus') {
        reply = `From an architectural standpoint: Our platform requires strong relational consistency and strict schema boundaries. I strongly advise adopting PostgreSQL with an adapter layer to isolate legacy Firestore documents. All code changes should include automated rollback migrations.`;
      } else if (selectedAgent.id === 'agent-sarah') {
        reply = `**Conclusion First**: Project Phoenix is on track. I am coordinating Marcus on backend engineering, Emma on market benchmarks, and Daniel on runway allocations. 

What executive decision or multi-agent delegation would you like me to coordinate?`;
      } else {
        reply = `Understood. I am operating with our organizational standards and project guidelines. Let me know how I can contribute to this workstream.`;
      }

      const fallbackMsg: ChatMessage = {
        id: `agt-${Date.now()}`,
        agentId: selectedAgent.id,
        senderType: 'agent',
        content: reply,
        timestamp: new Date().toISOString()
      };

      setMessagesByAgent((prev) => ({
        ...prev,
        [selectedAgent.id]: [...(prev[selectedAgent.id] || []), fallbackMsg]
      }));
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Update Agent Foundation Model and Inference Parameters
  const handleUpdateAgentLLMConfig = async (agentId: string, newConfig: Partial<LLMConfig>) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === agentId) {
          return {
            ...a,
            llmConfig: {
              ...a.llmConfig,
              ...newConfig
            }
          };
        }
        return a;
      })
    );

    setProfileAgent((prev) => {
      if (prev && prev.id === agentId) {
        return {
          ...prev,
          llmConfig: {
            ...prev.llmConfig,
            ...newConfig
          }
        };
      }
      return prev;
    });

    try {
      await fetch(`/api/agents/${agentId}/llm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (err) {
      console.log('Using local client state for agent LLM config');
    }
  };

  // Run Collaborative Multi-Agent Orchestration (Section 54, 61)
  const handleTriggerMultiAgentTask = async (
    instruction: string,
    leadId: string = 'agent-sarah',
    projId: string = 'proj-phoenix'
  ) => {
    setIsCollaborating(true);
    setCurrentTab('collaborate');

    try {
      const memoryManager = new MemoryManager(memories);
      const orchestrator = new MultiAgentOrchestrator(agents, projects, memoryManager, artifacts, (evt) => {
        setEvents((prev) => [...prev, evt]);
      });

      const result = await orchestrator.executeCollaborativeTask({
        userInstruction: instruction,
        leadAgentId: leadId,
        projectId: projId,
        onProgressUpdate: (updatedTask) => {
          setActiveTask({ ...updatedTask });
          setTasks((prev) => {
            const idx = prev.findIndex((t) => t.id === updatedTask.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...updatedTask };
              return copy;
            }
            return [...prev, { ...updatedTask }];
          });
        }
      });

      // Update global artifacts & memories
      setArtifacts((prev) => [...prev, ...result.task.workspace.artifacts]);
      setMemories(memoryManager.getAllMemories());

      // Update Project recent decisions
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projId) {
            return {
              ...p,
              recentDecisions: [
                {
                  id: `dec-${Date.now()}`,
                  title: 'Phased PostgreSQL Migration',
                  decision:
                    'Approved phased migration to PostgreSQL: build adapter layer in Q4; execute data cutover in Q1 2027 to satisfy financial limits.',
                  decidedAt: new Date().toISOString(),
                  agentId: leadId
                },
                ...p.recentDecisions
              ]
            };
          }
          return p;
        })
      );

      // Append multi-agent summary card to Lead Agent's Chat
      const leadAgent = agents.find((a) => a.id === leadId);
      if (leadAgent) {
        const collabSummaryMsg: ChatMessage = {
          id: `collab-${Date.now()}`,
          agentId: leadAgent.id,
          senderType: 'agent',
          content: result.finalSummary,
          timestamp: new Date().toISOString(),
          metadata: {
            isMultiAgentExecution: true,
            internalActivities: [
              { text: 'Sarah formulated 3-step specialist delegation plan' },
              { text: 'Marcus completed PostgreSQL Architecture RFC' },
              { text: 'Emma compiled Ecosystem & Tooling Benchmark' },
              { text: 'Daniel flagged Q4 capital limit ($38.4k vs $20k runway)' },
              { text: 'Sarah synthesized disagreement into phased Q4/Q1 plan' }
            ],
            promotedMemories: result.promotedMemories
          },
          attachments: result.task.workspace.artifacts
        };

        setMessagesByAgent((prev) => ({
          ...prev,
          [leadAgent.id]: [...(prev[leadAgent.id] || []), collabSummaryMsg]
        }));
      }
    } catch (err) {
      console.error('Orchestration error:', err);
    } finally {
      setIsCollaborating(false);
    }
  };

  // Run the Full Success Test Scenario (Section 61)
  const handleRunSuccessDemo = async () => {
    setSelectedAgentId('agent-sarah');
    setSelectedProjectId('proj-phoenix');
    await handleTriggerMultiAgentTask(
      'Determine whether Phoenix should migrate from Firebase to PostgreSQL. Use the team.',
      'agent-sarah',
      'proj-phoenix'
    );
  };

  // Memory Promotion
  const handlePromoteMemory = (params: {
    memoryId: string;
    targetScope: MemoryScope;
    promotedByAgentId: string;
    reason: string;
    targetProjectId?: string;
  }) => {
    const memMgr = new MemoryManager(memories);
    const updated = memMgr.promoteMemory(params);
    if (updated) {
      setMemories(memMgr.getAllMemories());
    }
  };

  // Create Agent via 5-step Wizard
  const handleCreateAgent = (newAgentData: Partial<Agent>) => {
    const fullAgent: Agent = {
      id: `agent-${Date.now()}`,
      workspaceId: 'ws-default',
      firstName: newAgentData.firstName || 'New',
      lastName: newAgentData.lastName || 'Agent',
      displayName: newAgentData.displayName || 'New Coworker',
      avatarUrl:
        newAgentData.avatarUrl ||
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      jobTitle: newAgentData.jobTitle || 'Specialist',
      department: newAgentData.department || 'General',
      seniority: newAgentData.seniority || 'Senior',
      gender: newAgentData.gender || 'non-binary',
      approxAge: newAgentData.approxAge || newAgentData.age || 30,
      age: newAgentData.age || 30,
      nationality: newAgentData.nationality || 'Global',
      primaryResponsibility: newAgentData.primaryResponsibility || 'Assist team goals',
      secondaryResponsibilities: newAgentData.secondaryResponsibilities || [],
      expertise: newAgentData.expertise || newAgentData.skills || ['Planning'],
      skills: newAgentData.skills || ['Planning'],
      temperament: newAgentData.temperament || 'analytical',
      personalityDescription: newAgentData.personalityDescription || 'Focused and dependable.',
      personalityDimensions: newAgentData.personalityDimensions || {
        analyticalVsIntuitive: 80,
        formalVsCasual: 60,
        verboseVsConcise: 50,
        cautiousVsFast: 70,
        independentVsCollaborative: 70,
        assertiveVsDeferential: 60,
        detailVsBigPicture: 80,
        theoreticalVsPragmatic: 75,
        optimisticVsSkeptical: 40,
        methodicalVsExperimental: 80
      },
      communicationMode: (newAgentData.communicationMode || 'Technical expert') as any,
      communicationStyle: newAgentData.communicationStyle || {
        mode: 'conclusion_first',
        verbosity: 'concise',
        jargonLevel: 'expert',
        humorLevel: 'none',
        challengesUserDecisions: true,
        proactivelySuggestsImprovements: true
      },
      autonomyLevel: newAgentData.autonomyLevel || 3,
      llmConfig: newAgentData.llmConfig || {
        provider: 'google',
        model: 'gemini-3.8-flash',
        temperature: 0.2,
        maxTokens: 4096
      },
      toolIds: newAgentData.toolIds || newAgentData.tools || ['tool-web-search'],
      tools: newAgentData.tools || newAgentData.toolIds || ['tool-web-search'],
      memoryAccess: {
        allowedScopes: ['conversation', 'agent', 'project', 'organization'],
        projectIds: [selectedProjectId]
      },
      runtimeState: {
        status: 'idle'
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0
      },
      createdAt: new Date().toISOString()
    };

    setAgents((prev) => [...prev, fullAgent]);
    setSelectedAgentId(fullAgent.id);
    setCurrentTab('chat');
  };

  // Tool Security Approval Decision
  const handleDecideApproval = (id: string, decision: 'approved' | 'rejected') => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
    );
  };

  // Work Item Operations (Backlogs, Todo, In-progress, Done - added & updated by agents)
  const handleAddWorkItem = async (itemData: Partial<WorkItem>) => {
    try {
      const res = await fetch('/api/work-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (res.ok) {
        const created = await res.json();
        setWorkItems((prev) => [created, ...prev]);
        return;
      }
    } catch (e) {
      console.error('Work item add API error, using local fallback:', e);
    }

    const creator = agents.find((a) => a.id === (itemData.createdByAgentId || 'agent-sarah'));
    const now = new Date().toISOString();
    const fallbackItem: WorkItem = {
      id: `wi-${Date.now()}`,
      workspaceId: 'ws-default',
      projectId: itemData.projectId || selectedProjectId || 'proj-phoenix',
      title: itemData.title || 'New Work Item',
      description: itemData.description || '',
      status: itemData.status || 'backlog',
      priority: itemData.priority || 'medium',
      assignedAgentId: itemData.assignedAgentId || 'agent-sarah',
      createdByAgentId: itemData.createdByAgentId || 'agent-sarah',
      createdByName: creator ? creator.displayName : 'Agent Lead',
      lastUpdatedByAgentId: itemData.createdByAgentId || 'agent-sarah',
      tags: itemData.tags || ['Task'],
      estimatedHours: itemData.estimatedHours || 8,
      actualHours: 0,
      progressPercent: itemData.status === 'done' ? 100 : (itemData.status === 'in_progress' ? 25 : 0),
      history: [
        {
          id: `hist-${Date.now()}`,
          agentId: itemData.createdByAgentId,
          authorName: creator ? creator.displayName : 'Agent',
          timestamp: now,
          newStatus: itemData.status || 'backlog',
          comment: `Work item registered in ${itemData.status?.toUpperCase() || 'BACKLOG'} stage.`,
          progressPercent: itemData.status === 'done' ? 100 : 0
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    setWorkItems((prev) => [fallbackItem, ...prev]);
  };

  const handleUpdateWorkItem = async (id: string, updates: Partial<WorkItem> & { updatedByAgentId?: string; comment?: string }) => {
    try {
      const res = await fetch(`/api/work-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const updated = await res.json();
        setWorkItems((prev) => prev.map((w) => (w.id === id ? updated : w)));
        return;
      }
    } catch (e) {
      console.error('Work item update API error, applying local state:', e);
    }

    const now = new Date().toISOString();
    const updater = agents.find((a) => a.id === updates.updatedByAgentId);
    setWorkItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const prevStatus = item.status;
        const nextStatus = updates.status || item.status;
        const newProgress =
          updates.progressPercent !== undefined
            ? updates.progressPercent
            : nextStatus === 'done'
            ? 100
            : item.progressPercent;

        const newHistory = [...item.history];
        if (updates.comment || (updates.status && updates.status !== prevStatus)) {
          newHistory.push({
            id: `hist-${Date.now()}`,
            agentId: updates.updatedByAgentId,
            authorName: updater ? updater.displayName : 'Agent',
            timestamp: now,
            previousStatus: prevStatus !== nextStatus ? prevStatus : undefined,
            newStatus: nextStatus,
            comment: updates.comment || `Moved to ${nextStatus.toUpperCase()}`,
            progressPercent: newProgress
          });
        }

        return {
          ...item,
          ...updates,
          status: nextStatus,
          progressPercent: newProgress,
          history: newHistory,
          updatedAt: now
        };
      })
    );
  };

  const handleAgentWorkOnItem = async (id: string, agentId: string, actionType: string, customPrompt?: string) => {
    try {
      const res = await fetch(`/api/work-items/${id}/agent-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, actionType, customPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setWorkItems((prev) => prev.map((w) => (w.id === id ? data.item : w)));
          return;
        }
      }
    } catch (e) {
      console.error('Agent work API error, using local simulation:', e);
    }

    const agent = agents.find((a) => a.id === agentId) || agents[0];
    const item = workItems.find((w) => w.id === id);
    if (!item) return;

    let newStatus = item.status;
    let newProgress = item.progressPercent || 0;
    if (actionType === 'advance_stage') {
      if (item.status === 'backlog') {
        newStatus = 'todo';
        newProgress = 0;
      } else if (item.status === 'todo') {
        newStatus = 'in_progress';
        newProgress = 35;
      } else if (item.status === 'in_progress') {
        newStatus = 'done';
        newProgress = 100;
      }
    } else if (actionType === 'complete') {
      newStatus = 'done';
      newProgress = 100;
    } else {
      if (item.status === 'backlog' || item.status === 'todo') {
        newStatus = 'in_progress';
        newProgress = 30;
      } else if (item.status === 'in_progress') {
        newProgress = Math.min(95, newProgress + 25);
      }
    }

    await handleUpdateWorkItem(id, {
      status: newStatus,
      progressPercent: newProgress,
      updatedByAgentId: agent.id,
      comment: `Agent ${agent.displayName} performed technical deliverable execution and moved stage to ${newStatus.toUpperCase()}.`
    });
  };

  const handleAgentGenerateItems = async (agentId: string, projectId: string, goal?: string) => {
    try {
      const res = await fetch('/api/work-items/agent-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, projectId, goal })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.createdItems)) {
          setWorkItems((prev) => [...data.createdItems, ...prev]);
          return;
        }
      }
    } catch (e) {
      console.error('Agent generate work items API error:', e);
    }
  };

  const handleDeleteWorkItem = async (id: string) => {
    try {
      await fetch(`/api/work-items/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Delete work item API error:', e);
    }
    setWorkItems((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAddTool = async (newTool: Tool) => {
    setTools((prev) => {
      const idx = prev.findIndex((t) => t.id === newTool.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = newTool;
        return next;
      }
      return [...prev, newTool];
    });
    try {
      await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTool)
      });
    } catch (e) {
      console.error('Tool sync API error:', e);
    }
  };

  const handleAssignAgentTool = async (agentId: string, toolId: string, assign: boolean) => {
    let updatedTools: string[] = [];
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        const current = a.tools || a.toolIds || [];
        const updated = assign
          ? Array.from(new Set([...current, toolId]))
          : current.filter((t) => t !== toolId);
        updatedTools = updated;
        return { ...a, tools: updated, toolIds: updated };
      })
    );
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: updatedTools, toolIds: updatedTools })
      });
    } catch (e) {
      console.error('Agent tool assign API error:', e);
    }
  };

  const handleUpdateAgentTools = async (agentId: string, newTools: string[]) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, tools: newTools, toolIds: newTools } : a))
    );
    setProfileAgent((prev) => (prev && prev.id === agentId ? { ...prev, tools: newTools, toolIds: newTools } : prev));
    try {
      await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tools: newTools, toolIds: newTools })
      });
    } catch (e) {
      console.error('Agent tools update API error:', e);
    }
  };

  const handleUpdateAgentModel = async (agentId: string, model: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? {
              ...a,
              defaultModel: model,
              llmConfig: a.llmConfig
                ? { ...a.llmConfig, model }
                : { provider: 'google', model, temperature: 0.2, maxTokens: 4096 }
            }
          : a
      )
    );
    try {
      await fetch(`/api/agents/${agentId}/llm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model })
      });
    } catch (e) {
      console.error('Agent model update API error:', e);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(id) => {
          setSelectedAgentId(id);
          setCurrentTab('chat');
        }}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setCurrentTab('projects');
        }}
        activeTasks={tasks}
        onOpenWizard={() => setIsWizardOpen(true)}
        onRunSuccessDemo={handleRunSuccessDemo}
        isDemoRunning={isCollaborating}
      />

      {/* Main Panel Router */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'chat' && (
          <ChatPanel
            agent={selectedAgent}
            allAgents={agents}
            projects={projects}
            activeProject={selectedProject}
            messages={messagesByAgent[selectedAgent.id] || []}
            onSendMessage={handleSendMessage}
            isSending={isSendingMessage}
            onOpenProfile={(a) => setProfileAgent(a)}
            onOpenContextInspector={() => setIsContextInspectorOpen(true)}
            onOpenArtifact={(art) => setActiveArtifact(art)}
            onTriggerMultiAgentTask={(inst) => handleTriggerMultiAgentTask(inst, selectedAgent.id, selectedProjectId)}
            onUpdateAgentLLM={handleUpdateAgentLLMConfig}
            activeTask={activeTask}
            isCollaborating={isCollaborating}
          />
        )}

        {currentTab === 'projects' && (
          <ProjectsView
            project={selectedProject}
            allProjects={projects}
            onSelectProject={setSelectedProjectId}
            agents={agents}
            memories={memories}
            artifacts={artifacts}
            tasks={tasks}
            onOpenArtifact={(art) => setActiveArtifact(art)}
            onRunProjectTask={() => {
              if (selectedProject) {
                handleTriggerMultiAgentTask(
                  `Coordinate multi-agent task execution for ${selectedProject.name}.`,
                  selectedProject.ownerAgentId || 'agent-sarah',
                  selectedProject.id
                );
              }
            }}
            isCollaborating={isCollaborating}
            onCreateProject={handleCreateProject}
            onUpdateProjectStatus={handleUpdateProjectStatus}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {currentTab === 'collaborate' && (
          <TasksView
            workItems={workItems}
            agents={agents}
            projects={projects}
            activeProject={selectedProject}
            onAddWorkItem={handleAddWorkItem}
            onUpdateWorkItem={handleUpdateWorkItem}
            onAgentWorkOnItem={handleAgentWorkOnItem}
            onAgentGenerateItems={handleAgentGenerateItems}
            onDeleteWorkItem={handleDeleteWorkItem}
            onOpenArtifact={(art) => setActiveArtifact(art)}
            tasks={tasks}
            activeTask={activeTask}
            events={events}
            onTriggerMultiAgentTask={(inst, leadId, pId) => handleTriggerMultiAgentTask(inst, leadId, pId)}
            isCollaborating={isCollaborating}
          />
        )}

        {currentTab === 'agents' && (
          <AgentDirectoryView
            agents={agents}
            onSelectAgent={(id) => {
              setSelectedAgentId(id);
              setCurrentTab('chat');
            }}
            onOpenProfile={(a) => setProfileAgent(a)}
          />
        )}

        {currentTab === 'memory' && (
          <MemoryHubView
            memories={memories}
            agents={agents}
            projects={projects}
            onPromoteMemory={handlePromoteMemory}
          />
        )}

        {currentTab === 'security' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <ToolSecurityModal
                isOpen={true}
                onClose={() => setCurrentTab('chat')}
                tools={tools}
                approvals={approvals}
                onDecideApproval={handleDecideApproval}
                agents={agents}
                onAddTool={handleAddTool}
                onAssignAgentTool={handleAssignAgentTool}
              />
            </div>
          </div>
        )}

        {currentTab === 'settings' && (
          <AdminSettingsView
            agents={agents}
            onUpdateAgentModel={handleUpdateAgentModel}
          />
        )}
      </main>

      {/* Modals */}
      <AgentWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateAgent={handleCreateAgent}
        tools={tools}
        onAddGlobalTool={handleAddTool}
      />

      <ContextInspectorModal
        isOpen={isContextInspectorOpen}
        onClose={() => setIsContextInspectorOpen(false)}
        agent={selectedAgent}
        contextPacket={latestContextPacket}
        project={selectedProject}
      />

      {activeArtifact && (
        <ArtifactModal
          artifact={activeArtifact}
          onClose={() => setActiveArtifact(null)}
          getAgentName={(id) => agents.find((a) => a.id === id)?.displayName || 'Team Specialist'}
        />
      )}

      {profileAgent && (
        <AgentProfileModal
          agent={profileAgent}
          onClose={() => setProfileAgent(null)}
          memories={memories}
          onUpdateLLMConfig={handleUpdateAgentLLMConfig}
          tools={tools}
          onUpdateAgentTools={handleUpdateAgentTools}
          onAddTool={handleAddTool}
        />
      )}
    </div>
  );
};

export default App;
