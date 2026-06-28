import type { MenuItem } from '../types'

export interface PendingScratchReward {
  menuItemId: string
  name: string
  emoji: string
  rewardPrice: number
}

const STORAGE_KEY = 'chill-scratch-reward-v1'

export function loadPendingReward(): PendingScratchReward | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PendingScratchReward
  } catch {
    /* ignore */
  }
  return null
}

export function savePendingReward(reward: PendingScratchReward | null) {
  try {
    if (reward) localStorage.setItem(STORAGE_KEY, JSON.stringify(reward))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function toPendingReward(item: MenuItem, rewardPrice: number): PendingScratchReward {
  return {
    menuItemId: item.id,
    name: item.name,
    emoji: item.emoji,
    rewardPrice,
  }
}
