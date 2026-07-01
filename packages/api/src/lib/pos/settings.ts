import { DEFAULT_POS_SETTINGS } from '@chill-bar/shared'
import type { PosSettings } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'

const SETTING_KEY = 'pos_config'

export async function loadPosSettings(): Promise<PosSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  return {
    ...DEFAULT_POS_SETTINGS,
    ...(row?.value as Partial<PosSettings> | undefined),
  }
}

export async function savePosSettings(settings: PosSettings): Promise<PosSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}
