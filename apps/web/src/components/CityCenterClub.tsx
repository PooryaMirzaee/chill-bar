import { useEffect, useState } from 'react'
import { Building2, Bike, Percent, Wallet, X } from 'lucide-react'
import type { MallMembershipPublic } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loadMallMembership,
  membershipCodeFromPath,
  redeemMallCode,
  saveMallMembership,
} from '@/lib/mallMembership'
import { formatPrice } from '@/lib/comboBuilder'

interface Props {
  onContinue: () => void
  onClose?: () => void
}

export function CityCenterClub({ onContinue, onClose }: Props) {
  const [code, setCode] = useState('')
  const [membership, setMembership] = useState<MallMembershipPublic | null>(loadMallMembership)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hero, setHero] = useState({
    title: 'اشتراک واحدهای سیتی‌سنتر',
    subtitle: 'با کد واحدت سفارش بده — پیک چیل‌بار تا خود واحد می‌آورد',
  })

  useEffect(() => {
    void fetch('/api/mall/config')
      .then((r) => r.json())
      .then((d: { heroTitle?: string; heroSubtitle?: string }) => {
        setHero({
          title: d.heroTitle || hero.title,
          subtitle: d.heroSubtitle || hero.subtitle,
        })
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const fromPath = membershipCodeFromPath()
    if (!fromPath) return
    setCode(fromPath)
    setLoading(true)
    redeemMallCode(fromPath)
      .then((m) => {
        setMembership(m)
        setError('')
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const m = await redeemMallCode(code.trim())
      setMembership(m)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    saveMallMembership(null)
    setMembership(null)
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
      <div className="relative overflow-hidden rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/15 via-background to-background p-5">
        {onClose && (
          <button
            type="button"
            className="absolute left-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
            onClick={onClose}
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-600">
          <Building2 className="h-3.5 w-3.5" />
          اصفهان سیتی‌سنتر
        </div>
        <h1 className="font-display text-2xl font-bold leading-tight">{hero.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{hero.subtitle}</p>
      </div>

      {!membership ? (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <label className="block text-sm font-medium">کد اشتراک واحد</label>
          <Input
            dir="ltr"
            className="text-center tracking-wider"
            placeholder="CC-A1-05-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" disabled={loading || code.trim().length < 4} onClick={() => void submit()}>
            {loading ? 'در حال بررسی…' : 'فعال‌سازی اشتراک'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">واحد متصل</p>
              <p className="font-semibold">
                {membership.unit.unitCode} · {membership.unit.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{membership.unit.deliveryLabel}</p>
            </div>
            <button type="button" className="text-xs text-muted-foreground underline" onClick={clear}>
              قطع اتصال
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-muted/50 p-2">
              <Percent className="mx-auto mb-1 h-4 w-4 text-orange-500" />
              {membership.discountPercent}٪ تخفیف
            </div>
            <div className="rounded-xl bg-muted/50 p-2">
              <Wallet className="mx-auto mb-1 h-4 w-4 text-orange-500" />
              {formatPrice(membership.walletBalance)}
            </div>
            <div className="rounded-xl bg-muted/50 p-2">
              <Bike className="mx-auto mb-1 h-4 w-4 text-orange-500" />
              پیک تا واحد
            </div>
          </div>
          <p className="text-xs text-muted-foreground" dir="ltr">
            {membership.code}
          </p>
          <p className="text-xs text-muted-foreground">
            اعتبار آزاد: {formatPrice(membership.creditAvailable)}
          </p>
          <Button className="w-full" onClick={onContinue}>
            برو به منو و سفارش بده
          </Button>
        </div>
      )}
    </div>
  )
}

export function MallMemberBadge({
  membership,
  onOpen,
}: {
  membership: MallMembershipPublic
  onOpen?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-right text-xs"
    >
      <Building2 className="h-4 w-4 shrink-0 text-orange-600" />
      <span className="min-w-0 flex-1 truncate font-medium">
        {membership.unit.unitCode} · {membership.unit.name}
      </span>
      <span className="shrink-0 text-orange-600">{membership.discountPercent}٪</span>
    </button>
  )
}
