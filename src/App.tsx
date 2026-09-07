import React, { useState, useEffect, useCallback } from 'react';
import { Agent, Project, MemoryItem, Artifact, Tool, ApprovalRequest, Task, TaskEvent, ChatMessage, ContextPacket, MemoryScope, LLMConfig, WorkItem, WorkItemStatus } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ProjectsView } from './components/ProjectsView';
import { TasksView } from './components/TasksView';
import { MemoryHubView } from './components/MemoryHubView';
import { AgentDirectoryView } from './components/AgentDirectoryView';
import { OrgChartView } from './components/OrgChartView';
import { AgentWizardModal } from './components/AgentWizardModal';
import { ContextInspectorModal } from './components/ContextInspectorModal';
import { ArtifactModal } from './components/ArtifactModal';
import { ToolSecurityModal } from './components/ToolSecurityModal';
import { AgentProfileModal } from './components/AgentProfileModal';
import { AdminSettingsView } from './components/AdminSettingsView';


import { api } from './lib/api';
import { OperationsView } from './components/OperationsView';
import { RunReviewView } from './components/RunReviewView';

export const App: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [settingsSection, setSettingsSection] = useState<'configuration' | 'operations'>('configuration');
  const [currentTab, setCurrentTab] = useState<'chat' | 'projects' | 'collaborate' | 'agents' | 'org_chart' | 'memory' | 'security' | 'settings' | 'runs'>('chat');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [profileAgent, setProfileAgent] = useState<Agent | null>(null);
  const [isContextInspectorOpen, setIsContextInspectorOpen] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [error, setError] = useState('');
  const latestContextPacket: ContextPacket | undefined = undefined;
  const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];
  const conversationKey = `${selectedProject?.id}:${selectedAgent?.id}`;
  const activeTask = [...tasks].reverse().find(t => t.projectId === selectedProject?.id && t.leadAgentId === selectedAgent?.id);
  const events: TaskEvent[] = tasks.flatMap(t => (t as any).events || []);
  const isCollaborating = tasks.some(t => ['queued', 'working', 'waiting', 'waiting_children'].includes(t.status));

  useEffect(() => {
    const listener = (event: Event) => setError((event as CustomEvent).detail);
    window.addEventListener('workspace-error', listener);
    return () => window.removeEventListener('workspace-error', listener);
  }, []);
  const refresh = useCallback(async () => {
    const [a, p, m, ar, to, ap, ta, w] = await Promise.all([
      api<Agent[]>('/api/agents'), api<Project[]>('/api/projects'), api<MemoryItem[]>('/api/memories'),
      api<Artifact[]>('/api/artifacts'), api<Tool[]>('/api/tools'), api<ApprovalRequest[]>('/api/approvals'),
      api<Task[]>('/api/tasks'), api<WorkItem[]>('/api/work-items'),
    ]);
    setAgents(a); setProjects(p); setMemories(m); setArtifacts(ar); setTools(to); setApprovals(ap); setTasks(ta); setWorkItems(w);
    setSelectedAgentId(old => a.some(v => v.id === old) ? old : a[0]?.id || '');
    setSelectedProjectId(old => p.some(v => v.id === old) ? old : p[0]?.id || '');
    setProfileAgent(old => old ? a.find(v => v.id === old.id) || null : null);
  }, []);
  useEffect(() => { void refresh().catch(() => {}); const timer = setInterval(() => void refresh().catch(() => {}), 3000); return () => clearInterval(timer); }, [refresh]);
  useEffect(() => {
    if (!selectedAgent?.id || !selectedProject?.id) return;
    let disposed = false;
    const poll = async () => {
      try {
        const messages = await api<ChatMessage[]>(`/api/chat/messages?agentId=${encodeURIComponent(selectedAgent.id)}&projectId=${encodeURIComponent(selectedProject.id)}`);
        if (!disposed) setMessagesByAgent(prev => ({ ...prev, [conversationKey]: messages }));
      } catch {}
    };
    void poll(); const timer = setInterval(poll, 1000);
    return () => { disposed = true; clearInterval(timer); };
  }, [selectedAgent?.id, selectedProject?.id, conversationKey]);
  const change = async (url: string, method: string, body?: unknown) => {
    try { setError(''); const result = await api(url, method, body); await refresh(); return result; }
    catch (e) { setError(e instanceof Error ? e.message : 'Operation failed'); return undefined; }
  };
  const handleCreateProject = async (data: Partial<Project>) => { const created = await change('/api/projects', 'POST', data); if (created) setSelectedProjectId(created.id); return Boolean(created); };
  const handleUpdateProjectStatus = async (id: string, status: Project['status']) => { await change(`/api/projects/${id}`, 'PATCH', { status }); };
  const handleDeleteProject = async (id: string) => { await change(`/api/projects/${id}`, 'DELETE'); };
  const handleSendMessage = async (userMessage: string) => {
    if (!selectedAgent || !selectedProject) { setError('Create an agent and project first.'); return; }
    setIsSendingMessage(true);
    await change('/api/chat/agent', 'POST', { agentId: selectedAgent.id, projectId: selectedProject.id, userMessage });
    setIsSendingMessage(false);
  };
  const handleTriggerMultiAgentTask = async (userInstruction: string, leadAgentId = selectedAgent?.id, projectId = selectedProject?.id) => {
    const result = await change('/api/orchestrate/run', 'POST', { userInstruction, leadAgentId, projectId });
    if (result) setCurrentTab('runs');
  };
  const handleUpdateAgentLLMConfig = async (id: string, config: Partial<LLMConfig>) => { await change(`/api/agents/${id}/llm`, 'PATCH', config); };
  const handlePromoteMemory = async (data: { memoryId: string; targetScope: MemoryScope; promotedByAgentId: string; reason: string; targetProjectId?: string }) => { await change('/api/memories/promote', 'POST', data); };
  const handleCreateAgent = async (data: Partial<Agent>) => { const result = await change('/api/agents', 'POST', data); if (result) { setSelectedAgentId(result.id); setCurrentTab('chat'); } return Boolean(result); };
  const handleDeleteAgent = async (id: string) => { await change(`/api/agents/${id}`, 'DELETE'); };
  const handleDecideApproval = async (id: string, decision: 'approved' | 'rejected') => { await change(`/api/approvals/${id}`, 'POST', { decision }); };
  const handleAddWorkItem = async (data: Partial<WorkItem>) => { await change('/api/work-items', 'POST', data); };
  const handleUpdateWorkItem = async (id: string, data: Partial<WorkItem> & { updatedByAgentId?: string; comment?: string }) => { await change(`/api/work-items/${id}`, 'PATCH', data); };
  const handleAgentWorkOnItem = async (id: string, agentId: string, actionType: string, customPrompt?: string) => { const result = await change(`/api/work-items/${id}/agent-work`, 'POST', { agentId, actionType, customPrompt }); if (result) setCurrentTab('runs'); };
  const handleAgentGenerateItems = async (agentId: string, projectId: string, goal?: string) => { const result = await change('/api/work-items/agent-generate', 'POST', { agentId, projectId, goal }); if (result) setCurrentTab('runs'); };
  const handleDeleteWorkItem = async (id: string) => { await change(`/api/work-items/${id}`, 'DELETE'); };
  const handleAddTool = async (_tool: Tool) => { setError('Tools are server-controlled. Custom tools and Python scripts are disabled.'); };
  const handleUpdateAgentTools = async (id: string, toolIds: string[]) => { await change(`/api/agents/${id}`, 'PATCH', { toolIds }); };
  const handleAssignAgentTool = async (id: string, toolId: string, assign: boolean) => {
    const ids = agents.find(a => a.id === id)?.toolIds || [];
    await handleUpdateAgentTools(id, assign ? [...new Set([...ids, toolId])] : ids.filter(t => t !== toolId));
  };
  const handleUpdateAgentModel = async (id: string, model: string) => { await handleUpdateAgentLLMConfig(id, { model }); };
  const handleUpdateAgentReportingLine = async (id: string, reportsTo?: string) => { await change(`/api/agents/${id}`, 'PATCH', { reportsTo: reportsTo || null }); };
  const handleUpdateAgentAvatar = async (id: string, avatarUrl: string) => { await change(`/api/agents/${id}`, 'PATCH', { avatarUrl }); };
  return (
    <div className="flex flex-col h-screen w-screen bg-[#F8F9FA] text-slate-900 overflow-hidden font-sans antialiased">
      {error && <div role="alert" className="shrink-0 bg-red-50 text-red-800 px-4 py-2 text-sm">{error} <button className="underline ml-3" onClick={() => setError('')}>Dismiss</button></div>}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar Navigation */}
      <Sidebar
        onSignOut={() => void api('/api/session', 'DELETE').then(() => window.dispatchEvent(new Event('workspace-signed-out')))}
        attentionCount={approvals.filter(a => a.status === 'pending').length}
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
      />

      {/* Main Panel Router */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'runs' && <RunReviewView onSelectAgent={(agentId, projectId) => { setSelectedAgentId(agentId); setSelectedProjectId(projectId); setCurrentTab('chat'); }} runs={tasks} approvals={approvals} onDecide={handleDecideApproval} onAction={async (id, action, reason) => { await change(`/api/runs/${id}/${action}`, 'POST', reason ? { reason } : {}); }} />}
        {currentTab === 'chat' && (!selectedAgent || !selectedProject) && <div className="p-8">Create an agent and a project to start a conversation.</div>}
        {currentTab === 'chat' && selectedAgent && selectedProject && (
          <ChatPanel
            agent={selectedAgent}
            allAgents={agents}
            projects={projects}
            activeProject={selectedProject}
            messages={messagesByAgent[conversationKey] || []}
            runs={tasks}
            onSendMessage={handleSendMessage}
            isSending={isSendingMessage || Boolean(activeTask && ['queued', 'working', 'waiting', 'waiting_children'].includes(activeTask.status))}
            onOpenProfile={(a) => setProfileAgent(a)}
            onOpenContextInspector={() => setIsContextInspectorOpen(true)}
            onOpenArtifact={(art) => setActiveArtifact(art)}
            onTriggerMultiAgentTask={(inst) => handleTriggerMultiAgentTask(inst, selectedAgent.id, selectedProjectId)}
            onUpdateAgentLLM={handleUpdateAgentLLMConfig}
            activeTask={activeTask}
            isCollaborating={isCollaborating}
            artifacts={artifacts}
            memories={memories}
            onViewProject={(pid) => {
              if (pid) setSelectedProjectId(pid);
              setCurrentTab('collaborate');
            }}
            onSelectProject={(pid) => {
              setSelectedProjectId(pid);
            }}
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
            isCollaborating={isCollaborating}
            onCreateProject={handleCreateProject}
            onUpdateProjectStatus={handleUpdateProjectStatus}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {currentTab === 'collaborate' && (
          <TasksView
            onOpenRun={(id) => { setCurrentTab('runs'); window.location.hash = `run-${id}`; }}
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
            onSetDelegation={(id, enabled) => void handleAssignAgentTool(id, 'tool-delegate', enabled)}
            onUpdateReportingLine={handleUpdateAgentReportingLine}
            onDeleteAgent={handleDeleteAgent}
          />
        )}

        {currentTab === 'org_chart' && (
          <OrgChartView
            agents={agents}
            onSelectAgent={(id) => {
              setSelectedAgentId(id);
              setCurrentTab('chat');
            }}
            onOpenProfile={(a) => setProfileAgent(a)}
            onSetDelegation={(id, enabled) => void handleAssignAgentTool(id, 'tool-delegate', enabled)}
            onUpdateReportingLine={handleUpdateAgentReportingLine}
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

                onAssignAgentTool={handleAssignAgentTool}
              />
            </div>
          </div>
        )}

        {currentTab === 'settings' && <section className="flex flex-col flex-1 min-w-0 min-h-0">
          <nav aria-label="Settings sections" className="flex items-center gap-3 border-b bg-white px-6 py-3">
            <button aria-pressed={settingsSection === 'configuration'} className="px-3 py-2 rounded-lg border text-sm" onClick={() => setSettingsSection('configuration')}>Configuration</button>
            <button aria-pressed={settingsSection === 'operations'} className="px-3 py-2 rounded-lg border text-sm" onClick={() => setSettingsSection('operations')}>Operations</button>
          </nav>
          <div className="flex flex-1 min-h-0">{settingsSection === 'operations' ? <OperationsView /> : <AdminSettingsView agents={agents} onUpdateAgentLLMConfig={handleUpdateAgentLLMConfig} />}</div>
        </section>}

      </main>

      {/* Modals */}
      <AgentWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreateAgent={handleCreateAgent}
        tools={tools}

        existingAgents={agents}
      />

      {selectedAgent && <ContextInspectorModal
        isOpen={isContextInspectorOpen}
        onClose={() => setIsContextInspectorOpen(false)}
        agent={selectedAgent}
        contextPacket={latestContextPacket}
        project={selectedProject}
      />}

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

          allAgents={agents}
          onUpdateReportingLine={handleUpdateAgentReportingLine}
          onUpdateAvatar={handleUpdateAgentAvatar}
          onDeleteAgent={handleDeleteAgent}
        />
      )}
      </div>
    </div>
  );
};

export default App;
