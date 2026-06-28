import { motion } from 'framer-motion'
import { resolveAssetUrl } from '../lib/branding'

interface Props {
  storeName: string
  logoUrl?: string | null
  splashUrl?: string | null
  brandEmoji?: string
  tapStart: string
  tapOrder: string
  onDismiss: () => void
}

export function KioskScreensaver({
  storeName,
  logoUrl,
  splashUrl,
  brandEmoji = '🍦',
  tapStart,
  tapOrder,
  onDismiss,
}: Props) {
  const splash = resolveAssetUrl(splashUrl ?? logoUrl)

  return (
    <motion.div
      className="kiosk-screensaver"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      style={
        splash
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.75)), url(${splash})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <div className="kiosk-screensaver-bg" />
      <motion.div
        className="kiosk-screensaver-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.div
          className="kiosk-ss-logo"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="kiosk-ss-logo-img" />
          ) : (
            brandEmoji
          )}
        </motion.div>
        <h1>{storeName}</h1>
        <p>{tapOrder}</p>
        <motion.div
          className="kiosk-ss-pulse"
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {tapStart}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
