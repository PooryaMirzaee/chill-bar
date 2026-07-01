import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PosOrder } from '@chill-bar/shared'
import { ORDER_CHANNEL_LABEL } from '@chill-bar/shared'
import { api } from '../../lib/api'
import { formatPrice, timeAgo } from '../../lib/format'

interface PosIncomingPanelProps {
  onSettle: (order: PosOrder) => void
}

export function PosIncomingPanel({ onSettle }: PosIncomingPanelProps) {
  const [open, setOpen] = useState(true)
  const { data: orders = [] } = useQuery({
    queryKey: ['pos-incoming'],
    queryFn: () => api<PosOrder[]>('/api/admin/pos/incoming'),
    refetchInterval: 10_000,
  })

  if (!orders.length) return null

  return (
    <section className={`pos-incoming ${open ? 'open' : 'collapsed'}`}>
      <button type="button" className="pos-incoming-toggle" onClick={() => setOpen((v) => !v)}>
        <span>
          سفارش‌های در انتظار پرداخت
          <em>{orders.length.toLocaleString('fa-IR')}</em>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="pos-incoming-list">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              className="pos-incoming-card"
              onClick={() => onSettle(order)}
            >
              <strong>{order.code}</strong>
              <span className="pos-incoming-channel">{ORDER_CHANNEL_LABEL[order.channel]}</span>
              {order.customerName && <span className="pos-incoming-name">{order.customerName}</span>}
              <span className="pos-incoming-time">{timeAgo(order.createdAt)}</span>
              <strong className="pos-incoming-price">{formatPrice(order.total)}</strong>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
