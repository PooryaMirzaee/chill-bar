import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Sparkles, X, Coffee, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import type { MenuItem } from '../types'
import type { CoffeeFortuneReading, CoffeeFortuneSettings } from '@chill-bar/shared'
import {
  pickCoffeeFortune,
  buildCoffeeFortuneShareText,
  mergeCoffeeFortuneSettings,
} from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type ModalPhase = 'ritual' | 'reading' | 'revealed'

interface Props {
  items: MenuItem[]
  settings: CoffeeFortuneSettings
  storeName: string
  onPickDrink?: (item: MenuItem) => void
  className?: string
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  delay: (i % 6) * 0.35,
  size: 3 + (i % 4),
}))

function FortuneStoryCard({
  reading,
  settings,
  storeName,
  cardRef,
}: {
  reading: CoffeeFortuneReading
  settings: CoffeeFortuneSettings
  storeName: string
  cardRef?: React.RefObject<HTMLDivElement | null>
}) {
  const accent = settings.accentColor

  return (
    <div ref={cardRef} className="cf-story-card" style={{ '--cf-accent': accent } as React.CSSProperties}>
      <div className="cf-story-card__glow" aria-hidden />
      <div className="cf-story-card__frame">
        <header className="cf-story-card__header">
          <span className="cf-story-card__brand">☕ {storeName}</span>
          <span className="cf-story-card__date">{reading.dateLabel}</span>
        </header>

        <div className="cf-story-card__cup-zone">
          <div className="cf-story-card__cup">
            <span className="cf-story-card__symbol">{reading.symbol.emoji}</span>
          </div>
          <p className="cf-story-card__symbol-label">
            نماد فنجان: {reading.symbol.label}
          </p>
          <p className="cf-story-card__symbol-meaning">{reading.symbol.meaning}</p>
        </div>

        <div className="cf-story-card__mood">
          <span>{reading.moodEmoji}</span>
          <span>حال امروز: {reading.mood}</span>
        </div>

        <blockquote className="cf-story-card__fortune">{reading.fortune}</blockquote>

        <div className="cf-story-card__aspects">
          <div className="cf-story-card__aspect">
            <span>💕</span>
            <div>
              <strong>عشق</strong>
              <p>{reading.love}</p>
            </div>
          </div>
          <div className="cf-story-card__aspect">
            <span>💼</span>
            <div>
              <strong>کار</strong>
              <p>{reading.career}</p>
            </div>
          </div>
          <div className="cf-story-card__aspect">
            <span>🍀</span>
            <div>
              <strong>شانس</strong>
              <p>{reading.luck}</p>
            </div>
          </div>
        </div>

        <div className="cf-story-card__lucky-row">
          <div className="cf-story-card__lucky-stat">
            <span className="cf-story-card__lucky-num">{reading.luckyNumber}</span>
            <span>عدد شانس</span>
          </div>
          <div className="cf-story-card__lucky-stat">
            <span
              className="cf-story-card__color-dot"
              style={{ background: reading.luckyColor.hex }}
            />
            <span>{reading.luckyColor.name}</span>
          </div>
          <div className="cf-story-card__lucky-stat">
            <span>{reading.luckyEmoji}</span>
            <span>طلایی</span>
          </div>
        </div>

        <p className="cf-story-card__time">⏰ {reading.luckyTime}</p>

        <div className="cf-story-card__drink">
          <span>نوشیدنی فال</span>
          <strong>{reading.drinkHint}</strong>
        </div>

        <footer className="cf-story-card__footer">
          <span>{settings.shareHashtag}</span>
          <span>{reading.timeLabel}</span>
        </footer>
      </div>
    </div>
  )
}

