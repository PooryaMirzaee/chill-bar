import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { MenuItem } from '../types'

export type AddOrigin = { x: number; y: number }

export type AddToCartHandler = (
  item: MenuItem,
  origin?: AddOrigin | ReactMouseEvent | ReactTouchEvent,
) => void

interface FlyItem {
  id: number
  emoji: string
  from: AddOrigin
  to: AddOrigin
}

interface CartFeedbackContextValue {
  cartFabRef: React.RefObject<HTMLButtonElement | null>
  cartBump: number
  cartRing: number
  registerOpenCart: (fn: () => void) => void
  notifyItemAdded: (item: MenuItem, origin?: AddOrigin | ReactMouseEvent | ReactTouchEvent) => void
}

const CartFeedbackContext = createContext<CartFeedbackContextValue | null>(null)

let flyId = 0

export function resolveAddOrigin(
  origin?: AddOrigin | ReactMouseEvent | ReactTouchEvent,
): AddOrigin {
  if (!origin) {
    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.38 }
  }
  if ('x' in origin && 'y' in origin && !('nativeEvent' in origin)) {
    return origin as AddOrigin
  }
  if ('touches' in origin && origin.touches[0]) {
    return { x: origin.touches[0].clientX, y: origin.touches[0].clientY }
  }
  if ('clientX' in origin) {
    return { x: origin.clientX, y: origin.clientY }
  }
  return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.38 }
}

function getCartTarget(fab: HTMLButtonElement | null): AddOrigin {
  if (fab) {
    const rect = fab.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  const root = document.documentElement
  const rtl = root.dir === 'rtl'
  const safeBottom = Number.parseFloat(
    getComputedStyle(root).getPropertyValue('--safe-bottom') || '0',
  ) || 0
  const fabSize = 48
  const edgeInset = 16
  const bottomOffset = 5.5 * 16 + safeBottom + fabSize / 2

  return {
    x: rtl ? window.innerWidth - edgeInset - fabSize / 2 : edgeInset + fabSize / 2,
    y: window.innerHeight - bottomOffset,
  }
}

function FlyLayer({
  flies,
  onDone,
}: {
  flies: FlyItem[]
  onDone: (id: number) => void
}) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {flies.map((fly) => (
        <motion.div
          key={fly.id}
          className="pointer-events-none fixed start-0 top-0 z-[200] flex items-center justify-center"
          style={{ translate: '-50% -50%' }}
          initial={{ x: fly.from.x, y: fly.from.y, scale: 0.4, opacity: 0, rotate: -12 }}
          animate={{
            x: fly.to.x,
            y: fly.to.y,
            scale: [0.4, 1.15, 0.55],
            opacity: [0, 1, 0.95],
            rotate: [-12, 8, 0],
          }}
          exit={{ scale: 0.2, opacity: 0 }}
          transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={() => onDone(fly.id)}
        >
          <span className="text-4xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]">{fly.emoji}</span>
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/30 blur-md"
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 0.72, ease: 'easeOut' }}
          />
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body,
  )
}

export function CartFeedbackProvider({ children }: { children: ReactNode }) {
  const cartFabRef = useRef<HTMLButtonElement>(null)
  const openCartRef = useRef<(() => void) | null>(null)
  const [flies, setFlies] = useState<FlyItem[]>([])
  const [cartBump, setCartBump] = useState(0)
  const [cartRing, setCartRing] = useState(0)

  const registerOpenCart = useCallback((fn: () => void) => {
    openCartRef.current = fn
  }, [])

  const removeFly = useCallback((id: number) => {
    setFlies((prev) => prev.filter((f) => f.id !== id))
    setCartBump((n) => n + 1)
    setCartRing((n) => n + 1)
    if (navigator.vibrate) navigator.vibrate(20)
  }, [])

  const notifyItemAdded = useCallback(
    (item: MenuItem, origin?: AddOrigin | ReactMouseEvent | ReactTouchEvent) => {
      const from = resolveAddOrigin(origin)
      const id = ++flyId

      requestAnimationFrame(() => {
        const to = getCartTarget(cartFabRef.current)
        setFlies((prev) => [...prev, { id, emoji: item.emoji, from, to }])
      })
    },
    [],
  )

  return (
    <CartFeedbackContext.Provider
      value={{ cartFabRef, cartBump, cartRing, registerOpenCart, notifyItemAdded }}
    >
      {children}
      <FlyLayer flies={flies} onDone={removeFly} />
    </CartFeedbackContext.Provider>
  )
}

export function useCartFeedback() {
  const ctx = useContext(CartFeedbackContext)
  if (!ctx) throw new Error('useCartFeedback must be used within CartFeedbackProvider')
  return ctx
}

export function useOpenCartRef() {
  const { registerOpenCart } = useCartFeedback()
  return registerOpenCart
}
