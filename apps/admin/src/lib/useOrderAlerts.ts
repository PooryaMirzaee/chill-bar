import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AdminAlertSettings, Order } from '@chill-bar/shared'
import { api } from './api'
import { useAdminSocket } from './useOrdersSocket'
import { playAlertSound } from './alertSounds'
import { isAlertMuted, subscribeAlertMute } from './alertMute'

export function useOrderAlerts() {
  const queryClient = useQueryClient()
  const [sessionMuted, setSessionMutedState] = useState(isAlertMuted)

  useEffect(() => subscribeAlertMute(() => setSessionMutedState(isAlertMuted())), [])

  const { data: settings } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: () => api<AdminAlertSettings>('/api/admin/alerts'),
    staleTime: 60_000,
  })

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ['orders', 'pending'],
    queryFn: () => api<Order[]>('/api/admin/orders?status=PENDING&limit=50'),
    refetchInterval: 20_000,
  })

  const shouldPlay = useCallback(() => {
    if (!settings?.enabled) return false
    if (isAlertMuted()) return false
    return true
  }, [settings?.enabled])

  const handleSocket = useCallback(
    (msg: { type: string }) => {
      if (msg.type === 'order:new') {
        if (shouldPlay() && settings?.soundOnNewOrder) {
          playAlertSound(settings.newOrderSound, settings.volume)
        }
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      } else if (msg.type === 'order:updated' || msg.type === 'order:status') {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'pending'] })
      }
    },
    [queryClient, settings, shouldPlay],
  )

  useAdminSocket(handleSocket)

  useEffect(() => {
    if (!settings?.pendingReminderEnabled || !shouldPlay()) return

    const tick = () => {
      if (!settings.pendingReminderEnabled || !shouldPlay()) return
      if (pendingOrders.length === 0) return
      playAlertSound(settings.pendingReminderSound, settings.volume)
    }

    const ms = Math.max(5, settings.pendingReminderIntervalSeconds) * 1000
    const id = window.setInterval(tick, ms)
    return () => window.clearInterval(id)
  }, [settings, pendingOrders.length, shouldPlay])

  return { pendingCount: pendingOrders.length, sessionMuted }
}
