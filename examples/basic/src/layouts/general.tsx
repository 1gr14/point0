import { useIsRouterPrefetching, useOnNavigate, useOnNavigateDetailed } from '@point0/core'
import { Link } from '@/lib/navigate'
import { client } from '../lib/client'
import { routes } from '../lib/routes'
import { testCookie } from '@/lib/cookies'

export const generalLayout = client.lets('layout', 'generalLayout').layout(({ children }) => {
  const isRouterPrefetching = useIsRouterPrefetching()
  useOnNavigate(({ prevLocation, nextLocation }) => {
    // console.info('useOnNavigate start', prevLocation.hrefRel, nextLocation.hrefRel)
    return () => {
      // console.info('useOnNavigate cleanup', prevLocation.hrefRel, nextLocation.hrefRel)
    }
  })
  useOnNavigateDetailed(({ prevLocation, nextLocation, status, error }) => {
    // console.info('useOnNavigateDetailed', prevLocation.hrefRel, nextLocation.hrefRel, status, error)
  })
  const testCookieValue = testCookie.use()
  return (
    <div style={{ opacity: isRouterPrefetching ? 0.5 : 1, transition: 'opacity 0.3s ease-in-out' }}>
      <h1>IdeaNick: {testCookieValue}</h1>
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
