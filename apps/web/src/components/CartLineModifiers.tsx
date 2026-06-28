import { useMemo } from 'react'
import {
  buildSelectedModifiers,
  selectionFromSelectedModifiers,
  type MenuModifierGroup,
  type SelectedModifier,
} from '@chill-bar/shared'
import { ModifierPicker } from './ModifierPicker'

interface Props {
  groups: MenuModifierGroup[]
  selectedModifiers: SelectedModifier[]
  onChange: (selectedModifiers: SelectedModifier[]) => void
}

export function CartLineModifiers({ groups, selectedModifiers, onChange }: Props) {
  const selection = useMemo(
    () => selectionFromSelectedModifiers(selectedModifiers),
    [selectedModifiers],
  )

  return (
    <ModifierPicker
      compact
      groups={groups}
      selection={selection}
      onChange={(next) => onChange(buildSelectedModifiers(groups, next))}
    />
  )
}
