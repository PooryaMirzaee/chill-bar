import { useId } from 'react'
import type { IceCreamBuild } from '../data/iceCreamBuilder'
import type { IceCreamOption } from '../data/iceCreamBuilder'
import {
  getBaseProfile, getCoatingProfile, getFillingProfile,
  generateTextureDots, crunchyNutPieces,
} from '../lib/iceCreamVisualProfiles'
import { getCoatingStyle, darken, lighten } from '../lib/iceCreamGraphics'

export type RenderMode = 'full' | 'base-only' | 'coating-only' | 'filling-only' | 'mini'

interface Props {
  build: Partial<IceCreamBuild>
  mode?: RenderMode
  size?: 'lg' | 'sm' | 'xs'
}

const CX = 60
const TOP_Y = 78
const BOT_Y = 210
const RX = 22
const RY = 6
const BASE_BAND_H = 38

function renderFillingDollop(filling: IceCreamOption, uid: string) {
  const profile = getFillingProfile(filling)
  const c = filling.color
  const c2 = profile.secondaryColor || darken(c, 20)
  const g = `url(#${uid}-fill)`

  return (
    <g>
      <ellipse cx={CX} cy={TOP_Y - 4} rx="14" ry="7.5" fill={g} />
      <ellipse cx={CX} cy={TOP_Y - 10} rx="10" ry="6.5" fill={c} />
      <ellipse cx={CX + 1} cy={TOP_Y - 16} rx="6" ry="5" fill={c2} opacity="0.9" />
      <ellipse cx={CX - 2} cy={TOP_Y - 7} rx="3.5" ry="2.2" fill={lighten(c, 24)} opacity="0.55" />
    </g>
  )
}

