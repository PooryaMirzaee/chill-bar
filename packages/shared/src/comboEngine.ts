import type { ComboRecommendationSettings, ComboTemplate, CategoryPairRule } from './comboSettings'
import type { MenuItem } from './types'

export interface ComboContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  weather: { isHot: boolean; isCold: boolean; weatherCode: number } | null
  mood: string | null
}

export interface PairingResult {
  item: MenuItem
  reason: string
}

export interface ComboResult {
  items: MenuItem[]
  total: number
  title: string
  reason: string
}

type ScoreFn = (item: MenuItem) => number

function isAvailable(item: MenuItem): boolean {
  return item.isAvailable !== false
}

function tagScore(item: MenuItem, hints: string[]): number {
  if (!hints.length) return 0
  let sum = 0
  for (const hint of hints) {
    sum += item.tags[hint] ?? 0
  }
  return sum / hints.length
}

function contextScore(item: MenuItem, ctx: ComboContext): number {
  let score = 0
  const tags = item.tags

  const timeHints: Record<ComboContext['timeOfDay'], string[]> = {
    morning: ['breakfast', 'energetic', 'hot'],
    afternoon: ['fresh', 'cold', 'light'],
    evening: ['cozy', 'hot', 'relax'],
    night: ['cozy', 'relax', 'sweet'],
  }
  for (const hint of timeHints[ctx.timeOfDay]) {
    score += (tags[hint] ?? 0) * 1.2
  }

  if (ctx.weather?.isHot) score += (tags.cold ?? 0) * 2 - (tags.hot ?? 0)
  if (ctx.weather?.isCold) score += (tags.hot ?? 0) * 2
  if (ctx.weather && ctx.weather.weatherCode >= 51) {
    score += (tags.cozy ?? 0) + (tags.relax ?? 0)
  }

  return score
}

function pickBest(
  pool: MenuItem[],
  scoreFn: ScoreFn,
  excludeIds: Set<string>,
): MenuItem | null {
  const candidates = pool.filter((i) => isAvailable(i) && !excludeIds.has(i.id))
  if (!candidates.length) return null
  return candidates.reduce((best, cur) => (scoreFn(cur) > scoreFn(best) ? cur : best))
}

function templateMatches(template: ComboTemplate, ctx: ComboContext): boolean {
  if (template.timeOfDay.length && !template.timeOfDay.includes(ctx.timeOfDay)) return false
  if (template.moods.length && (!ctx.mood || !template.moods.includes(ctx.mood))) return false
  if (template.weather === 'hot' && !ctx.weather?.isHot) return false
  if (template.weather === 'cold' && !ctx.weather?.isCold) return false
  if (template.weather === 'rainy' && (ctx.weather?.weatherCode ?? 0) < 51) return false
  return true
}

function pickForTemplate(
  items: MenuItem[],
  template: ComboTemplate,
  ctx: ComboContext,
  settings: ComboRecommendationSettings,
  scoreFn: ScoreFn,
): MenuItem[] {
  const count = template.itemCount
  const requireDistinct = template.requireDistinctCategories
  const filter = template.categoryFilter.length ? new Set(template.categoryFilter) : null
  const pool = items.filter((i) => isAvailable(i) && (!filter || filter.has(i.category)))
  const picked: MenuItem[] = []
  const usedCategories = new Set<string>()
  const usedIds = new Set<string>()

  for (let slot = 0; slot < count; slot++) {
    const slotPool = pool.filter((i) => {
      if (usedIds.has(i.id)) return false
      if (requireDistinct && usedCategories.has(i.category)) return false
      return true
    })
    const item = pickBest(
      slotPool,
      (i) => scoreFn(i) + contextScore(i, ctx) + tagScore(i, []) * 0,
      usedIds,
    )
    if (!item) break
    picked.push(item)
    usedIds.add(item.id)
    usedCategories.add(item.category)
  }

  if (picked.length < settings.minComboItems && requireDistinct) {
    return pickDiverseCombo(items, ctx, count, settings, scoreFn)
  }
  return picked
}

