import { Link } from '@/lib/navigate'
import { useIsNavigating } from '@point0/core'
import { client } from '../lib/client'
import { routes } from '../lib/routes'

export const generalLayout = client.lets('layout', 'generalLayout').layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return (
    <div style={{ opacity: isNavigating ? 0.5 : 1, transition: 'opacity 300ms ease' }}>
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
