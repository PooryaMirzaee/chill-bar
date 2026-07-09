import type { ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PosSettings, StoreSettings } from '@chill-bar/shared'
import { ORDER_CHANNEL_LABEL, PAYMENT_METHOD_LABEL } from '@chill-bar/shared'
import type { ThermalReceiptProps } from '../components/receipt/ThermalReceipt'
import { ThermalReceipt } from '../components/receipt/ThermalReceipt'

/** Gap between separate print jobs so thermal cutter can cut each receipt. */
const PRINT_GAP_MS = 1500

function waitForPrintDialog(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.removeEventListener('afterprint', done)
      media.removeEventListener('change', onMediaChange)
      resolve()
    }

    const onMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) done()
    }

    window.addEventListener('afterprint', done)
    const media = window.matchMedia('print')
    media.addEventListener('change', onMediaChange)
    window.setTimeout(done, 120_000)
  })
}

function removePrintPortal() {
  document.getElementById('receipt-print-portal')?.remove()
}

function renderAndPrint(node: ReactNode, openDialog: boolean): Promise<void> {
  return new Promise((resolve) => {
    removePrintPortal()

    const portal = document.createElement('div')
    portal.id = 'receipt-print-portal'
    document.body.appendChild(portal)

    let root: Root | null = createRoot(portal)
    root.render(node)

    const cleanup = () => {
      root?.unmount()
      root = null
      removePrintPortal()
      resolve()
    }

    if (!openDialog) {
      cleanup()
      return
    }

    requestAnimationFrame(() => {
      window.setTimeout(async () => {
        window.print()
        await waitForPrintDialog()
        await new Promise((r) => window.setTimeout(r, PRINT_GAP_MS))
        cleanup()
      }, 220)
    })
  })
}

export function printThermalReceipt(
  props: ThermalReceiptProps,
  options?: { openDialog?: boolean },
): Promise<void> {
  return renderAndPrint(<ThermalReceipt {...props} />, options?.openDialog !== false)
}

