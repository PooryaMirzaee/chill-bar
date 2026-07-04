import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Plus, Save, Search, Zap } from 'lucide-react'
import type { Category } from '@chill-bar/shared'
import { parseMenuModifiers } from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import './quick-entry.css'

interface AdminItem {
  id: string
  name: string
  price: number
  emoji: string
  description: string
  tags: Record<string, number>
  imageUrl: string | null
  modifiers: unknown
  isAvailable: boolean
  categoryId: string
}

interface QuickRow {
  id: string
  name: string
  price: string
  emoji: string
  description: string
  categoryId: string
  isAvailable: boolean
  isNew: boolean
  dirty: boolean
  saving: boolean
  error?: string
  modifiers: unknown
  imageUrl: string | null
  tags: Record<string, number>
}

function itemToRow(item: AdminItem): QuickRow {
  return {
    id: item.id,
    name: item.name,
    price: String(item.price),
    emoji: item.emoji || '🍽️',
    description: item.description ?? '',
    categoryId: item.categoryId,
    isAvailable: item.isAvailable,
    isNew: false,
    dirty: false,
    saving: false,
    modifiers: item.modifiers,
    imageUrl: item.imageUrl,
    tags: item.tags ?? {},
  }
}

function newRow(categoryId: string, seq: number): QuickRow {
  return {
    id: `new-${Date.now()}-${seq}`,
    name: '',
    price: '',
    emoji: '🍽️',
    description: '',
    categoryId,
    isAvailable: true,
    isNew: true,
    dirty: true,
    saving: false,
    modifiers: [],
    imageUrl: null,
    tags: {},
  }
}

function rowPayload(row: QuickRow) {
  return {
    name: row.name.trim(),
    price: Number(row.price) || 0,
    emoji: row.emoji.trim() || '🍽️',
    description: row.description.trim(),
    category: row.categoryId,
    tags: row.tags,
    imageUrl: row.imageUrl,
    modifiers: parseMenuModifiers(row.modifiers),
    isAvailable: row.isAvailable,
  }
}

