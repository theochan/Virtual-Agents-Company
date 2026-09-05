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
  Filter
} from 'lucide-react';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';
import {
  AVATAR_STYLES,
  AvatarStyle,
  buildAvatarPrompt,
  getCuratedAvatarSuite,
  getSlotFallbackAvatar,
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
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  const [selectedModel, setSelectedModel] = useState<string>(agent?.llmConfig?.model || 'gemini-3.8-flash');
  const [temperature, setTemperature] = useState<number>(agent?.llmConfig?.temperature ?? 0.2);
  const [maxTokens, setMaxTokens] = useState<number>(agent?.llmConfig?.maxTokens || 4096);
  const [isSaved, setIsSaved] = useState(false);
  const [toolSavedFeedback, setToolSavedFeedback] = useState<string | null>(null);
  const [hierarchyFeedback, setHierarchyFeedback] = useState<string | null>(null);

  // Avatar Studio State
  const [currentAvatar, setCurrentAvatar] = useState<string>(
    agent?.avatarUrl || getSlotFallbackAvatar(agent?.gender, agent?.avatarStyle, 0)
  );
  const [currentFallbackUrl, setCurrentFallbackUrl] = useState<string>(
    getSlotFallbackAvatar(agent?.gender, agent?.avatarStyle, 0)
  );
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('creative');
  const [avatarPrompt, setAvatarPrompt] = useState<string>('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarSource, setAvatarSource] = useState<'gemini_ai_generated' | 'ai_curated_neural' | 'custom_url'>('ai_curated_neural');
  const [avatarModel, setAvatarModel] = useState('Neural Portrait Engine (Photorealistic)');
  const [avatarVariations, setAvatarVariations] = useState<Array<{ url: string; fallbackUrl?: string; label: string; badge?: string }>>([]);
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

  // Skill Filtering & Search State
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [selectedToolCategory, setSelectedToolCategory] = useState<string>('All');

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
      const initialFallback = getSlotFallbackAvatar(agent.gender, style, 0);
      setCurrentAvatar(agent.avatarUrl || initialFallback);
      setCurrentFallbackUrl(initialFallback);
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
      if (suite.primary.fallbackUrl) {
        setCurrentFallbackUrl(suite.primary.fallbackUrl);
      }
      setAvatarVariations(
        suite.variations.map((v) => ({
          url: v.url,
          fallbackUrl: v.fallbackUrl || v.url,
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

    let computedPrompt: string;
    if (explicitPrompt !== undefined && explicitPrompt.trim().length > 0) {
      // User explicitly clicked "Regenerate with Prompt"
      computedPrompt = explicitPrompt.trim();
    } else {
      // User clicked "Generate New AI Portrait" or selected a new style: generate randomized lighting & composition
      const lightingModifiers = [
        'cinematic warm studio lighting, 3/4 turn angle, crisp rimlight',
        'diffuse natural window daylight, subtle contrast, approachable authentic expression',
        'sleek dramatic edge illumination, sharp focal plane, commanding executive gaze',
        'soft neutral boardroom studio lighting, shallow depth of field',
        'clean architectural lighting, confident direct gaze, refined executive framing'
      ];
      const randomModifier = lightingModifiers[Math.floor(Math.random() * lightingModifiers.length)];
      computedPrompt = buildAvatarPrompt({
        firstName,
        lastName,
        gender,
        age,
        nationality,
        jobTitle,
        department,
        style: chosenStyle
      }) + `, ${randomModifier}`;
    }

    setAvatarPrompt(computedPrompt);

    try {
      const res = await fetch('/api/agents/generate-avatar', {
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
          if (data.fallbackUrl) {
            setCurrentFallbackUrl(data.fallbackUrl);
          }
          setAvatarSource(data.source || 'ai_generated');
          setAvatarModel(data.model || 'Neural Portrait Engine (Flux)');
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
      setCurrentFallbackUrl(fallback.primary.fallbackUrl || DEFAULT_FALLBACK_AVATAR);
      setAvatarVariations(
        fallback.variations.map((v) => ({
          url: v.url,
          fallbackUrl: v.fallbackUrl || v.url,
          label: v.label,
          badge: v.badge || v.style
        }))
      );
      setAvatarSource('ai_generated');
      setAvatarModel('Neural Portrait Engine (Photorealistic)');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleSelectVariation = (url: string) => {
    setCurrentAvatar(url);
    setCurrentFallbackUrl(url);
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
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
                onError={(e) => handleAvatarError(e, currentFallbackUrl, agent.gender, avatarStyle, 0)}
                className="w-13 h-13 rounded-xl object-cover border border-slate-200 shadow-2xs group-hover:border-amber-500 transition"
              />
              <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                <Camera className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[9px] text-amber-600 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-serif text-slate-900">{agent.displayName}</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 font-mono font-medium">
                  Level {agent.autonomyLevel} Autonomy
                </span>
                <button
                  onClick={() => setActiveTab('avatar')}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-semibold cursor-pointer transition shadow-2xs"
                >
                  <Wand2 className="w-3 h-3 text-amber-700" />
                  <span>Generate Avatar</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {agent.jobTitle} • {agent.department} ({agent.seniority})
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-5 border-b border-slate-200 bg-slate-50/80 flex items-center gap-1.5 overflow-x-auto shrink-0 py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'overview'
                ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-600" />
            <span>Overview & Mission</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'avatar'
                ? 'bg-amber-100/70 text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-amber-800 bg-amber-50/50 border border-amber-200/80 hover:bg-amber-100/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Avatar Studio</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-mono font-medium">
              AI Gen
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'hierarchy'
                ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-amber-600" />
            <span>Org & Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'tools'
                ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>Tools ({currentAgentTools.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('llm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'llm'
                ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span>Model & LLM</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition shrink-0 ${
              activeTab === 'memory'
                ? 'bg-white text-amber-900 border border-amber-300 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
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
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium">Profile picture updated successfully! Saved across the workspace, active projects, and chat.</span>
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-emerald-700">Synced</span>
                </div>
              )}

              {/* Studio Grid */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Executive Visual Identity & AI Portrait Generator</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Synthesize bespoke executive headshots tailored to {agent.displayName}&apos;s role, seniority, and styling.
                    </p>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-900 font-mono font-medium shadow-2xs">
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
                    <div className="relative w-full aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-md">
                      <img
                        src={currentAvatar}
                        alt="AI Avatar Staged Preview"
                        referrerPolicy="no-referrer"
                        onError={(e) => handleAvatarError(e, currentFallbackUrl, agent.gender, avatarStyle, 0)}
                        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                          isGeneratingAvatar ? 'opacity-30 blur-xs scale-95' : 'opacity-100'
                        }`}
                      />

                      {/* Generating Overlay */}
                      {isGeneratingAvatar && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 p-3 text-center">
                          <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                          <span className="text-xs font-medium text-white">Synthesizing Portrait...</span>
                          <span className="text-[10px] text-slate-300 font-mono mt-1">Computing facial geometry & studio lighting</span>
                        </div>
                      )}

                      {/* Staged info banner */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent p-2.5 pt-6 flex items-center justify-between text-[10px] font-mono text-white">
                        <span className="truncate font-medium">{agent.displayName}</span>
                        <span className="text-amber-300 capitalize px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-700">
                          {avatarStyle}
                        </span>
                      </div>
                    </div>

                    {/* Primary Generation Button */}
                    <div className="w-full space-y-1">
                      <button
                        type="button"
                        onClick={() => handleGenerateAvatar()}
                        disabled={isGeneratingAvatar}
                        className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingAvatar ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Generating AI Portrait...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 text-amber-400" />
                            <span>Generate New AI Portrait</span>
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-slate-500 text-center leading-tight">
                        Synthesizes a brand new portrait with randomized studio lighting & seed
                      </p>
                    </div>

                    {/* Save Avatar to Profile Button */}
                    <button
                      type="button"
                      onClick={handleSaveAvatar}
                      disabled={isGeneratingAvatar}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        hasUnsavedAvatar
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-xs animate-pulse'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{hasUnsavedAvatar ? 'Save & Apply New Avatar' : 'Avatar Synced'}</span>
                    </button>

                    {/* Custom URL Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowCustomUrl(!showCustomUrl)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer transition pt-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showCustomUrl ? 'Hide Custom Image URL' : 'Or enter custom image URL'}</span>
                    </button>

                    {showCustomUrl && (
                      <div className="w-full space-y-1.5 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                        <label className="block text-[10px] text-slate-500 font-medium">Direct Image URL (PNG, JPG, WebP)</label>
                        <input
                          type="text"
                          placeholder="https://images.unsplash.com/..."
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCustomUrl}
                          className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer shadow-xs"
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
                        <label className="text-xs font-semibold text-slate-800">
                          Select Executive Archetype & Style
                        </label>
                        <span className="text-[10px] text-slate-500">Click to regenerate in that style</span>
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
                              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'border-amber-400 bg-amber-50/80 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className={`text-xs font-semibold ${
                                    isSelected ? 'text-amber-900' : 'text-slate-900'
                                  }`}
                                >
                                  {st.label}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 font-mono bg-slate-50">
                                  {st.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
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
                          <label className="text-xs font-semibold text-slate-800">
                            Curated Archetype Variations
                          </label>
                          <span className="text-[10px] text-slate-500">Click any portrait to equip</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {avatarVariations.map((variant, idx) => {
                            const isCurrent = currentAvatar === variant.url;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectVariation(variant.url)}
                                className={`relative aspect-square rounded-xl border overflow-hidden group cursor-pointer transition text-left ${
                                  isCurrent
                                    ? 'border-amber-500 ring-2 ring-amber-400/50 shadow-xs'
                                    : 'border-slate-200 hover:border-amber-400/80 opacity-90 hover:opacity-100 shadow-2xs'
                                }`}
                              >
                                <img
                                  src={variant.url}
                                  alt={variant.label}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => handleAvatarError(e, variant.fallbackUrl, agent.gender, avatarStyle, idx + 1)}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                                  <span className="text-[9px] text-white font-medium truncate">
                                    {variant.label.split('-')[0].trim()}
                                  </span>
                                  {variant.badge && (
                                    <span className="text-[8px] text-amber-300 capitalize font-mono">
                                      {variant.badge}
                                    </span>
                                  )}
                                </div>
                                {isCurrent && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shadow-xs">
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
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                          <span>Active AI Synthesis Prompt</span>
                          <span className="text-[9px] text-slate-400 font-mono">(Role & Demographics Grounded)</span>
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
                          className="text-[10px] text-amber-800 hover:text-amber-900 hover:underline cursor-pointer font-medium"
                        >
                          Reset to Role Default
                        </button>
                      </div>

                      <textarea
                        value={avatarPrompt}
                        onChange={(e) => setAvatarPrompt(e.target.value)}
                        rows={3}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/20 font-mono leading-relaxed shadow-2xs"
                        placeholder="Describe portrait characteristics, studio lighting, attire..."
                      />

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] text-slate-500">
                          Model: <span className="text-slate-700 font-medium">{avatarModel}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleGenerateAvatar(avatarStyle, avatarPrompt)}
                          disabled={isGeneratingAvatar}
                          title="Generate portrait strictly following the customized prompt text above"
                          className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                        >
                          <RefreshCw className={`w-3 h-3 text-amber-400 ${isGeneratingAvatar ? 'animate-spin' : ''}`} />
                          <span>Regenerate with Prompt</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Tip: Edit the prompt above to customize clothing, backdrop, lighting, or physical traits, then click &ldquo;Regenerate with Prompt&rdquo;.
                      </p>
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                  <Brain className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mission & Primary Responsibility</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs">
                  {agent.primaryResponsibility}
                </p>
              </div>

              {/* Secondary Responsibilities & Expertise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block">
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

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block">
                    Domain Expertise & Capabilities
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

              {/* Behavioral Traits & Communication Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block">
                    Temperament & Style
                  </span>
                  <p className="text-xs text-slate-900 font-semibold">{agent.temperament}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{agent.personalityDescription}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-widest block">
                    Communication Pattern
                  </span>
                  <p className="text-xs text-slate-900 font-semibold">{agent.communicationMode || 'Conclusion first'}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      Verbosity: {agent.communicationStyle?.verbosity || 'balanced'}
                    </span>
                    <span className="text-[9px] px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 shadow-2xs">
                      Jargon: {agent.communicationStyle?.jargonLevel || 'moderate'}
                    </span>
                    {agent.communicationStyle?.challengesUserDecisions && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium shadow-2xs">
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
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                  <Network className="w-3.5 h-3.5 text-amber-600" />
                  <span>Organizational Hierarchy & Reporting Line</span>
                </h4>
                {hierarchyFeedback && (
                  <span className="text-[10px] text-emerald-600 font-mono font-medium animate-fadeIn">
                    {hierarchyFeedback}
                  </span>
                )}
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">
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
                      className="w-full bg-white text-slate-900 border border-slate-200 focus:border-amber-500 rounded-lg p-2 text-xs focus:outline-none shadow-2xs"
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
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-medium">
                      Departmental Role
                    </label>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-2xs">
                      <span className="font-semibold text-slate-900">
                        {agent.departmentRole === 'lead' ? 'Department Lead / Principal' : 'Team Contributor'}
                      </span>
                      <span className="text-[10px] text-slate-500">({agent.department})</span>
                    </div>
                  </div>
                </div>

                {/* Direct Reports Preview */}
                {allAgents.filter((a) => a.reportsTo === agent.id).length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1.5 font-medium">
                      Direct Reports ({allAgents.filter((a) => a.reportsTo === agent.id).length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {allAgents
                        .filter((a) => a.reportsTo === agent.id)
                        .map((sub) => (
                          <span
                            key={sub.id}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 flex items-center gap-1.5 shadow-2xs"
                          >
                            <img
                              src={sub.avatarUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              onError={(e) => handleAvatarError(e)}
                              className="w-3.5 h-3.5 rounded object-cover"
                            />
                            <span className="font-medium text-slate-900">{sub.displayName}</span>
                            <span className="text-[9px] text-slate-500">({sub.jobTitle})</span>
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
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    Equipped Tools ({currentAgentTools.length})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {toolSavedFeedback && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-mono font-medium">
                      <Check className="w-3 h-3" /> {toolSavedFeedback}
                    </span>
                  )}
                  <button
                    onClick={() => setIsAddingCustomTool(!isAddingCustomTool)}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 text-amber-900 text-[11px] font-semibold border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Tool</span>
                  </button>
                </div>
              </div>

              {/* Custom Tool Creator Drawer */}
              {isAddingCustomTool && (
                <form onSubmit={handleCreateAndEquipTool} className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <span className="text-xs font-semibold text-slate-900">Create & Equip New Tool</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomTool(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
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
                      className="p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                    <select
                      value={customToolCategory}
                      onChange={(e) => setCustomToolCategory(e.target.value as any)}
                      className="p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
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
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customToolApproval}
                        onChange={(e) => setCustomToolApproval(e.target.checked)}
                        className="rounded accent-amber-600"
                      />
                      <span className="font-medium">Requires Human Approval</span>
                    </label>

                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Create & Equip
                    </button>
                  </div>
                </form>
              )}

              {/* Equipped Tools Quick Strip */}
              {currentAgentTools.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Currently Equipped ({currentAgentTools.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateAgentTools) onUpdateAgentTools(agent.id, []);
                      }}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Unequip All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {currentAgentTools.map((toolId) => {
                      const toolObj = tools.find((t) => t.id === toolId);
                      return (
                        <span
                          key={toolId}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/70 border border-amber-300 text-[10px] text-amber-900 font-medium shadow-2xs"
                        >
                          <span className="truncate max-w-[150px]">{toolObj?.name || toolId}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleTool(toolId)}
                            className="hover:text-rose-600 text-amber-700 cursor-pointer text-xs"
                            title="Unequip"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Category Filter Navigation */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 390+ skills by title, description, or Python script..."
                    value={toolSearchQuery}
                    onChange={(e) => setToolSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                  />
                  {toolSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setToolSearchQuery('')}
                      className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Pills (Horizontal Scroll) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                  {[
                    'All',
                    'Equipped',
                    'Engineering & Architecture',
                    'Executive & Strategy',
                    'Marketing & Growth',
                    'Operations & Productivity',
                    'Regulatory & Compliance',
                    'Product & Design',
                    'Research & Intelligence',
                    'Finance & Commercial',
                    'Core Tools'
                  ].map((cat) => {
                    const isSelected = selectedToolCategory === cat;
                    let count = 0;
                    if (cat === 'All') count = tools.length;
                    else if (cat === 'Equipped') count = currentAgentTools.length;
                    else if (cat === 'Core Tools') count = tools.filter((t) => t.id.startsWith('tool-')).length;
                    else count = tools.filter((t) => t.category === cat).length;

                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedToolCategory(cat)}
                        className={`whitespace-nowrap px-3 py-1 rounded-lg text-[10px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs'
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tools Counter & Filter Header */}
              {(() => {
                const filteredTools = tools.filter((t) => {
                  const isEquipped = currentAgentTools.includes(t.id);
                  if (selectedToolCategory === 'Equipped' && !isEquipped) return false;
                  if (selectedToolCategory === 'Core Tools' && !t.id.startsWith('tool-')) return false;
                  if (
                    selectedToolCategory !== 'All' &&
                    selectedToolCategory !== 'Equipped' &&
                    selectedToolCategory !== 'Core Tools'
                  ) {
                    if (t.category !== selectedToolCategory) return false;
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>
                        Showing {filteredTools.length} {filteredTools.length === 1 ? 'skill' : 'skills'}
                        {selectedToolCategory !== 'All' ? ` in ${selectedToolCategory}` : ''}
                      </span>
                      <span className="text-slate-400 font-medium">Click card or button to equip</span>
                    </div>

                    {filteredTools.length === 0 ? (
                      <div className="p-8 text-center rounded-xl border border-slate-200 bg-slate-50 space-y-1 shadow-2xs">
                        <p className="text-xs text-slate-700 font-medium">No skills found matching your search</p>
                        <p className="text-[10px] text-slate-400">Try clearing your search query or selecting a different category pill</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {filteredTools.map((t) => {
                          const isEquipped = currentAgentTools.includes(t.id);
                          const hasScript = t.hasExecutableScript || (t.scripts && t.scripts.length > 0);

                          return (
                            <div
                              key={t.id}
                              onClick={() => handleToggleTool(t.id)}
                              className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between gap-2.5 ${
                                isEquipped
                                  ? 'bg-amber-50/70 border-amber-300 text-slate-900 shadow-2xs'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-1.5">
                                  <span
                                    className={`text-xs font-semibold leading-snug ${
                                      isEquipped ? 'text-amber-900' : 'text-slate-900'
                                    }`}
                                  >
                                    {t.name}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0 font-mono">
                                    {t.permission}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-50 text-slate-500 border border-slate-200">
                                    {t.category}
                                  </span>
                                  {hasScript && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                      <Terminal className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>CLI Script</span>
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                                  {t.description}
                                </p>
                              </div>

                              <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                {hasScript && t.scripts?.[0] ? (
                                  <span className="font-mono text-[9px] text-slate-400 truncate max-w-[130px]">
                                    {t.scripts[0]}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400">Operational Framework</span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTool(t.id);
                                  }}
                                  className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-semibold transition cursor-pointer ${
                                    isEquipped
                                      ? 'bg-amber-100 text-amber-950 border border-amber-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                      : 'bg-slate-900 text-white border border-slate-900 hover:bg-slate-800 shadow-2xs'
                                  }`}
                                >
                                  {isEquipped ? '✓ Equipped' : '+ Equip'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: LLM & MODEL CONFIG */}
          {activeTab === 'llm' && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-900">Dedicated LLM Architecture</span>
                </div>
                {isSaved && (
                  <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-mono font-semibold">
                    <Check className="w-3 h-3 text-emerald-600" /> Saved
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

                {/* Temperature & Token Settings */}
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
                    <span className="text-[9px] text-slate-400 block pt-0.5">Defines maximum response payload length</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PRIVATE MEMORY (LAYER 2) */}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-2">
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {onDeleteAgent && agent && (
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      `Are you sure you want to delete ${agent.displayName}? This will permanently remove this agent from the company and release any assigned tasks.`
                    )
                  ) {
                    onDeleteAgent(agent.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title={`Delete ${agent.displayName}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Agent</span>
              </button>
            )}

            {activeTab === 'avatar' && (
              <span>
                {hasUnsavedAvatar ? (
                  <span className="text-amber-800 font-medium">Unsaved avatar changes — remember to click Save</span>
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
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Avatar</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
