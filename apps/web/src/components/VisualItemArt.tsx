import { resolveCategoryVisual } from '@chill-bar/shared'
import { getItemVisualHint } from '../lib/categoryVisuals'
import { cn } from '@/lib/utils'

interface Props {
  category: string
  categoryAccent?: string
  name: string
  emoji?: string
  size?: 'sm' | 'md' | 'lg' | 'fill'
  className?: string
}

export function VisualItemArt({
  category,
  categoryAccent,
  name,
  emoji,
  size = 'md',
  className,
}: Props) {
  const visual = resolveCategoryVisual({ id: category, accentColor: categoryAccent })
  const hint = emoji || getItemVisualHint(name, category)

  return (
    <div
      className={cn(`visual-item-art visual-item-art--${size}`, className)}
      style={{
        background: visual.gradient,
        '--art-glow': visual.glow,
        '--art-accent': visual.accent,
      } as React.CSSProperties}
    >
      <div className="visual-item-pattern" style={{ background: visual.pattern }} />
      <div className="visual-item-shine" />
      <span className="visual-item-hint">{hint}</span>
      <svg className="visual-item-svg" viewBox="0 0 60 60" aria-hidden>
        <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx="30" cy="30" r="18" fill="rgba(255,255,255,0.08)" />
      </svg>
    </div>
  )
}
