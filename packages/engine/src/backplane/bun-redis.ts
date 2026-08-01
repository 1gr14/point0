/**
 * The ready-made socket backplane over Bun's BUILT-IN Redis client (`Bun.RedisClient`) — the same construction the
 * `redis://…` URL shortcut in the engine config resolves to, exported for when the client needs what a URL cannot
 * carry: custom TLS, timeouts, or an instance the app already holds. Zero dependencies — the client ships with Bun.
 *
 * ```ts
 * import { bunRedisBackplane } from '@point0/engine/backplane/bun-redis'
 *
 * server: {
 *   socket: true,
 *   backplane: () => bunRedisBackplane(new Bun.RedisClient(url, { tls: { … } }), { closeClient: true }),
 * }
 * ```
 *
 * Two connections on purpose: a Redis connection in subscriber mode cannot run regular commands, so the KV + publishes
 * ride the given client and the bus subscriptions a lazy `duplicate()` (or the `subscriber` option). The subscriber is
 * wrapped so the whole subscription SET survives a transport reconnect — the `Backplane` contract puts that duty on the
 * implementation, and Bun's client does not restore subscriptions on its own. `getDelete` maps onto the native `GETDEL`
 * (Redis >= 6.2) — the atomic cross-process ticket claim.
 */
import type { RedisClient } from 'bun'
import type { Backplane } from '../config.js'
import { backplaneLogError } from './log.js'

/**
 * The subscriber-side surface the resilient bus wrapper drives — a subscriber-mode Redis client reduced to what the
 * wrapper needs (`createResilientBunRedisSubscriber` adapts Bun's client onto it; the tests drive a fake through the
 * same seam). There is deliberately no close callback here: Bun's client fires `onclose` only for a TERMINAL close (an
 * explicit `close()`, or a reconnect it will not retry — e.g. `maxRetries: 0`), never for a drop it is still retrying,
 * so a close signal carries nothing the wrapper could act on.
 */
export type RedisSubscriberLike = {
  subscribe: (channel: string, listener: (message: string) => void) => Promise<unknown>
  unsubscribe: (channel: string) => Promise<unknown>
  /**
   * fired on every successful (re)connection — pinned against a killed-and-restarted real Redis in
   * redis-subscriber-reconnect.int.test.ts
   */
  onconnect: (() => void) | null
}

/**
 * Wrap a subscriber-mode Redis client so its subscription SET survives a transport reconnect. The `Backplane` contract
 * puts that duty on the implementation: the engine treats a settled `subscribe` as durable until it calls the returned
 * unsubscribe, and it cannot re-issue subscribes on transport blips it never sees — with the bus sharded over per-room
 * topics the set is many channels, not one eternal one. The wrapper keeps its own channel → listener registry (the
 * engine subscribes each channel once) and replays it on EVERY `onconnect`. Bun's client (verified on 1.3.14 against a
 * killed-and-restarted real Redis) fires `onconnect` on each successful (re)connect but does NOT fire `onclose` for a
 * drop it is still retrying — `onclose` is terminal-only — so arming the replay on an observed drop would never arm;
 * the initial `onconnect` replays an empty registry, a no-op. The replay defensively unsubscribes before it subscribes:
 * the client does not restore subscriptions on its own, a second `subscribe` of a channel STACKS another listener
 * (double delivery), and `unsubscribe(channel)` clears every listener of the channel. The defensive unsubscribe is
 * BEST-EFFORT: a fresh (re)connection starts in NORMAL mode until its first SUBSCRIBE lands, and Bun rejects
 * `unsubscribe` there SYNCHRONOUSLY (ERR_REDIS_INVALID_STATE) — there is nothing to clear on such a connection anyway.
 *
 * Every wire operation — a subscribe, an unsubscribe, a reconnect replay — runs on ONE serialized lane, and the
 * registry mutates inside the lane, because concurrency here is exactly how listeners stack: a replay racing an
 * in-flight first subscribe of the same channel would issue a second SUBSCRIBE (its defensive unsubscribe cannot
 * protect that window — the connection is still in normal mode), and two replays from an `onconnect` burst could
 * interleave one channel's unsubscribe/subscribe pairs. On the lane a replay only ever sees channels whose subscribe
 * has actually landed, and replays run back-to-back, whole.
 */
