import type { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'

export type CustomerLinkTx = Prisma.TransactionClient | typeof prisma

export function normalizeIranPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const digits = raw.replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return digits
  if (digits.length === 12 && digits.startsWith('989')) return `0${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith('9')) return `0${digits}`
  return null
}

export async function ensureCustomerForOrder(
  tx: CustomerLinkTx,
  input: { phone?: string | null; name?: string | null; customerId?: string | null },
): Promise<{ customerId: string | null; customerPhone: string | null }> {
  const phone = normalizeIranPhone(input.phone)
  const name = input.name?.trim() || null

  if (input.customerId) {
    const existing = await tx.customer.findUnique({ where: { id: input.customerId } })
    if (existing) {
      const updates: { phone?: string; name?: string } = {}
      if (phone && !existing.phone) updates.phone = phone
      if (name && !existing.name) updates.name = name
      if (Object.keys(updates).length > 0) {
        await tx.customer.update({ where: { id: existing.id }, data: updates })
      }
      return { customerId: existing.id, customerPhone: phone ?? existing.phone }
    }
  }

  if (!phone) {
    return { customerId: input.customerId ?? null, customerPhone: null }
  }

  let customer = await tx.customer.findUnique({ where: { phone } })
  if (!customer) {
    customer = await tx.customer.create({
      data: { phone, name, isRegistered: false },
    })
  } else if (name && !customer.name) {
    customer = await tx.customer.update({
      where: { id: customer.id },
      data: { name },
    })
  }

  return { customerId: customer.id, customerPhone: phone }
}
