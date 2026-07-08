import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ImagePlus, Loader2, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Category, MenuModifierGroup } from '@chill-bar/shared'
import { parseMenuModifiers, menuItemOpensIceCreamBuilder } from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import { uploadImage, resolveAssetUrl } from '../lib/upload'
import { CategoryManager } from '../components/CategoryManager'

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

interface ItemForm {
  id: string
  name: string
  price: number
  emoji: string
  description: string
  category: string
  imageUrl: string
  modifiers: MenuModifierGroup[]
  isAvailable: boolean
  opensIceCreamBuilder: boolean
  tags: Record<string, number>
}

const emptyForm: ItemForm = {
  id: '',
  name: '',
  price: 0,
  emoji: '🍽️',
  description: '',
  category: '',
  imageUrl: '',
  modifiers: [],
  isAvailable: true,
  opensIceCreamBuilder: false,
  tags: {},
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function MenuItemImageUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const src = resolveAssetUrl(value || null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setUploadError('')
    try {
      const url = await uploadImage(file)
      onChange(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'آپلود ناموفق بود')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="appearance-upload field-full">
      <div className="appearance-upload-head">
        <div>
          <strong>تصویر آیتم</strong>
          <p>PNG، JPG یا WebP — حداکثر ۱.۵ مگابایت</p>
        </div>
        <div className="appearance-upload-actions">
          {value && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => onChange('')}>
              <Trash2 size={16} /> حذف
            </button>
          )}
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 size={16} className="spin" /> : <ImagePlus size={16} />}
            {value ? 'تغییر' : 'آپلود'}
          </button>
        </div>
      </div>
      <div className="appearance-preview" onClick={() => inputRef.current?.click()}>
        {src ? (
          <img src={src} alt="تصویر آیتم" />
        ) : (
          <span className="appearance-preview-empty">
            <ImagePlus size={28} />
            <span>کلیک برای انتخاب تصویر</span>
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      {uploadError && <p className="upload-error">{uploadError}</p>}
      {value && !uploadError && (
        <p className="upload-hint">پس از آپلود حتماً «ذخیره» را بزنید تا تصویر ثبت شود.</p>
      )}
    </div>
  )
}

