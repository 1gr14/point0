import { Route0 } from '@devp0nt/route0'
import type { PagesTree } from 'point0/eversion/main.js'
import { lazy } from 'react'

export const pagesTree: PagesTree = [
  {
    route: Route0.create('/'),
    layoutPoint: async () => (await import('../layouts/general.js')).generalLayout,
    layoutComponent: lazy(async () => ({
      default: (await import('../layouts/general.js')).generalLayout._getWrappedLayoutComponent(),
    })),
    pages: [
      {
        route: Route0.create('/'),
        pagePoint: async () => (await import('../pages/home.js')).default,
        pageComponent: lazy(async () => ({
          default: (await import('../pages/home.js')).default._getWrappedPageComponent(),
        })),
      },
      {
        route: Route0.create('/ideas'),
        pagePoint: async () => (await import('../pages/ideas.js')).default,
        pageComponent: lazy(async () => ({
          default: (await import('../pages/ideas.js')).default._getWrappedPageComponent(),
        })),
      },
      {
        route: Route0.create('/ideas/new'),
        pagePoint: async () => (await import('../pages/idea-create.js')).default,
        pageComponent: lazy(async () => ({
          default: (await import('../pages/idea-create.js')).default._getWrappedPageComponent(),
        })),
      },
    ],
    nestedPagesTree: [
      {
        route: Route0.create('/ideas/:id'),
        layoutPoint: async () => (await import('../layouts/idea.js')).ideaLayout,
        layoutComponent: lazy(async () => ({
          default: (await import('../layouts/idea.js')).ideaLayout._getWrappedLayoutComponent(),
        })),
        pages: [
          {
            route: Route0.create('/ideas/:id'),
            pagePoint: async () => (await import('../pages/idea.js')).default,
            pageComponent: lazy(async () => ({
              default: (await import('../pages/idea.js')).default._getWrappedPageComponent(),
            })),
          },
          {
            route: Route0.create('/ideas/:id/news'),
            pagePoint: async () => (await import('../pages/idea-news.js')).default,
            pageComponent: lazy(async () => ({
              default: (await import('../pages/idea-news.js')).default._getWrappedPageComponent(),
            })),
          },
        ],
        nestedPagesTree: [],
      },
    ],
  },
]
