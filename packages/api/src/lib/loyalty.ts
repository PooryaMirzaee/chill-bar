import type { OrderStatus } from '@prisma/client'
import type {
  CreateOrderInput,
  LoyaltyRewardTier,
  StoreSettings,
  WaitGameId,
  WaitGameSubmitResult,
} from '@chill-bar/shared'
import {
  computeRedeem,
  computeWaitGameAward,
  findRewardTier,
  isLoungeStatusActive,
} from '@chill-bar/shared'
import { prisma } from '../prisma.js'

type RoundCounts = Partial<Record<WaitGameId, number>>

function parseRounds(raw: unknown): RoundCounts {
  if (!raw || typeof raw !== 'object') return {}
  return raw as RoundCounts
}

function maxRoundsForGame(settings: StoreSettings, gameId: WaitGameId): number {
  const g = settings.waitLounge.games
  switch (gameId) {
    case 'perfectPour':
      return g.perfectPour.rounds
    case 'memoryBrew':
      return g.memoryBrew.stages ?? 4
    case 'chillStack':
      return g.chillStack.maxBlocks
    case 'snakeGame':
      return 20
    default:
      return 5
  }
}

function durationBounds(gameId: WaitGameId): { min: number; max: number } {
  switch (gameId) {
    case 'perfectPour':
      return { min: 800, max: 120_000 }
    case 'memoryBrew':
      return { min: 3_000, max: 300_000 }
    case 'chillStack':
      return { min: 1_000, max: 180_000 }
    case 'snakeGame':
      return { min: 2_000, max: 300_000 }
    default:
      return { min: 500, max: 600_000 }
  }
}

export async function ensureWaitSession(orderId: string, customerId: string | null) {
  return prisma.waitGameSession.upsert({
    where: { orderId },
    create: { orderId, customerId },
    update: {},
  })
}

export async function submitWaitGameScore(input: {
  orderCode: string
  gameId: WaitGameId
  score: number
  durationMs: number
  customerId: string | null
  settings: StoreSettings
}): Promise<{ result?: WaitGameSubmitResult; error?: string }> {
  const lounge = input.settings.waitLounge
  if (!input.settings.features.waitLounge) {
    return { error: 'سالن انتظار غیرفعال است' }
  }
  if (!lounge.enabledGames[input.gameId]) {
    return { error: 'این بازی فعال نیست' }
  }

  const bounds = durationBounds(input.gameId)
  if (input.durationMs < bounds.min || input.durationMs > bounds.max) {
    return { error: 'زمان بازی نامعتبر است' }
  }

  const order = await prisma.order.findFirst({
    where: { OR: [{ code: input.orderCode }, { id: input.orderCode }] },
    include: { waitGame: true },
  })
  if (!order) return { error: 'سفارش پیدا نشد' }
  if (input.customerId && order.customerId && order.customerId !== input.customerId) {
    return { error: 'دسترسی به این سفارش مجاز نیست' }
  }
  if (!isLoungeStatusActive(lounge, order.status as OrderStatus)) {
    return { error: 'بازی برای این وضعیت سفارش بسته شده است' }
  }

  const session =
    order.waitGame ??
    (await prisma.waitGameSession.create({
      data: { orderId: order.id, customerId: input.customerId },
    }))

  const rounds = parseRounds(session.rounds)
  const played = rounds[input.gameId] ?? 0
  const maxRounds = maxRoundsForGame(input.settings, input.gameId)
  if (played >= maxRounds) {
    return { error: 'به سقف بازی این دور رسیدی' }
  }

  let awarded = computeWaitGameAward(
    lounge,
    input.gameId,
    input.score,
    order.status as OrderStatus,
  )
  const headroom = lounge.maxPointsPerOrder - session.pointsEarned
  if (headroom <= 0) {
    return {
      result: {
        awarded: 0,
        pointsEarnedThisOrder: session.pointsEarned,
        totalPoints: await readBalance(input.customerId),
        capped: true,
      },
    }
  }
  const capped = awarded > headroom
  if (capped) awarded = headroom

  rounds[input.gameId] = played + 1

  await prisma.$transaction(async (tx) => {
    await tx.waitGameSession.update({
      where: { id: session.id },
      data: {
        pointsEarned: session.pointsEarned + awarded,
        rounds: rounds as object,
      },
    })

    if (awarded > 0 && input.customerId) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { chillPoints: { increment: awarded } },
      })
      await tx.loyaltyTransaction.create({
        data: {
          customerId: input.customerId,
          orderId: order.id,
          type: 'earn',
          points: awarded,
          meta: { gameId: input.gameId, score: input.score },
        },
      })
    }
  })

  const totalPoints = await readBalance(input.customerId)
  return {
    result: {
      awarded,
      pointsEarnedThisOrder: session.pointsEarned + awarded,
      totalPoints,
      capped,
    },
  }
}

