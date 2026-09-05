import { readJson } from './http';
import { z } from 'zod';
import type { Agent } from '../types';
import { HttpError, validateEndpoint } from './security';

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };
export type ProviderConfig = { provider: string; model: string; endpoint: string; temperature: number; maxTokens: number };
export type ProviderSettings = Record<string, { defaultModel: string; endpoint: string; enabled: boolean; downloadedModels: string[] }>;
const defaults = {
  omniroute: process.env.OMNIROUTE_ENDPOINT || 'http://127.0.0.1:20128/v1',
  ollama: process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434',
  huggingface: process.env.HF_LOCAL_ENDPOINT || 'http://127.0.0.1:8000/v1',
  openai: 'https://api.openai.com/v1',
  claude: 'https://api.anthropic.com/v1',
  qwen: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
};
const keyNames: Record<string, string> = { omniroute: 'OMNIROUTE_API_KEY', openai: 'OPENAI_API_KEY', claude: 'ANTHROPIC_API_KEY', huggingface: 'HF_TOKEN', qwen: 'DASHSCOPE_API_KEY' };
export const defaultSettings: ProviderSettings = Object.fromEntries(Object.entries(defaults).map(([provider, endpoint]) => [provider, {
  endpoint, enabled: true, downloadedModels: [], defaultModel: provider === 'omniroute' ? 'auto' : '',
}]));
export function allowedEndpoints(provider: string) {
  return [defaults[provider], ...(process.env[`VAC_${provider.toUpperCase()}_ENDPOINTS`] || '').split(',').filter(Boolean)].filter(Boolean);
}
export function providerKey(provider: string) { return process.env[keyNames[provider]] || ''; }
export function setProviderKey(provider: string, key: string) {
  if (!keyNames[provider]) throw new HttpError(400, 'Provider does not accept a key');
  process.env[keyNames[provider]] = key;
}
export function resolveProvider(agent: Agent, settings: ProviderSettings): ProviderConfig {
  const config = agent.llmConfig;
  let model = config.model;
  let provider = String(config.provider).toLowerCase();
  if (provider === 'anthropic') provider = 'claude';
  for (const [prefix, name] of Object.entries({ 'omniroute:': 'omniroute', 'ollama:': 'ollama', 'hf:': 'huggingface' })) {
    if (model.startsWith(prefix)) { provider = name; model = model.slice(prefix.length); }
  }
  if (provider === 'local' && config.localSource) provider = config.localSource;
  const setting = settings[provider];
  if (!setting || !setting.enabled) throw new HttpError(422, 'Provider is unsupported or disabled');
  const endpoint = validateEndpoint(config.localEndpoint || setting.endpoint, allowedEndpoints(provider));
  if (!model) throw new HttpError(422, 'Choose a model');
  return { provider, model, endpoint, temperature: Math.max(0, Math.min(1, config.temperature ?? 0.2)), maxTokens: Math.max(128, Math.min(2048, config.maxTokens || 2048)) };
}
export const decisionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('final'), reply: z.string().min(1).max(20000) }).strict(),
  z.object({ action: z.literal('tool'), toolId: z.string().max(100), parameters: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ action: z.literal('blocked'), reason: z.string().min(1).max(4000) }).strict(),
]);
export type Decision = z.infer<typeof decisionSchema>;

export async function infer(config: ProviderConfig, messages: Message[], signal: AbortSignal) {
  const { provider, endpoint, model } = config;
  validateEndpoint(endpoint, allowedEndpoints(provider));
  const key = providerKey(provider);
  if (['openai', 'claude', 'qwen'].includes(provider) && (!key || key.startsWith('your_'))) throw new Error('Provider API key is not configured');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let url = `${endpoint}/chat/completions`;
  let body: any = { model, messages, temperature: config.temperature, max_tokens: config.maxTokens };
  if (provider === 'claude') {
    url = `${endpoint}/messages`;
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
    body = { ...body, system: messages.filter(m => m.role === 'system').map(m => m.content).join('\n'), messages: messages.filter(m => m.role !== 'system') };
  } else if (provider === 'ollama') {
    url = `${endpoint}/api/chat`;
    body = { model, messages, stream: false, format: 'json', options: { temperature: config.temperature, num_predict: config.maxTokens } };
  } else if (key) headers.Authorization = `Bearer ${key}`;
  const started = Date.now();
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]) });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  const data: any = await readJson(response);
  const content = provider === 'claude' ? data.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
    : provider === 'ollama' ? data.message?.content : data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.length > 30000) throw new Error('Provider returned missing or oversized output');
  let decision: Decision;
  try { decision = decisionSchema.parse(JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))); }
  catch { throw new Error('Provider did not return a valid decision; no work was marked complete'); }
  const rawInput = provider === 'ollama' ? data.prompt_eval_count : data.usage?.input_tokens ?? data.usage?.prompt_tokens;
  const rawOutput = provider === 'ollama' ? data.eval_count : data.usage?.output_tokens ?? data.usage?.completion_tokens;
  const count = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
  return { decision, receipt: { provider, model, responseId: typeof data.id === 'string' ? data.id : null, latencyMs: Date.now() - started, inputTokens: count(rawInput), outputTokens: count(rawOutput), cost: null, inferenceLocation: provider === 'omniroute' ? 'gateway-dependent' : 'provider-dependent' } };
}

export async function discover(provider: string, endpoint: string) {
  validateEndpoint(endpoint, allowedEndpoints(provider));
  if (provider === 'claude') throw new HttpError(422, 'Use a real run to check Anthropic inference');
  const key = providerKey(provider);
  const response = await fetch(`${endpoint}${provider === 'ollama' ? '/api/tags' : '/models'}`, {
    headers: key ? { Authorization: `Bearer ${key}` } : {}, redirect: 'error', signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Model discovery returned HTTP ${response.status}`);
  const data: any = await readJson(response);
  const models = provider === 'ollama' ? data.models?.map((m: any) => m.name) : data.data?.map((m: any) => m.id);
  if (!Array.isArray(models) || !models.every(m => typeof m === 'string')) throw new Error('Invalid model catalog');
  return models.slice(0, 200);
}
