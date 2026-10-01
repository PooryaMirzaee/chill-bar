import type { FastifyPluginAsync } from 'fastify'
import {
  generateSpinCode,
  isCampaignActiveOn,
  mergeSpinCampaignSettings,
  normalizeIranMobile,
  pickWeightedPrize,
  spinClaimInputSchema,
  spinDrawInputSchema,
  tehranDayKey,
} from '@chill-bar/shared'
import type { SpinCampaignSettings, SpinDrawResult, SpinPrize } from '@chill-bar/shared'
import { loadSettings } from '../lib/storeSettings.js'
import { prisma } from '../prisma.js'
import type { Prisma } from '@prisma/client'

/** An unclaimed draw reserves its prize (and stock) for this long. */
const DRAW_TTL_MS = 2 * 60 * 60 * 1000

function campaignBlockedReply(campaign: SpinCampaignSettings) {
  const status = isCampaignActiveOn(campaign)
  if (status === 'disabled') return { code: 403, error: 'گردونه غیرفعال است' }
  if (status === 'not_started') return { code: 403, error: campaign.notStartedMessage }
  if (status === 'ended') return { code: 403, error: campaign.endedMessage }
  return null
}

async function prizesWithStock(prizes: SpinPrize[]): Promise<SpinPrize[]> {
  const pool = prizes.filter((p) => p.isActive && p.weight > 0)
  const reservedSince = new Date(Date.now() - DRAW_TTL_MS)
  const available = await Promise.all(
    pool.map(async (p) => {
      if (p.stock == null) return true
      const [claimed, reserved] = await Promise.all([
        prisma.spinPrizeClaim.count({ where: { prizeId: p.id } }),
        prisma.spinDraw.count({
          where: { prizeId: p.id, claimedAt: null, createdAt: { gte: reservedSince } },
        }),
      ])
      return claimed + reserved < p.stock
    }),
  )
  return pool.filter((_, i) => available[i])
}

function normalizeCode(raw: string | undefined | null): string {
  return (raw ?? '').trim()
}

function buildClaimWhere(q: {
  phone?: string
  code?: string
  prizeId?: string
  prizeType?: string
  status?: string
  from?: string
  to?: string
}): Prisma.SpinPrizeClaimWhereInput {
  const where: Prisma.SpinPrizeClaimWhereInput = {}
  if (q.phone) {
    const digits = q.phone.replace(/\D/g, '')
    where.phone = digits ? { contains: digits } : { contains: q.phone.trim() }
  }
  if (q.code) where.code = normalizeCode(q.code)
  if (q.prizeId) where.prizeId = q.prizeId
  if (q.prizeType) where.prizeType = q.prizeType

  if (q.status === 'try_again') where.prizeType = 'TRY_AGAIN'
  else if (q.status === 'pending') {
    where.prizeType = { not: 'TRY_AGAIN' }
    where.redeemedAt = null
  } else if (q.status === 'redeemed') {
    where.prizeType = { not: 'TRY_AGAIN' }
    where.redeemedAt = { not: null }
  } else if (q.status === 'wins') {
    where.prizeType = { not: 'TRY_AGAIN' }
  }

  if (q.from || q.to) {
    where.createdAt = {}
    if (q.from) where.createdAt.gte = new Date(`${q.from}T00:00:00.000+03:30`)
    if (q.to) where.createdAt.lte = new Date(`${q.to}T23:59:59.999+03:30`)
  }
  return where
}

