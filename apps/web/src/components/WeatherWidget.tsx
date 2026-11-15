import { motion } from 'framer-motion'
import type { WeatherData } from '../types'
import { getTimeLabel } from '../lib/weather'

interface Props {
  weather: WeatherData | null
  hour: number
}

export function WeatherWidget({ weather, hour }: Props) {
  const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      className="atelier-weather"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="atelier-weather__time">{timeStr}</span>
        <span className="atelier-weather__slot">{getTimeLabel(hour)}</span>
      </div>
      {weather && (
        <div className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
          <span aria-hidden>{weather.icon}</span>
          <span className="font-semibold text-foreground">{weather.temperature}°</span>
          <span className="hidden max-w-[7rem] truncate sm:inline">{weather.description}</span>
        </div>
      )}
    </motion.div>
  )
}
