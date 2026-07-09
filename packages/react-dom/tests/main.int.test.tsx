import { Point0, setStatus } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'

describe('page', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

  it('conflicted routes', async () => {
    const root = createRoot()
    const page1 = root.lets('page', 'home1', '/x/:id').page(() => <div id="page">x=nothing</div>)
    const page2 = root.lets('page', 'home2', '/x/:sn').page(() => <div id="page">x=nothing</div>)
    await expect(createTestThings({ ssr: true, points: [root, page1, page2] })).rejects.toThrow()
  })

  it('not found by default route Page404', async () => {
    const root = createRoot()
    const layout = root.lets('layout', 'layout').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = layout.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to client points
    const { render, fetchesTale, fetchSsr } = await createTestThings({ ssr: true, points: [root, layout, page] })
    await render('/not-found', async ({ waitContent, tale }) => {
      // we see this message becouse of default 404 error page component in Router which can be customized
      await waitContent('Page Not Found')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    Page Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                Page Not Found
                "
              `)
  })

  it('not found by provided Page404', async () => {
    const root = createRoot()
    const Page404 = () => <div id="my-404">Not Found</div>
    const layout = root.lets('layout', 'layout').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = root.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to client points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout, page],
      Page404,
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      await waitContent('#my-404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #my-404: Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #my-404: Not Found
                "
              `)
  })

  it('not found by provided Page404 and layout name', async () => {
    const root = createRoot()
    const Page404 = () => <div id="my-404">Not Found</div>
    const layout = root.lets('layout', 'layout').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = layout.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to client points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout, page],
      Page404,
      layout404: 'layout',
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      await waitContent('#my-404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #layout:
                      #my-404: Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #layout:
                  #my-404: Not Found
                "
              `)
  })

  it('not found by provided Page404 and layout point', async () => {
    const root = createRoot()
    const Page404 = () => <div id="my-404">Not Found</div>
    const layout = root.lets('layout', 'layout').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = layout.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to client points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout, page],
      Page404,
      layout404: layout,
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      await waitContent('#my-404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #layout:
                      #my-404: Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #layout:
                  #my-404: Not Found
                "
              `)
  })

  it('not found by provided Page404 and many layout names', async () => {
    const root = createRoot()
    const Page404 = () => <div id="my-404">Not Found</div>
    const layout1 = root.lets('layout', 'layout1').layout(({ children }) => <div id="layout1">{children}</div>)
    const layout2 = root.lets('layout', 'layout2').layout(({ children }) => <div id="layout2">{children}</div>)
    const page = layout2.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = layout2.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to layout2 points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout1, layout2, page],
      Page404,
      layout404: ['layout1', 'layout2'],
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      await waitContent('#my-404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #layout1:
                      #layout2:
                        #my-404: Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #layout1:
                  #layout2:
                    #my-404: Not Found
                "
              `)
  })

  it('not found by provided Page404 and many layout names and points', async () => {
    const root = createRoot()
    const Page404 = () => <div id="my-404">Not Found</div>
    const layout1 = root.lets('layout', 'layout1').layout(({ children }) => <div id="layout1">{children}</div>)
    const layout2 = root.lets('layout', 'layout2').layout(({ children }) => <div id="layout2">{children}</div>)
    const page = layout2.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const pageNotFound = layout2.lets('page', 'not-done', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to layout2 points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout1, layout2, page],
      Page404,
      layout404: ['layout1', layout2],
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      await waitContent('#my-404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #layout1:
                      #layout2:
                        #my-404: Not Found
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNotFound)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #layout1:
                  #layout2:
                    #my-404: Not Found
                "
              `)
  })

  it('not found by asterisk route', async () => {
    const root = createRoot()
    const layout = root.lets('layout', 'layout').layout(({ children }) => <div id="layout">{children}</div>)
    const page = layout.lets('page', 'home', '/').page(() => <div id="page">x=nothing</div>)
    const page404 = layout.lets('page', '404', '*').page(() => {
      setStatus(404)
      return <div id="404">404</div>
    })
    const pageNever = layout.lets('page', 'never', '/never').page(() => <div id="never">never</div>)
    // we do not pass it to client points
    const { render, fetchesTale, fetchSsr } = await createTestThings({
      ssr: true,
      points: [root, layout, page, page404],
    })
    await render('/', async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /
                    #layout:
                      #page: x=nothing
                  "
                `)
    })
    await render('/not-found', async ({ waitContent, tale }) => {
      // we see this message becouse of default 404 error page component in Router which can be customized
      await waitContent('#404')
      expect(await tale()).toMatchInlineSnapshot(`
                  "
                  /not-found
                    #layout:
                      #404: 404
                  "
                `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
                "
        
                "
              `)
    const { response, preview } = await fetchSsr(pageNever)
    expect(response.status).toBe(404)
    expect(preview).toMatchInlineSnapshot(`
                "
                #layout:
                  #404: 404
                "
              `)
  })
})
