import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IceCreamOptions, PosMenuItem } from '@chill-bar/shared'
import type { PosCartApi } from '../../lib/usePosCart'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'

interface PosIceCreamModalProps {
  hubItem: PosMenuItem
  cart: PosCartApi
  onClose: () => void
}

export function PosIceCreamModal({ hubItem, cart, onClose }: PosIceCreamModalProps) {
  const { data: ice } = useQuery({
    queryKey: ['ice-cream-options'],
    queryFn: () => api<IceCreamOptions>('/api/ice-cream/options'),
  })

  const [baseId, setBaseId] = useState<string | null>(null)
  const [coatingId, setCoatingId] = useState<string | null>(null)
  const [fillingId, setFillingId] = useState<string | null>(null)

  const price = useMemo(() => {
    if (!ice) return 0
    const base = ice.bases.find((b) => b.id === baseId)
    const coating = ice.coatings.find((c) => c.id === coatingId)
    const filling = ice.fillings.find((f) => f.id === fillingId)
    return (
      ice.basePrice +
      (base?.priceMod ?? 0) +
      (coating?.priceMod ?? 0) +
      (filling?.priceMod ?? 0)
    )
  }, [ice, baseId, coatingId, fillingId])

  const name = useMemo(() => {
    if (!ice) return 'بستنی سفارشی'
    const parts = [
      ice.bases.find((b) => b.id === baseId)?.name,
      ice.coatings.find((c) => c.id === coatingId)?.name,
      ice.fillings.find((f) => f.id === fillingId)?.name,
    ].filter(Boolean)
    return parts.length ? `بستنی ${parts.join(' / ')}` : 'بستنی سفارشی'
  }, [ice, baseId, coatingId, fillingId])

  const handleAdd = () => {
    if (!ice || !baseId) return
    cart.addCustomLine({
      menuItemId: hubItem.id,
      name,
      emoji: '🍦',
      unitPrice: price,
      quantity: 1,
      selectedModifiers: [],
      customConfig: {
        iceCream: { base: baseId, coating: coatingId, filling: fillingId },
      },
    })
    onClose()
  }

  if (!ice?.enabled) {
    return (
      <div className="pos-modal-overlay" onClick={onClose}>
        <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
          <p>سازنده بستنی غیرفعال است</p>
          <button type="button" className="btn-primary" onClick={onClose}>
            بستن
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal pos-modal-wide" onClick={(e) => e.stopPropagation()}>
        <header className="pos-modal-head">
          <h3>🍦 ساخت بستنی</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="pos-ice-step">
          <h4>طعم پایه</h4>
          <div className="pos-modifier-options">
            {ice.bases.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={baseId === opt.id ? 'active' : ''}
                onClick={() => setBaseId(opt.id)}
              >
                {opt.emoji} {opt.name}
                {opt.priceMod !== 0 && <small>+{formatPrice(opt.priceMod)}</small>}
              </button>
            ))}
          </div>
        </section>

        <section className="pos-ice-step">
          <h4>روکش</h4>
          <div className="pos-modifier-options">
            {ice.coatings.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={coatingId === opt.id ? 'active' : ''}
                onClick={() => setCoatingId(opt.id)}
              >
                {opt.emoji} {opt.name}
              </button>
            ))}
          </div>
        </section>

        <section className="pos-ice-step">
          <h4>فیلینگ</h4>
          <div className="pos-modifier-options">
            {ice.fillings.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={fillingId === opt.id ? 'active' : ''}
                onClick={() => setFillingId(opt.id)}
              >
                {opt.emoji} {opt.name}
              </button>
            ))}
          </div>
        </section>

        <div className="pos-ice-price">
          <span>قیمت</span>
          <strong>{formatPrice(price)}</strong>
        </div>

        <button type="button" className="btn-primary" disabled={!baseId} onClick={handleAdd}>
          افزودن به سبد
        </button>
      </div>
    </div>
  )
}
