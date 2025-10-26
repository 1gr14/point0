import { Route0 } from '@devp0nt/route0'
import { Fragment, useEffect, useState } from 'react'
import type { LinkProps as WouterLinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'
import type { LayoutsTree, PagesCollection } from '../../eversion/runtime.js'
import { Eversion0 } from '../../eversion/runtime.js'

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

// TODO: add to Link match result, so we can use current, active, aprent, exact, etc
// TODO: make router provide in global context all its helpers and we will get it from main router package

const anchorWithSplat = (anchor: string) => {
  const base = anchor.replace(/\/$/, '')
  return base === '' ? '/*' : `${base}/*?`
}

export const RenderLayoutTree = ({ nodes, Page404 }: { nodes: LayoutsTree; Page404: React.ComponentType }) => {
  return (
    <Switch>
      {nodes.map((node) => {
        // Bucket for pages without any layout
        if (!node.layoutComponent) {
          return (
            <Fragment key={`nolayout-${node.route}`}>
              {node.pages.map(({ route, pageComponent: Page }) => {
                return (
                  <Route key={route} path={route}>
                    <Page />
                  </Route>
                )
              })}

              {/* Child layouts (they emit their own <Route> wrappers) */}
              <RenderLayoutTree nodes={node.layouts} Page404={Page404} />
            </Fragment>
          )
        }

        const Layout = node.layoutComponent
        return (
          <Route key={node.route} path={anchorWithSplat(node.route)}>
            <Layout>
              <Switch>
                {/* Pages directly under this layout */}
                {node.pages.map(({ route, pageComponent: Page }) => {
                  return (
                    <Route key={route} path={route}>
                      <Page />
                    </Route>
                  )
                })}

                {/* Nested layout branches (each produces its own <Route path="child/*">) */}
                <RenderLayoutTree nodes={node.layouts} Page404={Page404} />
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

  const layoutsTree = Eversion0.toLayoutsTree({ pages })

  return (
    <WouterRouter {...wouterRouterProps}>
      <RenderLayoutTree nodes={layoutsTree} Page404={Page404} />
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
