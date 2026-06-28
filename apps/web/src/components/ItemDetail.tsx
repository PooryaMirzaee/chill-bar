import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  buildCartLineId,
  buildSelectedModifiers,
  computeUnitPrice,
  validateModifierSelection,
  type ModifierSelectionState,
} from '@chill-bar/shared'
import type { MenuItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { resolveAssetUrl } from '../lib/branding'
import { ModifierPicker } from './ModifierPicker'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  item: MenuItem | null
  pairing: MenuItem | null
  onClose: () => void
  onAdd: AddToCartHandler
}

export function ItemDetail({ item, pairing, onClose, onAdd }: Props) {
  const [selection, setSelection] = useState<ModifierSelectionState>({})
  const [selectionError, setSelectionError] = useState('')

  const groups = item?.modifiers ?? []

  useEffect(() => {
    setSelection({})
    setSelectionError('')
  }, [item?.id])

  const selectedModifiers = useMemo(
    () => (item ? buildSelectedModifiers(groups, selection) : []),
    [item, groups, selection],
  )
  const unitPrice = item ? computeUnitPrice(item.price, selectedModifiers) : 0
  const imageSrc = resolveAssetUrl(item?.imageUrl)

  const handleAdd = (target: MenuItem, origin?: Parameters<AddToCartHandler>[1]) => {
    const targetGroups = target.modifiers ?? []
    if (targetGroups.length > 0) {
      const error = validateModifierSelection(targetGroups, selection)
      if (error) {
        setSelectionError(error)
        return
      }
    }

    const modifiers = buildSelectedModifiers(targetGroups, selection)
    const linePrice = computeUnitPrice(target.price, modifiers)
    onAdd(
      {
        ...target,
        selectedModifiers: modifiers,
        unitPrice: linePrice,
        cartLineId: buildCartLineId(target.id, modifiers),
      },
      origin,
    )
    setSelection({})
    setSelectionError('')
    onClose()
  }

  return (
    <Sheet
      open={!!item}
      onOpenChange={(open) => {
        if (!open) {
          setSelection({})
          setSelectionError('')
          onClose()
        }
      }}
    >
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl px-0">
        {item && (
          <>
            <div className="relative flex h-48 items-center justify-center bg-muted">
              {imageSrc ? (
                <img className="h-full w-full object-cover" src={imageSrc} alt={item.name} />
              ) : (
                <span className="text-7xl">{item.emoji}</span>
              )}
            </div>

            <div className="space-y-4 p-6">
              <SheetHeader className="space-y-2 text-right">
                <Badge variant="secondary" className="w-fit">
                  {item.categoryName}
                </Badge>
                <SheetTitle className="text-xl">{item.name}</SheetTitle>
                {item.description && (
                  <SheetDescription className="text-right text-sm leading-relaxed">
                    {item.description}
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="text-2xl font-bold text-primary">
                {formatPrice(unitPrice)}
                {unitPrice !== item.price && (
                  <span className="mr-2 text-sm font-normal text-muted-foreground line-through">
                    {formatPrice(item.price)}
                  </span>
                )}
              </div>

              <ModifierPicker
                groups={groups}
                selection={selection}
                onChange={(next) => {
                  setSelectionError('')
                  setSelection(next)
                }}
                error={selectionError}
              />

              {pairing && (
                <div className="space-y-2 rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold">پیشنهاد ترکیب</h4>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-right transition-colors hover:bg-accent"
                    onClick={(e) => onAdd(pairing, e)}
                  >
                    <span className="text-2xl">{pairing.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{pairing.name}</span>
                    <span className="text-sm font-semibold text-primary">{formatPrice(pairing.price)}</span>
                  </button>
                </div>
              )}

              <Button className="w-full" size="lg" onClick={(e) => handleAdd(item, e)}>
                <Plus className="h-4 w-4" />
                افزودن به سفارش
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
