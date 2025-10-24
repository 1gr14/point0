import { hydrate } from 'point0/client/hydrate.js'
import App from './app.js'

import.meta.hot.accept()
void hydrate(App)
