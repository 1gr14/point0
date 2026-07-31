/**
 * Drives a subscription point end-to-end against a spawned dev server through the REAL core client
 * (`fetchSubscription`): values stream in as NDJSON lines, a completed generator ends the iteration, a thrown loader
 * error arrives typed mid-stream, unsubscribing fires the loader's `signal`, and a schema-rejected input answers as a
 * plain typed error before any streaming. A generator that goes quiet keeps its stream warm on heartbeats alone — a
 * blank line in NDJSON, a `:` comment in SSE. The custom-method/path form (an action opener closed with
 * `.subscription()`) rides the same transport.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { z } from 'zod'
import { Point0 } from '@point0/core'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'subscription',
  portsRange: [4400, 4449],
  superjson: false,
})

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/subscription.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

export const countSubscription = root.lets('subscription', 'countSubscription')
  .input(z.object({ upTo: z.number().max(10) }))
  .loader(async function* ({ input }) {
    for (let n = 1; n <= input.upTo; n++) {
      yield { n }
    }
  })
  .subscription()

export const failingSubscription = root.lets('subscription', 'failingSubscription')
  .loader(async function* ({ ctx }) {
    yield { step: 1 }
    throw Object.assign(new Error('stream exploded'), { code: 'STREAM_EXPLODED' })
  })
  .subscription()

let infiniteAborted = false
export const infiniteSubscription = root.lets('subscription', 'infiniteSubscription')
  .loader(async function* ({ signal }) {
    signal.addEventListener('abort', () => {
      infiniteAborted = true
    })
    let n = 0
    for (;;) {
      yield { tick: n++ }
      await new Promise((resolve) => setTimeout(resolve, 25))
      if (signal.aborted) {
        return
      }
    }
  })
  .subscription()

export const abortProbeQuery = root.lets('query', 'abortProbeQuery')
  .loader(async () => ({ aborted: infiniteAborted }))
  .query()

export const feedSubscription = root.lets('GET', '/api/feed-stream')
  .loader(async function* () {
    yield { item: 'a' }
    yield { item: 'b' }
  })
  .subscription()

// one value and then silence: the stream has to stay warm on heartbeats alone. The wait is walked in small steps so
// the consumer going away (generator.return()) unwinds it promptly instead of parking the server on a long timer
export const quietSubscription = root.lets('GET', '/api/quiet-stream')
  .loader(async function* ({ signal }) {
    yield { hello: true }
    for (let waited = 0; waited < 60_000 && !signal?.aborted; waited += 100) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  })
  .subscription()

// an action-flavored subscription with route params + search: the input rides the ACTION transport —
// params fill the path, search rides the query string (nothing goes to ?input=)
export const roomStreamSubscription = root.lets('GET', '/api/room-stream/:roomId')
  .params(z.object({ roomId: z.string() }))
  .search(z.object({ upTo: z.coerce.number() }))
  .loader(async function* ({ params, search }) {
    for (let n = 1; n <= search.upTo; n++) {
      yield { roomId: params.roomId, n }
    }
  })
  .subscription()

const serverSubEvents: string[] = []
export const eventedSubscription = root.lets('subscription', 'eventedSubscription')
  .input(z.object({ upTo: z.number() }))
  .loader(async function* ({ input }) {
    for (let n = 1; n <= input.upTo; n++) {
      yield { n }
    }
  })
  .serverOn(
    ['pointSubscriptionServerStart', 'pointSubscriptionServerData', 'pointSubscriptionServerSettled', 'pointSubscriptionServerError'],
    (event) => {
      const outcome = (event.data as { outcome?: string }).outcome
      serverSubEvents.push(event.name + (outcome ? ':' + outcome : ''))
    },
  )
  .subscription()

export const subEventsProbeQuery = root.lets('query', 'subEventsProbeQuery')
  .loader(async () => ({ events: serverSubEvents }))
  .query()
`,
  )
}

/**
 * Read a live stream until it has said enough (`predicate`), and hand back what arrived. Never waits for the body to
 * END — a heartbeat is a fact about the bytes that show up WHILE the generator is quiet, so the read races a deadline
 * and the fetch is aborted on the way out (which is what lets the server's generator unwind).
 */
const readStreamUntil = async (
  res: Response,
  predicate: (text: string) => boolean,
  timeoutMs: number,
): Promise<string> => {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  const deadline = Date.now() + timeoutMs
  let text = ''
  const timedOut = Symbol('timed out')
  while (!predicate(text)) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      throw new Error(`The stream did not say enough in ${timeoutMs}ms — it said ${JSON.stringify(text)}`)
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const raced = await Promise.race([
      reader.read(),
      new Promise<typeof timedOut>((resolve) => {
        timer = setTimeout(() => resolve(timedOut), remaining)
      }),
    ])
    if (timer) {
      clearTimeout(timer)
    }
    if (raced === timedOut) {
      throw new Error(`The stream did not say enough in ${timeoutMs}ms — it said ${JSON.stringify(text)}`)
    }
    if (raced.value) {
      text += decoder.decode(raced.value, { stream: true })
    }
    if (raced.done) {
      break
    }
  }
  return text
}

