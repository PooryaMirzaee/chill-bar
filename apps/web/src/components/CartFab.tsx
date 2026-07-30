import { ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '../store/cart'
import { useCartFeedback } from '../lib/cartFeedback'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onClick: () => void
  className?: string
}

export function CartFab({ onClick, className }: Props) {
  const { count } = useCart()
  const { cartFabRef, cartBump, cartRing } = useCartFeedback()
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      className={cn('fixed z-40', className)}
      animate={cartBump && !reducedMotion ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}
      key={cartBump}
    >
      <div className="relative">
        <AnimateRing ringKey={cartRing} reducedMotion={reducedMotion} />
        <Button
          ref={cartFabRef}
          size="icon"
          className="relative h-11 min-h-11 w-11 min-w-11 rounded-full shadow-lg shadow-primary/20 ring-2 ring-primary/20"
          onClick={onClick}
          aria-label={count > 0 ? `سبد خرید، ${count} آیتم` : 'سبد خرید'}
        >
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <motion.span
              key={count}
              initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Badge className="absolute -start-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
                {count}
              </Badge>
            </motion.span>
          )}
        </Button>
        {count > 0 && (
          <span className="pointer-events-none absolute -bottom-5 start-1/2 w-max -translate-x-1/2 text-xs font-medium text-primary">
            سبد
          </span>
        )}
      </div>
    </motion.div>
  )
}

function AnimateRing({ ringKey, reducedMotion }: { ringKey: number; reducedMotion: boolean }) {
  if (!ringKey || reducedMotion) return null
  return (
    <motion.span
      key={ringKey}
      className="pointer-events-none absolute inset-0 rounded-full border-2 border-primary"
      initial={{ scale: 1, opacity: 0.75 }}
      animate={{ scale: 1.9, opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  )
}
