import type { MallMembership, MallUnit, Prisma } from '@prisma/client'
import {
  buildDeliveryLabel,
  membershipCodeFromUnitCode,
  normalizeMallCodeInput,
  type MallMembershipPublic,
} from '@chill-bar/shared'
import { prisma } from '../prisma.js'

export type MembershipWithUnit = MallMembership & { unit: MallUnit }

export function toMembershipPublic(m: MembershipWithUnit): MallMembershipPublic {
  return {
    code: m.code,
    status: m.status,
    discountPercent: m.discountPercent,
    walletBalance: m.walletBalance,
    creditLimit: m.creditLimit,
    creditUsed: m.creditUsed,
    creditAvailable: Math.max(0, m.creditLimit - m.creditUsed),
    contactName: m.contactName,
    unit: {
      unitCode: m.unit.unitCode,
      name: m.unit.name,
      floor: m.unit.floor,
      category: m.unit.category,
      deliveryLabel: buildDeliveryLabel(m.unit),
    },
  }
}

export async function findMembershipByCode(codeRaw: string): Promise<MembershipWithUnit | null> {
  const code = normalizeMallCodeInput(codeRaw)
  if (code.length < 4) return null
  return prisma.mallMembership.findUnique({
    where: { code },
    include: { unit: true },
  })
}

export async function ensureUniqueMembershipCode(
  unitCode: string,
  exceptMembershipId?: string,
): Promise<string> {
  const base = membershipCodeFromUnitCode(unitCode)
  if (!base) throw Object.assign(new Error('کد واحد نامعتبر است'), { statusCode: 400 })
  const exists = await prisma.mallMembership.findFirst({
    where: {
      code: base,
      ...(exceptMembershipId ? { NOT: { id: exceptMembershipId } } : {}),
    },
    select: { id: true },
  })
  if (!exists) return base
  // Rare collision across complexes — keep deterministic unit-based code with short suffix
  for (let i = 2; i < 20; i++) {
    const code = `${base}${i}`
    const hit = await prisma.mallMembership.findFirst({
      where: {
        code,
        ...(exceptMembershipId ? { NOT: { id: exceptMembershipId } } : {}),
      },
      select: { id: true },
    })
    if (!hit) return code
  }
  return `${base}${Date.now().toString(36).slice(-3).toUpperCase()}`
}

/** Align all membership codes to unitCode (no dashes) and clear initial credit limits. */
export async function resyncMembershipCodesAndCredit(opts?: {
  resetCreditLimit?: boolean
}): Promise<{ updated: number; skipped: number; conflicts: string[] }> {
  const resetCredit = opts?.resetCreditLimit !== false
  const rows = await prisma.mallMembership.findMany({
    include: { unit: { select: { unitCode: true } } },
  })
  let updated = 0
  let skipped = 0
  const conflicts: string[] = []

  for (const m of rows) {
    const desired = membershipCodeFromUnitCode(m.unit.unitCode)
    if (!desired) {
      skipped++
      continue
    }
    const clash = await prisma.mallMembership.findFirst({
      where: { code: desired, NOT: { id: m.id } },
      select: { id: true, unit: { select: { unitCode: true } } },
    })
    if (clash) {
      conflicts.push(`${m.unit.unitCode} → ${desired} (تداخل با ${clash.unit.unitCode})`)
      skipped++
      continue
    }
    const data: { code?: string; creditLimit?: number } = {}
    if (m.code !== desired) data.code = desired
    if (resetCredit && m.creditLimit !== 0) data.creditLimit = 0
    if (Object.keys(data).length === 0) {
      skipped++
      continue
    }
    await prisma.mallMembership.update({ where: { id: m.id }, data })
    updated++
  }
  return { updated, skipped, conflicts }
}

export function membershipDiscountAmount(subtotal: number, percent: number): number {
  if (percent <= 0 || subtotal <= 0) return 0
  return Math.min(subtotal, Math.round((subtotal * percent) / 100))
}

export async function applyWalletPayment(
  tx: Prisma.TransactionClient,
  membershipId: string,
  amount: number,
  orderId: string,
  note?: string,
) {
  if (amount <= 0) return
  const m = await tx.mallMembership.findUniqueOrThrow({ where: { id: membershipId } })
  if (m.walletBalance < amount) {
    throw Object.assign(new Error('موجودی کیف‌پول کافی نیست'), { statusCode: 400 })
  }
  const balanceAfter = m.walletBalance - amount
  await tx.mallMembership.update({
    where: { id: membershipId },
    data: { walletBalance: balanceAfter },
  })
  await tx.mallWalletLedger.create({
    data: {
      membershipId,
      type: 'ORDER_PAY',
      amount: -amount,
      balanceAfter,
      orderId,
      note: note ?? 'پرداخت سفارش',
    },
  })
}

export async function applyCreditCharge(
  tx: Prisma.TransactionClient,
  membershipId: string,
  amount: number,
  orderId: string,
  note?: string,
) {
  if (amount <= 0) return
  const m = await tx.mallMembership.findUniqueOrThrow({ where: { id: membershipId } })
  const nextUsed = m.creditUsed + amount
  if (nextUsed > m.creditLimit) {
    throw Object.assign(new Error('سقف اعتبار واحد پر شده است'), { statusCode: 400 })
  }
  await tx.mallMembership.update({
    where: { id: membershipId },
    data: { creditUsed: nextUsed },
  })
  await tx.mallCreditLedger.create({
    data: {
      membershipId,
      type: 'CHARGE',
      amount,
      creditUsedAfter: nextUsed,
      orderId,
      note: note ?? 'شارژ سفارش روی اعتبار واحد',
    },
  })
}

export async function topUpWallet(
  membershipId: string,
  amount: number,
  bonus: number,
  note: string | null,
  userId: string | null,
) {
  if (amount <= 0 && bonus <= 0) throw Object.assign(new Error('مبلغ شارژ نامعتبر است'), { statusCode: 400 })
  return prisma.$transaction(async (tx) => {
    let balance = (await tx.mallMembership.findUniqueOrThrow({ where: { id: membershipId } })).walletBalance
    if (amount > 0) {
      balance += amount
      await tx.mallWalletLedger.create({
        data: {
          membershipId,
          type: 'TOPUP',
          amount,
          balanceAfter: balance,
          note: note ?? 'شارژ کیف‌پول',
          createdByUserId: userId,
        },
      })
    }
    if (bonus > 0) {
      balance += bonus
      await tx.mallWalletLedger.create({
        data: {
          membershipId,
          type: 'BONUS',
          amount: bonus,
          balanceAfter: balance,
          note: 'هدیه شارژ',
          createdByUserId: userId,
        },
      })
    }
    return tx.mallMembership.update({
      where: { id: membershipId },
      data: { walletBalance: balance },
      include: { unit: true },
    })
  })
}
