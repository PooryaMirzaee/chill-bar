import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Printer } from 'lucide-react'
import type {
  FinancialOrderRow,
  Order,
  OrderStatus,
  PosSettings,
  StoreSettings,
} from '@chill-bar/shared'
import {
  ORDER_CHANNEL_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  DEFAULT_POS_SETTINGS,
} from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatDateTime, formatPrice } from '../lib/format'
import { printOrderReceipts } from '../lib/printReceipt'

const STATUS_OPTIONS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
]

interface FinancialInvoiceModalProps {
  row: FinancialOrderRow
  onClose: () => void
}

export function FinancialInvoiceModal({ row, onClose }: FinancialInvoiceModalProps) {
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', row.id],
    queryFn: () => api<Order>(`/api/admin/orders/${row.id}`),
  })

  const { data: store } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/api/settings'),
  })

  const { data: posSettings = DEFAULT_POS_SETTINGS } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: () => api<PosSettings>('/api/admin/pos/settings'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) =>
      api<Order>(`/api/admin/orders/${row.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', row.id] })
      queryClient.invalidateQueries({ queryKey: ['financial-daily'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const currentStatus = order?.status ?? row.status

  const handlePrint = () => {
    if (!store || !order) return
    printOrderReceipts(order, store, posSettings, { forceDialog: true })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fin-invoice-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>فاکتور {row.code}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="modal-body fin-invoice-body">
          <div className="fin-invoice-meta">
            <div>
              <span>زمان</span>
              <strong>{formatDateTime(row.createdAt)}</strong>
            </div>
            <div>
              <span>کانال</span>
              <strong>{ORDER_CHANNEL_LABEL[row.channel]}</strong>
            </div>
            <div>
              <span>شماره فیش</span>
              <strong>{row.receiptNumber?.toLocaleString('fa-IR') ?? '—'}</strong>
            </div>
            <div>
              <span>مشتری</span>
              <strong>{row.customerName ?? '—'}</strong>
            </div>
            <div>
              <span>موبایل</span>
              <strong dir="ltr">{row.customerPhone ?? order?.customerPhone ?? '—'}</strong>
            </div>
            {(row.customerId ?? order?.customerId) && (
              <div className="field-full">
                <Link to="/customers" className="btn-ghost btn-sm">
                  مشاهده پروفایل مشتری
                </Link>
              </div>
            )}
          </div>

          <div className="fin-invoice-status-row">
            <label className="field">
              <span>وضعیت سفارش</span>
              <select
                value={currentStatus}
                disabled={statusMutation.isPending}
                onChange={(e) => statusMutation.mutate(e.target.value as OrderStatus)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </label>
            <div className="fin-invoice-badges">
              <span className="badge">{PAYMENT_STATUS_LABEL[row.paymentStatus]}</span>
              {row.paymentMethod && (
                <span className="badge">{PAYMENT_METHOD_LABEL[row.paymentMethod]}</span>
              )}
            </div>
          </div>

          {isLoading ? (
            <p className="empty-hint">در حال بارگذاری اقلام…</p>
          ) : order?.items?.length ? (
            <table className="fin-invoice-items">
              <thead>
                <tr>
                  <th>قلم</th>
                  <th>تعداد</th>
                  <th>قیمت</th>
                  <th>جمع</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.emoji} {item.name}
                    </td>
                    <td>{item.quantity.toLocaleString('fa-IR')}</td>
                    <td>{formatPrice(item.unitPrice)}</td>
                    <td>{formatPrice(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-hint">اقلامی ثبت نشده</p>
          )}

          <div className="fin-invoice-totals">
            {row.discountAmount > 0 && (
              <div className="fin-report-row">
                <span>تخفیف</span>
                <strong>−{formatPrice(row.discountAmount)}</strong>
              </div>
            )}
            <div className="fin-report-row highlight">
              <span>جمع کل</span>
              <strong>{formatPrice(row.total)}</strong>
            </div>
          </div>

          {statusMutation.isError && (
            <p className="error-text">
              {statusMutation.error instanceof Error
                ? statusMutation.error.message
                : 'تغییر وضعیت ناموفق بود'}
            </p>
          )}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>
            بستن
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handlePrint}
            disabled={!order || !store}
          >
            <Printer size={16} /> چاپ فیش
          </button>
        </footer>
      </div>
    </div>
  )
}
