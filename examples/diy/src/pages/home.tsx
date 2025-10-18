import { routes } from '../lib/routes.js'
import { client } from '../lib/client.js'

export default client.route(routes.home).page(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))
