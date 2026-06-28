import type { IceCreamOption, IceCreamVisualProfile } from './types'

export type IceCreamTextureKind = NonNullable<IceCreamVisualProfile['textureKind']>
export type IceCreamCoatingStyle = NonNullable<IceCreamVisualProfile['coatingStyle']>
export type IceCreamFillingStyle = NonNullable<IceCreamVisualProfile['fillingStyle']>

export interface BaseProfile {
  colors: [string, string, string]
  texture: IceCreamTextureKind
  speckleColor?: string
}

export interface CoatingProfile {
  style: IceCreamCoatingStyle
  thickness: number
  wavyEdge: boolean
}

export interface FillingProfile {
  style: IceCreamFillingStyle
  secondaryColor?: string
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length < 6) return [200, 200, 200]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
}

function shiftColor(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}

export function deriveBaseColors(color: string): [string, string, string] {
  if (color === 'transparent') return ['#f5f5f5', '#e8e8e8', '#d8d8d8']
  return [shiftColor(color, 40), color, shiftColor(color, -35)]
}

export const LEGACY_BASE_PROFILES: Record<string, BaseProfile> = {
  pistachio: { colors: ['#a8d8a8', '#7cb87c', '#4a8a4a'], texture: 'speckle', speckleColor: '#2d5a2d' },
  nutella: { colors: ['#7a4a28', '#5c3a1e', '#3d2314'], texture: 'marble', speckleColor: '#2a1810' },
  hazelnut: { colors: ['#c4a070', '#a67c52', '#7a5a38'], texture: 'speckle', speckleColor: '#5c4020' },
  strawberry: { colors: ['#f0a0b8', '#e85d8a', '#c04068'], texture: 'seeds', speckleColor: '#f5e6c8' },
  vanilla: { colors: ['#fff8f0', '#f5e6c8', '#e8d4b0'], texture: 'smooth' },
}

export const LEGACY_COATING_PROFILES: Record<string, CoatingProfile> = {
  white: { style: 'white-gloss', thickness: 1.1, wavyEdge: true },
  milk36: { style: 'smooth-gloss', thickness: 1, wavyEdge: true },
  dark60: { style: 'dark-matte', thickness: 0.85, wavyEdge: false },
  'white-hazelnut': { style: 'crunchy', thickness: 1.05, wavyEdge: true },
  'milk-hazelnut': { style: 'crunchy', thickness: 1, wavyEdge: true },
  'milk-almond': { style: 'crunchy', thickness: 1, wavyEdge: true },
  'white-pistachio': { style: 'crunchy', thickness: 1.05, wavyEdge: true },
  'milk-pistachio': { style: 'crunchy', thickness: 1, wavyEdge: true },
  'milk-walnut': { style: 'crunchy', thickness: 1, wavyEdge: true },
  none: { style: 'none', thickness: 0, wavyEdge: false },
}

export const LEGACY_FILLING_PROFILES: Record<string, FillingProfile> = {
  peanut: { style: 'striped', secondaryColor: '#8b6914' },
  lotus: { style: 'swirl', secondaryColor: '#b87830' },
  'pistachio-cream': { style: 'ribbon', secondaryColor: '#5a9a5a' },
  'nutella-fill': { style: 'core', secondaryColor: '#3d2314' },
  'honey-milk': { style: 'pool', secondaryColor: '#f5d878' },
  nestle: { style: 'core', secondaryColor: '#4a2820' },
  caramel: { style: 'swirl', secondaryColor: '#a05820' },
  biscuit: { style: 'chunks', secondaryColor: '#a08060' },
  'strawberry-fill': { style: 'pool', secondaryColor: '#ff8cb0' },
}

export function defaultVisualProfileForType(
  type: 'BASE' | 'COATING' | 'FILLING',
  color: string,
): IceCreamVisualProfile {
  switch (type) {
    case 'BASE':
      return {
        colors: deriveBaseColors(color),
        textureKind: 'smooth',
      }
    case 'COATING':
      return {
        coatingStyle: color === 'transparent' ? 'none' : 'smooth-gloss',
        thickness: color === 'transparent' ? 0 : 1,
        wavyEdge: true,
      }
    case 'FILLING':
      return {
        fillingStyle: 'pool',
        secondaryColor: shiftColor(color, -30),
      }
  }
}

export function resolveBaseProfile(opt: IceCreamOption | null): BaseProfile {
  if (!opt) return LEGACY_BASE_PROFILES.vanilla
  const vp = opt.visualProfile
  if (vp?.colors?.length === 3) {
    return {
      colors: vp.colors,
      texture: vp.textureKind ?? 'smooth',
      speckleColor: vp.speckleColor,
    }
  }
  return (
    LEGACY_BASE_PROFILES[opt.id] ?? {
      colors: deriveBaseColors(opt.color),
      texture: 'smooth',
    }
  )
}

export function resolveCoatingProfile(opt: IceCreamOption | null): CoatingProfile {
  if (!opt) return LEGACY_COATING_PROFILES.milk36
  const vp = opt.visualProfile
  if (vp?.coatingStyle) {
    return {
      style: vp.coatingStyle,
      thickness: vp.thickness ?? 1,
      wavyEdge: vp.wavyEdge ?? true,
    }
  }
  return LEGACY_COATING_PROFILES[opt.id] ?? {
    style: opt.color === 'transparent' ? 'none' : 'smooth-gloss',
    thickness: opt.color === 'transparent' ? 0 : 1,
    wavyEdge: true,
  }
}

export function resolveFillingProfile(opt: IceCreamOption | null): FillingProfile {
  if (!opt) return { style: 'pool' }
  const vp = opt.visualProfile
  if (vp?.fillingStyle) {
    return {
      style: vp.fillingStyle,
      secondaryColor: vp.secondaryColor,
    }
  }
  return LEGACY_FILLING_PROFILES[opt.id] ?? {
    style: 'pool',
    secondaryColor: shiftColor(opt.color, -30),
  }
}

export function calcIceCreamPrice(
  build: { base: IceCreamOption | null; coating: IceCreamOption | null; filling: IceCreamOption | null },
  basePrice: number,
  minPrice: number,
): number {
  let price = basePrice
  if (build.base) price += build.base.priceMod
  if (build.coating) price += build.coating.priceMod
  if (build.filling) price += build.filling.priceMod
  return Math.max(price, minPrice)
}

export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r - amount, g - amount, b - amount)
}

export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + amount, g + amount, b + amount)
}
