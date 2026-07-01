import { useState } from 'react'
import type { MenuModifierGroup, PosMenuItem } from '@chill-bar/shared'
import type { ModifierSelectionState } from '@chill-bar/shared'
import { validateModifierSelection } from '@chill-bar/shared'
import type { PosCartApi } from '../../lib/usePosCart'
import { formatPrice } from '../../lib/format'

interface PosModifierModalProps {
  item: PosMenuItem
  groups: MenuModifierGroup[]
  cart: PosCartApi
  onClose: () => void
}

export function PosModifierModal({ item, groups, cart, onClose }: PosModifierModalProps) {
  const [selection, setSelection] = useState<ModifierSelectionState>({})
  const [error, setError] = useState<string | null>(null)

  const toggle = (group: MenuModifierGroup, optionId: string) => {
    setSelection((prev) => {
      const current = prev[group.id] ?? []
      if (group.type === 'single') {
        return { ...prev, [group.id]: [optionId] }
      }
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
      return { ...prev, [group.id]: next }
    })
  }

  const handleAdd = () => {
    const err = validateModifierSelection(groups, selection)
    if (err) {
      setError(err)
      return
    }
    const selected = cart.buildSelectionState(groups, selection)
    cart.addItem(item, selected)
    onClose()
  }

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal pos-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="pos-modal-head">
          <h3>
            {item.emoji} {item.name}
          </h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className="pos-modifier-groups">
          {groups.map((group) => (
            <div key={group.id} className="pos-modifier-group">
              <h4>
                {group.name}
                {group.required && <span className="req">*</span>}
              </h4>
              <div className="pos-modifier-options">
                {group.options.map((opt) => {
                  const selected = (selection[group.id] ?? []).includes(opt.id)
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={selected ? 'active' : ''}
                      onClick={() => toggle(group, opt.id)}
                    >
                      {opt.emoji && <span>{opt.emoji}</span>}
                      {opt.name}
                      {opt.price > 0 && <small>+{formatPrice(opt.price)}</small>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="pos-error">{error}</p>}
        <button type="button" className="btn-primary" onClick={handleAdd}>
          افزودن به سبد
        </button>
      </div>
    </div>
  )
}
