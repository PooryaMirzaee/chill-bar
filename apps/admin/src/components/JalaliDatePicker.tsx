import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  formatJalaliDisplay,
  formatJalaliShort,
  jalaliMonthLength,
  jalaliToIsoDate,
  isoDateToJalali,
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_LABELS,
  todayJalali,
  toGregorian,
  type JalaliDate,
} from '@chill-bar/shared'

interface Props {
  value: string
  onChange: (iso: string) => void
  label?: string
  className?: string
}

function weekdayIndex(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  const dow = new Date(gy, gm - 1, gd).getDay()
  // Map Sun=0..Sat=6 → Sat=0..Fri=6
  return (dow + 1) % 7
}

export function JalaliDatePicker({ value, onChange, label = 'تاریخ', className }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = useMemo(() => (value ? isoDateToJalali(value) : todayJalali()), [value])
  const [view, setView] = useState<JalaliDate>(selected)

  useEffect(() => {
    if (open) setView(selected)
  }, [open, selected])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const daysInMonth = jalaliMonthLength(view.jy, view.jm)
  const startWeekday = weekdayIndex(view.jy, view.jm, 1)

  const prevMonth = () => {
    if (view.jm === 1) setView({ jy: view.jy - 1, jm: 12, jd: 1 })
    else setView({ jy: view.jy, jm: view.jm - 1, jd: 1 })
  }

  const nextMonth = () => {
    if (view.jm === 12) setView({ jy: view.jy + 1, jm: 1, jd: 1 })
    else setView({ jy: view.jy, jm: view.jm + 1, jd: 1 })
  }

  const pick = (jd: number) => {
    onChange(jalaliToIsoDate({ jy: view.jy, jm: view.jm, jd }))
    setOpen(false)
  }

  const goToday = () => {
    const t = todayJalali()
    onChange(jalaliToIsoDate(t))
    setOpen(false)
  }

  return (
    <div className={`jalali-picker ${className ?? ''}`} ref={rootRef}>
      {label && <span className="jalali-picker-label">{label}</span>}
      <button type="button" className="jalali-picker-trigger" onClick={() => setOpen((v) => !v)}>
        <Calendar size={16} />
        <span>{value ? formatJalaliDisplay(value) : 'انتخاب تاریخ'}</span>
        <small dir="ltr">{value ? formatJalaliShort(value) : ''}</small>
      </button>

      {open && (
        <div className="jalali-picker-pop">
          <div className="jalali-picker-nav">
            <button type="button" className="icon-btn-sm" onClick={nextMonth} aria-label="ماه بعد">
              <ChevronLeft size={16} />
            </button>
            <strong>
              {JALALI_MONTH_NAMES[view.jm - 1]} {view.jy.toLocaleString('fa-IR')}
            </strong>
            <button type="button" className="icon-btn-sm" onClick={prevMonth} aria-label="ماه قبل">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="jalali-picker-weekdays">
            {JALALI_WEEKDAY_LABELS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="jalali-picker-grid">
            {Array.from({ length: startWeekday }).map((_, i) => (
              <span key={`e-${i}`} className="jalali-day empty" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((jd) => {
              const isSelected =
                selected.jy === view.jy && selected.jm === view.jm && selected.jd === jd
              const today = todayJalali()
              const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === jd
              return (
                <button
                  key={jd}
                  type="button"
                  className={`jalali-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => pick(jd)}
                >
                  {jd.toLocaleString('fa-IR')}
                </button>
              )
            })}
          </div>

          <div className="jalali-picker-foot">
            <button type="button" className="btn-ghost btn-sm" onClick={goToday}>
              امروز
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)}>
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface MonthNavProps {
  jy: number
  jm: number
  onChange: (jy: number, jm: number) => void
}

export function JalaliMonthNav({ jy, jm, onChange }: MonthNavProps) {
  const prev = () => {
    if (jm === 1) onChange(jy - 1, 12)
    else onChange(jy, jm - 1)
  }
  const next = () => {
    if (jm === 12) onChange(jy + 1, 1)
    else onChange(jy, jm + 1)
  }
  const goCurrent = () => {
    const t = todayJalali()
    onChange(t.jy, t.jm)
  }

  return (
    <div className="jalali-month-nav">
      <button type="button" className="icon-btn-sm" onClick={next} aria-label="ماه بعد">
        <ChevronLeft size={18} />
      </button>
      <div className="jalali-month-nav-label">
        <strong>
          {JALALI_MONTH_NAMES[jm - 1]} {jy.toLocaleString('fa-IR')}
        </strong>
        <button type="button" className="btn-ghost btn-sm" onClick={goCurrent}>
          ماه جاری
        </button>
      </div>
      <button type="button" className="icon-btn-sm" onClick={prev} aria-label="ماه قبل">
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
