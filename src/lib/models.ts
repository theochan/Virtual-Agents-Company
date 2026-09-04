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
  isLocal?: boolean;
  localSource?: 'ollama' | 'huggingface';
  endpoint?: string;
  parameters?: string;
}

export const SUPPORTED_MODELS: ModelOption[] = [
  // Cloud Foundation Models
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
  },

  // Local Models (Downloaded via Ollama)
  {
    id: 'ollama:llama3.2',
    name: 'Llama 3.2 (3B / 8B)',
    provider: 'Ollama (Local)',
    badge: 'Ollama Local',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    description: 'Meta Llama 3.2 run locally via Ollama daemon. Zero cloud latency, complete privacy, runs on device.',
    recommendedFor: 'Local private execution, offline edge operations, internal company data',
    defaultTemp: 0.3,
    maxTokens: 4096,
    speed: 'Fast',
    isLocal: true,
    localSource: 'ollama',
    endpoint: 'http://localhost:11434',
    parameters: '3B / 8B Params'
  },
  {
    id: 'ollama:deepseek-r1',
    name: 'DeepSeek R1 (8B Local)',
    provider: 'Ollama (Local)',
    badge: 'Ollama Local',
    badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
    description: 'DeepSeek R1 distilled reasoning model running locally on Ollama. Exceptional algorithmic and code logic.',
    recommendedFor: 'Complex algorithmic deduction, offline code audits, chain-of-thought verification',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Deep',
    isLocal: true,
    localSource: 'ollama',
    endpoint: 'http://localhost:11434',
    parameters: '8B Params'
  },
  {
    id: 'ollama:mistral',
    name: 'Mistral 7B (Instruct)',
    provider: 'Ollama (Local)',
    badge: 'Ollama Local',
    badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    description: 'Mistral 7B Instruct local deployment through Ollama. Fast instruction following and balanced reasoning.',
    recommendedFor: 'Task orchestration, markdown documentation, low-resource workstations',
    defaultTemp: 0.3,
    maxTokens: 4096,
    speed: 'Fast',
    isLocal: true,
    localSource: 'ollama',
    endpoint: 'http://localhost:11434',
    parameters: '7B Params'
  },
  {
    id: 'ollama:qwen2.5-coder',
    name: 'Qwen 2.5 Coder (7B Local)',
    provider: 'Ollama (Local)',
    badge: 'Ollama Local',
    badgeColor: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
    description: 'Specialized local coding and refactoring foundation model run locally via Ollama.',
    recommendedFor: 'High-speed code synthesis, syntax checking, local repository reviews',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Fast',
    isLocal: true,
    localSource: 'ollama',
    endpoint: 'http://localhost:11434',
    parameters: '7B Params'
  },
  {
    id: 'ollama:custom',
    name: 'Custom Ollama Model',
    provider: 'Ollama (Local)',
    badge: 'Custom Local',
    badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
    description: 'Connect to any custom model tag downloaded via Ollama (e.g., llama3.2:1b, codellama:7b, custom GGUF).',
    recommendedFor: 'Custom fine-tuned GGUF weights, specialized internal Ollama instances',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Fast',
    isLocal: true,
    localSource: 'ollama',
    endpoint: 'http://localhost:11434',
    parameters: 'User Defined'
  },

  // Local Models (Downloaded via Hugging Face Hub / Local TGI / vLLM)
  {
    id: 'hf:meta-llama-3.2-3b-instruct',
    name: 'Llama-3.2-3B-Instruct (HF)',
    provider: 'Hugging Face (Local)',
    badge: 'HF Local',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    description: 'Downloaded from Hugging Face hub (meta-llama/Llama-3.2-3B-Instruct). Served via local TGI or transformers.',
    recommendedFor: 'Self-hosted Hugging Face pipelines, cached PyTorch/Safetensors weights, local air-gapped nodes',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Fast',
    isLocal: true,
    localSource: 'huggingface',
    endpoint: 'http://localhost:8000/v1',
    parameters: '3B Weights'
  },
  {
    id: 'hf:mistral-7b-instruct-v0.3',
    name: 'Mistral-7B-Instruct-v0.3 (HF)',
    provider: 'Hugging Face (Local)',
    badge: 'HF Local',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    description: 'Mistral-7B-Instruct weights cached from Hugging Face Hub. Native function calling and 32k context.',
    recommendedFor: 'Local inference engines, vLLM / llama.cpp backends, Hugging Face Hub downloads',
    defaultTemp: 0.3,
    maxTokens: 8192,
    speed: 'Fast',
    isLocal: true,
    localSource: 'huggingface',
    endpoint: 'http://localhost:8000/v1',
    parameters: '7B Weights'
  },
  {
    id: 'hf:qwen2.5-7b-instruct',
    name: 'Qwen2.5-7B-Instruct (HF)',
    provider: 'Hugging Face (Local)',
    badge: 'HF Local',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    description: 'Qwen 2.5 7B instruction tuned model downloaded from Hugging Face Hub with 128k context support.',
    recommendedFor: 'Comprehensive language understanding, technical documentation, local enterprise QA',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Fast',
    isLocal: true,
    localSource: 'huggingface',
    endpoint: 'http://localhost:8000/v1',
    parameters: '7B Weights'
  },
  {
    id: 'hf:phi-3.5-mini',
    name: 'Phi-3.5-mini-instruct (HF)',
    provider: 'Hugging Face (Local)',
    badge: 'HF Local',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    description: 'Microsoft Phi-3.5 3.8B lightweight model downloaded from Hugging Face. Highly efficient math & logic reasoning.',
    recommendedFor: 'CPU / low-VRAM local execution, rapid code logic, embedded desktop deployment',
    defaultTemp: 0.1,
    maxTokens: 4096,
    speed: 'Ultra Fast',
    isLocal: true,
    localSource: 'huggingface',
    endpoint: 'http://localhost:8000/v1',
    parameters: '3.8B Weights'
  },
  {
    id: 'hf:custom',
    name: 'Custom Hugging Face Weights',
    provider: 'Hugging Face (Local)',
    badge: 'Custom Local',
    badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
    description: 'Connect to any model downloaded from Hugging Face hub (e.g. via transformers pipeline or local vLLM endpoint).',
    recommendedFor: 'Air-gapped models in ~/.cache/huggingface/hub, custom fine-tunes, local Safetensors',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Fast',
    isLocal: true,
    localSource: 'huggingface',
    endpoint: 'http://localhost:8000/v1',
    parameters: 'User Repo'
  }
];

