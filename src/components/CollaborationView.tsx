import React, { useState } from 'react';
import { Task, Agent, TaskEvent, Artifact, Project } from '../types';
import {
  GitMerge,
  Play,
  Pause,
  StopCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Brain,
  MessageSquare,
  Sparkles,
  GitBranch,
  Shield,
  Layers,
  ExternalLink
} from 'lucide-react';

interface CollaborationViewProps {
  tasks: Task[];
  activeTask?: Task;
  events: TaskEvent[];
  agents: Agent[];
  projects: Project[];
  onTriggerTask: (instruction: string, leadAgentId: string, projectId: string) => Promise<void>;
  isExecuting: boolean;
  onOpenArtifact: (artifact: Artifact) => void;
}

export const CollaborationView: React.FC<CollaborationViewProps> = ({
  tasks,
  activeTask,
  events,
  agents,
  projects,
  onTriggerTask,
  isExecuting,
  onOpenArtifact
}) => {
  const [instruction, setInstruction] = useState(
    'Determine whether Phoenix should migrate from Firebase to PostgreSQL. Use the team.'
  );
  const [selectedLeadId, setSelectedLeadId] = useState('agent-sarah');
  const [selectedProjectId, setSelectedProjectId] = useState('proj-phoenix');

  const getAgent = (id?: string) => {
    if (!id) return undefined;
    return agents.find((a) => a.id === id);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isExecuting) return;
    await onTriggerTask(instruction, selectedLeadId, selectedProjectId);
  };

  // Find the currently displayed task (activeTask or latest task)
  const displayTask = activeTask || tasks[tasks.length - 1];
  const taskEvents = displayTask ? events.filter((e) => e.taskId === displayTask.id) : events;
  const leadAgent = displayTask ? getAgent(displayTask.leadAgentId) : undefined;

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-[#F0F0F0] tracking-tight">Multi-Agent Task Orchestrator</h2>
            <p className="text-xs text-[#888]">
              Lead Agent Ownership • Shared Task Blackboard • Disagreement Synthesis • Reusable Artifacts
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isExecuting ? 'bg-[#C5A358] animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="text-[#BBB] font-mono text-[11px]">
              {isExecuting ? 'Orchestration Active' : 'Engine Idle'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Launch Multi-Agent Task Form */}
        <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A358]" />
              Dispatch Collaborative Multi-Agent Mission
            </span>
            <span className="text-[10px] text-[#555] font-mono">Max Delegation Depth: 3 (Enforced)</span>
          </div>

          <form onSubmit={handleStart} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#CCC] mb-1">
                Mission Objective / Instruction for Lead Agent
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={isExecuting}
                rows={2}
                className="w-full p-3 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] placeholder-[#555] focus:outline-none focus:border-[#C5A358] disabled:opacity-50"
                placeholder="Describe the multi-agent task..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1">Single Lead Agent (Section 42)</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  disabled={isExecuting}
                  className="w-full py-2 px-3 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#0A0A0A] text-[#E0E0E0]">
                      {a.displayName} ({a.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#777] mb-1">Target Project Scope</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isExecuting}
                  className="w-full py-2 px-3 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#E0E0E0] focus:outline-none focus:border-[#C5A358]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#0A0A0A] text-[#E0E0E0]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isExecuting || !instruction.trim()}
                  className="w-full py-2.5 px-4 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center justify-center gap-2 shadow transition disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-black" />
                  <span>{isExecuting ? 'Coordinating...' : 'Execute Multi-Agent Task'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Display Task Structure & Shared Blackboard */}
        {displayTask ? (
          <div className="space-y-6">
            {/* Mission Overview & Delegation Hierarchy */}
            <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-[#C5A358]" />
                  <h3 className="text-base font-serif italic text-[#F0F0F0]">{displayTask.title}</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono capitalize">
                    {displayTask.status}
                  </span>
                </div>
                <span className="text-[10px] text-[#666] font-mono">
                  Started: {new Date(displayTask.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Delegation Tree Visualizer (Section 57) */}
              <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-3">
                <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-[#C5A358]" />
                  Hierarchical Delegation Tree
                </span>

                <div className="space-y-2 text-xs">
                  {/* Lead Agent Root */}
                  {leadAgent && (
                    <div className="flex items-center gap-3 p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A]">
                      <img
                        src={leadAgent.avatarUrl}
                        alt={leadAgent.displayName}
                        className="w-8 h-8 rounded object-cover border border-[#222]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#F0F0F0]">{leadAgent.displayName}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono font-bold">
                            LEAD AGENT OWNER
                          </span>
                        </div>
                        <p className="text-[11px] text-[#777]">
                          Responsible for planning, specialist dispatch, disagreement synthesis, and final deliverable.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subtask Children */}
                  <div className="pl-6 border-l-2 border-[#1A1A1A] ml-4 space-y-2">
                    {displayTask.subtasks.map((st) => {
                      const spec = getAgent(st.assignedAgentId);
                      return (
                        <div
                          key={st.id}
                          className="p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={spec?.avatarUrl}
                              alt={spec?.displayName}
                              className="w-7 h-7 rounded object-cover border border-[#222]"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-[#F0F0F0]">{spec?.displayName}</span>
                                <span className="text-[10px] text-[#777]">({spec?.jobTitle})</span>
                              </div>
                              <p className="text-[11px] text-[#AAA] line-clamp-1">{st.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded capitalize font-mono ${
                                st.status === 'completed'
                                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                                  : 'bg-[#C5A358]/10 text-[#C5A358] border border-[#C5A358]/30'
                              }`}
                            >
                              {st.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SHARED TASK BLACKBOARD (Section 44) */}
            <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
                  <Layers className="w-3.5 h-3.5 text-[#C5A358]" />
                  <span>SHARED TASK BLACKBOARD (State Object)</span>
                </div>
                <span className="text-[10px] text-[#555] font-mono">
                  {displayTask.workspace.contributors.length} Contributing Agents
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Findings on Blackboard */}
                <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2.5">
                  <span className="text-xs font-semibold text-[#CCC] block">Agent Specialist Findings</span>
                  <div className="space-y-2">
                    {displayTask.workspace.findings.map((f, i) => {
                      const agent = getAgent(f.agentId);
                      return (
                        <div key={i} className="p-2.5 rounded bg-[#0A0A0A] border border-[#1A1A1A] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#F0F0F0]">{agent?.displayName || f.agentId}:</span>
                            <span className="text-[10px] text-[#666] font-mono">
                              Confidence: {Math.round(f.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-[#AAA] leading-relaxed">{f.finding}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assumptions & Decisions on Blackboard */}
                <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#CCC] block mb-2">Team Assumptions</span>
                    <ul className="space-y-1 text-xs text-[#888]">
                      {displayTask.workspace.assumptions.map((ass, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#C5A358] mt-0.5">•</span>
                          <span>{ass}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[#CCC] block mb-2">Blackboard Decisions</span>
                    {displayTask.workspace.decisions.map((dec) => (
                      <div key={dec.id} className="p-2.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-xs space-y-1">
                        <span className="font-semibold text-[#C5A358] block">{dec.decision}</span>
                        <p className="text-[11px] text-[#E0E0E0]">{dec.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPOSED AGENT DISAGREEMENT & SYNTHESIS (Section 46) */}
            {displayTask.disagreements && displayTask.disagreements.length > 0 && (
              <div className="p-5 rounded border border-[#C5A358]/30 bg-[#0A0A0A] space-y-4">
                <div className="flex items-center gap-2 text-[#C5A358] text-[10px] font-semibold uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#C5A358]" />
                  <span>Agent Disagreement & Lead Synthesis (Section 46)</span>
                </div>

                {displayTask.disagreements.map((dis, i) => (
                  <div key={i} className="space-y-3 text-xs">
                    <h4 className="font-semibold text-[#F0F0F0] font-serif">Topic: {dis.topic}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A]">
                        <span className="text-[#777] font-medium block mb-1">Perspective A (Marcus):</span>
                        <p className="text-[#CCC]">{dis.agentA.position}</p>
                      </div>
                      <div className="p-3 rounded bg-[#070707] border border-[#1A1A1A]">
                        <span className="text-[#777] font-medium block mb-1">Perspective B (Daniel):</span>
                        <p className="text-[#CCC]">{dis.agentB.position}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded bg-[#070707] border border-[#C5A358]/40 space-y-1">
                      <span className="text-[#C5A358] font-semibold block font-mono text-[11px]">
                        Sarah (Lead Agent Synthesis):
                      </span>
                      <p className="text-[#F0F0F0] leading-relaxed italic">{dis.synthesis}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REUSABLE ARTIFACTS PRODUCED (Section 45) */}
            {displayTask.workspace.artifacts.length > 0 && (
              <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#C5A358]" />
                    Generated Artifacts ({displayTask.workspace.artifacts.length})
                  </span>
                  <span className="text-[10px] text-[#555] uppercase tracking-wider">Attached to Task & Project</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {displayTask.workspace.artifacts.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => onOpenArtifact(art)}
                      className="p-3 rounded bg-[#070707] border border-[#1A1A1A] hover:border-[#C5A358]/40 transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <FileText className="w-4 h-4 text-[#C5A358]" />
                        <span className="text-[9px] font-mono uppercase text-[#666]">{art.type}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#F0F0F0] mt-2 group-hover:text-[#C5A358] transition line-clamp-2">
                        {art.title}
                      </h4>
                      <p className="text-[10px] font-mono text-[#666] mt-1">{art.filename}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVENT STREAM (Section 53) */}
            <div className="p-5 rounded border border-[#1A1A1A] bg-[#0A0A0A] space-y-3">
              <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C5A358]" />
                Live Event Stream
              </span>

              <div className="max-h-60 overflow-y-auto divide-y divide-[#1A1A1A] font-mono text-[11px]">
                {taskEvents.map((evt) => (
                  <div key={evt.id} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[#555]">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      <span className="text-[#C5A358] font-semibold">[{evt.eventType}]</span>
                      <span className="text-[#BBB]">
                        {evt.payload.action || evt.payload.strategy || evt.payload.title || evt.payload.summary || JSON.stringify(evt.payload)}
                      </span>
                    </div>
                    {evt.agentId && (
                      <span className="text-[#666] text-[10px]">By: {getAgent(evt.agentId)?.firstName || evt.agentId}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-[#666] text-xs">
            No active collaborative task. Dispatch one above to observe multi-agent orchestration.
          </div>
        )}
      </div>
    </div>
  );
};
