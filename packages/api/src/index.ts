import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { env, isProd } from './env.js'
import { authPlugin } from './plugins/auth.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { menuRoutes } from './routes/menu.js'
import { iceCreamRoutes } from './routes/iceCream.js'
import { orderRoutes } from './routes/orders.js'
import { customerRoutes } from './routes/customers.js'
import { aiRoutes } from './routes/ai.js'
import { adminAiRoutes } from './routes/admin.ai.js'
import { adminSmsRoutes } from './routes/admin.sms.js'
import { adminAlertRoutes } from './routes/admin.alerts.js'
import { adminIceCreamRoutes } from './routes/admin.iceCream.js'
import { adminOrderRoutes } from './routes/admin.orders.js'
import { adminMenuRoutes } from './routes/admin.menu.js'
import { adminDashboardRoutes } from './routes/admin.dashboard.js'
import { adminSettingsRoutes } from './routes/admin.settings.js'
import { adminUploadRoutes } from './routes/admin.upload.js'
import { adminUserRoutes } from './routes/admin.users.js'
import { adminShiftRoutes } from './routes/admin.shifts.js'
import { adminPosRoutes } from './routes/admin.pos.js'
import { adminReportRoutes } from './routes/admin.reports.js'
import { waitLoungeRoutes } from './routes/waitLounge.js'
import { wsRoutes } from './routes/ws.js'
import { prisma } from './prisma.js'
import fastifyStatic from '@fastify/static'
import { UPLOADS_DIR, ensureUploadsDir } from './lib/uploads.js'

async function main() {
  const app = Fastify({ logger: { level: isProd ? 'info' : 'debug' } })

  await app.register(cors, {
    origin: env.corsOrigins.length ? env.corsOrigins : true,
    credentials: true,
  })
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })
  await app.register(websocket)
  await app.register(authPlugin)
  await ensureUploadsDir()
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.setErrorHandler((error: unknown, request, reply) => {
    request.log.error(error)
    if (reply.sent) return
    const err = error as { statusCode?: number; message?: string }
    const statusCode = err.statusCode ?? 500
    const message =
      statusCode >= 500
        ? 'خطای داخلی سرور — لاگ API را بررسی کنید'
        : err.message || 'درخواست نامعتبر است'
    reply.code(statusCode).send({ error: message })
  })

  // Public
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(menuRoutes)
  await app.register(iceCreamRoutes)
  await app.register(orderRoutes)
  await app.register(customerRoutes)
  await app.register(aiRoutes)
  await app.register(waitLoungeRoutes)
  await app.register(adminSettingsRoutes)

  // Admin (protected inside each module)
  await app.register(adminUploadRoutes)
  await app.register(adminAiRoutes)
  await app.register(adminSmsRoutes)
  await app.register(adminAlertRoutes)
  await app.register(adminIceCreamRoutes)
  await app.register(adminOrderRoutes)
  await app.register(adminMenuRoutes)
  await app.register(adminDashboardRoutes)
  await app.register(adminUserRoutes)
  await app.register(adminShiftRoutes)
  await app.register(adminPosRoutes)
  await app.register(adminReportRoutes)

  // Realtime
  await app.register(wsRoutes)

  const shutdown = async () => {
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  try {
    await app.listen({ port: env.port, host: env.host })
    app.log.info(`Chill Bar API listening on http://${env.host}:${env.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
