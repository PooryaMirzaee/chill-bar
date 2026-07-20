import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Wallet,
  X,
  Check,
} from 'lucide-react'
import type {
  ExpenseCategory,
  ExpenseListResponse,
  ExpensePaymentMethod,
  ExpenseRow,
} from '@chill-bar/shared'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_EMOJI,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_PAYMENT_LABEL,
  EXPENSE_PAYMENT_METHODS,
  formatJalaliDisplay,
  todayIsoDate,
  todayJalali,
} from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatNumber, formatPrice } from '../lib/format'
import { JalaliDatePicker, JalaliMonthNav } from '../components/JalaliDatePicker'
import { useAuth } from '../lib/auth'

interface ExpenseForm {
  id: string
  title: string
  amount: string
  category: ExpenseCategory
  paymentMethod: ExpensePaymentMethod
  vendor: string
  note: string
  expenseDate: string
}

const emptyForm = (): ExpenseForm => ({
  id: '',
  title: '',
  amount: '',
  category: 'SUPPLIES',
  paymentMethod: 'CASH',
  vendor: '',
  note: '',
  expenseDate: todayIsoDate(),
})

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

function formatAmountInput(raw: string): string {
  const n = parseAmount(raw)
  return n ? n.toLocaleString('fa-IR') : ''
}

