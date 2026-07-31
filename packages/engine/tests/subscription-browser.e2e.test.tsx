/**
 * Subscriptions in a real browser over the real compiled client bundle: the compiler strips the generator loader, the
 * client opens the NDJSON stream through the dev host (bun and vite proxy it without buffering), `useSubscription`
 * walks connecting → open → closed as values stream in, a clientHandler's `iterateMessagesFromServer` consumes the
 * server's pushes over the socket as an async iterable, and `useOnMessageFromServer`'s `lastMessageFromServerAsData`
 * turns pushes into the latest-value state. Runs the same assertions on both bundlers plus --hot.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import { PlaywrightBrowser } from './utils/playwright.js'

setDefaultTimeout(180_000)

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/subscription.points.tsx',
    `import * as React from 'react'
import { z } from 'zod'
import { root } from './lib/root.js'

export const tickSubscription = root.lets('subscription', 'tickSubscription')
  .input(z.object({ upTo: z.number().max(10) }))
  .loader(async function* ({ input }) {
    for (let n = 1; n <= input.upTo; n++) {
      yield { n }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  })
  .subscription()

export const subscriptionPage = root.lets('page', 'subscriptionPage', '/subscription').page(() => {
  const sub = tickSubscription.useSubscription({ upTo: 3 }, { lastMessageFromServerAsData: true })
  return (
    <div>
      <div id="sub-status">sub_{sub.status}</div>
      <div id="sub-data">data_{sub.data ? sub.data.n : 'none'}</div>
    </div>
  )
})

export const tickChannel = root.lets('channel', 'tickChannel')
  .connector(async () => ({ room: { feed: 'ticks' } }))
  .channel()

export const tickHandler = tickChannel.lets('clientHandler', 'tickHandler')
  .serverSend(z.object({ tick: z.number() }))
  .clientHandler()

// the streamed feed: the server's pushes consumed through the message iterator — no request leaves the client
export const streamTicksHandler = tickChannel.lets('clientHandler', 'streamTicksHandler')
  .serverSend(z.object({ tick: z.number() }))
  .clientHandler()

export const startTicksHandler = tickChannel.lets('serverHandler', 'startTicksHandler')
  .serverReply(async () => {
    for (let tick = 1; tick <= 3; tick++) {
      // channel handler, bare target — everyone connected
      void tickHandler.sendToClient({ tick })
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return { ok: true }
  })
  .serverHandler()

// the job starter — the LLM pattern: the mutation answers right away, the pushes ride the feed handler
export const startStreamTicksHandler = tickChannel.lets('serverHandler', 'startStreamTicksHandler')
  .clientSend(z.object({ upTo: z.number() }))
  .serverReply(async ({ input, connectionId }) => {
    void (async () => {
      for (let tick = 1; tick <= input.upTo; tick++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        await streamTicksHandler.sendToClient({ tick }, { connectionId })
      }
    })()
    return { started: true }
  })
  .serverHandler()

export const connSubPage = root.lets('page', 'connSubPage', '/conn-sub')
  .with(tickChannel, {})
  .page(() => {
    const latest = tickHandler.useOnMessageFromServer(() => {}, { lastMessageFromServerAsData: true })
    // the iterator over the real bundle: every push of the bound feed lands in order, teardown rides the signal
    const connection = tickChannel.useConnection({})
    const [streamed, setStreamed] = React.useState([])
    React.useEffect(() => {
      if (connection.status !== 'open') {
        return
      }
      const controller = new AbortController()
      void (async () => {
        for await (const message of streamTicksHandler(connection).iterateMessagesFromServer({
          signal: controller.signal,
        })) {
          setStreamed((prev) => [...prev, message.tick])
        }
      })()
      return () => controller.abort()
    }, [connection.status])
    return (
      <div>
        <button
          id="start"
          onClick={() => {
            void startTicksHandler.sendToServer()
            void startStreamTicksHandler.sendToServer({ upTo: 3 })
          }}
        >
          start
        </button>
        <div id="tick">tick_{latest.data ? latest.data.tick : 'none'}</div>
        <div id="stream">stream_{streamed.join('-') || 'none'}_{connection.status}</div>
      </div>
    )
  })
`,
  )
}

const run = (bundler: 'bun' | 'vite' | 'bun-hot', portsRange: [number, number]) => {
  describe(`subscription browser (${bundler})`, () => {
    const tpf = TestProjectOneClientFactory.create({
      namespace: `subscription-browser-${bundler}`,
      portsRange,
      superjson: false,
      vite: bundler === 'vite',
    })
    let tp: TestProjectOneClient

    beforeAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
      tpf.setBrowser(await PlaywrightBrowser.init())
      tp = tpf.create()
      await tp.cleanup('ports')
      await tp.init()
      await writePoints(tp)
      tp.spawn(bundler === 'bun-hot' ? ['bun', 'run', 'dev', '--hot'] : ['bun', 'run', 'dev'])
      await tp.waitStarted()
    })

    afterAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    })

    it('useSubscription: pending SSR, values stream through the dev host, closed on completion', async () => {
      // SSR: nothing streams on the server — the page renders the connecting state with no data
      // React separates text interpolations with `<!-- -->` — strip them before matching
      const ssrHtml = (await (await fetch(`http://localhost:${tp.serverPort}/subscription`)).text()).replaceAll(
        '<!-- -->',
        '',
      )
      expect(ssrHtml).toContain('sub_connecting')
      expect(ssrHtml).toContain('data_none')
      // in the browser the stream opens and the values arrive one by one (each intermediate render is transient —
      // waiting on it races the poll, so the assertions pin the last value and the completed status)
      const page = await tp.gotoServer('/subscription')
      await page.waitContent('data_3', 15_000)
      await page.waitContent('sub_closed', 10_000)
    })

    it('iterateMessagesFromServer consumes the pushes in order; useOnMessageFromServer keeps the latest push as data', async () => {
      const page = await tp.gotoServer('/conn-sub')
      await page.waitContent('tick_none', 15_000)
      // the iterator attaches once the connection claims — no messages yet
      await page.waitContent('stream_none_open', 15_000)
      await page.original.locator('#start').click()
      // the mutation started the job — every push lands in order through the iterator; the connection stays open
      await page.waitContent('stream_1-2-3_open', 15_000)
      // the latest-input option re-renders per push
      await page.waitContent('tick_3', 10_000)
    })
  })
}

run('bun', [4450, 4464])
run('vite', [4465, 4479])
run('bun-hot', [4480, 4494])
