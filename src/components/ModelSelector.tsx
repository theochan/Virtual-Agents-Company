import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ChevronDown, Check, Zap, Sliders, Info } from 'lucide-react';
import { Agent, LLMConfig } from '../types';
import { SUPPORTED_MODELS, getModelDetails } from '../lib/models';

interface ModelSelectorProps {
  agent: Agent;
  onUpdateLLMConfig: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ agent, onUpdateLLMConfig, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentModelId = agent.llmConfig?.model || 'gemini-3.8-flash';
  const currentDetails = getModelDetails(currentModelId);
  const currentTemp = agent.llmConfig?.temperature ?? 0.2;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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
      // Retain custom temperature or set to model default if unset
      temperature: agent.llmConfig?.temperature ?? modelDef.defaultTemp
    });
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

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        id="btn-model-selector"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#222] bg-[#0A0A0A] hover:border-[#C5A358]/50 hover:bg-[#111] text-[#CCC] text-xs font-mono transition cursor-pointer group"
        title="Change LLM Foundation Model & Parameters"
        aria-expanded={isOpen}
      >
        <Cpu className="w-3.5 h-3.5 text-[#C5A358] group-hover:scale-110 transition-transform" />
        <span className="font-medium text-[#E5E5E5]">{currentDetails.name}</span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-sans ${currentDetails.badgeColor}`}>
          {currentDetails.badge}
        </span>
        <ChevronDown className={`w-3 h-3 text-[#777] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#C5A358]' : ''}`} />
      </button>

      {isOpen && (
        <div
          id="model-dropdown-menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0C0C0C] border border-[#262626] shadow-2xl p-3 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-1.5 text-[#EEE] font-medium font-sans">
              <Zap className="w-3.5 h-3.5 text-[#C5A358]" />
              <span>Foundation Model Engine</span>
            </div>
            <span className="text-[10px] text-[#777] font-mono">Google Gemini</span>
          </div>

          {/* Model Options List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
            {SUPPORTED_MODELS.map((item) => {
              const isSelected = item.id.toLowerCase() === currentModelId.toLowerCase();
              return (
                <button
                  key={item.id}
                  id={`model-option-${item.id}`}
                  onClick={() => handleSelectModel(item.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#151515] border-[#C5A358]/60 shadow-sm'
                      : 'bg-[#080808] border-[#181818] hover:border-[#333] hover:bg-[#101010]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-100 font-sans">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#C5A358]" />}
                  </div>

                  <p className="text-[11px] text-[#888] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#666] pt-1 font-mono">
                    <span>Speed: <strong className="text-[#AAA] font-normal">{item.speed}</strong></span>
                    <span>Max: {item.maxTokens.toLocaleString()} tokens</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Temperature Tuning Slider */}
          <div className="pt-2 border-t border-[#1A1A1A] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 text-[#AAA]">
                <Sliders className="w-3 h-3 text-[#C5A358]" />
                <span>Temperature:</span>
                <strong className="text-white font-mono">{currentTemp.toFixed(2)}</strong>
              </div>
              <span className="text-[10px] text-[#777] italic">
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
              className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#C5A358]"
            />

            <div className="flex justify-between text-[9px] text-[#555] font-mono">
              <span>0.0 (Strict / Deterministic)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-1 text-[10px] text-[#555] flex items-center gap-1">
            <Info className="w-3 h-3 text-[#666] shrink-0" />
            <span>Applied directly to {agent.displayName}&apos;s live prompt compiler.</span>
          </div>
        </div>
      )}
    </div>
  );
};
