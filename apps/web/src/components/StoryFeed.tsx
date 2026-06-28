import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HomeAppearance } from '@chill-bar/shared'
import type { MenuItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/layout/SectionHeader'
import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  items: MenuItem[]
  onAdd: AddToCartHandler
  eyebrow: string
  title: string
  description: string
  badge: string
  autoRotateSeconds?: number
  showProgress?: boolean
  heroStyle?: HomeAppearance['storyHeroStyle']
}

export function StoryFeed({
  items,
  onAdd,
  eyebrow,
  title,
  description,
  badge,
  autoRotateSeconds = 4,
  showProgress = true,
  heroStyle = 'gradient',
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const featured = items.slice(0, 8)

  useEffect(() => {
    if (featured.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % featured.length)
    }, autoRotateSeconds * 1000)
    return () => clearInterval(timer)
  }, [featured.length, autoRotateSeconds])

  const current = featured[activeIndex]
  if (!current) return null

  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {featured.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-2xl transition-all',
              i === activeIndex
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-muted bg-muted/50 opacity-70',
            )}
            onClick={() => setActiveIndex(i)}
          >
            {item.emoji}
          </button>
        ))}
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="overflow-hidden">
              <div
                className={cn(
                  'flex h-32 items-center justify-center text-6xl',
                  heroStyle === 'gradient'
                    ? 'bg-gradient-to-br from-primary/20 to-primary/5'
                    : 'bg-muted/40',
                )}
              >
                {current.emoji}
              </div>
              <CardContent className="space-y-3 p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {badge}
                </span>
                <h3 className="font-bold">{current.name}</h3>
                <p className="text-sm text-muted-foreground">{current.categoryName}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{formatPrice(current.price)}</span>
                  <Button onClick={(e) => onAdd(current, e)}>سفارش بده</Button>
                </div>
                {showProgress && (
                  <div className="flex gap-1 pt-1">
                    {featured.map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-0.5 flex-1 rounded-full transition-colors',
                          i <= activeIndex ? 'bg-primary' : 'bg-muted',
                        )}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
