import type { Customer, Prisma } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import type { CustomerPreferences, CustomerProfile } from '@chill-bar/shared'

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
