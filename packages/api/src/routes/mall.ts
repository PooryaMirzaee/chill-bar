import type { FastifyInstance } from 'fastify'
import { mallRedeemSchema, mergeMallClubSettings } from '@chill-bar/shared'
import { loadSettings } from '../lib/storeSettings.js'
import { findMembershipByCode, toMembershipPublic } from '../lib/mallClub.js'

export async function mallRoutes(app: FastifyInstance) {
  app.get('/api/mall/config', async () => {
    const store = await loadSettings()
    const mall = mergeMallClubSettings(store.mallClub)
    const enabled = store.features.mallClub !== false && mall.enabled
    return {
      enabled,
      complexName: mall.complexName,
      heroTitle: mall.heroTitle,
      heroSubtitle: mall.heroSubtitle,
      codePlaceholder: mall.codePlaceholder,
      deliveryLabel: mall.deliveryLabel,
      counterLabel: mall.counterLabel,
      walletEmptyUpsell: mall.walletEmptyUpsell,
      defaultDiscountPercent: mall.defaultDiscountPercent,
      minOrderForDelivery: mall.minOrderForDelivery,
      memberDeepLinkPrefix: mall.memberDeepLinkPrefix,
    }
  })

  app.post('/api/mall/redeem', async (request, reply) => {
    const store = await loadSettings()
    const mall = mergeMallClubSettings(store.mallClub)
    if (store.features.mallClub === false || !mall.enabled) {
      return reply.code(403).send({ error: 'اشتراک سیتی‌سنتر فعلاً فعال نیست' })
    }
    const parsed = mallRedeemSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'کد اشتراک را وارد کنید' })
    }
    const membership = await findMembershipByCode(parsed.data.code)
    if (!membership) {
      return reply.code(404).send({ error: 'کد اشتراک پیدا نشد' })
    }
    if (membership.status !== 'ACTIVE' || !membership.unit.isActive) {
      return reply.code(403).send({ error: 'این اشتراک فعال نیست — با کافه تماس بگیرید' })
    }
    return { membership: toMembershipPublic(membership) }
  })
}
