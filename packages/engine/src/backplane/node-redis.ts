/**
 * The ready-made socket backplane over a node-redis client (the `redis` npm package, v4/v5) — for apps that already run
 * one. The adapter carries ZERO dependencies: it is typed structurally against the handful of methods it calls, and the
 * docs tell you to install `redis` yourself. Requires Redis >= 6.2 (`GETDEL` — the atomic cross-process ticket claim).
 * Pass a CONNECTED client — the adapter never calls `connect()` on what you hand it (the one exception: the subscriber
 * it duplicates itself, which it also connects itself).
 *
 * ```ts
 * import { nodeRedisBackplane } from '@point0/engine/backplane/node-redis'
 *
 * server: {
 *   socket: true,
 *   backplane: async () => nodeRedisBackplane((await import('@/lib/redis')).client),
 * }
 * ```
 *
 * KV + publishes ride the given client; the bus subscriptions ride a lazy `duplicate()` (pub/sub takes over a RESP2
 * connection), or the `subscriber` option if you hold one already. The subscriber is additionally wrapped in the
 * reconnect-resilient registry ({@link createResilientRedisSubscriber}), replayed on every `'ready'`: node-redis
 * restores pub/sub state after a reconnect on its own, but unlike ioredis it does not DOCUMENT that promise — the
 * wrapper makes the `Backplane` durability contract hold either way, at the cost of an unsubscribe/subscribe pair per
 * channel per reconnect (correct in both worlds: the defensive unsubscribe clears every listener of the channel, the
 * subscribe puts exactly one back).
 */
import type { Backplane } from '../config.js'
import { createResilientRedisSubscriber } from './bun-redis.js'
import { backplaneLogError } from './log.js'

/** The slice of a node-redis subscriber-mode client the adapter drives — structural, so `redis` is never imported. */
export type NodeRedisSubscriberLike = {
  connect: () => Promise<unknown>
  subscribe: (channel: string, listener: (message: string, channel: string) => void) => Promise<unknown>
  unsubscribe: (channel: string) => Promise<unknown>
  on: (event: 'ready', listener: () => void) => unknown
  /** v5's graceful close */
  close?: () => unknown
  /** v4's graceful close */
  quit?: () => Promise<unknown>
}

/** The slice of a node-redis client the adapter drives — structural, so `redis` is never imported. */
export type NodeRedisLike = {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, options?: { PX?: number }) => Promise<unknown>
  getDel: (key: string) => Promise<string | null>
  del: (key: string) => Promise<unknown>
  publish: (channel: string, message: string) => Promise<unknown>
  duplicate: () => NodeRedisSubscriberLike
  close?: () => unknown
  quit?: () => Promise<unknown>
}

/** Options of {@link nodeRedisBackplane} — a bring-your-own subscriber and the close-ownership opt-in. */
export type NodeRedisBackplaneOptions = {
  /**
   * Bring your own CONNECTED subscriber-mode connection instead of the lazy `client.duplicate()`. The adapter attaches
   * one permanent `'ready'` listener to it (the resubscribe replay; dispose does not remove it); it is closed on
   * `dispose` only under `closeClient` (you passed it in, you own it).
   */
  subscriber?: NodeRedisSubscriberLike
  /**
   * Close the PASSED-IN client (and a passed-in `subscriber`) on `dispose` too. Default `false` — the adapter only ever
   * closes what it created itself (the duplicated subscriber). Set it when the client exists solely for the backplane,
   * e.g. constructed inline in the `backplane` factory.
   */
  closeClient?: boolean
}

/** `close()` where it exists (v5), `quit()` otherwise (v4) — the graceful goodbye across both majors. */
const closeGracefully = async (connection: { close?: () => unknown; quit?: () => Promise<unknown> }): Promise<void> => {
  if (connection.close) {
    await connection.close()
  } else if (connection.quit) {
    await connection.quit()
  }
}

/**
 * Build a socket {@link Backplane} over a connected node-redis client (v4/v5). KV + publishes ride `client`; the bus
 * subscriptions ride a lazy connected `duplicate()` (or `options.subscriber`), wrapped in the reconnect-resilient
 * registry. `getDelete` is the native `GETDEL` — Redis >= 6.2. `set` uses the `{ PX }` option — the shape both v4 and
 * v5 accept. Background failures (reconnect resubscribes, the detached dispose) ride the ambient Point0 server logger.
 */
export const nodeRedisBackplane = (client: NodeRedisLike, options?: NodeRedisBackplaneOptions): Backplane => {
  const onError = backplaneLogError('node-redis')
  /** the duplicate the adapter itself created — the one connection `dispose` always owns */
  let createdSubscriber: NodeRedisSubscriberLike | undefined
  let subscriberPromise:
    | Promise<{ subscribe: (channel: string, onMessage: (message: string) => void) => Promise<() => void> }>
    | undefined
  const getSubscriber = (): NonNullable<typeof subscriberPromise> => {
    subscriberPromise ??= (async () => {
      const raw = options?.subscriber ?? ((createdSubscriber = client.duplicate()), createdSubscriber)
      // a thin structural adapter — the resilient wrapper installs its reconnect replay as `onconnect` on this
      // object, and the 'ready' listener (armed before the connect, so the initial no-op replay is the worst case)
      // routes the event to it
      const like: Parameters<typeof createResilientRedisSubscriber>[0] = {
        subscribe: (channel, listener) => raw.subscribe(channel, (message) => listener(message)),
        unsubscribe: (channel) => raw.unsubscribe(channel),
        onconnect: null,
      }
      const resilient = createResilientRedisSubscriber(like, onError)
      raw.on('ready', () => {
        like.onconnect?.()
      })
      if (raw === createdSubscriber) {
        await raw.connect()
      }
      return resilient
    })()
    return subscriberPromise
  }
  return {
    get: async (key) => await client.get(key),
    getDelete: async (key) => await client.getDel(key),
    set: async (key, value, ttlMs) => {
      if (ttlMs === undefined) {
        await client.set(key, value)
      } else {
        await client.set(key, value, { PX: ttlMs })
      }
    },
    delete: async (key) => {
      await client.del(key)
    },
    publish: async (channel, message) => {
      await client.publish(channel, message)
    },
    subscribe: async (channel, onMessage) => {
      const subscriber = await getSubscriber()
      return await subscriber.subscribe(channel, onMessage)
    },
    dispose: async () => {
      await subscriberPromise?.catch(() => undefined)
      try {
        if (createdSubscriber) {
          await closeGracefully(createdSubscriber)
        }
        if (options?.closeClient) {
          if (options.subscriber) {
            await closeGracefully(options.subscriber)
          }
          await closeGracefully(client)
        }
      } catch (error) {
        onError('dispose', error)
      }
    },
  }
}
