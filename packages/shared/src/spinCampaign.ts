import { z } from 'zod'
import { toGregorian } from './jalali'

/** Iranian mobile: 09xxxxxxxxx, +989…, 989…, 9xxxxxxxxx */
export function normalizeIranMobile(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let digits = raw.replace(/[\s\-()]/g, '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('98') && digits.length >= 12) digits = `0${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith('9')) digits = `0${digits}`
  if (!/^09\d{9}$/.test(digits)) return null
  // Valid Iranian mobile operator prefixes (IR-MCA / IRANCELL / RIGHTEL / …)
  const prefix = digits.slice(0, 4)
  const validPrefixes = new Set([
    // همراه اول
    '0910', '0911', '0912', '0913', '0914', '0915', '0916', '0917', '0918', '0919',
    // ایرانسل
    '0901', '0902', '0903', '0904', '0905',
    '0930', '0933', '0935', '0936', '0937', '0938', '0939',
    '0941',
    // رایتل
    '0920', '0921', '0922', '0923',
    // شاتل موبایل / آپتل / سامانتل / و غیره
    '0990', '0991', '0992', '0993', '0994', '0995', '0996', '0997', '0998', '0999',
  ])
  if (!validPrefixes.has(prefix)) return null
  return digits
}

export function isValidIranMobile(raw: string): boolean {
  return normalizeIranMobile(raw) !== null
}

export const spinPrizeTypeSchema = z.enum([
  'FREE_ITEM',
  'BUY_GET_KID_FREE',
  'DISCOUNT_ITEM',
  'DISCOUNT_CATEGORY',
  'EXTERNAL',
  'TRY_AGAIN',
])

export type SpinPrizeType = z.infer<typeof spinPrizeTypeSchema>

export const spinPrizeSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().min(1).max(80),
  description: z.string().max(240).default(''),
  emoji: z.string().max(8).default('🎁'),
  /** Slice artwork URL (preferred over text on the wheel) */
  imageUrl: z.string().max(2048).nullable().default(null),
  color: z.string().min(4).max(32).default('#F26522'),
  textColor: z.string().min(4).max(32).default('#FFFFFF'),
  weight: z.number().min(0).max(10_000).default(10),
  type: spinPrizeTypeSchema,
  menuItemId: z.string().min(1).nullable().default(null),
  categoryId: z.string().min(1).nullable().default(null),
  discountType: z.enum(['percent', 'fixed']).nullable().default(null),
  discountValue: z.number().int().min(0).max(10_000_000).default(0),
  externalPrizeName: z.string().max(120).default(''),
  codePrefix: z.string().min(2).max(12).default('CHILL'),
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
  isActive: z.boolean().default(true),
})

export type SpinPrize = z.infer<typeof spinPrizeSchema>

export const spinCampaignSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  campaignTitle: z.string().max(80).default('اسکن کن · بچرخون · جایزه بگیر'),
  campaignSubtitle: z.string().max(160).default('تا ۲۹ مهر، هر روز یک شانس رایگان داری'),
  heroBadge: z.string().max(40).default('کمپین مهر چیل بار'),
  ctaLabel: z.string().max(40).default('بچرخون'),
  phonePromptTitle: z.string().max(80).default('جایزه‌ت رو ثبت کن'),
  phonePromptBody: z.string().max(200).default('شماره موبایلت رو وارد کن تا کد جایزه‌ت صادر بشه.'),
  phonePlaceholder: z.string().max(40).default('09123456789'),
  claimButtonLabel: z.string().max(40).default('دریافت کد جایزه'),
  alreadySpunMessage: z.string().max(160).default('شانس امروزت رو امتحان کردی؛ فردا دوباره سر بزن!'),
  endedMessage: z.string().max(160).default('کمپین گردونه تموم شده؛ ممنون که همراه ما بودی.'),
  notStartedMessage: z.string().max(160).default('گردونه هنوز شروع نشده؛ به‌زودی منتظرت هستیم.'),
  codeValidityMessage: z.string().max(160).default('تا آخر امروز می‌تونی از این کد استفاده کنی.'),
  venueGuideTitle: z.string().max(80).default('کافه چیل بار — حیاط پلازا'),
  venueGuideBody: z
    .string()
    .max(400)
    .default('بیا حیاط پلازا، کافه نارنجی رو می‌بینی. کد رو به صندوق نشون بده و جایزه‌ت رو بگیر.'),
  soundEnabled: z.boolean().default(true),
  /** ISO date YYYY-MM-DD (Gregorian). Default: start of Mehr 1, 1405 */
  startsAt: z.string().nullable().default('2026-09-23'),
  /** ISO date YYYY-MM-DD. Default: end of Mehr 29, 1405 → 2026-10-21 */
  endsAt: z.string().nullable().default('2026-10-21'),
  spinsPerDay: z.number().int().min(1).max(999).default(1),
  requirePhoneToClaim: z.boolean().default(true),
  showConfetti: z.boolean().default(true),
  /** When false, wheel slices show image only (no labels) */
  showSliceLabels: z.boolean().default(false),
  wheelSize: z.number().int().min(260).max(520).default(340),
  prizes: z.array(spinPrizeSchema).max(16).default([]),
})

