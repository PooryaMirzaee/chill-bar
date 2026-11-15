import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { ComboSuggestion } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SectionHeader } from '@/components/layout/SectionHeader'

interface Props {
  combo: ComboSuggestion
  description: string
  eyebrow?: string
  onOrder: () => void
  onRefresh: () => void
}

export function ComboBuilder({ combo, description, eyebrow = 'کمبو', onOrder, onRefresh }: Props) {
  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={combo.title} description={description} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        key={combo.title}
        className="px-4"
      >
        <div className="atelier-surface overflow-hidden">
          <div className="space-y-1 px-4 pb-3 pt-4">
            <p className="text-sm leading-relaxed text-muted-foreground">{combo.reason}</p>
          </div>
          <div className="space-y-2 px-4 pb-4">
            {combo.items.map((item, i) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-3 rounded-[1rem] bg-[color-mix(in_srgb,var(--marble)_55%,white)] px-3 py-2.5"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 text-sm font-semibold">{item.name}</span>
                <span className="text-sm text-muted-foreground">{formatPrice(item.price)}</span>
              </motion.div>
            ))}
          </div>
          <Separator />
          <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm text-muted-foreground">جمع کل</span>
              <strong className="atelier-menu-price !text-[1.35rem]">{formatPrice(combo.total)}</strong>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                کمبو جدید
              </Button>
              <Button className="atelier-cta flex-1" onClick={onOrder}>
                سفارش کمبو
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
