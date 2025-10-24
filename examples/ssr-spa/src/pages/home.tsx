import { routes } from '../lib/routes.js'
import { client } from '../lib/client.js'
import { Link } from '../lib/router.js'

export default client
  .route(routes.home)
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => (
    <div>
      <h1>Welcome to IdeaNick</h1>
      <p>Discover and share innovative ideas that can change the world!</p>
      <nav>
        <Link to="/ideas">Browse Ideas</Link>
      </nav>
    </div>
  ))
