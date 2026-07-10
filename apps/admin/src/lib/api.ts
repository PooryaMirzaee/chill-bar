const TOKEN_KEY = 'chillbar-admin-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    clearToken()
    if (!path.includes('/auth/login')) {
      window.location.href = '/login'
    }
  }

  if (!res.ok) {
    let message = `خطای سرور (${res.status})`
    try {
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = (await res.json()) as { error?: string; message?: string }
        message = data.error ?? data.message ?? message
      } else {
        if (res.status === 502 || res.status === 503) {
          message = 'سرور API در دسترس نیست — docker compose ps و logs api را بررسی کنید'
        } else if (res.status === 504) {
          message = 'زمان اتصال به سرور تمام شد'
        }
      }
    } catch {
      if (res.status === 502 || res.status === 503) {
        message = 'سرور API در دسترس نیست — docker compose ps و logs api را بررسی کنید'
      }
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
