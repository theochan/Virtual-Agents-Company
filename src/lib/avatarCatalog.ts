export type AvatarStyle = 'corporate' | 'tech' | 'cyber' | 'creative' | 'research';
export type PortraitGender = 'female' | 'male' | 'non-binary';
export interface StockPortrait { url: string; label: string; gender: 'female' | 'male'; }

// Stock image categories are visual browsing aids, not claims about the subjects' identities.
const PHOTO_IDS = {
  "female": [
    "1573496359142-b8d87734a5a2",
    "1580489944761-15a19d654956",
    "1534528741775-53994a69daeb",
    "1573497019940-1c28c88b4f3e",
    "1567532939604-b6b5b0db2604",
    "1573496799652-408c2ac9fe98",
    "1544005313-94ddf0286df2",
    "1598550874175-4d0ef436c909",
    "1573497019236-17f8177b81e8",
    "1531746020798-e6953c6e8e04",
    "1517841905240-472988babdf9",
    "1524504388940-b1c1722653e1",
    "1508214751196-bcfd4ca60f91",
    "1488426862026-3ee34a7d66df",
    "1487412720507-e7ab37603c6f",
    "1494790108377-be9c29b29330",
    "1524250502761-1ac6f2e30d43",
    "1548142813-c348350df52b",
    "1531123897727-8f129e1688ce",
    "1516726817505-f5ed825624d8"
  ],
  "male": [
    "1507003211169-0a1dd7228f2d",
    "1500648767791-00dcc994a43e",
    "1519085360753-af0119f7cbe7",
    "1472099645785-5658abf4ff4e",
    "1506794778202-cad84cf45f1d",
    "1519345182560-3f2917c472ef",
    "1522075469751-3a6694fb2f61",
    "1560250097-0b93528c311a",
    "1539571696357-5a69c17a67c6",
    "1507591064344-4c6ce005b128",
    "1531384441138-2736e62e0919",
    "1527980965255-d3b416303d12",
    "1566492031773-4f4e44671857",
    "1568602471122-7832951cc4c5",
    "1552058544-f2b08422138a",
    "1547425260-76bcadfb4f2c",
    "1542909168-82c3e7fdca5c",
    "1552374196-1ab2a1c593e8",
    "1566753323558-f4e0952af115",
    "1535713875002-d1d0cf377fde"
  ]
} as const;

export const STOCK_PORTRAITS: StockPortrait[] = Object.entries(PHOTO_IDS).flatMap(([gender, ids]) =>
  ids.map((id, index) => ({
    url: `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&crop=faces&q=85&auto=format`,
    label: `${gender === 'female' ? 'Female' : 'Male'} stock portrait ${index + 1}`,
    gender: gender as 'female' | 'male',
  }))
);

export function getStockPortraits(gender: PortraitGender = 'female'): StockPortrait[] {
  return gender === 'non-binary' ? STOCK_PORTRAITS : STOCK_PORTRAITS.filter((p) => p.gender === gender);
}

export const DEFAULT_FALLBACK_AVATAR = STOCK_PORTRAITS[0].url;
export function getSlotFallbackAvatar(gender: PortraitGender = 'female', _style?: AvatarStyle, slotIndex = 0): string {
  const pool = getStockPortraits(gender);
  return pool[slotIndex % pool.length].url;
}

export function handleAvatarError(event: any, fallbackUrl?: string, gender: PortraitGender = 'female', style?: AvatarStyle, slotIndex = 0) {
  const target = event?.currentTarget;
  if (!target) return;
  const fallback = fallbackUrl || getSlotFallbackAvatar(gender, style, slotIndex);
  if (target.src !== fallback) target.src = fallback;
}
