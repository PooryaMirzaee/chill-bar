import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import bcrypt from 'bcryptjs'
import { PrismaClient, Prisma } from '@prisma/client'
import { DEFAULT_STORE_SETTINGS, LEGACY_CATEGORY_ACCENTS, SEED_VISUAL_PROFILES } from '@chill-bar/shared'
import { env } from './env.js'

const prisma = new PrismaClient()
const __dirname = dirname(fileURLToPath(import.meta.url))

interface RawCategory {
  id: string
  name: string
  emoji: string
}
interface RawItem {
  id: string
  name: string
  price: number
  category: string
  categoryName: string
  emoji: string
  tags: Record<string, number>
  description: string
}

const ICE_OPTIONS = [
  // BASES
  { id: 'pistachio', type: 'BASE', name: 'پسته', color: '#7cb87c', priceMod: 30, emoji: '🟢', coldBoost: 0.3 },
  { id: 'nutella', type: 'BASE', name: 'نوتلا', color: '#5c3a1e', priceMod: 20, emoji: '🟤', hotBoost: 0.2 },
  { id: 'hazelnut', type: 'BASE', name: 'فندق', color: '#a67c52', priceMod: 25, emoji: '🌰' },
  { id: 'strawberry', type: 'BASE', name: 'توت فرنگی', color: '#e85d8a', priceMod: 10, emoji: '🍓', coldBoost: 0.5 },
  { id: 'vanilla', type: 'BASE', name: 'وانیل', color: '#f5e6c8', priceMod: 0, emoji: '🤍' },
  // COATINGS
  { id: 'white', type: 'COATING', name: 'شکلات سفید', color: '#f0ebe3', priceMod: 0, emoji: '⬜' },
  { id: 'milk36', type: 'COATING', name: 'شکلات شیری ۳۶٪', color: '#8b6914', priceMod: 0, emoji: '🍫' },
  { id: 'dark60', type: 'COATING', name: 'شکلات تلخ ۶۰٪', color: '#3d2314', priceMod: 5, emoji: '🖤' },
  { id: 'white-hazelnut', type: 'COATING', name: 'شکلات سفید و مغز فندق', color: '#e8dcc8', texture: 'hazelnut', priceMod: 15, emoji: '🌰' },
  { id: 'milk-hazelnut', type: 'COATING', name: 'شکلات و مغز فندق', color: '#6b4423', texture: 'hazelnut', priceMod: 15, emoji: '🌰' },
  { id: 'milk-almond', type: 'COATING', name: 'شکلات و مغز بادام', color: '#7a5230', texture: 'almond', priceMod: 15, emoji: '🥜' },
  { id: 'white-pistachio', type: 'COATING', name: 'شکلات سفید و مغز پسته', color: '#dce8d0', texture: 'pistachio', priceMod: 20, emoji: '🟢' },
  { id: 'milk-pistachio', type: 'COATING', name: 'شکلات و مغز پسته', color: '#5a4020', texture: 'pistachio', priceMod: 20, emoji: '🟢' },
  { id: 'milk-walnut', type: 'COATING', name: 'شکلات و مغز گردو', color: '#4a3020', texture: 'walnut', priceMod: 15, emoji: '🥜' },
  { id: 'none', type: 'COATING', name: 'بدون روکش', color: 'transparent', priceMod: -10, emoji: '○' },
  // FILLINGS
  { id: 'peanut', type: 'FILLING', name: 'شکلات بادام زمینی', color: '#c4956a', priceMod: 10, emoji: '🥜' },
  { id: 'lotus', type: 'FILLING', name: 'کرم لوتوس', color: '#d4a055', priceMod: 15, emoji: '🍪' },
  { id: 'pistachio-cream', type: 'FILLING', name: 'کرم پسته', color: '#8fbc8f', priceMod: 20, emoji: '🟢' },
  { id: 'nutella-fill', type: 'FILLING', name: 'نوتلا', color: '#5c3a1e', priceMod: 15, emoji: '🍫' },
  { id: 'honey-milk', type: 'FILLING', name: 'شیر عسل', color: '#f0d890', priceMod: 5, emoji: '🍯' },
  { id: 'nestle', type: 'FILLING', name: 'شکلات نستله', color: '#6b3a2a', priceMod: 10, emoji: '🍫' },
  { id: 'caramel', type: 'FILLING', name: 'تافی کارامل', color: '#c87830', priceMod: 10, emoji: '🍮' },
  { id: 'biscuit', type: 'FILLING', name: 'کرم بیسکویت', color: '#c4a882', priceMod: 10, emoji: '🍪' },
  { id: 'strawberry-fill', type: 'FILLING', name: 'توت فرنگی', color: '#e85d8a', priceMod: 5, emoji: '🍓', coldBoost: 0.4 },
] as const