export type SpinCampaignSettings = z.infer<typeof spinCampaignSettingsSchema>

/** Mehr 29, 1405 as Gregorian ISO date */
export function jalaliCampaignEndIso(jy = 1405, jm = 7, jd = 29): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

export const DEFAULT_SPIN_CAMPAIGN: SpinCampaignSettings = {
  enabled: true,
  campaignTitle: 'اسکن کن · بچرخون · جایزه بگیر',
  campaignSubtitle: 'تا ۲۹ مهر، هر روز یک شانس رایگان داری',
  heroBadge: 'کمپین مهر چیل بار',
  ctaLabel: 'بچرخون',
  phonePromptTitle: 'جایزه‌ت رو ثبت کن',
  phonePromptBody: 'شماره موبایلت رو وارد کن تا کد جایزه‌ت صادر بشه.',
  phonePlaceholder: '09123456789',
  claimButtonLabel: 'دریافت کد جایزه',
  alreadySpunMessage: 'شانس امروزت رو امتحان کردی؛ فردا دوباره سر بزن!',
  endedMessage: 'کمپین گردونه تموم شده؛ ممنون که همراه ما بودی.',
  notStartedMessage: 'گردونه هنوز شروع نشده؛ به‌زودی منتظرت هستیم.',
  codeValidityMessage: 'تا آخر امروز می‌تونی از این کد استفاده کنی.',
  venueGuideTitle: 'کافه چیل بار — حیاط پلازا',
  venueGuideBody: 'بیا حیاط پلازا، کافه نارنجی رو می‌بینی. کد رو به صندوق نشون بده و جایزه‌ت رو بگیر.',
  soundEnabled: true,
  startsAt: '2026-09-23',
  endsAt: jalaliCampaignEndIso(1405, 7, 29),
  spinsPerDay: 1,
  requirePhoneToClaim: true,
  showConfetti: true,
  showSliceLabels: false,
  wheelSize: 340,
  prizes: [
    {
      id: 'free-shake',
      label: 'شیک رایگان',
      description: 'یک شیک به انتخاب شما رایگان',
      emoji: '🧋',
      imageUrl: '/spin/spin-free-shake.png',
      color: '#F26522',
      textColor: '#FFFFFF',
      weight: 18,
      type: 'FREE_ITEM',
      menuItemId: null,
      categoryId: null,
      discountType: null,
      discountValue: 0,
      externalPrizeName: '',
      codePrefix: 'FREE',
      stock: null,
      isActive: true,
    },
    {
      id: 'kid-free',
      label: 'بچه رایگان',
      description: 'خوراکی خودت رو بخر — مال بچه‌ت رایگان',
      emoji: '👶',
      imageUrl: '/spin/spin-kid-free.png',
      color: '#2C2420',
      textColor: '#FFF8F0',
      weight: 14,
      type: 'BUY_GET_KID_FREE',
      menuItemId: null,
      categoryId: null,
      discountType: null,
      discountValue: 0,
      externalPrizeName: '',
      codePrefix: 'KID',
      stock: null,
      isActive: true,
    },
    {
      id: 'cat-20',
      label: '۲۰٪ دسته',
      description: '۲۰٪ تخفیف روی یک دسته‌بندی',
      emoji: '🏷️',
      imageUrl: '/spin/spin-cat-20.png',
      color: '#C8D6C4',
      textColor: '#2C2420',
      weight: 16,
      type: 'DISCOUNT_CATEGORY',
      menuItemId: null,
      categoryId: null,
      discountType: 'percent',
      discountValue: 20,
      externalPrizeName: '',
      codePrefix: 'CAT',
      stock: null,
      isActive: true,
    },
    {
      id: 'item-30',
      label: '۳۰٪ آیتم',
      description: '۳۰٪ تخفیف روی یک محصول خاص',
      emoji: '🍦',
      imageUrl: '/spin/spin-item-30.png',
      color: '#FF8C4D',
      textColor: '#2C2420',
      weight: 16,
      type: 'DISCOUNT_ITEM',
      menuItemId: null,
      categoryId: null,
      discountType: 'percent',
      discountValue: 30,
      externalPrizeName: '',
      codePrefix: 'ITEM',
      stock: null,
      isActive: true,
    },
    {
      id: 'iphone',
      label: 'آیفون ۱۸',
      description: 'جایزه ویژه خارج از کافه',
      emoji: '📱',
      imageUrl: '/spin/spin-iphone.png',
      color: '#1B2838',
      textColor: '#FFFFFF',
      weight: 1,
      type: 'EXTERNAL',
      menuItemId: null,
      categoryId: null,
      discountType: null,
      discountValue: 0,
      externalPrizeName: 'آیفون ۱۸',
      codePrefix: 'JACKPOT',
      stock: 1,
      isActive: true,
    },
    {
      id: 'try',
      label: 'دوباره!',
      description: 'این بار نشد — فردا شانس جدید',
      emoji: '🔄',
      imageUrl: '/spin/spin-try.png',
      color: '#E6E0DA',
      textColor: '#5C4F47',
      weight: 20,
      type: 'TRY_AGAIN',
      menuItemId: null,
      categoryId: null,
      discountType: null,
      discountValue: 0,
      externalPrizeName: '',
      codePrefix: 'RETRY',
      stock: null,
      isActive: true,
    },
    {
      id: 'fixed-50k',
      label: '۵۰ هزار',
      description: '۵۰٬۰۰۰ تومان تخفیف روی سفارش',
      emoji: '💸',
      imageUrl: '/spin/spin-fixed-50k.png',
      color: '#D94E10',
      textColor: '#FFFFFF',
      weight: 10,
      type: 'DISCOUNT_ITEM',
      menuItemId: null,
      categoryId: null,
      discountType: 'fixed',
      discountValue: 50_000,
      externalPrizeName: '',
      codePrefix: 'OFF',
      stock: null,
      isActive: true,
    },
    {
      id: 'waffle-free',
      label: 'وافل رایگان',
      description: 'یک وافل رایگان',
      emoji: '🧇',
      imageUrl: '/spin/spin-waffle-free.png',
      color: '#E8A87C',
      textColor: '#2C2420',
      weight: 12,
      type: 'FREE_ITEM',
      menuItemId: null,
      categoryId: null,
      discountType: null,
      discountValue: 0,
      externalPrizeName: '',
      codePrefix: 'WAFF',
      stock: null,
      isActive: true,
    },
  ],
}

