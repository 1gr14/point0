import { Route } from 'wouter'
import { Eversion0, type PointsCollection } from '../../eversion/runtime.js'

const DefaultPage404 = () => {
  return <div>Page Not Found</div>
}

export const Routes = ({
  points,
  Page404 = DefaultPage404,
}: {
  points: PointsCollection
  Page404?: React.ComponentType
}) => {
  const pages = Eversion0.toClientPagesCollection(points)
  return (
    <>
      {pages.map((page) => (
        <Route key={page.routeDefinition} path={page.routeDefinition}>
          <page.pageComponent />
        </Route>
      ))}
      <Route path="*">
        <Page404 />
      </Route>
    </>
  )
}
