import { useCallback } from 'react'
import type { WaitGameId } from '@chill-bar/shared'
import { apiClient } from '../../lib/api'
import { useWaitLounge } from '../../store/waitLounge'
import { useLoyalty } from '../../hooks/useLoyalty'

export function useSubmitWaitGame() {
  const { activeOrder, addSessionPoints } = useWaitLounge()
  const { invalidate } = useLoyalty(false)

  return useCallback(
    async (gameId: WaitGameId, score: number, durationMs: number) => {
      if (!activeOrder) throw new Error('سفارش فعالی وجود ندارد')
      const result = await apiClient.submitWaitGame(activeOrder.code, {
        gameId,
        score,
        durationMs,
        nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
      if (result.awarded > 0) addSessionPoints(result.awarded)
      invalidate()
      return result
    },
    [activeOrder, addSessionPoints, invalidate],
  )
}
