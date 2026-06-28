import { useEffect, useState } from 'react'
import { User, History, Loader2 } from 'lucide-react'
import type { Order } from '@chill-bar/shared'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { useCustomer } from '../lib/customerAuth'
import { formatPrice } from '../lib/comboBuilder'
import { describeTaste, loadTasteProfile } from '../lib/tasteProfile'
import { PhoneAuthForm } from './PhoneAuthForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ORDER_STATUS_LABEL } from '@chill-bar/shared'

interface Props {
  open: boolean
  onClose: () => void
}

type AuthMode = 'register' | 'login'

export function CustomerProfileSheet({ open, onClose }: Props) {
  const { customer, isRegistered, updateProfile, getOrders } = useCustomer()
  const { settings } = useStoreSettings()
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [name, setName] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && customer) {
      setName(customer.name ?? '')
    }
  }, [open, customer, isRegistered])

  useEffect(() => {
    if (!open || !isRegistered) return
    setLoadingOrders(true)
    getOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false))
  }, [open, isRegistered, getOrders])

  const handleSaveProfile = async () => {
    setSubmitting(true)
    setError('')
    try {
      await updateProfile({ name: name || null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود')
    } finally {
      setSubmitting(false)
    }
  }

  const tasteSummary = describeTaste(loadTasteProfile())

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4 text-start">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {isRegistered ? 'پروفایل من' : 'ثبت‌نام با پیامک'}
          </SheetTitle>
          <SheetDescription>
            {isRegistered
              ? 'سلیقه و سفارش‌های قبلی‌ات اینجاست'
              : 'کد تأیید به موبایلت پیامک می‌شود — اختیاری'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 py-4">
            {!isRegistered && (
              <>
                <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
                  {settings.copy.smsRegisterNote}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={authMode === 'register' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAuthMode('register')}
                  >
                    ثبت‌نام
                  </Button>
                  <Button
                    variant={authMode === 'login' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAuthMode('login')}
                  >
                    ورود
                  </Button>
                </div>
                <PhoneAuthForm
                  purpose={authMode}
                  name={name}
                  onNameChange={setName}
                  showName={authMode === 'register'}
                />
              </>
            )}

            {isRegistered && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">نام</Label>
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="نام شما"
                  />
                </div>
                {customer?.phone && (
                  <p className="text-xs text-muted-foreground">
                    موبایل: <span dir="ltr">{customer.phone}</span>
                  </p>
                )}
                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button className="w-full" onClick={handleSaveProfile} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره تغییرات'}
                </Button>
              </div>
            )}

            {isRegistered && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">سلیقه شما</h3>
                  <p className="text-sm text-muted-foreground">{tasteSummary}</p>
                  {customer?.preferences.iceCreamBuild?.base && (
                    <Badge variant="secondary" className="mt-2">
                      بستنی ذخیره‌شده ✓
                    </Badge>
                  )}
                </div>

                <Separator />
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4" />
                    سفارش‌های قبلی
                    {customer?.orderCount ? (
                      <Badge variant="outline" className="text-[10px]">
                        {customer.orderCount}
                      </Badge>
                    ) : null}
                  </h3>

                  {loadingOrders ? (
                    <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
                  ) : orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">هنوز سفارشی ثبت نشده</p>
                  ) : (
                    <ul className="space-y-2">
                      {orders.map((order) => (
                        <li
                          key={order.id}
                          className="rounded-xl border bg-card p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-primary">{order.code}</span>
                            <span className="text-xs text-muted-foreground">
                              {ORDER_STATUS_LABEL[order.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {order.items.map((i) => i.name).slice(0, 2).join(' · ')}
                            {order.items.length > 2 ? '…' : ''}
                          </p>
                          <p className="mt-1 font-semibold">{formatPrice(order.total)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <Button variant="ghost" className="w-full" onClick={onClose}>
            بستن
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
