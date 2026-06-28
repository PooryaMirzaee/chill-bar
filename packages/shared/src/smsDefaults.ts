import type { SmsSettings } from './types'

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  enabled: false,
  apiKey: '',
  templateId: 0,
  codeParameterName: 'Code',
  otpLength: 5,
  otpExpiryMinutes: 3,
  resendCooldownSeconds: 60,
  maxVerifyAttempts: 5,
  storeNameInSms: true,
}
