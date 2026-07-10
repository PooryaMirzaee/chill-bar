import { z } from 'zod'
import { homeAppearanceSchema } from './homeAppearance'
import { menuAppearanceSchema } from './menuAppearance'
import { comboRecommendationSettingsSchema } from './comboSettings'
import { RECEIPT_TEMPLATE_IDS } from './receiptTemplates'

export const orderChannelSchema = z.enum(['MOBILE', 'KIOSK', 'POS'])

export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'MIXED', 'UNPAID'])

export const paymentStatusSchema = z.enum(['UNPAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'])

export const adjustmentTypeSchema = z.enum(['DISCOUNT', 'REFUND', 'VOID_ITEM'])

export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELLED',
])

export const orderItemPayloadSchema = z.object({
  menuItemId: z.string().nullable().optional().default(null),
  name: z.string().min(1),
  emoji: z.string().default('🍦'),
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive().max(50),
  customConfig: z.record(z.unknown()).nullable().optional().default(null),
})

export const createOrderSchema = z.object({
  channel: orderChannelSchema.default('MOBILE'),
  customerName: z.string().max(80).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  items: z.array(orderItemPayloadSchema).min(1, 'سبد خرید خالی است'),
  loyaltyRewardId: z.string().min(1).max(60).nullable().optional().default(null),
})

export const waitGameIdSchema = z.enum([
  'perfectPour',
  'memoryBrew',
  'chillStack',
  'snakeGame',
])

export const waitGameSubmitSchema = z.object({
  gameId: waitGameIdSchema,
  score: z.number().int().min(0).max(100_000),
  durationMs: z.number().int().min(500).max(600_000),
  nonce: z.string().max(64).optional(),
})

export type WaitGameSubmitInput = z.infer<typeof waitGameSubmitSchema>
export type WaitGameIdInput = z.infer<typeof waitGameIdSchema>

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
})

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const phoneSchema = z
  .string()
  .min(10, 'شماره موبایل نامعتبر است')
  .max(15)
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => /^09\d{9}$/.test(v), 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود')

export const customerRegisterSchema = z.object({
  phone: phoneSchema,
  name: z.string().max(80).optional().nullable(),
})

export const customerLoginSchema = z.object({
  phone: phoneSchema,
})

export const customerUpdateSchema = z.object({
  name: z.string().max(80).optional().nullable(),
})

export const customerPreferencesSyncSchema = z.object({
  tasteProfile: z
    .object({
      likedIds: z.array(z.string()),
      skippedIds: z.array(z.string()),
      likedCategories: z.record(z.number()),
      likedTags: z.record(z.number()),
      updatedAt: z.number().optional(),
    })
    .optional(),
  iceCreamBuild: z
    .object({
      base: z.string().nullable().optional(),
      coating: z.string().nullable().optional(),
      filling: z.string().nullable().optional(),
    })
    .optional(),
  favoriteMood: z.string().max(40).optional().nullable(),
})

export const otpPurposeSchema = z.enum(['register', 'login'])

export const customerOtpSendSchema = z.object({
  phone: phoneSchema,
  purpose: otpPurposeSchema,
})

export const customerOtpVerifySchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .min(4, 'کد تأیید نامعتبر است')
    .max(8)
    .transform((v) => v.replace(/\D/g, '')),
  purpose: otpPurposeSchema,
  name: z.string().max(80).optional().nullable(),
})

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
export type CustomerPreferencesSyncInput = z.infer<typeof customerPreferencesSyncSchema>

export const categoryInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  emoji: z.string().default('🍽️'),
  sortOrder: z.number().int().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#F26522'),
  isIceCreamHub: z.boolean().default(false),
  showCustomBadge: z.boolean().default(false),
})

export const categoryReorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
})

export const menuModifierOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().int().nonnegative().default(0),
  emoji: z.string().optional(),
})

export const menuModifierGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['single', 'multiple']).default('multiple'),
  required: z.boolean().default(false),
  options: z.array(menuModifierOptionSchema).min(1),
})

export const menuItemInputSchema = z.object({
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.string().min(1),
  emoji: z.string().default('🍽️'),
  tags: z.record(z.number()).default({}),
  description: z.string().default(''),
  imageUrl: z.string().max(2048).nullable().optional(),
  modifiers: z.array(menuModifierGroupSchema).default([]),
  isAvailable: z.boolean().default(true),
  posOnly: z.boolean().default(false),
})

const hexColor = z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, 'رنگ نامعتبر است')