export function IceCreamBarRenderer({ build, mode = 'full', size = 'lg' }: Props) {
  const uid = useId().replace(/:/g, '')
  const baseP = getBaseProfile(build.base || null)
  const coatP = getCoatingProfile(build.coating || null)
  const coatStyle = getCoatingStyle(build.coating || null)
  const hasCoating = build.coating && build.coating.id !== 'none'
  const showCoat = hasCoating && (mode === 'full' || mode === 'coating-only' || mode === 'mini' || mode === 'filling-only')
  const showDollop = build.filling && (mode === 'full' || mode === 'filling-only' || mode === 'mini')
  const showBase = mode === 'full' || mode === 'base-only' || mode === 'mini' || mode === 'coating-only' || mode === 'filling-only'

  const baseBandTop = BOT_Y - BASE_BAND_H
  const coatStartY = baseBandTop
  const texDots = generateTextureDots(build.base?.id || 'v', baseP.texture === 'seeds' ? 18 : 10, {
    x: CX - RX + 5,
    y: TOP_Y + 14,
    w: RX * 2 - 10,
    h: baseBandTop - TOP_Y - 10,
  })

  const dim = size === 'lg'
    ? { w: 140, h: 300, vb: '0 0 120 260' }
    : size === 'sm'
      ? { w: 56, h: 120, vb: '0 0 120 260' }
      : { w: 40, h: 86, vb: '0 0 120 260' }

  return (
    <svg
      viewBox={dim.vb}
      width={dim.w}
      height={dim.h}
      className={`ice-bar-renderer ice-bar-renderer--${size}`}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="0" y1="0" x2="0.12" y2="1">
          <stop offset="0%" stopColor={baseP.colors[0]} />
          <stop offset="55%" stopColor={baseP.colors[1]} />
          <stop offset="100%" stopColor={baseP.colors[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-baseBand`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={darken(baseP.colors[1], 12)} />
          <stop offset="100%" stopColor={darken(baseP.colors[2], 6)} />
        </linearGradient>
        <linearGradient id={`${uid}-coat`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={coatStyle.gloss} />
          <stop offset="35%" stopColor={coatStyle.highlight} />
          <stop offset="100%" stopColor={coatStyle.shadow} />
        </linearGradient>
        {build.filling && (
          <radialGradient id={`${uid}-fill`} cx="42%" cy="28%">
            <stop offset="0%" stopColor={lighten(build.filling.color, 22)} />
            <stop offset="100%" stopColor={darken(build.filling.color, 16)} />
          </radialGradient>
        )}
        <clipPath id={`${uid}-cyl`}>
          <rect x={CX - RX} y={TOP_Y} width={RX * 2} height={BOT_Y - TOP_Y} rx="0" />
        </clipPath>
        <filter id={`${uid}-sh`}>
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="rgba(0,0,0,0.38)" />
        </filter>
        <filter id={`${uid}-coatWave`} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045 0.09" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {size === 'lg' && <ellipse cx={CX} cy={248} rx="30" ry="5.5" fill="rgba(0,0,0,0.14)" />}

      <g filter={size === 'lg' ? `url(#${uid}-sh)` : undefined}>
        {/* wooden stick */}
        {size !== 'xs' && (
          <g>
            <rect x={CX - 5.5} y={BOT_Y + 2} width="11" height="42" rx="2" fill="#d4b878" />
            <rect x={CX - 4.5} y={BOT_Y + 4} width="2" height="38" rx="1" fill="rgba(255,255,255,0.22)" />
          </g>
        )}

        {/* plastic collar */}
        {size !== 'xs' && (
          <ellipse cx={CX} cy={BOT_Y + 1} rx={RX + 4} ry="4.5" fill="#f0eeea" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
        )}

        {/* inner core */}
        {showBase && (
          <g clipPath={`url(#${uid}-cyl)`}>
            <rect x={CX - RX} y={TOP_Y} width={RX * 2} height={BOT_Y - TOP_Y} fill={`url(#${uid}-base)`} />
            <ellipse cx={CX} cy={TOP_Y} rx={RX} ry={RY} fill={baseP.colors[0]} />
            <ellipse cx={CX} cy={BOT_Y} rx={RX} ry={RY} fill={baseP.colors[2]} />
            {baseP.texture === 'speckle' && texDots.map((d, i) => (
              <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={baseP.speckleColor} opacity="0.35" />
            ))}
          </g>
        )}

        {/* base band — پایه */}
        {showBase && (
          <g>
            <rect x={CX - RX} y={baseBandTop} width={RX * 2} height={BASE_BAND_H} fill={`url(#${uid}-baseBand)`} />
            <ellipse cx={CX} cy={baseBandTop} rx={RX} ry={RY - 1} fill={darken(baseP.colors[1], 10)} />
            <ellipse cx={CX} cy={BOT_Y} rx={RX} ry={RY} fill={darken(baseP.colors[2], 4)} />
          </g>
        )}

        {/* coating shell — روکش */}
        {showCoat && (
          <g clipPath={`url(#${uid}-cyl)`} filter={`url(#${uid}-coatWave)`}>
            <rect x={CX - RX - 1} y={coatStartY} width={RX * 2 + 2} height={TOP_Y - coatStartY + RY + 2} fill={`url(#${uid}-coat)`} />
            <path
              d={`M ${CX - RX - 1} ${TOP_Y + 4}
                  Q ${CX - 10} ${TOP_Y - 5} ${CX} ${TOP_Y - 3}
                  Q ${CX + 11} ${TOP_Y - 6} ${CX + RX + 1} ${TOP_Y + 3}
                  L ${CX + RX + 1} ${coatStartY}
                  L ${CX - RX - 1} ${coatStartY} Z`}
              fill={coatStyle.highlight}
              opacity="0.92"
            />
            {coatP.style.includes('gloss') && (
              <ellipse cx={CX - 7} cy={TOP_Y + 6} rx="9" ry="3.5" fill="rgba(255,255,255,0.38)" />
            )}
            {coatP.style === 'crunchy' && crunchyNutPieces(build.coating?.texture ?? undefined, build.coating?.id || '').map((n, i) => (
              <ellipse
                key={i}
                cx={n.cx}
                cy={Math.min(n.cy, baseBandTop - 4)}
                rx={n.rx}
                ry={n.ry}
                fill={n.color}
                transform={`rotate(${n.rot} ${n.cx} ${Math.min(n.cy, baseBandTop - 4)})`}
                opacity="0.95"
              />
            ))}
          </g>
        )}

        {/* filling dollop — فیلینگ */}
        {showDollop && build.filling && renderFillingDollop(build.filling, uid)}
      </g>
    </svg>
  )
}
