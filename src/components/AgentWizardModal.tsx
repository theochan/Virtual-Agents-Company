import React, { useState } from 'react';
import { Agent, PersonalityDimensions, CommunicationStyle, Temperament, ModelProvider, Tool, ToolPermission } from '../types';
import {
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Briefcase,
  Sliders,
  MessageSquare,
  Cpu,
  ShieldCheck,
  RefreshCw,
  Wand2,
  Loader2,
  Link as LinkIcon,
  Plus,
  Wrench,
  Search
} from 'lucide-react';
import { AVATAR_STYLES, AvatarStyle, buildAvatarPrompt, getCuratedAvatarSuite } from '../lib/avatarCatalog';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';

interface AgentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAgent: (agent: Partial<Agent>) => void;
  tools?: Tool[];
  onAddGlobalTool?: (newTool: Tool) => void;
  existingAgents?: Agent[];
}

export const AgentWizardModal: React.FC<AgentWizardModalProps> = ({
  isOpen,
  onClose,
  onCreateAgent,
  tools = [],
  onAddGlobalTool,
  existingAgents = []
}) => {
  const [step, setStep] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStage, setCreationStage] = useState('');

  // Step 1: Identity
  const [firstName, setFirstName] = useState('Elena');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'non-binary'>('female');
  const [age, setAge] = useState(32);
  const [nationality, setNationality] = useState('Swedish');

  // AI-Generated Portrait Studio State (Prior to Agent Creation)
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>('cyber');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces&q=85&auto=format'
  );
  const [avatarPrompt, setAvatarPrompt] = useState(
    'High-end photorealistic 8k close-up headshot portrait avatar of a 32-year-old Swedish professional woman, Principal Security Architect in Security & Compliance. Wearing sleek charcoal technical blazer, dark turtleneck, security clearance lanyard, cinematic soft studio lighting, sharp focus on eyes, authentic skin texture, shallow depth of field, centered 1:1 square composition, executive portrait photography, neutral executive background.'
  );
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarSource, setAvatarSource] = useState<'gemini_ai_generated' | 'ai_curated_neural'>('ai_curated_neural');
  const [avatarModel, setAvatarModel] = useState('Gemini 3.1 Flash Image Synthesis');
  const [avatarVariations, setAvatarVariations] = useState<Array<{ url: string; label: string; badge?: string }>>([
    {
      url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
      label: 'Variant 1 - Cryptographer',
      badge: 'Security'
    },
    {
      url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
      label: 'Variant 2 - Systems Architect',
      badge: 'Tech'
    },
    {
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
      label: 'Variant 3 - Strategic Systems',
      badge: 'Creative'
    },
    {
      url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
      label: 'Variant 4 - Security Fellow',
      badge: 'Research'
    }
  ]);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);

  // Step 2: Professional Role
  const [jobTitle, setJobTitle] = useState('Principal Security Architect');
  const [department, setDepartment] = useState('Security & Compliance');
  const [reportsTo, setReportsTo] = useState<string | undefined>('agent-sarah');
  const [departmentRole, setDepartmentRole] = useState<'lead' | 'member'>('member');
  const [seniority, setSeniority] = useState<'junior' | 'mid' | 'senior' | 'staff' | 'principal' | 'lead' | 'executive'>('principal');
  const [primaryResponsibility, setPrimaryResponsibility] = useState('Audit architecture and enforce zero-trust security postures.');
  const [skillsInput, setSkillsInput] = useState('Threat Modeling, OAuth2, Zero-Trust, SOC2 Compliance, Cryptography');

  // Step 3: Personality
  const [temperament, setTemperament] = useState<Temperament>('serious');
  const [personalityDesc, setPersonalityDesc] = useState(
    'Vigilant, unyielding on cryptographic safety, highly analytical with zero patience for vague assurances.'
  );
  const [dimensions, setDimensions] = useState<PersonalityDimensions>({
    analyticalVsIntuitive: 95,
    formalVsCasual: 80,
    verboseVsConcise: 25,
    cautiousVsFast: 90,
    independentVsCollaborative: 65,
    assertiveVsDeferential: 85,
    detailVsBigPicture: 90,
    theoreticalVsPragmatic: 80,
    optimisticVsSkeptical: 15,
    methodicalVsExperimental: 90
  });

  // Step 4: Communication
  const [communicationStyle, setCommunicationStyle] = useState<CommunicationStyle>({
    mode: 'conclusion_first',
    verbosity: 'concise',
    jargonLevel: 'expert',
    humorLevel: 'none',
    challengesUserDecisions: true,
    proactivelySuggestsImprovements: true
  });

  // Step 5: Model & Tools
  const [provider, setProvider] = useState<ModelProvider>('google');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [autonomyLevel, setAutonomyLevel] = useState<1 | 2 | 3 | 4>(3);
  const [selectedTools, setSelectedTools] = useState<string[]>([
    'tool-security-scanner',
    'tool-database-query',
    'tool-github-prs'
  ]);
  const [toolSearch, setToolSearch] = useState('');
  const [isAddingCustomTool, setIsAddingCustomTool] = useState(false);
  const [customToolName, setCustomToolName] = useState('');
  const [customToolDesc, setCustomToolDesc] = useState('');
  const [customToolCategory, setCustomToolCategory] = useState<Tool['category']>('Engineering');
  const [customToolPermission, setCustomToolPermission] = useState<ToolPermission>('READ');
  const [customToolApproval, setCustomToolApproval] = useState(false);

  const selectedModelDetails = getModelDetails(model);

  const handleGenerateAvatar = async (targetStyle?: AvatarStyle) => {
    setIsGeneratingAvatar(true);
    const chosenStyle = targetStyle || avatarStyle;

    const computedPrompt =
      isEditingPrompt && avatarPrompt.trim().length > 10
        ? avatarPrompt.trim()
        : buildAvatarPrompt({
            firstName,
            lastName,
            gender,
            age,
            nationality,
            jobTitle,
            department,
            style: chosenStyle
          });

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
          customPrompt: isEditingPrompt ? avatarPrompt : undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        }
        if (data.source) {
          setAvatarSource(data.source);
        }
        if (data.model) {
          setAvatarModel(data.model);
        }
        if (data.variations && data.variations.length > 0) {
          setAvatarVariations(data.variations);
        }
        if (!isEditingPrompt && data.promptUsed) {
          setAvatarPrompt(data.promptUsed);
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      console.log('Serving curated executive neural portrait suite for agent');
      const fallback = getCuratedAvatarSuite(gender, chosenStyle, `${firstName}-${Date.now()}`);
      setAvatarUrl(fallback.primary.url);
      setAvatarVariations(fallback.variations.map((v) => ({ url: v.url, label: v.label, badge: v.style })));
      setAvatarSource('ai_curated_neural');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsCreating(true);

    const stages = [
      'Synthesizing persistent identity...',
      'Assigning photorealistic portrait avatar...',
      'Compiling behavioral system prompt from personality dimensions...',
      'Configuring 4-layer memory scopes...',
      'Provisioning security clearance & tools...',
      'Agent coworker ready!'
    ];

    for (const stage of stages) {
      setCreationStage(stage);
      await new Promise((r) => setTimeout(r, 450));
    }

    const newAgent: Partial<Agent> = {
      firstName: firstName.trim(),
      lastName: '',
      displayName: firstName.trim(),
      avatarUrl,
      jobTitle,
      department,
      departmentRole,
      reportsTo: reportsTo === 'none' ? undefined : reportsTo,
      seniority,
      gender,
      age,
      nationality,
      primaryResponsibility,
      secondaryResponsibilities: ['Security incident forensics', 'Access control validation'],
      skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
      temperament,
      personalityDescription: personalityDesc,
      personalityDimensions: dimensions,
      communicationStyle,
      autonomyLevel,
      llmConfig: {
        provider,
        model,
        temperature,
        maxTokens
      },
      tools: selectedTools,
      memoryAccess: {
        allowedScopes: ['conversation', 'agent', 'project', 'organization'],
        projectIds: ['proj-phoenix']
      },
      runtimeState: {
        status: 'idle'
      }
    };

    onCreateAgent(newAgent);
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded bg-[#0A0A0A] border border-[#1A1A1A] shadow-2xl flex flex-col max-h-[90vh] text-[#E0E0E0] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F0F0F0]">Create Autonomous AI Coworker</h3>
              <p className="text-[11px] text-[#777]">Step {step} of 5: Five-Dimensional Persistent Persona</p>
            </div>
          </div>

          <button onClick={onClose} className="text-[#666] hover:text-[#FFF] text-sm cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Bar */}
        <div className="px-6 py-2.5 bg-[#070707] border-b border-[#1A1A1A] flex items-center justify-between text-xs shrink-0">
          {[
            { num: 1, label: 'Identity', icon: User },
            { num: 2, label: 'Professional Role', icon: Briefcase },
            { num: 3, label: 'Personality', icon: Sliders },
            { num: 4, label: 'Communication', icon: MessageSquare },
            { num: 5, label: 'Model & Tools', icon: Cpu }
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 font-medium ${
                step === s.num
                  ? 'text-[#C5A358] font-semibold'
                  : step > s.num
                  ? 'text-emerald-400'
                  : 'text-[#555]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-[#C5A358] text-black font-bold'
                    : step > s.num
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-[#151515] text-[#555]'
                }`}
              >
                {step > s.num ? '✓' : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-[#AAA] mb-1">Agent Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Elena, Alex, Jordan..."
                  className="w-full p-2.5 rounded border border-[#1A1A1A] bg-[#070707] text-xs text-[#F0F0F0] focus:outline-none focus:border-[#C5A358]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-[#777] mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setGender(val);
                    }}
                    className="w-full p-2 rounded border border-[#1A1A1A] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-Binary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#777] mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full p-2 rounded border border-[#1A1A1A] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-[#777] mb-1">Nationality / Heritage</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full p-2 rounded border border-[#1A1A1A] bg-[#070707] text-xs text-[#EEE] focus:outline-none focus:border-[#C5A358]"
                  />
                </div>
              </div>

              {/* AI PORTRAIT GENERATION STUDIO */}
              <div className="p-4 rounded border border-[#1A1A1A] bg-[#070707] space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
                      <Wand2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[#F0F0F0]">AI Portrait Synthesis Studio</h4>
                      <p className="text-[10px] text-[#777]">
                        Generate high-fidelity photorealistic headshots prior to agent deployment
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 text-[#C5A358] font-mono">
                    {avatarSource === 'gemini_ai_generated' ? 'GEMINI 3.1 SYNTHESIZED' : 'NEURAL ARCHETYPE ENGINE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                  {/* Portrait Preview Box */}
                  <div className="sm:col-span-4 flex flex-col items-center gap-2">
                    <div className="relative w-full aspect-square rounded border border-[#222] overflow-hidden bg-[#030303] group shadow-lg">
                      <img
                        src={avatarUrl}
                        alt="AI Avatar Preview"
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          isGeneratingAvatar ? 'opacity-40 blur-xs' : 'opacity-100'
                        }`}
                      />

                      {isGeneratingAvatar && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 p-2 text-center">
                          <Loader2 className="w-6 h-6 text-[#C5A358] animate-spin mb-1.5" />
                          <span className="text-[11px] font-medium text-[#F0F0F0]">Synthesizing Portrait...</span>
                          <span className="text-[9px] text-[#888] font-mono">Computing facial geometry</span>
                        </div>
                      )}

                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-4 flex items-center justify-between text-[9px] font-mono">
                        <span className="text-[#CCC] truncate">{firstName} {lastName}</span>
                        <span className="text-[#C5A358] capitalize">{avatarStyle}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateAvatar()}
                      disabled={isGeneratingAvatar}
                      className="w-full py-2 px-3 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingAvatar ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating AI Portrait...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Generate AI Portrait</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomUrl(!showCustomUrl)}
                      className="text-[10px] text-[#666] hover:text-[#AAA] flex items-center gap-1 cursor-pointer transition"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{showCustomUrl ? 'Hide Custom Image URL' : 'Or enter custom image URL'}</span>
                    </button>

                    {showCustomUrl && (
                      <div className="w-full space-y-1 mt-1">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          className="w-full p-1.5 rounded border border-[#222] bg-[#0A0A0A] text-[10px] text-[#EEE]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customUrlInput.trim()) {
                              setAvatarUrl(customUrlInput.trim());
                              setAvatarSource('ai_curated_neural');
                            }
                          }}
                          className="w-full py-1 rounded bg-[#1A1A1A] hover:bg-[#252525] text-[#CCC] text-[10px] cursor-pointer"
                        >
                          Apply URL
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Archetype & Prompt Configuration */}
                  <div className="sm:col-span-8 space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#BBB] mb-1.5">
                        Select Executive Archetype & Style
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                              className={`p-2 rounded border text-left transition cursor-pointer ${
                                isSelected
                                  ? 'border-[#C5A358] bg-[#C5A358]/10'
                                  : 'border-[#1A1A1A] bg-[#0A0A0A] hover:border-[#333]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
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
                              <p className="text-[10px] text-[#666] leading-tight line-clamp-1">{st.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Prompt Inspector / Customizer */}
                    <div className="p-2.5 rounded border border-[#1A1A1A] bg-[#050505] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-[#AAA] flex items-center gap-1 font-mono">
                          <Cpu className="w-3 h-3 text-[#C5A358]" />
                          Synthesis Prompt Configuration
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                          className="text-[10px] text-[#C5A358] hover:underline cursor-pointer"
                        >
                          {isEditingPrompt ? 'Collapse Prompt' : 'Fine-Tune Prompt'}
                        </button>
                      </div>

                      {isEditingPrompt ? (
                        <div className="space-y-1.5">
                          <textarea
                            value={avatarPrompt}
                            onChange={(e) => setAvatarPrompt(e.target.value)}
                            rows={3}
                            className="w-full p-2 rounded border border-[#222] bg-[#0A0A0A] text-[10px] text-[#DDD] font-mono focus:outline-none focus:border-[#C5A358]"
                          />
                          <button
                            type="button"
                            onClick={() => handleGenerateAvatar()}
                            className="px-2.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#252525] text-[#EEE] text-[10px] font-medium cursor-pointer"
                          >
                            Re-synthesize with Custom Prompt
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#666] font-mono line-clamp-2 leading-relaxed">
                          {avatarPrompt}
                        </p>
                      )}
                    </div>

                    {/* Alternate Candidate Variations */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">
                          Alternative AI Candidate Portraits
                        </span>
                        <span className="text-[9px] text-[#666]">Click to swap active portrait</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {avatarVariations.slice(0, 4).map((variant, idx) => {
                          const isCurrent = avatarUrl === variant.url;
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setAvatarUrl(variant.url);
                                setAvatarSource('ai_curated_neural');
                              }}
                              className={`group relative rounded border aspect-square overflow-hidden cursor-pointer transition ${
                                isCurrent
                                  ? 'border-[#C5A358] ring-1 ring-[#C5A358]'
                                  : 'border-[#1A1A1A] opacity-70 hover:opacity-100 hover:border-[#444]'
                              }`}
                            >
                              <img
                                src={variant.url}
                                alt={variant.label}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              {isCurrent && (
                                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#C5A358] text-black flex items-center justify-center text-[9px] font-bold">
                                  ✓
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/70 p-0.5 text-center">
                                <span className="text-[8px] text-[#CCC] block truncate">
                                  {variant.badge || `Candidate ${idx + 1}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PROFESSIONAL ROLE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Seniority Level</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value as any)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white capitalize"
                >
                  {['junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'executive'].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hierarchy & Reporting Line */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Reports To (Manager)</label>
                  <select
                    value={reportsTo || 'none'}
                    onChange={(e) => setReportsTo(e.target.value === 'none' ? undefined : e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  >
                    <option value="none">None (Top Executive)</option>
                    {existingAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName} — {a.jobTitle} ({a.department})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Department Role</label>
                  <select
                    value={departmentRole}
                    onChange={(e) => setDepartmentRole(e.target.value as 'lead' | 'member')}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  >
                    <option value="member">Team Member / Contributor</option>
                    <option value="lead">Department Lead / Principal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Primary Responsibility</label>
                <textarea
                  value={primaryResponsibility}
                  onChange={(e) => setPrimaryResponsibility(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Core Skills (Comma separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PERSONALITY DIMENSIONS (0-100) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Temperament</label>
                  <select
                    value={temperament}
                    onChange={(e) => setTemperament(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white capitalize"
                  >
                    {['calm', 'energetic', 'serious', 'warm', 'direct', 'methodical', 'analytical'].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Freeform Personality Essence
                  </label>
                  <input
                    type="text"
                    value={personalityDesc}
                    onChange={(e) => setPersonalityDesc(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-neutral-300 block">
                  Ten Personality Sliders (0 - 100)
                </span>

                {[
                  { key: 'analyticalVsIntuitive', left: 'Intuitive', right: 'Analytical' },
                  { key: 'formalVsCasual', left: 'Casual', right: 'Formal' },
                  { key: 'verboseVsConcise', left: 'Verbose', right: 'Concise' },
                  { key: 'cautiousVsFast', left: 'Fast-Moving', right: 'Cautious' },
                  { key: 'assertiveVsDeferential', left: 'Deferential', right: 'Assertive' },
                  { key: 'detailVsBigPicture', left: 'Big Picture', right: 'Detail-Oriented' }
                ].map((item) => {
                  const val = (dimensions as any)[item.key];
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>{item.left}</span>
                        <span className="font-mono text-indigo-400">{val} / 100</span>
                        <span>{item.right}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) =>
                          setDimensions({ ...dimensions, [item.key]: Number(e.target.value) })
                        }
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: COMMUNICATION STYLE */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Response Mode</label>
                  <select
                    value={communicationStyle.mode}
                    onChange={(e) =>
                      setCommunicationStyle({ ...communicationStyle, mode: e.target.value as any })
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white capitalize"
                  >
                    <option value="conclusion_first">Conclusion First (Executive)</option>
                    <option value="step_by_step">Step-by-Step (Systematic)</option>
                    <option value="socratic">Socratic (Inquisitive)</option>
                    <option value="conversational">Conversational (Collaborative)</option>
                    <option value="technical_spec">Technical Specification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Verbosity</label>
                  <select
                    value={communicationStyle.verbosity}
                    onChange={(e) =>
                      setCommunicationStyle({ ...communicationStyle, verbosity: e.target.value as any })
                    }
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white capitalize"
                  >
                    <option value="concise">Concise</option>
                    <option value="balanced">Balanced</option>
                    <option value="thorough">Thorough</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={communicationStyle.challengesUserDecisions}
                    onChange={(e) =>
                      setCommunicationStyle({
                        ...communicationStyle,
                        challengesUserDecisions: e.target.checked
                      })
                    }
                    className="accent-indigo-500 rounded"
                  />
                  <span>Challenges user assumptions when technically flawed</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={communicationStyle.proactivelySuggestsImprovements}
                    onChange={(e) =>
                      setCommunicationStyle({
                        ...communicationStyle,
                        proactivelySuggestsImprovements: e.target.checked
                      })
                    }
                    className="accent-indigo-500 rounded"
                  />
                  <span>Proactively offers improvements and flags edge-case risks</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: MODEL & TOOLS */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Model Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as any)}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white capitalize"
                  >
                    <option value="google">Google DeepMind (Gemini)</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Foundation Model</label>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      const def = getModelDetails(e.target.value);
                      setMaxTokens(def.maxTokens);
                    }}
                    className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                  >
                    {SUPPORTED_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.badge})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Model Details Preview */}
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-200">{selectedModelDetails.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border ${selectedModelDetails.badgeColor}`}>
                    {selectedModelDetails.badge} • {selectedModelDetails.speed}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">{selectedModelDetails.description}</p>
                <p className="text-[10px] text-neutral-500 font-mono">Recommended: {selectedModelDetails.recommendedFor}</p>
              </div>

              {/* Temperature Tuning */}
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Inference Temperature</span>
                  <span className="font-mono text-white font-bold">{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>0.0 (Strict / Focused)</span>
                  <span>1.0 (Creative)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Autonomy Level (1: Suggest only, 2: Draft, 3: Autonomous with review, 4: Fully autonomous)
                </label>
                <select
                  value={autonomyLevel}
                  onChange={(e) => setAutonomyLevel(Number(e.target.value) as any)}
                  className="w-full p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white"
                >
                  <option value={1}>Level 1: Passive Assistant (Requires confirmation for everything)</option>
                  <option value={2}>Level 2: Guided Operator (Drafts actions for approval)</option>
                  <option value={3}>Level 3: Autonomous Contributor (Executes with review checkpoints)</option>
                  <option value={4}>Level 4: Lead Autonomous Agent (Delegates, resolves conflicts)</option>
                </select>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-300">
                    Connected Enterprise Tools ({selectedTools.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomTool(!isAddingCustomTool)}
                    className="flex items-center gap-1 text-[11px] text-[#C5A358] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create Custom Tool</span>
                  </button>
                </div>

                {/* Custom Tool Creator Drawer */}
                {isAddingCustomTool && (
                  <div className="p-3 rounded-lg bg-neutral-900 border border-[#C5A358]/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-200">Define New Tool</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomTool(false)}
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tool Name (e.g. Jira Sync, Vector Indexer)"
                        value={customToolName}
                        onChange={(e) => setCustomToolName(e.target.value)}
                        className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-white"
                      />
                      <select
                        value={customToolCategory}
                        onChange={(e) => setCustomToolCategory(e.target.value as any)}
                        className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-white"
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
                      placeholder="Tool description..."
                      value={customToolDesc}
                      onChange={(e) => setCustomToolDesc(e.target.value)}
                      className="w-full p-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-white"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customToolApproval}
                          onChange={(e) => setCustomToolApproval(e.target.checked)}
                          className="rounded accent-[#C5A358]"
                        />
                        <span>Requires Human Approval</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
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
                            schema: {}
                          };

                          if (onAddGlobalTool) {
                            onAddGlobalTool(newTool);
                          }
                          setSelectedTools((prev) => [...prev, newToolId]);
                          setCustomToolName('');
                          setCustomToolDesc('');
                          setIsAddingCustomTool(false);
                        }}
                        className="px-2.5 py-1 rounded bg-[#C5A358] text-black text-xs font-semibold cursor-pointer"
                      >
                        Add & Equip
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter / Search Tools */}
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search available enterprise tools..."
                    value={toolSearch}
                    onChange={(e) => setToolSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-[#C5A358]"
                  />
                </div>

                {/* Tools Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {(tools.length > 0 ? tools : [
                    { id: 'tool-web-search', name: 'Web Search & Intelligence', description: 'Web resources & documentation', category: 'Research' as const, permission: 'READ' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-database-query', name: 'PostgreSQL Query Runner', description: 'Queries schema and SQL', category: 'Engineering' as const, permission: 'READ' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-github-prs', name: 'GitHub PR & Diff Reviewer', description: 'Pull request diffs & tests', category: 'Engineering' as const, permission: 'READ' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-security-scanner', name: 'Trivy / Snyk Security Scanner', description: 'Vulnerability CVE scanner', category: 'Engineering' as const, permission: 'READ' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-financial-modeling', name: 'Financial Runway Estimator', description: 'Runway & infrastructure TCO', category: 'Finance' as const, permission: 'READ' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-doc-gen', name: 'Artifact & Document Generator', description: 'Markdown RFCs & specs', category: 'Productivity' as const, permission: 'WRITE' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-vector-indexer', name: 'pgvector Knowledge Indexer', description: 'Embeddings & knowledge store', category: 'Research' as const, permission: 'WRITE' as const, requiresApproval: false, schema: {} },
                    { id: 'tool-cloud-deploy', name: 'Cloud Infrastructure Deployer', description: 'Deploys container revisions', category: 'Engineering' as const, permission: 'EXECUTE' as const, requiresApproval: true, schema: {} },
                    { id: 'tool-notification-dispatch', name: 'Slack & Webhook Dispatcher', description: 'Operational broadcast alerts', category: 'Communication' as const, permission: 'WRITE' as const, requiresApproval: false, schema: {} }
                  ])
                    .filter((t) =>
                      t.name.toLowerCase().includes(toolSearch.toLowerCase()) ||
                      t.description.toLowerCase().includes(toolSearch.toLowerCase()) ||
                      t.category.toLowerCase().includes(toolSearch.toLowerCase())
                    )
                    .map((t) => {
                      const isSelected = selectedTools.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`p-2 rounded-lg border flex items-start justify-between gap-2 cursor-pointer transition ${
                            isSelected
                              ? 'bg-neutral-900 border-[#C5A358]/50 text-white'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTools([...selectedTools, t.id]);
                                } else {
                                  setSelectedTools(selectedTools.filter((x) => x !== t.id));
                                }
                              }}
                              className="accent-[#C5A358] rounded mt-0.5"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-medium ${isSelected ? 'text-[#C5A358]' : 'text-neutral-200'}`}>
                                  {t.name}
                                </span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-500 border border-neutral-800">
                                  {t.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-neutral-500 line-clamp-1">{t.description}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-neutral-500 shrink-0">
                            {t.permission}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {isCreating && (
                <div className="p-4 rounded-xl bg-indigo-950/50 border border-indigo-700/60 text-indigo-200 text-xs flex items-center gap-3 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>{creationStage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || isCreating}
            className="px-3.5 py-2 rounded border border-[#1A1A1A] bg-[#0A0A0A] hover:bg-[#111] text-[#AAA] hover:text-[#FFF] text-xs font-medium flex items-center gap-1 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="px-4 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={isCreating}
              className="px-5 py-2 rounded bg-[#C5A358] hover:bg-[#D4B56C] text-black text-xs font-semibold flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Deploy Coworker</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
