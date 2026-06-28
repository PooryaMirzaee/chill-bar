import type { FastifyInstance } from 'fastify'
import { aiChatRequestSchema } from '@chill-bar/shared'
import type { MenuItem } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { loadAiSettings, isAiReady, toPublicAiConfig } from '../lib/ai/settings.js'
import { buildSystemPrompt, parseAiJson } from '../lib/ai/prompt.js'
import { callAvalAiChat, trimHistory } from '../lib/ai/avalai.js'
import { loadSettings } from '../lib/storeSettings.js'

async function loadMenuItems(): Promise<MenuItem[]> {
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { category: true },
  })
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.categoryId,
    categoryName: item.category.name,
    emoji: item.emoji,
    tags: (item.tags as Record<string, number>) ?? {},
    description: item.description,
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
  }))
}

export async function aiRoutes(app: FastifyInstance) {
  app.get('/api/ai/config', async () => {
    const settings = await loadAiSettings()
    return await toPublicAiConfig(settings)
  })

  app.post('/api/ai/chat', async (request, reply) => {
    const parsed = aiChatRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'درخواست نامعتبر است' })
    }

    const aiSettings = await loadAiSettings()
    if (!isAiReady(aiSettings)) {
      return reply.code(503).send({ error: 'گارسون هوشمند فعلاً فعال نیست' })
    }

    const store = await loadSettings()
    const items = await loadMenuItems()
    const { message, history, context } = parsed.data

    const systemPrompt = buildSystemPrompt(aiSettings, items, store, {
      ...context,
      storeName: context?.storeName ?? store.storeName,
      storeSubtitle: context?.storeSubtitle ?? store.storeSubtitle,
    })

    const trimmed = trimHistory(history ?? [], aiSettings.maxHistoryMessages)

    try {
      const raw = await callAvalAiChat(aiSettings, [
        { role: 'system', content: systemPrompt },
        ...trimmed.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ])

      const parsedReply = parseAiJson(raw)
      const validIds = new Set(items.map((i) => i.id))
      const itemIds = parsedReply.inScope
        ? parsedReply.itemIds.filter((id) => validIds.has(id))
        : []

      let replyText = parsedReply.reply || aiSettings.outOfScopeMessage
      if (!parsedReply.inScope) {
        replyText = aiSettings.outOfScopeMessage
      }

      await prisma.analyticsEvent.create({
        data: {
          type: 'ai_chat',
          payload: { inScope: parsedReply.inScope, itemCount: itemIds.length },
        },
      })

      return {
        reply: replyText,
        inScope: parsedReply.inScope,
        itemIds,
      }
    } catch (err) {
      request.log.error(err)
      return reply.code(502).send({
        error: err instanceof Error ? err.message : 'خطا در ارتباط با AvalAI',
      })
    }
  })
}
