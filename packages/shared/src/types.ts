export interface CategoryVisual {
  gradient: string
  pattern: string
  accent: string
  glow: string
}

export interface Category {
  id: string
  name: string
  emoji: string
  sortOrder?: number
  accentColor?: string
  isIceCreamHub?: boolean
  showCustomBadge?: boolean
}

export interface MenuModifierOption {
  id: string
  name: string
  price: number
  emoji?: string
}

export interface MenuModifierGroup {
  id: string
  name: string
  type: 'single' | 'multiple'
  required?: boolean
  options: MenuModifierOption[]
}

export interface SelectedModifier {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  categoryName: string
  emoji: string
  tags: Record<string, number>
  description: string
  imageUrl?: string | null
  modifiers?: MenuModifierGroup[]
  isAvailable?: boolean
}

export interface MenuData {
  categories: Category[]
  items: MenuItem[]
}

export interface IceCreamVisualProfile {
  colors?: [string, string, string]
  textureKind?: 'smooth' | 'speckle' | 'seeds' | 'marble' | 'swirl' | 'chunks'
  speckleColor?: string
  coatingStyle?: 'none' | 'smooth-gloss' | 'dark-matte' | 'white-gloss' | 'crunchy' | 'drizzle'
  thickness?: number
  wavyEdge?: boolean
  fillingStyle?: 'pool' | 'ribbon' | 'swirl' | 'core' | 'striped' | 'chunks'
  secondaryColor?: string
}

export interface IceCreamOption {
  id: string
  name: string
  color: string
  texture?: string | null
  priceMod: number
  emoji: string
  hotBoost?: number
  coldBoost?: number
  visualProfile?: IceCreamVisualProfile | null
  isActive?: boolean
  sortOrder?: number
}

export interface IceCreamBuilderSettings {
  basePrice: number
  minPrice: number
  enabled: boolean
  smartSuggestions: boolean
  builderMode: 'classic' | 'studio'
}

export interface IceCreamOptions extends IceCreamBuilderSettings {
  bases: IceCreamOption[]
  coatings: IceCreamOption[]
  fillings: IceCreamOption[]
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED'

export type OrderChannel = 'MOBILE' | 'KIOSK' | 'POS'

export type PaymentMethod = 'CASH' | 'CARD' | 'MIXED' | 'UNPAID'

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED'

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
]

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'در انتظار تایید',
  CONFIRMED: 'تایید شده',
  PREPARING: 'در حال آماده‌سازی',
  READY: 'آماده تحویل',
  DELIVERED: 'تحویل شده',
  CANCELLED: 'لغو شده',
}

export interface OrderItemPayload {
  menuItemId: string | null
  name: string
  emoji: string
  unitPrice: number
  quantity: number
  customConfig?: Record<string, unknown> | null
}

export interface OrderItem extends OrderItemPayload {
  id: string
  lineTotal: number
}

