import { describe, expect, it } from 'bun:test'
import type { AnalyzerMetaPoint } from '../src/analyzer.js'
import { Analyzer } from '../src/analyzer.js'
import { Route0 } from '@devp0nt/route0'

const makePoint = (partial: Partial<AnalyzerMetaPoint>): AnalyzerMetaPoint =>
  ({
    scope: 'app',
    type: 'page',
    name: 'home',
    id: 'point.home',
    route: Route0.create('/'),
    endpoint: undefined,
    pos: { file: '/tmp/home.tsx' } as AnalyzerMetaPoint['pos'],
    import: undefined,
    valid: true,
    errors: [],
    ssr: false,
    parents: [],
    layouts: [],
    ...partial,
  }) as AnalyzerMetaPoint

describe('Analyzer', () => {
  it('filters points by id collections and paginates results', () => {
    const analyzer = Analyzer.create({
      engine: {
        file: '/tmp/engine.ts',
        import: async () => ({}) as never,
        server: undefined,
        clients: undefined,
      },
      points: [
        makePoint({ id: 'point.home', name: 'home' }),
        makePoint({ id: 'point.about', name: 'about' }),
        makePoint({ id: 'point.api', type: 'query', route: undefined, name: 'api' }),
      ],
    })

    const result = analyzer.listPoints({
      filter: { ids: ['point.home', 'point.api'] },
      limit: 1,
      offset: 0,
    })

    expect(result.total).toBe(2)
    expect(result.hasMore).toBe(true)
    expect(result.nextOffset).toBe(1)
    expect(result.points).toHaveLength(1)
    expect(result.points[0]?.id).toBe('point.home')
  })

  it('supports url, endpoint url, parent and layout filters', () => {
    const analyzer = Analyzer.create({
      engine: {
        file: '/tmp/engine.ts',
        import: async () => ({}) as never,
        server: undefined,
        clients: undefined,
      },
      points: [
        makePoint({
          id: 'point.page',
          route: Route0.create('/page'),
          parents: [{ id: 'root', name: 'root', scope: 'app', type: 'root', pos: undefined }],
          layouts: [{ id: 'layout.main', name: 'main', scope: 'app', type: 'layout', pos: undefined }],
        }),
        makePoint({
          id: 'point.endpoint',
          route: undefined,
          endpoint: { method: 'GET', route: Route0.create('/api/items') as never },
        }),
      ],
    })

    const byUrl = analyzer.getPoint({ filter: { url: '/page' } })
    const byEndpointUrl = analyzer.getPoint({ filter: { endpointUrl: '/api/items' } })
    const byParent = analyzer.getPoint({ filter: { parendId: 'root' } })
    const byLayout = analyzer.getPoint({ filter: { layoutId: 'layout.main' } })

    expect(byUrl?.id).toBe('point.page')
    expect(byEndpointUrl?.id).toBe('point.endpoint')
    expect(byParent?.id).toBe('point.page')
    expect(byLayout?.id).toBe('point.page')
  })

  it('returns selected fields only when fields option is passed', () => {
    const analyzer = Analyzer.create({
      engine: {
        file: '/tmp/engine.ts',
        import: async () => ({}) as never,
        server: undefined,
        clients: undefined,
      },
      points: [makePoint({ id: 'point.home', name: 'home' })],
    })

    const result = analyzer.listPoints({
      filter: { id: 'point.home' },
      fields: ['id', 'name'],
    })

    expect(result.points).toHaveLength(1)
    const first = result.points[0] as Record<string, unknown>
    expect(first.id).toBe('point.home')
    expect(first.name).toBe('home')
    expect(first.route).toBeUndefined()
    expect(Object.keys(first).sort()).toEqual(['id', 'name'])
  })
})
