import { z } from 'zod'

export const menuTabIdSchema = z.enum(['home', 'menu', 'icecream', 'discover', 'play'])

export const menuAppearanceSchema = z.object({
  defaultTab: menuTabIdSchema.default('menu'),
  gridColumns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  layout: z.enum(['cards', 'list']).default('cards'),
  cardVariant: z.enum(['default', 'minimal', 'elevated']).default('default'),
  categoryHeaderStyle: z.enum(['gradient', 'plain', 'hidden']).default('gradient'),
  showCategoryChips: z.boolean().default(true),
  showAllChip: z.boolean().default(true),
  showSearchBar: z.boolean().default(true),
  showSectionHeader: z.boolean().default(true),
  sectionEyebrow: z.string().max(40).default('منو'),
  sectionDescriptionTemplate: z.string().max(120).default('{count} آیتم · دست‌چین شده'),
  showItemCategoryBadge: z.boolean().default(true),
  showModifierBadge: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  imageRatio: z.enum(['1:1', '4:3', '3:4']).default('1:1'),
  gridGap: z.number().min(0.5).max(2).default(0.75),
  chipVariant: z.enum(['pill', 'soft', 'outline']).default('pill'),
  addButtonStyle: z.enum(['icon', 'pill']).default('icon'),
  animateCards: z.boolean().default(true),
  stickyCategoryBar: z.boolean().default(false),
  cardShowShadow: z.boolean().default(true),
  listThumbnailSize: z.enum(['sm', 'md', 'lg']).default('md'),
  emptyStateMessage: z.string().max(200).default('نتیجه‌ای یافت نشد'),
})

export type MenuAppearance = z.infer<typeof menuAppearanceSchema>

export const DEFAULT_MENU_APPEARANCE: MenuAppearance = menuAppearanceSchema.parse({})

export function formatMenuDescription(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count))
}
