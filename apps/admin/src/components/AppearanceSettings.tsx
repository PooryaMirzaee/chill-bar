import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import type { StoreAppearance } from '@chill-bar/shared'
import { DEFAULT_APPEARANCE } from '@chill-bar/shared'
import { uploadImage, resolveAssetUrl } from '../lib/upload'

interface Props {
  appearance: StoreAppearance
  storeName: string
  storeSubtitle: string
  onChange: (appearance: StoreAppearance) => void
}

type ImageField = 'logoUrl' | 'faviconUrl' | 'splashImageUrl'

const IMAGE_FIELDS: { key: ImageField; label: string; hint: string; size: string }[] = [
  { key: 'logoUrl', label: 'لوگو', hint: 'هدر اپ و برندینگ — PNG/SVG توصیه می‌شود', size: '120×120' },
  { key: 'faviconUrl', label: 'آیکون (Favicon)', hint: 'آیکون تب مرورگر — ۳۲×۳۲ یا ۱۹۲×۱۹۲', size: '64×64' },
  { key: 'splashImageUrl', label: 'تصویر کیوسک', hint: 'صفحه خواب حالت کیوسک', size: 'full' },
]

function ImageUploadField({
  label,
  hint,
  value,
  previewSize,
  onUpload,
  onClear,
}: {
  label: string
  hint: string
  value: string | null
  previewSize: string
  onUpload: (file: File) => Promise<void>
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const src = resolveAssetUrl(value)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="appearance-upload">
      <div className="appearance-upload-head">
        <div>
          <strong>{label}</strong>
          <p>{hint}</p>
        </div>
        <div className="appearance-upload-actions">
          {value && (
            <button type="button" className="btn-ghost btn-sm" onClick={onClear}>
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
      <div
        className={`appearance-preview ${previewSize === 'full' ? 'appearance-preview-wide' : ''}`}
        onClick={() => inputRef.current?.click()}
      >
        {src ? (
          <img src={src} alt={label} />
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
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

export function AppearanceSettings({ appearance, storeName, storeSubtitle, onChange }: Props) {
  const set = <K extends keyof StoreAppearance>(key: K, value: StoreAppearance[K]) => {
    onChange({ ...appearance, [key]: value })
  }

  const uploadField = async (key: ImageField, file: File) => {
    const url = await uploadImage(file)
    set(key, url)
  }

  const logoSrc = resolveAssetUrl(appearance.logoUrl)

  return (
    <div className="appearance-panel">
      <section className="card appearance-card-wide">
        <h3>لوگو و تصاویر</h3>
        <div className="appearance-uploads">
          {IMAGE_FIELDS.map((f) => (
            <ImageUploadField
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={appearance[f.key]}
              previewSize={f.size}
              onUpload={(file) => uploadField(f.key, file)}
              onClear={() => set(f.key, null)}
            />
          ))}
        </div>
        <label className="field field-full" style={{ marginTop: 12 }}>
          <span>ایموجی جایگزین (وقتی لوگو نیست)</span>
          <input
            value={appearance.brandEmoji ?? ''}
            maxLength={4}
            onChange={(e) => set('brandEmoji', e.target.value || null)}
            placeholder="🍦"
          />
        </label>
      </section>

      <section className="card">
        <h3>رنگ‌ها</h3>
        <div className="color-grid">
          {(
            [
              ['primaryColor', 'رنگ اصلی (دکمه‌ها)'],
              ['primaryForegroundColor', 'متن روی رنگ اصلی'],
              ['backgroundColor', 'پس‌زمینه (اختیاری)'],
              ['foregroundColor', 'متن (اختیاری)'],
              ['cardColor', 'کارت‌ها (اختیاری)'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="color-field">
              <span>{label}</span>
              <div className="color-input-row">
                <input
                  type="color"
                  value={appearance[key] ?? (key.includes('Foreground') ? '#FFFFFF' : '#F26522')}
                  onChange={(e) => set(key, e.target.value)}
                />
                <input
                  type="text"
                  value={appearance[key] ?? ''}
                  placeholder="پیش‌فرض"
                  onChange={(e) => set(key, e.target.value || null)}
                />
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>تم و استایل</h3>
        <div className="form-grid">
          <label className="field">
            <span>حالت تم</span>
            <select
              value={appearance.themeMode}
              onChange={(e) => set('themeMode', e.target.value as 'dark' | 'light')}
            >
              <option value="dark">تیره</option>
              <option value="light">روشن</option>
            </select>
          </label>
          <label className="field">
            <span>گردی گوشه‌ها ({appearance.borderRadius}rem)</span>
            <input
              type="range"
              min={0.25}
              max={1.5}
              step={0.05}
              value={appearance.borderRadius}
              onChange={(e) => set('borderRadius', Number(e.target.value))}
            />
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={appearance.headerBlur}
              onChange={(e) => set('headerBlur', e.target.checked)}
            />
            <span>هدر شیشه‌ای (Blur)</span>
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={appearance.accentGlow}
              onChange={(e) => set('accentGlow', e.target.checked)}
            />
            <span>درخشش نارنجی در پیش‌نمایش بستنی</span>
          </label>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => onChange({ ...DEFAULT_APPEARANCE })}
        >
          بازنشانی ظاهر به پیش‌فرض
        </button>
      </section>

      <section className="card appearance-preview-phone">
        <h3>پیش‌نمایش</h3>
        <div
          className="phone-mock"
          data-theme={appearance.themeMode}
          style={{
            ['--preview-primary' as string]: appearance.primaryColor,
            ['--preview-primary-fg' as string]: appearance.primaryForegroundColor,
            ['--preview-bg' as string]: appearance.backgroundColor ?? (appearance.themeMode === 'dark' ? '#1a1a1a' : '#fafafa'),
            ['--preview-fg' as string]: appearance.foregroundColor ?? (appearance.themeMode === 'dark' ? '#f5f5f5' : '#1a1a1a'),
            ['--preview-radius' as string]: `${appearance.borderRadius}rem`,
          }}
        >
          <div className={`phone-mock-header ${appearance.headerBlur ? 'phone-mock-header-blur' : ''}`}>
            {logoSrc ? (
              <img src={logoSrc} alt="" className="phone-mock-logo" />
            ) : (
              <div className="phone-mock-logo-fallback">{appearance.brandEmoji ?? 'C'}</div>
            )}
            <div>
              <strong>{storeName}</strong>
              <small>{storeSubtitle}</small>
            </div>
          </div>
          <div className="phone-mock-body">
            <div className="phone-mock-card">پیشنهاد هوشمند</div>
            <div className="phone-mock-btn">سفارش</div>
          </div>
          <div className="phone-mock-nav" />
        </div>
      </section>
    </div>
  )
}
