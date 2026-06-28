import type { MoodDefinition } from '@chill-bar/shared'

interface Props {
  moods: MoodDefinition[]
  onChange: (moods: MoodDefinition[]) => void
}

export function MoodsSettingsPanel({ moods, onChange }: Props) {
  const update = (index: number, patch: Partial<MoodDefinition>) => {
    onChange(moods.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  const addMood = () => {
    onChange([
      ...moods,
      {
        id: `mood-${moods.length + 1}`,
        label: 'جدید',
        emoji: '✨',
        color: '#888888',
        aiPrompt: 'چی پیشنهاد می‌دی؟',
        tagWeights: {},
      },
    ])
  }

  const removeMood = (index: number) => {
    if (moods.length <= 1) return
    onChange(moods.filter((_, i) => i !== index))
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>حالت‌های مود (حال و هوا)</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          هر مود در اپ، پیشنهادات منو و پیام AI استفاده می‌شود. tagWeights برای امتیازدهی (JSON ساده: energy:1).
        </p>
        {moods.map((mood, i) => (
          <div key={`${mood.id}-${i}`} className="card" style={{ marginBottom: 12, padding: 12 }}>
            <div className="form-grid">
              <label className="field">
                <span>شناسه (انگلیسی)</span>
                <input value={mood.id} onChange={(e) => update(i, { id: e.target.value })} dir="ltr" />
              </label>
              <label className="field">
                <span>برچسب فارسی</span>
                <input value={mood.label} onChange={(e) => update(i, { label: e.target.value })} />
              </label>
              <label className="field">
                <span>ایموجی</span>
                <input value={mood.emoji} onChange={(e) => update(i, { emoji: e.target.value })} />
              </label>
              <label className="field">
                <span>رنگ</span>
                <input type="color" value={mood.color} onChange={(e) => update(i, { color: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>پیام AI (وقتی مود انتخاب شود)</span>
                <input value={mood.aiPrompt} onChange={(e) => update(i, { aiPrompt: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>tagWeights (JSON)</span>
                <input
                  value={JSON.stringify(mood.tagWeights)}
                  onChange={(e) => {
                    try {
                      update(i, { tagWeights: JSON.parse(e.target.value) as Record<string, number> })
                    } catch {
                      /* ignore invalid json while typing */
                    }
                  }}
                  dir="ltr"
                />
              </label>
            </div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => removeMood(i)}>
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="btn-secondary" onClick={addMood}>
          + افزودن مود
        </button>
      </section>
    </div>
  )
}
