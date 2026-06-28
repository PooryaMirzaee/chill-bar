import type { FastifyInstance } from 'fastify'
import { waitGameSubmitSchema } from '@chill-bar/shared'
import { loungeEnabledGameIds } from '@chill-bar/shared'
import { loadSettings } from '../lib/storeSettings.js'
import { submitWaitGameScore } from '../lib/loyalty.js'
import { getCustomerIdFromAuth } from './customers.js'

export async function waitLoungeRoutes(app: FastifyInstance) {
  app.get('/api/wait-lounge/config', async () => {
    const settings = await loadSettings()
    const lounge = settings.waitLounge
    return {
      enabled: settings.features.waitLounge !== false,
      enabledGames: loungeEnabledGameIds(lounge),
      allowedStatuses: lounge.allowedStatuses,
      estimatedPrepMinutes: lounge.estimatedPrepMinutes,
      maxPointsPerOrder: lounge.maxPointsPerOrder,
      statusBonusMultiplier: lounge.statusBonusMultiplier,
      games: lounge.games,
      rewards: lounge.rewards.map(({ id, type, label, cost, value }) => ({
        id,
        type,
        label,
        cost,
        value,
      })),
      economy: {
        minPointsToRedeem: lounge.minPointsToRedeem,
        maxDiscountPerOrder: lounge.maxDiscountPerOrder,
        maxPercentPerOrder: lounge.maxPercentPerOrder,
        pointsRedemptionEnabled: lounge.pointsRedemptionEnabled,
        pointsExpireDays: lounge.pointsExpireDays,
      },
    }
  })

  app.post('/api/orders/:code/wait-games/submit', async (request, reply) => {
    const { code } = request.params as { code: string }
    const parsed = waitGameSubmitSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده بازی نامعتبر است' })
    }

    const settings = await loadSettings()
    if (!settings.features.waitLounge) {
      return reply.code(403).send({ error: 'سالن انتظار غیرفعال است' })
    }

    const customerId = await getCustomerIdFromAuth(request)
    const outcome = await submitWaitGameScore({
      orderCode: code,
      gameId: parsed.data.gameId,
      score: parsed.data.score,
      durationMs: parsed.data.durationMs,
      customerId,
      settings,
    })

    if (outcome.error) {
      return reply.code(400).send({ error: outcome.error })
    }
    return outcome.result
  })
}
