import type { Order as PrismaOrder, OrderItem as PrismaOrderItem } from '@prisma/client'
import type { Order } from '@chill-bar/shared'

type OrderWithItems = PrismaOrder & { items: PrismaOrderItem[] }

export function serializeOrder(order: OrderWithItems): Order {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    channel: order.channel,
    customerName: order.customerName,
    note: order.note,
    total: order.total,
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

export function generateOrderCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `CB-${code}`
}
