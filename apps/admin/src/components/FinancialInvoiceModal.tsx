import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Printer, Trash2 } from 'lucide-react'
import type {
  FinancialOrderRow,
  Order,
  OrderItem,
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

interface EditItem {
  key: string
  id?: string
  menuItemId: string | null
  name: string
  emoji: string
  unitPrice: number
  quantity: number
  customConfig: Record<string, unknown> | null
}

interface FinancialInvoiceModalProps {
  row: FinancialOrderRow
  onClose: () => void
}

function toEditItems(items: OrderItem[]): EditItem[] {
  return items.map((item, index) => ({
    key: item.id || `new-${index}`,
    id: item.id,
    menuItemId: item.menuItemId ?? null,
    name: item.name,
    emoji: item.emoji || '🍦',
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    customConfig: item.customConfig ?? null,
  }))
}

export function FinancialInvoiceModal({ row, onClose }: FinancialInvoiceModalProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [customerName, setCustomerName] = useState(row.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(row.customerPhone ?? '')
  const [note, setNote] = useState('')
  const [discountAmount, setDiscountAmount] = useState(row.discountAmount ?? 0)
  const [items, setItems] = useState<EditItem[]>([])
  const [formError, setFormError] = useState('')

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

  useEffect(() => {
    if (!order) return
    setCustomerName(order.customerName ?? '')
    setCustomerPhone(order.customerPhone ?? '')
    setNote(order.note ?? '')
    setDiscountAmount(order.discountAmount ?? 0)
    setItems(toEditItems(order.items))
  }, [order])

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

  const saveMutation = useMutation({
    mutationFn: () => {
      const unpaid = (order?.paymentStatus ?? row.paymentStatus) === 'UNPAID'
      const body: Record<string, unknown> = {
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        note: note.trim() || null,
      }
      if (unpaid) {
        body.discountAmount = Math.max(0, Math.round(discountAmount) || 0)
        body.items = items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.name.trim(),
          emoji: item.emoji || '🍦',
          unitPrice: Math.max(0, Math.round(item.unitPrice) || 0),
          quantity: Math.max(1, Math.round(item.quantity) || 1),
          customConfig: item.customConfig,
        }))
      }
      return api<Order>(`/api/admin/orders/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      setFormError('')
      setEditing(false)
      queryClient.invalidateQueries({ queryKey: ['admin-order', row.id] })
      queryClient.invalidateQueries({ queryKey: ['financial-daily'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'ویرایش ناموفق بود')
    },
  })

  const currentStatus = order?.status ?? row.status
  const unpaid = (order?.paymentStatus ?? row.paymentStatus) === 'UNPAID'
  const canEdit = currentStatus !== 'CANCELLED'

  const editSubtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  )
  const editTotal = Math.max(0, editSubtotal - (discountAmount || 0))

  const handlePrint = () => {
    if (!store || !order) return
    printOrderReceipts(order, store, posSettings, { forceDialog: true })
  }

  const startEdit = () => {
    if (!order) return
    setFormError('')
    setCustomerName(order.customerName ?? '')
    setCustomerPhone(order.customerPhone ?? '')
    setNote(order.note ?? '')
    setDiscountAmount(order.discountAmount ?? 0)
    setItems(toEditItems(order.items))
    setEditing(true)
  }

  const updateItem = (key: string, patch: Partial<EditItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
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
          {!editing ? (
            <>
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
                  <strong>{order?.customerName ?? row.customerName ?? '—'}</strong>
                </div>
                <div>
                  <span>موبایل</span>
                  <strong dir="ltr">
                    {order?.customerPhone ?? row.customerPhone ?? '—'}
                  </strong>
                </div>
                {(order?.note || note) && (
                  <div className="field-full">
                    <span>یادداشت</span>
                    <strong>{order?.note ?? note}</strong>
                  </div>
                )}
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
                  <span className="badge">
                    {PAYMENT_STATUS_LABEL[order?.paymentStatus ?? row.paymentStatus]}
                  </span>
                  {(order?.paymentMethod ?? row.paymentMethod) && (
                    <span className="badge">
                      {PAYMENT_METHOD_LABEL[(order?.paymentMethod ?? row.paymentMethod)!]}
                    </span>
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
                {(order?.discountAmount ?? row.discountAmount) > 0 && (
                  <div className="fin-report-row">
                    <span>تخفیف</span>
                    <strong>−{formatPrice(order?.discountAmount ?? row.discountAmount)}</strong>
                  </div>
                )}
                <div className="fin-report-row highlight">
                  <span>جمع کل</span>
                  <strong>{formatPrice(order?.total ?? row.total)}</strong>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="form-grid">
                <label className="field">
                  <span>نام مشتری</span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اختیاری"
                  />
                </label>
                <label className="field">
                  <span>موبایل</span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    dir="ltr"
                    placeholder="09…"
                  />
                </label>
                <label className="field field-full">
                  <span>یادداشت</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>

              {unpaid ? (
                <>
                  <table className="fin-invoice-items fin-invoice-items-edit">
                    <thead>
                      <tr>
                        <th>قلم</th>
                        <th>تعداد</th>
                        <th>قیمت واحد</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.key}>
                          <td>
                            <input
                              className="fin-edit-input"
                              value={item.name}
                              onChange={(e) => updateItem(item.key, { name: e.target.value })}
                            />
                          </td>
                          <td>
                            <input
                              className="fin-edit-input fin-edit-num"
                              type="number"
                              min={1}
                              max={50}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  quantity: Number(e.target.value) || 1,
                                })
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="fin-edit-input fin-edit-num"
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateItem(item.key, {
                                  unitPrice: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn-sm danger"
                              disabled={items.length <= 1}
                              onClick={() => removeItem(item.key)}
                              title="حذف قلم"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <label className="field">
                    <span>تخفیف (تومان)</span>
                    <input
                      type="number"
                      min={0}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    />
                  </label>
                  <div className="fin-invoice-totals">
                    <div className="fin-report-row">
                      <span>جمع اقلام</span>
                      <strong>{formatPrice(editSubtotal)}</strong>
                    </div>
                    <div className="fin-report-row highlight">
                      <span>جمع کل</span>
                      <strong>{formatPrice(editTotal)}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <p className="empty-hint">
                  این فاکتور تسویه شده؛ فقط نام، موبایل و یادداشت قابل ویرایش است.
                </p>
              )}

              {formError && <p className="error-text">{formError}</p>}
            </>
          )}

          {statusMutation.isError && !editing && (
            <p className="error-text">
              {statusMutation.error instanceof Error
                ? statusMutation.error.message
                : 'تغییر وضعیت ناموفق بود'}
            </p>
          )}
        </div>
        <footer className="modal-foot">
          {editing ? (
            <>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEditing(false)
                  setFormError('')
                }}
                disabled={saveMutation.isPending}
              >
                انصراف
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || (unpaid && items.length === 0)}
              >
                {saveMutation.isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={onClose}>
                بستن
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={startEdit}
                  disabled={!order || isLoading}
                >
                  <Pencil size={16} /> ویرایش فاکتور
                </button>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={handlePrint}
                disabled={!order || !store}
              >
                <Printer size={16} /> چاپ فیش
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  )
}
