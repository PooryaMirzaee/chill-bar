import { useState } from 'react'
import { PosNumpad } from './PosNumpad'

interface PosDiscountModalProps {
  subtotal: number
  onClose: () => void
  onApply: (amount: number, note: string) => void
}

export function PosDiscountModal({ subtotal, onClose, onApply }: PosDiscountModalProps) {
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<'amount' | 'percent'>('amount')
  const [percent, setPercent] = useState(0)

  const finalAmount =
    mode === 'percent' ? Math.round((subtotal * percent) / 100) : amount

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <h3>تخفیف</h3>
        <div className="pos-discount-tabs">
          <button type="button" className={mode === 'amount' ? 'active' : ''} onClick={() => setMode('amount')}>
            مبلغی
          </button>
          <button type="button" className={mode === 'percent' ? 'active' : ''} onClick={() => setMode('percent')}>
            درصدی
          </button>
        </div>
        {mode === 'amount' ? (
          <PosNumpad label="مبلغ تخفیف (تومان)" value={amount} onChange={setAmount} />
        ) : (
          <PosNumpad label="درصد تخفیف" value={percent} onChange={setPercent} />
        )}
        <input
          placeholder="دلیل تخفیف (اختیاری)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={finalAmount <= 0 || finalAmount > subtotal}
          onClick={() => {
            onApply(finalAmount, note)
            onClose()
          }}
        >
          اعمال تخفیف
        </button>
      </div>
    </div>
  )
}