/** Each copy is a separate print job so thermal printers cut between receipts. */
export async function printThermalReceiptBatch(
  copies: ThermalReceiptProps[],
  options?: { openDialog?: boolean },
): Promise<void> {
  if (copies.length === 0) return
  for (const copy of copies) {
    await printThermalReceipt(copy, options)
  }
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
  options?: { omitPricesInExtras?: boolean },
): ThermalReceiptProps['items'] {
  return items.map((item) => {
    const extras: string[] = []
    const config = item.customConfig
    if (config?.modifiers && Array.isArray(config.modifiers)) {
      for (const mod of config.modifiers as Array<{ optionName?: string; price?: number }>) {
        if (mod.optionName) {
          extras.push(
            options?.omitPricesInExtras || !mod.price
              ? `+ ${mod.optionName}`
              : `+ ${mod.optionName} (${new Intl.NumberFormat('fa-IR').format(mod.price)})`,
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
  paymentStatus?: 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
  paidAmount?: number
  changeAmount?: number
}

function buildBaseReceiptProps(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null },
): Omit<ThermalReceiptProps, 'copyType' | 'templateId'> {
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
    paymentMethodLabel:
      order.paymentStatus === 'UNPAID' || !order.paymentMethod
        ? 'پرداخت نشده — مراجعه به صندوق'
        : PAYMENT_METHOD_LABEL[order.paymentMethod],
    paidAmount: order.paidAmount,
    changeAmount: order.changeAmount,
    showQr: posSettings.showQrOnReceipt,
  }
}

export function buildThermalReceiptProps(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null; copyType?: 'customer' | 'kitchen' },
): ThermalReceiptProps {
  const copyType = options?.copyType ?? 'customer'
  const base = buildBaseReceiptProps(order, store, posSettings, options)
  return {
    ...base,
    copyType,
    templateId:
      copyType === 'kitchen'
        ? posSettings.kitchenReceiptTemplateId
        : posSettings.receiptTemplateId,
    items: buildReceiptItemsFromOrder(order.items, {
      omitPricesInExtras: copyType === 'kitchen',
    }),
    showPrices: copyType === 'customer',
  }
}

export function buildOrderReceiptCopies(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null },
): ThermalReceiptProps[] {
  const copies: ThermalReceiptProps[] = []
  if (posSettings.printKitchenReceipt) {
    copies.push(
      buildThermalReceiptProps(order, store, posSettings, { ...options, copyType: 'kitchen' }),
    )
  }
  if (posSettings.printCustomerReceipt) {
    copies.push(
      buildThermalReceiptProps(order, store, posSettings, { ...options, copyType: 'customer' }),
    )
  }
  return copies
}

export function printOrderReceipts(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: {
    cashierName?: string | null
    forceDialog?: boolean
    copyType?: 'customer' | 'kitchen' | 'both'
  },
): Promise<void> {
  const copyType = options?.copyType ?? 'both'
  let copies = buildOrderReceiptCopies(order, store, posSettings, options)
  if (copyType !== 'both') {
    copies = copies.filter((copy) => copy.copyType === copyType)
  }
  if (copies.length === 0) return Promise.resolve()

  const openDialog = options?.forceDialog === true || posSettings.receiptPrintMode === 'dialog'
  if (!openDialog) return Promise.resolve()

  return printThermalReceiptBatch(copies, { openDialog: true })
}

export function printKitchenReceipt(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null; forceDialog?: boolean },
) {
  return printOrderReceipts(order, store, posSettings, { ...options, copyType: 'kitchen' })
}

export function printCustomerReceipt(
  order: ReceiptOrderLike,
  store: StoreSettings,
  posSettings: PosSettings,
  options?: { cashierName?: string | null; forceDialog?: boolean },
) {
  return printOrderReceipts(order, store, posSettings, { ...options, copyType: 'customer' })
}

export function shouldAutoPrint(posSettings: PosSettings): boolean {
  return (
    posSettings.receiptPrintMode === 'dialog' &&
    (posSettings.printCustomerReceipt || posSettings.printKitchenReceipt)
  )
}

export function buildSampleReceiptProps(
  store: Pick<StoreSettings, 'storeName'> & Partial<StoreSettings>,
  posSettings: PosSettings,
  copyType: 'customer' | 'kitchen' = 'customer',
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
    templateId:
      copyType === 'kitchen'
        ? posSettings.kitchenReceiptTemplateId
        : posSettings.receiptTemplateId,
    copyType,
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
    showPrices: copyType === 'customer',
  }
}

export function printSampleReceipt(
  store: Pick<StoreSettings, 'storeName'> & Partial<StoreSettings>,
  posSettings: PosSettings,
) {
  const copies = buildOrderReceiptCopies(
    {
      code: 'CB-PREVIEW',
      receiptNumber: 42,
      createdAt: new Date().toISOString(),
      createdByName: 'صندوقدار',
      customerName: 'مشتری نمونه',
      customerPhone: '09123456789',
      channel: 'POS',
      items: [
        {
          name: 'شیک وانیل',
          emoji: '🥤',
          quantity: 2,
          unitPrice: 85000,
          lineTotal: 170000,
          customConfig: { modifiers: [{ optionName: 'خامه' }] },
        },
        {
          name: 'بستنی کاستومی',
          emoji: '🍦',
          quantity: 1,
          unitPrice: 120000,
          lineTotal: 120000,
          customConfig: { iceCream: { base: 'وانیل', coating: 'شکلات', filling: 'فندق' } },
        },
      ],
      subtotal: 290000,
      discountAmount: 10000,
      total: 280000,
      paymentMethod: 'CASH',
      paidAmount: 300000,
      changeAmount: 20000,
    },
    store as StoreSettings,
    posSettings,
  )
  printThermalReceiptBatch(copies.length ? copies : [buildSampleReceiptProps(store, posSettings)])
}
