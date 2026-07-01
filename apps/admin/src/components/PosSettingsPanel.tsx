import type { PosSettings } from '@chill-bar/shared'
import { PAYMENT_METHOD_LABEL } from '@chill-bar/shared'

interface PosSettingsPanelProps {
  value: PosSettings
  onChange: (next: PosSettings) => void
}

export function PosSettingsPanel({ value, onChange }: PosSettingsPanelProps) {
  const set = <K extends keyof PosSettings>(key: K, val: PosSettings[K]) => {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="settings-panel pos-settings-panel">
      <section className="settings-section">
        <h3>عمومی</h3>
        <label className="toggle-row">
          <span>فعال بودن صندوق</span>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>الزام شیفت باز برای فروش</span>
          <input
            type="checkbox"
            checked={value.requireShiftOpen}
            onChange={(e) => set('requireShiftOpen', e.target.checked)}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>رسید و چاپ</h3>
        <label>
          عرض رسید
          <select
            value={value.receiptWidthMm}
            onChange={(e) => set('receiptWidthMm', Number(e.target.value) as 58 | 80)}
          >
            <option value={58}>۵۸ میلی‌متر</option>
            <option value={80}>۸۰ میلی‌متر</option>
          </select>
        </label>
        <label>
          متن بالای رسید
          <textarea
            value={value.receiptHeaderText}
            onChange={(e) => set('receiptHeaderText', e.target.value)}
            rows={2}
          />
        </label>
        <label>
          متن پایین رسید
          <textarea
            value={value.receiptFooterText}
            onChange={(e) => set('receiptFooterText', e.target.value)}
            rows={2}
          />
        </label>
        <label className="toggle-row">
          <span>نمایش لوگو</span>
          <input
            type="checkbox"
            checked={value.showLogoOnReceipt}
            onChange={(e) => set('showLogoOnReceipt', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>نمایش QR</span>
          <input
            type="checkbox"
            checked={value.showQrOnReceipt}
            onChange={(e) => set('showQrOnReceipt', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>چاپ خودکار بعد فروش</span>
          <input
            type="checkbox"
            checked={value.autoPrintOnSale}
            onChange={(e) => set('autoPrintOnSale', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>چاپ خودکار تسویه آنلاین</span>
          <input
            type="checkbox"
            checked={value.autoPrintOnOnlineSettle}
            onChange={(e) => set('autoPrintOnOnlineSettle', e.target.checked)}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>پرداخت</h3>
        <label>
          روش پیش‌فرض
          <select
            value={value.defaultPaymentMethod}
            onChange={(e) =>
              set('defaultPaymentMethod', e.target.value as PosSettings['defaultPaymentMethod'])
            }
          >
            <option value="CASH">{PAYMENT_METHOD_LABEL.CASH}</option>
            <option value="CARD">{PAYMENT_METHOD_LABEL.CARD}</option>
          </select>
        </label>
        <label className="toggle-row">
          <span>پرداخت ترکیبی</span>
          <input
            type="checkbox"
            checked={value.allowMixedPayment}
            onChange={(e) => set('allowMixedPayment', e.target.checked)}
          />
        </label>
      </section>

      <section className="settings-section">
        <h3>تخفیف و برگشت</h3>
        <label className="toggle-row">
          <span>تخفیف دستی</span>
          <input
            type="checkbox"
            checked={value.allowManualDiscount}
            onChange={(e) => set('allowManualDiscount', e.target.checked)}
          />
        </label>
        <label>
          سقف تخفیف کارمند (٪)
          <input
            type="number"
            min={0}
            max={100}
            value={value.maxDiscountPercentStaff}
            onChange={(e) => set('maxDiscountPercentStaff', Number(e.target.value))}
          />
        </label>
        <label>
          سقف تخفیف مدیر (٪)
          <input
            type="number"
            min={0}
            max={100}
            value={value.maxDiscountPercentManager}
            onChange={(e) => set('maxDiscountPercentManager', Number(e.target.value))}
          />
        </label>
        <label className="toggle-row">
          <span>امکان برگشت</span>
          <input
            type="checkbox"
            checked={value.allowRefunds}
            onChange={(e) => set('allowRefunds', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>دلیل برگشت الزامی</span>
          <input
            type="checkbox"
            checked={value.requireRefundReason}
            onChange={(e) => set('requireRefundReason', e.target.checked)}
          />
        </label>
        <label className="toggle-row">
          <span>برگشت فقط با مدیر</span>
          <input
            type="checkbox"
            checked={value.requireManagerForRefund}
            onChange={(e) => set('requireManagerForRefund', e.target.checked)}
          />
        </label>
      </section>
    </div>
  )
}
