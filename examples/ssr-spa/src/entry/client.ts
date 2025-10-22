import { hydrate } from 'point0/client/hydrate.js'
import { client } from '../lib/client.js'
import { pages } from '../pages/index.js'

// TODO: move entry to src, becouse it log path relative

import.meta.hot.accept()
void hydrate({ base: client, pages })
