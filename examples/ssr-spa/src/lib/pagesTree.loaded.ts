import { Route0 } from '@devp0nt/route0'
import type { PagesTree } from 'point0/eversion/main.js'

export const pagesTree: PagesTree = [
  {
    route: Route0.create('/'),
    layoutPoint: (await import('../layouts/general.js')).generalLayout,
    layoutComponent: (await import('../layouts/general.js')).generalLayout._getWrappedLayoutComponent(),
    pages: [
      {
        route: Route0.create('/'),
        pagePoint: (await import('../pages/home.js')).default,
        pageComponent: (await import('../pages/home.js')).default._getWrappedPageComponent(),
      },
      {
        route: Route0.create('/ideas'),
        pagePoint: (await import('../pages/ideas.js')).default,
        pageComponent: (await import('../pages/ideas.js')).default._getWrappedPageComponent(),
      },
      {
        route: Route0.create('/ideas/new'),
        pagePoint: (await import('../pages/idea-create.js')).default,
        pageComponent: (await import('../pages/idea-create.js')).default._getWrappedPageComponent(),
      },
    ],
    nestedPagesTree: [
      {
        route: Route0.create('/ideas/:id'),
        layoutPoint: (await import('../layouts/idea.js')).ideaLayout,
        layoutComponent: (await import('../layouts/idea.js')).ideaLayout._getWrappedLayoutComponent(),
        pages: [
          {
            route: Route0.create('/ideas/:id'),
            pagePoint: (await import('../pages/idea.js')).default,
            pageComponent: (await import('../pages/idea.js')).default._getWrappedPageComponent(),
          },
          {
            route: Route0.create('/ideas/:id/news'),
            pagePoint: (await import('../pages/idea-news.js')).default,
            pageComponent: (await import('../pages/idea-news.js')).default._getWrappedPageComponent(),
          },
        ],
        nestedPagesTree: [],
      },
    ],
  },
]