async function readBalance(customerId: string | null): Promise<number> {
  if (!customerId) return 0
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { chillPoints: true },
  })
  return customer?.chillPoints ?? 0
}

export interface LoyaltyApplyResult {
  items: CreateOrderInput['items']
  total: number
  pointsDeducted: number
  error?: string
}

export async function applyLoyaltyRedeem(
  input: CreateOrderInput,
  settings: StoreSettings,
  customerId: string | null,
): Promise<LoyaltyApplyResult> {
  const rewardId = input.loyaltyRewardId
  if (!rewardId) {
    const total = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    return { items: input.items, total, pointsDeducted: 0 }
  }

  if (!settings.waitLounge.pointsRedemptionEnabled) {
    const total = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    return { items: input.items, total, pointsDeducted: 0, error: 'مصرف امتیاز هنوز فعال نشده است' }
  }

  if (!customerId) {
    return { items: input.items, total: 0, pointsDeducted: 0, error: 'برای استفاده از امتیاز وارد شوید' }
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return { items: input.items, total: 0, pointsDeducted: 0, error: 'حساب کاربری پیدا نشد' }
  }

  const tier = findRewardTier(settings.waitLounge, rewardId)
  if (!tier) {
    return { items: input.items, total: 0, pointsDeducted: 0, error: 'جایزه نامعتبر است' }
  }

  const subtotal = input.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const redeem = computeRedeem(settings.waitLounge, tier, subtotal, customer.chillPoints)
  if (redeem.error) {
    return { items: input.items, total: subtotal, pointsDeducted: 0, error: redeem.error }
  }

  const items = [...input.items]

  if (redeem.freeItemId) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: redeem.freeItemId } })
    if (!menuItem || !menuItem.isAvailable) {
      return { items: input.items, total: subtotal, pointsDeducted: 0, error: 'آیتم جایزه موجود نیست' }
    }
    items.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      emoji: menuItem.emoji,
      unitPrice: 0,
      quantity: 1,
      customConfig: {
        loyaltyReward: true,
        tierId: tier.id,
        tierLabel: tier.label,
      },
    })
    return { items, total: subtotal, pointsDeducted: tier.cost }
  }

  if (redeem.discount > 0) {
    items.push({
      menuItemId: null,
      name: tier.label,
      emoji: '🎁',
      unitPrice: -redeem.discount,
      quantity: 1,
      customConfig: {
        loyaltyReward: true,
        tierId: tier.id,
        tierLabel: tier.label,
      },
    })
  }

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  return { items, total, pointsDeducted: tier.cost }
}

export async function finalizeLoyaltyRedeem(
  customerId: string | null,
  orderId: string,
  pointsDeducted: number,
  tier: LoyaltyRewardTier | null,
) {
  if (!customerId || pointsDeducted <= 0 || !tier) return
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { chillPoints: { decrement: pointsDeducted } },
    })
    await tx.loyaltyTransaction.create({
      data: {
        customerId,
        orderId,
        type: 'redeem',
        points: -pointsDeducted,
        meta: { tierId: tier.id, tierLabel: tier.label },
      },
    })
  })
}

export async function getLoyaltyBalance(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { chillPoints: true },
  })
  if (!customer) return null

  const ledger = await prisma.loyaltyTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return {
    chillPoints: customer.chillPoints,
    ledger: ledger.map((row) => ({
      id: row.id,
      type: row.type,
      points: row.points,
      orderId: row.orderId,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}
