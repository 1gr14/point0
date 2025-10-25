import { generalLayout } from '../layouts/general.js'
import { Link } from '../lib/router.js'
import { routes } from '../lib/routes.js'

export default generalLayout
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
