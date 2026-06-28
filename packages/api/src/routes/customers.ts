import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  customerOtpSendSchema,
  customerOtpVerifySchema,
  customerPreferencesSyncSchema,
  customerUpdateSchema,
} from '@chill-bar/shared'
import type { CustomerPreferences } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import {
  customerOrderCount,
  mergePreferences,
  preferencesToJson,
  serializeCustomer,
  signCustomerToken,
} from '../lib/customers.js'
import { serializeOrder } from '../lib/serializers.js'
import { loadSmsSettings, toPublicSmsConfig, isSmsReady } from '../lib/sms/settings.js'
import {
  OtpAttemptsExceededError,
  OtpRateLimitError,
  sendPhoneOtp,
  verifyPhoneOtp,
} from '../lib/sms/otp.js'
import { getLoyaltyBalance } from '../lib/loyalty.js'

async function resolveCustomerFromRequest(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'احراز هویت لازم است' })
    return null
  }
  if (request.user.role !== 'CUSTOMER') {
    reply.code(403).send({ error: 'دسترسی مشتری لازم است' })
    return null
  }
  const customer = await prisma.customer.findUnique({ where: { id: request.user.sub } })
  if (!customer) {
    reply.code(404).send({ error: 'حساب کاربری پیدا نشد' })
    return null
  }
  return customer
}

async function resolveGuestId(request: FastifyRequest): Promise<string | null> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    await request.jwtVerify()
    if (request.user.role === 'CUSTOMER') return request.user.sub
  } catch {
    /* ignore */
  }
  return null
}

async function completeRegistration(
  app: FastifyInstance,
  phone: string,
  name: string | null | undefined,
  guestId: string | null,
) {
  const existing = await prisma.customer.findUnique({ where: { phone } })

  if (existing?.isRegistered) {
    let mergedPrefs = (existing.preferences as CustomerPreferences) ?? {}
    if (guestId && guestId !== existing.id) {
      const guest = await prisma.customer.findUnique({ where: { id: guestId } })
      if (guest) {
        mergedPrefs = mergePreferences(mergedPrefs, guest.preferences as CustomerPreferences)
        await prisma.order.updateMany({ where: { customerId: guestId }, data: { customerId: existing.id } })
        await prisma.customer.delete({ where: { id: guestId } }).catch(() => undefined)
      }
    }
    const updated = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        isRegistered: true,
        name: name ?? existing.name,
        preferences: preferencesToJson(mergedPrefs),
      },
    })
    const token = signCustomerToken(app, updated)
    const orderCount = await customerOrderCount(updated.id, prisma)
    return { token, customer: serializeCustomer(updated, orderCount) }
  }

  if (guestId) {
    const updated = await prisma.customer.update({
      where: { id: guestId },
      data: {
        phone,
        name: name ?? null,
        isRegistered: true,
      },
    })
    const token = signCustomerToken(app, updated)
    const orderCount = await customerOrderCount(updated.id, prisma)
    return { token, customer: serializeCustomer(updated, orderCount) }
  }

  const created = await prisma.customer.create({
    data: {
      phone,
      name: name ?? null,
      isRegistered: true,
      preferences: {},
    },
  })
  const token = signCustomerToken(app, created)
  return { token, customer: serializeCustomer(created, 0) }
}

async function completeLogin(app: FastifyInstance, phone: string) {
  const customer = await prisma.customer.findUnique({ where: { phone } })
  if (!customer || !customer.isRegistered) {
    return null
  }
  const token = signCustomerToken(app, customer)
  const orderCount = await customerOrderCount(customer.id, prisma)
  return { token, customer: serializeCustomer(customer, orderCount) }
}

