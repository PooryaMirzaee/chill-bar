import { useCallback, useMemo, useState } from 'react'
import type { MenuModifierGroup, OrderItemPayload, SelectedModifier } from '@chill-bar/shared'
import {
  buildCartLineId,
  buildSelectedModifiers,
  computeUnitPrice,
  parseMenuModifiers,
  type ModifierSelectionState,
} from '@chill-bar/shared'
import type { PosMenuItem } from '@chill-bar/shared'

export interface PosCartLine {
  lineId: string
  menuItemId: string | null
  name: string
  emoji: string
  unitPrice: number
  quantity: number
  selectedModifiers: SelectedModifier[]
  customConfig: Record<string, unknown> | null
}

function toPayload(line: PosCartLine): OrderItemPayload {
  return {
    menuItemId: line.menuItemId,
    name: line.name,
    emoji: line.emoji,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    customConfig: line.customConfig,
  }
}

export function usePosCart() {
  const [lines, setLines] = useState<PosCartLine[]>([])
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountNote, setDiscountNote] = useState('')

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [lines],
  )
  const total = Math.max(0, subtotal - discountAmount)
  const count = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])

  const addItem = useCallback(
    (
      item: PosMenuItem,
      selectedModifiers: SelectedModifier[] = [],
      customConfig: Record<string, unknown> | null = null,
      displayName?: string,
    ) => {
      const unitPrice = computeUnitPrice(item.price, selectedModifiers)
      const lineId =
        customConfig?.iceCream != null
          ? `ice-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          : buildCartLineId(item.id, selectedModifiers)

      setLines((prev) => {
        const existing = prev.find((l) => l.lineId === lineId)
        if (existing && !customConfig?.iceCream) {
          return prev.map((l) =>
            l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l,
          )
        }
        return [
          ...prev,
          {
            lineId,
            menuItemId: item.id,
            name: displayName ?? item.name,
            emoji: item.emoji,
            unitPrice,
            quantity: 1,
            selectedModifiers,
            customConfig:
              selectedModifiers.length > 0 || customConfig
                ? {
                    ...(customConfig ?? {}),
                    modifiers: selectedModifiers.length ? selectedModifiers : undefined,
                  }
                : null,
          },
        ]
      })
    },
    [],
  )

  const addCustomLine = useCallback((line: Omit<PosCartLine, 'lineId'> & { lineId?: string }) => {
    const lineId = line.lineId ?? `custom-${Date.now()}`
    setLines((prev) => [...prev, { ...line, lineId }])
  }, [])

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((prev) => prev.filter((l) => l.lineId !== lineId))
      return
    }
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, quantity } : l)))
  }, [])

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId))
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setCustomerName('')
    setNote('')
    setDiscountAmount(0)
    setDiscountNote('')
  }, [])

  const getPayload = useCallback((): OrderItemPayload[] => lines.map(toPayload), [lines])

  return {
    lines,
    subtotal,
    total,
    count,
    customerName,
    setCustomerName,
    note,
    setNote,
    discountAmount,
    setDiscountAmount,
    discountNote,
    setDiscountNote,
    addItem,
    addCustomLine,
    updateQuantity,
    removeLine,
    clear,
    getPayload,
    parseModifiers: (raw: unknown): MenuModifierGroup[] => parseMenuModifiers(raw),
    buildSelectedModifiers,
    buildSelectionState: (groups: MenuModifierGroup[], selection: ModifierSelectionState) =>
      buildSelectedModifiers(groups, selection),
  }
}

export type PosCartApi = ReturnType<typeof usePosCart>
