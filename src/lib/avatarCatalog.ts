export type AvatarStyle = 'corporate' | 'tech' | 'cyber' | 'creative' | 'research';

export interface AvatarStyleOption {
  id: AvatarStyle;
  label: string;
  description: string;
  attire: string;
  badge: string;
}

export const AVATAR_STYLES: AvatarStyleOption[] = [
  {
    id: 'corporate',
    label: 'Corporate Executive',
    description: 'Crisp tailored suit, formal boardroom lighting, neutral architectural backdrop.',
    attire: 'tailored navy or charcoal executive suit, silk tie or blouse, subtle collar pin',
    badge: 'Executive'
  },
  {
    id: 'cyber',
    label: 'Cybersecurity & Defense',
    description: 'Dark tech silhouette, cool edge illumination, tactical minimalist attire.',
    attire: 'sleek charcoal technical blazer, dark turtleneck, security clearance lanyard',
    badge: 'Zero-Trust'
  },
  {
    id: 'tech',
    label: 'Silicon Valley Engineering',
    description: 'Modern minimalist knitwear, warm ambient campus illumination.',
    attire: 'minimalist dark merino knitwear, contemporary glasses, smart casual demeanor',
    badge: 'Tech Lead'
  },
  {
    id: 'creative',
    label: 'Design & Product Director',
    description: 'Contemporary architectural style, artistic natural daylight, clean gallery bokeh.',
    attire: 'structured designer coat, sculptural collar, refined modern jewelry',
    badge: 'Creative'
  },
  {
    id: 'research',
    label: 'Principal Research Scientist',
    description: 'Classic intellectual tailoring, warm mahogany library bokeh, analytical poise.',
    attire: 'herringbone tweed blazer, Oxford shirt, thoughtful analytical posture',
    badge: 'Science'
  }
];

export interface CuratedAvatar {
  url: string;
  fallbackUrl?: string;
  label: string;
  gender: 'female' | 'male' | 'non-binary';
  style: AvatarStyle;
  nationalityHint?: string;
  badge?: string;
}

export const CURATED_PORTRAITS: CuratedAvatar[] = [
  // FEMALE - Corporate & Security
  {
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Elena Rostova - Principal Security Architect',
    gender: 'female',
    style: 'cyber',
    nationalityHint: 'Swedish'
  },
  {
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Dr. Katherine Lin - Lead AI Research Fellow',
    gender: 'female',
    style: 'research',
    nationalityHint: 'Taiwanese'
  },
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Sarah - Chief of Staff & VP Operations',
    gender: 'female',
    style: 'corporate',
    nationalityHint: 'Chinese-American'
  },
  {
    url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Priya Sundaram - VP Platform Engineering',
    gender: 'female',
    style: 'tech',
    nationalityHint: 'Indian'
  },
  {
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Nadia Thorne - Principal Cryptographer',
    gender: 'female',
    style: 'cyber',
    nationalityHint: 'British'
  },
  {
    url: 'https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Amira Al-Mansoor - Risk & Governance Lead',
    gender: 'female',
    style: 'corporate',
    nationalityHint: 'Emirati'
  },
  {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Astrid Lindholm - Strategic Systems Designer',
    gender: 'female',
    style: 'creative',
    nationalityHint: 'Nordic'
  },
  {
    url: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Chidinma Okafor - Senior Financial Controller',
    gender: 'female',
    style: 'corporate',
    nationalityHint: 'Nigerian'
  },

  // ADDITIONAL FEMALE PORTRAITS
  {
    url: 'https://images.unsplash.com/photo-1573497019236-17f8177b81e8?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Leila Chen - Principal Architect',
    gender: 'female',
    style: 'tech',
    nationalityHint: 'Singaporean'
  },
  {
    url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Dr. Maya Patel - Cognitive Analytics Lead',
    gender: 'female',
    style: 'research',
    nationalityHint: 'Indian-British'
  },
  {
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Sora Takahashi - Creative Director',
    gender: 'female',
    style: 'creative',
    nationalityHint: 'Japanese'
  },

  // MALE - Corporate, Tech & Architecture
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Marcus - Head of Distributed Architecture',
    gender: 'male',
    style: 'tech',
    nationalityHint: 'Korean-American'
  },
  {
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Daniel - Head of Financial Strategy',
    gender: 'male',
    style: 'corporate',
    nationalityHint: 'British'
  },
  {
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'David Okonjo - Director of Infrastructure',
    gender: 'male',
    style: 'cyber',
    nationalityHint: 'Nigerian'
  },
  {
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Henrik Vanger - Principal Systems Architect',
    gender: 'male',
    style: 'tech',
    nationalityHint: 'Danish'
  },
  {
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Mateo Gutierrez - Enterprise AI Solutions Lead',
    gender: 'male',
    style: 'corporate',
    nationalityHint: 'Spanish'
  },
  {
    url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Kenji Takahashi - Quantum & Compute Fellow',
    gender: 'male',
    style: 'research',
    nationalityHint: 'Japanese'
  },
  {
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Lucas Moreau - Product Experience Architect',
    gender: 'male',
    style: 'creative',
    nationalityHint: 'French'
  },
  {
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Nathan Vance - Managing Director',
    gender: 'male',
    style: 'corporate',
    nationalityHint: 'American'
  },

  // NON-BINARY / UNIVERSAL
  {
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Alex Rivera - Autonomous Agent Strategist',
    gender: 'non-binary',
    style: 'tech',
    nationalityHint: 'Global'
  },
  {
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Rowan Bennett - Cognitive Systems Director',
    gender: 'non-binary',
    style: 'creative',
    nationalityHint: 'Canadian'
  },
  {
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Morgan Vance - Cloud Security Evaluator',
    gender: 'non-binary',
    style: 'cyber',
    nationalityHint: 'German'
  },
  {
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=faces&q=85&auto=format',
    label: 'Taylor Hayes - Applied AI Fellow',
    gender: 'non-binary',
    style: 'research',
    nationalityHint: 'Australian'
  }
];

