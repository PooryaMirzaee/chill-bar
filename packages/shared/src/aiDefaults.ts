import type { AiSettings } from './types'

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  apiKey: '',
  baseUrl: 'https://api.avalai.ir/v1',
  model: 'gpt-4o-mini',
  temperature: 0.55,
  maxTokens: 900,
  maxHistoryMessages: 12,
  assistantName: 'گارسون هوشمند',
  assistantEmoji: '🤖',
  strictMode: true,
  welcomeMessage: 'سلام! من گارسون هوشمند چیل بارم. در انتخاب از منو، پیشنهاد غذا و نوشیدنی، و بستنی سفارشی کمکت می‌کنم.',
  outOfScopeMessage:
    'من فقط در مورد منو، سفارش و تجربه کافه چیل بار می‌تونم کمک کنم. یه سوال مرتبط با منو یا پیشنهاد بپرس 😊',
  systemPromptExtra: '',
  quickPrompts: [
    'چی پیشنهاد می‌دی؟',
    'یه قهوه خوب',
    'چیز سرد می‌خوام',
    'صبحانه چی داری؟',
    'بستنی سفارشی',
  ],
  inputPlaceholder: 'از منو بپرس...',
  onlineStatusLabel: 'آنلاین',
  disabledMessage: 'گارسون هوشمند هنوز فعال نشده. از پنل ادمین تنظیم کنید.',
}

export const AI_MODEL_PRESETS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-5.4-mini',
  'gemini-2.5-flash',
  'claude-haiku-4-5',
  'deepseek-chat',
] as const
