/** Chill Bar × City Center — WhatsApp-ready unit membership pass */

export interface MallTicketInput {
  unitCode: string
  unitName: string
  floor?: string | null
  membershipCode: string
  deepLink: string
  discountPercent: number
  contactName?: string | null
}

const W = 1080
const H = 1620

const C = {
  cocoa: '#2C2420',
  cocoaDeep: '#14100E',
  cocoaSoft: '#6B5B52',
  stone: '#E6E0DA',
  scoop: '#FFFCF9',
  orange: '#F26522',
  orangeDeep: '#D94E10',
  pistachio: '#B9C9B4',
} as const

const FONT_DISPLAY = 'Lalezar, Vazirmatn, Tahoma, sans-serif'
const FONT_UI = 'Vazirmatn, Tahoma, sans-serif'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('بارگذاری تصویر ناموفق'))
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** Soft-serve swirl mark — abstract brand atmosphere, not clipart */
function drawSoftServeSculpture(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.translate(W * 0.7, H * 0.38)
  ctx.rotate(-0.2)

  const ribbons: Array<{ w: number; color: string; y: number }> = [
    { w: 210, color: 'rgba(242,101,34,0.2)', y: 40 },
    { w: 180, color: 'rgba(255,252,249,0.1)', y: -10 },
    { w: 150, color: 'rgba(185,201,180,0.16)', y: -55 },
    { w: 118, color: 'rgba(242,101,34,0.24)', y: -95 },
    { w: 84, color: 'rgba(255,252,249,0.12)', y: -128 },
  ]
  for (const r of ribbons) {
    ctx.beginPath()
    ctx.moveTo(-r.w / 2, r.y)
    ctx.bezierCurveTo(-r.w * 0.2, r.y - 36, r.w * 0.15, r.y - 36, r.w / 2, r.y)
    ctx.bezierCurveTo(r.w * 0.35, r.y + 42, -r.w * 0.35, r.y + 42, -r.w / 2, r.y)
    ctx.fillStyle = r.color
    ctx.fill()
  }

  // taper tip
  ctx.beginPath()
  ctx.moveTo(-18, 70)
  ctx.quadraticCurveTo(0, 160, 0, 200)
  ctx.quadraticCurveTo(0, 160, 18, 70)
  ctx.fillStyle = 'rgba(232,168,124,0.18)'
  ctx.fill()
  ctx.restore()
}

function drawFilmGrain(ctx: CanvasRenderingContext2D) {
  const size = 256
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const octx = off.getContext('2d')
  if (!octx) return
  const g = octx.createImageData(size, size)
  const d = g.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 255) | 0
    d[i] = n
    d[i + 1] = n
    d[i + 2] = n
    d[i + 3] = 255
  }
  octx.putImageData(g, 0, 0)
  ctx.save()
  ctx.globalAlpha = 0.035
  const pattern = ctx.createPattern(off, 'repeat')
  if (pattern) {
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, W, H)
  }
  ctx.restore()
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      line = test
    } else {
      if (line) lines.push(line)
      line = word
      if (lines.length >= maxLines - 1) break
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (words.join(' ').length > lines.join(' ').length && lines.length) {
    const last = lines[lines.length - 1]!
    lines[lines.length - 1] = last.length > 2 ? `${last.slice(0, -1)}…` : last
  }
  return lines.length ? lines : [text.slice(0, 18)]
}

