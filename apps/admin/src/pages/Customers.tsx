import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  User,
  Phone,
  ShoppingBag,
  Star,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { AdminCustomerDetail, AdminCustomerListResponse, AdminCustomerRow } from '@chill-bar/shared'
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatDateTime, formatNumber, formatPrice } from '../lib/format'

const emptyCreate = { phone: '', name: '', notes: '' }

export function Customers() {
  const queryClient = useQueryClient()
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [registered, setRegistered] = useState<'all' | 'true' | 'false'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editNotes, setEditNotes] = useState('')
  const [editName, setEditName] = useState('')
  const [pointsDelta, setPointsDelta] = useState('')
  const [pointsReason, setPointsReason] = useState('')
  const [error, setError] = useState('')

  const listQuery = useQuery({
    queryKey: ['admin-customers', search, page, registered],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      })
      if (search) params.set('q', search)
      if (registered !== 'all') params.set('registered', registered)
      return api<AdminCustomerListResponse>(`/api/admin/customers?${params}`)
    },
  })

  const detailQuery = useQuery({
    queryKey: ['admin-customer', selectedId],
    queryFn: () => api<AdminCustomerDetail>(`/api/admin/customers/${selectedId}`),
    enabled: Boolean(selectedId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
    if (selectedId) queryClient.invalidateQueries({ queryKey: ['admin-customer', selectedId] })
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(createForm),
      }),
    onSuccess: () => {
      invalidate()
      setCreateOpen(false)
      setCreateForm(emptyCreate)
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      api(`/api/admin/customers/${selectedId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName || null, notes: editNotes || null }),
      }),
    onSuccess: () => {
      invalidate()
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const pointsMutation = useMutation({
    mutationFn: () =>
      api(`/api/admin/customers/${selectedId}/points`, {
        method: 'POST',
        body: JSON.stringify({
          delta: Number(pointsDelta),
          reason: pointsReason || undefined,
        }),
      }),
    onSuccess: () => {
      invalidate()
      setPointsDelta('')
      setPointsReason('')
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const customers = listQuery.data?.customers ?? []
  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const stats = useMemo(() => {
    const registeredCount = customers.filter((c) => c.isRegistered).length
    const totalSpent = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    return { registeredCount, totalSpent }
  }, [customers])

  const openDetail = (row: AdminCustomerRow) => {
    setSelectedId(row.id)
    setEditName(row.name ?? '')
    setEditNotes(row.notes ?? '')
    setError('')
  }

  const detail = detailQuery.data

  return (
    <div className="page customers-page">
      <header className="page-head">
        <div>
          <h1>مشتریان</h1>
          <p className="page-sub">مدیریت مشتریان، تاریخچه سفارش و امتیاز وفاداری</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> مشتری جدید
          </button>
        </div>
      </header>

      <div className="customers-stats">
        <div className="card stat-card">
          <span>کل مشتریان</span>
          <strong>{formatNumber(total)}</strong>
        </div>
        <div className="card stat-card">
          <span>ثبت‌نام‌شده (صفحه)</span>
          <strong>{formatNumber(stats.registeredCount)}</strong>
        </div>
        <div className="card stat-card">
          <span>مجموع خرید (صفحه)</span>
          <strong>{formatPrice(stats.totalSpent)}</strong>
        </div>
      </div>

      <section className="card customers-toolbar">
        <div className="customers-search">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو با نام یا شماره…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPage(1)
                setSearch(q.trim())
              }
            }}
          />
          <button type="button" className="btn-secondary btn-sm" onClick={() => { setPage(1); setSearch(q.trim()) }}>
            جستجو
          </button>
        </div>
        <select
          value={registered}
          onChange={(e) => {
            setRegistered(e.target.value as typeof registered)
            setPage(1)
          }}
        >
          <option value="all">همه مشتریان</option>
          <option value="true">فقط ثبت‌نام‌شده</option>
          <option value="false">فقط مهمان / صندوق</option>
        </select>
      </section>

      <div className="customers-layout">
        <section className="card customers-table-wrap">
          {listQuery.isLoading ? (
            <p className="field-hint">در حال بارگذاری…</p>
          ) : customers.length === 0 ? (
            <p className="field-hint">مشتری‌ای پیدا نشد.</p>
          ) : (
            <table className="data-table customers-table">
              <thead>
                <tr>
                  <th>مشتری</th>
                  <th>موبایل</th>
                  <th>سفارش</th>
                  <th>مجموع خرید</th>
                  <th>امتیاز</th>
                  <th>آخرین سفارش</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedId === row.id ? 'active' : ''}
                    onClick={() => openDetail(row)}
                  >
                    <td>
                      <div className="customers-name-cell">
                        <strong>{row.name || 'بدون نام'}</strong>
                        {row.isRegistered ? (
                          <span className="badge badge-success">عضو</span>
                        ) : (
                          <span className="badge">مهمان</span>
                        )}
                      </div>
                    </td>
                    <td dir="ltr">{row.phone ?? '—'}</td>
                    <td>{formatNumber(row.orderCount)}</td>
                    <td>{formatPrice(row.totalSpent)}</td>
                    <td>{formatNumber(row.chillPoints)}</td>
                    <td>{row.lastOrderAt ? formatDateTime(row.lastOrderAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="customers-pagination">
            <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronRight size={16} /> قبلی
            </button>
            <span>
              صفحه {formatNumber(page)} از {formatNumber(totalPages)}
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              بعدی <ChevronLeft size={16} />
            </button>
          </div>
        </section>

        <aside className={`card customers-detail ${selectedId ? 'open' : ''}`}>
          {!selectedId ? (
            <div className="customers-detail-empty">
              <User size={40} />
              <p>یک مشتری را انتخاب کنید</p>
            </div>
          ) : detailQuery.isLoading ? (
            <p className="field-hint">در حال بارگذاری جزئیات…</p>
          ) : detail ? (
            <>
              <div className="customers-detail-head">
                <div>
                  <h2>{detail.name || 'بدون نام'}</h2>
                  <p dir="ltr">{detail.phone ?? '—'}</p>
                </div>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setSelectedId(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="customers-detail-stats">
                <div><ShoppingBag size={16} /> {formatNumber(detail.orderCount)} سفارش</div>
                <div><Star size={16} /> {formatNumber(detail.chillPoints)} امتیاز</div>
                <div>{formatPrice(detail.totalSpent)} خرید</div>
              </div>

              {error && <div className="settings-save-error">{error}</div>}

              <div className="form-grid">
                <label className="field field-full">
                  <span>نام</span>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>
                <label className="field field-full">
                  <span>یادداشت داخلی</span>
                  <textarea rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                <Pencil size={14} /> ذخیره تغییرات
              </button>

              <div className="customers-points-box">
                <h3>تغییر امتیاز</h3>
                <div className="form-grid">
                  <label className="field">
                    <span>مقدار (+/-)</span>
                    <input
                      type="number"
                      value={pointsDelta}
                      onChange={(e) => setPointsDelta(e.target.value)}
                      placeholder="مثلاً 50 یا -20"
                    />
                  </label>
                  <label className="field">
                    <span>دلیل</span>
                    <input value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  disabled={!pointsDelta || pointsMutation.isPending}
                  onClick={() => pointsMutation.mutate()}
                >
                  اعمال امتیاز
                </button>
              </div>

              <div className="customers-orders">
                <h3>سفارش‌ها</h3>
                {detail.orders.length === 0 ? (
                  <p className="field-hint">هنوز سفارشی ثبت نشده.</p>
                ) : (
                  <ul>
                    {detail.orders.map((order) => (
                      <li key={order.id}>
                        <div>
                          <strong>{order.code}</strong>
                          <span>{formatDateTime(order.createdAt)}</span>
                        </div>
                        <div>
                          <span>{ORDER_STATUS_LABEL[order.status]}</span>
                          <span>{PAYMENT_STATUS_LABEL[order.paymentStatus ?? 'UNPAID']}</span>
                          <strong>{formatPrice(order.total)}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {detail.loyaltyLedger.length > 0 && (
                <div className="customers-ledger">
                  <h3>گردش امتیاز</h3>
                  <ul>
                    {detail.loyaltyLedger.slice(0, 10).map((entry) => (
                      <li key={entry.id}>
                        <span>{entry.type}</span>
                        <strong>{entry.points > 0 ? '+' : ''}{formatNumber(entry.points)}</strong>
                        <span>{formatDateTime(entry.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </aside>
      </div>

      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>مشتری جدید</h2>
              <button type="button" className="btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {error && <div className="settings-save-error">{error}</div>}
              <div className="form-grid">
                <label className="field field-full">
                  <span>موبایل</span>
                  <input
                    dir="ltr"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="09123456789"
                  />
                </label>
                <label className="field field-full">
                  <span>نام</span>
                  <input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  />
                </label>
                <label className="field field-full">
                  <span>یادداشت</span>
                  <textarea
                    rows={2}
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-ghost" onClick={() => setCreateOpen(false)}>
                انصراف
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={!createForm.phone.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                <Phone size={16} /> ثبت مشتری
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
