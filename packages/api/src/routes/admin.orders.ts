import type { FastifyInstance } from 'fastify'
import { updateOrderStatusSchema } from '@chill-bar/shared'
import type { OrderStatus } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { broadcast } from '../ws.js'
import { serializeOrder } from '../lib/serializers.js'

export async function adminOrderRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/orders',
    { onRequest: [app.authenticate] },
    async (request) => {
      const query = request.query as {
        status?: string
        channel?: string
        date?: string
        limit?: string
        paymentStatus?: string
      }
      const where: Record<string, unknown> = {}
      if (query.status) where.status = query.status as OrderStatus
      if (query.channel) where.channel = query.channel
      if (query.paymentStatus) where.paymentStatus = query.paymentStatus
      if (query.date) {
        const start = new Date(query.date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(end.getDate() + 1)
        where.createdAt = { gte: start, lt: end }
      }
      const orders = await prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: query.limit ? Number(query.limit) : 200,
      })
      return orders.map(serializeOrder)
    },
  )

  app.get(
    '/api/admin/orders/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!order) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
      return serializeOrder(order)
    },
  )

  app.patch(
    '/api/admin/orders/:id/status',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const parsed = updateOrderStatusSchema.safeParse(request.body)
      if (!parsed.success) return reply.code(400).send({ error: 'وضعیت نامعتبر است' })

      const exists = await prisma.order.findUnique({ where: { id } })
      if (!exists) return reply.code(404).send({ error: 'سفارش پیدا نشد' })

      const order = await prisma.order.update({
        where: { id },
        data: { status: parsed.data.status },
        include: { items: true },
      })
      const serialized = serializeOrder(order)
      broadcast('admin', 'order:updated', serialized)
      broadcast('orders', 'order:status', {
        id: order.id,
        code: order.code,
        status: order.status,
      })

      if (['READY', 'DELIVERED', 'CANCELLED'].includes(parsed.data.status)) {
        await prisma.waitGameSession.updateMany({
          where: { orderId: id, closedAt: null },
          data: { closedAt: new Date() },
        })
      }

      return serialized
    },
  )
}