export function getCuratedPortraitsByFilter(
  gender: 'female' | 'male' | 'non-binary' = 'female',
  style?: AvatarStyle
): CuratedAvatar[] {
  let list = CURATED_PORTRAITS.filter((p) => p.gender === gender);
  if (list.length === 0) list = CURATED_PORTRAITS;
  if (style) {
    const matching = list.filter((p) => p.style === style);
    const others = list.filter((p) => p.style !== style);
    return [...matching, ...others];
  }
  return list;
}

export interface BuildPromptParams {
  firstName?: string;
  lastName?: string;
  gender?: 'female' | 'male' | 'non-binary';
  age?: number;
  nationality?: string;
  jobTitle?: string;
  department?: string;
  style?: AvatarStyle;
  customPrompt?: string;
}

export function buildAvatarPrompt(params: BuildPromptParams): string {
  if (params.customPrompt && params.customPrompt.trim().length > 10) {
    return params.customPrompt.trim();
  }

  const ageStr = params.age ? `${params.age}-year-old` : '32-year-old';
  const natStr = params.nationality ? `${params.nationality}` : 'Nordic';
  const genStr =
    params.gender === 'female'
      ? 'professional woman'
      : params.gender === 'male'
      ? 'professional man'
      : 'professional person';

  const titleStr = params.jobTitle || 'Principal Security Architect';
  const deptStr = params.department || 'Enterprise Architecture';
  const styleObj = AVATAR_STYLES.find((s) => s.id === (params.style || 'corporate')) || AVATAR_STYLES[0];

  return `High-end photorealistic 8k close-up headshot portrait avatar of a ${ageStr} ${natStr} ${genStr}, ${titleStr} in ${deptStr}. Wearing ${styleObj.attire}, cinematic soft studio lighting, sharp focus on eyes, authentic skin texture, shallow depth of field, centered 1:1 square composition, executive portrait photography, neutral executive background.`;
}

export function createDynamicAvatarUrl(prompt: string, seed: number | string): string {
  const cleanPrompt = prompt.replace(/[\r\n\t]+/g, ' ').trim();
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&nologo=true&seed=${seed}`;
}

export function getCuratedAvatarSuite(
  gender: 'female' | 'male' | 'non-binary' = 'female',
  style: AvatarStyle = 'corporate',
  seedString: string = ''
): { primary: CuratedAvatar; variations: CuratedAvatar[] } {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const baseSeed = Math.abs(hash) || Math.floor(Math.random() * 10000000);

  const styleObj = AVATAR_STYLES.find((s) => s.id === style) || AVATAR_STYLES[0];
  const prompt = `High-end photorealistic 8k close-up headshot portrait avatar of a professional ${
    gender === 'non-binary' ? 'person' : gender
  }, wearing ${styleObj.attire}, cinematic soft studio lighting, sharp focus on eyes, authentic skin texture, shallow depth of field, centered 1:1 square composition, executive portrait photography, neutral executive background.`;

  const pool = getCuratedPortraitsByFilter(gender, style);
  const primaryFallback = pool[0]?.url || DEFAULT_FALLBACK_AVATAR;

  const primary: CuratedAvatar = {
    url: createDynamicAvatarUrl(prompt, baseSeed),
    fallbackUrl: primaryFallback,
    label: `AI Synthesis - ${styleObj.label}`,
    badge: styleObj.badge,
    gender,
    style
  };

  // Provide 4 distinct curated portraits from the filtered pool for instantaneous, reliable preview
  const offset = pool.length > 0 ? baseSeed % pool.length : 0;
  const variations: CuratedAvatar[] = [];
  const usedUrls = new Set<string>();

  for (let i = 0; i < pool.length && variations.length < 4; i++) {
    const item = pool[(offset + i) % pool.length];
    if (!usedUrls.has(item.url)) {
      usedUrls.add(item.url);
      variations.push({
        ...item,
        fallbackUrl: item.url,
        badge: item.style
      });
    }
  }

  // Ensure minimum 4 variations
  while (variations.length < 4) {
    const fallbackItem = CURATED_PORTRAITS[variations.length % CURATED_PORTRAITS.length];
    variations.push({
      ...fallbackItem,
      fallbackUrl: fallbackItem.url,
      badge: fallbackItem.style
    });
  }

  return {
    primary,
    variations
  };
}

export const DEFAULT_FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces&q=85&auto=format';

export function getSlotFallbackAvatar(
  gender: 'female' | 'male' | 'non-binary' = 'female',
  style: AvatarStyle = 'corporate',
  slotIndex: number = 0
): string {
  const pool = getCuratedPortraitsByFilter(gender, style);
  if (pool.length === 0) return DEFAULT_FALLBACK_AVATAR;
  return pool[slotIndex % pool.length].url;
}

export function handleAvatarError(
  event: any,
  fallbackUrl?: string,
  gender: 'female' | 'male' | 'non-binary' = 'female',
  style: AvatarStyle = 'corporate',
  slotIndex: number = 0
) {
  const target = event?.currentTarget;
  if (!target) return;
  const chosenFallback = fallbackUrl || getSlotFallbackAvatar(gender, style, slotIndex);
  if (target.src !== chosenFallback) {
    target.src = chosenFallback;
  }
}
