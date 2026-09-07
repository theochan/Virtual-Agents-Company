import React, { useState, useEffect } from 'react';
import type { Agent, LLMConfig } from '../types';
import { api } from '../lib/api';

interface ModelSelectorProps {
  agent: Agent;
  onUpdateLLMConfig: (agentId: string, newConfig: Partial<LLMConfig>) => void;
  compact?: boolean;
}
export const ModelSelector: React.FC<ModelSelectorProps> = ({ agent, onUpdateLLMConfig }) => {
  const [loading, setLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
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
  useEffect(() => { void api('/api/admin/llm-settings').then(value => setCatalog(old => ({ ...value, ...old }))).catch(() => {}); }, []);
  const local = provider === 'ollama';
  const models = catalog[provider === 'anthropic' ? 'claude' : provider]?.downloadedModels || [];
  const refreshModels = async (source = provider) => {
    if (!['ollama', 'huggingface'].includes(source)) return;
    setLoading(true); setDiscoveryError('');
    try {
      const result = await api<{ success: boolean; models: string[]; message?: string }>('/api/admin/local-models/test-connection', 'POST', { source });
      if (!result.success) { setDiscoveryError(result.message || 'Model discovery failed.'); return; }
      setCatalog(old => ({ ...old, [source]: { downloadedModels: result.models } }));
    } catch (error) { setDiscoveryError(error instanceof Error ? error.message : 'Model discovery failed.'); }
    finally { setLoading(false); }
  };
  return <details className="relative text-xs" onToggle={e => { if (e.currentTarget.open) void refreshModels(); }}>
    <summary className="cursor-pointer border rounded-lg p-2 bg-white">Model: {agent.llmConfig.model}</summary>
    <div className="absolute z-30 top-full left-0 mt-2 w-80 border rounded-xl bg-white shadow-lg p-4 space-y-3">
      <label className="block">Provider<select className="block border rounded p-2 w-full mt-1" value={provider} onChange={e => { setProvider(e.target.value); setModel(''); void refreshModels(e.target.value); }}>
        <option value="" disabled>Select a supported provider</option><option value="ollama">Ollama</option><option value="anthropic">Anthropic</option><option value="openai">OpenAI</option><option value="huggingface">Hugging Face compatible</option><option value="qwen">Qwen compatible</option>
      </select></label>
      {local ? <>
        <label className="block">Model ID<select aria-label="Model ID" className="block border rounded p-2 w-full mt-1" value={model} onChange={e => setModel(e.target.value)}>
          <option value="" disabled>Select an installed model</option>
          {model && !models.includes(model) && <option value={model}>{model} (saved; not discovered)</option>}
          {models.map(name => <option key={name} value={name}>{name}</option>)}
        </select></label>
        <button className="underline text-slate-600 disabled:opacity-50" disabled={loading} onClick={() => void refreshModels()}>{loading ? 'Refreshing models…' : 'Refresh models'}</button>
        {discoveryError && <p role="alert" className="text-amber-800">{discoveryError}</p>}
        {!loading && !models.length && <p className="text-slate-500">No installed models discovered. Check the provider connection in Settings.</p>}
      </> : <label className="block">Model ID<input className="block border rounded p-2 w-full mt-1" list={`models-${agent.id}`} value={model} onChange={e => setModel(e.target.value)} placeholder="Enter an available model ID" /><datalist id={`models-${agent.id}`}>{models.map(name => <option key={name} value={name} />)}</datalist></label>}
      <label className="block">Temperature: {temperature}<input className="block w-full mt-2" type="range" min="0" max="1" step="0.05" value={temperature} onChange={e => setTemperature(Number(e.target.value))} /></label>
      {!provider && <p className="text-amber-700">This saved provider is no longer supported. Select a provider and its model before running.</p>}
      <p className="text-slate-500">Choose a model, then save. Discovery does not test inference.</p>
      <button className="bg-slate-900 text-white px-3 py-2 rounded disabled:opacity-40" disabled={!provider || !model.trim()} onClick={() => onUpdateLLMConfig(agent.id, { provider: provider as LLMConfig['provider'], model: model.trim(), temperature, maxTokens: 2048 })}>Save model</button>
    </div>
  </details>;
};
