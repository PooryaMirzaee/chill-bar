import type { MenuItem } from '../types'

/** Prefer live menu row from API so images/modifiers stay in sync with admin. */
export function resolveLiveMenuItem(items: MenuItem[], item: MenuItem): MenuItem {
  return items.find((row) => row.id === item.id) ?? item
}

export function menuItemForCart(items: MenuItem[], item: MenuItem): MenuItem {
  const live = resolveLiveMenuItem(items, item)
  return {
    ...live,
    selectedModifiers: item.selectedModifiers,
    unitPrice: item.unitPrice,
    cartLineId: item.cartLineId,
  }
}

export function cartLineModifiers(cartItem: MenuItem, menuItems: MenuItem[]) {
  const live = menuItems.find((row) => row.id === cartItem.id)
  return live?.modifiers ?? cartItem.modifiers ?? []
}
