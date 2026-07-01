import type { ReceiptTemplateId } from '@chill-bar/shared'
import './receipt.css'

export interface ReceiptItemLine {
  name: string
  emoji: string
  quantity: number
  unitPrice: number
  lineTotal: number
  extras?: string[]
}

export interface ThermalReceiptProps {
  storeName: string
  storeSubtitle?: string
  address?: string
  phone?: string
  openingHours?: string
  logoUrl?: string | null
  showLogo?: boolean
  headerText?: string
  footerText?: string
  widthMm?: 58 | 80
  templateId?: ReceiptTemplateId
  highContrast?: boolean
  orderCode: string
  receiptNumber?: number | null
  createdAt: string
  cashierName?: string | null
  shiftOpenedAt?: string | null
  customerName?: string | null
  customerPhone?: string | null
  note?: string | null
  channelLabel?: string
  items: ReceiptItemLine[]
  subtotal: number
  discountAmount?: number
  total: number
  paymentMethodLabel: string
  paidAmount?: number
  changeAmount?: number
  showQr?: boolean
  preview?: boolean
}

function formatReceiptPrice(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function formatReceiptDate(iso: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function Divider({ style }: { style?: 'dashed' | 'solid' | 'double' | 'dots' }) {
  return <div className={`tr-divider tr-divider--${style ?? 'solid'}`} aria-hidden />
}

export function ThermalReceipt({
  storeName,
  storeSubtitle,
  address,
  phone,
  openingHours,
  logoUrl,
  showLogo = true,
  headerText,
  footerText,
  widthMm = 80,
  templateId = 'bold',
  highContrast = true,
  orderCode,
  receiptNumber,
  createdAt,
  cashierName,
  customerName,
  customerPhone,
  note,
  channelLabel,
  items,
  subtotal,
  discountAmount = 0,
  total,
  paymentMethodLabel,
  paidAmount,
  changeAmount = 0,
  showQr = true,
  preview = false,
}: ThermalReceiptProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(orderCode)}&bgcolor=ffffff&color=000000`
  const dividerStyle =
    templateId === 'minimal' ? 'dashed' : templateId === 'ticket' ? 'double' : 'solid'
  const showBrandEmoji = templateId !== 'minimal'

  const rootClass = [
    'thermal-receipt',
    `thermal-receipt--${templateId}`,
    highContrast ? 'thermal-receipt--high-contrast' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      id={preview ? 'receipt-preview' : 'receipt-root'}
      className={rootClass}
      data-width={widthMm}
      data-template={templateId}
      style={{
        ['--receipt-width' as string]: `${widthMm}mm`,
        ['--receipt-page-width' as string]: `${widthMm}mm`,
      }}
    >
      {templateId === 'ticket' && <div className="tr-ticket-frame" />}

      {templateId === 'stripe' && (
        <div className="tr-stripe-banner" aria-hidden>
          ═══ ✦ ═══
        </div>
      )}

      <header className="tr-header">
        {showLogo && logoUrl ? (
          <img src={logoUrl} alt="" className="tr-logo" />
        ) : showBrandEmoji ? (
          <div className="tr-brand-emoji">🍦</div>
        ) : null}
        <h1 className="tr-store-name">{storeName}</h1>
        {storeSubtitle && <p className="tr-subtitle">{storeSubtitle}</p>}
        {headerText && <p className="tr-header-text">{headerText}</p>}
        <div className="tr-meta-lines">
          {address && <span>{address}</span>}
          {phone && <span>تلفن: {phone}</span>}
          {openingHours && <span>ساعت کاری: {openingHours}</span>}
        </div>
      </header>

      <Divider style={dividerStyle} />

      <section className="tr-order-meta">
        {templateId === 'ticket' && receiptNumber != null && (
          <div className="tr-ticket-number">#{receiptNumber}</div>
        )}
        <div className="tr-row">
          <span>فیش</span>
          <strong className="tr-order-code">{orderCode}</strong>
        </div>
        <div className="tr-row">
          <span>تاریخ</span>
          <span>{formatReceiptDate(createdAt)}</span>
        </div>
        {channelLabel && (
          <div className="tr-row">
            <span>کانال</span>
            <span>{channelLabel}</span>
          </div>
        )}
        {cashierName && (
          <div className="tr-row">
            <span>صندوقدار</span>
            <span>{cashierName}</span>
          </div>
        )}
        {customerName && (
          <div className="tr-row">
            <span>مشتری</span>
            <span>{customerName}</span>
          </div>
        )}
        {customerPhone && (
          <div className="tr-row">
            <span>موبایل</span>
            <span dir="ltr">{customerPhone}</span>
          </div>
        )}
        {note && <p className="tr-note">یادداشت: {note}</p>}
      </section>

      <Divider style={dividerStyle} />

      <section className="tr-items">
        {items.map((item, i) => (
          <div key={i} className="tr-item">
            <div className="tr-item-head">
              <span className="tr-item-name">
                {templateId !== 'minimal' && `${item.emoji} `}
                {item.quantity}× {item.name}
              </span>
              <span className="tr-item-price">{formatReceiptPrice(item.lineTotal)}</span>
            </div>
            {item.extras?.map((extra, j) => (
              <div key={j} className="tr-item-extra">
                {extra}
              </div>
            ))}
          </div>
        ))}
      </section>

      <Divider style={dividerStyle} />

      <section className="tr-totals">
        <div className="tr-row">
          <span>جمع جزء</span>
          <span>{formatReceiptPrice(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="tr-row tr-discount">
            <span>تخفیف</span>
            <span>−{formatReceiptPrice(discountAmount)}</span>
          </div>
        )}
        <div className={`tr-row tr-total ${templateId === 'bold' ? 'tr-total--inverted' : ''}`}>
          <strong>جمع کل</strong>
          <strong>{formatReceiptPrice(total)}</strong>
        </div>
        <div className="tr-row">
          <span>پرداخت</span>
          <span>{paymentMethodLabel}</span>
        </div>
        {paidAmount != null && paidAmount > total && (
          <>
            <div className="tr-row">
              <span>دریافتی</span>
              <span>{formatReceiptPrice(paidAmount)}</span>
            </div>
            <div className="tr-row">
              <span>باقی‌مانده</span>
              <span>{formatReceiptPrice(changeAmount)}</span>
            </div>
          </>
        )}
      </section>

      <Divider style={dividerStyle} />

      <footer className="tr-footer">
        {footerText && <p className="tr-footer-text">{footerText}</p>}
        {showQr && <img src={qrUrl} alt="" className="tr-qr" width={104} height={104} />}
        {templateId === 'stripe' && (
          <div className="tr-stripe-banner tr-stripe-banner--footer" aria-hidden>
            ═══ ✦ ═══
          </div>
        )}
        <p className="tr-thanks">{storeName}</p>
      </footer>
    </div>
  )
}
