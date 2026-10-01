import { useState, useEffect, useMemo, useCallback, useRef, type ReactElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Home,
  IceCreamCone,
  LayoutGrid,
  Compass,
  Sparkles,
  Bot,
  Download,
  X,
  User,
} from 'lucide-react'
import type { MenuItem, Mood, ContextData, ComboSuggestion } from './types'
import { useMenuData } from './hooks/useMenuData'
import { useKioskMode } from './hooks/useKioskMode'
import { CartProvider, useCart } from './store/cart'
import { WaitLoungeProvider, useWaitLounge } from './store/waitLounge'
import { CartFeedbackProvider, useCartFeedback, type AddToCartHandler } from './lib/cartFeedback'
import { CartFab } from './components/CartFab'
import { fetchWeather, getTimeOfDay } from './lib/weather'
import { getSmartPicks } from './lib/recommendations'
import { buildSmartCombo } from './lib/comboBuilder'
import { suggestPairing } from '@chill-bar/shared'
import { useIceCreamOptions } from './hooks/useIceCreamOptions'
import type { HomeSectionId } from '@chill-bar/shared'
import { formatCopy, copyVars, findIceCreamCategoryId } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { WeatherWidget } from './components/WeatherWidget'
import { SmartPicks } from './components/SmartPicks'
import { MoodPicker } from './components/MoodPicker'
import { SwipeDeck } from './components/SwipeDeck'
import { StoryFeed } from './components/StoryFeed'
import { ComboBuilder } from './components/ComboBuilder'
import { SpinWheel } from './components/SpinWheel'
import { AIWaiter } from './components/AIWaiter'
import { MenuGrid } from './components/MenuGrid'
import { ItemDetail } from './components/ItemDetail'
import { Cart } from './components/Cart'
import { SearchBar } from './components/SearchBar'
import { IceCreamHub } from './components/IceCreamHub'
import { CategoryShowcase } from './components/CategoryShowcase'
import { ScratchSurprise } from './components/ScratchSurprise'
import { CoffeeFortune } from './components/CoffeeFortune'
import { KioskScreensaver } from './components/KioskScreensaver'
import { CustomerProfileSheet } from './components/CustomerProfileSheet'
import { WaitLounge } from './components/wait-lounge/WaitLounge'
import { WaitLoungeFab } from './components/wait-lounge/WaitLoungeFab'
import { useCustomer } from './lib/customerAuth'
import { useStoreSettings } from './hooks/useStoreSettings'
import { useAiConfig } from './hooks/useAiConfig'
import { getBrandFallback, getBrandLogoUrl, resolveAssetUrl } from './lib/branding'
import { menuItemForCart, resolveLiveMenuItem } from './lib/menuItem'
import { syncSpinPath, tabFromLocation } from './lib/spinRoute'

type Tab = 'home' | 'icecream' | 'menu' | 'discover' | 'play'

const TAB_ICONS = {
  home: Home,
  icecream: IceCreamCone,
  menu: LayoutGrid,
  discover: Compass,
  play: Sparkles,
} as const

