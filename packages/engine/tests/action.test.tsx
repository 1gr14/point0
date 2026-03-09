import { Point0 } from '@point0/core'
import { describe, expect, it } from 'bun:test'
import { createTestThings } from './utils/internal-testing.js'
import { z } from 'zod'

describe('action', () => {
  const createRoot = () =>
    Point0.lets('root', 'root')
      .ssr(true)
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

  it.concurrent('general', async () => {
    const root = createRoot()
    const action = root
      .lets('action', 'test', 'GET', '/api/my-test/:id')

      // params should be strictly same keys as we see in route params
      .params(z.object({ id: z.string().min(1) }))

      // hedares can be defined anywhere and not changes TInput
      .headers(z.object({ x: z.string().min(1) }))

      // defining search or body immediatelly tranform TInputRaw to {search, body, params} so we can not pass there flat value
      // if not provided, then all usual inputs just will be applied to
      // but inside loaders and ctx fns we see flat input as usual
      .search(z.object({ y: z.string().min(1) }))
      .body(z.object({ b: z.number().min(1) }))

      // .output(z.object({ b: z.number().min(1) }))

      .loader(({}) => ({ x: 1 }))
      .action()

    const { loadPoint } = await createTestThings({
      points: [root, action],
    })
    const result = await loadPoint(
      action,
      { body: { b: 3 }, search: { y: '2' }, params: { id: '1' } },
      { headers: { x: '1' } },
    )
    expect(result).toEqual({ x: 1 })
  })
})
