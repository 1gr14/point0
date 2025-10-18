import { homeRoute } from '../lib/routes.js'
import { point0 } from '../lib/point0.js'

export default point0.route(homeRoute).page(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))
