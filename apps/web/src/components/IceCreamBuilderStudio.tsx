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
        'relative flex w-[7.25rem] shrink-0 snap-center flex-col items-center gap-1.5 rounded-2xl border px-2 py-2 transition-colors',
        selected
          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
          : 'border-border/60 bg-card hover:border-primary/30',
      )}
    >
      <div className="flex h-12 w-full items-center justify-center rounded-xl bg-muted/50">
        <MiniIceSwatch option={option} type={optionType} selectedBuild={currentBuild} />
      </div>
      <p className="line-clamp-2 min-h-[2.4em] w-full text-center text-[12px] font-semibold leading-snug tracking-tight">
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
    <div className="pointer-events-none absolute start-3 top-1/2 z-30 w-[min(42%,11.5rem)] -translate-y-1/2">
      <div className="rounded-2xl border border-border/50 bg-white/90 p-2.5 shadow-sm backdrop-blur-md dark:bg-background/90">
        <p className="mb-1.5 text-[10px] font-bold tracking-wide text-muted-foreground">
          بستنی شما
        </p>
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.label} className="min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground">{row.label}</p>
              <p className="truncate text-[12px] font-bold leading-tight text-foreground">
                {row.value ? (
                  <>
                    <span className="me-1" aria-hidden>
                      {row.emoji}
                    </span>
                    {row.value}
                  </>
                ) : (
                  <span className="font-medium text-muted-foreground/70">انتخاب نشده</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
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
        <p className="text-[11px] font-medium text-muted-foreground">{hint}</p>
        <p className="flex items-center gap-0.5 text-[10px] font-semibold text-primary/80">
          <ChevronRight className="h-3 w-3" />
          بکشید
          <ChevronLeft className="h-3 w-3" />
        </p>
      </div>

      <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-background to-transparent" />

      <button
        type="button"
        aria-label="گزینه قبلی"
        className="absolute start-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-sm backdrop-blur"
        onClick={() => nudge(1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="گزینه بعدی"
        className="absolute end-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-sm backdrop-blur"
        onClick={() => nudge(-1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={scrollerRef}
        className="-mx-0.5 flex gap-2.5 overflow-x-auto overscroll-x-contain scroll-smooth px-7 py-0.5 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
        <BuildSummary build={build} labels={stepLabels} />
      </div>

      <div className="flex shrink-0 flex-col rounded-t-2xl border border-border/50 border-b-0 bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="shrink-0 px-3 pb-1.5 pt-2">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 rounded-lg bg-muted/60 p-0.5">
              {steps.map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-center gap-0.5 rounded-md px-0.5 py-1.5 text-[10px] font-semibold transition-all',
                    step === s.num
                      ? 'bg-background text-primary shadow-sm'
                      : stepDone(s.num)
                        ? 'text-primary'
                        : 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                      step === s.num
                        ? 'bg-primary text-primary-foreground'
                        : stepDone(s.num)
                          ? 'bg-primary/15'
                          : 'bg-muted',
                    )}
                  >
                    {stepDone(s.num) && step !== s.num ? <Check className="h-2.5 w-2.5" /> : s.num}
                  </span>
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'h-8 w-8 shrink-0 rounded-lg border-dashed',
                shaking && 'animate-pulse border-primary/40 bg-primary/5',
              )}
              onClick={surpriseMe}
              aria-label="شانسی انتخاب کن"
              title="شانسی انتخاب کن!"
            >
              <Shuffle className="h-3.5 w-3.5" />
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

        <div className="shrink-0 border-t bg-background/95 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
              🍦
            </div>
            <div className="min-w-0 flex-1">
              {isComplete ? (
                <>
                  <div className="space-y-0.5 text-[11px] leading-tight text-muted-foreground">
                    <p>
                      <span className="font-semibold text-foreground/80">{stepLabels[0]}:</span>{' '}
                      {build.base?.name}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground/80">{stepLabels[1]}:</span>{' '}
                      {build.coating?.name}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground/80">{stepLabels[2]}:</span>{' '}
                      {build.filling?.name}
                    </p>
                  </div>
                  <p className="mt-0.5 text-base font-black text-primary">
                    {formatPrice(price, currencySuffix)}
                  </p>
                </>
              ) : (
                <p className="text-[11px] font-medium text-muted-foreground">
                  {steps[step - 1].title}
                  {stepDone(step as IceCreamStep) ? ' — مرحله بعد' : ''}
                </p>
              )}
            </div>
            <Button
              size="default"
              className="h-9 shrink-0 gap-1.5 rounded-lg px-3 text-sm"
              disabled={!isComplete}
              onClick={handleOrder}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              سفارش
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
