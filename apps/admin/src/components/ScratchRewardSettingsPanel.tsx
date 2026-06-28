import { useQuery } from '@tanstack/react-query'
import type { ScratchRewardSettings } from '@chill-bar/shared'
import { api } from '../lib/api'

interface AdminItem {
  id: string
  name: string
  emoji: string
  price: number
  categoryName: string
  isAvailable: boolean
}

interface Props {
  settings: ScratchRewardSettings
  onChange: (settings: ScratchRewardSettings) => void
}

export function ScratchRewardSettingsPanel({ settings, onChange }: Props) {
  const { data: items = [] } = useQuery({
    queryKey: ['admin-items'],
    queryFn: () => api<AdminItem[]>('/api/admin/items'),
  })

  const available = items.filter((i) => i.isAvailable)

  const toggle = (id: string) => {
    const next = settings.menuItemIds.includes(id)
      ? settings.menuItemIds.filter((x) => x !== id)
      : [...settings.menuItemIds, id]
    onChange({ ...settings, menuItemIds: next })
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>جایزه کارت اسکرچ</h3>
        <p className="page-sub" style={{ marginBottom: 16 }}>
          مشتری کارت را می‌خراشد؛ جایزه در مرحله ثبت سفارش اعمال می‌شود و پس از ثبت موفق به
          آیتم‌های سفارش اضافه می‌شود.
        </p>
        <div className="form-grid">
          <label className="field">
            <span>قیمت جایزه در فاکتور (۰ = رایگان)</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={settings.rewardPrice}
              onChange={(e) => onChange({ ...settings, rewardPrice: Number(e.target.value) })}
              dir="ltr"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>استخر جایزه‌ها</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          آیتم‌های انتخاب‌شده به‌صورت تصادفی به عنوان جایزه نمایش داده می‌شوند. اگر هیچ‌کدام
          انتخاب نشود، از کل منو انتخاب می‌شود.
        </p>
        {available.length === 0 ? (
          <p className="page-sub">آیتم فعالی در منو نیست.</p>
        ) : (
          <div className="feature-list" style={{ maxHeight: 360, overflow: 'auto' }}>
            {available.map((item) => (
              <label key={item.id} className="feature-toggle">
                <span>
                  {item.emoji} {item.name}
                  <span className="page-sub" style={{ display: 'block', fontSize: '0.75rem' }}>
                    {item.categoryName} · {item.price.toLocaleString('fa-IR')} تومان
                  </span>
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.menuItemIds.includes(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  <span className="switch-track" />
                </label>
              </label>
            ))}
          </div>
        )}
        {settings.menuItemIds.length > 0 && (
          <p className="page-sub" style={{ marginTop: 12 }}>
            {settings.menuItemIds.length} آیتم در استخر جایزه
          </p>
        )}
      </section>
    </div>
  )
}
