import type { ContextData, MenuItem, Mood, ScoredItem, TimeOfDay } from '../types'
import type { MoodDefinition } from '@chill-bar/shared'

export interface ScoreOptions {
  moods?: MoodDefinition[]
  defaultReason?: string
}

function buildMoodMaps(moods?: MoodDefinition[]) {
  const tagMap: Record<string, Record<string, number>> = {}
  const labelMap: Record<string, string> = {}
  for (const m of moods ?? []) {
    tagMap[m.id] = m.tagWeights
    labelMap[m.id] = m.label
  }
  return { tagMap, labelMap }
}

function scoreItem(item: MenuItem, ctx: ContextData, opts?: ScoreOptions): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []
  const tags = item.tags
  const { tagMap, labelMap } = buildMoodMaps(opts?.moods)

  const tagBoost = tags[ctx.timeOfDay] ?? 0
  if (tagBoost > 0.5) {
    score += tagBoost * 3
    reasons.push(`مناسب ${ctx.timeOfDay === 'morning' ? 'صبح' : ctx.timeOfDay === 'afternoon' ? 'ظهر' : ctx.timeOfDay === 'evening' ? 'عصر' : 'شب'}`)
  }

  // Time-of-day tag hints (dynamic — works with any category via item tags)
  const timeTagHints: Record<TimeOfDay, string[]> = {
    morning: ['breakfast', 'energetic', 'hot'],
    afternoon: ['fresh', 'cold', 'light'],
    evening: ['cozy', 'hot', 'relax'],
    night: ['cozy', 'relax', 'sweet'],
  }
  for (const tag of timeTagHints[ctx.timeOfDay]) {
    const val = tags[tag] ?? 0
    if (val > 0.4) score += val * 1.5
  }

  if (ctx.weather) {
    if (ctx.weather.isHot) {
      const coldScore = tags.cold ?? 0
      if (coldScore > 0.5) {
        score += coldScore * 4
        reasons.push('خنک‌کننده برای هوای گرم')
      }
      const hotPenalty = tags.hot ?? 0
      score -= hotPenalty * 2
    }
    if (ctx.weather.isCold) {
      const hotScore = tags.hot ?? 0
      if (hotScore > 0.5) {
        score += hotScore * 4
        reasons.push('گرم‌کننده برای هوای سرد')
      }
    }
    if (ctx.weather.weatherCode >= 51) {
      if (tags.cozy || tags.hot || tags.relax) {
        score += 2
        reasons.push('مناسب روز بارانی')
      }
    }
  }

  if (ctx.mood) {
    const moodTags = tagMap[ctx.mood] ?? {}
    for (const [key, weight] of Object.entries(moodTags)) {
      const val = tags[key] ?? 0
      if (val > 0.3) {
        score += val * weight * 2
      }
    }
    const moodLabel = labelMap[ctx.mood] ?? ctx.mood
    reasons.push(`هماهنگ با حال ${moodLabel}`)
  }


  score += Math.random() * 0.5

  return {
    score,
    reason: reasons[0] || opts?.defaultReason || 'پیشنهاد ویژه',
  }
}

export function getSmartPicks(
  items: MenuItem[],
  ctx: ContextData,
  limit = 6,
  opts?: ScoreOptions,
): ScoredItem[] {
  return items
    .map((item) => {
      const { score, reason } = scoreItem(item, ctx, opts)
      return { ...item, score, reason }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function getMoodItems(
  items: MenuItem[],
  mood: Mood,
  limit = 8,
  opts?: ScoreOptions,
): MenuItem[] {
  const ctx: ContextData = {
    timeOfDay: 'afternoon',
    hour: 14,
    weather: null,
    mood,
  }
  return getSmartPicks(items, ctx, limit, opts)
}
