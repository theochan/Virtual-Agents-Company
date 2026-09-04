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
  ArrowRight
} from 'lucide-react';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';
import {
  AVATAR_STYLES,
  AvatarStyle,
  buildAvatarPrompt,
  getCuratedAvatarSuite,
  DEFAULT_FALLBACK_AVATAR,
  handleAvatarError
} from '../lib/avatarCatalog';

type ProfileTab = 'overview' | 'avatar' | 'hierarchy' | 'tools' | 'llm' | 'memory';

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
  onUpdateAvatar
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const [selectedModel, setSelectedModel] = useState<string>(agent?.llmConfig?.model || 'gemini-3.8-flash');
  const [temperature, setTemperature] = useState<number>(agent?.llmConfig?.temperature ?? 0.2);
  const [maxTokens, setMaxTokens] = useState<number>(agent?.llmConfig?.maxTokens || 4096);
  const [isSaved, setIsSaved] = useState(false);
  const [toolSavedFeedback, setToolSavedFeedback] = useState<string | null>(null);
  const [hierarchyFeedback, setHierarchyFeedback] = useState<string | null>(null);

  // Avatar Studio State
  const [currentAvatar, setCurrentAvatar] = useState<string>(agent?.avatarUrl || DEFAULT_FALLBACK_AVATAR);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('creative');
  const [avatarPrompt, setAvatarPrompt] = useState<string>('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarSource, setAvatarSource] = useState<'gemini_ai_generated' | 'ai_curated_neural' | 'custom_url'>('ai_curated_neural');
  const [avatarModel, setAvatarModel] = useState('Neural Portrait Engine (Photorealistic)');
  const [avatarVariations, setAvatarVariations] = useState<Array<{ url: string; label: string; badge?: string }>>([]);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [avatarSaveSuccess, setAvatarSaveSuccess] = useState(false);

  // New Tool creation state
  const [isAddingCustomTool, setIsAddingCustomTool] = useState(false);
  const [customToolName, setCustomToolName] = useState('');
  const [customToolDesc, setCustomToolDesc] = useState('');
  const [customToolCategory, setCustomToolCategory] = useState<Tool['category']>('Engineering');
  const [customToolPermission, setCustomToolPermission] = useState<ToolPermission>('READ');
  const [customToolApproval, setCustomToolApproval] = useState(false);

  const getInitialStyle = (a: Agent): AvatarStyle => {
    if (a.department === 'Design') return 'creative';
    if (a.department === 'Engineering' || a.department === 'Architecture') return 'tech';
    if (a.department === 'Security') return 'cyber';
    if (a.department === 'Research') return 'research';
    return 'corporate';
  };

  useEffect(() => {
    if (agent) {
      setSelectedModel(agent.llmConfig?.model || 'gemini-3.8-flash');
      setTemperature(agent.llmConfig?.temperature ?? 0.2);
      setMaxTokens(agent.llmConfig?.maxTokens || 4096);
      setIsSaved(false);

      const style = getInitialStyle(agent);
      setAvatarStyle(style);
      setCurrentAvatar(agent.avatarUrl || DEFAULT_FALLBACK_AVATAR);
      setAvatarSaveSuccess(false);

      const computedPrompt = buildAvatarPrompt({
        firstName: agent.firstName || agent.displayName,
        lastName: agent.lastName || '',
        gender: agent.gender || 'female',
        age: agent.approxAge || 31,
        nationality: agent.nationality || 'American',
        jobTitle: agent.jobTitle || 'Specialist',
        department: agent.department || 'Operations',
        style
      });
      setAvatarPrompt(computedPrompt);

      const suite = getCuratedAvatarSuite(
        agent.gender || 'female',
        style,
        `${agent.displayName}-${agent.id}`
      );
      setAvatarVariations(
        suite.variations.map((v) => ({
          url: v.url,
          label: v.label,
          badge: v.style
        }))
      );
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

  // Avatar Studio Handlers
  const handleGenerateAvatar = async (targetStyle?: AvatarStyle, explicitPrompt?: string) => {
    setIsGeneratingAvatar(true);
    const chosenStyle = targetStyle || avatarStyle;
    const firstName = agent.firstName || agent.displayName || 'Specialist';
    const lastName = agent.lastName || '';
    const gender = agent.gender || 'female';
    const age = agent.approxAge || 31;
    const nationality = agent.nationality || 'American';
    const jobTitle = agent.jobTitle || 'Specialist';
    const department = agent.department || 'Operations';

    const computedPrompt = explicitPrompt !== undefined
      ? explicitPrompt
      : buildAvatarPrompt({
          firstName,
          lastName,
          gender,
          age,
          nationality,
          jobTitle,
          department,
          style: chosenStyle,
          customPrompt: avatarPrompt
        });

    setAvatarPrompt(computedPrompt);

    try {
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          gender,
          age,
          nationality,
          jobTitle,
          department,
          style: chosenStyle,
          customPrompt: computedPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          setCurrentAvatar(data.avatarUrl);
          setAvatarSource(data.source || 'gemini_ai_generated');
          setAvatarModel(data.model || 'Neural Portrait Engine');
          if (data.variations) {
            setAvatarVariations(data.variations);
          }
          if (data.promptUsed) {
            setAvatarPrompt(data.promptUsed);
          }
          setAvatarSaveSuccess(false);
        }
      } else {
        throw new Error('Avatar API response failed');
      }
    } catch (err) {
      console.warn('Avatar generation notice:', err);
      const fallback = getCuratedAvatarSuite(gender, chosenStyle, `${firstName}-${Date.now()}`);
      setCurrentAvatar(fallback.primary.url);
      setAvatarVariations(fallback.variations.map((v) => ({ url: v.url, label: v.label, badge: v.style })));
      setAvatarSource('ai_curated_neural');
      setAvatarModel('Neural Portrait Archetype (Photorealistic)');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSelectVariation = (url: string) => {
    setCurrentAvatar(url);
    setAvatarSource('ai_curated_neural');
    setAvatarSaveSuccess(false);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setCurrentAvatar(customUrlInput.trim());
      setAvatarSource('custom_url');
      setAvatarSaveSuccess(false);
    }
  };

  const handleSaveAvatar = () => {
    if (onUpdateAvatar && agent) {
      onUpdateAvatar(agent.id, currentAvatar);
      setAvatarSaveSuccess(true);
      setTimeout(() => setAvatarSaveSuccess(false), 3500);
    }
  };

  const hasUnsavedAvatar = currentAvatar !== agent.avatarUrl;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[92vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {/* Interactive Portrait Thumbnail */}
            <div
              className="relative group cursor-pointer"
              onClick={() => setActiveTab('avatar')}
              title="Click to open Avatar Studio & generate new portrait"
            >
              <img
                src={currentAvatar}
                alt={agent.displayName}
                referrerPolicy="no-referrer"
                onError={(e) => handleAvatarError(e)}
                className="w-13 h-13 rounded object-cover border border-[#222] shadow group-hover:border-[#C5A358] transition"
              />
              <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[#C5A358]">
                <Camera className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0E0E0E] border border-[#222] flex items-center justify-center text-[9px] text-[#C5A358]">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-serif italic text-[#F0F0F0]">{agent.displayName}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                  Level {agent.autonomyLevel} Autonomy
                </span>
                <button
                  onClick={() => setActiveTab('avatar')}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded border border-[#C5A358]/40 bg-[#C5A358]/10 hover:bg-[#C5A358]/20 text-[#C5A358] text-[11px] font-medium cursor-pointer transition shadow-xs"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Generate Avatar</span>
                </button>
              </div>
              <p className="text-xs text-[#888]">
                {agent.jobTitle} • {agent.department} ({agent.seniority})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center gap-1.5 overflow-x-auto shrink-0 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/40 shadow-sm'
                : 'text-[#888] hover:text-[#CCC] hover:bg-[#111]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Overview & Mission</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'avatar'
                ? 'bg-[#C5A358]/20 text-[#C5A358] border border-[#C5A358] font-semibold shadow-sm'
                : 'text-[#C5A358] bg-[#C5A358]/5 border border-[#C5A358]/30 hover:bg-[#C5A358]/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A358]" />
            <span>Avatar Studio</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#C5A358]/20 text-[#C5A358] font-mono">
              AI Gen
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'hierarchy'
                ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/40 shadow-sm'
                : 'text-[#888] hover:text-[#CCC] hover:bg-[#111]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Org & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'tools'
                ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/40 shadow-sm'
                : 'text-[#888] hover:text-[#CCC] hover:bg-[#111]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools ({currentAgentTools.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'llm'
                ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/40 shadow-sm'
                : 'text-[#888] hover:text-[#CCC] hover:bg-[#111]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Model & LLM</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'memory'
                ? 'bg-[#1A1A1A] text-[#C5A358] border border-[#C5A358]/40 shadow-sm'
                : 'text-[#888] hover:text-[#CCC] hover:bg-[#111]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Private Memory ({agentMemories.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TAB 1: AVATAR STUDIO */}
          {activeTab === 'avatar' && (
            <div className="space-y-6">
              {/* Notification Banner when saved */}
              {avatarSaveSuccess && (
                <div className="p-3.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Profile picture updated successfully! Saved across the workspace, active projects, and chat.</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Synced</span>
                </div>
              )}

              {/* Studio Grid */}
              <div className="p-5 rounded bg-[#070707] border border-[#1A1A1A] space-y-5">
                <div className="flex items-center justify-between border-b border-[#141414] pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#F0F0F0] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#C5A358]" />
                      <span>Executive Visual Identity & AI Portrait Generator</span>
                    </h4>
                    <p className="text-[11px] text-[#777] mt-0.5">
                      Synthesize bespoke executive headshots tailored to {agent.displayName}&apos;s role, seniority, and styling.
                    </p>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                    {avatarSource === 'gemini_ai_generated'
                      ? 'GEMINI 3.1 SYNTHESIZED'
                      : avatarSource === 'custom_url'
                      ? 'CUSTOM IMAGE URL'
                      : 'NEURAL ARCHETYPE ENGINE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Portrait Framing & Main Action */}
                  <div className="md:col-span-4 flex flex-col items-center gap-3">
                    <div className="relative w-full aspect-square rounded border border-[#262626] overflow-hidden bg-[#030303] group shadow-xl">
                      <img
                        src={currentAvatar}
                        alt="AI Avatar Staged Preview"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e)}
                        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                          isGeneratingAvatar ? 'opacity-30 blur-xs scale-95' : 'opacity-100'
                        }`}
                      />

                      {/* Generating Overlay */}
                      {isGeneratingAvatar && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-3 text-center">
                          <Loader2 className="w-8 h-8 text-[#C5A358] animate-spin mb-2" />
                          <span className="text-xs font-medium text-[#F0F0F0]">Synthesizing Portrait...</span>
                          <span className="text-[10px] text-[#888] font-mono mt-1">Computing facial geometry & studio lighting</span>
                        </div>
                      )}

                      {/* Staged info banner */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 pt-6 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#CCC] truncate font-medium">{agent.displayName}</span>
                        <span className="text-[#C5A358] capitalize px-1.5 py-0.2 rounded bg-black/40 border border-[#333]">
                          {avatarStyle}
                        </span>
                      </div>
                    </div>

                    {/* Primary Generation Button */}
                    <button
                      type="button"
                      onClick={() => handleGenerateAvatar()}
                      disabled={isGeneratingAvatar}
                      className="w-full py-2.5 px-3 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating AI Portrait...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          <span>Generate New AI Portrait</span>
                        </>
                      )}
                    </button>

                    {/* Save Avatar to Profile Button */}
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      disabled={isGeneratingAvatar}
                      className={`w-full py-2 px-3 rounded border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        hasUnsavedAvatar
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-sm animate-pulse'
                          : 'bg-[#141414] hover:bg-[#1E1E1E] text-[#CCC] border-[#2A2A2A]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{hasUnsavedAvatar ? 'Save & Apply New Avatar' : 'Avatar Synced'}</span>
                    </button>

                    {/* Custom URL Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCustomUrl(!showCustomUrl)}
                      className="text-[11px] text-[#777] hover:text-[#BBB] flex items-center gap-1.5 cursor-pointer transition pt-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showCustomUrl ? 'Hide Custom Image URL' : 'Or enter custom image URL'}</span>
                    </button>

                    {showCustomUrl && (
                      <div className="w-full space-y-1.5 p-2.5 rounded bg-[#0A0A0A] border border-[#222]">
                        <label className="block text-[10px] text-[#888]">Direct Image URL (PNG, JPG, WebP)</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className="w-full p-1.5 rounded border border-[#333] bg-[#050505] text-[11px] text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="w-full py-1.5 rounded bg-[#1A1A1A] hover:bg-[#252525] text-[#CCC] text-xs cursor-pointer border border-[#333]"
                        >
                          Preview & Apply URL
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Archetypes, Variations & Prompt Customization */}
                  <div className="md:col-span-8 space-y-4">
                    {/* Archetype & Style Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-[#BBB]">
                          Select Executive Archetype & Style
                        </label>
                        <span className="text-[10px] text-[#666]">Click to regenerate in that style</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AVATAR_STYLES.map((st) => {
                          const isSelected = avatarStyle === st.id;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                setAvatarStyle(st.id);
                                handleGenerateAvatar(st.id);
                              }}
                              className={`p-2.5 rounded border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'border-[#C5A358] bg-[#C5A358]/10'
                                  : 'border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#333]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`text-xs font-medium ${
                                    isSelected ? 'text-[#C5A358]' : 'text-[#EEE]'
                                  }`}
                                >
                                  {st.label}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded border border-[#222] text-[#888] font-mono">
                                  {st.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#777] line-clamp-2 leading-relaxed">
                                {st.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Curated Neural Archetypes Variations Gallery */}
                    {avatarVariations.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-[#BBB]">
                            Curated Archetype Variations
                          </label>
                          <span className="text-[10px] text-[#666]">Click any portrait to equip</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {avatarVariations.map((variant, idx) => {
                            const isCurrent = currentAvatar === variant.url;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectVariation(variant.url)}
                                className={`relative aspect-square rounded border overflow-hidden group cursor-pointer transition text-left ${
                                  isCurrent
                                    ? 'border-[#C5A358] ring-2 ring-[#C5A358]/50 shadow-md'
                                    : 'border-[#222] hover:border-[#444] opacity-80 hover:opacity-100'
                                }`}
                              >
                                <img
                                  src={variant.url}
                                  alt={variant.label}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleAvatarError(e)}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                                  <span className="text-[9px] text-[#EEE] font-medium truncate">
                                    {variant.label.split('-')[0].trim()}
                                  </span>
                                  {variant.badge && (
                                    <span className="text-[8px] text-[#C5A358] capitalize font-mono">
                                      {variant.badge}
                                    </span>
                                  )}
                                </div>
                                {isCurrent && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#C5A358] text-black flex items-center justify-center text-[10px]">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AI Prompt Customizer */}
                    <div className="pt-2 border-t border-[#141414] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#AAA] flex items-center gap-1.5">
                          <span>Active AI Synthesis Prompt</span>
                          <span className="text-[9px] text-[#555] font-mono">(Role & Demographics Grounded)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const defaultPrompt = buildAvatarPrompt({
                              firstName: agent.firstName || agent.displayName,
                              lastName: agent.lastName || '',
                              gender: agent.gender || 'female',
                              age: agent.approxAge || 31,
                              nationality: agent.nationality || 'American',
                              jobTitle: agent.jobTitle || 'Specialist',
                              department: agent.department || 'Operations',
                              style: avatarStyle
                            });
                            setAvatarPrompt(defaultPrompt);
                          }}
                          className="text-[10px] text-[#C5A358] hover:underline cursor-pointer"
                        >
                          Reset to Role Default
                        </button>
                      </div>

                      <textarea
                        value={avatarPrompt}
                        onChange={(e) => setAvatarPrompt(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 rounded border border-[#222] bg-[#0A0A0A] text-xs text-[#CCC] focus:outline-none focus:border-[#C5A358] font-mono leading-relaxed"
                        placeholder="Describe portrait characteristics, studio lighting, attire..."
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#666]">
                          Model: <span className="text-[#888]">{avatarModel}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleGenerateAvatar(avatarStyle, avatarPrompt)}
                          disabled={isGeneratingAvatar}
                          className="py-1 px-3 rounded bg-[#1A1A1A] hover:bg-[#252525] text-[#C5A358] text-xs font-medium border border-[#C5A358]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isGeneratingAvatar ? 'animate-spin' : ''}`} />
                          <span>Regenerate with Prompt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVERVIEW & MISSION */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Mission & Background */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#C5A358] flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5" />
                  <span>Mission & Primary Responsibility</span>
                </h4>
                <p className="text-xs text-[#CCC] leading-relaxed bg-[#070707] p-3.5 rounded border border-[#1A1A1A]">
                  {agent.primaryResponsibility}
                </p>
              </div>

              {/* Secondary Responsibilities & Expertise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
                  <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                    Secondary Responsibilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(agent.secondaryResponsibilities || []).map((r, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded bg-[#111] border border-[#222] text-[#AAA]">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-2">
                  <span className="text-[10px] font-semibold text-[#C5A358] uppercase tracking-widest block">
                    Domain Expertise & Capabilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(agent.expertise || agent.skills || []).map((e, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded bg-[#111] border border-[#222] text-[#C5A358]">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
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
            </div>
          )}

          {/* TAB 3: HIERARCHY & REPORTING */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-4">
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

              <div className="p-4 rounded bg-[#070707] border border-[#1A1A1A] space-y-4 text-xs">
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
                            <img
                              src={sub.avatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              onError={(e) => handleAvatarError(e)}
                              className="w-3.5 h-3.5 rounded object-cover"
                            />
                            <span>{sub.displayName}</span>
                            <span className="text-[9px] text-[#666]">({sub.jobTitle})</span>
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: TOOLS & PERMISSIONS */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
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
                    <span>Add Custom Tool</span>
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
          )}

          {/* TAB 5: LLM & MODEL CONFIG */}
          {activeTab === 'llm' && (
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
          )}

          {/* TAB 6: PRIVATE MEMORY (LAYER 2) */}
          {activeTab === 'memory' && (
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
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#777]">
            {activeTab === 'avatar' && (
              <span>
                {hasUnsavedAvatar ? (
                  <span className="text-[#C5A358]">Unsaved avatar changes — remember to click Save</span>
                ) : (
                  <span>Current avatar is active in workspace</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'avatar' && hasUnsavedAvatar && (
              <button
                onClick={handleSaveAvatar}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Avatar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
