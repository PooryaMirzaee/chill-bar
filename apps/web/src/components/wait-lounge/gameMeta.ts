import type { WaitGameId } from '@chill-bar/shared'

export const WAIT_GAME_META: Record<
  WaitGameId,
  { title: string; emoji: string; description: string; gradient: string; featured?: boolean }
> = {
  perfectPour: {
    title: 'ریتم چیل',
    emoji: '🎵',
    description: 'غیرفعال',
    gradient: 'from-slate-700 to-slate-800',
  },
  memoryBrew: {
    title: 'حافظه منو',
    emoji: '🧠',
    description: 'مراحل سخت‌شونده — عکس‌های منو را به خاطر بسپار',
    gradient: 'from-violet-700 via-purple-600 to-indigo-800',
    featured: true,
  },
  chillStack: {
    title: 'برج فنجان',
    emoji: '🥤',
    description: 'فنجان‌ها را روی هم بچین',
    gradient: 'from-slate-700 via-slate-600 to-zinc-800',
  },
  snakeGame: {
    title: 'مار اصفهانی',
    emoji: '🐍',
    description: 'خوراکی‌های اصفهانی جمع کن',
    gradient: 'from-emerald-700 via-green-600 to-teal-800',
  },
}
