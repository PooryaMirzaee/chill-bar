import { useState } from 'react'
import { Loader2, MessageSquare, ExternalLink, RefreshCw } from 'lucide-react'
import type { SmsSettings } from '@chill-bar/shared'
import { api } from '../lib/api'

interface Props {
  settings: SmsSettings
  onChange: (settings: SmsSettings) => void
}

export function SmsSettingsPanel({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [bulkTesting, setBulkTesting] = useState(false)
  const [testMobile, setTestMobile] = useState('')
  const [bulkMessage, setBulkMessage] = useState('تست ارسال گروهی چیل‌بار')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [syncInfo, setSyncInfo] = useState<{ credit: number; lines: number[] } | null>(null)

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

  const syncAccount = async () => {
    setSyncing(true)
    setTestResult(null)
    try {
      const res = await api<{ credit: number; lines: number[] }>('/api/admin/sms/sync')
      setSyncInfo({ credit: res.credit, lines: res.lines })
      if (!settings.lineNumber && res.lines[0]) {
        set('lineNumber', String(res.lines[0]))
      }
      setTestResult({
        ok: true,
        message: `سینک شد — اعتبار: ${res.credit.toLocaleString('fa-IR')} · خطوط: ${res.lines.length}`,
      })
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'سینک ناموفق',
      })
    } finally {
      setSyncing(false)
    }
  }

  const testBulk = async () => {
    setBulkTesting(true)
    setTestResult(null)
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/admin/sms/bulk-test', {
        method: 'POST',
        body: JSON.stringify({ mobile: testMobile, messageText: bulkMessage }),
      })
      setTestResult({ ok: true, message: res.message })
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'ارسال گروهی ناموفق',
      })
    } finally {
      setBulkTesting(false)
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
                ورود با پیامک (SMS.ir)
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
      </section>

      <section className="card">
        <h3>اتصال SMS.ir</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          مستندات:{' '}
          <a href="https://sms.ir/rest-api/" target="_blank" rel="noreferrer">
            REST API
          </a>{' '}
          · پنل:{' '}
          <a href="https://sms.ir/" target="_blank" rel="noreferrer">
            sms.ir
          </a>
        </p>
        <div className="form-grid">
          <label className="field field-full">
            <span>کلید API (x-api-key)</span>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => set('apiKey', e.target.value)}
              placeholder="کلید وب‌سرویس — برای تست از کلید Sandbox هم می‌شود"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>شماره خط (برای Bulk)</span>
            <input
              value={settings.lineNumber}
              onChange={(e) => set('lineNumber', e.target.value)}
              placeholder="از سینک خطوط پر می‌شود"
              dir="ltr"
            />
          </label>
          <div className="field" style={{ display: 'flex', alignItems: 'end' }}>
            <button type="button" className="btn-secondary" onClick={syncAccount} disabled={syncing}>
              {syncing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              سینک اعتبار و خطوط
            </button>
          </div>
        </div>
        {syncInfo && (
          <p className="field-hint" style={{ marginTop: 10 }}>
            اعتبار: <strong dir="ltr">{syncInfo.credit}</strong>
            {syncInfo.lines.length > 0 && (
              <>
                {' '}
                · خطوط:{' '}
                <span dir="ltr">{syncInfo.lines.join(', ')}</span>
              </>
            )}
          </p>
        )}
      </section>

      <section className="card">
        <h3>قالب Verify (OTP)</h3>
        <div className="form-grid">
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
              dir="ltr"
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
        <h3>اعلان وضعیت سفارش</h3>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          با تغییر وضعیت سفارش، پیامک Verify جداگانه ارسال می‌شود (قالب جدا در پنل SMS.ir).
        </p>
        <div className="form-grid">
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.orderNotifyEnabled}
              onChange={(e) => set('orderNotifyEnabled', e.target.checked)}
            />
            <span>ارسال پیامک هنگام تغییر وضعیت سفارش</span>
          </label>
          <label className="field">
            <span>TemplateId سفارش</span>
            <input
              type="number"
              min={0}
              value={settings.orderTemplateId || ''}
              onChange={(e) => set('orderTemplateId', Number(e.target.value) || 0)}
            />
          </label>
          <label className="field">
            <span>پارامتر کد سفارش</span>
            <input
              value={settings.orderCodeParameterName}
              onChange={(e) => set('orderCodeParameterName', e.target.value)}
              dir="ltr"
            />
          </label>
          <label className="field">
            <span>پارامتر وضعیت</span>
            <input
              value={settings.orderStatusParameterName}
              onChange={(e) => set('orderStatusParameterName', e.target.value)}
              dir="ltr"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>تست ارسال</h3>
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
          <label className="field field-full">
            <span>متن تست Bulk</span>
            <input value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={testConnection}
            disabled={testing || !testMobile.trim()}
          >
            {testing ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
            تست Verify (OTP)
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={testBulk}
            disabled={bulkTesting || !testMobile.trim() || !settings.lineNumber}
          >
            {bulkTesting ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
            تست Bulk
          </button>
        </div>
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
          <li>کلید API را از برنامه‌نویسان SMS.ir بردارید (Sandbox برای تست بدون کسر اعتبار)</li>
          <li>قالب Verify بسازید مثلاً: «کد ورود شما: #Code#»</li>
          <li>سینک اعتبار و خطوط را بزنید و خط پیش‌فرض را انتخاب کنید</li>
          <li>برای اعلان سفارش قالب جدا با #OrderCode# و #Status# بسازید</li>
          <li>تست Verify بزنید، سپس ذخیره کنید</li>
        </ol>
      </section>
    </div>
  )
}
