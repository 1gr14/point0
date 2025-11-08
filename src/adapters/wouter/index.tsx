import type { AnyLocation, AnyRoute } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import React, { Fragment, useCallback, useMemo } from 'react'
import type { LinkProps } from 'wouter'
import { Route, Switch, useLocation as useWouterLocation, Link as WouterLink, Router as WouterRouter } from 'wouter'
import { SuperStore } from '../../core/super-store.js'
import type {
  LazyPointsModule,
  LazyRoutedPointsCollection,
  PagesTree,
  PagesTreeSource,
  ReadyPointsModule,
  ReadyRoutedPointsCollection,
} from '../../core/points.js'
import { Points } from '../../core/points.js'
import type { RouterPolicy, RouterStatus, UseAdapterLocationFn } from '../../core/router.js'
import { _wrapUseNavigate, RouterContextProvider } from '../../core/router.js'

// TODO: add to Link match result, so we can use current, active, aprent, exact, etc

const _useNavigate = () => {
  const [, navigate] = useWouterLocation()
  // TODO: allow pass router policy in useNavigate and in Link
  return navigate
}
export const useNavigate = _wrapUseNavigate(_useNavigate)

export const Link = (props: LinkProps) => {
  const { to, href, onClick, replace, ...rest } = props
  const navigate = useNavigate()
  const finalHref = to || href
  return (
    <WouterLink
      {...rest}
      href={href as never}
      to={to}
      replace={replace}
      onClick={(e) => {
        if (finalHref) {
          if (e.metaKey || e.ctrlKey) return
          e.preventDefault()
          void navigate(finalHref, { replace })
          onClick?.(e)
        }
      }}
    />
  )
}

export const Router = ({
  ssrLocation = SuperStore.get('ssrLocation'),
  policy,
  status,
  children,
}: {
  ssrLocation?: AnyLocation | undefined
  policy?: RouterPolicy
  status?: RouterStatus
  children: React.ReactNode
}): React.ReactElement => {
  const wouterRouterProps = useMemo(() => {
    if (process.env.IS_CLIENT) {
      return {}
    }
    if (!ssrLocation) {
      throw new Error(`ssrLocation is required on ssr, process.env.IS_CLIENT: ${process.env.IS_CLIENT}`)
    }
    return { ssrPath: ssrLocation.pathname, ssrSearch: ssrLocation.search }
  }, [ssrLocation])

  const useAdapterLocation: UseAdapterLocationFn = useCallback(() => {
    const [wouterLocation] = useWouterLocation()
    return Route0.getLocation(wouterLocation)
  }, [])

  return (
    <WouterRouter {...wouterRouterProps}>
      <RouterContextProvider
        useAdapterLocation={useAdapterLocation}
        ssrLocation={ssrLocation}
        policy={policy}
        status={status}
      >
        {children}
      </RouterContextProvider>
    </WouterRouter>
  )
}

// Do not use it if you want nice HMR. Use generated WouterRoutes instead.
export const DynmicWouterRoutes = ({
  Page404 = () => <div>Page Not Found</div>,
  points,
}: {
  Page404?: React.ComponentType
  points: LazyPointsModule | ReadyPointsModule
}): React.ReactElement => {
  return <RenderPagesTree points={points} Page404={Page404} />
}

const combinePagesRoutesToRegexForLayout = (routes: AnyRoute[]) => {
  const compiled = routes.map((r) => r.getRegexBaseString())
  const pattern = `^(${compiled.join('|')})(?:/|$)`
  return new RegExp(pattern)
}

export const RenderPagesTree = ({
  pagesTree,
  pagesTreeSource,
  points,
  Page404,
  level = 0,
}: {
  pagesTree?: PagesTree
  pagesTreeSource?: PagesTreeSource
  points: LazyPointsModule | ReadyPointsModule | LazyRoutedPointsCollection | ReadyRoutedPointsCollection
  Page404: React.ComponentType
  level?: number
}) => {
  points = Points.toRoutedPointsCollection(points)
  pagesTreeSource ??= Points.toPagesTreeSource({ points })
  pagesTree ??= Points.toPagesTree({ points, pagesTreeSource: [] })
  return (
    <Switch>
      {pagesTree.map((node) => {
        if (node.Layout) {
          const Layout = node.Layout
          const layoutPagesRoutes = node.pages.map((p) => p.pageRoute)
          const layoutPagesRoutesRegex = combinePagesRoutesToRegexForLayout(layoutPagesRoutes)
          return (
            <Route key={`layout-${node.layoutName}`} path={layoutPagesRoutesRegex}>
              <Layout>
                <Switch>
                  {node.pages.map(({ pageRoute, Page }) => {
                    return (
                      <Route key={pageRoute.getDefinition()} path={pageRoute.getDefinition()}>
                        <Page />
                      </Route>
                    )
                  })}
                  {node.nested && (
                    <RenderPagesTree
                      points={points}
                      pagesTree={node.nested}
                      pagesTreeSource={pagesTreeSource}
                      Page404={Page404}
                      level={level + 1}
                    />
                  )}
                </Switch>
              </Layout>
            </Route>
          )
        }

        return (
          <Fragment key={`nolayout-${node.layoutName}`}>
            {node.pages.map(({ pageRoute, Page }) => {
              return (
                <Route key={pageRoute.getDefinition()} path={pageRoute.getDefinition()}>
                  <Page />
                </Route>
              )
            })}

            {node.nested && (
              <RenderPagesTree
                points={points}
                pagesTree={node.nested}
                pagesTreeSource={pagesTreeSource}
                Page404={Page404}
                level={level + 1}
              />
            )}
          </Fragment>
        )
      })}

      <Route path="*">
        <Page404 />
      </Route>
    </Switch>
  )
}
