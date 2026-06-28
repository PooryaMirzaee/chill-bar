import type { CreateOrderInput, ScratchRewardSettings } from '@chill-bar/shared'

type OrderItem = CreateOrderInput['items'][number]

function isScratchReward(item: OrderItem): boolean {
  return Boolean(item.customConfig && (item.customConfig as Record<string, unknown>).isScratchReward)
}

export function applyScratchRewardRules(
  items: OrderItem[],
  scratchReward: ScratchRewardSettings,
): { items: OrderItem[]; error?: string } {
  const paid = items.filter((i) => !isScratchReward(i))
  const rewards = items.filter(isScratchReward)

  if (paid.length === 0) {
    return { items: paid, error: 'سبد خرید خالی است' }
  }

  if (rewards.length > 1) {
    return { items: paid, error: 'فقط یک جایزه کارت شانس مجاز است' }
  }

  if (rewards.length === 0) {
    return { items: paid }
  }

  const reward = rewards[0]
  if (!reward.menuItemId) {
    return { items: paid, error: 'جایزه نامعتبر است' }
  }

  if (
    scratchReward.menuItemIds.length > 0 &&
    !scratchReward.menuItemIds.includes(reward.menuItemId)
  ) {
    return { items: paid, error: 'جایزه انتخاب‌شده مجاز نیست' }
  }

  return {
    items: [
      ...paid,
      {
        ...reward,
        unitPrice: scratchReward.rewardPrice,
        quantity: 1,
        customConfig: { isScratchReward: true },
      },
    ],
  }
}
