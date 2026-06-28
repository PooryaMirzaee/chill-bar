import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WaitGameTuning } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSubmitWaitGame } from './useSubmitWaitGame'

interface Props {
  tuning: WaitGameTuning['perfectPour']
  disabled?: boolean
  onDone?: (score: number) => void
}

type Phase = 'idle' | 'playing' | 'hit' | 'miss'

const RING_SIZE = 200
const TARGET_RADIUS = 58
const PERFECT_TOLERANCE = 6
const GOOD_TOLERANCE = 14

export function ChillBeat({ tuning, disabled, onDone }: Props) {
  const submit = useSubmitWaitGame()
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [ringRadius, setRingRadius] = useState(RING_SIZE / 2)
  const [lastLabel, setLastLabel] = useState('')
  const [lastPts, setLastPts] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [combo, setCombo] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef(0)
  const gameStartRef = useRef(Date.now())
  const shrinkingRef = useRef(false)

  const startRound = useCallback(() => {
    setPhase('playing')
    setRingRadius(RING_SIZE / 2)
    startRef.current = performance.now()
    shrinkingRef.current = true
  }, [])

  useEffect(() => {
    if (phase !== 'playing' || !shrinkingRef.current) return

    const tick = () => {
      const elapsed = performance.now() - startRef.current
      const speed = 0.09 + round * 0.008
      const next = RING_SIZE / 2 - elapsed * speed

      if (next <= TARGET_RADIUS - GOOD_TOLERANCE - 4) {
        shrinkingRef.current = false
        setLastLabel('دیر شد!')
        setLastPts(0)
        setCombo(0)
        setPhase('miss')
        return
      }

      setRingRadius(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, round])

  const tap = () => {
    if (disabled || submitting || phase !== 'playing') return
    cancelAnimationFrame(rafRef.current)
    shrinkingRef.current = false

    const diff = Math.abs(ringRadius - TARGET_RADIUS)
    let pts = 0
    let label = 'خطا!'

    if (diff <= PERFECT_TOLERANCE) {
      pts = tuning.perfectPoints
      label = 'عالی!'
      setCombo((c) => c + 1)
    } else if (diff <= GOOD_TOLERANCE) {
      pts = tuning.goodPoints
      label = 'خوب!'
      setCombo((c) => c + 1)
    } else {
      setCombo(0)
      label = diff < TARGET_RADIUS ? 'زود زدی!' : 'دیر زدی!'
    }

    const comboBonus = combo >= 2 ? Math.floor(pts * 0.2) : 0
    const finalPts = pts + comboBonus

    setLastLabel(label)
    setLastPts(finalPts)
    setTotalScore((s) => s + finalPts)
    setPhase(pts > 0 ? 'hit' : 'miss')
  }

  const nextRound = async () => {
    const nextRoundNum = round + 1
    if (nextRoundNum >= tuning.rounds) {
      setSubmitting(true)
      try {
        await submit('perfectPour', totalScore, Math.max(800, Date.now() - gameStartRef.current))
        onDone?.(totalScore)
      } finally {
        setSubmitting(false)
        setRound(0)
        setTotalScore(0)
        setCombo(0)
        setPhase('idle')
        gameStartRef.current = Date.now()
      }
      return
    }
    setRound(nextRoundNum)
    startRound()
  }

  const begin = () => {
    if (disabled || submitting) return
    gameStartRef.current = Date.now()
    setRound(0)
    setTotalScore(0)
    setCombo(0)
    startRound()
  }

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const cx = RING_SIZE / 2
  const hitQuality =
    phase === 'hit' ? (lastPts >= tuning.perfectPoints ? 'perfect' : 'good') : phase === 'miss' ? 'miss' : null

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex w-full items-center justify-between rounded-xl bg-muted/40 px-4 py-2 text-sm">
        <span className="text-muted-foreground">
          ضرب {Math.min(round + 1, tuning.rounds)} از {tuning.rounds}
        </span>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              ×{combo} combo
            </span>
          )}
          <span className="font-semibold text-primary">{totalScore} امتیاز</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg width={RING_SIZE} height={RING_SIZE} className="absolute inset-0">
          <circle
            cx={cx}
            cy={cx}
            r={TARGET_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="text-primary/30"
          />
          <circle
            cx={cx}
            cy={cx}
            r={TARGET_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={8}
            strokeDasharray={`${PERFECT_TOLERANCE * 2 * Math.PI * 0.4} ${RING_SIZE * 2}`}
            className="text-primary/60"
          />
          {phase === 'playing' && (
            <circle
              cx={cx}
              cy={cx}
              r={Math.max(8, ringRadius)}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              className="text-primary transition-none"
            />
          )}
        </svg>

        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <AnimatePresence mode="wait">
            {phase === 'idle' && (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-3xl"
              >
                🎵
              </motion.span>
            )}
            {phase === 'playing' && (
              <motion.span
                key="play"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-2xl font-bold text-primary"
              >
                TAP
              </motion.span>
            )}
            {(phase === 'hit' || phase === 'miss') && (
              <motion.span
                key="result"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  'text-sm font-bold',
                  hitQuality === 'perfect' && 'text-primary',
                  hitQuality === 'good' && 'text-orange-400',
                  hitQuality === 'miss' && 'text-muted-foreground',
                )}
              >
                {lastLabel}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        وقتی حلقه روی دایره وسط نشست، بزن!
      </p>

      {phase === 'idle' && (
        <Button
          className="h-14 w-full max-w-xs text-base font-semibold shadow-lg shadow-primary/20"
          size="lg"
          onClick={begin}
          disabled={disabled || submitting}
        >
          شروع ریتم
        </Button>
      )}
      {phase === 'playing' && (
        <Button
          className="h-16 w-16 rounded-full text-lg font-bold shadow-lg shadow-primary/30"
          size="lg"
          onClick={tap}
        >
          ●
        </Button>
      )}
      {(phase === 'hit' || phase === 'miss') && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs space-y-3 text-center"
        >
          {lastPts > 0 && (
            <p className="text-sm text-muted-foreground">+{lastPts} امتیاز</p>
          )}
          <Button className="w-full" onClick={() => void nextRound()} disabled={submitting}>
            {round + 1 >= tuning.rounds ? (submitting ? 'ثبت امتیاز…' : 'پایان بازی') : 'ضرب بعد'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
