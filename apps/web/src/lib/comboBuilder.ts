import type { ComboSuggestion, ContextData, MenuItem, Mood, TimeOfDay } from '../types'
import { getSmartPicks, type ScoreOptions } from './recommendations'

interface ComboTemplate {
  title: string
  reason: string
  timeOfDay?: TimeOfDay[]
  weather?: 'hot'
  mood?: Mood
  pickCount?: number
}

const COMBO_TEMPLATES: ComboTemplate[] = [
  {
    title: 'صبحانه کامل چیل',
    reason: 'شروع روز با انرژی و تازگی',
    timeOfDay: ['morning'],
    pickCount: 3,
  },
  {
    title: 'پکیج خنک تابستانی',
    reason: 'فرار از گرما با بهترین‌های سرد',
    weather: 'hot',
    pickCount: 3,
  },
  {
    title: 'ست دل‌گرم عصرانه',
    reason: 'آرامش عصر با طعم‌های گرم',
    timeOfDay: ['evening', 'night'],
    pickCount: 3,
  },
  {
    title: 'کمبو شیرین‌کار',
    reason: 'لذت شیرینی بدون محدودیت',
    mood: 'sweet',
    pickCount: 3,
  },
  {
    title: 'پکیج سالم و سبک',
    reason: 'سبک، تازه و سالم',
    mood: 'fresh',
    pickCount: 3,
  },
  {
    title: 'کافه‌ورک فوکوس',
    reason: 'تمرکز و انرژی برای کار',
    mood: 'energetic',
    pickCount: 3,
  },
]

function pickFromCategory(items: MenuItem[], category: string): MenuItem | null {
  const catItems = items.filter((i) => i.category === category)
  if (!catItems.length) return null
  return catItems[Math.floor(Math.random() * catItems.length)]
}

function pickFromDistinctCategories(items: MenuItem[], count: number): MenuItem[] {
  const byCategory = new Map<string, MenuItem[]>()
  for (const item of items) {
    const list = byCategory.get(item.category) ?? []
    list.push(item)
    byCategory.set(item.category, list)
  }
  const categoryIds = [...byCategory.keys()].sort(() => Math.random() - 0.5)
  const picked: MenuItem[] = []
  for (const catId of categoryIds) {
    if (picked.length >= count) break
    const pool = byCategory.get(catId)!
    picked.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return picked
}

export function buildSmartCombo(
  items: MenuItem[],
  ctx: ContextData,
  opts?: { comboTitle?: string; defaultReason?: string; scoreOpts?: ScoreOptions },
): ComboSuggestion {
  const scored = getSmartPicks(items, ctx, 3, opts?.scoreOpts)
  if (scored.length >= 2) {
    return {
      items: scored.slice(0, 3),
      total: scored.slice(0, 3).reduce((s, i) => s + i.price, 0),
      title: opts?.comboTitle ?? 'کمبو هوشمند',
      reason: opts?.defaultReason ?? 'ساخته‌شده بر اساس آب‌وهوا، ساعت و حال شما',
    }
  }

  for (const template of COMBO_TEMPLATES) {
    if (template.weather === 'hot' && !ctx.weather?.isHot) continue
    if (template.timeOfDay && !template.timeOfDay.includes(ctx.timeOfDay)) continue
    if (template.mood && ctx.mood !== template.mood) continue

    const comboItems = pickFromDistinctCategories(items, template.pickCount ?? 3)
    if (comboItems.length >= 2) {
      return {
        items: comboItems,
        total: comboItems.reduce((s, i) => s + i.price, 0),
        title: template.title,
        reason: template.reason,
      }
    }
  }

  const fallback = getSmartPicks(items, ctx, 3)
  return {
    items: fallback,
    total: fallback.reduce((s, i) => s + i.price, 0),
    title: 'پیشنهاد ویژه',
    reason: 'انتخاب شده برای شما',
  }
}

export function formatPrice(price: number, suffix = ' تومان'): string {
  return price.toLocaleString('fa-IR') + suffix
}

// Kept for legacy template fallback if needed elsewhere
export { pickFromCategory }
