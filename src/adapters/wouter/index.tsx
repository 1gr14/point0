import { Route0 } from '@devp0nt/route0'
import { useEffect, useState } from 'react'
import { Route, Switch, useLocation as useWouterLocation, Router as WouterRouter } from 'wouter'
import { Eversion0, type PointsCollection } from '../../eversion/runtime.js'

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

export const Router = ({
  location,
  points,
  Page404 = DefaultPage404,
}: {
  location?: Route0.Location | undefined
  points: PointsCollection
  Page404?: React.ComponentType
}) => {
  const pages = Eversion0.toClientPagesCollection(points)

  const wouterRouterProps = (() => {
    if (typeof window !== 'undefined') {
      return {}
    }
    if (!location) {
      throw new Error('location is required on server side')
    }
    return { ssrPath: location.pathname, ssrSearch: location.search }
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

  return {
    Router,
    useLocation,
  }
}
