import React, { useState, useEffect } from 'react';
import {
  Key,
  Cpu,
  ShieldCheck,
  Save,
  CheckCircle2,
  Server,
  Layers,
} from 'lucide-react';
import { Agent } from '../types';

interface AdminSettingsViewProps {
  agents: Agent[];
  onUpdateAgentModel?: (agentId: string, model: string) => void;
}

interface ProviderConfig {
  defaultModel: string;
  apiKeyMasked: string;
  isConfigured: boolean;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  agents,
  onUpdateAgentModel,
}) => {
  const [settings, setSettings] = useState<Record<string, ProviderConfig>>({
    gemini: { defaultModel: 'gemini-2.5-pro', apiKeyMasked: '', isConfigured: false },
    openai: { defaultModel: 'gpt-4o', apiKeyMasked: '', isConfigured: false },
    qwen: { defaultModel: 'qwen-plus', apiKeyMasked: '', isConfigured: false },
  });

  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [qwenKeyInput, setQwenKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');

  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/llm-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setSettings(data);
        }
      })
      .catch((err) => console.log('Could not load LLM settings:', err));
  }, []);

  const handleSaveProvider = async (provider: string, apiKey: string, defaultModel: string) => {
    setSavingProvider(provider);
    setSaveSuccess(null);
    try {
      const res = await fetch('/api/admin/llm-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, defaultModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setSaveSuccess(provider);
        if (provider === 'openai') setOpenaiKeyInput('');
        if (provider === 'qwen') setQwenKeyInput('');
        if (provider === 'gemini') setGeminiKeyInput('');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] text-[#E0E0E0] overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-[#1A1A1A] bg-[#070707] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[#C5A358]/30 bg-[#C5A358]/10 flex items-center justify-center text-[#C5A358]">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-serif italic text-[#F0F0F0]">Model & Provider Configuration</h2>
            <p className="text-xs text-[#888]">
              Manage multi-provider API keys, default fallback models, and per-coworker model assignments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#0A0A0A] border border-[#222] text-[#888] font-mono">
            Environment: Enterprise
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
        {/* Security / Architecture Notice */}
        <div className="p-4 rounded border border-[#C5A358]/20 bg-[#C5A358]/5 text-xs text-[#CCC] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#C5A358] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-[#F0F0F0] block">Secure Server-Side Credential Storage</span>
            <p className="leading-relaxed text-[#AAA]">
              All API keys are encrypted and executed through server-side proxy routes. Keys are never leaked to client browsers. You can also configure them as persistent environment variables in Cloud Settings (<code>OPENAI_API_KEY</code>, <code>DASHSCOPE_API_KEY</code>, <code>GEMINI_API_KEY</code>).
            </p>
          </div>
        </div>

        {/* Provider Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Google Gemini */}
          <div className="p-5 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#F0F0F0] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#C5A358]" />
                  Google Gemini
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                    settings.gemini?.isConfigured
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {settings.gemini?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                </span>
              </div>
              <p className="text-[11px] text-[#777] mb-3">Primary engine for reasoning, synthesis, and memory.</p>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">Default Model</label>
                  <select
                    value={settings.gemini?.defaultModel || 'gemini-2.5-pro'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        gemini: { ...prev.gemini, defaultModel: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none cursor-pointer"
                  >
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (Reasoning)</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder={settings.gemini?.apiKeyMasked || 'Enter Gemini API key...'}
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none placeholder-[#555]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSaveProvider('gemini', geminiKeyInput, settings.gemini?.defaultModel || 'gemini-2.5-pro')}
              disabled={savingProvider === 'gemini'}
              className="w-full py-1.5 rounded bg-[#161616] hover:bg-[#222] border border-[#2A2A2A] text-xs text-[#EEE] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saveSuccess === 'gemini' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-[#C5A358]" />
                  <span>Update Gemini</span>
                </>
              )}
            </button>
          </div>

          {/* 2. OpenAI */}
          <div className="p-5 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#F0F0F0] flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-emerald-400" />
                  OpenAI
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                    settings.openai?.isConfigured
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {settings.openai?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                </span>
              </div>
              <p className="text-[11px] text-[#777] mb-3">GPT-4o, GPT-4o Mini, and o3-mini models for coworkers.</p>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">Default Model</label>
                  <select
                    value={settings.openai?.defaultModel || 'gpt-4o'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        openai: { ...prev.openai, defaultModel: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none cursor-pointer"
                  >
                    <option value="gpt-4o">GPT-4o (Omni multimodal)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini (Cost efficient)</option>
                    <option value="o3-mini">o3-mini (High reasoning)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder={settings.openai?.apiKeyMasked || 'sk-...'}
                    value={openaiKeyInput}
                    onChange={(e) => setOpenaiKeyInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none placeholder-[#555]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSaveProvider('openai', openaiKeyInput, settings.openai?.defaultModel || 'gpt-4o')}
              disabled={savingProvider === 'openai'}
              className="w-full py-1.5 rounded bg-[#161616] hover:bg-[#222] border border-[#2A2A2A] text-xs text-[#EEE] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
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
          <div className="p-5 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#F0F0F0] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-400" />
                  Qwen (DashScope)
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                    settings.qwen?.isConfigured
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {settings.qwen?.isConfigured ? 'ACTIVE' : 'NOT SET'}
                </span>
              </div>
              <p className="text-[11px] text-[#777] mb-3">Qwen-Max, Qwen-Plus, and Qwen-Turbo high-throughput series.</p>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">Default Model</label>
                  <select
                    value={settings.qwen?.defaultModel || 'qwen-plus'}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        qwen: { ...prev.qwen, defaultModel: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none cursor-pointer"
                  >
                    <option value="qwen-max">Qwen-Max (Deep Reasoning)</option>
                    <option value="qwen-plus">Qwen-Plus (Balanced)</option>
                    <option value="qwen-turbo">Qwen-Turbo (Fast)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-mono text-[#666] block mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder={settings.qwen?.apiKeyMasked || 'sk-dashscope-...'}
                    value={qwenKeyInput}
                    onChange={(e) => setQwenKeyInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-[#222] text-xs text-[#E0E0E0] outline-none placeholder-[#555]"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSaveProvider('qwen', qwenKeyInput, settings.qwen?.defaultModel || 'qwen-plus')}
              disabled={savingProvider === 'qwen'}
              className="w-full py-1.5 rounded bg-[#161616] hover:bg-[#222] border border-[#2A2A2A] text-xs text-[#EEE] font-medium transition cursor-pointer flex items-center justify-center gap-1.5"
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

        {/* Per-Coworker Model Assignment Table */}
        <div className="p-5 rounded-xl border border-[#1A1A1A] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#C5A358]">
              <Cpu className="w-4 h-4" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F0F0F0]">
                Coworker Model Assignments
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#666]">
              {agents.length} Autonomous Agents Loaded
            </span>
          </div>

          <div className="divide-y divide-[#161616] overflow-x-auto">
            {agents.map((agent) => (
              <div key={agent.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-[200px]">
                  <img
                    src={agent.avatarUrl}
                    alt={agent.displayName}
                    className="w-8 h-8 rounded object-cover border border-[#222]"
                  />
                  <div>
                    <span className="text-xs font-medium text-[#F0F0F0] block">{agent.displayName}</span>
                    <span className="text-[10px] text-[#777]">{agent.jobTitle}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-[#555] hidden sm:inline">
                    {agent.department}
                  </span>
                  <select
                    value={agent.defaultModel || 'gemini-2.5-pro'}
                    onChange={(e) => onUpdateAgentModel && onUpdateAgentModel(agent.id, e.target.value)}
                    className="px-2.5 py-1 rounded bg-[#050505] border border-[#222] focus:border-[#C5A358] text-xs text-[#E0E0E0] outline-none transition cursor-pointer"
                  >
                    <optgroup label="Google Gemini">
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    </optgroup>
                    <optgroup label="OpenAI">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="o3-mini">o3-mini</option>
                    </optgroup>
                    <optgroup label="Qwen (Alibaba)">
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
