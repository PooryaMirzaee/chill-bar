import { createRoot } from 'react-dom/client'
import type { PosSettings, StoreSettings } from '@chill-bar/shared'
import { ORDER_CHANNEL_LABEL, PAYMENT_METHOD_LABEL } from '@chill-bar/shared'
import type { ThermalReceiptProps } from '../components/receipt/ThermalReceipt'
import { ThermalReceipt } from '../components/receipt/ThermalReceipt'

export function printThermalReceipt(props: ThermalReceiptProps) {
  let portal = document.getElementById('receipt-print-portal')
  if (!portal) {
    portal = document.createElement('div')
    portal.id = 'receipt-print-portal'
    document.body.appendChild(portal)
  }

  const root = createRoot(portal)
  root.render(<ThermalReceipt {...props} />)

  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        root.unmount()
      }, 500)
    }, 150)
  })
}

export function buildReceiptItemsFromOrder(
  items: Array<{
    name: string
    emoji: string
    quantity: number
    unitPrice: number
    lineTotal: number
    customConfig?: Record<string, unknown> | null
  }>,
): ThermalReceiptProps['items'] {
  return items.map((item) => {
    const extras: string[] = []
    const config = item.customConfig
    if (config?.modifiers && Array.isArray(config.modifiers)) {
      for (const mod of config.modifiers as Array<{ optionName?: string; price?: number }>) {
        if (mod.optionName) {
          extras.push(
            `+ ${mod.optionName}${mod.price ? ` (${new Intl.NumberFormat('fa-IR').format(mod.price)})` : ''}`,
          )
        }
      }
    }
    if (config?.iceCream) {
      const ice = config.iceCream as { base?: string; coating?: string; filling?: string }
      const parts = [ice.base, ice.coating, ice.filling].filter(Boolean)
      if (parts.length) extras.push(parts.join(' / '))
    }
    return {
      name: item.name,
      emoji: item.emoji,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      extras: extras.length ? extras : undefined,
    }
  })
}

type ReceiptOrderLike = {
  code: string
  receiptNumber?: number | null
  createdAt: string
  createdByName?: string | null
  customerName?: string | null
  customerPhone?: string | null
  note?: string | null
  channel: keyof typeof ORDER_CHANNEL_LABEL
  items: Array<{
    name: string
    emoji: string
    quantity: number
    unitPrice: number
    lineTotal: number
    customConfig?: Record<string, unknown> | null
  }>
  subtotal?: number
  discountAmount?: number
  total: number
  paymentMethod?: keyof typeof PAYMENT_METHOD_LABEL | null
  paidAmount?: number
  changeAmount?: number
}

export function buildThermalReceiptProps(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null },
): ThermalReceiptProps {
  return {
    storeName: store.storeName,
    storeSubtitle: store.storeSubtitle,
    address: store.address,
    phone: store.phone,
    openingHours: store.openingHours,
    logoUrl: store.appearance.logoUrl,
    showLogo: posSettings.showLogoOnReceipt,
    headerText: posSettings.receiptHeaderText,
    footerText: posSettings.receiptFooterText,
    widthMm: posSettings.receiptWidthMm,
    templateId: posSettings.receiptTemplateId,
    highContrast: posSettings.receiptHighContrast,
    orderCode: order.code,
    receiptNumber: order.receiptNumber,
    createdAt: order.createdAt,
    cashierName: order.createdByName ?? options?.cashierName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    note: order.note,
    channelLabel: ORDER_CHANNEL_LABEL[order.channel],
    items: buildReceiptItemsFromOrder(order.items),
    subtotal: order.subtotal ?? order.total,
    discountAmount: order.discountAmount ?? 0,
    total: order.total,
    paymentMethodLabel: PAYMENT_METHOD_LABEL[order.paymentMethod ?? 'CASH'],
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    showQr: posSettings.showQrOnReceipt,
  }
}

export function buildSampleReceiptProps(
  store: Pick<StoreSettings, 'storeName'> & Partial<StoreSettings>,
  posSettings: PosSettings,
): ThermalReceiptProps {
  return {
    storeName: store.storeName || 'Chill Bar',
    storeSubtitle: store.storeSubtitle,
    address: store.address,
    phone: store.phone,
    openingHours: store.openingHours,
    logoUrl: store.appearance?.logoUrl,
    showLogo: posSettings.showLogoOnReceipt,
    headerText: posSettings.receiptHeaderText || 'نمونه چاپ رسید',
    footerText: posSettings.receiptFooterText,
    widthMm: posSettings.receiptWidthMm,
    templateId: posSettings.receiptTemplateId,
    highContrast: posSettings.receiptHighContrast,
    orderCode: 'CB-PREVIEW',
    receiptNumber: 42,
    createdAt: new Date().toISOString(),
    cashierName: 'صندوقدار',
    customerName: 'مشتری نمونه',
    customerPhone: '09123456789',
    channelLabel: 'صندوق',
    items: [
      {
        name: 'شیک وانیل',
        emoji: '🥤',
        quantity: 2,
        unitPrice: 85000,
        lineTotal: 170000,
        extras: ['+ خامه'],
      },
      {
        name: 'بستنی کاستومی',
        emoji: '🍦',
        quantity: 1,
        unitPrice: 120000,
        lineTotal: 120000,
        extras: ['وانیل / شکلات / فندق'],
      },
    ],
    subtotal: 290000,
    discountAmount: 10000,
    total: 280000,
    paymentMethodLabel: 'نقد',
    paidAmount: 300000,
    changeAmount: 20000,
    showQr: posSettings.showQrOnReceipt,
  }
}

export function printSampleReceipt(
  store: Pick<StoreSettings, 'storeName'> & Partial<StoreSettings>,
  posSettings: PosSettings,
) {
  printThermalReceipt(buildSampleReceiptProps(store, posSettings))
}
