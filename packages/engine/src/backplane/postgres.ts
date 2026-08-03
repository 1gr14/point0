/**
 * The ready-made socket backplane over Postgres via postgres.js (the `postgres` npm package) — real push, no Redis: the
 * bus rides `LISTEN`/`NOTIFY`, the KV an UNLOGGED table. The adapter carries ZERO dependencies: it is typed
 * structurally against the slice of `Sql` it calls, and the docs tell you to install `postgres` yourself.
 *
 * ```ts
 * import { postgresBackplane } from '@point0/engine/backplane/postgres'
 *
 * server: {
 *   socket: true,
 *   backplane: async () => postgresBackplane((await import('@/lib/sql')).sql),
 * }
 * ```
 *
 * Sharing the app's `sql` instance is fine — the KV rides the ordinary pool while postgres.js keeps ONE dedicated
 * connection for every `listen`, reconnects it with backoff and re-listens on its own, which is exactly the durability
 * the `Backplane` contract demands. The one requirement: a DIRECT connection — `LISTEN` does not survive a
 * transaction-mode pooler (PgBouncer/Supavisor), so point the backplane at the direct URL.
 *
 * Two Postgres limits the adapter absorbs so they cannot become production surprises:
 *
 * - **Channel names are identifiers, capped at 63 BYTES and silently truncated past that.** point0's sharded topics
 *   (`point0:socket:room:<scope>:<channel>:<space>:<room>`) easily run longer — truncation would fold different rooms
 *   onto one channel. Every channel is therefore mapped to `p0_<sha256-prefix>` (51 chars, identifier-safe) on BOTH the
 *   listen and the notify side; the mapping is pure, so every process computes the same name.
 * - **A NOTIFY payload is capped at ~8000 bytes.** A push carries user data, so a message over the threshold is spilled
 *   into a payload table and the notify carries just its id; subscribers fetch the row on delivery (in arrival order —
 *   a spill fetch never lets a later small message overtake). Spilled rows are swept after `payloadRetentionMs` — every
 *   process reads the same row, so delivery cannot delete it.
 *
 * The KV is one UNLOGGED table (crash-safe durability is exactly what this data does NOT need — records are
 * TTL-reclaimed anyway, and unlogged skips the WAL cost): `key`/`value`/`expires_at`, expiry computed on the DATABASE
 * clock (`now() + make_interval(…)`), so app-server clock skew cannot shorten or stretch a ticket's life. Reads treat
 * an expired-but-unswept row as missing; a periodic sweeper (interval `sweepIntervalMs`, unref'd) deletes expired KV
 * rows and aged payload rows. `getDelete` is `DELETE … RETURNING` — the atomic cross-process ticket claim. Both tables
 * are created on first use (`CREATE UNLOGGED TABLE IF NOT EXISTS` — turn it off with `createTables: false` and run the
 * SQL from the docs yourself when the app's DB role cannot create tables), in their own schema when the `schema` option
 * names one — the way to keep them out of the schema a migration tool (Prisma) diffs.
 */
import { createHash } from 'node:crypto'
import type { Backplane } from '../config.js'
import { backplaneLogError } from './log.js'

/** The slice of a postgres.js `Sql` instance the adapter drives — structural, so `postgres` is never imported. */
export type PostgresJsSqlLike = {
  /** parameterized text query — the KV, the sweeps AND the oversized-payload spill all ride this one method */
  unsafe: (query: string, parameters?: (string | number | null)[]) => PromiseLike<Record<string, unknown>[]>
  /** postgres.js LISTEN — its own dedicated connection, auto-reconnected and re-listened by the library */
  listen: (channel: string, onNotify: (payload: string) => void) => Promise<{ unlisten: () => Promise<unknown> }>
  /** postgres.js NOTIFY — the bus publish (rides the ordinary pool) */
  notify: (channel: string, payload: string) => PromiseLike<unknown>
  /** close the instance — called by the adapter only under `closeClient` */
  end: () => PromiseLike<unknown>
}

