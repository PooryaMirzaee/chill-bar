import type { MenuItem } from './types'

export interface CoffeeFortuneResult {
  fortune: string
  mood: string
  drinkHint: string
  luckyEmoji: string
}

const FORTUNES: Array<{ fortune: string; mood: string }> = [
  { fortune: 'فنجان می‌گوید امروز روزی پر از انرژی مثبت است — یک نوشیدنی گرم حال‌وهوایت را عوض می‌کند.', mood: 'آرامش' },
  { fortune: 'یک شگفتی کوچک در راه است؛ شاید همان طعمی که مدت‌ها دنبالش بودی.', mood: 'هیجان' },
  { fortune: 'امروز بهتر است عجله نکنی — کیفیت مهم‌تر از سرعت است.', mood: 'حکمت' },
  { fortune: 'فنجان نشانه می‌دهد: یک قرار خوب یا گفتگوی دلنشین در پیش داری.', mood: 'اجتماعی' },
  { fortune: 'انرژی خلاقیت بالاست؛ چیزی جدید امتحان کن که از همیشه متفاوت باشد.', mood: 'خلاق' },
  { fortune: 'یک لحظه استراحت کوتاه، بقیه روز را روشن‌تر می‌کند.', mood: 'استراحت' },
  { fortune: 'فال می‌گوید: سادگی انتخاب درست، امروز بهترین تصمیم است.', mood: 'سادگی' },
  { fortune: 'شیرینی زندگی در جزئیات است — طعم تازه‌ای که امتحان نکرده‌ای منتظرت است.', mood: 'شادی' },
  { fortune: 'امروز روز «بله گفتن» به پیشنهادهای خوب است.', mood: 'شجاعت' },
  { fortune: 'فنجان می‌بیند: شب خوبی در انتظار توست؛ یک دسر یا نوشیدنی سرد عالی می‌آید.', mood: 'شب‌نشینی' },
]

const LUCKY_EMOJIS = ['☕', '🍦', '🧋', '🥤', '✨', '🌙', '🔮', '🍀']

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function tehranDateKey(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

export function pickCoffeeFortune(
  items: Pick<MenuItem, 'id' | 'name' | 'emoji'>[],
  at = new Date(),
): CoffeeFortuneResult {
  const dayKey = tehranDateKey(at)
  const seed = hashString(dayKey + String(at.getHours()))
  const fortuneRow = FORTUNES[seed % FORTUNES.length]!
  const luckyEmoji = LUCKY_EMOJIS[seed % LUCKY_EMOJIS.length]!
  const drink = items.length ? items[seed % items.length]! : null

  return {
    fortune: fortuneRow.fortune,
    mood: fortuneRow.mood,
    drinkHint: drink ? `پیشنهاد فال: ${drink.emoji} ${drink.name}` : 'از منو یک نوشیدنی دلخواه انتخاب کن',
    luckyEmoji,
  }
}
