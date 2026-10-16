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
import { applyLoyaltyRedeem } from '../lib/loyalty.js'
import {
  applyCreditCharge,
  applyWalletPayment,
  findMembershipByCode,
  membershipDiscountAmount,
} from '../lib/mallClub.js'
import { buildDeliveryLabel, mergeMallClubSettings } from '@chill-bar/shared'
import { startOrderPayment } from '../lib/payments/service.js'
import { isPaymentReady, loadPaymentSettings } from '../lib/payments/settings.js'

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
    const mallSettings = mergeMallClubSettings(store.mallClub)
    const mallEnabled = store.features.mallClub !== false && mallSettings.enabled

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

    let membership = input.membershipCode && mallEnabled
      ? await findMembershipByCode(input.membershipCode)
      : null
    if (input.membershipCode && mallEnabled && !membership) {
      return reply.code(400).send({ error: 'کد اشتراک واحد معتبر نیست' })
    }
    if (membership && membership.status !== 'ACTIVE') {
      return reply.code(403).send({ error: 'اشتراک این واحد فعال نیست' })
    }
    if (membership && !membership.unit.isActive) {
      return reply.code(403).send({ error: 'این واحد غیرفعال است' })
    }

    const orderItems = loyalty.items
    const itemsSubtotal = Math.max(0, loyalty.total)
    const memberDiscount = membership
      ? membershipDiscountAmount(itemsSubtotal, membership.discountPercent)
      : 0
    const total = Math.max(0, itemsSubtotal - memberDiscount)
    const discountAmount = memberDiscount
    const discountNote =
      memberDiscount > 0 && membership
        ? `تخفیف اشتراک واحد ${membership.discountPercent}٪`
        : null

    let fulfillment = input.fulfillment ?? 'COUNTER'
    if (fulfillment === 'MALL_DELIVERY') {
      if (!membership) {
        return reply.code(400).send({ error: 'برای پیک تا واحد باید کد اشتراک داشته باشید' })
      }
      if (total < mallSettings.minOrderForDelivery) {
        return reply.code(400).send({
          error: `حداقل مبلغ برای پیک ${mallSettings.minOrderForDelivery.toLocaleString('fa-IR')} تومان است`,
        })
      }
    }

    const payWith = input.payWith ?? 'COUNTER'
    if ((payWith === 'WALLET' || payWith === 'CREDIT' || payWith === 'SPLIT') && !membership) {
      return reply.code(400).send({ error: 'برای پرداخت با کیف/اعتبار کد اشتراک لازم است' })
    }
    if (payWith === 'ONLINE') {
      const paySettings = await loadPaymentSettings()
      if (!isPaymentReady(paySettings) || !paySettings.enableOrderPay) {
        return reply.code(400).send({ error: 'پرداخت آنلاین در حال حاضر فعال نیست' })
      }
      if (total < paySettings.minAmount) {
        return reply.code(400).send({
          error: `حداقل مبلغ پرداخت آنلاین ${paySettings.minAmount.toLocaleString('fa-IR')} تومان است`,
        })
      }
    }

    let walletPay = 0
    let creditPay = 0
    if (membership && payWith === 'WALLET') {
      walletPay = total
      if (membership.walletBalance < walletPay) {
        return reply.code(400).send({ error: 'موجودی کیف‌پول کافی نیست — شارژ کنید یا روش دیگر انتخاب کنید' })
      }
    } else if (membership && payWith === 'CREDIT') {
      creditPay = total
      if (membership.creditLimit - membership.creditUsed < creditPay) {
        return reply.code(400).send({ error: 'سقف اعتبار واحد کافی نیست' })
      }
    } else if (membership && payWith === 'SPLIT') {
      const requestedWallet = Math.min(
        membership.walletBalance,
        input.walletAmount ?? membership.walletBalance,
        total,
      )
      walletPay = Math.max(0, requestedWallet)
      creditPay = total - walletPay
      if (creditPay > 0 && membership.creditLimit - membership.creditUsed < creditPay) {
        return reply.code(400).send({
          error: 'باقی‌مانده روی اعتبار جا نمی‌شود — کیف را بیشتر شارژ کنید یا پرداخت در کافه را انتخاب کنید',
        })
      }
    }

    const tier = findRewardTier(store.waitLounge, input.loyaltyRewardId)
    const deliveryLabel =
      fulfillment === 'MALL_DELIVERY' && membership ? buildDeliveryLabel(membership.unit) : null

    let order: (PrismaOrder & { items: OrderItem[]; membership?: { code: string } | null }) | undefined
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const code = await nextOrderCode(tx)
          const paidNow = walletPay + creditPay
          const paymentStatus = paidNow >= total && total > 0 ? 'PAID' : paidNow > 0 ? 'UNPAID' : 'UNPAID'
          // If fully covered by wallet/credit, mark PAID; partial wallet+credit covering all also PAID
          const fullyPaid = paidNow >= total
          let paymentMethod: 'UNPAID' | 'WALLET' | 'CREDIT' | 'MIXED' = 'UNPAID'
          if (fullyPaid) {
            if (walletPay > 0 && creditPay > 0) paymentMethod = 'MIXED'
            else if (walletPay > 0) paymentMethod = 'WALLET'
            else if (creditPay > 0) paymentMethod = 'CREDIT'
          }

          const created = await tx.order.create({
            data: {
              code,
              channel: input.channel,
              customerName: customerName ?? membership?.contactName ?? null,
              customerPhone:
                normalizeIranPhone(customerPhone) ??
                customerPhone ??
                membership?.contactPhone ??
                null,
              note: input.note ?? null,
              customerId: customerId ?? null,
              subtotal: itemsSubtotal,
              discountAmount,
              discountNote,
              total,
              membershipId: membership?.id ?? null,
              fulfillment,
              deliveryUnitId: fulfillment === 'MALL_DELIVERY' ? membership?.unitId ?? null : null,
              deliveryLabel,
              deliveryStatus: fulfillment === 'MALL_DELIVERY' ? 'QUEUED' : 'NONE',
              paymentStatus: fullyPaid ? 'PAID' : paymentStatus,
              paymentMethod: fullyPaid ? paymentMethod : 'UNPAID',
              paidAmount: fullyPaid ? total : 0,
              paidAt: fullyPaid ? new Date() : null,
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
            include: { items: true, membership: { select: { code: true } } },
          })

          if (membership && walletPay > 0) {
            await applyWalletPayment(tx, membership.id, walletPay, created.id)
            await tx.orderPayment.create({
              data: { orderId: created.id, method: 'WALLET', amount: walletPay },
            })
          }
          if (membership && creditPay > 0) {
            await applyCreditCharge(tx, membership.id, creditPay, created.id)
            await tx.orderPayment.create({
              data: { orderId: created.id, method: 'CREDIT', amount: creditPay },
            })
          }

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
        const e = err as { statusCode?: number; message?: string }
        if (e.statusCode === 400) {
          return reply.code(400).send({ error: e.message })
        }
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
      data: {
        type: 'order_created',
        payload: {
          orderId: order.id,
          total,
          channel: input.channel,
          membershipId: membership?.id ?? null,
          fulfillment,
          payWith,
        },
      },
    })

    if (payWith === 'ONLINE' && order.paymentStatus !== 'PAID') {
      try {
        const payment = await startOrderPayment(order.id, customerId)
        return reply.code(201).send({ ...serialized, paymentUrl: payment.paymentUrl, authority: payment.authority })
      } catch (err) {
        return reply.code(201).send({
          ...serialized,
          paymentError: err instanceof Error ? err.message : 'شروع درگاه ناموفق بود',
        })
      }
    }

    return reply.code(201).send(serialized)
  })

  app.get('/api/orders/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: { items: true, waitGame: true, membership: { select: { code: true } } },
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
        deliveryStatus: true,
        deliveryLabel: true,
        fulfillment: true,
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
      fulfillment: order.fulfillment,
      deliveryStatus: order.deliveryStatus,
      deliveryLabel: order.deliveryLabel,
    }
  })
}
