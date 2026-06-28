import { DEFAULT_AI_SETTINGS } from '@chill-bar/shared'
import type { AiSettings } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'
import { env } from '../../env.js'
import { loadSettings } from '../storeSettings.js'

const SETTING_KEY = 'ai_config'

export function maskApiKey(key: string): string {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return `****${key.slice(-4)}`
}

export function isMaskedKey(key: string): boolean {
  return key.startsWith('****')
}

export async function loadAiSettings(): Promise<AiSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  const merged: AiSettings = {
    ...DEFAULT_AI_SETTINGS,
    ...(row?.value as Partial<AiSettings> | undefined),
    quickPrompts:
      (row?.value as Partial<AiSettings> | undefined)?.quickPrompts?.length
        ? (row!.value as Partial<AiSettings>).quickPrompts!
        : DEFAULT_AI_SETTINGS.quickPrompts,
  }
  if (!merged.apiKey && env.avalaiApiKey) {
    merged.apiKey = env.avalaiApiKey
  }
  return merged
}

export async function saveAiSettings(settings: AiSettings): Promise<AiSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}

export async function toPublicAiConfig(settings: AiSettings) {
  const store = await loadSettings()
  const moodPrompts = Object.fromEntries(store.moods.map((m) => [m.id, m.aiPrompt]))
  return {
    enabled: settings.enabled && !!settings.apiKey,
    assistantName: settings.assistantName,
    assistantEmoji: settings.assistantEmoji,
    welcomeMessage: settings.welcomeMessage,
    quickPrompts: settings.quickPrompts.length ? settings.quickPrompts : DEFAULT_AI_SETTINGS.quickPrompts,
    inputPlaceholder: settings.inputPlaceholder || DEFAULT_AI_SETTINGS.inputPlaceholder,
    onlineStatusLabel: settings.onlineStatusLabel || DEFAULT_AI_SETTINGS.onlineStatusLabel,
    disabledMessage: settings.disabledMessage || DEFAULT_AI_SETTINGS.disabledMessage,
    moodPrompts,
  }
}

export function isAiReady(settings: AiSettings): boolean {
  return settings.enabled && settings.apiKey.trim().length > 0
}
