import React, { useState, useEffect } from 'react';
import { Agent, MemoryItem, LLMConfig, Tool, ToolPermission } from '../types';
import {
  X,
  Sliders,
  Brain,
  Users,
  Cpu,
  Shield,
  Sparkles,
  MessageSquare,
  Check,
  Zap,
  Wrench,
  Plus,
  Network,
  GitBranch,
  Camera,
  Wand2,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Trash2,
  Search,
  Terminal,
  Filter,
  Bell
} from 'lucide-react';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';
import { getSlotFallbackAvatar, handleAvatarError } from '../lib/avatarCatalog';
import { StockPortraitPicker } from './StockPortraitPicker';

type ProfileTab = 'tools' | 'avatar' | 'notifications' | 'memory';

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
  onUpdateAvatar?: (agentId: string, newAvatarUrl: string) => void;
  onDeleteAgent?: (agentId: string) => void;
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
  onUpdateReportingLine,
  onUpdateAvatar,
  onDeleteAgent
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('tools');

  const [selectedModel, setSelectedModel] = useState<string>(agent?.llmConfig?.model || 'claude-3-5-sonnet');
  const [temperature, setTemperature] = useState<number>(agent?.llmConfig?.temperature ?? 0.2);
  const [maxTokens, setMaxTokens] = useState<number>(agent?.llmConfig?.maxTokens || 4096);
  const [isSaved, setIsSaved] = useState(false);
  const [toolSavedFeedback, setToolSavedFeedback] = useState<string | null>(null);
  const [hierarchyFeedback, setHierarchyFeedback] = useState<string | null>(null);

  // Avatar Studio State
  const [currentAvatar, setCurrentAvatar] = useState<string>(
    agent?.avatarUrl || getSlotFallbackAvatar(agent?.gender, agent?.avatarStyle, 0)
  );
  // New Tool creation state
  const [isAddingCustomTool, setIsAddingCustomTool] = useState(false);
  const [customToolName, setCustomToolName] = useState('');
  const [customToolDesc, setCustomToolDesc] = useState('');
  const [customToolCategory, setCustomToolCategory] = useState<Tool['category']>('Engineering');
  const [customToolPermission, setCustomToolPermission] = useState<ToolPermission>('READ');
  const [customToolApproval, setCustomToolApproval] = useState(false);

  // Skill Filtering & Search State
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedToolCategory, setSelectedToolCategory] = useState<string>('Engineering');

  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.llmConfig?.model || 'claude-3-5-sonnet');
      setTemperature(agent.llmConfig?.temperature ?? 0.2);
      setMaxTokens(agent.llmConfig?.maxTokens || 4096);
      setIsSaved(false);

      setCurrentAvatar(agent.avatarUrl || getSlotFallbackAvatar(agent.gender));
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

    const newTool: Tool = {
      id: `tool-${slug}-${Date.now().toString().slice(-4)}`,
      name: customToolName.trim(),
      description: customToolDesc.trim() || `Custom tool created for ${agent.displayName}`,
      category: customToolCategory,
      permission: customToolPermission,
      requiresApproval: customToolApproval,
      schema: {}
    };

    if (onAddTool) {
      onAddTool(newTool);
    }

    const updated = [...currentAgentTools, newTool.id];
    if (onUpdateAgentTools) {
      onUpdateAgentTools(agent.id, updated);
      setToolSavedFeedback(`Created & equipped "${newTool.name}"`);
      setTimeout(() => setToolSavedFeedback(null), 2500);
    }

    setCustomToolName('');
    setCustomToolDesc('');
    setIsAddingCustomTool(false);
  };

  // Filter tools for the Tools & Skills tab
  const filteredTools = tools.filter((t) => {
    if (selectedToolCategory !== 'All') {
      const cat = (t.category || '').toLowerCase();
      if (selectedToolCategory === 'Engineering') {
        if (!cat.includes('engineering') && !cat.includes('architecture') && !cat.includes('tech')) return false;
      } else if (selectedToolCategory === 'Finance') {
        if (!cat.includes('finance') && !cat.includes('commercial')) return false;
      } else if (selectedToolCategory === 'Strategy') {
        if (!cat.includes('strategy') && !cat.includes('executive')) return false;
      } else if (selectedToolCategory === 'Marketing') {
        if (!cat.includes('marketing') && !cat.includes('growth')) return false;
      }
    }

    if (toolSearchQuery.trim()) {
      const q = toolSearchQuery.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      const matchScript = t.scripts && t.scripts.some((s) => s.toLowerCase().includes(q));
      return matchName || matchDesc || matchCat || matchScript;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl xl:max-w-6xl rounded-3xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] text-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">
              AI Agent Profile and Customization
            </h3>
            {toolSavedFeedback && (
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-fadeIn">
                {toolSavedFeedback}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Balanced Modal Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="w-full md:w-80 shrink-0 p-5 border-r border-slate-200 overflow-y-auto">
            <h4 className="text-base font-semibold text-slate-900">{agent.displayName}</h4>
            <p className="mb-4 text-xs text-slate-600">{agent.jobTitle}</p>
            <StockPortraitPicker gender={agent.gender || 'female'} value={currentAvatar} onChange={(url) => {
              setCurrentAvatar(url);
              onUpdateAvatar?.(agent.id, url);
            }} />
          </div>

          {/* RIGHT COLUMN: Tabs, Category Filters, Equipped Skills, Skills Grid */}
          <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
            {/* Top Underline Tabs */}
            <div className="px-6 pt-4 border-b border-slate-200 flex items-center gap-6 shrink-0 text-xs">
              <button
                onClick={() => setActiveTab('avatar')}
                className={`pb-3 font-medium transition cursor-pointer relative ${
                  activeTab === 'avatar'
                    ? 'text-slate-900 font-semibold border-b-2 border-[#c59b4b]'
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                Avatar Profile
              </button>

              <button
                onClick={() => setActiveTab('tools')}
                className={`pb-3 font-medium transition cursor-pointer relative ${
                  activeTab === 'tools'
                    ? 'text-slate-900 font-semibold border-b-2 border-[#c59b4b]'
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                Tools &amp; Skills
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`pb-3 font-medium transition cursor-pointer relative ${
                  activeTab === 'notifications'
                    ? 'text-slate-900 font-semibold border-b-2 border-[#c59b4b]'
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                Notifications &amp; LLM
              </button>

              <button
                onClick={() => setActiveTab('memory')}
                className={`pb-3 font-medium transition cursor-pointer relative ${
                  activeTab === 'memory'
                    ? 'text-slate-900 font-semibold border-b-2 border-[#c59b4b]'
                    : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent'
                }`}
              >
                Private Memory ({agentMemories.length})
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {/* TAB 1: TOOLS & SKILLS (Matching Wireframe) */}
              {activeTab === 'tools' && (
                <div className="space-y-4.5">
                  {/* Category Filter & Live Search Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 block">Category</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['Engineering', 'Finance', 'Strategy', 'Marketing', 'All'].map((cat) => {
                          const isSelected = selectedToolCategory === cat;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setSelectedToolCategory(cat)}
                              className={`px-3.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs font-semibold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
                              }`}
                            >
                              {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Search Input */}
                    <div className="relative w-full sm:w-56 self-end">
                      <input
                        type="text"
                        placeholder="Live search"
                        value={toolSearchQuery}
                        onChange={(e) => setToolSearchQuery(e.target.value)}
                        className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#c59b4b] shadow-2xs"
                      />
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Equipped Skills Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">Equipped Skills</label>
                      {currentAgentTools.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onUpdateAgentTools && onUpdateAgentTools(agent.id, [])}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 min-h-8">
                      {currentAgentTools.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">
                          No skills currently equipped. Toggle any skill switch below to equip.
                        </span>
                      ) : (
                        currentAgentTools.map((toolId) => {
                          const toolObj = tools.find((t) => t.id === toolId);
                          const name = toolObj?.name || toolId;
                          return (
                            <span
                              key={toolId}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs"
                            >
                              <span className="truncate max-w-[160px] font-medium">{name}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleTool(toolId)}
                                className="text-slate-400 hover:text-slate-700 text-sm font-semibold cursor-pointer leading-none"
                                title="Unequip"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Skills Grid matching Wireframe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredTools.length === 0 ? (
                      <div className="col-span-full p-8 text-center rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                        <p className="text-xs text-slate-700 font-medium">No tools found matching your search</p>
                        <p className="text-[10px] text-slate-400">Try changing the category or clearing the search query</p>
                      </div>
                    ) : (
                      filteredTools.map((t) => {
                        const isEquipped = currentAgentTools.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between h-36 hover:border-slate-300 transition shadow-2xs"
                          >
                            <div className="space-y-1.5">
                              {/* Green CLI Script Badge */}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-medium">
                                <Terminal className="w-2.5 h-2.5 text-emerald-600" />
                                <span>CLI Script</span>
                              </span>

                              {/* Tool Title */}
                              <h5 className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2" title={t.name}>
                                {t.name}
                              </h5>
                            </div>

                            {/* Bottom Equip Toggle Switch */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-600 font-medium">Equip</span>
                              <button
                                type="button"
                                onClick={() => handleToggleTool(t.id)}
                                className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                                  isEquipped ? 'bg-[#c59b4b]' : 'bg-slate-200'
                                }`}
                                title={isEquipped ? 'Click to unequip' : 'Click to equip'}
                              >
                                <span
                                  className={`inline-block w-4.5 h-4.5 bg-white rounded-full shadow-xs transform transition-transform ${
                                    isEquipped ? 'translate-x-4.5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AVATAR PROFILE */}
              {activeTab === 'avatar' && (
                <div className="space-y-5">
                  {/* Mission & Responsibilities */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-amber-600" />
                      <span>Executive Role &amp; Mission</span>
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                      {agent.primaryResponsibility}
                    </p>
                  </div>

                  {/* Secondary Responsibilities & Domain Expertise */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-widest block">
                        Secondary Responsibilities
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(agent.secondaryResponsibilities || []).map((r, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <span className="text-[10px] font-semibold text-amber-900 uppercase tracking-widest block">
                        Domain Expertise
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(agent.expertise || agent.skills || []).map((e, i) => (
                          <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-amber-50 border border-amber-300 text-amber-900 font-medium shadow-2xs">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {/* TAB 3: NOTIFICATIONS & LLM */}
              {activeTab === 'notifications' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-900">Dedicated LLM Architecture</span>
                    </div>
                    {isSaved && (
                      <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-semibold">
                        <Check className="w-3 h-3 text-emerald-600" /> Configuration Saved
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-slate-700 mb-1.5 font-medium">Select Primary Model</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SUPPORTED_MODELS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => handleModelChange(m.id)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                              selectedModel === m.id
                                ? 'bg-amber-50 border-amber-300 text-slate-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold block truncate">{m.name}</span>
                              {selectedModel === m.id && <Check className="w-3.5 h-3.5 text-amber-700" />}
                            </div>
                            <span className="text-[9px] text-slate-500 block">{m.provider}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sampling & Max Tokens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-600 font-medium">Sampling Temperature</span>
                          <span className="text-amber-800 font-mono font-semibold">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={temperature}
                          onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>Deterministic</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-600 font-medium">Max Output Tokens</span>
                          <span className="text-amber-800 font-mono font-semibold">{maxTokens}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1024, 2048, 4096, 8192].map((tok) => (
                            <button
                              key={tok}
                              onClick={() => handleTokensChange(tok)}
                              className={`py-1 rounded-lg border text-[10px] font-mono cursor-pointer transition ${
                                maxTokens === tok
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
                              }`}
                            >
                              {tok}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRIVATE MEMORY */}
              {activeTab === 'memory' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-amber-600" />
                      <span>Agent Private Memory (Scope: Agent Layer)</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">{agentMemories.length} entries</span>
                  </div>

                  {agentMemories.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic shadow-2xs">
                      No personal reflections or specific episodic memories indexed yet for {agent.displayName}.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agentMemories.map((m) => (
                        <div key={m.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-slate-900">{m.summary}</span>
                            <span className="text-amber-800 font-mono font-medium">Imp: {m.importance}/10</span>
                          </div>
                          <p className="text-xs text-slate-600">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {onDeleteAgent && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to delete ${agent.displayName}?`)) {
                    onDeleteAgent(agent.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Agent</span>
              </button>
            )}


          </div>

          <div className="flex items-center gap-2">


            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
