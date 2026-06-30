import { Fragment, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, ChevronRight, ChevronLeft, Shuffle } from 'lucide-react'
import type { MenuItem } from '../types'
import type { IceCreamOptions, StoreCopy } from '@chill-bar/shared'
import type { IceCreamBuild, IceCreamOption } from '../data/iceCreamBuilder'
import { formatPrice } from '../lib/comboBuilder'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { IceCreamPreview } from './IceCreamPreview'
import { MiniIceSwatch } from './MiniIceSwatch'
import { useIceCreamBuild } from '../hooks/useIceCreamBuild'

interface Props {
  onOrder: (item: MenuItem) => void
  iceOptions: IceCreamOptions
  copy: Pick<
    StoreCopy,
    | 'iceStep1Label'
    | 'iceStep1Title'
    | 'iceStep2Label'
    | 'iceStep2Title'
    | 'iceStep3Label'
    | 'iceStep3Title'
    | 'iceCustomName'
    | 'currencySuffix'
  >
  iceCreamCategoryId?: string | null
}

function OptionCard({
  option,
  selected,
  onSelect,
  optionType,
  currentBuild,
}: {
  option: IceCreamOption
  selected: boolean
  onSelect: () => void
  optionType: 'base' | 'coating' | 'filling'
  currentBuild: IceCreamBuild
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className="w-full text-start"
    >
      <Card
        className={cn(
          'relative flex h-full flex-col gap-2 overflow-hidden p-2.5 transition-all duration-200',
          selected
            ? 'border-primary bg-primary/5 ring-2 ring-primary/25 shadow-md'
            : 'border-border/60 hover:border-primary/35 hover:bg-accent/20',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-lg">
            {option.emoji}
          </span>
          <div className="flex h-[68px] flex-1 items-center justify-center rounded-lg bg-muted/40">
            <MiniIceSwatch option={option} type={optionType} selectedBuild={currentBuild} />
          </div>
        </div>

        <p className="line-clamp-2 px-0.5 text-center text-xs font-semibold leading-snug">
          {option.name}
        </p>

        {selected && (
          <div className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.button>
  )
}

/** حالت کلاسیک — پیش‌نمایش بالا + شیت اسکرول‌شونده (UX قبلی) */
export function IceCreamBuilder({ onOrder, iceOptions, copy, iceCreamCategoryId }: Props) {
  const {
    step,
    setStep,
    build,
    select,
    surpriseMe,
    shaking,
    isComplete,
    price,
    handleOrder,
    steps,
    stepLabels,
    currentOptions,
    currentKey,
    stepName,
    stepDone,
    goBack,
    goNext,
    currencySuffix,
  } = useIceCreamBuild({ iceOptions, copy, iceCreamCategoryId, onOrder })

  const orderBarRef = useRef<HTMLDivElement>(null)
  const wasCompleteRef = useRef(false)

  useEffect(() => {
    if (!isComplete) {
      wasCompleteRef.current = false
      return
    }
    if (wasCompleteRef.current) return
    wasCompleteRef.current = true
    const t = window.setTimeout(() => {
      orderBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [isComplete])

  return (
    <section className="pb-24">
      <IceCreamPreview build={build} activeStep={step} stepLabels={stepLabels} />

      <div className="relative z-10 mt-2 rounded-t-[1.75rem] border border-border/60 border-b-0 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] backdrop-blur-xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-muted-foreground/20" />

        <div className="space-y-4 px-4 pb-4 pt-4">
          <Button
            variant="outline"
            className={cn(
              'h-10 w-full gap-2 rounded-xl border-dashed text-sm font-semibold',
              shaking && 'animate-pulse border-primary/40 bg-primary/5',
            )}
            onClick={surpriseMe}
          >
            <Shuffle className="h-4 w-4" />
            شانسی انتخاب کن!
          </Button>

          <div className="flex w-full items-center gap-1">
            {steps.map((s, i) => (
              <Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={cn(
                    'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors',
                    step === s.num ? 'bg-primary/10' : 'hover:bg-muted/50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                      step === s.num
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                        : stepDone(s.num)
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {stepDone(s.num) && step !== s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <span
                    className={cn(
                      'truncate text-[10px] font-medium',
                      step === s.num ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-3 shrink-0 rounded-full',
                      stepDone(s.num) ? 'bg-primary/50' : 'bg-border',
                    )}
                  />
                )}
              </Fragment>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={goBack}
              disabled={step === 1}
            >
              <ChevronRight className="h-4 w-4" />
              قبلی
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-sm font-bold">{steps[step - 1].title}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={goNext}
              disabled={step === 3 || !stepDone(step)}
            >
              بعدی
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="grid grid-cols-2 gap-2.5">
                {currentOptions.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    option={opt}
                    selected={build[currentKey]?.id === opt.id}
                    onSelect={() => select(currentKey, opt)}
                    optionType={stepName}
                    currentBuild={build}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.div
            ref={orderBarRef}
            className="fixed inset-x-4 bottom-[calc(4.25rem+var(--safe-bottom,0px))] z-40 mx-auto max-w-lg"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <Card className="flex items-center gap-3 border-primary/35 bg-background/98 p-3 shadow-2xl backdrop-blur-xl">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🍦
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">
                  {build.base?.name} · {build.coating?.name} · {build.filling?.name}
                </p>
                <p className="text-lg font-black text-primary">
                  {formatPrice(price, currencySuffix)}
                </p>
              </div>
              <Button size="lg" className="shrink-0 gap-2 rounded-xl px-5" onClick={handleOrder}>
                <ShoppingBag className="h-4 w-4" />
                سفارش
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
