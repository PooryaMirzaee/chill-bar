import { motion } from 'framer-motion'
import { Gamepad2, Sparkles, ChevronLeft, Brain, Trophy } from 'lucide-react'
import { formatChillPoints } from '@chill-bar/shared'
import { cn } from '@/lib/utils'

const SURFACE_CLASS =
  'relative overflow-hidden border border-violet-500/25 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 text-white shadow-xl shadow-violet-950/40'

interface CardProps {
  title: string
  subtitle: string
  cta: string
  maxPoints?: number
  pointsLabel?: string
  sessionPoints?: number
  onClick: () => void
  className?: string
}

export function WaitLoungePromoCard({
  title,
  subtitle,
  cta,
  maxPoints,
  pointsLabel,
  sessionPoints = 0,
  onClick,
  className,
}: CardProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        SURFACE_CLASS,
        'w-full rounded-2xl p-4 text-right transition hover:border-violet-400/40',
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-indigo-500/15 blur-2xl" />

      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <span className="text-2xl">🎮</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-violet-200/90">سالن انتظار چیل</p>
            <h3 className="mt-0.5 text-base font-bold leading-snug">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/75">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium">
            <Brain className="h-3 w-3 text-violet-200" />
            بازی حافظه
          </span>
          {maxPoints != null && maxPoints > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium">
              <Trophy className="h-3 w-3 text-violet-200" />
              تا {formatChillPoints(maxPoints)} {pointsLabel}
            </span>
          )}
          {sessionPoints > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-medium text-emerald-100">
              <Sparkles className="h-3 w-3" />
              {formatChillPoints(sessionPoints)} جمع کردی
            </span>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
          <span className="text-sm font-semibold">{cta}</span>
          <ChevronLeft className="h-4 w-4 text-white/70" />
        </div>
      </div>
    </motion.button>
  )
}

interface FabProps {
  title: string
  subtitle: string
  sessionPoints?: number
  pointsLabel?: string
  active?: boolean
  onClick: () => void
  className?: string
}

export function WaitLoungeFabButton({
  title,
  subtitle,
  sessionPoints = 0,
  pointsLabel,
  active,
  onClick,
  className,
}: FabProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        SURFACE_CLASS,
        'fixed z-40 flex items-center gap-3 rounded-2xl px-4 py-3',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.18),transparent_55%)]" />
      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
        <Gamepad2 className="h-5 w-5" />
      </div>
      <div className="relative text-right">
        <p className="text-sm font-bold leading-tight">{title}</p>
        {sessionPoints > 0 ? (
          <p className="flex items-center gap-1 text-[11px] text-violet-100/90">
            <Sparkles className="h-3 w-3" />
            {formatChillPoints(sessionPoints)} {pointsLabel}
          </p>
        ) : (
          <p className="text-[11px] text-white/70">{subtitle}</p>
        )}
      </div>
      {active && (
        <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-violet-300 ring-2 ring-violet-950/80" />
      )}
    </motion.button>
  )
}