export const createResilientRedisSubscriber = (
  subscriber: RedisSubscriberLike,
  onError: (what: string, error: unknown) => void,
): { subscribe: (channel: string, onMessage: (message: string) => void) => Promise<() => void> } => {
  const listenersByChannel = new Map<string, (message: string) => void>()
  /** the serialized lane — a failed operation surfaces to ITS caller but never poisons the operations behind it */
  let tail: Promise<void> = Promise.resolve()
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation)
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
  /** best-effort: swallows both the sync normal-mode throw and an async rejection — see the docblock */
  const unsubscribeQuietly = async (channel: string): Promise<void> => {
    try {
      await subscriber.unsubscribe(channel)
    } catch {
      // nothing to clear
    }
  }
  subscriber.onconnect = () => {
    void enqueue(async () => {
      for (const [channel, listener] of [...listenersByChannel]) {
        // the registry may have shrunk while earlier channels resubscribed — an unsubscribed channel stays gone
        if (listenersByChannel.get(channel) !== listener) {
          continue
        }
        try {
          await unsubscribeQuietly(channel)
          await subscriber.subscribe(channel, listener)
        } catch (error) {
          onError(`resubscribe of "${channel}" after a reconnect`, error)
        }
      }
    })
  }
  return {
    subscribe: async (channel, onMessage) =>
      await enqueue(async () => {
        listenersByChannel.set(channel, onMessage)
        try {
          await subscriber.subscribe(channel, onMessage)
        } catch (error) {
          listenersByChannel.delete(channel)
          throw error
        }
        return () => {
          listenersByChannel.delete(channel)
          void enqueue(async () => await unsubscribeQuietly(channel))
        }
      }),
  }
}

/**
 * `createResilientRedisSubscriber` over Bun's own client — the exact glue `bunRedisBackplane` (and through it the
 * `redis://…` URL shortcut) wraps its subscriber-mode client in. Exported so the real-Redis reconnect test
 * (redis-subscriber-reconnect.int.test.ts) drives THIS code against a killed-and-restarted server, not a copy of it.
 */
export const createResilientBunRedisSubscriber = (
  raw: RedisClient,
  onError: (what: string, error: unknown) => void,
): { subscribe: (channel: string, onMessage: (message: string) => void) => Promise<() => void> } => {
  // a thin structural adapter — the resilient wrapper drives exactly this surface, and the test suite drives a fake
  // through the same seam
  const like: RedisSubscriberLike = {
    subscribe: (channel, listener) => raw.subscribe(channel, listener),
    unsubscribe: (channel) => raw.unsubscribe(channel),
    onconnect: null,
  }
  raw.onconnect = () => {
    like.onconnect?.()
  }
  return createResilientRedisSubscriber(like, onError)
}

/** Options of {@link bunRedisBackplane} — a bring-your-own subscriber and the close-ownership opt-in. */
export type BunRedisBackplaneOptions = {
  /**
   * Bring your own subscriber-mode connection instead of the lazy `client.duplicate()` — e.g. one you already hold. The
   * adapter still wraps it in the reconnect-resilient registry — which ASSIGNS the client's `onconnect` (don't set your
   * own on this client); it is closed on `dispose` only under `closeClient` (you passed it in, you own it).
   */
  subscriber?: RedisClient
  /**
   * Close the PASSED-IN client (and a passed-in `subscriber`) on `dispose` too. Default `false` — the adapter only ever
   * closes what it created itself (the duplicated subscriber). Set it when the client exists solely for the backplane,
   * e.g. constructed inline in the `backplane` factory.
   */
  closeClient?: boolean
}

/**
 * Build a socket {@link Backplane} over Bun's built-in Redis client. KV + publishes ride `client`; the bus subscriptions
 * ride a lazy `duplicate()` (or `options.subscriber`), wrapped so the subscription set survives a transport reconnect.
 * `getDelete` is the native `GETDEL` — Redis >= 6.2. Background failures (reconnect resubscribes, the detached dispose)
 * ride the ambient Point0 server logger.
 */
export const bunRedisBackplane = (client: RedisClient, options?: BunRedisBackplaneOptions): Backplane => {
  const onError = backplaneLogError('bun-redis')
  /** the duplicate the adapter itself created — the one connection `dispose` always owns */
  let createdSubscriber: RedisClient | undefined
  let subscriberPromise:
    Promise<{ subscribe: (channel: string, onMessage: (message: string) => void) => Promise<() => void> }> | undefined
  const getSubscriber = (): NonNullable<typeof subscriberPromise> => {
    subscriberPromise ??= (async () => {
      const raw =
        options?.subscriber ??
        (await (async () => {
          const duplicate = await client.duplicate()
          createdSubscriber = duplicate
          return duplicate
        })())
      return createResilientBunRedisSubscriber(raw, onError)
    })()
    return subscriberPromise
  }
  return {
    get: async (key) => await client.get(key),
    // native GETDEL — the atomic ticket claim across processes (Bun's client exposes the command directly)
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
      const subscriber = await getSubscriber()
      return await subscriber.subscribe(channel, onMessage)
    },
    dispose: async () => {
      // settle a mid-flight duplicate first, so a dispose racing the first subscribe still finds the connection
      await subscriberPromise?.catch(() => undefined)
      try {
        createdSubscriber?.close()
        if (options?.closeClient) {
          options.subscriber?.close()
          client.close()
        }
      } catch (error) {
        onError('dispose', error)
      }
    },
  }
}
