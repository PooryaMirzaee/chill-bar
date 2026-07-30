import { useMemo, useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import type { MenuItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import {
  loadTasteProfile,
  recordLike,
  recordSkip,
  getTasteRecommendations,
  getTopCategories,
  describeTaste,
  type TasteProfile,
} from '../lib/tasteProfile'
import { useTasteSync } from '../lib/customerAuth'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { cn } from '@/lib/utils'

import type { AddToCartHandler } from '../lib/cartFeedback'

interface Props {
  items: MenuItem[]
  onAddToCart?: AddToCartHandler
  onSelect?: (item: MenuItem) => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function SwipeDeck({ items, onAddToCart, onSelect }: Props) {
  const reducedMotion = useReducedMotion()
  const [profile, setProfile] = useState<TasteProfile>(loadTasteProfile)
  const tasteSync = useTasteSync()
  const [deck, setDeck] = useState(() => shuffle(items))
  const [index, setIndex] = useState(0)
  const [lastAction, setLastAction] = useState<'like' | 'skip' | null>(null)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], reducedMotion ? [0, 0] : [-15, 15])
  const likeOpacity = useTransform(x, [50, 150], reducedMotion ? [0, 0] : [0, 1])
  const skipOpacity = useTransform(x, [-150, -50], reducedMotion ? [0, 0] : [1, 0])

  const swipedIds = useMemo(
    () => new Set([...profile.likedIds, ...profile.skippedIds]),
    [profile],
  )

  const remaining = deck.filter((item) => !swipedIds.has(item.id))
  const current = remaining[0]
  const isDone = !current

  const recommendations = useMemo(
    () => getTasteRecommendations(items, profile, 5),
    [items, profile],
  )

  const topCats = getTopCategories(profile, 3)

  const advance = () => {
    x.set(0)
    setIndex((i) => i + 1)
    setTimeout(() => setLastAction(null), 1200)
  }

  const handleLike = () => {
    if (!current) return
    const next = recordLike(profile, current)
    setProfile(next)
    tasteSync(next)
    setLastAction('like')
    advance()
  }

  const handleSkip = () => {
    if (!current) return
    const next = recordSkip(profile, current)
    setProfile(next)
    tasteSync(next)
    setLastAction('skip')
    advance()
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (reducedMotion) return
    if (info.offset.x > 100) handleLike()
    else if (info.offset.x < -100) handleSkip()
  }

  const reshuffle = () => {
    setDeck(shuffle(items.filter((i) => !swipedIds.has(i.id))))
    setIndex(0)
  }

  const categoryLabel = (catId: string) =>
    items.find((i) => i.category === catId)?.categoryName || catId

  const instant = reducedMotion ? { duration: 0 } : undefined

  return (
    <section className="section swipe-deck mx-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="section-header">
        <span className="mb-1 inline-block text-xs font-semibold uppercase tracking-wider text-primary">
          Taste Discovery
        </span>
        <h2>کشف سلیقه</h2>
        <p>راست = به سلیقه‌م می‌خوره · چپ = نه مال منه — فقط برای شناختن ذائقه‌ات، نه سبد خرید</p>
      </div>

      <div className="taste-stats">
        <div className="taste-stat">
          <span className="taste-stat-num">{profile.likedIds.length}</span>
          <span className="taste-stat-label">دوست داشتم</span>
        </div>
        <div className="taste-stat">
          <span className="taste-stat-num">{profile.skippedIds.length}</span>
          <span className="taste-stat-label">رد کردم</span>
        </div>
        <div className="taste-stat taste-stat--wide">
          <span className="taste-stat-hint">{describeTaste(profile, items)}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isDone ? (
          <motion.div
            key="deck"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={instant}
          >
            <div className="swipe-container">
              {!reducedMotion && (
                <>
                  <motion.div className="swipe-label like-label" style={{ opacity: likeOpacity }}>
                    ✓ سلیقه‌امه
                  </motion.div>
                  <motion.div className="swipe-label skip-label" style={{ opacity: skipOpacity }}>
                    ✕ نه
                  </motion.div>
                </>
              )}
              <motion.div
                key={`${current.id}-${index}`}
                className="swipe-card"
                style={reducedMotion ? undefined : { x, rotate }}
                drag={reducedMotion ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                whileTap={reducedMotion ? undefined : { cursor: 'grabbing' }}
                initial={reducedMotion ? false : { scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={instant}
              >
                <div className="swipe-emoji">{current.emoji}</div>
                <h3>{current.name}</h3>
                <p className="swipe-category">{current.categoryName}</p>
                <p className="swipe-price">{formatPrice(current.price)}</p>
                <button
                  type="button"
                  className="swipe-detail-btn"
                  onClick={(e) => { e.stopPropagation(); onSelect?.(current) }}
                >
                  جزئیات
                </button>
              </motion.div>
            </div>

            <div className="swipe-actions">
              <button type="button" className="swipe-btn skip" onClick={handleSkip} aria-label="رد کن">✕</button>
              <button type="button" className="swipe-btn like" onClick={handleLike} aria-label="به سلیقه‌ام می‌خوره">✓</button>
            </div>

            <p className="swipe-remaining">{remaining.length} مورد برای کشف باقی‌ست</p>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            className="taste-complete"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={instant}
          >
            <span className="taste-complete-icon">🎯</span>
            <h3>سلیقه‌ات رو شناختیم!</h3>
            <p>بر اساس انتخاب‌هات، این‌ها رو امتحان کن</p>
            {remaining.length === 0 && items.length > swipedIds.size && (
              <button type="button" className="btn-secondary" onClick={reshuffle} style={{ marginTop: 12 }}>
                ادامه کشف
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lastAction && (
          <motion.p
            className={cn('swipe-feedback', `swipe-feedback--${lastAction}`)}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={instant}
          >
            {lastAction === 'like' ? '✓ به پروفایل سلیقه‌ات اضافه شد' : 'ثبت شد — کمتر پیشنهاد می‌شه'}
          </motion.p>
        )}
      </AnimatePresence>

      {topCats.length > 0 && (
        <div className="taste-tags">
          {topCats.map((c) => (
            <span key={c.id} className="taste-tag">{categoryLabel(c.id)}</span>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="taste-picks">
          <h4>پیشنهاد تازه بر اساس سلیقه‌ات</h4>
          <div className="taste-picks-list">
            {recommendations.map((item) => (
              <article key={item.id} className="taste-pick-card">
                <button type="button" className="taste-pick-main" onClick={() => onSelect?.(item)}>
                  <span className="taste-pick-emoji">{item.emoji}</span>
                  <div className="taste-pick-info">
                    <strong>{item.name.split('(')[0].trim()}</strong>
                    <span className="taste-pick-reason">{item.reason}</span>
                  </div>
                  <span className="taste-pick-price">{formatPrice(item.price)}</span>
                </button>
                {onAddToCart && (
                  <button
                    type="button"
                    className="taste-pick-add"
                    onClick={(e) => onAddToCart(item, e)}
                    aria-label="اضافه به سبد"
                  >
                    +
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
