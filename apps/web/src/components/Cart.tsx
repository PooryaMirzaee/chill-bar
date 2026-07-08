import { Gift, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { useCart } from '../store/cart'
import { useCustomer } from '../lib/customerAuth'
import { formatPrice } from '../lib/comboBuilder'
import { apiClient } from '../lib/api'
import { ORDER_STATUS_LABEL, ORDER_STATUS_FLOW, computeRedeem, formatChillPoints } from '@chill-bar/shared'
import type { Order, OrderStatus } from '@chill-bar/shared'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { QuickSignupPrompt } from './QuickSignupPrompt'
import { CartLineModifiers } from './CartLineModifiers'
import { useMenuData } from '../hooks/useMenuData'
import { cartLineModifiers } from '../lib/menuItem'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useLoyalty } from '../hooks/useLoyalty'
import { useWaitLounge } from '../store/waitLounge'
import { WaitLoungePromoCard } from './wait-lounge/WaitLoungeEntry'
import { WaitLoungeCelebrationPopup } from './wait-lounge/WaitLoungeCelebrationPopup'
import { orderToActive } from '../store/activeOrder'

interface Props {
  isOpen: boolean
  onClose: () => void
  storeOpen: boolean
  closedMessage: string
  rewardCheckoutLabel?: string
}

type Stage = 'cart' | 'checkout' | 'done'

