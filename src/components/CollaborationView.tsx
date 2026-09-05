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
  const [instruction, setInstruction] = useState('');
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
    <div className="flex-1 flex flex-col h-screen bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-slate-900 tracking-tight">Multi-Agent Task Orchestrator</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Lead Agent Ownership • Shared Task Blackboard • Disagreement Synthesis • Reusable Artifacts
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isExecuting ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span className="text-slate-700 font-mono text-[11px] font-medium">
              {isExecuting ? 'Orchestration Active' : 'Engine Idle'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Launch Multi-Agent Task Form */}
        <div className="p-6 rounded-2xl border border-slate-200/90 bg-white space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Dispatch Collaborative Multi-Agent Mission
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Max Delegation Depth: 3 (Enforced)</span>
          </div>

          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mission Objective / Instruction for Lead Agent
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                disabled={isExecuting}
                rows={2}
                className="w-full p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500/30 transition disabled:opacity-50"
                placeholder="e.g. Evaluate migration strategy, conduct market and security benchmarks, and formulate a phased rollout recommendation..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-1.5">Single Lead Agent</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  disabled={isExecuting}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id} className="bg-white text-slate-900">
                      {a.displayName} ({a.jobTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-1.5">Target Project Scope</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={isExecuting}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50/70 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-white text-slate-900">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isExecuting || !instruction.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-amber-400" />
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
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-base font-serif italic font-semibold text-slate-900">{displayTask.title}</h3>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 font-mono font-semibold capitalize">
                    {displayTask.status}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Started: {new Date(displayTask.createdAt).toLocaleTimeString()}
                </span>
              </div>

              {/* Delegation Tree Visualizer */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-amber-600" />
                  Hierarchical Delegation Tree
                </span>

                <div className="space-y-2 text-xs">
                  {/* Lead Agent Root */}
                  {leadAgent && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                      <img
                        src={leadAgent.avatarUrl}
                        alt={leadAgent.displayName}
                        className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{leadAgent.displayName}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 font-mono font-bold">
                            LEAD AGENT OWNER
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Responsible for planning, specialist dispatch, disagreement synthesis, and final deliverable.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subtask Children */}
                  <div className="pl-6 border-l-2 border-slate-200 ml-4 space-y-2">
                    {displayTask.subtasks.map((st) => {
                      const spec = getAgent(st.assignedAgentId);
                      return (
                        <div
                          key={st.id}
                          className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={spec?.avatarUrl}
                              alt={spec?.displayName}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">{spec?.displayName}</span>
                                <span className="text-[10px] text-slate-500">({spec?.jobTitle})</span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-1">{st.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] px-2.5 py-0.5 rounded-full capitalize font-mono font-semibold ${
                                st.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-50 text-amber-900 border border-amber-300'
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

            {/* SHARED TASK BLACKBOARD */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800 text-[10px] font-semibold uppercase tracking-widest">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>SHARED TASK BLACKBOARD (State Object)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {displayTask.workspace.contributors.length} Contributing Agents
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Findings on Blackboard */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                  <span className="text-xs font-semibold text-slate-800 block">Agent Specialist Findings</span>
                  <div className="space-y-2">
                    {displayTask.workspace.findings.map((f, i) => {
                      const agent = getAgent(f.agentId);
                      return (
                        <div key={i} className="p-3 rounded-xl bg-white border border-slate-200/90 text-xs space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{agent?.displayName || f.agentId}:</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Confidence: {Math.round(f.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{f.finding}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assumptions & Decisions on Blackboard */}
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block mb-2">Team Assumptions</span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {displayTask.workspace.assumptions.map((ass, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">•</span>
                          <span>{ass}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-800 block mb-2">Blackboard Decisions</span>
                    {displayTask.workspace.decisions.map((dec) => (
                      <div key={dec.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs space-y-1 shadow-2xs">
                        <span className="font-semibold text-amber-900 block">{dec.decision}</span>
                        <p className="text-[11px] text-slate-700 leading-relaxed">{dec.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* EXPOSED AGENT DISAGREEMENT & SYNTHESIS */}
            {displayTask.disagreements && displayTask.disagreements.length > 0 && (
              <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-4 shadow-xs">
                <div className="flex items-center gap-2 text-amber-900 text-[10px] font-semibold uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Agent Disagreement & Lead Synthesis</span>
                </div>

                {displayTask.disagreements.map((dis, i) => (
                  <div key={i} className="space-y-3 text-xs">
                    <h4 className="font-semibold text-slate-900 font-serif italic text-sm">Topic: {dis.topic}</h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold block mb-1 text-[11px]">Perspective A (Marcus):</span>
                        <p className="text-slate-700 leading-relaxed">{dis.agentA.position}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 font-semibold block mb-1 text-[11px]">Perspective B (Daniel):</span>
                        <p className="text-slate-700 leading-relaxed">{dis.agentB.position}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-amber-300 shadow-2xs space-y-1.5">
                      <span className="text-amber-800 font-semibold block font-mono text-[11px]">
                        Sarah (Lead Agent Synthesis):
                      </span>
                      <p className="text-slate-900 leading-relaxed italic font-serif text-xs">{dis.synthesis}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REUSABLE ARTIFACTS PRODUCED */}
            {displayTask.workspace.artifacts.length > 0 && (
              <div className="p-6 rounded-2xl border border-slate-200/90 bg-white space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    Generated Artifacts ({displayTask.workspace.artifacts.length})
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Attached to Task & Project</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {displayTask.workspace.artifacts.map((art) => (
                    <div
                      key={art.id}
                      onClick={() => onOpenArtifact(art)}
                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 hover:border-amber-400 hover:bg-white transition cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-[9px] font-mono uppercase text-slate-400 font-semibold">{art.type}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 mt-2 group-hover:text-amber-800 transition line-clamp-2">
                        {art.title}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{art.filename}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* EVENT STREAM */}
            <div className="p-6 rounded-2xl border border-slate-200/90 bg-white space-y-3 shadow-xs">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Live Event Stream
              </span>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 font-mono text-[11px]">
                {taskEvents.map((evt) => (
                  <div key={evt.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-slate-400">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      <span className="text-amber-800 font-semibold">[{evt.eventType}]</span>
                      <span className="text-slate-700">
                        {evt.payload.action || evt.payload.strategy || evt.payload.title || evt.payload.summary || JSON.stringify(evt.payload)}
                      </span>
                    </div>
                    {evt.agentId && (
                      <span className="text-slate-400 text-[10px]">By: {getAgent(evt.agentId)?.firstName || evt.agentId}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400 text-xs font-serif italic bg-white rounded-2xl border border-slate-200 shadow-xs">
            No active collaborative task. Dispatch one above to observe multi-agent orchestration.
          </div>
        )}
      </div>
    </div>
  );
};
