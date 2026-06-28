import type {
  CustomerAuthResponse,
  CustomerPreferences,
  CustomerProfile,
  Order,
  OtpPurpose,
  OtpSendResponse,
  SmsPublicConfig,
} from '@chill-bar/shared'

const TOKEN_KEY = 'chill-customer-token'

function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
  return base ? `${base}${path}` : path
}

export function getCustomerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setCustomerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearCustomerToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function customerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getCustomerToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(apiUrl(path), { ...options, headers })
  if (!res.ok) {
    let message = 'خطا در ارتباط با سرور'
    try {
      const data = await res.json()
      message = data.error ?? message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(apiUrl(path), { ...options, headers })
  if (!res.ok) {
    let message = 'خطا در ارتباط با سرور'
    try {
      const data = await res.json()
      message = data.error ?? message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export interface OrderItemInput {
  menuItemId: string | null
  name: string
  emoji: string
  unitPrice: number
  quantity: number
  customConfig?: Record<string, unknown> | null
}

export interface CreateOrderBody {
  channel: 'MOBILE' | 'KIOSK'
  customerName?: string | null
  note?: string | null
  items: OrderItemInput[]
  loyaltyRewardId?: string | null
}

export interface WaitLoungePublicConfig {
  enabled: boolean
  enabledGames: import('@chill-bar/shared').WaitGameId[]
  allowedStatuses: import('@chill-bar/shared').OrderStatus[]
  estimatedPrepMinutes: number
  maxPointsPerOrder: number
  statusBonusMultiplier: number
  games: import('@chill-bar/shared').WaitGameTuning
  rewards: Array<{
    id: string
    type: import('@chill-bar/shared').LoyaltyRewardType
    label: string
    cost: number
    value: number
  }>
  economy: {
    minPointsToRedeem: number
    maxDiscountPerOrder: number
    maxPercentPerOrder: number
  }
}

export const apiClient = {
  getMenu: () => publicRequest<import('@chill-bar/shared').MenuData>('/api/menu'),
  getIceCreamOptions: () => publicRequest<import('@chill-bar/shared').IceCreamOptions>('/api/ice-cream/options'),
  getSettings: () => publicRequest<import('@chill-bar/shared').StoreSettings>('/api/settings'),
  createOrder: (body: CreateOrderBody) =>
    customerRequest<Order>('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrderStatus: (idOrCode: string) =>
    publicRequest<{
      id: string
      code: string
      status: import('@chill-bar/shared').OrderStatus
      updatedAt: string
      pointsEarned?: number
    }>(`/api/orders/${idOrCode}/status`),

  getWaitLoungeConfig: () => publicRequest<WaitLoungePublicConfig>('/api/wait-lounge/config'),

  submitWaitGame: (
    orderCode: string,
    body: import('@chill-bar/shared').WaitGameSubmitInput,
  ) =>
    customerRequest<import('@chill-bar/shared').WaitGameSubmitResult>(
      `/api/orders/${orderCode}/wait-games/submit`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  getLoyaltyBalance: () => customerRequest<import('@chill-bar/shared').LoyaltyBalance>('/api/customers/me/loyalty'),

  createGuestSession: () =>
    publicRequest<CustomerAuthResponse>('/api/customers/guest', { method: 'POST' }),
  getSmsConfig: () => publicRequest<SmsPublicConfig>('/api/customers/otp/config'),
  sendCustomerOtp: (phone: string, purpose: OtpPurpose) =>
    publicRequest<OtpSendResponse>('/api/customers/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }),
  verifyCustomerOtp: (phone: string, code: string, purpose: OtpPurpose, name?: string) =>
    customerRequest<CustomerAuthResponse>('/api/customers/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, purpose, name: name ?? null }),
    }),
  getCustomerProfile: () => customerRequest<CustomerProfile>('/api/customers/me'),
  updateCustomerProfile: (data: { name?: string | null }) =>
    customerRequest<CustomerProfile>('/api/customers/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  syncCustomerPreferences: (data: Partial<CustomerPreferences>) =>
    customerRequest<CustomerProfile>('/api/customers/me/preferences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCustomerOrders: (limit = 20) =>
    customerRequest<Order[]>(`/api/customers/me/orders?limit=${limit}`),

  getAiConfig: () => publicRequest<import('@chill-bar/shared').AiPublicConfig>('/api/ai/config'),
  chatWithAi: (body: import('@chill-bar/shared').AiChatRequest) =>
    publicRequest<import('@chill-bar/shared').AiChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
