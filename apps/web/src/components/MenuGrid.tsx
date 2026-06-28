import { motion } from 'framer-motion'
import { Plus, ShoppingBag } from 'lucide-react'
import type { Category, MenuAppearance } from '@chill-bar/shared'
import { formatMenuDescription, resolveCategoryVisual } from '@chill-bar/shared'
import type { MenuItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { MenuItemMedia } from './MenuItemMedia'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  categories: Category[]
  items: MenuItem[]
  activeCategory: string | null
  onCategoryChange: (id: string | null) => void
  onSelect: (item: MenuItem) => void
  onAdd: AddToCartHandler
  searchQuery: string
  title: string
  appearance: MenuAppearance
}

const IMAGE_RATIO_CLASS: Record<MenuAppearance['imageRatio'], string> = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
}

const GRID_COLS: Record<MenuAppearance['gridColumns'], string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
}

const LIST_THUMB: Record<MenuAppearance['listThumbnailSize'], string> = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
}

function chipClass(variant: MenuAppearance['chipVariant'], active: boolean): string {
  if (variant === 'soft') {
    return cn(
      'rounded-xl border-0',
      active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-foreground hover:bg-primary/15',
    )
  }
  if (variant === 'outline') {
    return cn('rounded-xl', active ? '' : 'border-muted-foreground/30')
  }
  return 'rounded-full'
}