export const storeAppearanceSchema = z.object({
  logoUrl: z.string().max(2048).nullable().default(null),
  faviconUrl: z.string().max(2048).nullable().default(null),
  splashImageUrl: z.string().max(2048).nullable().default(null),
  primaryColor: hexColor.default('#F26522'),
  primaryForegroundColor: hexColor.default('#FFFFFF'),
  backgroundColor: hexColor.nullable().default(null),
  foregroundColor: hexColor.nullable().default(null),
  cardColor: hexColor.nullable().default(null),
  themeMode: z.enum(['dark', 'light']).default('dark'),
  borderRadius: z.number().min(0.25).max(1.5).default(0.75),
  headerBlur: z.boolean().default(true),
  brandEmoji: z.string().max(8).nullable().default('🍦'),
  accentGlow: z.boolean().default(true),
})

export const storeLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  label: z.string().max(120),
})

export const storeCopySchema = z.object({
  appTagline: z.string().max(80),
  installBanner: z.string().max(200),
  installButton: z.string().max(40),
  menuTitle: z.string().max(120),
  storyEyebrow: z.string().max(60),
  storyTitle: z.string().max(120),
  storyDescription: z.string().max(200),
  storyBadge: z.string().max(40),
  comboEyebrow: z.string().max(60),
  comboTitle: z.string().max(80),
  comboDescription: z.string().max(200),
  comboOrderToast: z.string().max(120),
  spinWheelHint: z.string().max(200),
  kioskTapStart: z.string().max(120),
  kioskTapOrder: z.string().max(120),
  closedTitle: z.string().max(80),
  closedMessage: z.string().max(300),
  closedHint: z.string().max(200),
  currencySuffix: z.string().max(20),
  searchPlaceholder: z.string().max(80),
  addToCartToast: z.string().max(120),
  navHome: z.string().max(30),
  navIceCream: z.string().max(30),
  navMenu: z.string().max(30),
  navDiscover: z.string().max(30),
  navPlay: z.string().max(30),
  moodEyebrow: z.string().max(60),
  moodTitle: z.string().max(80),
  moodDescription: z.string().max(200),
  smartPickReason: z.string().max(120),
  smartComboTitle: z.string().max(120),
  smsDisabledMessage: z.string().max(300),
  smsRegisterNote: z.string().max(400),
  iceStep1Label: z.string().max(30),
  iceStep1Title: z.string().max(80),
  iceStep2Label: z.string().max(30),
  iceStep2Title: z.string().max(80),
  iceStep3Label: z.string().max(30),
  iceStep3Title: z.string().max(80),
  iceCustomName: z.string().max(80),
  scratchTitle: z.string().max(80),
  scratchSubtitle: z.string().max(120),
  scratchCanvasHint: z.string().max(40),
  scratchRewardCheckoutLabel: z.string().max(120),
  scratchRewardSuccess: z.string().max(160),
  navWaitLounge: z.string().max(30),
  waitLoungeTitle: z.string().max(80),
  waitLoungeSubtitle: z.string().max(160),
  waitLoungeEnter: z.string().max(60),
  waitLoungePlayTeaser: z.string().max(80),
  waitLoungePlayTitle: z.string().max(80),
  waitLoungeOrderSuccessTitle: z.string().max(80),
  waitLoungeOrderSuccessBody: z.string().max(200),
  waitLoungeOrderSuccessLater: z.string().max(60),
  waitLoungeReadyTitle: z.string().max(80),
  waitLoungeReadyMessage: z.string().max(160),
  waitLoungePointsLabel: z.string().max(40),
  waitLoungeRedeemLabel: z.string().max(80),
  waitLoungeRedeemApplied: z.string().max(120),
})

export const scratchRewardSettingsSchema = z.object({
  menuItemIds: z.array(z.string().min(1)).max(50).default([]),
  rewardPrice: z.number().int().min(0).max(1_000_000).default(0),
})

export const loyaltyRewardTierSchema = z.object({
  id: z.string().min(1).max(60),
  type: z.enum(['discount_fixed', 'discount_percent', 'free_item']),
  label: z.string().min(1).max(80),
  cost: z.number().int().min(1).max(100_000),
  value: z.number().int().min(0).max(1_000_000).default(0),
  menuItemId: z.string().min(1).nullable().optional().default(null),
})

