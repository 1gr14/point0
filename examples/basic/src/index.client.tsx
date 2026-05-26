import App from '@/app.client'
import points from '@/generated/point0/points.client'
import { validateClientEnv } from '@/lib/env'
import '@/styles/index.css'
import { mount } from '@point0/react-dom/mount'

validateClientEnv()
mount(<App />, points)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
