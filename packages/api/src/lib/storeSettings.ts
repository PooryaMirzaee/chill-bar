import type { StoreSettings } from '@chill-bar/shared'
import { DEFAULT_STORE_SETTINGS } from '@chill-bar/shared'

export function mergeSettings(raw: Partial<StoreSettings> | null | undefined): StoreSettings {
  return {
    ...DEFAULT_STORE_SETTINGS,
    ...raw,
    features: { ...DEFAULT_STORE_SETTINGS.features, ...raw?.features },
    appearance: { ...DEFAULT_STORE_SETTINGS.appearance, ...raw?.appearance },
    menuAppearance: { ...DEFAULT_STORE_SETTINGS.menuAppearance, ...raw?.menuAppearance },
    homeAppearance: { ...DEFAULT_STORE_SETTINGS.homeAppearance, ...raw?.homeAppearance },
    location: { ...DEFAULT_STORE_SETTINGS.location, ...raw?.location },
    copy: { ...DEFAULT_STORE_SETTINGS.copy, ...raw?.copy },
    moods: raw?.moods?.length ? raw.moods : DEFAULT_STORE_SETTINGS.moods,
    scratchReward: { ...DEFAULT_STORE_SETTINGS.scratchReward, ...raw?.scratchReward },
    waitLounge: {
      ...DEFAULT_STORE_SETTINGS.waitLounge,
      ...raw?.waitLounge,
      enabledGames: {
        ...DEFAULT_STORE_SETTINGS.waitLounge.enabledGames,
        ...raw?.waitLounge?.enabledGames,
      },
      games: {
        ...DEFAULT_STORE_SETTINGS.waitLounge.games,
        ...raw?.waitLounge?.games,
      },
      allowedStatuses:
        raw?.waitLounge?.allowedStatuses?.length
          ? raw.waitLounge.allowedStatuses
          : DEFAULT_STORE_SETTINGS.waitLounge.allowedStatuses,
      rewards: raw?.waitLounge?.rewards ?? DEFAULT_STORE_SETTINGS.waitLounge.rewards,
    },
    comboRecommendations: {
      ...DEFAULT_STORE_SETTINGS.comboRecommendations,
      ...raw?.comboRecommendations,
      categoryPairs:
        raw?.comboRecommendations?.categoryPairs?.length
          ? raw.comboRecommendations.categoryPairs
          : DEFAULT_STORE_SETTINGS.comboRecommendations.categoryPairs,
      templates:
        raw?.comboRecommendations?.templates?.length
          ? raw.comboRecommendations.templates
          : DEFAULT_STORE_SETTINGS.comboRecommendations.templates,
    },
  }
}

export async function loadSettings(): Promise<StoreSettings> {
  const { prisma } = await import('../prisma.js')
  const row = await prisma.setting.findUnique({ where: { key: 'store' } })
  if (!row) return DEFAULT_STORE_SETTINGS
  return mergeSettings(row.value as Partial<StoreSettings>)
}
