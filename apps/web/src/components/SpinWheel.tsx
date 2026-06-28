import { useMemo, useState, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MenuItem } from '../types'
import type { AddToCartHandler } from '../lib/cartFeedback'
import { formatPrice } from '../lib/comboBuilder'

interface Props {
  items: MenuItem[]
  onWin: AddToCartHandler
  hint: string
}

const SEGMENT_COLORS = [
  '#F26522',
  '#1B2838',
  '#FF8C4D',
  '#243447',
  '#E8A87C',
  '#D94E10',
  '#2a3f54',
  '#c44d12',
] as const

const WHEEL_SIZE = 300
const CX = WHEEL_SIZE / 2
const CY = WHEEL_SIZE / 2
const R = 138
const INNER_R = 46

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end)
  const e = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`
}

function shortName(name: string) {
  return name.split('(')[0].trim().slice(0, 14)
}

function pickDiverseItems(all: MenuItem[], count = 8): MenuItem[] {
  const pool = [...all].sort(() => Math.random() - 0.5)
  const picked: MenuItem[] = []
  const seen = new Set<string>()

  for (const item of pool) {
    if (picked.length >= count) break
    if (!seen.has(item.category)) {
      picked.push(item)
      seen.add(item.category)
    }
  }
  for (const item of pool) {
    if (picked.length >= count) break
    if (!picked.includes(item)) picked.push(item)
  }
  return picked.slice(0, count)
}

export function SpinWheel({ items, onWin, hint }: Props) {
  const [prizes] = useState(() => pickDiverseItems(items, 8))
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<MenuItem | null>(null)
  const [rotation, setRotation] = useState(0)
  const [added, setAdded] = useState(false)

  const segmentAngle = 360 / prizes.length

  const segments = useMemo(() => {
    return prizes.map((item, i) => {
      const start = i * segmentAngle
      const end = start + segmentAngle
      const mid = start + segmentAngle / 2
      return { item, start, end, mid, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }
    })
  }, [prizes, segmentAngle])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    setAdded(false)

    const winIdx = Math.floor(Math.random() * prizes.length)
    const winner = prizes[winIdx]
    const segmentCenter = winIdx * segmentAngle + segmentAngle / 2
    const jitter = (Math.random() - 0.5) * (segmentAngle * 0.55)
    const targetMod = (360 - segmentCenter + jitter + 360) % 360
    const currentMod = rotation % 360
    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360

    setRotation((r) => r + 6 * 360 + delta)

    setTimeout(() => {
      setSpinning(false)
      setResult(winner)
    }, 4200)
  }

  const handleAccept = (e: MouseEvent) => {
    if (!result || added) return
    onWin(result, e)
    setAdded(true)
  }

  return (
    <section className="section suggest-wheel">
      <div className="suggest-wheel-header">
        <span className="section-eyebrow">Can't decide?</span>
        <h2>گردونه پیشنهاد</h2>
        <p>{hint}</p>
      </div>

      <div className="suggest-wheel-stage">
        <div className="suggest-wheel-aura" aria-hidden />
        <div className="suggest-wheel-ring" aria-hidden />

        <div className="suggest-wheel-pointer" aria-hidden>
          <svg viewBox="0 0 40 52" width="32" height="42">
            <defs>
              <linearGradient id="ptr-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8C4D" />
                <stop offset="100%" stopColor="#F26522" />
              </linearGradient>
              <filter id="ptr-glow">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F26522" floodOpacity="0.7" />
              </filter>
            </defs>
            <path
              d="M20 4 L36 40 Q20 48 4 40 Z"
              fill="url(#ptr-grad)"
              stroke="#fff"
              strokeWidth="2"
              filter="url(#ptr-glow)"
            />
            <circle cx="20" cy="14" r="4" fill="rgba(255,255,255,0.55)" />
          </svg>
        </div>

        <motion.div
          className="suggest-wheel-rotor"
          animate={{ rotate: rotation }}
          transition={{ duration: 4.2, ease: [0.12, 0.85, 0.22, 1] }}
        >
          <svg
            viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
            width={WHEEL_SIZE}
            height={WHEEL_SIZE}
            className="suggest-wheel-svg"
          >
            <defs>
              <filter id="seg-shadow">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.45)" />
              </filter>
            </defs>

            <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke="rgba(242,101,34,0.25)" strokeWidth="3" />
            <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {segments.map(({ item, start, end, mid, color }, i) => (
              <g key={item.id}>
                <path
                  d={arcPath(CX, CY, R, start, end)}
                  fill={color}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                  filter="url(#seg-shadow)"
                />
                <line
                  x1={CX}
                  y1={CY}
                  x2={polar(CX, CY, R, end).x}
                  y2={polar(CX, CY, R, end).y}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth="1"
                />
                <g transform={`rotate(${mid} ${CX} ${CY})`}>
                  <text
                    x={CX}
                    y={CY - R * 0.62}
                    textAnchor="middle"
                    className="suggest-wheel-emoji"
                  >
                    {item.emoji}
                  </text>
                  <text
                    x={CX}
                    y={CY - R * 0.38}
                    textAnchor="middle"
                    className="suggest-wheel-label"
                  >
                    {shortName(item.name)}
                  </text>
                </g>
                {i % 2 === 0 && (
                  <circle
                    cx={polar(CX, CY, R + 4, mid).x}
                    cy={polar(CX, CY, R + 4, mid).y}
                    r="3"
                    fill="rgba(255,255,255,0.35)"
                  />
                )}
              </g>
            ))}

            <circle cx={CX} cy={CY} r={INNER_R + 4} fill="#0A0A0A" stroke="rgba(242,101,34,0.5)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r={INNER_R} fill="url(#hub-fill)" />
            <defs>
              <radialGradient id="hub-fill" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#0A0A0A" />
              </radialGradient>
            </defs>
          </svg>
        </motion.div>

        <div className="suggest-wheel-hub" aria-hidden>
          <span className="suggest-wheel-hub-icon">🍊</span>
          <span className="suggest-wheel-hub-text">CHILL</span>
        </div>
      </div>

      <button
        className={`suggest-wheel-btn ${spinning ? 'spinning' : ''}`}
        onClick={spin}
        disabled={spinning}
      >
        <span className="suggest-wheel-btn-inner">
          {spinning ? (
            <>
              <span className="suggest-wheel-btn-spinner" />
              در حال انتخاب...
            </>
          ) : (
            <>🎯 پیشنهاد بده!</>
          )}
        </span>
      </button>

      <AnimatePresence>
        {result && (
          <motion.div
            className="suggest-wheel-result"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          >
            <div className="suggest-wheel-result-badge">پیشنهاد امروز</div>
            <span className="suggest-wheel-result-emoji">{result.emoji}</span>
            <h3>{result.name.split('(')[0].trim()}</h3>
            <p className="suggest-wheel-result-cat">{result.categoryName}</p>
            <p className="suggest-wheel-result-price">{formatPrice(result.price)}</p>
            {result.description && (
              <p className="suggest-wheel-result-desc">{result.description.slice(0, 80)}</p>
            )}
            <button
              className={`suggest-wheel-accept ${added ? 'added' : ''}`}
              onClick={handleAccept}
              disabled={added}
            >
              {added ? '✓ به سبد اضافه شد' : '🛒 همینو می‌خوام!'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