export const waitLoungeSettingsSchema = z.object({
  enabledGames: z
    .object({
      perfectPour: z.boolean().default(true),
      memoryBrew: z.boolean().default(true),
      chillStack: z.boolean().default(true),
      snakeGame: z.boolean().default(true),
    })
    .default({}),
  allowedStatuses: z.array(orderStatusSchema).default(['PENDING', 'CONFIRMED', 'PREPARING']),
  maxPointsPerOrder: z.number().int().min(0).max(100_000).default(500),
  statusBonusMultiplier: z.number().min(1).max(5).default(1.5),
  estimatedPrepMinutes: z.number().int().min(1).max(120).default(10),
  games: z
    .object({
      perfectPour: z
        .object({
          rounds: z.number().int().min(1).max(20).default(5),
          perfectPoints: z.number().int().min(1).max(1000).default(20),
          goodPoints: z.number().int().min(0).max(1000).default(8),
        })
        .default({}),
      memoryBrew: z
        .object({
          pairs: z.number().int().min(2).max(12).default(8),
          stages: z.number().int().min(1).max(8).default(4),
          startPairs: z.number().int().min(2).max(8).default(3),
          basePoints: z.number().int().min(1).max(1000).default(40),
          timeBonus: z.number().int().min(0).max(1000).default(30),
        })
        .default({}),
      chillStack: z
        .object({
          blockPoints: z.number().int().min(1).max(1000).default(5),
          maxBlocks: z.number().int().min(1).max(200).default(40),
        })
        .default({}),
      snakeGame: z
        .object({
          pointsPerFood: z.number().int().min(1).max(1000).default(5),
          maxPoints: z.number().int().min(1).max(10_000).default(150),
        })
        .default({}),
    })
    .default({}),
  rewards: z.array(loyaltyRewardTierSchema).max(20).default([]),
  minPointsToRedeem: z.number().int().min(0).max(100_000).default(50),
  maxDiscountPerOrder: z.number().int().min(0).max(10_000_000).default(50_000),
  maxPercentPerOrder: z.number().int().min(0).max(100).default(30),
  pointsExpireDays: z.number().int().min(1).max(3650).nullable().default(null),
  pointsRedemptionEnabled: z.boolean().default(false),
})

export const moodDefinitionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  emoji: z.string().max(8),
  color: hexColor,
  aiPrompt: z.string().max(200),
  tagWeights: z.record(z.number()).default({}),
})

export const settingsInputSchema = z.object({
  storeName: z.string().min(1),
  storeSubtitle: z.string().default(''),
  address: z.string().default(''),
  phone: z.string().default(''),
  openingHours: z.string().default(''),
  isOpen: z.boolean().default(true),
  features: z.record(z.boolean()).default({}),
  kioskIdleSeconds: z.number().int().min(15).max(600).default(60),
  appearance: storeAppearanceSchema.default({}),
  menuAppearance: menuAppearanceSchema.default({}),
  homeAppearance: homeAppearanceSchema.default({}),
  location: storeLocationSchema.optional(),
  copy: storeCopySchema.optional(),
  moods: z.array(moodDefinitionSchema).optional(),
  iceCreamPresetTag: z.string().max(40).default('featured'),
  smartPicksCount: z.number().int().min(3).max(12).default(6),
  weatherHotThreshold: z.number().min(20).max(45).default(28),
  weatherColdThreshold: z.number().min(-10).max(25).default(12),
  showInstallBanner: z.boolean().default(true),
  scratchReward: scratchRewardSettingsSchema.default({}),
  waitLounge: waitLoungeSettingsSchema.default({}),
  comboRecommendations: comboRecommendationSettingsSchema.default({}),
})

export const uploadImageSchema = z.object({
  data: z.string().min(1),
  filename: z.string().min(1).max(120),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type MenuItemInput = z.infer<typeof menuItemInputSchema>
export type CategoryInput = z.infer<typeof categoryInputSchema>
export type SettingsInput = z.infer<typeof settingsInputSchema>
export type UploadImageInput = z.infer<typeof uploadImageSchema>
export type StoreAppearanceInput = z.infer<typeof storeAppearanceSchema>

export const aiSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().max(512).default(''),
  baseUrl: z.string().url().default('https://api.avalai.ir/v1'),
  model: z.string().min(1).max(120).default('gpt-4o-mini'),
  temperature: z.number().min(0).max(1.5).default(0.55),
  maxTokens: z.number().int().min(128).max(4096).default(900),
  maxHistoryMessages: z.number().int().min(2).max(24).default(12),
  assistantName: z.string().min(1).max(80).default('گارسون هوشمند'),
  assistantEmoji: z.string().max(8).default('🤖'),
  strictMode: z.boolean().default(true),
  welcomeMessage: z.string().max(600).default(''),
  outOfScopeMessage: z.string().max(600).default(''),
  systemPromptExtra: z.string().max(2000).default(''),
  quickPrompts: z.array(z.string().max(120)).max(12).default([]),
  inputPlaceholder: z.string().max(80).default(''),
  onlineStatusLabel: z.string().max(80).default(''),
  disabledMessage: z.string().max(300).default(''),
})