const waitFor = async (predicate: () => boolean | Promise<boolean>, timeoutMs = 10_000): Promise<void> => {
  const startedAt = Date.now()
  while (!(await predicate())) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`waitFor timed out in ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

// the client-side point declarations — what the compiled client bundle carries after the strip
const buildClientPoints = (serverPort: number) => {
  const root = Point0.lets('root', 'root').serverUrl(`http://localhost:${serverPort}`).root()
  const countSubscription = (root.lets as (...args: unknown[]) => any)('subscription', 'countSubscription')
    .input(z.object({ upTo: z.number().max(10) }))
    .loader()
    .subscription()
  const failingSubscription = (root.lets as (...args: unknown[]) => any)('subscription', 'failingSubscription')
    .loader()
    .subscription()
  const infiniteSubscription = (root.lets as (...args: unknown[]) => any)('subscription', 'infiniteSubscription')
    .loader()
    .subscription()
  const abortProbeQuery = (root.lets as (...args: unknown[]) => any)('query', 'abortProbeQuery').loader().query()
  const feedSubscription = (root.lets as (...args: unknown[]) => any)('GET', '/api/feed-stream').loader().subscription()
  const roomStreamSubscription = (root.lets as (...args: unknown[]) => any)('GET', '/api/room-stream/:roomId')
    .params(z.object({ roomId: z.string() }))
    .search(z.object({ upTo: z.coerce.number() }))
    .loader()
    .subscription()
  const eventedSubscription = (root.lets as (...args: unknown[]) => any)('subscription', 'eventedSubscription')
    .input(z.object({ upTo: z.number() }))
    .loader()
    .subscription()
  const subEventsProbeQuery = (root.lets as (...args: unknown[]) => any)('query', 'subEventsProbeQuery')
    .loader()
    .query()
  return {
    root,
    countSubscription,
    failingSubscription,
    infiniteSubscription,
    abortProbeQuery,
    feedSubscription,
    roomStreamSubscription,
    eventedSubscription,
    subEventsProbeQuery,
  }
}