export function Cart({
  isOpen,
  onClose,
  storeOpen,
  closedMessage,
  rewardCheckoutLabel = 'جایزه کارت شانس',
}: Props) {
  const {
    items,
    pendingReward,
    clearPendingReward,
    removeItem,
    updateQuantity,
    updateLineModifiers,
    clearCart,
    total,
    count,
    submitOrder,
    lastOrder,
    loyaltyRewardId,
    setLoyaltyRewardId,
  } = useCart()
  const { items: menuItems } = useMenuData()
  const { customer, isRegistered, refresh } = useCustomer()
  const { settings } = useStoreSettings()
  const [stage, setStage] = useState<Stage>('cart')
  const { balance, hasAccount } = useLoyalty(isOpen && stage === 'checkout')
  const { setActiveOrder } = useWaitLounge()
  const waitLounge = settings.waitLounge
  const loungeFeatureOn = settings.features.waitLounge !== false
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [showSaveHint, setShowSaveHint] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setName(customer?.name ?? '')
  }, [isOpen, customer?.name])

  const checkoutSubtotal = total + (pendingReward?.rewardPrice ?? 0)

  const redeemPreview = useMemo(() => {
    if (!loyaltyRewardId) return null
    const tier = waitLounge.rewards.find((r) => r.id === loyaltyRewardId)
    if (!tier) return null
    return computeRedeem(waitLounge, tier, checkoutSubtotal, balance)
  }, [loyaltyRewardId, waitLounge, checkoutSubtotal, balance])

  const redeemDiscount = redeemPreview?.discount ?? 0
  const checkoutTotal = Math.max(0, checkoutSubtotal - redeemDiscount)

  const handleSubmit = async () => {
    if (!storeOpen) {
      setError(closedMessage)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const order = await submitOrder({ customerName: name, note, loyaltyRewardId })
      if (loungeFeatureOn) {
        setActiveOrder(orderToActive(order))
      }
      await refresh().catch(() => undefined)
      setStage('done')
      if (navigator.vibrate) navigator.vibrate([40, 30, 40])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت سفارش ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  const close = () => {
    onClose()
    setTimeout(() => {
      setStage('cart')
      setName('')
      setNote('')
      setShowSaveHint(false)
      setError('')
    }, 300)
  }

  const titles: Record<Stage, string> = {
    cart: 'سبد خرید',
    checkout: 'تکمیل سفارش',
    done: 'سفارش ثبت شد',
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4 text-right">
          <SheetTitle>{titles[stage]}</SheetTitle>
          {stage === 'cart' && count > 0 && (
            <SheetDescription>{count} آیتم در سبد</SheetDescription>
          )}
        </SheetHeader>

        {stage === 'done' && lastOrder ? (
          <OrderConfirmation order={lastOrder} name={name} onClose={close} loungeFeatureOn={loungeFeatureOn} />
        ) : items.length === 0 && !pendingReward ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold">سبد خالی است</p>
            <p className="text-sm text-muted-foreground">از منو انتخاب کنید یا بستنی سفارشی بسازید</p>
          </div>
        ) : stage === 'cart' ? (
          <>
            <ScrollArea className="flex-1 px-4">
              {items.length === 0 && pendingReward ? (
                <div className="space-y-4 py-6 text-center">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-3xl">{pendingReward.emoji}</p>
                    <p className="mt-2 font-semibold">{pendingReward.name}</p>
                    <p className="mt-1 text-sm text-primary">جایزه کارت شانس شما</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    جایزه به‌تنهایی قابل سفارش نیست. از منو حداقل یک محصول دیگر انتخاب کنید تا بتوانید سفارش را ثبت کنید.
                  </p>
                </div>
              ) : (
              <ul className="space-y-3 py-4">
                {items.map((item) => {
                  const modifierGroups = cartLineModifiers(item, menuItems)
                  return (
                  <li
                    key={item.cartLineId}
                    className="space-y-3 rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium">{item.name}</h4>
                        <span className="text-sm font-semibold text-primary">
                          {formatPrice(item.unitPrice ?? item.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border bg-background">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.cartLineId, item.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.cartLineId, item.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.cartLineId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {modifierGroups.length > 0 && (
                      <CartLineModifiers
                        groups={modifierGroups}
                        selectedModifiers={item.selectedModifiers ?? []}
                        onChange={(selectedModifiers) =>
                          updateLineModifiers(item.cartLineId, selectedModifiers)
                        }
                      />
                    )}
                  </li>
                  )
                })}
              </ul>
              )}
            </ScrollArea>
            <div className="space-y-3 border-t p-4">
              {pendingReward && items.length > 0 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                  🎁 جایزه کارت شانس در مرحله «تکمیل سفارش» به سفارش اضافه می‌شود
                </div>
              )}
              {items.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">جمع کل ({count} آیتم)</span>
                <strong className="text-lg">{formatPrice(total)}</strong>
              </div>
              )}
              {items.length > 0 && (
              <Button variant="outline" className="w-full" onClick={clearCart}>
                خالی کردن سبد
              </Button>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0}
                onClick={() => setStage('checkout')}
              >
                {items.length === 0
                  ? 'ابتدا یک محصول اضافه کنید'
                  : `ادامه و تکمیل سفارش${pendingReward ? ' (+ جایزه)' : ''}`}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
            {items.length > 0 && (
              <div className="rounded-xl border bg-card p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">سبد خرید</p>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.cartLineId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        {item.emoji} {item.name}
                        {item.selectedModifiers && item.selectedModifiers.length > 0
                          ? ` (${item.selectedModifiers.map((modifier) => modifier.optionName).join('، ')})`
                          : ''}{' '}
                        ×{item.quantity}
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatPrice((item.unitPrice ?? item.price) * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pendingReward && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                  <Gift className="h-4 w-4" />
                  {rewardCheckoutLabel}
                </div>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    {pendingReward.emoji} {pendingReward.name}
                  </span>
                  <span className="shrink-0 font-medium">
                    {pendingReward.rewardPrice <= 0
                      ? 'رایگان'
                      : formatPrice(pendingReward.rewardPrice)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 px-2 text-xs text-muted-foreground"
                  onClick={clearPendingReward}
                >
                  حذف جایزه
                </Button>
              </div>
            )}

            {items.length === 0 && pendingReward && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                جایزه به‌تنهایی قابل ثبت نیست. به سبد برگردید و حداقل یک محصول دیگر اضافه کنید.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">نام (اختیاری)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="نام شما"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">توضیحات (اختیاری)</Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="مثلاً بدون یخ، شکر کم..."
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Separator />

            {loungeFeatureOn &&
              waitLounge.pointsRedemptionEnabled &&
              hasAccount &&
              balance >= waitLounge.minPointsToRedeem && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {settings.copy.waitLoungeRedeemLabel}
                </div>
                <p className="text-xs text-muted-foreground">
                  موجودی: {formatChillPoints(balance)} {settings.copy.waitLoungePointsLabel}
                </p>
                <div className="space-y-2">
                  {waitLounge.rewards
                    .filter((tier) => balance >= tier.cost)
                    .map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition',
                          loyaltyRewardId === tier.id
                            ? 'border-primary bg-primary/10'
                            : 'hover:border-primary/40',
                        )}
                        onClick={() =>
                          setLoyaltyRewardId(loyaltyRewardId === tier.id ? null : tier.id)
                        }
                      >
                        <span>{tier.label}</span>
                        <span className="text-xs text-muted-foreground">{tier.cost} امتیاز</span>
                      </button>
                    ))}
                </div>
                {redeemPreview?.error && loyaltyRewardId && (
                  <p className="text-xs text-destructive">{redeemPreview.error}</p>
                )}
                {redeemDiscount > 0 && (
                  <p className="text-xs text-primary">
                    {settings.copy.waitLoungeRedeemApplied}: {formatPrice(redeemDiscount)}-
                  </p>
                )}
              </div>
            )}

            {!isRegistered && (
              <div className="rounded-xl border border-dashed bg-muted/20">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm"
                  onClick={() => setShowSaveHint((v) => !v)}
                >
                  <span className="text-muted-foreground">ذخیره برای دفعات بعد (اختیاری)</span>
                  {showSaveHint ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {showSaveHint && (
                  <p className="px-4 pb-3 text-xs text-muted-foreground">
                    بعد از ثبت سفارش می‌توانید با شماره موبایل ثبت‌نام کنید — سفارش فعلی بدون ثبت‌نام انجام می‌شود.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {count} آیتم{pendingReward ? ' + جایزه' : ''}
              </span>
              <strong className="text-lg">
                {formatPrice(checkoutTotal)}
              </strong>
            </div>

            {redeemDiscount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                قبل از تخفیف: {formatPrice(checkoutSubtotal)}
              </p>
            )}

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-auto space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (items.length > 0 ? setStage('cart') : close())}
              >
                {items.length > 0 ? 'بازگشت' : 'بستن'}
              </Button>
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  !storeOpen ||
                  items.length === 0 ||
                  (!!loyaltyRewardId && !!redeemPreview?.error)
                }
              >
                {submitting ? 'در حال ثبت…' : 'ثبت نهایی سفارش'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function OrderConfirmation({
  order,
  name,
  onClose,
  loungeFeatureOn,
}: {
  order: Order
  name?: string
  onClose: () => void
  loungeFeatureOn: boolean
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [celebrationOpen, setCelebrationOpen] = useState(
    loungeFeatureOn && order.status !== 'CANCELLED' && order.status !== 'DELIVERED',
  )
  const { setActiveOrder, setLoungeOpen, loungeCopy, sessionPoints } = useWaitLounge()
  const { settings } = useStoreSettings()
  const { waitLounge } = settings

  const openLounge = () => {
    setActiveOrder(orderToActive({ ...order, status }))
    setLoungeOpen(true)
    setCelebrationOpen(false)
    onClose()
  }

  const dismissCelebration = () => setCelebrationOpen(false)

  useEffect(() => {
    if (status === 'DELIVERED' || status === 'CANCELLED') return
    const timer = setInterval(async () => {
      try {
        const res = await apiClient.getOrderStatus(order.code)
        setStatus(res.status)
      } catch {
        /* keep last status */
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [order.code, status])

  const currentIdx = ORDER_STATUS_FLOW.indexOf(status)

  return (
    <>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <WaitLoungeCelebrationPopup
          open={celebrationOpen}
          orderCode={order.code}
          title={loungeCopy.waitLoungeOrderSuccessTitle}
          body={loungeCopy.waitLoungeOrderSuccessBody}
          cta={loungeCopy.waitLoungeEnter}
          laterLabel={loungeCopy.waitLoungeOrderSuccessLater}
          maxPoints={waitLounge.maxPointsPerOrder}
          pointsLabel={loungeCopy.waitLoungePointsLabel}
          onPlay={openLounge}
          onDismiss={dismissCelebration}
        />

        <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <CheckCircle2 className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold">سفارش شما با کد</h4>
        <div className="mt-2 text-3xl font-bold tracking-widest text-primary">{order.code}</div>
        <p className="mt-2 text-sm text-muted-foreground">ثبت شد و برای آشپزخانه ارسال شد</p>
      </div>

      {status === 'CANCELLED' ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          این سفارش لغو شده است
        </div>
      ) : (
        <div className="w-full space-y-2 rounded-xl border bg-card p-4 text-right">
          {ORDER_STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <span
                className={cn(
                  'h-2.5 w-2.5 shrink-0 rounded-full',
                  i <= currentIdx ? 'bg-primary' : 'bg-muted',
                )}
              />
              <span className={cn('text-sm', i <= currentIdx ? 'font-medium' : 'text-muted-foreground')}>
                {ORDER_STATUS_LABEL[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex w-full items-center justify-between rounded-xl border bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">مبلغ قابل پرداخت</span>
        <strong className="text-lg">{formatPrice(order.total)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">پرداخت هنگام تحویل سفارش انجام می‌شود</p>

      <QuickSignupPrompt defaultName={name} onDone={() => undefined} />

      {loungeFeatureOn && status !== 'CANCELLED' && status !== 'DELIVERED' && !celebrationOpen && (
        <WaitLoungePromoCard
          className="w-full"
          title={loungeCopy.waitLoungePlayTitle}
          subtitle={loungeCopy.waitLoungeSubtitle}
          cta={loungeCopy.waitLoungeEnter}
          maxPoints={waitLounge.maxPointsPerOrder}
          pointsLabel={loungeCopy.waitLoungePointsLabel}
          sessionPoints={sessionPoints}
          onClick={openLounge}
        />
      )}

      <Button className="mt-auto w-full" size="lg" variant="outline" onClick={onClose}>
        بستن
      </Button>
        </div>
      </div>
    </>
  )
}
