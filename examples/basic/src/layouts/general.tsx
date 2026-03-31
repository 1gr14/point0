import { useIsNavigating } from '@point0/core/navigation'
import { testCookie } from '@/lib/cookies'
import { Link } from '@/lib/navigate'
import { root } from '../lib/client'
import { routes } from '../lib/routes'

export const generalLayout = root.lets('layout', 'generalLayout').layout(({ children }) => {
  const isNavigating = useIsNavigating()
  const testCookieValue = testCookie.use()
  return (
    <div style={{ opacity: isNavigating ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}>
      <h1>IdeaNick: {testCookieValue}</h1>
      <ul>
        <li>
          <Link to={routes.home()}>Home</Link>
        </li>
        <li>
          <Link to={routes.ideas()}>Browse Ideas</Link>
        </li>
        <li>
          <Link to={routes.newIdea()} prefetchOnHover="onPrefetchOnly" prefetchOnNavigate="none">
            Create Idea
          </Link>
        </li>
      </ul>
      <hr />
      {children}
    </div>
  )
})
