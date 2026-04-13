import { mount } from '@point0/react-dom/mount'
import App from './app.js'
import points from './lib/points.client.js'

mount(App, points)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
