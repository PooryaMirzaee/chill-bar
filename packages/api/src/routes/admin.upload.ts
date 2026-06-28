import type { FastifyInstance } from 'fastify'
import { uploadImageSchema } from '@chill-bar/shared'
import { saveUploadedImage } from '../lib/uploads.js'

export async function adminUploadRoutes(app: FastifyInstance) {
  app.post(
    '/api/admin/upload',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = uploadImageSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'فایل نامعتبر است' })
      }
      try {
        const url = await saveUploadedImage(parsed.data.data, parsed.data.mimeType)
        return { url }
      } catch (err) {
        return reply.code(400).send({
          error: err instanceof Error ? err.message : 'آپلود ناموفق بود',
        })
      }
    },
  )
}