export const aiChatRequestSchema = z.object({
  message: z.string().min(1).max(800),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(24)
    .optional()
    .default([]),
  context: z
    .object({
      hour: z.number().int().min(0).max(23).optional(),
      timeOfDay: z.string().max(40).optional(),
      weather: z
        .object({
          temperature: z.number(),
          description: z.string(),
          icon: z.string(),
          location: z.string(),
        })
        .nullable()
        .optional(),
      mood: z.string().max(40).nullable().optional(),
      storeName: z.string().max(80).optional(),
      storeSubtitle: z.string().max(120).optional(),
    })
    .optional(),
})

export type AiSettingsInput = z.infer<typeof aiSettingsSchema>
export type AiChatRequestInput = z.infer<typeof aiChatRequestSchema>

export const smsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  apiKey: z.string().max(512).default(''),
  templateId: z.number().int().nonnegative().default(0),
  codeParameterName: z.string().min(1).max(40).default('Code'),
  otpLength: z.number().int().min(4).max(8).default(5),
  otpExpiryMinutes: z.number().int().min(1).max(15).default(3),
  resendCooldownSeconds: z.number().int().min(30).max(300).default(60),
  maxVerifyAttempts: z.number().int().min(3).max(10).default(5),
  storeNameInSms: z.boolean().default(true),
})

export type SmsSettingsInput = z.infer<typeof smsSettingsSchema>

export const adminAlertSoundIdSchema = z.enum(['chime', 'bell', 'kitchen', 'urgent', 'soft', 'power'])

export const adminAlertSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.7),
  soundOnNewOrder: z.boolean().default(true),
  newOrderSound: adminAlertSoundIdSchema.default('chime'),
  pendingReminderEnabled: z.boolean().default(true),
  pendingReminderIntervalSeconds: z.number().int().min(5).max(300).default(15),
  pendingReminderSound: adminAlertSoundIdSchema.default('bell'),
})

export type AdminAlertSettingsInput = z.infer<typeof adminAlertSettingsSchema>

const iceCreamVisualProfileSchema = z.object({
  colors: z.tuple([z.string(), z.string(), z.string()]).optional(),
  textureKind: z.enum(['smooth', 'speckle', 'seeds', 'marble', 'swirl', 'chunks']).optional(),
  speckleColor: z.string().optional(),
  coatingStyle: z
    .enum(['none', 'smooth-gloss', 'dark-matte', 'white-gloss', 'crunchy', 'drizzle'])
    .optional(),
  thickness: z.number().min(0).max(2).optional(),
  wavyEdge: z.boolean().optional(),
  fillingStyle: z.enum(['pool', 'ribbon', 'swirl', 'core', 'striped', 'chunks']).optional(),
  secondaryColor: z.string().optional(),
})

export const iceCreamOptionInputSchema = z.object({
  id: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  type: z.enum(['BASE', 'COATING', 'FILLING']),
  name: z.string().min(1).max(80),
  color: z.string().min(1).max(20),
  texture: z.string().max(20).nullable().optional(),
  priceMod: z.number().int().min(-100_000).max(100_000).default(0),
  emoji: z.string().max(8).default('🍦'),
  hotBoost: z.number().min(0).max(1).nullable().optional(),
  coldBoost: z.number().min(0).max(1).nullable().optional(),
  visualProfile: iceCreamVisualProfileSchema.nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).optional(),
})

export const iceCreamBuilderModeSchema = z.enum(['classic', 'studio'])

export const iceCreamBuilderSettingsSchema = z.object({
  basePrice: z.number().int().min(0).max(10_000_000),
  minPrice: z.number().int().min(0).max(10_000_000),
  enabled: z.boolean(),
  smartSuggestions: z.boolean(),
  builderMode: iceCreamBuilderModeSchema.default('studio'),
})

export type IceCreamOptionInput = z.infer<typeof iceCreamOptionInputSchema>
export type IceCreamBuilderSettingsInput = z.infer<typeof iceCreamBuilderSettingsSchema>
export type CustomerOtpSendInput = z.infer<typeof customerOtpSendSchema>
export type CustomerOtpVerifyInput = z.infer<typeof customerOtpVerifySchema>

