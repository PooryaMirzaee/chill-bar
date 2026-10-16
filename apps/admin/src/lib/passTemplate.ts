import { Canvas, FabricImage, FabricText, Rect, type FabricObject } from 'fabric'
import type { MallTicketInput } from './mallTicket'

export const PASS_W = 1080
export const PASS_H = 1620

export const PASS_VARIABLES = [
  { key: 'unitName', label: 'نام واحد', sample: 'گالری نور' },
  { key: 'unitCode', label: 'کد واحد', sample: 'B2-214' },
  { key: 'membershipCode', label: 'کد اشتراک', sample: 'B2214' },
  { key: 'floor', label: 'طبقه', sample: '۲' },
  { key: 'discount', label: 'تخفیف٪', sample: '15' },
  { key: 'contactName', label: 'نام مخاطب', sample: 'خانم رضایی' },
  { key: 'deepLink', label: 'لینک', sample: 'https://chill-bar.ir/m/B2214' },
] as const

export type PassVarKey = (typeof PASS_VARIABLES)[number]['key']

export interface MallPassTemplatePayload {
  version: 1
  width: number
  height: number
  fabricJson: Record<string, unknown>
  updatedAt?: string
}

export function sampleTicket(): MallTicketInput {
  return {
    unitCode: 'B2-214',
    unitName: 'گالری نور',
    floor: '۲',
    membershipCode: 'B2214',
    discountPercent: 15,
    deepLink: 'https://chill-bar.ir/m/B2214',
    contactName: 'خانم رضایی',
  }
}

function varMap(input: MallTicketInput): Record<PassVarKey, string> {
  return {
    unitName: input.unitName || input.unitCode,
    unitCode: input.unitCode,
    membershipCode: input.membershipCode,
    floor: input.floor || '—',
    discount: String(input.discountPercent),
    contactName: input.contactName || '',
    deepLink: input.deepLink,
  }
}

function applyVarsToText(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

/** Build a starter layout on a live canvas (more reliable than raw JSON across Fabric versions). */
export async function applyDefaultPassLayout(canvas: Canvas): Promise<void> {
  canvas.clear()
  canvas.backgroundColor = '#2C2420'
  canvas.add(
    new Rect({
      left: 0,
      top: 0,
      width: 18,
      height: PASS_H,
      fill: '#F26522',
    }),
    new FabricText('چیل‌بار', {
      left: PASS_W - 72,
      top: 80,
      fontSize: 96,
      fill: '#FFFCF9',
      fontFamily: 'Lalezar, Vazirmatn, Tahoma, sans-serif',
      originX: 'right',
      textAlign: 'right',
    }),
    new FabricText('پاس واحدهای سیتی‌سنتر', {
      left: PASS_W - 72,
      top: 190,
      fontSize: 28,
      fill: '#F26522',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      originX: 'right',
      textAlign: 'right',
    }),
    new FabricText('{{unitName}}', {
      left: PASS_W - 72,
      top: 320,
      fontSize: 64,
      fill: '#FFFCF9',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      fontWeight: '800',
      originX: 'right',
      textAlign: 'right',
      name: 'field:unitName',
    }),
    new FabricText('واحد {{unitCode}}  /  طبقه {{floor}}', {
      left: PASS_W - 72,
      top: 410,
      fontSize: 28,
      fill: 'rgba(230,224,218,0.7)',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      originX: 'right',
      textAlign: 'right',
    }),
    new FabricText('{{discount}}٪ تخفیف واحد', {
      left: PASS_W - 72,
      top: 480,
      fontSize: 32,
      fill: '#F26522',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      fontWeight: '700',
      originX: 'right',
      textAlign: 'right',
    }),
  )

  const qr = new Rect({
    left: (PASS_W - 320) / 2,
    top: 700,
    width: 320,
    height: 320,
    fill: '#E6E0DA',
    rx: 20,
    ry: 20,
    name: 'qr',
  })
  ;(qr as unknown as { passField: string }).passField = 'qr'
  canvas.add(
    qr,
    new FabricText('جای QR', {
      left: PASS_W / 2,
      top: 840,
      fontSize: 32,
      fill: '#2C2420',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      name: 'qr-label',
    }),
    new Rect({
      left: 72,
      top: 1100,
      width: PASS_W - 144,
      height: 140,
      fill: '#14100E',
      rx: 16,
      ry: 16,
    }),
    new FabricText('کد اشتراک', {
      left: PASS_W / 2,
      top: 1124,
      fontSize: 24,
      fill: '#F26522',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      originX: 'center',
      textAlign: 'center',
    }),
    new FabricText('{{membershipCode}}', {
      left: PASS_W / 2,
      top: 1170,
      fontSize: 48,
      fill: '#FFFCF9',
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontWeight: '800',
      originX: 'center',
      textAlign: 'center',
      name: 'field:membershipCode',
    }),
  )
  canvas.requestRenderAll()
}

/** @deprecated — use applyDefaultPassLayout */
export function createDefaultPassJson(): Record<string, unknown> {
  return { version: '6.0.0', objects: [] }
}

async function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('بارگذاری تصویر ناموفق'))
    img.src = src
  })
}

/** Render saved Fabric template → PNG blob for a unit */
export async function renderPassFromTemplate(
  template: MallPassTemplatePayload,
  input: MallTicketInput,
): Promise<Blob> {
  const host = document.createElement('canvas')
  host.width = template.width || PASS_W
  host.height = template.height || PASS_H
  const canvas = new Canvas(host, {
    width: host.width,
    height: host.height,
    renderOnAddRemove: false,
  })

  const json = structuredClone(template.fabricJson)
  await canvas.loadFromJSON(json)
  const vars = varMap(input)

  const objects = [...canvas.getObjects()]
  for (const obj of objects) {
    if (obj instanceof FabricText && obj.text?.includes('{{')) {
      obj.set('text', applyVarsToText(obj.text, vars))
    }
  }

  const qrPlaceholders = objects.filter((o) => {
    const a = o as FabricObject & { passField?: string; name?: string }
    return a.passField === 'qr' || a.name === 'qr'
  })

  if (qrPlaceholders.length) {
    const qrUrl =
      `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0` +
      `&color=2c2420&bgcolor=e6e0da&data=${encodeURIComponent(input.deepLink)}`
    await loadImageEl(qrUrl)
    for (const ph of qrPlaceholders) {
      const left = ph.left ?? 0
      const top = ph.top ?? 0
      const w = (ph.width ?? 300) * (ph.scaleX ?? 1)
      const h = (ph.height ?? 300) * (ph.scaleY ?? 1)
      const img = await FabricImage.fromURL(qrUrl, { crossOrigin: 'anonymous' })
      img.set({
        left,
        top,
        scaleX: w / (img.width || 1),
        scaleY: h / (img.height || 1),
        originX: ph.originX,
        originY: ph.originY,
      })
      canvas.remove(ph)
      canvas.getObjects()
        .filter((o) => (o as { name?: string }).name === 'qr-label')
        .forEach((l) => canvas.remove(l))
      canvas.add(img)
    }
  }

  canvas.requestRenderAll()
  const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1, enableRetinaScaling: false })
  canvas.dispose()

  const res = await fetch(dataUrl)
  return res.blob()
}
