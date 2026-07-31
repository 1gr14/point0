/**
 * The subscription lifecycle callbacks through the REAL `useSubscription` hook under FakeClient: a server action
 * returns a raw NDJSON `Response` whose first stream BREAKS (the bytes end without the `{"d":true}` terminal) and whose
 * second completes — so one hook consumer walks the whole story: onConnect (index 0) → onDisconnect (the break) → the
 * reconnect policy redials → onConnect again (index 1 — every successful open fires it) → onDisconnect (the completion)
 * → status `closed`. The point-level and call-site callbacks compose additively, point level first — exactly the
 * channel lifecycle composition.
 *
 * Then the two ways a stream can go bad mid-read, both of which are BREAKS and reach the consumer as the point's own
 * typed `POINT0_SUBSCRIPTION_LOST`, never as a raw transport or transformer throw: the body rejecting, and a line the
 * transformer cannot parse (whatever follows a corrupted frame is unreachable — the framing is gone).
 */
import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import { Point0 } from '@point0/core'
import { cleanup, render, waitFor } from '@testing-library/react/pure.js'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/fake-client.js'
import { getFakeBrowserGlobals } from './utils/internal-testing.js'

// "broken" is the absence of the `{"d":true}` terminal line, not of a close — the body always ends cleanly here
const ndjsonResponse = (lines: string[]): Response => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line + '\n'))
      }
      controller.close()
    },
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
}

