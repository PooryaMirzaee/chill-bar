import { useCallback, useEffect, useState } from 'react'
import { Loader2, Phone, ShieldCheck } from 'lucide-react'
import type { OtpPurpose } from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStoreSettings } from '../hooks/useStoreSettings'
import { apiClient } from '../lib/api'
import { useCustomer } from '../lib/customerAuth'

interface Props {
  purpose: OtpPurpose
  name?: string
  onNameChange?: (name: string) => void
  showName?: boolean
  onSuccess?: () => void
  submitLabel?: string
}

export function PhoneAuthForm({
  purpose,
  name = '',
  onNameChange,
  showName = purpose === 'register',
  onSuccess,
  submitLabel,
}: Props) {
  const { verifyOtp } = useCustomer()
  const { settings } = useStoreSettings()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [otpLength, setOtpLength] = useState(5)
  const [smsEnabled, setSmsEnabled] = useState(true)

  useEffect(() => {
    apiClient.getSmsConfig().then((cfg) => {
      setOtpLength(cfg.otpLength)
      setSmsEnabled(cfg.enabled)
    }).catch(() => setSmsEnabled(false))
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const sendOtp = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.sendCustomerOtp(phone, purpose)
      setCooldown(res.cooldownSeconds)
      setStep('code')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ارسال پیامک ناموفق بود'
      setError(msg)
      const match = msg.match(/(\d+)\s*ثانیه/)
      if (match) setCooldown(Number(match[1]))
    } finally {
      setLoading(false)
    }
  }, [phone, purpose])

  const verifyOtpCode = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      await verifyOtp(phone, code, purpose, name || undefined)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید ناموفق بود')
    } finally {
      setLoading(false)
    }
  }, [phone, code, purpose, name, verifyOtp, onSuccess])

  if (!smsEnabled) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
        {settings.copy.smsDisabledMessage}
      </div>
    )
  }

  if (step === 'phone') {
    return (
      <div className="space-y-3">
        {showName && onNameChange && (
          <div className="space-y-2">
            <Label htmlFor="auth-name">نام (اختیاری)</Label>
            <Input
              id="auth-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="نام شما"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="auth-phone">شماره موبایل</Label>
          <div className="relative">
            <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="auth-phone"
              inputMode="tel"
              className="ps-10"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={sendOtp} disabled={loading || phone.length < 10}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دریافت کد پیامکی'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        کد {otpLength} رقمی به <span dir="ltr" className="font-medium text-foreground">{phone}</span> ارسال شد
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-code">کد تأیید</Label>
        <div className="relative">
          <ShieldCheck className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="auth-code"
            inputMode="numeric"
            className="ps-10 tracking-widest"
            placeholder={'•'.repeat(otpLength)}
            maxLength={otpLength}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, otpLength))}
            autoFocus
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className="w-full"
        onClick={verifyOtpCode}
        disabled={loading || code.length < 4}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (submitLabel ?? (purpose === 'login' ? 'ورود' : 'ثبت‌نام'))}
      </Button>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => {
            setStep('phone')
            setCode('')
            setError('')
          }}
        >
          تغییر شماره
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={sendOtp}
          disabled={loading || cooldown > 0}
        >
          {cooldown > 0 ? `ارسال مجدد (${cooldown})` : 'ارسال مجدد'}
        </Button>
      </div>
    </div>
  )
}
