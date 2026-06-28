import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import type { ComboSuggestion } from '../types'
import { formatPrice } from '../lib/comboBuilder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{combo.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{combo.reason}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {combo.items.map((item, i) => (
              <motion.div
                key={item.id}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="flex-1 text-sm font-medium">{item.name}</span>
                <span className="text-sm text-muted-foreground">{formatPrice(item.price)}</span>
              </motion.div>
            ))}
          </CardContent>
          <Separator />
          <CardFooter className="flex-col gap-3 pt-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm text-muted-foreground">جمع کل</span>
              <strong className="text-lg">{formatPrice(combo.total)}</strong>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                کمبو جدید
              </Button>
              <Button className="flex-1" onClick={onOrder}>
                سفارش کمبو
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </section>
  )
}
