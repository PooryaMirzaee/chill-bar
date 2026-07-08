import type { Prisma } from '@prisma/client'

const DAILY_ORDER_START = 500
const CODE_PREFIX = 'CH'

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
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
  const dayStart = startOfDay(at)
  const dayEnd = endOfDay(at)

  const todaysCodes = await tx.order.findMany({
    where: { createdAt: { gte: dayStart, lt: dayEnd } },
    select: { code: true },
  })

  let maxSeq = DAILY_ORDER_START - 1
  for (const row of todaysCodes) {
    const seq = parseDailySequence(row.code)
    if (seq != null) maxSeq = Math.max(maxSeq, seq)
  }

  return `${CODE_PREFIX}${maxSeq + 1}`
}
