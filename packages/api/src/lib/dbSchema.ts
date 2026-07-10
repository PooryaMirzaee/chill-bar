import { prisma } from '../prisma.js'

export const SCHEMA_MIGRATION_HINT =
  'مایگریشن دیتابیس اجرا نشده — روی سرور: docker compose exec api npm run db:deploy'

type SchemaRow = {
  cash_shift: boolean
  order_payment: boolean
  payment_status: boolean
  customer_phone: boolean
  pos_channel: boolean
}

export async function isSchemaReady(): Promise<boolean> {
  try {
    const [row] = await prisma.$queryRaw<SchemaRow[]>`
      SELECT
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'CashShift'
        ) AS cash_shift,
        EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'OrderPayment'
        ) AS order_payment,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'paymentStatus'
        ) AS payment_status,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'customerPhone'
        ) AS customer_phone,
        EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'OrderChannel' AND e.enumlabel = 'POS'
        ) AS pos_channel
    `
    return Boolean(
      row?.cash_shift &&
        row?.order_payment &&
        row?.payment_status &&
        row?.customer_phone &&
        row?.pos_channel,
    )
  } catch {
    return false
  }
}

function prismaErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) return null
  return String((error as { code: unknown }).code)
}

export function isRetryablePrismaError(error: unknown): boolean {
  return prismaErrorCode(error) === 'P2002'
}

export function prismaMigrationMessage(error: unknown): string | null {
  const code = prismaErrorCode(error)
  if (code === 'P2021' || code === 'P2022') {
    return SCHEMA_MIGRATION_HINT
  }
  const msg = error instanceof Error ? error.message : String(error)
  if (/does not exist in the current database/i.test(msg)) {
    return SCHEMA_MIGRATION_HINT
  }
  if (/invalid input value for enum/i.test(msg)) {
    return SCHEMA_MIGRATION_HINT
  }
  return null
}

export function prismaErrorMessage(error: unknown): string | null {
  const migration = prismaMigrationMessage(error)
  if (migration) return migration

  const code = prismaErrorCode(error)
  if (code === 'P2003') {
    return 'نشست کاربری منقضی شده — خارج شوید و دوباره وارد شوید'
  }
  if (code === 'P2002') {
    return 'تداخل در ثبت سفارش — لطفاً دوباره تلاش کنید'
  }
  return null
}
