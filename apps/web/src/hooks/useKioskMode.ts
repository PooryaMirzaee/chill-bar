import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { detectKioskMode } from '../lib/kiosk'
import { apiClient } from '../lib/api'

/**
 * Kiosk mode behaviour for the in-store touch screen:
 * - detects kiosk flag from URL / storage
 * - tracks idle time and surfaces a screensaver after `kioskIdleSeconds`
 * - attempts to enter fullscreen on first interaction
 */
export function useKioskMode(options?: { suppressIdle?: boolean }) {
  const suppressIdle = options?.suppressIdle ?? false
  const [isKiosk] = useState(detectKioskMode)
  const [idle, setIdle] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: apiClient.getSettings,
    enabled: isKiosk,
    staleTime: 5 * 60 * 1000,
  })
  const idleSeconds = settings?.kioskIdleSeconds ?? 60

  const resetIdle = useCallback(() => {
    setIdle(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isKiosk || suppressIdle) return
    timerRef.current = setTimeout(() => setIdle(true), idleSeconds * 1000)
  }, [isKiosk, idleSeconds, suppressIdle])

  useEffect(() => {
    if (!isKiosk) return
    if (suppressIdle) {
      setIdle(false)
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }
    const events = ['pointerdown', 'keydown', 'touchstart']
    const handler = () => resetIdle()
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }))
    resetIdle()
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isKiosk, resetIdle, suppressIdle])

  useEffect(() => {
    if (!isKiosk) return
    const tryFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {})
      }
      window.removeEventListener('pointerdown', tryFullscreen)
    }
    window.addEventListener('pointerdown', tryFullscreen, { once: true })
    return () => window.removeEventListener('pointerdown', tryFullscreen)
  }, [isKiosk])

  return { isKiosk, idle, resetIdle }
}
