import { DEFAULT_ADMIN_ALERT_SETTINGS } from '@chill-bar/shared'
import type { AdminAlertSettings } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'

const SETTING_KEY = 'admin_alerts'

export async function loadAdminAlertSettings(): Promise<AdminAlertSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY } })
  return {
    ...DEFAULT_ADMIN_ALERT_SETTINGS,
    ...(row?.value as Partial<AdminAlertSettings> | undefined),
  }
}

export async function saveAdminAlertSettings(settings: AdminAlertSettings): Promise<AdminAlertSettings> {
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTING_KEY, value: settings as unknown as object },
  })
  return settings
}
