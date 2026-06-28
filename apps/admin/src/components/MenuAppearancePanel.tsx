import type { MenuAppearance } from '@chill-bar/shared'
import { DEFAULT_MENU_APPEARANCE } from '@chill-bar/shared'

interface Props {
  value: MenuAppearance
  onChange: (value: MenuAppearance) => void
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="checkbox-field field-full menu-toggle-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>{label}</strong>
        {hint && <small>{hint}</small>}
      </span>
    </label>
  )
}

export function MenuAppearancePanel({ value, onChange }: Props) {
  const set = <K extends keyof MenuAppearance>(key: K, v: MenuAppearance[K]) => {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="menu-appearance-panel">
      <section className="card">
        <h3>شروع اپ</h3>
        <p className="field-hint">وقتی مشتری اپ را باز می‌کند، کدام تب اول نمایش داده شود؟</p>
        <label className="field">
          <span>تب پیش‌فرض</span>
          <select value={value.defaultTab} onChange={(e) => set('defaultTab', e.target.value as MenuAppearance['defaultTab'])}>
            <option value="menu">منو</option>
            <option value="home">خانه</option>
            <option value="icecream">بستنی</option>
            <option value="discover">کشف</option>
            <option value="play">بازی</option>
          </select>
        </label>
      </section>

      <section className="card">
        <h3>چیدمان کارت‌ها</h3>
        <div className="form-grid">
          <label className="field">
            <span>نوع چیدمان</span>
            <select value={value.layout} onChange={(e) => set('layout', e.target.value as MenuAppearance['layout'])}>
              <option value="cards">کارت شبکه‌ای</option>
              <option value="list">لیست افقی</option>
            </select>
          </label>
          <label className="field">
            <span>ستون‌ها (حالت کارت)</span>
            <select
              value={value.gridColumns}
              onChange={(e) => set('gridColumns', Number(e.target.value) as MenuAppearance['gridColumns'])}
              disabled={value.layout === 'list'}
            >
              <option value={1}>۱ ستون</option>
              <option value={2}>۲ ستون</option>
              <option value={3}>۳ ستون</option>
            </select>
          </label>
          <label className="field">
            <span>استایل کارت</span>
            <select
              value={value.cardVariant}
              onChange={(e) => set('cardVariant', e.target.value as MenuAppearance['cardVariant'])}
            >
              <option value="default">استاندارد</option>
              <option value="minimal">مینیمال</option>
              <option value="elevated">برجسته (سایه‌دار)</option>
            </select>
          </label>
          <label className="field">
            <span>نسبت تصویر</span>
            <select value={value.imageRatio} onChange={(e) => set('imageRatio', e.target.value as MenuAppearance['imageRatio'])}>
              <option value="1:1">مربع ۱:۱</option>
              <option value="4:3">افقی ۴:۳</option>
              <option value="3:4">عمودی ۳:۴</option>
            </select>
          </label>
          <label className="field field-full">
            <span>فاصله بین کارت‌ها ({value.gridGap}rem)</span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.125}
              value={value.gridGap}
              onChange={(e) => set('gridGap', Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>دسته‌بندی‌ها</h3>
        <div className="form-grid">
          <label className="field">
            <span>هدر دسته در لیست</span>
            <select
              value={value.categoryHeaderStyle}
              onChange={(e) => set('categoryHeaderStyle', e.target.value as MenuAppearance['categoryHeaderStyle'])}
            >
              <option value="gradient">گرادیان رنگی</option>
              <option value="plain">ساده</option>
              <option value="hidden">مخفی</option>
            </select>
          </label>
          <label className="field">
            <span>استایل چیپ دسته</span>
            <select value={value.chipVariant} onChange={(e) => set('chipVariant', e.target.value as MenuAppearance['chipVariant'])}>
              <option value="pill">کپسولی</option>
              <option value="soft">نرم (رنگی)</option>
              <option value="outline">حاشیه‌دار</option>
            </select>
          </label>
          <ToggleRow label="نوار چیپ دسته‌ها" checked={value.showCategoryChips} onChange={(v) => set('showCategoryChips', v)} />
          <ToggleRow label="چیپ «همه»" checked={value.showAllChip} onChange={(v) => set('showAllChip', v)} />
          <ToggleRow
            label="چسبیدن نوار دسته هنگام اسکرول"
            checked={value.stickyCategoryBar}
            onChange={(v) => set('stickyCategoryBar', v)}
          />
        </div>
      </section>

      <section className="card">
        <h3>عنوان بخش منو</h3>
        <div className="form-grid">
          <ToggleRow label="نمایش عنوان بخش" checked={value.showSectionHeader} onChange={(v) => set('showSectionHeader', v)} />
          <label className="field">
            <span>برچسب بالای عنوان (Eyebrow)</span>
            <input value={value.sectionEyebrow} onChange={(e) => set('sectionEyebrow', e.target.value)} />
          </label>
          <label className="field field-full">
            <span>توضیح زیر عنوان</span>
            <input
              value={value.sectionDescriptionTemplate}
              onChange={(e) => set('sectionDescriptionTemplate', e.target.value)}
              placeholder="{count} آیتم · دست‌چین شده"
            />
            <small className="field-hint">از {'{count}'} برای تعداد آیتم‌ها استفاده کنید</small>
          </label>
          <ToggleRow label="نوار جستجو" checked={value.showSearchBar} onChange={(v) => set('showSearchBar', v)} />
        </div>
      </section>

      <section className="card">
        <h3>محتوای کارت آیتم</h3>
        <div className="form-grid">
          <ToggleRow label="نشان دسته روی کارت" checked={value.showItemCategoryBadge} onChange={(v) => set('showItemCategoryBadge', v)} />
          <ToggleRow label="نشان تعداد آپشن" checked={value.showModifierBadge} onChange={(v) => set('showModifierBadge', v)} />
          <ToggleRow label="نمایش قیمت" checked={value.showPrice} onChange={(v) => set('showPrice', v)} />
          <label className="field">
            <span>دکمه افزودن</span>
            <select
              value={value.addButtonStyle}
              onChange={(e) => set('addButtonStyle', e.target.value as MenuAppearance['addButtonStyle'])}
            >
              <option value="icon">آیکون +</option>
              <option value="pill">دکمه «افزودن»</option>
            </select>
          </label>
          {value.layout === 'list' && (
            <label className="field">
              <span>اندازه تصویر در لیست</span>
              <select
                value={value.listThumbnailSize}
                onChange={(e) => set('listThumbnailSize', e.target.value as MenuAppearance['listThumbnailSize'])}
              >
                <option value="sm">کوچک</option>
                <option value="md">متوسط</option>
                <option value="lg">بزرگ</option>
              </select>
            </label>
          )}
        </div>
      </section>

      <section className="card">
        <h3>افکت‌ها و حالت خالی</h3>
        <div className="form-grid">
          <ToggleRow label="انیمیشن ورود کارت‌ها" checked={value.animateCards} onChange={(v) => set('animateCards', v)} />
          <ToggleRow label="سایه کارت‌ها" checked={value.cardShowShadow} onChange={(v) => set('cardShowShadow', v)} />
          <label className="field field-full">
            <span>پیام وقتی نتیجه‌ای نیست</span>
            <input value={value.emptyStateMessage} onChange={(e) => set('emptyStateMessage', e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="btn-ghost btn-sm"
          style={{ marginTop: 12 }}
          onClick={() => onChange({ ...DEFAULT_MENU_APPEARANCE })}
        >
          بازنشانی ظاهر منو به پیش‌فرض
        </button>
      </section>
    </div>
  )
}