export const posSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  requireShiftOpen: z.boolean().default(true),
  receiptWidthMm: z.union([z.literal(58), z.literal(80)]).default(80),
  receiptTemplateId: z.enum(RECEIPT_TEMPLATE_IDS).default('bold'),
  kitchenReceiptTemplateId: z.enum(RECEIPT_TEMPLATE_IDS).default('kitchen-compact'),
  receiptHighContrast: z.boolean().default(true),
  receiptPrintMode: z.enum(['dialog', 'silent', 'off']).default('dialog'),
  printCustomerReceipt: z.boolean().default(true),
  printKitchenReceipt: z.boolean().default(true),
  receiptHeaderText: z.string().max(300).default(''),
  receiptFooterText: z.string().max(300).default('از خرید شما سپاسگزاریم 🍦'),
  showLogoOnReceipt: z.boolean().default(true),
  showQrOnReceipt: z.boolean().default(true),
  showShiftOnReceipt: z.boolean().default(true),
  autoPrintOnSale: z.boolean().default(true),
  autoPrintOnOnlineSettle: z.boolean().default(true),
  defaultPaymentMethod: paymentMethodSchema.default('CASH'),
  allowMixedPayment: z.boolean().default(true),
  allowManualDiscount: z.boolean().default(true),
  maxDiscountPercentStaff: z.number().int().min(0).max(100).default(10),
  maxDiscountPercentManager: z.number().int().min(0).max(100).default(50),
  allowRefunds: z.boolean().default(true),
  requireRefundReason: z.boolean().default(true),
  requireManagerForRefund: z.boolean().default(false),
  soundOnAddItem: z.boolean().default(true),
  addItemSoundVolume: z.number().min(0).max(1).default(0.45),
  shiftRoles: z
    .array(z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']))
    .default(['SUPER_ADMIN', 'MANAGER', 'STAFF']),
  discountRoles: z
    .array(z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']))
    .default(['SUPER_ADMIN', 'MANAGER', 'STAFF']),
})

export const shiftOpenSchema = z.object({
  openingCash: z.number().int().min(0).max(100_000_000).default(0),
})

export const shiftCloseSchema = z.object({
  closingCash: z.number().int().min(0).max(100_000_000),
  notes: z.string().max(500).optional().nullable(),
})

const posPaymentLineSchema = z.object({
  method: z.enum(['CASH', 'CARD']),
  amount: z.number().int().positive(),
})

export const posCheckoutPaymentSchema = z.object({
  method: paymentMethodSchema,
  cashReceived: z.number().int().min(0).max(100_000_000).optional(),
  payments: z.array(posPaymentLineSchema).optional(),
})

const posCustomerPhoneSchema = z
  .string()
  .max(15)
  .optional()
  .nullable()
  .transform((v) => {
    if (!v?.trim()) return null
    return v.replace(/\D/g, '')
  })
  .refine((v) => v === null || /^09\d{9}$/.test(v), 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود')

export const posSaleSchema = z.object({
  items: z.array(orderItemPayloadSchema).min(1, 'سبد خرید خالی است'),
  customerName: z.string().max(80).optional().nullable(),
  customerPhone: posCustomerPhoneSchema,
  note: z.string().max(500).optional().nullable(),
  discountAmount: z.number().int().min(0).max(10_000_000).default(0),
  discountNote: z.string().max(200).optional().nullable(),
  payment: posCheckoutPaymentSchema,
})

export const orderCheckoutSchema = z.object({
  payment: posCheckoutPaymentSchema,
  customerName: z.string().max(80).optional().nullable(),
  customerPhone: posCustomerPhoneSchema,
  discountAmount: z.number().int().min(0).max(10_000_000).default(0),
  discountNote: z.string().max(200).optional().nullable(),
  markDelivered: z.boolean().default(true),
})

export const orderAdjustmentSchema = z.object({
  type: adjustmentTypeSchema,
  amount: z.number().int().positive(),
  itemId: z.string().optional().nullable(),
  reason: z.string().max(300).optional().nullable(),
})

export const orderVoidSchema = z.object({
  reason: z.string().max(300).optional().nullable(),
})

export type PosSettingsInput = z.infer<typeof posSettingsSchema>
export type ShiftOpenInput = z.infer<typeof shiftOpenSchema>
export type ShiftCloseInput = z.infer<typeof shiftCloseSchema>
export type PosSaleInput = z.infer<typeof posSaleSchema>
export type OrderCheckoutInput = z.infer<typeof orderCheckoutSchema>
export type OrderAdjustmentInput = z.infer<typeof orderAdjustmentSchema>
export type OrderVoidInput = z.infer<typeof orderVoidSchema>
