import type { FastifyInstance } from 'fastify'
import type { DashboardStats, OrderStatus } from '@chill-bar/shared'
import { prisma } from '../prisma.js'

export async function adminDashboardRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/dashboard',
    { onRequest: [app.authenticate] },
    async (): Promise<DashboardStats> => {
      const now = new Date()
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)

      const [todayOrders, pendingCount, statusGroups, last7] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: startOfDay }, status: { not: 'CANCELLED' } },
          include: { items: true },
        }),
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
        prisma.order.findMany({
          where: {
            createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            status: { not: 'CANCELLED' },
          },
          select: { total: true, createdAt: true },
        }),
      ])

      const revenueToday = todayOrders.reduce((sum, o) => sum + o.total, 0)
      const ordersToday = todayOrders.length
      const avgOrderValue = ordersToday ? Math.round(revenueToday / ordersToday) : 0

      const statusCounts = {
        PENDING: 0,
        CONFIRMED: 0,
        PREPARING: 0,
        READY: 0,
        DELIVERED: 0,
        CANCELLED: 0,
      } as Record<OrderStatus, number>
      for (const group of statusGroups) {
        statusCounts[group.status] = group._count._all
      }

      const itemCounter = new Map<string, { name: string; emoji: string; count: number }>()
      for (const order of todayOrders) {
        for (const item of order.items) {
          const key = item.name
          const current = itemCounter.get(key) ?? { name: item.name, emoji: item.emoji, count: 0 }
          current.count += item.quantity
          itemCounter.set(key, current)
        }
      }
      const popularItems = [...itemCounter.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))
      for (const order of todayOrders) {
        hourly[order.createdAt.getHours()].count += 1
      }

      const dayMap = new Map<string, { revenue: number; orders: number }>()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        dayMap.set(key, { revenue: 0, orders: 0 })
      }
      for (const order of last7) {
        const key = order.createdAt.toISOString().slice(0, 10)
        const entry = dayMap.get(key)
        if (entry) {
          entry.revenue += order.total
          entry.orders += 1
        }
      }
      const revenueLast7Days = [...dayMap.entries()].map(([date, v]) => ({
        date,
        revenue: v.revenue,
        orders: v.orders,
      }))

      return {
        ordersToday,
        revenueToday,
        avgOrderValue,
        pendingCount,
        statusCounts,
        popularItems,
        hourlyOrders: hourly,
        revenueLast7Days,
      }
    },
  )
}
