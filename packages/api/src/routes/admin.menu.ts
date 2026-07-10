import type { FastifyInstance } from 'fastify'
import { categoryInputSchema, categoryReorderSchema, menuItemInputSchema } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { prismaErrorMessage } from '../lib/dbSchema.js'

function slugify(input: string): string {
  return (
    input
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `cat-${Date.now()}`
  )
}

export async function adminMenuRoutes(app: FastifyInstance) {
  const manager = { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER'])] }

  // Categories
  app.get('/api/admin/categories', { onRequest: [app.authenticate] }, async () => {
    return prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
  })

  app.post('/api/admin/categories', manager, async (request, reply) => {
    const parsed = categoryInputSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده دسته نامعتبر است' })
    const id = parsed.data.id || slugify(parsed.data.name)
    const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } })
    const sortOrder = parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1

    if (parsed.data.isIceCreamHub) {
      await prisma.category.updateMany({ data: { isIceCreamHub: false } })
    }

    const created = await prisma.category.create({
      data: {
        id,
        name: parsed.data.name,
        emoji: parsed.data.emoji,
        sortOrder,
        accentColor: parsed.data.accentColor,
        isIceCreamHub: parsed.data.isIceCreamHub,
        showCustomBadge: parsed.data.showCustomBadge,
      },
    })
    return reply.code(201).send(created)
  })

  app.put('/api/admin/categories/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = categoryInputSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده دسته نامعتبر است' })

    if (parsed.data.isIceCreamHub) {
      await prisma.category.updateMany({
        where: { id: { not: id } },
        data: { isIceCreamHub: false },
      })
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        emoji: parsed.data.emoji,
        sortOrder: parsed.data.sortOrder ?? 0,
        accentColor: parsed.data.accentColor,
        isIceCreamHub: parsed.data.isIceCreamHub,
        showCustomBadge: parsed.data.showCustomBadge,
      },
    })
    return updated
  })

  app.patch('/api/admin/categories/reorder', manager, async (request, reply) => {
    const parsed = categoryReorderSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'ترتیب نامعتبر است' })
    await prisma.$transaction(
      parsed.data.order.map((id, index) =>
        prisma.category.update({ where: { id }, data: { sortOrder: index } }),
      ),
    )
    return reply.code(204).send()
  })

  app.delete('/api/admin/categories/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const itemCount = await prisma.menuItem.count({ where: { categoryId: id } })
    if (itemCount > 0) {
      return reply.code(400).send({ error: 'این دسته هنوز آیتم دارد. ابتدا آیتم‌ها را منتقل یا حذف کنید.' })
    }
    await prisma.category.delete({ where: { id } })
    return reply.code(204).send()
  })

  // Menu items
  app.get('/api/admin/items', { onRequest: [app.authenticate] }, async () => {
    return prisma.menuItem.findMany({
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
      include: { category: true },
    })
  })

  app.post('/api/admin/items', manager, async (request, reply) => {
    const parsed = menuItemInputSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده آیتم نامعتبر است' })
    try {
      const created = await prisma.menuItem.create({
        data: {
          name: parsed.data.name,
          price: parsed.data.price,
          emoji: parsed.data.emoji,
          description: parsed.data.description,
          tags: parsed.data.tags,
          modifiers: parsed.data.modifiers,
          imageUrl: parsed.data.imageUrl ?? null,
          isAvailable: parsed.data.isAvailable,
          posOnly: parsed.data.posOnly,
          categoryId: parsed.data.category,
        },
      })
      return reply.code(201).send(created)
    } catch (err) {
      const message = prismaErrorMessage(err) ?? 'ذخیره آیتم ناموفق بود'
      return reply.code(500).send({ error: message })
    }
  })

  app.put('/api/admin/items/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = menuItemInputSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'داده آیتم نامعتبر است' })
    try {
      const updated = await prisma.menuItem.update({
        where: { id },
        data: {
          name: parsed.data.name,
          price: parsed.data.price,
          emoji: parsed.data.emoji,
          description: parsed.data.description,
          tags: parsed.data.tags,
          modifiers: parsed.data.modifiers,
          imageUrl: parsed.data.imageUrl ?? null,
          isAvailable: parsed.data.isAvailable,
          posOnly: parsed.data.posOnly,
          categoryId: parsed.data.category,
        },
      })
      return updated
    } catch (err) {
      const message = prismaErrorMessage(err) ?? 'ذخیره آیتم ناموفق بود'
      return reply.code(500).send({ error: message })
    }
  })

  app.patch('/api/admin/items/:id/availability', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string }
    const { isAvailable } = request.body as { isAvailable: boolean }
    return prisma.menuItem.update({ where: { id }, data: { isAvailable } })
  })

  app.delete('/api/admin/items/:id', manager, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.menuItem.delete({ where: { id } })
    return reply.code(204).send()
  })
}
