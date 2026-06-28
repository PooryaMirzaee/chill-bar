import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <span className="text-5xl">🍨</span>
          <h2 className="text-xl font-bold">مشکلی پیش آمد</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            صفحه را دوباره بارگذاری کنید. سفارش‌های ثبت‌شده محفوظ هستند.
          </p>
          <Button size="lg" onClick={() => window.location.reload()}>
            بارگذاری مجدد
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
