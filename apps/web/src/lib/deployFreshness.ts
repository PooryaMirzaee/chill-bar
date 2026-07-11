const CACHE_SCHEMA_VERSION = '2026-07-11'
const STORAGE_KEY = `chillbar-web-build-${CACHE_SCHEMA_VERSION}`
const INIT_KEY = `${STORAGE_KEY}-init`
const LEGACY_KEYS = ['chillbar-web-build', 'chillbar-admin-build']

async function clearBrowserCaches() {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}

async function unregisterServiceWorkers() {
  if (!('serviceWorker' in navigator)) return
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map((reg) => reg.unregister()))
}

/** Reload once when deploy version changes — fixes stale PWA / HTTP cache. */
export async function enforceFreshDeploy(buildId: string): Promise<boolean> {
  if (!buildId || buildId === 'dev' || buildId === 'unknown') return false

  for (const legacy of LEGACY_KEYS) localStorage.removeItem(legacy)

  if (!localStorage.getItem(INIT_KEY)) {
    localStorage.setItem(INIT_KEY, '1')
    localStorage.setItem(STORAGE_KEY, buildId)
    await clearBrowserCaches()
    await unregisterServiceWorkers()
    window.location.reload()
    return true
  }

  const previous = localStorage.getItem(STORAGE_KEY)
  if (previous && previous !== buildId) {
    localStorage.setItem(STORAGE_KEY, buildId)
    await clearBrowserCaches()
    await unregisterServiceWorkers()
    window.location.reload()
    return true
  }

  if (!previous) localStorage.setItem(STORAGE_KEY, buildId)
  return false
}

export async function purgeStaleCaches() {
  await clearBrowserCaches()
}
