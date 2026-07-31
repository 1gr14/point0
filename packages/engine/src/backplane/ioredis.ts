/**
 * The ready-made socket backplane over an ioredis client — for apps that already run one (BullMQ neighbors, Sentinel
 * setups, custom TLS). The adapter carries ZERO dependencies: it is typed structurally against the handful of methods
 * it calls, and the docs tell you to install `ioredis` yourself. Requires Redis >= 6.2 (`GETDEL` — the atomic
 * cross-process ticket claim).
 *
 * ```ts
 * import { ioredisBackplane } from '@point0/engine/backplane/ioredis'
 *
 * server: {
 *   socket: true,
 *   backplane: async () => ioredisBackplane((await import('@/lib/redis')).redis),
 * }
 * ```
 *
 * KV + publishes ride the given client; the bus subscriptions ride a lazy `duplicate()` (a Redis connection in
 * subscriber mode cannot run regular commands), or the `subscriber` option if you hold one already. Reconnect
 * durability — the `Backplane` contract's one duty on the implementation — is ioredis's own documented behavior:
 * `autoResubscribe` (default `true`) re-subscribes every channel after a transport reconnect. Do not turn it off on the
 * subscriber connection.
 */
import type { Backplane } from '../config.js'
import { backplaneLogError } from './log.js'

/** The slice of an ioredis subscriber-mode client the adapter drives — structural, so ioredis is never imported. */
export type IoredisSubscriberLike = {
  subscribe: (channel: string) => Promise<unknown>
  unsubscribe: (channel: string) => Promise<unknown>
  on: (event: 'message', listener: (channel: string, message: string) => void) => unknown
  quit: () => Promise<unknown>
}

/** The slice of an ioredis client the adapter drives — structural, so ioredis is never imported. */
export type IoredisLike = {
  get: (key: string) => Promise<string | null>
  set: {
    (key: string, value: string): Promise<unknown>
    (key: string, value: string, px: 'PX', ttlMs: number): Promise<unknown>
  }
  getdel: (key: string) => Promise<string | null>
  del: (key: string) => Promise<unknown>
  publish: (channel: string, message: string) => Promise<unknown>
  duplicate: () => IoredisSubscriberLike
  quit: () => Promise<unknown>
}

/** Options of {@link ioredisBackplane} — a bring-your-own subscriber and the close-ownership opt-in. */
export type IoredisBackplaneOptions = {
  /**
   * Bring your own subscriber-mode connection instead of the lazy `client.duplicate()`. The adapter attaches one
   * permanent `'message'` listener to it (dispose does not remove it — it removes the subscriptions); it is closed on
   * `dispose` only under `closeClient` (you passed it in, you own it).
   */
  subscriber?: IoredisSubscriberLike
  /**
   * Close the PASSED-IN client (and a passed-in `subscriber`) on `dispose` too. Default `false` — the adapter only ever
   * closes what it created itself (the duplicated subscriber). Set it when the client exists solely for the backplane,
   * e.g. constructed inline in the `backplane` factory.
   */
  closeClient?: boolean
}

/**
 * Build a socket {@link Backplane} over an ioredis client. KV + publishes ride `client`; the bus subscriptions ride a
 * lazy `duplicate()` (or `options.subscriber`) with one shared `'message'` listener dispatching by channel. `getDelete`
 * is the native `GETDEL` — Redis >= 6.2. Reconnect re-subscription is ioredis's own `autoResubscribe` (default on).
 * Background failures (a detached unsubscribe or dispose) ride the ambient Point0 server logger.
 */
export const ioredisBackplane = (client: IoredisLike, options?: IoredisBackplaneOptions): Backplane => {
  const onError = backplaneLogError('ioredis')
  /** the duplicate the adapter itself created — the one connection `dispose` always owns */
  let createdSubscriber: IoredisSubscriberLike | undefined
  let subscriber: IoredisSubscriberLike | undefined
  // one 'message' listener on the subscriber connection, fanned out by channel — sets, because the contract allows
  // subscribing a channel more than once
  const listenersByChannel = new Map<string, Set<(message: string) => void>>()
  const getSubscriber = (): IoredisSubscriberLike => {
    if (!subscriber) {
      subscriber = options?.subscriber ?? ((createdSubscriber = client.duplicate()), createdSubscriber)
      subscriber.on('message', (channel, message) => {
        for (const listener of [...(listenersByChannel.get(channel) ?? [])]) {
          listener(message)
        }
      })
    }
    return subscriber
  }
  return {
    get: async (key) => await client.get(key),
    getDelete: async (key) => await client.getdel(key),
    set: async (key, value, ttlMs) => {
      if (ttlMs === undefined) {
        await client.set(key, value)
      } else {
        await client.set(key, value, 'PX', ttlMs)
      }
    },
    delete: async (key) => {
      await client.del(key)
    },
    publish: async (channel, message) => {
      await client.publish(channel, message)
    },
    subscribe: async (channel, onMessage) => {
      const connection = getSubscriber()
      const listeners = listenersByChannel.get(channel) ?? new Set()
      listeners.add(onMessage)
      listenersByChannel.set(channel, listeners)
      try {
        await connection.subscribe(channel)
      } catch (error) {
        listeners.delete(onMessage)
        if (listeners.size === 0) {
          listenersByChannel.delete(channel)
        }
        throw error
      }
      return () => {
        listeners.delete(onMessage)
        if (listeners.size === 0) {
          listenersByChannel.delete(channel)
          connection.unsubscribe(channel).catch((error: unknown) => {
            onError(`unsubscribe of "${channel}"`, error)
          })
        }
      }
    },
    dispose: async () => {
      listenersByChannel.clear()
      try {
        await createdSubscriber?.quit()
        if (options?.closeClient) {
          await options.subscriber?.quit()
          await client.quit()
        }
      } catch (error) {
        onError('dispose', error)
      }
    },
  }
}
