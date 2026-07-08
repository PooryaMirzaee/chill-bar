import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react'
import type { IceCreamBuilderSettings, IceCreamOption, IceCreamOptions, IceCreamVisualProfile } from '@chill-bar/shared'
import {
  DEFAULT_ICE_CREAM_BUILDER_SETTINGS,
  ICE_CREAM_COATING_STYLES,
  ICE_CREAM_FILLING_STYLES,
  ICE_CREAM_NUT_TEXTURES,
  ICE_CREAM_TEXTURE_KINDS,
  defaultVisualProfileForType,
  deriveBaseColors,
} from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatPrice } from '../lib/format'
import { IceCreamBarRenderer } from '../components/IceCreamBarPreview'

type OptionType = 'BASE' | 'COATING' | 'FILLING'

const TYPE_LABELS: Record<OptionType, string> = {
  BASE: 'پایه‌ها',
  COATING: 'روکش / لعاب',
  FILLING: 'فیلینگ',
}

function emptyOption(type: OptionType): IceCreamOption & { type: OptionType } {
  const color = type === 'COATING' ? '#8b6914' : '#f5e6c8'
  return {
    id: '',
    type,
    name: '',
    color,
    texture: null,
    priceMod: 0,
    emoji: '🍦',
    isActive: true,
    visualProfile: defaultVisualProfileForType(type, color),
  } as IceCreamOption & { type: OptionType }
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40)
}

