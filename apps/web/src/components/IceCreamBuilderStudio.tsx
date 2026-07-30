import { useRef, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ShoppingBag, Shuffle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { IceCreamOptions, StoreCopy } from '@chill-bar/shared'
import type { MenuItem } from '../types'
import type { IceCreamBuild, IceCreamOption } from '../data/iceCreamBuilder'
import { formatPrice } from '../lib/comboBuilder'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { IceCreamPreview } from './IceCreamPreview'
import { MiniIceSwatch } from './MiniIceSwatch'
import { useIceCreamBuild, type IceCreamStep } from '../hooks/useIceCreamBuild'

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

function OptionChip({
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
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative flex min-h-11 w-[7.5rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-colors',
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-sm shadow-primary/10'
          : 'border-border/60 bg-card hover:border-primary/30 hover:bg-primary/[0.03]',
      )}
    >
      <div className="flex h-12 w-full items-center justify-center rounded-xl bg-muted/50">
        <MiniIceSwatch option={option} type={optionType} selectedBuild={currentBuild} />
      </div>
      <p className="line-clamp-2 min-h-[2.4em] w-full text-center text-xs font-semibold leading-snug tracking-tight sm:text-sm">
        <span className="me-0.5" aria-hidden>
          {option.emoji}
        </span>
        {option.name}
      </p>
      {selected && (
        <span className="absolute end-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
          <Check className="h-3 w-3" />
        </span>
      )}
    </motion.button>
  )
}

function BuildSummary({
  build,
  labels,
}: {
  build: IceCreamBuild
  labels: [string, string, string]
}) {
  const rows = [
    { label: labels[0], value: build.base?.name, emoji: build.base?.emoji },
    { label: labels[1], value: build.coating?.name, emoji: build.coating?.emoji },
    { label: labels[2], value: build.filling?.name, emoji: build.filling?.emoji },
  ]

  return (
    <div className="rounded-xl border border-primary/15 bg-card px-3 py-2.5 shadow-sm">
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.label} className="flex min-w-0 items-baseline gap-2">
            <span className="w-14 shrink-0 text-xs font-medium text-muted-foreground">
              {row.label}:
            </span>
            <span className="min-w-0 truncate text-sm font-bold leading-snug text-foreground">
              {row.value ? (
                <>
                  <span className="me-1" aria-hidden>
                    {row.emoji}
                  </span>
                  {row.value}
                </>
              ) : (
                <span className="font-medium text-muted-foreground/65">انتخاب نشده</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SwipeOptionsRow({
  step,
  children,
  hint,
}: {
  step: number
  children: ReactNode
  hint: string
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const nudge = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 140, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-medium text-muted-foreground">{hint}</p>
        <p className="flex items-center gap-0.5 text-xs font-semibold text-primary/80">
          <ChevronRight className="h-3.5 w-3.5" />
          بکشید
          <ChevronLeft className="h-3.5 w-3.5" />
        </p>
      </div>

      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />

      <button
        type="button"
        aria-label="گزینه قبلی"
        className="absolute start-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card/95 text-muted-foreground shadow-sm backdrop-blur"
        onClick={() => nudge(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="گزینه بعدی"
        className="absolute end-0 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-primary/20 bg-card/95 text-muted-foreground shadow-sm backdrop-blur"
        onClick={() => nudge(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollerRef}
        className="-mx-0.5 flex gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth px-11 py-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.16 }}
            className="flex gap-2.5"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export function IceCreamBuilderStudio({ onOrder, iceOptions, copy, iceCreamCategoryId }: Props) {
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
    currencySuffix,
  } = useIceCreamBuild({ iceOptions, copy, iceCreamCategoryId, onOrder })

  const swipeHint =
    step === 1
      ? 'پایه را انتخاب کنید — لیست قابل سوایپ است'
      : step === 2
        ? 'روکش را انتخاب کنید — به چپ و راست بکشید'
        : 'فیلینگ را انتخاب کنید — به چپ و راست بکشید'

  return (
    <div className="flex h-[calc(100dvh-4.25rem-var(--safe-bottom,0px))] flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <IceCreamPreview
          build={build}
          activeStep={step}
          stepLabels={stepLabels}
          immersive
          className="h-full"
        />
      </div>

      <div className="flex shrink-0 flex-col rounded-t-2xl border border-primary/15 border-b-0 bg-card shadow-[0_-4px_24px_rgba(242,101,34,0.08)]">
        <div className="shrink-0 px-3 pb-1.5 pt-2.5">
          <div className="mb-2.5">
            <BuildSummary build={build} labels={stepLabels} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex min-h-11 min-w-0 flex-1 rounded-xl border border-border/40 bg-muted/40 p-0.5">
              {steps.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={cn(
                    'flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-semibold transition-all',
                    step === s.num
                      ? 'bg-background text-primary shadow-sm'
                      : stepDone(s.num)
                        ? 'text-primary'
                        : 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]',
                      step === s.num
                        ? 'bg-primary text-primary-foreground'
                        : stepDone(s.num)
                          ? 'bg-primary/15'
                          : 'bg-muted',
                    )}
                  >
                    {stepDone(s.num) && step !== s.num ? <Check className="h-3 w-3" /> : s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'h-11 w-11 shrink-0 rounded-xl border-dashed border-primary/25',
                shaking && 'animate-pulse border-primary/40 bg-primary/5',
              )}
              onClick={surpriseMe}
              aria-label="شانسی انتخاب کن"
              title="شانسی انتخاب کن!"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="shrink-0 px-3 pb-2">
          <SwipeOptionsRow step={step} hint={swipeHint}>
            {currentOptions.map((opt) => (
              <OptionChip
                key={opt.id}
                option={opt}
                selected={build[currentKey]?.id === opt.id}
                onSelect={() => select(currentKey, opt)}
                optionType={stepName}
                currentBuild={build}
              />
            ))}
          </SwipeOptionsRow>
        </div>

        <div className="sticky bottom-0 shrink-0 border-t border-primary/10 bg-card/95 px-3 py-3 backdrop-blur-md pb-[calc(0.75rem+var(--safe-bottom,0px))]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
              🍦
            </div>
            <div className="min-w-0 flex-1">
              {isComplete ? (
                <>
                  <p className="text-xs text-muted-foreground">بستنی سفارشی آماده است</p>
                  <p className="text-base font-black text-primary">
                    {formatPrice(price, currencySuffix)}
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  {steps[step - 1].title}
                  {stepDone(step as IceCreamStep) ? ' — مرحله بعد' : ''}
                </p>
              )}
            </div>
            <Button
              size="default"
              className="h-11 shrink-0 gap-1.5 rounded-xl px-4 text-sm font-semibold"
              disabled={!isComplete}
              onClick={handleOrder}
            >
              <ShoppingBag className="h-4 w-4" />
              سفارش
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
