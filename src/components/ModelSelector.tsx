import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronDown, Check, Zap, Sliders, Info, HardDrive, Plus, Terminal } from 'lucide-react';
import { Agent, LLMConfig } from '../types';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';

interface ModelSelectorProps {
  agent: Agent;
  onUpdateLLMConfig: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ agent, onUpdateLLMConfig, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'cloud' | 'ollama' | 'hf'>('all');
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModelId = agent.llmConfig?.model || 'gemini-3.8-flash';
  const currentDetails = getModelDetails(currentModelId);
  const currentTemp = agent.llmConfig?.temperature ?? 0.2;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleSelectModel = (modelId: string) => {
    const modelDef = getModelDetails(modelId);
    onUpdateLLMConfig(agent.id, {
      model: modelId,
      maxTokens: modelDef.maxTokens,
      temperature: agent.llmConfig?.temperature ?? modelDef.defaultTemp,
      isLocal: modelDef.isLocal || false,
      localSource: modelDef.localSource,
      localEndpoint: modelDef.endpoint,
      provider: modelDef.isLocal
        ? modelDef.localSource === 'ollama'
          ? 'ollama'
          : 'huggingface'
        : 'google'
    });
  };

  const handleApplyCustomTag = (source: 'ollama' | 'hf') => {
    if (!customTagInput.trim()) return;
    const tag = customTagInput.trim();
    const modelId = source === 'ollama' ? `ollama:${tag}` : `hf:${tag}`;
    handleSelectModel(modelId);
    setCustomTagInput('');
    setShowCustomInput(false);
  };

  const handleTemperatureChange = (val: number) => {
    onUpdateLLMConfig(agent.id, {
      temperature: val
    });
  };

  const getTempDescription = (temp: number) => {
    if (temp <= 0.1) return 'Deterministic & strict adherence';
    if (temp <= 0.3) return 'Focused, analytical & precise';
    if (temp <= 0.6) return 'Balanced reasoning & natural flow';
    return 'Highly creative & exploratory';
  };

  const filteredModels = SUPPORTED_MODELS.filter((item) => {
    if (activeCategory === 'cloud') return !item.isLocal;
    if (activeCategory === 'ollama') return item.localSource === 'ollama';
    if (activeCategory === 'hf') return item.localSource === 'huggingface';
    return true;
  });

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        id="btn-model-selector"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-amber-400 hover:bg-slate-50 text-slate-700 text-xs font-mono transition cursor-pointer shadow-xs group ${
          currentDetails.isLocal ? 'border-orange-300' : ''
        }`}
        title="Change LLM Foundation Model & Parameters (Cloud & Local Models)"
        aria-expanded={isOpen}
      >
        {currentDetails.isLocal ? (
          <HardDrive className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
        ) : (
          <Cpu className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
        )}
        <span className="font-semibold text-slate-800">{currentDetails.name}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-sans ${currentDetails.badgeColor}`}>
          {currentDetails.badge}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="model-dropdown-menu"
          className="absolute right-0 mt-2 w-88 sm:w-[420px] rounded-xl bg-white border border-slate-200 shadow-2xl p-3.5 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-900 font-semibold font-sans">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Model & Local Engine Config</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
              {currentDetails.isLocal ? (
                <span className="text-orange-600 font-semibold flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Local Engine Active
                </span>
              ) : (
                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Cloud API</span>
              )}
            </div>
          </div>

          {/* Category Tabs: All / Cloud / Ollama / Hugging Face */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px]">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex-1 py-1 rounded-md text-center transition cursor-pointer font-sans ${
                activeCategory === 'all'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveCategory('cloud')}
              className={`flex-1 py-1 rounded-md text-center transition cursor-pointer font-sans ${
                activeCategory === 'cloud'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cloud
            </button>
            <button
              onClick={() => setActiveCategory('ollama')}
              className={`flex-1 py-1 rounded-md text-center transition cursor-pointer font-sans flex items-center justify-center gap-1 ${
                activeCategory === 'ollama'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-orange-600'
              }`}
            >
              <span>🦙 Ollama</span>
            </button>
            <button
              onClick={() => setActiveCategory('hf')}
              className={`flex-1 py-1 rounded-md text-center transition cursor-pointer font-sans flex items-center justify-center gap-1 ${
                activeCategory === 'hf'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span>🤗 HF Local</span>
            </button>
          </div>

          {/* Model Options List */}
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
            {filteredModels.map((item) => {
              const isSelected = item.id.toLowerCase() === currentModelId.toLowerCase();
              return (
                <button
                  key={item.id}
                  id={`model-option-${item.id}`}
                  onClick={() => handleSelectModel(item.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 font-sans">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                      {item.parameters && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 border border-slate-300/80 font-mono">
                          {item.parameters}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />}
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                    <span>
                      {item.isLocal ? (
                        <span className="text-orange-600 flex items-center gap-1 font-semibold">
                          <Terminal className="w-3 h-3 inline" />
                          {item.endpoint}
                        </span>
                      ) : (
                        <>Speed: <strong className="text-slate-600 font-medium">{item.speed}</strong></>
                      )}
                    </span>
                    <span>Max: {item.maxTokens.toLocaleString()} tokens</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Local Model Tag Drawer */}
          <div className="pt-1">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full py-1.5 text-[11px] text-amber-800 hover:text-amber-900 flex items-center justify-center gap-1.5 border border-dashed border-amber-300/80 hover:border-amber-400 rounded-lg bg-amber-50/40 hover:bg-amber-50 transition cursor-pointer font-medium"
              >
                <Plus className="w-3 h-3 text-amber-700" />
                <span>Specify Custom Local Model Tag (Ollama / Hugging Face)</span>
              </button>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                  <span>Enter Local Model Tag / Repo ID</span>
                  <button
                    onClick={() => setShowCustomInput(false)}
                    className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. llama3.2:1b, codellama:7b, or meta-llama/Llama-3.2-1B"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-xs text-slate-900 outline-none font-mono placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApplyCustomTag('ollama')}
                    className="flex-1 py-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
                  >
                    Apply to Ollama
                  </button>
                  <button
                    onClick={() => handleApplyCustomTag('hf')}
                    className="flex-1 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition cursor-pointer shadow-xs"
                  >
                    Apply to Hugging Face
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Temperature Tuning Slider */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 text-slate-700 font-medium">
                <Sliders className="w-3 h-3 text-amber-600" />
                <span>Temperature:</span>
                <strong className="text-slate-900 font-mono">{currentTemp.toFixed(2)}</strong>
              </div>
              <span className="text-[10px] text-slate-500 italic">
                {getTempDescription(currentTemp)}
              </span>
            </div>

            <input
              id="model-temperature-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={currentTemp}
              onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />

            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>0.0 (Strict / Deterministic)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-1 text-[10px] text-slate-500 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Applied to {agent.displayName}&apos;s live executor.</span>
            </div>
            {currentDetails.isLocal && (
              <span className="text-orange-600 font-mono text-[9px] font-semibold">Local Daemon: 11434 / 8000</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

