import { z } from 'zod'

export const homeSectionIdSchema = z.enum(['smartPicks', 'categories', 'moods', 'combo', 'story'])

export const homeAppearanceSchema = z.object({
  sectionOrder: z
    .array(homeSectionIdSchema)
    .default(['smartPicks', 'categories', 'moods', 'combo', 'story']),
  sectionGap: z.number().min(0.5).max(3).default(1.5),

  showSmartPicks: z.boolean().default(true),
  smartPicksEyebrow: z.string().max(40).default('پیشنهاد'),
  smartPicksTitle: z.string().max(80).default('پیشنهاد هوشمند'),
  smartPicksDescription: z.string().max(160).default('بر اساس ساعت، آب‌وهوا و حال شما'),
  smartPicksLayout: z.enum(['carousel', 'grid']).default('carousel'),
  smartPicksShowReason: z.boolean().default(true),
  smartPicksShowRank: z.boolean().default(true),
  smartPicksAnimate: z.boolean().default(true),

  showCategories: z.boolean().default(true),
  categoriesEyebrow: z.string().max(40).default('کاوش'),
  categoriesTitle: z.string().max(80).default('دسته‌بندی‌ها'),
  categoriesDescription: z.string().max(160).default('هر بخش، تجربه‌ای متفاوت'),

  showMoodPicker: z.boolean().default(true),

  showComboOnHome: z.boolean().default(true),
  comboEyebrow: z.string().max(40).default('کمبو'),

  showStoryFeed: z.boolean().default(true),
  storyAutoRotateSeconds: z.number().int().min(2).max(30).default(4),
  storyShowProgress: z.boolean().default(true),
  storyHeroStyle: z.enum(['emoji', 'gradient']).default('gradient'),
})

export type HomeAppearance = z.infer<typeof homeAppearanceSchema>
export type HomeSectionId = z.infer<typeof homeSectionIdSchema>

export const DEFAULT_HOME_APPEARANCE: HomeAppearance = homeAppearanceSchema.parse({})

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  smartPicks: 'پیشنهاد هوشمند',
  categories: 'دسته‌بندی‌ها',
  moods: 'انتخاب حال‌وهوا',
  combo: 'کمبو هوشمند',
  story: 'استوری منو',
}
