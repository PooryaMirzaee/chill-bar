import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import type { MenuItem } from '../types'
import { pickCoffeeFortune } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Props {
  items: MenuItem[]
  onPickDrink?: (item: MenuItem) => void
  className?: string
}

type Phase = 'idle' | 'shaking' | 'revealed'

export function CoffeeFortune({ items, onPickDrink, className }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ReturnType<typeof pickCoffeeFortune> | null>(null)

  const suggestedItem = useMemo(() => {
    if (!result || items.length === 0) return null
    const match = items.find((item) => result.drinkHint.includes(item.name))
    return match ?? items[0] ?? null
  }, [items, result])

  const readFortune = () => {
    if (phase === 'shaking') return
    setPhase('shaking')
    window.setTimeout(() => {
      setResult(pickCoffeeFortune(items))
      setPhase('revealed')
      if (navigator.vibrate) navigator.vibrate([20, 40, 20])
    }, 1400)
  }

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-card to-card p-5 text-center shadow-lg',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-center gap-2 text-amber-200">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-lg font-bold">فال قهوه چیل بار</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        الهام‌گرفته از سنت فال قهوه — فنجان را تکان بده و ببین امروز چه پیشنهادی داری!
      </p>

      <motion.button
        type="button"
        className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-2 border-amber-400/50 bg-amber-500/10 text-5xl shadow-inner"
        animate={phase === 'shaking' ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.05, 1] } : { rotate: 0 }}
        transition={phase === 'shaking' ? { duration: 1.2, repeat: Infinity } : { duration: 0.3 }}
        onClick={readFortune}
        disabled={phase === 'shaking'}
        aria-label="تکان دادن فنجان فال"
      >
        ☕
      </motion.button>

      <p className="mt-3 text-xs text-muted-foreground">
        {phase === 'shaking' ? 'در حال خواندن فال…' : 'روی فنجان بزن یا تکان بده'}
      </p>

      <AnimatePresence>
        {phase === 'revealed' && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 space-y-3 rounded-xl border border-amber-500/20 bg-background/60 p-4 text-right"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xl">{result.luckyEmoji}</span>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-200">
                حال امروز: {result.mood}
              </span>
            </div>
            <p className="text-sm leading-relaxed">{result.fortune}</p>
            <p className="text-sm font-medium text-primary">{result.drinkHint}</p>
            {suggestedItem && onPickDrink && (
              <Button
                type="button"
                className="w-full"
                onClick={() => onPickDrink(suggestedItem)}
              >
                {suggestedItem.emoji} اضافه به سبد — {suggestedItem.name}
              </Button>
            )}
            <Button type="button" variant="outline" className="w-full" onClick={readFortune}>
              فال دوباره
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
