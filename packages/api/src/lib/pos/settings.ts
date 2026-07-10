import { DEFAULT_POS_SETTINGS, posSettingsSchema } from '@chill-bar/shared'
import type { PosSettings } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'

const SETTING_KEY = 'pos_config'

function normalizePosSettings(raw: Partial<PosSettings> | undefined): PosSettings {
  const merged = { ...DEFAULT_POS_SETTINGS, ...raw }
  const modes = ['dialog', 'silent', 'off'] as const
  if (!modes.includes(merged.receiptPrintMode as (typeof modes)[number])) {
    merged.receiptPrintMode = DEFAULT_POS_SETTINGS.receiptPrintMode
  }
  const parsed = posSettingsSchema.safeParse(merged)
  return parsed.success ? parsed.data : DEFAULT_POS_SETTINGS
}

export async function loadPosSettings(): Promise<PosSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  return normalizePosSettings(row?.value as Partial<PosSettings> | undefined)
}

export async function savePosSettings(settings: PosSettings): Promise<PosSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}
