import { apiFetch } from '../lib/api';
import React, { useState, useEffect } from 'react';
import {
  Key,
  Cpu,
  ShieldCheck,
  Save,
  CheckCircle2,
  Server,
  Layers,
  HardDrive,
  Activity,
  Plus,
  Trash2,
  Terminal,
  FolderGit2,
  Globe,
  Search,
  ExternalLink
} from 'lucide-react';
import { Agent } from '../types';

interface AdminSettingsViewProps {
  agents: Agent[];
  onUpdateAgentModel?: (agentId: string, model: string) => void;
}

interface SearchSettingsState {
  activeProvider: 'auto' | 'tavily' | 'brave' | 'duckduckgo';
  tavily: {
    isConfigured: boolean;
    apiKeyMasked: string;
  };
  brave: {
    isConfigured: boolean;
    apiKeyMasked: string;
  };
}

interface ProviderConfig {
  defaultModel: string;
  apiKeyMasked?: string;
  hfTokenMasked?: string;
  isConfigured: boolean;
  endpoint?: string;
  downloadedModels?: string[];
  localCacheDir?: string;
  status?: string;
  enabled?: boolean;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  agents,
  onUpdateAgentModel,
}) => {
  const [settings, setSettings] = useState<Record<string, ProviderConfig>>({
    claude: { defaultModel: 'claude-3-5-sonnet', apiKeyMasked: '', isConfigured: false },
    openai: { defaultModel: 'gpt-4o', apiKeyMasked: '', isConfigured: false },
    qwen: { defaultModel: 'qwen-plus', apiKeyMasked: '', isConfigured: false },
    ollama: {
      defaultModel: 'llama3.2:latest',
      endpoint: 'http://localhost:11434',
      downloadedModels: [],
      isConfigured: false,
      status: 'not-tested'
    },
    huggingface: {
      defaultModel: 'meta-llama/Llama-3.2-3B-Instruct',
      endpoint: 'http://localhost:8000/v1',
      downloadedModels: [],
      localCacheDir: '~/.cache/huggingface/hub',
      isConfigured: false,
      status: 'not-tested'
    }
  });

  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [qwenKeyInput, setQwenKeyInput] = useState('');
  const [claudeKeyInput, setClaudeKeyInput] = useState('');
  const [hfTokenInput, setHfTokenInput] = useState('');

  // Local model inputs
  const [ollamaEndpointInput, setOllamaEndpointInput] = useState('http://localhost:11434');
  const [newOllamaModelInput, setNewOllamaModelInput] = useState('');
  const [hfEndpointInput, setHfEndpointInput] = useState('http://localhost:8000/v1');
  const [newHfModelInput, setNewHfModelInput] = useState('');

  // Test states
  const [testingOllama, setTestingOllama] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);

  const [testingHf, setTestingHf] = useState(false);
  const [hfTestResult, setHfTestResult] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);

  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Search Engine State
  const [searchSettings, setSearchSettings] = useState<SearchSettingsState>({
    activeProvider: 'auto',
    tavily: { isConfigured: false, apiKeyMasked: '' },
    brave: { isConfigured: false, apiKeyMasked: '' }
  });
  const [tavilyKeyInput, setTavilyKeyInput] = useState('');
  const [braveKeyInput, setBraveKeyInput] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchSaveSuccess, setSearchSaveSuccess] = useState(false);
  const [testingTavily, setTestingTavily] = useState(false);
  const [tavilyTestResult, setTavilyTestResult] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);
  const [testingBrave, setTestingBrave] = useState(false);
  const [braveTestResult, setBraveTestResult] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);

  useEffect(() => {
    apiFetch('/api/admin/llm-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setSettings(data);
          if (data.ollama?.endpoint) setOllamaEndpointInput(data.ollama.endpoint);
          if (data.huggingface?.endpoint) setHfEndpointInput(data.huggingface.endpoint);
        }
      })
      .catch((err) => console.log('Could not load LLM settings:', err));

    apiFetch('/api/admin/search-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setSearchSettings(data);
        }
      })
      .catch((err) => console.log('Could not load search settings:', err));
  }, []);

  const handleSaveSearchSettings = async (override?: { activeProvider?: 'auto' | 'tavily' | 'brave' | 'duckduckgo'; tavilyKey?: string; braveKey?: string }) => {
    setSavingSearch(true);
    setSearchSaveSuccess(false);
    try {
      const payload: any = {};
      if (override?.activeProvider !== undefined) payload.activeProvider = override.activeProvider;
      else payload.activeProvider = searchSettings.activeProvider;

      if (override?.tavilyKey !== undefined) payload.tavilyApiKey = override.tavilyKey;

      if (override?.braveKey !== undefined) payload.braveApiKey = override.braveKey;

      const res = await apiFetch('/api/admin/search-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchSettings(data.settings);
        setSearchSaveSuccess(true);
        if (payload.tavilyApiKey !== undefined) setTavilyKeyInput('');
        if (payload.braveApiKey !== undefined) setBraveKeyInput('');
        setTimeout(() => setSearchSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save search settings:', err);
    } finally {
      setSavingSearch(false);
    }
  };

  const handleTestSearchConnection = async (provider: 'tavily' | 'brave') => {
    if (provider === 'tavily') {
      setTestingTavily(true);
      setTavilyTestResult(null);
    } else {
      setTestingBrave(true);
      setBraveTestResult(null);
    }

    try {
      const apiKey = provider === 'tavily' ? (tavilyKeyInput.trim() || undefined) : (braveKeyInput.trim() || undefined);
      const res = await apiFetch('/api/admin/search/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      if (provider === 'tavily') {
        setTavilyTestResult({
          connected: data.connected,
          message: data.message,
          latencyMs: data.latencyMs,
        });
      } else {
        setBraveTestResult({
          connected: data.connected,
          message: data.message,
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      const result = {
        connected: false,
        message: `Failed to test ${provider}: ${err.message}`,
      };
      if (provider === 'tavily') setTavilyTestResult(result);
      else setBraveTestResult(result);
    } finally {
      if (provider === 'tavily') setTestingTavily(false);
      else setTestingBrave(false);
    }
  };

  const handleSaveProvider = async (provider: string, payload: Record<string, any>) => {
    setSavingProvider(provider);
    setSaveSuccess(null);
    try {
      const res = await apiFetch('/api/admin/llm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSaveSuccess(provider);
        if (provider === 'openai') setOpenaiKeyInput('');
        if (provider === 'qwen') setQwenKeyInput('');
        if (provider === 'claude') setClaudeKeyInput('');
        if (provider === 'huggingface') setHfTokenInput('');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleTestConnection = async (source: 'ollama' | 'huggingface') => {
    if (source === 'ollama') {
      setTestingOllama(true);
      setOllamaTestResult(null);
    } else {
      setTestingHf(true);
      setHfTestResult(null);
    }

    try {
      const endpoint = source === 'ollama' ? ollamaEndpointInput : hfEndpointInput;
      const res = await apiFetch('/api/admin/local-models/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, endpoint }),
      });
      const data = await res.json();
      if (source === 'ollama') {
        setOllamaTestResult({
          connected: data.connected,
          message: data.message || (data.connected ? 'Daemon online' : 'Standby mode'),
          latencyMs: data.latencyMs
        });
      } else {
        setHfTestResult({
          connected: data.connected,
          message: data.message || (data.connected ? 'Model catalog reachable' : 'Connection failed'),
          latencyMs: data.latencyMs
        });
      }
    } catch {
      const result = { connected: false, message: 'Connection failed. No local model or cache was verified.', latencyMs: 0 };
      if (source === 'ollama') setOllamaTestResult(result);
      else setHfTestResult(result);
    } finally {
      if (source === 'ollama') setTestingOllama(false);
      else setTestingHf(false);
    }
  };

  const handleAddLocalModel = async (source: 'ollama' | 'huggingface', modelTag: string) => {
    if (!modelTag.trim()) return;
    try {
      const res = await apiFetch('/api/admin/local-models/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, modelTag: modelTag.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          [source]: {
            ...prev[source],
            downloadedModels: data.models,
          },
        }));
        if (source === 'ollama') setNewOllamaModelInput('');
        if (source === 'huggingface') setNewHfModelInput('');
      }
    } catch (err) {
      console.error('Failed to add model:', err);
    }
  };

  const handleRemoveLocalModel = async (source: 'ollama' | 'huggingface', modelTag: string) => {
    try {
      const res = await apiFetch('/api/admin/local-models/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, modelTag }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          [source]: {
            ...prev[source],
            downloadedModels: data.models,
          },
        }));
      }
    } catch (err) {
      console.error('Failed to remove model:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F9FA] text-slate-800 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-center text-amber-700 shadow-2xs">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-slate-900 tracking-tight">Model & Provider Configuration</h2>
            <p className="text-xs text-slate-500">
              Manage Cloud LLMs and Local Offline Models downloaded via Ollama or Hugging Face.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Dual Engine (Cloud + Local)
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Security / Architecture Notice */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-slate-700 flex items-start gap-3.5 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-900 block font-serif">Hybrid Cloud & Local Model Infrastructure</span>
            <p className="leading-relaxed text-slate-600">
              You can run agents on Anthropic Claude, OpenAI, or execute completely locally on your hardware via <strong>Ollama</strong> (<code className="px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900">localhost:11434</code>) or <strong>Hugging Face Hub</strong> weights (<code className="px-1.5 py-0.5 rounded bg-white border border-amber-200 text-amber-900">localhost:8000</code>). Local inference depends on the configured server. Web search sends queries to external services even when the model runs locally.
            </p>
          </div>
        </div>

        {/* SECTION: Local Model Engines (Ollama & Hugging Face) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-orange-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Local LLM Engines (Ollama & Hugging Face)
              </h3>
            </div>
            <span className="text-[10px] text-orange-700 font-mono font-medium">
              Local inference endpoints
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Ollama Local Daemon */}
            <div className="p-5 rounded-2xl border border-orange-200 bg-white flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="text-base">🦙</span>
                    Ollama Local Engine
                  </span>
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    ACTIVE LOCAL
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Direct IPC/HTTP connection to local Ollama daemon. Supports downloaded quantized GGUF models.
                </p>

                {/* Endpoint & Test */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">Daemon Endpoint</label>
                    <button
                      onClick={() => handleTestConnection('ollama')}
                      disabled={testingOllama}
                      className="text-[10px] text-orange-700 hover:text-orange-800 flex items-center gap-1 transition cursor-pointer font-medium"
                    >
                      <Activity className={`w-3 h-3 ${testingOllama ? 'animate-spin' : ''}`} />
                      <span>{testingOllama ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={ollamaEndpointInput}
                    onChange={(e) => setOllamaEndpointInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none font-mono focus:ring-2 focus:ring-orange-500/20"
                    placeholder="http://localhost:11434"
                  />
                </div>

                {/* Test Feedback */}
                {ollamaTestResult && (
                  <div className="p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-[10px] text-slate-700 font-mono flex items-center justify-between">
                    <span>{ollamaTestResult.message}</span>
                    {ollamaTestResult.latencyMs && (
                      <span className="text-orange-700 font-semibold">{ollamaTestResult.latencyMs}ms</span>
                    )}
                  </div>
                )}

                {/* Default Model */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">Default Local Model</label>
                  <select
                    value={settings.ollama?.defaultModel || 'llama3.2:latest'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        ollama: { ...prev.ollama, defaultModel: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none cursor-pointer font-mono focus:ring-2 focus:ring-orange-500/20"
                  >
                    {(settings.ollama?.downloadedModels || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Downloaded Models List */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-medium block">
                    Downloaded Ollama Models ({settings.ollama?.downloadedModels?.length || 0})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {(settings.ollama?.downloadedModels || []).map((model) => (
                      <span
                        key={model}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-[10px] text-orange-900 font-mono font-medium"
                      >
                        <Terminal className="w-2.5 h-2.5 text-orange-600" />
                        {model}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalModel('ollama', model)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer ml-0.5"
                          title="Remove from registry"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add model input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. llama3.2:1b, codellama:7b"
                      value={newOllamaModelInput}
                      onChange={(e) => setNewOllamaModelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLocalModel('ollama', newOllamaModelInput);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] text-slate-900 outline-none font-mono focus:ring-2 focus:ring-orange-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLocalModel('ollama', newOllamaModelInput)}
                      className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveProvider('ollama', {
                    endpoint: ollamaEndpointInput,
                    defaultModel: settings.ollama?.defaultModel || 'llama3.2:latest',
                    downloadedModels: settings.ollama?.downloadedModels || []
                  })
                }
                disabled={savingProvider === 'ollama'}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {saveSuccess === 'ollama' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Settings Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-orange-400" />
                    <span>Save Ollama Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Hugging Face Local Hub */}
            <div className="p-5 rounded-2xl border border-amber-200 bg-white flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="text-base">🤗</span>
                    Hugging Face Local Hub
                  </span>
                  <span className="text-[9px] px-2.5 py-0.5 rounded-full font-mono bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    ACTIVE LOCAL
                  </span>
                </div>

                <p className="text-[11px] text-slate-500">
                  Offline local weight cache or local OpenAI-compatible inference server (vLLM / TGI / llama.cpp).
                </p>

                {/* Endpoint & Test */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">Local Server / Cache Endpoint</label>
                    <button
                      onClick={() => handleTestConnection('huggingface')}
                      disabled={testingHf}
                      className="text-[10px] text-amber-800 hover:text-amber-900 flex items-center gap-1 transition cursor-pointer font-medium"
                    >
                      <Activity className={`w-3 h-3 ${testingHf ? 'animate-spin' : ''}`} />
                      <span>{testingHf ? 'Testing...' : 'Verify Cache'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={hfEndpointInput}
                    onChange={(e) => setHfEndpointInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none font-mono focus:ring-2 focus:ring-amber-500/20"
                    placeholder="http://localhost:8000/v1"
                  />
                </div>

                {/* Test Feedback */}
                {hfTestResult && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-slate-700 font-mono flex items-center justify-between">
                    <span>{hfTestResult.message}</span>
                    {hfTestResult.latencyMs && (
                      <span className="text-amber-700 font-semibold">{hfTestResult.latencyMs}ms</span>
                    )}
                  </div>
                )}

                {/* HF Token (Optional) */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">HF Access Token (Gated Weights)</label>
                  <input
                    type="password"
                    placeholder={settings.huggingface?.hfTokenMasked || 'hf_... (optional for gated weights)'}
                    value={hfTokenInput}
                    onChange={(e) => setHfTokenInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                {/* Default Model */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">Default Local HF Model</label>
                  <select
                    value={settings.huggingface?.defaultModel || 'meta-llama/Llama-3.2-3B-Instruct'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        huggingface: { ...prev.huggingface, defaultModel: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none cursor-pointer font-mono focus:ring-2 focus:ring-amber-500/20"
                  >
                    {(settings.huggingface?.downloadedModels || []).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Downloaded Models List */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] uppercase font-mono text-slate-500 font-medium block">
                    Downloaded HF Models ({settings.huggingface?.downloadedModels?.length || 0})
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {(settings.huggingface?.downloadedModels || []).map((model) => (
                      <span
                        key={model}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-[10px] text-amber-900 font-mono font-medium"
                      >
                        <FolderGit2 className="w-2.5 h-2.5 text-amber-700" />
                        {model}
                        <button
                          type="button"
                          onClick={() => handleRemoveLocalModel('huggingface', model)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer ml-0.5"
                          title="Remove from registry"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add model input */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. meta-llama/Llama-3.2-1B"
                      value={newHfModelInput}
                      onChange={(e) => setNewHfModelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddLocalModel('huggingface', newHfModelInput);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] text-slate-900 outline-none font-mono focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLocalModel('huggingface', newHfModelInput)}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveProvider('huggingface', {
                    endpoint: hfEndpointInput,
                    defaultModel: settings.huggingface?.defaultModel || 'meta-llama/Llama-3.2-3B-Instruct',
                    apiKey: hfTokenInput,
                    downloadedModels: settings.huggingface?.downloadedModels || []
                  })
                }
                disabled={savingProvider === 'huggingface'}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                {saveSuccess === 'huggingface' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Settings Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save Hugging Face Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: Cloud AI Providers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-800">
              <Server className="w-4 h-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Cloud AI Providers (Anthropic, OpenAI, Qwen)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Anthropic Claude */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-amber-700" />
                    Anthropic Claude
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                      settings.claude?.isConfigured
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {settings.claude?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">Primary cloud engine for reasoning, synthesis, and memory.</p>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">Default Model</label>
                    <select
                      value={settings.claude?.defaultModel || 'claude-3-5-sonnet'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          claude: { ...prev.claude, defaultModel: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    >
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Recommended)</option>
                      <option value="claude-3-5-haiku">Claude 3.5 Haiku (Fast)</option>
                      <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Thinking)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">API Key</label>
                    <input
                      type="password"
                      placeholder={settings.claude?.apiKeyMasked || 'Enter Anthropic API key (sk-ant-...)'}
                      value={claudeKeyInput}
                      onChange={(e) => setClaudeKeyInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveProvider('claude', {
                    apiKey: claudeKeyInput,
                    defaultModel: settings.claude?.defaultModel || 'claude-3-5-sonnet'
                  })
                }
                disabled={savingProvider === 'claude'}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {saveSuccess === 'claude' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Update Claude</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. OpenAI */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-600" />
                    OpenAI
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                      settings.openai?.isConfigured
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {settings.openai?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">GPT-4o, GPT-4o Mini, and o3-mini models for coworkers.</p>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">Default Model</label>
                    <select
                      value={settings.openai?.defaultModel || 'gpt-4o'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          openai: { ...prev.openai, defaultModel: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      <option value="gpt-4o">GPT-4o (Omni multimodal)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Cost efficient)</option>
                      <option value="o3-mini">o3-mini (High reasoning)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">API Key</label>
                    <input
                      type="password"
                      placeholder={settings.openai?.apiKeyMasked || 'sk-...'}
                      value={openaiKeyInput}
                      onChange={(e) => setOpenaiKeyInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveProvider('openai', {
                    apiKey: openaiKeyInput,
                    defaultModel: settings.openai?.defaultModel || 'gpt-4o'
                  })
                }
                disabled={savingProvider === 'openai'}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {saveSuccess === 'openai' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Update OpenAI</span>
                  </>
                )}
              </button>
            </div>

            {/* 3. Alibaba Cloud / Qwen */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Qwen (DashScope)
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                      settings.qwen?.isConfigured
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {settings.qwen?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">Qwen-Max, Qwen-Plus, and Qwen-Turbo high-throughput series.</p>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">Default Model</label>
                    <select
                      value={settings.qwen?.defaultModel || 'qwen-plus'}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          qwen: { ...prev.qwen, defaultModel: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    >
                      <option value="qwen-max">Qwen-Max (Deep Reasoning)</option>
                      <option value="qwen-plus">Qwen-Plus (Balanced)</option>
                      <option value="qwen-turbo">Qwen-Turbo (Fast)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-500 block mb-1 font-medium">API Key</label>
                    <input
                      type="password"
                      placeholder={settings.qwen?.apiKeyMasked || 'sk-dashscope-...'}
                      value={qwenKeyInput}
                      onChange={(e) => setQwenKeyInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  handleSaveProvider('qwen', {
                    apiKey: qwenKeyInput,
                    defaultModel: settings.qwen?.defaultModel || 'qwen-plus'
                  })
                }
                disabled={savingProvider === 'qwen'}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {saveSuccess === 'qwen' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-blue-400" />
                    <span>Update Qwen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION: Web Search & Real-Time Retrieval Engines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Web Search Providers
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[10px] uppercase font-mono text-slate-500 font-medium">Provider Priority:</label>
              <select
                value={searchSettings.activeProvider}
                onChange={(e) => {
                  const val = e.target.value as 'auto' | 'tavily' | 'brave' | 'duckduckgo';
                  handleSaveSearchSettings({ activeProvider: val });
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-mono focus:border-sky-600 outline-none shadow-2xs"
              >
                <option value="auto">Auto (Tavily → Brave → DuckDuckGo)</option>
                <option value="tavily">Tavily Only</option>
                <option value="brave">Brave Only</option>
                <option value="duckduckgo">DuckDuckGo Only (Zero-Config)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <p className="text-xs text-slate-600">Keys are shared by agents equipped with Web search at access level 3 or 4. Saved keys stay in a private server file across restarts, outside database backups. Saving overrides environment defaults. Auto may send a query to multiple providers after failures. Testing sends one search request and may use API credits.</p>
            {/* 1. Tavily AI Search */}
            <div className="p-5 rounded-2xl border border-sky-200 bg-white flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="text-base">🌐</span>
                    Tavily AI Search
                  </span>
                  <span
                    className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold ${
                      searchSettings.tavily?.isConfigured
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        searchSettings.tavily?.isConfigured ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {searchSettings.tavily?.isConfigured ? 'CONFIGURED' : 'OPTIONAL'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Search results with source excerpts and available dates. Results require verification and are not a live market data feed.
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="tavily-search-key" className="text-[10px] uppercase font-mono text-slate-500 font-medium">Tavily API Key</label>
                    <button type="button" className="text-xs underline" disabled={savingSearch || !searchSettings.tavily?.isConfigured} onClick={() => handleSaveSearchSettings({ tavilyKey: '' })}>Remove key</button>
                    {searchSettings.tavily?.isConfigured || tavilyKeyInput ? (
                      <button
                        onClick={() => handleTestSearchConnection('tavily')}
                        disabled={testingTavily}
                        className="text-[10px] text-sky-700 hover:text-sky-800 flex items-center gap-1 transition cursor-pointer font-medium"
                      >
                        <Activity className={`w-3 h-3 ${testingTavily ? 'animate-spin' : ''}`} />
                        <span>{testingTavily ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    id="tavily-search-key" autoComplete="off"
                    placeholder={searchSettings.tavily?.apiKeyMasked || 'tvly-...'}
                    value={tavilyKeyInput}
                    onChange={(e) => setTavilyKeyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-mono"
                  />
                </div>

                {tavilyTestResult && (
                  <div
                    className={`p-2.5 rounded-lg border text-[10px] font-mono flex items-center justify-between ${
                      tavilyTestResult.connected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span>{tavilyTestResult.message}</span>
                    {tavilyTestResult.latencyMs && (
                      <span className="font-semibold">{tavilyTestResult.latencyMs}ms</span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSaveSearchSettings({ tavilyKey: tavilyKeyInput })}
                disabled={savingSearch || !tavilyKeyInput}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {searchSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-sky-400" />
                    <span>Save Tavily Key</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Brave Search API */}
            <div className="p-5 rounded-2xl border border-rose-200 bg-white flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <span className="text-base">🦁</span>
                    Brave Search API
                  </span>
                  <span
                    className={`text-[9px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1 font-semibold ${
                      searchSettings.brave?.isConfigured
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        searchSettings.brave?.isConfigured ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {searchSettings.brave?.isConfigured ? 'CONFIGURED' : 'OPTIONAL'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Web search results with source snippets and available page dates. Page dates may describe publication or modification; freshness is not guaranteed.
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="brave-search-key" className="text-[10px] uppercase font-mono text-slate-500 font-medium">Brave API Key</label>
                    <button type="button" className="text-xs underline" disabled={savingSearch || !searchSettings.brave?.isConfigured} onClick={() => handleSaveSearchSettings({ braveKey: '' })}>Remove key</button>
                    {searchSettings.brave?.isConfigured || braveKeyInput ? (
                      <button
                        onClick={() => handleTestSearchConnection('brave')}
                        disabled={testingBrave}
                        className="text-[10px] text-rose-700 hover:text-rose-800 flex items-center gap-1 transition cursor-pointer font-medium"
                      >
                        <Activity className={`w-3 h-3 ${testingBrave ? 'animate-spin' : ''}`} />
                        <span>{testingBrave ? 'Testing...' : 'Test Connection'}</span>
                      </button>
                    ) : null}
                  </div>
                  <input
                    type="password"
                    id="brave-search-key" autoComplete="off"
                    placeholder={searchSettings.brave?.apiKeyMasked || 'BSA-...'}
                    value={braveKeyInput}
                    onChange={(e) => setBraveKeyInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-mono"
                  />
                </div>

                {braveTestResult && (
                  <div
                    className={`p-2.5 rounded-lg border text-[10px] font-mono flex items-center justify-between ${
                      braveTestResult.connected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span>{braveTestResult.message}</span>
                    {braveTestResult.latencyMs && (
                      <span className="font-semibold">{braveTestResult.latencyMs}ms</span>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSaveSearchSettings({ braveKey: braveKeyInput })}
                disabled={savingSearch || !braveKeyInput}
                className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {searchSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-rose-400" />
                    <span>Save Brave Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Per-Coworker Model Assignment Table */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <Cpu className="w-4 h-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900 font-mono">
                Coworker Model Assignments (Cloud & Local)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {agents.length} Agent Profiles Loaded
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {agents.map((agent) => (
              <div key={agent.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <img
                    src={agent.avatarUrl}
                    alt={agent.displayName}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shadow-2xs"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">{agent.displayName}</span>
                    <span className="text-[10px] text-slate-500">{agent.jobTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    {agent.department}
                  </span>
                  <select
                    value={agent.llmConfig?.model || agent.defaultModel || 'claude-3-5-sonnet'}
                    onChange={(e) => onUpdateAgentModel && onUpdateAgentModel(agent.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 focus:border-amber-600 text-xs text-slate-900 outline-none transition cursor-pointer font-mono shadow-2xs"
                  >
                    <optgroup label="Local Models (Ollama)">
                      {(settings.ollama?.downloadedModels || []).map((m) => (
                        <option key={`ollama:${m}`} value={`ollama:${m}`}>
                          🦙 {m} (Local Daemon)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Local Models (Hugging Face)">
                      {(settings.huggingface?.downloadedModels || []).map((m) => (
                        <option key={`hf:${m}`} value={`hf:${m}`}>
                          🤗 {m} (Local Weights)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Anthropic Claude (Cloud)">
                      <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                      <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                    </optgroup>
                    <optgroup label="OpenAI (Cloud)">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="o3-mini">o3-mini</option>
                    </optgroup>
                    <optgroup label="Qwen / DashScope (Cloud)">
                      <option value="qwen-max">Qwen Max</option>
                      <option value="qwen-plus">Qwen Plus</option>
                      <option value="qwen-turbo">Qwen Turbo</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