export const spinRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/spin/draw', async (req, reply) => {
    const parsed = spinDrawInputSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'اطلاعات نامعتبر است', details: parsed.error.flatten() })
    }
    const { deviceKey } = parsed.data

    const settings = await loadSettings()
    const campaign = mergeSpinCampaignSettings(settings.spinCampaign)
    const blocked = campaignBlockedReply(campaign)
    if (blocked) return reply.code(blocked.code).send({ error: blocked.error })

    const dayKey = tehranDayKey()
    const drawsToday = await prisma.spinDraw.count({ where: { deviceKey, dayKey } })
    if (drawsToday >= campaign.spinsPerDay) {
      return reply.code(429).send({ error: campaign.alreadySpunMessage })
    }

    const prize = pickWeightedPrize(await prizesWithStock(campaign.prizes))
    if (!prize) return reply.code(409).send({ error: 'جایزه‌ای برای گردونه باقی نمانده' })

    const draw = await prisma.spinDraw.create({
      data: { prizeId: prize.id, deviceKey, dayKey },
    })
    const result: SpinDrawResult = { drawId: draw.id, prizeId: prize.id }
    return result
  })

  app.post('/api/spin/claim', async (req, reply) => {
    const parsed = spinClaimInputSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'اطلاعات نامعتبر است', details: parsed.error.flatten() })
    }
    const { drawId, deviceKey } = parsed.data

    const draw = await prisma.spinDraw.findUnique({ where: { id: drawId } })
    if (!draw || draw.deviceKey !== deviceKey) {
      return reply.code(404).send({ error: 'چرخش معتبری پیدا نشد — دوباره بچرخونید' })
    }
    if (draw.claimedAt) return reply.code(409).send({ error: 'جایزه این چرخش قبلاً ثبت شده' })
    if (Date.now() - draw.createdAt.getTime() > DRAW_TTL_MS) {
      return reply.code(410).send({ error: 'مهلت ثبت این جایزه تمام شده' })
    }

    const phone = normalizeIranMobile(parsed.data.phone)
    const settings = await loadSettings()
    const campaign = mergeSpinCampaignSettings(settings.spinCampaign)
    const prize = campaign.prizes.find((p) => p.id === draw.prizeId && p.isActive)
    if (!prize) return reply.code(404).send({ error: 'جایزه یافت نشد' })

    if (prize.type !== 'TRY_AGAIN' && !phone) {
      return reply.code(400).send({ error: 'شماره موبایل ایرانی معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)' })
    }

    const identityPhone = phone ?? `dev:${deviceKey.slice(0, 24)}`

    const blocked = campaignBlockedReply(campaign)
    if (blocked) return reply.code(blocked.code).send({ error: blocked.error })

    const dayKey = tehranDayKey()
    const todayCount = await prisma.spinPrizeClaim.count({
      where: { phone: identityPhone, dayKey },
    })
    if (todayCount >= campaign.spinsPerDay) {
      return reply.code(429).send({ error: campaign.alreadySpunMessage })
    }

    if (prize.stock != null) {
      const used = await prisma.spinPrizeClaim.count({ where: { prizeId: prize.id } })
      if (used >= prize.stock) {
        return reply.code(409).send({ error: 'موجودی این جایزه تمام شده' })
      }
    }

    const locked = await prisma.spinDraw.updateMany({
      where: { id: draw.id, claimedAt: null },
      data: { claimedAt: new Date() },
    })
    if (locked.count === 0) return reply.code(409).send({ error: 'جایزه این چرخش قبلاً ثبت شده' })

    if (prize.type === 'TRY_AGAIN') {
      const noopCode = generateSpinCode('RETRY', identityPhone.replace(/\D/g, '').slice(-4).padStart(4, '0') || '0000')
      const claim = await prisma.spinPrizeClaim.create({
        data: {
          code: noopCode,
          prizeId: prize.id,
          prizeLabel: prize.label,
          prizeType: prize.type,
          prizeEmoji: prize.emoji,
          prizeSnapshot: prize,
          phone: identityPhone,
          deviceKey,
          dayKey,
          redeemedAt: new Date(),
          redeemedBy: 'TRY_AGAIN',
        },
      })
      return {
        ok: true,
        tryAgain: true,
        code: null,
        message: prize.description || 'این بار نشد — فردا دوباره شانس داری',
        claimId: claim.id,
        prize,
      }
    }

    let code = generateSpinCode(prize.codePrefix, phone!)
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.spinPrizeClaim.findUnique({ where: { code } })
      if (!exists) break
      code = generateSpinCode(prize.codePrefix, phone!)
    }

    const claim = await prisma.spinPrizeClaim.create({
      data: {
        code,
        prizeId: prize.id,
        prizeLabel: prize.label,
        prizeType: prize.type,
        prizeEmoji: prize.emoji,
        prizeSnapshot: prize,
        phone: phone!,
        deviceKey,
        dayKey,
      },
    })

    return {
      ok: true,
      tryAgain: false,
      code: claim.code,
      claimId: claim.id,
      prize,
      message: 'کد جایزه صادر شد — در صندوق وارد کنید',
    }
  })

  app.get('/api/spin/status', async (req) => {
    const q = req.query as { phone?: string; deviceKey?: string }
    const settings = await loadSettings()
    const campaign = mergeSpinCampaignSettings(settings.spinCampaign)
    const status = isCampaignActiveOn(campaign)
    const dayKey = tehranDayKey()
    const phone = normalizeIranMobile(q.phone ?? '')

    const deviceKey = q.deviceKey?.slice(0, 80)
    const [phoneSpins, deviceSpins] = await Promise.all([
      phone ? prisma.spinPrizeClaim.count({ where: { phone, dayKey } }) : 0,
      deviceKey ? prisma.spinDraw.count({ where: { deviceKey, dayKey } }) : 0,
    ])
    const spinsUsedToday = Math.max(phoneSpins, deviceSpins)

    return {
      status,
      dayKey,
      spinsPerDay: campaign.spinsPerDay,
      spinsUsedToday,
      canSpin: status === 'active' && spinsUsedToday < campaign.spinsPerDay,
      endsAt: campaign.endsAt,
      startsAt: campaign.startsAt,
    }
  })
}

