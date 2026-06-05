import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  error: Error | null
}

// Catches render errors from anywhere in the tree below it and shows a recovery UI instead of a blank screen.
// Error boundaries have to be class components — React has no hook equivalent for componentDidCatch yet.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  reset = () => {
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    if (!error) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen w-full items-center justify-center p-7">
        <div className="w-full max-w-lg space-y-4 rounded-lg border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-semibold text-red-800">Something went wrong</h1>
          <pre className="overflow-auto whitespace-pre-wrap text-sm text-red-700">{error.message}</pre>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={this.reset}
            >
              Try again
            </button>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