export function CoffeeFortune({ items, settings: rawSettings, storeName, onPickDrink, className }: Props) {
  const settings = useMemo(() => mergeCoffeeFortuneSettings(rawSettings), [rawSettings])
  const [open, setOpen] = useState(false)
  const [modalPhase, setModalPhase] = useState<ModalPhase>('ritual')
  const [reading, setReading] = useState<CoffeeFortuneReading | null>(null)
  const [readCount, setReadCount] = useState(0)
  const [holding, setHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const [revealedSections, setRevealedSections] = useState(0)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const nonceRef = useRef(0)

  const canReadAgain =
    settings.maxReadsPerVisit === 0 || readCount < settings.maxReadsPerVisit

  const drinkItems = useMemo(
    () => items.filter((i) => i.isAvailable !== false),
    [items],
  )

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current)
      holdTimer.current = null
    }
    setHolding(false)
    setHoldProgress(0)
  }, [])

  const startRitual = useCallback(() => {
    if (!canReadAgain) {
      toast.message('فال امروزت را گرفتی — فردا دوباره بیا!')
      return
    }
    setOpen(true)
    setModalPhase('ritual')
    setReading(null)
    setRevealedSections(0)
    clearHold()
  }, [canReadAgain, clearHold])

  const runReading = useCallback(() => {
    clearHold()
    setModalPhase('reading')
    nonceRef.current += 1
    window.setTimeout(() => {
      const result = pickCoffeeFortune(settings, drinkItems, {
        nonce: String(nonceRef.current),
      })
      setReading(result)
      setReadCount((c) => c + 1)
      setModalPhase('revealed')
      if (navigator.vibrate) navigator.vibrate([15, 30, 15, 50, 20])
    }, 2200)
  }, [clearHold, drinkItems, settings])

  const startHold = useCallback(() => {
    if (modalPhase !== 'ritual' || holding) return
    setHolding(true)
    setHoldProgress(0)
    let progress = 0
    holdTimer.current = setInterval(() => {
      progress += 4
      setHoldProgress(progress)
      if (progress >= 100) {
        runReading()
      }
    }, 40)
  }, [holding, modalPhase, runReading])

  useEffect(() => {
    if (modalPhase !== 'revealed' || !reading) return
    setRevealedSections(0)
    const timers = [0, 1, 2, 3, 4, 5].map((n) =>
      window.setTimeout(() => setRevealedSections(n + 1), 300 + n * 280),
    )
    return () => timers.forEach(clearTimeout)
  }, [modalPhase, reading?.id])

  useEffect(() => () => clearHold(), [clearHold])

  const shareFortune = async () => {
    if (!reading) return
    const text = buildCoffeeFortuneShareText(reading, settings, storeName)
    try {
      if (navigator.share) {
        await navigator.share({ title: settings.title, text })
        return
      }
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('متن فال کپی شد — اسکرین‌شات کارت را برای استوری بگیر!')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* user cancelled share */
    }
  }

  const closeModal = () => {
    clearHold()
    setOpen(false)
  }

  const readAgain = () => {
    if (!canReadAgain) {
      toast.message('به حد مجاز فال در این بازدید رسیدی')
      return
    }
    setModalPhase('ritual')
    setReading(null)
    setRevealedSections(0)
    clearHold()
  }

  const suggestedItem = reading?.suggestedItem
    ? items.find((i) => i.id === reading.suggestedItem?.id) ?? null
    : null

  return (
    <>
      <section
        className={cn('cf-teaser overflow-hidden rounded-2xl border border-amber-500/25 p-0 shadow-lg', className)}
        style={{ '--cf-accent': settings.accentColor } as React.CSSProperties}
      >
        <div className="cf-teaser__bg" aria-hidden>
          {PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              className="cf-teaser__particle"
              style={{ left: p.left, width: p.size, height: p.size }}
              animate={{ y: [0, -24, 0], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 3 + p.delay, repeat: Infinity, delay: p.delay }}
            />
          ))}
        </div>

        <div className="relative z-10 p-5 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-amber-200">
            <Sparkles className="h-5 w-5" />
            <h3 className="text-lg font-bold">{settings.title}</h3>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{settings.subtitle}</p>

          <motion.div
            className="cf-teaser__cup mx-auto"
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            ☕
          </motion.div>

          <Button type="button" className="mt-5 w-full cf-teaser__cta" onClick={startRitual}>
            <Coffee className="h-4 w-4" />
            فال امروزم را بخوان
          </Button>

          {settings.maxReadsPerVisit > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {canReadAgain
                ? `${settings.maxReadsPerVisit - readCount} فال باقی‌مانده`
                : 'فال‌های این بازدید تمام شد'}
            </p>
          )}
        </div>
      </section>

      <AnimatePresence>
        {open && (
          <motion.div
            className="cf-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal
            aria-label={settings.title}
          >
            <button type="button" className="cf-modal__close" onClick={closeModal} aria-label="بستن">
              <X className="h-5 w-5" />
            </button>

            <div className="cf-modal__inner">
              {modalPhase === 'ritual' && (
                <motion.div
                  key="ritual"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="cf-ritual"
                >
                  <p className="cf-ritual__hint">{settings.ritualHint}</p>
                  <motion.button
                    type="button"
                    className={cn('cf-ritual__cup', holding && 'cf-ritual__cup--active')}
                    onPointerDown={startHold}
                    onPointerUp={clearHold}
                    onPointerLeave={clearHold}
                    onPointerCancel={clearHold}
                    animate={
                      holding
                        ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.08, 1] }
                        : { rotate: 0 }
                    }
                    transition={holding ? { duration: 0.5, repeat: Infinity } : {}}
                  >
                    <span className="cf-ritual__cup-icon">☕</span>
                    <svg className="cf-ritual__ring" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" className="cf-ritual__ring-bg" />
                      <circle
                        cx="60"
                        cy="60"
                        r="54"
                        className="cf-ritual__ring-fill"
                        style={{
                          strokeDasharray: 339.292,
                          strokeDashoffset: 339.292 * (1 - holdProgress / 100),
                        }}
                      />
                    </svg>
                  </motion.button>
                  <p className="cf-ritual__progress">
                    {holding ? 'فنجان را می‌چرخانی…' : 'نگه دار و بچرخان'}
                  </p>
                </motion.div>
              )}

              {modalPhase === 'reading' && (
                <motion.div
                  key="reading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="cf-reading"
                >
                  <div className="cf-reading__cup">
                    {settings.symbols.slice(0, 5).map((sym, i) => (
                      <motion.span
                        key={sym.id}
                        className="cf-reading__symbol"
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: [0, 1, 0.6], scale: [0, 1.2, 1], y: [20, -10, 0] }}
                        transition={{ delay: i * 0.35, duration: 0.8 }}
                      >
                        {sym.emoji}
                      </motion.span>
                    ))}
                  </div>
                  <p className="cf-reading__text">{settings.readingHint}</p>
                  <div className="cf-reading__steam">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        animate={{ y: [-4, -28], opacity: [0.6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.4 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {modalPhase === 'revealed' && reading && (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="cf-reveal"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: revealedSections >= 1 ? 1 : 0, y: revealedSections >= 1 ? 0 : 30 }}
                  >
                    <FortuneStoryCard
                      reading={reading}
                      settings={settings}
                      storeName={storeName}
                      cardRef={cardRef}
                    />
                  </motion.div>

                  <motion.div
                    className="cf-reveal__actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: revealedSections >= 4 ? 1 : 0 }}
                  >
                    <Button type="button" variant="outline" className="flex-1" onClick={shareFortune}>
                      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                      {copied ? 'کپی شد!' : 'اشتراک / کپی'}
                    </Button>
                    {canReadAgain && (
                      <Button type="button" variant="outline" className="flex-1" onClick={readAgain}>
                        <Copy className="h-4 w-4" />
                        فال جدید
                      </Button>
                    )}
                  </motion.div>

                  {suggestedItem && onPickDrink && revealedSections >= 5 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => {
                          onPickDrink(suggestedItem)
                          closeModal()
                        }}
                      >
                        {suggestedItem.emoji} اضافه به سبد — {suggestedItem.name}
                      </Button>
                    </motion.div>
                  )}

                  <p className="cf-reveal__screenshot-hint">
                    📸 برای استوری اسکرین‌شات از کارت بالا بگیر
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
