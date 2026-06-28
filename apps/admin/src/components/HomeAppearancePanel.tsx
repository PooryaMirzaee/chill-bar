import { ChevronDown, ChevronUp } from 'lucide-react'
import type { HomeAppearance, HomeSectionId } from '@chill-bar/shared'
import { DEFAULT_HOME_APPEARANCE, HOME_SECTION_LABELS } from '@chill-bar/shared'

interface Props {
  value: HomeAppearance
  onChange: (value: HomeAppearance) => void
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

function moveSection(order: HomeSectionId[], index: number, dir: -1 | 1): HomeSectionId[] {
  const next = index + dir
  if (next < 0 || next >= order.length) return order
  const copy = [...order]
  const [item] = copy.splice(index, 1)
  copy.splice(next, 0, item)
  return copy
}

export function HomeAppearancePanel({ value, onChange }: Props) {
  const set = <K extends keyof HomeAppearance>(key: K, v: HomeAppearance[K]) => {
    onChange({ ...value, [key]: v })
  }

  return (
    <div className="menu-appearance-panel">
      <section className="card">
        <h3>چیدمان صفحه خانه</h3>
        <label className="field field-full">
          <span>فاصله بین بخش‌ها ({value.sectionGap}rem)</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.25}
            value={value.sectionGap}
            onChange={(e) => set('sectionGap', Number(e.target.value))}
          />
        </label>
        <p className="field-hint">ترتیب نمایش بخش‌ها در صفحه خانه</p>
        <div className="table-wrap" style={{ marginTop: 8 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ترتیب</th>
                <th>بخش</th>
                <th>نمایش</th>
              </tr>
            </thead>
            <tbody>
              {value.sectionOrder.map((id, index) => (
                <tr key={id}>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="icon-btn-sm"
                        disabled={index === 0}
                        onClick={() => set('sectionOrder', moveSection(value.sectionOrder, index, -1))}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn-sm"
                        disabled={index === value.sectionOrder.length - 1}
                        onClick={() => set('sectionOrder', moveSection(value.sectionOrder, index, 1))}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </td>
                  <td>{HOME_SECTION_LABELS[id]}</td>
                  <td>
                    {id === 'smartPicks' && (
                      <input
                        type="checkbox"
                        checked={value.showSmartPicks}
                        onChange={(e) => set('showSmartPicks', e.target.checked)}
                      />
                    )}
                    {id === 'categories' && (
                      <input
                        type="checkbox"
                        checked={value.showCategories}
                        onChange={(e) => set('showCategories', e.target.checked)}
                      />
                    )}
                    {id === 'moods' && (
                      <input
                        type="checkbox"
                        checked={value.showMoodPicker}
                        onChange={(e) => set('showMoodPicker', e.target.checked)}
                      />
                    )}
                    {id === 'combo' && (
                      <input
                        type="checkbox"
                        checked={value.showComboOnHome}
                        onChange={(e) => set('showComboOnHome', e.target.checked)}
                      />
                    )}
                    {id === 'story' && (
                      <input
                        type="checkbox"
                        checked={value.showStoryFeed}
                        onChange={(e) => set('showStoryFeed', e.target.checked)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-hint">کمبو همچنان از تب «قابلیت‌ها» با گزینه «کمبو هوشمند» کنترل می‌شود.</p>
      </section>

      <section className="card">
        <h3>پیشنهاد هوشمند</h3>
        <div className="form-grid">
          <label className="field">
            <span>چیدمان</span>
            <select
              value={value.smartPicksLayout}
              onChange={(e) => set('smartPicksLayout', e.target.value as HomeAppearance['smartPicksLayout'])}
            >
              <option value="carousel">اسکرول افقی</option>
              <option value="grid">شبکه ۲ ستونه</option>
            </select>
          </label>
          <label className="field">
            <span>برچسب (Eyebrow)</span>
            <input value={value.smartPicksEyebrow} onChange={(e) => set('smartPicksEyebrow', e.target.value)} />
          </label>
          <label className="field">
            <span>عنوان</span>
            <input value={value.smartPicksTitle} onChange={(e) => set('smartPicksTitle', e.target.value)} />
          </label>
          <label className="field field-full">
            <span>توضیح</span>
            <input
              value={value.smartPicksDescription}
              onChange={(e) => set('smartPicksDescription', e.target.value)}
            />
          </label>
          <ToggleRow label="شماره رتبه روی کارت" checked={value.smartPicksShowRank} onChange={(v) => set('smartPicksShowRank', v)} />
          <ToggleRow label="نمایش دلیل پیشنهاد" checked={value.smartPicksShowReason} onChange={(v) => set('smartPicksShowReason', v)} />
          <ToggleRow label="انیمیشن ورود" checked={value.smartPicksAnimate} onChange={(v) => set('smartPicksAnimate', v)} />
        </div>
        <p className="field-hint">تعداد آیتم‌ها از تب «فروشگاه» → «تعداد پیشنهاد هوشمند» تنظیم می‌شود.</p>
      </section>

      <section className="card">
        <h3>دسته‌بندی‌ها</h3>
        <div className="form-grid">
          <label className="field">
            <span>برچسب</span>
            <input value={value.categoriesEyebrow} onChange={(e) => set('categoriesEyebrow', e.target.value)} />
          </label>
          <label className="field">
            <span>عنوان</span>
            <input value={value.categoriesTitle} onChange={(e) => set('categoriesTitle', e.target.value)} />
          </label>
          <label className="field field-full">
            <span>توضیح</span>
            <input
              value={value.categoriesDescription}
              onChange={(e) => set('categoriesDescription', e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>انتخاب حال‌وهوا</h3>
        <ToggleRow
          label="نمایش بخش مود"
          hint="متن‌ها از تب «مودها» و «متن‌های اپ»"
          checked={value.showMoodPicker}
          onChange={(v) => set('showMoodPicker', v)}
        />
      </section>

      <section className="card">
        <h3>کمبو هوشمند (صفحه خانه)</h3>
        <label className="field">
          <span>برچسب بخش کمبو</span>
          <input value={value.comboEyebrow} onChange={(e) => set('comboEyebrow', e.target.value)} />
        </label>
      </section>

      <section className="card">
        <h3>استوری منو</h3>
        <div className="form-grid">
          <label className="field">
            <span>چرخش خودکار (ثانیه)</span>
            <input
              type="number"
              min={2}
              max={30}
              value={value.storyAutoRotateSeconds}
              onChange={(e) => set('storyAutoRotateSeconds', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>استایل هدر کارت</span>
            <select
              value={value.storyHeroStyle}
              onChange={(e) => set('storyHeroStyle', e.target.value as HomeAppearance['storyHeroStyle'])}
            >
              <option value="gradient">گرادیان رنگی</option>
              <option value="emoji">پس‌زمینه ساده + ایموجی</option>
            </select>
          </label>
          <ToggleRow label="نوار پیشرفت پایین کارت" checked={value.storyShowProgress} onChange={(v) => set('storyShowProgress', v)} />
        </div>
        <p className="field-hint">عنوان و متن استوری از تب «متن‌های اپ» قابل ویرایش است.</p>
      </section>

      <button
        type="button"
        className="btn-ghost btn-sm"
        onClick={() => onChange({ ...DEFAULT_HOME_APPEARANCE })}
      >
        بازنشانی صفحه خانه به پیش‌فرض
      </button>
    </div>
  )
}
