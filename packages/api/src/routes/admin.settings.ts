import type { FastifyInstance } from 'fastify'
import { settingsInputSchema } from '@chill-bar/shared'
import type { StoreSettings } from '@chill-bar/shared'
import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { loadSettings, mergeSettings } from '../lib/storeSettings.js'

export { loadSettings }

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get('/api/settings', async () => {
    return loadSettings()
  })

  app.put(
    '/api/admin/settings',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = settingsInputSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
      }
      const settings = mergeSettings(parsed.data)
      await prisma.setting.upsert({
        where: { key: 'store' },
        update: { value: settings as unknown as Prisma.InputJsonValue },
        create: { key: 'store', value: settings as unknown as Prisma.InputJsonValue },
      })
      return settings
    },
  )
}
