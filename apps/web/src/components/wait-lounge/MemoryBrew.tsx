import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WaitGameTuning } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { resolveAssetUrl } from '@/lib/branding'
import type { MenuItem } from '../../types'
import { useSubmitWaitGame } from './useSubmitWaitGame'

interface Props {
  tuning: WaitGameTuning['memoryBrew']
  menuItems: MenuItem[]
  disabled?: boolean
  onDone?: (score: number) => void
}

interface CardFace {
  key: string
  pairId: string
  imageUrl: string
  name: string
}

type Phase = 'intro' | 'peek' | 'play' | 'stageDone' | 'finished'

interface StageConfig {
  stage: number
  totalStages: number
  pairs: number
  peekMs: number
  missHideMs: number
  cols: number
}

function buildDeck(items: MenuItem[], pairCount: number, stageSeed: number): CardFace[] {
  const withImages = items
    .filter((i) => i.isAvailable !== false && i.imageUrl)
    .sort((a, b) => {
      const ha = (a.id.charCodeAt(0) + stageSeed) % 100
      const hb = (b.id.charCodeAt(0) + stageSeed) % 100
      return ha - hb
    })

  const selected = withImages.slice(0, pairCount)
  const cards = selected.flatMap((item) => {
    const imageUrl = item.imageUrl!
    return [
      { key: `${item.id}-a-${stageSeed}`, pairId: item.id, imageUrl, name: item.name },
      { key: `${item.id}-b-${stageSeed}`, pairId: item.id, imageUrl, name: item.name },
    ]
  })

  return cards.sort(() => Math.random() - 0.5)
}

function getStageConfig(
  stage: number,
  tuning: WaitGameTuning['memoryBrew'],
  maxAvailable: number,
): StageConfig {
  const totalStages = tuning.stages ?? 4
  const startPairs = tuning.startPairs ?? 3
  const pairs = Math.min(tuning.pairs, maxAvailable, startPairs + stage - 1)
  const peekMs = Math.max(1100, 3200 - (stage - 1) * 550)
  const missHideMs = Math.max(400, 850 - (stage - 1) * 130)
  const cols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 4
  return { stage, totalStages, pairs, peekMs, missHideMs, cols }
}

function stagePoints(
  tuning: WaitGameTuning['memoryBrew'],
  stage: number,
  moves: number,
  pairs: number,
  elapsedSec: number,
): number {
  const perStage = Math.floor(tuning.basePoints / (tuning.stages ?? 4))
  const timeSlice = Math.floor(tuning.timeBonus / (tuning.stages ?? 4))
  const movePenalty = Math.max(0, moves - pairs) * 4
  const timeBonus = elapsedSec < 40 + stage * 5 ? timeSlice : Math.max(0, timeSlice - 5)
  const stageBonus = (stage - 1) * 6
  return Math.max(8, perStage + timeBonus + stageBonus - movePenalty)
}

