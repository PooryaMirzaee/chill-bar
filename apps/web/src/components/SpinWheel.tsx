import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SpinCampaignSettings, SpinDrawResult, SpinPrize } from '@chill-bar/shared'
import {
  activeSpinPrizes,
  isCampaignActiveOn,
  normalizeIranMobile,
  tehranDayKey,
} from '@chill-bar/shared'
import { Button } from '@/components/ui/button'
import { resolveAssetUrl } from '@/lib/branding'
import {
  playClaimSuccess,
  playSpinLose,
  playSpinStart,
  playSpinTick,
  playSpinWin,
  playUiTap,
  unlockSpinAudio,
} from '@/lib/spinSounds'

interface Props {
  campaign: SpinCampaignSettings
  logoUrl?: string | null
}

type Phase = 'idle' | 'spinning' | 'won' | 'claiming' | 'claimed' | 'blocked'

const STORAGE_PREFIX = 'chillbar.spin.v1'
const SPIN_MS = 8200

function deviceKey(): string {
  const key = 'chillbar.deviceKey'
  let v = localStorage.getItem(key)
  if (!v) {
    v = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(key, v)
  }
  return v
}

function spinStorageKey(day: string) {
  return `${STORAGE_PREFIX}.${day}`
}

function readLocalSpins(day: string): number {
  try {
    const raw = localStorage.getItem(spinStorageKey(day))
    if (!raw) return 0
    return Number((JSON.parse(raw) as { count?: number }).count) || 0
  } catch {
    return 0
  }
}

function bumpLocalSpins(day: string) {
  localStorage.setItem(
    spinStorageKey(day),
    JSON.stringify({ count: readLocalSpins(day) + 1, at: Date.now(), deviceKey: deviceKey() }),
  )
}

