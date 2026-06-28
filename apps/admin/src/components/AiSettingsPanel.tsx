import { useState } from 'react'
import { Loader2, Zap, Bot } from 'lucide-react'
import type { AiSettings } from '@chill-bar/shared'
import { DEFAULT_AI_SETTINGS, AI_MODEL_PRESETS } from '@chill-bar/shared'
import { api } from '../lib/api'

interface Props {
  settings: AiSettings
  onChange: (settings: AiSettings) => void
}

export function AiSettingsPanel({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const set = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api<{ ok: boolean; sample: string }>('/api/admin/ai/test', {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      setTestResult({ ok: true, message: `اتصال موفق ✓ ${res.sample}` })
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'اتصال ناموفق',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>
          <Bot size={18} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 6 }} />
          اتصال AvalAI
        </h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          از{' '}
          <a href="https://docs.avalai.ir/fa/quickstart" target="_blank" rel="noreferrer">
            مستندات AvalAI
          </a>{' '}
          کلید API بگیرید. API سازگار با OpenAI است (base: api.avalai.ir/v1).
        </p>
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => set('enabled', e.target.checked)}
            />
            <span>گارسون هوشمند فعال باشد</span>
          </label>
          <label className="field field-full">
            <span>کلید API AvalAI</span>
            <input
              type="password"
              value={settings.apiKey}
              placeholder="aa-..."
              onChange={(e) => set('apiKey', e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field field-full">
            <span>آدرس پایه API</span>
            <input value={settings.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} dir="ltr" />
          </label>
          <label className="field">
            <span>مدل</span>
            <input
              list="ai-models"
              value={settings.model}
              onChange={(e) => set('model', e.target.value)}
              dir="ltr"
            />
            <datalist id="ai-models">
              {AI_MODEL_PRESETS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <label className="field">
            <span>دما ({settings.temperature})</span>
            <input
              type="range"
              min={0}
              max={1.2}
              step={0.05}
              value={settings.temperature}
              onChange={(e) => set('temperature', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداکثر توکن پاسخ</span>
            <input
              type="number"
              min={128}
              max={4096}
              value={settings.maxTokens}
              onChange={(e) => set('maxTokens', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>تاریخچه گفتگو (پیام)</span>
            <input
              type="number"
              min={2}
              max={24}
              value={settings.maxHistoryMessages}
              onChange={(e) => set('maxHistoryMessages', Number(e.target.value))}
            />
          </label>
          <div className="field field-full" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
              تست اتصال
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onChange({ ...DEFAULT_AI_SETTINGS, apiKey: settings.apiKey })}
            >
              بازنشانی پیش‌فرض
            </button>
          </div>
          {testResult && (
            <p
              className="field-full"
              style={{ color: testResult.ok ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem' }}
            >
              {testResult.message}
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h3>شخصیت و محدودیت</h3>
        <div className="form-grid">
          <label className="field">
            <span>نام دستیار</span>
            <input value={settings.assistantName} onChange={(e) => set('assistantName', e.target.value)} />
          </label>
          <label className="field">
            <span>ایموجی</span>
            <input value={settings.assistantEmoji} onChange={(e) => set('assistantEmoji', e.target.value)} />
          </label>
          <label className="field field-full">
            <span>پیام خوش‌آمد</span>
            <textarea
              rows={2}
              value={settings.welcomeMessage}
              onChange={(e) => set('welcomeMessage', e.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>پاسخ سوالات نامرتبط</span>
            <textarea
              rows={2}
              value={settings.outOfScopeMessage}
              onChange={(e) => set('outOfScopeMessage', e.target.value)}
            />
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.strictMode}
              onChange={(e) => set('strictMode', e.target.checked)}
            />
            <span>حالت سخت‌گیرانه — فقط سوالات مرتبط با کافه/منو</span>
          </label>
          <label className="field field-full">
            <span>دستورالعمل اضافه (اختیاری)</span>
            <textarea
              rows={3}
              value={settings.systemPromptExtra}
              onChange={(e) => set('systemPromptExtra', e.target.value)}
              placeholder="مثلاً: همیشه بستنی لوتوسیا را در شب‌ها پیشنهاد بده"
            />
          </label>
          <label className="field field-full">
            <span>placeholder ورودی چت</span>
            <input value={settings.inputPlaceholder} onChange={(e) => set('inputPlaceholder', e.target.value)} />
          </label>
          <label className="field">
            <span>برچسب وضعیت آنلاین</span>
            <input value={settings.onlineStatusLabel} onChange={(e) => set('onlineStatusLabel', e.target.value)} />
          </label>
          <label className="field field-full">
            <span>پیام غیرفعال بودن AI</span>
            <textarea
              rows={2}
              value={settings.disabledMessage}
              onChange={(e) => set('disabledMessage', e.target.value)}
            />
          </label>
          <label className="field field-full">
            <span>پیشنهادهای سریع (هر خط یک مورد)</span>
            <textarea
              rows={5}
              value={settings.quickPrompts.join('\n')}
              onChange={(e) =>
                set(
                  'quickPrompts',
                  e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                )
              }
            />
          </label>
        </div>
      </section>
    </div>
  )
}
