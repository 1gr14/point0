import { describe, expect, it } from 'bun:test'
import { ClientPage0 } from '@devp0nt/page0/client'
import type { serverPage0 } from '../server/page0.js'
import { homeRoute, ideasRoute, ideaRoute } from '../shared/routes.js'
import { clientPages } from './index.js'

describe('Client Pages', () => {
  it('should create home page with correct route', () => {
    const homePage = new ClientPage0<typeof serverPage0>().route(homeRoute).component(() => <div>Home</div>)

    expect(homePage.getRoute()).toEqual(homeRoute)
    expect(homePage.getComponent()).toBeDefined()
  })

  it('should create ideas page with loader', () => {
    const ideasPage = new ClientPage0<typeof serverPage0>()
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
    const ideaPage = new ClientPage0<typeof serverPage0>()
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

  it('should export clientPages array with all routes', () => {
    expect(clientPages).toHaveLength(3)

    const routes = clientPages.map(([route]) => route)
    expect(routes).toContain(homeRoute)
    expect(routes).toContain(ideasRoute)
    expect(routes).toContain(ideaRoute)
  })

  it('should have correct route matching for home page', async () => {
    const { clientPage0, location } = await ClientPage0._getSuitable({
      path: '/',
      clientPages,
    })

    expect(clientPage0).toBeDefined()
    expect(location.href).toBe('/')
  })

  it('should have correct route matching for ideas page', async () => {
    const { clientPage0, location } = await ClientPage0._getSuitable({
      path: '/ideas',
      clientPages,
    })

    expect(clientPage0).toBeDefined()
    expect(location.href).toBe('/ideas')
  })

  it('should have correct route matching for idea detail page', async () => {
    const { clientPage0, location } = await ClientPage0._getSuitable({
      path: '/ideas/1',
      clientPages,
    })

    expect(clientPage0).toBeDefined()
    expect(location.href).toBe('/ideas/1')
    expect(location.params).toHaveProperty('id', '1')
  })

  it('should return undefined for non-matching routes', async () => {
    const { clientPage0 } = await ClientPage0._getSuitable({
      path: '/nonexistent',
      clientPages,
    })

    expect(clientPage0).toBeUndefined()
  })
})
