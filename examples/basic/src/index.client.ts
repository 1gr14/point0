import { mount } from '@point0/react-dom'
import App from './app.js'
import points from './lib/points.lazy.js'

mount(App, points)

if (import.meta.hot) {
  import.meta.hot.accept()
}
