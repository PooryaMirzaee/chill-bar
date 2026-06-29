import { useMemo, useState, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MenuItem } from '../types'
import type { AddToCartHandler } from '../lib/cartFeedback'
import { formatPrice } from '../lib/comboBuilder'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  items: MenuItem[]
  onWin: AddToCartHandler
  hint: string
}

const SEGMENT_COUNT = 8
const WHEEL_SIZE = 300
const CX = WHEEL_SIZE / 2
const CY = WHEEL_SIZE / 2
const R = 132
const INNER_R = 44

const SEGMENT_COLORS = ['#F26522', '#1B2838'] as const

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

function pickDiverseItems(all: MenuItem[], count = SEGMENT_COUNT): MenuItem[] {
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
  const [prizes] = useState(() => pickDiverseItems(items, SEGMENT_COUNT))
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<MenuItem | null>(null)
  const [rotation, setRotation] = useState(0)
  const [added, setAdded] = useState(false)

  const segmentAngle = 360 / prizes.length

  const segments = useMemo(
    () =>
      prizes.map((item, i) => {
        const start = i * segmentAngle
        const end = start + segmentAngle
        const mid = start + segmentAngle / 2
        return {
          item,
          start,
          end,
          mid,
          color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        }
      }),
    [prizes, segmentAngle],
  )

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setResult(null)
    setAdded(false)

    const winIdx = Math.floor(Math.random() * prizes.length)
    const winner = prizes[winIdx]
    const segmentCenter = winIdx * segmentAngle + segmentAngle / 2
    const jitter = (Math.random() - 0.5) * (segmentAngle * 0.35)
    const targetMod = (360 - segmentCenter + jitter + 360) % 360
    const currentMod = rotation % 360
    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360

    setRotation((r) => r + 5 * 360 + delta)

    setTimeout(() => {
      setSpinning(false)
      setResult(winner)
    }, 4000)
  }

  const handleAccept = (e: MouseEvent) => {
    if (!result || added) return
    onWin(result, e)
    setAdded(true)
  }

  return (
    <section className="px-4 pb-6 text-center">
      <div className="mb-6">
        <span className="mb-2 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          نمی‌دونی چی بگیری؟
        </span>
        <h2 className="text-xl font-black tracking-tight">گردونه پیشنهاد</h2>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>

      <div className="relative mx-auto mb-6 aspect-square w-full max-w-[min(300px,88vw)]">
        <div
          className="pointer-events-none absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(242,101,34,0.18)_0%,transparent_68%)]"
          aria-hidden
        />

        <div
          className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
          aria-hidden
        >
          <svg viewBox="0 0 32 40" width="28" height="36" className="drop-shadow-[0_4px_10px_rgba(242,101,34,0.45)]">
            <path
              d="M16 2 L30 34 Q16 40 2 34 Z"
              fill="#F26522"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        </div>

        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.12, 0.85, 0.22, 1] }}
        >
          <svg
            viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
            className="h-full w-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
            aria-hidden
          >
            <defs>
              <radialGradient id="spin-wheel-hub" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#0a0a0a" />
              </radialGradient>
            </defs>

            <circle
              cx={CX}
              cy={CY}
              r={R + 5}
              fill="none"
              stroke="rgba(242, 101, 34, 0.35)"
              strokeWidth="4"
            />

            {segments.map(({ item, start, end, mid, color }) => (
              <g key={item.id}>
                <path
                  d={arcPath(CX, CY, R, start, end)}
                  fill={color}
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1.2"
                />
                <g transform={`rotate(${mid} ${CX} ${CY})`}>
                  <text
                    x={CX}
                    y={CY - R * 0.58}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="26"
                  >
                    {item.emoji}
                  </text>
                </g>
              </g>
            ))}

            <circle cx={CX} cy={CY} r={INNER_R + 3} fill="#0a0a0a" stroke="rgba(242, 101, 34, 0.5)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r={INNER_R} fill="url(#spin-wheel-hub)" />
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              fontSize="22"
              dominantBaseline="middle"
            >
              🍊
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              fill="#F26522"
              fontSize="9"
              fontWeight="800"
              letterSpacing="2"
            >
              CHILL
            </text>
          </svg>
        </motion.div>
      </div>

      <Button
        className="mx-auto h-12 w-full max-w-[280px] rounded-full text-base font-bold shadow-lg shadow-primary/20"
        onClick={spin}
        disabled={spinning}
      >
        {spinning ? 'در حال انتخاب...' : '🎯 پیشنهاد بده!'}
      </Button>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="mt-6"
          >
            <Card className="mx-auto max-w-sm overflow-hidden border-primary/30 text-center shadow-lg shadow-primary/10">
              <div className="h-1 bg-primary" />
              <CardContent className="px-5 py-5">
                <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  پیشنهاد امروز
                </span>
                <div className="mb-2 text-5xl">{result.emoji}</div>
                <h3 className="text-lg font-black">{result.name.split('(')[0].trim()}</h3>
                <p className="text-xs text-muted-foreground">{result.categoryName}</p>
                <p className="mt-2 text-base font-bold text-primary">{formatPrice(result.price)}</p>
                {result.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{result.description}</p>
                )}
                <Button
                  className={cn('mt-4 w-full rounded-full font-bold', added && 'bg-emerald-500/15 text-emerald-600')}
                  onClick={handleAccept}
                  disabled={added}
                  variant={added ? 'outline' : 'default'}
                >
                  {added ? '✓ به سبد اضافه شد' : '🛒 همینو می‌خوام!'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