export function MemoryBrew({ tuning, menuItems, disabled, onDone }: Props) {
  const submit = useSubmitWaitGame()
  const poolSize = useMemo(
    () => menuItems.filter((i) => i.isAvailable !== false && i.imageUrl).length,
    [menuItems],
  )

  const [stage, setStage] = useState(1)
  const [phase, setPhase] = useState<Phase>('intro')
  const [deck, setDeck] = useState<CardFace[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [peekLeft, setPeekLeft] = useState(0)
  const [stageScore, setStageScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [lastStagePts, setLastStagePts] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [shakeIdx, setShakeIdx] = useState<number | null>(null)
  const [lockBoard, setLockBoard] = useState(false)

  const stageStartRef = useRef(Date.now())
  const gameStartRef = useRef(Date.now())
  const peekTimerRef = useRef<number>(0)

  const config = useMemo(
    () => getStageConfig(stage, tuning, poolSize),
    [stage, tuning, poolSize],
  )

  const won = deck.length > 0 && matched.size === deck.length

  const loadStage = useCallback(
    (nextStage: number) => {
      const cfg = getStageConfig(nextStage, tuning, poolSize)
      if (cfg.pairs < 2) return false
      setDeck(buildDeck(menuItems, cfg.pairs, nextStage * 97))
      setFlipped([])
      setMatched(new Set())
      setMoves(0)
      setStage(nextStage)
      setPeekLeft(Math.ceil(cfg.peekMs / 1000))
      stageStartRef.current = Date.now()
      return true
    },
    [menuItems, poolSize, tuning],
  )

  const beginPeek = useCallback(() => {
    setPhase('peek')
    const cfg = getStageConfig(stage, tuning, poolSize)
    setPeekLeft(Math.ceil(cfg.peekMs / 1000))
    peekTimerRef.current = window.setTimeout(() => setPhase('play'), cfg.peekMs)
  }, [stage, tuning, poolSize])

  useEffect(() => {
    if (poolSize < 2) return
    gameStartRef.current = Date.now()
    if (loadStage(1)) {
      setPhase('intro')
      setTotalScore(0)
    }
  }, [loadStage, poolSize])

  useEffect(() => {
    if (phase !== 'intro') return
    const t = window.setTimeout(() => beginPeek(), 900)
    return () => window.clearTimeout(t)
  }, [phase, stage, beginPeek])

  useEffect(() => {
    if (phase !== 'peek') return
    const id = window.setInterval(() => {
      setPeekLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => () => window.clearTimeout(peekTimerRef.current), [])

  useEffect(() => {
    if (flipped.length !== 2 || lockBoard) return
    const [a, b] = flipped
    if (deck[a].pairId === deck[b].pairId) {
      setMatched((m) => new Set([...m, a, b]))
      setFlipped([])
      return
    }
    setLockBoard(true)
    setShakeIdx(b)
    const cfg = getStageConfig(stage, tuning, poolSize)
    const t = window.setTimeout(() => {
      setFlipped([])
      setShakeIdx(null)
      setLockBoard(false)
    }, cfg.missHideMs)
    return () => window.clearTimeout(t)
  }, [flipped, deck, lockBoard, stage, tuning, poolSize])

  const flip = (idx: number) => {
    if (disabled || submitting || phase !== 'play' || lockBoard) return
    if (matched.has(idx) || flipped.includes(idx) || flipped.length >= 2) return
    setFlipped((f) => [...f, idx])
    if (flipped.length === 1) setMoves((m) => m + 1)
  }

  const finishGame = useCallback(async () => {
    setSubmitting(true)
    try {
      const durationMs = Date.now() - gameStartRef.current
      await submit('memoryBrew', totalScore + stageScore, durationMs)
      setPhase('finished')
      onDone?.(totalScore + stageScore)
    } finally {
      setSubmitting(false)
    }
  }, [onDone, stageScore, submit, totalScore])

  useEffect(() => {
    if (!won || phase !== 'play' || submitting) return
    const elapsed = (Date.now() - stageStartRef.current) / 1000
    const pts = stagePoints(tuning, stage, moves, config.pairs, elapsed)
    setLastStagePts(pts)
    setStageScore(pts)
    setPhase('stageDone')
  }, [won, phase, submitting, tuning, stage, moves, config.pairs])

  useEffect(() => {
    if (phase !== 'stageDone') return
    const t = window.setTimeout(() => {
      setTotalScore((s) => s + stageScore)
      if (stage >= config.totalStages) {
        void finishGame()
        return
      }
      if (loadStage(stage + 1)) {
        setPhase('intro')
      }
    }, 1400)
    return () => window.clearTimeout(t)
  }, [phase, stage, stageScore, config.totalStages, loadStage, finishGame])

  const restart = () => {
    window.clearTimeout(peekTimerRef.current)
    setTotalScore(0)
    setStageScore(0)
    setSubmitting(false)
    gameStartRef.current = Date.now()
    if (loadStage(1)) setPhase('intro')
  }

  if (poolSize < 2) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        برای این بازی حداقل دو آیتم منو با عکس لازم است.
      </div>
    )
  }

  const showFaces = phase === 'peek' || phase === 'intro'
  const progressPct = config.totalStages > 0 ? ((stage - 1) / config.totalStages) * 100 : 0

  return (
    <div className="space-y-4 py-1">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            مرحله <strong className="text-foreground">{stage}</strong> از {config.totalStages}
          </span>
          <span>
            امتیاز: <strong className="text-primary">{totalScore + (phase === 'play' ? 0 : stageScore)}</strong>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card/60 px-3 py-2.5 text-sm backdrop-blur-sm">
        <div className="flex gap-4">
          <span>
            جفت: <strong>{matched.size / 2}</strong>/{config.pairs}
          </span>
          <span>
            حرکت: <strong>{moves}</strong>
          </span>
        </div>
        <AnimatePresence mode="wait">
          {phase === 'peek' && (
            <motion.span
              key="peek"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary"
            >
              حفظ کن · {peekLeft}ث
            </motion.span>
          )}
          {phase === 'play' && (
            <motion.span
              key="play"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              {config.pairs} جفت · سخت‌تر!
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))` }}
      >
        {deck.map((card, idx) => {
          const isFlipped = flipped.includes(idx)
          const isMatched = matched.has(idx)
          const faceUp = showFaces || isFlipped || isMatched
          const src = resolveAssetUrl(card.imageUrl)

          return (
            <motion.button
              key={card.key}
              type="button"
              layout
              animate={shakeIdx === idx ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.35 }}
              className={cn(
                'relative aspect-square [perspective:800px]',
                (disabled || phase === 'finished') && 'pointer-events-none',
              )}
              onClick={() => flip(idx)}
              disabled={disabled || phase !== 'play'}
            >
              <motion.div
                className="relative h-full w-full"
                initial={false}
                animate={{
                  rotateY: faceUp ? 180 : 0,
                  scale: isMatched ? 0.96 : 1,
                }}
                transition={{ duration: 0.38, type: 'spring', stiffness: 280, damping: 22 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className={cn(
                    'absolute inset-0 flex flex-col items-center justify-center rounded-xl border-2 [backface-visibility:hidden]',
                    'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600/50 shadow-inner',
                  )}
                >
                  <span className="text-2xl font-bold text-white/20">?</span>
                </div>
                <div
                  className={cn(
                    'absolute inset-0 overflow-hidden rounded-xl border-2 [backface-visibility:hidden] [transform:rotateY(180deg)]',
                    isMatched
                      ? 'border-emerald-500/60 ring-2 ring-emerald-500/25'
                      : 'border-white/10 shadow-md',
                  )}
                >
                  {src ? (
                    <img src={src} alt={card.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 py-1">
                    <p className="truncate text-center text-[9px] font-medium text-white/90">{card.name}</p>
                  </div>
                </div>
              </motion.div>
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence>
        {phase === 'stageDone' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
          >
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              مرحله {stage} تمام شد!
            </p>
            <p className="mt-1 text-2xl font-bold">+{lastStagePts}</p>
            {stage < config.totalStages && (
              <p className="mt-1 text-xs text-muted-foreground">مرحله بعد سخت‌تر است…</p>
            )}
          </motion.div>
        )}
        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/25 bg-primary/10 p-5 text-center"
          >
            <p className="text-lg font-bold">عالی بود!</p>
            <p className="mt-1 text-3xl font-bold text-primary">{totalScore}</p>
            <p className="mt-1 text-xs text-muted-foreground">امتیاز کل · {config.totalStages} مرحله</p>
            <Button variant="outline" className="mt-4" onClick={restart} disabled={disabled || submitting}>
              بازی دوباره
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {submitting && (
        <p className="text-center text-sm text-muted-foreground">ثبت امتیاز…</p>
      )}
    </div>
  )
}
