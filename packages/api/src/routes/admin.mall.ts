import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildDeliveryLabel,
  mergeMallClubSettings,
  normalizeMallCodeInput,
} from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { ensureUniqueMembershipCode, topUpWallet } from '../lib/mallClub.js'
import { loadSettings } from '../lib/storeSettings.js'
import { serializeOrder } from '../lib/serializers.js'

const unitPatchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  floor: z.string().max(20).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  managerName: z.string().max(80).nullable().optional(),
  managerPhone: z.string().max(40).nullable().optional(),
  contactName: z.string().max(80).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  isActive: z.boolean().optional(),
})

const membershipPatchSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  discountPercent: z.number().int().min(0).max(50).optional(),
  creditLimit: z.number().int().min(0).max(50_000_000).optional(),
  contactName: z.string().max(80).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

const topupSchema = z.object({
  amount: z.number().int().min(0).max(50_000_000),
  bonusPercent: z.number().int().min(0).max(100).default(0),
  packageId: z.string().max(40).optional(),
  note: z.string().max(200).nullable().optional(),
})

const deliveryStatusSchema = z.object({
  deliveryStatus: z.enum(['QUEUED', 'OUT', 'HANDED']),
})

function serializeMembership(m: {
  id: string
  code: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  discountPercent: number
  walletBalance: number
  creditLimit: number
  creditUsed: number
  contactName: string | null
  notes: string | null
  unitId: string
  createdAt: Date
  updatedAt: Date
  unit: {
    id: string
    unitCode: string
    name: string
    floor: string | null
    category: string | null
    isActive: boolean
    contactName: string | null
    contactPhone: string | null
  }
}) {
  const creditAvailable = Math.max(0, m.creditLimit - m.creditUsed)
  const deliveryLabel = buildDeliveryLabel(m.unit)
  return {
    id: m.id,
    code: m.code,
    status: m.status,
    discountPercent: m.discountPercent,
    walletBalance: m.walletBalance,
    creditLimit: m.creditLimit,
    creditUsed: m.creditUsed,
    creditAvailable,
    contactName: m.contactName,
    unitId: m.unitId,
    notes: m.notes,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    unit: {
      id: m.unit.id,
      unitCode: m.unit.unitCode,
      name: m.unit.name,
      floor: m.unit.floor,
      category: m.unit.category,
      deliveryLabel,
      isActive: m.unit.isActive,
      contactName: m.unit.contactName,
      contactPhone: m.unit.contactPhone,
    },
  }
}

