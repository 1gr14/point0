import { client } from '../lib/client'
import { Link } from 'point0/adapters/wouter'
import { routes } from '../lib/routes'
import { useIsRouterFetching } from 'point0/eversion/router'

export const generalLayout = client.route(routes.home).layout(({ children }) => {
  const isRouterFetching = useIsRouterFetching()
  return (
    <div style={{ opacity: isRouterFetching ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}>
      <h1>IdeaNick</h1>
      <ul>
        <li>
          <Link to={routes.home()}>Home</Link>
        </li>
        <li>
          <Link to={routes.ideas()}>Browse Ideas</Link>
        </li>
        <li>
          <Link to={routes.newIdea()}>Create Idea</Link>
        </li>
      </ul>
      <hr />
      {children}
    </div>
  )
})