export async function renderMallTicketPng(input: MallTicketInput): Promise<Blob> {
  try {
    await Promise.all([
      document.fonts.load(`400 140px ${FONT_DISPLAY}`),
      document.fonts.load(`800 72px ${FONT_UI}`),
      document.fonts.load(`600 28px ${FONT_UI}`),
    ])
    await document.fonts.ready
  } catch {
    /* ignore */
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas پشتیبانی نمی‌شود')

  // Full-bleed parlor
  const bg = ctx.createRadialGradient(W * 0.3, H * 0.15, 40, W * 0.45, H * 0.45, H * 0.85)
  bg.addColorStop(0, '#3A2E28')
  bg.addColorStop(0.45, C.cocoa)
  bg.addColorStop(1, C.cocoaDeep)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  drawSoftServeSculpture(ctx)

  // warm corner wash
  const wash = ctx.createRadialGradient(0, 0, 20, 0, 0, 520)
  wash.addColorStop(0, 'rgba(242,101,34,0.35)')
  wash.addColorStop(1, 'rgba(242,101,34,0)')
  ctx.fillStyle = wash
  ctx.fillRect(0, 0, 560, 560)

  drawFilmGrain(ctx)

  // Orange spine — left edge signal
  ctx.fillStyle = C.orange
  ctx.fillRect(0, 0, 18, H)

  const pad = 64

  // Brand first — hero signal
  ctx.textAlign = 'right'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = C.scoop
  ctx.font = `400 132px ${FONT_DISPLAY}`
  ctx.fillText('چیل‌بار', W - pad, 168)

  ctx.fillStyle = C.orange
  ctx.font = `600 26px ${FONT_UI}`
  ctx.fillText('پاس واحدهای سیتی‌سنتر', W - pad, 218)

  // Unit block — left of sculpture space
  const unitMaxW = W * 0.55
  ctx.fillStyle = 'rgba(230,224,218,0.45)'
  ctx.font = `600 24px ${FONT_UI}`
  // Mixed Persian + Latin: draw separately so unit codes don't flip
  ctx.direction = 'rtl'
  const locLabel = input.floor ? `طبقه ${input.floor}   واحد  ` : 'واحد  '
  ctx.fillText(locLabel, W - pad, 320)
  const locLabelW = ctx.measureText(locLabel).width
  ctx.direction = 'ltr'
  ctx.textAlign = 'right'
  ctx.fillText(input.unitCode, W - pad - locLabelW, 320)
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'

  ctx.fillStyle = C.scoop
  ctx.font = `800 64px ${FONT_UI}`
  const nameLines = wrapText(ctx, input.unitName || input.unitCode, unitMaxW, 3)
  let y = 400
  for (const line of nameLines) {
    ctx.fillText(line, W - pad, y)
    y += 74
  }

  if (input.contactName) {
    ctx.fillStyle = 'rgba(230,224,218,0.42)'
    ctx.font = `500 26px ${FONT_UI}`
    ctx.fillText(input.contactName, W - pad, y + 8)
    y += 48
  }

  // Discount ribbon — angled stamp under unit
  const ribY = Math.max(y + 36, 560)
  ctx.save()
  ctx.translate(W - pad - 20, ribY)
  ctx.rotate(-0.08)
  roundRect(ctx, -210, -28, 210, 56, 8)
  ctx.fillStyle = C.orange
  ctx.fill()
  ctx.fillStyle = C.scoop
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 28px ${FONT_UI}`
  ctx.fillText(`${input.discountPercent}٪ تخفیف واحد`, -105, 2)
  ctx.restore()

  // Bottom action dock — dark matte strip
  const dockH = 520
  const dockY = H - dockH
  const dockGrad = ctx.createLinearGradient(0, dockY, 0, H)
  dockGrad.addColorStop(0, 'rgba(20,16,14,0.2)')
  dockGrad.addColorStop(0.12, C.cocoaDeep)
  dockGrad.addColorStop(1, '#0E0B0A')
  ctx.fillStyle = dockGrad
  ctx.fillRect(0, dockY, W, dockH)

  // stone top edge of dock
  ctx.fillStyle = C.stone
  ctx.fillRect(0, dockY, W, 4)

  // QR in stone frame (right in RTL visual = start)
  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=0` +
    `&color=2c2420&bgcolor=e6e0da` +
    `&data=${encodeURIComponent(input.deepLink)}`
  const qr = await loadImage(qrUrl)
  const qrSize = 280
  const qrPad = 28
  const frameX = W - pad - qrSize - qrPad * 2
  const frameY = dockY + 56
  roundRect(ctx, frameX, frameY, qrSize + qrPad * 2, qrSize + qrPad * 2, 20)
  ctx.fillStyle = C.stone
  ctx.fill()
  ctx.drawImage(qr, frameX + qrPad, frameY + qrPad, qrSize, qrSize)

  // Code column beside QR
  const colX = pad
  const colRight = frameX - 36
  ctx.textAlign = 'right'
  ctx.fillStyle = C.orange
  ctx.font = `600 22px ${FONT_UI}`
  ctx.fillText('کد اشتراک', colRight, frameY + 48)

  ctx.fillStyle = C.scoop
  ctx.font = `800 40px ui-monospace, SFMono-Regular, Menlo, monospace`
  const code = `\u200E${input.membershipCode}`
  const codeMax = colRight - colX
  if (ctx.measureText(code).width > codeMax) {
    ctx.font = `800 32px ui-monospace, SFMono-Regular, Menlo, monospace`
  }
  ctx.fillText(code, colRight, frameY + 108)

  ctx.fillStyle = 'rgba(230,224,218,0.55)'
  ctx.font = `500 24px ${FONT_UI}`
  const lines = ['اسکن کن یا لینک را باز کن', 'سفارش بده — پیک تا خود واحد']
  let ly = frameY + 180
  for (const line of lines) {
    ctx.fillText(line, colRight, ly)
    ly += 40
  }

  // Bottom brand strip
  ctx.fillStyle = C.orange
  ctx.fillRect(0, H - 72, W, 72)
  ctx.fillStyle = C.scoop
  ctx.font = `400 36px ${FONT_DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('چیل‌بار  —  chill-bar.ir', W / 2, H - 36)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('ساخت تصویر ناموفق'))),
      'image/png',
      0.95,
    )
  })
}

export function mallTicketFilename(unitCode: string) {
  return `chillbar-pass-${unitCode.replace(/[^\w-]+/g, '_')}.png`
}

export function buildWhatsAppTicketMessage(input: MallTicketInput): string {
  const floor = input.floor ? ` (طبقه ${input.floor})` : ''
  return [
    `سلام،`,
    `پاس واحد *${input.unitName}*${floor} در چیل‌بار آماده‌ست.`,
    ``,
    `کد اشتراک: ${input.membershipCode}`,
    input.deepLink,
    ``,
    `لینک را باز کن یا QR را اسکن کن — سفارش می‌دی، پیک تا خود واحد می‌آد.`,
    `تخفیف واحد: ${input.discountPercent}٪`,
    ``,
    `چیل‌بار · سیتی‌سنتر اصفهان`,
  ].join('\n')
}

/** Iran mobile → wa.me digits (98…) */
export function toWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0') && d.length === 11) d = `98${d.slice(1)}`
  if (d.length === 10 && d.startsWith('9')) d = `98${d}`
  if (!/^98\d{10}$/.test(d)) return null
  return d
}

export function whatsAppShareUrl(phone: string | null, text: string): string {
  const q = encodeURIComponent(text)
  if (phone) return `https://wa.me/${phone}?text=${q}`
  return `https://wa.me/?text=${q}`
}
