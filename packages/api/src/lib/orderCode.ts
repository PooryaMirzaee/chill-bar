import type { Prisma } from '@prisma/client'

const DAILY_ORDER_START = 500
const CODE_PREFIX = 'CH'
const TEHRAN_TZ = 'Asia/Tehran'

function tehranDayBounds(at: Date): { dayStart: Date; dayEnd: Date } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  const year = Number(get('year'))
  const month = Number(get('month'))
  const day = Number(get('day'))

  // Midnight in Tehran, expressed as UTC
  const tehranOffsetMin = 3 * 60 + 30
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  dayStart.setUTCMinutes(dayStart.getUTCMinutes() - tehranOffsetMin)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  return { dayStart, dayEnd }
}

function parseDailySequence(code: string): number | null {
  const match = /^CH(\d+)$/i.exec(code.trim())
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

async function codeExists(tx: Prisma.TransactionClient, code: string): Promise<boolean> {
  const exists = await tx.order.findFirst({
    where: { code },
    select: { id: true },
  })
  return Boolean(exists)
}

/**
 * Allocate a unique order code.
 * When receiptNumber is provided (POS per-shift sequence), prefer CH{receiptNumber}.
 * If that code was used in a previous shift, add a short unique suffix.
 */
export async function nextOrderCode(
  tx: Prisma.TransactionClient,
  options?: { shiftId?: string | null; receiptNumber?: number; at?: Date },
): Promise<string> {
  const at = options?.at ?? new Date()
  const receiptNumber = options?.receiptNumber
  const shiftId = options?.shiftId

  if (receiptNumber != null) {
    const preferred = `${CODE_PREFIX}${receiptNumber}`
    if (!(await codeExists(tx, preferred))) return preferred

    const shiftSuffix = (shiftId ?? 'x').replace(/[^a-zA-Z0-9]/g, '').slice(-4) || 'x'
    const withShift = `${CODE_PREFIX}${receiptNumber}${shiftSuffix}`
    if (!(await codeExists(tx, withShift))) return withShift

    for (let i = 0; i < 50; i++) {
      const candidate = `${CODE_PREFIX}${receiptNumber}T${Date.now().toString(36)}${i}`
      if (!(await codeExists(tx, candidate))) return candidate
    }
    throw new Error('Could not allocate order code for receipt number')
  }

  const { dayStart, dayEnd } = tehranDayBounds(at)

  const todaysCodes = await tx.order.findMany({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    select: { code: true },
  })

  let seq = DAILY_ORDER_START
  for (const row of todaysCodes) {
    const parsed = parseDailySequence(row.code)
    if (parsed != null) seq = Math.max(seq, parsed + 1)
  }

  for (let i = 0; i < 2000; i++) {
    const candidate = `${CODE_PREFIX}${seq}`
    if (!(await codeExists(tx, candidate))) return candidate
    seq++
  }

  throw new Error('Could not allocate order code')
}
