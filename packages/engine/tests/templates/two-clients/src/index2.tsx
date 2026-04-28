import { mount } from '@point0/react-dom/mount'
import App from './app2.js'
import points from './lib/points2.js'

mount(<App />, points)

if (import.meta.hot) {
  import.meta.hot.accept()
}
