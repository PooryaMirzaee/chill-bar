import type {
  Order as PrismaOrder,
  OrderItem as PrismaOrderItem,
  OrderPayment,
  OrderAdjustment,
  User,
  CashShift,
} from '@prisma/client'
import type { Order, PosOrder } from '@chill-bar/shared'

type OrderWithRelations = PrismaOrder & {
  items: PrismaOrderItem[]
  payments?: OrderPayment[]
  adjustments?: (OrderAdjustment & { createdBy?: Pick<User, 'name'> | null })[]
  createdBy?: Pick<User, 'name'> | null
  shift?: Pick<CashShift, 'id' | 'openedAt'> | null
}

export function serializeOrder(order: OrderWithRelations): Order {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    channel: order.channel,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    note: order.note,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    discountNote: order.discountNote,
    total: order.total,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    receiptNumber: order.receiptNumber,
    createdByUserId: order.createdByUserId,
    createdByName: order.createdBy?.name ?? null,
    shiftId: order.shiftId,
    paidAt: order.paidAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      emoji: item.emoji,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      customConfig: (item.customConfig as Record<string, unknown> | null) ?? null,
    })),
  }
}

export function serializePosOrder(order: OrderWithRelations): PosOrder {
  const base = serializeOrder(order)
  return {
    ...base,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    discountNote: order.discountNote,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    payments: order.payments?.map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount,
      createdAt: p.createdAt.toISOString(),
    })),
    adjustments: order.adjustments?.map((a) => ({
      id: a.id,
      type: a.type,
      amount: a.amount,
      itemId: a.itemId,
      reason: a.reason,
      createdByUserId: a.createdByUserId,
      createdByName: a.createdBy?.name ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  }
}

export function generateOrderCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `CB-${code}`
}
