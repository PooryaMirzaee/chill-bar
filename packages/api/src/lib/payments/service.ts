import { prisma } from '../../prisma.js'
import { topUpWallet } from '../mallClub.js'
import { broadcast } from '../../ws.js'
import { serializeOrder } from '../serializers.js'
import {
  isPaymentReady,
  loadPaymentSettings,
} from './settings.js'
import { paymentUrl, zarinpalRequest, zarinpalVerify } from './zarinpal.js'

function trimUrl(url: string) {
  return url.replace(/\/$/, '')
}

export async function startOrderPayment(orderId: string, customerId?: string | null) {
  const settings = await loadPaymentSettings()
  if (!isPaymentReady(settings) || !settings.enableOrderPay) {
    throw Object.assign(new Error('پرداخت آنلاین فعال نیست'), { statusCode: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) throw Object.assign(new Error('سفارش یافت نشد'), { statusCode: 404 })
  if (customerId && order.customerId && order.customerId !== customerId) {
    throw Object.assign(new Error('دسترسی به این سفارش مجاز نیست'), { statusCode: 403 })
  }
  if (order.paymentStatus === 'PAID') {
    throw Object.assign(new Error('این سفارش قبلاً پرداخت شده'), { statusCode: 400 })
  }
  const amountDue = Math.max(0, order.total - order.paidAmount)
  if (amountDue < settings.minAmount) {
    throw Object.assign(
      new Error(`حداقل مبلغ پرداخت ${settings.minAmount.toLocaleString('fa-IR')} است`),
      { statusCode: 400 },
    )
  }

  const payment = await prisma.onlinePayment.create({
    data: {
      amount: amountDue,
      currency: settings.currency,
      purpose: 'ORDER',
      status: 'PENDING',
      description: `${settings.descriptionPrefix} سفارش ${order.code}`,
      orderId: order.id,
      customerId: order.customerId,
      metadata: { orderCode: order.code },
    },
  })

  const callbackUrl = `${trimUrl(settings.callbackBaseUrl)}/api/payments/zarinpal/callback`
  const { authority, fee } = await zarinpalRequest({
    settings,
    amount: amountDue,
    description: payment.description,
    callbackUrl,
    mobile: order.customerPhone,
    orderId: order.code,
  })

  await prisma.onlinePayment.update({
    where: { id: payment.id },
    data: { authority, fee: fee ?? null },
  })

  return {
    paymentId: payment.id,
    authority,
    amount: amountDue,
    paymentUrl: paymentUrl(settings, authority),
  }
}

export async function startWalletTopupPayment(input: {
  membershipId: string
  amount: number
  bonusPercent?: number
  customerId?: string | null
  mobile?: string | null
}) {
  const settings = await loadPaymentSettings()
  if (!isPaymentReady(settings) || !settings.enableWalletTopup) {
    throw Object.assign(new Error('شارژ آنلاین کیف‌پول فعال نیست'), { statusCode: 400 })
  }
  if (input.amount < settings.minAmount) {
    throw Object.assign(
      new Error(`حداقل مبلغ شارژ ${settings.minAmount.toLocaleString('fa-IR')} است`),
      { statusCode: 400 },
    )
  }

  const membership = await prisma.mallMembership.findUnique({
    where: { id: input.membershipId },
    include: { unit: true },
  })
  if (!membership || membership.status !== 'ACTIVE') {
    throw Object.assign(new Error('اشتراک واحد معتبر نیست'), { statusCode: 400 })
  }

  const bonusPercent = Math.max(0, Math.min(100, input.bonusPercent ?? 0))
  const bonus = Math.floor((input.amount * bonusPercent) / 100)

  const payment = await prisma.onlinePayment.create({
    data: {
      amount: input.amount,
      currency: settings.currency,
      purpose: 'WALLET_TOPUP',
      status: 'PENDING',
      description: `${settings.descriptionPrefix} شارژ کیف واحد ${membership.unit.unitCode}`,
      membershipId: membership.id,
      customerId: input.customerId ?? membership.customerId,
      metadata: { bonusPercent, bonus, unitCode: membership.unit.unitCode },
    },
  })

  const callbackUrl = `${trimUrl(settings.callbackBaseUrl)}/api/payments/zarinpal/callback`
  const { authority, fee } = await zarinpalRequest({
    settings,
    amount: input.amount,
    description: payment.description,
    callbackUrl,
    mobile: input.mobile ?? membership.contactPhone,
    orderId: payment.id,
  })

  await prisma.onlinePayment.update({
    where: { id: payment.id },
    data: { authority, fee: fee ?? null },
  })

  return {
    paymentId: payment.id,
    authority,
    amount: input.amount,
    paymentUrl: paymentUrl(settings, authority),
  }
}

export async function handleZarinpalCallback(authority: string, status: string) {
  const settings = await loadPaymentSettings()
  const web = trimUrl(settings.publicWebUrl || 'https://chill-bar.ir')

  const payment = await prisma.onlinePayment.findUnique({ where: { authority } })
  if (!payment) {
    return `${web}/pay/result?ok=0&error=${encodeURIComponent('تراکنش یافت نشد')}`
  }

  if (payment.status === 'PAID') {
    return redirectPaid(web, payment)
  }

  if (status !== 'OK') {
    await prisma.onlinePayment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' },
    })
    return `${web}/pay/result?ok=0&purpose=${payment.purpose}&error=${encodeURIComponent('پرداخت لغو شد')}`
  }

  const verified = await zarinpalVerify({
    settings,
    amount: payment.amount,
    authority,
  })

  // 100 = first verify success, 101 = already verified
  if (verified.code !== 100 && verified.code !== 101) {
    await prisma.onlinePayment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    })
    return `${web}/pay/result?ok=0&purpose=${payment.purpose}&error=${encodeURIComponent(
      verified.message || `تأیید ناموفق (${verified.code})`,
    )}`
  }

  if (verified.code === 100) {
    await applySuccessfulPayment(payment.id, verified)
  }

  const fresh = await prisma.onlinePayment.findUniqueOrThrow({ where: { id: payment.id } })
  return redirectPaid(web, fresh)
}

