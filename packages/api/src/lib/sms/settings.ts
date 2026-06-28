import { DEFAULT_SMS_SETTINGS } from '@chill-bar/shared'
import type { SmsSettings, SmsPublicConfig } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'
import { env } from '../../env.js'

const SETTING_KEY = 'sms_config'

export function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return `****${key.slice(-4)}`
}

export function isMaskedKey(key: string): boolean {
  return key.startsWith('****')
}

export async function loadSmsSettings(): Promise<SmsSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  const merged: SmsSettings = {
    ...DEFAULT_SMS_SETTINGS,
    ...(row?.value as Partial<SmsSettings> | undefined),
  }
  if (!merged.apiKey && env.smsIrApiKey) {
    merged.apiKey = env.smsIrApiKey
  }
  return merged
}

export async function saveSmsSettings(settings: SmsSettings): Promise<SmsSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}

export function toPublicSmsConfig(settings: SmsSettings): SmsPublicConfig {
  return {
    enabled: isSmsReady(settings),
    otpLength: settings.otpLength,
    resendCooldownSeconds: settings.resendCooldownSeconds,
  }
}

export function isSmsReady(settings: SmsSettings): boolean {
  return settings.enabled && settings.apiKey.trim().length > 0 && settings.templateId > 0
}
