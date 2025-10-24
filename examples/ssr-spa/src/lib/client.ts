// import { useLocation } from 'point0/adapters/wouter'
import { Point0 } from 'point0/core/index.js'
import type { server } from './server.js'

export const client = Point0.connect<typeof server>('client')
  // .setUseLocation(useLocation)
  .head({
    title: 'IdeaNick',
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  })

export type Ctx = (typeof client)['Infer']['OutputCtx']
