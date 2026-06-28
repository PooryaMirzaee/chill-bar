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

export async function uploadImage(file: File): Promise<string> {
  const mimeType = resolveMimeType(file)
  const data = await fileToBase64(file)
  const res = await api<{ url: string }>('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({
      data,
      filename: file.name,
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
