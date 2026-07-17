import type { Prisma } from '@prisma/client'

/** First receipt number for each newly opened cash shift. */
export const RECEIPT_NUMBER_SHIFT_START = 500

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  shiftId?: string | null,
): Promise<number> {
  // Per-shift sequence: after close/open, numbering restarts at 500.
  // When no shiftId, only consider orders that also have no shift (don't continue from other shifts).
  const where = shiftId ? { shiftId } : { shiftId: null }
  const last = await tx.order.findFirst({
    where: { ...where, receiptNumber: { not: null } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  })
  if (last?.receiptNumber == null) return RECEIPT_NUMBER_SHIFT_START
  return last.receiptNumber + 1
}
