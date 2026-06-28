import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import type { IceCreamBuild } from '../data/iceCreamBuilder'
import { getBuildProgress } from '../lib/iceCreamGraphics'
import { IceCreamBar3D } from './IceCreamBar3D'

interface Props {
  build: IceCreamBuild
  activeStep?: 1 | 2 | 3
}

export function IceCreamPreview({ build, activeStep = 1 }: Props) {
  const progress = getBuildProgress(build)

  return (
    <div className="relative w-screen max-w-[100vw] ms-[calc(50%-50vw)]">
      <div className="relative h-[calc(100dvh-9rem-env(safe-bottom))] min-h-[460px] w-full">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/50 via-background to-background" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_35%,rgba(242,101,34,0.16),transparent_70%)] [.accent-glow-off_&]:hidden" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

        {/* top toolbar — single row, no overlap */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-11 w-11 shrink-0">
              <svg className="h-11 w-11 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/25" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="text-primary"
                  strokeDasharray={`${progress * 2.64} 264`}
                  animate={{ strokeDasharray: `${progress * 2.64} 264` }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                {progress}%
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">استودیو بستنی</p>
              <p className="text-[11px] text-muted-foreground">بستنی چوبدار سفارشی</p>
            </div>
          </div>

          <p className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
            <RotateCcw className="h-3.5 w-3.5" />
            بچرخانید
          </p>
        </div>

        {/* 3D */}
        <motion.div
          className="absolute inset-0 z-10"
          key={`${build.base?.id}-${build.coating?.id}-${build.filling?.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <IceCreamBar3D build={build} mode="full" size="fill" fitFrame interactive />

          <AnimatePresence>
            {activeStep === 2 && build.coating && build.coating.id !== 'none' && (
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[18%] h-20 w-5 -translate-x-1/2 rounded-b-full opacity-80"
                style={{ background: build.coating.color }}
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: [0, 0.85, 0], y: [-50, 30, 80] }}
                transition={{ duration: 1.2 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
