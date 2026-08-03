/**
 * The ready-made backplane adapters (`@point0/engine/backplane/*`) over FAKE clients — the command mapping, the lazy
 * subscriber duplication, the dispose ownership rule (close what the adapter created, never the passed-in client unless
 * `closeClient`), and the postgres adapter's absorbed Postgres limits: channel names hashed under the 63-byte
 * identifier cap, oversized notify payloads spilled through the payload table WITHOUT reordering delivery, KV TTLs
 * honored on reads before the sweeper catches up. The structural client types are pinned against the REAL libraries
 * (`postgres`, `ioredis`, `redis` — engine devDeps) by a never-called function at the bottom: `bun run types` fails if
 * an adapter's duck type drifts from what the real client actually looks like.
 */
import { describe, expect, it } from 'bun:test'
import { bunRedisBackplane } from '../src/backplane/bun-redis.js'
import { ioredisBackplane } from '../src/backplane/ioredis.js'
import { nodeRedisBackplane } from '../src/backplane/node-redis.js'
import { postgresBackplane } from '../src/backplane/postgres.js'

const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 5000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------------------------------- bun-redis

type FakeBunRedisSubscriber = {
  subscribe: (channel: string, listener: (message: string) => void) => Promise<void>
  unsubscribe: (channel: string) => Promise<void>
  onconnect: (() => void) | null
  close: () => void
  closed: boolean
}

const createFakeBunRedis = () => {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const kv = new Map<string, string>()
  const listenersByChannel = new Map<string, Set<(message: string) => void>>()
  const subscribers: FakeBunRedisSubscriber[] = []
  const makeSubscriber = (): FakeBunRedisSubscriber => {
    const subscriber: FakeBunRedisSubscriber = {
      subscribe: async (channel, listener) => {
        calls.push({ op: 'sub.subscribe', args: [channel] })
        const set = listenersByChannel.get(channel) ?? new Set()
        set.add(listener)
        listenersByChannel.set(channel, set)
      },
      unsubscribe: async (channel) => {
        calls.push({ op: 'sub.unsubscribe', args: [channel] })
        listenersByChannel.delete(channel)
      },
      onconnect: null,
      close: () => {
        calls.push({ op: 'sub.close', args: [] })
        subscriber.closed = true
      },
      closed: false,
    }
    subscribers.push(subscriber)
    return subscriber
  }
  const client = {
    closed: false,
    get: async (key: string) => {
      calls.push({ op: 'get', args: [key] })
      return kv.get(key) ?? null
    },
    getdel: async (key: string) => {
      calls.push({ op: 'getdel', args: [key] })
      const value = kv.get(key) ?? null
      kv.delete(key)
      return value
    },
    set: async (...args: unknown[]) => {
      calls.push({ op: 'set', args })
      kv.set(args[0] as string, args[1] as string)
    },
    del: async (key: string) => {
      calls.push({ op: 'del', args: [key] })
      kv.delete(key)
    },
    publish: async (channel: string, message: string) => {
      calls.push({ op: 'publish', args: [channel, message] })
      for (const listener of [...(listenersByChannel.get(channel) ?? [])]) {
        listener(message)
      }
    },
    duplicate: async () => {
      calls.push({ op: 'duplicate', args: [] })
      return makeSubscriber()
    },
    close: () => {
      calls.push({ op: 'close', args: [] })
      client.closed = true
    },
    onconnect: null as (() => void) | null,
  }
  return { client, calls, subscribers, makeSubscriber }
}

