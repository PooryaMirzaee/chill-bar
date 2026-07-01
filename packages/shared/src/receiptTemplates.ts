export const RECEIPT_TEMPLATE_IDS = [
  'classic',
  'bold',
  'minimal',
  'boxed',
  'stripe',
  'ticket',
] as const

export type ReceiptTemplateId = (typeof RECEIPT_TEMPLATE_IDS)[number]

export interface ReceiptTemplateMeta {
  id: ReceiptTemplateId
  name: string
  description: string
}

export const RECEIPT_TEMPLATES: ReceiptTemplateMeta[] = [
  {
    id: 'classic',
    name: 'کلاسیک',
    description: 'متعادل و خوانا — مناسب اکثر پرینترها',
  },
  {
    id: 'bold',
    name: 'برجسته',
    description: 'فونت درشت و جمع کل پررنگ — کنتراست بالا',
  },
  {
    id: 'minimal',
    name: 'مینیمال',
    description: 'ساده و فشرده — کمترین جوهر',
  },
  {
    id: 'boxed',
    name: 'جعبه‌ای',
    description: 'هر آیتم داخل کادر جدا — مرتب و واضح',
  },
  {
    id: 'stripe',
    name: 'نواری',
    description: 'سربرگ تزئینی با خطوط — مناسب برندینگ',
  },
  {
    id: 'ticket',
    name: 'بلیت',
    description: 'حاشیه دوبل و شماره فیش درشت — سبک بلیت',
  },
]

export function isReceiptTemplateId(value: string): value is ReceiptTemplateId {
  return (RECEIPT_TEMPLATE_IDS as readonly string[]).includes(value)
}
