import type { FastifyInstance } from 'fastify'
import type { Order as PrismaOrder, OrderItem, Prisma } from '@prisma/client'
import { createOrderSchema, findRewardTier } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { broadcast } from '../ws.js'
import { serializeOrder } from '../lib/serializers.js'
import { nextOrderCode } from '../lib/orderCode.js'
import { getCustomerIdFromAuth } from './customers.js'
import { loadSettings } from '../lib/storeSettings.js'
import { normalizeIranPhone } from '../lib/customerLink.js'
import { applyScratchRewardRules } from '../lib/scratchReward.js'
import {
  applyLoyaltyRedeem,
} from '../lib/loyalty.js'

export async function orderRoutes(app: FastifyInstance) {
  app.post('/api/orders', async (request, reply) => {
    const store = await loadSettings()
    if (!store.isOpen) {
      return reply.code(403).send({ error: store.copy.closedMessage })
    }

    const parsed = createOrderSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'سفارش نامعتبر است' })
    }
    const input = parsed.data
    const customerId = await getCustomerIdFromAuth(request)

    let customerName = input.customerName ?? null
    let customerPhone: string | null = null
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } })
      if (customer) {
        customerPhone = customer.phone
        customerName = customerName ?? customer.name
      }
    }

    const normalized = applyScratchRewardRules(input.items, store.scratchReward)
    if (normalized.error) {
      return reply.code(400).send({ error: normalized.error })
    }

    const loyalty = await applyLoyaltyRedeem(
      { ...input, items: normalized.items },
      store,
      customerId,
    )
    if (loyalty.error) {
      return reply.code(400).send({ error: loyalty.error })
    }

    const orderItems = loyalty.items
    const total = loyalty.total
    const tier = findRewardTier(store.waitLounge, input.loyaltyRewardId)

    let order: (PrismaOrder & { items: OrderItem[] }) | undefined
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const code = await nextOrderCode(tx)
          const created = await tx.order.create({
            data: {
              code,
              channel: input.channel,
              customerName,
              customerPhone: normalizeIranPhone(customerPhone) ?? customerPhone,
              note: input.note ?? null,
              customerId: customerId ?? null,
              subtotal: total,
              total,
              items: {
                create: orderItems.map((item) => ({
                  menuItemId: item.menuItemId ?? null,
                  name: item.name,
                  emoji: item.emoji,
                  unitPrice: item.unitPrice,
                  quantity: item.quantity,
                  lineTotal: item.unitPrice * item.quantity,
                  customConfig: (item.customConfig ?? undefined) as Prisma.InputJsonValue | undefined,
                })),
              },
            },
            include: { items: true },
          })

          if (store.features.waitLounge !== false) {
            await tx.waitGameSession.create({
              data: { orderId: created.id, customerId: customerId ?? null },
            })
          }

          if (loyalty.pointsDeducted > 0 && customerId && tier) {
            await tx.customer.update({
              where: { id: customerId },
              data: { chillPoints: { decrement: loyalty.pointsDeducted } },
            })
            await tx.loyaltyTransaction.create({
              data: {
                customerId,
                orderId: created.id,
                type: 'redeem',
                points: -loyalty.pointsDeducted,
                meta: { tierId: tier.id, tierLabel: tier.label },
              },
            })
          }

          return created
        })
        break
      } catch (err: unknown) {
        if (attempt === 4) throw err
      }
    }

    if (!order) return reply.code(500).send({ error: 'ثبت سفارش ناموفق بود' })

    const serialized = serializeOrder(order)
    broadcast('admin', 'order:new', serialized)
    broadcast('orders', 'order:new', {
      id: order.id,
      code: order.code,
      status: order.status,
      total: order.total,
    })

    await prisma.analyticsEvent.create({
      data: { type: 'order_created', payload: { orderId: order.id, total, channel: input.channel } },
    })

    return reply.code(201).send(serialized)
  })

  app.get('/api/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { items: true, waitGame: true },
    })
    if (!order) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
    const serialized = serializeOrder(order)
    return {
      ...serialized,
      waitGame: order.waitGame
        ? {
            pointsEarned: order.waitGame.pointsEarned,
            closedAt: order.waitGame.closedAt?.toISOString() ?? null,
          }
        : null,
    }
  })

  app.get('/api/orders/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { code: id }] },
      select: {
        id: true,
        code: true,
        status: true,
        updatedAt: true,
        waitGame: { select: { pointsEarned: true } },
      },
    })
    if (!order) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      updatedAt: order.updatedAt.toISOString(),
      pointsEarned: order.waitGame?.pointsEarned ?? 0,
    }
  })
}
