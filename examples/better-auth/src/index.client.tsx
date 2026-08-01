// Client env first, before every other import: in dev this module rewrites SERVER_URL to CLIENT_URL, and the env
// getters cache on first read — `@/lib/root` reads `sharedEnv.SERVER_URL` at module scope, so the rewrite has to run
// before that module loads.
import { clientEnv } from '@/lib/env/client'

import App from '@/app.client'
import points from '@/generated/point0/points.client'
import '@/styles/index.css'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

// The env handle is lazy — validate the whole client shape up front so a misconfigured build fails fast.
clientEnv.validate()

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
