import * as THREE from 'three'
import type { IceCreamOption } from '../data/iceCreamBuilder'
import { getBaseProfile, getCoatingProfile, getFillingProfile } from './iceCreamVisualProfiles'
import { getCoatingStyle, darken, lighten } from './iceCreamGraphics'

export function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

export function makeIceMaterial(hex: string, opts: { roughness?: number; clearcoat?: number; metalness?: number } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: hexToColor(hex),
    roughness: opts.roughness ?? 0.38,
    metalness: opts.metalness ?? 0.02,
    clearcoat: opts.clearcoat ?? 0.15,
    clearcoatRoughness: 0.25,
  })
}

export function makeChocolateMaterial(coating: IceCreamOption | null) {
  const style = getCoatingStyle(coating)
  const profile = getCoatingProfile(coating)
  const isDark = profile.style === 'dark-matte'
  const isWhite = profile.style === 'white-gloss'
  return new THREE.MeshPhysicalMaterial({
    color: hexToColor(style.main),
    roughness: isDark ? 0.55 : isWhite ? 0.22 : 0.18,
    metalness: 0.04,
    clearcoat: isDark ? 0.1 : 0.85,
    clearcoatRoughness: isDark ? 0.6 : 0.12,
    emissive: hexToColor(darken(style.main, 8)),
    emissiveIntensity: 0.04,
  })
}

export function makeBaseMaterial(base: IceCreamOption | null) {
  const profile = getBaseProfile(base)
  return new THREE.MeshPhysicalMaterial({
    color: hexToColor(profile.colors[1]),
    roughness: profile.texture === 'smooth' ? 0.32 : 0.42,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.35,
  })
}

export function makeFillingMaterial(filling: IceCreamOption) {
  const profile = getFillingProfile(filling)
  return new THREE.MeshPhysicalMaterial({
    color: hexToColor(filling.color),
    roughness: profile.style === 'pool' ? 0.25 : 0.4,
    metalness: 0,
    clearcoat: profile.style === 'pool' ? 0.35 : 0.1,
    clearcoatRoughness: 0.2,
  })
}

export interface Nut3D {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: string
}

const NUT_PALETTES: Record<string, string[]> = {
  hazelnut: ['#c4956a', '#a67c52', '#8b6914'],
  almond: ['#d4b896', '#c4a882', '#a08060'],
  pistachio: ['#9fcc9f', '#7cb87c', '#5a9a5a'],
  walnut: ['#8b7355', '#6b5344', '#4a3828'],
}

export function generateNutPieces3D(
  texture: string | undefined,
  seed: string,
  radius = 0.224,
  yMin = -0.03,
  yMax = 0.72,
): Nut3D[] {
  const pal = NUT_PALETTES[texture || 'hazelnut'] || NUT_PALETTES.hazelnut
  let s = seed.length * 7
  return Array.from({ length: 20 }, (_, i) => {
    s = (s * 13 + i * 17) % 100
    const u = (s % 100) / 100
    const v = ((s * 3) % 100) / 100
    const angle = u * Math.PI * 2
    const y = yMin + v * (yMax - yMin)
    const r = radius + (s % 4) * 0.004
    return {
      position: [Math.cos(angle) * r, y, Math.sin(angle) * r],
      scale: [0.035 + (s % 3) * 0.01, 0.022 + (s % 2) * 0.008, 0.028 + (s % 4) * 0.006],
      rotation: [(s * 0.07) % 1, angle, (s * 0.13) % 1],
      color: pal[s % pal.length],
    }
  })
}

export interface Speckle3D {
  position: [number, number, number]
  radius: number
  color: string
}

export function generateSpeckles3D(baseId: string, speckleColor: string, count: number): Speckle3D[] {
  let seed = baseId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const dots: Speckle3D[] = []
  const radius = 0.205
  for (let i = 0; i < count; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const u = (seed % 1000) / 1000
    const v = ((seed >> 10) % 1000) / 1000
    const angle = u * Math.PI * 2
    const y = -0.28 + v * 0.95
    dots.push({
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      radius: 0.01 + (seed % 4) * 0.003,
      color: speckleColor,
    })
  }
  return dots
}

export function getFillingSecondary(filling: IceCreamOption): string {
  const profile = getFillingProfile(filling)
  return profile.secondaryColor || darken(filling.color, 20)
}

export function getBaseHighlight(base: IceCreamOption | null): string {
  const profile = getBaseProfile(base)
  return lighten(profile.colors[0], 10)
}
