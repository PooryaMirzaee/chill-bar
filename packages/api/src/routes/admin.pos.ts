import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import {
  posSaleSchema,
  orderCheckoutSchema,
  orderAdjustmentSchema,
  orderVoidSchema,
  posSettingsSchema,
} from '@chill-bar/shared'
import type { PosSettings, UserRole } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { broadcast } from '../ws.js'
import { generateOrderCode, serializePosOrder } from '../lib/serializers.js'
import { loadPosSettings, savePosSettings } from '../lib/pos/settings.js'
import {
  calcOrderTotal,
  calcSubtotal,
  resolvePayment,
  validateDiscount,
} from '../lib/pos/checkout.js'
import { nextReceiptNumber } from '../lib/pos/receiptNumber.js'

const orderInclude = {
  items: true,
  payments: true,
  adjustments: { include: { createdBy: { select: { name: true } } } },
  createdBy: { select: { name: true } },
} as const

async function getOpenShift(required: boolean) {
  const shift = await prisma.cashShift.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  })
  if (required && !shift) {
    return { error: 'ابتدا شیفت صندوق را باز کنید' as const, shift: null }
  }
  return { error: null, shift }
}

export async function adminPosRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/pos/settings',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async () => loadPosSettings(),
  )

  app.put(
    '/api/admin/pos/settings',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const parsed = posSettingsSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
      }
      return savePosSettings(parsed.data as PosSettings)
    },
  )

  app.get(
    '/api/admin/pos/menu',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async () => {
      const [categories, items] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.menuItem.findMany({
          where: { isAvailable: true },
          orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
        }),
      ])
      return {
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          emoji: c.emoji,
          accentColor: c.accentColor,
          isIceCreamHub: c.isIceCreamHub,
        })),
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          emoji: item.emoji,
          categoryId: item.categoryId,
          modifiers: item.modifiers as unknown[],
          isAvailable: item.isAvailable,
        })),
      }
    },
  )

  app.get(
    '/api/admin/pos/incoming',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async () => {
      const orders = await prisma.order.findMany({
        where: {
          channel: { in: ['MOBILE', 'KIOSK'] },
          paymentStatus: 'UNPAID',
          status: { not: 'CANCELLED' },
        },
        include: orderInclude,
        orderBy: { createdAt: 'asc' },
        take: 100,
      })
      return orders.map(serializePosOrder)
    },
  )

  app.post(
    '/api/admin/pos/orders',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const settings = await loadPosSettings()
      if (!settings.enabled) {
        return reply.code(403).send({ error: 'صندوق غیرفعال است' })
      }

      const parsed = posSaleSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'فروش نامعتبر است' })
      }

      const { shift, error: shiftError } = await getOpenShift(settings.requireShiftOpen)
      if (shiftError) return reply.code(400).send({ error: shiftError })

      const role = request.user.role as UserRole
      const input = parsed.data
      const subtotal = calcSubtotal(input.items)
      const discountAmount = input.discountAmount ?? 0
      const discountErr = validateDiscount(subtotal, discountAmount, role, settings)
      if (discountErr) return reply.code(400).send({ error: discountErr })

      const total = calcOrderTotal(subtotal, discountAmount)
      const paymentResult = resolvePayment(total, input.payment, settings)
      if (!paymentResult.ok) return reply.code(400).send({ error: paymentResult.error })
      const { resolved } = paymentResult

      let order
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          order = await prisma.$transaction(async (tx) => {
            const receiptNumber = await nextReceiptNumber(tx, shift?.id)
            const created = await tx.order.create({
              data: {
                code: generateOrderCode(),
                channel: 'POS',
                status: 'DELIVERED',
                customerName: input.customerName ?? null,
                note: input.note ?? null,
                subtotal,
                discountAmount,
                discountNote: input.discountNote ?? null,
                total,
                paymentStatus: 'PAID',
                paymentMethod: resolved.method,
                paidAmount: resolved.paidAmount,
                changeAmount: resolved.changeAmount,
                receiptNumber,
                createdByUserId: request.user.sub,
                shiftId: shift?.id ?? null,
                paidAt: new Date(),
                completedAt: new Date(),
                items: {
                  create: input.items.map((item) => ({
                    menuItemId: item.menuItemId ?? null,
                    name: item.name,
                    emoji: item.emoji,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    lineTotal: item.unitPrice * item.quantity,
                    customConfig: (item.customConfig ?? undefined) as Prisma.InputJsonValue | undefined,
                  })),
                },
                payments: {
                  create: resolved.lines.map((line) => ({
                    method: line.method,
                    amount: line.amount,
                  })),
                },
              },
              include: orderInclude,
            })

            if (discountAmount > 0) {
              await tx.orderAdjustment.create({
                data: {
                  orderId: created.id,
                  type: 'DISCOUNT',
                  amount: discountAmount,
                  reason: input.discountNote ?? 'تخفیف صندوق',
                  createdByUserId: request.user.sub,
                },
              })
            }

            return created
          })
          break
        } catch (err) {
          if (attempt === 4) throw err
        }
      }

      if (!order) return reply.code(500).send({ error: 'ثبت فروش ناموفق بود' })

      const serialized = serializePosOrder(order)
      broadcast('admin', 'order:new', serialized)
      broadcast('admin', 'order:paid', serialized)

      await prisma.analyticsEvent.create({
        data: { type: 'pos_sale', payload: { orderId: order.id, total: order.total } },
      })

      return serialized
    },
  )

  app.post(
    '/api/admin/orders/:id/checkout',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const settings = await loadPosSettings()
      const parsed = orderCheckoutSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تسویه نامعتبر است' })
      }

      const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!existing) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
      if (existing.paymentStatus === 'PAID') {
        return reply.code(400).send({ error: 'این سفارش قبلاً تسویه شده' })
      }
      if (existing.status === 'CANCELLED') {
        return reply.code(400).send({ error: 'سفارش لغو شده قابل تسویه نیست' })
      }

      const { shift, error: shiftError } = await getOpenShift(settings.requireShiftOpen)
      if (shiftError) return reply.code(400).send({ error: shiftError })

      const role = request.user.role as UserRole
      const subtotal = existing.subtotal || existing.total
      const discountAmount = parsed.data.discountAmount ?? 0
      const discountErr = validateDiscount(subtotal, discountAmount, role, settings)
      if (discountErr) return reply.code(400).send({ error: discountErr })

      const total = calcOrderTotal(subtotal, discountAmount)
      const paymentResult = resolvePayment(total, parsed.data.payment, settings)
      if (!paymentResult.ok) return reply.code(400).send({ error: paymentResult.error })
      const { resolved } = paymentResult

      const order = await prisma.$transaction(async (tx) => {
        const receiptNumber = await nextReceiptNumber(tx, shift?.id ?? existing.shiftId)
        const updated = await tx.order.update({
          where: { id },
          data: {
            subtotal,
            discountAmount,
            discountNote: parsed.data.discountNote ?? existing.discountNote,
            total,
            paymentStatus: 'PAID',
            paymentMethod: resolved.method,
            paidAmount: resolved.paidAmount,
            changeAmount: resolved.changeAmount,
            receiptNumber,
            shiftId: shift?.id ?? existing.shiftId,
            paidAt: new Date(),
            completedAt: parsed.data.markDelivered ? new Date() : existing.completedAt,
            status: parsed.data.markDelivered ? 'DELIVERED' : existing.status,
          },
          include: orderInclude,
        })

        await tx.orderPayment.deleteMany({ where: { orderId: id } })
        if (resolved.lines.length) {
          await tx.orderPayment.createMany({
            data: resolved.lines.map((line) => ({
              orderId: id,
              method: line.method,
              amount: line.amount,
            })),
          })
        }

        if (discountAmount > 0) {
          await tx.orderAdjustment.create({
            data: {
              orderId: id,
              type: 'DISCOUNT',
              amount: discountAmount,
              reason: parsed.data.discountNote ?? 'تخفیف تسویه',
              createdByUserId: request.user.sub,
            },
          })
        }

        return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude })
      })

      const serialized = serializePosOrder(order)
      broadcast('admin', 'order:updated', serialized)
      broadcast('admin', 'order:paid', serialized)
      broadcast('orders', 'order:status', {
        id: order.id,
        code: order.code,
        status: order.status,
      })

      return serialized
    },
  )

  app.post(
    '/api/admin/orders/:id/adjustments',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const settings = await loadPosSettings()
      const parsed = orderAdjustmentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تعدیل نامعتبر است' })
      }

      const role = request.user.role as UserRole
      if (parsed.data.type === 'REFUND' || parsed.data.type === 'VOID_ITEM') {
        if (!settings.allowRefunds) {
          return reply.code(403).send({ error: 'برگشت غیرفعال است' })
        }
        if (settings.requireManagerForRefund && role === 'STAFF') {
          return reply.code(403).send({ error: 'برگشت نیاز به تأیید مدیر دارد' })
        }
        if (settings.requireRefundReason && !parsed.data.reason?.trim()) {
          return reply.code(400).send({ error: 'دلیل برگشت الزامی است' })
        }
      }

      const existing = await prisma.order.findUnique({ where: { id }, include: { items: true } })
      if (!existing) return reply.code(404).send({ error: 'سفارش پیدا نشد' })
      if (existing.paymentStatus === 'UNPAID') {
        return reply.code(400).send({ error: 'سفارش پرداخت‌نشده قابل برگشت نیست' })
      }

      let order
      try {
        order = await prisma.$transaction(async (tx) => {
          await tx.orderAdjustment.create({
            data: {
              orderId: id,
              type: parsed.data.type,
              amount: parsed.data.amount,
              itemId: parsed.data.itemId ?? null,
              reason: parsed.data.reason ?? null,
              createdByUserId: request.user.sub,
            },
          })

          if (parsed.data.type === 'DISCOUNT') {
            const subtotal = existing.subtotal || existing.total
            const newDiscount = existing.discountAmount + parsed.data.amount
            const discountErr = validateDiscount(subtotal, newDiscount, role, settings)
            if (discountErr) throw new Error(discountErr)
            const newTotal = calcOrderTotal(subtotal, newDiscount)
            await tx.order.update({
              where: { id },
              data: { discountAmount: newDiscount, total: newTotal },
            })
          } else {
            const newTotal = Math.max(0, existing.total - parsed.data.amount)
            const paymentStatus = newTotal === 0 ? 'REFUNDED' : 'PARTIALLY_REFUNDED'
            await tx.order.update({
              where: { id },
              data: { total: newTotal, paymentStatus },
            })
          }

          return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude })
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'تعدیل ناموفق بود'
        return reply.code(400).send({ error: message })
      }

      const serialized = serializePosOrder(order)
      broadcast('admin', 'order:updated', serialized)

      await prisma.analyticsEvent.create({
        data: {
          type: 'refund',
          payload: { orderId: id, type: parsed.data.type, amount: parsed.data.amount },
        },
      })

      return serialized
    },
  )

  app.post(
    '/api/admin/orders/:id/void',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const parsed = orderVoidSchema.safeParse(request.body ?? {})
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'درخواست نامعتبر است' })
      }

      const existing = await prisma.order.findUnique({ where: { id } })
      if (!existing) return reply.code(404).send({ error: 'سفارش پیدا نشد' })

      const order = await prisma.$transaction(async (tx) => {
        if (existing.paymentStatus === 'PAID' && existing.total > 0) {
          await tx.orderAdjustment.create({
            data: {
              orderId: id,
              type: 'REFUND',
              amount: existing.total,
              reason: parsed.data.reason ?? 'ابطال سفارش',
              createdByUserId: request.user.sub,
            },
          })
        }
        return tx.order.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            paymentStatus: existing.paymentStatus === 'PAID' ? 'REFUNDED' : existing.paymentStatus,
            total: 0,
            completedAt: new Date(),
          },
          include: orderInclude,
        })
      })

      const serialized = serializePosOrder(order)
      broadcast('admin', 'order:updated', serialized)
      broadcast('orders', 'order:status', {
        id: order.id,
        code: order.code,
        status: order.status,
      })

      return serialized
    },
  )
}
