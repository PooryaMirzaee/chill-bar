import type { Prisma } from '@prisma/client'

/** First receipt number for each newly opened cash shift. */
export const RECEIPT_NUMBER_SHIFT_START = 500

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  shiftId?: string | null,
): Promise<number> {
  // Per-shift sequence: after close/open, numbering restarts at 500.
  const where = shiftId ? { shiftId } : {}
  const last = await tx.order.findFirst({
    where: { ...where, receiptNumber: { not: null } },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true },
  })
  if (last?.receiptNumber == null) return RECEIPT_NUMBER_SHIFT_START
  return last.receiptNumber + 1
}
