import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { useCustomer } from '../lib/customerAuth'
import { PhoneAuthForm } from './PhoneAuthForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  defaultName?: string
  onDone: () => void
}

export function QuickSignupPrompt({ defaultName, onDone }: Props) {
  const { isRegistered } = useCustomer()
  const [name, setName] = useState(defaultName ?? '')
  const [dismissed, setDismissed] = useState(false)

  if (isRegistered || dismissed) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border border-primary/25 bg-primary/5 p-4 text-start"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">دفعه بعد سریع‌تر سفارش بده</p>
            <p className="text-xs text-muted-foreground">
              با تأیید پیامکی، سلیقه‌ات را به خاطر می‌آوریم — کاملاً اختیاری
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => {
            setDismissed(true)
            onDone()
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {!defaultName && (
          <Input
            placeholder="نام (اختیاری)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
        <PhoneAuthForm
          purpose="register"
          name={name}
          onNameChange={setName}
          showName={false}
          submitLabel="تأیید و ذخیره"
          onSuccess={onDone}
        />
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => {
            setDismissed(true)
            onDone()
          }}
        >
          نه، ممنون
        </Button>
      </div>
    </motion.div>
  )
}
