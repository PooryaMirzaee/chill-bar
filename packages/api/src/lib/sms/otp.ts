import { randomInt } from 'node:crypto'
import type { OtpPurpose, SmsSettings } from '@chill-bar/shared'
import { prisma } from '../../prisma.js'
import { env } from '../../env.js'
import { sendVerifyCode } from './smsIr.js'

function generateCode(length: number): string {
  const min = 10 ** (length - 1)
  const max = 10 ** length - 1
  return String(randomInt(min, max + 1))
}

export async function sendPhoneOtp(
  settings: SmsSettings,
  phone: string,
  purpose: OtpPurpose,
): Promise<{ expiresInSeconds: number; cooldownSeconds: number }> {
  const cooldownMs = settings.resendCooldownSeconds * 1000
  const latest = await prisma.phoneOtp.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: 'desc' },
  })

  if (latest) {
    const elapsed = Date.now() - latest.createdAt.getTime()
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000)
      throw new OtpRateLimitError(remaining)
    }
  }

  await prisma.phoneOtp.deleteMany({
    where: { phone, purpose, expiresAt: { lt: new Date() } },
  })

  const code = generateCode(settings.otpLength)
  const expiresAt = new Date(Date.now() + settings.otpExpiryMinutes * 60_000)

  await prisma.phoneOtp.create({
    data: { phone, code, purpose, expiresAt },
  })

  if (env.smsDevBypass && env.nodeEnv !== 'production') {
    console.info(`[SMS DEV] OTP for ${phone} (${purpose}): ${code}`)
  } else {
    await sendVerifyCode(settings, phone, code)
  }

  return {
    expiresInSeconds: settings.otpExpiryMinutes * 60,
    cooldownSeconds: settings.resendCooldownSeconds,
  }
}

export async function verifyPhoneOtp(
  settings: SmsSettings,
  phone: string,
  code: string,
  purpose: OtpPurpose,
): Promise<boolean> {
  const record = await prisma.phoneOtp.findFirst({
    where: { phone, purpose },
    orderBy: { createdAt: 'desc' },
  })

  if (!record) return false
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.phoneOtp.delete({ where: { id: record.id } })
    return false
  }

  if (record.attempts >= settings.maxVerifyAttempts) {
    await prisma.phoneOtp.delete({ where: { id: record.id } })
    throw new OtpAttemptsExceededError()
  }

  if (record.code !== code) {
    await prisma.phoneOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }

  await prisma.phoneOtp.delete({ where: { id: record.id } })
  return true
}

export class OtpRateLimitError extends Error {
  cooldownSeconds: number

  constructor(cooldownSeconds: number) {
    super(`لطفاً ${cooldownSeconds} ثانیه دیگر دوباره تلاش کنید`)
    this.name = 'OtpRateLimitError'
    this.cooldownSeconds = cooldownSeconds
  }
}

export class OtpAttemptsExceededError extends Error {
  constructor() {
    super('تعداد تلاش‌ها بیش از حد مجاز است. کد جدید درخواست کنید')
    this.name = 'OtpAttemptsExceededError'
  }
}
