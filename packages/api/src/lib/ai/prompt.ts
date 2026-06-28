import type { MenuItem } from '@chill-bar/shared'
import type { AiChatContext, AiSettings } from '@chill-bar/shared'

function formatMenu(items: MenuItem[]): string {
  const available = items.filter((i) => i.isAvailable !== false)
  const byCategory = new Map<string, MenuItem[]>()
  for (const item of available) {
    const list = byCategory.get(item.categoryName) ?? []
    list.push(item)
    byCategory.set(item.categoryName, list)
  }

  const lines: string[] = []
  for (const [cat, catItems] of byCategory) {
    lines.push(`\n## ${cat}`)
    for (const item of catItems.slice(0, 40)) {
      const tags = Object.entries(item.tags)
        .filter(([, v]) => v > 0.3)
        .map(([k]) => k)
        .join(',')
      lines.push(
        `- id:${item.id} | ${item.emoji} ${item.name} | ${item.price} تومان${tags ? ` | tags:${tags}` : ''}${item.description ? ` | ${item.description.slice(0, 80)}` : ''}`,
      )
    }
  }
  return lines.join('\n')
}

export function buildSystemPrompt(
  settings: AiSettings,
  items: MenuItem[],
  store: { storeName: string; storeSubtitle: string; address: string; openingHours: string },
  context?: AiChatContext,
): string {
  const menuBlock = formatMenu(items)

  const contextLines: string[] = []
  if (context?.storeName) contextLines.push(`نام کافه: ${context.storeName}`)
  if (context?.storeSubtitle) contextLines.push(`شعبه: ${context.storeSubtitle}`)
  if (context?.hour !== undefined) contextLines.push(`ساعت فعلی: ${context.hour}`)
  if (context?.timeOfDay) contextLines.push(`بخش روز: ${context.timeOfDay}`)
  if (context?.weather) {
    contextLines.push(
      `آب‌وهوا: ${context.weather.location} ${context.weather.temperature}° ${context.weather.description}`,
    )
  }
  if (context?.mood) contextLines.push(`حال کاربر: ${context.mood}`)

  return `تو ${settings.assistantName} کافه/رستوران «${store.storeName}» هستی (${store.storeSubtitle}).
${store.address ? `آدرس: ${store.address}` : ''}
${store.openingHours ? `ساعات کاری: ${store.openingHours}` : ''}

## وظیفه
- فقط درباره منو، پیشنهاد غذا/نوشیدنی/بستنی، ترکیب‌ها، سفارش، قیمت تقریبی، و تجربه کافه پاسخ بده.
- پاسخ‌ها کوتاه، گرم، حرفه‌ای و فارسی روان باشند.
- از منوی واقعی پایین استفاده کن؛ آیتم خارج از منو پیشنهاد نده.
- حداکثر ۵ آیتم در itemIds بگذار (مرتبط‌ترین‌ها).
- اگر کاربر بستنی سفارشی خواست، به تب «بستنی» و ساخت چوبدار راهنمایی کن.

## محدودیت حوزه (strict=${settings.strictMode ? 'ON' : 'OFF'})
${settings.strictMode ? `اگر سوال ربطی به کافه، منو، سفارش، یا تجربه غذا/نوشیدنی نداشت (مثل سیاست، برنامه‌نویسی، تکالیف، پزشکی، اخبار، ورزش، رابطه، ...) :
- inScope را false بگذار
- reply را این متن بگذار: «${settings.outOfScopeMessage}»
- itemIds خالی باشد` : 'سوالات عمومی را مودبانه رد کن اگر به کافه ربط ندارند.'}

## زمینه فعلی
${contextLines.length ? contextLines.join('\n') : '—'}

${settings.systemPromptExtra ? `\n## دستورالعمل اضافه مدیر\n${settings.systemPromptExtra}` : ''}

## منوی کافه
${menuBlock}

## فرمت پاسخ (فقط JSON معتبر، بدون markdown)
{
  "reply": "متن پاسخ فارسی",
  "inScope": true,
  "itemIds": ["menu-item-id"]
}`
}

export function parseAiJson(content: string): { reply: string; inScope: boolean; itemIds: string[] } {
  const trimmed = content.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  const raw = jsonMatch ? jsonMatch[0] : trimmed
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string
      inScope?: boolean
      itemIds?: unknown
    }
    const itemIds = Array.isArray(parsed.itemIds)
      ? parsed.itemIds.filter((id): id is string => typeof id === 'string').slice(0, 5)
      : []
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : '',
      inScope: parsed.inScope !== false,
      itemIds,
    }
  } catch {
    return { reply: trimmed, inScope: true, itemIds: [] }
  }
}
