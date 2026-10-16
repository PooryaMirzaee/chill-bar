import type { PaymentSettings } from './types'

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  merchantId: '',
  sandbox: true,
  currency: 'IRT',
  publicWebUrl: 'https://chill-bar.ir',
  callbackBaseUrl: 'https://chill-bar.ir',
  enableOrderPay: true,
  enableWalletTopup: true,
  minAmount: 1000,
  descriptionPrefix: 'چیل‌بار',
}
