import { DEFAULT_PAYMENT_SETTINGS } from '@chill-bar/shared'
import type { PaymentSettings, PaymentPublicConfig } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'
import { env } from '../../env.js'

const SETTING_KEY = 'payment_config'

export function maskMerchantId(id: string): string {
  if (!id) return ''
  if (id.length <= 8) return '****'
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}

export function isMaskedMerchantId(id: string): boolean {
  return id.includes('…') || id.startsWith('****')
}

export async function loadPaymentSettings(): Promise<PaymentSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  const merged: PaymentSettings = {
    ...DEFAULT_PAYMENT_SETTINGS,
    ...(row?.value as Partial<PaymentSettings> | undefined),
  }
  if (!merged.merchantId && env.zarinpalMerchantId) {
    merged.merchantId = env.zarinpalMerchantId
  }
  return merged
}

export async function savePaymentSettings(settings: PaymentSettings): Promise<PaymentSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}

export function isPaymentReady(settings: PaymentSettings): boolean {
  return (
    settings.enabled &&
    /^[0-9a-fA-F-]{36}$/.test(settings.merchantId.trim()) &&
    settings.callbackBaseUrl.trim().length > 0
  )
}

export function toPublicPaymentConfig(settings: PaymentSettings): PaymentPublicConfig {
  const ready = isPaymentReady(settings)
  return {
    enabled: ready,
    enableOrderPay: ready && settings.enableOrderPay,
    enableWalletTopup: ready && settings.enableWalletTopup,
    minAmount: settings.minAmount,
    currency: settings.currency,
    sandbox: settings.sandbox,
  }
}
