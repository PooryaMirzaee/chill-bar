import type { SmsSettings } from '@chill-bar/shared'

const BASE = 'https://api.sms.ir/v1'

interface SmsIrResponse<T = unknown> {
  status: number
  message: string
  data?: T
}

function headers(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-api-key': apiKey,
  }
}

async function parseResponse<T>(res: Response): Promise<SmsIrResponse<T>> {
  let payload: SmsIrResponse<T>
  try {
    payload = (await res.json()) as SmsIrResponse<T>
  } catch {
    throw new Error('پاسخ نامعتبر از SMS.ir')
  }
  if (!res.ok || payload.status !== 1) {
    throw new Error(payload.message || `خطای SMS.ir (${res.status})`)
  }
  return payload
}

/** Verify / OTP — https://api.sms.ir/v1/send/verify */
export async function sendVerify(
  apiKey: string,
  mobile: string,
  templateId: number,
  parameters: { name: string; value: string }[],
): Promise<{ messageId?: number; cost?: number }> {
  const res = await fetch(`${BASE}/send/verify`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ mobile, templateId, parameters }),
  })
  const payload = await parseResponse<{ messageId?: number; cost?: number }>(res)
  return payload.data ?? {}
}

export async function sendVerifyCode(
  settings: SmsSettings,
  mobile: string,
  code: string,
): Promise<{ messageId?: number }> {
  const parameters: { name: string; value: string }[] = [
    { name: settings.codeParameterName, value: code },
  ]
  return sendVerify(settings.apiKey, mobile, settings.templateId, parameters)
}

/** Bulk — https://api.sms.ir/v1/send/bulk */
export async function sendBulk(
  apiKey: string,
  lineNumber: number | string,
  messageText: string,
  mobiles: string[],
  sendDateTime: string | null = null,
): Promise<unknown> {
  const res = await fetch(`${BASE}/send/bulk`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      lineNumber: Number(lineNumber),
      messageText,
      mobiles,
      sendDateTime,
    }),
  })
  const payload = await parseResponse(res)
  return payload.data
}

/** Like-to-like — https://api.sms.ir/v1/send/likeToLike */
export async function sendLikeToLike(
  apiKey: string,
  lineNumber: number | string,
  messageTexts: string[],
  mobiles: string[],
  sendDateTime: string | null = null,
): Promise<unknown> {
  const res = await fetch(`${BASE}/send/likeToLike`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      lineNumber: Number(lineNumber),
      messageTexts,
      mobiles,
      sendDateTime,
    }),
  })
  const payload = await parseResponse(res)
  return payload.data
}

/** Credit — GET https://api.sms.ir/v1/credit */
export async function getCredit(apiKey: string): Promise<number> {
  const res = await fetch(`${BASE}/credit`, {
    method: 'GET',
    headers: headers(apiKey),
  })
  const payload = await parseResponse<number>(res)
  return typeof payload.data === 'number' ? payload.data : 0
}

/** Lines — GET https://api.sms.ir/v1/line */
export async function getLines(apiKey: string): Promise<number[]> {
  const res = await fetch(`${BASE}/line`, {
    method: 'GET',
    headers: headers(apiKey),
  })
  const payload = await parseResponse<number[]>(res)
  return Array.isArray(payload.data) ? payload.data : []
}

/** Message report — GET https://api.sms.ir/v1/send/{messageId} */
export async function getMessageReport(apiKey: string, messageId: number | string): Promise<unknown> {
  const res = await fetch(`${BASE}/send/${messageId}`, {
    method: 'GET',
    headers: headers(apiKey),
  })
  const payload = await parseResponse(res)
  return payload.data
}

export async function testSmsIrConnection(
  settings: SmsSettings,
  testMobile: string,
): Promise<string> {
  const code = '12345'.slice(0, settings.otpLength)
  await sendVerifyCode(settings, testMobile, code)
  return `پیامک تست Verify به ${testMobile} ارسال شد`
}

export async function sendOrderStatusSms(
  settings: SmsSettings,
  mobile: string,
  orderCode: string,
  statusLabel: string,
): Promise<void> {
  if (!settings.orderNotifyEnabled || !settings.orderTemplateId) return
  await sendVerify(settings.apiKey, mobile, settings.orderTemplateId, [
    { name: settings.orderCodeParameterName, value: orderCode },
    { name: settings.orderStatusParameterName, value: statusLabel },
  ])
}
