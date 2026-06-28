import type { MenuModifierGroup, ModifierSelectionState } from '@chill-bar/shared'
import { toggleModifierSelection } from '@chill-bar/shared'
import { formatPrice } from '../lib/comboBuilder'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  groups: MenuModifierGroup[]
  selection: ModifierSelectionState
  onChange: (selection: ModifierSelectionState) => void
  error?: string
  compact?: boolean
}

export function ModifierPicker({ groups, selection, onChange, error, compact }: Props) {
  if (groups.length === 0) return null

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {groups.map((group) => (
        <div
          key={group.id}
          className={cn(
            'space-y-2 rounded-xl border bg-muted/30',
            compact ? 'p-2.5' : 'p-3',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>{group.name}</h4>
            {group.required && (
              <Badge variant="outline" className="text-[10px]">
                اجباری
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((option) => {
              const active = (selection[group.id] ?? []).includes(option.id)
              return (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-background hover:bg-accent',
                  )}
                  onClick={() => onChange(toggleModifierSelection(group, selection, option.id))}
                >
                  {option.emoji ? `${option.emoji} ` : ''}
                  {option.name}
                  {option.price > 0 ? ` (+${formatPrice(option.price)})` : ''}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
