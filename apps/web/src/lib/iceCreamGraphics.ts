import type { IceCreamBuild, IceCreamOption } from '../data/iceCreamBuilder'

export interface CoatingStyle {
  main: string
  highlight: string
  shadow: string
  gloss: string
}

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 255) - amount)
  const g = Math.max(0, ((n >> 8) & 255) - amount)
  const b = Math.max(0, (n & 255) - amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((n >> 16) & 255) + amount)
  const g = Math.min(255, ((n >> 8) & 255) + amount)
  const b = Math.min(255, (n & 255) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function getCoatingStyle(coating: IceCreamOption | null): CoatingStyle {
  if (!coating || coating.id === 'none') {
    return { main: 'transparent', highlight: 'transparent', shadow: 'transparent', gloss: 'transparent' }
  }
  const c = coating.color
  return {
    main: c,
    highlight: lighten(c, 40),
    shadow: darken(c, 35),
    gloss: lighten(c, 70),
  }
}

export function getBaseGradient(base: IceCreamOption | null): [string, string, string] {
  if (!base) return ['#f0e4d0', '#e8dcc8', '#d4c4a8']
  return [lighten(base.color, 30), base.color, darken(base.color, 25)]
}

export interface NutPiece {
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
  color: string
}

const NUT_COLORS: Record<string, string[]> = {
  hazelnut: ['#c4956a', '#a67c52', '#8b6914'],
  almond: ['#d4b896', '#c4a882', '#a08060'],
  pistachio: ['#9fcc9f', '#7cb87c', '#5a9a5a'],
  walnut: ['#8b7355', '#6b5344', '#4a3828'],
}

export function generateNutPieces(texture: string | undefined, seed: number): NutPiece[] {
  if (!texture) return []
  const colors = NUT_COLORS[texture] || NUT_COLORS.hazelnut
  const pieces: NutPiece[] = []
  for (let i = 0; i < 18; i++) {
    const s = (seed + i * 7) % 100
    pieces.push({
      cx: 28 + (s % 55),
      cy: 72 + ((s * 3) % 28),
      rx: 2 + (s % 3),
      ry: 1.5 + (s % 2),
      rot: (s * 13) % 360,
      color: colors[s % colors.length],
    })
  }
  return pieces
}

export interface DripDrop {
  x: number
  y: number
  h: number
  w: number
  delay: number
}

export function generateDrips(coatingId: string | undefined): DripDrop[] {
  if (!coatingId || coatingId === 'none') return []
  return [
    { x: 38, y: 100, h: 14, w: 5, delay: 0 },
    { x: 72, y: 98, h: 10, w: 4, delay: 0.4 },
    { x: 55, y: 102, h: 8, w: 3.5, delay: 0.8 },
  ]
}

export function getBuildProgress(build: IceCreamBuild): number {
  let p = 0
  if (build.base) p += 33
  if (build.coating) p += 33
  if (build.filling) p += 34
  return p
}

export const FLOATING_NUTS = [
  { x: '8%', y: '12%', size: 28, rot: -15, type: 'hazelnut' },
  { x: '82%', y: '8%', size: 22, rot: 20, type: 'almond' },
  { x: '5%', y: '68%', size: 20, rot: 45, type: 'pistachio' },
  { x: '88%', y: '55%', size: 26, rot: -30, type: 'walnut' },
  { x: '75%', y: '78%', size: 18, rot: 10, type: 'choco' },
  { x: '15%', y: '42%', size: 16, rot: -8, type: 'choco' },
] as const
