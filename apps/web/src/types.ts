import type { MenuItem as SharedMenuItem, MenuModifierGroup, SelectedModifier } from '@chill-bar/shared'

export type { Category, MenuData } from '@chill-bar/shared'
export type { MenuModifierGroup, SelectedModifier }

export interface MenuItem extends SharedMenuItem {
  selectedModifiers?: SelectedModifier[]
  cartLineId?: string
  unitPrice?: number
  customConfig?: Record<string, unknown> | null
}

export interface CartItem extends MenuItem {
  quantity: number
  cartLineId: string
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type Mood = string

export interface WeatherData {
  temperature: number
  weatherCode: number
  isHot: boolean
  isCold: boolean
  description: string
  icon: string
  location: string
}

export interface ContextData {
  timeOfDay: TimeOfDay
  hour: number
  weather: WeatherData | null
  mood: Mood | null
}

export interface ScoredItem extends MenuItem {
  score: number
  reason: string
}

export interface ComboSuggestion {
  items: MenuItem[]
  total: number
  title: string
  reason: string
}
