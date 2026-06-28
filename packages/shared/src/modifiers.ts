import type { MenuModifierGroup, SelectedModifier } from './types'

export type ModifierSelectionState = Record<string, string[]>

export function parseMenuModifiers(raw: unknown): MenuModifierGroup[] {
  if (!Array.isArray(raw)) return []
  return raw as MenuModifierGroup[]
}

export function buildSelectedModifiers(
  groups: MenuModifierGroup[],
  selection: ModifierSelectionState,
): SelectedModifier[] {
  const result: SelectedModifier[] = []
  for (const group of groups) {
    for (const optionId of selection[group.id] ?? []) {
      const option = group.options.find((o) => o.id === optionId)
      if (option) {
        result.push({
          groupId: group.id,
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          price: option.price,
        })
      }
    }
  }
  return result
}

export function computeUnitPrice(basePrice: number, selected: SelectedModifier[]): number {
  return basePrice + selected.reduce((sum, modifier) => sum + modifier.price, 0)
}

export function buildCartLineId(itemId: string, selected: SelectedModifier[]): string {
  if (selected.length === 0) return itemId
  const suffix = selected
    .map((modifier) => modifier.optionId)
    .sort()
    .join(',')
  return `${itemId}::${suffix}`
}

export function validateModifierSelection(
  groups: MenuModifierGroup[],
  selection: ModifierSelectionState,
): string | null {
  for (const group of groups) {
    const count = (selection[group.id] ?? []).length
    if (group.required && count === 0) {
      return `«${group.name}» را انتخاب کنید`
    }
    if (group.type === 'single' && count > 1) {
      return `فقط یک گزینه برای «${group.name}» مجاز است`
    }
  }
  return null
}

export function toggleModifierSelection(
  group: MenuModifierGroup,
  selection: ModifierSelectionState,
  optionId: string,
): ModifierSelectionState {
  const current = selection[group.id] ?? []
  if (group.type === 'single') {
    const next = current.includes(optionId) ? [] : [optionId]
    return { ...selection, [group.id]: next }
  }
  const next = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
  return { ...selection, [group.id]: next }
}

export function selectionFromSelectedModifiers(
  selected: SelectedModifier[],
): ModifierSelectionState {
  const state: ModifierSelectionState = {}
  for (const modifier of selected) {
    if (!state[modifier.groupId]) state[modifier.groupId] = []
    if (!state[modifier.groupId].includes(modifier.optionId)) {
      state[modifier.groupId].push(modifier.optionId)
    }
  }
  return state
}

function isSelectedModifier(value: unknown): value is SelectedModifier {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.groupName === 'string' && typeof row.optionName === 'string'
}

export function parseOrderItemModifiers(
  config: Record<string, unknown> | null | undefined,
): SelectedModifier[] {
  if (!config || !Array.isArray(config.modifiers)) return []
  return config.modifiers.filter(isSelectedModifier)
}

export function getOrderItemExtraLabel(
  config: Record<string, unknown> | null | undefined,
): string | null {
  if (!config) return null
  if (config.isScratchReward) return 'جایزه کارت شانس'
  if (typeof config.detail === 'string' && config.detail.trim()) return config.detail.trim()
  return null
}
