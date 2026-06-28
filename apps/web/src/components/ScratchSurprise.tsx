import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { MenuItem } from '../types'
import { formatPrice } from '../lib/comboBuilder'

interface ScratchCopy {
  title: string
  subtitle: string
  canvasHint: string
}

interface Props {
  rewardPool: MenuItem[]
  rewardPrice: number
  copy: ScratchCopy
  onReward: (item: MenuItem) => void
}

export function ScratchSurprise({ rewardPool, rewardPrice, copy, onReward }: Props) {
  const [revealed, setRevealed] = useState(false)
  const [prize, setPrize] = useState<MenuItem | null>(null)
  const [scratchPct, setScratchPct] = useState(0)
  const [claimed, setClaimed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scratching = useRef(false)

  const pool = rewardPool.length > 0 ? rewardPool : []

  const pickPrize = () => {
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const initScratch = () => {
    const winner = pickPrize()
    if (!winner) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setPrize(winner)
    setRevealed(false)
    setClaimed(false)
    setScratchPct(0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#2a2a35'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#888'
    ctx.font = 'bold 14px Vazirmatn'
    ctx.textAlign = 'center'
    ctx.fillText(copy.canvasHint, canvas.width / 2, canvas.height / 2)
  }

  const scratch = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas || revealed) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    let x: number, y: number
    if ('touches' in e) {
      x = (e.touches[0].clientX - rect.left) * scaleX
      y = (e.touches[0].clientY - rect.top) * scaleY
    } else {
      x = (e.clientX - rect.left) * scaleX
      y = (e.clientY - rect.top) * scaleY
    }
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, 20, 0, Math.PI * 2)
    ctx.fill()

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let transparent = 0
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++
    }
    const pct = (transparent / (canvas.width * canvas.height)) * 100
    setScratchPct(pct)
    if (pct > 40 && prize && !claimed) {
      setRevealed(true)
      setClaimed(true)
      onReward(prize)
    }
  }

  useEffect(() => {
    const t = setTimeout(initScratch, 100)
    return () => clearTimeout(t)
  }, [rewardPool])

  if (pool.length === 0) {
    return (
      <section className="section scratch-surprise">
        <div className="section-header">
          <h2>🎫 {copy.title}</h2>
          <p>جایزه‌ای در پنل ادمین تنظیم نشده است.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section scratch-surprise">
      <div className="section-header">
        <h2>🎫 {copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className="scratch-card">
        <div className="scratch-prize">
          {prize ? (
            <>
              <span className="scratch-prize-emoji">{prize.emoji}</span>
              <h4>{prize.name}</h4>
              <p>
                {rewardPrice <= 0 ? 'رایگان با ثبت سفارش' : formatPrice(rewardPrice)}
              </p>
            </>
          ) : (
            <p>برای شروع بزن «کارت جدید»</p>
          )}
        </div>
        <canvas
          ref={canvasRef}
          className="scratch-canvas"
          width={280}
          height={120}
          onMouseDown={() => {
            scratching.current = true
          }}
          onMouseUp={() => {
            scratching.current = false
          }}
          onMouseMove={(e) => scratching.current && scratch(e)}
          onTouchStart={() => {
            scratching.current = true
          }}
          onTouchEnd={() => {
            scratching.current = false
          }}
          onTouchMove={scratch}
        />
        {revealed && prize && (
          <motion.div className="scratch-revealed" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            🎉 {prize.name} — در مرحله تکمیل سفارش اضافه می‌شود
          </motion.div>
        )}
      </div>

      <button className="btn-secondary" onClick={initScratch} style={{ margin: '12px auto', display: 'block' }}>
        کارت جدید
      </button>
      {scratchPct > 0 && scratchPct < 40 && (
        <p className="scratch-progress">{Math.round(scratchPct)}٪ خراشیده شد</p>
      )}
    </section>
  )
}
