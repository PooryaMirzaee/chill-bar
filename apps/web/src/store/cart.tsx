import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import type { CartItem, MenuItem } from '../types'
import type { Order, SelectedModifier } from '@chill-bar/shared'
import {
  buildCartLineId,
  computeUnitPrice,
  validateModifierSelection,
  selectionFromSelectedModifiers,
} from '@chill-bar/shared'
import { apiClient, type OrderItemInput } from '../lib/api'
import { getChannel } from '../lib/kiosk'
import {
  loadPendingReward,
  savePendingReward,
  toPendingReward,
  type PendingScratchReward,
} from './scratchReward'

interface CheckoutInfo {
  customerName?: string
  note?: string
  loyaltyRewardId?: string | null
}

interface CartContextType {
  items: CartItem[]
  pendingReward: PendingScratchReward | null
  addItem: (item: MenuItem) => boolean
  removeItem: (id: string) => void
  updateQuantity: (id: string, qty: number) => void
  updateLineModifiers: (cartLineId: string, selectedModifiers: SelectedModifier[]) => void
  syncMenuMetadata: (menuItems: MenuItem[]) => void
  clearCart: () => void
  clearPendingReward: () => void
  setPendingReward: (item: MenuItem, rewardPrice: number) => void
  total: number
  count: number
  addCombo: (items: MenuItem[]) => void
  submitOrder: (info: CheckoutInfo) => Promise<Order>
  lastOrder: Order | null
  clearLastOrder: () => void
  loyaltyRewardId: string | null
  setLoyaltyRewardId: (id: string | null) => void
}

const CartContext = createContext<CartContextType | null>(null)
const STORAGE_KEY = 'chill-cart-v2'

