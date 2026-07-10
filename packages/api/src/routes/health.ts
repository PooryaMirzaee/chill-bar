import type { FastifyInstance } from 'fastify'
import { prisma } from '../prisma.js'
import { isSchemaReady, SCHEMA_MIGRATION_HINT } from '../lib/dbSchema.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    let db = false
    try {
      await prisma.$queryRaw`SELECT 1`
      db = true
    } catch {
      db = false
    }
    const schema = db ? await isSchemaReady() : false
    const ok = db && schema
    return {
      status: ok ? 'ok' : 'degraded',
      db,
      schema,
      hint: !schema && db ? SCHEMA_MIGRATION_HINT : undefined,
      time: new Date().toISOString(),
    }
  })
}