export const adminSpinRoutes: FastifyPluginAsync = async (app) => {
  const staffAuth = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] }
  const managerAuth = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/spin/claims', staffAuth, async (req) => {
    const q = req.query as {
      limit?: string
      page?: string
      phone?: string
      code?: string
      prizeId?: string
      prizeType?: string
      status?: string
      from?: string
      to?: string
    }
    const limit = Math.min(Number(q.limit) || 50, 500)
    const page = Math.max(Number(q.page) || 1, 1)
    const where = buildClaimWhere(q)
    const [total, claims] = await Promise.all([
      prisma.spinPrizeClaim.count({ where }),
      prisma.spinPrizeClaim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { total, page, limit, claims }
  })

  app.get('/api/admin/spin/claims/:code', staffAuth, async (req, reply) => {
    const code = normalizeCode((req.params as { code: string }).code)
    if (!code) return reply.code(400).send({ error: 'کد الزامی است' })
    const claim = await prisma.spinPrizeClaim.findUnique({ where: { code } })
    if (!claim) return reply.code(404).send({ error: 'کد یافت نشد' })
    return claim
  })

  app.get('/api/admin/spin/report', managerAuth, async (req) => {
    const q = req.query as {
      phone?: string
      code?: string
      prizeId?: string
      prizeType?: string
      status?: string
      from?: string
      to?: string
      page?: string
      limit?: string
    }
    const where = buildClaimWhere(q)
    const limit = Math.min(Number(q.limit) || 50, 200)
    const page = Math.max(Number(q.page) || 1, 1)

    const [
      total,
      claims,
      uniquePhones,
      wins,
      redeemed,
      pending,
      tryAgain,
      byPrizeRaw,
      byDayRaw,
      participantsRaw,
      todayCount,
    ] = await Promise.all([
      prisma.spinPrizeClaim.count({ where }),
      prisma.spinPrizeClaim.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.spinPrizeClaim.findMany({
        where,
        distinct: ['phone'],
        select: { phone: true },
      }),
      prisma.spinPrizeClaim.count({
        where: { ...where, prizeType: { not: 'TRY_AGAIN' } },
      }),
      prisma.spinPrizeClaim.count({
        where: { ...where, prizeType: { not: 'TRY_AGAIN' }, redeemedAt: { not: null } },
      }),
      prisma.spinPrizeClaim.count({
        where: { ...where, prizeType: { not: 'TRY_AGAIN' }, redeemedAt: null },
      }),
      prisma.spinPrizeClaim.count({
        where: { ...where, prizeType: 'TRY_AGAIN' },
      }),
      prisma.spinPrizeClaim.groupBy({
        by: ['prizeId', 'prizeLabel', 'prizeType', 'prizeEmoji'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.spinPrizeClaim.groupBy({
        by: ['dayKey'],
        where,
        _count: { id: true },
        orderBy: { dayKey: 'asc' },
      }),
      prisma.spinPrizeClaim.groupBy({
        by: ['phone'],
        where,
        _count: { id: true },
        _max: { createdAt: true },
        _min: { createdAt: true },
        orderBy: { _count: { id: 'desc' } },
        take: 200,
      }),
      prisma.spinPrizeClaim.count({ where: { dayKey: tehranDayKey() } }),
    ])

    const participantPhones = participantsRaw.map((p) => p.phone)
    const participantWins = participantPhones.length
      ? await prisma.spinPrizeClaim.findMany({
          where: {
            phone: { in: participantPhones },
            prizeType: { not: 'TRY_AGAIN' },
          },
          select: {
            phone: true,
            prizeLabel: true,
            prizeEmoji: true,
            prizeType: true,
            code: true,
            redeemedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    const winsByPhone = new Map<string, typeof participantWins>()
    for (const w of participantWins) {
      const list = winsByPhone.get(w.phone) ?? []
      list.push(w)
      winsByPhone.set(w.phone, list)
    }

    const participants = participantsRaw.map((p) => {
      const winsList = winsByPhone.get(p.phone) ?? []
      return {
        phone: p.phone,
        spinCount: p._count.id,
        firstSpinAt: p._min.createdAt,
        lastSpinAt: p._max.createdAt,
        winCount: winsList.length,
        redeemedCount: winsList.filter((w) => w.redeemedAt).length,
        pendingCount: winsList.filter((w) => !w.redeemedAt).length,
        wins: winsList.slice(0, 12),
      }
    })

    return {
      summary: {
        totalSpins: total,
        uniqueParticipants: uniquePhones.length,
        wins,
        redeemed,
        pending,
        tryAgain,
        redemptionRate: wins > 0 ? Math.round((redeemed / wins) * 1000) / 10 : 0,
        spinsToday: todayCount,
      },
      byPrize: byPrizeRaw.map((row) => ({
        prizeId: row.prizeId,
        prizeLabel: row.prizeLabel,
        prizeType: row.prizeType,
        prizeEmoji: row.prizeEmoji,
        count: row._count.id,
      })),
      byDay: byDayRaw.map((row) => ({
        dayKey: row.dayKey,
        count: row._count.id,
      })),
      participants,
      claims: {
        total,
        page,
        limit,
        items: claims,
      },
    }
  })

  app.get('/api/admin/spin/export', managerAuth, async (req, reply) => {
    const q = req.query as {
      phone?: string
      code?: string
      prizeId?: string
      prizeType?: string
      status?: string
      from?: string
      to?: string
    }
    const where = buildClaimWhere(q)
    const claims = await prisma.spinPrizeClaim.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    })
    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="spin-campaign.csv"')
    const header =
      'code,phone,prizeLabel,prizeType,prizeId,dayKey,redeemedAt,redeemedBy,deviceKey,createdAt'
    const lines = claims.map((c) =>
      [
        c.code,
        c.phone,
        `"${c.prizeLabel.replace(/"/g, '""')}"`,
        c.prizeType,
        c.prizeId,
        c.dayKey,
        c.redeemedAt?.toISOString() ?? '',
        c.redeemedBy ?? '',
        c.deviceKey ?? '',
        c.createdAt.toISOString(),
      ].join(','),
    )
    return `\uFEFF${[header, ...lines].join('\n')}`
  })

  app.post('/api/admin/spin/redeem', staffAuth, async (req, reply) => {
    const body = req.body as { code?: string }
    const code = normalizeCode(body.code)
    if (!code) return reply.code(400).send({ error: 'کد الزامی است' })
    const claim = await prisma.spinPrizeClaim.findUnique({ where: { code } })
    if (!claim) return reply.code(404).send({ error: 'کد یافت نشد' })
    if (claim.redeemedAt) return reply.code(409).send({ error: 'این کد قبلاً استفاده شده', claim })
    if (claim.prizeType === 'TRY_AGAIN') {
      return reply.code(400).send({ error: 'این کد قابل استفاده در صندوق نیست' })
    }
    const user = (req as { user?: { sub?: string } }).user
    const updated = await prisma.spinPrizeClaim.update({
      where: { id: claim.id },
      data: { redeemedAt: new Date(), redeemedBy: user?.sub ?? 'admin' },
    })
    return { ok: true, claim: updated }
  })
}
