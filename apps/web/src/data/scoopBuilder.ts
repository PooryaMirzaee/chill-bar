import { BASES, type IceCreamOption } from './iceCreamBuilder'

export type BowlSize = 'M' | 'L'

export interface ScoopFlavor extends IceCreamOption {
  threeColor: [number, number, number]
}

export const SCOOP_FLAVORS: ScoopFlavor[] = [
  ...BASES.map((b) => ({
    ...b,
    threeColor: hexToRgb(b.color),
  })),
  { id: 'caramel', name: 'کارامل', color: '#c87830', emoji: '🍮', priceMod: 15, threeColor: [0.78, 0.47, 0.19] },
  { id: 'lotus', name: 'لوتوس', color: '#d4a055', emoji: '🍪', priceMod: 20, threeColor: [0.83, 0.63, 0.33] },
  { id: 'choco', name: 'شکلات', color: '#5c3a1e', emoji: '🍫', priceMod: 10, threeColor: [0.36, 0.23, 0.12] },
]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export const SCOOP_BASE_PRICE = 160

export function calcScoopPrice(scoopCount: number, flavors: ScoopFlavor[]): number {
  const mods = flavors.slice(0, scoopCount).reduce((s, f) => s + f.priceMod, 0)
  return SCOOP_BASE_PRICE + scoopCount * 45 + mods
}

export function scoopBuildName(count: number, size: BowlSize): string {
  return `کاسه بستنی (${size === 'M' ? 'کاسه معمولی' : 'کاسه بزرگ'} · ${count} اسکوپ)`
}

export const MAX_SCOOPS: Record<BowlSize, number> = { M: 3, L: 6 }

/** Scoop layout inside bowl — x, y, z */
export const BOWL_POSITIONS: Record<BowlSize, Record<number, [number, number, number][]>> = {
  M: {
    1: [[0, 0.06, 0]],
    2: [[-0.14, 0.05, 0.02], [0.14, 0.05, -0.02]],
    3: [
      [0, 0.1, 0],
      [-0.15, 0.02, 0.1],
      [0.15, 0.02, -0.1],
    ],
  },
  L: {
    1: [[0, 0.08, 0]],
    2: [[-0.17, 0.06, 0], [0.17, 0.06, 0]],
    3: [
      [0, 0.14, 0],
      [-0.19, 0.04, 0.12],
      [0.19, 0.04, -0.12],
    ],
    4: [
      [-0.14, 0.1, -0.14],
      [0.14, 0.1, -0.14],
      [-0.14, 0.03, 0.14],
      [0.14, 0.03, 0.14],
    ],
    5: [
      [0, 0.16, 0],
      [-0.18, 0.08, 0.1],
      [0.18, 0.08, -0.1],
      [-0.16, 0.02, -0.14],
      [0.16, 0.02, 0.14],
    ],
    6: [
      [0, 0.14, 0],
      [-0.2, 0.08, 0],
      [0.2, 0.08, 0],
      [-0.14, 0.02, 0.18],
      [0.14, 0.02, -0.18],
      [0, 0.04, -0.2],
    ],
  },
}

export function cherryPosition(size: BowlSize, count: number): [number, number, number] {
  const positions = BOWL_POSITIONS[size][count] || BOWL_POSITIONS[size][1]
  const highest = positions.reduce((best, p) => (p[1] > best[1] ? p : best), positions[0])
  return [highest[0], highest[1] + 0.22, highest[2]]
}

export function nextDistinctFlavor(used: ScoopFlavor[]): ScoopFlavor {
  const unused = SCOOP_FLAVORS.find((f) => !used.some((u) => u.id === f.id))
  return unused || SCOOP_FLAVORS[used.length % SCOOP_FLAVORS.length]
}
