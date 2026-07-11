import type { MenuItem } from '../types'
import { resolveAssetUrl } from '../lib/branding'
import { cn } from '@/lib/utils'
import { VisualItemArt } from './VisualItemArt'

interface Props {
  item: Pick<MenuItem, 'category' | 'name' | 'imageUrl' | 'emoji'>
  size?: 'sm' | 'md' | 'lg' | 'fill'
  className?: string
}

export function MenuItemMedia({ item, size = 'md', className }: Props) {
  const src = resolveAssetUrl(item.imageUrl)

  if (src) {
    return (
      <img
        src={src}
        alt={item.name}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <VisualItemArt
      category={item.category}
      name={item.name}
      emoji={item.emoji}
      size={size}
      className={className}
    />
  )
}
