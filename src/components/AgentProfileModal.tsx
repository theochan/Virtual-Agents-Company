import React, { useState, useEffect } from 'react';
import { Agent, MemoryItem, LLMConfig, Tool, ToolPermission } from '../types';
import { X, Sliders, Brain, Users, Cpu, Shield, Sparkles, MessageSquare, Check, Zap, Wrench, Plus, Network, GitBranch } from 'lucide-react';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';

interface AgentProfileModalProps {
  agent: Agent | null;
  onClose: () => void;
  memories: MemoryItem[];
  onUpdateLLMConfig?: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  tools?: Tool[];
  onUpdateAgentTools?: (agentId: string, newTools: string[]) => void;
  onAddTool?: (newTool: Tool) => void;
  allAgents?: Agent[];
  onUpdateReportingLine?: (agentId: string, newReportsToId: string | undefined) => void;
}

export const AgentProfileModal: React.FC<AgentProfileModalProps> = ({
  agent,
  onClose,
  memories,
  onUpdateLLMConfig,
  tools = [],
  onUpdateAgentTools,
  onAddTool,
  allAgents = [],
  onUpdateReportingLine
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(agent?.llmConfig?.model || 'gemini-3.8-flash');
  const [temperature, setTemperature] = useState<number>(agent?.llmConfig?.temperature ?? 0.2);
  const [maxTokens, setMaxTokens] = useState<number>(agent?.llmConfig?.maxTokens || 4096);
  const [isSaved, setIsSaved] = useState(false);
  const [toolSavedFeedback, setToolSavedFeedback] = useState<string | null>(null);
  const [hierarchyFeedback, setHierarchyFeedback] = useState<string | null>(null);

  // New Tool creation state
  const [isAddingCustomTool, setIsAddingCustomTool] = useState(false);
  const [customToolName, setCustomToolName] = useState('');
  const [customToolDesc, setCustomToolDesc] = useState('');
  const [customToolCategory, setCustomToolCategory] = useState<Tool['category']>('Engineering');
  const [customToolPermission, setCustomToolPermission] = useState<ToolPermission>('READ');
  const [customToolApproval, setCustomToolApproval] = useState(false);

  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.llmConfig?.model || 'gemini-3.8-flash');
      setTemperature(agent.llmConfig?.temperature ?? 0.2);
      setMaxTokens(agent.llmConfig?.maxTokens || 4096);
      setIsSaved(false);
    }
  }, [agent]);

  if (!agent) return null;

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    const details = getModelDetails(modelId);
    const newTokens = details.maxTokens;
    setMaxTokens(newTokens);
    if (onUpdateLLMConfig) {
      onUpdateLLMConfig(agent.id, {
        model: modelId,
        maxTokens: newTokens
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleTemperatureChange = (val: number) => {
    setTemperature(val);
    if (onUpdateLLMConfig) {
      onUpdateLLMConfig(agent.id, {
        temperature: val
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleTokensChange = (val: number) => {
    setMaxTokens(val);
    if (onUpdateLLMConfig) {
      onUpdateLLMConfig(agent.id, {
        maxTokens: val
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const currentModelDetails = getModelDetails(selectedModel);

  // Filter agent-specific memory (Layer 2)
  const agentMemories = memories.filter((m) => m.scope === 'agent' && m.agentId === agent.id);

  // Agent tools list
  const currentAgentTools = agent.tools || agent.toolIds || [];

  const handleToggleTool = (toolId: string) => {
    const isEquipped = currentAgentTools.includes(toolId);
    const updated = isEquipped
      ? currentAgentTools.filter((t) => t !== toolId)
      : [...currentAgentTools, toolId];

    if (onUpdateAgentTools) {
      onUpdateAgentTools(agent.id, updated);
      setToolSavedFeedback(isEquipped ? 'Tool unequipped' : 'Tool equipped');
      setTimeout(() => setToolSavedFeedback(null), 2000);
    }
  };

  const handleCreateAndEquipTool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customToolName.trim()) return;

    const slug = customToolName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const newToolId = `tool-${slug || Date.now()}`;

    const newTool: Tool = {
      id: newToolId,
      name: customToolName.trim(),
      description: customToolDesc.trim() || 'Custom agent tool capability.',
      category: customToolCategory,
      permission: customToolPermission,
      requiresApproval: customToolApproval,
      schema: { query: 'string' }
    };

    if (onAddTool) {
      onAddTool(newTool);
    }

    if (onUpdateAgentTools) {
      onUpdateAgentTools(agent.id, [...currentAgentTools, newToolId]);
    }

    setCustomToolName('');
    setCustomToolDesc('');
    setIsAddingCustomTool(false);
    setToolSavedFeedback('New tool created & equipped');
    setTimeout(() => setToolSavedFeedback(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[90vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <img
              src={agent.avatarUrl}
              alt={agent.displayName}
              className="w-12 h-12 rounded object-cover border border-[#222] shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-serif italic text-[#F0F0F0]">{agent.displayName}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                  Level {agent.autonomyLevel} Autonomy
                </span>
              </div>
              <p className="text-xs text-[#888]">{agent.jobTitle} • {agent.department} ({agent.seniority})</p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Mission & Background */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A358] flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              <span>Mission & Responsibility</span>
            </h4>
            <p className="text-xs text-[#CCC] leading-relaxed bg-[#070707] p-3.5 rounded border border-[#1A1A1A]">
              {agent.primaryResponsibility}
            </p>
          </div>

          {/* Organizational Hierarchy & Governance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A358] flex items-center gap-2">
                <Network className="w-3.5 h-3.5" />
                <span>Organizational Hierarchy & Reporting Line</span>
              </h4>
              {hierarchyFeedback && (
                <span className="text-[10px] text-emerald-400 font-mono animate-fadeIn">
                  {hierarchyFeedback}
                </span>
              )}
            </div>

            <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#777] uppercase tracking-wider mb-1">
                    Direct Supervisor / Manager
                  </label>
                  <select
                    value={agent.reportsTo || 'none'}
                    onChange={(e) => {
                      const newReportsTo = e.target.value === 'none' ? undefined : e.target.value;
                      if (onUpdateReportingLine) {
                        onUpdateReportingLine(agent.id, newReportsTo);
                        setHierarchyFeedback('Reporting line updated');
                        setTimeout(() => setHierarchyFeedback(null), 2500);
                      }
                    }}
                    className="w-full bg-[#111] text-[#E0E0E0] border border-[#222] focus:border-[#C5A358] rounded p-2 text-xs focus:outline-none"
                  >
                    <option value="none">None (Top Executive / Independent)</option>
                    {allAgents
                      .filter((a) => a.id !== agent.id)
                      .map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.displayName} — {mgr.jobTitle} ({mgr.department})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#777] uppercase tracking-wider mb-1">
                    Departmental Role
                  </label>
                  <div className="flex items-center gap-2 p-2 rounded bg-[#111] border border-[#222] text-[#AAA]">
                    <span className="font-medium text-[#E0E0E0]">
                      {agent.departmentRole === 'lead' ? 'Department Lead / Principal' : 'Team Contributor'}
                    </span>
                    <span className="text-[10px] text-[#666]">({agent.department})</span>
                  </div>
                </div>
              </div>

              {/* Direct Reports Preview */}
              {allAgents.filter((a) => a.reportsTo === agent.id).length > 0 && (
                <div className="pt-2 border-t border-[#141414]">
                  <span className="text-[10px] text-[#777] uppercase tracking-wider block mb-1.5">
                    Direct Reports ({allAgents.filter((a) => a.reportsTo === agent.id).length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {allAgents
                      .filter((a) => a.reportsTo === agent.id)
                      .map((sub) => (
                        <span
                          key={sub.id}
                          className="px-2 py-1 rounded bg-[#121212] border border-[#222] text-[11px] text-[#CCC] flex items-center gap-1.5"
                        >
                          <img src={sub.avatarUrl} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                          <span>{sub.displayName}</span>
                          <span className="text-[9px] text-[#666]">({sub.jobTitle})</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Layer 2 Memory: Agent Private Memory Scope */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A358] flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                <span>Agent Private Memory (Scope: Agent Layer)</span>
              </h4>
              <span className="text-[10px] text-[#777] font-mono">{agentMemories.length} entries</span>
            </div>

            {agentMemories.length === 0 ? (
              <div className="p-3.5 rounded bg-[#070707] border border-[#1A1A1A] text-xs text-[#666] italic">
                No personal reflections or specific episodic memories indexed yet for {agent.displayName}.
              </div>
            ) : (
              <div className="space-y-2">
                {agentMemories.map((m) => (
                  <div key={m.id} className="p-3 rounded bg-[#070707] border border-[#1A1A1A] space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-[#E0E0E0]">{m.summary}</span>
                      <span className="text-[#C5A358] font-mono">Imp: {m.importance}/10</span>
                    </div>
                    <p className="text-xs text-[#888]">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Behavioral Traits & Communication Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
              <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                Temperament & Style
              </span>
              <p className="text-xs text-[#AAA] font-medium">{agent.temperament}</p>
              <p className="text-xs text-[#777] leading-relaxed">{agent.personalityDescription}</p>
            </div>

            <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
              <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                Communication Pattern
              </span>
              <p className="text-xs text-[#AAA] font-medium">{agent.communicationMode || 'Conclusion first'}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#111] text-[#999] border border-[#222]">
                  Verbosity: {agent.communicationStyle?.verbosity || 'balanced'}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#111] text-[#999] border border-[#222]">
                  Jargon: {agent.communicationStyle?.jargonLevel || 'moderate'}
                </span>
                {agent.communicationStyle?.challengesUserDecisions && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40">
                    Challenges Decisions
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Model & Runtime Settings */}
          <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#C5A358]" />
                <span className="text-xs font-semibold text-[#F0F0F0]">Dedicated LLM Architecture</span>
              </div>
              {isSaved && (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#777] mb-1.5">Select Primary Model</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUPPORTED_MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleModelChange(m.id)}
                      className={`p-2 rounded border text-left cursor-pointer transition ${
                        selectedModel === m.id
                          ? 'bg-[#C5A358]/15 border-[#C5A358] text-[#F0F0F0]'
                          : 'bg-[#050505] border-[#181818] text-[#888] hover:text-[#CCC]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium block truncate">{m.name}</span>
                        {selectedModel === m.id && <Check className="w-3 h-3 text-[#C5A358]" />}
                      </div>
                      <span className="text-[9px] text-[#666] block">{m.provider}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Temperature & Token Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#141414]">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#777]">Sampling Temperature</span>
                    <span className="text-[#C5A358] font-mono">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                    className="w-full accent-[#C5A358] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] font-mono">
                    <span>Deterministic</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-[#777]">Max Output Tokens</span>
                    <span className="text-[#C5A358] font-mono">{maxTokens}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[1024, 2048, 4096, 8192].map((tok) => (
                      <button
                        key={tok}
                        onClick={() => handleTokensChange(tok)}
                        className={`py-1 rounded border text-[10px] font-mono cursor-pointer transition ${
                          maxTokens === tok
                            ? 'bg-[#C5A358]/15 border-[#C5A358] text-[#C5A358] font-semibold'
                            : 'bg-[#080808] border-[#222] text-[#777] hover:text-[#CCC]'
                        }`}
                      >
                        {tok}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-[#555] block pt-0.5">Defines maximum response payload length</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Enterprise Tools with Interactive Equipping */}
          <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#C5A358]" />
                <span className="text-xs font-semibold text-[#F0F0F0]">
                  Equipped Tools ({currentAgentTools.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {toolSavedFeedback && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Check className="w-3 h-3" /> {toolSavedFeedback}
                  </span>
                )}
                <button
                  onClick={() => setIsAddingCustomTool(!isAddingCustomTool)}
                  className="flex items-center gap-1 py-1 px-2.5 rounded bg-[#111] hover:bg-[#1A1A1A] text-[#C5A358] text-[11px] font-medium border border-[#C5A358]/30 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Tool</span>
                </button>
              </div>
            </div>

            {/* Custom Tool Creator Drawer */}
            {isAddingCustomTool && (
              <form onSubmit={handleCreateAndEquipTool} className="p-3.5 rounded border border-[#C5A358]/40 bg-[#0C0C0C] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-1.5">
                  <span className="text-xs font-semibold text-[#F0F0F0]">Create & Equip New Tool</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomTool(false)}
                    className="text-xs text-[#777] hover:text-[#CCC]"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Tool Name (e.g. Jira Sync, Vector Memory Indexer)"
                    value={customToolName}
                    onChange={(e) => setCustomToolName(e.target.value)}
                    className="p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                  />
                  <select
                    value={customToolCategory}
                    onChange={(e) => setCustomToolCategory(e.target.value as any)}
                    className="p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                  >
                    <option value="Research">Research</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Communication">Communication</option>
                    <option value="Productivity">Productivity</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Tool Description..."
                  value={customToolDesc}
                  onChange={(e) => setCustomToolDesc(e.target.value)}
                  className="w-full p-2 rounded border border-[#222] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                />

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-[#AAA] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customToolApproval}
                      onChange={(e) => setCustomToolApproval(e.target.checked)}
                      className="rounded accent-[#C5A358]"
                    />
                    <span>Requires Human Approval</span>
                  </label>

                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
                  >
                    Create & Equip
                  </button>
                </div>
              </form>
            )}

            {/* List of all tools with toggle badges */}
            <div className="space-y-2">
              <span className="text-[10px] text-[#777] uppercase tracking-wider block">
                Click any tool to equip or unequip for {agent.displayName}:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tools.map((t) => {
                  const isEquipped = currentAgentTools.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleToggleTool(t.id)}
                      className={`p-2.5 rounded border text-left cursor-pointer transition flex items-start justify-between gap-2 ${
                        isEquipped
                          ? 'bg-[#C5A358]/10 border-[#C5A358]/50 text-[#F0F0F0]'
                          : 'bg-[#050505] border-[#181818] text-[#777] hover:border-[#282828] hover:text-[#BBB]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium ${isEquipped ? 'text-[#C5A358]' : 'text-[#DDD]'}`}>
                            {t.name}
                          </span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#111] text-[#666] border border-[#222]">
                            {t.permission}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#666] line-clamp-1">{t.description}</p>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isEquipped ? (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-[#C5A358] font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Equipped
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#555] hover:text-[#AAA]">
                            + Equip
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
