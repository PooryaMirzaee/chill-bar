const STORAGE_KEY = 'chillbar-admin-build'

async function clearBrowserCaches() {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}

/** Reload once when deploy version changes so normal tabs match incognito. */
export async function enforceFreshDeploy(buildId: string): Promise<boolean> {
  if (!buildId || buildId === 'dev' || buildId === 'unknown') return false

  const previous = localStorage.getItem(STORAGE_KEY)
  if (previous && previous !== buildId) {
    localStorage.setItem(STORAGE_KEY, buildId)
    await clearBrowserCaches()
    window.location.reload()
    return true
  }

  if (!previous) localStorage.setItem(STORAGE_KEY, buildId)
  return false
}
