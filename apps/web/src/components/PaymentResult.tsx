import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '../lib/comboBuilder'

export function isPaymentResultPath(pathname = window.location.pathname): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/'
  return clean === '/pay/result'
}

export function PaymentResult({ onDone }: { onDone: () => void }) {
  const params = new URLSearchParams(window.location.search)
  const ok = params.get('ok') === '1'
  const purpose = params.get('purpose')
  const refId = params.get('refId')
  const amount = Number(params.get('amount') || 0)
  const error = params.get('error')

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      {ok ? (
        <CheckCircle2 className="h-16 w-16 text-emerald-600" />
      ) : (
        <XCircle className="h-16 w-16 text-destructive" />
      )}
      <h1 className="text-2xl font-bold">{ok ? 'پرداخت موفق' : 'پرداخت انجام نشد'}</h1>
      <p className="text-sm text-muted-foreground">
        {ok
          ? purpose === 'WALLET_TOPUP'
            ? 'کیف‌پول واحد شارژ شد.'
            : 'سفارش شما پرداخت شد و برای آماده‌سازی ثبت است.'
          : error || 'تراکنش لغو یا ناموفق بود.'}
      </p>
      {ok && amount > 0 && (
        <p className="text-lg font-semibold text-primary">{formatPrice(amount)}</p>
      )}
      {ok && refId && (
        <p className="text-xs text-muted-foreground" dir="ltr">
          کد پیگیری: {refId}
        </p>
      )}
      <Button
        type="button"
        onClick={() => {
          window.history.replaceState(null, '', '/')
          onDone()
        }}
      >
        بازگشت به منو
      </Button>
    </div>
  )
}
