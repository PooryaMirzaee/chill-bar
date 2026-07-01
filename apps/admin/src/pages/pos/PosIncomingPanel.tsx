import { useQuery } from '@tanstack/react-query'
import type { PosOrder } from '@chill-bar/shared'
import { ORDER_CHANNEL_LABEL } from '@chill-bar/shared'
import { api } from '../../lib/api'
import { formatPrice, timeAgo } from '../../lib/format'

interface PosIncomingPanelProps {
  onSettle: (order: PosOrder) => void
}

export function PosIncomingPanel({ onSettle }: PosIncomingPanelProps) {
  const { data: orders = [] } = useQuery({
    queryKey: ['pos-incoming'],
    queryFn: () => api<PosOrder[]>('/api/admin/pos/incoming'),
    refetchInterval: 10_000,
  })

  if (!orders.length) return null

  return (
    <section className="pos-incoming">
      <h3>سفارش‌های در انتظار پرداخت ({orders.length.toLocaleString('fa-IR')})</h3>
      <div className="pos-incoming-list">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            className="pos-incoming-card"
            onClick={() => onSettle(order)}
          >
            <div>
              <strong>{order.code}</strong>
              <span>{ORDER_CHANNEL_LABEL[order.channel]}</span>
              {order.customerName && <span>{order.customerName}</span>}
            </div>
            <div className="pos-incoming-meta">
              <span>{timeAgo(order.createdAt)}</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
