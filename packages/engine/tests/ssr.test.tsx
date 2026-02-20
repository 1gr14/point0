// import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from './utils/internal-testing.js'

describe('ssr', () => {
  it.concurrent('page without loader', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost:3001/').ssr(true).root()
    const page = root.lets('page', 'home', '/').page(() => <div id="page">x</div>)
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page: x
      "
    `)
  })

  it.concurrent('page with loader', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost:3001/').ssr(true).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div id="page">x={data.x}</div>)
    const { fetchSsr } = await createTestThings({ points: [root, page] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page: x=1
      "
    `)
  })

  it.concurrent('page with loader and component with loader', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost:3001/').ssr(true).root()
    const component = root
      .lets('component', 'component')
      .loader(() => ({ y: 2 }))
      .component(({ data }) => <div id="component">y={data.y}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1}
      point0|root|component|component|server|finite|{}|data
      {"y":2}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        #component: y=2
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      component.component (server) < {}
      "
    `)
  })

  it.concurrent('page with loader and component with client loader', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost:3001/').ssr(true).root()
    const component = root
      .lets('component', 'component')
      .clientLoader(() => ({ y: 2 }))
      .component(({ data }) => <div id="component">y={data.y}</div>)
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        text: Loading...
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      "
    `)
  })

  it.concurrent('page with loader and component with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').baseurl('http://localhost:3001/').ssr(true).root()
    const component = root
      .lets('component', 'component')
      .loader(() => ({ z: 3 }))
      .clientLoader(({ data }) => ({ ...data, y: 2 }))
      .component(({ data }) => (
        <div id="component">
          z={data.z}, y={data.y}
        </div>
      ))
    const page = root
      .lets('page', 'home', '/')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => (
        <div id="page">
          <div id="page-content">x={data.x}</div>
          <component.X />
        </div>
      ))
    const { fetchSsr, fetchesTale } = await createTestThings({ points: [root, page, component] })
    const result = await fetchSsr(page)
    expect(result.queryClientQueriesPreview).toMatchInlineSnapshot(`
      "point0|root|page|home|server|finite|{}|data
      {"x":1}
      point0|root|component|component|server|finite|{}|data
      {"z":3}
      "
    `)
    expect(result.preview).toMatchInlineSnapshot(`
      "
      #page:
        #page-content: x=1
        text: Loading...
      "
    `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
      "
      page.home (client) (page) < {}
      page.home (server) < {}
      component.component (server) < {}
      "
    `)
  })
})
