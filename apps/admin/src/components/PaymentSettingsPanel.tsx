import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import type { PaymentSettings } from '@chill-bar/shared'
import { api } from '../lib/api'

interface Props {
  settings: PaymentSettings
  onChange: (settings: PaymentSettings) => void
}

export function PaymentSettingsPanel({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const recent = useQuery({
    queryKey: ['payments-recent'],
    queryFn: () =>
      api<
        Array<{
          id: string
          purpose: string
          status: string
          amount: number
          refId: string | null
          orderCode: string | null
          unitCode: string | null
          createdAt: string
        }>
      >('/api/admin/payments/recent'),
  })

  const set = <K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api<{ ok: boolean; message: string }>('/api/admin/payments/zarinpal/test', {
        method: 'POST',
        body: JSON.stringify(settings),
      })
      setTestResult({ ok: true, message: res.message })
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'تست ناموفق',
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
                <CreditCard size={20} />
                درگاه زرین‌پال
              </h3>
              <p className="field-hint" style={{ marginTop: 6 }}>
                {settings.enabled
                  ? settings.sandbox
                    ? 'فعال — حالت سندباکس (تست)'
                    : 'فعال — محیط واقعی'
                  : 'غیرفعال — پرداخت آنلاین خاموش است'}
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
        <h3>تنظیمات زرین‌پال</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          طبق{' '}
          <a href="https://www.zarinpal.com/docs/paymentGateway/connectToGateway" target="_blank" rel="noreferrer">
            مستندات اتصال درگاه
          </a>{' '}
          مرچنت‌کد را از پنل{' '}
          <a href="https://www.zarinpal.com/" target="_blank" rel="noreferrer">
            زرین‌پال
          </a>{' '}
          بردارید.
        </p>
        <div className="form-grid">
          <label className="field field-full">
            <span>مرچنت‌کد (۳۶ کاراکتر)</span>
            <input
              type="password"
              value={settings.merchantId}
              onChange={(e) => set('merchantId', e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              dir="ltr"
            />
          </label>
          <label className="checkbox-field field-full">
            <input
              type="checkbox"
              checked={settings.sandbox}
              onChange={(e) => set('sandbox', e.target.checked)}
            />
            <span>حالت Sandbox (تست بدون پول واقعی)</span>
          </label>
          <label className="field">
            <span>واحد پول</span>
            <select
              value={settings.currency}
              onChange={(e) => set('currency', e.target.value as PaymentSettings['currency'])}
            >
              <option value="IRT">تومان (IRT)</option>
              <option value="IRR">ریال (IRR)</option>
            </select>
          </label>
          <label className="field">
            <span>حداقل مبلغ</span>
            <input
              type="number"
              min={100}
              value={settings.minAmount}
              onChange={(e) => set('minAmount', Number(e.target.value) || 1000)}
              dir="ltr"
            />
          </label>
          <label className="field field-full">
            <span>آدرس API برای Callback</span>
            <input
              value={settings.callbackBaseUrl}
              onChange={(e) => set('callbackBaseUrl', e.target.value)}
              placeholder="https://chill-bar.ir"
              dir="ltr"
            />
            <span className="field-hint">
              زرین‌پال به{' '}
              <code dir="ltr">
                {settings.callbackBaseUrl.replace(/\/$/, '')}/api/payments/zarinpal/callback
              </code>{' '}
              برمی‌گردد
            </span>
          </label>
          <label className="field field-full">
            <span>آدرس سایت مشتری (بعد از پرداخت)</span>
            <input
              value={settings.publicWebUrl}
              onChange={(e) => set('publicWebUrl', e.target.value)}
              placeholder="https://chill-bar.ir"
              dir="ltr"
            />
          </label>
          <label className="field field-full">
            <span>پیشوند توضیح تراکنش</span>
            <input
              value={settings.descriptionPrefix}
              onChange={(e) => set('descriptionPrefix', e.target.value)}
            />
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={settings.enableOrderPay}
              onChange={(e) => set('enableOrderPay', e.target.checked)}
            />
            <span>پرداخت آنلاین سفارش</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={settings.enableWalletTopup}
              onChange={(e) => set('enableWalletTopup', e.target.checked)}
            />
            <span>شارژ آنلاین کیف‌پول واحد</span>
          </label>
        </div>
      </section>

      <section className="card">
        <h3>تست اتصال</h3>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          یک درخواست Payment Request واقعی به زرین‌پال زده می‌شود (Authority می‌گیرد).
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={testConnection}
          disabled={testing || !settings.merchantId}
        >
          {testing ? <Loader2 size={16} className="spin" /> : <ExternalLink size={16} />}
          {testing ? 'در حال تست…' : 'تست درخواست پرداخت'}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>تراکنش‌های اخیر</h3>
          <button type="button" className="btn-secondary" onClick={() => recent.refetch()}>
            <RefreshCw size={14} />
          </button>
        </div>
        {recent.isLoading && <p className="field-hint">در حال بارگذاری…</p>}
        {recent.data && recent.data.length === 0 && (
          <p className="field-hint">هنوز تراکنشی ثبت نشده.</p>
        )}
        {recent.data && recent.data.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>وضعیت</th>
                  <th>نوع</th>
                  <th>مبلغ</th>
                  <th>ارجاع</th>
                  <th>جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {recent.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.status}</td>
                    <td>{r.purpose === 'ORDER' ? 'سفارش' : 'شارژ کیف'}</td>
                    <td dir="ltr">{r.amount.toLocaleString('fa-IR')}</td>
                    <td dir="ltr">{r.refId || '—'}</td>
                    <td>{r.orderCode || r.unitCode || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h3>راهنمای سریع</h3>
        <ol className="field-hint" style={{ lineHeight: 1.8, paddingInlineStart: 20 }}>
          <li>در زرین‌پال درگاه بسازید و مرچنت‌کد را کپی کنید</li>
          <li>اول با Sandbox تست کنید، بعد Sandbox را خاموش کنید</li>
          <li>واحد پول را با قیمت‌های منو هماهنگ کنید (معمولاً تومان / IRT)</li>
          <li>Callback باید از بیرون به API شما برسد (از طریق دامنه سایت)</li>
          <li>ذخیره کنید و تست درخواست پرداخت بزنید</li>
        </ol>
      </section>
    </div>
  )
}
