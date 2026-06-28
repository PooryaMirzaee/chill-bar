import { Volume2 } from 'lucide-react'
import type { AdminAlertSettings } from '@chill-bar/shared'
import { ADMIN_ALERT_SOUND_LABELS } from '@chill-bar/shared'
import { playAlertSound } from '../lib/alertSounds'

interface Props {
  settings: AdminAlertSettings
  onChange: (settings: AdminAlertSettings) => void
}

const SOUNDS = Object.keys(ADMIN_ALERT_SOUND_LABELS) as AdminAlertSettings['newOrderSound'][]

export function AlertSettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof AdminAlertSettings>(key: K, value: AdminAlertSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const preview = (sound: AdminAlertSettings['newOrderSound']) => {
    playAlertSound(sound, settings.volume)
  }

  return (
    <div className="settings-grid">
      <section
        className="card"
        style={{
          borderColor: settings.enabled ? 'var(--success)' : 'var(--border)',
          background: settings.enabled
            ? 'linear-gradient(135deg, rgba(34,197,94,0.08), transparent)'
            : undefined,
        }}
      >
        <div className="feature-list">
          <label className="feature-toggle">
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Volume2 size={20} />
                اعلان صوتی پنل
              </h3>
              <p className="field-hint" style={{ marginTop: 6 }}>
                {settings.enabled
                  ? 'صدای سفارش جدید و یادآور سفارش‌های تأییدنشده فعال است'
                  : 'همه صداهای پنل خاموش است'}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>سفارش جدید</h3>
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.soundOnNewOrder}
              onChange={(e) => set('soundOnNewOrder', e.target.checked)}
            />
            <span>با رسیدن سفارش جدید صدا پخش شود</span>
          </label>
          <label className="field">
            <span>نوع صدا</span>
            <select
              value={settings.newOrderSound}
              onChange={(e) =>
                set('newOrderSound', e.target.value as AdminAlertSettings['newOrderSound'])
              }
            >
              {SOUNDS.map((id) => (
                <option key={id} value={id}>
                  {ADMIN_ALERT_SOUND_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>&nbsp;</span>
            <button type="button" className="btn-secondary btn-sm" onClick={() => preview(settings.newOrderSound)}>
              پیش‌نمایش
            </button>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>یادآور سفارش تأییدنشده</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          تا وقتی سفارشی در ستون «در انتظار تأیید» باشد، هر چند ثانیه یک‌بار صدا پخش می‌شود.
        </p>
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.pendingReminderEnabled}
              onChange={(e) => set('pendingReminderEnabled', e.target.checked)}
            />
            <span>یادآور دوره‌ای فعال باشد</span>
          </label>
          <label className="field">
            <span>فاصله یادآور (ثانیه)</span>
            <input
              type="number"
              min={5}
              max={300}
              value={settings.pendingReminderIntervalSeconds}
              onChange={(e) => set('pendingReminderIntervalSeconds', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>نوع صدا</span>
            <select
              value={settings.pendingReminderSound}
              onChange={(e) =>
                set('pendingReminderSound', e.target.value as AdminAlertSettings['pendingReminderSound'])
              }
            >
              {SOUNDS.map((id) => (
                <option key={id} value={id}>
                  {ADMIN_ALERT_SOUND_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>&nbsp;</span>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => preview(settings.pendingReminderSound)}
            >
              پیش‌نمایش
            </button>
          </label>
          <label className="field field-full">
            <span>بلندی صدا ({Math.round(settings.volume * 100)}٪)</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => set('volume', Number(e.target.value))}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
