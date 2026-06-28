import type { FastifyInstance } from 'fastify'
import { prisma } from '../prisma.js'
import type { Category, MenuItem } from '@chill-bar/shared'
import { parseMenuModifiers } from '@chill-bar/shared'

function mapCategory(c: {
  id: string
  name: string
  emoji: string
  sortOrder: number
  accentColor: string
  isIceCreamHub: boolean
  showCustomBadge: boolean
}): Category {
  return {
    id: c.id,
    name: c.name,
    emoji: c.emoji,
    sortOrder: c.sortOrder,
    accentColor: c.accentColor,
    isIceCreamHub: c.isIceCreamHub,
    showCustomBadge: c.showCustomBadge,
  }
}

export async function menuRoutes(app: FastifyInstance) {
  app.get('/api/menu', async () => {
    const [categories, items] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.menuItem.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { category: true },
      }),
    ])

    const mappedCategories = categories.map(mapCategory)

    const mappedItems: MenuItem[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.categoryId,
      categoryName: item.category.name,
      emoji: item.emoji,
      tags: (item.tags as Record<string, number>) ?? {},
      description: item.description,
      imageUrl: item.imageUrl,
      modifiers: parseMenuModifiers(item.modifiers),
      isAvailable: item.isAvailable,
    }))

    return { categories: mappedCategories, items: mappedItems }
  })
}
