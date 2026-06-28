import type { OrderItem } from '@chill-bar/shared'
import { getOrderItemExtraLabel, parseOrderItemModifiers } from '@chill-bar/shared'
import { formatPrice } from '../lib/format'

export function OrderItemExtras({ item }: { item: OrderItem }) {
  const modifiers = parseOrderItemModifiers(item.customConfig)
  const extra = getOrderItemExtraLabel(item.customConfig)

  if (modifiers.length === 0 && !extra) return null

  return (
    <div className="order-item-extras">
      {extra && <span className="order-item-extra-note">{extra}</span>}
      {modifiers.map((modifier) => (
        <span key={`${modifier.groupId}-${modifier.optionId}`} className="order-item-modifier">
          {modifier.groupName}: {modifier.optionName}
          {modifier.price > 0 ? ` (+${formatPrice(modifier.price)})` : ''}
        </span>
      ))}
    </div>
  )
}

export function OrderItemExtrasCompact({ item }: { item: OrderItem }) {
  const modifiers = parseOrderItemModifiers(item.customConfig)
  const extra = getOrderItemExtraLabel(item.customConfig)

  if (modifiers.length === 0 && !extra) return null

  const text = [
    extra,
    modifiers.map((modifier) => `${modifier.groupName}: ${modifier.optionName}`).join(' · '),
  ]
    .filter(Boolean)
    .join(' · ')

  return <span className="oc-item-mods">{text}</span>
}