function parsePriceInput(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

export function IceCreamManager() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ice-cream'],
    queryFn: () => api<IceCreamOptions>('/api/admin/ice-cream'),
  })

  const [settings, setSettings] = useState<IceCreamBuilderSettings>(DEFAULT_ICE_CREAM_BUILDER_SETTINGS)
  const [settingsDirty, setSettingsDirty] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [optionError, setOptionError] = useState<string | null>(null)
  const settingsSyncedRef = useRef(false)
  const [tab, setTab] = useState<OptionType>('BASE')
  const [editing, setEditing] = useState<(IceCreamOption & { type?: OptionType }) | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!data) return
    if (!settingsSyncedRef.current || !settingsDirty) {
      setSettings({
        basePrice: data.basePrice,
        minPrice: data.minPrice,
        enabled: data.enabled,
        smartSuggestions: data.smartSuggestions,
        builderMode: data.builderMode ?? 'studio',
      })
      settingsSyncedRef.current = true
    }
  }, [data, settingsDirty])

  const updateSettings = (patch: Partial<IceCreamBuilderSettings>) => {
    setSettingsDirty(true)
    setSettingsError(null)
    setSettings((current) => ({ ...current, ...patch }))
  }

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: typeof settings) =>
      api('/api/admin/ice-cream/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...payload,
          basePrice: Math.round(payload.basePrice),
          minPrice: Math.round(payload.minPrice),
        }),
      }),
    onSuccess: () => {
      setSettingsDirty(false)
      setSettingsError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-ice-cream'] })
      queryClient.invalidateQueries({ queryKey: ['ice-options'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err: Error) => setSettingsError(err.message),
  })

  const saveOptionMutation = useMutation({
    mutationFn: async (opt: IceCreamOption & { type: OptionType }) => {
      const payload = {
        id: opt.id,
        type: opt.type,
        name: opt.name,
        color: opt.color,
        texture: opt.texture ?? null,
        priceMod: Math.round(opt.priceMod),
        emoji: opt.emoji,
        hotBoost: opt.hotBoost ?? null,
        coldBoost: opt.coldBoost ?? null,
        visualProfile: opt.visualProfile ?? null,
        isActive: opt.isActive ?? true,
        sortOrder: opt.sortOrder,
      }
      const exists = listForType(opt.type).some((o) => o.id === opt.id)
      if (exists) {
        return api(`/api/admin/ice-cream/options/${opt.type}/${opt.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      }
      return api('/api/admin/ice-cream/options', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      setOptionError(null)
      queryClient.invalidateQueries({ queryKey: ['admin-ice-cream'] })
      setEditing(null)
    },
    onError: (err: Error) => setOptionError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: { type: OptionType; id: string }) =>
      api(`/api/admin/ice-cream/options/${type}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ice-cream'] })
      setEditing(null)
    },
  })

  const reorderMutation = useMutation({
    mutationFn: ({ type, ids }: { type: OptionType; ids: string[] }) =>
      api('/api/admin/ice-cream/reorder', { method: 'PUT', body: JSON.stringify({ type, ids }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ice-cream'] }),
  })

  const listForType = (type: OptionType): IceCreamOption[] => {
    if (!data) return []
    if (type === 'BASE') return data.bases
    if (type === 'COATING') return data.coatings
    return data.fillings
  }

  const items = listForType(tab)

  const previewBuild = useMemo(() => {
    if (!editing || !data) return null
    const base = tab === 'BASE' ? editing : data.bases[0]
    const coating = tab === 'COATING' ? editing : data.coatings.find((c) => c.id !== 'none') ?? data.coatings[0]
    const filling = tab === 'FILLING' ? editing : data.fillings[0]
    if (!base || !coating || !filling) return null
    return { base, coating, filling }
  }, [editing, tab, data])

  if (isLoading || !data) {
    return (
      <div className="page">
        <div className="card skeleton" style={{ height: 320 }} />
      </div>
    )
  }

  const move = (id: string, dir: -1 | 1) => {
    const ids = items.map((o) => o.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    reorderMutation.mutate({ type: tab, ids })
  }

  const setVp = (patch: Partial<IceCreamVisualProfile>) => {
    if (!editing) return
    setEditing({
      ...editing,
      visualProfile: { ...(editing.visualProfile ?? {}), ...patch },
    })
  }

  const syncColorToProfile = (color: string) => {
    if (!editing) return
    if (tab === 'BASE') {
      setVp({ colors: deriveBaseColors(color) })
    } else if (tab === 'FILLING') {
      setVp({ secondaryColor: color })
    } else if (color === 'transparent') {
      setVp({ coatingStyle: 'none', thickness: 0 })
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>بستنی سفارشی</h1>
          <p className="page-sub">مدیریت پایه، روکش، فیلینگ، رنگ و لعاب — هماهنگ با اپ مشتری</p>
        </div>
        <div className="page-actions">
          <button
            className="btn-primary"
            onClick={() => saveSettingsMutation.mutate(settings)}
            disabled={saveSettingsMutation.isPending}
          >
            <Save size={18} /> {saved ? 'ذخیره شد' : 'ذخیره تنظیمات'}
          </button>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3>تنظیمات کلی</h3>
        {settingsError && <p className="field-error">{settingsError}</p>}
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
            />
            <span>بخش بستنی سفارشی در اپ فعال باشد</span>
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.smartSuggestions}
              onChange={(e) => updateSettings({ smartSuggestions: e.target.checked })}
            />
            <span>پیشنهاد هوشمند بر اساس آب‌وهوا</span>
          </label>
          <label className="field field-full">
            <span>حالت ساخت در اپ</span>
            <select
              value={settings.builderMode}
              onChange={(e) =>
                updateSettings({ builderMode: e.target.value as 'classic' | 'studio' })
              }
            >
              <option value="studio">استودیو — پیش‌نمایش ثابت، انتخاب افقی، بدون اسکرول صفحه (پیشنهادی)</option>
              <option value="classic">کلاسیک — حالت قبلی با شیت اسکرول‌شونده</option>
            </select>
            <p className="field-hint" style={{ marginTop: 6 }}>
              در حالت استودیو، پیش‌نمایش ۳D همیشه بالا می‌ماند و دکمه سفارش همیشه پایین پنل دیده می‌شود.
            </p>
          </label>
          <label className="field">
            <span>قیمت پایه (تومان)</span>
            <input
              type="number"
              min={0}
              value={settings.basePrice}
              onChange={(e) => updateSettings({ basePrice: parsePriceInput(e.target.value) })}
            />
          </label>
          <label className="field">
            <span>حداقل قیمت نهایی</span>
            <input
              type="number"
              min={0}
              value={settings.minPrice}
              onChange={(e) => updateSettings({ minPrice: parsePriceInput(e.target.value) })}
            />
          </label>
        </div>
      </section>

      <div className="settings-tabs" style={{ marginBottom: 16 }}>
        {(['BASE', 'COATING', 'FILLING'] as OptionType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? 'active' : ''}
            onClick={() => {
              setTab(t)
              setEditing(null)
            }}
          >
            {TYPE_LABELS[t]} ({listForType(t).length})
          </button>
        ))}
        <button
          type="button"
          className="btn-secondary btn-sm"
          style={{ marginRight: 'auto' }}
          onClick={() => setEditing(emptyOption(tab))}
        >
          <Plus size={16} /> گزینه جدید
        </button>
      </div>

      <div className="ice-admin-layout">
        <section className="card ice-admin-list">
          <div className="ice-opt-grid">
            {items.map((opt, index) => (
              <button
                key={opt.id}
                type="button"
                className={`ice-opt ice-opt-btn ${editing?.id === opt.id ? 'active' : ''} ${!opt.isActive ? 'inactive' : ''}`}
                onClick={() => setEditing({ ...opt, type: tab })}
              >
                <span
                  className="ice-swatch"
                  style={{ background: opt.color === 'transparent' ? '#2a2a33' : opt.color }}
                />
                <div className="ice-opt-info">
                  <strong>
                    {opt.emoji} {opt.name}
                  </strong>
                  <span>
                    {opt.priceMod > 0 ? '+' : ''}
                    {opt.priceMod !== 0 ? formatPrice(opt.priceMod) : '۰ تومان'}
                    {!opt.isActive && ' · غیرفعال'}
                  </span>
                </div>
                <div className="ice-opt-actions" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="icon-btn-sm" disabled={index === 0} onClick={() => move(opt.id, -1)}>
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn-sm"
                    disabled={index === items.length - 1}
                    onClick={() => move(opt.id, 1)}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </section>

        {editing && (
          <section className="card ice-admin-editor">
            <h3>{editing.id ? 'ویرایش' : 'گزینه جدید'}</h3>
            {optionError && <p className="field-error">{optionError}</p>}
            <div className="ice-editor-grid">
              <div className="ice-editor-form">
                <div className="form-grid">
                  {!editing.id && (
                    <label className="field field-full">
                      <span>شناسه (انگلیسی، مثلاً mango-base)</span>
                      <input
                        value={editing.id}
                        onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                        onBlur={() => {
                          if (!editing.id && editing.name) {
                            setEditing({ ...editing, id: slugify(editing.name) })
                          }
                        }}
                        dir="ltr"
                        placeholder="vanilla-special"
                      />
                    </label>
                  )}
                  <label className="field field-full">
                    <span>نام نمایشی</span>
                    <input
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>ایموجی</span>
                    <input value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
                  </label>
                  <label className="field">
                    <span>رنگ اصلی</span>
                    <input
                      type="color"
                      value={editing.color === 'transparent' ? '#2a2a33' : editing.color}
                      onChange={(e) => {
                        const color = e.target.value
                        setEditing({ ...editing, color })
                        syncColorToProfile(color)
                      }}
                    />
                  </label>
                  {tab === 'COATING' && (
                    <label className="checkbox-field field-full">
                      <input
                        type="checkbox"
                        checked={editing.color === 'transparent'}
                        onChange={(e) => {
                          const color = e.target.checked ? 'transparent' : '#8b6914'
                          setEditing({ ...editing, color })
                          syncColorToProfile(color)
                        }}
                      />
                      <span>بدون روکش (شفاف)</span>
                    </label>
                  )}
                  <label className="field">
                    <span>{tab === 'BASE' ? 'هزینه اضافه نسبت به قیمت پایه' : 'هزینه اضافه (تومان)'}</span>
                    <input
                      type="number"
                      value={editing.priceMod}
                      onChange={(e) =>
                        setEditing({ ...editing, priceMod: parsePriceInput(e.target.value) })
                      }
                    />
                  </label>
                  {tab === 'COATING' && (
                    <label className="field">
                      <span>بافت مغز (برای crunchy)</span>
                      <select
                        value={editing.texture ?? ''}
                        onChange={(e) =>
                          setEditing({ ...editing, texture: e.target.value || null })
                        }
                      >
                        <option value="">— بدون مغز —</option>
                        {ICE_CREAM_NUT_TEXTURES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {tab === 'BASE' && (
                    <>
                      <label className="field">
                        <span>boost گرم</span>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          value={editing.hotBoost ?? ''}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              hotBoost: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        <span>boost سرد</span>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          value={editing.coldBoost ?? ''}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              coldBoost: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                  <label className="checkbox-field field-full">
                    <input
                      type="checkbox"
                      checked={editing.isActive !== false}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />
                    <span>فعال در اپ</span>
                  </label>
                </div>

                {tab === 'BASE' && editing.visualProfile && (
                  <div className="ice-visual-section">
                    <h4>ظاهر پایه</h4>
                    <label className="field">
                      <span>بافت</span>
                      <select
                        value={editing.visualProfile.textureKind ?? 'smooth'}
                        onChange={(e) =>
                          setVp({ textureKind: e.target.value as IceCreamVisualProfile['textureKind'] })
                        }
                      >
                        {ICE_CREAM_TEXTURE_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </label>
                    {['color1', 'color2', 'color3'].map((key, i) => (
                      <label key={key} className="field">
                        <span>رنگ گرادیان {i + 1}</span>
                        <input
                          type="color"
                          value={editing.visualProfile?.colors?.[i] ?? editing.color}
                          onChange={(e) => {
                            const colors = [...(editing.visualProfile?.colors ?? deriveBaseColors(editing.color))]
                            colors[i] = e.target.value
                            setVp({ colors: colors as [string, string, string] })
                          }}
                        />
                      </label>
                    ))}
                    <label className="field">
                      <span>رنگ نقاط/دانه</span>
                      <input
                        type="color"
                        value={editing.visualProfile.speckleColor ?? '#333333'}
                        onChange={(e) => setVp({ speckleColor: e.target.value })}
                      />
                    </label>
                  </div>
                )}

                {tab === 'COATING' && editing.visualProfile && (
                  <div className="ice-visual-section">
                    <h4>ظاهر روکش / لعاب</h4>
                    <label className="field field-full">
                      <span>استایل لعاب</span>
                      <select
                        value={editing.visualProfile.coatingStyle ?? 'smooth-gloss'}
                        onChange={(e) =>
                          setVp({
                            coatingStyle: e.target.value as IceCreamVisualProfile['coatingStyle'],
                          })
                        }
                      >
                        {ICE_CREAM_COATING_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>ضخامت ({editing.visualProfile.thickness ?? 1})</span>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.05}
                        value={editing.visualProfile.thickness ?? 1}
                        onChange={(e) => setVp({ thickness: Number(e.target.value) })}
                      />
                    </label>
                    <label className="checkbox-field field-full">
                      <input
                        type="checkbox"
                        checked={editing.visualProfile.wavyEdge ?? true}
                        onChange={(e) => setVp({ wavyEdge: e.target.checked })}
                      />
                      <span>لبه موج‌دار</span>
                    </label>
                  </div>
                )}

                {tab === 'FILLING' && editing.visualProfile && (
                  <div className="ice-visual-section">
                    <h4>ظاهر فیلینگ</h4>
                    <label className="field field-full">
                      <span>استایل</span>
                      <select
                        value={editing.visualProfile.fillingStyle ?? 'pool'}
                        onChange={(e) =>
                          setVp({
                            fillingStyle: e.target.value as IceCreamVisualProfile['fillingStyle'],
                          })
                        }
                      >
                        {ICE_CREAM_FILLING_STYLES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      <span>رنگ ثانویه</span>
                      <input
                        type="color"
                        value={editing.visualProfile.secondaryColor ?? editing.color}
                        onChange={(e) => setVp({ secondaryColor: e.target.value })}
                      />
                    </label>
                  </div>
                )}

                <div className="ice-editor-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!editing.id || !editing.name || saveOptionMutation.isPending}
                    onClick={() =>
                      saveOptionMutation.mutate({ ...editing, type: tab } as IceCreamOption & {
                        type: OptionType
                      })
                    }
                  >
                    ذخیره گزینه
                  </button>
                  {editing.id && listForType(tab).some((o) => o.id === editing.id) && (
                    <button
                      type="button"
                      className="btn-ghost danger"
                      onClick={() => deleteMutation.mutate({ type: tab, id: editing.id })}
                    >
                      <Trash2 size={16} /> حذف
                    </button>
                  )}
                  <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
                    انصراف
                  </button>
                </div>
              </div>

              {previewBuild && (
                <div className="ice-editor-preview">
                  <h4>پیش‌نمایش زنده</h4>
                  <IceCreamBarRenderer build={previewBuild} size="lg" />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
