import type { MenuItem } from './types'

export interface CoffeeFortuneSymbol {
  id: string
  emoji: string
  label: string
  meaning: string
}

export interface CoffeeFortuneEntry {
  id: string
  fortune: string
  mood: string
  moodEmoji: string
  love: string
  career: string
  luck: string
  enabled: boolean
}

export interface CoffeeFortuneLuckyColor {
  name: string
  hex: string
}

export interface CoffeeFortuneSettings {
  title: string
  subtitle: string
  ritualHint: string
  readingHint: string
  shareHashtag: string
  accentColor: string
  fortunes: CoffeeFortuneEntry[]
  symbols: CoffeeFortuneSymbol[]
  luckyEmojis: string[]
  luckyColors: CoffeeFortuneLuckyColor[]
  luckyTimes: string[]
  /** 0 = unlimited re-reads per visit */
  maxReadsPerVisit: number
}

export interface CoffeeFortuneReading {
  id: string
  fortune: string
  mood: string
  moodEmoji: string
  love: string
  career: string
  luck: string
  symbol: CoffeeFortuneSymbol
  luckyNumber: number
  luckyColor: CoffeeFortuneLuckyColor
  luckyTime: string
  luckyEmoji: string
  drinkHint: string
  suggestedItem: Pick<MenuItem, 'id' | 'name' | 'emoji' | 'price'> | null
  dateLabel: string
  timeLabel: string
}