/** Earlier default copy; saved values still equal to these get the current defaults. */
const LEGACY_DEFAULT_TEXTS: Partial<Record<keyof SpinCampaignSettings, string[]>> = {
  campaignSubtitle: ['تا ۲۹ مهر هر روز یک شانس داری', 'کمپین ویژه چیل بار — شانس خودت رو امتحان کن'],
  heroBadge: ['کمپین مهر'],
  phonePromptTitle: ['کدت آماده‌ست'],
  phonePromptBody: ['شماره موبایلت رو بزن تا کد جایزه برات صادر بشه'],
  claimButtonLabel: ['دریافت کد'],
  alreadySpunMessage: ['امروز یک‌بار چرخوندی — فردا دوباره شانس داری'],
  endedMessage: ['کمپین به پایان رسیده'],
  notStartedMessage: ['کمپین هنوز شروع نشده'],
  venueGuideTitle: ['جایزه‌ت رو از کجا بگیری؟'],
  venueGuideBody: [
    'بیا تو حیاط — یه کافه نارنجی می‌بینی. همون‌جا چیل باره؛ کد رو به صندوق بده و از جایزه‌ت استفاده کن.',
  ],
}

function upgradeLegacyTexts(raw: Partial<SpinCampaignSettings>): Partial<SpinCampaignSettings> {
  const out: Record<string, unknown> = { ...raw }
  for (const [key, legacy] of Object.entries(LEGACY_DEFAULT_TEXTS)) {
    const value = out[key]
    if (typeof value === 'string' && legacy?.includes(value.trim())) delete out[key]
  }
  return out as Partial<SpinCampaignSettings>
}

