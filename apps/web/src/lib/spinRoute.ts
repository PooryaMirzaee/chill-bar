/** Dedicated landing path for the spin campaign (QR / deep link). */
export const SPIN_PATH = '/spin'

const SPIN_ALIASES = new Set([SPIN_PATH, '/play'])

export function isSpinPath(pathname = window.location.pathname): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return SPIN_ALIASES.has(clean)
}

/** Resolve initial tab from URL path or `?tab=` query. */
export function tabFromLocation(search = window.location.search, pathname = window.location.pathname): string | null {
  if (isSpinPath(pathname)) return 'play'
  const tab = new URLSearchParams(search).get('tab')
  if (!tab) return null
  if (tab === 'spin' || tab === 'play') return 'play'
  return tab
}

export function syncSpinPath(activeTab: string) {
  if (typeof window === 'undefined') return
  const onSpin = isSpinPath()
  if (activeTab === 'play' && !onSpin) {
    window.history.replaceState(null, '', SPIN_PATH)
  } else if (activeTab !== 'play' && onSpin) {
    window.history.replaceState(null, '', '/')
  }
}
