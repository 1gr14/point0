import { hydrate } from 'point0/client/hydrate.js'
import { client } from './lib/client.js'
import { pages } from './pages/index.js'

import.meta.hot.accept()
void hydrate({ base: client, pages })
