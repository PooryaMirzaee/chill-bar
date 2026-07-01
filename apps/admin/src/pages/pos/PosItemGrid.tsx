import { useMemo, useState } from 'react'
import type { PosMenuCategory, PosMenuItem } from '@chill-bar/shared'
import { Search } from 'lucide-react'
import { formatPrice } from '../../lib/format'

interface PosItemGridProps {
  categories: PosMenuCategory[]
  items: PosMenuItem[]
  onSelectItem: (item: PosMenuItem) => void
}

export function PosItemGrid({ categories, items, onSelectItem }: PosItemGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let list = items
    if (activeCategory !== 'all') {
      list = list.filter((i) => i.categoryId === activeCategory)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((i) => i.name.toLowerCase().includes(q))
    }
    return list
  }, [items, activeCategory, search])

  return (
    <div className="pos-grid-wrap">
      <div className="pos-search">
        <Search size={16} />
        <input
          placeholder="جستجوی آیتم..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pos-categories">
        <button
          type="button"
          className={activeCategory === 'all' ? 'active' : ''}
          onClick={() => setActiveCategory('all')}
        >
          همه
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={activeCategory === cat.id ? 'active' : ''}
            onClick={() => setActiveCategory(cat.id)}
            style={{ ['--cat-accent' as string]: cat.accentColor }}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      <div className="pos-item-grid">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            className="pos-item-card"
            onClick={() => onSelectItem(item)}
          >
            <span className="pos-item-emoji">{item.emoji}</span>
            <span className="pos-item-name">{item.name}</span>
            <span className="pos-item-price">{formatPrice(item.price)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
