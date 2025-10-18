import { describe, expect, it } from 'bun:test'
import { ClientPoint0 } from 'point0/client'
import type { serverPoint0 } from '../server/point0.js'
import { homeRoute, ideasRoute, ideaRoute } from '../shared/routes.js'
import { pages } from './index.js'

describe('Client Pages', () => {
  it('should create home page with correct route', () => {
    const homePage = new ClientPoint0<typeof serverPoint0>().route(homeRoute).component(() => <div>Home</div>)

    expect(homePage.getRoute()).toEqual(homeRoute)
    expect(homePage.getComponent()).toBeDefined()
  })

  it('should create ideas page with loader', () => {
    const ideasPage = new ClientPoint0<typeof serverPoint0>()
      .route(ideasRoute)
      .loader(async ({ ctx }) => {
        const ideas = await ctx.prisma.idea.findMany()
        return { ideas }
      })
      .component(() => <div>Ideas</div>)

    expect(ideasPage.getRoute()).toEqual(ideasRoute)
    expect(ideasPage.getComponent()).toBeDefined()
    expect(ideasPage.getExtendFns()).toHaveLength(1)
    expect(ideasPage.getExtendFns()[0].type).toBe('loader')
  })

  it('should create idea detail page with route params', () => {
    const ideaPage = new ClientPoint0<typeof serverPoint0>()
      .route(ideaRoute)
      .loader(async ({ ctx, location }) => {
        const idea = await ctx.prisma.idea.findUniqueOrThrow({
          where: { id: parseInt(location.params.id) },
        })
        return { idea }
      })
      .component(() => <div>Idea</div>)

    expect(ideaPage.getRoute()).toEqual(ideaRoute)
    expect(ideaPage.getComponent()).toBeDefined()
    expect(ideaPage.getExtendFns()).toHaveLength(1)
    expect(ideaPage.getExtendFns()[0].type).toBe('loader')
  })

  it('should export pages array with all routes', () => {
    expect(pages).toHaveLength(3)

    const routes = pages.map(([route]) => route)
    expect(routes).toContain(homeRoute)
    expect(routes).toContain(ideasRoute)
    expect(routes).toContain(ideaRoute)
  })

  it('should have correct route matching for home page', async () => {
    const { clientPoint0, location } = await ClientPoint0._getSuitable({
      path: '/',
      pages,
    })

    expect(clientPoint0).toBeDefined()
    expect(location.href).toBe('/')
  })

  it('should have correct route matching for ideas page', async () => {
    const { clientPoint0, location } = await ClientPoint0._getSuitable({
      path: '/ideas',
      pages,
    })

    expect(clientPoint0).toBeDefined()
    expect(location.href).toBe('/ideas')
  })

  it('should have correct route matching for idea detail page', async () => {
    const { clientPoint0, location } = await ClientPoint0._getSuitable({
      path: '/ideas/1',
      pages,
    })

    expect(clientPoint0).toBeDefined()
    expect(location.href).toBe('/ideas/1')
    expect(location.params).toHaveProperty('id', '1')
  })

  it('should return undefined for non-matching routes', async () => {
    const { clientPoint0 } = await ClientPoint0._getSuitable({
      path: '/nonexistent',
      pages,
    })

    expect(clientPoint0).toBeUndefined()
  })
})
