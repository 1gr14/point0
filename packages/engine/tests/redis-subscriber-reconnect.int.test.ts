/**
 * The `redis://…` shortcut's bus subscriber against a LIVE Redis restart — the one backplane assumption no fake can
 * pin. The wrapper (`createResilientRedisSubscriber`, driven here through the production Bun glue
 * `createResilientBunRedisSubscriber`) owes the engine a subscription SET that survives a transport reconnect, and what
 * Bun's RedisClient actually does on one (verified on 1.3.14, and what this file keeps verified):
 *
 * - `onconnect` fires on EVERY successful (re)connect — it is the only reconnect signal there is;
 * - `onclose` does NOT fire for a drop the client is still retrying (it is terminal-only: an explicit `close()`, or a
 *   client that will not retry), so a replay armed on an observed close would never arm;
 * - the client does NOT restore subscriptions on its own — after a server restart the pub/sub state is simply gone;
 * - a second `subscribe` of a channel STACKS another listener (double delivery), so the replay must
 *   unsubscribe-then-subscribe.
 *
 * The scenario: subscribe three channels, publish (delivered), SIGKILL the server, restart it on the same port, publish
 * again (delivered again — the registry was replayed, and exactly once each — no listener stacked), subscribe a fourth
 * channel dynamically after the restart (works), unsubscribe one channel (goes silent while its sibling still
 * delivers). Every wait is a predicate poll — on a PONG, on `connected`, on the server-side `PUBSUB CHANNELS` list, on
 * a delivery — never a bare sleep.
 *
 * Unlike socket-redis.int.test.ts and the real-Redis block in socket-backplane.int.test.ts (gated on `REDIS_URL` — a
 * shared live instance they only read and publish through), this file KILLS its server, so it spawns its own
 * `redis-server` on a free 63xx port and is gated on the binary being installed: without one the whole describe skips,
 * which is the clean CI posture (CI has no Redis).
 */
import { existsSync } from 'node:fs'
import * as nodeNet from 'node:net'
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { RedisClient } from 'bun'
import { createResilientBunRedisSubscriber } from '../src/backplane/bun-redis.js'

setDefaultTimeout(60_000)

const redisServerBinary =
  Bun.which('redis-server') ??
  [
    '/opt/homebrew/opt/redis/bin/redis-server',
    '/opt/homebrew/bin/redis-server',
    '/usr/local/opt/redis/bin/redis-server',
    '/usr/local/bin/redis-server',
    '/usr/bin/redis-server',
  ].find((candidate) => existsSync(candidate))

/** Wait for a CONDITION, never for a duration — a loaded machine may only make the test slower, never red. */
const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  what: string,
  timeoutMs = 15_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/** The first free port in the 63xx range (6390 is skipped — a long-lived local instance may own it). */
const findFreePort = async (): Promise<number> => {
  for (let port = 6391; port <= 6489; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = nodeNet.createServer()
      probe.once('error', () => resolve(false))
      probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)))
    })
    if (free) {
      return port
    }
  }
  throw new Error('No free port in 6391-6489')
}

