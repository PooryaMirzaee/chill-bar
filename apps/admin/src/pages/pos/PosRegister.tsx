import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, History, Receipt } from 'lucide-react'
import type { PosCheckoutPayment, PosMenuData, PosOrder, PosSettings, PosShift, StoreSettings } from '@chill-bar/shared'
import {
  DEFAULT_POS_SETTINGS,
} from '@chill-bar/shared'
import { api } from '../../lib/api'
import { usePosCart } from '../../lib/usePosCart'
import { printOrderReceipts, shouldAutoPrint } from '../../lib/printReceipt'
import { useAuth } from '../../lib/auth'
import { PosShiftBar } from './PosShiftBar'
import { PosItemGrid } from './PosItemGrid'
import { PosCart } from './PosCart'
import { PosModifierModal } from './PosModifierModal'
import { PosIceCreamModal } from './PosIceCreamModal'
import { PosCheckoutModal } from './PosCheckoutModal'
import { PosDiscountModal } from './PosDiscountModal'
import { PosIncomingPanel } from './PosIncomingPanel'
import type { PosMenuItem } from '@chill-bar/shared'
import { menuItemOpensIceCreamBuilder } from '@chill-bar/shared'
import './pos.css'

export function PosRegister() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: posSettings = DEFAULT_POS_SETTINGS } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: () => api<PosSettings>('/api/admin/pos/settings'),
  })

  const cart = usePosCart({
    soundOnAddItem: posSettings.soundOnAddItem,
    addItemSoundVolume: posSettings.addItemSoundVolume,
  })

  const [modifierItem, setModifierItem] = useState<PosMenuItem | null>(null)
  const [iceHubItem, setIceHubItem] = useState<PosMenuItem | null>(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [settleOrder, setSettleOrder] = useState<PosOrder | null>(null)
  const [settleCustomerName, setSettleCustomerName] = useState('')
  const [settleCustomerPhone, setSettleCustomerPhone] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: menu } = useQuery({
    queryKey: ['pos-menu'],
    queryFn: () => api<PosMenuData>('/api/admin/pos/menu'),
  })

  const { data: store } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/api/settings'),
  })

  const { data: shift } = useQuery({
    queryKey: ['pos-shift'],
    queryFn: () => api<PosShift | null>('/api/admin/shifts/current'),
  })

  const saleMutation = useMutation({
    mutationFn: (payment: PosCheckoutPayment) =>
      api<PosOrder>('/api/admin/pos/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.getPayload(),
          customerName: cart.customerName || null,
          customerPhone: cart.normalizePhone(),
          note: cart.note || null,
          discountAmount: cart.discountAmount,
          discountNote: cart.discountNote || null,
          payment,
        }),
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['pos-shift'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] })
      cart.clear()
      setShowCheckout(false)
      setError(null)
      if (posSettings.autoPrintOnSale && shouldAutoPrint(posSettings)) {
        printReceiptForOrder(order)
      }
    },
    onError: (err: Error) => setError(err.message),
  })

  const settleMutation = useMutation({
    mutationFn: ({
      orderId,
      payment,
      customerName,
      customerPhone,
    }: {
      orderId: string
      payment: { method: string; cashReceived?: number; payments?: Array<{ method: string; amount: number }> }
      customerName?: string | null
      customerPhone?: string | null
    }) =>
      api<PosOrder>(`/api/admin/orders/${orderId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          payment,
          customerName: customerName ?? null,
          customerPhone: customerPhone ?? null,
          discountAmount: 0,
          markDelivered: true,
        }),
      }),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['pos-incoming'] })
      setSettleOrder(null)
      if (posSettings.autoPrintOnOnlineSettle && shouldAutoPrint(posSettings)) {
        printReceiptForOrder(order)
      }
    },
    onError: (err: Error) => setError(err.message),
  })

  const printReceiptForOrder = (
    order: PosOrder,
    options?: { forceDialog?: boolean; copyType?: 'customer' | 'kitchen' | 'both' },
  ) => {
    if (!store) return
    printOrderReceipts(order, store, posSettings, {
      cashierName: user?.name,
      forceDialog: options?.forceDialog,
      copyType: options?.copyType,
    })
  }

  const handleSelectItem = (item: PosMenuItem) => {
    if (menuItemOpensIceCreamBuilder(item.tags)) {
      setIceHubItem(item)
      return
    }
    const groups = cart.parseModifiers(item.modifiers)
    if (groups.length > 0) {
      setModifierItem(item)
      return
    }
    cart.addItem(item)
  }

  const shiftBlocked = posSettings.requireShiftOpen && !shift
  const checkoutTotal = settleOrder?.total ?? cart.total

  return (
    <div className="pos-shell">
      <header className="pos-topbar">
        <div className="pos-topbar-start">
          <Link to="/" className="pos-back">
            <ArrowRight size={18} /> پنل
          </Link>
          <h1>صندوق فروش</h1>
        </div>
        <PosShiftBar />
        <Link to="/pos/receipts" className="pos-topbar-link">
          <Receipt size={16} /> فیش‌های اخیر
        </Link>
        <Link to="/pos/shifts" className="pos-topbar-link">
          <History size={16} /> شیفت‌ها
        </Link>
      </header>

      {(error || shiftBlocked) && (
        <div className="pos-alerts">
          {error && (
            <div className="pos-banner error">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="بستن">
                ✕
              </button>
            </div>
          )}
          {shiftBlocked && (
            <div className="pos-banner warn">برای فروش، ابتدا شیفت را باز کنید.</div>
          )}
        </div>
      )}

      <PosIncomingPanel
        onSettle={(order) => {
          setSettleOrder(order)
          setSettleCustomerName(order.customerName ?? '')
          setSettleCustomerPhone(order.customerPhone ?? '')
        }}
      />

      <div className="pos-main">
        <div className="pos-catalog">
          {menu && (
            <PosItemGrid
              categories={menu.categories}
              items={menu.items}
              onSelectItem={handleSelectItem}
            />
          )}
        </div>
        <PosCart
          cart={cart}
          onCheckout={() => setShowCheckout(true)}
          onDiscount={() => setShowDiscount(true)}
          disabled={shiftBlocked}
        />
      </div>

      {modifierItem && (
        <PosModifierModal
          item={modifierItem}
          groups={cart.parseModifiers(modifierItem.modifiers)}
          cart={cart}
          onClose={() => setModifierItem(null)}
        />
      )}

      {iceHubItem && (
        <PosIceCreamModal hubItem={iceHubItem} cart={cart} onClose={() => setIceHubItem(null)} />
      )}

      {showDiscount && (
        <PosDiscountModal
          subtotal={cart.subtotal}
          onClose={() => setShowDiscount(false)}
          onApply={(amount, note) => {
            cart.setDiscountAmount(amount)
            cart.setDiscountNote(note)
          }}
        />
      )}

      {showCheckout && (
        <PosCheckoutModal
          total={checkoutTotal}
          settings={posSettings}
          onClose={() => setShowCheckout(false)}
          loading={saleMutation.isPending}
          onConfirm={(payment) => saleMutation.mutate(payment)}
        />
      )}

      {settleOrder && (
        <PosCheckoutModal
          total={settleOrder.total}
          settings={posSettings}
          title={`تسویه ${settleOrder.code}`}
          showCustomerFields
          customerName={settleCustomerName}
          customerPhone={settleCustomerPhone}
          onCustomerNameChange={setSettleCustomerName}
          onCustomerPhoneChange={setSettleCustomerPhone}
          onClose={() => setSettleOrder(null)}
          loading={settleMutation.isPending}
          onConfirm={(payment) => {
            const digits = settleCustomerPhone.replace(/\D/g, '')
            settleMutation.mutate({
              orderId: settleOrder.id,
              payment,
              customerName: settleCustomerName || null,
              customerPhone: digits || null,
            })
          }}
        />
      )}
    </div>
  )
}
