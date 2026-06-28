import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { OrderStatus, StoreCopy, WaitLoungeSettings } from '@chill-bar/shared'
import { isLoungeStatusActive } from '@chill-bar/shared'
import { apiClient } from '../lib/api'
import { useStoreSettings } from '../hooks/useStoreSettings'
import {
  isLoungeTerminal,
  loadActiveOrder,
  saveActiveOrder,
  type ActiveOrder,
} from './activeOrder'

function wsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws/orders`
}

interface WaitLoungeContextValue {
  activeOrder: ActiveOrder | null
  setActiveOrder: (order: ActiveOrder | null) => void
  clearActiveOrder: () => void
  refreshStatus: () => Promise<void>
  sessionPoints: number
  addSessionPoints: (delta: number) => void
  canPlay: boolean
  loungeEnabled: boolean
  loungeSettings: WaitLoungeSettings
  loungeCopy: StoreCopy
  loungeOpen: boolean
  setLoungeOpen: (open: boolean) => void
}

const WaitLoungeContext = createContext<WaitLoungeContextValue | null>(null)

export function WaitLoungeProvider({ children }: { children: ReactNode }) {
  const { settings } = useStoreSettings()
  const [activeOrder, setActiveOrderState] = useState<ActiveOrder | null>(loadActiveOrder)
  const [sessionPoints, setSessionPoints] = useState(() => loadActiveOrder()?.pointsEarned ?? 0)
  const [loungeOpen, setLoungeOpen] = useState(false)
  const activeCodeRef = useRef(activeOrder?.code)

  useEffect(() => {
    activeCodeRef.current = activeOrder?.code
  }, [activeOrder?.code])

  const setActiveOrder = useCallback((order: ActiveOrder | null) => {
    setActiveOrderState(order)
    saveActiveOrder(order)
    if (order) setSessionPoints(order.pointsEarned)
  }, [])

  const refreshStatus = useCallback(async () => {
    const code = activeCodeRef.current
    if (!code) return
    try {
      const status = await apiClient.getOrderStatus(code)
      setActiveOrderState((prev) => {
        if (!prev || prev.code !== code) return prev
        const next = {
          ...prev,
          status: status.status,
          pointsEarned: status.pointsEarned ?? prev.pointsEarned,
        }
        if (isLoungeTerminal(next.status)) {
          saveActiveOrder(null)
          return null
        }
        saveActiveOrder(next)
        return next
      })
      setSessionPoints(status.pointsEarned ?? 0)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!activeOrder || isLoungeTerminal(activeOrder.status)) return
    const id = window.setInterval(() => void refreshStatus(), 5000)
    return () => window.clearInterval(id)
  }, [activeOrder, refreshStatus])

  useEffect(() => {
    if (!activeOrder || isLoungeTerminal(activeOrder.status)) return
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(wsUrl())
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string
            payload: { id?: string; code?: string; status?: OrderStatus; pointsEarned?: number }
          }
          if (msg.type !== 'order:status' && msg.type !== 'order:new') return
          const p = msg.payload
          const code = activeCodeRef.current
          if (!code || (p.code !== code && p.id !== activeOrder.id)) return
          if (!p.status) return
          setActiveOrderState((prev) => {
            if (!prev) return prev
            const next = {
              ...prev,
              status: p.status!,
              pointsEarned: p.pointsEarned ?? prev.pointsEarned,
            }
            if (isLoungeTerminal(next.status)) {
              saveActiveOrder(null)
              return null
            }
            saveActiveOrder(next)
            return next
          })
          if (p.pointsEarned != null) setSessionPoints(p.pointsEarned)
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* ws unavailable */
    }
    return () => ws?.close()
  }, [activeOrder?.code, activeOrder?.id, activeOrder?.status])

  const loungeEnabled = settings.features.waitLounge !== false
  const canPlay =
    !!activeOrder &&
    loungeEnabled &&
    isLoungeStatusActive(settings.waitLounge, activeOrder.status)

  const clearActiveOrder = useCallback(() => setActiveOrder(null), [setActiveOrder])

  const addSessionPoints = useCallback((delta: number) => {
    setSessionPoints((p) => p + delta)
    setActiveOrderState((prev) => {
      if (!prev) return prev
      const next = { ...prev, pointsEarned: prev.pointsEarned + delta }
      saveActiveOrder(next)
      return next
    })
  }, [])

  return (
    <WaitLoungeContext.Provider
      value={{
        activeOrder,
        setActiveOrder,
        clearActiveOrder,
        refreshStatus,
        sessionPoints,
        addSessionPoints,
        canPlay,
        loungeEnabled,
        loungeSettings: settings.waitLounge,
        loungeCopy: settings.copy,
        loungeOpen,
        setLoungeOpen,
      }}
    >
      {children}
    </WaitLoungeContext.Provider>
  )
}

export function useWaitLounge() {
  const ctx = useContext(WaitLoungeContext)
  if (!ctx) throw new Error('useWaitLounge must be used within WaitLoungeProvider')
  return ctx
}
