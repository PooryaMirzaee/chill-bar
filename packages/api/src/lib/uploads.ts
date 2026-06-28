import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads')

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/gif': 'gif',
}

const MAX_BYTES = 1_500_000

export async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true })
}

export async function saveUploadedImage(data: string, mimeType: string): Promise<string> {
  const buffer = Buffer.from(data, 'base64')
  if (buffer.length > MAX_BYTES) {
    throw new Error('حجم فایل بیش از ۱.۵ مگابایت است')
  }
  const ext = MIME_EXT[mimeType]
  if (!ext) throw new Error('فرمت تصویر پشتیبانی نمی‌شود')

  await ensureUploadsDir()
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`
  await writeFile(join(UPLOADS_DIR, name), buffer)
  return `/uploads/${name}`
}