/** Options of {@link postgresBackplane} — table creation/naming, the sweeper cadence, and the close-ownership opt-in. */
export type PostgresBackplaneOptions = {
  /**
   * Create the two UNLOGGED tables on first use (`CREATE UNLOGGED TABLE IF NOT EXISTS`). Default `true`. Set `false`
   * when the app's DB role cannot create tables — run the SQL from the docs in your own migration instead.
   */
  createTables?: boolean
  /**
   * The schema the two tables live in — created on first use (`CREATE SCHEMA IF NOT EXISTS`) when `createTables` is on.
   * Default: none — the tables land in the connection's default schema (usually `public`). Give the backplane its own
   * schema (pg-boss style) when a migration tool diffs the app schema — Prisma's `migrate` reads foreign tables next to
   * its own as drift. Lowercase `[a-z_][a-z0-9_]*`, at most 63 characters; the factory throws synchronously on anything
   * else.
   */
  schema?: string
  /**
   * The tables' common name prefix — `<prefix>_kv` and `<prefix>_payload`. Default `'point0_backplane'`. Lowercase
   * `[a-z_][a-z0-9_]*`, at most 55 characters (55 + `_payload` = 63, exactly Postgres's identifier cap); the factory
   * throws synchronously on anything else.
   */
  tablePrefix?: string
  /** How often the sweeper deletes expired KV rows and aged payload rows, ms. Default `30_000`. */
  sweepIntervalMs?: number
  /**
   * How long a spilled bus payload row outlives its NOTIFY, ms. Default `60_000` — generous next to delivery, which
   * fetches within the notify's arrival.
   */
  payloadRetentionMs?: number
  /**
   * Close the PASSED-IN `sql` instance (`sql.end()`) on `dispose` too. Default `false` — the adapter only ever releases
   * what it created itself (its listens, the sweeper). Set it when the instance exists solely for the backplane, e.g.
   * constructed inline in the `backplane` factory.
   */
  closeClient?: boolean
  /**
   * Bus payloads over this many BYTES spill into the payload table instead of riding the NOTIFY inline (Postgres caps a
   * NOTIFY payload at ~8000 bytes). Default `7000` — headroom for the wire prefix under the cap; lower it only to trade
   * an extra fetch per message for smaller NOTIFY traffic.
   */
  spillThreshold?: number
}
/** wire prefixes on every notify payload — inline message vs spilled-row id */
const INLINE_PREFIX = 'i'
const REF_PREFIX = 'r'

/**
 * Map a point0 bus channel onto a Postgres-safe channel name: `p0_` + the first 48 hex chars of the SHA-256. Postgres
 * treats channel names as identifiers — 63-byte cap, silent truncation — while point0's room topics are long and carry
 * `:`; the hash is short, identifier-safe, and computed identically by every process.
 */
const postgresChannelName = (channel: string): string =>
  `p0_${createHash('sha256').update(channel).digest('hex').slice(0, 48)}`

/**
 * Build a socket {@link Backplane} over Postgres via postgres.js: `LISTEN`/`NOTIFY` bus (hashed channel names, oversized
 * payloads spilled through a table), UNLOGGED KV with database-clock TTLs, `DELETE … RETURNING` as the atomic
 * `getDelete`. Needs a DIRECT connection (no transaction-mode pooler) — see the module docblock. Background failures
 * (sweeps, notify deliveries — they run detached from any caller) ride the ambient Point0 server logger.
 */
