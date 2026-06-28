import type {
  LoyaltyRewardTier,
  OrderStatus,
  WaitGameId,
  WaitLoungeSettings,
} from './types'

/** Maximum points a single play of a game can yield (used for anti-cheat clamps). */
export function gameMaxPoints(settings: WaitLoungeSettings, gameId: WaitGameId): number {
  const g = settings.games
  switch (gameId) {
    case 'perfectPour':
      return g.perfectPour.rounds * g.perfectPour.perfectPoints
    case 'memoryBrew':
      return (g.memoryBrew.stages ?? 4) * (g.memoryBrew.basePoints + g.memoryBrew.timeBonus)
    case 'chillStack':
      return g.chillStack.maxBlocks * g.chillStack.blockPoints
    case 'snakeGame':
      return g.snakeGame.maxPoints
    default:
      return 0
  }
}

/**
 * Computes how many points to actually award for a submitted score:
 * clamps to the game's max and applies the preparing-status bonus.
 */
export function computeWaitGameAward(
  settings: WaitLoungeSettings,
  gameId: WaitGameId,
  score: number,
  status: OrderStatus,
): number {
  const clamped = Math.max(0, Math.min(score, gameMaxPoints(settings, gameId)))
  const bonus = status === 'PREPARING' ? settings.statusBonusMultiplier : 1
  return Math.round(clamped * bonus)
}

export function findRewardTier(
  settings: WaitLoungeSettings,
  tierId: string | null | undefined,
): LoyaltyRewardTier | null {
  if (!tierId) return null
  return settings.rewards.find((r) => r.id === tierId) ?? null
}

export interface RedeemResult {
  discount: number
  freeItemId: string | null
  error?: string
}

/**
 * Validates a redemption against the customer balance and store caps, returning
 * the toman discount (for discount tiers) or the free item id.
 */
export function computeRedeem(
  settings: WaitLoungeSettings,
  tier: LoyaltyRewardTier,
  subtotal: number,
  balance: number,
): RedeemResult {
  if (!settings.pointsRedemptionEnabled) {
    return { discount: 0, freeItemId: null, error: 'مصرف امتیاز هنوز فعال نشده است' }
  }
  if (balance < settings.minPointsToRedeem) {
    return { discount: 0, freeItemId: null, error: 'امتیاز کافی برای استفاده نداری' }
  }
  if (balance < tier.cost) {
    return { discount: 0, freeItemId: null, error: 'امتیاز کافی برای این جایزه نداری' }
  }

  if (tier.type === 'free_item') {
    if (!tier.menuItemId) {
      return { discount: 0, freeItemId: null, error: 'آیتم جایزه نامعتبر است' }
    }
    return { discount: 0, freeItemId: tier.menuItemId }
  }

  let discount = 0
  if (tier.type === 'discount_fixed') {
    discount = tier.value
  } else if (tier.type === 'discount_percent') {
    const pct = Math.min(tier.value, settings.maxPercentPerOrder)
    discount = Math.floor((subtotal * pct) / 100)
  }

  discount = Math.min(discount, settings.maxDiscountPerOrder, subtotal)
  if (discount <= 0) {
    return { discount: 0, freeItemId: null, error: 'این تخفیف روی سبد فعلی قابل اعمال نیست' }
  }
  return { discount, freeItemId: null }
}

export function formatChillPoints(points: number): string {
  return `${points.toLocaleString('fa-IR')}`
}

export function loungeEnabledGameIds(settings: WaitLoungeSettings): WaitGameId[] {
  return (Object.keys(settings.enabledGames) as WaitGameId[]).filter(
    (id) => settings.enabledGames[id],
  )
}

export function isLoungeStatusActive(
  settings: WaitLoungeSettings,
  status: OrderStatus,
): boolean {
  return settings.allowedStatuses.includes(status)
}
