import { hydrate } from 'point0/client/hydrate.js'
import { client } from '../lib/client.js'
import { pages } from '../pages/index.js'
import wrapper from '../layouts/app.js'

import.meta.hot.accept()
void hydrate({ base: client, pages, wrapper })
