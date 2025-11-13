import { mount } from 'point0/core/mount.js'
import App from './app.js'

// // @ts-expect-error - no types
// const App = (await import('../dist/client/app.js').then((m) => m.default)) as typeof import('./app.js').default

mount(App)

if (import.meta.hot) {
  import.meta.hot.accept()
}
