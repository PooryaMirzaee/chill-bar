import type { StoreAppearance, StoreSettings, WaitLoungeSettings } from './types'
import { DEFAULT_COMBO_RECOMMENDATIONS } from './comboSettings'
import { DEFAULT_COFFEE_FORTUNE_SETTINGS } from './coffeeFortune'
import { DEFAULT_STORE_COPY, DEFAULT_LOCATION, DEFAULT_MOODS } from './storeCopyDefaults'
import { DEFAULT_HOME_APPEARANCE } from './homeAppearance'
import { DEFAULT_MENU_APPEARANCE } from './menuAppearance'

export const DEFAULT_WAIT_LOUNGE: WaitLoungeSettings = {
  enabledGames: {
    perfectPour: false,
    memoryBrew: true,
    chillStack: false,
    snakeGame: false,
  },
  allowedStatuses: ['PENDING', 'CONFIRMED', 'PREPARING'],
  maxPointsPerOrder: 500,
  statusBonusMultiplier: 1.5,
  estimatedPrepMinutes: 10,
  games: {
    perfectPour: { rounds: 5, perfectPoints: 20, goodPoints: 8 },
    memoryBrew: { pairs: 8, stages: 4, startPairs: 3, basePoints: 40, timeBonus: 30 },
    chillStack: { blockPoints: 5, maxBlocks: 40 },
    snakeGame: { pointsPerFood: 5, maxPoints: 150 },
  },
  rewards: [
    { id: 'discount-5k', type: 'discount_fixed', label: '۵٬۰۰۰ تومان تخفیف', cost: 100, value: 5000, menuItemId: null },
    { id: 'discount-15k', type: 'discount_fixed', label: '۱۵٬۰۰۰ تومان تخفیف', cost: 250, value: 15000, menuItemId: null },
    { id: 'discount-15p', type: 'discount_percent', label: '۱۵٪ تخفیف سفارش', cost: 400, value: 15, menuItemId: null },
  ],
  minPointsToRedeem: 50,
  maxDiscountPerOrder: 50_000,
  maxPercentPerOrder: 30,
  pointsExpireDays: null,
  pointsRedemptionEnabled: false,
}

export const DEFAULT_APPEARANCE: StoreAppearance = {
  logoUrl: null,
  faviconUrl: null,
  splashImageUrl: null,
  primaryColor: '#F26522',
  primaryForegroundColor: '#FFFFFF',
  backgroundColor: null,
  foregroundColor: null,
  cardColor: null,
  themeMode: 'dark',
  borderRadius: 0.75,
  headerBlur: true,
  brandEmoji: '🍦',
  accentGlow: true,
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'Chill Bar',
  storeSubtitle: 'اصفهان سیتی‌سنتر',
  address: 'اصفهان، اصفهان سیتی‌سنتر',
  phone: '',
  openingHours: '۱۰:۰۰ تا ۲۴:۰۰',
  isOpen: true,
  features: {
    spinWheel: true,
    aiWaiter: true,
    scratchSurprise: true,
    swipeDeck: true,
    waitLounge: true,
    smartCombo: true,
    coffeeFortune: true,
  },
  kioskIdleSeconds: 60,
  appearance: DEFAULT_APPEARANCE,
  menuAppearance: DEFAULT_MENU_APPEARANCE,
  homeAppearance: DEFAULT_HOME_APPEARANCE,
  location: DEFAULT_LOCATION,
  copy: DEFAULT_STORE_COPY,
  moods: DEFAULT_MOODS,
  iceCreamPresetTag: 'featured',
  smartPicksCount: 6,
  weatherHotThreshold: 28,
  weatherColdThreshold: 12,
  showInstallBanner: true,
  scratchReward: {
    menuItemIds: [],
    rewardPrice: 0,
  },
  waitLounge: DEFAULT_WAIT_LOUNGE,
  comboRecommendations: DEFAULT_COMBO_RECOMMENDATIONS,
  coffeeFortuneSettings: DEFAULT_COFFEE_FORTUNE_SETTINGS,
}
