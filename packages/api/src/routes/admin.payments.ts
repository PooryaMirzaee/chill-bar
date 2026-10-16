import type { FastifyInstance } from 'fastify'
import { paymentSettingsSchema } from '@chill-bar/shared'
import type { PaymentSettings } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import {
  isMaskedMerchantId,
  isPaymentReady,
  loadPaymentSettings,
  maskMerchantId,
  savePaymentSettings,
} from '../lib/payments/settings.js'
import { zarinpalRequest } from '../lib/payments/zarinpal.js'

export async function adminPaymentRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/payments', guard, async () => {
    const settings = await loadPaymentSettings()
    return {
      ...settings,
      merchantId: maskMerchantId(settings.merchantId),
      ready: isPaymentReady(settings),
    }
  })

  app.put('/api/admin/payments', guard, async (request, reply) => {
    const parsed = paymentSettingsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر' })
    }
    const current = await loadPaymentSettings()
    const incoming = parsed.data as PaymentSettings
    const merchantId =
      incoming.merchantId && !isMaskedMerchantId(incoming.merchantId)
        ? incoming.merchantId.trim()
        : current.merchantId

    const saved = await savePaymentSettings({ ...incoming, merchantId })
    return {
      ...saved,
      merchantId: maskMerchantId(saved.merchantId),
      ready: isPaymentReady(saved),
    }
  })

  app.post('/api/admin/payments/zarinpal/test', guard, async (request, reply) => {
    const body = (request.body ?? {}) as Partial<PaymentSettings>
    const current = await loadPaymentSettings()
    const testSettings: PaymentSettings = {
      ...current,
      ...body,
      merchantId:
        body.merchantId && !isMaskedMerchantId(body.merchantId)
          ? body.merchantId.trim()
          : current.merchantId,
    }
    if (!isPaymentReady({ ...testSettings, enabled: true })) {
      return reply.code(400).send({ error: 'مرچنت‌کد ۳۶ کاراکتری و آدرس callback لازم است' })
    }

    try {
      const callbackUrl = `${testSettings.callbackBaseUrl.replace(/\/$/, '')}/api/payments/zarinpal/callback`
      const result = await zarinpalRequest({
        settings: { ...testSettings, enabled: true },
        amount: Math.max(testSettings.minAmount, 1000),
        description: `${testSettings.descriptionPrefix} تست اتصال`,
        callbackUrl,
        mobile: '09120000000',
        orderId: 'TEST',
      })
      return {
        ok: true,
        message: `اتصال موفق — Authority دریافت شد (${result.authority.slice(0, 8)}…)`,
        authority: result.authority,
        sandbox: testSettings.sandbox,
      }
    } catch (err) {
      return reply.code(502).send({
        error: err instanceof Error ? err.message : 'تست زرین‌پال ناموفق بود',
      })
    }
  })

  app.get('/api/admin/payments/recent', guard, async () => {
    const rows = await prisma.onlinePayment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        order: { select: { code: true } },
        membership: { select: { code: true, unit: { select: { unitCode: true, name: true } } } },
      },
    })
    return rows.map((r) => ({
      id: r.id,
      purpose: r.purpose,
      status: r.status,
      amount: r.amount,
      currency: r.currency,
      authority: r.authority,
      refId: r.refId,
      cardPan: r.cardPan,
      orderCode: r.order?.code ?? null,
      membershipCode: r.membership?.code ?? null,
      unitCode: r.membership?.unit.unitCode ?? null,
      createdAt: r.createdAt,
      verifiedAt: r.verifiedAt,
    }))
  })
}
