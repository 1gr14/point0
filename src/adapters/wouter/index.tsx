import { Route0 } from '@devp0nt/route0'
import { useEffect, useState } from 'react'
import type { LinkProps as WouterLinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'
import type { PagesCollection } from '../../eversion/runtime.js'
import { Eversion0 } from '../../eversion/runtime.js'

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

export const Router = ({
  ssrLocation,
  pages,
  Page404 = DefaultPage404,
}: {
  ssrLocation?: Route0.Location | undefined
  pages: PagesCollection
  Page404?: React.ComponentType
}): React.ReactElement => {
  const wouterRouterProps = (() => {
    if (typeof window !== 'undefined') {
      return {}
    }
    if (!ssrLocation) {
      throw new Error('ssrLocation is required on ssr')
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  })()

  return (
    <WouterRouter {...wouterRouterProps}>
      <Switch>
        {pages.map((page) => {
          const route = page.route.getDefinition()
          return (
            <Route key={route} path={route}>
              <page.pageComponent />
            </Route>
          )
        })}
        <Route path="*">
          <Page404 />
        </Route>
      </Switch>
    </WouterRouter>
  )
}

export const createRouterHelpers = <TRoutes extends Record<string, Route0.AnyRoute>>({
  routes,
}: {
  routes: TRoutes
}) => {
  const getLocation = (wouterLocation: string): Route0.Location => {
    const match = Eversion0.getRouteMatch(routes, Route0.getLocation(wouterLocation))
    if (match) {
      return match.location
    }
    return Route0.getLocation(wouterLocation)
  }

  const useLocation = () => {
    const [wouterLocation] = useWouterLocation()
    const [location, setLocation] = useState<Route0.Location>(() => {
      return getLocation(wouterLocation)
    })
    useEffect(() => {
      setLocation(getLocation(wouterLocation))
    }, [wouterLocation])
    return location
  }

  const Link = (props: WouterLinkProps) => {
    return <WouterLink {...props} />
  }

  return {
    Router,
    Link,
    useLocation,
  }
}