export function MenuGrid({
  categories,
  items,
  activeCategory,
  onCategoryChange,
  onSelect,
  onAdd,
  searchQuery,
  title,
  appearance: a,
}: Props) {
  const filtered = items.filter((item) => {
    const matchCat = !activeCategory || item.category === activeCategory
    const matchSearch =
      !searchQuery || item.name.includes(searchQuery) || item.categoryName.includes(searchQuery)
    return matchCat && matchSearch
  })

  const grouped = activeCategory
    ? { [activeCategory]: filtered }
    : categories.reduce<Record<string, MenuItem[]>>((acc, cat) => {
        const catItems = filtered.filter((i) => i.category === cat.id)
        if (catItems.length) acc[cat.id] = catItems
        return acc
      }, {})

  const cardClass = cn(
    'cursor-pointer overflow-hidden transition-shadow',
    a.cardVariant === 'minimal' && 'border-0 shadow-none bg-muted/30',
    a.cardVariant === 'elevated' && 'shadow-lg hover:shadow-xl',
    a.cardVariant === 'default' && a.cardShowShadow && 'hover:shadow-md',
    !a.cardShowShadow && 'shadow-none',
  )

  const renderAddButton = (item: MenuItem) => {
    if (a.addButtonStyle === 'pill') {
      return (
        <Button
          size="sm"
          className="h-8 rounded-full px-3 text-xs"
          onClick={(ev) => {
            ev.stopPropagation()
            onAdd(item, ev)
          }}
        >
          <ShoppingBag className="ml-1 h-3.5 w-3.5" />
          افزودن
        </Button>
      )
    }
    return (
      <Button
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={(ev) => {
          ev.stopPropagation()
          onAdd(item, ev)
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    )
  }

  const renderCard = (item: MenuItem, i: number) => {
    const body = (
      <>
        {a.layout === 'cards' ? (
          <>
            <div className={cn('relative overflow-hidden bg-muted/50', IMAGE_RATIO_CLASS[a.imageRatio])}>
              <MenuItemMedia item={item} size="fill" />
            </div>
            <CardContent className={cn('space-y-2', a.cardVariant === 'minimal' ? 'p-2.5' : 'p-3')}>
              {(a.showItemCategoryBadge || a.showModifierBadge) && (
                <div className="flex flex-wrap items-center gap-1">
                  {a.showItemCategoryBadge && (
                    <Badge variant="secondary" className="text-[10px]">
                      {item.categoryName}
                    </Badge>
                  )}
                  {a.showModifierBadge && (item.modifiers?.length ?? 0) > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {item.modifiers!.length} آپشن
                    </Badge>
                  )}
                </div>
              )}
              <h4 className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</h4>
              <div className="flex items-center justify-between gap-2">
                {a.showPrice ? (
                  <span className="text-sm font-bold text-primary">{formatPrice(item.price)}</span>
                ) : (
                  <span />
                )}
                {a.addButtonStyle === 'icon' ? renderAddButton(item) : null}
              </div>
              {a.addButtonStyle === 'pill' && (
                <div className="flex justify-end">{renderAddButton(item)}</div>
              )}
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center gap-3 p-3">
            <div className={cn('relative shrink-0 overflow-hidden rounded-xl bg-muted/50', LIST_THUMB[a.listThumbnailSize])}>
              <MenuItemMedia item={item} size="fill" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="truncate text-sm font-semibold">{item.name}</h4>
              {a.showItemCategoryBadge && (
                <Badge variant="secondary" className="text-[10px]">
                  {item.categoryName}
                </Badge>
              )}
              {a.showPrice && <p className="text-sm font-bold text-primary">{formatPrice(item.price)}</p>}
            </div>
            {renderAddButton(item)}
          </CardContent>
        )}
      </>
    )

    const card = (
      <Card className={cardClass} onClick={() => onSelect(item)}>
        {body}
      </Card>
    )

    if (!a.animateCards) return <div key={item.id}>{card}</div>

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.03, 0.3) }}
      >
        {card}
      </motion.div>
    )
  }

  return (
    <section>
      {a.showSectionHeader && (
        <SectionHeader
          eyebrow={a.sectionEyebrow}
          title={title}
          description={formatMenuDescription(a.sectionDescriptionTemplate, filtered.length)}
        />
      )}

      {a.showCategoryChips && (
        <ScrollArea
          className={cn(
            'w-full whitespace-nowrap px-4 pb-4',
            a.stickyCategoryBar && 'sticky top-[calc(3.5rem+1px)] z-40 bg-background/95 py-2 backdrop-blur-md',
          )}
        >
          <div className="flex gap-2">
            {a.showAllChip && (
              <Button
                variant={!activeCategory ? 'default' : a.chipVariant === 'outline' ? 'outline' : 'secondary'}
                size="sm"
                className={chipClass(a.chipVariant, !activeCategory)}
                onClick={() => onCategoryChange(null)}
              >
                همه
              </Button>
            )}
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : a.chipVariant === 'outline' ? 'outline' : 'secondary'}
                size="sm"
                className={chipClass(a.chipVariant, activeCategory === cat.id)}
                onClick={() => onCategoryChange(cat.id)}
              >
                {cat.emoji} {cat.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {Object.entries(grouped).map(([catId, catItems]) => {
        const cat = categories.find((c) => c.id === catId)
        const showHeader = !activeCategory && cat && a.categoryHeaderStyle !== 'hidden'
        return (
          <div key={catId} className="mb-6">
            {showHeader && cat && (
              <div
                className={cn(
                  'mx-4 mb-3 rounded-xl px-4 py-3',
                  a.categoryHeaderStyle === 'plain' && 'border bg-muted/60 text-foreground',
                )}
                style={
                  a.categoryHeaderStyle === 'gradient'
                    ? { background: resolveCategoryVisual(cat).gradient }
                    : undefined
                }
              >
                <h3 className={cn('font-bold', a.categoryHeaderStyle === 'gradient' && 'text-white')}>
                  {cat.emoji} {cat.name}
                </h3>
              </div>
            )}
            <div
              className={cn(
                a.layout === 'cards' ? 'grid px-4' : 'flex flex-col gap-2 px-4',
                a.layout === 'cards' && GRID_COLS[a.gridColumns],
              )}
              style={a.layout === 'cards' ? { gap: `${a.gridGap}rem` } : undefined}
            >
              {catItems.map((item, i) => renderCard(item, i))}
            </div>
          </div>
        )
      })}

      {filtered.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{a.emptyStateMessage}</p>
      )}
    </section>
  )
}
