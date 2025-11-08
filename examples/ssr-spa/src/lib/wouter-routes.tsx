await import('point0/core/global-store.js').then(async ({ GlobalStore }) => await GlobalStore.init({}))
import React from 'react'
import { Route, Switch } from 'wouter'

const Component_unnamed_6l07mdq734 = React.lazy(async () => ({ default: (await import('../pages/home.js')).default.point._Page }))
const Component_empty_n50wzpyog6 = React.lazy(async () => ({ default: (await import('../pages/empty.js')).empty.point._Page }))
const Component_ideasPage_1ez06sxoz6e = React.lazy(async () => ({ default: (await import('../pages/ideas.js')).ideasPage.point._Page }))
const Component_unnamed_rhg2sxrtie = React.lazy(async () => ({ default: (await import('../pages/idea-create.js')).default.point._Page }))
const Component_ideaPage_hr2d3acswa = React.lazy(async () => ({ default: (await import('../pages/idea.js')).ideaPage.point._Page }))
const Component_ideasNewsPage_1molf60443b = React.lazy(async () => ({ default: (await import('../pages/idea-news.js')).ideasNewsPage.point._Page }))
const Component_generalLayout_1sm4sgw7w4h = React.lazy(async () => ({ default: (await import('../layouts/general.js')).generalLayout.point._Layout }))
const Component_ideaLayout_15r5wfdlfdu = React.lazy(async () => ({ default: (await import('../layouts/idea.js')).ideaLayout.point._Layout }))

export const WouterRoutes = ({ Page404 = () => <div>Page Not Found</div> }) => {
  return (
    <Switch>
      <Route path="/empty"><Component_empty_n50wzpyog6 /></Route>
      <Route path={new RegExp('^(/?|/ideas/?|/ideas/new/?)(?:/|$)')}>
        <Component_generalLayout_1sm4sgw7w4h>
          <Switch>
            <Route path="/"><Component_unnamed_6l07mdq734 /></Route>
            <Route path="/ideas"><Component_ideasPage_1ez06sxoz6e /></Route>
            <Route path="/ideas/new"><Component_unnamed_rhg2sxrtie /></Route>
          </Switch>
        </Component_generalLayout_1sm4sgw7w4h>
      </Route>
      <Route path={new RegExp('^()(?:/|$)')}>
        <Component_ideaLayout_15r5wfdlfdu>
          <Switch>
          <Route path={new RegExp('^(/ideas/([^/]+)/?|/ideas/([^/]+)/news/?)(?:/|$)')}>
            <Component_generalLayout_1sm4sgw7w4h>
              <Switch>
                <Route path="/ideas/:id"><Component_ideaPage_hr2d3acswa /></Route>
                <Route path="/ideas/:id/news"><Component_ideasNewsPage_1molf60443b /></Route>
              </Switch>
            </Component_generalLayout_1sm4sgw7w4h>
          </Route>
          </Switch>
        </Component_ideaLayout_15r5wfdlfdu>
      </Route>
      <Route path="*">
        <Page404 />
      </Route>
    </Switch>
  )
}