describe('subscription lifecycle through useSubscription', () => {
  it('onConnect (index 0) → onDisconnect on a break → onConnect on the redial (index 1) → onDisconnect on the completion', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').root()
    // the server side of the flaky feed: call 1 streams one value and BREAKS (no terminal), call 2 completes
    let calls = 0
    const flakyFeedAction = root
      .lets('GET', '/api/flaky-feed')
      .loader(async () => {
        calls++
        if (calls === 1) {
          return ndjsonResponse(['{"v":{"tick":1}}'])
        }
        return ndjsonResponse(['{"v":{"tick":2}}', '{"d":true}'])
      })
      .action()
    const lifecycle: string[] = []
    // the client side: the SAME route declared as an action-opener subscription (the stripped-loader client shape),
    // carrying the point-level callbacks in the closer options
    const flakyFeedSubscription = (root.lets as (...args: unknown[]) => any)('GET', '/api/flaky-feed')
      .loader()
      .subscription({
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`point:connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`point:disconnect:${connectionIndex}`)
        },
        onError: () => {
          lifecycle.push('point:error')
        },
      })
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points: [root, flakyFeedAction] },
      clients: [{ scope: 'root', points: [root, flakyFeedSubscription] }],
    }).prepare()
    const fakeClient = FakeClient.create({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      onDestroyInside: () => cleanup(),
    })
    const Probe = (): React.ReactElement => {
      const sub = flakyFeedSubscription.useSubscription(undefined, {
        lastMessageFromServerAsData: true,
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`call:connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`call:disconnect:${connectionIndex}`)
        },
        onError: () => {
          lifecycle.push('call:error')
        },
      }) as { status: string; data?: { tick: number } }
      return (
        <div>
          <i id="status">{sub.status}</i>
          <i id="tick">{sub.data?.tick ?? '-'}</i>
        </div>
      )
    }
    await fakeClient.run(async () => {
      const { container } = render(<Probe />)
      await waitFor(() => {
        expect(container.querySelector('#status')?.textContent).toBe('closed')
      })
      expect(container.querySelector('#tick')?.textContent).toBe('2')
      // point level fires before the call site, on every transition; the break redials into onConnect with index 1
      expect(lifecycle).toEqual([
        'point:connect:0',
        'call:connect:0',
        'point:disconnect:0',
        'call:disconnect:0',
        'point:connect:1',
        'call:connect:1',
        'point:disconnect:1',
        'call:disconnect:1',
      ])
      expect(calls).toBe(2)
    })
    await fakeClient.destroy()
  })

  it('a transport reject mid-read is a BREAK: fetchSubscription throws the typed lost error, the lifecycle fires', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').root()
    const encoder = new TextEncoder()
    // pull-based so the first value is DELIVERED before the stream errors (an eager error discards queued chunks)
    const dyingFeedAction = root
      .lets('GET', '/api/dying-feed')
      .loader(async () => {
        let pulls = 0
        const stream = new ReadableStream<Uint8Array>({
          pull: (controller) => {
            pulls++
            if (pulls === 1) {
              controller.enqueue(encoder.encode('{"v":{"tick":1}}\n'))
              return
            }
            controller.error(new Error('the connection died'))
          },
        })
        return new Response(stream, { status: 200, headers: { 'content-type': 'application/x-ndjson' } })
      })
      .action()
    const lifecycle: string[] = []
    const dyingFeedSubscription = (root.lets as (...args: unknown[]) => any)('GET', '/api/dying-feed')
      .loader()
      .subscription({
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`disconnect:${connectionIndex}`)
        },
        onError: ({ error, connectionIndex }: { error: { code?: string }; connectionIndex: number }) => {
          lifecycle.push(`error:${connectionIndex}:${error.code ?? ''}`)
        },
      })
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points: [root, dyingFeedAction] },
      clients: [{ scope: 'root', points: [root, dyingFeedSubscription] }],
    }).prepare()
    const fakeClient = FakeClient.create({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      onDestroyInside: () => cleanup(),
    })
    await fakeClient.run(async () => {
      const values: unknown[] = []
      let thrown: { code?: string } | undefined
      try {
        for await (const value of dyingFeedSubscription.fetchSubscription()) {
          values.push(value)
        }
      } catch (error) {
        thrown = error as { code?: string }
      }
      // the value before the death arrived; the death itself is the typed break, not a raw transport error
      expect(values).toEqual([{ tick: 1 }])
      expect(thrown?.code).toBe('POINT0_SUBSCRIPTION_LOST')
      await waitFor(() => {
        expect(lifecycle).toEqual(['connect:0', 'disconnect:0', 'error:0:POINT0_SUBSCRIPTION_LOST'])
      })
    })
    await fakeClient.destroy()
  })

  it('a line the transformer cannot parse is a BREAK on both paths — the typed lost error, never a raw parse throw', async () => {
    const root = Point0.lets('root', 'root').serverUrl('http://localhost:3000').root()
    // the framing goes bad mid-stream: one good value, then a TRUNCATED line (a proxy that cut a frame, a half-written
    // chunk). Whatever follows it — here even a perfectly good `{"d":true}` — is unreachable: a stream whose lines no
    // longer parse cannot be read at all, so the attempt ends exactly like the bytes stopping
    const corruptFeedAction = root
      .lets('GET', '/api/corrupt-feed')
      .loader(async () => ndjsonResponse(['{"v":{"tick":1}}', '{"v":{"tick":', '{"d":true}']))
      .action()
    const lifecycle: string[] = []
    // `reconnect: false` so the hook's break is an ANSWER here (status `error`) instead of an endless redial into the
    // same corrupted feed — the reconnect machinery itself is the first test's story
    const corruptFeedSubscription = (root.lets as (...args: unknown[]) => any)('GET', '/api/corrupt-feed')
      .loader()
      .subscription({
        reconnect: false,
        onConnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`connect:${connectionIndex}`)
        },
        onDisconnect: ({ connectionIndex }: { connectionIndex: number }) => {
          lifecycle.push(`disconnect:${connectionIndex}`)
        },
        onError: ({ error, connectionIndex }: { error: { code?: string }; connectionIndex: number }) => {
          lifecycle.push(`error:${connectionIndex}:${error.code ?? ''}`)
        },
      })
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points: [root, corruptFeedAction] },
      clients: [{ scope: 'root', points: [root, corruptFeedSubscription] }],
    }).prepare()
    const fakeClient = FakeClient.create({
      engine,
      scope: 'root',
      globals: getFakeBrowserGlobals(),
      onDestroyInside: () => cleanup(),
    })
    const Probe = (): React.ReactElement => {
      const sub = corruptFeedSubscription.useSubscription(undefined, { lastMessageFromServerAsData: true }) as {
        status: string
        error?: { code?: string }
        data?: { tick: number }
      }
      return (
        <div>
          <i id="status">{sub.status}</i>
          <i id="code">{sub.error?.code ?? '-'}</i>
          <i id="tick">{sub.data?.tick ?? '-'}</i>
        </div>
      )
    }
    await fakeClient.run(async () => {
      // the imperative path: the value before the corruption arrived, and the corruption itself surfaces as the
      // point's own typed error — a raw transformer `SyntaxError` would be a lie about this iterable's contract
      const values: unknown[] = []
      let thrown: { code?: string } | undefined
      try {
        for await (const value of corruptFeedSubscription.fetchSubscription()) {
          values.push(value)
        }
      } catch (error) {
        thrown = error as { code?: string }
      }
      expect(values).toEqual([{ tick: 1 }])
      expect(thrown?.code).toBe('POINT0_SUBSCRIPTION_LOST')
      await waitFor(() => {
        expect(lifecycle).toEqual(['connect:0', 'disconnect:0', 'error:0:POINT0_SUBSCRIPTION_LOST'])
      })

      // and the hook reads the same stream the same way: a break, not a completion — `closed` would mean the
      // `{"d":true}` behind the corrupted line had been believed
      lifecycle.length = 0
      const { container } = render(<Probe />)
      await waitFor(() => {
        expect(container.querySelector('#status')?.textContent).toBe('error')
      })
      expect(container.querySelector('#code')?.textContent).toBe('POINT0_SUBSCRIPTION_LOST')
      expect(container.querySelector('#tick')?.textContent).toBe('1')
    })
    await fakeClient.destroy()
  })
})