export async function adminMallRoutes(app: FastifyInstance) {
  const staff = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] }
  const manager = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/mall/summary', staff, async () => {
    const [units, memberships, active, walletSum, creditUsed, deliveryQueued] = await Promise.all([
      prisma.mallUnit.count(),
      prisma.mallMembership.count(),
      prisma.mallMembership.count({ where: { status: 'ACTIVE' } }),
      prisma.mallMembership.aggregate({ _sum: { walletBalance: true } }),
      prisma.mallMembership.aggregate({ _sum: { creditUsed: true } }),
      prisma.order.count({
        where: { fulfillment: 'MALL_DELIVERY', deliveryStatus: { in: ['QUEUED', 'OUT'] } },
      }),
    ])
    return {
      units,
      memberships,
      activeMemberships: active,
      totalWallet: walletSum._sum.walletBalance ?? 0,
      totalCreditUsed: creditUsed._sum.creditUsed ?? 0,
      openDeliveries: deliveryQueued,
    }
  })

  app.get('/api/admin/mall/units', staff, async (request) => {
    const q = request.query as { q?: string; page?: string; limit?: string; floor?: string }
    const page = Math.max(1, Number(q.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(q.limit) || 40))
    const where: Record<string, unknown> = {}
    if (q.floor) where.floor = q.floor
    if (q.q?.trim()) {
      const term = q.q.trim()
      where.OR = [
        { unitCode: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
        { managerName: { contains: term, mode: 'insensitive' } },
        { contactName: { contains: term, mode: 'insensitive' } },
        { membership: { code: { contains: term.toUpperCase() } } },
      ]
    }
    const [items, total] = await Promise.all([
      prisma.mallUnit.findMany({
        where,
        include: { membership: true },
        orderBy: [{ floor: 'asc' }, { unitCode: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mallUnit.count({ where }),
    ])
    return {
      items: items.map((u) => ({
        id: u.id,
        unitCode: u.unitCode,
        name: u.name,
        floor: u.floor,
        category: u.category,
        managerName: u.managerName,
        managerPhone: u.managerPhone,
        contactName: u.contactName ?? u.membership?.contactName ?? u.managerName,
        contactPhone:
          u.contactPhone ?? u.membership?.contactPhone ?? u.managerPhone ?? null,
        isActive: u.isActive,
        deliveryLabel: buildDeliveryLabel(u),
        membership: u.membership
          ? {
              id: u.membership.id,
              code: u.membership.code,
              status: u.membership.status,
              discountPercent: u.membership.discountPercent,
              walletBalance: u.membership.walletBalance,
              creditLimit: u.membership.creditLimit,
              creditUsed: u.membership.creditUsed,
              contactPhone: u.membership.contactPhone,
            }
          : null,
      })),
      total,
      page,
      limit,
    }
  })

  app.patch('/api/admin/mall/units/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = unitPatchSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده نامعتبر است' })
    const unit = await prisma.mallUnit.update({ where: { id }, data: parsed.data })
    return unit
  })

  app.get('/api/admin/mall/memberships', staff, async (request) => {
    const q = request.query as { q?: string; page?: string; limit?: string; status?: string }
    const page = Math.max(1, Number(q.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(q.limit) || 40))
    const where: Record<string, unknown> = {}
    if (q.status) where.status = q.status
    if (q.q?.trim()) {
      const term = q.q.trim()
      where.OR = [
        { code: { contains: normalizeMallCodeInput(term) } },
        { unit: { unitCode: { contains: term, mode: 'insensitive' } } },
        { unit: { name: { contains: term, mode: 'insensitive' } } },
      ]
    }
    const [items, total] = await Promise.all([
      prisma.mallMembership.findMany({
        where,
        include: { unit: true },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mallMembership.count({ where }),
    ])
    return { items: items.map(serializeMembership), total, page, limit }
  })

  app.patch('/api/admin/mall/memberships/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = membershipPatchSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده نامعتبر است' })
    if (parsed.data.creditLimit !== undefined) {
      const current = await prisma.mallMembership.findUnique({ where: { id } })
      if (current && parsed.data.creditLimit < current.creditUsed) {
        return reply.code(400).send({ error: 'سقف اعتبار نمی‌تواند کمتر از اعتبار استفاده‌شده باشد' })
      }
    }
    const m = await prisma.mallMembership.update({
      where: { id },
      data: parsed.data,
      include: { unit: true },
    })
    return serializeMembership(m)
  })

  app.post('/api/admin/mall/memberships/:id/regenerate-code', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const current = await prisma.mallMembership.findUnique({
      where: { id },
      include: { unit: true },
    })
    if (!current) return reply.code(404).send({ error: 'عضویت پیدا نشد' })
    const code = await ensureUniqueMembershipCode(current.unit.unitCode)
    const m = await prisma.mallMembership.update({
      where: { id },
      data: { code },
      include: { unit: true },
    })
    return serializeMembership(m)
  })

  app.post('/api/admin/mall/memberships/:id/topup', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = topupSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'مبلغ نامعتبر است' })
    const store = await loadSettings()
    const mall = mergeMallClubSettings(store.mallClub)
    let amount = parsed.data.amount
    let bonusPercent = parsed.data.bonusPercent
    if (parsed.data.packageId) {
      const pack = mall.topupPackages.find((p) => p.id === parsed.data.packageId)
      if (pack) {
        amount = pack.amount
        bonusPercent = pack.bonusPercent
      }
    }
    const bonus = Math.round((amount * bonusPercent) / 100)
    const user = request.user as { sub?: string }
    try {
      const m = await topUpWallet(id, amount, bonus, parsed.data.note ?? null, user?.sub ?? null)
      return serializeMembership(m)
    } catch (err) {
      const e = err as { statusCode?: number; message?: string }
      return reply.code(e.statusCode ?? 500).send({ error: e.message ?? 'خطا در شارژ' })
    }
  })

  app.post('/api/admin/mall/memberships/:id/settle-credit', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = z
      .object({
        amount: z.number().int().min(1).max(50_000_000).optional(),
        note: z.string().max(200).nullable().optional(),
      })
      .safeParse(request.body ?? {})
    if (!body.success) return reply.code(400).send({ error: 'مبلغ نامعتبر است' })
    const user = request.user as { sub?: string }
    const m = await prisma.$transaction(async (tx) => {
      const current = await tx.mallMembership.findUniqueOrThrow({ where: { id } })
      const amount = Math.min(body.data.amount ?? current.creditUsed, current.creditUsed)
      if (amount <= 0) throw Object.assign(new Error('بدهی اعتباری وجود ندارد'), { statusCode: 400 })
      const creditUsedAfter = current.creditUsed - amount
      await tx.mallCreditLedger.create({
        data: {
          membershipId: id,
          type: 'SETTLE',
          amount: -amount,
          creditUsedAfter,
          note: body.data.note ?? 'تسویه اعتبار',
          createdByUserId: user?.sub,
        },
      })
      return tx.mallMembership.update({
        where: { id },
        data: { creditUsed: creditUsedAfter },
        include: { unit: true },
      })
    })
    return serializeMembership(m)
  })

  app.get('/api/admin/mall/memberships/export.csv', manager, async (_request, reply) => {
    const items = await prisma.mallMembership.findMany({
      include: { unit: true },
      orderBy: { unit: { unitCode: 'asc' } },
    })
    const base = process.env.PUBLIC_WEB_URL?.replace(/\/$/, '') || 'https://chill-bar.ir'
    const lines = [
      ['unitCode', 'unitName', 'floor', 'membershipCode', 'status', 'discountPercent', 'wallet', 'creditLimit', 'creditUsed', 'contactPhone', 'deepLink'].join(','),
      ...items.map((m) =>
        [
          m.unit.unitCode,
          JSON.stringify(m.unit.name),
          m.unit.floor ?? '',
          m.code,
          m.status,
          m.discountPercent,
          m.walletBalance,
          m.creditLimit,
          m.creditUsed,
          m.contactPhone ?? '',
          `${base}/m/${m.code}`,
        ].join(','),
      ),
    ]
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="city-center-memberships.csv"')
    return lines.join('\n')
  })

  app.post('/api/admin/mall/import-seed', manager, async (_request, reply) => {
    try {
      const here = dirname(fileURLToPath(import.meta.url))
      const path = resolve(here, '../../data/city-center/units.json')
      const raw = JSON.parse(readFileSync(path, 'utf8')) as {
        complex: { slug: string; name: string }
        units: Array<Record<string, unknown>>
      }
      const store = await loadSettings()
      const mall = mergeMallClubSettings(store.mallClub)
      const complex = await prisma.mallComplex.upsert({
        where: { slug: raw.complex.slug },
        create: { slug: raw.complex.slug, name: raw.complex.name, isActive: true },
        update: { name: raw.complex.name, isActive: true },
      })
      let created = 0
      let updated = 0
      let memberships = 0
      for (const u of raw.units) {
        const unitCode = String(u.unitCode || '').trim()
        if (!unitCode) continue
        const existing = await prisma.mallUnit.findUnique({
          where: { complexId_unitCode: { complexId: complex.id, unitCode } },
          include: { membership: true },
        })
        const data = {
          name: String(u.name || unitCode),
          floor: (u.floor as string) ?? null,
          category: (u.category as string) ?? null,
          usage: (u.usage as string) ?? null,
          managerName: (u.managerName as string) ?? null,
          managerPhone: (u.managerPhone as string) ?? null,
          unitPhone: (u.unitPhone as string) ?? null,
          ownerName: (u.ownerName as string) ?? null,
          ownerPhone: (u.ownerPhone as string) ?? null,
          tenantName: (u.tenantName as string) ?? null,
          contactName: (u.contactName as string) ?? (u.managerName as string) ?? null,
          contactPhone: (u.contactPhone as string) ?? (u.managerPhone as string) ?? null,
          isActive: true,
          meta: (u.meta as object) ?? {},
        }
        if (existing) {
          await prisma.mallUnit.update({ where: { id: existing.id }, data })
          updated++
          if (!existing.membership) {
            await prisma.mallMembership.create({
              data: {
                code: await ensureUniqueMembershipCode(unitCode),
                unitId: existing.id,
                discountPercent: mall.defaultDiscountPercent,
                creditLimit: mall.defaultCreditLimit,
                contactName: data.contactName,
                contactPhone: data.contactPhone,
              },
            })
            memberships++
          }
        } else {
          await prisma.mallUnit.create({
            data: {
              complexId: complex.id,
              unitCode,
              ...data,
              membership: {
                create: {
                  code: await ensureUniqueMembershipCode(unitCode),
                  discountPercent: mall.defaultDiscountPercent,
                  creditLimit: mall.defaultCreditLimit,
                  contactName: data.contactName,
                  contactPhone: data.contactPhone,
                },
              },
            },
          })
          created++
          memberships++
        }
      }
      return { ok: true, created, updated, membershipsCreated: memberships }
    } catch (err) {
      app.log.error(err)
      return reply.code(500).send({ error: 'ایمپورت ناموفق بود' })
    }
  })

  app.get('/api/admin/mall/deliveries', staff, async (request) => {
    const q = request.query as { status?: string }
    const statuses =
      q.status === 'all'
        ? (['QUEUED', 'OUT', 'HANDED'] as const)
        : q.status
          ? [q.status as 'QUEUED' | 'OUT' | 'HANDED']
          : (['QUEUED', 'OUT'] as const)
    const orders = await prisma.order.findMany({
      where: {
        fulfillment: 'MALL_DELIVERY',
        deliveryStatus: { in: [...statuses] },
        status: { not: 'CANCELLED' },
      },
      include: {
        items: true,
        membership: { select: { code: true } },
        deliveryUnit: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    return {
      items: orders.map((o) => ({
        ...serializeOrder(o),
        unitCode: o.deliveryUnit?.unitCode ?? null,
        unitName: o.deliveryUnit?.name ?? null,
        floor: o.deliveryUnit?.floor ?? null,
      })),
    }
  })

  app.patch('/api/admin/mall/orders/:id/delivery-status', staff, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = deliveryStatusSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'وضعیت نامعتبر است' })
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { code: id }], fulfillment: 'MALL_DELIVERY' },
    })
    if (!order) return reply.code(404).send({ error: 'سفارش پیک پیدا نشد' })
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        deliveryStatus: parsed.data.deliveryStatus,
        status:
          parsed.data.deliveryStatus === 'HANDED'
            ? 'DELIVERED'
            : parsed.data.deliveryStatus === 'OUT'
              ? order.status === 'PENDING'
                ? 'PREPARING'
                : order.status
              : order.status,
        completedAt: parsed.data.deliveryStatus === 'HANDED' ? new Date() : order.completedAt,
      },
      include: { items: true, membership: { select: { code: true } } },
    })
    return serializeOrder(updated)
  })

  app.get('/api/admin/mall/report', manager, async (request) => {
    const q = request.query as { days?: string }
    const days = Math.min(90, Math.max(1, Number(q.days) || 7))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const orders = await prisma.order.findMany({
      where: {
        membershipId: { not: null },
        createdAt: { gte: since },
        status: { not: 'CANCELLED' },
      },
      select: {
        total: true,
        membershipId: true,
        fulfillment: true,
        membership: { select: { code: true, unit: { select: { unitCode: true, name: true, floor: true } } } },
      },
    })
    const byUnit = new Map<
      string,
      { unitCode: string; name: string; floor: string | null; orders: number; total: number; deliveries: number }
    >()
    for (const o of orders) {
      const key = o.membershipId!
      const u = o.membership?.unit
      const row = byUnit.get(key) ?? {
        unitCode: u?.unitCode ?? '—',
        name: u?.name ?? '—',
        floor: u?.floor ?? null,
        orders: 0,
        total: 0,
        deliveries: 0,
      }
      row.orders++
      row.total += o.total
      if (o.fulfillment === 'MALL_DELIVERY') row.deliveries++
      byUnit.set(key, row)
    }
    const ranking = [...byUnit.values()].sort((a, b) => b.total - a.total).slice(0, 40)
    return {
      days,
      orderCount: orders.length,
      revenue: orders.reduce((s, o) => s + o.total, 0),
      deliveryCount: orders.filter((o) => o.fulfillment === 'MALL_DELIVERY').length,
      ranking,
    }
  })

  app.post('/api/admin/mall/invoices/generate', manager, async (request, reply) => {
    const body = z
      .object({ periodKey: z.string().regex(/^\d{4}-\d{2}$/).optional() })
      .safeParse(request.body ?? {})
    if (!body.success) return reply.code(400).send({ error: 'دوره نامعتبر است' })
    const now = new Date()
    const periodKey =
      body.data.periodKey ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const members = await prisma.mallMembership.findMany({
      where: { creditUsed: { gt: 0 } },
      include: { unit: true },
    })
    let created = 0
    for (const m of members) {
      const existing = await prisma.mallInvoice.findUnique({
        where: { membershipId_periodKey: { membershipId: m.id, periodKey } },
      })
      if (existing) continue
      await prisma.mallInvoice.create({
        data: {
          membershipId: m.id,
          periodKey,
          status: 'OPEN',
          totalAmount: m.creditUsed,
          note: `فاکتور اعتبار ${m.unit.unitCode}`,
        },
      })
      created++
    }
    return { periodKey, created }
  })

  app.get('/api/admin/mall/invoices', manager, async (request) => {
    const q = request.query as { periodKey?: string; status?: string }
    const where: Record<string, unknown> = {}
    if (q.periodKey) where.periodKey = q.periodKey
    if (q.status) where.status = q.status
    const items = await prisma.mallInvoice.findMany({
      where,
      include: { membership: { include: { unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return {
      items: items.map((inv) => ({
        id: inv.id,
        periodKey: inv.periodKey,
        status: inv.status,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        paidAt: inv.paidAt?.toISOString() ?? null,
        unitCode: inv.membership.unit.unitCode,
        unitName: inv.membership.unit.name,
        membershipCode: inv.membership.code,
        createdAt: inv.createdAt.toISOString(),
      })),
    }
  })

  app.post('/api/admin/mall/invoices/:id/pay', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const inv = await prisma.mallInvoice.findUnique({ where: { id } })
    if (!inv) return reply.code(404).send({ error: 'فاکتور پیدا نشد' })
    if (inv.status === 'PAID') return inv
    const user = request.user as { sub?: string }
    await prisma.$transaction(async (tx) => {
      const m = await tx.mallMembership.findUniqueOrThrow({ where: { id: inv.membershipId } })
      const settle = Math.min(inv.totalAmount, m.creditUsed)
      const creditUsedAfter = Math.max(0, m.creditUsed - settle)
      await tx.mallMembership.update({
        where: { id: m.id },
        data: { creditUsed: creditUsedAfter },
      })
      await tx.mallCreditLedger.create({
        data: {
          membershipId: m.id,
          type: 'SETTLE',
          amount: -settle,
          creditUsedAfter,
          invoiceId: inv.id,
          note: `تسویه فاکتور ${inv.periodKey}`,
          createdByUserId: user?.sub,
        },
      })
      await tx.mallInvoice.update({
        where: { id },
        data: { status: 'PAID', paidAmount: inv.totalAmount, paidAt: new Date() },
      })
    })
    return prisma.mallInvoice.findUnique({ where: { id } })
  })

}
