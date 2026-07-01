import type { PaymentMethod, PosCheckoutPayment, UserRole } from '@chill-bar/shared'
import type { OrderItemPayload } from '@chill-bar/shared'
import type { PosSettings } from '@chill-bar/shared'

export function calcSubtotal(items: OrderItemPayload[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

export function calcOrderTotal(subtotal: number, discountAmount: number): number {
  return Math.max(0, subtotal - discountAmount)
}

export function validateDiscount(
  subtotal: number,
  discountAmount: number,
  role: UserRole,
  settings: PosSettings,
): string | null {
  if (!settings.allowManualDiscount && discountAmount > 0) {
    return 'تخفیف دستی غیرفعال است'
  }
  if (discountAmount > subtotal) {
    return 'تخفیف بیش از مبلغ سفارش است'
  }
  if (subtotal <= 0 || discountAmount <= 0) return null
  const percent = (discountAmount / subtotal) * 100
  const max =
    role === 'STAFF' ? settings.maxDiscountPercentStaff : settings.maxDiscountPercentManager
  if (percent > max) {
    return `حداکثر تخفیف مجاز برای شما ${max}٪ است`
  }
  return null
}

export interface ResolvedPayment {
  method: PaymentMethod
  paidAmount: number
  changeAmount: number
  lines: Array<{ method: 'CASH' | 'CARD'; amount: number }>
}

export function resolvePayment(
  total: number,
  payment: PosCheckoutPayment,
  settings: PosSettings,
): { ok: true; resolved: ResolvedPayment } | { ok: false; error: string } {
  if (total <= 0) {
    return {
      ok: true,
      resolved: { method: 'CASH', paidAmount: 0, changeAmount: 0, lines: [] },
    }
  }

  if (payment.method === 'CASH') {
    const received = payment.cashReceived ?? total
    if (received < total) {
      return { ok: false, error: 'مبلغ دریافتی کمتر از جمع کل است' }
    }
    return {
      ok: true,
      resolved: {
        method: 'CASH',
        paidAmount: received,
        changeAmount: received - total,
        lines: [{ method: 'CASH', amount: total }],
      },
    }
  }

  if (payment.method === 'CARD') {
    return {
      ok: true,
      resolved: {
        method: 'CARD',
        paidAmount: total,
        changeAmount: 0,
        lines: [{ method: 'CARD', amount: total }],
      },
    }
  }

  if (payment.method === 'MIXED') {
    if (!settings.allowMixedPayment) {
      return { ok: false, error: 'پرداخت ترکیبی غیرفعال است' }
    }
    const lines = payment.payments ?? []
    if (lines.length < 2) {
      return { ok: false, error: 'پرداخت ترکیبی باید حداقل دو بخش داشته باشد' }
    }
    const sum = lines.reduce((s, l) => s + l.amount, 0)
    if (sum !== total) {
      return { ok: false, error: 'جمع پرداخت ترکیبی با مبلغ کل برابر نیست' }
    }
    return {
      ok: true,
      resolved: {
        method: 'MIXED',
        paidAmount: total,
        changeAmount: 0,
        lines,
      },
    }
  }

  return { ok: false, error: 'روش پرداخت نامعتبر است' }
}
