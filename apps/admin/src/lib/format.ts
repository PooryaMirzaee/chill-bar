export function formatPrice(value: number): string {
  return `${value.toLocaleString('fa-IR')} تومان`
}

export function formatNumber(value: number): string {
  return value.toLocaleString('fa-IR')
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'همین الان'
  if (mins < 60) return `${mins.toLocaleString('fa-IR')} دقیقه پیش`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت پیش`
  const days = Math.floor(hours / 24)
  return `${days.toLocaleString('fa-IR')} روز پیش`
}