function redirectPaid(
  web: string,
  payment: { purpose: string; orderId: string | null; refId: string | null; amount: number },
) {
  const q = new URLSearchParams({
    ok: '1',
    purpose: payment.purpose,
    amount: String(payment.amount),
  })
  if (payment.refId) q.set('refId', payment.refId)
  if (payment.orderId) q.set('orderId', payment.orderId)
  return `${web}/pay/result?${q.toString()}`
}

async function applySuccessfulPayment(
  paymentId: string,
  verified: { refId?: string; cardPan?: string; fee?: number },
) {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.onlinePayment.findUniqueOrThrow({ where: { id: paymentId } })
    if (payment.status === 'PAID') return

    await tx.onlinePayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        refId: verified.refId ?? null,
        cardPan: verified.cardPan ?? null,
        fee: verified.fee ?? null,
        verifiedAt: new Date(),
      },
    })

    if (payment.purpose === 'ORDER' && payment.orderId) {
      const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })
      const paidAmount = order.paidAmount + payment.amount
      const fullyPaid = paidAmount >= order.total
      await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount,
          paymentStatus: fullyPaid ? 'PAID' : 'UNPAID',
          paymentMethod: 'ONLINE',
          paidAt: fullyPaid ? new Date() : order.paidAt,
        },
      })
      await tx.orderPayment.create({
        data: {
          orderId: order.id,
          method: 'ONLINE',
          amount: payment.amount,
        },
      })
    }
  })

  const payment = await prisma.onlinePayment.findUniqueOrThrow({ where: { id: paymentId } })

  if (payment.purpose === 'WALLET_TOPUP' && payment.membershipId) {
    const meta = (payment.metadata ?? {}) as { bonus?: number }
    const bonus = typeof meta.bonus === 'number' ? meta.bonus : 0
    await topUpWallet(
      payment.membershipId,
      payment.amount,
      bonus,
      `شارژ آنلاین زرین‌پال${verified.refId ? ` · ${verified.refId}` : ''}`,
      null,
    )
  }

  if (payment.purpose === 'ORDER' && payment.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: payment.orderId },
      include: { items: true, membership: { select: { code: true } } },
    })
    if (order) {
      const serialized = serializeOrder(order)
      broadcast('admin', 'order:paid', serialized)
      broadcast('admin', 'order:updated', serialized)
    }
  }
}