export const DEFAULT_COFFEE_FORTUNE_SETTINGS: CoffeeFortuneSettings = {
  title: 'فال قهوه چیل بار',
  subtitle: 'فنجان را برگردان — سرنوشت امروزت در ته فنجان است',
  ritualHint: 'انگشتت را روی فنجان نگه دار و آرام بچرخان',
  readingHint: 'نمادها در حال ظهورند…',
  shareHashtag: '#فال_قهوه_چیل_بار',
  accentColor: '#D4A574',
  maxReadsPerVisit: 3,
  luckyEmojis: ['☕', '🍦', '🧋', '✨', '🌙', '🔮', '🍀', '💫', '🦋', '🌸'],
  luckyColors: [
    { name: 'کهربایی', hex: '#D4A574' },
    { name: 'زرشکی', hex: '#8B2942' },
    { name: 'یشمی', hex: '#2D6A4F' },
    { name: 'یاقوتی', hex: '#9B2335' },
    { name: 'آبی شب', hex: '#1B3A5C' },
    { name: 'طلایی', hex: '#C9A227' },
  ],
  luckyTimes: [
    'صبح — ۰۹:۰۰ تا ۱۱:۰۰',
    'ظهر — ۱۲:۰۰ تا ۱۴:۰۰',
    'عصر — ۱۶:۰۰ تا ۱۸:۰۰',
    'شب — ۲۰:۰۰ تا ۲۲:۰۰',
  ],
  symbols: [
    { id: 'heart', emoji: '💕', label: 'قلب', meaning: 'پیامی از عشق و گرما در راه است — رابطه‌ای زیبا شکوفا می‌شود.' },
    { id: 'bird', emoji: '🕊️', label: 'پرنده', meaning: 'خبری شیرین یا سفری کوتاه در انتظار توست — آزادی ذهن بیاور.' },
    { id: 'tree', emoji: '🌳', label: 'درخت', meaning: 'رشد و ثبات — تلاش‌هایت به بار می‌نشیند، صبور باش.' },
    { id: 'star', emoji: '⭐', label: 'ستاره', meaning: 'ستاره‌شناسی فنجان می‌گوید: یک آرزو به واقعیت نزدیک است.' },
    { id: 'moon', emoji: '🌙', label: 'هلال ماه', meaning: 'شهودت قوی است — به ندای درونت گوش بده.' },
    { id: 'circle', emoji: '⭕', label: 'دایره', meaning: 'چرخه‌ای کامل می‌شود — پایانی شیرین و آغازی تازه.' },
    { id: 'path', emoji: '〰️', label: 'راه', meaning: 'مسیری پیش رو داری — قدم اول را با اعتماد بردار.' },
    { id: 'key', emoji: '🗝️', label: 'کلید', meaning: 'رازی فاش می‌شود یا فرصتی که مدت‌ها منتظرش بودی.' },
  ],
  fortunes: [
    {
      id: 'f1',
      fortune: 'فنجان می‌گوید امروز روزی پر از انرژی مثبت است — یک نوشیدنی گرم حال‌وهوایت را عوض می‌کند.',
      mood: 'آرامش',
      moodEmoji: '🧘',
      love: 'یک لبخند یا پیام دلگرم‌کننده در راه است.',
      career: 'کارهای عقب‌افتاده امروز جور می‌شوند.',
      luck: 'عدد خوش‌شانس امروزت را جدی بگیر!',
      enabled: true,
    },
    {
      id: 'f2',
      fortune: 'یک شگفتی کوچک در راه است؛ شاید همان طعمی که مدت‌ها دنبالش بودی.',
      mood: 'هیجان',
      moodEmoji: '🎉',
      love: 'قرار یا گفتگویی غیرمنتظره و دلنشین.',
      career: 'ایده‌ای خلاقانه ذهنت را روشن می‌کند.',
      luck: 'امروز روز «بله» گفتن به پیشنهادهای خوب است.',
      enabled: true,
    },
    {
      id: 'f3',
      fortune: 'امروز بهتر است عجله نکنی — کیفیت مهم‌تر از سرعت است.',
      mood: 'حکمت',
      moodEmoji: '🦉',
      love: 'صبر در رابطه‌ها امروز پاداش دارد.',
      career: 'تمرکز عمیق بهتر از کار زیاد است.',
      luck: 'چیزی که رها کردی برمی‌گردد — شاید به شکل بهتر.',
      enabled: true,
    },
    {
      id: 'f4',
      fortune: 'فنجان نشانه می‌دهد: یک قرار خوب یا گفتگوی دلنشین در پیش داری.',
      mood: 'اجتماعی',
      moodEmoji: '👥',
      love: 'کسی دلش برایت تنگ شده — پیام بده.',
      career: 'همکاری تیمی نتیجه بهتری می‌دهد.',
      luck: 'یک آشنایی جدید می‌تواند درهای تازه باز کند.',
      enabled: true,
    },
    {
      id: 'f5',
      fortune: 'انرژی خلاقیت بالاست؛ چیزی جدید امتحان کن که از همیشه متفاوت باشد.',
      mood: 'خلاق',
      moodEmoji: '🎨',
      love: 'احساساتت را صادقانه بیان کن.',
      career: 'پروژه‌ای که رها کرده بودی دوباره جان می‌گیرد.',
      luck: 'طعم یا تجربه‌ای تازه خوش‌شانست می‌آورد.',
      enabled: true,
    },
    {
      id: 'f6',
      fortune: 'یک لحظه استراحت کوتاه، بقیه روز را روشن‌تر می‌کند.',
      mood: 'استراحت',
      moodEmoji: '🌿',
      love: 'وقت گذاشتن برای خودت، روابطت را هم بهتر می‌کند.',
      career: 'استراحت کوتاه = بازدهی بیشتر.',
      luck: 'بعد از ظهر اتفاق خوبی رخ می‌دهد.',
      enabled: true,
    },
    {
      id: 'f7',
      fortune: 'فال می‌گوید: سادگی انتخاب درست، امروز بهترین تصمیم است.',
      mood: 'سادگی',
      moodEmoji: '🤍',
      love: 'گفتگوی ساده و صمیمی ارزشمندتر از کلمات پیچیده است.',
      career: 'یک کار را تمام کن، بعد سراغ بعدی برو.',
      luck: 'چیز ساده‌ای که نادیده گرفتی، کلید موفقیت است.',
      enabled: true,
    },
    {
      id: 'f8',
      fortune: 'شیرینی زندگی در جزئیات است — طعم تازه‌ای که امتحان نکرده‌ای منتظرت است.',
      mood: 'شادی',
      moodEmoji: '🌈',
      love: 'خنده و شوخی امروز را زیباتر می‌کند.',
      career: 'جزئیات کوچک تفاوت بزرگ می‌سازند.',
      luck: 'یک پیشنهاد شیرین را رد نکن!',
      enabled: true,
    },
    {
      id: 'f9',
      fortune: 'امروز روز «بله گفتن» به پیشنهادهای خوب است.',
      mood: 'شجاعت',
      moodEmoji: '🔥',
      love: 'قدم اول را تو بردار — طرف مقابل منتظر است.',
      career: 'فرصتی که ترسیدی از دست نده.',
      luck: 'ریسک کوچک، پاداش بزرگ.',
      enabled: true,
    },
    {
      id: 'f10',
      fortune: 'فنجان می‌بیند: شب خوبی در انتظار توست؛ یک دسر یا نوشیدنی سرد عالی می‌آید.',
      mood: 'شب‌نشینی',
      moodEmoji: '🌙',
      love: 'گفتگوی شبانه صمیمی‌تر از روز است.',
      career: 'فردا با انرژی تازه شروع کن.',
      luck: 'ستاره‌های امشب به نفع تو هستند.',
      enabled: true,
    },
    {
      id: 'f11',
      fortune: 'انرژی فنجان می‌گوید: امروز روز بخشش و بزرگ‌منشی است.',
      mood: 'مهربانی',
      moodEmoji: '💝',
      love: 'ببخش تا سبک‌تر شوی — رابطه‌ها قوی‌تر می‌شوند.',
      career: 'همکاری بهتر از رقابت امروز جواب می‌دهد.',
      luck: 'کار خیر برمی‌گردد — حتی از جایی غیرمنتظره.',
      enabled: true,
    },
    {
      id: 'f12',
      fortune: 'در ته فنجان، درخشش طلایی دیده می‌شود — روزی پر از فرصت.',
      mood: 'درخشش',
      moodEmoji: '✨',
      love: 'تو در مرکز توجه هستی — از آن لذت ببر.',
      career: 'شناسایی تلاشت نزدیک است.',
      luck: 'طلایی‌ترین لحظه روز هنوز نیامده.',
      enabled: true,
    },
  ],
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tehranDateKey(at = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

function tehranDateLabel(at = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(at)
}

function tehranTimeLabel(at = new Date()): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
  }).format(at)
}

