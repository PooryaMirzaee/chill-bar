import type { CoffeeFortuneSettings, CoffeeFortuneEntry, CoffeeFortuneSymbol } from '@chill-bar/shared'

interface Props {
  settings: CoffeeFortuneSettings
  onChange: (settings: CoffeeFortuneSettings) => void
}

export function CoffeeFortuneSettingsPanel({ settings, onChange }: Props) {
  const patch = (p: Partial<CoffeeFortuneSettings>) => onChange({ ...settings, ...p })

  const updateFortune = (index: number, p: Partial<CoffeeFortuneEntry>) => {
    patch({
      fortunes: settings.fortunes.map((f, i) => (i === index ? { ...f, ...p } : f)),
    })
  }

  const updateSymbol = (index: number, p: Partial<CoffeeFortuneSymbol>) => {
    patch({
      symbols: settings.symbols.map((s, i) => (i === index ? { ...s, ...p } : s)),
    })
  }

  const addFortune = () => {
    patch({
      fortunes: [
        ...settings.fortunes,
        {
          id: `fortune-${settings.fortunes.length + 1}`,
          fortune: 'فال جدید…',
          mood: 'جدید',
          moodEmoji: '✨',
          love: '…',
          career: '…',
          luck: '…',
          enabled: true,
        },
      ],
    })
  }

  const addSymbol = () => {
    patch({
      symbols: [
        ...settings.symbols,
        {
          id: `symbol-${settings.symbols.length + 1}`,
          emoji: '🔮',
          label: 'نماد جدید',
          meaning: 'معنی نماد…',
        },
      ],
    })
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>تنظیمات کلی فال قهوه</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          متن‌ها، رنگ و هشتگ استوری. فال‌ها و نمادهای فنجان را پایین مدیریت کن.
        </p>
        <div className="form-grid">
          <label className="field field-full">
            <span>عنوان</span>
            <input value={settings.title} onChange={(e) => patch({ title: e.target.value })} />
          </label>
          <label className="field field-full">
            <span>زیرعنوان</span>
            <input value={settings.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
          </label>
          <label className="field">
            <span>راهنمای مراسم (نگه داشتن فنجان)</span>
            <input value={settings.ritualHint} onChange={(e) => patch({ ritualHint: e.target.value })} />
          </label>
          <label className="field">
            <span>راهنمای خواندن فال</span>
            <input value={settings.readingHint} onChange={(e) => patch({ readingHint: e.target.value })} />
          </label>
          <label className="field">
            <span>هشتگ استوری</span>
            <input value={settings.shareHashtag} onChange={(e) => patch({ shareHashtag: e.target.value })} dir="ltr" />
          </label>
          <label className="field">
            <span>رنگ تاکید</span>
            <input type="color" value={settings.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} />
          </label>
          <label className="field">
            <span>حداکثر فال در هر بازدید (۰ = نامحدود)</span>
            <input
              type="number"
              min={0}
              max={20}
              value={settings.maxReadsPerVisit}
              onChange={(e) => patch({ maxReadsPerVisit: Number(e.target.value) })}
            />
          </label>
          <label className="field field-full">
            <span>ایموجی‌های خوش‌شانس (با کاما جدا)</span>
            <input
              value={settings.luckyEmojis.join(',')}
              onChange={(e) =>
                patch({
                  luckyEmojis: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="field field-full">
            <span>زمان‌های طلایی (هر خط یک مورد)</span>
            <textarea
              rows={4}
              value={settings.luckyTimes.join('\n')}
              onChange={(e) =>
                patch({
                  luckyTimes: e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>نمادهای فنجان ({settings.symbols.length})</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          هر بار یک نماد تصادفی در فال ظاهر می‌شود — مثل فال قهوه سنتی.
        </p>
        {settings.symbols.map((sym, i) => (
          <div key={`${sym.id}-${i}`} className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="form-grid">
              <label className="field">
                <span>شناسه</span>
                <input value={sym.id} onChange={(e) => updateSymbol(i, { id: e.target.value })} dir="ltr" />
              </label>
              <label className="field">
                <span>ایموجی</span>
                <input value={sym.emoji} onChange={(e) => updateSymbol(i, { emoji: e.target.value })} />
              </label>
              <label className="field">
                <span>نام نماد</span>
                <input value={sym.label} onChange={(e) => updateSymbol(i, { label: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>تفسیر نماد</span>
                <textarea rows={2} value={sym.meaning} onChange={(e) => updateSymbol(i, { meaning: e.target.value })} />
              </label>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => patch({ symbols: settings.symbols.filter((_, j) => j !== i) })}
            >
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addSymbol}>
          + نماد جدید
        </button>
      </section>

      <section className="card">
        <h3>فال‌ها ({settings.fortunes.filter((f) => f.enabled).length} فعال)</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          هر فال شامل پیام اصلی + سه بخش عشق، کار و شانس است که در کارت استوری نمایش داده می‌شود.
        </p>
        {settings.fortunes.map((fortune, i) => (
          <div
            key={`${fortune.id}-${i}`}
            className="card"
            style={{ marginBottom: 12, padding: 12, opacity: fortune.enabled ? 1 : 0.55 }}
          >
            <div className="form-grid">
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={fortune.enabled}
                  onChange={(e) => updateFortune(i, { enabled: e.target.checked })}
                />
                <span>فعال</span>
              </label>
              <label className="field">
                <span>شناسه</span>
                <input value={fortune.id} onChange={(e) => updateFortune(i, { id: e.target.value })} dir="ltr" />
              </label>
              <label className="field">
                <span>حال ({fortune.moodEmoji})</span>
                <input value={fortune.mood} onChange={(e) => updateFortune(i, { mood: e.target.value })} />
              </label>
              <label className="field">
                <span>ایموجی حال</span>
                <input value={fortune.moodEmoji} onChange={(e) => updateFortune(i, { moodEmoji: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>فال اصلی</span>
                <textarea rows={2} value={fortune.fortune} onChange={(e) => updateFortune(i, { fortune: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>💕 عشق</span>
                <input value={fortune.love} onChange={(e) => updateFortune(i, { love: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>💼 کار / زندگی</span>
                <input value={fortune.career} onChange={(e) => updateFortune(i, { career: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>🍀 شانس</span>
                <input value={fortune.luck} onChange={(e) => updateFortune(i, { luck: e.target.value })} />
              </label>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={settings.fortunes.length <= 1}
              onClick={() => patch({ fortunes: settings.fortunes.filter((_, j) => j !== i) })}
            >
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addFortune}>
          + فال جدید
        </button>
      </section>

      <section className="card">
        <h3>رنگ‌های خوش‌شانس</h3>
        {settings.luckyColors.map((color, i) => (
          <div key={`color-${i}`} className="form-grid" style={{ marginBottom: 8 }}>
            <label className="field">
              <span>نام</span>
              <input
                value={color.name}
                onChange={(e) => {
                  const luckyColors = [...settings.luckyColors]
                  luckyColors[i] = { ...color, name: e.target.value }
                  patch({ luckyColors })
                }}
              />
            </label>
            <label className="field">
              <span>رنگ</span>
              <input
                type="color"
                value={color.hex}
                onChange={(e) => {
                  const luckyColors = [...settings.luckyColors]
                  luckyColors[i] = { ...color, hex: e.target.value }
                  patch({ luckyColors })
                }}
              />
            </label>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => patch({ luckyColors: settings.luckyColors.filter((_, j) => j !== i) })}
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            patch({
              luckyColors: [...settings.luckyColors, { name: 'جدید', hex: '#888888' }],
            })
          }
        >
          + رنگ
        </button>
      </section>
    </div>
  )
}