/** The CDN replaces API 4xx bodies with HTML, so fall back to a status-based message. */
async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (data.error) return data.error
  } catch {
    /* non-JSON body */
  }
  return fallback
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, end)
  const e = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} Z`
}

function formatPhoneAsYouType(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

/** Largest icon diameter that stays inside an annular wedge at `ringR`. */
function iconSizeForWedge(r: number, segmentAngle: number, ringR: number, hubR: number) {
  const halfRad = (segmentAngle * Math.PI) / 360
  // Angular clearance at the icon center (half-chord)
  const byAngle = 2 * ringR * Math.sin(halfRad) * 0.58
  // Keep clear of hub and outer rim
  const byRadial = Math.min(r - ringR, ringR - hubR) * 1.05
  return Math.max(18, Math.min(byAngle, byRadial, r * 0.24))
}

export function SpinWheel({ campaign, logoUrl }: Props) {
  const prizes = useMemo(() => activeSpinPrizes(campaign), [campaign])
  const size = Math.max(300, Math.min(campaign.wheelSize || 360, 420))
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 6
  const hubR = size * 0.145
  // Sit icons in the middle of the annulus so they clear hub + rim
  const ringR = (hubR + r) * 0.55
  const soundOn = campaign.soundEnabled !== false
  const showLabels = campaign.showSliceLabels === true

  const [rotation, setRotation] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [winner, setWinner] = useState<SpinPrize | null>(null)
  const [drawId, setDrawId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [claimCode, setClaimCode] = useState<string | null>(null)
  const [claimMessage, setClaimMessage] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [canSpin, setCanSpin] = useState(true)
  const [burst, setBurst] = useState(false)
  const tickTimer = useRef<number | null>(null)

  const segmentAngle = prizes.length ? 360 / prizes.length : 360
  const campaignStatus = isCampaignActiveOn(campaign)
  const day = tehranDayKey()
  const iconSize = iconSizeForWedge(r, segmentAngle, ringR, hubR)

  useEffect(() => {
    if (campaignStatus !== 'active') {
      setCanSpin(false)
      setStatusMsg(
        campaignStatus === 'ended'
          ? campaign.endedMessage
          : campaignStatus === 'not_started'
            ? campaign.notStartedMessage
            : 'گردونه فعلاً غیرفعال است',
      )
      setPhase('blocked')
      return
    }
    if (readLocalSpins(day) >= campaign.spinsPerDay) {
      setCanSpin(false)
      setStatusMsg(campaign.alreadySpunMessage)
      setPhase('blocked')
    }
  }, [campaign, campaignStatus, day])

  useEffect(
    () => () => {
      if (tickTimer.current) window.clearTimeout(tickTimer.current)
    },
    [],
  )

  const segments = useMemo(
    () =>
      prizes.map((prize, i) => {
        const start = i * segmentAngle
        const end = start + segmentAngle
        const mid = start + segmentAngle / 2
        const iconPos = polar(cx, cy, ringR, mid)
        return {
          prize,
          start,
          end,
          mid,
          iconPos,
          imageSrc: resolveAssetUrl(prize.imageUrl),
        }
      }),
    [prizes, segmentAngle, cx, cy, ringR],
  )

  const stopTicks = () => {
    if (tickTimer.current) {
      window.clearTimeout(tickTimer.current)
      tickTimer.current = null
    }
  }

  const startTicks = () => {
    stopTicks()
    if (!soundOn) return
    let interval = 48
    const schedule = () => {
      playSpinTick(Math.min(1.4, 1000 / interval))
      interval = Math.min(200, interval * 1.05)
      tickTimer.current = window.setTimeout(schedule, interval)
    }
    tickTimer.current = window.setTimeout(schedule, 30)
  }

  const spin = useCallback(async () => {
    if (phase === 'spinning' || !canSpin || prizes.length === 0) return
    unlockSpinAudio()
    if (soundOn) playUiTap()

    setPhase('spinning')
    setWinner(null)
    setDrawId(null)
    setClaimCode(null)
    setClaimMessage(null)
    setPhoneError(null)
    setStatusMsg(null)
    setBurst(false)

    let draw: SpinDrawResult
    try {
      const res = await fetch('/api/spin/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceKey: deviceKey() }),
      })
      if (!res.ok) {
        const fallback =
          res.status === 429
            ? campaign.alreadySpunMessage
            : res.status === 403
              ? 'گردونه فعلاً در دسترس نیست'
              : 'خطا در چرخش — دوباره تلاش کنید'
        setStatusMsg(await readApiError(res, fallback))
        if (res.status === 429 || res.status === 403) {
          setCanSpin(false)
          setPhase('blocked')
        } else {
          setPhase('idle')
        }
        return
      }
      const data = (await res.json()) as Partial<SpinDrawResult>
      if (!data.drawId || !data.prizeId) {
        setStatusMsg('خطا در چرخش — دوباره تلاش کنید')
        setPhase('idle')
        return
      }
      draw = { drawId: data.drawId, prizeId: data.prizeId }
    } catch {
      setStatusMsg('ارتباط برقرار نشد — دوباره تلاش کنید')
      setPhase('idle')
      return
    }

    const winIdx = prizes.findIndex((p) => p.id === draw.prizeId)
    if (winIdx < 0) {
      setStatusMsg('گردونه به‌روز شده — صفحه را دوباره باز کنید')
      setPhase('idle')
      return
    }
    const picked = prizes[winIdx]
    setDrawId(draw.drawId)
    if (soundOn) playSpinStart()
    startTicks()

    const segmentCenter = winIdx * segmentAngle + segmentAngle / 2
    const jitter = (Math.random() - 0.5) * segmentAngle * 0.28
    const targetMod = (360 - segmentCenter + jitter + 360) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta <= 0) delta += 360
    setRotation(rotation + 11 * 360 + delta)

    window.setTimeout(() => {
      stopTicks()
      setWinner(picked)
      setPhase('won')
      setBurst(true)
      bumpLocalSpins(day)
      setCanSpin(false)
      if (soundOn) {
        if (picked.type === 'TRY_AGAIN') playSpinLose()
        else playSpinWin()
      }
      if (navigator.vibrate) navigator.vibrate([18, 30, 18, 40, 40])
    }, SPIN_MS)
  }, [phase, canSpin, prizes, segmentAngle, rotation, day, soundOn, campaign.alreadySpunMessage])

  const claim = async () => {
    if (!winner || !drawId) return
    unlockSpinAudio()
    const normalized = normalizeIranMobile(phone)
    if (!normalized) {
      setPhoneError('شماره موبایل ایرانی معتبر نیست — مثال: ۰۹۱۲۳۴۵۶۷۸۹')
      return
    }
    setPhoneError(null)
    setPhase('claiming')
    try {
      const res = await fetch('/api/spin/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawId,
          phone: normalized,
          deviceKey: deviceKey(),
        }),
      })
      if (!res.ok) {
        const fallback =
          res.status === 429
            ? campaign.alreadySpunMessage
            : res.status === 400
              ? 'شماره موبایل ایرانی معتبر نیست — مثال: ۰۹۱۲۳۴۵۶۷۸۹'
              : res.status === 409
                ? 'جایزه این چرخش قبلاً ثبت شده یا موجودی تمام شده'
                : 'خطا در صدور کد'
        setPhoneError(await readApiError(res, fallback))
        setPhase('won')
        return
      }
      const data = (await res.json()) as { code?: string | null; message?: string }
      setClaimCode(data.code ?? null)
      setClaimMessage(data.message ?? null)
      setPhase('claimed')
      setStatusMsg(campaign.alreadySpunMessage)
      if (soundOn) playClaimSuccess()
    } catch {
      setPhoneError('ارتباط برقرار نشد — دوباره تلاش کنید')
      setPhase('won')
    }
  }

  if (prizes.length === 0) {
    return (
      <section className="campaign-spin campaign-spin--solo campaign-spin--empty">
        <p>جایزه‌ای برای گردونه تعریف نشده.</p>
      </section>
    )
  }

  return (
    <section className="campaign-spin campaign-spin--solo">
      <div className="campaign-spin__glow" aria-hidden />

      <header className="campaign-spin__hero">
        <span className="campaign-spin__badge">{campaign.heroBadge}</span>
        <h1 className="campaign-spin__title font-display">{campaign.campaignTitle}</h1>
        <p className="campaign-spin__subtitle">{campaign.campaignSubtitle}</p>
      </header>

      <div className="campaign-spin__arena">
        <motion.div
          className="campaign-spin__pointer"
          animate={
            phase === 'spinning'
              ? { y: [0, -5, 0], rotate: [0, -7, 5, 0] }
              : { y: [0, -2, 0] }
          }
          transition={
            phase === 'spinning'
              ? { duration: 0.26, repeat: Infinity }
              : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
          }
          aria-hidden
        >
          <svg width="40" height="48" viewBox="0 0 40 48">
            <defs>
              <linearGradient id="chillPinFix" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFD2B8" />
                <stop offset="50%" stopColor="#F26522" />
                <stop offset="100%" stopColor="#9C2E06" />
              </linearGradient>
            </defs>
            <path d="M20 48 L2 8 Q20 -2 38 8 Z" fill="url(#chillPinFix)" />
            <circle cx="20" cy="12" r="5.5" fill="#FFF8F0" />
            <circle cx="20" cy="12" r="2.4" fill="#F26522" />
          </svg>
        </motion.div>

        <div
          className={`campaign-spin__rim ${phase === 'spinning' ? 'is-spinning' : ''}`}
          style={{ width: size + 18, height: size + 18 }}
        >
          <motion.div
            className="campaign-spin__disk"
            style={{ width: size, height: size }}
            animate={{ rotate: rotation }}
            transition={{ duration: SPIN_MS / 1000, ease: [0.12, 0.72, 0.05, 1] }}
          >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <defs>
                {segments.map((seg) => (
                  <clipPath key={`clip-${seg.prize.id}`} id={`spin-clip-${seg.prize.id}`} clipPathUnits="userSpaceOnUse">
                    <path d={arcPath(cx, cy, r, seg.start, seg.end)} />
                  </clipPath>
                ))}
                {segments.map((seg) => (
                  <clipPath key={`icon-${seg.prize.id}`} id={`spin-icon-${seg.prize.id}`} clipPathUnits="userSpaceOnUse">
                    <circle cx={seg.iconPos.x} cy={seg.iconPos.y} r={iconSize / 2 - 0.5} />
                  </clipPath>
                ))}
              </defs>

              <circle cx={cx} cy={cy} r={r} fill="#1A1411" />

              {segments.map((seg) => (
                <g key={seg.prize.id}>
                  <path
                    d={arcPath(cx, cy, r, seg.start, seg.end)}
                    fill={seg.prize.color}
                    stroke="rgba(255,248,240,0.35)"
                    strokeWidth="1.25"
                  />
                  {seg.imageSrc && (
                    <g clipPath={`url(#spin-clip-${seg.prize.id})`}>
                      <g clipPath={`url(#spin-icon-${seg.prize.id})`}>
                        <image
                          href={seg.imageSrc}
                          x={seg.iconPos.x - iconSize / 2}
                          y={seg.iconPos.y - iconSize / 2}
                          width={iconSize}
                          height={iconSize}
                          preserveAspectRatio="xMidYMid meet"
                          transform={`rotate(${seg.mid}, ${seg.iconPos.x}, ${seg.iconPos.y})`}
                        />
                      </g>
                    </g>
                  )}
                  {showLabels && (
                    <text
                      x={seg.iconPos.x}
                      y={seg.iconPos.y + (seg.imageSrc ? iconSize * 0.55 : 0)}
                      fill={seg.prize.textColor}
                      fontSize={Math.max(9, size * 0.028)}
                      fontWeight="700"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${seg.mid}, ${seg.iconPos.x}, ${seg.iconPos.y})`}
                    >
                      {seg.prize.label.length > 9
                        ? `${seg.prize.label.slice(0, 8)}…`
                        : seg.prize.label}
                    </text>
                  )}
                </g>
              ))}

              <circle cx={cx} cy={cy} r={hubR} fill="#FFFCF9" />
            </svg>
          </motion.div>

          <div className="campaign-spin__hub">
            {logoUrl ? (
              <img src={logoUrl} alt="Chill Bar" className="campaign-spin__hub-logo" />
            ) : (
              <span className="campaign-spin__hub-fallback font-display">چیل</span>
            )}
          </div>
        </div>

        <Button
          className="campaign-spin__cta"
          size="lg"
          disabled={!canSpin || phase === 'spinning' || phase === 'blocked'}
          onClick={() => void spin()}
        >
          <span className="campaign-spin__cta-pulse" aria-hidden />
          {phase === 'spinning' ? 'داره می‌چرخه…' : campaign.ctaLabel}
        </Button>

        {statusMsg && (phase === 'blocked' || phase === 'idle') && !claimCode && (
          <p className="campaign-spin__status">{statusMsg}</p>
        )}
      </div>

      <a
        className="campaign-spin__powered"
        href="https://upfood.ir"
        target="_blank"
        rel="noopener noreferrer"
      >
        powered by <strong>upfood</strong>
      </a>

      <AnimatePresence>
        {(phase === 'won' || phase === 'claiming' || phase === 'claimed') && winner && (
          <motion.div
            className="campaign-spin__modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {burst && campaign.showConfetti && winner.type !== 'TRY_AGAIN' && (
              <div className="campaign-spin__confetti" aria-hidden>
                {Array.from({ length: 28 }).map((_, i) => (
                  <i
                    key={i}
                    style={{
                      ['--i' as string]: i,
                      ['--x' as string]: `${(i * 37) % 100}%`,
                      ['--c' as string]: ['#F26522', '#FFD2B8', '#2C2420', '#FF8C4D'][i % 4],
                    }}
                  />
                ))}
              </div>
            )}
            <motion.div
              className="campaign-spin__sheet"
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            >
              <div className="campaign-spin__win-emoji">
                {resolveAssetUrl(winner.imageUrl) ? (
                  <img
                    src={resolveAssetUrl(winner.imageUrl)!}
                    alt=""
                    className="campaign-spin__win-thumb"
                  />
                ) : (
                  winner.emoji
                )}
              </div>
              <p className="campaign-spin__win-kicker">
                {winner.type === 'TRY_AGAIN' ? 'این بار نشد' : 'برنده شدی!'}
              </p>
              <h2 className="font-display campaign-spin__win-title">{winner.label}</h2>
              {winner.description && (
                <p className="campaign-spin__win-desc">{winner.description}</p>
              )}

              {phase === 'claimed' ? (
                <div className="campaign-spin__claim-block">
                  {claimCode ? (
                    <>
                      <p className="campaign-spin__code-label">کد صندوق شما</p>
                      <div className="campaign-spin__code" dir="ltr">
                        {claimCode}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          playUiTap()
                          void navigator.clipboard?.writeText(claimCode)
                        }}
                      >
                        کپی کد
                      </Button>
                      <div className="campaign-spin__venue">
                        <strong>{campaign.venueGuideTitle}</strong>
                        <p>{campaign.venueGuideBody}</p>
                      </div>
                    </>
                  ) : (
                    <p className="campaign-spin__hint">{claimMessage}</p>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => {
                      playUiTap()
                      setPhase('blocked')
                    }}
                  >
                    فهمیدم
                  </Button>
                </div>
              ) : winner.type === 'TRY_AGAIN' ? (
                <div className="campaign-spin__claim-block">
                  <p className="campaign-spin__hint">
                    {winner.description || 'فردا دوباره شانس داری'}
                  </p>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      playUiTap()
                      setPhase('claiming')
                      try {
                        await fetch('/api/spin/claim', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            drawId,
                            phone: '',
                            deviceKey: deviceKey(),
                          }),
                        })
                      } catch {
                        /* ignore */
                      }
                      setPhase('blocked')
                      setStatusMsg(campaign.alreadySpunMessage)
                    }}
                  >
                    باشه
                  </Button>
                </div>
              ) : (
                <div className="campaign-spin__claim-block">
                  <p className="campaign-spin__phone-title">{campaign.phonePromptTitle}</p>
                  <p className="campaign-spin__hint">{campaign.phonePromptBody}</p>
                  <label className="campaign-spin__phone-label">
                    شماره موبایل ایرانی
                    <input
                      className="campaign-spin__phone"
                      dir="ltr"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={campaign.phonePlaceholder}
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatPhoneAsYouType(e.target.value))
                        setPhoneError(null)
                      }}
                    />
                  </label>
                  {phoneError && <p className="campaign-spin__error">{phoneError}</p>}
                  <Button
                    className="w-full"
                    disabled={phase === 'claiming'}
                    onClick={() => void claim()}
                  >
                    {phase === 'claiming' ? 'در حال صدور…' : campaign.claimButtonLabel}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
