/**
 * The postgres ready-made backplane adapter against a REAL Postgres — `POSTGRES_URL` when set, otherwise a probe of the
 * local default (`postgres://localhost:5432/postgres`); the whole describe skips when neither answers. What only a real
 * server can prove, proven here: the UNLOGGED tables are created on first use (`relpersistence = 'u'`), the KV TTL
 * rides the DATABASE clock, `DELETE … RETURNING` consumes a ticket exactly once, LISTEN/NOTIFY crosses two adapter
 * instances on separate connections (the cross-process story), long point0 room topics survive the 63-byte
 * channel-identifier cap without folding onto each other, and an oversized payload rides the spill table intact.
 * Dispose is asserted by its ownership rule: the passed-in `sql` keeps working after the adapter's dispose.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import postgres from 'postgres'
import { postgresBackplane } from '../src/backplane/postgres.js'

setDefaultTimeout(60_000)

const postgresUrl = process.env.POSTGRES_URL ?? 'postgres://localhost:5432/postgres'

const probeAvailable = async (): Promise<boolean> => {
  const probe = postgres(postgresUrl, { max: 1, connect_timeout: 3, onnotice: () => {} })
  try {
    await probe.unsafe('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await probe.end({ timeout: 1 }).catch(() => undefined)
  }
}
const available = await probeAvailable()

const TABLE_PREFIX = 'point0_bp_test'

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

describe.skipIf(!available)('postgres backplane over a real Postgres', () => {
  let sqlA: ReturnType<typeof postgres>
  let sqlB: ReturnType<typeof postgres>
  let a: ReturnType<typeof postgresBackplane>
  let b: ReturnType<typeof postgresBackplane>

  beforeAll(async () => {
    sqlA = postgres(postgresUrl, { max: 4, onnotice: () => {} })
    sqlB = postgres(postgresUrl, { max: 4, onnotice: () => {} })
    await sqlA.unsafe(`DROP TABLE IF EXISTS ${TABLE_PREFIX}_kv`)
    await sqlA.unsafe(`DROP TABLE IF EXISTS ${TABLE_PREFIX}_payload`)
    a = postgresBackplane(sqlA, { tablePrefix: TABLE_PREFIX })
    b = postgresBackplane(sqlB, { tablePrefix: TABLE_PREFIX })
  })

  afterAll(async () => {
    await a.dispose?.()
    await b.dispose?.()
    await sqlA.unsafe(`DROP TABLE IF EXISTS ${TABLE_PREFIX}_kv`)
    await sqlA.unsafe(`DROP TABLE IF EXISTS ${TABLE_PREFIX}_payload`)
    await sqlA.end({ timeout: 5 }).catch(() => undefined)
    await sqlB.end({ timeout: 5 }).catch(() => undefined)
  })

  it('creates its tables UNLOGGED on first use', async () => {
    await a.set('bootstrap', 'x')
    const rows = await sqlA.unsafe(
      `SELECT relname, relpersistence FROM pg_class WHERE relname IN ('${TABLE_PREFIX}_kv', '${TABLE_PREFIX}_payload') ORDER BY relname`,
    )
    expect(rows.map((row) => `${row.relname as string}:${row.relpersistence as string}`)).toEqual([
      `${TABLE_PREFIX}_kv:u`,
      `${TABLE_PREFIX}_payload:u`,
    ])
  })

  it('KV: database-clock TTL expires reads, getDelete consumes exactly once across instances', async () => {
    await a.set('plain', 'value')
    expect(await b.get('plain')).toBe('value')
    await a.delete('plain')
    expect(await b.get('plain')).toBeNull()

    await a.set('ttl', 'short-lived', 300)
    expect(await b.get('ttl')).toBe('short-lived')
    await sleep(700)
    expect(await b.get('ttl')).toBeNull()

    await a.set('ticket', 'claim-me', 30_000)
    // the claim races across "processes": whoever DELETE-RETURNINGs first wins, the other reads nothing
    expect(await a.getDelete?.('ticket')).toBe('claim-me')
    expect(await b.getDelete?.('ticket')).toBeNull()
  })

  it('the bus crosses instances, long room topics stay distinct, oversized payloads spill intact', async () => {
    const longPrefix = `point0:socket:room:root:chatChannel:chatSpace:${'x'.repeat(60)}`
    const channelA = `${longPrefix}:a`
    const channelB = `${longPrefix}:b`
    const receivedA: string[] = []
    const receivedB: string[] = []
    const unsubscribeA = await b.subscribe(channelA, (message) => receivedA.push(message))
    await b.subscribe(channelB, (message) => receivedB.push(message))

    await a.publish(channelA, 'inline message')
    await waitFor(() => receivedA.length === 1, 'the inline delivery')
    expect(receivedA).toEqual(['inline message'])
    // the sibling channel shares the first 63+ bytes — without hashing Postgres would fold them together
    expect(receivedB).toEqual([])

    const big = `big:${'y'.repeat(100_000)}`
    await a.publish(channelA, big)
    await waitFor(() => receivedA.length === 2, 'the spilled delivery')
    expect(receivedA[1]).toBe(big)

    if (typeof unsubscribeA === 'function') {
      unsubscribeA()
    }
    await sleep(200)
    await a.publish(channelA, 'after unsubscribe')
    await sleep(300)
    expect(receivedA).toHaveLength(2)
  })

  it('dispose leaves the passed-in sql usable', async () => {
    const sql = postgres(postgresUrl, { max: 2, onnotice: () => {} })
    const backplane = postgresBackplane(sql, { tablePrefix: TABLE_PREFIX })
    await backplane.set('dispose-check', 'x')
    await backplane.dispose?.()
    const rows = await sql.unsafe('SELECT 1 AS one')
    expect(rows[0]!.one).toBe(1)
    await sql.end({ timeout: 5 })
  })
})
