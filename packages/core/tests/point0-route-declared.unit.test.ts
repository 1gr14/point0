import { Point0 } from '../src/index.js'
import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'

// The lets() plumbing behind route-declared params and search: the route string is the schema, so a declared
// search param must feed the same three places `.search(schema)` feeds — the search execute actions, the
// query-key filter (`_searchSchemaKeys`), and the Infer types. End-to-end behavior (dispatch, coercion,
// query keys) lives in packages/engine/tests/route-declared.int.test.tsx and action.int.test.tsx.
describe('route-declared params and search — lets() plumbing', () => {
  const createRoot = () => Point0.lets('root', 'root').root()

  it('declared search params become search execute actions with the route searchSchema', () => {
    const root = createRoot()
    const page = root.lets('page', 'ideas', '/ideas&q&page[int]=0').page(() => null)
    const searchActions = page.point._serverExecuteActions.filter((a) => a.type === 'search')
    expect(searchActions.length).toBe(1)
    expect(searchActions[0]?.schema).toBe(page.route.searchSchema)
    // isomorphic, like .search(schema) on a page: kept on the client bundle too (private field, hence the cast)
    const clientActions = (page.point as unknown as { _clientExecuteActions: Array<{ type: string }> })
      ._clientExecuteActions
    expect(clientActions.filter((a) => a.type === 'search').length).toBe(1)
  })

  it('declared search keys fill _searchSchemaKeys — the query-key filter needs no schemaHelper', () => {
    const root = createRoot()
    const page = root.lets('page', 'ideas', '/ideas&q&page[int]=0&ids[int][]').page(() => null)
    expect(page.point._searchSchemaKeys).toEqual(['q', 'page', 'ids'])
  })

  it('a loose route (`&` tail) keeps every search key, like a schema whose keys cannot be extracted', () => {
    const root = createRoot()
    const page = root.lets('page', 'ideas', '/ideas&page[int]&').page(() => null)
    expect(page.point._searchSchemaKeys).toBe(true)
  })

  it('a route without declarations leaves _searchSchemaKeys and the actions untouched', () => {
    const root = createRoot()
    const page = root.lets('page', 'ideas', '/ideas/:id').page(() => null)
    expect(page.point._searchSchemaKeys).toBeUndefined()
    expect(page.point._serverExecuteActions.filter((a) => a.type === 'search').length).toBe(0)
  })

  it('a layout declaration flows into the page extended from it', () => {
    const root = createRoot()
    const layout = root.lets('layout', 'section', '/docs&lang(ru|en)').layout(({ children }) => children).point
    const page = layout.lets('page', 'doc', '/:slug&page[int]').page(() => null)
    expect(page.route.definition).toBe('/docs/:slug&lang(ru|en)&page[int]')
    expect(page.point._searchSchemaKeys).toEqual(['lang', 'page'])
  })

  it('an action accepts a wildcard route; a layout still rejects one', () => {
    const root = createRoot()
    expect(() => root.lets('action', 'files', 'GET', '/files/*')).not.toThrow()
    expect(() => root.lets('layout', 'files', '/files/*')).toThrow('Wildcard is not allowed in layout')
  })

  it('typed params and declared search land in the Infer types', () => {
    const root = createRoot()
    const action = root
      .lets('action', 'list', 'GET', '/api/items/:id[int]&q&page[int]=0&ids[int][]&token!')
      .action(() => new Response('ok'))
    expect(action.route.definition).toBe('/api/items/:id[int]&q&page[int]=0&ids[int][]&token!')

    expectTypeOf<typeof action.Infer.ParamsParsed>().toEqualTypeOf<{ id: number }>()
    expectTypeOf<typeof action.Infer.SearchParsed>().toEqualTypeOf<{
      page: number
      ids: number[]
      token: string
      q: string | undefined
    }>()
    expectTypeOf<typeof action.Infer.SearchRaw>().toEqualTypeOf<{
      token: string | number
      q?: string | number | undefined
      page?: number | undefined
      ids?: number[] | undefined
    }>()
  })

  it('the *RawStringOnly Infer members give the same shapes with every value in its URL-string form', () => {
    const root = createRoot()
    const action = root
      .lets('action', 'list', 'GET', '/api/items/:kind(new|top)/:id[int]&q&page[int]=0&ids[int][]&token!')
      .action(() => new Response('ok'))
    expect(action.route.definition).toBe('/api/items/:kind(new|top)/:id[int]&q&page[int]=0&ids[int][]&token!')

    // params come straight from the definition (route0's ParamsInputStringOnly): an enum keeps its literal union
    expectTypeOf<typeof action.Infer.ParamsRawStringOnly>().toEqualTypeOf<{ kind: 'new' | 'top'; id: string }>()
    // search mirrors SearchRaw key by key — arrays stay arrays, required stays required, leaves become strings
    expectTypeOf<typeof action.Infer.SearchRawStringOnly>().toEqualTypeOf<{
      token: string
      q?: string | undefined
      page?: string | undefined
      ids?: string[] | undefined
    }>()
  })

  it('*RawStringOnly stringifies a schema-shaped search too — coercing inputs and nested objects included', () => {
    const root = createRoot()
    const page = root
      .lets('page', 'ideas', '/ideas')
      .search(
        z.object({
          page: z.coerce.number().default(0),
          sort: z.enum(['new', 'top']).optional(),
          filter: z.object({ min: z.number(), tags: z.array(z.string()) }).optional(),
        }),
      )
      .page(() => null)
    expect(page.point.name).toBe('ideas')

    expectTypeOf<typeof page.Infer.SearchRawStringOnly>().toEqualTypeOf<{
      page?: string | undefined
      sort?: 'new' | 'top' | undefined
      filter?: { min: string; tags: string[] } | undefined
    }>()
  })
})
