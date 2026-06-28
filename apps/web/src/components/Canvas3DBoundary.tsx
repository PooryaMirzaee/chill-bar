import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}
interface State {
  hasError: boolean
}

/**
 * Wraps a Three.js Canvas. If WebGL is unavailable or a render error occurs,
 * shows a friendly fallback instead of crashing the whole app.
 */
export class Canvas3DBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="canvas-fallback">
            <span>🍨</span>
            <p>پیش‌نمایش سه‌بعدی در این دستگاه پشتیبانی نمی‌شود</p>
          </div>
        )
      )
    }
    return this.props.children
  }
}
