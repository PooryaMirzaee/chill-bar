import type { FastifyInstance } from 'fastify'
import { iceCreamBuilderSettingsSchema, iceCreamOptionInputSchema } from '@chill-bar/shared'
import type { IceCreamBuilderSettings } from '@chill-bar/shared'
import {
  loadIceCreamBuilderSettings,
  loadIceCreamOptions,
  mapIceCreamOption,
  nextSortOrder,
  normalizeVisualProfile,
  saveIceCreamBuilderSettings,
} from '../lib/iceCream.js'
import { prisma } from '../prisma.js'

export async function adminIceCreamRoutes(app: FastifyInstance) {
  const guard = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  app.get('/api/admin/ice-cream', guard, async () => loadIceCreamOptions(false))

  app.put('/api/admin/ice-cream/settings', guard, async (request, reply) => {
    const parsed = iceCreamBuilderSettingsSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'تنظیمات نامعتبر است' })
    }
    return saveIceCreamBuilderSettings(parsed.data as IceCreamBuilderSettings)
  })

  app.post('/api/admin/ice-cream/options', guard, async (request, reply) => {
    const parsed = iceCreamOptionInputSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'گزینه نامعتبر است' })
    }

    const input = parsed.data
    const existing = await prisma.iceCreamOption.findUnique({
      where: { type_id: { type: input.type, id: input.id } },
    })
    if (existing) {
      return reply.code(409).send({ error: 'این شناسه قبلاً ثبت شده است' })
    }

    const sortOrder = input.sortOrder ?? (await nextSortOrder(input.type))
    const visualProfile = normalizeVisualProfile(input.type, input.color, input.visualProfile)

    const created = await prisma.iceCreamOption.create({
      data: {
        id: input.id,
        type: input.type,
        name: input.name,
        color: input.color,
        texture: input.texture ?? null,
        priceMod: input.priceMod,
        emoji: input.emoji,
        hotBoost: input.hotBoost ?? null,
        coldBoost: input.coldBoost ?? null,
        isActive: input.isActive,
        sortOrder,
        visualProfile: visualProfile as object,
      },
    })

    return mapIceCreamOption(created, true)
  })

  app.put('/api/admin/ice-cream/options/:type/:id', guard, async (request, reply) => {
    const { type, id } = request.params as { type: 'BASE' | 'COATING' | 'FILLING'; id: string }
    const parsed = iceCreamOptionInputSchema.safeParse({ ...(request.body as object), type, id })
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'گزینه نامعتبر است' })
    }

    const input = parsed.data
    const existing = await prisma.iceCreamOption.findUnique({
      where: { type_id: { type, id } },
    })
    if (!existing) {
      return reply.code(404).send({ error: 'گزینه پیدا نشد' })
    }

    const visualProfile = normalizeVisualProfile(
      type,
      input.color,
      input.visualProfile ?? (existing.visualProfile as object | null),
    )

    const updated = await prisma.iceCreamOption.update({
      where: { type_id: { type, id } },
      data: {
        name: input.name,
        color: input.color,
        texture: input.texture ?? null,
        priceMod: input.priceMod,
        emoji: input.emoji,
        hotBoost: input.hotBoost ?? null,
        coldBoost: input.coldBoost ?? null,
        isActive: input.isActive,
        sortOrder: input.sortOrder ?? existing.sortOrder,
        visualProfile: visualProfile as object,
      },
    })

    return mapIceCreamOption(updated, true)
  })

  app.delete('/api/admin/ice-cream/options/:type/:id', guard, async (request, reply) => {
    const { type, id } = request.params as { type: 'BASE' | 'COATING' | 'FILLING'; id: string }
    const existing = await prisma.iceCreamOption.findUnique({
      where: { type_id: { type, id } },
    })
    if (!existing) {
      return reply.code(404).send({ error: 'گزینه پیدا نشد' })
    }
    await prisma.iceCreamOption.delete({ where: { type_id: { type, id } } })
    return { ok: true }
  })

  app.put('/api/admin/ice-cream/reorder', guard, async (request, reply) => {
    const body = request.body as { type: 'BASE' | 'COATING' | 'FILLING'; ids: string[] }
    if (!body?.type || !Array.isArray(body.ids)) {
      return reply.code(400).send({ error: 'داده مرتب‌سازی نامعتبر است' })
    }
    await prisma.$transaction(
      body.ids.map((optionId, index) =>
        prisma.iceCreamOption.updateMany({
          where: { type: body.type, id: optionId },
          data: { sortOrder: index },
        }),
      ),
    )
    return { ok: true }
  })

  // Legacy endpoint — forwards to settings
  app.put('/api/admin/ice-cream/base-price', guard, async (request, reply) => {
    const body = request.body as { basePrice?: number }
    const basePrice = Number(body.basePrice)
    if (!Number.isFinite(basePrice) || basePrice < 0 || basePrice > 1_000_000) {
      return reply.code(400).send({ error: 'قیمت پایه نامعتبر است' })
    }
    const current = await loadIceCreamBuilderSettings()
    return saveIceCreamBuilderSettings({ ...current, basePrice })
  })
}
