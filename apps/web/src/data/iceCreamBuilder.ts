import type { WeatherData } from '../types'
import type { IceCreamOption } from '@chill-bar/shared'
import { calcIceCreamPrice } from '@chill-bar/shared'

export type { IceCreamOption }

export const BASES: IceCreamOption[] = [
  { id: 'pistachio', name: 'پسته', color: '#7cb87c', priceMod: 30, emoji: '🟢', coldBoost: 0.3 },
  { id: 'nutella', name: 'نوتلا', color: '#5c3a1e', priceMod: 20, emoji: '🟤', hotBoost: 0.2 },
  { id: 'hazelnut', name: 'فندق', color: '#a67c52', priceMod: 25, emoji: '🌰' },
  { id: 'strawberry', name: 'توت فرنگی', color: '#e85d8a', priceMod: 10, emoji: '🍓', coldBoost: 0.5 },
  { id: 'vanilla', name: 'وانیل', color: '#f5e6c8', priceMod: 0, emoji: '🤍' },
]

export const COATINGS: IceCreamOption[] = [
  { id: 'white', name: 'شکلات سفید', color: '#f0ebe3', priceMod: 0, emoji: '⬜' },
  { id: 'milk36', name: 'شکلات شیری ۳۶٪', color: '#8b6914', priceMod: 0, emoji: '🍫' },
  { id: 'dark60', name: 'شکلات تلخ ۶۰٪', color: '#3d2314', priceMod: 5, emoji: '🖤' },
  { id: 'white-hazelnut', name: 'شکلات سفید و مغز فندق', color: '#e8dcc8', texture: 'hazelnut', priceMod: 15, emoji: '🌰' },
  { id: 'milk-hazelnut', name: 'شکلات و مغز فندق', color: '#6b4423', texture: 'hazelnut', priceMod: 15, emoji: '🌰' },
  { id: 'milk-almond', name: 'شکلات و مغز بادام', color: '#7a5230', texture: 'almond', priceMod: 15, emoji: '🥜' },
  { id: 'white-pistachio', name: 'شکلات سفید و مغز پسته', color: '#dce8d0', texture: 'pistachio', priceMod: 20, emoji: '🟢' },
  { id: 'milk-pistachio', name: 'شکلات و مغز پسته', color: '#5a4020', texture: 'pistachio', priceMod: 20, emoji: '🟢' },
  { id: 'milk-walnut', name: 'شکلات و مغز گردو', color: '#4a3020', texture: 'walnut', priceMod: 15, emoji: '🥜' },
  { id: 'none', name: 'بدون روکش', color: 'transparent', priceMod: -10, emoji: '○' },
]

export const FILLINGS: IceCreamOption[] = [
  { id: 'peanut', name: 'شکلات بادام زمینی', color: '#c4956a', priceMod: 10, emoji: '🥜' },
  { id: 'lotus', name: 'کرم لوتوس', color: '#d4a055', priceMod: 15, emoji: '🍪' },
  { id: 'pistachio-cream', name: 'کرم پسته', color: '#8fbc8f', priceMod: 20, emoji: '🟢' },
  { id: 'nutella-fill', name: 'نوتلا', color: '#5c3a1e', priceMod: 15, emoji: '🍫' },
  { id: 'honey-milk', name: 'شیر عسل', color: '#f0d890', priceMod: 5, emoji: '🍯' },
  { id: 'nestle', name: 'شکلات نستله', color: '#6b3a2a', priceMod: 10, emoji: '🍫' },
  { id: 'caramel', name: 'تافی کارامل', color: '#c87830', priceMod: 10, emoji: '🍮' },
  { id: 'biscuit', name: 'کرم بیسکویت', color: '#c4a882', priceMod: 10, emoji: '🍪' },
  { id: 'strawberry-fill', name: 'توت فرنگی', color: '#e85d8a', priceMod: 5, emoji: '🍓', coldBoost: 0.4 },
]

export const BASE_PRICE = 240

export interface IceCreamBuild {
  base: IceCreamOption | null
  coating: IceCreamOption | null
  filling: IceCreamOption | null
}

export function calcPrice(build: IceCreamBuild, basePrice = BASE_PRICE, minPrice = 230): number {
  return calcIceCreamPrice(build, basePrice, minPrice)
}

export function buildName(build: IceCreamBuild, customLabel = 'بستنی سفارشی'): string {
  if (!build.base || !build.coating || !build.filling) return customLabel
  return `${customLabel} (${build.base.name} · ${build.coating.name} · ${build.filling.name})`
}

export interface IceCreamCatalog {
  bases: IceCreamOption[]
  coatings: IceCreamOption[]
  fillings: IceCreamOption[]
}

export function getSmartIceCreamSuggestion(
  weather: WeatherData | null,
  catalog: IceCreamCatalog = { bases: BASES, coatings: COATINGS, fillings: FILLINGS },
): Partial<IceCreamBuild> {
  const { bases, coatings, fillings } = catalog
  if (!weather) {
    return { base: bases.find((b) => b.id === 'nutella')!, filling: fillings.find((f) => f.id === 'lotus')! }
  }
  if (weather.isHot) {
    return {
      base: bases.find((b) => b.id === 'strawberry') ?? bases[0],
      coating: coatings.find((c) => c.id === 'white') ?? coatings[0],
      filling: fillings.find((f) => f.id === 'strawberry-fill') ?? fillings[0],
    }
  }
  if (weather.isCold || weather.weatherCode >= 51) {
    return {
      base: bases.find((b) => b.id === 'nutella') ?? bases[0],
      coating: coatings.find((c) => c.id === 'milk-hazelnut') ?? coatings[0],
      filling: fillings.find((f) => f.id === 'caramel') ?? fillings[0],
    }
  }
  return {
    base: bases.find((b) => b.id === 'pistachio') ?? bases[0],
    coating: coatings.find((c) => c.id === 'milk-pistachio') ?? coatings[0],
    filling: fillings.find((f) => f.id === 'pistachio-cream') ?? fillings[0],
  }
}

export function scoreOption(
  option: IceCreamOption,
  weather: WeatherData | null,
  step: 'base' | 'coating' | 'filling',
): number {
  let score = 0
  if (weather?.isHot && option.coldBoost) score += option.coldBoost * 3
  if (weather?.isCold && option.hotBoost) score += option.hotBoost * 3
  if (!weather?.isHot && !weather?.isCold && step === 'base') score += Math.random() * 0.3
  return score
}