export interface Order {
  id: string
  code: string
  status: OrderStatus
  channel: OrderChannel
  customerName?: string | null
  note?: string | null
  subtotal?: number
  discountAmount?: number
  discountNote?: string | null
  total: number
  paymentStatus?: PaymentStatus
  paymentMethod?: PaymentMethod
  paidAmount?: number
  changeAmount?: number
  receiptNumber?: number | null
  createdByUserId?: string | null
  createdByName?: string | null
  shiftId?: string | null
  paidAt?: string | null
  completedAt?: string | null
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF'

export type AuthRole = UserRole | 'CUSTOMER'

export interface CustomerPreferences {
  tasteProfile?: {
    likedIds: string[]
    skippedIds: string[]
    likedCategories: Record<string, number>
    likedTags: Record<string, number>
    updatedAt?: number
  }
  iceCreamBuild?: {
    base?: string | null
    coating?: string | null
    filling?: string | null
  }
  favoriteMood?: string | null
}

export interface CustomerProfile {
  id: string
  name: string | null
  phone: string | null
  isRegistered: boolean
  preferences: CustomerPreferences
  orderCount: number
  createdAt: string
}

export interface CustomerAuthResponse {
  token: string
  customer: CustomerProfile
}

export interface AdminUser {
  id: string
  name: string
  username: string
  role: UserRole
}

export interface AuthResponse {
  token: string
  user: AdminUser
}

export interface DashboardStats {
  ordersToday: number
  revenueToday: number
  avgOrderValue: number
  pendingCount: number
  statusCounts: Record<OrderStatus, number>
  popularItems: { name: string; emoji: string; count: number }[]
  hourlyOrders: { hour: number; count: number }[]
  revenueLast7Days: { date: string; revenue: number; orders: number }[]
  posSalesToday?: number
  posRevenueToday?: number
  onlineRevenueToday?: number
  unpaidOrdersCount?: number
  openShift?: { id: string; openedAt: string; openedByName: string | null } | null
}

import type { HomeAppearance } from './homeAppearance'
import type { MenuAppearance } from './menuAppearance'

export type { HomeAppearance, MenuAppearance }

export interface StoreAppearance {
  logoUrl: string | null
  faviconUrl: string | null
  splashImageUrl: string | null
  primaryColor: string
  primaryForegroundColor: string
  backgroundColor: string | null
  foregroundColor: string | null
  cardColor: string | null
  themeMode: 'dark' | 'light'
  borderRadius: number
  headerBlur: boolean
  brandEmoji: string | null
  accentGlow: boolean
}

export interface StoreLocation {
  lat: number
  lon: number
  label: string
}

export interface StoreCopy {
  appTagline: string
  installBanner: string
  installButton: string
  menuTitle: string
  storyEyebrow: string
  storyTitle: string
  storyDescription: string
  storyBadge: string
  comboEyebrow: string
  comboTitle: string
  comboDescription: string
  comboOrderToast: string
  spinWheelHint: string
  kioskTapStart: string
  kioskTapOrder: string
  closedTitle: string
  closedMessage: string
  closedHint: string
  currencySuffix: string
  searchPlaceholder: string
  addToCartToast: string
  navHome: string
  navIceCream: string
  navMenu: string
  navDiscover: string
  navPlay: string
  moodEyebrow: string
  moodTitle: string
  moodDescription: string
  smartPickReason: string
  smartComboTitle: string
  smsDisabledMessage: string
  smsRegisterNote: string
  iceStep1Label: string
  iceStep1Title: string
  iceStep2Label: string
  iceStep2Title: string
  iceStep3Label: string
  iceStep3Title: string
  iceCustomName: string
  scratchTitle: string
  scratchSubtitle: string
  scratchCanvasHint: string
  scratchRewardCheckoutLabel: string
  scratchRewardSuccess: string
  navWaitLounge: string
  waitLoungeTitle: string
  waitLoungeSubtitle: string
  waitLoungeEnter: string
  waitLoungePlayTeaser: string
  waitLoungePlayTitle: string
  waitLoungeOrderSuccessTitle: string
  waitLoungeOrderSuccessBody: string
  waitLoungeOrderSuccessLater: string
  waitLoungeReadyTitle: string
  waitLoungeReadyMessage: string
  waitLoungePointsLabel: string
  waitLoungeRedeemLabel: string
  waitLoungeRedeemApplied: string
}

export interface ScratchRewardSettings {
  /** Menu item IDs eligible as scratch-card prizes */
  menuItemIds: string[]
  /** Price charged for the reward line item (0 = free) */
  rewardPrice: number
}

export type WaitGameId = 'perfectPour' | 'memoryBrew' | 'chillStack' | 'snakeGame'

export const WAIT_GAME_IDS: WaitGameId[] = [
  'perfectPour',
  'memoryBrew',
  'chillStack',
  'snakeGame',
]

export interface WaitGameTuning {
  perfectPour: { rounds: number; perfectPoints: number; goodPoints: number }
  memoryBrew: { pairs: number; stages: number; startPairs: number; basePoints: number; timeBonus: number }
  chillStack: { blockPoints: number; maxBlocks: number }
  snakeGame: { pointsPerFood: number; maxPoints: number }
}

export type LoyaltyRewardType = 'discount_fixed' | 'discount_percent' | 'free_item'

export interface LoyaltyRewardTier {
  id: string
  type: LoyaltyRewardType
  label: string
  /** Chill Points required to redeem this tier */
  cost: number
  /** Toman for discount_fixed, percent for discount_percent, ignored for free_item */
  value: number
  /** Menu item granted for free_item rewards */
  menuItemId?: string | null
}

export interface WaitLoungeSettings {
  enabledGames: Record<WaitGameId, boolean>
  /** Order statuses during which games can be played and points earned */
  allowedStatuses: OrderStatus[]
  /** Hard cap on points earned per order (anti-farming) */
  maxPointsPerOrder: number
  /** Multiplier applied when the order is being prepared */
  statusBonusMultiplier: number
  estimatedPrepMinutes: number
  games: WaitGameTuning
  rewards: LoyaltyRewardTier[]
  minPointsToRedeem: number
  maxDiscountPerOrder: number
  maxPercentPerOrder: number
  pointsExpireDays: number | null
  /** When false, customers can earn points but cannot redeem them yet */
  pointsRedemptionEnabled: boolean
}

export interface LoyaltyLedgerEntry {
  id: string
  type: string
  points: number
  orderId: string | null
  createdAt: string
}

export interface LoyaltyBalance {
  chillPoints: number
  ledger: LoyaltyLedgerEntry[]
}

export interface WaitGameSubmitResult {
  awarded: number
  pointsEarnedThisOrder: number
  totalPoints: number
  capped: boolean
}

export interface MoodDefinition {
  id: string
  label: string
  emoji: string
  color: string
  aiPrompt: string
  tagWeights: Record<string, number>
}

import type { ComboRecommendationSettings } from './comboSettings'

export type { CategoryPairRule, ComboTemplate } from './comboSettings'

export interface StoreSettings {
  storeName: string
  storeSubtitle: string
  address: string
  phone: string
  openingHours: string
  isOpen: boolean
  features: Record<string, boolean>
  kioskIdleSeconds: number
  appearance: StoreAppearance
  menuAppearance: MenuAppearance
  homeAppearance: HomeAppearance
  location: StoreLocation
  copy: StoreCopy
  moods: MoodDefinition[]
  iceCreamPresetTag: string
  smartPicksCount: number
  weatherHotThreshold: number
  weatherColdThreshold: number
  showInstallBanner: boolean
  scratchReward: ScratchRewardSettings
  waitLounge: WaitLoungeSettings
  comboRecommendations: ComboRecommendationSettings
}

export interface AiSettings {
  enabled: boolean
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
  maxHistoryMessages: number
  assistantName: string
  assistantEmoji: string
  strictMode: boolean
  welcomeMessage: string
  outOfScopeMessage: string
  systemPromptExtra: string
  quickPrompts: string[]
  inputPlaceholder: string
  onlineStatusLabel: string
  disabledMessage: string
}

/** Public-safe AI config (no API key) */
export interface AiPublicConfig {
  enabled: boolean
  assistantName: string
  assistantEmoji: string
  welcomeMessage: string
  quickPrompts: string[]
  inputPlaceholder: string
  onlineStatusLabel: string
  disabledMessage: string
  moodPrompts: Record<string, string>
}

export interface SmsSettings {
  enabled: boolean
  apiKey: string
  templateId: number
  codeParameterName: string
  otpLength: number
  otpExpiryMinutes: number
  resendCooldownSeconds: number
  maxVerifyAttempts: number
  storeNameInSms: boolean
}

export type AdminAlertSoundId = 'chime' | 'bell' | 'kitchen' | 'urgent' | 'soft'

export interface AdminAlertSettings {
  enabled: boolean
  volume: number
  soundOnNewOrder: boolean
  newOrderSound: AdminAlertSoundId
  pendingReminderEnabled: boolean
  /** Remind while unconfirmed (PENDING) orders exist */
  pendingReminderIntervalSeconds: number
  pendingReminderSound: AdminAlertSoundId
}

/** Public-safe SMS config for customer app */
export interface SmsPublicConfig {
  enabled: boolean
  otpLength: number
  resendCooldownSeconds: number
}

export type OtpPurpose = 'register' | 'login'

export interface OtpSendResponse {
  ok: true
  cooldownSeconds: number
  expiresInSeconds: number
}

export interface AiChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiChatContext {
  hour?: number
  timeOfDay?: string
  weather?: {
    temperature: number
    description: string
    icon: string
    location: string
  } | null
  mood?: string | null
  storeName?: string
  storeSubtitle?: string
}

export interface AiChatRequest {
  message: string
  history?: AiChatMessage[]
  context?: AiChatContext
}

export interface AiChatResponse {
  reply: string
  inScope: boolean
  itemIds: string[]
}