describe('subscription transport', () => {
  let tp: TestProjectOneClient
  let points: ReturnType<typeof buildClientPoints>

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    // from here on this test process acts as the browser — the spawned server child kept its own side
    process.env.POINT0_SIDE = 'client'
    points = buildClientPoints(tp.serverPort)
  })

  afterAll(async () => {
    delete process.env.POINT0_SIDE
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('streams every yield and ends the iteration when the generator completes', async () => {
    const values: unknown[] = []
    for await (const value of points.countSubscription.fetchSubscription({ upTo: 3 })) {
      values.push(value)
    }
    expect(values).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }])
  })

  it('a loader throw arrives as the typed error mid-stream, after the yields before it', async () => {
    const values: unknown[] = []
    const failure = await (async () => {
      try {
        for await (const value of points.failingSubscription.fetchSubscription()) {
          values.push(value)
        }
        return undefined
      } catch (error) {
        return error as { message: string; code?: string }
      }
    })()
    expect(values).toEqual([{ step: 1 }])
    expect(failure?.message).toBe('stream exploded')
  })

  it('a schema-rejected input answers as a plain typed error before any streaming', async () => {
    const iterate = async () => {
      for await (const value of points.countSubscription.fetchSubscription({ upTo: 999 })) {
        void value
      }
    }
    const error = await iterate().then(
      () => undefined,
      (thrown: { status?: number }) => thrown,
    )
    expect(error).toBeDefined()
    expect(error?.status).toBe(422)
  })

  it('breaking out of the loop cancels the stream and fires the loader signal', async () => {
    const values: Array<{ tick: number }> = []
    for await (const value of points.infiniteSubscription.fetchSubscription()) {
      values.push(value as { tick: number })
      if (values.length === 3) {
        break
      }
    }
    expect(values.map((value) => value.tick)).toEqual([0, 1, 2])
    await waitFor(async () => {
      const probe = (await points.abortProbeQuery.fetchQuery()) as { aborted: boolean }
      return probe.aborted
    })
  })

  it('pointSubscription* client events fire per attempt: start (attempt 0), data per value, settled completed', async () => {
    const events: Array<{ name: string; outcome?: string; attempt?: number; value?: unknown }> = []
    const evented = (points.root.lets as (...args: unknown[]) => any)('subscription', 'countSubscription')
      .input(z.object({ upTo: z.number().max(10) }))
      .loader()
      .on(
        [
          'pointSubscriptionClientStart',
          'pointSubscriptionClientData',
          'pointSubscriptionClientSettled',
          'pointSubscriptionClientError',
        ],
        (event: { name: string; data: { outcome?: string; attempt?: number; value?: unknown } }) => {
          events.push({
            name: event.name,
            outcome: event.data.outcome,
            attempt: event.data.attempt,
            value: event.data.value,
          })
        },
      )
      .subscription()
    for await (const value of evented.fetchSubscription({ upTo: 2 })) {
      void value
    }
    expect(
      events.map(
        (event) =>
          event.name +
          (event.outcome ? ':' + event.outcome : '') +
          (event.value !== undefined ? ':' + JSON.stringify(event.value) : ''),
      ),
    ).toEqual([
      'pointSubscriptionClientStart',
      'pointSubscriptionClientData:{"n":1}',
      'pointSubscriptionClientData:{"n":2}',
      'pointSubscriptionClientSettled:completed',
    ])
    expect(events[0].attempt).toBe(0)
  })

  it('a failed stream settles as failed and fires pointSubscriptionError on the client', async () => {
    const events: string[] = []
    const evented = (points.root.lets as (...args: unknown[]) => any)('subscription', 'failingSubscription')
      .loader()
      .on(
        ['pointSubscriptionClientSettled', 'pointSubscriptionClientError'],
        (event: { name: string; data: { outcome?: string } }) => {
          events.push(event.name + (event.data.outcome ? ':' + event.data.outcome : ''))
        },
      )
      .subscription()
    try {
      for await (const value of evented.fetchSubscription()) {
        void value
      }
    } catch {
      // the typed error is the expected exit
    }
    expect(events).toEqual(['pointSubscriptionClientSettled:failed', 'pointSubscriptionClientError'])
  })

  it('the point-level lifecycle callbacks fire per stream: onConnect on the open, onDisconnect on the completion', async () => {
    const lifecycle: string[] = []
    const observed = (points.root.lets as (...args: unknown[]) => any)('subscription', 'countSubscription')
      .input(z.object({ upTo: z.number().max(10) }))
      .loader()
      .subscription({
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`disconnect:${connectionIndex}`)
        },
        onError: () => {
          lifecycle.push('error')
        },
      })
    for await (const value of observed.fetchSubscription({ upTo: 2 })) {
      void value
    }
    await waitFor(() => lifecycle.length >= 2)
    expect(lifecycle).toEqual(['connect:0', 'disconnect:0'])
  })

  it('a mid-stream typed error closes an OPEN stream: onDisconnect first, then onError with the typed error', async () => {
    const lifecycle: string[] = []
    const observed = (points.root.lets as (...args: unknown[]) => any)('subscription', 'failingSubscription')
      .loader()
      .subscription({
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`disconnect:${connectionIndex}`)
        },
        onError: ({ error, connectionIndex }: { error: { message: string }; connectionIndex: number }) => {
          lifecycle.push(`error:${connectionIndex}:${error.message}`)
        },
      })
    try {
      for await (const value of observed.fetchSubscription()) {
        void value
      }
    } catch {
      // the typed error is the expected exit
    }
    await waitFor(() => lifecycle.length >= 3)
    expect(lifecycle).toEqual(['connect:0', 'disconnect:0', 'error:0:stream exploded'])
  })

  it('a request that never opened (schema-rejected) fires onError alone — nothing connected, nothing to disconnect', async () => {
    const lifecycle: string[] = []
    const observed = (points.root.lets as (...args: unknown[]) => any)('subscription', 'countSubscription')
      .input(z.object({ upTo: z.number().max(10) }))
      .loader()
      .subscription({
        onConnect: () => {
          lifecycle.push('connect')
        },
        onDisconnect: () => {
          lifecycle.push('disconnect')
        },
        onError: ({ error, connectionIndex }: { error: { status?: number }; connectionIndex: number }) => {
          // the index clamps to 0 — nothing ever opened, there is no "connect before this one" to count
          lifecycle.push(`error:${connectionIndex}:${error.status}`)
        },
      })
    try {
      for await (const value of observed.fetchSubscription({ upTo: 999 })) {
        void value
      }
    } catch {
      // the 422 is the expected exit
    }
    await waitFor(() => lifecycle.length >= 1)
    expect(lifecycle).toEqual(['error:0:422'])
  })

  it('pointSubscription* server events mirror the stream: start, data per yield, settled completed', async () => {
    for await (const value of points.eventedSubscription.fetchSubscription({ upTo: 2 })) {
      void value
    }
    await waitFor(async () => {
      const probe = (await points.subEventsProbeQuery.fetchQuery()) as { events: string[] }
      return probe.events.length >= 4
    })
    const probe = (await points.subEventsProbeQuery.fetchQuery()) as { events: string[] }
    expect(probe.events).toEqual([
      'pointSubscriptionServerStart',
      'pointSubscriptionServerData',
      'pointSubscriptionServerData',
      'pointSubscriptionServerSettled:completed',
    ])
  })

  it('content negotiation: a foreign Accept gets the SAME envelopes in SSE framing, Vary: Accept set', async () => {
    const res = await fetch('http://localhost:' + tp.serverPort + '/api/feed-stream', {
      headers: { Accept: 'text/event-stream' },
    })
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(res.headers.get('vary')).toBe('Accept')
    const text = await res.text()
    expect(text).toBe('data: {"v":{"item":"a"}}\n\ndata: {"v":{"item":"b"}}\n\ndata: {"d":true}\n\n')
  })

  it('content negotiation: an absent/unknown Accept falls back to SSE; naming NDJSON keeps the native framing', async () => {
    // Bun's fetch default Accept is */* — not our framing, so the fallback is SSE (the EventSource world)
    const foreign = await fetch('http://localhost:' + tp.serverPort + '/api/feed-stream')
    expect(foreign.headers.get('content-type')).toBe('text/event-stream')
    void (await foreign.text())
    const native = await fetch('http://localhost:' + tp.serverPort + '/api/feed-stream', {
      headers: { Accept: 'application/x-ndjson' },
    })
    expect(native.headers.get('content-type')).toBe('application/x-ndjson')
    const text = await native.text()
    expect(text).toBe('{"v":{"item":"a"}}\n{"v":{"item":"b"}}\n{"d":true}\n')
  })

  it('a quiet generator keeps the NDJSON stream warm: a blank-line heartbeat, no terminal envelope', async () => {
    const controller = new AbortController()
    try {
      const res = await fetch('http://localhost:' + tp.serverPort + '/api/quiet-stream', {
        headers: { Accept: 'application/x-ndjson' },
        signal: controller.signal,
      })
      expect(res.headers.get('content-type')).toBe('application/x-ndjson')
      // the one value, then the pipe stays warm on its own: SUBSCRIPTION_STREAM_HEARTBEAT_MS is 5s, and the deadline
      // is only generous so a loaded machine cannot turn "an idle stream is kept alive" into a red test
      const value = '{"v":{"hello":true}}\n'
      const text = await readStreamUntil(res, (seen) => seen.includes('\n\n'), 20_000)
      expect(text.startsWith(value)).toBe(true)
      // the heartbeat is a BLANK line and nothing else — no envelope at all, so no reader can mistake it for an answer
      // (`{"d":true}` would end the stream, and this generator has not finished)
      const rest = text.slice(value.length)
      expect(rest.length).toBeGreaterThan(0)
      expect(rest.replaceAll('\n', '')).toBe('')
    } finally {
      // the abort is the client going away — the server aborts the loader's signal and the quiet generator unwinds
      controller.abort()
    }
  })

  it('the SSE framing keeps it warm with a `:` comment — the same heartbeat, the shape EventSource expects', async () => {
    const controller = new AbortController()
    try {
      const res = await fetch('http://localhost:' + tp.serverPort + '/api/quiet-stream', {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      })
      expect(res.headers.get('content-type')).toBe('text/event-stream')
      const value = 'data: {"v":{"hello":true}}\n\n'
      const text = await readStreamUntil(res, (seen) => seen.includes(':\n\n'), 20_000)
      expect(text.startsWith(value)).toBe(true)
      // a comment line, which SSE readers drop — the tail is heartbeats and nothing else
      const rest = text.slice(value.length)
      expect(rest.length).toBeGreaterThan(0)
      expect(rest.replaceAll(':\n\n', '')).toBe('')
    } finally {
      controller.abort()
    }
  })

  it('a custom-method/path subscription (an action opener) streams on its own URL', async () => {
    const values: unknown[] = []
    for await (const value of points.feedSubscription.fetchSubscription()) {
      values.push(value)
    }
    expect(values).toEqual([{ item: 'a' }, { item: 'b' }])
  })

  it('an action-flavored subscription rides the ACTION transport — params in the path, search in the query string', async () => {
    const values: unknown[] = []
    for await (const value of points.roomStreamSubscription.fetchSubscription({
      params: { roomId: 'r7' },
      search: { upTo: 2 },
    })) {
      values.push(value)
    }
    expect(values).toEqual([
      { roomId: 'r7', n: 1 },
      { roomId: 'r7', n: 2 },
    ])
  })
})
