import type { Category } from '@chill-bar/shared'
import { resolveCategoryVisual } from '@chill-bar/shared'

export type { CategoryVisual } from '@chill-bar/shared'

/** @deprecated Use resolveCategoryVisual(category) from @chill-bar/shared */
export function getCategoryVisual(category: Pick<Category, 'id' | 'accentColor'>) {
  return resolveCategoryVisual(category)
}

export function getItemVisualHint(name: string, _categoryId?: string): string {
  const hints: [RegExp, string][] = [
    [/پسته|pistachio/i, '🟢'],
    [/نوتلا|nutella/i, '🍫'],
    [/توت فرنگی|strawberry/i, '🍓'],
    [/وانیل|vanilla/i, '🤍'],
    [/انبه|mango/i, '🥭'],
    [/موز|banana/i, '🍌'],
    [/آناناس/i, '🍍'],
    [/شکلات|chocolate/i, '🍫'],
    [/کارامل|caramel/i, '🍮'],
    [/لوتوس|lotus/i, '🍪'],
    [/اسپرسو|espresso/i, '☕'],
    [/لته|latte/i, '☕'],
    [/آیس|ice/i, '🧊'],
  ]
  for (const [re, emoji] of hints) {
    if (re.test(name)) return emoji
  }
  return '✨'
}
