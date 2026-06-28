import type { WeatherData } from '../types'

export const ISFAHAN_CITY_CENTER = {
  lat: 32.5556,
  lon: 51.6722,
  name: 'اصفهان سیتی‌سنتر',
}

const WEATHER_MAP: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'آفتابی', icon: '☀️' },
  1: { desc: 'نیمه‌ابری', icon: '🌤️' },
  2: { desc: 'ابری', icon: '⛅' },
  3: { desc: 'تمام‌ابری', icon: '☁️' },
  45: { desc: 'مه‌آلود', icon: '🌫️' },
  48: { desc: 'مه‌آلود', icon: '🌫️' },
  51: { desc: 'نم‌نم باران', icon: '🌦️' },
  53: { desc: 'باران ملایم', icon: '🌧️' },
  55: { desc: 'باران شدید', icon: '🌧️' },
  61: { desc: 'باران', icon: '🌧️' },
  63: { desc: 'باران متوسط', icon: '🌧️' },
  65: { desc: 'باران شدید', icon: '⛈️' },
  71: { desc: 'برف', icon: '❄️' },
  73: { desc: 'برف', icon: '❄️' },
  75: { desc: 'برف شدید', icon: '❄️' },
  80: { desc: 'رگبار', icon: '🌦️' },
  95: { desc: 'طوفان', icon: '⛈️' },
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

export async function fetchWeather(
  lat: number,
  lon: number,
  location: string,
  thresholds?: { hot: number; cold: number },
): Promise<WeatherData> {
  const hotAt = thresholds?.hot ?? 28
  const coldAt = thresholds?.cold ?? 12
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Asia%2FTehran`
  const res = await fetch(url)
  const data = await res.json()
  const temp = data.current.temperature_2m
  const code = data.current.weather_code
  const info = WEATHER_MAP[code] || { desc: 'معتدل', icon: '🌡️' }

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
