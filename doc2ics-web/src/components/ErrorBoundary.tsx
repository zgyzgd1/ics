import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
          <h2>页面出现错误</h2>
          <p className="muted">请刷新页面重试。</p>
          {this.state.error && (
            <pre style={{ fontSize: '0.75rem', overflow: 'auto', marginTop: '1rem' }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            刷新页面
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
