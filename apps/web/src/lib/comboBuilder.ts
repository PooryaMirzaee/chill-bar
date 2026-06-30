import type { ComboRecommendationSettings, ComboContext } from '@chill-bar/shared'
import { buildComboRecommendation } from '@chill-bar/shared'
import type { ComboSuggestion, ContextData, MenuItem } from '../types'
import { getSmartPicks, type ScoreOptions } from './recommendations'

function toComboContext(ctx: ContextData): ComboContext {
  return {
    timeOfDay: ctx.timeOfDay,
    weather: ctx.weather
      ? { isHot: ctx.weather.isHot, isCold: ctx.weather.isCold, weatherCode: ctx.weather.weatherCode }
      : null,
    mood: ctx.mood,
  }
}

export function buildSmartCombo(
  items: MenuItem[],
  ctx: ContextData,
  settings: ComboRecommendationSettings,
  opts?: { comboTitle?: string; defaultReason?: string; scoreOpts?: ScoreOptions },
): ComboSuggestion {
  const scored = getSmartPicks(items, ctx, items.length, opts?.scoreOpts)
  const scoreMap = new Map(scored.map((s) => [s.id, s.score]))
  const scoreFn = (item: MenuItem) => scoreMap.get(item.id) ?? 0

  const result = buildComboRecommendation(items, toComboContext(ctx), settings, {
    scoreFn,
    comboTitle: opts?.comboTitle,
  })

  return result
}

export function formatPrice(price: number, suffix = ' تومان'): string {
  return price.toLocaleString('fa-IR') + suffix
}