export async function customerRoutes(app: FastifyInstance) {
  app.get('/api/customers/otp/config', async () => {
    const settings = await loadSmsSettings()
    return toPublicSmsConfig(settings)
  })

  app.post('/api/customers/otp/send', async (request, reply) => {
    const parsed = customerOtpSendSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است' })
    }

    const settings = await loadSmsSettings()
    if (!isSmsReady(settings)) {
      return reply.code(503).send({ error: 'سیستم پیامکی هنوز فعال نشده. لطفاً بعداً تلاش کنید.' })
    }

    const { phone, purpose } = parsed.data
    const existing = await prisma.customer.findUnique({ where: { phone } })

    if (purpose === 'register' && existing?.isRegistered) {
      return reply.code(409).send({ error: 'این شماره قبلاً ثبت شده. از ورود استفاده کنید.' })
    }
    if (purpose === 'login' && (!existing || !existing.isRegistered)) {
      return reply.code(404).send({ error: 'حسابی با این شماره پیدا نشد. ابتدا ثبت‌نام کنید.' })
    }

    try {
      const result = await sendPhoneOtp(settings, phone, purpose)
      return {
        ok: true as const,
        cooldownSeconds: result.cooldownSeconds,
        expiresInSeconds: result.expiresInSeconds,
      }
    } catch (err) {
      if (err instanceof OtpRateLimitError) {
        return reply.code(429).send({ error: err.message, cooldownSeconds: err.cooldownSeconds })
      }
      request.log.error(err)
      return reply.code(502).send({
        error: err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود',
      })
    }
  })

  app.post('/api/customers/otp/verify', async (request, reply) => {
    const parsed = customerOtpVerifySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است' })
    }

    const settings = await loadSmsSettings()
    if (!isSmsReady(settings)) {
      return reply.code(503).send({ error: 'سیستم پیامکی فعال نیست' })
    }

    const { phone, code, purpose, name } = parsed.data
    const guestId = await resolveGuestId(request)

    try {
      const valid = await verifyPhoneOtp(settings, phone, code, purpose)
      if (!valid) {
        return reply.code(400).send({ error: 'کد تأیید اشتباه یا منقضی شده است' })
      }
    } catch (err) {
      if (err instanceof OtpAttemptsExceededError) {
        return reply.code(429).send({ error: err.message })
      }
      throw err
    }

    if (purpose === 'login') {
      const result = await completeLogin(app, phone)
      if (!result) {
        return reply.code(404).send({ error: 'حسابی با این شماره پیدا نشد' })
      }
      return result
    }

    const result = await completeRegistration(app, phone, name, guestId)
    return reply.code(201).send(result)
  })

  app.post('/api/customers/guest', async (_request, reply) => {
    const customer = await prisma.customer.create({
      data: { isRegistered: false, preferences: {} },
    })
    const token = signCustomerToken(app, customer)
    const orderCount = await customerOrderCount(customer.id, prisma)
    return reply.code(201).send({
      token,
      customer: serializeCustomer(customer, orderCount),
    })
  })

  app.post('/api/customers/register', async (_request, reply) => {
    return reply.code(400).send({ error: 'ثبت‌نام فقط با کد پیامکی امکان‌پذیر است' })
  })

  app.post('/api/customers/login', async (_request, reply) => {
    return reply.code(400).send({ error: 'ورود فقط با کد پیامکی امکان‌پذیر است' })
  })

  app.get('/api/customers/me', async (request, reply) => {
    const customer = await resolveCustomerFromRequest(request, reply)
    if (!customer) return
    const orderCount = await customerOrderCount(customer.id, prisma)
    return serializeCustomer(customer, orderCount)
  })

  app.patch('/api/customers/me', async (request, reply) => {
    const customer = await resolveCustomerFromRequest(request, reply)
    if (!customer) return
    const parsed = customerUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است' })
    }
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: parsed.data.name !== undefined ? parsed.data.name : undefined,
      },
    })
    const orderCount = await customerOrderCount(updated.id, prisma)
    return serializeCustomer(updated, orderCount)
  })

  app.post('/api/customers/me/preferences', async (request, reply) => {
    const customer = await resolveCustomerFromRequest(request, reply)
    if (!customer) return
    const parsed = customerPreferencesSyncSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }
    const current = (customer.preferences as CustomerPreferences) ?? {}
    const merged = mergePreferences(current, parsed.data)
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { preferences: preferencesToJson(merged) },
    })
    const orderCount = await customerOrderCount(updated.id, prisma)
    return serializeCustomer(updated, orderCount)
  })

  app.get('/api/customers/me/orders', async (request, reply) => {
    const customer = await resolveCustomerFromRequest(request, reply)
    if (!customer) return
    const limit = Math.min(Number((request.query as { limit?: string }).limit) || 20, 50)
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return orders.map(serializeOrder)
  })

  app.get('/api/customers/me/loyalty', async (request, reply) => {
    const customer = await resolveCustomerFromRequest(request, reply)
    if (!customer) return
    const balance = await getLoyaltyBalance(customer.id)
    if (!balance) return reply.code(404).send({ error: 'حساب کاربری پیدا نشد' })
    return balance
  })
}

export async function getCustomerIdFromAuth(
  request: FastifyRequest,
): Promise<string | null> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    await request.jwtVerify()
    if (request.user.role === 'CUSTOMER') return request.user.sub
  } catch {
    /* ignore */
  }
  return null
}