export const postgresBackplane = (sql: PostgresJsSqlLike, options?: PostgresBackplaneOptions): Backplane => {
  const onError = backplaneLogError('postgres')
  const tablePrefix = options?.tablePrefix ?? 'point0_backplane'
  if (!/^[a-z_][a-z0-9_]*$/.test(tablePrefix) || tablePrefix.length > 55) {
    throw new Error(
      `postgresBackplane: invalid tablePrefix "${tablePrefix}" — lowercase [a-z_][a-z0-9_]*, at most 55 characters`,
    )
  }
  const schema = options?.schema
  if (schema !== undefined && (!/^[a-z_][a-z0-9_]*$/.test(schema) || schema.length > 63)) {
    throw new Error(`postgresBackplane: invalid schema "${schema}" — lowercase [a-z_][a-z0-9_]*, at most 63 characters`)
  }
  const kvTable = schema ? `${schema}.${tablePrefix}_kv` : `${tablePrefix}_kv`
  const payloadTable = schema ? `${schema}.${tablePrefix}_payload` : `${tablePrefix}_payload`
  const sweepIntervalMs = options?.sweepIntervalMs ?? 30_000
  const payloadRetentionMs = options?.payloadRetentionMs ?? 60_000

  let sweepTimer: ReturnType<typeof setInterval> | undefined
  const sweep = (): void => {
    void (async () => {
      try {
        await sql.unsafe(`DELETE FROM ${kvTable} WHERE expires_at IS NOT NULL AND expires_at <= now()`)
        await sql.unsafe(`DELETE FROM ${payloadTable} WHERE created_at <= now() - make_interval(secs => $1)`, [
          payloadRetentionMs / 1000,
        ])
      } catch (error) {
        onError('sweep', error)
      }
    })()
  }

  /** memoized first-use gate: tables + sweeper; reset on failure so a DB that was down at boot is retried */
  let readyPromise: Promise<void> | undefined
  const ready = (): Promise<void> => {
    readyPromise ??= (async () => {
      if (options?.createTables !== false) {
        if (schema) {
          await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
        }
        await sql.unsafe(
          `CREATE UNLOGGED TABLE IF NOT EXISTS ${kvTable} (key text PRIMARY KEY, value text NOT NULL, expires_at timestamptz)`,
        )
        await sql.unsafe(
          `CREATE UNLOGGED TABLE IF NOT EXISTS ${payloadTable} (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
        )
      }
      sweepTimer ??= setInterval(sweep, sweepIntervalMs)
      sweepTimer.unref()
    })().catch((error: unknown) => {
      readyPromise = undefined
      throw error
    })
    return readyPromise
  }

  // per-channel delivery lanes — a spilled payload is fetched asynchronously, and a later inline message must not
  // overtake it; the lane is dropped with the channel's last subscription (rooms churn without bound)
  const lanes = new Map<string, { tail: Promise<void>; subscribers: number }>()
  /** unlistens of the still-active subscriptions — dispose's belt over the engine's own unsubscribes */
  const activeUnlistens = new Set<() => Promise<unknown>>()

  return {
    get: async (key) => {
      await ready()
      const rows = await sql.unsafe(
        `SELECT value FROM ${kvTable} WHERE key = $1 AND (expires_at IS NULL OR expires_at > now())`,
        [key],
      )
      const value = rows[0]?.value
      return typeof value === 'string' ? value : null
    },
    set: async (key, value, ttlMs) => {
      await ready()
      // expiry on the DATABASE clock — app-server skew cannot shorten a ticket's life
      await sql.unsafe(
        `INSERT INTO ${kvTable} (key, value, expires_at)
         VALUES ($1, $2, CASE WHEN $3::double precision IS NULL THEN NULL ELSE now() + make_interval(secs => $3::double precision) END)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
        [key, value, ttlMs === undefined ? null : ttlMs / 1000],
      )
    },
    delete: async (key) => {
      await ready()
      await sql.unsafe(`DELETE FROM ${kvTable} WHERE key = $1`, [key])
    },
    // the atomic read-and-delete: the DELETE is the read, so two processes racing one ticket cannot both win; an
    // expired-but-unswept row is deleted but reads as missing
    getDelete: async (key) => {
      await ready()
      const rows = await sql.unsafe(
        `DELETE FROM ${kvTable} WHERE key = $1 RETURNING value, (expires_at IS NULL OR expires_at > now()) AS live`,
        [key],
      )
      const row = rows[0] as { value?: unknown; live?: unknown } | undefined
      return row?.live === true && typeof row.value === 'string' ? row.value : null
    },
    publish: async (channel, message) => {
      await ready()
      const mapped = postgresChannelName(channel)
      if (Buffer.byteLength(message, 'utf8') <= (options?.spillThreshold ?? 7000)) {
        await sql.notify(mapped, `${INLINE_PREFIX}${message}`)
        return
      }
      const rows = await sql.unsafe(`INSERT INTO ${payloadTable} (message) VALUES ($1) RETURNING id`, [message])
      const id = rows[0]?.id
      if (id === undefined || id === null) {
        throw new Error('postgresBackplane: payload INSERT returned no id')
      }
      // bigints arrive as strings from postgres.js — keep the id textual end-to-end
      await sql.notify(mapped, `${REF_PREFIX}${String(id)}`)
    },
    subscribe: async (channel, onMessage) => {
      await ready()
      const mapped = postgresChannelName(channel)
      const lane = lanes.get(mapped) ?? { tail: Promise.resolve(), subscribers: 0 }
      lane.subscribers += 1
      lanes.set(mapped, lane)
      const deliver = (payload: string): void => {
        lane.tail = lane.tail.then(async () => {
          try {
            if (payload.startsWith(INLINE_PREFIX)) {
              onMessage(payload.slice(1))
            } else if (payload.startsWith(REF_PREFIX)) {
              const id = payload.slice(1)
              const rows = await sql.unsafe(`SELECT message FROM ${payloadTable} WHERE id = $1`, [id])
              const message = rows[0]?.message
              if (typeof message === 'string') {
                onMessage(message)
              } else {
                onError(`spilled bus payload ${id} fetch`, new Error('payload row not found — swept before delivery?'))
              }
            }
            // any other prefix: not ours — foreign traffic on a colliding channel name, dropped
          } catch (error) {
            onError(`delivery on "${channel}"`, error)
          }
        })
      }
      let unlistened = false
      const { unlisten } = await sql.listen(mapped, deliver).catch((error: unknown) => {
        // a failed listen must leave no phantom lane behind — a fresh entry with no subscription would leak
        lane.subscribers -= 1
        if (lane.subscribers <= 0) {
          lanes.delete(mapped)
        }
        throw error
      })
      const unlistenOnce = async (): Promise<unknown> => {
        if (unlistened) {
          return undefined
        }
        unlistened = true
        activeUnlistens.delete(unlistenOnce)
        const current = lanes.get(mapped)
        if (current) {
          current.subscribers -= 1
          if (current.subscribers <= 0) {
            lanes.delete(mapped)
          }
        }
        return await unlisten()
      }
      activeUnlistens.add(unlistenOnce)
      return () => {
        unlistenOnce().catch((error: unknown) => {
          onError(`unlisten of "${channel}"`, error)
        })
      }
    },
    dispose: async () => {
      if (sweepTimer) {
        clearInterval(sweepTimer)
        sweepTimer = undefined
      }
      for (const unlisten of [...activeUnlistens]) {
        try {
          await unlisten()
        } catch (error) {
          onError('dispose unlisten', error)
        }
      }
      if (options?.closeClient) {
        try {
          await sql.end()
        } catch (error) {
          onError('dispose', error)
        }
      }
    },
  }
}
