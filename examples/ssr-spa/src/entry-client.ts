/* eslint-disable import/first */
// IMPORTANT: Should be before any other imports
await import('./lib/global-store.js')

import { mount } from 'point0/core/mount.js'
import App from './app.js'
import { initializePoints } from './lib/points.lazy.js'

mount(App, initializePoints())

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
