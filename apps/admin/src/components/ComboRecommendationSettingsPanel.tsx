import { useQuery } from '@tanstack/react-query'
import type {
  Category,
  CategoryPairRule,
  ComboRecommendationSettings,
  ComboTemplate,
} from '@chill-bar/shared'
import { api } from '../lib/api'

const TIME_OPTIONS = [
  { id: 'morning', label: 'صبح' },
  { id: 'afternoon', label: 'ظهر' },
  { id: 'evening', label: 'عصر' },
  { id: 'night', label: 'شب' },
] as const

const WEATHER_OPTIONS = [
  { id: 'any', label: 'هر آب‌وهوا' },
  { id: 'hot', label: 'گرم' },
  { id: 'cold', label: 'سرد' },
  { id: 'rainy', label: 'بارانی' },
] as const

const TAG_SUGGESTIONS = ['sweet', 'hot', 'cold', 'fresh', 'cozy', 'relax', 'light', 'energetic', 'breakfast']

interface Props {
  settings: ComboRecommendationSettings
  onChange: (settings: ComboRecommendationSettings) => void
}

function newPairRule(categories: Category[]): CategoryPairRule {
  const from = categories[0]?.id ?? 'arabica'
  const to = categories.find((c) => c.id !== from)?.id ?? 'cake'
  return {
    id: `pair-${Date.now()}`,
    enabled: true,
    priority: 50,
    fromCategoryId: from,
    toCategoryIds: [to],
    label: 'پیشنهاد ترکیب جدید',
    tagHints: [],
  }
}

function newTemplate(categories: Category[]): ComboTemplate {
  return {
    id: `combo-${Date.now()}`,
    enabled: true,
    priority: 50,
    title: 'کمبو جدید',
    reason: 'توضیح کوتاه برای مشتری',
    itemCount: 3,
    moods: [],
    timeOfDay: [],
    weather: 'any',
    requireDistinctCategories: true,
    categoryFilter: categories.slice(0, 3).map((c) => c.id),
  }
}

