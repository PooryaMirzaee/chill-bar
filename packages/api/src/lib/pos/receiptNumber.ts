import type { Prisma } from '@prisma/client'
import { prisma } from '../../prisma.js'

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  shiftId?: string | null,
): Promise<number> {
  const where = shiftId ? { shiftId } : {}
  const last = await tx.order.findFirst({
    where: { ...where, receiptNumber: { not: null } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  })
  return (last?.receiptNumber ?? 0) + 1
}
