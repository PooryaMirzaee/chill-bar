import type { FastifyInstance } from 'fastify'
import { adminAlertSettingsSchema } from '@chill-bar/shared'
import type { AdminAlertSettings } from '@chill-bar/shared'
import { loadAdminAlertSettings, saveAdminAlertSettings } from '../lib/adminAlerts/settings.js'

export async function adminAlertRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/alerts',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async () => loadAdminAlertSettings(),
  )

  app.put(
    '/api/admin/alerts',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = adminAlertSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
      }
      return saveAdminAlertSettings(parsed.data as AdminAlertSettings)
    },
  )
}
