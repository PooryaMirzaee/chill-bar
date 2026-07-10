import type { FastifyInstance } from 'fastify'
import {
  adminCustomerCreateSchema,
  adminCustomerPointsSchema,
  adminCustomerUpdateSchema,
} from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { buildAdminCustomerDetail, buildAdminCustomerRow } from '../lib/customers.js'
import { normalizeIranPhone } from '../lib/customerLink.js'
import { prismaErrorMessage } from '../lib/dbSchema.js'

export async function adminCustomerRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] }
  const managerGuard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/customers', guard, async (request) => {
    const query = request.query as {
      q?: string
      page?: string
      limit?: string
      registered?: string
    }
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(query.limit) || 25))
    const skip = (page - 1) * limit
    const q = query.q?.trim()

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { phone: { contains: q } },
        { name: { contains: q, mode: 'insensitive' } },
      ]
    }
    if (query.registered === 'true') where.isRegistered = true
    if (query.registered === 'false') where.isRegistered = false

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ])

    const ids = customers.map((c) => c.id)
    const statsRows =
      ids.length === 0
        ? []
        : await prisma.order.groupBy({
            by: ['customerId'],
            where: {
              customerId: { in: ids },
              paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
            },
            _count: true,
            _sum: { total: true },
            _max: { createdAt: true },
          })

    const statsMap = new Map(
      statsRows.map((row) => [
        row.customerId!,
        {
          orderCount: row._count,
          totalSpent: row._sum.total ?? 0,
          lastOrderAt: row._max.createdAt,
        },
      ]),
    )

    const rows = await Promise.all(
      customers.map((customer) =>
        buildAdminCustomerRow(customer, statsMap.get(customer.id)),
      ),
    )

    return { customers: rows, total, page, limit }
  })

  app.get('/api/admin/customers/:id', guard, async (request, reply) => {
    const { id } = request.params as { id: string }
    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) return reply.code(404).send({ error: 'مشتری پیدا نشد' })
    return buildAdminCustomerDetail(customer)
  })

  app.post('/api/admin/customers', managerGuard, async (request, reply) => {
    const parsed = adminCustomerCreateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }
    const phone = normalizeIranPhone(parsed.data.phone)
    if (!phone) return reply.code(400).send({ error: 'شماره موبایل نامعتبر است' })

    const existing = await prisma.customer.findUnique({ where: { phone } })
    if (existing) {
      return reply.code(409).send({ error: 'این شماره قبلاً ثبت شده است' })
    }

    try {
      const customer = await prisma.customer.create({
        data: {
          phone,
          name: parsed.data.name ?? null,
          notes: parsed.data.notes ?? null,
          isRegistered: false,
        },
      })
      return reply.code(201).send(await buildAdminCustomerDetail(customer))
    } catch (err) {
      const message = prismaErrorMessage(err) ?? 'ثبت مشتری ناموفق بود'
      return reply.code(500).send({ error: message })
    }
  })

  app.patch('/api/admin/customers/:id', managerGuard, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = adminCustomerUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }

    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'مشتری پیدا نشد' })

    if (parsed.data.phone) {
      const phone = normalizeIranPhone(parsed.data.phone)
      if (!phone) return reply.code(400).send({ error: 'شماره موبایل نامعتبر است' })
      const taken = await prisma.customer.findFirst({
        where: { phone, id: { not: id } },
      })
      if (taken) return reply.code(409).send({ error: 'این شماره متعلق به مشتری دیگری است' })
    }

    try {
      const customer = await prisma.customer.update({
        where: { id },
        data: {
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
          ...(parsed.data.phone
            ? { phone: normalizeIranPhone(parsed.data.phone) }
            : {}),
        },
      })
      return buildAdminCustomerDetail(customer)
    } catch (err) {
      const message = prismaErrorMessage(err) ?? 'به‌روزرسانی ناموفق بود'
      return reply.code(500).send({ error: message })
    }
  })

  app.post('/api/admin/customers/:id/points', managerGuard, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = adminCustomerPointsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }

    const customer = await prisma.customer.findUnique({ where: { id } })
    if (!customer) return reply.code(404).send({ error: 'مشتری پیدا نشد' })

    const nextPoints = customer.chillPoints + parsed.data.delta
    if (nextPoints < 0) {
      return reply.code(400).send({ error: 'امتیاز کافی نیست' })
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: { chillPoints: nextPoints },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          customerId: id,
          type: parsed.data.delta >= 0 ? 'admin_grant' : 'admin_deduct',
          points: parsed.data.delta,
          meta: { reason: parsed.data.reason ?? 'تغییر توسط ادمین' },
        },
      }),
    ])

    const updated = await prisma.customer.findUniqueOrThrow({ where: { id } })
    return buildAdminCustomerDetail(updated)
  })
}
