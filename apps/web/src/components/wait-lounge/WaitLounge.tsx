import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Clock, Sparkles, Trophy, X } from 'lucide-react'
import {
  formatChillPoints,
  loungeEnabledGameIds,
  type WaitGameId,
} from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWaitLounge } from '../../store/waitLounge'
import { useLoyalty } from '../../hooks/useLoyalty'
import { useMenuData } from '../../hooks/useMenuData'
import { isLoungeTerminal } from '../../store/activeOrder'
import { WAIT_GAME_META } from './gameMeta'
import { GameCard } from './GameCard'
import { OrderStatusStepper } from './OrderStatusStepper'
import { ChillBeat } from './ChillBeat'
import { MemoryBrew } from './MemoryBrew'
import { ChillStack } from './ChillStack'
import { SnakeGame } from './SnakeGame'

type Tab = 'status' | 'games' | 'points'

export function WaitLounge() {
  const {
    activeOrder,
    loungeOpen,
    setLoungeOpen,
    sessionPoints,
    canPlay,
    loungeSettings,
    loungeCopy,
    loungeEnabled,
  } = useWaitLounge()
  const { balance, hasAccount } = useLoyalty(loungeOpen)
  const { items } = useMenuData()
  const [tab, setTab] = useState<Tab>('games')
  const [activeGame, setActiveGame] = useState<WaitGameId | null>(null)

  const enabledGames = useMemo(
    () => loungeEnabledGameIds(loungeSettings),
    [loungeSettings],
  )

  if (!loungeEnabled || !activeOrder) return null

  const terminal = isLoungeTerminal(activeOrder.status)
  const ready = activeOrder.status === 'READY'
  const pointsPct = Math.min(100, (sessionPoints / loungeSettings.maxPointsPerOrder) * 100)

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: 'status', label: 'وضعیت', icon: Clock },
    { id: 'games', label: 'بازی‌ها', icon: Gamepad2 },
    { id: 'points', label: loungeCopy.waitLoungePointsLabel, icon: Sparkles },
  ]

  return (
    <Sheet open={loungeOpen} onOpenChange={setLoungeOpen}>
      <SheetContent
        side="bottom"
        className="flex h-[92vh] flex-col overflow-hidden rounded-t-3xl border-t-0 p-0"
      >
        {/* Hero header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-bl from-slate-950 via-slate-900 to-violet-950 px-4 pb-4 pt-3 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative">
            <div className="mb-3 flex items-start justify-between">
              <div className="text-right">
                <h2 className="text-lg font-bold">{loungeCopy.waitLoungeTitle}</h2>
                <p className="mt-0.5 text-xs text-white/70">{loungeCopy.waitLoungeSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLoungeOpen(false)}
                className="rounded-full bg-white/10 p-1.5 backdrop-blur-sm transition hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-2.5 backdrop-blur-sm">
              <span className="text-xs text-white/70">کد سفارش</span>
              <strong className="font-mono text-lg tracking-[0.2em]">{activeOrder.code}</strong>
            </div>

            {!ready && !terminal && (
              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-white/70">امتیاز این سفارش</span>
                  <span className="font-semibold">
                    {formatChillPoints(sessionPoints)} / {formatChillPoints(loungeSettings.maxPointsPerOrder)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/25">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-violet-500 to-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pointsPct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {ready || terminal ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            {ready ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-3"
              >
                <div className="text-6xl">🎉</div>
                <h3 className="text-2xl font-bold">{loungeCopy.waitLoungeReadyTitle}</h3>
                <p className="text-sm text-muted-foreground">{loungeCopy.waitLoungeReadyMessage}</p>
              </motion.div>
            ) : (
              <p className="text-muted-foreground">این سفارش دیگر در سالن انتظار نیست.</p>
            )}
            <div className="w-full max-w-xs rounded-2xl border bg-gradient-to-b from-primary/10 to-transparent p-5">
              <Trophy className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">امتیاز این سفارش</p>
              <p className="text-3xl font-bold text-primary">{formatChillPoints(sessionPoints)}</p>
            </div>
            <Button className="w-full max-w-xs" size="lg" onClick={() => setLoungeOpen(false)}>
              بستن
            </Button>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 border-b bg-background/80 px-2 backdrop-blur-sm">
              {tabs.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      'relative flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition',
                      tab === t.id ? 'text-primary' : 'text-muted-foreground',
                    )}
                    onClick={() => {
                      setTab(t.id)
                      setActiveGame(null)
                    }}
                  >
                    {tab === t.id && (
                      <motion.div
                        layoutId="lounge-tab"
                        className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary"
                      />
                    )}
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                )
              })}
            </div>

            <ScrollArea className="flex-1">
              <div className="px-4 pb-6">
                <AnimatePresence mode="wait">
                  {tab === 'status' && (
                    <motion.div
                      key="status"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="space-y-4 py-4"
                    >
                      <OrderStatusStepper
                        status={activeOrder.status}
                        estimatedMinutes={loungeSettings.estimatedPrepMinutes}
                        bonusMultiplier={loungeSettings.statusBonusMultiplier}
                      />
                      {canPlay && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() => setTab('games')}
                        >
                          <Gamepad2 className="ml-2 h-4 w-4" />
                          برو به بازی‌ها
                        </Button>
                      )}
                    </motion.div>
                  )}

                  {tab === 'games' && !activeGame && (
                    <motion.div
                      key="games-list"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="space-y-3 py-4"
                    >
                      {!canPlay && (
                        <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                          بازی برای وضعیت فعلی سفارش بسته است
                        </div>
                      )}
                      {enabledGames.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          فعلاً بازی‌ای فعال نیست
                        </p>
                      )}
                      {enabledGames.map((id) => {
                        const meta = WAIT_GAME_META[id]
                        return (
                          <GameCard
                            key={id}
                            title={meta.title}
                            description={meta.description}
                            emoji={meta.emoji}
                            gradient={meta.gradient}
                            featured={meta.featured}
                            disabled={!canPlay}
                            onClick={() => setActiveGame(id)}
                          />
                        )
                      })}
                    </motion.div>
                  )}

                  {tab === 'games' && activeGame && (
                    <motion.div
                      key={`game-${activeGame}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      className="py-4"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mb-3 -mr-2"
                        onClick={() => setActiveGame(null)}
                      >
                        ← بازگشت به بازی‌ها
                      </Button>
                      <h4 className="mb-4 text-center text-lg font-bold">
                        {WAIT_GAME_META[activeGame].title}
                      </h4>
                      {activeGame === 'perfectPour' && (
                        <ChillBeat tuning={loungeSettings.games.perfectPour} disabled={!canPlay} />
                      )}
                      {activeGame === 'memoryBrew' && (
                        <MemoryBrew
                          tuning={loungeSettings.games.memoryBrew}
                          menuItems={items}
                          disabled={!canPlay}
                        />
                      )}
                      {activeGame === 'chillStack' && (
                        <ChillStack tuning={loungeSettings.games.chillStack} disabled={!canPlay} />
                      )}
                      {activeGame === 'snakeGame' && (
                        <SnakeGame tuning={loungeSettings.games.snakeGame} disabled={!canPlay} />
                      )}
                    </motion.div>
                  )}

                  {tab === 'points' && (
                    <motion.div
                      key="points"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      className="space-y-4 py-4"
                    >
                      <div className="rounded-2xl border bg-gradient-to-b from-primary/10 to-transparent p-5 text-center">
                        <Sparkles className="mx-auto mb-2 h-7 w-7 text-primary" />
                        <p className="text-sm text-muted-foreground">امتیاز این سفارش</p>
                        <p className="text-4xl font-bold text-primary">
                          {formatChillPoints(sessionPoints)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          سقف: {formatChillPoints(loungeSettings.maxPointsPerOrder)}
                        </p>
                      </div>

                      {hasAccount ? (
                        <div className="rounded-2xl border bg-card p-4 text-center">
                          <p className="text-sm text-muted-foreground">موجودی کل شما</p>
                          <p className="text-2xl font-bold">{formatChillPoints(balance)}</p>
                          {loungeSettings.pointsRedemptionEnabled ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              در سفارش بعدی از تب سبد خرید می‌توانی امتیاز را مصرف کنی
                            </p>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
                              امتیازها در حال جمع‌آوری است. به‌زودی می‌توانی از آن‌ها برای تخفیف
                              استفاده کنی!
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                          با ثبت‌نام، امتیازها ذخیره می‌شوند و در سفارش‌های بعدی قابل استفاده‌اند.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
