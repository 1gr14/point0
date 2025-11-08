import { Route0 } from '@devp0nt/route0'
import { Route, Switch } from 'wouter'

const layout_generalLayout_regex = new RegExp(
  '^(' +
    [
      Route0.from('/').getRegexBaseString(),
      Route0.from('/ideas').getRegexBaseString(),
      Route0.from('/ideas/new').getRegexBaseString(),
      Route0.from('/ideas/:id').getRegexBaseString(),
      Route0.from('/ideas/:id/news').getRegexBaseString(),
    ].join('|') +
    ')(?:/|$)',
)
const layout_ideaLayout_regex = new RegExp(
  '^(' +
    [Route0.from('/ideas/:id').getRegexBaseString(), Route0.from('/ideas/:id/news').getRegexBaseString()].join('|') +
    ')(?:/|$)',
)

const Component_unnamed_6l07mdq734 = (await import('../pages/home.js')).default.point._Page
const Component_empty_n50wzpyog6 = (await import('../pages/empty.js')).empty.point._Page
const Component_ideasPage_1ez06sxoz6e = (await import('../pages/ideas.js')).ideasPage.point._Page
const Component_unnamed_rhg2sxrtie = (await import('../pages/idea-create.js')).default.point._Page
const Component_ideaPage_hr2d3acswa = (await import('../pages/idea.js')).ideaPage.point._Page
const Component_ideasNewsPage_1molf60443b = (await import('../pages/idea-news.js')).ideasNewsPage.point._Page
const Component_generalLayout_1sm4sgw7w4h = (await import('../layouts/general.js')).generalLayout.point._Layout
const Component_ideaLayout_15r5wfdlfdu = (await import('../layouts/idea.js')).ideaLayout.point._Layout

export const WouterRoutes = ({ Page404 = () => <div>Page Not Found</div> }) => {
  return (
    <Switch>
      <Route path="/empty">
        <Component_empty_n50wzpyog6 />
      </Route>
      <Route path={layout_generalLayout_regex}>
        <Component_generalLayout_1sm4sgw7w4h>
          <Switch>
            <Route path="/">
              <Component_unnamed_6l07mdq734 />
            </Route>
            <Route path="/ideas">
              <Component_ideasPage_1ez06sxoz6e />
            </Route>
            <Route path="/ideas/new">
              <Component_unnamed_rhg2sxrtie />
            </Route>
            <Route path="/ideas/:id">
              <Component_ideaPage_hr2d3acswa />
            </Route>
            <Route path="/ideas/:id/news">
              <Component_ideasNewsPage_1molf60443b />
            </Route>
          </Switch>
        </Component_generalLayout_1sm4sgw7w4h>
      </Route>
      <Route path={layout_ideaLayout_regex}>
        <Component_ideaLayout_15r5wfdlfdu>
          <Switch>
            <Route path="/ideas/:id">
              <Component_ideaPage_hr2d3acswa />
            </Route>
            <Route path="/ideas/:id/news">
              <Component_ideasNewsPage_1molf60443b />
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
