import type { MallMembershipPublic, MallPayWith, OrderFulfillment } from '@chill-bar/shared'

const STORAGE_KEY = 'chillbar.mall.membership.v1'

export function loadMallMembership(): MallMembershipPublic | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MallMembershipPublic
  } catch {
    return null
  }
}

export function saveMallMembership(m: MallMembershipPublic | null) {
  try {
    if (!m) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}

export function membershipCodeFromPath(pathname = window.location.pathname): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const m = clean.match(/^\/m\/([A-Za-z0-9-]+)$/i)
  return m?.[1] ? m[1].toUpperCase() : null
}

export function isCityCenterPath(pathname = window.location.pathname): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return clean === '/city-center' || clean.startsWith('/m/')
}

export async function redeemMallCode(code: string): Promise<MallMembershipPublic> {
  const res = await fetch('/api/mall/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = (await res.json()) as { membership?: MallMembershipPublic; error?: string }
  if (!res.ok || !data.membership) {
    throw new Error(data.error || 'کد اشتراک معتبر نیست')
  }
  saveMallMembership(data.membership)
  return data.membership
}

export type MallCheckoutOptions = {
  membershipCode?: string | null
  fulfillment?: OrderFulfillment
  payWith?: MallPayWith
  walletAmount?: number | null
}
