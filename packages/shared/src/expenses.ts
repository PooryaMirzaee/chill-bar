export type ExpenseCategory =
  | 'SUPPLIES'
  | 'RENT'
  | 'UTILITIES'
  | 'SALARY'
  | 'MARKETING'
  | 'MAINTENANCE'
  | 'TRANSPORT'
  | 'EQUIPMENT'
  | 'OTHER'

export type ExpensePaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'SUPPLIES',
  'RENT',
  'UTILITIES',
  'SALARY',
  'MARKETING',
  'MAINTENANCE',
  'TRANSPORT',
  'EQUIPMENT',
  'OTHER',
]

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  SUPPLIES: 'مواد اولیه / خرید',
  RENT: 'اجاره',
  UTILITIES: 'آب، برق، گاز، نت',
  SALARY: 'حقوق و دستمزد',
  MARKETING: 'تبلیغات',
  MAINTENANCE: 'تعمیر و نگهداری',
  TRANSPORT: 'حمل‌ونقل',
  EQUIPMENT: 'تجهیزات',
  OTHER: 'سایر',
}

export const EXPENSE_CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  SUPPLIES: '🛒',
  RENT: '🏠',
  UTILITIES: '💡',
  SALARY: '👥',
  MARKETING: '📣',
  MAINTENANCE: '🔧',
  TRANSPORT: '🚚',
  EQUIPMENT: '⚙️',
  OTHER: '📌',
}

export const EXPENSE_PAYMENT_METHODS: ExpensePaymentMethod[] = ['CASH', 'CARD', 'TRANSFER']

export const EXPENSE_PAYMENT_LABEL: Record<ExpensePaymentMethod, string> = {
  CASH: 'نقد',
  CARD: 'کارت',
  TRANSFER: 'حواله / کارت‌به‌کارت',
}

export interface ExpenseRow {
  id: string
  title: string
  amount: number
  category: ExpenseCategory
  paymentMethod: ExpensePaymentMethod
  vendor: string | null
  note: string | null
  expenseDate: string
  createdByUserId: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseListResponse {
  expenses: ExpenseRow[]
  total: number
  page: number
  limit: number
  summary: {
    totalAmount: number
    count: number
    byCategory: Array<{ category: ExpenseCategory; amount: number; count: number }>
  }
}

export interface ExpenseMonthSummary {
  jy: number
  jm: number
  totalAmount: number
  count: number
  byCategory: Array<{ category: ExpenseCategory; amount: number; count: number }>
}
