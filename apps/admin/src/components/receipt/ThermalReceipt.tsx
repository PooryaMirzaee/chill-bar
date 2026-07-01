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
  headerText?: string
  footerText?: string
  widthMm?: 58 | 80
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

export function ThermalReceipt({
  storeName,
  storeSubtitle,
  address,
  phone,
  openingHours,
  logoUrl,
  headerText,
  footerText,
  widthMm = 58,
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
}: ThermalReceiptProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(orderCode)}`

  return (
    <div
      id="receipt-root"
      className="thermal-receipt"
      style={{ ['--receipt-width' as string]: `${widthMm}mm` }}
    >
      <header className="tr-header">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="tr-logo" />
        ) : (
          <div className="tr-brand-emoji">🍦</div>
        )}
        <h1 className="tr-store-name">{storeName}</h1>
        {storeSubtitle && <p className="tr-subtitle">{storeSubtitle}</p>}
        {headerText && <p className="tr-header-text">{headerText}</p>}
        <div className="tr-meta-lines">
          {address && <span>{address}</span>}
          {phone && <span>تلفن: {phone}</span>}
          {openingHours && <span>ساعت کاری: {openingHours}</span>}
        </div>
      </header>

      <div className="tr-divider" />

      <section className="tr-order-meta">
        <div className="tr-row">
          <span>فیش</span>
          <strong>
            {orderCode}
            {receiptNumber != null && <span className="tr-receipt-no"> #{receiptNumber}</span>}
          </strong>
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

      <div className="tr-divider" />

      <section className="tr-items">
        {items.map((item, i) => (
          <div key={i} className="tr-item">
            <div className="tr-item-head">
              <span className="tr-item-name">
                {item.emoji} {item.quantity}× {item.name}
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

      <div className="tr-divider" />

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
        <div className="tr-row tr-total">
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

      <div className="tr-divider" />

      <footer className="tr-footer">
        {footerText && <p className="tr-footer-text">{footerText}</p>}
        {showQr && (
          <img src={qrUrl} alt="" className="tr-qr" width={96} height={96} />
        )}
        <p className="tr-thanks">Chill Bar</p>
      </footer>
    </div>
  )
}