function ModifiersEditor({
  groups,
  onChange,
}: {
  groups: MenuModifierGroup[]
  onChange: (groups: MenuModifierGroup[]) => void
}) {
  const updateGroup = (index: number, patch: Partial<MenuModifierGroup>) => {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...patch } : group)))
  }

  const removeGroup = (index: number) => {
    onChange(groups.filter((_, i) => i !== index))
  }

  const addGroup = () => {
    onChange([
      ...groups,
      {
        id: newId('group'),
        name: 'گزینه جدید',
        type: 'multiple',
        required: false,
        options: [{ id: newId('opt'), name: 'گزینه ۱', price: 0 }],
      },
    ])
  }

  return (
    <div className="modifiers-editor field-full">
      <div className="modifiers-editor-head">
        <div>
          <strong>افزودنی‌ها و آپشن‌ها</strong>
          <p>مثلاً شکر/شیر برای قهوه یا سودا برای آبمیوه</p>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={addGroup}>
          <Plus size={16} /> گروه جدید
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="modifiers-empty">هنوز آپشنی تعریف نشده — در صورت نیاز «گروه جدید» بزنید.</p>
      ) : (
        <div className="modifiers-groups">
          {groups.map((group, groupIndex) => (
            <div key={group.id} className="modifier-group card">
              <div className="modifier-group-head">
                <input
                  className="modifier-group-name"
                  value={group.name}
                  placeholder="نام گروه (مثلاً شیر)"
                  onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                />
                <select
                  value={group.type}
                  onChange={(e) =>
                    updateGroup(groupIndex, { type: e.target.value as MenuModifierGroup['type'] })
                  }
                >
                  <option value="multiple">چند انتخابی</option>
                  <option value="single">تک انتخابی</option>
                </select>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={!!group.required}
                    onChange={(e) => updateGroup(groupIndex, { required: e.target.checked })}
                  />
                  <span>اجباری</span>
                </label>
                <button
                  type="button"
                  className="icon-btn-sm danger"
                  onClick={() => removeGroup(groupIndex)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="modifier-options">
                {group.options.map((option, optionIndex) => (
                  <div key={option.id} className="modifier-option-row">
                    <input
                      value={option.name}
                      placeholder="نام گزینه"
                      onChange={(e) => {
                        const options = group.options.map((opt, i) =>
                          i === optionIndex ? { ...opt, name: e.target.value } : opt,
                        )
                        updateGroup(groupIndex, { options })
                      }}
                    />
                    <input
                      type="number"
                      value={option.price}
                      placeholder="قیمت"
                      onChange={(e) => {
                        const options = group.options.map((opt, i) =>
                          i === optionIndex ? { ...opt, price: Number(e.target.value) } : opt,
                        )
                        updateGroup(groupIndex, { options })
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn-sm danger"
                      disabled={group.options.length <= 1}
                      onClick={() => {
                        updateGroup(groupIndex, {
                          options: group.options.filter((_, i) => i !== optionIndex),
                        })
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() =>
                  updateGroup(groupIndex, {
                    options: [
                      ...group.options,
                      { id: newId('opt'), name: `گزینه ${group.options.length + 1}`, price: 0 },
                    ],
                  })
                }
              >
                <Plus size={14} /> گزینه
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MenuManager() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'items' | 'categories'>('items')
  const [activeCat, setActiveCat] = useState<string>('all')
  const [form, setForm] = useState<ItemForm | null>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Category[]>('/api/admin/categories'),
  })
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => api<AdminItem[]>('/api/admin/items'),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-items'] })
    queryClient.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  const saveMutation = useMutation({
    mutationFn: (data: ItemForm) => {
      const tags = { ...data.tags }
      if (data.opensIceCreamBuilder) tags.iceCreamBuilder = 1
      else delete tags.iceCreamBuilder
      const body = JSON.stringify({
        name: data.name,
        price: Number(data.price),
        emoji: data.emoji,
        description: data.description,
        category: data.category,
        tags,
        imageUrl: data.imageUrl || null,
        modifiers: data.modifiers,
        isAvailable: data.isAvailable,
      })
      return data.id
        ? api(`/api/admin/items/${data.id}`, { method: 'PUT', body })
        : api('/api/admin/items', { method: 'POST', body })
    },
    onSuccess: () => {
      invalidate()
      setForm(null)
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api(`/api/admin/items/${id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable }),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/items/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1
    }
    return counts
  }, [items])

  const filtered = useMemo(
    () => (activeCat === 'all' ? items : items.filter((i) => i.categoryId === activeCat)),
    [items, activeCat],
  )

  const openNew = () =>
    setForm({ ...emptyForm, category: categories[0]?.id ?? '' })
  const openEdit = (item: AdminItem) =>
    setForm({
      id: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji,
      description: item.description,
      category: item.categoryId,
      imageUrl: item.imageUrl ?? '',
      modifiers: parseMenuModifiers(item.modifiers),
      isAvailable: item.isAvailable,
      opensIceCreamBuilder: menuItemOpensIceCreamBuilder(item.tags),
      tags: item.tags ?? {},
    })

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>مدیریت منو</h1>
          <p className="page-sub">{items.length} آیتم در {categories.length} دسته</p>
        </div>
        <div className="page-actions">
          <button
            className={`btn-ghost ${view === 'categories' ? 'active' : ''}`}
            onClick={() => setView(view === 'categories' ? 'items' : 'categories')}
          >
            {view === 'categories' ? 'بازگشت به آیتم‌ها' : 'مدیریت دسته‌ها'}
          </button>
          {view === 'items' && (
            <>
              <Link to="/menu/quick" className="btn-secondary">
                <Zap size={18} /> ورود سریع
              </Link>
              <button className="btn-primary" onClick={openNew}>
                <Plus size={18} /> آیتم جدید
              </button>
            </>
          )}
        </div>
      </header>

      {view === 'categories' ? (
        <CategoryManager categories={categories} itemCounts={itemCounts} />
      ) : (
        <>
      <div className="chip-row">
        <button
          className={`chip ${activeCat === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          همه
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`chip ${activeCat === c.id ? 'active' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card skeleton" style={{ height: 320 }} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>آیتم</th>
                <th>دسته</th>
                <th>قیمت</th>
                <th>آپشن</th>
                <th>موجودی</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const modifierCount = parseMenuModifiers(item.modifiers).length
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-item">
                        {item.imageUrl ? (
                          <img
                            className="cell-thumb"
                            src={resolveAssetUrl(item.imageUrl) ?? undefined}
                            alt=""
                          />
                        ) : (
                          <span className="cell-emoji">{item.emoji}</span>
                        )}
                        <div>
                          <strong>{item.name}</strong>
                          {item.description && <span className="cell-desc">{item.description}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{categories.find((c) => c.id === item.categoryId)?.name}</td>
                    <td>{formatPrice(item.price)}</td>
                    <td>{modifierCount > 0 ? `${modifierCount} گروه` : '—'}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item.isAvailable}
                          onChange={(e) =>
                            availabilityMutation.mutate({
                              id: item.id,
                              isAvailable: e.target.checked,
                            })
                          }
                        />
                        <span className="switch-track" />
                      </label>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn-sm" onClick={() => openEdit(item)}>
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-btn-sm danger"
                          onClick={() => {
                            if (confirm(`حذف «${item.name}»؟`)) deleteMutation.mutate(item.id)
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {view === 'items' && form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{form.id ? 'ویرایش آیتم' : 'آیتم جدید'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)}>
                ✕
              </button>
            </header>
            <div className="modal-body form-grid">
              <label className="field">
                <span>نام</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">
                <span>قیمت (تومان)</span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>دسته</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>ایموجی</span>
                <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>توضیحات</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </label>
              <MenuItemImageUpload
                value={form.imageUrl}
                onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              />
              <ModifiersEditor
                groups={form.modifiers}
                onChange={(modifiers) => setForm({ ...form, modifiers })}
              />
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.opensIceCreamBuilder}
                  onChange={(e) => setForm({ ...form, opensIceCreamBuilder: e.target.checked })}
                />
                <span>ساخت بستنی سفارشی در صندوق (فقط این آیتم)</span>
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                />
                <span>موجود است</span>
              </label>
            </div>
            <footer className="modal-foot">
              <button className="btn-ghost" onClick={() => setForm(null)}>
                انصراف
              </button>
              <button
                className="btn-primary"
                disabled={!form.name || !form.category || saveMutation.isPending}
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
