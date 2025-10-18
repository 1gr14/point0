import { ClientPoint0 } from 'point0/client'
import type { serverPoint0 } from '../server/point0.js'
import { homeRoute } from '../shared/routes.js'

export const homePage = new ClientPoint0<typeof serverPoint0>().route(homeRoute).component(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))
