import { Route0 } from '@devp0nt/route0'
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { LinkProps as WouterLinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'
import type { PagesTree, RoutesCollection } from '../../eversion/main.js'
import { Eversion0 } from '../../eversion/main.js'
import type { UseAdapterLocationFn, UseAdapterNavigate, UseLocationFn } from '../../eversion/router.js'
import { RouterContextProvider } from '../../eversion/router.js'

// TODO: add to Link match result, so we can use current, active, aprent, exact, etc
// TODO: make router provide in global context all its helpers and we will get it from main router package

export const Router = ({
  ssrLocation,
  pagesTree,
  routes,
  Page404 = DefaultPage404,
}: {
  ssrLocation?: Route0.Location | undefined
  pagesTree: PagesTree
  routes: RoutesCollection
  Page404?: React.ComponentType
}): React.ReactElement => {
  const wouterRouterProps = useMemo(() => {
    if (typeof window !== 'undefined') {
      return {}
    }
    if (!ssrLocation) {
      throw new Error('ssrLocation is required on ssr')
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  }, [ssrLocation])

  const useLocation = useCallback(
    (() => {
      const [wouterLocation] = useWouterLocation()
      const match = Eversion0.getRouteMatch(routes, Route0.getLocation(wouterLocation))
      if (match) {
        return match.location
      }
      return Route0.getLocation(wouterLocation)
    }) as UseAdapterLocationFn,
    [routes],
  )

  const useNavigate: UseAdapterNavigate = useCallback(() => {
    const [, navigate] = useWouterLocation()
    return navigate
  }, [])

  return (
    <RouterContextProvider pagesTree={pagesTree} useAdapterLocation={useLocation} useAdapterNavigate={useNavigate}>
      <WouterRouter {...wouterRouterProps}>
        <RenderPagesTree nodes={pagesTree} Page404={Page404} />
      </WouterRouter>
    </RouterContextProvider>
  )
}

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

const compileRouteToRegex = (route: Route0.AnyRoute) => {
  return route
    .getDefinition()
    .replace(/\/+$/, '') // remove trailing slash
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape regex special chars
    .replace(/:(\w+)/g, '([^/]+)') // replace :param with capture group
}
// Combine multiple route definitions into a single regex
const combineRoutesToRegex = (routes: Route0.AnyRoute[]) => {
  const compiled = routes.map((r) => compileRouteToRegex(r))
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}
export const RenderPagesTree = ({ nodes, Page404 }: { nodes: PagesTree; Page404: React.ComponentType }) => {
  return (
    <Switch>
      {nodes.map((node) => {
        // Layout-less pages
        if (!node.layoutComponent) {
          return (
            <Fragment key={`nolayout-${node.route.getDefinition()}`}>
              {node.pages.map(({ route, pageComponent: Page }) => {
                return (
                  <Route key={route.getDefinition()} path={route.getDefinition()}>
                    <Page />
                  </Route>
                )
              })}

              <RenderPagesTree nodes={node.nestedPagesTree} Page404={Page404} />
            </Fragment>
          )
        }

        // Layout with pages — combine all its page routes into a single regex
        const Layout = node.layoutComponent
        const layoutPagesRoutes = node.pages.map((p) => p.route)
        const layoutPagesRoutesRegex = combineRoutesToRegex(layoutPagesRoutes)
        return (
          <Route key={`layout-${node.route.getDefinition()}`} path={layoutPagesRoutesRegex}>
            <Layout>
              <Switch>
                {node.pages.map(({ route, pageComponent: Page }) => {
                  return (
                    <Route key={route.getDefinition()} path={route.getDefinition()}>
                      <Page />
                    </Route>
                  )
                })}

                <RenderPagesTree nodes={node.nestedPagesTree} Page404={Page404} />
              </Switch>
            </Layout>
          </Route>
        )
      })}

      <Route path="*">
        <Page404 />
      </Route>
    </Switch>
  )
}

export const Router = ({
  ssrLocation,
  pagesTree,
  Page404 = DefaultPage404,
}: {
  ssrLocation?: Route0.Location | undefined
  pagesTree: PagesTree
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
      <RenderPagesTree nodes={pagesTree} Page404={Page404} />
    </WouterRouter>
  )
}

// TODO: not routes, but pages, becouse it is unify
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
