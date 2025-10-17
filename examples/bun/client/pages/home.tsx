import { homeRoute } from '../lib/routes.js'
import { page0 } from '../lib/page0.js'

export default page0.route(homeRoute).render(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <div>33123123123</div>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))
