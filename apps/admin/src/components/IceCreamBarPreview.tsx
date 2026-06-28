import { useId } from 'react'
import type { IceCreamOption } from '@chill-bar/shared'
import { darken, lighten, resolveBaseProfile, resolveCoatingProfile } from '@chill-bar/shared'

interface Build {
  base: IceCreamOption
  coating: IceCreamOption
  filling: IceCreamOption
}

interface Props {
  build: Build
  size?: 'lg' | 'sm'
}

export function IceCreamBarRenderer({ build, size = 'lg' }: Props) {
  const uid = useId().replace(/:/g, '')
  const baseP = resolveBaseProfile(build.base)
  const coatP = resolveCoatingProfile(build.coating)
  const hasCoating = build.coating.id !== 'none' && coatP.style !== 'none'
  const c = build.coating.color
  const coatLight = c === 'transparent' ? '#ccc' : lighten(c, 30)
  const coatDark = c === 'transparent' ? '#999' : darken(c, 25)

  const w = size === 'lg' ? 140 : 72
  const h = size === 'lg' ? 260 : 140

  return (
    <svg viewBox="0 0 120 260" width={w} height={h} className="ice-bar-preview" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={baseP.colors[0]} />
          <stop offset="55%" stopColor={baseP.colors[1]} />
          <stop offset="100%" stopColor={baseP.colors[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={coatLight} />
          <stop offset="100%" stopColor={coatDark} />
        </linearGradient>
        <radialGradient id={`${uid}-fill`} cx="42%" cy="28%">
          <stop offset="0%" stopColor={lighten(build.filling.color, 22)} />
          <stop offset="100%" stopColor={darken(build.filling.color, 16)} />
        </radialGradient>
      </defs>
      <rect x="48" y="210" width="24" height="40" rx="3" fill="#d4b878" />
      <ellipse cx="60" cy="210" rx="26" ry="5" fill="#f0eeea" />
      <rect x="38" y="78" width="44" height="132" fill={`url(#${uid}-base)`} rx="4" />
      {hasCoating && (
        <rect
          x="38"
          y={78 + (1 - (coatP.thickness ?? 1)) * 20}
          width="44"
          height={50 * (coatP.thickness ?? 1)}
          fill={`url(#${uid}-coat)`}
          opacity={coatP.style === 'dark-matte' ? 0.95 : 0.88}
          rx="3"
        />
      )}
      <ellipse cx="60" cy="74" rx="14" ry="8" fill={`url(#${uid}-fill)`} />
      <ellipse cx="60" cy="68" rx="9" ry="6" fill={build.filling.color} />
    </svg>
  )
}