async function main() {
  console.log('🌱 Seeding Chill Bar database...')

  const menuPath = join(__dirname, '..', 'prisma', 'seed-data', 'menu.json')
  const menu = JSON.parse(readFileSync(menuPath, 'utf-8')) as {
    categories: RawCategory[]
    items: RawItem[]
  }

  // Admin user
  const adminPassword = await bcrypt.hash(env.seedAdminPassword, 10)
  await prisma.user.upsert({
    where: { username: env.seedAdminUser },
    update: {},
    create: {
      name: 'مدیر چیل بار',
      username: env.seedAdminUser,
      password: adminPassword,
      role: 'SUPER_ADMIN',
    },
  })
  console.log(`✅ Admin user: ${env.seedAdminUser} / ${env.seedAdminPassword}`)

  // Categories
  for (let i = 0; i < menu.categories.length; i++) {
    const c = menu.categories[i]
    const accentColor = LEGACY_CATEGORY_ACCENTS[c.id] ?? '#F26522'
    const isIceCreamHub = c.id === 'icecream'
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        emoji: c.emoji,
        sortOrder: i,
        accentColor,
        isIceCreamHub,
        showCustomBadge: isIceCreamHub,
      },
      create: {
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        sortOrder: i,
        accentColor,
        isIceCreamHub,
        showCustomBadge: isIceCreamHub,
      },
    })
  }
  console.log(`✅ ${menu.categories.length} categories`)

  // Menu items (idempotent: clear then insert by stable id)
  for (let i = 0; i < menu.items.length; i++) {
    const item = menu.items[i]
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        description: item.description ?? '',
        tags: item.tags ?? {},
        categoryId: item.category,
        sortOrder: i,
      },
      create: {
        id: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        description: item.description ?? '',
        tags: item.tags ?? {},
        categoryId: item.category,
        sortOrder: i,
      },
    })
  }
  console.log(`✅ ${menu.items.length} menu items`)

  // Ice cream options
  for (let i = 0; i < ICE_OPTIONS.length; i++) {
    const o = ICE_OPTIONS[i]
    await prisma.iceCreamOption.upsert({
      where: { type_id: { type: o.type, id: o.id } },
      update: {
        name: o.name,
        color: o.color,
        texture: 'texture' in o ? o.texture : null,
        priceMod: o.priceMod,
        emoji: o.emoji,
        hotBoost: 'hotBoost' in o ? o.hotBoost : null,
        coldBoost: 'coldBoost' in o ? o.coldBoost : null,
        sortOrder: i,
        visualProfile: (SEED_VISUAL_PROFILES[o.id] ?? null) as Prisma.InputJsonValue,
      },
      create: {
        id: o.id,
        type: o.type,
        name: o.name,
        color: o.color,
        texture: 'texture' in o ? o.texture : null,
        priceMod: o.priceMod,
        emoji: o.emoji,
        hotBoost: 'hotBoost' in o ? o.hotBoost : null,
        coldBoost: 'coldBoost' in o ? o.coldBoost : null,
        sortOrder: i,
        visualProfile: (SEED_VISUAL_PROFILES[o.id] ?? null) as Prisma.InputJsonValue,
      },
    })
  }
  console.log(`✅ ${ICE_OPTIONS.length} ice cream options`)

  // Default settings
  await prisma.setting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: DEFAULT_STORE_SETTINGS as unknown as Prisma.InputJsonValue,
    },
  })
  await prisma.setting.upsert({
    where: { key: 'iceCreamBasePrice' },
    update: {},
    create: { key: 'iceCreamBasePrice', value: 240 },
  })
  await prisma.setting.upsert({
    where: { key: 'iceCream_builder' },
    update: {},
    create: {
      key: 'iceCream_builder',
      value: {
        basePrice: 240,
        minPrice: 230,
        enabled: true,
        smartSuggestions: true,
      },
    },
  })
  console.log('✅ Settings')

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
