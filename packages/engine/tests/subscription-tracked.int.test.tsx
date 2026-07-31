/**
 * The tracked-cursor pair (`.subscription({ cursorParamFromInput, cursorParamFromData })`) through the REAL
 * `useSubscription` hook against a real Engine server point: the client plucks the cursor out of each delivered value,
 * and after a BREAK the auto-reconnect resubscribes with the cursor written into the named input field — so the server
 * loader reads the resume point out of its own input, exactly as it reads a fresh start. The break is scripted at the
 * transport seam: a fetch wrapper truncates the NDJSON body after N envelope lines and ends it WITHOUT the terminal —
 * the wire dying, from the client's viewpoint. The server logs every parsed input it receives — the pin that the
 * REWRITTEN input actually crossed the wire (and, with superjson on the root, that a `Date` cursor arrived a `Date`).
 *
 * The feature is client-only: a non-tracked point through the same dying wire redials with the caller's input
 * byte-for-byte untouched, and `fetchSubscription` yields the plain data objects (the cursor is just a field).
 */
import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import superjson from 'superjson'
import { z } from 'zod'
import { Point0 } from '@point0/core'
import { cleanup, render, waitFor } from '@testing-library/react/pure.js'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/fake-client.js'
import { getFakeBrowserGlobals } from './utils/internal-testing.js'

/**
 * Forward the first `limit` envelope lines of an NDJSON body and end it WITHOUT the terminal — a break (heartbeat blank
 * lines are dropped, they are not envelopes). Cancelling upstream fires the server generator's `signal`, the same way a
 * real dead connection does.
 */
const truncateNdjsonBody = (body: ReadableStream<Uint8Array>, limit: number): ReadableStream<Uint8Array> => {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  let sent = 0
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      for (;;) {
        const newlineAt = buffer.indexOf('\n')
        if (newlineAt >= 0) {
          const line = buffer.slice(0, newlineAt)
          buffer = buffer.slice(newlineAt + 1)
          if (line.length === 0) {
            continue
          }
          controller.enqueue(encoder.encode(line + '\n'))
          sent++
          if (sent >= limit) {
            controller.close()
            await reader.cancel().catch(() => {})
            return
          }
          continue
        }
        const { done, value } = await reader.read()
        if (value) {
          buffer += decoder.decode(value, { stream: true })
        }
        if (done) {
          controller.close()
          return
        }
      }
    },
    cancel: async () => {
      await reader.cancel().catch(() => {})
    },
  })
}

/** Arm a one-shot break on the fake client's fetch: the next response whose URL matches gets its body cut. */
const armBreakableFetch = (fakeClient: { fetch: (input: any, init?: any) => Promise<Response> }) => {
  const state: { urlPart?: string; lines?: number } = {}
  const realFetch = fakeClient.fetch
  fakeClient.fetch = async (input: any, init?: any) => {
    const res = await realFetch(input, init)
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (state.urlPart === undefined || state.lines === undefined || !url.includes(state.urlPart) || !res.body) {
      return res
    }
    const lines = state.lines
    state.urlPart = undefined
    state.lines = undefined
    return new Response(truncateNdjsonBody(res.body, lines), { status: res.status, headers: res.headers })
  }
  return {
    breakNextStreamAfter: (urlPart: string, lines: number) => {
      state.urlPart = urlPart
      state.lines = lines
    },
  }
}

const createFakeClient = async ({
  serverPoints,
  clientPoints,
}: {
  serverPoints: unknown[]
  clientPoints: unknown[]
}) => {
  const engine = await Engine.create({
    compiler: false,
    file: import.meta.url,
    server: { scope: 'root', points: serverPoints as never },
    clients: [{ scope: 'root', points: clientPoints as never }],
  }).prepare()
  return FakeClient.create({
    engine,
    scope: 'root',
    globals: getFakeBrowserGlobals(),
    onDestroyInside: () => cleanup(),
  })
}

