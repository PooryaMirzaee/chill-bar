import type { PosSettings, ReceiptTemplateId, StoreSettings } from '@chill-bar/shared'
import { PAYMENT_METHOD_LABEL, RECEIPT_TEMPLATES } from '@chill-bar/shared'
import { ThermalReceipt } from './receipt/ThermalReceipt'
import { buildSampleReceiptProps, printSampleReceipt } from '../lib/printReceipt'

interface PosSettingsPanelProps {
  value: PosSettings
  onChange: (next: PosSettings) => void
  store?: StoreSettings | null
}

export function PosSettingsPanel({ value, onChange, store }: PosSettingsPanelProps) {
  const set = <K extends keyof PosSettings>(key: K, val: PosSettings[K]) => {
    onChange({ ...value, [key]: val })
  }

  const previewProps = buildSampleReceiptProps(store ?? { storeName: 'Chill Bar' }, value)

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
          عرض رسید (لیبل پرینتر)
          <select
            value={value.receiptWidthMm}
            onChange={(e) => set('receiptWidthMm', Number(e.target.value) as 58 | 80)}
          >
            <option value={58}>۵۸ میلی‌متر</option>
            <option value={80}>۸۰ میلی‌متر</option>
          </select>
        </label>

        <label className="toggle-row">
          <span>کنتراست بالا (پررنگ‌تر برای پرینتر حرارتی)</span>
          <input
            type="checkbox"
            checked={value.receiptHighContrast}
            onChange={(e) => set('receiptHighContrast', e.target.checked)}
          />
        </label>

        <div>
          <span>طرح رسید</span>
          <div className="receipt-template-grid" role="radiogroup" aria-label="طرح رسید">
            {RECEIPT_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                role="radio"
                aria-checked={value.receiptTemplateId === template.id}
                className={`receipt-template-card${value.receiptTemplateId === template.id ? ' is-active' : ''}`}
                onClick={() => set('receiptTemplateId', template.id as ReceiptTemplateId)}
              >
                <div
                  className={`receipt-template-preview receipt-template-preview--${template.id}`}
                  aria-hidden
                />
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="receipt-preview-panel">
          <strong>پیش‌نمایش زنده</strong>
          <ThermalReceipt {...previewProps} preview />
        </div>

        <div className="receipt-settings-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => printSampleReceipt(store ?? { storeName: 'Chill Bar' }, value)}
            disabled={false}
          >
            چاپ نمونه
          </button>
        </div>

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

      <section className="settings-section">
        <h3>صدا</h3>
        <label className="toggle-row">
          <span>صدای افزودن به سبد</span>
          <input
            type="checkbox"
            checked={value.soundOnAddItem}
            onChange={(e) => set('soundOnAddItem', e.target.checked)}
          />
        </label>
        <label>
          بلندی صدا
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={value.addItemSoundVolume}
            onChange={(e) => set('addItemSoundVolume', Number(e.target.value))}
          />
        </label>
      </section>
    </div>
  )
}
