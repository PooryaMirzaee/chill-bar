import type { StoreCopy } from '@chill-bar/shared'

interface Props {
  copy: StoreCopy
  onChange: (copy: StoreCopy) => void
}

const COPY_FIELDS: { key: keyof StoreCopy; label: string; rows?: number }[] = [
  { key: 'appTagline', label: 'زیرعنوان اپ (title)' },
  { key: 'installBanner', label: 'بanner نصب PWA ({storeName})' },
  { key: 'installButton', label: 'دکمه نصب' },
  { key: 'menuTitle', label: 'عنوان صفحه منو' },
  { key: 'storyEyebrow', label: 'ویترین — eyebrow' },
  { key: 'storyTitle', label: 'ویترین — عنوان' },
  { key: 'storyDescription', label: 'ویترین — توضیح' },
  { key: 'storyBadge', label: 'برچسب ویترین' },
  { key: 'comboEyebrow', label: 'کمبو — eyebrow' },
  { key: 'comboTitle', label: 'کمبو — عنوان' },
  { key: 'comboDescription', label: 'کمبو — توضیح' },
  { key: 'comboOrderToast', label: 'پیام ثبت کمبو' },
  { key: 'spinWheelHint', label: 'راهنمای گردونه' },
  { key: 'scratchTitle', label: 'کارت شانس — عنوان' },
  { key: 'scratchSubtitle', label: 'کارت شانس — زیرعنوان' },
  { key: 'scratchCanvasHint', label: 'کارت شانس — متن روی کارت' },
  { key: 'scratchRewardCheckoutLabel', label: 'برچسب جایزه در checkout' },
  { key: 'scratchRewardSuccess', label: 'پیام دریافت جایزه', rows: 2 },
  { key: 'kioskTapOrder', label: 'کیوسک — برای سفارش' },
  { key: 'kioskTapStart', label: 'کیوسک — شروع' },
  { key: 'closedTitle', label: 'بسته — عنوان' },
  { key: 'closedMessage', label: 'بسته — پیام', rows: 2 },
  { key: 'closedHint', label: 'بسته — ساعات ({openingHours})' },
  { key: 'currencySuffix', label: 'پسوند قیمت' },
  { key: 'searchPlaceholder', label: 'placeholder جستجو' },
  { key: 'addToCartToast', label: 'toast افزودن ({name})' },
  { key: 'navHome', label: 'ناوبری — خانه' },
  { key: 'navIceCream', label: 'ناوبری — بستنی' },
  { key: 'navMenu', label: 'ناوبری — منو' },
  { key: 'navDiscover', label: 'ناوبری — کشف' },
  { key: 'navPlay', label: 'ناوبری — پیشنهاد' },
  { key: 'moodEyebrow', label: 'مود — eyebrow' },
  { key: 'moodTitle', label: 'مود — عنوان' },
  { key: 'moodDescription', label: 'مود — توضیح', rows: 2 },
  { key: 'smartPickReason', label: 'دلیل پیشنهاد هوشمند' },
  { key: 'smartComboTitle', label: 'عنوان کمبو هوشمند' },
  { key: 'smsDisabledMessage', label: 'SMS غیرفعال', rows: 2 },
  { key: 'smsRegisterNote', label: 'یادداشت ثبت‌نام SMS', rows: 2 },
  { key: 'iceStep1Label', label: 'بستنی — برچسب مرحله ۱' },
  { key: 'iceStep1Title', label: 'بستنی — عنوان مرحله ۱' },
  { key: 'iceStep2Label', label: 'بستنی — برچسب مرحله ۲' },
  { key: 'iceStep2Title', label: 'بستنی — عنوان مرحله ۲' },
  { key: 'iceStep3Label', label: 'بستنی — برچسب مرحله ۳' },
  { key: 'iceStep3Title', label: 'بستنی — عنوان مرحله ۳' },
  { key: 'iceCustomName', label: 'نام پیش‌فرض بستنی سفارشی' },
]

export function CopySettingsPanel({ copy, onChange }: Props) {
  const set = <K extends keyof StoreCopy>(key: K, value: StoreCopy[K]) => {
    onChange({ ...copy, [key]: value })
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>متن‌های اپ مشتری</h3>
        <p className="field-hint field-full" style={{ marginBottom: 12 }}>
          از {'{storeName}'}, {'{openingHours}'}, {'{name}'} در متن‌ها استفاده کنید.
        </p>
        <div className="form-grid">
          {COPY_FIELDS.map(({ key, label, rows }) => (
            <label key={key} className="field field-full">
              <span>{label}</span>
              {rows && rows > 1 ? (
                <textarea
                  rows={rows}
                  value={copy[key]}
                  onChange={(e) => set(key, e.target.value as StoreCopy[typeof key])}
                />
              ) : (
                <input
                  value={copy[key]}
                  onChange={(e) => set(key, e.target.value as StoreCopy[typeof key])}
                />
              )}
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}
