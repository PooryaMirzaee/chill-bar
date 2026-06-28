import type { MenuItem, ScoredItem } from '../types'

const STORAGE_KEY = 'chill-taste-profile'

export interface TasteProfile {
  likedIds: string[]
  skippedIds: string[]
  likedCategories: Record<string, number>
  likedTags: Record<string, number>
  updatedAt: number
}

export function emptyProfile(): TasteProfile {
  return {
    likedIds: [],
    skippedIds: [],
    likedCategories: {},
    likedTags: {},
    updatedAt: Date.now(),
  }
}

export function loadTasteProfile(): TasteProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...emptyProfile(), ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return emptyProfile()
}

export function saveTasteProfile(profile: TasteProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, updatedAt: Date.now() }))
}

function bumpTags(target: Record<string, number>, tags: Record<string, number>, weight = 1) {
  for (const [key, val] of Object.entries(tags)) {
    if (val > 0.2) target[key] = (target[key] || 0) + val * weight
  }
}

export function recordLike(profile: TasteProfile, item: MenuItem): TasteProfile {
  const next: TasteProfile = {
    ...profile,
    likedIds: profile.likedIds.includes(item.id) ? profile.likedIds : [...profile.likedIds, item.id],
    skippedIds: profile.skippedIds.filter((id) => id !== item.id),
    likedCategories: { ...profile.likedCategories },
    likedTags: { ...profile.likedTags },
  }
  next.likedCategories[item.category] = (next.likedCategories[item.category] || 0) + 1
  bumpTags(next.likedTags, item.tags, 1.2)
  saveTasteProfile(next)
  return next
}

export function recordSkip(profile: TasteProfile, item: MenuItem): TasteProfile {
  const next: TasteProfile = {
    ...profile,
    skippedIds: profile.skippedIds.includes(item.id) ? profile.skippedIds : [...profile.skippedIds, item.id],
    likedIds: profile.likedIds.filter((id) => id !== item.id),
    likedCategories: { ...profile.likedCategories },
    likedTags: { ...profile.likedTags },
  }
  bumpTags(next.likedTags, item.tags, -0.35)
  saveTasteProfile(next)
  return next
}

export function getTopCategories(profile: TasteProfile, limit = 3): { id: string; count: number }[] {
  return Object.entries(profile.likedCategories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }))
}

export function getTasteRecommendations(
  items: MenuItem[],
  profile: TasteProfile,
  limit = 5,
): ScoredItem[] {
  if (profile.likedIds.length === 0) return []

  const seen = new Set([...profile.likedIds, ...profile.skippedIds])

  return items
    .filter((item) => !seen.has(item.id))
    .map((item) => {
      let score = 0
      const reasons: string[] = []

      const catScore = profile.likedCategories[item.category] || 0
      if (catScore > 0) {
        score += catScore * 2.5
        reasons.push('نزدیک به دسته‌های مورد علاقه‌ات')
      }

      for (const [tag, weight] of Object.entries(profile.likedTags)) {
        const val = item.tags[tag] ?? 0
        if (val > 0.3 && weight > 0) {
          score += val * weight * 1.5
        }
      }

      if (reasons.length === 0 && score > 0) {
        reasons.push('هماهنگ با سلیقه‌ات')
      }

      return {
        ...item,
        score,
        reason: reasons[0] || 'پیشنهاد تازه بر اساس سلیقه‌ات',
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function describeTaste(profile: TasteProfile, items: MenuItem[] = []): string {
  const n = profile.likedIds.length
  if (n === 0) return 'هنوز سلیقه‌ات رو کشف نکردیم — چند تا سوایپ کن!'
  const cats = getTopCategories(profile, 2)
  if (cats.length === 0) return `${n} مورد به سلیقه‌ات نزدیک بود`
  const names = cats.map((c) => items.find((i) => i.category === c.id)?.categoryName || c.id)
  return `${n} مورد دوست داشتی · بیشتر جذب ${names.join(' و ')} شدی`
}
