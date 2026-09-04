export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  badge: string;
  badgeColor: string;
  description: string;
  recommendedFor: string;
  defaultTemp: number;
  maxTokens: number;
  speed: 'Ultra Fast' | 'Fast' | 'Deep';
}

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'Google Gemini',
    badge: 'Recommended',
    badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    description: 'Next-gen enterprise workhorse with fast reasoning and low latency across complex tasks.',
    recommendedFor: '4-layer memory synthesis, proactive suggestions, balanced execution',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Fast'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google Gemini',
    badge: 'Balanced',
    badgeColor: 'border-sky-500/30 text-sky-400 bg-sky-500/10',
    description: 'Balanced foundation model offering dependable latency and multimodal comprehension.',
    recommendedFor: 'Interactive chat, tool orchestration, responsive conversation flows',
    defaultTemp: 0.3,
    maxTokens: 4096,
    speed: 'Fast'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google Gemini',
    badge: 'Ultra Fast',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    description: 'High-frequency inference with minimal latency, optimal for automated subtasks and rapid turnarounds.',
    recommendedFor: 'High-frequency subtasks, lightweight fact-checking, rapid tool calls',
    defaultTemp: 0.1,
    maxTokens: 2048,
    speed: 'Ultra Fast'
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    provider: 'Google Gemini',
    badge: 'Deep Reasoning',
    badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
    description: 'Maximum reasoning power for intricate software architecture, math, logic, and deep analysis.',
    recommendedFor: 'Multi-layer system design, contract scrutiny, complex trade-off matrices',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Deep'
  }
];

export const DEFAULT_MODEL_ID = 'gemini-3.8-flash';

export function getModelDetails(modelId?: string): ModelOption {
  if (!modelId) return SUPPORTED_MODELS[0];
  const found = SUPPORTED_MODELS.find((m) => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase());
  return found || SUPPORTED_MODELS[0];
}