export function ComboRecommendationSettingsPanel({ settings, onChange }: Props) {
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Category[]>('/api/admin/categories'),
  })

  const set = <K extends keyof ComboRecommendationSettings>(key: K, value: ComboRecommendationSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const updatePair = (index: number, patch: Partial<CategoryPairRule>) => {
    const next = settings.categoryPairs.map((rule, i) => (i === index ? { ...rule, ...patch } : rule))
    set('categoryPairs', next)
  }

  const updateTemplate = (index: number, patch: Partial<ComboTemplate>) => {
    const next = settings.templates.map((tpl, i) => (i === index ? { ...tpl, ...patch } : tpl))
    set('templates', next)
  }

  const toggleToCategory = (ruleIndex: number, categoryId: string) => {
    const rule = settings.categoryPairs[ruleIndex]
    const has = rule.toCategoryIds.includes(categoryId)
    const toCategoryIds = has
      ? rule.toCategoryIds.filter((id) => id !== categoryId)
      : [...rule.toCategoryIds, categoryId]
    if (!toCategoryIds.length) return
    updatePair(ruleIndex, { toCategoryIds })
  }

  const toggleTemplateCategory = (tplIndex: number, categoryId: string) => {
    const tpl = settings.templates[tplIndex]
    const has = tpl.categoryFilter.includes(categoryId)
    const categoryFilter = has
      ? tpl.categoryFilter.filter((id) => id !== categoryId)
      : [...tpl.categoryFilter, categoryId]
    updateTemplate(tplIndex, { categoryFilter })
  }

  const toggleTemplateTime = (tplIndex: number, time: ComboTemplate['timeOfDay'][number]) => {
    const tpl = settings.templates[tplIndex]
    const has = tpl.timeOfDay.includes(time)
    updateTemplate(tplIndex, {
      timeOfDay: has ? tpl.timeOfDay.filter((t) => t !== time) : [...tpl.timeOfDay, time],
    })
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>پیشنهاد ترکیب (صفحه آیتم)</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          وقتی مشتری یک آیتم را باز می‌کند، یک مکمل منطقی از دسته‌های مرتبط پیشنهاد می‌شود.
        </p>
        <div className="feature-list" style={{ marginBottom: 16 }}>
          <label className="feature-toggle">
            <span>فعال‌سازی پیشنهاد ترکیب</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.pairingEnabled}
                onChange={(e) => set('pairingEnabled', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>عنوان بخش</span>
            <input
              value={settings.pairingSectionTitle}
              onChange={(e) => set('pairingSectionTitle', e.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>متن پیش‌فرض (وقتی قانون خاصی نباشد)</span>
            <input
              value={settings.fallbackPairingReason}
              onChange={(e) => set('fallbackPairingReason', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h3>قوانین دسته‌به‌دسته</h3>
          <button type="button" className="btn-ghost" onClick={() => set('categoryPairs', [...settings.categoryPairs, newPairRule(categories)])}>
            + قانون جدید
          </button>
        </div>
        {settings.categoryPairs.map((rule, index) => (
          <div key={rule.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="feature-list" style={{ marginBottom: 8 }}>
              <label className="feature-toggle">
                <span>فعال — اولویت {rule.priority}</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updatePair(index, { enabled: e.target.checked })}
                  />
                  <span className="switch-track" />
                </label>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>اولویت</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={rule.priority}
                  onChange={(e) => updatePair(index, { priority: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>از دسته</span>
                <select
                  value={rule.fromCategoryId}
                  onChange={(e) => updatePair(index, { fromCategoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-full">
                <span>متن پیشنهاد برای مشتری</span>
                <input value={rule.label} onChange={(e) => updatePair(index, { label: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>تگ‌های تقویت‌کننده (با کاما)</span>
                <input
                  value={rule.tagHints.join(', ')}
                  onChange={(e) =>
                    updatePair(index, {
                      tagHints: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={TAG_SUGGESTIONS.join(', ')}
                />
              </label>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              پیشنهاد به این دسته‌ها:
            </p>
            <div className="feature-list">
              {categories
                .filter((c) => c.id !== rule.fromCategoryId)
                .map((c) => (
                  <label key={c.id} className="feature-toggle">
                    <span>
                      {c.emoji} {c.name}
                    </span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={rule.toCategoryIds.includes(c.id)}
                        onChange={() => toggleToCategory(index, c.id)}
                      />
                      <span className="switch-track" />
                    </label>
                  </label>
                ))}
            </div>
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => set('categoryPairs', settings.categoryPairs.filter((_, i) => i !== index))}
            >
              حذف قانون
            </button>
          </div>
        ))}
      </section>

      <section className="card">
        <h3>کمبو هوشمند (صفحه خانه)</h3>
        <div className="form-grid">
          <label className="field">
            <span>تعداد آیتم کمبو</span>
            <input
              type="number"
              min={2}
              max={5}
              value={settings.comboItemCount}
              onChange={(e) => set('comboItemCount', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداقل آیتم برای نمایش</span>
            <input
              type="number"
              min={2}
              max={5}
              value={settings.minComboItems}
              onChange={(e) => set('minComboItems', Number(e.target.value))}
            />
          </label>
          <label className="field field-full">
            <span>متن پیش‌فرض کمبو</span>
            <input
              value={settings.fallbackComboReason}
              onChange={(e) => set('fallbackComboReason', e.target.value)}
            />
          </label>
        </div>
        <div className="feature-list" style={{ marginTop: 12 }}>
          <label className="feature-toggle">
            <span>دسته‌های متفاوت در کمبو</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.requireDistinctCategories}
                onChange={(e) => set('requireDistinctCategories', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
          <label className="feature-toggle">
            <span>ترجیح تگ‌های مکمل (نه مشابه)</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.preferComplementaryTags}
                onChange={(e) => set('preferComplementaryTags', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
          <label className="feature-toggle">
            <span>اولویت با قالب‌های از پیش‌تعریف‌شده</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.templatesFirst}
                onChange={(e) => set('templatesFirst', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
        </div>
      </section>

      <section className="card">
        <div className="page-head" style={{ marginBottom: 12 }}>
          <h3>قالب‌های کمبو</h3>
          <button type="button" className="btn-ghost" onClick={() => set('templates', [...settings.templates, newTemplate(categories)])}>
            + قالب جدید
          </button>
        </div>
        {settings.templates.map((tpl, index) => (
          <div key={tpl.id} className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="feature-list" style={{ marginBottom: 8 }}>
              <label className="feature-toggle">
                <span>
                  {tpl.enabled ? 'فعال' : 'غیرفعال'} — اولویت {tpl.priority}
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={tpl.enabled}
                    onChange={(e) => updateTemplate(index, { enabled: e.target.checked })}
                  />
                  <span className="switch-track" />
                </label>
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>عنوان</span>
                <input value={tpl.title} onChange={(e) => updateTemplate(index, { title: e.target.value })} />
              </label>
              <label className="field">
                <span>تعداد آیتم</span>
                <input
                  type="number"
                  min={2}
                  max={5}
                  value={tpl.itemCount}
                  onChange={(e) => updateTemplate(index, { itemCount: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>اولویت</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={tpl.priority}
                  onChange={(e) => updateTemplate(index, { priority: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>آب‌وهوا</span>
                <select
                  value={tpl.weather}
                  onChange={(e) => updateTemplate(index, { weather: e.target.value as ComboTemplate['weather'] })}
                >
                  {WEATHER_OPTIONS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field field-full">
                <span>دلیل / توضیح</span>
                <input value={tpl.reason} onChange={(e) => updateTemplate(index, { reason: e.target.value })} />
              </label>
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              ساعت مناسب (خالی = همه):
            </p>
            <div className="feature-list">
              {TIME_OPTIONS.map((t) => (
                <label key={t.id} className="feature-toggle">
                  <span>{t.label}</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={tpl.timeOfDay.includes(t.id)}
                      onChange={() => toggleTemplateTime(index, t.id)}
                    />
                    <span className="switch-track" />
                  </label>
                </label>
              ))}
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              دسته‌های مجاز (خالی = همه):
            </p>
            <div className="feature-list">
              {categories.map((c) => (
                <label key={c.id} className="feature-toggle">
                  <span>
                    {c.emoji} {c.name}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={tpl.categoryFilter.includes(c.id)}
                      onChange={() => toggleTemplateCategory(index, c.id)}
                    />
                    <span className="switch-track" />
                  </label>
                </label>
              ))}
            </div>
            <label className="feature-toggle" style={{ marginTop: 8 }}>
              <span>دسته‌های متفاوت</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={tpl.requireDistinctCategories}
                  onChange={(e) => updateTemplate(index, { requireDistinctCategories: e.target.checked })}
                />
                <span className="switch-track" />
              </label>
            </label>
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => set('templates', settings.templates.filter((_, i) => i !== index))}
            >
              حذف قالب
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
