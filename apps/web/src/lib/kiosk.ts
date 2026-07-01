const KIOSK_KEY = 'chill-kiosk-mode'

export type CustomerOrderChannel = 'MOBILE' | 'KIOSK'

/**
 * Kiosk mode is enabled via `?mode=kiosk` (persisted) so the in-store touch
 * screen stays in kiosk mode across reloads. Append `?mode=app` to exit.
 */
export function detectKioskMode(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const mode = params.get('mode')
  if (mode === 'kiosk') {
    localStorage.setItem(KIOSK_KEY, '1')
    return true
  }
  if (mode === 'app') {
    localStorage.removeItem(KIOSK_KEY)
    return false
  }
  return localStorage.getItem(KIOSK_KEY) === '1'
}

export function getChannel(): CustomerOrderChannel {
  return detectKioskMode() ? 'KIOSK' : 'MOBILE'
}
