import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import type { MenuItem } from '../types'
import type { IceCreamOptions, StoreCopy } from '@chill-bar/shared'
import {
  type IceCreamBuild,
  type IceCreamOption,
  calcPrice,
  buildName,
} from '../data/iceCreamBuilder'
import { useCustomer } from '../lib/customerAuth'

export type IceCreamStep = 1 | 2 | 3

type IceCopy = Pick<
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

interface UseIceCreamBuildOptions {
  iceOptions: IceCreamOptions
  copy: IceCopy
  iceCreamCategoryId?: string | null
  onOrder: (item: MenuItem) => void
}

export function useIceCreamBuild({ iceOptions, copy, iceCreamCategoryId, onOrder }: UseIceCreamBuildOptions) {
  const { bases, coatings, fillings, basePrice, minPrice } = iceOptions

  const steps = useMemo(
    () =>
      [
        { num: 1 as IceCreamStep, label: copy.iceStep1Label, title: copy.iceStep1Title },
        { num: 2 as IceCreamStep, label: copy.iceStep2Label, title: copy.iceStep2Title },
        { num: 3 as IceCreamStep, label: copy.iceStep3Label, title: copy.iceStep3Title },
      ] as const,
    [copy],
  )

  const stepLabels = useMemo(
    () => [copy.iceStep1Label, copy.iceStep2Label, copy.iceStep3Label] as [string, string, string],
    [copy],
  )

  const [step, setStep] = useState<IceCreamStep>(1)
  const [build, setBuild] = useState<IceCreamBuild>({ base: null, coating: null, filling: null })
  const [shaking, setShaking] = useState(false)
  const { isRegistered, syncPreferences } = useCustomer()
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const select = useCallback((key: keyof IceCreamBuild, option: IceCreamOption) => {
    setBuild((b) => ({ ...b, [key]: option }))
    if (navigator.vibrate) navigator.vibrate(12)
    if (key === 'base') setStep(2)
    else if (key === 'coating') setStep(3)
  }, [])

  const surpriseMe = useCallback(() => {
    if (bases.length === 0 || coatings.length === 0 || fillings.length === 0) return
    setShaking(true)
    window.setTimeout(() => {
      setBuild({
        base: bases[Math.floor(Math.random() * bases.length)],
        coating: coatings[Math.floor(Math.random() * coatings.length)],
        filling: fillings[Math.floor(Math.random() * fillings.length)],
      })
      setStep(3)
      setShaking(false)
    }, 420)
  }, [bases, coatings, fillings])

  const isComplete = !!(build.base && build.coating && build.filling)
  const price = calcPrice(build, basePrice, minPrice)
  const customLabel = copy.iceCustomName

  const handleOrder = useCallback(() => {
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
  }, [build, customLabel, iceCreamCategoryId, isComplete, onOrder, price])

  const currentOptions = step === 1 ? bases : step === 2 ? coatings : fillings
  const currentKey: keyof IceCreamBuild = step === 1 ? 'base' : step === 2 ? 'coating' : 'filling'
  const stepName = currentKey

  const stepDone = (n: IceCreamStep) =>
    (n === 1 && !!build.base) || (n === 2 && !!build.coating) || (n === 3 && !!build.filling)

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as IceCreamStep) : s))
  const goNext = () => {
    if (step === 1 && build.base) setStep(2)
    else if (step === 2 && build.coating) setStep(3)
  }

  return {
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
    currencySuffix: copy.currencySuffix,
  }
}
