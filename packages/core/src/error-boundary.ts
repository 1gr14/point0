import * as React from 'react'

type ErrorBoundary0Props = {
  /**
   * Renders the caught error — the point builds this closure with its bound ErrorComponent and the redirect
   * passthrough, so the boundary itself stays generic and dependency-free.
   */
  renderError: (error: Error) => React.ReactNode
  /**
   * When this key changes (the location on navigation), a caught error is dropped and children render again — otherwise
   * an error rendered on one page would stick to the boundary until the whole subtree remounts.
   */
  resetKey?: string | undefined
  children?: React.ReactNode
}

type ErrorBoundary0State = {
  error: Error | undefined
  resetKey: string | undefined
}

/**
 * The error boundary every mountable render is wrapped in (see `_MountableWithBoundaries` and the `errorComponent`
 * mount action in point0.ts). A throw inside a mountable's chain — a render error, a suspense hook throwing its query
 * error, or a server-side streamed loader that failed after the shell was sent — renders that mountable's
 * ErrorComponent in place, and the rest of the page stays alive. Only errors outside every boundary still fall back to
 * the bare-index.html SPA path.
 */
export class ErrorBoundary0 extends React.Component<ErrorBoundary0Props, ErrorBoundary0State> {
  constructor(props: ErrorBoundary0Props) {
    super(props)
    this.state = { error: undefined, resetKey: props.resetKey }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundary0State> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: ErrorBoundary0Props,
    state: ErrorBoundary0State,
  ): Partial<ErrorBoundary0State> | null {
    if (props.resetKey !== state.resetKey) {
      return { resetKey: props.resetKey, error: undefined }
    }
    return null
  }

  override render(): React.ReactNode {
    if (this.state.error !== undefined) {
      return this.props.renderError(this.state.error)
    }
    return this.props.children
  }
}
