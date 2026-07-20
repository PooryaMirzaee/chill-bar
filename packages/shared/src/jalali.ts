/** Lightweight Jalali (Persian) calendar helpers — no external deps. */

export interface JalaliDate {
  jy: number
  jm: number
  jd: number
}

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const

const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const

export const JALALI_MONTH_NAMES = JALALI_MONTHS
export const JALALI_WEEKDAY_LABELS = WEEKDAYS

function div(a: number, b: number) {
  return Math.trunc(a / b)
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  gy -= gy <= 1600 ? 621 : 1600
  const gy2 = gm > 2 ? gy + 1 : gy
  let days =
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    gd +
    g_d_m[gm - 1]!
  jy += 33 * div(days, 12053)
  days %= 12053
  jy += 4 * div(days, 1461)
  days %= 1461
  if (days > 365) {
    jy += div(days - 1, 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return { jy, jm, jd }
}

export function toGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let gy = jy <= 979 ? 621 : 1600
  jy -= jy <= 979 ? 0 : 979
  const days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * div(days, 146097)
  let rem = days % 146097
  if (rem >= 36525) {
    rem--
    gy += 100 * div(rem, 36524)
    rem %= 36524
    if (rem >= 365) rem++
  }
  gy += 4 * div(rem, 1461)
  rem %= 1461
  if (rem >= 366) {
    rem--
    gy += div(rem, 365)
    rem %= 365
  }
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm = 0
  let gd = rem
  for (gm = 1; gm <= 12 && gd >= sal_a[gm]!; gm++) gd -= sal_a[gm]!
  return { gy, gm, gd: gd + 1 }
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  const { gy, gm, gd } = toGregorian(jy, 12, 30)
  const check = toJalali(gy, gm, gd)
  return check.jm === 12 && check.jd === 30 ? 30 : 29
}

/** YYYY-MM-DD in local calendar sense from a Date (Tehran-friendly via date parts). */
export function dateToIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isoDateToJalali(iso: string): JalaliDate {
  const [y, m, d] = iso.split('-').map(Number)
  return toJalali(y!, m!, d!)
}

export function jalaliToIsoDate({ jy, jm, jd }: JalaliDate): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`
}

export function todayIsoDate(): string {
  return dateToIsoDate(new Date())
}

export function todayJalali(): JalaliDate {
  return isoDateToJalali(todayIsoDate())
}

export function formatJalaliDisplay(iso: string, withWeekday = false): string {
  const { jy, jm, jd } = isoDateToJalali(iso)
  const base = `${jd.toLocaleString('fa-IR')} ${JALALI_MONTHS[jm - 1]} ${jy.toLocaleString('fa-IR')}`
  if (!withWeekday) return base
  const { gy, gm, gd } = toGregorian(jy, jm, jd)
  const dow = new Date(gy, gm - 1, gd).getDay()
  // JS: 0=Sun … convert to Jalali week starting Saturday
  const map = [1, 2, 3, 4, 5, 6, 0] as const
  const label = WEEKDAYS[map[dow]!]!
  return `${label} ${base}`
}

export function formatJalaliShort(iso: string): string {
  const { jy, jm, jd } = isoDateToJalali(iso)
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`
}

/** First / last day of Jalali month as ISO dates. */
export function jalaliMonthRange(jy: number, jm: number): { from: string; to: string } {
  const from = jalaliToIsoDate({ jy, jm, jd: 1 })
  const to = jalaliToIsoDate({ jy, jm, jd: jalaliMonthLength(jy, jm) })
  return { from, to }
}

export function parseIsoDateParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number)
  return { y: y!, m: m!, d: d! }
}

/** Start of day UTC-ish for DB query from ISO date string (local noon-safe). */
export function isoDateToUtcStart(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

export function isoDateToUtcEnd(iso: string): Date {
  return new Date(`${iso}T23:59:59.999Z`)
}