function createCartLineId(item: MenuItem, selectedModifiers: SelectedModifier[]): string {
  if (item.cartLineId) return item.cartLineId
  if (selectedModifiers.length > 0) return buildCartLineId(item.id, selectedModifiers)
  if ((item.modifiers?.length ?? 0) > 0) {
    return `${item.id}::cfg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }
  return item.id
}

function normalizeCartItem(item: CartItem): CartItem {
  const selectedModifiers = item.selectedModifiers ?? []
  return {
    ...item,
    cartLineId: item.cartLineId ?? createCartLineId(item, selectedModifiers),
    unitPrice: item.unitPrice ?? computeUnitPrice(item.price, selectedModifiers),
    selectedModifiers,
  }
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return (JSON.parse(raw) as CartItem[]).map(normalizeCartItem)
  } catch {
    /* ignore */
  }
  return []
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)
  const [pendingReward, setPendingRewardState] = useState<PendingScratchReward | null>(loadPendingReward)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [loyaltyRewardId, setLoyaltyRewardId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items])

  useEffect(() => {
    savePendingReward(pendingReward)
  }, [pendingReward])

  const addItem = useCallback((item: MenuItem): boolean => {
    const selectedModifiers = item.selectedModifiers ?? []
    const cartLineId = createCartLineId(item, selectedModifiers)
    const unitPrice = item.unitPrice ?? computeUnitPrice(item.price, selectedModifiers)
    const hasConfigurableModifiers =
      (item.modifiers?.length ?? 0) > 0 && selectedModifiers.length === 0

    setItems((prev) => {
      if (!hasConfigurableModifiers) {
        const existing = prev.find((i) => i.cartLineId === cartLineId)
        if (existing) {
          return prev.map((i) =>
            i.cartLineId === cartLineId ? { ...i, quantity: i.quantity + 1 } : i,
          )
        }
      }
      return [
        ...prev,
        {
          ...item,
          cartLineId,
          unitPrice,
          selectedModifiers,
          quantity: 1,
        },
      ]
    })

    return hasConfigurableModifiers
  }, [])

  const updateLineModifiers = useCallback(
    (cartLineId: string, selectedModifiers: SelectedModifier[]) => {
      setItems((prev) =>
        prev.map((i) => {
          if (i.cartLineId !== cartLineId) return i
          return {
            ...i,
            selectedModifiers,
            unitPrice: computeUnitPrice(i.price, selectedModifiers),
          }
        }),
      )
    },
    [],
  )

  const syncMenuMetadata = useCallback((menuItems: MenuItem[]) => {
    setItems((prev) =>
      prev.map((cartLine) => {
        const live = menuItems.find((row) => row.id === cartLine.id)
        if (!live) return cartLine
        const selectedModifiers = cartLine.selectedModifiers ?? []
        return {
          ...cartLine,
          name: live.name,
          emoji: live.emoji,
          price: live.price,
          imageUrl: live.imageUrl,
          modifiers: live.modifiers ?? cartLine.modifiers,
          unitPrice: computeUnitPrice(live.price, selectedModifiers),
        }
      }),
    )
  }, [])

  const removeItem = useCallback((cartLineId: string) => {
    setItems((prev) => prev.filter((i) => i.cartLineId !== cartLineId))
  }, [])

  const updateQuantity = useCallback((cartLineId: string, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.cartLineId !== cartLineId))
      return
    }
    setItems((prev) =>
      prev.map((i) => (i.cartLineId === cartLineId ? { ...i, quantity: qty } : i)),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const clearPendingReward = useCallback(() => setPendingRewardState(null), [])

  const setPendingReward = useCallback((item: MenuItem, rewardPrice: number) => {
    setPendingRewardState(toPendingReward(item, rewardPrice))
  }, [])

  const addCombo = useCallback(
    (comboItems: MenuItem[]) => {
      comboItems.forEach((item) => addItem(item))
    },
    [addItem],
  )

  const submitOrder = useCallback(
    async (info: CheckoutInfo): Promise<Order> => {
      if (items.length === 0 && pendingReward) {
        throw new Error('جایزه باید همراه با حداقل یک محصول دیگر ثبت شود')
      }

      if (items.length === 0) {
        throw new Error('سبد خرید خالی است')
      }

      for (const item of items) {
        const groups = item.modifiers ?? []
        if (groups.length === 0) continue
        const selection = selectionFromSelectedModifiers(item.selectedModifiers ?? [])
        const error = validateModifierSelection(groups, selection)
        if (error) throw new Error(error)
      }

      const payload: OrderItemInput[] = items.map((i) => {
        const unitPrice = i.unitPrice ?? i.price
        const customConfig =
          i.customConfig ??
          (i.selectedModifiers && i.selectedModifiers.length > 0
            ? { modifiers: i.selectedModifiers }
            : i.description
              ? { detail: i.description }
              : null)

        return {
          menuItemId: i.id.startsWith('custom-') || i.id.startsWith('scoop-') ? null : i.id,
          name: i.name,
          emoji: i.emoji,
          unitPrice,
          quantity: i.quantity,
          customConfig,
        }
      })

      if (pendingReward) {
        payload.push({
          menuItemId: pendingReward.menuItemId,
          name: pendingReward.name,
          emoji: pendingReward.emoji,
          unitPrice: pendingReward.rewardPrice,
          quantity: 1,
          customConfig: { isScratchReward: true },
        })
      }

      const order = await apiClient.createOrder({
        channel: getChannel(),
        customerName: info.customerName || null,
        note: info.note || null,
        items: payload,
        loyaltyRewardId: info.loyaltyRewardId ?? loyaltyRewardId ?? null,
      })
      setLastOrder(order)
      setItems([])
      setPendingRewardState(null)
      setLoyaltyRewardId(null)
      return order
    },
    [items, pendingReward, loyaltyRewardId],
  )

  const clearLastOrder = useCallback(() => setLastOrder(null), [])

  const total = items.reduce((s, i) => s + (i.unitPrice ?? i.price) * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        pendingReward,
        addItem,
        removeItem,
        updateQuantity,
        updateLineModifiers,
        syncMenuMetadata,
        clearCart,
        clearPendingReward,
        setPendingReward,
        total,
        count,
        addCombo,
        submitOrder,
        lastOrder,
        clearLastOrder,
        loyaltyRewardId,
        setLoyaltyRewardId,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export type { PendingScratchReward }
