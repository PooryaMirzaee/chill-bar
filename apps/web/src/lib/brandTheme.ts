import type { TimeOfDay } from '../types'

export const BRAND = {
  orange: '#F26522',
  orangeLight: '#FF8C4D',
  orangeDark: '#D94E10',
  black: '#0A0A0A',
  navy: '#1B2838',
  neonPink: '#FF2D7B',
  white: '#FAFAFA',
  gold: '#E8A87C',
} as const

export function getTimeThemeClass(timeOfDay: TimeOfDay): string {
  return `app--${timeOfDay}`
}