function pickDiverseCombo(
  items: MenuItem[],
  ctx: ComboContext,
  count: number,
  settings: ComboRecommendationSettings,
  scoreFn: ScoreFn,
): MenuItem[] {
  const pool = items.filter(isAvailable)
  const picked: MenuItem[] = []
  const usedCategories = new Set<string>()
  const usedIds = new Set<string>()

  const anchor = pickBest(pool, (i) => scoreFn(i) + contextScore(i, ctx), usedIds)
  if (!anchor) return []
  picked.push(anchor)
  usedIds.add(anchor.id)
  usedCategories.add(anchor.category)

  const anchorTags = Object.entries(anchor.tags)
    .filter(([, v]) => v > 0.4)
    .map(([k]) => k)

  while (picked.length < count) {
    const slotPool = pool.filter((i) => {
      if (usedIds.has(i.id)) return false
      if (settings.requireDistinctCategories && usedCategories.has(i.category)) return false
      return true
    })
    if (!slotPool.length) break

    const item = pickBest(slotPool, (i) => {
      let s = scoreFn(i) + contextScore(i, ctx)
      if (settings.preferComplementaryTags && anchorTags.length) {
        const overlap = anchorTags.reduce((acc, t) => acc + (i.tags[t] ?? 0), 0) / anchorTags.length
        s += (1 - overlap) * 2
      }
      return s
    }, usedIds)
    if (!item) break
    picked.push(item)
    usedIds.add(item.id)
    usedCategories.add(item.category)
  }

  return picked
}

export function suggestPairing(
  item: MenuItem,
  allItems: MenuItem[],
  settings: ComboRecommendationSettings,
  ctx?: ComboContext,
): PairingResult | null {
  if (!settings.pairingEnabled) return null
  const context = ctx ?? { timeOfDay: 'afternoon' as const, weather: null, mood: null }

  const rules = settings.categoryPairs
    .filter((r) => r.enabled && r.fromCategoryId === item.category)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of rules) {
    const result = pickFromRule(item, allItems, rule, context)
    if (result) return result
  }

  const fallbackPool = allItems.filter(
    (i) => i.id !== item.id && i.category !== item.category && isAvailable(i),
  )
  const best = pickBest(fallbackPool, (i) => contextScore(i, context), new Set())
  if (!best) return null
  return { item: best, reason: settings.fallbackPairingReason }
}

function pickFromRule(
  item: MenuItem,
  allItems: MenuItem[],
  rule: CategoryPairRule,
  ctx: ComboContext,
): PairingResult | null {
  const toSet = new Set(rule.toCategoryIds)
  const pool = allItems.filter(
    (i) => i.id !== item.id && toSet.has(i.category) && isAvailable(i),
  )
  if (!pool.length) return null

  const best = pickBest(
    pool,
    (i) => tagScore(i, rule.tagHints) + contextScore(i, ctx),
    new Set(),
  )
  if (!best) return null
  return { item: best, reason: rule.label }
}

export function buildComboRecommendation(
  items: MenuItem[],
  ctx: ComboContext,
  settings: ComboRecommendationSettings,
  opts?: { scoreFn?: ScoreFn; comboTitle?: string },
): ComboResult {
  const scoreFn: ScoreFn = opts?.scoreFn ?? ((i) => contextScore(i, ctx))
  const available = items.filter(isAvailable)

  if (settings.templatesFirst) {
    const templates = settings.templates
      .filter((t) => t.enabled)
      .sort((a, b) => b.priority - a.priority)

    for (const template of templates) {
      if (!templateMatches(template, ctx)) continue
      const picked = pickForTemplate(available, template, ctx, settings, scoreFn)
      if (picked.length >= settings.minComboItems) {
        return {
          items: picked,
          total: picked.reduce((s, i) => s + i.price, 0),
          title: template.title,
          reason: template.reason,
        }
      }
    }
  }

  const diverse = pickDiverseCombo(available, ctx, settings.comboItemCount, settings, scoreFn)
  if (diverse.length >= settings.minComboItems) {
    return {
      items: diverse,
      total: diverse.reduce((s, i) => s + i.price, 0),
      title: opts?.comboTitle ?? 'کمبو هوشمند',
      reason: settings.fallbackComboReason,
    }
  }

  if (!settings.templatesFirst) {
    const templates = settings.templates
      .filter((t) => t.enabled)
      .sort((a, b) => b.priority - a.priority)
    for (const template of templates) {
      if (!templateMatches(template, ctx)) continue
      const picked = pickForTemplate(available, template, ctx, settings, scoreFn)
      if (picked.length >= settings.minComboItems) {
        return {
          items: picked,
          total: picked.reduce((s, i) => s + i.price, 0),
          title: template.title,
          reason: template.reason,
        }
      }
    }
  }

  const fallback = available.slice(0, settings.comboItemCount)
  return {
    items: fallback,
    total: fallback.reduce((s, i) => s + i.price, 0),
    title: opts?.comboTitle ?? 'پیشنهاد ویژه',
    reason: settings.fallbackComboReason,
  }
}
