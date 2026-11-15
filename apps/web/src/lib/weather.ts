import type { WeatherData } from '../types'

export const ISFAHAN_CITY_CENTER = {
  lat: 32.5556,
  lon: 51.6722,
  name: 'اصفهان سیتی‌سنتر',
}

type WeatherInfo = { desc: string; icon: string }

/** WMO weather interpretation codes → Persian copy (day defaults). */
const WEATHER_MAP: Record<number, WeatherInfo> = {
  0: { desc: 'آفتابی', icon: '☀️' },
  1: { desc: 'عمدتاً صاف', icon: '🌤️' },
  2: { desc: 'نیمه‌ابری', icon: '⛅' },
  3: { desc: 'ابری', icon: '☁️' },
  45: { desc: 'مه‌آلود', icon: '🌫️' },
  48: { desc: 'مه یخ‌زده', icon: '🌫️' },
  51: { desc: 'نم‌نم باران', icon: '🌦️' },
  53: { desc: 'باران ملایم', icon: '🌧️' },
  55: { desc: 'باران شدید', icon: '🌧️' },
  56: { desc: 'باران یخ‌زده ملایم', icon: '🌧️' },
  57: { desc: 'باران یخ‌زده', icon: '🌧️' },
  61: { desc: 'باران', icon: '🌧️' },
  63: { desc: 'باران متوسط', icon: '🌧️' },
  65: { desc: 'باران شدید', icon: '⛈️' },
  66: { desc: 'باران یخ‌زده', icon: '🌧️' },
  67: { desc: 'باران یخ‌زده شدید', icon: '🌧️' },
  71: { desc: 'برف ملایم', icon: '❄️' },
  73: { desc: 'برف', icon: '❄️' },
  75: { desc: 'برف شدید', icon: '❄️' },
  77: { desc: 'دانه‌برف', icon: '❄️' },
  80: { desc: 'رگبار ملایم', icon: '🌦️' },
  81: { desc: 'رگبار', icon: '🌧️' },
  82: { desc: 'رگبار شدید', icon: '⛈️' },
  85: { desc: 'رگبار برف', icon: '🌨️' },
  86: { desc: 'رگبار برف شدید', icon: '🌨️' },
  95: { desc: 'رعدوبرق', icon: '⛈️' },
  96: { desc: 'رعدوبرق با تگرگ', icon: '⛈️' },
  99: { desc: 'رعدوبرق شدید با تگرگ', icon: '⛈️' },
}

const NIGHT_OVERRIDE: Record<number, WeatherInfo> = {
  0: { desc: 'آسمان صاف', icon: '🌙' },
  1: { desc: 'عمدتاً صاف', icon: '🌙' },
  2: { desc: 'نیمه‌ابری', icon: '☁️' },
}

export function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function getTimeLabel(hour: number): string {
  const tod = getTimeOfDay(hour)
  const labels = { morning: 'صبح', afternoon: 'ظهر', evening: 'عصر', night: 'شب' }
  return labels[tod]
}

function describeWeather(code: number, isDay: boolean): WeatherInfo {
  if (!isDay && NIGHT_OVERRIDE[code]) return NIGHT_OVERRIDE[code]
  return WEATHER_MAP[code] || { desc: 'نامشخص', icon: '🌡️' }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  location: string,
  thresholds?: { hot: number; cold: number },
): Promise<WeatherData> {
  const hotAt = thresholds?.hot ?? 28
  const coldAt = thresholds?.cold ?? 12
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${encodeURIComponent(String(lat))}` +
    `&longitude=${encodeURIComponent(String(lon))}` +
    `&current=temperature_2m,weather_code,is_day` +
    `&timezone=Asia%2FTehran`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`weather fetch failed: ${res.status}`)
  }
  const data = await res.json()
  const current = data?.current
  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('weather response missing current temperature')
  }

  const temp = current.temperature_2m as number
  const code = Number(current.weather_code ?? 0)
  const isDay = Number(current.is_day ?? 1) === 1
  const info = describeWeather(code, isDay)

  return {
    temperature: Math.round(temp),
    weatherCode: code,
    isHot: temp >= hotAt,
    isCold: temp <= coldAt,
    description: info.desc,
    icon: info.icon,
    location,
  }
}
