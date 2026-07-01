import { useMemo } from 'react'
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
  const phoneInvalid = useMemo(() => {
    const digits = cart.customerPhone.replace(/\D/g, '')
    return digits.length > 0 && !/^09\d{9}$/.test(digits)
  }, [cart.customerPhone])

  return (
    <aside className="pos-cart">
      <header className="pos-cart-head">
        <h2>سبد خرید</h2>
        <span className="pos-cart-count">{cart.count.toLocaleString('fa-IR')} قلم</span>
        {cart.lines.length > 0 && (
          <button type="button" className="pos-cart-clear" onClick={cart.clear}>
            پاک کردن
          </button>
        )}
      </header>

      <div className="pos-cart-lines">
        {cart.lines.length === 0 ? (
          <p className="pos-empty">برای شروع، آیتم را از منو انتخاب کنید</p>
        ) : (
          cart.lines.map((line) => (
            <div key={line.lineId} className="pos-cart-line">
              <div className="pos-cart-line-main">
                <span className="pos-cart-emoji">{line.emoji}</span>
                <div className="pos-cart-line-text">
                  <strong>{line.name}</strong>
                  <span className="pos-cart-unit">{formatPrice(line.unitPrice)}</span>
                </div>
                <strong className="pos-cart-line-total">
                  {formatPrice(line.unitPrice * line.quantity)}
                </strong>
              </div>
              <div className="pos-cart-line-actions">
                <button
                  type="button"
                  aria-label="کم کردن"
                  onClick={() => cart.updateQuantity(line.lineId, line.quantity - 1)}
                >
                  <Minus size={15} />
                </button>
                <span className="pos-cart-qty">{line.quantity.toLocaleString('fa-IR')}</span>
                <button
                  type="button"
                  aria-label="افزودن"
                  onClick={() => cart.updateQuantity(line.lineId, line.quantity + 1)}
                >
                  <Plus size={15} />
                </button>
                <button
                  type="button"
                  className="danger"
                  aria-label="حذف"
                  onClick={() => cart.removeLine(line.lineId)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pos-cart-footer">
        <div className="pos-cart-fields pos-cart-fields--customer">
          <input
            placeholder="نام مشتری"
            value={cart.customerName}
            onChange={(e) => cart.setCustomerName(e.target.value)}
          />
          <input
            className={phoneInvalid ? 'invalid' : ''}
            type="tel"
            inputMode="tel"
            placeholder="موبایل مشتری (۰۹…)"
            value={cart.customerPhone}
            onChange={(e) => cart.setCustomerPhone(e.target.value)}
            dir="ltr"
            aria-invalid={phoneInvalid}
          />
          <input
            className="pos-cart-note"
            placeholder="یادداشت"
            value={cart.note}
            onChange={(e) => cart.setNote(e.target.value)}
          />
        </div>
        {phoneInvalid && (
          <p className="pos-field-hint error">شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود</p>
        )}

        <div className="pos-cart-totals">
          <div className="pos-total-row">
            <span>جمع جزء</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div className="pos-total-row discount">
              <span>تخفیف</span>
              <span>−{formatPrice(cart.discountAmount)}</span>
            </div>
          )}
          <div className="pos-total-row grand">
            <strong>مبلغ قابل پرداخت</strong>
            <strong>{formatPrice(cart.total)}</strong>
          </div>
        </div>

        <div className="pos-cart-actions">
          <button type="button" className="pos-btn-secondary" onClick={onDiscount} disabled={!cart.lines.length}>
            تخفیف
          </button>
          <button
            type="button"
            className="pos-btn-primary pos-checkout-btn"
            onClick={onCheckout}
            disabled={disabled || !cart.lines.length || phoneInvalid}
          >
            پرداخت
          </button>
        </div>
      </div>
    </aside>
  )
}
