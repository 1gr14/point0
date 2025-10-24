import { hydrate } from 'point0/client/hydrate.js'
import App from './app.js'
import { points } from './lib/points.js'

import.meta.hot.accept()
hydrate({ App, points })
