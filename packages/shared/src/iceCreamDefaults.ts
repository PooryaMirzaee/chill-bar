import {
  LEGACY_BASE_PROFILES,
  LEGACY_COATING_PROFILES,
  LEGACY_FILLING_PROFILES,
} from './iceCream'
import type { IceCreamVisualProfile } from './types'

/** Seed-time visual profiles keyed by option id */
export const SEED_VISUAL_PROFILES: Record<string, IceCreamVisualProfile> = {
  pistachio: {
    colors: LEGACY_BASE_PROFILES.pistachio.colors,
    textureKind: LEGACY_BASE_PROFILES.pistachio.texture,
    speckleColor: LEGACY_BASE_PROFILES.pistachio.speckleColor,
  },
  nutella: {
    colors: LEGACY_BASE_PROFILES.nutella.colors,
    textureKind: LEGACY_BASE_PROFILES.nutella.texture,
    speckleColor: LEGACY_BASE_PROFILES.nutella.speckleColor,
  },
  hazelnut: {
    colors: LEGACY_BASE_PROFILES.hazelnut.colors,
    textureKind: LEGACY_BASE_PROFILES.hazelnut.texture,
    speckleColor: LEGACY_BASE_PROFILES.hazelnut.speckleColor,
  },
  strawberry: {
    colors: LEGACY_BASE_PROFILES.strawberry.colors,
    textureKind: LEGACY_BASE_PROFILES.strawberry.texture,
    speckleColor: LEGACY_BASE_PROFILES.strawberry.speckleColor,
  },
  vanilla: {
    colors: LEGACY_BASE_PROFILES.vanilla.colors,
    textureKind: LEGACY_BASE_PROFILES.vanilla.texture,
  },
  white: {
    coatingStyle: LEGACY_COATING_PROFILES.white.style,
    thickness: LEGACY_COATING_PROFILES.white.thickness,
    wavyEdge: LEGACY_COATING_PROFILES.white.wavyEdge,
  },
  milk36: {
    coatingStyle: LEGACY_COATING_PROFILES.milk36.style,
    thickness: LEGACY_COATING_PROFILES.milk36.thickness,
    wavyEdge: LEGACY_COATING_PROFILES.milk36.wavyEdge,
  },
  dark60: {
    coatingStyle: LEGACY_COATING_PROFILES.dark60.style,
    thickness: LEGACY_COATING_PROFILES.dark60.thickness,
    wavyEdge: LEGACY_COATING_PROFILES.dark60.wavyEdge,
  },
  'white-hazelnut': {
    coatingStyle: LEGACY_COATING_PROFILES['white-hazelnut'].style,
    thickness: LEGACY_COATING_PROFILES['white-hazelnut'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['white-hazelnut'].wavyEdge,
  },
  'milk-hazelnut': {
    coatingStyle: LEGACY_COATING_PROFILES['milk-hazelnut'].style,
    thickness: LEGACY_COATING_PROFILES['milk-hazelnut'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['milk-hazelnut'].wavyEdge,
  },
  'milk-almond': {
    coatingStyle: LEGACY_COATING_PROFILES['milk-almond'].style,
    thickness: LEGACY_COATING_PROFILES['milk-almond'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['milk-almond'].wavyEdge,
  },
  'white-pistachio': {
    coatingStyle: LEGACY_COATING_PROFILES['white-pistachio'].style,
    thickness: LEGACY_COATING_PROFILES['white-pistachio'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['white-pistachio'].wavyEdge,
  },
  'milk-pistachio': {
    coatingStyle: LEGACY_COATING_PROFILES['milk-pistachio'].style,
    thickness: LEGACY_COATING_PROFILES['milk-pistachio'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['milk-pistachio'].wavyEdge,
  },
  'milk-walnut': {
    coatingStyle: LEGACY_COATING_PROFILES['milk-walnut'].style,
    thickness: LEGACY_COATING_PROFILES['milk-walnut'].thickness,
    wavyEdge: LEGACY_COATING_PROFILES['milk-walnut'].wavyEdge,
  },
  none: {
    coatingStyle: LEGACY_COATING_PROFILES.none.style,
    thickness: LEGACY_COATING_PROFILES.none.thickness,
    wavyEdge: LEGACY_COATING_PROFILES.none.wavyEdge,
  },
  peanut: {
    fillingStyle: LEGACY_FILLING_PROFILES.peanut.style,
    secondaryColor: LEGACY_FILLING_PROFILES.peanut.secondaryColor,
  },
  lotus: {
    fillingStyle: LEGACY_FILLING_PROFILES.lotus.style,
    secondaryColor: LEGACY_FILLING_PROFILES.lotus.secondaryColor,
  },
  'pistachio-cream': {
    fillingStyle: LEGACY_FILLING_PROFILES['pistachio-cream'].style,
    secondaryColor: LEGACY_FILLING_PROFILES['pistachio-cream'].secondaryColor,
  },
  'nutella-fill': {
    fillingStyle: LEGACY_FILLING_PROFILES['nutella-fill'].style,
    secondaryColor: LEGACY_FILLING_PROFILES['nutella-fill'].secondaryColor,
  },
  'honey-milk': {
    fillingStyle: LEGACY_FILLING_PROFILES['honey-milk'].style,
    secondaryColor: LEGACY_FILLING_PROFILES['honey-milk'].secondaryColor,
  },
  nestle: {
    fillingStyle: LEGACY_FILLING_PROFILES.nestle.style,
    secondaryColor: LEGACY_FILLING_PROFILES.nestle.secondaryColor,
  },
  caramel: {
    fillingStyle: LEGACY_FILLING_PROFILES.caramel.style,
    secondaryColor: LEGACY_FILLING_PROFILES.caramel.secondaryColor,
  },
  biscuit: {
    fillingStyle: LEGACY_FILLING_PROFILES.biscuit.style,
    secondaryColor: LEGACY_FILLING_PROFILES.biscuit.secondaryColor,
  },
  'strawberry-fill': {
    fillingStyle: LEGACY_FILLING_PROFILES['strawberry-fill'].style,
    secondaryColor: LEGACY_FILLING_PROFILES['strawberry-fill'].secondaryColor,
  },
}

export const DEFAULT_ICE_CREAM_BUILDER_SETTINGS = {
  basePrice: 240,
  minPrice: 230,
  enabled: true,
  smartSuggestions: true,
}

export const ICE_CREAM_NUT_TEXTURES = ['hazelnut', 'almond', 'pistachio', 'walnut'] as const

export const ICE_CREAM_TEXTURE_KINDS = [
  'smooth',
  'speckle',
  'seeds',
  'marble',
  'swirl',
  'chunks',
] as const

export const ICE_CREAM_COATING_STYLES = [
  'none',
  'smooth-gloss',
  'dark-matte',
  'white-gloss',
  'crunchy',
  'drizzle',
] as const

export const ICE_CREAM_FILLING_STYLES = [
  'pool',
  'ribbon',
  'swirl',
  'core',
  'striped',
  'chunks',
] as const
