import { mount } from '@point0/react-dom'
import App from './app.second.js'
import points from './lib/points.second.client.js'

mount(App, points)

if (import.meta.hot) {
  import.meta.hot.accept()
}
