import {
  DEFAULT_ICE_CREAM_BUILDER_SETTINGS,
  defaultVisualProfileForType,
} from '@chill-bar/shared'
import type {
  IceCreamBuilderSettings,
  IceCreamOption,
  IceCreamOptions,
  IceCreamVisualProfile,
} from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import type { IceOptionType } from '@prisma/client'

const SETTINGS_KEY = 'iceCream_builder'

type DbOption = {
  id: string
  type: IceOptionType
  name: string
  color: string
  texture: string | null
  priceMod: number
  emoji: string
  hotBoost: number | null
  coldBoost: number | null
  isActive: boolean
  sortOrder: number
  visualProfile: unknown
}

export function mapIceCreamOption(o: DbOption, includeAdmin = false): IceCreamOption {
  const base: IceCreamOption = {
    id: o.id,
    name: o.name,
    color: o.color,
    texture: o.texture,
    priceMod: o.priceMod,
    emoji: o.emoji,
    hotBoost: o.hotBoost ?? undefined,
    coldBoost: o.coldBoost ?? undefined,
    visualProfile: (o.visualProfile as IceCreamVisualProfile | null) ?? null,
  }
  if (includeAdmin) {
    base.isActive = o.isActive
    base.sortOrder = o.sortOrder
  }
  return base
}

export async function loadIceCreamBuilderSettings(): Promise<IceCreamBuilderSettings> {
  const [stored, legacyPrice] = await Promise.all([
    prisma.setting.findUnique({ where: { key: SETTINGS_KEY } }),
    prisma.setting.findUnique({ where: { key: 'iceCreamBasePrice' } }),
  ])

  const merged: IceCreamBuilderSettings = {
    ...DEFAULT_ICE_CREAM_BUILDER_SETTINGS,
    ...(stored?.value as Partial<IceCreamBuilderSettings> | undefined),
    builderMode:
      (stored?.value as Partial<IceCreamBuilderSettings> | undefined)?.builderMode ??
      DEFAULT_ICE_CREAM_BUILDER_SETTINGS.builderMode,
  }

  if (typeof legacyPrice?.value === 'number' && !stored) {
    merged.basePrice = legacyPrice.value
  }

  return merged
}

export async function saveIceCreamBuilderSettings(
  settings: IceCreamBuilderSettings,
): Promise<IceCreamBuilderSettings> {
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: settings as unknown as object },
    create: { key: SETTINGS_KEY, value: settings as unknown as object },
  })
  await prisma.setting.upsert({
    where: { key: 'iceCreamBasePrice' },
    update: { value: settings.basePrice },
    create: { key: 'iceCreamBasePrice', value: settings.basePrice },
  })
  return settings
}

export async function loadIceCreamOptions(activeOnly: boolean): Promise<IceCreamOptions> {
  const settings = await loadIceCreamBuilderSettings()
  const options = await prisma.iceCreamOption.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { sortOrder: 'asc' },
  })

  const mapped = options.map((o) => mapIceCreamOption(o, !activeOnly))

  return {
    ...settings,
    bases: options.filter((o) => o.type === 'BASE').map((o) => mapIceCreamOption(o, !activeOnly)),
    coatings: options
      .filter((o) => o.type === 'COATING')
      .map((o) => mapIceCreamOption(o, !activeOnly)),
    fillings: options
      .filter((o) => o.type === 'FILLING')
      .map((o) => mapIceCreamOption(o, !activeOnly)),
  }
}

export function normalizeVisualProfile(
  type: IceOptionType,
  color: string,
  visualProfile?: IceCreamVisualProfile | null,
): IceCreamVisualProfile {
  return visualProfile ?? defaultVisualProfileForType(type, color)
}

export async function nextSortOrder(type: IceOptionType): Promise<number> {
  const max = await prisma.iceCreamOption.aggregate({
    where: { type },
    _max: { sortOrder: true },
  })
  return (max._max.sortOrder ?? -1) + 1
}
