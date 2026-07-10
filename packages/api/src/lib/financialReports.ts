import type {
  FinancialDailyReport,
  FinancialOrderRow,
  FinancialOrderSortField,
  FinancialOrdersReport,
  FinancialSortDirection,
  FinancialSummaryReport,
} from '@chill-bar/shared'
import type { Order, OrderAdjustment, OrderItem, OrderPayment } from '@prisma/client'

type OrderWithRelations = Order & {
  payments: OrderPayment[]
  adjustments: OrderAdjustment[]
  items?: OrderItem[]
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

function isPaidOrder(order: OrderWithRelations): boolean {
  return order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED'
}

function sumRefunds(order: OrderWithRelations): number {
  return order.adjustments
    .filter((a) => a.type === 'REFUND' || a.type === 'VOID_ITEM')
    .reduce((sum, a) => sum + a.amount, 0)
}

function accumulatePaymentTotals(orders: OrderWithRelations[]) {
  let cashTotal = 0
  let cardTotal = 0
  let mixedTotal = 0

  for (const order of orders.filter(isPaidOrder)) {
    if (order.paymentMethod === 'MIXED') {
      mixedTotal += order.total
      for (const payment of order.payments) {
        if (payment.method === 'CASH') cashTotal += payment.amount
        if (payment.method === 'CARD') cardTotal += payment.amount
      }
    } else if (order.paymentMethod === 'CASH') {
      cashTotal += order.total
    } else if (order.paymentMethod === 'CARD') {
      cardTotal += order.total
    }
  }

  return { cashTotal, cardTotal, mixedTotal }
}

export function mapFinancialOrderRow(order: OrderWithRelations): FinancialOrderRow {
  return {
    id: order.id,
    code: order.code,
    receiptNumber: order.receiptNumber,
    createdAt: order.createdAt.toISOString(),
    channel: order.channel,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerId: order.customerId,
    total: order.total,
    discountAmount: order.discountAmount,
    itemCount: order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
  }
}

export function sortFinancialOrders(
  orders: FinancialOrderRow[],
  sortBy: FinancialOrderSortField,
  sortDir: FinancialSortDirection,
): FinancialOrderRow[] {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...orders].sort((a, b) => {
    switch (sortBy) {
      case 'code':
        return a.code.localeCompare(b.code, 'en', { numeric: true }) * dir
      case 'total':
        return (a.total - b.total) * dir
      case 'receiptNumber':
        return ((a.receiptNumber ?? 0) - (b.receiptNumber ?? 0)) * dir
      case 'channel':
        return a.channel.localeCompare(b.channel) * dir
      case 'createdAt':
      default:
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    }
  })
}

export function buildFinancialOrdersReport(
  date: string,
  orders: OrderWithRelations[],
  sortBy: FinancialOrderSortField,
  sortDir: FinancialSortDirection,
): FinancialOrdersReport {
  const summary = buildFinancialDailyReport(date, orders)
  const rows = sortFinancialOrders(
    orders
      .filter((order) => order.status !== 'CANCELLED')
      .map(mapFinancialOrderRow),
    sortBy,
    sortDir,
  )
  return { date, summary, orders: rows }
}

export function buildFinancialDailyReport(
  date: string,
  orders: OrderWithRelations[],
): FinancialDailyReport {
  const activeOrders = orders.filter((o) => o.status !== 'CANCELLED')
  const paidOrders = activeOrders.filter(isPaidOrder)
  const grossRevenue = paidOrders.reduce((sum, o) => sum + o.total + o.discountAmount, 0)
  const totalDiscount = paidOrders.reduce((sum, o) => sum + o.discountAmount, 0)
  const netRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0)
  const posOrders = paidOrders.filter((o) => o.channel === 'POS')
  const onlineOrders = paidOrders.filter((o) => o.channel !== 'POS')
  const { cashTotal, cardTotal, mixedTotal } = accumulatePaymentTotals(activeOrders)

  return {
    date,
    orderCount: paidOrders.length,
    grossRevenue,
    totalDiscount,
    netRevenue,
    avgOrderValue: paidOrders.length ? Math.round(netRevenue / paidOrders.length) : 0,
    posOrders: posOrders.length,
    posRevenue: posOrders.reduce((sum, o) => sum + o.total, 0),
    onlineOrders: onlineOrders.length,
    onlineRevenue: onlineOrders.reduce((sum, o) => sum + o.total, 0),
    cashTotal,
    cardTotal,
    mixedTotal,
    cancelledCount: orders.filter((o) => o.status === 'CANCELLED').length,
    refundedTotal: activeOrders.reduce((sum, o) => sum + sumRefunds(o), 0),
  }
}

export function buildFinancialSummaryReport(
  from: Date,
  to: Date,
  orders: OrderWithRelations[],
  sortBy: FinancialOrderSortField = 'createdAt',
  sortDir: FinancialSortDirection = 'desc',
): FinancialSummaryReport {
  const fromIso = from.toISOString().slice(0, 10)
  const toIso = to.toISOString().slice(0, 10)
  const daily = buildFinancialDailyReport(fromIso, orders)

  const dayMap = new Map<string, { orderCount: number; netRevenue: number; posRevenue: number; onlineRevenue: number }>()
  const cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor <= end) {
    dayMap.set(cursor.toISOString().slice(0, 10), {
      orderCount: 0,
      netRevenue: 0,
      posRevenue: 0,
      onlineRevenue: 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  for (const order of orders.filter((o) => o.status !== 'CANCELLED' && isPaidOrder(o))) {
    const key = order.createdAt.toISOString().slice(0, 10)
    const entry = dayMap.get(key)
    if (!entry) continue
    entry.orderCount += 1
    entry.netRevenue += order.total
    if (order.channel === 'POS') entry.posRevenue += order.total
    else entry.onlineRevenue += order.total
  }

  return {
    from: fromIso,
    to: toIso,
    orderCount: daily.orderCount,
    grossRevenue: daily.grossRevenue,
    totalDiscount: daily.totalDiscount,
    netRevenue: daily.netRevenue,
    avgOrderValue: daily.avgOrderValue,
    posOrders: daily.posOrders,
    posRevenue: daily.posRevenue,
    onlineOrders: daily.onlineOrders,
    onlineRevenue: daily.onlineRevenue,
    cashTotal: daily.cashTotal,
    cardTotal: daily.cardTotal,
    mixedTotal: daily.mixedTotal,
    cancelledCount: daily.cancelledCount,
    refundedTotal: daily.refundedTotal,
    dailyBreakdown: [...dayMap.entries()].map(([date, values]) => ({ date, ...values })),
    orders: sortFinancialOrders(
      orders
        .filter((order) => order.status !== 'CANCELLED')
        .map(mapFinancialOrderRow),
      sortBy,
      sortDir,
    ),
  }
}

export function parseReportDate(value: string | undefined, fallback = new Date()): Date {
  if (!value) return fallback
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback
  return parsed
}

export { startOfDay, endOfDay }
