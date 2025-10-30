import { Point0 } from 'point0/core/index.js'
import type { server } from './server.js'

export const client = Point0.connect<typeof server>('client')
  .sourceBaseUrl('http://localhost:3000')
  .head({
    title: 'Loading...',
    titleTemplate: '%s | IdeaNick',
    htmlAttrs: { lang: 'en' },
  })
  .base()

export type Ctx = (typeof client)['Infer']['Ctx']
