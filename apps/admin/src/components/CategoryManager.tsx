import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import type { Category } from '@chill-bar/shared'
import { DEFAULT_CATEGORY_ACCENT } from '@chill-bar/shared'
import { api } from '../lib/api'

interface CategoryForm {
  id: string
  name: string
  emoji: string
  accentColor: string
  isIceCreamHub: boolean
  showCustomBadge: boolean
  isNew?: boolean
}

const emptyCategory: CategoryForm = {
  id: '',
  name: '',
  emoji: '🍽️',
  accentColor: DEFAULT_CATEGORY_ACCENT,
  isIceCreamHub: false,
  showCustomBadge: false,
  isNew: true,
}

interface Props {
  categories: Category[]
  itemCounts: Record<string, number>
}

export function CategoryManager({ categories, itemCounts }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CategoryForm | null>(null)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  const saveMutation = useMutation({
    mutationFn: (data: CategoryForm) => {
      const body = JSON.stringify({
        id: data.id || undefined,
        name: data.name,
        emoji: data.emoji,
        accentColor: data.accentColor,
        isIceCreamHub: data.isIceCreamHub,
        showCustomBadge: data.showCustomBadge,
      })
      return data.isNew
        ? api('/api/admin/categories', { method: 'POST', body })
        : api(`/api/admin/categories/${data.id}`, { method: 'PUT', body })
    },
    onSuccess: () => {
      invalidate()
      setForm(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/categories/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const reorderMutation = useMutation({
    mutationFn: (order: string[]) =>
      api('/api/admin/categories/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ order }),
      }),
    onSuccess: invalidate,
  })

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= categories.length) return
    const order = categories.map((c) => c.id)
    const [item] = order.splice(index, 1)
    order.splice(next, 0, item)
    reorderMutation.mutate(order)
  }

  const openEdit = (cat: Category) =>
    setForm({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      accentColor: cat.accentColor ?? DEFAULT_CATEGORY_ACCENT,
      isIceCreamHub: cat.isIceCreamHub ?? false,
      showCustomBadge: cat.showCustomBadge ?? false,
    })

  return (
    <div className="category-manager">
      <div className="page-actions" style={{ marginBottom: '1rem' }}>
        <button className="btn-secondary" onClick={() => setForm({ ...emptyCategory })}>
          <Plus size={18} /> دسته جدید
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ترتیب</th>
              <th>دسته</th>
              <th>رنگ</th>
              <th>ویژگی</th>
              <th>آیتم</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, index) => (
              <tr key={cat.id}>
                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="icon-btn-sm"
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn-sm"
                      disabled={index === categories.length - 1 || reorderMutation.isPending}
                      onClick={() => move(index, 1)}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="cell-item">
                    <span className="cell-emoji">{cat.emoji}</span>
                    <div>
                      <strong>{cat.name}</strong>
                      <span className="cell-desc">{cat.id}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="color-swatch"
                    style={{ background: cat.accentColor ?? DEFAULT_CATEGORY_ACCENT }}
                    title={cat.accentColor}
                  />
                </td>
                <td>
                  {cat.isIceCreamHub && <span className="chip active">بستنی سفارشی</span>}
                  {cat.showCustomBadge && !cat.isIceCreamHub && (
                    <span className="chip">نشان سفارشی</span>
                  )}
                </td>
                <td>{itemCounts[cat.id] ?? 0}</td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn-sm" onClick={() => openEdit(cat)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-btn-sm danger"
                      onClick={() => {
                        if (confirm(`حذف دسته «${cat.name}»؟`)) deleteMutation.mutate(cat.id)
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{form.isNew ? 'دسته جدید' : 'ویرایش دسته'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)}>
                ✕
              </button>
            </header>
            <div className="modal-body form-grid">
              {form.isNew && (
                <label className="field field-full">
                  <span>شناسه (انگلیسی)</span>
                  <input
                    value={form.id}
                    placeholder="مثلاً: special-drinks"
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                <span>نام</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">
                <span>ایموجی</span>
                <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
              </label>
              <label className="field">
                <span>رنگ accent</span>
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                />
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.isIceCreamHub}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isIceCreamHub: e.target.checked,
                      showCustomBadge: e.target.checked ? true : form.showCustomBadge,
                    })
                  }
                />
                <span>تب بستنی سفارشی (فقط یک دسته)</span>
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.showCustomBadge}
                  onChange={(e) => setForm({ ...form, showCustomBadge: e.target.checked })}
                />
                <span>نشان «سفارشی» در صفحه اصلی</span>
              </label>
            </div>
            <footer className="modal-foot">
              <button className="btn-ghost" onClick={() => setForm(null)}>
                انصراف
              </button>
              <button
                className="btn-primary"
                disabled={!form.name || (form.isNew && !form.id) || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                ذخیره
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
