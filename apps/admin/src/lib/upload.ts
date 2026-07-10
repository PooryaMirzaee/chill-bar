import { api } from './api'

const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
] as const

type AllowedMime = (typeof ALLOWED_MIME)[number]

const EXT_MIME: Record<string, AllowedMime> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
}

const MAX_UPLOAD_BYTES = 1_400_000
const MAX_DIMENSION = 1200

function resolveMimeType(file: File): AllowedMime {
  if (ALLOWED_MIME.includes(file.type as AllowedMime)) {
    return file.type as AllowedMime
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const mime = EXT_MIME[ext]
  if (!mime) {
    throw new Error('فرمت تصویر پشتیبانی نمی‌شود — PNG، JPG یا WebP انتخاب کنید')
  }
  return mime
}

async function compressRasterImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  if (ratio < 1) {
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('فشرده‌سازی تصویر ناموفق بود')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  let quality = 0.88
  let blob: Blob | null = null
  for (let attempt = 0; attempt < 6; attempt++) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality)
    })
    if (!blob) break
    if (blob.size <= MAX_UPLOAD_BYTES) break
    quality -= 0.12
  }

  if (!blob) {
    throw new Error('فشرده‌سازی تصویر ناموفق بود')
  }
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('حجم تصویر بعد از فشرده‌سازی هنوز زیاد است — تصویر کوچک‌تری انتخاب کنید')
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

async function prepareUploadFile(file: File): Promise<File> {
  const mime = resolveMimeType(file)
  if (mime === 'image/svg+xml' || mime === 'image/gif') {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('حجم فایل بیش از ۱.۵ مگابایت است — SVG/GIF کوچک‌تری انتخاب کنید')
    }
    return file
  }
  if (file.size <= MAX_UPLOAD_BYTES) {
    return file
  }
  return compressRasterImage(file)
}

export async function uploadImage(file: File): Promise<string> {
  const prepared = await prepareUploadFile(file)
  const mimeType = resolveMimeType(prepared)
  const data = await fileToBase64(prepared)
  const res = await api<{ url: string }>('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({
      data,
      filename: prepared.name,
      mimeType,
    }),
  })
  return res.url
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (!base64) reject(new Error('خواندن فایل ناموفق بود'))
      else resolve(base64)
    }
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود'))
    reader.readAsDataURL(file)
  })
}

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:4000'
  return ''
}

export function resolveAssetUrl(path: string | null | undefined, apiBase?: string): string | null {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('data:')) return path
  const base = (apiBase ?? apiBaseUrl()).replace(/\/$/, '')
  if (!base) return path.startsWith('/') ? path : `/${path}`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
