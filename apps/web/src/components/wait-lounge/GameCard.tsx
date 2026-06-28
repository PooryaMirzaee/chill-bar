import { motion } from 'framer-motion'
import { ChevronLeft, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description: string
  emoji: string
  gradient: string
  featured?: boolean
  disabled?: boolean
  onClick: () => void
}

export function GameCard({
  title,
  description,
  emoji,
  gradient,
  featured,
  disabled,
  onClick,
}: Props) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl border text-right transition disabled:opacity-45',
        featured ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-border/60',
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-bl opacity-90', gradient)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_50%)]" />

      <div className="relative flex items-center gap-4 p-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/20 text-4xl backdrop-blur-sm">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-white">{title}</h4>
            {featured && <Star className="h-3.5 w-3.5 fill-white/90 text-white/90" />}
          </div>
          <p className="mt-0.5 text-xs text-white/75">{description}</p>
        </div>
        <ChevronLeft className="h-5 w-5 shrink-0 text-white/60 transition group-hover:text-white" />
      </div>
    </motion.button>
  )
}
