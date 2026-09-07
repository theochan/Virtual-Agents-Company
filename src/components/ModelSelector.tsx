import React, { useState, useEffect } from 'react';
import type { Agent, LLMConfig } from '../types';
import { api } from '../lib/api';

interface ModelSelectorProps {
  agent: Agent;
  onUpdateLLMConfig: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  compact?: boolean;
}
export const ModelSelector: React.FC<ModelSelectorProps> = ({ agent, onUpdateLLMConfig }) => {
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [catalog, setCatalog] = useState<Record<string, { downloadedModels?: string[] }>>({});
  useEffect(() => {
    const value = agent.llmConfig.model;
    const prefix = value.startsWith('ollama:') ? 'ollama' : value.startsWith('hf:') ? 'huggingface' : undefined;
    const configured = prefix || (agent.llmConfig.localSource && String(agent.llmConfig.provider).toLowerCase() === 'local' ? agent.llmConfig.localSource : String(agent.llmConfig.provider).toLowerCase());
    const normalized = configured === 'claude' ? 'anthropic' : configured;
    setProvider(['ollama', 'anthropic', 'openai', 'huggingface', 'qwen'].includes(normalized) ? normalized : '');
    setModel(value.replace(/^(ollama:|hf:)/, '')); setTemperature(agent.llmConfig.temperature ?? 0.2);
  }, [agent.id, agent.llmConfig.model, agent.llmConfig.provider, agent.llmConfig.temperature]);
  useEffect(() => { void api('/api/admin/llm-settings').then(setCatalog).catch(() => {}); }, []);
  return <details className="relative text-xs">
    <summary className="cursor-pointer border rounded-lg p-2 bg-white">Model: {agent.llmConfig.model}</summary>
    <div className="absolute z-30 top-full left-0 mt-2 w-80 border rounded-xl bg-white shadow-lg p-4 space-y-3">
      <label className="block">Provider<select className="block border rounded p-2 w-full mt-1" value={provider} onChange={e => { setProvider(e.target.value); setModel(''); }}>
        <option value="" disabled>Select a supported provider</option><option value="ollama">Ollama</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="huggingface">Hugging Face compatible</option><option value="qwen">Qwen compatible</option>
      </select></label>
      <label className="block">Model ID<input className="block border rounded p-2 w-full mt-1" list={`models-${agent.id}`} value={model} onChange={e => setModel(e.target.value)} placeholder="Enter an available model ID" /></label>
      <datalist id={`models-${agent.id}`}>{(catalog[provider === 'anthropic' ? 'claude' : provider]?.downloadedModels || []).map(name => <option key={name} value={name} />)}</datalist>
      <label className="block">Temperature: {temperature}<input className="block w-full mt-2" type="range" min="0" max="1" step="0.05" value={temperature} onChange={e => setTemperature(Number(e.target.value))} /></label>
      {!provider && <p className="text-amber-700">This saved provider is no longer supported. Select a provider and its model before running.</p>}
      <p className="text-slate-500">Refresh model discovery in Settings. A listed model is not proof of working inference.</p>
      <button className="bg-slate-900 text-white px-3 py-2 rounded disabled:opacity-40" disabled={!provider || !model.trim()} onClick={() => onUpdateLLMConfig(agent.id, { provider: provider as LLMConfig['provider'], model: model.trim(), temperature, maxTokens: 2048 })}>Save model</button>
    </div>
  </details>;
};