function pickFrom<T>(list: T[], rand: () => number): T {
  return list[Math.floor(rand() * list.length)]!
}

export function mergeCoffeeFortuneSettings(
  raw?: Partial<CoffeeFortuneSettings> | null,
): CoffeeFortuneSettings {
  if (!raw) return DEFAULT_COFFEE_FORTUNE_SETTINGS
  return {
    ...DEFAULT_COFFEE_FORTUNE_SETTINGS,
    ...raw,
    fortunes: raw.fortunes?.length ? raw.fortunes : DEFAULT_COFFEE_FORTUNE_SETTINGS.fortunes,
    symbols: raw.symbols?.length ? raw.symbols : DEFAULT_COFFEE_FORTUNE_SETTINGS.symbols,
    luckyEmojis: raw.luckyEmojis?.length ? raw.luckyEmojis : DEFAULT_COFFEE_FORTUNE_SETTINGS.luckyEmojis,
    luckyColors: raw.luckyColors?.length ? raw.luckyColors : DEFAULT_COFFEE_FORTUNE_SETTINGS.luckyColors,
    luckyTimes: raw.luckyTimes?.length ? raw.luckyTimes : DEFAULT_COFFEE_FORTUNE_SETTINGS.luckyTimes,
  }
}

export function pickCoffeeFortune(
  settingsInput: Partial<CoffeeFortuneSettings> | null | undefined,
  items: Pick<MenuItem, 'id' | 'name' | 'emoji' | 'price'>[],
  options?: { nonce?: string; at?: Date },
): CoffeeFortuneReading {
  const settings = mergeCoffeeFortuneSettings(settingsInput)
  const at = options?.at ?? new Date()
  const nonce = options?.nonce ?? String(Math.random())
  const seed = hashString(`${tehranDateKey(at)}:${nonce}:${Date.now()}`)
  const rand = mulberry32(seed)

  const activeFortunes = settings.fortunes.filter((f) => f.enabled)
  const fortunePool = activeFortunes.length ? activeFortunes : settings.fortunes
  const fortune = pickFrom(fortunePool, rand)
  const symbol = pickFrom(settings.symbols, rand)
  const luckyColor = pickFrom(settings.luckyColors, rand)
  const luckyTime = pickFrom(settings.luckyTimes, rand)
  const luckyEmoji = pickFrom(settings.luckyEmojis, rand)
  const luckyNumber = Math.floor(rand() * 99) + 1
  const drink = items.length ? pickFrom(items, rand) : null

  return {
    id: `cf-${seed.toString(36)}`,
    fortune: fortune.fortune,
    mood: fortune.mood,
    moodEmoji: fortune.moodEmoji,
    love: fortune.love,
    career: fortune.career,
    luck: fortune.luck,
    symbol,
    luckyNumber,
    luckyColor,
    luckyTime,
    luckyEmoji,
    drinkHint: drink ? `${drink.emoji} ${drink.name}` : 'از منو یک نوشیدنی دلخواه انتخاب کن',
    suggestedItem: drink,
    dateLabel: tehranDateLabel(at),
    timeLabel: tehranTimeLabel(at),
  }
}

export function buildCoffeeFortuneShareText(
  reading: CoffeeFortuneReading,
  settings: CoffeeFortuneSettings,
  storeName: string,
): string {
  return [
    `☕ ${settings.title}`,
    `📅 ${reading.dateLabel}`,
    '',
    `🔮 نماد فنجان: ${reading.symbol.emoji} ${reading.symbol.label}`,
    reading.symbol.meaning,
    '',
    `✨ ${reading.fortune}`,
    '',
    `💕 عشق: ${reading.love}`,
    `💼 کار: ${reading.career}`,
    `🍀 شانس: ${reading.luck}`,
    '',
    `🎯 عدد خوش‌شانس: ${reading.luckyNumber}`,
    `🎨 رنگ روز: ${reading.luckyColor.name}`,
    `⏰ زمان طلایی: ${reading.luckyTime}`,
    `🥤 نوشیدنی فال: ${reading.drinkHint}`,
    '',
    `${storeName} ${settings.shareHashtag}`,
  ].join('\n')
}
