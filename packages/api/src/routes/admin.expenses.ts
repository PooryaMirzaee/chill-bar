import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import {
  expenseInputSchema,
  expenseUpdateSchema,
  isoDateToUtcEnd,
  isoDateToUtcStart,
  jalaliMonthRange,
  todayJalali,
} from '@chill-bar/shared'
import type { ExpenseCategory, ExpenseRow } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { prismaErrorMessage } from '../lib/dbSchema.js'

function serializeExpense(
  row: Prisma.ExpenseGetPayload<{ include: { createdBy: { select: { name: true } } } }>,
): ExpenseRow {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    category: row.category as ExpenseCategory,
    paymentMethod: row.paymentMethod,
    vendor: row.vendor,
    cardLabel: row.cardLabel,
    purchasedBy: row.purchasedBy,
    note: row.note,
    expenseDate: row.expenseDate.toISOString().slice(0, 10),
    createdByUserId: row.createdByUserId,
    createdByName: row.createdBy?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function buildSummary(where: Prisma.ExpenseWhereInput) {
  const [agg, byCat] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ])
  return {
    totalAmount: agg._sum.amount ?? 0,
    count: agg._count,
    byCategory: byCat.map((row) => ({
      category: row.category as ExpenseCategory,
      amount: row._sum.amount ?? 0,
      count: row._count,
    })),
  }
}

export async function adminExpenseRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] }
  const managerGuard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/expenses', guard, async (request) => {
    const query = request.query as {
      from?: string
      to?: string
      category?: string
      q?: string
      page?: string
      limit?: string
      jy?: string
      jm?: string
    }

    const where: Prisma.ExpenseWhereInput = {}

    if (query.jy && query.jm) {
      const range = jalaliMonthRange(Number(query.jy), Number(query.jm))
      where.expenseDate = {
        gte: isoDateToUtcStart(range.from),
        lte: isoDateToUtcEnd(range.to),
      }
    } else if (query.from || query.to) {
      where.expenseDate = {}
      if (query.from) where.expenseDate.gte = isoDateToUtcStart(query.from)
      if (query.to) where.expenseDate.lte = isoDateToUtcEnd(query.to)
    }

    if (query.category) where.category = query.category as ExpenseCategory
    if (query.q?.trim()) {
      where.OR = [
        { title: { contains: query.q.trim(), mode: 'insensitive' } },
        { vendor: { contains: query.q.trim(), mode: 'insensitive' } },
        { cardLabel: { contains: query.q.trim(), mode: 'insensitive' } },
        { purchasedBy: { contains: query.q.trim(), mode: 'insensitive' } },
        { note: { contains: query.q.trim(), mode: 'insensitive' } },
      ]
    }

    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(query.limit) || 50))
    const skip = (page - 1) * limit

    const [rows, total, summary] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { createdBy: { select: { name: true } } },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
      buildSummary(where),
    ])

    return {
      expenses: rows.map(serializeExpense),
      total,
      page,
      limit,
      summary,
    }
  })

  app.get('/api/admin/expenses/summary', guard, async (request) => {
    const query = request.query as { jy?: string; jm?: string }
    const today = todayJalali()
    const jy = Number(query.jy) || today.jy
    const jm = Number(query.jm) || today.jm
    const range = jalaliMonthRange(jy, jm)
    const summary = await buildSummary({
      expenseDate: {
        gte: isoDateToUtcStart(range.from),
        lte: isoDateToUtcEnd(range.to),
      },
    })
    return { jy, jm, ...summary }
  })

  app.post('/api/admin/expenses', managerGuard, async (request, reply) => {
    const parsed = expenseInputSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }
    try {
      const created = await prisma.expense.create({
        data: {
          title: parsed.data.title.trim(),
          amount: parsed.data.amount,
          category: parsed.data.category,
          paymentMethod: parsed.data.paymentMethod,
          vendor: parsed.data.vendor?.trim() || null,
          cardLabel: parsed.data.cardLabel?.trim() || null,
          purchasedBy: parsed.data.purchasedBy?.trim() || null,
          note: parsed.data.note?.trim() || null,
          expenseDate: isoDateToUtcStart(parsed.data.expenseDate),
          createdByUserId: request.user.sub,
        },
        include: { createdBy: { select: { name: true } } },
      })
      return reply.code(201).send(serializeExpense(created))
    } catch (err) {
      return reply.code(500).send({ error: prismaErrorMessage(err) ?? 'ثبت هزینه ناموفق بود' })
    }
  })

  app.put('/api/admin/expenses/:id', managerGuard, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = expenseUpdateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
    }
    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'هزینه پیدا نشد' })

    try {
      const updated = await prisma.expense.update({
        where: { id },
        data: {
          ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
          ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
          ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
          ...(parsed.data.paymentMethod !== undefined
            ? { paymentMethod: parsed.data.paymentMethod }
            : {}),
          ...(parsed.data.vendor !== undefined
            ? { vendor: parsed.data.vendor?.trim() || null }
            : {}),
          ...(parsed.data.cardLabel !== undefined
            ? { cardLabel: parsed.data.cardLabel?.trim() || null }
            : {}),
          ...(parsed.data.purchasedBy !== undefined
            ? { purchasedBy: parsed.data.purchasedBy?.trim() || null }
            : {}),
          ...(parsed.data.note !== undefined ? { note: parsed.data.note?.trim() || null } : {}),
          ...(parsed.data.expenseDate !== undefined
            ? { expenseDate: isoDateToUtcStart(parsed.data.expenseDate) }
            : {}),
        },
        include: { createdBy: { select: { name: true } } },
      })
      return serializeExpense(updated)
    } catch (err) {
      return reply.code(500).send({ error: prismaErrorMessage(err) ?? 'به‌روزرسانی ناموفق بود' })
    }
  })

  app.delete('/api/admin/expenses/:id', managerGuard, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: 'هزینه پیدا نشد' })
    await prisma.expense.delete({ where: { id } })
    return reply.code(204).send()
  })
}