describe('tracked subscription — the cursor pair resumes a broken stream', () => {
  it('the break redials with the last delivered cursor in the input; the first subscribe sends the input untouched; no duplicates', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').transformer(superjson).root()
    const events = [1, 2, 3, 4, 5].map((id) => ({ id, text: `event ${id}` }))
    const serverInputs: unknown[] = []
    const serverTrackedFeed = root
      .lets('subscription', 'trackedFeed')
      .input(z.object({ channelId: z.string(), lastEventId: z.number().optional() }))
      .loader(async function* ({ input }) {
        serverInputs.push(input)
        // the loader reads the cursor out of its input — a fresh start and a resume look the same to it
        for (const event of events.filter((event) => event.id > (input.lastEventId ?? 0))) {
          yield event
        }
      })
      .subscription()
    // the client side, post-strip shape: blanked input/loader, the cursor pair on the closer
    const trackedFeed = (root.lets as (...args: unknown[]) => any)('subscription', 'trackedFeed')
      .input()
      .loader()
      .subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
    const fakeClient = await createFakeClient({
      serverPoints: [root, serverTrackedFeed],
      clientPoints: [root, trackedFeed],
    })
    const breaker = armBreakableFetch(fakeClient)
    const messages: Array<{ id: number }> = []
    const Probe = (): React.ReactElement => {
      const sub = trackedFeed.useSubscription(
        { channelId: 'c1' },
        { onMessageFromServer: (message: { id: number }) => void messages.push(message) },
      ) as { status: string }
      return <i id="status">{sub.status}</i>
    }
    await fakeClient.run(async () => {
      breaker.breakNextStreamAfter('/subscription/tracked-feed', 2)
      const { container } = render(<Probe />)
      await waitFor(
        () => {
          expect(container.querySelector('#status')?.textContent).toBe('closed')
        },
        { timeout: 10_000 },
      )
      // every event exactly once: 1..2 before the break, 3..5 after the resume — no replays
      expect(messages.map((message) => message.id)).toEqual([1, 2, 3, 4, 5])
      // call 1: the caller's input untouched; call 2: the SAME input with the last delivered cursor written in
      expect(serverInputs).toEqual([{ channelId: 'c1' }, { channelId: 'c1', lastEventId: 2 }])
    })
    await fakeClient.destroy()
  })

  it('an explicit caller cursor rides the first subscribe untouched — "read from N" works without any break', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').transformer(superjson).root()
    const events = [1, 2, 3, 4, 5].map((id) => ({ id, text: `event ${id}` }))
    const serverInputs: unknown[] = []
    const serverTrackedFeed = root
      .lets('subscription', 'trackedFeed')
      .input(z.object({ channelId: z.string(), lastEventId: z.number().optional() }))
      .loader(async function* ({ input }) {
        serverInputs.push(input)
        for (const event of events.filter((event) => event.id > (input.lastEventId ?? 0))) {
          yield event
        }
      })
      .subscription()
    const trackedFeed = (root.lets as (...args: unknown[]) => any)('subscription', 'trackedFeed')
      .input()
      .loader()
      .subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
    const fakeClient = await createFakeClient({
      serverPoints: [root, serverTrackedFeed],
      clientPoints: [root, trackedFeed],
    })
    const messages: Array<{ id: number }> = []
    const Probe = (): React.ReactElement => {
      const sub = trackedFeed.useSubscription(
        { channelId: 'c1', lastEventId: 3 },
        { onMessageFromServer: (message: { id: number }) => void messages.push(message) },
      ) as { status: string }
      return <i id="status">{sub.status}</i>
    }
    await fakeClient.run(async () => {
      const { container } = render(<Probe />)
      await waitFor(
        () => {
          expect(container.querySelector('#status')?.textContent).toBe('closed')
        },
        { timeout: 10_000 },
      )
      expect(messages.map((message) => message.id)).toEqual([4, 5])
      expect(serverInputs).toEqual([{ channelId: 'c1', lastEventId: 3 }])
    })
    await fakeClient.destroy()
  })

  it('a Date cursor arrives a Date — the transformer covers the resume input like any input (deep paths on both sides)', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').transformer(superjson).root()
    const at = (minute: number): Date => new Date(Date.UTC(2026, 6, 30, 12, minute))
    const events = [1, 2, 3].map((seq) => ({ meta: { seq, at: at(seq) }, text: `tick ${seq}` }))
    const serverSince: Array<{ isDate: boolean; iso: string | undefined }> = []
    const serverTimedFeed = root
      .lets('subscription', 'timedFeed')
      .input(z.object({ streamId: z.string(), filter: z.object({ since: z.date().optional() }).optional() }))
      .loader(async function* ({ input }) {
        const since = input.filter?.since
        serverSince.push({ isDate: since instanceof Date, iso: since?.toISOString() })
        for (const event of events.filter((event) => event.meta.at.getTime() > (since?.getTime() ?? 0))) {
          yield event
        }
      })
      .subscription()
    const timedFeed = (root.lets as (...args: unknown[]) => any)('subscription', 'timedFeed')
      .input()
      .loader()
      .subscription({ cursorParamFromInput: 'filter.since', cursorParamFromData: 'meta.at' })
    const fakeClient = await createFakeClient({
      serverPoints: [root, serverTimedFeed],
      clientPoints: [root, timedFeed],
    })
    const breaker = armBreakableFetch(fakeClient)
    const messages: Array<{ meta: { seq: number; at: Date } }> = []
    const Probe = (): React.ReactElement => {
      const sub = timedFeed.useSubscription(
        { streamId: 's1' },
        { onMessageFromServer: (message: { meta: { seq: number; at: Date } }) => void messages.push(message) },
      ) as { status: string }
      return <i id="status">{sub.status}</i>
    }
    await fakeClient.run(async () => {
      breaker.breakNextStreamAfter('/subscription/timed-feed', 1)
      const { container } = render(<Probe />)
      await waitFor(
        () => {
          expect(container.querySelector('#status')?.textContent).toBe('closed')
        },
        { timeout: 10_000 },
      )
      expect(messages.map((message) => message.meta.seq)).toEqual([1, 2, 3])
      // the delivered cursor came back to life as a Date on the client (superjson), and the resume request carried it
      // back as a Date — the deep `filter.since` container was created by the rewrite (the caller sent none)
      expect(serverSince).toEqual([
        { isDate: false, iso: undefined },
        { isDate: true, iso: at(1).toISOString() },
      ])
    })
    await fakeClient.destroy()
  })

  it("a non-tracked point through the same dying wire redials with the caller input untouched — today's restart semantics", async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').transformer(superjson).root()
    const serverInputs: unknown[] = []
    const serverPlainFeed = root
      .lets('subscription', 'plainFeed')
      .input(z.object({ upTo: z.number() }))
      .loader(async function* ({ input }) {
        serverInputs.push(input)
        for (let n = 1; n <= input.upTo; n++) {
          yield { n }
        }
      })
      .subscription()
    const plainFeed = (root.lets as (...args: unknown[]) => any)('subscription', 'plainFeed')
      .input()
      .loader()
      .subscription()
    const fakeClient = await createFakeClient({
      serverPoints: [root, serverPlainFeed],
      clientPoints: [root, plainFeed],
    })
    const breaker = armBreakableFetch(fakeClient)
    const messages: Array<{ n: number }> = []
    const Probe = (): React.ReactElement => {
      const sub = plainFeed.useSubscription(
        { upTo: 3 },
        { onMessageFromServer: (message: { n: number }) => void messages.push(message) },
      ) as { status: string }
      return <i id="status">{sub.status}</i>
    }
    await fakeClient.run(async () => {
      breaker.breakNextStreamAfter('/subscription/plain-feed', 2)
      const { container } = render(<Probe />)
      await waitFor(
        () => {
          expect(container.querySelector('#status')?.textContent).toBe('closed')
        },
        { timeout: 10_000 },
      )
      // the redial RESTARTS the generator from scratch — the replay of 1..2 is today's semantics, untouched
      expect(messages.map((message) => message.n)).toEqual([1, 2, 1, 2, 3])
      expect(serverInputs).toEqual([{ upTo: 3 }, { upTo: 3 }])
    })
    await fakeClient.destroy()
  })

  it('fetchSubscription on a tracked point yields the plain data objects — the cursor is just a field of the data', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').transformer(superjson).root()
    const events = [1, 2, 3].map((id) => ({ id, text: `event ${id}` }))
    const serverTrackedFeed = root
      .lets('subscription', 'trackedFeed')
      .input(z.object({ channelId: z.string(), lastEventId: z.number().optional() }))
      .loader(async function* ({ input }) {
        for (const event of events.filter((event) => event.id > (input.lastEventId ?? 0))) {
          yield event
        }
      })
      .subscription()
    const trackedFeed = (root.lets as (...args: unknown[]) => any)('subscription', 'trackedFeed')
      .input()
      .loader()
      .subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
    const fakeClient = await createFakeClient({
      serverPoints: [root, serverTrackedFeed],
      clientPoints: [root, trackedFeed],
    })
    await fakeClient.run(async () => {
      const values: unknown[] = []
      for await (const value of trackedFeed.fetchSubscription({ channelId: 'c1' })) {
        values.push(value)
      }
      expect(values).toEqual(events)
    })
    await fakeClient.destroy()
  })
})
