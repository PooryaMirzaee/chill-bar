import { z } from 'zod'

export const mallPayWithSchema = z.enum(['WALLET', 'CREDIT', 'COUNTER', 'SPLIT', 'ONLINE'])
export type MallPayWith = z.infer<typeof mallPayWithSchema>

export const orderFulfillmentSchema = z.enum(['COUNTER', 'MALL_DELIVERY'])
export type OrderFulfillment = z.infer<typeof orderFulfillmentSchema>

export const mallDeliveryStatusSchema = z.enum(['NONE', 'QUEUED', 'OUT', 'HANDED'])
export type MallDeliveryStatus = z.infer<typeof mallDeliveryStatusSchema>

export const mallWalletTopupPackageSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  amount: z.number().int().min(0).max(50_000_000),
  bonusPercent: z.number().int().min(0).max(100).default(0),
})

export type MallWalletTopupPackage = z.infer<typeof mallWalletTopupPackageSchema>

export const mallClubSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  complexName: z.string().max(80).default('اصفهان سیتی‌سنتر'),
  complexSlug: z.string().max(60).default('city-center-isfahan'),
  defaultDiscountPercent: z.number().int().min(0).max(50).default(10),
  defaultCreditLimit: z.number().int().min(0).max(50_000_000).default(500_000),
  minOrderForDelivery: z.number().int().min(0).max(10_000_000).default(0),
  heroTitle: z.string().max(80).default('اشتراک واحدهای سیتی‌سنتر'),
  heroSubtitle: z
    .string()
    .max(200)
    .default('با کد واحدت سفارش بده — پیک چیل‌بار تا خود واحد می‌آورد'),
  codePlaceholder: z.string().max(40).default('کد اشتراک واحد'),
  deliveryLabel: z.string().max(60).default('پیک تا واحد من'),
  counterLabel: z.string().max(60).default('تحویل در کافه'),
  walletEmptyUpsell: z
    .string()
    .max(200)
    .default('کیف‌پولت خالیه — از صندوق بخواه شارژ کنن تا سریع‌تر پرداخت کنی'),
  publicBasePath: z.string().max(40).default('/city-center'),
  memberDeepLinkPrefix: z.string().max(20).default('/m'),
  topupPackages: z
    .array(mallWalletTopupPackageSchema)
    .max(8)
    .default([
      { id: 'pack-500', label: 'شارژ ۵۰۰ هزار', amount: 500_000, bonusPercent: 0 },
      { id: 'pack-1m', label: 'شارژ ۱ میلیون + ۱۰٪ هدیه', amount: 1_000_000, bonusPercent: 10 },
      { id: 'pack-2m', label: 'شارژ ۲ میلیون + ۱۵٪ هدیه', amount: 2_000_000, bonusPercent: 15 },
    ]),
})

export type MallClubSettings = z.infer<typeof mallClubSettingsSchema>

export const DEFAULT_MALL_CLUB: MallClubSettings = mallClubSettingsSchema.parse({})

export function mergeMallClubSettings(
  raw: Partial<MallClubSettings> | null | undefined,
): MallClubSettings {
  const base = DEFAULT_MALL_CLUB
  return {
    ...base,
    ...raw,
    topupPackages: raw?.topupPackages?.length ? raw.topupPackages : base.topupPackages,
  }
}

export interface MallMembershipPublic {
  code: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  discountPercent: number
  walletBalance: number
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  contactName: string | null
  unit: {
    unitCode: string
    name: string
    floor: string | null
    category: string | null
    deliveryLabel: string
  }
}

export function buildDeliveryLabel(unit: {
  floor?: string | null
  unitCode: string
  name: string
}): string {
  const floor = unit.floor?.trim()
  const floorPart = floor ? `طبقه ${floor}` : null
  return [floorPart, unit.unitCode, unit.name].filter(Boolean).join(' · ')
}

/** Human-friendly membership code: CC-A1-05-7K3M */
export function generateMembershipCode(unitCode: string): string {
  const clean = unitCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'UNIT'
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `CC-${clean}-${suffix}`
}

export function normalizeMallCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}
