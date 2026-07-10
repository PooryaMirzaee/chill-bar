import { prisma } from '../prisma.js'

export const SCHEMA_MIGRATION_HINT =
  'مایگریشن دیتابیس اجرا نشده — روی سرور: docker compose exec api npm run db:deploy'

type SchemaRow = {
  cash_shift: boolean
  payment_status: boolean
  customer_phone: boolean
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
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'paymentStatus'
        ) AS payment_status,
        EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'Order' AND column_name = 'customerPhone'
        ) AS customer_phone
    `
    return Boolean(row?.cash_shift && row?.payment_status && row?.customer_phone)
  } catch {
    return false
  }
}

export function prismaMigrationMessage(error: unknown): string | null {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : null
  if (code === 'P2021' || code === 'P2022') {
    return SCHEMA_MIGRATION_HINT
  }
  const msg = error instanceof Error ? error.message : String(error)
  if (/does not exist in the current database/i.test(msg)) {
    return SCHEMA_MIGRATION_HINT
  }
  return null
}
