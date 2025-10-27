import { hydrate } from 'point0/client/hydrate.js'
import App from './app.js'
import { points } from './lib/points.js'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('ENTRY CLIENT HOT ACCEPT')
  })
}
hydrate(App, points)
