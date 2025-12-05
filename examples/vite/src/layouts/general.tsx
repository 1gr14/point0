import { Link } from '@point0/wouter'
import { useIsRouterPrefetching } from '@point0/core/router'
import { client } from '../lib/client'
import { routes } from '../lib/routes'

export const generalLayout = client.lets('layout', 'generalLayout').layout(({ children }) => {
  const isRouterPrefetching = useIsRouterPrefetching()
  return (
    <div style={{ opacity: isRouterPrefetching ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}>
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
