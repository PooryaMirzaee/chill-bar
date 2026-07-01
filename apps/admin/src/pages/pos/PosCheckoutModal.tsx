import { useState } from 'react'
import type { PaymentMethod, PosCheckoutPayment, PosSettings } from '@chill-bar/shared'
import { PAYMENT_METHOD_LABEL } from '@chill-bar/shared'
import { formatPrice } from '../../lib/format'
import { PosNumpad } from './PosNumpad'

interface PosCheckoutModalProps {
  total: number
  settings: PosSettings
  onClose: () => void
  onConfirm: (payment: PosCheckoutPayment) => void
  loading?: boolean
  title?: string
}

export function PosCheckoutModal({
  total,
  settings,
  onClose,
  onConfirm,
  loading,
  title = 'پرداخت',
}: PosCheckoutModalProps) {
  const [method, setMethod] = useState<PaymentMethod>(
    settings.defaultPaymentMethod === 'UNPAID' ? 'CASH' : settings.defaultPaymentMethod,
  )
  const [cashReceived, setCashReceived] = useState(total)
  const [cashPart, setCashPart] = useState(Math.floor(total / 2))
  const cardPart = Math.max(0, total - cashPart)

  const change = method === 'CASH' ? Math.max(0, cashReceived - total) : 0

  const handleConfirm = () => {
    if (method === 'MIXED') {
      onConfirm({
        method: 'MIXED',
        payments: [
          { method: 'CASH', amount: cashPart },
          { method: 'CARD', amount: cardPart },
        ],
      })
      return
    }
    if (method === 'CASH') {
      onConfirm({ method: 'CASH', cashReceived })
      return
    }
    onConfirm({ method: 'CARD' })
  }

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal pos-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="pos-modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="pos-checkout-total">
          <span>مبلغ قابل پرداخت</span>
          <strong>{formatPrice(total)}</strong>
        </div>

        <div className="pos-payment-methods">
          {(['CASH', 'CARD'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={method === m ? 'active' : ''}
              onClick={() => setMethod(m)}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
          {settings.allowMixedPayment && (
            <button
              type="button"
              className={method === 'MIXED' ? 'active' : ''}
              onClick={() => setMethod('MIXED')}
            >
              {PAYMENT_METHOD_LABEL.MIXED}
            </button>
          )}
        </div>

        {method === 'CASH' && (
          <>
            <PosNumpad label="مبلغ دریافتی" value={cashReceived} onChange={setCashReceived} />
            {change > 0 && (
              <p className="pos-change">
                باقی‌مانده: <strong>{formatPrice(change)}</strong>
              </p>
            )}
            {cashReceived < total && <p className="pos-error">مبلغ کمتر از جمع کل است</p>}
          </>
        )}

        {method === 'MIXED' && (
          <div className="pos-mixed-pay">
            <label>
              نقد
              <input
                type="number"
                value={cashPart}
                onChange={(e) => setCashPart(Number(e.target.value))}
              />
            </label>
            <label>
              کارت
              <input type="number" value={cardPart} readOnly />
            </label>
            {cashPart + cardPart !== total && (
              <p className="pos-error">جمع باید {formatPrice(total)} باشد</p>
            )}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          disabled={
            loading ||
            (method === 'CASH' && cashReceived < total) ||
            (method === 'MIXED' && cashPart + cardPart !== total)
          }
          onClick={handleConfirm}
        >
          {loading ? 'در حال ثبت...' : 'تأیید پرداخت'}
        </button>
      </div>
    </div>
  )
}
