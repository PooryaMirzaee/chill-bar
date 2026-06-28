import { Fragment, useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Shuffle, Check, ShoppingBag } from 'lucide-react'
import type { WeatherData, MenuItem } from '../types'
import type { IceCreamOptions, StoreCopy } from '@chill-bar/shared'
import {
  type IceCreamBuild,
  type IceCreamOption,
  calcPrice,
  buildName,
  getSmartIceCreamSuggestion,
  scoreOption,
} from '../data/iceCreamBuilder'
import { formatPrice } from '../lib/comboBuilder'
import { getBuildProgress } from '../lib/iceCreamGraphics'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { IceCreamPreview } from './IceCreamPreview'
import { MiniIceSwatch } from './MiniIceSwatch'
import { useCustomer } from '../lib/customerAuth'

interface Props {
  weather: WeatherData | null
  onOrder: (item: MenuItem) => void
  presetItems: MenuItem[]
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

type Step = 1 | 2 | 3

function OptionCard({
  option,
  selected,
  onSelect,
  recommended,
  optionType,
  currentBuild,
}: {
  option: IceCreamOption
  selected: boolean
  onSelect: () => void
  recommended?: boolean
  optionType: 'base' | 'coating' | 'filling'
  currentBuild: IceCreamBuild
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="w-full"
    >
      <Card
        className={cn(
          'relative flex flex-col items-center gap-2 p-3 transition-all duration-200',
          selected
            ? 'border-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
            : 'border-border/60 hover:border-primary/40 hover:bg-accent/30',
          recommended && !selected && 'border-primary/30',
        )}
      >
        {recommended && (
          <Badge className="absolute -top-2 start-2 px-1.5 py-0 text-[9px]">پیشنهاد</Badge>
        )}
        <div className="flex h-[72px] items-center justify-center">
          <MiniIceSwatch option={option} type={optionType} selectedBuild={currentBuild} />
        </div>
        <span className="line-clamp-2 text-center text-xs font-medium leading-snug">{option.name}</span>
        {option.priceMod !== 0 && (
          <span className="text-[10px] font-semibold text-primary">
            {option.priceMod > 0 ? '+' : ''}
            {option.priceMod.toLocaleString('fa-IR')} تومان
          </span>
        )}
        {selected && (
          <div className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </Card>
    </motion.button>
  )
}

export function IceCreamBuilder({
  weather,
  onOrder,
  presetItems,
  iceOptions,
  copy,
  iceCreamCategoryId,
}: Props) {
  const { bases, coatings, fillings, basePrice, minPrice, smartSuggestions } = iceOptions
  const catalog = useMemo(() => ({ bases, coatings, fillings }), [bases, coatings, fillings])
  const steps = useMemo(
    () =>
      [
        { num: 1 as Step, label: copy.iceStep1Label, title: copy.iceStep1Title },
        { num: 2 as Step, label: copy.iceStep2Label, title: copy.iceStep2Title },
        { num: 3 as Step, label: copy.iceStep3Label, title: copy.iceStep3Title },
      ] as const,
    [copy],
  )

  const [step, setStep] = useState<Step>(1)
  const [build, setBuild] = useState<IceCreamBuild>({ base: null, coating: null, filling: null })
  const [shaking, setShaking] = useState(false)
  const { isRegistered, syncPreferences } = useCustomer()
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestion = useMemo(
    () => (smartSuggestions ? getSmartIceCreamSuggestion(weather, catalog) : {}),
    [weather, catalog, smartSuggestions],
  )

  useEffect(() => {
    const saved = localStorage.getItem('chill-ice-build')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setBuild({
          base: bases.find((b) => b.id === parsed.base) || null,
          coating: coatings.find((c) => c.id === parsed.coating) || null,
          filling: fillings.find((f) => f.id === parsed.filling) || null,
        })
      } catch {
        /* ignore */
      }
    }
  }, [bases, coatings, fillings])

  useEffect(() => {
    localStorage.setItem(
      'chill-ice-build',
      JSON.stringify({
        base: build.base?.id,
        coating: build.coating?.id,
        filling: build.filling?.id,
      }),
    )
    if (!isRegistered) return
    if (syncRef.current) clearTimeout(syncRef.current)
    syncRef.current = setTimeout(() => {
      syncPreferences({
        iceCreamBuild: {
          base: build.base?.id ?? null,
          coating: build.coating?.id ?? null,
          filling: build.filling?.id ?? null,
        },
      }).catch(() => undefined)
    }, 1200)
  }, [build, isRegistered, syncPreferences])

  const getRecommended = (options: IceCreamOption[], stepName: 'base' | 'coating' | 'filling') => {
    if (!weather) return null
    const scored = options.map((o) => ({ o, s: scoreOption(o, weather, stepName) }))
    const best = scored.sort((a, b) => b.s - a.s)[0]
    return (
      best && best.s > 0.5
        ? best.o.id
        : suggestion[stepName === 'base' ? 'base' : stepName === 'coating' ? 'coating' : 'filling']?.id
    )
  }

  const applySmart = () => {
    setBuild({
      base: suggestion.base || null,
      coating: suggestion.coating || null,
      filling: suggestion.filling || null,
    })
    setStep(3)
  }

  const surpriseMe = () => {
    setShaking(true)
    setTimeout(() => {
      setBuild({
        base: bases[Math.floor(Math.random() * bases.length)],
        coating: coatings[Math.floor(Math.random() * Math.max(coatings.length - 1, 1))],
        filling: fillings[Math.floor(Math.random() * fillings.length)],
      })
      setStep(3)
      setShaking(false)
    }, 500)
  }

  const select = (key: keyof IceCreamBuild, option: IceCreamOption) => {
    setBuild((b) => ({ ...b, [key]: option }))
    if (key === 'base') setStep(2)
    if (key === 'coating') setStep(3)
  }

  const isComplete = build.base && build.coating && build.filling
  const price = calcPrice(build, basePrice, minPrice)
  const progress = getBuildProgress(build)
  const customLabel = copy.iceCustomName

  const handleOrder = () => {
    if (!isComplete) return
    onOrder({
      id: `custom-ice-${Date.now()}`,
      name: buildName(build, customLabel),
      price,
      category: iceCreamCategoryId ?? 'icecream',
      categoryName: customLabel,
      emoji: '🍦',
      tags: { sweet: 1, cold: 0.9 },
      description: `پایه: ${build.base!.name} | روکش: ${build.coating!.name} | فیلینگ: ${build.filling!.name}`,
      customConfig: {
        iceCreamBuild: {
          baseId: build.base!.id,
          coatingId: build.coating!.id,
          fillingId: build.filling!.id,
        },
      },
    })
  }

  const currentOptions = step === 1 ? bases : step === 2 ? coatings : fillings
  const currentKey = step === 1 ? 'base' : step === 2 ? 'coating' : 'filling'
  const stepName = currentKey as 'base' | 'coating' | 'filling'
  const recId = getRecommended(currentOptions, stepName)

  const stepDone = (n: Step) =>
    (n === 1 && !!build.base) || (n === 2 && !!build.coating) || (n === 3 && !!build.filling)

  return (
    <section className="pb-28">
      <IceCreamPreview build={build} activeStep={step} />

      <div className="mt-3 space-y-5 px-4">
        {/* build summary — static row, no overlap with 3D */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {build.base ? (
            <Badge variant="secondary" className="border-border/50">
              پایه: {build.base.name}
            </Badge>
          ) : (
            <Badge variant="outline">پایه را انتخاب کنید</Badge>
          )}
          {build.coating && build.coating.id !== 'none' && (
            <Badge variant="secondary" className="border-border/50">
              روکش: {build.coating.name}
            </Badge>
          )}
          {build.filling && (
            <Badge variant="secondary" className="border-border/50">
              فیلینگ: {build.filling.name}
            </Badge>
          )}
          {isComplete && <Badge>آماده سفارش ✨</Badge>}
        </div>

        {progress < 100 && (
          <p className="text-center text-[11px] text-muted-foreground">
            {progress}% تکمیل شده
          </p>
        )}
        {weather && (
          <p className="text-center text-xs text-muted-foreground">
            {weather.icon} {weather.location} · {weather.temperature}° · {weather.description}
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={applySmart}>
            <Sparkles className="h-4 w-4 text-primary" />
            پیشنهاد هوشمند
          </Button>
          <Button
            variant="outline"
            className={cn('flex-1 gap-2', shaking && 'animate-pulse')}
            onClick={surpriseMe}
          >
            <Shuffle className="h-4 w-4" />
            شانسی!
          </Button>
        </div>

        {/* stepper */}
        <div className="flex w-full items-start">
          {steps.map((s, i) => (
            <Fragment key={s.num}>
              <button
                type="button"
                onClick={() => setStep(s.num)}
                className="flex shrink-0 flex-col items-center gap-1.5 px-0.5"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all',
                    step === s.num
                      ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25'
                      : stepDone(s.num)
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {stepDone(s.num) && step !== s.num ? <Check className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={cn(
                    'whitespace-nowrap text-[10px] font-medium',
                    step === s.num ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'mt-[18px] h-0.5 min-w-4 flex-1 rounded-full transition-colors',
                    stepDone(s.num) ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              )}
            </Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="mb-3 text-sm font-semibold">{steps[step - 1].title}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {currentOptions.map((opt) => (
                <OptionCard
                  key={opt.id}
                  option={opt}
                  selected={build[currentKey]?.id === opt.id}
                  onSelect={() => select(currentKey, opt)}
                  recommended={recId === opt.id}
                  optionType={stepName}
                  currentBuild={build}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {presetItems.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="mb-2.5 text-xs font-semibold text-muted-foreground">بستنی‌های آماده</h4>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2 pb-1">
                  {presetItems.slice(0, 12).map((item) => (
                    <Button
                      key={item.id}
                      variant="outline"
                      size="sm"
                      className="h-auto shrink-0 flex-col gap-0.5 px-3 py-2"
                      onClick={() => onOrder(item)}
                    >
                      <span className="text-base">🍦</span>
                      <span className="max-w-[88px] truncate text-[10px]">{item.name.split('(')[0].trim()}</span>
                      <span className="text-[10px] font-bold text-primary">{formatPrice(item.price)}</span>
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        )}
      </div>

      {/* sticky order bar */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            className="fixed start-16 end-4 bottom-[calc(4.25rem+var(--safe-bottom))] z-40 mx-auto max-w-lg"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
          >
            <Card className="flex items-center gap-3 border-primary/30 bg-background/95 p-3 shadow-2xl backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-muted-foreground">{buildName(build, customLabel)}</p>
                <p className="text-lg font-bold text-primary">{formatPrice(price, copy.currencySuffix)}</p>
              </div>
              <Button size="lg" className="shrink-0 gap-2" onClick={handleOrder}>
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
