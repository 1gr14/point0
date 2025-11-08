import { mount } from 'point0/core/mount.js'
import App from './app.js'

mount(App)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
