import type { FastifyInstance } from 'fastify'
import { smsSettingsSchema } from '@chill-bar/shared'
import type { SmsSettings } from '@chill-bar/shared'
import {
  loadSmsSettings,
  saveSmsSettings,
  maskApiKey,
  isMaskedKey,
  isSmsReady,
} from '../lib/sms/settings.js'
import { testSmsIrConnection } from '../lib/sms/smsIr.js'

export async function adminSmsRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/sms',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async () => {
      const settings = await loadSmsSettings()
      return { ...settings, apiKey: maskApiKey(settings.apiKey) }
    },
  )

  app.put(
    '/api/admin/sms',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = smsSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
      }

      const current = await loadSmsSettings()
      const incoming = parsed.data as SmsSettings
      const apiKey =
        incoming.apiKey && !isMaskedKey(incoming.apiKey) ? incoming.apiKey : current.apiKey

      const saved = await saveSmsSettings({ ...incoming, apiKey })
      return { ...saved, apiKey: maskApiKey(saved.apiKey) }
    },
  )

  app.post(
    '/api/admin/sms/test',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Partial<SmsSettings> & { testMobile?: string }
      const current = await loadSmsSettings()
      const testSettings: SmsSettings = {
        ...current,
        ...body,
        apiKey: body.apiKey && !isMaskedKey(body.apiKey) ? body.apiKey : current.apiKey,
      }

      if (!isSmsReady(testSettings)) {
        return reply.code(400).send({ error: 'کلید API، شناسه قالب و فعال‌سازی SMS لازم است' })
      }

      const testMobile = body.testMobile?.replace(/\D/g, '') ?? ''
      if (!/^09\d{9}$/.test(testMobile)) {
        return reply.code(400).send({ error: 'شماره موبایل تست نامعتبر است' })
      }

      try {
        const message = await testSmsIrConnection(testSettings, testMobile)
        return { ok: true, message }
      } catch (err) {
        return reply.code(502).send({
          error: err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود',
        })
      }
    },
  )
}