export function Expenses() {
  const { user } = useAuth()
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'MANAGER'
  const queryClient = useQueryClient()
  const today = todayJalali()
  const [jy, setJy] = useState(today.jy)
  const [jm, setJm] = useState(today.jm)
  const [category, setCategory] = useState<ExpenseCategory | 'ALL'>('ALL')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [quick, setQuick] = useState(emptyForm)
  const [edit, setEdit] = useState<ExpenseForm | null>(null)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['expenses', jy, jm, category, search],
    queryFn: () => {
      const params = new URLSearchParams({
        jy: String(jy),
        jm: String(jm),
        limit: '100',
      })
      if (category !== 'ALL') params.set('category', category)
      if (search) params.set('q', search)
      return api<ExpenseListResponse>(`/api/admin/expenses?${params}`)
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expenses'] })

  const saveMutation = useMutation({
    mutationFn: (form: ExpenseForm) => {
      const amount = parseAmount(form.amount)
      if (!form.title.trim()) throw new Error('عنوان لازم است')
      if (amount <= 0) throw new Error('مبلغ را وارد کنید')
      const body = JSON.stringify({
        title: form.title.trim(),
        amount,
        category: form.category,
        paymentMethod: form.paymentMethod,
        vendor: form.vendor.trim() || null,
        note: form.note.trim() || null,
        expenseDate: form.expenseDate,
      })
      return form.id
        ? api(`/api/admin/expenses/${form.id}`, { method: 'PUT', body })
        : api('/api/admin/expenses', { method: 'POST', body })
    },
    onSuccess: () => {
      invalidate()
      setQuick(emptyForm())
      setEdit(null)
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate()
      setDeleteId(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const expenses = listQuery.data?.expenses ?? []
  const summary = listQuery.data?.summary

  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>()
    for (const row of expenses) {
      const list = map.get(row.expenseDate) ?? []
      list.push(row)
      map.set(row.expenseDate, list)
    }
    return [...map.entries()]
  }, [expenses])

  const openEdit = (row: ExpenseRow) => {
    setEdit({
      id: row.id,
      title: row.title,
      amount: String(row.amount),
      category: row.category,
      paymentMethod: row.paymentMethod,
      vendor: row.vendor ?? '',
      note: row.note ?? '',
      expenseDate: row.expenseDate,
    })
    setError('')
  }

  const submitQuick = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setError('')
    saveMutation.mutate(quick)
  }

  return (
    <div className="page expenses-page">
      <header className="page-head">
        <div>
          <h1>هزینه‌ها</h1>
          <p className="page-sub">ثبت سریع خریدها و هزینه‌های فروشگاه با تاریخ شمسی</p>
        </div>
      </header>

      {canEdit && (
        <section className="card expense-quick-card">
          <div className="expense-quick-head">
            <Wallet size={18} />
            <strong>ثبت سریع هزینه</strong>
            <span>Enter برای ذخیره</span>
          </div>
          {error && !edit && <div className="settings-save-error">{error}</div>}
          <form className="expense-quick-form" onSubmit={submitQuick}>
            <label className="field expense-amount-field">
              <span>مبلغ (تومان)</span>
              <input
                inputMode="numeric"
                autoFocus
                placeholder="مثلاً ۲۵۰٬۰۰۰"
                value={formatAmountInput(quick.amount)}
                onChange={(e) => setQuick({ ...quick, amount: e.target.value })}
              />
            </label>
            <label className="field expense-title-field">
              <span>عنوان</span>
              <input
                placeholder="چی خریدی؟ مثلاً شیر، قهوه، گاز…"
                value={quick.title}
                onChange={(e) => setQuick({ ...quick, title: e.target.value })}
              />
            </label>
            <JalaliDatePicker
              value={quick.expenseDate}
              onChange={(expenseDate) => setQuick({ ...quick, expenseDate })}
            />
            <div className="expense-cat-chips">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`expense-chip ${quick.category === cat ? 'active' : ''}`}
                  onClick={() => setQuick({ ...quick, category: cat })}
                >
                  {EXPENSE_CATEGORY_EMOJI[cat]} {EXPENSE_CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>
            <div className="expense-quick-row">
              <label className="field">
                <span>پرداخت</span>
                <select
                  value={quick.paymentMethod}
                  onChange={(e) =>
                    setQuick({ ...quick, paymentMethod: e.target.value as ExpensePaymentMethod })
                  }
                >
                  {EXPENSE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {EXPENSE_PAYMENT_LABEL[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>فروشنده / فروشگاه</span>
                <input
                  placeholder="اختیاری"
                  value={quick.vendor}
                  onChange={(e) => setQuick({ ...quick, vendor: e.target.value })}
                />
              </label>
              <button
                type="submit"
                className="btn-primary"
                disabled={saveMutation.isPending}
              >
                <Plus size={18} />
                {saveMutation.isPending ? '…' : 'ثبت'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="expenses-toolbar card">
        <JalaliMonthNav
          jy={jy}
          jm={jm}
          onChange={(nextJy, nextJm) => {
            setJy(nextJy)
            setJm(nextJm)
          }}
        />
        <div className="expenses-search">
          <Search size={16} />
          <input
            value={q}
            placeholder="جستجو در عنوان یا فروشنده…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSearch(q.trim())
            }}
          />
          <button type="button" className="btn-ghost btn-sm" onClick={() => setSearch(q.trim())}>
            جستجو
          </button>
        </div>
        <div className="expense-filter-chips">
          <button
            type="button"
            className={`expense-chip ${category === 'ALL' ? 'active' : ''}`}
            onClick={() => setCategory('ALL')}
          >
            همه
          </button>
          {EXPENSE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`expense-chip ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {EXPENSE_CATEGORY_EMOJI[cat]}
            </button>
          ))}
        </div>
      </section>

      <div className="expenses-stats">
        <div className="card stat-card stat-orange">
          <div className="stat-body">
            <span className="stat-label">جمع این ماه</span>
            <strong className="stat-value">
              {formatPrice(summary?.totalAmount ?? 0)}
            </strong>
          </div>
        </div>
        <div className="card stat-card stat-blue">
          <div className="stat-body">
            <span className="stat-label">تعداد ثبت</span>
            <strong className="stat-value">
              {formatNumber(summary?.count ?? 0)}
            </strong>
          </div>
        </div>
        <div className="card expense-cat-summary">
          {(summary?.byCategory ?? []).slice(0, 4).map((row) => (
            <div key={row.category} className="expense-cat-summary-row">
              <span>
                {EXPENSE_CATEGORY_EMOJI[row.category]} {EXPENSE_CATEGORY_LABEL[row.category]}
              </span>
              <strong>{formatPrice(row.amount)}</strong>
            </div>
          ))}
          {(summary?.byCategory?.length ?? 0) === 0 && (
            <p className="empty-hint">هنوز هزینه‌ای در این ماه نیست</p>
          )}
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="card skeleton" style={{ height: 220 }} />
      ) : grouped.length === 0 ? (
        <div className="card empty-hint" style={{ padding: 32, textAlign: 'center' }}>
          هزینه‌ای برای این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="expense-day-groups">
          {grouped.map(([date, rows]) => {
            const dayTotal = rows.reduce((s, r) => s + r.amount, 0)
            return (
              <section key={date} className="card expense-day-group">
                <header className="expense-day-head">
                  <strong>{formatJalaliDisplay(date, true)}</strong>
                  <span>{formatPrice(dayTotal)}</span>
                </header>
                <ul className="expense-list">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <div className="expense-list-main">
                        <span className="expense-list-emoji">
                          {EXPENSE_CATEGORY_EMOJI[row.category]}
                        </span>
                        <div>
                          <strong>{row.title}</strong>
                          <p>
                            {EXPENSE_CATEGORY_LABEL[row.category]}
                            {row.vendor ? ` · ${row.vendor}` : ''}
                            {' · '}
                            {EXPENSE_PAYMENT_LABEL[row.paymentMethod]}
                            {row.createdByName ? ` · ${row.createdByName}` : ''}
                          </p>
                          {row.note && <p className="expense-note">{row.note}</p>}
                        </div>
                      </div>
                      <div className="expense-list-side">
                        <strong>{formatPrice(row.amount)}</strong>
                        {canEdit && (
                          <div className="row-actions">
                            <button
                              type="button"
                              className="icon-btn-sm"
                              onClick={() => openEdit(row)}
                              title="ویرایش"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn-sm danger"
                              onClick={() => setDeleteId(row.id)}
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>ویرایش هزینه</h2>
              <button type="button" className="icon-btn" onClick={() => setEdit(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body form-grid">
              {error && <div className="settings-save-error field-full">{error}</div>}
              <label className="field">
                <span>مبلغ</span>
                <input
                  inputMode="numeric"
                  value={formatAmountInput(edit.amount)}
                  onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                />
              </label>
              <label className="field">
                <span>عنوان</span>
                <input
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              <div className="field">
                <JalaliDatePicker
                  value={edit.expenseDate}
                  onChange={(expenseDate) => setEdit({ ...edit, expenseDate })}
                />
              </div>
              <label className="field">
                <span>دسته‌بندی</span>
                <select
                  value={edit.category}
                  onChange={(e) =>
                    setEdit({ ...edit, category: e.target.value as ExpenseCategory })
                  }
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {EXPENSE_CATEGORY_EMOJI[cat]} {EXPENSE_CATEGORY_LABEL[cat]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>پرداخت</span>
                <select
                  value={edit.paymentMethod}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      paymentMethod: e.target.value as ExpensePaymentMethod,
                    })
                  }
                >
                  {EXPENSE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {EXPENSE_PAYMENT_LABEL[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>فروشنده</span>
                <input
                  value={edit.vendor}
                  onChange={(e) => setEdit({ ...edit, vendor: e.target.value })}
                />
              </label>
              <label className="field field-full">
                <span>یادداشت</span>
                <textarea
                  rows={2}
                  value={edit.note}
                  onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                />
              </label>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-ghost" onClick={() => setEdit(null)}>
                انصراف
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(edit)}
              >
                <Check size={16} /> ذخیره
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>حذف هزینه</h2>
            </div>
            <div className="modal-body">
              <p>این هزینه حذف شود؟ این کار قابل برگشت نیست.</p>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn-ghost" onClick={() => setDeleteId(null)}>
                انصراف
              </button>
              <button
                type="button"
                className="btn-primary danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteId)}
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
