import type { FastifyInstance } from 'fastify'
import { prisma } from '../prisma.js'
import {
  buildFinancialDailyReport,
  buildFinancialSummaryReport,
  endOfDay,
  parseReportDate,
  startOfDay,
} from '../lib/financialReports.js'

export async function adminReportRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/reports/financial/daily', guard, async (request) => {
    const query = request.query as { date?: string }
    const date = parseReportDate(query.date)
    const dateKey = date.toISOString().slice(0, 10)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay(date), lt: endOfDay(date) },
      },
      include: { payments: true, adjustments: true },
      orderBy: { createdAt: 'asc' },
    })

    return buildFinancialDailyReport(dateKey, orders)
  })

  app.get('/api/admin/reports/financial/summary', guard, async (request) => {
    const query = request.query as { from?: string; to?: string }
    const to = parseReportDate(query.to)
    const from = query.from ? parseReportDate(query.from) : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000)

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay(from), lt: endOfDay(to) },
      },
      include: { payments: true, adjustments: true },
      orderBy: { createdAt: 'asc' },
    })

    return buildFinancialSummaryReport(startOfDay(from), startOfDay(to), orders)
  })
}
