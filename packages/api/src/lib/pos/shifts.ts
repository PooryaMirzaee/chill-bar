import type { CashShift, User } from '@prisma/client'
import type { PosShift, PosShiftReport } from '@chill-bar/shared'

type ShiftWithUsers = CashShift & {
  openedBy?: Pick<User, 'name'> | null
  closedBy?: Pick<User, 'name'> | null
}

export function serializeShift(shift: ShiftWithUsers): PosShift {
  return {
    id: shift.id,
    status: shift.status,
    openingCash: shift.openingCash,
    closingCash: shift.closingCash,
    expectedCash: shift.expectedCash,
    difference: shift.difference,
    notes: shift.notes,
    openedByUserId: shift.openedByUserId,
    openedByName: shift.openedBy?.name ?? null,
    closedByUserId: shift.closedByUserId,
    closedByName: shift.closedBy?.name ?? null,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() ?? null,
  }
}

export function buildShiftReport(
  shift: PosShift,
  orders: Array<{
    total: number
    discountAmount: number
    paymentMethod: string
    paymentStatus: string
    payments: Array<{ method: string; amount: number }>
    adjustments: Array<{ type: string; amount: number }>
  }>,
): PosShiftReport {
  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID' || o.paymentStatus === 'PARTIALLY_REFUNDED')
  const grossSales = paidOrders.reduce((s, o) => s + o.total + o.discountAmount, 0)
  const totalDiscount = paidOrders.reduce((s, o) => s + o.discountAmount, 0)
  const netSales = paidOrders.reduce((s, o) => s + o.total, 0)
  const totalRefunds = orders.reduce(
    (s, o) => s + o.adjustments.filter((a) => a.type === 'REFUND' || a.type === 'VOID_ITEM').reduce((x, a) => x + a.amount, 0),
    0,
  )

  let cashTotal = 0
  let cardTotal = 0
  let mixedTotal = 0
  for (const order of paidOrders) {
    if (order.paymentMethod === 'MIXED') {
      mixedTotal += order.total
      for (const p of order.payments) {
        if (p.method === 'CASH') cashTotal += p.amount
        if (p.method === 'CARD') cardTotal += p.amount
      }
    } else if (order.paymentMethod === 'CASH') {
      cashTotal += order.total
    } else if (order.paymentMethod === 'CARD') {
      cardTotal += order.total
    }
  }

  const expectedCashInDrawer = shift.openingCash + cashTotal - totalRefunds

  return {
    shift,
    orderCount: paidOrders.length,
    grossSales,
    netSales,
    totalDiscount,
    totalRefunds,
    cashTotal,
    cardTotal,
    mixedTotal,
    expectedCashInDrawer,
  }
}
