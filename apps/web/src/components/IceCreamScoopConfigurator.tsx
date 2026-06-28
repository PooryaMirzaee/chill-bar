import { Suspense, useCallback, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import type { MenuItem } from '../types'
import {
  SCOOP_FLAVORS, type ScoopFlavor, type BowlSize,
  MAX_SCOOPS,
  calcScoopPrice, scoopBuildName, nextDistinctFlavor,
} from '../data/scoopBuilder'
import { formatPrice } from '../lib/comboBuilder'
import { ScoopScene, ScoopSceneLights } from './IceCreamScoopScene'
import { Canvas3DBoundary } from './Canvas3DBoundary'

interface Props {
  onOrder: (item: MenuItem) => void
}

export function IceCreamScoopConfigurator({ onOrder }: Props) {
  const [bowlSize, setBowlSize] = useState<BowlSize>('M')
  const [scoopCount, setScoopCount] = useState(2)
  const [flavors, setFlavors] = useState<ScoopFlavor[]>(() =>
    SCOOP_FLAVORS.slice(0, 6),
  )
  const [cherry, setCherry] = useState(false)
  const [activeScoop, setActiveScoop] = useState(0)

  const maxScoops = MAX_SCOOPS[bowlSize]

  const setFlavorAt = useCallback((idx: number, flavor: ScoopFlavor) => {
    setFlavors((prev) => {
      const next = [...prev]
      next[idx] = flavor
      return next
    })
    setActiveScoop(idx)
  }, [])

  const addScoop = () => {
    if (scoopCount >= maxScoops) return
    const used = flavors.slice(0, scoopCount)
    setFlavors((prev) => {
      const next = [...prev]
      next[scoopCount] = nextDistinctFlavor(used)
      return next
    })
    setScoopCount((c) => c + 1)
    setActiveScoop(scoopCount)
  }

  const removeScoop = () => {
    if (scoopCount <= 1) return
    setScoopCount((c) => c - 1)
    if (activeScoop >= scoopCount - 1) setActiveScoop(scoopCount - 2)
  }

  const handleBowlChange = (size: BowlSize) => {
    setBowlSize(size)
    if (scoopCount > MAX_SCOOPS[size]) setScoopCount(MAX_SCOOPS[size])
  }

  const activeFlavors = flavors.slice(0, scoopCount)
  const price = calcScoopPrice(scoopCount, activeFlavors)
  const uniqueCount = new Set(activeFlavors.map((f) => f.id)).size

  const handleOrder = () => {
    const names = activeFlavors.map((f) => f.name).join(' · ')
    onOrder({
      id: `scoop-${Date.now()}`,
      name: scoopBuildName(scoopCount, bowlSize),
      price,
      category: 'icecream',
      categoryName: 'کاسه بستنی',
      emoji: '🍨',
      tags: { sweet: 1, cold: 0.95 },
      description: `کاسه ${bowlSize} | ${names}${cherry ? ' | 🍒 گیلاس' : ''}`,
    })
  }

  return (
    <section className="scoop-builder">
      <div className="scoop-hero">
        <span className="scoop-badge">کاسه بستنی سفارشی</span>
        <h3>طعم‌های مختلف رو توی کاسه بچین!</h3>
        <p>اسکوپ اضافه کن، هر کدوم طعم مخصوص خودش — روی اسکوپ بزن و انتخاب کن</p>
      </div>

      <div className="scoop-canvas-wrap">
        <Canvas3DBoundary>
          <Canvas
            camera={{ position: [0, 0.8, 2.6], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            shadows
            dpr={[1, 2]}
          >
            <color attach="background" args={['transparent']} />
            <ScoopSceneLights />
            <Suspense fallback={null}>
              <ScoopScene
                bowlSize={bowlSize}
                scoopCount={scoopCount}
                flavors={flavors}
                cherry={cherry}
                activeScoop={activeScoop}
                onScoopClick={setActiveScoop}
              />
            </Suspense>
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI / 5}
              maxPolarAngle={Math.PI / 2.1}
              minAzimuthAngle={-Math.PI / 2.2}
              maxAzimuthAngle={Math.PI / 2.2}
            />
          </Canvas>
        </Canvas3DBoundary>
      </div>

      <div className="scoop-controls">
        <div className="scoop-control-row">
          <label>اندازه کاسه</label>
          <div className="scoop-toggle-group">
            {(['M', 'L'] as BowlSize[]).map((s) => (
              <button
                key={s}
                className={`scoop-toggle ${bowlSize === s ? 'active' : ''}`}
                onClick={() => handleBowlChange(s)}
              >
                {s === 'M' ? 'معمولی (۳ اسکوپ)' : 'بزرگ (۶ اسکوپ)'}
              </button>
            ))}
          </div>
        </div>

        <div className="scoop-control-row">
          <label>تعداد اسکوپ در کاسه: {scoopCount}</label>
          <div className="scoop-stepper">
            <button onClick={removeScoop} disabled={scoopCount <= 1}>−</button>
            <span>{scoopCount}</span>
            <button onClick={addScoop} disabled={scoopCount >= maxScoops}>+</button>
          </div>
        </div>

        <label className="scoop-cherry">
          <input type="checkbox" checked={cherry} onChange={(e) => setCherry(e.target.checked)} />
          <span>🍒 گیلاس روی کاسه</span>
        </label>
      </div>

      <div className="scoop-flavors">
        <h4>چیدمان اسکوپ‌ها ({uniqueCount} طعم متفاوت)</h4>
        <div className="scoop-flavor-chips">
          {activeFlavors.map((f, i) => (
            <button
              key={i}
              className={`scoop-flavor-chip ${activeScoop === i ? 'active' : ''}`}
              onClick={() => setActiveScoop(i)}
            >
              <span className="scoop-chip-num">{i + 1}</span>
              <span>{f.emoji}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="scoop-palette">
        <h4>طعم اسکوپ {activeScoop + 1} رو انتخاب کن</h4>
        <div className="scoop-palette-grid">
          {SCOOP_FLAVORS.map((f) => (
            <button
              key={f.id}
              className={`scoop-palette-item ${flavors[activeScoop]?.id === f.id ? 'selected' : ''}`}
              onClick={() => setFlavorAt(activeScoop, f)}
            >
              <span>{f.emoji}</span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className="scoop-order-bar"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="scoop-order-info">
          <span>{scoopBuildName(scoopCount, bowlSize)}</span>
          <strong>{formatPrice(price)}</strong>
        </div>
        <button className="btn-scoop-order" onClick={handleOrder}>
          🍨 سفارش کاسه بستنی
        </button>
      </motion.div>
    </section>
  )
}
