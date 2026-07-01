import { createRoot } from 'react-dom/client'
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
    }, 120)
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
