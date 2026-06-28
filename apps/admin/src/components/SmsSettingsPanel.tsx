import { useState } from 'react'
import { Loader2, MessageSquare, ExternalLink } from 'lucide-react'
import type { SmsSettings } from '@chill-bar/shared'
import { api } from '../lib/api'

interface Props {
  settings: SmsSettings
  onChange: (settings: SmsSettings) => void
}

export function SmsSettingsPanel({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false)
  const [testMobile, setTestMobile] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const set = <K extends keyof SmsSettings>(key: K, value: SmsSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/admin/sms/test', {
        method: 'POST',
        body: JSON.stringify({ ...settings, testMobile }),
      })
      setTestResult({ ok: true, message: res.message })
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'ارسال ناموفق',
      })
    } finally {
      setTesting(false)
    }
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
                <MessageSquare size={20} />
                ورود با پیامک (SMS)
              </h3>
              <p className="field-hint" style={{ marginTop: 6 }}>
                {settings.enabled
                  ? 'ثبت‌نام و ورود مشتری با کد پیامکی فعال است'
                  : 'غیرفعال — مشتریان نمی‌توانند با شماره موبایل وارد شوند'}
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
        {!settings.enabled && (
          <p className="field-hint" style={{ marginTop: 12, color: 'var(--warning)' }}>
            تا فعال نشود، ثبت‌نام/ورود مشتریان با پیامک امکان‌پذیر نیست.
          </p>
        )}
      </section>

      <section className="card">
        <h3>تنظیمات SMS.ir</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          از{' '}
          <a href="https://sms.ir/rest-api/" target="_blank" rel="noreferrer">
            مستندات REST API
          </a>{' '}
          کلید API بگیرید و یک{' '}
          <a href="https://sms.ir/" target="_blank" rel="noreferrer">
            قالب Verify (OTP)
          </a>{' '}
          در پنل بسازید.
        </p>
        <div className="form-grid">
          <label className="field field-full">
            <span>کلید API (x-api-key)</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => set('apiKey', e.target.value)}
              placeholder="کلید وب‌سرویس SMS.ir"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>شناسه قالب (TemplateId)</span>
            <input
              type="number"
              min={1}
              value={settings.templateId || ''}
              onChange={(e) => set('templateId', Number(e.target.value) || 0)}
              placeholder="مثلاً 123456"
            />
          </label>
          <label className="field">
            <span>نام پارامتر کد در قالب</span>
            <input
              value={settings.codeParameterName}
              onChange={(e) => set('codeParameterName', e.target.value)}
              placeholder="Code"
            />
          </label>
          <label className="field">
            <span>طول کد OTP</span>
            <input
              type="number"
              min={4}
              max={8}
              value={settings.otpLength}
              onChange={(e) => set('otpLength', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>اعتبار کد (دقیقه)</span>
            <input
              type="number"
              min={1}
              max={15}
              value={settings.otpExpiryMinutes}
              onChange={(e) => set('otpExpiryMinutes', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>فاصله ارسال مجدد (ثانیه)</span>
            <input
              type="number"
              min={30}
              max={300}
              value={settings.resendCooldownSeconds}
              onChange={(e) => set('resendCooldownSeconds', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداکثر تلاش تأیید</span>
            <input
              type="number"
              min={3}
              max={10}
              value={settings.maxVerifyAttempts}
              onChange={(e) => set('maxVerifyAttempts', Number(e.target.value))}
            />
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.storeNameInSms}
              onChange={(e) => set('storeNameInSms', e.target.checked)}
            />
            <span>نام فروشگاه در پیامک (در صورت پشتیبانی قالب)</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>تست ارسال</h3>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          یک پیامک تست با قالب Verify به شماره خودتان ارسال می‌شود.
        </p>
        <div className="form-grid">
          <label className="field field-full">
            <span>شماره موبایل تست</span>
            <input
              inputMode="tel"
              value={testMobile}
              onChange={(e) => setTestMobile(e.target.value)}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
            />
          </label>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={testConnection}
          disabled={testing || !testMobile.trim()}
          style={{ marginTop: 12 }}
        >
          {testing ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
          {testing ? 'در حال ارسال…' : 'ارسال پیامک تست'}
        </button>
        {testResult && (
          <p
            className="field-hint"
            style={{ marginTop: 8, color: testResult.ok ? 'var(--success)' : 'var(--danger)' }}
          >
            {testResult.message}
          </p>
        )}
      </section>

      <section className="card">
        <h3>راهنمای سریع</h3>
        <ol className="field-hint" style={{ lineHeight: 1.8, paddingInlineStart: 20 }}>
          <li>سوئیچ بالا را روشن کنید</li>
          <li>در پنل SMS.ir یک قالب Verify بسازید (مثلاً: «کد ورود شما: #Code#»)</li>
          <li>TemplateId و نام پارامتر (#Code# → Code) را وارد کنید</li>
          <li>کلید API را از بخش «برنامه‌نویسان» کپی کنید</li>
          <li>تست ارسال بزنید، سپس ذخیره کنید</li>
        </ol>
      </section>
    </div>
  )
}
