import { mount } from '@point0/react-dom'
import App from './app.js'
import points from './lib/points.lazy.js'

mount(App, points)

// oxlint-disable-next-line typescript/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
