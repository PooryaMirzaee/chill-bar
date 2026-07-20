const STORAGE_KEY = 'chillbar-web-build'

async function clearBrowserCaches() {
  if (!('caches' in window)) return
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
}

/**
 * When the deployed build SHA changes, clear caches once and reload.
 * Never reloads on first visit (that caused blank/infinite-reload loops).
 */
export async function enforceFreshDeploy(buildId: string): Promise<boolean> {
  if (!buildId || buildId === 'dev' || buildId === 'unknown') return false

  const previous = localStorage.getItem(STORAGE_KEY)
  if (!previous) {
    localStorage.setItem(STORAGE_KEY, buildId)
    return false
  }

  if (previous === buildId) return false

  localStorage.setItem(STORAGE_KEY, buildId)
  await clearBrowserCaches()
  window.location.reload()
  return true
}
