import { hydrate } from 'point0/core/hydrate.js'
import App from './app.js'
import { client } from './lib/client.js'
import { points } from './lib/points.lazy.js'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (import.meta.hot) {
  import.meta.hot.accept()
}
hydrate({ App, points, root: client })
