import { mount } from '@point0/react-dom'
import App from './app1.js'
import points from './lib/points1.js'

mount(App, points)

if (import.meta.hot) {
  import.meta.hot.accept()
}