describe.skipIf(redisServerBinary === undefined)('redis subscriber reconnect (killed-and-restarted real Redis)', () => {
  /** every server this file ever spawned and has not yet seen exit — the afterAll safety net kills the survivors */
  const liveServers = new Set<ReturnType<typeof Bun.spawn>>()

  const startRedisServer = (port: number): ReturnType<typeof Bun.spawn> => {
    const proc = Bun.spawn(
      // no persistence: nothing to fsync, nothing left behind, and a SIGKILL loses nothing the test cares about
      [redisServerBinary as string, '--port', String(port), '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no'],
      { stdout: 'ignore', stderr: 'ignore' },
    )
    liveServers.add(proc)
    void proc.exited.then(() => liveServers.delete(proc))
    return proc
  }

  /** PONG through a one-shot client (no retries, no offline queue) — the server is REALLY accepting commands. */
  const waitForPong = async (url: string): Promise<void> => {
    await waitFor(async () => {
      const probe = new RedisClient(url, { autoReconnect: false, enableOfflineQueue: false, connectionTimeout: 1000 })
      try {
        await probe.connect()
        await probe.ping()
        return true
      } catch {
        return false
      } finally {
        probe.close()
      }
    }, 'the redis-server to answer PING')
  }

  afterAll(async () => {
    for (const proc of [...liveServers]) {
      proc.kill(9)
      await proc.exited
    }
  })

  it('the wrapper replays its whole registry over a live restart — delivered exactly once, dynamics and unsubscribe intact', async () => {
    const port = await findFreePort()
    const url = `redis://127.0.0.1:${port}`
    let server = startRedisServer(port)
    const clients: RedisClient[] = []
    try {
      await waitForPong(url)

      // the production shape, exactly: one main client (KV + publishes), the bus subscriber its duplicate(), wrapped
      // by the same glue resolveBackplane uses
      const main = new RedisClient(url)
      clients.push(main)
      const raw = await main.duplicate()
      clients.push(raw)
      const errors: string[] = []
      const wrapper = createResilientBunRedisSubscriber(raw, (what, error) => errors.push(`${what}: ${String(error)}`))

      const runId = crypto.randomUUID()
      const channel = (name: string): string => `point0:test:${runId}:${name}`
      const deliveries = new Map<string, string[]>()
      const track = (name: string): ((message: string) => void) => {
        const list: string[] = []
        deliveries.set(name, list)
        return (message) => list.push(message)
      }
      const delivered = (name: string): string[] => deliveries.get(name) ?? []

      const unsubscribeAlpha = await wrapper.subscribe(channel('alpha'), track('alpha'))
      await wrapper.subscribe(channel('beta'), track('beta'))
      await wrapper.subscribe(channel('gamma'), track('gamma'))

      // the subscriptions are live: one publish per channel arrives
      for (const name of ['alpha', 'beta', 'gamma']) {
        await main.publish(channel(name), 'first')
      }
      await waitFor(
        () => ['alpha', 'beta', 'gamma'].every((name) => delivered(name).includes('first')),
        'the pre-restart deliveries',
      )

      // SIGKILL — no goodbye on the wire, the subscriber must notice the drop on its own
      server.kill(9)
      await server.exited
      await waitFor(() => !raw.connected, 'the subscriber to observe the drop')

      // the SAME port comes back as a FRESH server: empty pub/sub state, so any subscription seen below was replayed
      server = startRedisServer(port)
      await waitForPong(url)
      await waitFor(() => raw.connected, 'the subscriber to reconnect')
      const inspect = new RedisClient(url)
      clients.push(inspect)
      const channelsOnServer = async (): Promise<string[]> =>
        (await inspect.send('PUBSUB', ['CHANNELS', `point0:test:${runId}:*`])) as string[]
      await waitFor(async () => (await channelsOnServer()).length === 3, 'the whole registry to land server-side')

      // the same channels deliver again — and exactly once per publish (no listener stacked during the replay)
      for (const name of ['alpha', 'beta', 'gamma']) {
        await main.publish(channel(name), 'second')
      }
      await waitFor(
        () => ['alpha', 'beta', 'gamma'].every((name) => delivered(name).includes('second')),
        'the post-restart deliveries',
      )

      // a DYNAMIC subscribe after the restart rides the reconnected client like any other
      await wrapper.subscribe(channel('delta'), track('delta'))
      await main.publish(channel('delta'), 'late')
      await waitFor(() => delivered('delta').includes('late'), 'the post-restart dynamic subscription to deliver')

      // the returned unsubscribe still works after all of that: alpha goes silent, its siblings keep delivering. The
      // sentinel bounds the wait — both publishes ride ONE connection, so once it arrived, the ghost had its chance.
      unsubscribeAlpha()
      await waitFor(
        async () => !(await channelsOnServer()).includes(channel('alpha')),
        'the unsubscribe to land server-side',
      )
      await main.publish(channel('alpha'), 'ghost')
      await main.publish(channel('beta'), 'sentinel')
      await waitFor(() => delivered('beta').includes('sentinel'), 'the sentinel publish')

      // the whole story, accounted exactly once — nothing lost, nothing doubled, nothing after an unsubscribe
      expect(delivered('alpha')).toEqual(['first', 'second'])
      expect(delivered('beta')).toEqual(['first', 'second', 'sentinel'])
      expect(delivered('gamma')).toEqual(['first', 'second'])
      expect(delivered('delta')).toEqual(['late'])
      expect(errors).toEqual([])
    } finally {
      for (const client of clients) {
        client.close()
      }
      for (const proc of [...liveServers]) {
        proc.kill(9)
        await proc.exited
      }
    }
  })
})
