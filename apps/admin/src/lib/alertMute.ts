const KEY = 'admin_alerts_muted'

const listeners = new Set<() => void>()

export function isAlertMuted(): boolean {
  return sessionStorage.getItem(KEY) === '1'
}

export function setAlertMuted(muted: boolean): void {
  if (muted) sessionStorage.setItem(KEY, '1')
  else sessionStorage.removeItem(KEY)
  listeners.forEach((fn) => fn())
}

export function subscribeAlertMute(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
