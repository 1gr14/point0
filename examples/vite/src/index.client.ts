import { mount } from 'point0/core/mount.js'
import App from './app.js'

mount(App)

if (import.meta.hot) {
  import.meta.hot.accept()
}
