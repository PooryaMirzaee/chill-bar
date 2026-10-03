import { useQuery } from '@tanstack/react-query'
import type { SpinCampaignSettings, SpinPrize, SpinPrizeType } from '@chill-bar/shared'
import { DEFAULT_SPIN_CAMPAIGN } from '@chill-bar/shared'
import { api } from '../lib/api'
import { uploadImage } from '../lib/upload'

interface AdminItem {
  id: string
  name: string
  emoji: string
  category: string
  categoryName: string
}

interface AdminCategory {
  id: string
  name: string
  emoji: string
}

interface Props {
  settings: SpinCampaignSettings
  onChange: (settings: SpinCampaignSettings) => void
}

const PRIZE_TYPES: { value: SpinPrizeType; label: string }[] = [
  { value: 'FREE_ITEM', label: 'آیتم رایگان' },
  { value: 'BUY_GET_KID_FREE', label: 'خودت بخر · بچه رایگان' },
  { value: 'DISCOUNT_ITEM', label: 'تخفیف روی محصول' },
  { value: 'DISCOUNT_CATEGORY', label: 'تخفیف روی دسته‌بندی' },
  { value: 'EXTERNAL', label: 'جایزه خارج از کافه' },
  { value: 'TRY_AGAIN', label: 'دوباره تلاش کن' },
]

/** Public deep-link for printed QR stickers / posters. */
const SPIN_PUBLIC_URL = 'https://chill-bar.ir/spin'
const SPIN_QR_SRC = '/spin-qr.png'

const COLORS = ['#F26522', '#2C2420', '#1B2838', '#C8D6C4', '#FF8C4D', '#E8A87C', '#D94E10', '#E6E0DA']

function newPrize(): SpinPrize {
  return {
    id: `prize-${Math.random().toString(36).slice(2, 8)}`,
    label: 'جایزه جدید',
    description: '',
    emoji: '🎁',
    imageUrl: null,
    color: '#F26522',
    textColor: '#FFFFFF',
    weight: 10,
    type: 'EXTERNAL',
    menuItemId: null,
    categoryId: null,
    discountType: null,
    discountValue: 0,
    externalPrizeName: '',
    codePrefix: 'CHILL',
    stock: null,
    isActive: true,
  }
}

