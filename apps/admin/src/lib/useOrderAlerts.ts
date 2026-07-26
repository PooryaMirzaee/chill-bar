import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminAlertSettings, Order } from '@chill-bar/shared'
import { api } from './api'
import { useAdminSocket } from './useOrdersSocket'
import { playAlertSound, unlockAlertAudio } from './alertSounds'
import { isAlertMuted, subscribeAlertMute } from './alertMute'

/**
 * Global order alert host — mount once for all authenticated admin routes
 * (Layout pages + POS) so new-order sound is never page-scoped.
 */
export function useOrderAlerts() {
  const queryClient = useQueryClient()
  const [sessionMuted, setSessionMutedState] = useState(isAlertMuted)
  const settingsRef = useRef<AdminAlertSettings | undefined>(undefined)

  useEffect(() => subscribeAlertMute(() => setSessionMutedState(isAlertMuted())), [])

  useEffect(() => {
    const unlock = () => unlockAlertAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  const { data: settings } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: () => api<AdminAlertSettings>('/api/admin/alerts'),
    staleTime: 60_000,
  })
  settingsRef.current = settings

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['orders', 'pending'],
    queryFn: () => api<Order[]>('/api/admin/orders?status=PENDING&limit=50'),
    refetchInterval: 20_000,
  })

  const shouldPlay = useCallback(() => {
    const s = settingsRef.current
    if (!s?.enabled) return false
    if (isAlertMuted()) return false
    return true
  }, [])

  const handleSocket = useCallback(
    (msg: { type: string }) => {
      const s = settingsRef.current
      if (msg.type === 'order:new') {
        if (shouldPlay() && s?.soundOnNewOrder) {
          playAlertSound(s.newOrderSound, s.volume)
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['pos-incoming'] })
      } else if (msg.type === 'order:updated' || msg.type === 'order:status' || msg.type === 'order:paid') {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['pos-incoming'] })
      }
    },
    [queryClient, shouldPlay],
  )

  useAdminSocket(handleSocket)

  useEffect(() => {
    if (!settings?.pendingReminderEnabled || !shouldPlay()) return

    const tick = () => {
      if (!settingsRef.current?.pendingReminderEnabled || !shouldPlay()) return
      if (pendingOrders.length === 0) return
      const s = settingsRef.current
      if (!s) return
      playAlertSound(s.pendingReminderSound, s.volume)
    }

    const ms = Math.max(5, settings.pendingReminderIntervalSeconds) * 1000
    const id = window.setInterval(tick, ms)
    return () => window.clearInterval(id)
  }, [settings, pendingOrders.length, shouldPlay])

  return { pendingCount: pendingOrders.length, sessionMuted }
}