function AppContent() {
  const { addItem, setPendingReward, syncMenuMetadata } = useCart()
  const { notifyItemAdded, registerOpenCart } = useCartFeedback()
  const { categories, visibleCategories, items } = useMenuData()
  const { loungeOpen, loungeEnabled, activeOrder } = useWaitLounge()
  const { isKiosk, idle, resetIdle } = useKioskMode({ suppressIdle: loungeOpen })
  const { data: iceOptions } = useIceCreamOptions()
  const { settings } = useStoreSettings()
  const { appearance, copy, features, menuAppearance, homeAppearance } = settings
  const vars = useMemo(() => copyVars(settings), [settings])

  useEffect(() => {
    if (items.length > 0) syncMenuMetadata(items)
  }, [items, syncMenuMetadata])

  const selectItem = useCallback(
    (item: MenuItem) => setSelectedItem(resolveLiveMenuItem(items, item)),
    [items],
  )

  const iceCreamCategoryId = useMemo(() => findIceCreamCategoryId(categories), [categories])

  const scoreOpts = useMemo(
    () => ({ moods: settings.moods, defaultReason: formatCopy(copy.smartPickReason, vars) }),
    [settings.moods, copy.smartPickReason, vars],
  )

  const comboOpts = useMemo(
    () => ({
      comboTitle: formatCopy(copy.smartComboTitle, vars),
      scoreOpts,
      settings: settings.comboRecommendations,
    }),
    [copy.smartComboTitle, vars, scoreOpts, settings.comboRecommendations],
  )

  const navItems = useMemo(() => {
    const tabs: { id: Tab; label: string }[] = [
      { id: 'home', label: copy.navHome },
      { id: 'icecream', label: copy.navIceCream },
      { id: 'menu', label: copy.navMenu },
    ]
    if (
      features.swipeDeck !== false ||
      features.scratchSurprise !== false ||
      features.coffeeFortune !== false
    ) {
      tabs.push({ id: 'discover', label: copy.navDiscover })
    }
    if (features.spinWheel !== false) {
      tabs.push({ id: 'play', label: copy.navPlay })
    }
    return tabs
  }, [copy, features])

  const [hour, setHour] = useState(new Date().getHours())
  const [weather, setWeather] = useState<ContextData['weather']>(null)
  const [mood, setMood] = useState<Mood | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const fromUrl = tabFromLocation() as Tab | null
    return fromUrl === 'play' ? 'play' : 'menu'
  })
  const tabBootstrapped = useRef(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [combo, setCombo] = useState<ComboSuggestion | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    if (tabBootstrapped.current) return
    const ids = navItems.map((t) => t.id)
    const fromUrl = tabFromLocation() as Tab | null
    const preferred = menuAppearance.defaultTab as Tab
    const next =
      fromUrl && ids.includes(fromUrl)
        ? fromUrl
        : ids.includes(preferred)
          ? preferred
          : ids.includes('menu')
            ? 'menu'
            : ids[0]
    setActiveTab(next)
    tabBootstrapped.current = true
  }, [navItems, menuAppearance.defaultTab])

  useEffect(() => {
    if (!tabBootstrapped.current) return
    syncSpinPath(activeTab)
  }, [activeTab])

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = tabFromLocation() as Tab | null
      if (fromUrl && navItems.some((t) => t.id === fromUrl)) {
        setActiveTab(fromUrl)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navItems])

  const { isRegistered, syncPreferences } = useCustomer()
  const { enabled: aiEnabled } = useAiConfig()
  const showAiFab =
    features.aiWaiter !== false && aiEnabled && activeTab !== 'icecream' && activeTab !== 'play'
  const smartComboOn = features.smartCombo !== false
  const inWaitSession = loungeEnabled && !!activeOrder
  const hidePreOrderGames = loungeOpen || inWaitSession
  const logoUrl = getBrandLogoUrl(appearance)
  const brandFallback = getBrandFallback(appearance, settings.storeName)
  const iceCreamImmersive =
    activeTab === 'icecream' && iceOptions?.enabled && iceOptions.builderMode !== 'classic'

  const rewardPool = useMemo(() => {
    const available = items.filter((i) => i.isAvailable !== false)
    const ids = settings.scratchReward.menuItemIds
    if (ids.length === 0) return available
    return available.filter((i) => ids.includes(i.id))
  }, [items, settings.scratchReward.menuItemIds])

  const ctx: ContextData = useMemo(
    () => ({
      timeOfDay: getTimeOfDay(hour),
      hour,
      weather,
      mood,
    }),
    [hour, weather, mood],
  )

  const smartPicks = useMemo(
    () => getSmartPicks(items, ctx, settings.smartPicksCount, scoreOpts),
    [items, ctx, settings.smartPicksCount, scoreOpts],
  )

  useEffect(() => {
    registerOpenCart(() => setCartOpen(true))
  }, [registerOpenCart])

  useEffect(() => {
    const { lat, lon, label } = settings.location
    const thresholds = { hot: settings.weatherHotThreshold, cold: settings.weatherColdThreshold }
    fetchWeather(lat, lon, label, thresholds).then(setWeather)
    const timer = setInterval(() => setHour(new Date().getHours()), 60000)
    const weatherTimer = setInterval(
      () => fetchWeather(lat, lon, label, thresholds).then(setWeather),
      30 * 60000,
    )
    return () => {
      clearInterval(timer)
      clearInterval(weatherTimer)
    }
  }, [settings.location, settings.weatherHotThreshold, settings.weatherColdThreshold])

  useEffect(() => {
    if (!smartComboOn) {
      setCombo(null)
      return
    }
    setCombo((prev) => {
      const next = buildSmartCombo(items, ctx, comboOpts.settings, comboOpts)
      if (
        prev &&
        prev.title === next.title &&
        prev.total === next.total &&
        prev.items.length === next.items.length &&
        prev.items.every((item, i) => item.id === next.items[i]?.id)
      ) {
        return prev
      }
      return next
    })
  }, [items, ctx, comboOpts, smartComboOn])

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleScratchReward = useCallback(
    (item: MenuItem) => {
      setPendingReward(item, settings.scratchReward.rewardPrice)
      toast.success(formatCopy(copy.scratchRewardSuccess, vars))
      if (navigator.vibrate) navigator.vibrate(30)
    },
    [setPendingReward, settings.scratchReward.rewardPrice, copy.scratchRewardSuccess, vars],
  )

  const handleAdd: AddToCartHandler = useCallback(
    (item, origin) => {
      const liveItem = menuItemForCart(items, item)
      const needsModifierSetup = addItem(liveItem)
      if (!needsModifierSetup) {
        notifyItemAdded(item, origin)
      }
      const name = item.name.split('(')[0].trim()
      toast.success(formatCopy(copy.addToCartToast, { ...vars, name }), {
        description: needsModifierSetup
          ? 'آپشن‌های این آیتم را در سبد انتخاب کنید'
          : 'برای تکمیل سفارش روی دکمه سبد پایین صفحه بزنید',
        duration: 3200,
        action: {
          label: 'مشاهده سبد',
          onClick: () => setCartOpen(true),
        },
      })
      if (needsModifierSetup) {
        setCartOpen(true)
      }
    },
    [addItem, items, notifyItemAdded, copy.addToCartToast, vars],
  )

  const handleAddCombo = useCallback(
    (comboItems: MenuItem[]) => {
      comboItems.forEach((item, i) => {
        addItem(item)
        window.setTimeout(() => notifyItemAdded(item), i * 120)
      })
      toast.success(copy.comboOrderToast, {
        description: `${comboItems.length} آیتم به سبد اضافه شد`,
        duration: 3200,
        action: {
          label: 'مشاهده سبد',
          onClick: () => setCartOpen(true),
        },
      })
      setCartOpen(true)
    },
    [addItem, notifyItemAdded, copy.comboOrderToast],
  )

  const handleMood = useCallback((m: Mood) => {
    setMood(m)
    setAiOpen(true)
    if (isRegistered) {
      syncPreferences({ favoriteMood: m }).catch(() => undefined)
    }
  }, [isRegistered, syncPreferences])

  const refreshCombo = useCallback(() => {
    setCombo(buildSmartCombo(items, { ...ctx, mood: mood || settings.moods[0]?.id || 'adventurous' }, comboOpts.settings, comboOpts))
  }, [items, ctx, mood, comboOpts, settings.moods])

  const handleCategorySelect = useCallback(
    (id: string) => {
      const cat = categories.find((c) => c.id === id)
      if (cat?.isIceCreamHub || id === iceCreamCategoryId) {
        setActiveTab('icecream')
      } else {
        setActiveCategory(id)
        setActiveTab('menu')
      }
    },
    [categories, iceCreamCategoryId],
  )

  const homeSections = useMemo(() => {
    const sectionMap: Record<HomeSectionId, ReactElement | null> = {
      smartPicks: homeAppearance.showSmartPicks ? (
        <SmartPicks
          key="smartPicks"
          picks={smartPicks}
          onSelect={selectItem}
          onAdd={handleAdd}
          appearance={homeAppearance}
        />
      ) : null,
      categories: homeAppearance.showCategories ? (
        <CategoryShowcase
          key="categories"
          categories={visibleCategories}
          activeId={activeCategory}
          onSelect={handleCategorySelect}
          header={homeAppearance}
        />
      ) : null,
      moods: homeAppearance.showMoodPicker ? (
        <MoodPicker
          key="moods"
          moods={settings.moods}
          copy={copy}
          selected={mood}
          onSelect={handleMood}
        />
      ) : null,
      combo:
        smartComboOn && homeAppearance.showComboOnHome && combo ? (
          <ComboBuilder
            key="combo"
            combo={combo}
            eyebrow={homeAppearance.comboEyebrow}
            description={formatCopy(copy.comboDescription, vars)}
            onOrder={() => handleAddCombo(combo.items)}
            onRefresh={refreshCombo}
          />
        ) : null,
      story: homeAppearance.showStoryFeed ? (
        <StoryFeed
          key="story"
          items={smartPicks}
          onAdd={handleAdd}
          eyebrow={copy.storyEyebrow}
          title={formatCopy(copy.storyTitle, vars)}
          description={copy.storyDescription}
          badge={copy.storyBadge}
          autoRotateSeconds={homeAppearance.storyAutoRotateSeconds}
          showProgress={homeAppearance.storyShowProgress}
          heroStyle={homeAppearance.storyHeroStyle}
        />
      ) : null,
    }
    return homeAppearance.sectionOrder
      .map((id) => sectionMap[id])
      .filter((node): node is ReactElement => node != null)
  }, [
    homeAppearance,
    smartPicks,
    selectItem,
    handleAdd,
    visibleCategories,
    activeCategory,
    handleCategorySelect,
    settings.moods,
    copy,
    mood,
    handleMood,
    smartComboOn,
    combo,
    vars,
    handleAddCombo,
    refreshCombo,
  ])

  const pairing = useMemo(() => {
    if (!selectedItem) return null
    return suggestPairing(selectedItem, items, settings.comboRecommendations, {
      timeOfDay: ctx.timeOfDay,
      weather: ctx.weather
        ? { isHot: ctx.weather.isHot, isCold: ctx.weather.isCold, weatherCode: ctx.weather.weatherCode }
        : null,
      mood: ctx.mood,
    })
  }, [selectedItem, items, settings.comboRecommendations, ctx])

  const installPWA = async () => {
    if (deferredPrompt) {
      // @ts-expect-error beforeinstallprompt event
      await deferredPrompt.prompt()
      setShowInstall(false)
    }
  }

  return (
    <div className={cn('atelier-shell relative min-h-dvh overflow-x-clip bg-background pb-[calc(5.75rem+var(--safe-bottom))]', isKiosk && 'select-none')}>
      {isKiosk && idle && (
        <KioskScreensaver
          storeName={settings.storeName}
          logoUrl={logoUrl}
          splashUrl={resolveAssetUrl(appearance.splashImageUrl)}
          brandEmoji={brandFallback}
          tapStart={copy.kioskTapStart}
          tapOrder={copy.kioskTapOrder}
          onDismiss={resetIdle}
        />
      )}

      {!settings.isOpen && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          {copy.closedMessage} · {formatCopy(copy.closedHint, vars)}
        </div>
      )}

      {!iceCreamImmersive && (
      <header
        className={cn(
          'atelier-header sticky top-0 z-[100]',
          !appearance.headerBlur && 'bg-background',
        )}
      >
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <motion.img
                src={logoUrl}
                alt={settings.storeName}
                className="atelier-brand-mark shrink-0"
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
              />
            ) : (
              <div className="atelier-brand-mark flex shrink-0 items-center justify-center bg-primary text-lg font-bold text-primary-foreground">
                {brandFallback}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="atelier-brand-title truncate">{settings.storeName}</h1>
              <p className="atelier-brand-sub truncate">{settings.storeSubtitle}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <WeatherWidget weather={weather} hour={hour} />
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 shrink-0 rounded-full"
              onClick={() => setProfileOpen(true)}
              aria-label="پروفایل"
            >
              <User className="h-5 w-5" />
              {isRegistered && (
                <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>
      </header>
      )}

      {settings.showInstallBanner && showInstall && !iceCreamImmersive && (
        <motion.div
          className="mx-auto flex max-w-lg items-center gap-2 border-b bg-primary/10 px-4 py-2.5"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <Download className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-sm">{formatCopy(copy.installBanner, vars)}</span>
          <Button size="sm" onClick={installPWA}>
            {copy.installButton}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowInstall(false)}>
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      <main className="mx-auto max-w-lg">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="py-4"
              style={{ display: 'flex', flexDirection: 'column', gap: `${homeAppearance.sectionGap}rem` }}
            >
              {homeSections}
            </motion.div>
          )}

          {activeTab === 'icecream' && (
            <motion.div
              key="icecream"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={iceCreamImmersive ? 'relative pt-0 pb-0' : 'pt-0 pb-4'}
            >
              {iceCreamImmersive && (
                <div className="absolute end-3 top-[max(0.5rem,var(--safe-top,0px))] z-50">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-background/80 shadow-md backdrop-blur"
                    onClick={() => setProfileOpen(true)}
                    aria-label="پروفایل"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <IceCreamHub
                onOrder={(item) => {
                  handleAdd(item)
                  setCartOpen(true)
                }}
                iceOptions={iceOptions}
                iceCopy={copy}
                iceCreamCategoryId={iceCreamCategoryId}
              />
            </motion.div>
          )}

          {activeTab === 'discover' && (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 py-4"
            >
              {features.coffeeFortune !== false && !hidePreOrderGames && (
                <CoffeeFortune
                  items={items}
                  settings={settings.coffeeFortuneSettings}
                  storeName={settings.storeName}
                  onPickDrink={handleAdd}
                />
              )}
              {features.swipeDeck !== false && !hidePreOrderGames && (
                <SwipeDeck items={items} onAddToCart={handleAdd} onSelect={selectItem} />
              )}
              {features.scratchSurprise !== false && !hidePreOrderGames && (
                <ScratchSurprise
                  rewardPool={rewardPool}
                  rewardPrice={settings.scratchReward.rewardPrice}
                  copy={{
                    title: copy.scratchTitle,
                    subtitle: copy.scratchSubtitle,
                    canvasHint: copy.scratchCanvasHint,
                  }}
                  onReward={handleScratchReward}
                />
              )}
              <div className="px-4">
                <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={copy.searchPlaceholder} />
              </div>
            </motion.div>
          )}

          {activeTab === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 py-4"
            >
              <div className="px-4">
                {menuAppearance.showSearchBar && (
                  <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder={copy.searchPlaceholder} />
                )}
              </div>
              <MenuGrid
                categories={visibleCategories}
                items={items}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
                onSelect={selectItem}
                onAdd={handleAdd}
                searchQuery={searchQuery}
                title={formatCopy(copy.menuTitle, vars)}
                appearance={menuAppearance}
              />
            </motion.div>
          )}

          {activeTab === 'play' && (
            <motion.div
              key="play"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="campaign-play"
            >
              {features.spinWheel !== false && !hidePreOrderGames && (
                <SpinWheel campaign={settings.spinCampaign} logoUrl={logoUrl} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="atelier-dock fixed inset-x-0 bottom-0 z-50">
        <div className="atelier-dock__tray">
          {navItems.map((tab) => {
            const Icon = TAB_ICONS[tab.id]
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                data-active={active}
                className="atelier-dock__tab"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {activeTab !== 'play' && (
        <CartFab
          className="bottom-[calc(6.35rem+var(--safe-bottom))] start-4"
          onClick={() => setCartOpen(true)}
        />
      )}

      {showAiFab && (
        <Button
          size="icon"
          className="fixed bottom-[calc(5.5rem+var(--safe-bottom))] end-4 z-40 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setAiOpen(true)}
          aria-label="دستیار هوشمند"
        >
          <Bot className="h-5 w-5" />
        </Button>
      )}

      <ItemDetail
        item={selectedItem}
        pairing={pairing}
        pairingSectionTitle={settings.comboRecommendations.pairingSectionTitle}
        onClose={() => setSelectedItem(null)}
        onAdd={(item, origin) => {
          handleAdd(item, origin)
          setSelectedItem(null)
        }}
      />

      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        rewardCheckoutLabel={copy.scratchRewardCheckoutLabel}
        storeOpen={settings.isOpen}
        closedMessage={copy.closedMessage}
      />
      <AIWaiter
        items={items}
        ctx={ctx}
        onAdd={handleAdd}
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        moodTrigger={mood}
        storeName={settings.storeName}
        storeSubtitle={settings.storeSubtitle}
      />

      <CustomerProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />

      {features.waitLounge !== false && (
        <>
          <WaitLoungeFab className="bottom-[calc(9rem+var(--safe-bottom))] end-4" />
          <WaitLounge />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <CartProvider>
      <WaitLoungeProvider>
        <CartFeedbackProvider>
          <AppContent />
        </CartFeedbackProvider>
      </WaitLoungeProvider>
    </CartProvider>
  )
}
