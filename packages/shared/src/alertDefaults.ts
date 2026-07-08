import type { AdminAlertSettings } from './types'

export const DEFAULT_ADMIN_ALERT_SETTINGS: AdminAlertSettings = {
  enabled: true,
  volume: 1,
  soundOnNewOrder: true,
  newOrderSound: 'power',
  pendingReminderEnabled: true,
  pendingReminderIntervalSeconds: 15,
  pendingReminderSound: 'power',
}

export const ADMIN_ALERT_SOUND_LABELS: Record<AdminAlertSettings['newOrderSound'], string> = {
  chime: 'زنگ ملایم',
  bell: 'زنگ کلاسیک',
  kitchen: 'آشپزخانه',
  urgent: 'فوری',
  soft: 'آرام',
  power: 'آژیر قوی (پیشنهادی)',
}
