import type { StoreAppearance, StoreSettings } from '@chill-bar/shared'

function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  return ''
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http') || path.startsWith('data:')) return path
  const base = apiBaseUrl()
  if (!base) return path.startsWith('/') ? path : `/${path}`
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function applyBranding(settings: StoreSettings) {
  const { appearance } = settings
  const root = document.documentElement

  root.classList.remove('dark', 'light')
  root.classList.add(appearance.themeMode)

  root.style.setProperty('--primary', appearance.primaryColor)
  root.style.setProperty('--primary-foreground', appearance.primaryForegroundColor)
  root.style.setProperty('--radius', `${appearance.borderRadius}rem`)

  if (appearance.backgroundColor) {
    root.style.setProperty('--background', appearance.backgroundColor)
  } else {
    root.style.removeProperty('--background')
  }
  if (appearance.foregroundColor) {
    root.style.setProperty('--foreground', appearance.foregroundColor)
  } else {
    root.style.removeProperty('--foreground')
  }
  if (appearance.cardColor) {
    root.style.setProperty('--card', appearance.cardColor)
  } else {
    root.style.removeProperty('--card')
  }

  root.classList.toggle('accent-glow-off', !appearance.accentGlow)

  const favicon = resolveAssetUrl(appearance.faviconUrl)
  if (favicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = favicon
  }

  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeMeta) {
    themeMeta.content = appearance.primaryColor
  }

  document.title = `${settings.storeName} | ${settings.copy.appTagline}`
}

export function getBrandLogoUrl(appearance: StoreAppearance): string | null {
  return resolveAssetUrl(appearance.logoUrl)
}

export function getBrandFallback(appearance: StoreAppearance, storeName: string): string {
  if (appearance.brandEmoji) return appearance.brandEmoji
  return storeName.charAt(0).toUpperCase()
}
