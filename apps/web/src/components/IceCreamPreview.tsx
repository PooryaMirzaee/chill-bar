import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { IceCreamBuild } from '../data/iceCreamBuilder'
import { IceCreamBar3D } from './IceCreamBar3D'
import { cn } from '@/lib/utils'

interface Props {
  build: IceCreamBuild
  activeStep?: 1 | 2 | 3
  stepLabels?: [string, string, string]
  compact?: boolean
  /** تمام‌صفحه: بدون عنوان بالا، حداقل کروم، بستنی بزرگ‌تر */
  immersive?: boolean
  className?: string
}

export function IceCreamPreview({
  build,
  activeStep = 1,
  stepLabels,
  compact = false,
  immersive = false,
  className,
}: Props) {
  const labels = stepLabels ?? ['پایه', 'روکش', 'فیلینگ']

  return (
    <div className={cn('relative w-full overflow-hidden bg-white dark:bg-background', className)}>
      <div
        className={cn(
          'relative mx-auto w-full max-w-lg bg-white dark:bg-background',
          immersive || className?.includes('h-full') ? 'h-full min-h-[220px]' : compact
            ? 'h-[min(34dvh,300px)] min-h-[200px]'
            : 'h-[min(52dvh,440px)] min-h-[300px]',
        )}
      >
        {!immersive && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-14 bg-white dark:bg-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[4.5rem] bg-white dark:bg-background" />
          </>
        )}
        {immersive && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-4 bg-gradient-to-b from-white to-transparent dark:from-background" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-8 bg-gradient-to-t from-white to-transparent dark:from-background" />
          </>
        )}

        {!immersive && (
          <div className="absolute inset-x-0 top-0 z-20 px-4 pt-3">
            <div className="mx-auto w-fit rounded-2xl border border-border/40 bg-white px-4 py-2 text-center shadow-sm dark:bg-background">
              <p className="text-sm font-bold tracking-tight">بستنی سفارشی</p>
              <p className="text-[11px] text-muted-foreground">پایه · روکش · فیلینگ</p>
            </div>
          </div>
        )}

        <motion.div
          className={cn(
            'absolute inset-x-0 z-10',
            immersive ? 'top-2 bottom-8' : 'top-14 bottom-14',
          )}
          key={`${build.base?.id}-${build.coating?.id}-${build.filling?.id}`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <IceCreamBar3D
            build={build}
            mode="full"
            size="fill"
            fitFrame
            interactive
            displayScale={immersive ? 0.92 : 1}
          />
        </motion.div>

        <AnimatePresence>
          {activeStep === 2 && build.coating && build.coating.id !== 'none' && (
            <motion.div
              className="pointer-events-none absolute left-1/2 top-[22%] z-20 h-16 w-4 -translate-x-1/2 rounded-b-full opacity-90"
              style={{ background: build.coating.color }}
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: [0, 0.9, 0], y: [-40, 24, 72] }}
              transition={{ duration: 1.1 }}
            />
          )}
        </AnimatePresence>

        <div
          className={cn(
            'absolute inset-x-0 z-20 flex justify-center gap-1 px-3',
            immersive ? 'bottom-1' : 'bottom-2',
          )}
        >
          {labels.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
            const done =
              (n === 1 && !!build.base) ||
              (n === 2 && !!build.coating) ||
              (n === 3 && !!build.filling)
            return (
              <span
                key={label}
                className={cn(
                  'rounded-full font-semibold backdrop-blur-md transition-colors',
                  immersive ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
                  activeStep === n
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : done
                      ? 'bg-primary/15 text-primary'
                      : 'bg-white text-muted-foreground ring-1 ring-border/50 dark:bg-background',
                )}
              >
                {label}
              </span>
            )
          })}
        </div>

        <p
          className={cn(
            'pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 text-muted-foreground',
            immersive
              ? 'bottom-5 bg-transparent text-[9px]'
              : 'bottom-9 bg-white px-2 py-0.5 text-[10px] dark:bg-background',
          )}
        >
          <RotateCcw className={immersive ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          بچرخانید
        </p>
      </div>
    </div>
  )
}
