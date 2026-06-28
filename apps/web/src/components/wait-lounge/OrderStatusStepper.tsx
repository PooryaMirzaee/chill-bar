import { motion } from 'framer-motion'
import { Check, ChefHat, Clock, Package } from 'lucide-react'
import type { OrderStatus } from '@chill-bar/shared'
import { ORDER_STATUS_LABEL } from '@chill-bar/shared'
import { cn } from '@/lib/utils'

const STEPS: { status: OrderStatus; icon: typeof Clock; label: string }[] = [
  { status: 'PENDING', icon: Clock, label: ORDER_STATUS_LABEL.PENDING },
  { status: 'CONFIRMED', icon: Check, label: ORDER_STATUS_LABEL.CONFIRMED },
  { status: 'PREPARING', icon: ChefHat, label: ORDER_STATUS_LABEL.PREPARING },
  { status: 'READY', icon: Package, label: ORDER_STATUS_LABEL.READY },
]

const STATUS_INDEX: Record<OrderStatus, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERED: 4,
  CANCELLED: -1,
}

interface Props {
  status: OrderStatus
  estimatedMinutes: number
  bonusMultiplier?: number
}

export function OrderStatusStepper({ status, estimatedMinutes, bonusMultiplier }: Props) {
  const current = STATUS_INDEX[status]
  const progress = current < 0 ? 0 : Math.min(100, ((current + 0.5) / STEPS.length) * 100)

  return (
    <div className="space-y-4">
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <div className="grid grid-cols-4 gap-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const done = current > i
          const active = current === i
          return (
            <div key={step.status} className="flex flex-col items-center gap-1.5 text-center">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(242,101,34,0.35)]',
                  !done && !active && 'border-muted-foreground/20 text-muted-foreground/50',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  active ? 'font-semibold text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">زمان تقریبی آماده‌سازی</span>
        <span className="text-sm font-semibold">{estimatedMinutes} دقیقه</span>
      </div>

      {status === 'PREPARING' && bonusMultiplier && bonusMultiplier > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-center text-xs text-primary"
        >
          آشپزخانه شروع کرد! امتیاز بازی‌ها ×{bonusMultiplier}
        </motion.div>
      )}
    </div>
  )
}
