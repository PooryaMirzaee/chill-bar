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
      className="text-start"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums">{timeStr}</span>
        <span className="text-[10px] font-medium text-primary">{getTimeLabel(hour)}</span>
      </div>
      {weather && (
        <div className="mt-0.5 text-start">
          <span className="text-[10px] font-medium text-muted-foreground">{weather.location}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{weather.icon}</span>
            <span className="font-semibold text-foreground">{weather.temperature}°</span>
            <span className="hidden sm:inline">{weather.description}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
