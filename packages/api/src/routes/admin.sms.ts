import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { smsSettingsSchema } from '@chill-bar/shared'
import type { SmsSettings } from '@chill-bar/shared'
import {
  loadSmsSettings,
  saveSmsSettings,
  maskApiKey,
  isMaskedKey,
  isSmsReady,
} from '../lib/sms/settings.js'
import {
  getCredit,
  getLines,
  sendBulk,
  testSmsIrConnection,
} from '../lib/sms/smsIr.js'

export async function adminSmsRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/sms', guard, async () => {
    const settings = await loadSmsSettings()
    return { ...settings, apiKey: maskApiKey(settings.apiKey), ready: isSmsReady(settings) }
  })

  app.put('/api/admin/sms', guard, async (request, reply) => {
    const parsed = smsSettingsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
    }

    const current = await loadSmsSettings()
    const incoming = parsed.data as SmsSettings
    const apiKey =
      incoming.apiKey && !isMaskedKey(incoming.apiKey) ? incoming.apiKey : current.apiKey

    const saved = await saveSmsSettings({ ...incoming, apiKey })
    return { ...saved, apiKey: maskApiKey(saved.apiKey), ready: isSmsReady(saved) }
  })

  app.post('/api/admin/sms/test', guard, async (request, reply) => {
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
  })

  app.get('/api/admin/sms/sync', guard, async (request, reply) => {
    const settings = await loadSmsSettings()
    if (!settings.apiKey) {
      return reply.code(400).send({ error: 'کلید API تنظیم نشده' })
    }
    try {
      const [credit, lines] = await Promise.all([
        getCredit(settings.apiKey),
        getLines(settings.apiKey),
      ])
      return { ok: true, credit, lines }
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : 'سینک SMS.ir ناموفق بود',
      })
    }
  })

  app.post('/api/admin/sms/bulk-test', guard, async (request, reply) => {
    const parsed = z
      .object({
        mobile: z.string().min(10),
        messageText: z.string().min(1).max(500).default('تست ارسال گروهی چیل‌بار'),
      })
      .safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'شماره و متن لازم است' })
    }
    const settings = await loadSmsSettings()
    if (!settings.apiKey || !settings.lineNumber) {
      return reply.code(400).send({ error: 'کلید API و شماره خط لازم است' })
    }
    const mobile = parsed.data.mobile.replace(/\D/g, '')
    if (!/^09\d{9}$/.test(mobile)) {
      return reply.code(400).send({ error: 'شماره موبایل نامعتبر است' })
    }
    try {
      const data = await sendBulk(
        settings.apiKey,
        settings.lineNumber,
        parsed.data.messageText,
        [mobile],
      )
      return { ok: true, message: `ارسال گروهی به ${mobile} انجام شد`, data }
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : 'ارسال گروهی ناموفق بود',
      })
    }
  })
}
