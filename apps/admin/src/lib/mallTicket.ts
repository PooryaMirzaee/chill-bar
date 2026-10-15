/** Chill Bar × City Center — WhatsApp-ready VIP pass PNG generator */

export interface MallTicketInput {
  unitCode: string
  unitName: string
  floor?: string | null
  membershipCode: string
  discountPercent: number
  deepLink: string
  contactName?: string | null
}

const W = 1080
const H = 1620

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

function drawSoftServe(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  // cone
  ctx.fillStyle = '#E8A87C'
  ctx.beginPath()
  ctx.moveTo(-36, 20)
  ctx.lineTo(36, 20)
  ctx.lineTo(0, 110)
  ctx.closePath()
  ctx.fill()
  // scoop swirls
  const scoops = [
    { x: 0, y: -10, r: 48, c: '#FFF8F0' },
    { x: -18, y: -48, r: 34, c: '#FF8C4D' },
    { x: 16, y: -42, r: 30, c: '#F26522' },
    { x: 0, y: -78, r: 26, c: '#FFD6A8' },
  ]
  for (const s of scoops) {
    ctx.fillStyle = s.c
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawTicketNotches(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  const midY = H * 0.58
  for (let x = 0; x < W; x += 28) {
    ctx.beginPath()
    ctx.arc(x + 14, midY, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  // side punch holes
  for (const y of [220, 420, 920, 1120, 1380]) {
    ctx.beginPath()
    ctx.arc(0, y, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W, y, 18, 0, Math.PI * 2)
    ctx.fill()
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
    await document.fonts.ready
  } catch {
    /* ignore */
  }
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas پشتیبانی نمی‌شود')

  // atmosphere background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#1A1411')
  bg.addColorStop(0.45, '#2C2420')
  bg.addColorStop(1, '#3D2318')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // soft glow orbs
  const glow = ctx.createRadialGradient(200, 180, 20, 200, 180, 340)
  glow.addColorStop(0, 'rgba(242,101,34,0.45)')
  glow.addColorStop(1, 'rgba(242,101,34,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  const glow2 = ctx.createRadialGradient(900, 1400, 40, 900, 1400, 420)
  glow2.addColorStop(0, 'rgba(255,140,77,0.28)')
  glow2.addColorStop(1, 'rgba(255,140,77,0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, W, H)

  // main ticket body
  ctx.save()
  roundRect(ctx, 48, 56, W - 96, H - 112, 36)
  const card = ctx.createLinearGradient(48, 56, W - 48, H - 56)
  card.addColorStop(0, '#FFF9F3')
  card.addColorStop(0.55, '#FFE8D4')
  card.addColorStop(1, '#FFD4B0')
  ctx.fillStyle = card
  ctx.fill()
  ctx.restore()

  // clip ticket for notches
  ctx.save()
  roundRect(ctx, 48, 56, W - 96, H - 112, 36)
  ctx.clip()
  drawTicketNotches(ctx)
  ctx.restore()

  // re-draw card interior content area (above / below perforation)
  const left = 88
  const right = W - 88
  const contentW = right - left

  // header strip
  ctx.fillStyle = '#F26522'
  roundRect(ctx, left, 96, contentW, 92, 20)
  ctx.fill()
  ctx.fillStyle = '#FFFCF9'
  ctx.font = '700 28px Vazirmatn, Tahoma, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('CHILL BAR  ·  CITY CENTER PASS', W / 2, 140)
  ctx.font = '600 34px Vazirmatn, Tahoma, sans-serif'
  ctx.fillText('پاس اختصاصی واحدهای سیتی‌سنتر', W / 2, 178)

  drawSoftServe(ctx, W / 2, 310, 1.15)

  // unit name block
  ctx.fillStyle = '#2C2420'
  ctx.font = '800 52px Vazirmatn, Tahoma, sans-serif'
  ctx.textAlign = 'center'
  const nameLines = wrapText(ctx, input.unitName || input.unitCode, contentW - 40, 2)
  let nameY = 470
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, nameY)
    nameY += 58
  }

  ctx.fillStyle = '#F26522'
  ctx.font = '700 36px Vazirmatn, Tahoma, sans-serif'
  const floorBit = input.floor ? `طبقه ${input.floor}  ·  ` : ''
  ctx.fillText(`${floorBit}واحد ${input.unitCode}`, W / 2, nameY + 12)

  if (input.contactName) {
    ctx.fillStyle = '#5C4F47'
    ctx.font = '500 26px Vazirmatn, Tahoma, sans-serif'
    ctx.fillText(input.contactName, W / 2, nameY + 52)
  }

  // dashed perforation visual line
  const dashY = H * 0.58
  ctx.strokeStyle = 'rgba(44,36,32,0.25)'
  ctx.setLineDash([10, 12])
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(left + 20, dashY)
  ctx.lineTo(right - 20, dashY)
  ctx.stroke()
  ctx.setLineDash([])

  // benefits chips (centered row)
  const chips = [
    `${input.discountPercent}٪ تخفیف`,
    'پیک تا واحد',
    'کیف و اعتبار',
  ]
  ctx.font = '600 24px Vazirmatn, Tahoma, sans-serif'
  const chipGap = 12
  const chipPads = chips.map((c) => ctx.measureText(c).width + 32)
  const chipsWidth = chipPads.reduce((a, b) => a + b, 0) + chipGap * (chips.length - 1)
  let chipX = (W - chipsWidth) / 2
  const chipY = dashY + 48
  chips.forEach((chip, i) => {
    const tw = chipPads[i]!
    ctx.fillStyle = '#2C2420'
    roundRect(ctx, chipX, chipY, tw, 48, 24)
    ctx.fill()
    ctx.fillStyle = '#FFF8F0'
    ctx.textAlign = 'center'
    ctx.fillText(chip, chipX + tw / 2, chipY + 32)
    chipX += tw + chipGap
  })

  // QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(input.deepLink)}`
  const qr = await loadImage(qrUrl)
  const qrSize = 300
  const qrX = (W - qrSize) / 2
  const qrY = chipY + 80
  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 24)
  ctx.fill()
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize)

  ctx.fillStyle = '#5C4F47'
  ctx.font = '500 22px Vazirmatn, Tahoma, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('اسکن کن · سفارش بده · پیک می‌آد', W / 2, qrY + qrSize + 48)

  // code plate
  const codeY = qrY + qrSize + 90
  ctx.fillStyle = '#1A1411'
  roundRect(ctx, left + 40, codeY, contentW - 80, 100, 22)
  ctx.fill()
  ctx.fillStyle = '#FF8C4D'
  ctx.font = '600 22px Vazirmatn, Tahoma, sans-serif'
  ctx.fillText('کد اشتراک اختصاصی', W / 2, codeY + 34)
  ctx.fillStyle = '#FFFCF9'
  ctx.font = '800 40px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.fillText(input.membershipCode, W / 2, codeY + 78)

  // footer
  ctx.fillStyle = '#8A7366'
  ctx.font = '500 22px Vazirmatn, Tahoma, sans-serif'
  ctx.fillText('chill-bar.ir  ·  حیاط پلازا · سیتی‌سنتر اصفهان', W / 2, H - 90)

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
    `سلام 👋`,
    `پاس اختصاصی *چیل‌بار* برای واحد *${input.unitName}*${floor} آماده‌ست.`,
    ``,
    `🎟 کد اشتراک: ${input.membershipCode}`,
    `🔗 ${input.deepLink}`,
    ``,
    `با باز کردن لینک یا اسکن QR سفارش بده — پیک تا خود واحد می‌آد.`,
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
