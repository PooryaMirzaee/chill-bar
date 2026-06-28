import type { Category, CategoryVisual } from './types'

const LEGACY_VISUALS: Record<string, CategoryVisual> = {
  icecream: {
    gradient: 'linear-gradient(145deg, #3d2314 0%, #F26522 45%, #FF8C4D 100%)',
    pattern: 'radial-gradient(circle at 25% 75%, rgba(255,255,255,0.12) 0%, transparent 50%)',
    accent: '#FF8C4D',
    glow: 'rgba(242, 101, 34, 0.35)',
  },
  fresh: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #e85d8a 40%, #F26522 100%)',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.15) 0%, transparent 45%)',
    accent: '#e85d8a',
    glow: 'rgba(232, 93, 138, 0.25)',
  },
  arabica: {
    gradient: 'linear-gradient(145deg, #0A0A0A 0%, #3d2314 50%, #6b4423 100%)',
    pattern: 'radial-gradient(ellipse at 50% 0%, rgba(242,101,34,0.15) 0%, transparent 55%)',
    accent: '#8b6914',
    glow: 'rgba(107, 68, 35, 0.35)',
  },
  coffee5050: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #4a3020 60%, #8b6914 100%)',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 50%)',
    accent: '#a67c52',
    glow: 'rgba(166, 124, 82, 0.3)',
  },
  herbal: {
    gradient: 'linear-gradient(145deg, #0A0A0A 0%, #1a3a2a 50%, #2d5a40 100%)',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(242,101,34,0.1) 0%, transparent 45%)',
    accent: '#4a8a60',
    glow: 'rgba(45, 90, 64, 0.3)',
  },
  hotcup: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #5c3a1e 50%, #D94E10 100%)',
    pattern: 'radial-gradient(ellipse at 50% 100%, rgba(255,140,77,0.2) 0%, transparent 50%)',
    accent: '#D94E10',
    glow: 'rgba(217, 78, 16, 0.3)',
  },
  breakfast: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #D94E10 40%, #FF8C4D 100%)',
    pattern: 'radial-gradient(circle at 40% 60%, rgba(255,255,255,0.15) 0%, transparent 50%)',
    accent: '#FF8C4D',
    glow: 'rgba(255, 140, 77, 0.3)',
  },
  waffle: {
    gradient: 'linear-gradient(145deg, #3d2314 0%, #c4956a 50%, #E8A87C 100%)',
    pattern:
      'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.04) 6px, rgba(255,255,255,0.04) 12px)',
    accent: '#E8A87C',
    glow: 'rgba(232, 168, 124, 0.3)',
  },
  cake: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #FF2D7B 40%, #F26522 100%)',
    pattern: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.12) 0%, transparent 50%)',
    accent: '#FF2D7B',
    glow: 'rgba(255, 45, 123, 0.25)',
  },
  salad: {
    gradient: 'linear-gradient(145deg, #0A0A0A 0%, #2d5a40 50%, #4a8a60 100%)',
    pattern: 'radial-gradient(circle at 25% 75%, rgba(242,101,34,0.08) 0%, transparent 45%)',
    accent: '#4a8a60',
    glow: 'rgba(74, 138, 96, 0.25)',
  },
  icedcoffee: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #3d2314 40%, #F26522 100%)',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.1) 0%, transparent 40%)',
    accent: '#F26522',
    glow: 'rgba(242, 101, 34, 0.3)',
  },
  shake: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #e85d8a 35%, #FF8C4D 100%)',
    pattern: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 55%)',
    accent: '#e85d8a',
    glow: 'rgba(232, 93, 138, 0.25)',
  },
  milkmix: {
    gradient: 'linear-gradient(145deg, #1B2838 0%, #E8A87C 50%, #FF8C4D 100%)',
    pattern: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)',
    accent: '#E8A87C',
    glow: 'rgba(232, 168, 124, 0.25)',
  },
}

export const DEFAULT_CATEGORY_ACCENT = '#F26522'

const LEGACY_ACCENTS: Record<string, string> = {
  icecream: '#FF8C4D',
  fresh: '#e85d8a',
  arabica: '#8b6914',
  coffee5050: '#a67c52',
  herbal: '#4a8a60',
  hotcup: '#D94E10',
  breakfast: '#FF8C4D',
  waffle: '#E8A87C',
  cake: '#FF2D7B',
  salad: '#4a8a60',
  icedcoffee: '#F26522',
  shake: '#e85d8a',
  milkmix: '#E8A87C',
}

function hashHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function visualFromAccent(accent: string): CategoryVisual {
  const light = lighten(accent, 0.35)
  return {
    gradient: `linear-gradient(145deg, #1B2838 0%, ${accent} 55%, ${light} 100%)`,
    pattern: `radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 45%)`,
    accent,
    glow: rgba(accent, 0.3),
  }
}

export function resolveCategoryVisual(category: Pick<Category, 'id' | 'accentColor'>): CategoryVisual {
  if (LEGACY_VISUALS[category.id]) return LEGACY_VISUALS[category.id]
  const accent =
    category.accentColor && category.accentColor !== DEFAULT_CATEGORY_ACCENT
      ? category.accentColor
      : LEGACY_ACCENTS[category.id] ?? null
  if (accent) return visualFromAccent(accent)
  const hue = hashHue(category.id)
  return {
    gradient: `linear-gradient(145deg, #0A0A0A 0%, #1B2838 40%, hsl(${hue}, 55%, 38%) 100%)`,
    pattern: `radial-gradient(circle at 25% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
    accent: `hsl(${hue}, 65%, 52%)`,
    glow: `hsla(${hue}, 65%, 52%, 0.28)`,
  }
}

export function findIceCreamCategoryId(categories: Category[]): string | null {
  const hub = categories.find((c) => c.isIceCreamHub)
  if (hub) return hub.id
  const legacy = categories.find((c) => c.id === 'icecream')
  return legacy?.id ?? null
}

export function categoriesWithItems(categories: Category[], itemCategoryIds: Set<string>): Category[] {
  return categories.filter((c) => itemCategoryIds.has(c.id))
}

export const LEGACY_CATEGORY_ACCENTS = LEGACY_ACCENTS
