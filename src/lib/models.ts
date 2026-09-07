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
  // Cloud Foundation Models (Anthropic & OpenAI)
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic Claude',
    badge: 'Recommended',
    badgeColor: 'border-amber-500/30 text-amber-700 bg-amber-500/10',
    description: 'State-of-the-art enterprise reasoning, code generation, and complex multi-agent execution.',
    recommendedFor: 'Strategic synthesis, architectural design, autonomous task orchestration',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Fast'
  },
  {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic Claude',
    badge: 'Ultra Fast',
    badgeColor: 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10',
    description: 'Sub-second latency with exceptional reasoning for agile turnarounds and high-speed execution.',
    recommendedFor: 'Rapid subtasks, quick tool triage, live conversation flows',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Ultra Fast'
  },
  {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet (Thinking)',
    provider: 'Anthropic Claude',
    badge: 'Deep Reasoning',
    badgeColor: 'border-purple-500/30 text-purple-700 bg-purple-500/10',
    description: 'Hybrid reasoning architecture dynamically switching between instant answers and extended thought chains.',
    recommendedFor: 'Complex algorithmic deduction, multi-tier financial models, deep codebase refactors',
    defaultTemp: 0.2,
    maxTokens: 8192,
    speed: 'Deep'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    badge: 'Multimodal',
    badgeColor: 'border-sky-500/30 text-sky-700 bg-sky-500/10',
    description: 'Flagship omni model combining fast multimodal intelligence with broad knowledge bases.',
    recommendedFor: 'Cross-functional analysis, executive correspondence, structured JSON generation',
    defaultTemp: 0.3,
    maxTokens: 4096,
    speed: 'Fast'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    badge: 'Fast & Affordable',
    badgeColor: 'border-teal-500/30 text-teal-700 bg-teal-500/10',
    description: 'Lightweight, cost-effective model optimized for high-volume background tasks and quick responses.',
    recommendedFor: 'Background data parsing, status summaries, task item classification',
    defaultTemp: 0.2,
    maxTokens: 4096,
    speed: 'Ultra Fast'
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

export const DEFAULT_MODEL_ID = 'claude-3-5-sonnet';

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
  if (!modelId) return 'claude-3-5-sonnet';
  if (modelId.startsWith('ollama:')) return modelId.replace('ollama:', '');
  if (modelId.startsWith('hf:')) return modelId.replace('hf:', '');
  return modelId;
}