describe('bunRedisBackplane', () => {
  it('maps the KV + publish onto the client and duplicates a subscriber lazily, once', async () => {
    const fake = createFakeBunRedis()
    const backplane = bunRedisBackplane(fake.client as never)
    await backplane.set('k', 'v', 123)
    await backplane.set('k2', 'v2')
    expect(await backplane.get('k')).toBe('v')
    expect(await backplane.getDelete?.('k')).toBe('v')
    expect(await backplane.get('k')).toBeNull()
    await backplane.delete('k2')
    // no subscriber yet — KV traffic must not open a second connection
    expect(fake.calls.filter((call) => call.op === 'duplicate')).toHaveLength(0)
    const received: string[] = []
    await backplane.subscribe('point0:socket:bus', (message) => received.push(message))
    await backplane.subscribe('point0:socket:proc:x', () => {})
    expect(fake.calls.filter((call) => call.op === 'duplicate')).toHaveLength(1)
    await backplane.publish('point0:socket:bus', 'hello')
    await waitFor(() => received.length === 1, 'the published message')
    expect(received).toEqual(['hello'])
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k')?.args).toEqual(['k', 'v', 'PX', 123])
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k2')?.args).toEqual(['k2', 'v2'])
  })

  it('dispose closes the duplicated subscriber and only under closeClient the passed client too', async () => {
    const fake = createFakeBunRedis()
    const backplane = bunRedisBackplane(fake.client as never)
    await backplane.subscribe('c', () => {})
    await backplane.dispose?.()
    expect(fake.subscribers[0]?.closed).toBe(true)
    expect(fake.client.closed).toBe(false)

    const owned = createFakeBunRedis()
    const ownedBackplane = bunRedisBackplane(owned.client as never, { closeClient: true })
    await ownedBackplane.subscribe('c', () => {})
    await ownedBackplane.dispose?.()
    expect(owned.subscribers[0]?.closed).toBe(true)
    expect(owned.client.closed).toBe(true)
  })

  it('a provided subscriber is used instead of duplicate() and follows the closeClient rule', async () => {
    const fake = createFakeBunRedis()
    const subscriber = fake.makeSubscriber()
    const backplane = bunRedisBackplane(fake.client as never, { subscriber: subscriber as never })
    await backplane.subscribe('c', () => {})
    expect(fake.calls.filter((call) => call.op === 'duplicate')).toHaveLength(0)
    await backplane.dispose?.()
    // passed in — the app owns it
    expect(subscriber.closed).toBe(false)

    const owned = createFakeBunRedis()
    const ownedSubscriber = owned.makeSubscriber()
    const ownedBackplane = bunRedisBackplane(owned.client as never, {
      subscriber: ownedSubscriber as never,
      closeClient: true,
    })
    await ownedBackplane.subscribe('c', () => {})
    await ownedBackplane.dispose?.()
    expect(ownedSubscriber.closed).toBe(true)
    expect(owned.client.closed).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------------- ioredis

const createFakeIoredis = () => {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const kv = new Map<string, string>()
  const subscriptions = new Set<string>()
  let messageListener: ((channel: string, message: string) => void) | undefined
  const state = { clientQuit: false, subscriberQuit: false, duplicates: 0 }
  const subscriber = {
    subscribe: async (channel: string) => {
      calls.push({ op: 'sub.subscribe', args: [channel] })
      subscriptions.add(channel)
    },
    unsubscribe: async (channel: string) => {
      calls.push({ op: 'sub.unsubscribe', args: [channel] })
      subscriptions.delete(channel)
    },
    on: (_event: 'message', listener: (channel: string, message: string) => void) => {
      messageListener = listener
    },
    quit: async () => {
      state.subscriberQuit = true
    },
  }
  const client = {
    get: async (key: string) => kv.get(key) ?? null,
    set: async (...args: unknown[]) => {
      calls.push({ op: 'set', args })
      kv.set(args[0] as string, args[1] as string)
    },
    getdel: async (key: string) => {
      const value = kv.get(key) ?? null
      kv.delete(key)
      return value
    },
    del: async (key: string) => {
      kv.delete(key)
    },
    publish: async (channel: string, message: string) => {
      calls.push({ op: 'publish', args: [channel, message] })
      if (subscriptions.has(channel)) {
        messageListener?.(channel, message)
      }
    },
    duplicate: () => {
      state.duplicates += 1
      return subscriber
    },
    quit: async () => {
      state.clientQuit = true
    },
  }
  return { client, subscriber, calls, state, subscriptions }
}

describe('ioredisBackplane', () => {
  it('maps commands, duplicates once and lazily, dispatches messages by channel', async () => {
    const fake = createFakeIoredis()
    const backplane = ioredisBackplane(fake.client)
    await backplane.set('k', 'v', 500)
    await backplane.set('k2', 'v2')
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k')?.args).toEqual(['k', 'v', 'PX', 500])
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k2')?.args).toEqual(['k2', 'v2'])
    expect(await backplane.get('k')).toBe('v')
    expect(await backplane.getDelete?.('k')).toBe('v')
    expect(await backplane.get('k')).toBeNull()
    expect(fake.state.duplicates).toBe(0)
    const received: string[] = []
    const other: string[] = []
    const unsubscribe = await backplane.subscribe('a', (message) => received.push(message))
    await backplane.subscribe('b', (message) => other.push(message))
    expect(fake.state.duplicates).toBe(1)
    await backplane.publish('a', 'ma')
    await backplane.publish('b', 'mb')
    expect(received).toEqual(['ma'])
    expect(other).toEqual(['mb'])
    // last listener out unsubscribes the channel on the wire
    ;(unsubscribe as () => void)()
    await waitFor(() => !fake.subscriptions.has('a'), 'the wire unsubscribe')
    await backplane.publish('a', 'dropped')
    expect(received).toEqual(['ma'])
  })

  it('dispose quits the created duplicate and only under closeClient the passed client', async () => {
    const fake = createFakeIoredis()
    const backplane = ioredisBackplane(fake.client)
    await backplane.subscribe('a', () => {})
    await backplane.dispose?.()
    expect(fake.state.subscriberQuit).toBe(true)
    expect(fake.state.clientQuit).toBe(false)

    const owned = createFakeIoredis()
    const ownedBackplane = ioredisBackplane(owned.client, { closeClient: true })
    await ownedBackplane.subscribe('a', () => {})
    await ownedBackplane.dispose?.()
    expect(owned.state.subscriberQuit).toBe(true)
    expect(owned.state.clientQuit).toBe(true)
  })
})

// ---------------------------------------------------------------------------------------------------- node-redis

const createFakeNodeRedis = ({ v5close }: { v5close: boolean }) => {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const kv = new Map<string, string>()
  const listenersByChannel = new Map<string, Array<(message: string, channel: string) => void>>()
  const state = { connected: false, clientClosed: false, subscriberClosed: false, duplicates: 0 }
  let readyListener: (() => void) | undefined
  const subscriber = {
    connect: async () => {
      calls.push({ op: 'sub.connect', args: [] })
      state.connected = true
    },
    subscribe: async (channel: string, listener: (message: string, channel: string) => void) => {
      calls.push({ op: 'sub.subscribe', args: [channel] })
      const listeners = listenersByChannel.get(channel) ?? []
      listeners.push(listener)
      listenersByChannel.set(channel, listeners)
    },
    unsubscribe: async (channel: string) => {
      calls.push({ op: 'sub.unsubscribe', args: [channel] })
      listenersByChannel.delete(channel)
    },
    on: (_event: 'ready', listener: () => void) => {
      readyListener = listener
    },
    ...(v5close
      ? {
          close: () => {
            calls.push({ op: 'sub.close', args: [] })
            state.subscriberClosed = true
          },
        }
      : {
          quit: async () => {
            calls.push({ op: 'sub.quit', args: [] })
            state.subscriberClosed = true
          },
        }),
  }
  const client = {
    get: async (key: string) => kv.get(key) ?? null,
    set: async (key: string, value: string, options?: { PX?: number }) => {
      calls.push({ op: 'set', args: [key, value, options] })
      kv.set(key, value)
    },
    getDel: async (key: string) => {
      const value = kv.get(key) ?? null
      kv.delete(key)
      return value
    },
    del: async (key: string) => {
      kv.delete(key)
    },
    publish: async (channel: string, message: string) => {
      for (const listener of [...(listenersByChannel.get(channel) ?? [])]) {
        listener(message, channel)
      }
    },
    duplicate: () => {
      state.duplicates += 1
      return subscriber
    },
    ...(v5close
      ? {
          close: () => {
            state.clientClosed = true
          },
        }
      : {
          quit: async () => {
            state.clientClosed = true
          },
        }),
  }
  return {
    client,
    calls,
    state,
    listenersByChannel,
    emitReady: () => readyListener?.(),
  }
}

describe('nodeRedisBackplane', () => {
  it('maps commands ({ PX } set), connects a lazy duplicate, delivers and replays on ready', async () => {
    const fake = createFakeNodeRedis({ v5close: false })
    const backplane = nodeRedisBackplane(fake.client)
    await backplane.set('k', 'v', 700)
    await backplane.set('k2', 'v2')
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k')?.args[2]).toEqual({ PX: 700 })
    expect(fake.calls.find((call) => call.op === 'set' && call.args[0] === 'k2')?.args[2]).toBeUndefined()
    expect(await backplane.get('k')).toBe('v')
    expect(await backplane.getDelete?.('k')).toBe('v')
    expect(await backplane.get('k')).toBeNull()
    expect(fake.state.duplicates).toBe(0)
    const received: string[] = []
    const unsubscribe = await backplane.subscribe('a', (message) => received.push(message))
    expect(fake.state.duplicates).toBe(1)
    expect(fake.state.connected).toBe(true)
    await backplane.publish('a', 'ma')
    expect(received).toEqual(['ma'])
    // a reconnect 'ready' replays the registry — the defensive unsubscribe/subscribe pair, exactly once per channel
    const subscribesBefore = fake.calls.filter((call) => call.op === 'sub.subscribe').length
    fake.emitReady()
    await waitFor(
      () => fake.calls.filter((call) => call.op === 'sub.subscribe').length === subscribesBefore + 1,
      'the ready replay',
    )
    expect(fake.calls.filter((call) => call.op === 'sub.unsubscribe').length).toBe(1)
    await backplane.publish('a', 'mb')
    expect(received).toEqual(['ma', 'mb'])
    ;(unsubscribe as () => void)()
    await waitFor(() => !fake.listenersByChannel.has('a'), 'the wire unsubscribe')
    await backplane.publish('a', 'dropped')
    expect(received).toEqual(['ma', 'mb'])
  })

  it('dispose closes the created duplicate (v4 quit and v5 close) and the client only under closeClient', async () => {
    for (const v5close of [false, true]) {
      const fake = createFakeNodeRedis({ v5close })
      const backplane = nodeRedisBackplane(fake.client)
      await backplane.subscribe('a', () => {})
      await backplane.dispose?.()
      expect(fake.state.subscriberClosed).toBe(true)
      expect(fake.state.clientClosed).toBe(false)

      const owned = createFakeNodeRedis({ v5close })
      const ownedBackplane = nodeRedisBackplane(owned.client, { closeClient: true })
      await ownedBackplane.subscribe('a', () => {})
      await ownedBackplane.dispose?.()
      expect(owned.state.clientClosed).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------------------------- postgres

const createFakeSql = () => {
  const queries: Array<{ query: string; params: unknown[] | undefined }> = []
  const kv = new Map<string, { value: string; expiresAt: number | null }>()
  const payloads = new Map<string, string>()
  let nextPayloadId = 1
  const listeners = new Map<string, Set<(payload: string) => void>>()
  const unlistenCalls: string[] = []
  const state = { ended: false, payloadFetchDelayMs: 0 }
  const sql = {
    unsafe: async (query: string, params?: (string | number | null)[]) => {
      queries.push({ query, params })
      if (query.startsWith('CREATE UNLOGGED TABLE')) {
        return []
      }
      if (query.includes('SELECT value FROM')) {
        const row = kv.get(params![0] as string)
        if (!row || (row.expiresAt !== null && row.expiresAt <= Date.now())) {
          return []
        }
        return [{ value: row.value }]
      }
      if (query.includes('_kv') && query.startsWith('INSERT INTO')) {
        const secs = params![2]
        kv.set(params![0] as string, {
          value: params![1] as string,
          expiresAt: secs == null ? null : Date.now() + (secs as number) * 1000,
        })
        return []
      }
      if (query.includes('RETURNING value')) {
        const row = kv.get(params![0] as string)
        kv.delete(params![0] as string)
        if (!row) {
          return []
        }
        return [{ value: row.value, live: row.expiresAt === null || row.expiresAt > Date.now() }]
      }
      if (query.includes('_kv') && query.includes('WHERE key')) {
        kv.delete(params![0] as string)
        return []
      }
      if (query.includes('_payload') && query.startsWith('INSERT INTO')) {
        const id = String(nextPayloadId++)
        payloads.set(id, params![0] as string)
        return [{ id }]
      }
      if (query.includes('SELECT message FROM')) {
        if (state.payloadFetchDelayMs > 0) {
          await sleep(state.payloadFetchDelayMs)
        }
        const message = payloads.get(String(params![0]))
        return message === undefined ? [] : [{ message }]
      }
      // the sweep deletes
      return []
    },
    listen: async (channel: string, onNotify: (payload: string) => void) => {
      const set = listeners.get(channel) ?? new Set()
      set.add(onNotify)
      listeners.set(channel, set)
      return {
        unlisten: async () => {
          unlistenCalls.push(channel)
          set.delete(onNotify)
        },
      }
    },
    notify: async (channel: string, payload: string) => {
      for (const listener of [...(listeners.get(channel) ?? [])]) {
        listener(payload)
      }
    },
    end: async () => {
      state.ended = true
    },
  }
  return { sql, queries, listeners, unlistenCalls, state }
}

describe('postgresBackplane', () => {
  it('creates the unlogged tables once on first use (and not at all with createTables: false)', async () => {
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql)
    await backplane.set('k', 'v')
    await backplane.get('k')
    const creates = fake.queries.filter(({ query }) => query.startsWith('CREATE UNLOGGED TABLE'))
    expect(creates).toHaveLength(2)
    expect(creates[0]!.query).toContain('point0_backplane_kv')
    expect(creates[1]!.query).toContain('point0_backplane_payload')
    await backplane.dispose?.()

    const bare = createFakeSql()
    const bareBackplane = postgresBackplane(bare.sql, { createTables: false })
    await bareBackplane.set('k', 'v')
    expect(bare.queries.some(({ query }) => query.startsWith('CREATE'))).toBe(false)
    await bareBackplane.dispose?.()
  })

  it('rejects an unsafe tablePrefix and uses a custom valid one', async () => {
    expect(() => postgresBackplane(createFakeSql().sql, { tablePrefix: 'point0; DROP TABLE users' })).toThrow(
      /invalid tablePrefix/,
    )
    expect(() => postgresBackplane(createFakeSql().sql, { tablePrefix: 'x'.repeat(56) })).toThrow(/invalid tablePrefix/)
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql, { tablePrefix: 'myapp_bp' })
    await backplane.set('k', 'v')
    expect(fake.queries.some(({ query }) => query.includes('myapp_bp_kv'))).toBe(true)
    await backplane.dispose?.()
  })

  it('schema: rejects an unsafe one, creates it on first use, and qualifies every table reference', async () => {
    expect(() => postgresBackplane(createFakeSql().sql, { schema: 'point0; DROP SCHEMA public' })).toThrow(
      /invalid schema/,
    )
    expect(() => postgresBackplane(createFakeSql().sql, { schema: 'x'.repeat(64) })).toThrow(/invalid schema/)
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql, { schema: 'point0' })
    await backplane.set('k', 'v')
    expect(fake.queries[0]!.query).toBe('CREATE SCHEMA IF NOT EXISTS point0')
    expect(fake.queries.some(({ query }) => query.includes('point0.point0_backplane_kv'))).toBe(true)
    await backplane.dispose?.()

    // createTables: false skips the CREATE SCHEMA too, but references stay qualified
    const bare = createFakeSql()
    const bareBackplane = postgresBackplane(bare.sql, { schema: 'point0', createTables: false })
    await bareBackplane.set('k', 'v')
    expect(bare.queries.some(({ query }) => query.startsWith('CREATE'))).toBe(false)
    expect(bare.queries.some(({ query }) => query.includes('point0.point0_backplane_kv'))).toBe(true)
    await bareBackplane.dispose?.()
  })

  it('KV: TTL rides the database clock expression, expired rows read as missing, getDelete consumes once', async () => {
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql)
    await backplane.set('k', 'v', 30)
    // the ttl travels as SECONDS into make_interval — the fake mirrors the real SQL's parameter contract
    const insert = fake.queries.find(({ query }) => query.includes('_kv') && query.startsWith('INSERT INTO'))
    expect(insert?.query).toContain('make_interval')
    expect(insert?.params?.[2]).toBe(0.03)
    expect(await backplane.get('k')).toBe('v')
    await sleep(50)
    expect(await backplane.get('k')).toBeNull()
    await backplane.set('once', 'value')
    expect(await backplane.getDelete?.('once')).toBe('value')
    expect(await backplane.getDelete?.('once')).toBeNull()
    // an expired-but-unswept row is deleted by getDelete but reads as missing
    await backplane.set('stale', 'value', 5)
    await sleep(20)
    expect(await backplane.getDelete?.('stale')).toBeNull()
    await backplane.dispose?.()
  })

  it('hashes channel names under the 63-byte cap — long names with a shared prefix stay distinct', async () => {
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql)
    const prefix = `point0:socket:room:root:chatChannel:chatSpace:${'x'.repeat(40)}`
    const channelA = `${prefix}:a`
    const channelB = `${prefix}:b`
    const receivedA: string[] = []
    const receivedB: string[] = []
    await backplane.subscribe(channelA, (message) => receivedA.push(message))
    await backplane.subscribe(channelB, (message) => receivedB.push(message))
    const mapped = [...fake.listeners.keys()]
    expect(mapped).toHaveLength(2)
    for (const name of mapped) {
      expect(name).toMatch(/^p0_[0-9a-f]{48}$/)
      expect(Buffer.byteLength(name, 'utf8')).toBeLessThanOrEqual(63)
    }
    expect(mapped[0]).not.toBe(mapped[1])
    await backplane.publish(channelA, 'for-a')
    await waitFor(() => receivedA.length === 1, 'the channel-A delivery')
    expect(receivedA).toEqual(['for-a'])
    expect(receivedB).toEqual([])
    await backplane.dispose?.()
  })

  it('spills an oversized payload through the table and never lets a later small message overtake it', async () => {
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql)
    const received: string[] = []
    await backplane.subscribe('c', (message) => received.push(message))
    const big = `big:${'x'.repeat(8000)}`
    fake.state.payloadFetchDelayMs = 30
    await backplane.publish('c', big)
    await backplane.publish('c', 'small')
    await waitFor(() => received.length === 2, 'both deliveries')
    expect(received[0]).toBe(big)
    expect(received[1]).toBe('small')
    // the big one rode the payload table, the small one rode the notify inline
    expect(fake.queries.some(({ query }) => query.includes('_payload') && query.startsWith('INSERT INTO'))).toBe(true)
    await backplane.dispose?.()
  })

  it('unsubscribe unlistens; dispose stops the sweeper, unlistens leftovers and honors closeClient', async () => {
    const fake = createFakeSql()
    const backplane = postgresBackplane(fake.sql, { sweepIntervalMs: 20 })
    const unsubscribe = await backplane.subscribe('gone', () => {})
    ;(unsubscribe as () => void)()
    await waitFor(() => fake.unlistenCalls.length === 1, 'the unlisten')
    await backplane.subscribe('kept', () => {})
    await waitFor(
      () => fake.queries.some(({ query }) => query.includes('expires_at IS NOT NULL AND expires_at <= now()')),
      'a sweep',
    )
    await backplane.dispose?.()
    // the leftover subscription is unlistened by dispose's belt
    expect(fake.unlistenCalls).toHaveLength(2)
    expect(fake.state.ended).toBe(false)
    const sweepsAfterDispose = fake.queries.filter(({ query }) => query.includes('expires_at IS NOT NULL')).length
    await sleep(60)
    expect(fake.queries.filter(({ query }) => query.includes('expires_at IS NOT NULL')).length).toBe(sweepsAfterDispose)

    const owned = createFakeSql()
    const ownedBackplane = postgresBackplane(owned.sql, { closeClient: true })
    await ownedBackplane.set('k', 'v')
    await ownedBackplane.dispose?.()
    expect(owned.state.ended).toBe(true)
  })
})

// ------------------------------------------------------------------------------------------- real client types

/**
 * Never called — the adapters' structural client types must keep accepting the REAL clients. `bun run types` checks
 * this body against the real `postgres` / `ioredis` / `redis` typings (engine devDeps), so a duck-type drift fails the
 * build, not a user's install.
 */
const realClientTypesCheck = async (): Promise<void> => {
  const { default: postgres } = await import('postgres')
  postgresBackplane(postgres('postgres://localhost'))
  const { Redis } = await import('ioredis')
  ioredisBackplane(new Redis('redis://localhost'))
  const { createClient } = await import('redis')
  const client = createClient({ url: 'redis://localhost' })
  nodeRedisBackplane(await client.connect())
  bunRedisBackplane(new Bun.RedisClient('redis://localhost'))
}
void realClientTypesCheck
