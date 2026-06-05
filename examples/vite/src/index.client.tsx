// Validate client env before mounting so a misconfigured build fails fast.
import '@/lib/env/client'

import App from '@/app.client'
import points from '@/generated/point0/points.client'
import '@/styles/index.css'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

mount(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  points,
)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
