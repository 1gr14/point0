import { ClientPage0 } from '@devp0nt/page0/client'
import type { serverPage0 } from '../server/page0.js'
import { homeRoute } from '../shared/routes.js'

export const homePage = new ClientPage0<typeof serverPage0>().route(homeRoute).component(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))