/** Prize codes are valid only on the Tehran calendar day they were issued. */
export function isSpinCodeExpired(dayKey: string, now = new Date()): boolean {
  return dayKey !== tehranDayKey(now)
}

export function mergeSpinCampaignSettings(
  rawInput: Partial<SpinCampaignSettings> | null | undefined,
): SpinCampaignSettings {
  const raw = rawInput ? upgradeLegacyTexts(rawInput) : rawInput
  const base = DEFAULT_SPIN_CAMPAIGN
  const defaultById = new Map(base.prizes.map((p) => [p.id, p]))
  const prizes = raw?.prizes?.length
    ? raw.prizes.map((p) => {
        const fallback = defaultById.get(p.id)
        return {
          ...base.prizes[0]!,
          ...fallback,
          ...p,
          id: p.id || `prize-${Math.random().toString(36).slice(2, 8)}`,
          label: p.label || fallback?.label || 'جایزه',
          type: p.type || fallback?.type || 'EXTERNAL',
          imageUrl: p.imageUrl ?? fallback?.imageUrl ?? null,
        }
      })
    : base.prizes
  return {
    ...base,
    ...raw,
    showSliceLabels: raw?.showSliceLabels ?? base.showSliceLabels,
    prizes,
  }
}

export function activeSpinPrizes(campaign: SpinCampaignSettings): SpinPrize[] {
  return campaign.prizes.filter((p) => p.isActive && p.weight > 0)
}

export function pickWeightedPrize(prizes: SpinPrize[]): SpinPrize | null {
  const pool = prizes.filter((p) => p.isActive && p.weight > 0)
  if (pool.length === 0) return null
  const total = pool.reduce((s, p) => s + p.weight, 0)
  let r = Math.random() * total
  for (const p of pool) {
    r -= p.weight
    if (r <= 0) return p
  }
  return pool[pool.length - 1] ?? null
}

export function isCampaignActiveOn(campaign: SpinCampaignSettings, now = new Date()): 'active' | 'not_started' | 'ended' | 'disabled' {
  if (!campaign.enabled) return 'disabled'
  const day = tehranDayKey(now)
  if (campaign.startsAt && day < campaign.startsAt) return 'not_started'
  if (campaign.endsAt && day > campaign.endsAt) return 'ended'
  return 'active'
}

/** Local calendar day key in Asia/Tehran for daily spin limit */
export function tehranDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Numeric-only redeem code for POS (8 digits). */
export function generateSpinCode(_prefix: string, phone: string): string {
  const phoneTail = phone.replace(/\D/g, '').slice(-3).padStart(3, '0')
  let rand = ''
  while (rand.length < 5) {
    rand += Math.floor(Math.random() * 10)
  }
  return `${phoneTail}${rand}`
}

export const spinDrawInputSchema = z.object({
  deviceKey: z.string().min(8).max(80),
})

export type SpinDrawInput = z.infer<typeof spinDrawInputSchema>

export interface SpinDrawResult {
  drawId: string
  prizeId: string
}

export const spinClaimInputSchema = z.object({
  drawId: z.string().min(1).max(64),
  phone: z.string().min(0).max(20).optional().default(''),
  deviceKey: z.string().min(8).max(80),
})

export type SpinClaimInput = z.infer<typeof spinClaimInputSchema>
