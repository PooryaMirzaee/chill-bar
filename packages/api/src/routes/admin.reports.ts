import type { FastifyInstance } from 'fastify'
import type { FinancialOrderSortField, FinancialSortDirection } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import {
  buildFinancialDailyReport,
  buildFinancialOrdersReport,
  buildFinancialSummaryReport,
  endOfDay,
  parseReportDate,
  sortFinancialOrders,
  startOfDay,
  mapFinancialOrderRow,
} from '../lib/financialReports.js'

function parseSort(
  query: Record<string, string | undefined>,
): { sortBy: FinancialOrderSortField; sortDir: FinancialSortDirection } {
  const sortBy = (query.sortBy as FinancialOrderSortField) || 'createdAt'
  const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc'
  const allowed: FinancialOrderSortField[] = [
    'createdAt',
    'code',
    'total',
    'receiptNumber',
    'channel',
  ]
  return {
    sortBy: allowed.includes(sortBy) ? sortBy : 'createdAt',
    sortDir,
  }
}

export async function adminReportRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/reports/financial/daily', guard, async (request) => {
    const query = request.query as { date?: string; sortBy?: string; sortDir?: string }
    const date = parseReportDate(query.date)
    const dateKey = date.toISOString().slice(0, 10)
    const { sortBy, sortDir } = parseSort(query)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay(date), lt: endOfDay(date) },
      },
      include: { payments: true, adjustments: true, items: true },
      orderBy: { createdAt: 'asc' },
    })

    const summary = buildFinancialDailyReport(dateKey, orders)
    return {
      ...summary,
      orders: sortFinancialOrders(
        orders.filter((order) => order.status !== 'CANCELLED').map(mapFinancialOrderRow),
        sortBy,
        sortDir,
      ),
    }
  })

  app.get('/api/admin/reports/financial/orders', guard, async (request) => {
    const query = request.query as { date?: string; sortBy?: string; sortDir?: string }
    const date = parseReportDate(query.date)
    const dateKey = date.toISOString().slice(0, 10)
    const { sortBy, sortDir } = parseSort(query)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay(date), lt: endOfDay(date) },
      },
      include: { payments: true, adjustments: true, items: true },
      orderBy: { createdAt: 'asc' },
    })

    return buildFinancialOrdersReport(dateKey, orders, sortBy, sortDir)
  })

  app.get('/api/admin/reports/financial/summary', guard, async (request) => {
    const query = request.query as { from?: string; to?: string; sortBy?: string; sortDir?: string }
    const to = parseReportDate(query.to)
    const from = query.from ? parseReportDate(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000)
    const { sortBy, sortDir } = parseSort(query)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay(from), lt: endOfDay(to) },
      },
      include: { payments: true, adjustments: true, items: true },
      orderBy: { createdAt: 'asc' },
    })

    return buildFinancialSummaryReport(startOfDay(from), startOfDay(to), orders, sortBy, sortDir)
  })
}
