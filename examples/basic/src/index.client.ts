import { mount } from '@point0/react-dom'
import App from './app.js'
import * as points from './lib/points.lazy.js'

mount(App, points)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
