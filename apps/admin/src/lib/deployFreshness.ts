const CACHE_SCHEMA_VERSION = '2026-07-11'
const STORAGE_KEY = `chillbar-admin-build-${CACHE_SCHEMA_VERSION}`
const INIT_KEY = `${STORAGE_KEY}-init`
const LEGACY_KEYS = ['chillbar-admin-build', 'chillbar-web-build']

async function clearBrowserCaches() {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}

/** Reload once when deploy version changes so normal tabs match incognito. */
export async function enforceFreshDeploy(buildId: string): Promise<boolean> {
  if (!buildId || buildId === 'dev' || buildId === 'unknown') return false

  for (const legacy of LEGACY_KEYS) localStorage.removeItem(legacy)

  if (!localStorage.getItem(INIT_KEY)) {
    localStorage.setItem(INIT_KEY, '1')
    localStorage.setItem(STORAGE_KEY, buildId)
    await clearBrowserCaches()
    window.location.reload()
    return true
  }

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
