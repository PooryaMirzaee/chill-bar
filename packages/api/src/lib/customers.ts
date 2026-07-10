import type { Customer, Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import type { AdminCustomerDetail, AdminCustomerRow, CustomerPreferences, CustomerProfile, LoyaltyLedgerEntry } from '@chill-bar/shared'
import { prisma } from '../prisma.js'

export function serializeCustomer(
  customer: Customer,
  orderCount = 0,
): CustomerProfile {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    isRegistered: customer.isRegistered,
    preferences: (customer.preferences as CustomerPreferences) ?? {},
    orderCount,
    createdAt: customer.createdAt.toISOString(),
  }
}

export function mergePreferences(
  current: CustomerPreferences,
  patch: Partial<CustomerPreferences>,
): CustomerPreferences {
  const next: CustomerPreferences = { ...current }

  if (patch.tasteProfile) {
    const localTs = patch.tasteProfile.updatedAt ?? 0
    const remoteTs = current.tasteProfile?.updatedAt ?? 0
    next.tasteProfile =
      localTs >= remoteTs
        ? patch.tasteProfile
        : {
            ...current.tasteProfile,
            ...patch.tasteProfile,
            updatedAt: Math.max(localTs, remoteTs),
          }
  }

  if (patch.iceCreamBuild) {
    next.iceCreamBuild = { ...current.iceCreamBuild, ...patch.iceCreamBuild }
  }

  if (patch.favoriteMood !== undefined) next.favoriteMood = patch.favoriteMood

  return next
}

export function signCustomerToken(app: FastifyInstance, customer: Customer) {
  return app.jwt.sign(
    {
      sub: customer.id,
      role: 'CUSTOMER' as const,
      name: customer.name,
      phone: customer.phone,
      isGuest: !customer.isRegistered,
    },
    { expiresIn: '365d' },
  )
}

export async function customerOrderCount(customerId: string, prisma: {
  order: { count: (args: { where: { customerId: string } }) => Promise<number> }
}) {
  return prisma.order.count({ where: { customerId } })
}

export function preferencesToJson(prefs: CustomerPreferences): Prisma.InputJsonValue {
  return prefs as Prisma.InputJsonValue
}

export async function buildAdminCustomerRow(
  customer: Customer,
  stats?: { orderCount: number; totalSpent: number; lastOrderAt: Date | null },
): Promise<AdminCustomerRow> {
  let orderCount = stats?.orderCount
  let totalSpent = stats?.totalSpent
  let lastOrderAt = stats?.lastOrderAt

  if (orderCount === undefined) {
    const agg = await prisma.order.aggregate({
      where: { customerId: customer.id, paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
      _count: true,
      _sum: { total: true },
      _max: { createdAt: true },
    })
    orderCount = agg._count
    totalSpent = agg._sum.total ?? 0
    lastOrderAt = agg._max.createdAt
  }

  return {
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    notes: customer.notes,
    isRegistered: customer.isRegistered,
    chillPoints: customer.chillPoints,
    orderCount: orderCount ?? 0,
    totalSpent: totalSpent ?? 0,
    lastOrderAt: lastOrderAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
  }
}

export async function buildAdminCustomerDetail(customer: Customer): Promise<AdminCustomerDetail> {
  const row = await buildAdminCustomerRow(customer)
  const [orders, loyaltyLedger] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.loyaltyTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const { serializeOrder } = await import('./serializers.js')

  return {
    ...row,
    preferences: (customer.preferences as CustomerPreferences) ?? {},
    orders: orders.map(serializeOrder),
    loyaltyLedger: loyaltyLedger.map((entry): LoyaltyLedgerEntry => ({
      id: entry.id,
      type: entry.type,
      points: entry.points,
      orderId: entry.orderId,
      meta: (entry.meta as Record<string, unknown>) ?? {},
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}
