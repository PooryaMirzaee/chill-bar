import type { FastifyInstance } from 'fastify'
import { prisma } from '../prisma.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    let db = false
    try {
      await prisma.$queryRaw`SELECT 1`
      db = true
    } catch {
      db = false
    }
    return { status: db ? 'ok' : 'degraded', db, time: new Date().toISOString() }
  })
}
