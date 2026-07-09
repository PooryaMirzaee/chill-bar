import type { Order, OrderItemPayload, PaymentMethod, PaymentStatus } from './types'
import type { ReceiptTemplateId } from './receiptTemplates'

export type { PaymentMethod, PaymentStatus }

export type AdjustmentType = 'DISCOUNT' | 'REFUND' | 'VOID_ITEM'

export type ShiftStatus = 'OPEN' | 'CLOSED'

export type ReceiptPrintMode = 'dialog' | 'silent' | 'off'

export interface PosSettings {
  enabled: boolean
  requireShiftOpen: boolean
  receiptWidthMm: 58 | 80
  receiptTemplateId: ReceiptTemplateId
  kitchenReceiptTemplateId: ReceiptTemplateId
  receiptHighContrast: boolean
  receiptPrintMode: ReceiptPrintMode
  printCustomerReceipt: boolean
  printKitchenReceipt: boolean
  receiptHeaderText: string
  receiptFooterText: string
  showLogoOnReceipt: boolean
  showQrOnReceipt: boolean
  showShiftOnReceipt: boolean
  autoPrintOnSale: boolean
  autoPrintOnOnlineSettle: boolean
  defaultPaymentMethod: PaymentMethod
  allowMixedPayment: boolean
  allowManualDiscount: boolean
  maxDiscountPercentStaff: number
  maxDiscountPercentManager: number
  allowRefunds: boolean
  requireRefundReason: boolean
  requireManagerForRefund: boolean
  soundOnAddItem: boolean
  addItemSoundVolume: number
  shiftRoles: Array<'SUPER_ADMIN' | 'MANAGER' | 'STAFF'>
  discountRoles: Array<'SUPER_ADMIN' | 'MANAGER' | 'STAFF'>
}

export interface OrderPaymentLine {
  id: string
  method: PaymentMethod
  amount: number
  createdAt: string
}

export interface OrderAdjustmentLine {
  id: string
  type: AdjustmentType
  amount: number
  itemId?: string | null
  reason?: string | null
  createdByUserId: string
  createdByName?: string | null
  createdAt: string
}

export interface PosShift {
  id: string
  status: ShiftStatus
  openingCash: number
  closingCash?: number | null
  expectedCash?: number | null
  difference?: number | null
  notes?: string | null
  openedByUserId: string
  openedByName?: string | null
  closedByUserId?: string | null
  closedByName?: string | null
  openedAt: string
  closedAt?: string | null
}

export interface PosShiftReport {
  shift: PosShift
  orderCount: number
  grossSales: number
  netSales: number
  totalDiscount: number
  totalRefunds: number
  cashTotal: number
  cardTotal: number
  mixedTotal: number
  expectedCashInDrawer: number
}

export interface PosCheckoutPayment {
  method: PaymentMethod
  cashReceived?: number
  payments?: Array<{ method: 'CASH' | 'CARD'; amount: number }>
}

export interface PosSalePayload {
  items: OrderItemPayload[]
  customerName?: string | null
  customerPhone?: string | null
  note?: string | null
  discountAmount?: number
  discountNote?: string | null
  payment: PosCheckoutPayment
}

export interface PosOrder extends Order {
  subtotal: number
  discountAmount: number
  discountNote?: string | null
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  paidAmount: number
  changeAmount: number
  receiptNumber?: number | null
  createdByUserId?: string | null
  createdByName?: string | null
  shiftId?: string | null
  paidAt?: string | null
  completedAt?: string | null
  payments?: OrderPaymentLine[]
  adjustments?: OrderAdjustmentLine[]
}

export interface PosMenuCategory {
  id: string
  name: string
  emoji: string
  accentColor: string
  isIceCreamHub: boolean
}

export interface PosMenuItem {
  id: string
  name: string
  price: number
  emoji: string
  categoryId: string
  modifiers: unknown[]
  tags?: Record<string, unknown>
  isAvailable: boolean
}

export interface PosMenuData {
  categories: PosMenuCategory[]
  items: PosMenuItem[]
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'نقد',
  CARD: 'کارت',
  MIXED: 'ترکیبی',
  UNPAID: 'پرداخت نشده',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: 'پرداخت نشده',
  PAID: 'پرداخت شده',
  PARTIALLY_REFUNDED: 'برگشت جزئی',
  REFUNDED: 'برگشت کامل',
}

export const ORDER_CHANNEL_LABEL: Record<Order['channel'], string> = {
  MOBILE: 'موبایل',
  KIOSK: 'کیوسک',
  POS: 'صندوق',
}