export function SpinCampaignSettingsPanel({ settings, onChange }: Props) {
  const { data: items = [] } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => api<AdminItem[]>('/api/admin/items'),
  })
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<AdminCategory[]>('/api/admin/categories'),
  })
  const { data: claimsRes } = useQuery({
    queryKey: ['admin-spin-claims'],
    queryFn: () =>
      api<{
        claims: Array<{
          id: string
          code: string
          phone: string
          prizeLabel: string
          prizeType: string
          createdAt: string
          redeemedAt: string | null
        }>
      }>('/api/admin/spin/claims?limit=30'),
  })
  const claims = claimsRes?.claims ?? []

  const update = (patch: Partial<SpinCampaignSettings>) => onChange({ ...settings, ...patch })
  const updatePrize = (id: string, patch: Partial<SpinPrize>) => {
    onChange({
      ...settings,
      prizes: settings.prizes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }
  const removePrize = (id: string) => {
    onChange({ ...settings, prizes: settings.prizes.filter((p) => p.id !== id) })
  }

  return (
    <div className="settings-grid">
      <section className="card field-full">
        <h3>لینک اختصاصی و QR گردونه</h3>
        <p className="page-sub" style={{ marginBottom: 16 }}>
          اسکن این QR مستقیم صفحه گردونه را باز می‌کند — مناسب پوستر، استیکر میز و استوری.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'center',
          }}
        >
          <img
            src={SPIN_QR_SRC}
            alt="QR گردونه چیل بار"
            width={180}
            height={180}
            style={{
              width: 180,
              height: 180,
              borderRadius: 12,
              background: '#fff',
              border: '1px solid var(--border, #e5e5e5)',
              padding: 8,
            }}
          />
          <div style={{ display: 'grid', gap: 10, minWidth: 220, flex: 1 }}>
            <label className="field">
              <span>لینک مستقیم</span>
              <input value={SPIN_PUBLIC_URL} readOnly dir="ltr" onFocus={(e) => e.target.select()} />
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void navigator.clipboard.writeText(SPIN_PUBLIC_URL)}
              >
                کپی لینک
              </button>
              <a className="btn-secondary" href={SPIN_QR_SRC} download="chillbar-spin-qr.png">
                دانلود QR
              </a>
              <a className="btn-secondary" href={SPIN_PUBLIC_URL} target="_blank" rel="noreferrer">
                باز کردن صفحه
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>کمپین گردونه — اسکن کن · بچرخون · جایزه بگیر</h3>
        <p className="page-sub" style={{ marginBottom: 16 }}>
          تا ۲۹ مهر هر نفر روزی یک بار می‌تواند بچرخاند. بعد از برد، با شماره موبایل کد صندوق دریافت
          می‌کند.
        </p>
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span>فعال بودن کمپین</span>
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.showSliceLabels === true}
              onChange={(e) => update({ showSliceLabels: e.target.checked })}
            />
            <span>نمایش متن روی قطاع‌های گردونه (پیش‌فرض: فقط عکس)</span>
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.soundEnabled !== false}
              onChange={(e) => update({ soundEnabled: e.target.checked })}
            />
            <span>صدای گردونه</span>
          </label>
          <label className="field field-full">
            <span>عنوان کمپین</span>
            <input
              value={settings.campaignTitle}
              onChange={(e) => update({ campaignTitle: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>زیرعنوان</span>
            <input
              value={settings.campaignSubtitle}
              onChange={(e) => update({ campaignSubtitle: e.target.value })}
            />
          </label>
          <label className="field">
            <span>برچسب هیرو</span>
            <input value={settings.heroBadge} onChange={(e) => update({ heroBadge: e.target.value })} />
          </label>
          <label className="field">
            <span>متن دکمه چرخش</span>
            <input value={settings.ctaLabel} onChange={(e) => update({ ctaLabel: e.target.value })} />
          </label>
          <label className="field">
            <span>شروع (میلادی YYYY-MM-DD)</span>
            <input
              dir="ltr"
              value={settings.startsAt ?? ''}
              onChange={(e) => update({ startsAt: e.target.value || null })}
            />
          </label>
          <label className="field">
            <span>پایان (پیش‌فرض ۲۹ مهر ۱۴۰۵)</span>
            <input
              dir="ltr"
              value={settings.endsAt ?? ''}
              onChange={(e) => update({ endsAt: e.target.value || null })}
            />
          </label>
          <label className="field">
            <span>چرخش مجاز در روز</span>
            <input
              type="number"
              min={1}
              max={999}
              value={settings.spinsPerDay}
              onChange={(e) => update({ spinsPerDay: Number(e.target.value) || 1 })}
              dir="ltr"
            />
          </label>
          <label className="field">
            <span>اندازه گردونه (px)</span>
            <input
              type="number"
              min={260}
              max={480}
              value={settings.wheelSize}
              onChange={(e) => update({ wheelSize: Number(e.target.value) || 320 })}
              dir="ltr"
            />
          </label>
          <label className="field field-full">
            <span>عنوان فرم شماره</span>
            <input
              value={settings.phonePromptTitle}
              onChange={(e) => update({ phonePromptTitle: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>توضیح فرم شماره</span>
            <input
              value={settings.phonePromptBody}
              onChange={(e) => update({ phonePromptBody: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>پیام «امروز چرخیدی»</span>
            <input
              value={settings.alreadySpunMessage}
              onChange={(e) => update({ alreadySpunMessage: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>پیام اعتبار کد (زیر کد جایزه)</span>
            <input
              value={settings.codeValidityMessage}
              onChange={(e) => update({ codeValidityMessage: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>عنوان آدرس کافه</span>
            <input
              value={settings.venueGuideTitle}
              onChange={(e) => update({ venueGuideTitle: e.target.value })}
            />
          </label>
          <label className="field field-full">
            <span>راهنمای رسیدن به کافه</span>
            <textarea
              rows={2}
              value={settings.venueGuideBody}
              onChange={(e) => update({ venueGuideBody: e.target.value })}
            />
          </label>
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onChange({ ...DEFAULT_SPIN_CAMPAIGN })}
          >
            بازنشانی به پیش‌فرض کمپین
          </button>
        </div>
      </section>

      <section className="card field-full">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>جایزه‌ها ({settings.prizes.length})</h3>
          <button type="button" className="btn-primary" onClick={() => update({ prizes: [...settings.prizes, newPrize()] })}>
            + جایزه
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {settings.prizes.map((prize, idx) => (
            <div
              key={prize.id}
              style={{
                border: '1px solid var(--border, #ddd)',
                borderRadius: 12,
                padding: 14,
                background: prize.isActive ? 'transparent' : 'rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong>
                  #{idx + 1} {prize.emoji} {prize.label}
                </strong>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label className="checkbox-field" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={prize.isActive}
                      onChange={(e) => updatePrize(prize.id, { isActive: e.target.checked })}
                    />
                    <span>فعال</span>
                  </label>
                  <button type="button" className="btn-secondary" onClick={() => removePrize(prize.id)}>
                    حذف
                  </button>
                </div>
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>عنوان روی گردونه</span>
                  <input value={prize.label} onChange={(e) => updatePrize(prize.id, { label: e.target.value })} />
                </label>
                <label className="field">
                  <span>ایموجی (مودال برد)</span>
                  <input value={prize.emoji} onChange={(e) => updatePrize(prize.id, { emoji: e.target.value })} />
                </label>
                <label className="field field-full">
                  <span>عکس قطاع گردونه</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {prize.imageUrl ? (
                      <img
                        src={prize.imageUrl}
                        alt=""
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 10,
                          border: '1px solid var(--border, #ddd)',
                        }}
                      />
                    ) : (
                      <span className="page-sub">بدون عکس</span>
                    )}
                    <label className="btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                      آپلود عکس
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          try {
                            const url = await uploadImage(file)
                            updatePrize(prize.id, { imageUrl: url })
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'آپلود ناموفق')
                          }
                        }}
                      />
                    </label>
                    {prize.imageUrl && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => updatePrize(prize.id, { imageUrl: null })}
                      >
                        حذف عکس
                      </button>
                    )}
                  </div>
                </label>
                <label className="field field-full">
                  <span>توضیح جایزه</span>
                  <input
                    value={prize.description}
                    onChange={(e) => updatePrize(prize.id, { description: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>نوع جایزه</span>
                  <select
                    value={prize.type}
                    onChange={(e) => updatePrize(prize.id, { type: e.target.value as SpinPrizeType })}
                  >
                    {PRIZE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>وزن شانس (بیشتر = محتمل‌تر)</span>
                  <input
                    type="number"
                    min={0}
                    value={prize.weight}
                    onChange={(e) => updatePrize(prize.id, { weight: Number(e.target.value) || 0 })}
                    dir="ltr"
                  />
                </label>
                <label className="field">
                  <span>شناسه جایزه (داخلی)</span>
                  <input
                    dir="ltr"
                    value={prize.codePrefix}
                    onChange={(e) => updatePrize(prize.id, { codePrefix: e.target.value.toUpperCase() })}
                  />
                  <small className="page-sub">کد تحویلی به مشتری فقط عدد ۸ رقمی است</small>
                </label>
                <label className="field">
                  <span>موجودی (خالی = نامحدود)</span>
                  <input
                    type="number"
                    min={0}
                    value={prize.stock ?? ''}
                    placeholder="∞"
                    onChange={(e) =>
                      updatePrize(prize.id, {
                        stock: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    dir="ltr"
                  />
                </label>
                <label className="field">
                  <span>رنگ قطاع</span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        title={c}
                        onClick={() => updatePrize(prize.id, { color: c, textColor: c === '#E6E0DA' || c === '#C8D6C4' || c === '#E8A87C' || c === '#FF8C4D' ? '#2C2420' : '#FFFFFF' })}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: c,
                          border: prize.color === c ? '2px solid #000' : '1px solid #ccc',
                        }}
                      />
                    ))}
                  </div>
                </label>

                {(prize.type === 'FREE_ITEM' || prize.type === 'DISCOUNT_ITEM' || prize.type === 'BUY_GET_KID_FREE') && (
                  <label className="field field-full">
                    <span>محصول مرتبط (اختیاری)</span>
                    <select
                      value={prize.menuItemId ?? ''}
                      onChange={(e) => updatePrize(prize.id, { menuItemId: e.target.value || null })}
                    >
                      <option value="">— انتخاب از منو —</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.emoji} {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {prize.type === 'DISCOUNT_CATEGORY' && (
                  <label className="field field-full">
                    <span>دسته‌بندی</span>
                    <select
                      value={prize.categoryId ?? ''}
                      onChange={(e) => updatePrize(prize.id, { categoryId: e.target.value || null })}
                    >
                      <option value="">— انتخاب دسته —</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {(prize.type === 'DISCOUNT_ITEM' || prize.type === 'DISCOUNT_CATEGORY') && (
                  <>
                    <label className="field">
                      <span>نوع تخفیف</span>
                      <select
                        value={prize.discountType ?? 'percent'}
                        onChange={(e) =>
                          updatePrize(prize.id, {
                            discountType: e.target.value as 'percent' | 'fixed',
                          })
                        }
                      >
                        <option value="percent">درصدی</option>
                        <option value="fixed">مبلغ ثابت (تومان)</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>مقدار تخفیف</span>
                      <input
                        type="number"
                        min={0}
                        value={prize.discountValue}
                        onChange={(e) => updatePrize(prize.id, { discountValue: Number(e.target.value) || 0 })}
                        dir="ltr"
                      />
                    </label>
                  </>
                )}

                {prize.type === 'EXTERNAL' && (
                  <label className="field field-full">
                    <span>نام جایزه خارجی (مثلاً آیفون ۱۸)</span>
                    <input
                      value={prize.externalPrizeName}
                      onChange={(e) => updatePrize(prize.id, { externalPrizeName: e.target.value })}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card field-full">
        <h3>آخرین کدهای صادرشده</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          گزارش کامل شرکت‌کنندگان و کدها در منوی{' '}
          <a href="/spin-campaign">رصد کمپین گردونه</a> در دسترس است.
        </p>
        {claims.length === 0 ? (
          <p className="page-sub">هنوز کدی صادر نشده.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>کد</th>
                  <th>جایزه</th>
                  <th>موبایل</th>
                  <th>وضعیت</th>
                  <th>تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id}>
                    <td dir="ltr"><code>{c.code}</code></td>
                    <td>{c.prizeLabel}</td>
                    <td dir="ltr">{c.phone}</td>
                    <td>{c.redeemedAt ? 'استفاده‌شده' : c.prizeType === 'TRY_AGAIN' ? '—' : 'فعال'}</td>
                    <td>{new Date(c.createdAt).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
