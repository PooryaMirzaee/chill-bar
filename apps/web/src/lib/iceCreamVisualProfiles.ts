import {
  resolveBaseProfile,
  resolveCoatingProfile,
  resolveFillingProfile,
  type IceCreamOption,
} from '@chill-bar/shared'
import type { IceCreamBuild } from '../data/iceCreamBuilder'

export type TextureKind = 'smooth' | 'speckle' | 'seeds' | 'marble' | 'swirl' | 'chunks'
export type CoatingStyle = 'none' | 'smooth-gloss' | 'dark-matte' | 'white-gloss' | 'crunchy' | 'drizzle'
export type FillingStyle = 'pool' | 'ribbon' | 'swirl' | 'core' | 'striped' | 'chunks'

export type { BaseProfile, CoatingProfile, FillingProfile } from '@chill-bar/shared'

/** Speckle/seed positions seeded by id */
export function generateTextureDots(id: string, count: number, bounds: { x: number; y: number; w: number; h: number }) {
  const dots: { cx: number; cy: number; r: number }[] = []
  let seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    dots.push({
      cx: bounds.x + ((seed % 1000) / 1000) * bounds.w,
      cy: bounds.y + (((seed >> 10) % 1000) / 1000) * bounds.h,
      r: 0.4 + (seed % 3) * 0.3,
    })
  }
  return dots
}

export function coatingPath(wavy: boolean, thickness: number): string {
  const t = 78 - (1 - thickness) * 8
  if (wavy) {
    return `M 36 ${t + 18} L 36 ${t + 4} Q 38 ${t - 2} 48 ${t} Q 60 ${t - 6} 72 ${t} Q 82 ${t - 2} 84 ${t + 4} L 84 ${t + 20} Q 72 ${t + 26} 60 ${t + 22} Q 48 ${t + 26} 36 ${t + 20} Z`
  }
  return `M 38 ${t + 16} L 38 ${t + 2} Q 60 ${t - 4} 82 ${t + 2} L 82 ${t + 18} Q 60 ${t + 24} 38 ${t + 16} Z`
}

export function crunchyNutPieces(texture: string | undefined, seed: string) {
  const colors: Record<string, string[]> = {
    hazelnut: ['#c4956a', '#a67c52', '#8b6914'],
    almond: ['#d4b896', '#c4a882', '#a08060'],
    pistachio: ['#9fcc9f', '#7cb87c', '#5a9a5a'],
    walnut: ['#8b7355', '#6b5344', '#4a3828'],
  }
  const pal = colors[texture || 'hazelnut'] || colors.hazelnut
  let s = seed.length * 7
  return Array.from({ length: 22 }, (_, i) => {
    s = (s * 13 + i * 17) % 100
    return {
      cx: 34 + (s % 48),
      cy: 74 + ((s * 3) % 30),
      rx: 1.5 + (s % 4) * 0.5,
      ry: 1 + (s % 3) * 0.4,
      rot: (s * 11) % 360,
      color: pal[s % pal.length],
    }
  })
}

export function getBaseProfile(opt: IceCreamOption | null) {
  return resolveBaseProfile(opt)
}

export function getCoatingProfile(opt: IceCreamOption | null) {
  return resolveCoatingProfile(opt)
}

export function getFillingProfile(opt: IceCreamOption | null) {
  return resolveFillingProfile(opt)
}

// keep build type import used
export type { IceCreamBuild }
