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

export async function nextOrderCode(
  tx: Prisma.TransactionClient,
  at = new Date(),
): Promise<string> {
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

  // `code` is globally unique — skip numbers taken on previous days too
  for (let i = 0; i < 2000; i++) {
    const candidate = `${CODE_PREFIX}${seq}`
    const exists = await tx.order.findFirst({
      where: { code: candidate },
      select: { id: true },
    })
    if (!exists) return candidate
    seq++
  }

  throw new Error('Could not allocate order code')
}
