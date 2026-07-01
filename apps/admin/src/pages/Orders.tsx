import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, BellOff, Calculator, Printer, RefreshCw } from 'lucide-react'
import type { Order, OrderStatus, PosOrder, PosSettings, StoreSettings } from '@chill-bar/shared'
import {
  DEFAULT_POS_SETTINGS,
  ORDER_CHANNEL_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@chill-bar/shared'
import { api } from '../lib/api'
import { useAdminSocket } from '../lib/useOrdersSocket'
import { formatPrice, timeAgo } from '../lib/format'
import { OrderItemExtras, OrderItemExtrasCompact } from '../components/OrderItemExtras'
import { isAlertMuted, setAlertMuted, subscribeAlertMute } from '../lib/alertMute'
import { buildThermalReceiptProps, printThermalReceipt } from '../lib/printReceipt'
import { useAuth } from '../lib/auth'
import { PosCheckoutModal } from './pos/PosCheckoutModal'

const COLUMNS: { status: OrderStatus; next?: OrderStatus }[] = [
  { status: 'PENDING', next: 'CONFIRMED' },
  { status: 'CONFIRMED', next: 'PREPARING' },
  { status: 'PREPARING', next: 'READY' },
  { status: 'READY', next: 'DELIVERED' },
]

export function Orders() {
  const queryClient = useQueryClient()
  const [sessionMuted, setSessionMuted] = useState(isAlertMuted)
  const [selected, setSelected] = useState<Order | null>(null)

  useEffect(() => subscribeAlertMute(() => setSessionMuted(isAlertMuted())), [])

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => api<Order[]>('/api/admin/orders?limit=100'),
  })

  const handleSocket = useCallback(
    (msg: { type: string }) => {
      if (
        msg.type === 'order:new' ||
        msg.type === 'order:updated' ||
        msg.type === 'order:status' ||
        msg.type === 'order:paid'
      ) {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['pos-incoming'] })
      }
    },
    [queryClient],
  )
  useAdminSocket(handleSocket)

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api<Order>(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const grouped = useMemo(() => {
    const map: Record<string, Order[]> = {}
    for (const col of COLUMNS) map[col.status] = []
    for (const order of orders) {
      if (map[order.status]) map[order.status].push(order)
    }
    return map
  }, [orders])

  const pendingCount = grouped.PENDING?.length ?? 0

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>مدیریت سفارش‌ها</h1>
          <p className="page-sub">
            سفارش‌های جدید به‌صورت زنده نمایش داده می‌شوند
            {pendingCount > 0 && (
              <span className="pending-badge"> · {pendingCount} در انتظار تأیید</span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <Link to="/pos" className="btn-ghost">
            <Calculator size={16} /> صندوق
          </Link>
          <button
            className={`icon-btn ${!sessionMuted ? 'active' : ''}`}
            onClick={() => setAlertMuted(!sessionMuted)}
            title={sessionMuted ? 'صدای این نشست خاموش است' : 'بی‌صدا کردن این نشست'}
          >
            {sessionMuted ? <BellOff size={18} /> : <Bell size={18} />}
          </button>
          <button className="icon-btn" onClick={() => refetch()} title="بروزرسانی">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="kanban">
          {COLUMNS.map((c) => (
            <div key={c.status} className="kanban-col">
              <div className="kanban-col-head">{ORDER_STATUS_LABEL[c.status]}</div>
              <div className="card skeleton" style={{ height: 120 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="kanban">
          {COLUMNS.map((col) => (
            <div key={col.status} className="kanban-col">
              <div className="kanban-col-head">
                <span>{ORDER_STATUS_LABEL[col.status]}</span>
                <span className="kanban-count">{grouped[col.status]?.length ?? 0}</span>
              </div>
              <div className="kanban-list">
                {(grouped[col.status] ?? []).map((order) => (
                  <article
                    key={order.id}
                    className="order-card"
                    onClick={() => setSelected(order)}
                  >
                    <div className="order-card-head">
                      <strong>{order.code}</strong>
                      <span className="order-channel">{ORDER_CHANNEL_LABEL[order.channel]}</span>
                    </div>
                    <div className="order-card-meta">
                      {order.customerName && <span>{order.customerName}</span>}
                      <span>{timeAgo(order.createdAt)}</span>
                      {order.paymentStatus && order.paymentStatus !== 'UNPAID' && (
                        <span className="payment-badge paid">
                          {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                        </span>
                      )}
                      {order.paymentStatus === 'UNPAID' && order.channel !== 'POS' && (
                        <span className="payment-badge unpaid">پرداخت نشده</span>
                      )}
                    </div>
                    <ul className="order-card-items">
                      {order.items.slice(0, 3).map((item) => (
                        <li key={item.id}>
                          <span className="oc-emoji">{item.emoji}</span>
                          <div className="oc-item-body">
                            <span className="oc-item-name">{item.name}</span>
                            <OrderItemExtrasCompact item={item} />
                          </div>
                          <span className="oc-item-qty">×{item.quantity}</span>
                        </li>
                      ))}
                      {order.items.length > 3 && (
                        <li className="oc-more">+{order.items.length - 3} مورد دیگر</li>
                      )}
                    </ul>
                    <div className="order-card-foot">
                      <strong>{formatPrice(order.total)}</strong>
                      <div className="order-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="btn-ghost-sm danger"
                          onClick={() =>
                            statusMutation.mutate({ id: order.id, status: 'CANCELLED' })
                          }
                        >
                          لغو
                        </button>
                        {col.next && (
                          <button
                            className="btn-primary-sm"
                            onClick={() =>
                              statusMutation.mutate({ id: order.id, status: col.next! })
                            }
                          >
                            {ORDER_STATUS_LABEL[col.next]}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {(grouped[col.status]?.length ?? 0) === 0 && (
                  <div className="kanban-empty">خالی</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [showCheckout, setShowCheckout] = useState(false)

  const { data: store } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/api/settings'),
  })
  const { data: posSettings = DEFAULT_POS_SETTINGS } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: () => api<PosSettings>('/api/admin/pos/settings'),
  })

  const checkoutMutation = useMutation({
    mutationFn: (payment: { method: string; cashReceived?: number }) =>
      api<PosOrder>(`/api/admin/orders/${order.id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ payment, discountAmount: 0, markDelivered: true }),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCheckout(false)
      printOrderReceipt(updated)
    },
  })

  const printOrderReceipt = (o: Order = order) => {
    if (!store) return
    printThermalReceipt(buildThermalReceiptProps(o, store, posSettings, { cashierName: user?.name }))
  }

  const unpaid = order.paymentStatus === 'UNPAID' || !order.paymentStatus

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header className="modal-head">
            <h3>سفارش {order.code}</h3>
            <button className="icon-btn" onClick={onClose}>
              ✕
            </button>
          </header>
          <div className="modal-body">
            <div className="order-detail-meta">
              <span>{ORDER_STATUS_LABEL[order.status]}</span>
              <span>{ORDER_CHANNEL_LABEL[order.channel]}</span>
              {order.paymentStatus && (
                <span>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</span>
              )}
              {order.customerName && <span>{order.customerName}</span>}
            </div>
            {order.note && <p className="order-note">یادداشت: {order.note}</p>}
            <ul className="order-detail-items">
              {order.items.map((item) => (
                <li key={item.id}>
                  <span className="odi-emoji">{item.emoji}</span>
                  <div className="odi-info">
                    <strong>{item.name}</strong>
                    <OrderItemExtras item={item} />
                  </div>
                  <span className="odi-qty">×{item.quantity}</span>
                  <span className="odi-price">{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="order-detail-total">
              <span>جمع کل</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </div>
          <footer className="modal-foot">
            {unpaid && order.channel !== 'POS' && (
              <button className="btn-primary" onClick={() => setShowCheckout(true)}>
                <Calculator size={16} /> تسویه در صندوق
              </button>
            )}
            <button className="btn-ghost" onClick={() => printOrderReceipt()}>
              <Printer size={16} /> چاپ رسید
            </button>
          </footer>
        </div>
      </div>

      {showCheckout && (
        <PosCheckoutModal
          total={order.total}
          settings={posSettings}
          title={`تسویه ${order.code}`}
          onClose={() => setShowCheckout(false)}
          loading={checkoutMutation.isPending}
          onConfirm={(payment) => checkoutMutation.mutate(payment)}
        />
      )}
    </>
  )
}
