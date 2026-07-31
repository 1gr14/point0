/**
 * the channel client `upgradeTimeout` — the guard on the cold-start upgrade connect. The fast path turns the connect
 * request ITSELF into the WebSocket (a GET+Upgrade on the channel endpoint), and normally it ends one of two ways: the
 * first `claimed` frame binds the connection, or the handshake dies and the client falls back. The third way is the one
 * this file pins: a handshake that NEITHER completes NOR fails — what a middlebox, a proxy or a stalled server looks
 * like from the browser. Nothing would ever resolve it, so the client cuts it at 5 s, closes the socket itself and
 * hands the connect to the ticket path, whose plain fetch is the one connect shape that always works.
 *
 * Driven with the REAL core client runtime (this process acts as the browser) against a spawned dev server whose
 * connector stalls its FIRST call and answers every one after it — so the upgrade's request hangs open while the ticket
 * path's POST goes straight through, which is exactly the asymmetry the fallback is for.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { z } from 'zod'
import { ClientPoints, Point0 } from '@point0/core'
import { disconnectAll } from '@point0/core/socket'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-upgrade-timeout',
  portsRange: [4350, 4399],
  superjson: false,
})

const pointsFile = `import { z } from 'zod'
import { root } from './lib/root.js'

// the connector STALLS its first call and answers instantly from then on. The upgrade attempt is the first connect the
// server sees, so its GET+Upgrade request hangs open — the handshake neither completes nor fails — while the ticket
// path's POST behind it is answered at once
const connects: number[] = []
export const stallChannel = root.lets('channel', 'stallChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    connects.push(1)
    const attempt = connects.length
    if (attempt === 1) {
      await new Promise((resolve) => setTimeout(resolve, 15000))
    }
    return { me: 'user-' + input.userId, attempt }
  })
  .channel({ client: { upgradable: true } })

// the identity is frozen at connect, so WHICH connect produced this connection is readable from the inside
export const whoHandler = stallChannel.lets('serverHandler', 'whoHandler')
  .serverReply(async ({ identity }) => ({ me: identity.me, attempt: identity.attempt }))
  .serverHandler()
`

const buildClientPoints = (serverPort: number) => {
  const root = Point0.lets('root', 'root').serverUrl(`http://localhost:${serverPort}`).root()
  const anyLets = (point: unknown) => (point as { lets: (...args: unknown[]) => any }).lets
  const stallChannel = root
    .lets('channel', 'stallChannel')
    .input(z.object({ userId: z.string() }))
    .channel({ client: { upgradable: true } })
  const whoHandler = anyLets(stallChannel)('serverHandler', 'whoHandler').serverReply().serverHandler()
  return { root, stallChannel, whoHandler }
}

/** Poll a predicate instead of sleeping on a guess — the suite shares a loaded machine. */
const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 30_000): Promise<void> => {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

describe('the upgrade-connect timeout', () => {
  let tp: TestProjectOneClient
  let points: ReturnType<typeof buildClientPoints>

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    // from here on this test process acts as the browser — the spawned server child kept its own side
    process.env.POINT0_SIDE = 'client'
    points = buildClientPoints(tp.serverPort)
    ClientPoints.mount([points.root, points.stallChannel, points.whoHandler] as never)
  })

  afterAll(async () => {
    delete process.env.POINT0_SIDE
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('a handshake that neither completes nor fails is cut at 5 s and the connect lands on the ticket path', async () => {
    const startedAt = Date.now()
    const connection = points.stallChannel.connect({ userId: 'stall' }, { upgradable: true })
    try {
      await waitFor(() => connection.status === 'open', 'the connection to open through the fallback')
      const elapsed = Date.now() - startedAt
      // the upgrade attempt got the full `upgradeTimeout` and not a moment more: nothing on the socket ever
      // resolved it, so the client's own timer is the only thing that could have
      expect(elapsed).toBeGreaterThanOrEqual(4800)
      expect(elapsed).toBeLessThan(14_000)
      // and what landed is the SECOND connect the server ran — the ticket path's plain POST. The first one is still
      // sitting in its stall, which is the whole point: the fallback did not wait for it
      const answer = (await points.whoHandler(connection).sendToServer()) as { me: string; attempt: number }
      expect(answer).toEqual({ me: 'user-stall', attempt: 2 })
      expect(connection.id).toBeDefined()
    } finally {
      connection.disconnect()
      disconnectAll()
    }
  })
})
