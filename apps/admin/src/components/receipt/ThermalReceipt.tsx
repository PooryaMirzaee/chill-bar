import type { ReceiptTemplateId } from '@chill-bar/shared'
import './receipt.css'

export type ReceiptCopyType = 'customer' | 'kitchen'

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
  copyType?: ReceiptCopyType
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
  showPrices?: boolean
  preview?: boolean
  nested?: boolean
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

function Divider({ style }: { style?: 'dashed' | 'solid' | 'double' }) {
  return <div className={`tr-divider tr-divider--${style ?? 'solid'}`} aria-hidden />
}

function isCompactTemplate(templateId: ReceiptTemplateId): boolean {
  return templateId.startsWith('compact') || templateId.startsWith('kitchen')
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
  copyType = 'customer',
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
  showPrices,
  preview = false,
  nested = false,
}: ThermalReceiptProps) {
  const isKitchen = copyType === 'kitchen'
  const showItemPrices = showPrices ?? !isKitchen
  const showPaymentBlock = !isKitchen
  const showQrCode = !isKitchen && showQr
  const showStoreMeta = !isKitchen
  const showLogoImage = !isKitchen && showLogo

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(orderCode)}&bgcolor=ffffff&color=000000`
  const dividerStyle =
    templateId === 'minimal' || templateId === 'compact-minimal'
      ? 'dashed'
      : templateId === 'ticket' || templateId === 'kitchen-ticket'
        ? 'double'
        : 'solid'
  const showBrandEmoji = !isKitchen && templateId !== 'minimal' && templateId !== 'compact-minimal'

  const rootClass = [
    'thermal-receipt',
    `thermal-receipt--${templateId}`,
    isKitchen ? 'thermal-receipt--kitchen-copy' : 'thermal-receipt--customer-copy',
    isCompactTemplate(templateId) ? 'thermal-receipt--compact' : '',
    highContrast ? 'thermal-receipt--high-contrast' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      id={nested ? undefined : preview ? 'receipt-preview' : 'receipt-root'}
      className={rootClass}
      data-width={widthMm}
      data-template={templateId}
      data-copy={copyType}
      style={{
        ['--receipt-width' as string]: `${widthMm}mm`,
        ['--receipt-page-width' as string]: `${widthMm}mm`,
      }}
    >
      {templateId === 'ticket' && !isKitchen && <div className="tr-ticket-frame" />}

      {isKitchen && (
        <div className="tr-kitchen-badge">آشپزخانه</div>
      )}

      {templateId === 'stripe' && !isKitchen && (
        <div className="tr-stripe-banner" aria-hidden>
          ═══ ✦ ═══
        </div>
      )}

      <header className="tr-header">
        {showLogoImage && logoUrl ? (
          <img src={logoUrl} alt="" className="tr-logo" />
        ) : showBrandEmoji ? (
          <div className="tr-brand-emoji">🍦</div>
        ) : null}
        <h1 className="tr-store-name">{isKitchen ? storeName : storeName}</h1>
        {!isKitchen && storeSubtitle && <p className="tr-subtitle">{storeSubtitle}</p>}
        {!isKitchen && headerText && <p className="tr-header-text">{headerText}</p>}
        {showStoreMeta && (
          <div className="tr-meta-lines">
            {address && <span>{address}</span>}
            {phone && <span>تلفن: {phone}</span>}
            {openingHours && <span>ساعت کاری: {openingHours}</span>}
          </div>
        )}
      </header>

      <Divider style={dividerStyle} />

      <section className="tr-order-meta">
        {(templateId === 'ticket' || templateId === 'kitchen-ticket') && receiptNumber != null && (
          <div className="tr-ticket-number">#{receiptNumber}</div>
        )}
        <div className="tr-row">
          <span>{isKitchen ? 'سفارش' : 'فیش'}</span>
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
        {note && <p className={`tr-note${isKitchen ? ' tr-note--kitchen' : ''}`}>یادداشت: {note}</p>}
      </section>

      <Divider style={dividerStyle} />

      <section className="tr-items">
        {items.map((item, i) => (
          <div key={i} className="tr-item">
            <div className="tr-item-head">
              <span className="tr-item-name">
                {item.emoji} {item.quantity}× {item.name}
              </span>
              {showItemPrices && (
                <span className="tr-item-price">{formatReceiptPrice(item.lineTotal)}</span>
              )}
            </div>
            {item.extras?.map((extra, j) => (
              <div key={j} className="tr-item-extra">
                {extra}
              </div>
            ))}
          </div>
        ))}
      </section>

      {showPaymentBlock && (
        <>
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
            <div
              className={`tr-row tr-total ${templateId === 'bold' || templateId === 'compact-bold' ? 'tr-total--emphasized' : ''}`}
            >
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
        </>
      )}

      <Divider style={dividerStyle} />

      <footer className="tr-footer">
        {!isKitchen && footerText && <p className="tr-footer-text">{footerText}</p>}
        {showQrCode && <img src={qrUrl} alt="" className="tr-qr" width={104} height={104} />}
        {templateId === 'stripe' && !isKitchen && (
          <div className="tr-stripe-banner tr-stripe-banner--footer" aria-hidden>
            ═══ ✦ ═══
          </div>
        )}
        <p className="tr-thanks">{isKitchen ? 'آماده‌سازی' : storeName}</p>
      </footer>
    </div>
  )
}

export function ReceiptPrintBatch({ copies }: { copies: ThermalReceiptProps[] }) {
  return (
    <div id="receipt-root" className="receipt-print-batch">
      {copies.map((copy, index) => (
        <div key={`${copy.copyType ?? 'copy'}-${index}`} className="receipt-print-sheet">
          {index > 0 && <div className="receipt-page-break" aria-hidden />}
          <ThermalReceipt {...copy} nested />
        </div>
      ))}
    </div>
  )
}
