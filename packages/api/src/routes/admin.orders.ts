import type { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { updateOrderSchema, updateOrderStatusSchema } from '@chill-bar/shared'
import type { OrderStatus } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { broadcast } from '../ws.js'
import { serializeOrder } from '../lib/serializers.js'
import { ensureCustomerForOrder, normalizeIranPhone } from '../lib/customerLink.js'
import { calcOrderTotal, calcSubtotal } from '../lib/pos/checkout.js'

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
    '/api/admin/orders/:id',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const parsed = updateOrderSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
      }

      const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!existing) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
      if (existing.status === 'CANCELLED') {
        return reply.code(400).send({ error: 'سفارش لغو‌شده قابل ویرایش نیست' })
      }

      const input = parsed.data
      if (input.items && existing.paymentStatus !== 'UNPAID') {
        return reply.code(400).send({
          error: 'ویرایش اقلام فقط برای فاکتورهای پرداخت‌نشده امکان‌پذیر است',
        })
      }
      if (input.discountAmount !== undefined && existing.paymentStatus !== 'UNPAID') {
        return reply.code(400).send({
          error: 'تغییر تخفیف فقط برای فاکتورهای پرداخت‌نشده امکان‌پذیر است',
        })
      }

      try {
        const order = await prisma.$transaction(async (tx) => {
          const nextName =
            input.customerName !== undefined ? input.customerName : existing.customerName
          const nextPhoneRaw =
            input.customerPhone !== undefined ? input.customerPhone : existing.customerPhone

          const linked = await ensureCustomerForOrder(tx, {
            phone: nextPhoneRaw,
            name: nextName,
            customerId: existing.customerId,
          })

          let subtotal = existing.subtotal || existing.total
          let discountAmount = existing.discountAmount
          let itemsTouched = false

          if (input.items) {
            itemsTouched = true
            const payloads = input.items.map((item) => ({
              menuItemId: item.menuItemId ?? null,
              name: item.name,
              emoji: item.emoji || '🍦',
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.unitPrice * item.quantity,
              customConfig: item.customConfig ?? null,
            }))
            subtotal = calcSubtotal(
              payloads.map((p) => ({
                menuItemId: p.menuItemId,
                name: p.name,
                emoji: p.emoji,
                unitPrice: p.unitPrice,
                quantity: p.quantity,
                customConfig: null,
              })),
            )
            await tx.orderItem.deleteMany({ where: { orderId: id } })
            await tx.orderItem.createMany({
              data: payloads.map((p) => ({
                orderId: id,
                menuItemId: p.menuItemId,
                name: p.name,
                emoji: p.emoji,
                unitPrice: p.unitPrice,
                quantity: p.quantity,
                lineTotal: p.lineTotal,
                customConfig:
                  p.customConfig === null
                    ? Prisma.JsonNull
                    : (p.customConfig as Prisma.InputJsonValue),
              })),
            })
          }

          if (input.discountAmount !== undefined) {
            discountAmount = input.discountAmount
          }

          const total = calcOrderTotal(subtotal, discountAmount)

          const data: Prisma.OrderUncheckedUpdateInput = {
            customerName: nextName,
            customerPhone: linked.customerPhone ?? normalizeIranPhone(nextPhoneRaw),
            customerId: linked.customerId ?? existing.customerId,
            note: input.note !== undefined ? input.note : existing.note,
            discountNote:
              input.discountNote !== undefined ? input.discountNote : existing.discountNote,
          }

          if (itemsTouched || input.discountAmount !== undefined) {
            data.subtotal = subtotal
            data.discountAmount = discountAmount
            data.total = total
          }

          return tx.order.update({
            where: { id },
            data,
            include: { items: true },
          })
        })

        const serialized = serializeOrder(order)
        broadcast('admin', 'order:updated', serialized)
        return serialized
      } catch (err) {
        const message = err instanceof Error ? err.message : 'ویرایش فاکتور ناموفق بود'
        return reply.code(400).send({ error: message })
      }
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

      const markPaidOnDelivery =
        parsed.data.status === 'DELIVERED' && exists.paymentStatus === 'UNPAID'

      const order = await prisma.$transaction(async (tx) => {
        const linked = await ensureCustomerForOrder(tx, {
          phone: exists.customerPhone,
          name: exists.customerName,
          customerId: exists.customerId,
        })

        const data: Prisma.OrderUncheckedUpdateInput = {
          status: parsed.data.status,
          customerId: linked.customerId ?? exists.customerId,
        }

        if (linked.customerPhone && !exists.customerPhone) {
          data.customerPhone = linked.customerPhone
        }

        if (markPaidOnDelivery) {
          data.paymentStatus = 'PAID'
          data.paidAmount = exists.total
          data.paidAt = new Date()
          data.completedAt = new Date()
          if (exists.paymentMethod === 'UNPAID') {
            data.paymentMethod = 'CASH'
          }
        }

        return tx.order.update({
          where: { id },
          data,
          include: { items: true },
        })
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

      if (markPaidOnDelivery) {
        broadcast('admin', 'order:paid', serialized)
      }

      return serialized
    },
  )
}
