export const RECEIPT_TEMPLATE_IDS = [
  'classic',
  'bold',
  'minimal',
  'boxed',
  'stripe',
  'ticket',
  'compact',
  'compact-bold',
  'compact-minimal',
  'kitchen',
  'kitchen-compact',
  'kitchen-ticket',
] as const

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number]

export type ReceiptTemplateCategory = 'customer' | 'kitchen' | 'both'

export interface ReceiptTemplateMeta {
  id: ReceiptTemplateId
  name: string
  description: string
  category: ReceiptTemplateCategory
}

export const RECEIPT_TEMPLATES: ReceiptTemplateMeta[] = [
  {
    id: 'classic',
    name: 'کلاسیک',
    description: 'متعادل و خوانا — مناسب اکثر پرینترها',
    category: 'customer',
  },
  {
    id: 'bold',
    name: 'برجسته',
    description: 'فونت درشت و جمع کل پررنگ',
    category: 'customer',
  },
  {
    id: 'minimal',
    name: 'مینیمال',
    description: 'ساده و فشرده',
    category: 'customer',
  },
  {
    id: 'boxed',
    name: 'جعبه‌ای',
    description: 'هر آیتم داخل کادر جدا',
    category: 'customer',
  },
  {
    id: 'stripe',
    name: 'نواری',
    description: 'سربرگ تزئینی با خطوط',
    category: 'customer',
  },
  {
    id: 'ticket',
    name: 'بلیت',
    description: 'حاشیه دوبل و شماره فیش درشت',
    category: 'customer',
  },
  {
    id: 'compact',
    name: 'فشرده',
    description: 'کم‌حجم — مناسب صف شلوغ',
    category: 'both',
  },
  {
    id: 'compact-bold',
    name: 'فشرده درشت',
    description: 'فشرده با فونت بزرگ‌تر',
    category: 'both',
  },
  {
    id: 'compact-minimal',
    name: 'فوق‌فشرده',
    description: 'حداقل فضا — فقط اطلاعات ضروری',
    category: 'both',
  },
  {
    id: 'kitchen',
    name: 'آشپزخانه',
    description: 'بدون قیمت — آیتم‌ها درشت',
    category: 'kitchen',
  },
  {
    id: 'kitchen-compact',
    name: 'آشپزخانه فشرده',
    description: 'فیش کوتاه برای آشپزخانه',
    category: 'kitchen',
  },
  {
    id: 'kitchen-ticket',
    name: 'آشپزخانه بلیتی',
    description: 'شماره سفارش درشت — سبک بلیت',
    category: 'kitchen',
  },
]

export const CUSTOMER_RECEIPT_TEMPLATES = RECEIPT_TEMPLATES.filter(
  (t) => t.category === 'customer' || t.category === 'both',
)

export const KITCHEN_RECEIPT_TEMPLATES = RECEIPT_TEMPLATES.filter(
  (t) => t.category === 'kitchen' || t.category === 'both',
)

export function isReceiptTemplateId(value: string): value is ReceiptTemplateId {
  return (RECEIPT_TEMPLATE_IDS as readonly string[]).includes(value)
}
