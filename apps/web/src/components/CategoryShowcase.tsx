import { motion } from 'framer-motion'
import type { Category } from '../types'
import type { HomeAppearance } from '@chill-bar/shared'
import { resolveCategoryVisual } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

interface Props {
  categories: Category[]
  activeId: string | null
  onSelect: (id: string) => void
  header?: Pick<HomeAppearance, 'categoriesEyebrow' | 'categoriesTitle' | 'categoriesDescription'>
}

export function CategoryShowcase({ categories, activeId, onSelect, header }: Props) {
  if (categories.length === 0) return null

  return (
    <section>
      <SectionHeader
        eyebrow={header?.categoriesEyebrow ?? 'کاوش'}
        title={header?.categoriesTitle ?? 'دسته‌بندی‌ها'}
        description={header?.categoriesDescription ?? 'هر بخش، تجربه‌ای متفاوت'}
      />

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 pb-2">
          {categories.map((cat, i) => {
            const visual = resolveCategoryVisual(cat)
            const active = activeId === cat.id
            return (
              <motion.button
                key={cat.id}
                type="button"
                className={cn(
                  'relative flex h-[7.5rem] w-[6.75rem] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[1.4rem] text-[var(--cocoa)] shadow-[0_10px_28px_color-mix(in_srgb,var(--cocoa)_10%,transparent)] transition-transform',
                  active
                    ? 'ring-2 ring-[var(--scoop-orange)] ring-offset-2 ring-offset-[var(--stone)]'
                    : 'ring-1 ring-black/5',
                )}
                style={{
                  background: `linear-gradient(160deg, color-mix(in srgb, ${visual.accent || '#f26522'} 28%, white), var(--scoop))`,
                }}
                onClick={() => onSelect(cat.id)}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.25 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl drop-shadow-sm">{cat.emoji}</span>
                <span className="px-1 text-center text-[11px] font-bold leading-tight">{cat.name}</span>
                {cat.showCustomBadge && (
                  <Badge className="absolute bottom-2 bg-[var(--cocoa)]/80 text-[9px] text-white hover:bg-[var(--cocoa)]/80">
                    سفارشی
                  </Badge>
                )}
              </motion.button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  )
}
