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
                  'relative flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 text-white shadow-sm transition-transform',
                  active ? 'border-primary ring-2 ring-primary/30' : 'border-transparent',
                )}
                style={{ background: visual.gradient }}
                onClick={() => onSelect(cat.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-xs font-bold">{cat.name}</span>
                {cat.showCustomBadge && (
                  <Badge className="absolute bottom-2 bg-white/20 text-[9px] text-white hover:bg-white/20">
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
