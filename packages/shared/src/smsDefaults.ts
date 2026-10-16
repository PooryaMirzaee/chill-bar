import type { SmsSettings } from './types'

export const DEFAULT_SMS_SETTINGS: SmsSettings = {
  enabled: false,
  apiKey: '',
  lineNumber: '',
  templateId: 0,
  codeParameterName: 'Code',
  otpLength: 5,
  otpExpiryMinutes: 3,
  resendCooldownSeconds: 60,
  maxVerifyAttempts: 5,
  storeNameInSms: true,
  orderNotifyEnabled: false,
  orderTemplateId: 0,
  orderCodeParameterName: 'OrderCode',
  orderStatusParameterName: 'Status',
}
