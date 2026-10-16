import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getCustomerIdFromAuth } from './customers.js'
import { findMembershipByCode } from '../lib/mallClub.js'
import { loadPaymentSettings, toPublicPaymentConfig } from '../lib/payments/settings.js'
import {
  handleZarinpalCallback,
  startOrderPayment,
  startWalletTopupPayment,
} from '../lib/payments/service.js'

export async function paymentRoutes(app: FastifyInstance) {
  app.get('/api/payments/config', async () => {
    const settings = await loadPaymentSettings()
    return toPublicPaymentConfig(settings)
  })

  app.post('/api/payments/zarinpal/order', async (request, reply) => {
    const body = z.object({ orderId: z.string().min(1) }).safeParse(request.body)
    if (!body.success) return reply.code(400).send({ error: 'شناسه سفارش لازم است' })
    const customerId = await getCustomerIdFromAuth(request)
    try {
      const result = await startOrderPayment(body.data.orderId, customerId)
      return result
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500
      return reply.code(status).send({
        error: err instanceof Error ? err.message : 'شروع پرداخت ناموفق بود',
      })
    }
  })

  app.post('/api/payments/zarinpal/wallet', async (request, reply) => {
    const body = z
      .object({
        membershipCode: z.string().min(1),
        amount: z.number().int().positive(),
        bonusPercent: z.number().int().min(0).max(100).optional(),
      })
      .safeParse(request.body)
    if (!body.success) {
      return reply.code(400).send({ error: body.error.issues[0]?.message ?? 'درخواست نامعتبر' })
    }
    const membership = await findMembershipByCode(body.data.membershipCode)
    if (!membership) return reply.code(404).send({ error: 'کد اشتراک یافت نشد' })
    const customerId = await getCustomerIdFromAuth(request)
    try {
      const result = await startWalletTopupPayment({
        membershipId: membership.id,
        amount: body.data.amount,
        bonusPercent: body.data.bonusPercent,
        customerId,
        mobile: membership.contactPhone,
      })
      return result
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500
      return reply.code(status).send({
        error: err instanceof Error ? err.message : 'شروع شارژ ناموفق بود',
      })
    }
  })

  app.get('/api/payments/zarinpal/callback', async (request, reply) => {
    const q = request.query as { Authority?: string; Status?: string; authority?: string; status?: string }
    const authority = q.Authority || q.authority || ''
    const status = q.Status || q.status || 'NOK'
    if (!authority) {
      return reply.code(400).send({ error: 'Authority نیست' })
    }
    try {
      const redirectTo = await handleZarinpalCallback(authority, status)
      return reply.redirect(redirectTo)
    } catch (err) {
      request.log.error(err)
      const settings = await loadPaymentSettings()
      const web = settings.publicWebUrl.replace(/\/$/, '') || 'https://chill-bar.ir'
      return reply.redirect(
        `${web}/pay/result?ok=0&error=${encodeURIComponent(
          err instanceof Error ? err.message : 'خطای تأیید پرداخت',
        )}`,
      )
    }
  })
}
