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

/** Base price 0 with paid options: the real price only exists after choosing options. */
export function isOptionPriced(item: Pick<MenuItem, 'price' | 'modifiers'>): boolean {
  return (
    item.price <= 0 &&
    (item.modifiers ?? []).some((group) => group.options.some((option) => option.price > 0))
  )
}

/** Cheapest valid configuration: required groups at their cheapest option, else the cheapest paid option. */
export function startingPrice(item: Pick<MenuItem, 'price' | 'modifiers'>): number {
  const groups = item.modifiers ?? []
  const required = groups
    .filter((g) => g.required && g.options.length > 0)
    .reduce((sum, g) => sum + Math.min(...g.options.map((o) => o.price)), 0)
  if (required > 0) return item.price + required
  const paid = groups.flatMap((g) => g.options.map((o) => o.price)).filter((p) => p > 0)
  return item.price + (paid.length > 0 ? Math.min(...paid) : 0)
}

/** Price label for menu listings; null when the price is only known inside the item. */
export function formatMenuPrice(item: Pick<MenuItem, 'price' | 'modifiers'>): string | null {
  return isOptionPriced(item) ? null : formatPrice(item.price)
}
