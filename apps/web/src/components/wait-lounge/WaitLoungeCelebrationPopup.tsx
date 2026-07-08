import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, Sparkles, Trophy, X } from 'lucide-react'
import { formatChillPoints } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FLOATERS = ['🎮', '⭐', '🎯', '🍦', '✨', '🏆'] as const

interface Props {
  open: boolean
  orderCode: string
  title: string
  body: string
  cta: string
  laterLabel: string
  maxPoints?: number
  pointsLabel?: string
  onPlay: () => void
  onDismiss: () => void
}

export function WaitLoungeCelebrationPopup({
  open,
  orderCode,
  title,
  body,
  cta,
  laterLabel,
  maxPoints,
  pointsLabel,
  onPlay,
  onDismiss,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wait-lounge-celebration-title"
        >
          <button
            type="button"
            aria-label="بستن"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={onDismiss}
          />

          <motion.div
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-violet-400/30 bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 text-white shadow-2xl shadow-violet-950/50 touch-manipulation"
            initial={{ opacity: 0, y: 48, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-violet-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-fuchsia-500/20 blur-3xl" />

            {FLOATERS.map((emoji, i) => (
              <motion.span
                key={emoji}
                className="pointer-events-none absolute text-lg opacity-70"
                style={{
                  left: `${12 + (i * 14) % 72}%`,
                  top: `${8 + (i * 11) % 28}%`,
                }}
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, i % 2 === 0 ? 8 : -8, 0],
                  opacity: [0.45, 0.9, 0.45],
                }}
                transition={{
                  duration: 2.4 + i * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {emoji}
              </motion.span>
            ))}

            <button
              type="button"
              onClick={onDismiss}
              className="absolute end-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 backdrop-blur hover:bg-white/20 touch-manipulation"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative space-y-4 px-5 pb-5 pt-8 text-center">
              <motion.div
                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-500/40"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.08 }}
              >
                <span className="text-4xl">🎉</span>
              </motion.div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/90">
                  کد سفارش
                </p>
                <div className="mx-auto inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
                  <span className="text-2xl font-black tracking-[0.2em] text-white">{orderCode}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 id="wait-lounge-celebration-title" className="text-xl font-black leading-snug">
                  {title}
                </h2>
                <p className="text-sm leading-relaxed text-white/80">{body}</p>
              </div>

              {maxPoints != null && maxPoints > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
                    <Trophy className="h-3.5 w-3.5 text-amber-300" />
                    تا {formatChillPoints(maxPoints)} {pointsLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                    بازی حافظه و بیشتر
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <Button
                  size="lg"
                  className={cn(
                    'h-12 w-full gap-2 rounded-2xl border-0 bg-gradient-to-r from-violet-500 to-fuchsia-500',
                    'text-base font-bold text-white shadow-lg shadow-violet-600/30 hover:from-violet-400 hover:to-fuchsia-400 touch-manipulation',
                  )}
                  onClick={onPlay}
                >
                  <Gamepad2 className="h-5 w-5" />
                  {cta}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-white/70 hover:bg-white/10 hover:text-white touch-manipulation"
                  onClick={onDismiss}
                >
                  {laterLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
