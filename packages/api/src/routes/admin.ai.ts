import type { FastifyInstance } from 'fastify'
import { aiSettingsSchema } from '@chill-bar/shared'
import type { AiSettings } from '@chill-bar/shared'
import {
  loadAiSettings,
  saveAiSettings,
  maskApiKey,
  isMaskedKey,
} from '../lib/ai/settings.js'
import { testAvalAiConnection } from '../lib/ai/avalai.js'

export async function adminAiRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/ai',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async () => {
      const settings = await loadAiSettings()
      return { ...settings, apiKey: maskApiKey(settings.apiKey) }
    },
  )

  app.put(
    '/api/admin/ai',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = aiSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
      }

      const current = await loadAiSettings()
      const incoming = parsed.data as AiSettings
      const apiKey =
        incoming.apiKey && !isMaskedKey(incoming.apiKey) ? incoming.apiKey : current.apiKey

      const saved = await saveAiSettings({ ...incoming, apiKey })
      return { ...saved, apiKey: maskApiKey(saved.apiKey) }
    },
  )

  app.post(
    '/api/admin/ai/test',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const body = (request.body ?? {}) as Partial<AiSettings>
      const current = await loadAiSettings()
      const testSettings: AiSettings = {
        ...current,
        ...body,
        apiKey:
          body.apiKey && !isMaskedKey(body.apiKey) ? body.apiKey : current.apiKey,
      }

      if (!testSettings.apiKey) {
        return reply.code(400).send({ error: 'کلید API وارد نشده است' })
      }

      try {
        const sample = await testAvalAiConnection(testSettings)
        return { ok: true, sample }
      } catch (err) {
        return reply.code(502).send({
          error: err instanceof Error ? err.message : 'اتصال ناموفق بود',
        })
      }
    },
  )
}
