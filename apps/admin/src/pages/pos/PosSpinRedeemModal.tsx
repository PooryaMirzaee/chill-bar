import { useState } from 'react'
import { api } from '../../lib/api'

interface SpinClaim {
  id: string
  code: string
  prizeId: string
  prizeLabel: string
  prizeType: string
  prizeEmoji: string
  prizeSnapshot: {
    discountType?: 'percent' | 'fixed' | null
    discountValue?: number
    description?: string
    externalPrizeName?: string
  }
  phone: string
  redeemedAt: string | null
  expired?: boolean
}

interface Props {
  subtotal: number
  onClose: () => void
  onApplyDiscount: (amount: number, note: string) => void
  onPrefillCustomer?: (phone: string) => void
}

export function PosSpinRedeemModal({ subtotal, onClose, onApplyDiscount, onPrefillCustomer }: Props) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claim, setClaim] = useState<SpinClaim | null>(null)
  const [redeemed, setRedeemed] = useState(false)

  const lookup = async () => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError('کد را وارد کنید')
      return
    }
    setLoading(true)
    setError(null)
    setClaim(null)
    try {
      const found = await api<SpinClaim>(`/api/admin/spin/claims/${encodeURIComponent(normalized)}`)
      setClaim(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'کد یافت نشد')
    } finally {
      setLoading(false)
    }
  }

  const redeem = async () => {
    if (!claim) return
    setLoading(true)
    setError(null)
    try {
      const res = await api<{ ok: boolean; claim: SpinClaim }>('/api/admin/spin/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: claim.code }),
      })
      setClaim(res.claim)
      setRedeemed(true)
      if (onPrefillCustomer && res.claim.phone && !res.claim.phone.startsWith('dev:')) {
        onPrefillCustomer(res.claim.phone)
      }
      const snap = res.claim.prizeSnapshot || {}
      if (snap.discountType === 'fixed' && snap.discountValue) {
        const amount = Math.min(snap.discountValue, subtotal)
        if (amount > 0) onApplyDiscount(amount, `کد گردونه ${res.claim.code}`)
      } else if (snap.discountType === 'percent' && snap.discountValue) {
        const amount = Math.min(Math.round((subtotal * snap.discountValue) / 100), subtotal)
        if (amount > 0) {
          onApplyDiscount(amount, `کد گردونه ${res.claim.code} (${snap.discountValue}٪)`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ثبت کد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <h3>کد جایزه گردونه</h3>
        <p className="page-sub" style={{ marginTop: -4, marginBottom: 12 }}>
          کد مشتری را وارد کنید تا جایزه در صندوق اعمال شود
        </p>

        {!claim ? (
          <>
            <input
              dir="ltr"
              placeholder="مثلاً ۱۲۳۴۵۶۷۸"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void lookup()
              }}
              autoFocus
            />
            {error && <p className="pos-field-hint error">{error}</p>}
            <button type="button" className="btn-primary" disabled={loading} onClick={() => void lookup()}>
              {loading ? 'در حال بررسی…' : 'بررسی کد'}
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'rgba(242,101,34,0.08)',
                marginBottom: 12,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 32 }}>{claim.prizeEmoji}</div>
              <strong style={{ display: 'block', marginTop: 4 }}>{claim.prizeLabel}</strong>
              <code dir="ltr" style={{ display: 'block', marginTop: 6 }}>
                {claim.code}
              </code>
              <span dir="ltr" style={{ display: 'block', marginTop: 4, fontSize: 13, opacity: 0.75 }}>
                {claim.phone}
              </span>
              {claim.prizeSnapshot?.description && (
                <p style={{ marginTop: 8, fontSize: 13 }}>{claim.prizeSnapshot.description}</p>
              )}
              {claim.redeemedAt && !redeemed && (
                <p className="pos-field-hint error" style={{ marginTop: 8 }}>
                  این کد قبلاً استفاده شده
                </p>
              )}
              {claim.expired && !claim.redeemedAt && (
                <p className="pos-field-hint error" style={{ marginTop: 8 }}>
                  این کد منقضی شده؛ فقط در همان روز صدور معتبر بود
                </p>
              )}
              {redeemed && (
                <p style={{ marginTop: 8, color: '#2e7d32', fontWeight: 700 }}>ثبت شد ✓</p>
              )}
            </div>
            {error && <p className="pos-field-hint error">{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setClaim(null)
                  setRedeemed(false)
                }}
              >
                کد دیگر
              </button>
              {!claim.redeemedAt && !claim.expired && !redeemed && (
                <button type="button" className="btn-primary" disabled={loading} onClick={() => void redeem()}>
                  {loading ? 'ثبت…' : 'تأیید و استفاده'}
                </button>
              )}
              {(claim.redeemedAt || claim.expired || redeemed) && (
                <button type="button" className="btn-primary" onClick={onClose}>
                  بستن
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
