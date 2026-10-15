import type { MallMembership, MallUnit, Prisma } from '@prisma/client'
import {
  buildDeliveryLabel,
  generateMembershipCode,
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

export async function ensureUniqueMembershipCode(unitCode: string): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateMembershipCode(unitCode)
    const exists = await prisma.mallMembership.findUnique({ where: { code }, select: { id: true } })
    if (!exists) return code
  }
  return generateMembershipCode(`${unitCode}${Date.now().toString(36)}`)
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
