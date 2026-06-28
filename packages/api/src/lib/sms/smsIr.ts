import type { SmsSettings } from '@chill-bar/shared'

const SMS_IR_VERIFY_URL = 'https://api.sms.ir/v1/send/verify'

interface SmsIrResponse {
  status: number
  message: string
  data?: { messageId?: number; cost?: number }
}

export async function sendVerifyCode(
  settings: SmsSettings,
  mobile: string,
  code: string,
): Promise<{ messageId?: number }> {
  const parameters: { name: string; value: string }[] = [
    { name: settings.codeParameterName, value: code },
  ]

  const res = await fetch(SMS_IR_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
      'x-api-key': settings.apiKey,
    },
    body: JSON.stringify({
      mobile,
      templateId: settings.templateId,
      parameters,
    }),
  })

  let payload: SmsIrResponse
  try {
    payload = (await res.json()) as SmsIrResponse
  } catch {
    throw new Error('پاسخ نامعتبر از SMS.ir')
  }

  if (!res.ok || payload.status !== 1) {
    throw new Error(payload.message || `خطای SMS.ir (${res.status})`)
  }

  return { messageId: payload.data?.messageId }
}

export async function testSmsIrConnection(
  settings: SmsSettings,
  testMobile: string,
): Promise<string> {
  const code = '12345'.slice(0, settings.otpLength)
  await sendVerifyCode(settings, testMobile, code)
  return `پیامک تست به ${testMobile} ارسال شد`
}
