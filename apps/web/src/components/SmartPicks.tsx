import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { HomeAppearance } from '@chill-bar/shared'
import type { ScoredItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { MenuItemMedia } from './MenuItemMedia'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  picks: ScoredItem[]
  onSelect: (item: ScoredItem) => void
  onAdd: AddToCartHandler
  appearance: Pick<
    HomeAppearance,
    | 'smartPicksEyebrow'
    | 'smartPicksTitle'
    | 'smartPicksDescription'
    | 'smartPicksLayout'
    | 'smartPicksShowReason'
    | 'smartPicksShowRank'
    | 'smartPicksAnimate'
  >
}

function PickCard({
  item,
  index,
  appearance,
  onSelect,
  onAdd,
}: {
  item: ScoredItem
  index: number
  appearance: Props['appearance']
  onSelect: (item: ScoredItem) => void
  onAdd: AddToCartHandler
}) {
  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
      onClick={() => onSelect(item)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted/50">
        {appearance.smartPicksShowRank && (
          <span className="absolute start-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {index + 1}
          </span>
        )}
        <MenuItemMedia item={item} size="sm" />
      </div>
      <CardContent className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</h3>
        {appearance.smartPicksShowReason && (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">{item.reason}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-primary">{formatPrice(item.price)}</span>
          <Button
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              onAdd(item, e)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function SmartPicks({ picks, onSelect, onAdd, appearance }: Props) {
  if (!picks.length) return null

  const card = (item: ScoredItem, i: number) => {
    const inner = (
      <PickCard item={item} index={i} appearance={appearance} onSelect={onSelect} onAdd={onAdd} />
    )
    if (!appearance.smartPicksAnimate) {
      return (
        <div key={item.id} className={appearance.smartPicksLayout === 'grid' ? '' : 'w-[160px] shrink-0'}>
          {inner}
        </div>
      )
    }
    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: appearance.smartPicksLayout === 'carousel' ? 20 : 0, y: appearance.smartPicksLayout === 'grid' ? 12 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className={appearance.smartPicksLayout === 'grid' ? '' : 'w-[160px] shrink-0'}
      >
        {inner}
      </motion.div>
    )
  }

  return (
    <section>
      <SectionHeader
        eyebrow={appearance.smartPicksEyebrow}
        title={appearance.smartPicksTitle}
        description={appearance.smartPicksDescription}
      />

      {appearance.smartPicksLayout === 'carousel' ? (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 px-4 pb-2">{picks.map(card)}</div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className={cn('grid grid-cols-2 gap-3 px-4')}>{picks.map(card)}</div>
      )}
    </section>
  )
}
