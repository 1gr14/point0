/**
 * The ioredis and node-redis ready-made backplane adapters against a REAL Redis — a throwaway `redis-server` this file
 * spawns itself (skipped when the binary is not installed), so the structural duck types AND the actual command mapping
 * (`SET PX`, `GETDEL`, pub/sub with a duplicated subscriber) are proven on the real wire, not a fake. Two adapter
 * instances share the server per case — a publish on one delivers to the other, the cross-process story in miniature.
 * Dispose is asserted by its OWNERSHIP rule: the passed-in client keeps working after the adapter's dispose closed the
 * duplicate it created.
 */
import { existsSync } from 'node:fs'
import * as nodeNet from 'node:net'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { Redis } from 'ioredis'
import { createClient } from 'redis'
import type { Backplane } from '../src/config.js'
import { ioredisBackplane } from '../src/backplane/ioredis.js'
import { nodeRedisBackplane } from '../src/backplane/node-redis.js'

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

const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 15_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** The first free port in the 64xx range — clear of the reconnect test's 6391-6489 window. */
const findFreePort = async (): Promise<number> => {
  for (let port = 6491; port <= 6589; port += 1) {
    const free = await new Promise<boolean>((resolve) => {
      const probe = nodeNet.createServer()
      probe.once('error', () => resolve(false))
      probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)))
    })
    if (free) {
      return port
    }
  }
  throw new Error('No free port in 6491-6589')
}

/** One shared contract run — everything a Backplane owes, driven through whichever adapter the case built. */
const runBackplaneContract = async ({
  a,
  b,
  keyPrefix,
}: {
  /** two instances over the same Redis — `a` publishes, `b` subscribes */
  a: Backplane
  b: Backplane
  keyPrefix: string
}): Promise<void> => {
  const key = (name: string): string => `${keyPrefix}:${name}`
  await a.set(key('plain'), 'value')
  expect(await a.get(key('plain'))).toBe('value')
  await a.delete(key('plain'))
  expect((await a.get(key('plain'))) ?? null).toBeNull()

  await a.set(key('ttl'), 'short-lived', 150)
  expect(await a.get(key('ttl'))).toBe('short-lived')
  await sleep(400)
  expect((await a.get(key('ttl'))) ?? null).toBeNull()

  await a.set(key('once'), 'ticket')
  expect(await a.getDelete?.(key('once'))).toBe('ticket')
  expect((await a.getDelete?.(key('once'))) ?? null).toBeNull()

  const received: string[] = []
  const unsubscribe = await b.subscribe(key('channel'), (message) => received.push(message))
  await a.publish(key('channel'), 'over the wire')
  await waitFor(() => received.length === 1, 'the cross-instance delivery')
  expect(received).toEqual(['over the wire'])
  if (typeof unsubscribe === 'function') {
    unsubscribe()
  }
  // the unsubscribe is asynchronous on the wire — poll by publishing and asserting nothing new lands
  await sleep(200)
  await a.publish(key('channel'), 'after unsubscribe')
  await sleep(300)
  expect(received).toEqual(['over the wire'])
}

describe.skipIf(redisServerBinary === undefined)('backplane adapters over a real Redis', () => {
  let server: ReturnType<typeof Bun.spawn> | undefined
  let url = ''

  beforeAll(async () => {
    const port = await findFreePort()
    url = `redis://127.0.0.1:${port}`
    server = Bun.spawn(
      [redisServerBinary as string, '--port', String(port), '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no'],
      { stdout: 'ignore', stderr: 'ignore' },
    )
    // PONG through Bun's own client — the server is really accepting commands
    await waitFor(() => true, 'noop')
    const probe = new Bun.RedisClient(url, { connectionTimeout: 1000 })
    const deadline = Date.now() + 15_000
    for (;;) {
      try {
        await probe.ping()
        break
      } catch {
        if (Date.now() > deadline) {
          throw new Error('Timed out waiting for the redis-server to answer PING')
        }
        await sleep(50)
      }
    }
    probe.close()
  })

  afterAll(async () => {
    server?.kill(9)
    await server?.exited
  })

  it('ioredis: the contract holds and dispose closes only the adapter-created duplicate', async () => {
    const clientA = new Redis(url)
    const clientB = new Redis(url)
    const a = ioredisBackplane(clientA)
    const b = ioredisBackplane(clientB)
    try {
      await runBackplaneContract({ a, b, keyPrefix: 'point0:test:ioredis' })
      await b.dispose?.()
      // the passed-in client survived the adapter's dispose — only the duplicated subscriber was quit
      await clientB.set('point0:test:ioredis:after-dispose', 'alive')
      expect(await clientB.get('point0:test:ioredis:after-dispose')).toBe('alive')
      await a.dispose?.()
    } finally {
      await clientA.quit().catch(() => undefined)
      await clientB.quit().catch(() => undefined)
    }
  })

  it('node-redis: the contract holds and dispose closes only the adapter-created duplicate', async () => {
    const clientA = await createClient({ url }).connect()
    const clientB = await createClient({ url }).connect()
    const a = nodeRedisBackplane(clientA)
    const b = nodeRedisBackplane(clientB)
    try {
      await runBackplaneContract({ a, b, keyPrefix: 'point0:test:node-redis' })
      await b.dispose?.()
      await clientB.set('point0:test:node-redis:after-dispose', 'alive')
      expect(await clientB.get('point0:test:node-redis:after-dispose')).toBe('alive')
      await a.dispose?.()
    } finally {
      await clientA.close()
      await clientB.close()
    }
  })
})
