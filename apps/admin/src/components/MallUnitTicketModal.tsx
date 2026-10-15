import { useEffect, useState } from 'react'
import { Download, MessageCircle, Copy, X, Ticket } from 'lucide-react'
import {
  buildWhatsAppTicketMessage,
  mallTicketFilename,
  renderMallTicketPng,
  toWhatsAppPhone,
  whatsAppShareUrl,
  type MallTicketInput,
} from '../lib/mallTicket'

interface Props {
  open: boolean
  onClose: () => void
  ticket: MallTicketInput & { contactPhone?: string | null }
}

export function MallUnitTicketModal({ open, onClose, ticket }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let revoked: string | null = null
    setBusy(true)
    setError('')
    setPreviewUrl(null)
    setBlob(null)
    renderMallTicketPng(ticket)
      .then((b) => {
        setBlob(b)
        const url = URL.createObjectURL(b)
        revoked = url
        setPreviewUrl(url)
      })
      .catch((e: Error) => setError(e.message || 'ساخت تیکت ناموفق بود'))
      .finally(() => setBusy(false))
    return () => {
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [open, ticket.membershipCode, ticket.unitCode, ticket.unitName, ticket.discountPercent, ticket.deepLink])

  if (!open) return null

  const message = buildWhatsAppTicketMessage(ticket)
  const waPhone = toWhatsAppPhone(ticket.contactPhone)
  const waUrl = whatsAppShareUrl(waPhone, message)

  const download = () => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = mallTicketFilename(ticket.unitCode)
    a.click()
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('کپی متن ناموفق بود')
    }
  }

  const shareNative = async () => {
    if (!blob || !navigator.share) return
    try {
      const file = new File([blob], mallTicketFilename(ticket.unitCode), { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `پاس چیل‌بار · ${ticket.unitName}`,
          text: message,
        })
      } else {
        await navigator.share({ title: `پاس چیل‌بار · ${ticket.unitName}`, text: message, url: ticket.deepLink })
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ width: 'min(440px, 100%)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ticket size={18} />
            <strong>پاس واتساپ واحد</strong>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label="بستن">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <p className="page-sub" style={{ margin: 0 }}>
            تصویر را دانلود کن و همراه متن در واتساپ بفرست — یا مستقیم واتساپ را باز کن.
          </p>

          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: '#1A1411',
              minHeight: 220,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {busy && <span className="page-sub">در حال ساخت پاس…</span>}
            {error && <span style={{ color: 'var(--red)', padding: 12 }}>{error}</span>}
            {previewUrl && (
              <img
                src={previewUrl}
                alt={`پاس ${ticket.unitName}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn-primary" disabled={!blob} onClick={download}>
              <Download size={16} /> دانلود PNG
            </button>
            <a
              className="btn-primary"
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <MessageCircle size={16} />
              {waPhone ? 'واتساپ به واحد' : 'باز کردن واتساپ'}
            </a>
            <button type="button" className="btn-secondary" onClick={() => void copyText()}>
              <Copy size={16} /> {copied ? 'کپی شد' : 'کپی متن'}
            </button>
            {'share' in navigator && (
              <button type="button" className="btn-secondary" disabled={!blob} onClick={() => void shareNative()}>
                اشتراک‌گذاری
              </button>
            )}
          </div>

          {!waPhone && ticket.contactPhone && (
            <p className="page-sub">شماره تماس واحد برای واتساپ معتبر تشخیص داده نشد — لینک عمومی باز می‌شود.</p>
          )}
          {!ticket.contactPhone && (
            <p className="page-sub">شماره تماس برای این واحد ثبت نشده — بعد از باز شدن واتساپ مخاطب را انتخاب کن.</p>
          )}

          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              fontSize: 12,
              background: 'var(--bg-2)',
              padding: 12,
              borderRadius: 12,
              maxHeight: 160,
              overflow: 'auto',
            }}
          >
            {message}
          </pre>
        </div>
      </div>
    </div>
  )
}
