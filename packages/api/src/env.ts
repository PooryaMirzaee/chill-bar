function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: required('DATABASE_URL', 'postgresql://chillbar:chillbar@localhost:5432/chillbar?schema=public'),
  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  seedAdminUser: process.env.SEED_ADMIN_USER ?? 'admin',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'chillbar123',
  avalaiApiKey: process.env.AVALAI_API_KEY ?? '',
  smsIrApiKey: process.env.SMS_IR_API_KEY ?? '',
  smsDevBypass: process.env.SMS_DEV_BYPASS === '1',
}

export const isProd = env.nodeEnv === 'production'
