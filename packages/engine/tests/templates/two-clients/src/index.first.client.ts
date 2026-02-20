import { mount } from '@point0/react-dom'
import App from './app.first.js'
import points from './lib/points.first.client.js'

mount(App, points)

if (import.meta.hot) {
  import.meta.hot.accept()
}
