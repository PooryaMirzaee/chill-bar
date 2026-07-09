import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, ChefHat, Eye, Printer, RefreshCw, User } from 'lucide-react'
import type { Order, PosSettings, StoreSettings } from '@chill-bar/shared'
import {
  DEFAULT_POS_SETTINGS,
  ORDER_CHANNEL_LABEL,
  PAYMENT_STATUS_LABEL,
} from '@chill-bar/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatPrice, formatDateTime } from '../../lib/format'
import {
  buildThermalReceiptProps,
  printOrderReceipts,
} from '../../lib/printReceipt'
import { ThermalReceipt } from '../../components/receipt/ThermalReceipt'
import './pos.css'

type PreviewCopy = 'customer' | 'kitchen'

export function PosRecentReceipts() {
  const { user } = useAuth()
  const [preview, setPreview] = useState<{ order: Order; copyType: PreviewCopy } | null>(null)

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recent-receipts'],
    queryFn: () => api<Order[]>('/api/admin/orders?limit=80'),
    refetchInterval: 30_000,
  })

  const { data: store } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/api/settings'),
  })

  const { data: posSettings = DEFAULT_POS_SETTINGS } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: () => api<PosSettings>('/api/admin/pos/settings'),
  })

  const recent = useMemo(
    () => orders.filter((order) => order.status !== 'CANCELLED'),
    [orders],
  )

  const print = (order: Order, copyType: 'customer' | 'kitchen' | 'both') => {
    if (!store) return
    printOrderReceipts(order, store, posSettings, {
      cashierName: user?.name,
      forceDialog: true,
      copyType,
    })
  }

  return (
    <div className="pos-shell pos-receipts-page">
      <header className="pos-topbar">
        <div className="pos-topbar-start">
          <Link to="/pos" className="pos-back">
            <ArrowRight size={18} /> صندوق
          </Link>
          <h1>فیش‌های اخیر</h1>
        </div>
        <button
          type="button"
          className="pos-topbar-link"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw size={16} className={isFetching ? 'spin' : ''} /> بروزرسانی
        </button>
      </header>

      <div className="pos-receipts-wrap">
        {isLoading ? (
          <div className="pos-receipts-empty">در حال بارگذاری…</div>
        ) : recent.length === 0 ? (
          <div className="pos-receipts-empty">هنوز فیشی ثبت نشده</div>
        ) : (
          <div className="pos-receipts-table-wrap">
            <table className="pos-receipts-table">
              <thead>
                <tr>
                  <th>فیش</th>
                  <th>کد</th>
                  <th>زمان</th>
                  <th>مشتری</th>
                  <th>کانال</th>
                  <th>مبلغ</th>
                  <th>پرداخت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((order) => (
                  <tr key={order.id}>
                    <td>{order.receiptNumber != null ? `#${order.receiptNumber}` : '—'}</td>
                    <td className="mono">{order.code}</td>
                    <td>{formatDateTime(order.createdAt)}</td>
                    <td>{order.customerName || '—'}</td>
                    <td>{ORDER_CHANNEL_LABEL[order.channel]}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <span
                        className={`pos-receipt-pay ${order.paymentStatus === 'UNPAID' ? 'unpaid' : 'paid'}`}
                      >
                        {PAYMENT_STATUS_LABEL[order.paymentStatus ?? 'UNPAID']}
                      </span>
                    </td>
                    <td>
                      <div className="pos-receipt-actions">
                        <button
                          type="button"
                          className="pos-receipt-btn"
                          title="نمایش فیش مشتری"
                          onClick={() => setPreview({ order, copyType: 'customer' })}
                        >
                          <Eye size={15} />
                        </button>
                        {posSettings.printKitchenReceipt && (
                          <button
                            type="button"
                            className="pos-receipt-btn"
                            title="چاپ آشپزخانه"
                            onClick={() => print(order, 'kitchen')}
                          >
                            <ChefHat size={15} />
                          </button>
                        )}
                        {posSettings.printCustomerReceipt && (
                          <button
                            type="button"
                            className="pos-receipt-btn"
                            title="چاپ مشتری"
                            onClick={() => print(order, 'customer')}
                          >
                            <User size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="pos-receipt-btn primary"
                          title="چاپ هر دو"
                          onClick={() => print(order, 'both')}
                        >
                          <Printer size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && store && (
        <div className="pos-modal-overlay" onClick={() => setPreview(null)}>
          <div className="pos-modal pos-receipt-preview-modal" onClick={(e) => e.stopPropagation()}>
            <header className="pos-modal-head">
              <h3>
                پیش‌نمایش فیش {preview.copyType === 'kitchen' ? 'آشپزخانه' : 'مشتری'} —{' '}
                {preview.order.code}
              </h3>
              <button type="button" className="pos-modal-close" onClick={() => setPreview(null)}>
                ✕
              </button>
            </header>
            <div className="pos-receipt-preview-body">
              <ThermalReceipt
                {...buildThermalReceiptProps(preview.order, store, posSettings, {
                  cashierName: user?.name,
                  copyType: preview.copyType,
                })}
                preview
              />
            </div>
            <footer className="pos-modal-foot">
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => setPreview({ ...preview, copyType: 'kitchen' })}
              >
                آشپزخانه
              </button>
              <button
                type="button"
                className="pos-btn-secondary"
                onClick={() => setPreview({ ...preview, copyType: 'customer' })}
              >
                مشتری
              </button>
              <button
                type="button"
                className="pos-btn-primary"
                onClick={() => {
                  print(preview.order, 'both')
                  setPreview(null)
                }}
              >
                <Printer size={16} /> چاپ
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
