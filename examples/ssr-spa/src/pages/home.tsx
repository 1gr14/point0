import { generalLayout } from '../layouts/general.js'
import { Link } from 'point0/adapters/wouter'
import { routes } from '../lib/routes.js'
import { clientCtx1, clientCtx2 } from '../lib/client-ctx.js'

export default generalLayout
  .route(routes.home)
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    const ctx1 = clientCtx1.useClientCtx()
    const ctx2 = clientCtx2.useClientCtx()
    return (
      <div>
        <h1>Welcome to IdeaNick</h1>
        <p>Test: {ctx1.test}</p>
        <p>Test: {ctx2.ideasCountX3}</p>
        <p>Discover and share innovative ideas that can change the world!</p>
        <nav>
          <Link to="/ideas">Browse Ideas</Link>
        </nav>
      </div>
    )
  })
