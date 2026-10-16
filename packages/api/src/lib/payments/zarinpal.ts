import type { PaymentSettings } from '@chill-bar/shared'

interface ZarinpalData {
  code?: number
  message?: string
  authority?: string
  fee_type?: string
  fee?: number
  ref_id?: number | string
  card_pan?: string
  card_hash?: string
}

interface ZarinpalResponse {
  data: ZarinpalData | Record<string, never>
  errors: unknown
}

function apiBase(sandbox: boolean) {
  return sandbox
    ? 'https://sandbox.zarinpal.com/pg/v4/payment'
    : 'https://payment.zarinpal.com/pg/v4/payment'
}

function startPayBase(sandbox: boolean) {
  return sandbox
    ? 'https://sandbox.zarinpal.com/pg/StartPay'
    : 'https://payment.zarinpal.com/pg/StartPay'
}

export function paymentUrl(settings: PaymentSettings, authority: string): string {
  return `${startPayBase(settings.sandbox)}/${authority}`
}

export async function zarinpalRequest(input: {
  settings: PaymentSettings
  amount: number
  description: string
  callbackUrl: string
  mobile?: string | null
  email?: string | null
  orderId?: string | null
}): Promise<{ authority: string; fee?: number }> {
  const { settings } = input
  const body: Record<string, unknown> = {
    merchant_id: settings.merchantId.trim(),
    amount: input.amount,
    currency: settings.currency,
    description: input.description,
    callback_url: input.callbackUrl,
    metadata: {
      ...(input.mobile ? { mobile: input.mobile } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.orderId ? { order_id: input.orderId } : {}),
    },
  }

  const res = await fetch(`${apiBase(settings.sandbox)}/request.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  let payload: ZarinpalResponse
  try {
    payload = (await res.json()) as ZarinpalResponse
  } catch {
    throw new Error('پاسخ نامعتبر از زرین‌پال')
  }

  const data = payload.data as ZarinpalData
  if (!res.ok || data?.code !== 100 || !data.authority) {
    const errMsg =
      (typeof payload.errors === 'object' &&
        payload.errors &&
        'message' in (payload.errors as object) &&
        String((payload.errors as { message?: string }).message)) ||
      data?.message ||
      `خطای زرین‌پال (${data?.code ?? res.status})`
    throw new Error(errMsg)
  }

  return { authority: data.authority, fee: data.fee }
}

export async function zarinpalVerify(input: {
  settings: PaymentSettings
  amount: number
  authority: string
}): Promise<{
  code: number
  refId?: string
  cardPan?: string
  cardHash?: string
  fee?: number
  message?: string
}> {
  const res = await fetch(`${apiBase(input.settings.sandbox)}/verify.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      merchant_id: input.settings.merchantId.trim(),
      amount: input.amount,
      authority: input.authority,
    }),
  })

  let payload: ZarinpalResponse
  try {
    payload = (await res.json()) as ZarinpalResponse
  } catch {
    throw new Error('پاسخ نامعتبر از زرین‌پال (verify)')
  }

  const data = payload.data as ZarinpalData
  const code = data?.code ?? -1
  return {
    code,
    refId: data?.ref_id != null ? String(data.ref_id) : undefined,
    cardPan: data?.card_pan,
    cardHash: data?.card_hash,
    fee: data?.fee,
    message: data?.message,
  }
}
