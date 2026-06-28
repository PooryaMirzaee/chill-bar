import type { Order, OrderStatus } from '@chill-bar/shared'

const STORAGE_KEY = 'chill-active-order-v1'

export interface ActiveOrder {
  id: string
  code: string
  status: OrderStatus
  pointsEarned: number
  createdAt: string
}

export function loadActiveOrder(): ActiveOrder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveOrder
  } catch {
    return null
  }
}

export function saveActiveOrder(order: ActiveOrder | null) {
  if (!order) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order))
}

export function orderToActive(order: Order): ActiveOrder {
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    pointsEarned: 0,
    createdAt: order.createdAt,
  }
}

export function isLoungeTerminal(status: OrderStatus): boolean {
  return status === 'READY' || status === 'DELIVERED' || status === 'CANCELLED'
}