export const DEFAULT_MODEL_ID = 'gemini-3.8-flash';

export function getModelDetails(modelId?: string): ModelOption {
  if (!modelId) return SUPPORTED_MODELS[0];
  const found = SUPPORTED_MODELS.find((m) => m.id === modelId || m.id.toLowerCase() === modelId.toLowerCase());
  if (found) return found;

  // If it's a dynamic Ollama model tag (e.g. "ollama:llama3:8b")
  if (modelId.startsWith('ollama:')) {
    const rawTag = modelId.replace('ollama:', '');
    return {
      id: modelId,
      name: `Ollama (${rawTag})`,
      provider: 'Ollama (Local)',
      badge: 'Ollama Local',
      badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
      description: `Local Ollama model "${rawTag}" executing on localhost:11434.`,
      recommendedFor: 'Private on-device inference',
      defaultTemp: 0.2,
      maxTokens: 4096,
      speed: 'Fast',
      isLocal: true,
      localSource: 'ollama',
      endpoint: 'http://localhost:11434',
      parameters: 'Local Daemon'
    };
  }

  // If it's a dynamic Hugging Face repo tag (e.g. "hf:meta-llama/...")
  if (modelId.startsWith('hf:')) {
    const rawRepo = modelId.replace('hf:', '');
    return {
      id: modelId,
      name: `HF (${rawRepo})`,
      provider: 'Hugging Face (Local)',
      badge: 'HF Local',
      badgeColor: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
      description: `Hugging Face model "${rawRepo}" loaded from local cache.`,
      recommendedFor: 'Air-gapped Hugging Face Hub execution',
      defaultTemp: 0.2,
      maxTokens: 4096,
      speed: 'Fast',
      isLocal: true,
      localSource: 'huggingface',
      endpoint: 'http://localhost:8000/v1',
      parameters: 'Local HF Hub'
    };
  }

  return SUPPORTED_MODELS[0];
}

export function isLocalModel(modelId?: string): boolean {
  if (!modelId) return false;
  const lower = modelId.toLowerCase();
  return lower.startsWith('ollama:') || lower.startsWith('hf:') || lower.includes('local');
}

export function isOllamaModel(modelId?: string): boolean {
  if (!modelId) return false;
  return modelId.toLowerCase().startsWith('ollama:');
}

export function isHuggingFaceModel(modelId?: string): boolean {
  if (!modelId) return false;
  return modelId.toLowerCase().startsWith('hf:');
}

export function getCleanModelTag(modelId?: string): string {
  if (!modelId) return 'gemini-3.8-flash';
  if (modelId.startsWith('ollama:')) return modelId.replace('ollama:', '');
  if (modelId.startsWith('hf:')) return modelId.replace('hf:', '');
  return modelId;
}

