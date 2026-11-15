import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  buildCartLineId,
  buildSelectedModifiers,
  computeUnitPrice,
  validateModifierSelection,
  type ModifierSelectionState,
} from '@chill-bar/shared'
import type { PairingResult } from '@chill-bar/shared'
import type { MenuItem } from '../types'
import { formatMenuPrice, formatPrice, isOptionPriced, startingPrice } from '../lib/comboBuilder'
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
  pairing: PairingResult | null
  pairingSectionTitle?: string
  onClose: () => void
  onAdd: AddToCartHandler
}

export function ItemDetail({ item, pairing, pairingSectionTitle = 'پیشنهاد ترکیب', onClose, onAdd }: Props) {
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
  const optionPriced = item ? isOptionPriced(item) : false
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
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-[1.75rem] px-0">
        {item && (
          <>
            <div className="atelier-detail-hero flex items-center justify-center">
              {imageSrc ? (
                <img src={imageSrc} alt={item.name} />
              ) : (
                <span className="relative z-10 text-7xl">{item.emoji}</span>
              )}
            </div>

            <div className="space-y-5 p-6">
              <SheetHeader className="space-y-2.5 text-right">
                <Badge variant="secondary" className="w-fit rounded-full px-2.5">
                  {item.categoryName}
                </Badge>
                <SheetTitle className="font-display text-[1.65rem] leading-none tracking-normal">
                  {item.name}
                </SheetTitle>
                {item.description && (
                  <SheetDescription className="text-right text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </SheetDescription>
                )}
              </SheetHeader>

              {optionPriced && unitPrice <= 0 ? (
                <div className="space-y-1">
                  <div className="font-display text-[1.85rem] leading-none text-primary">
                    <span className="ml-1 font-sans text-base font-medium text-muted-foreground">از</span>
                    {formatPrice(startingPrice(item))}
                  </div>
                  <p className="text-xs text-muted-foreground">گزینه‌ی دلخواهت رو انتخاب کن تا قیمت نهایی رو ببینی</p>
                </div>
              ) : (
                <div className="font-display text-[1.85rem] leading-none text-primary">
                  {formatPrice(unitPrice)}
                  {item.price > 0 && unitPrice !== item.price && (
                    <span className="mr-2 font-sans text-sm font-normal text-muted-foreground line-through">
                      {formatPrice(item.price)}
                    </span>
                  )}
                </div>
              )}

              <ModifierPicker
                zeroBase={item.price <= 0}
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
                  <h4 className="text-sm font-semibold">{pairingSectionTitle}</h4>
                  <p className="text-xs text-muted-foreground">{pairing.reason}</p>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-right transition-colors hover:bg-accent"
                    onClick={(e) => onAdd(pairing.item, e)}
                  >
                    <span className="text-2xl">{pairing.item.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{pairing.item.name}</span>
                    {formatMenuPrice(pairing.item) && (
                      <span className="text-sm font-semibold text-primary">{formatMenuPrice(pairing.item)}</span>
                    )}
                  </button>
                </div>
              )}

              <Button
                className="h-12 w-full rounded-full text-base font-bold shadow-[0_12px_28px_color-mix(in_srgb,var(--scoop-orange)_35%,transparent)]"
                size="lg"
                onClick={(e) => handleAdd(item, e)}
              >
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