export function MenuQuickEntry() {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<QuickRow[]>([])
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [statusMsg, setStatusMsg] = useState('')
  const newRowSeq = useRef(0)
  const nameInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Category[]>('/api/admin/categories'),
  })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => api<AdminItem[]>('/api/admin/items'),
  })

  useEffect(() => {
    setRows((prev) => {
      const pendingNew = prev.filter((r) => r.isNew)
      const mapped = items.map((item) => {
        const dirty = prev.find((p) => p.id === item.id && p.dirty)
        return dirty ?? itemToRow(item)
      })
      return [...pendingNew, ...mapped]
    })
  }, [items])

  const dirtyCount = useMemo(() => rows.filter((r) => r.dirty).length, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (activeCat !== 'all' && row.categoryId !== activeCat) return false
      if (!q) return true
      return (
        row.name.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.price.includes(q)
      )
    })
  }, [rows, search, activeCat])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-items'] })
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  const patchRow = useCallback((id: string, patch: Partial<QuickRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, ...patch, dirty: patch.dirty ?? true, error: undefined } : row,
      ),
    )
  }, [])

  const saveRowData = useCallback(async (row: QuickRow): Promise<boolean> => {
    if (!row.dirty) return true
    if (!row.name.trim() || !row.categoryId) {
      patchRow(row.id, { error: 'نام و دسته الزامی است' })
      return false
    }

    patchRow(row.id, { saving: true, error: undefined })
    const body = JSON.stringify(rowPayload(row))

    try {
      if (row.isNew) {
        const created = await api<AdminItem>('/api/admin/items', { method: 'POST', body })
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...itemToRow(created), dirty: false, saving: false, isNew: false }
              : r,
          ),
        )
      } else {
        await api(`/api/admin/items/${row.id}`, { method: 'PUT', body })
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, dirty: false, saving: false, error: undefined } : r,
          ),
        )
      }
      invalidate()
      return true
    } catch (err) {
      patchRow(row.id, {
        saving: false,
        error: err instanceof Error ? err.message : 'ذخیره ناموفق',
      })
      return false
    }
  }, [patchRow])

  const saveRow = useCallback(
    async (rowId: string): Promise<boolean> => {
      const row = rows.find((r) => r.id === rowId)
      if (!row) return false
      return saveRowData(row)
    },
    [rows, saveRowData],
  )

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const dirty = rows.filter((r) => r.dirty)
      let ok = 0
      for (const row of dirty) {
        const success = await saveRowData(row)
        if (success) ok++
      }
      return { total: dirty.length, ok }
    },
    onSuccess: ({ total, ok }) => {
      setStatusMsg(total === 0 ? 'تغییری برای ذخیره نیست' : `${ok} از ${total} ردیف ذخیره شد`)
      setTimeout(() => setStatusMsg(''), 3000)
    },
  })

  const addNewRow = () => {
    const categoryId =
      activeCat !== 'all' ? activeCat : categories[0]?.id ?? ''
    newRowSeq.current += 1
    const row = newRow(categoryId, newRowSeq.current)
    setRows((prev) => [row, ...prev])
    setTimeout(() => nameInputRefs.current[row.id]?.focus(), 50)
  }

  const handleRowKeyDown = async (
    e: React.KeyboardEvent,
    row: QuickRow,
    field: 'name' | 'price' | 'emoji' | 'description',
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (field === 'price' || field === 'description') {
        await saveRow(row.id)
        const idx = filtered.findIndex((r) => r.id === row.id)
        const next = filtered[idx + 1]
        if (next) nameInputRefs.current[next.id]?.focus()
      }
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveAllMutation.mutate()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [saveAllMutation])

  return (
    <div className="page quick-entry-page">
      <header className="page-head">
        <div>
          <div className="quick-entry-breadcrumb">
            <Link to="/menu" className="quick-entry-back">
              <ArrowRight size={16} />
              منو
            </Link>
          </div>
          <h1>
            <Zap size={24} className="quick-entry-title-icon" />
            ورود سریع قیمت و منو
          </h1>
          <p className="page-sub">
            نام، قیمت و جزئیات را سریع وارد کنید — Enter روی قیمت = ذخیره ردیف — Ctrl+S = ذخیره همه
          </p>
        </div>
        <div className="page-actions">
          {statusMsg && <span className="quick-entry-status">{statusMsg}</span>}
          {dirtyCount > 0 && (
            <span className="quick-entry-dirty-badge">{dirtyCount.toLocaleString('fa-IR')} تغییر</span>
          )}
          <button type="button" className="btn-secondary" onClick={addNewRow}>
            <Plus size={18} /> ردیف جدید
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={dirtyCount === 0 || saveAllMutation.isPending}
            onClick={() => saveAllMutation.mutate()}
          >
            <Save size={18} />
            ذخیره همه
          </button>
        </div>
      </header>

      <div className="quick-entry-toolbar">
        <label className="quick-entry-search">
          <Search size={18} />
          <input
            placeholder="جستجو نام یا قیمت…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="chip-row">
          <button
            type="button"
            className={`chip ${activeCat === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCat('all')}
          >
            همه
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${activeCat === c.id ? 'active' : ''}`}
              onClick={() => setActiveCat(c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: 400 }} />
      ) : (
        <div className="quick-entry-table-wrap">
          <table className="quick-entry-table">
            <thead>
              <tr>
                <th>ایموجی</th>
                <th>نام</th>
                <th>قیمت (تومان)</th>
                <th>دسته</th>
                <th>توضیح</th>
                <th>موجود</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="quick-entry-empty">
                    آیتمی نیست — «ردیف جدید» بزنید
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={[
                      row.dirty ? 'is-dirty' : '',
                      row.isNew ? 'is-new' : '',
                      row.error ? 'has-error' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td>
                      <input
                        className="qe-input qe-input-emoji"
                        value={row.emoji}
                        onChange={(e) => patchRow(row.id, { emoji: e.target.value })}
                        aria-label="ایموجی"
                      />
                    </td>
                    <td>
                      <input
                        ref={(el) => {
                          nameInputRefs.current[row.id] = el
                        }}
                        className="qe-input qe-input-name"
                        value={row.name}
                        placeholder="نام آیتم"
                        onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'name')}
                      />
                    </td>
                    <td>
                      <input
                        className="qe-input qe-input-price"
                        type="number"
                        min={0}
                        step={1000}
                        dir="ltr"
                        value={row.price}
                        placeholder="0"
                        onChange={(e) => patchRow(row.id, { price: e.target.value })}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'price')}
                      />
                      {row.price && (
                        <span className="qe-price-hint">{formatPrice(Number(row.price) || 0)}</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="qe-input qe-select"
                        value={row.categoryId}
                        onChange={(e) => patchRow(row.id, { categoryId: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="qe-input qe-input-desc"
                        value={row.description}
                        placeholder="اختیاری"
                        onChange={(e) => patchRow(row.id, { description: e.target.value })}
                        onKeyDown={(e) => handleRowKeyDown(e, row, 'description')}
                      />
                    </td>
                    <td className="qe-cell-center">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={row.isAvailable}
                          onChange={(e) =>
                            patchRow(row.id, { isAvailable: e.target.checked })
                          }
                        />
                        <span className="switch-track" />
                      </label>
                    </td>
                    <td className="qe-status-cell">
                      {row.saving ? (
                        <span className="qe-status saving">…</span>
                      ) : row.error ? (
                        <span className="qe-status error" title={row.error}>
                          خطا
                        </span>
                      ) : row.dirty ? (
                        <button
                          type="button"
                          className="qe-save-one"
                          onClick={() => void saveRow(row.id)}
                        >
                          ذخیره
                        </button>
                      ) : (
                        <span className="qe-status saved">✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="quick-entry-hint">
        میانبر: <kbd>Enter</kbd> روی قیمت یا توضیح = ذخیره و رفتن به ردیف بعد —{' '}
        <kbd>Ctrl</kbd>+<kbd>S</kbd> = ذخیره همه تغییرات
      </p>
    </div>
  )
}
