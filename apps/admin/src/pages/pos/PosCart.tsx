import type { PosCartApi } from '../../lib/usePosCart'
import { formatPrice } from '../../lib/format'
import { Minus, Plus, Trash2 } from 'lucide-react'

interface PosCartProps {
  cart: PosCartApi
  onCheckout: () => void
  onDiscount: () => void
  disabled?: boolean
}

export function PosCart({ cart, onCheckout, onDiscount, disabled }: PosCartProps) {
  return (
    <aside className="pos-cart">
      <header className="pos-cart-head">
        <h2>سبد ({cart.count.toLocaleString('fa-IR')})</h2>
        {cart.lines.length > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={cart.clear}>
            پاک کردن
          </button>
        )}
      </header>

      <div className="pos-cart-lines">
        {cart.lines.length === 0 ? (
          <p className="pos-empty">آیتمی انتخاب نشده</p>
        ) : (
          cart.lines.map((line) => (
            <div key={line.lineId} className="pos-cart-line">
              <div className="pos-cart-line-info">
                <span className="pos-cart-emoji">{line.emoji}</span>
                <div>
                  <strong>{line.name}</strong>
                  <span className="pos-cart-unit">{formatPrice(line.unitPrice)}</span>
                </div>
              </div>
              <div className="pos-cart-line-actions">
                <button type="button" onClick={() => cart.updateQuantity(line.lineId, line.quantity - 1)}>
                  <Minus size={14} />
                </button>
                <span>{line.quantity.toLocaleString('fa-IR')}</span>
                <button type="button" onClick={() => cart.updateQuantity(line.lineId, line.quantity + 1)}>
                  <Plus size={14} />
                </button>
                <button type="button" className="danger" onClick={() => cart.removeLine(line.lineId)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="pos-cart-line-total">{formatPrice(line.unitPrice * line.quantity)}</div>
            </div>
          ))
        )}
      </div>

      <div className="pos-cart-fields">
        <input
          placeholder="نام مشتری (اختیاری)"
          value={cart.customerName}
          onChange={(e) => cart.setCustomerName(e.target.value)}
        />
        <input
          placeholder="یادداشت"
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
        />
      </div>

      <div className="pos-cart-totals">
        <div className="pos-total-row">
          <span>جمع</span>
          <span>{formatPrice(cart.subtotal)}</span>
        </div>
        {cart.discountAmount > 0 && (
          <div className="pos-total-row discount">
            <span>تخفیف</span>
            <span>−{formatPrice(cart.discountAmount)}</span>
          </div>
        )}
        <div className="pos-total-row grand">
          <strong>کل</strong>
          <strong>{formatPrice(cart.total)}</strong>
        </div>
      </div>

      <div className="pos-cart-actions">
        <button type="button" className="btn-ghost" onClick={onDiscount} disabled={!cart.lines.length}>
          تخفیف
        </button>
        <button
          type="button"
          className="btn-primary pos-checkout-btn"
          onClick={onCheckout}
          disabled={disabled || !cart.lines.length}
        >
          پرداخت
        </button>
      </div>
    </aside>
  )
}
