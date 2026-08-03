/**
 * The engine's socket server: the bare `websocket` endpoint (`GET /_point0/<scope>/websocket`, matched into its own
 * request variant and upgraded through the fetch pipeline's marker response), ticket claims (and the cold-start
 * GET+Upgrade connect), rooms as Bun's built-in pub/sub topics, message dispatch to serverHandlers, the participation
 * model (the server holds connection + rooms, NOTHING keyed by join input: a `join` runs `.joiner` and UNIONS the
 * admitted rooms in, a `leave` removes the rooms the client names, `.enroller`/`space.enroll` union from the server
 * side; every room subscribes its topic plus one space-wide topic), the admin surface (channel `kick` / `refresh` /
 * `amendIdentity` / `connections.*` and space `kick` / `enroll` / `memberships.*` — targets are the `$`-dictionary:
 * exact `connectionId`/`room` addresses plus sift `$identity`/`$room` selections), and the backplane — a Redis-shaped
 * KV (per-connection `{ scope, channel, identity }` and tickets, every record with a TTL) plus a bus SHARDED by topic
 * (exact-address pushes ride per-channel/space/room topics only the holding processes subscribe; commands and
 * selections ride the shared channel; answers ride the initiator's inbox — see the BUS_CHANNEL block) that carries
 * pushes, collected replies, counts, enumerations and admin commands across processes. In-memory by default (single
 * process).
 *
 * The connection carries an identity (frozen at connect, amendable by `amendIdentity`); rooms are NOT persisted — after
 * a socket death the client replays its joins (and the enrollments re-run at claim), so the KV stays small and the
 * admin surface enumerates participations from the live entries. A per-process ROOM INDEX (`entriesByRoom` /
 * `entriesBySpace`) makes room-addressed operations O(members), not O(connections).
 */
import {
  generateId,
  POINT0_ERROR_CODES_MAP,
  stringifyOrThrow,
  toKebabCase,
  type AnyPoint,
  type NiceServerPoints,
  type PointsScope,
  type ErrorPoint0,
  POINT0_INTERNAL_PATH_PREFIX,
  POINT0_WEBSOCKET_UPGRADE_HEADER,
  POINT0_WEBSOCKET_ENDPOINT_SEGMENT,
} from '@point0/core'
// The socket surface has ONE door — the main entry deliberately does not re-export it, so that an app without the
// feature strips the whole module out of its client bundle. See `@point0/core`'s socket.ts.
import {
  parseSocketClientFrame,
  registerSocketServerAdapter,
  type SocketWireLimits,
  unregisterSocketServerAdapter,
  type SocketAdminTarget,
  type SocketClientFrame,
  type SocketConnectionSnapshot,
  type SocketServerAdapter,
  type SocketServerFrame,
  type SocketServerPushArgs,
  type SocketServerPushTarget,
} from '@point0/core/socket'
// sift ships CJS with a default-only callable export — under our module resolution the namespace import needs the
// manual interop pick
import * as siftModule from 'sift'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { EngineServer } from './server.js'
import type { Backplane, BackplaneOptionsInput } from './config.js'
import { bunRedisBackplane } from './backplane/bun-redis.js'

export type SocketData = {
  __point0Socket?: {
    scope: PointsScope
    cids: Set<string>
    /** set on a cold-start GET+Upgrade socket — the cid whose stashed entry seed `handleOpen` installs and claims */
    pendingClaimCid?: string
    /** the frame budget window — see {@link EngineSocket.exceedsFrameBudget}; `claimed` marks which half it counts */
    frameBudget?: { windowStart: number; count: number; claimed: boolean }
  }
}

/**
 * One connection's participation in one space: the rooms it is in, however they got there (a client join, the
 * `.enroller`, an imperative `space.enroll`) — the server does not remember how. The join INPUT is ephemeral: it enters
 * the joiner, rooms come out, and it is forgotten (the client keeps inputs — they are its hook-dedup keys, like query
 * keys; the server model is connection + rooms, nothing else).
 */
type SpaceParticipation = {
  spacePoint: AnyPoint
  /** serialized room → parsed room (the space transformer's canonical string is the identity of a room) */
  rooms: Map<string, unknown>
}

/**
 * One TOPIC STREAM of a resumable channel — the unit of resume storage and numbering. A stream belongs to a TOPIC
 * (channel-wide, space-wide, room — keyed by the topic string in `EngineSocket.streams` — or the per-connection
 * PERSONAL stream living on its entry), never to a recipient: one copy of every frame, however many connections
 * subscribe. Process memory, born lazily with the first frame while the topic has subscribers, gone with the last
 * subscriber (a redeploy answers `gapless: false` for what it cannot vouch; the catch-up refetch covers the gap).
 */
type TopicStream = {
  /**
   * the DENSE per-stream counter — every frame of the stream consumes one, buffered or not (the gap proof). Bounded by
   * `Number.MAX_SAFE_INTEGER` (2^53−1), where `++` saturates instead of wrapping; it is incremented only in lockstep
   * with the process delivery clock, so `EngineSocket.deliveryClockSaturated` is the single honest signal for both, and
   * a saturated process answers every resume non-vouched rather than proving a gapless it can no longer number.
   */
  tseq: number
  /**
   * the buffered frames of opted-in handlers, tseq ascending — what a resume replays. `json` is the ready wire string
   * (tseq baked in); `stamp` is the process delivery counter the merge-replay orders by; `bytes` feeds the byte cap.
   */
  log: Array<{ tseq: number; stamp: number; handler: string; bytes: number; json: string }>
  logBytes: number
  /** log frames per handler — enforces each handler's own `resumable` ceiling without an O(log) walk per push */
  countByHandler: Map<string, number>
  /** the highest tseq of a frame NOT in the log (a non-opt-in handler's push) — a provable hole */
  maxNonBufferedTseq: number
  /** the highest tseq ever EVICTED from the log (a ceiling overflow) — a replay from at or below it has a hole */
  evictedMaxTseq: number
}

/**
 * The resolved buffer ceilings of one stream — the channel's `server.resume` group, space keys overriding for its
 * streams.
 */
type StreamCaps = {
  streamMaxFrames: number
  streamMaxBytes: number
}

type SocketConnectionEntry = {
  cid: string
  scope: PointsScope
  channelName: string
  channelPoint: AnyPoint
  identitySerialized: string
  /** the identity parsed once at claim — what sift matchers run against and what the open/close/leave events carry */
  identityParsed: unknown
  /** space name → the rooms this connection is in (one participation per space — no per-join bookkeeping) */
  spaces: Map<string, SpaceParticipation>
  /** the stored conn record as written — re-`set` on every ping to slide the TTL (rewritten by `amendIdentity`) */
  connJson: string
  connectionTtl: number
  /** the last TTL-slide write — a ping flood must not become a KV write flood (renews are floored to an interval) */
  lastRenewedAt: number
  /** unknown-mid reply forwards to the bus in the current window — a garbage flood must not become bus traffic */
  replyForwards: { windowStart: number; count: number }
  /** set once `pointChannelOpenServer` was emitted — cleanup emits the Close half only for an entry that opened */
  opened?: boolean
  /**
   * SHA-256 of the resume key (a resumable channel only) — the raw key lives with the client alone; the hash also rides
   * the KV record so any process can verify a resume. Compared in constant time.
   */
  resumeKeyHash?: string
  /**
   * SUBSCRIPTION EPOCHS of a resumable connection: topic string → the topic stream's `tseq` at the moment this
   * connection entered it (claim for the channel topic, join/enroll for room and space topics). The replay floor of a
   * stream is `max(client cursor, epoch)` — frames from before the connection subscribed are not its gap. Removed with
   * the room/space; a re-join re-stamps a fresh epoch. The personal stream needs none (born with the entry at zero).
   */
  streamEpochs?: Map<string, number>
  /**
   * the PERSONAL topic stream of a resumable connection — connection-addressed pushes (`connectionId` / `$identity`
   * selections). A topic with one subscriber, same machinery as the shared ones; dies with the entry.
   */
  personalStream?: TopicStream
  ws: Bun.ServerWebSocket<SocketData>
}

/**
 * A PARKED connection — a resumable connection whose socket died while its channel has buffering handlers: publicly it
 * is DEAD (removed from `connections`, the leave/close events fired, enumerations and admin skip it), but the room
 * index still holds its entry, which is what keeps its rooms' TOPIC STREAMS alive (the streams are the buffer — the
 * park itself buffers nothing) and its personal stream reachable for selection pushes; a resume inside the window
 * replays the streams (`gapless` provable per stream). The window is the channel's `server.resume.parkWindow`; on
 * expiry the entry leaves the index (releasing streams nobody else holds) — the KV record lives on to its own TTL, so a
 * later resume still works, replaying only what surviving streams can still prove.
 */
type ParkedConnection = {
  entry: SocketConnectionEntry
  timer: ReturnType<typeof setTimeout>
  /**
   * `left` frames a space kick queued while the connection was parked — the client still believes in the kicked rooms
   * and its ws is dead, so the revocation is delivered on unpark, right after the `resumed` answer and the replay
   * (exactly where a live kick's `left` would have landed). Dies with the park; a later KV restore simply restores the
   * already-shrunken passport.
   */
  pendingLeft: Array<SocketServerFrame & { t: 'left' }>
}

/** The stashed seed for a cold-start upgrade — everything `handleOpen` needs to build the entry sans the live socket. */
type PendingUpgrade = {
  cid: string
  scope: PointsScope
  channelName: string
  channelPoint: AnyPoint
  identitySerialized: string
  connJson: string
  connectionTtl: number
  timer: ReturnType<typeof setTimeout>
}

type PendingCollect = {
  mid: string
  /** how many replies close the window; `null` = unknowable (an external backplane) — only the timeout closes it */
  expected: number | null
  received: number
  /**
   * per-cid reply allowance — the protocol lets a client send any number of `reply` frames for a mid it saw, so the
   * window must not trust the count: EXACT per-cid expectations when the window was countable (a reply beyond a cid's
   * allowance is dropped), `null` when not (an external backplane) — then LOCAL cids stay exact via
   * `localAllowanceByCid` and only the remote ones fall back to `receivedByCid` vs `perCidCap` (duplicates within the
   * cap are the multi-process trust boundary; the schema validation still guards each reply's shape)
   */
  allowanceByCid: Map<string, number> | null
  /**
   * the LOCAL slice of the expectations — what `deliverPushLocal` actually sent to THIS process's sockets. Kept even
   * when the window is uncountable: local delivery is known exactly no matter how many processes share the backplane,
   * so a reply from a cid that lives here but received no frame is a forgery, not an unknown (see
   * {@link EngineSocket.landCollectedReply}). When the window IS countable this is the very map `allowanceByCid` owns
   * and this field goes unread.
   */
  localAllowanceByCid: Map<string, number>
  perCidCap: number
  receivedByCid: Map<string, number>
  /** excepted cids never legitimately reply (they receive the frame — excepts ride it — but must self-filter) */
  exceptConnectionIds: string[] | undefined
  /** the reply context from the push TARGET (a space handler) — carried onto every collected reply, not read per-reply */
  space: string | undefined
  room: string | undefined
  onReply: (reply: {
    cid: string
    data: string | undefined
    room: string | undefined
    space: string | undefined
  }) => void
  onDone: () => void
  timer: ReturnType<typeof setTimeout>
}

/** One `list`/`forEach` window: local items land immediately, bus answers stream in until the timeout closes it. */
type PendingConnectionsGather = {
  reqId: string
  onItem: (item: SocketConnectionSnapshot) => void
  onDone: () => void
  timer: ReturnType<typeof setTimeout>
}

/** One `count` window — numbers only ride the bus. */
type PendingCount = {
  reqId: string
  total: number
  timer: ReturnType<typeof setTimeout>
  resolve: (total: number) => void
}

type StoredTicket = {
  cid: string
  scope: PointsScope
  channel: string
  exp: number
}

type StoredConnection = {
  scope: PointsScope
  channel: string
  identity: string
  /**
   * the RESUME PASSPORT of a resumable channel's connection: the key hash (never the key) and the per-space rooms
   * (space name → serialized rooms; `resumable: false` spaces stay out). Written through on every room change —
   * join/leave/enroll/space-kick are rare next to messages — so any process can restore the connection from the record
   * alone. Absent on a non-resumable channel: its record stays exactly the connect→claim handoff.
   */
  resume?: {
    keyHash: string
    rooms: Record<string, string[]>
  }
}

/**
 * How a ticket claim refuses: the frame the client reads plus the `pointChannelClaimServerError` it emits. `reason`
 * says how far the claim got, `cid` rides along once the ticket resolved to a connection record (a refused ticket names
 * none — and the frame's cid stays empty either way, deliberately: no oracle).
 */
type ClaimFailFn = (message: string, code: string, reason: 'ticket' | 'connection' | 'channel', cid?: string) => void

/**
 * The serialized `$`-dictionary admin/enumeration selector on the wire — parts AND-combine. Bare keys are exact
 * addresses (`connectionId` cids, `rooms` full snapshots), `$`-keys became serialized sift matchers (`matcher` =
 * `$identity`, `roomMatcher` = `$room`).
 */
type AdminSelector = {
  scope: PointsScope
  channel: string
  /** the space name — a space selector (space kick / memberships.*); a channel selector leaves it undefined */
  space?: string | undefined
  matcher?: string | undefined
  roomMatcher?: string | undefined
  rooms?: string[] | undefined
  connectionId?: string[] | undefined
}

/**
 * One JSON message on the backplane bus. Envelopes are plain JSON; the payload fields inside (`input`, `data`,
 * matchers, rooms) are point-transformer-serialized strings — the receiving process resolves the channel point by name
 * and parses with the same transformer. `pid` filters out self-delivery (Redis pub/sub loops messages back to the
 * publisher, and so does the in-memory default). `v` guards rolling deploys sharing one bus.
 */
type BusEnvelope =
  | {
      v: 1
      kind: 'push'
      pid: string
      scope: PointsScope
      channel: string
      handler: string
      target: SocketServerPushTarget
      input?: string | undefined
      mid?: string | undefined
      /** set on a push published to SEVERAL topics (a multi-room target) — the receiver's dedup key */
      eid?: string | undefined
    }
  | {
      v: 1
      kind: 'reply'
      pid: string
      mid: string
      cid: string
      data?: string | undefined
      /** the replying client's `.clientReply` threw — counts toward the window, delivers nothing */
      error?: string | undefined
    }
  | { v: 1; kind: 'kick'; pid: string; selector: AdminSelector; reason?: string | undefined }
  /** grow the matching connections' enrolled membership of `selector.space` by `rooms` (`space.enroll`) */
  | { v: 1; kind: 'enroll'; pid: string; selector: AdminSelector; rooms: string[] }
  | { v: 1; kind: 'refresh'; pid: string; selector: AdminSelector }
  /** shallow-merge a patch into the stored identity of matching connections (`amendIdentity`) */
  | { v: 1; kind: 'amend'; pid: string; selector: AdminSelector; patch: string }
  | { v: 1; kind: 'connections-req'; pid: string; reqId: string; selector: AdminSelector }
  | { v: 1; kind: 'connections-res'; pid: string; reqId: string; items: SocketConnectionSnapshot[] }
  /** the numbers-only count scatter-gather — items never ride the bus for a `count` */
  | { v: 1; kind: 'count-req'; pid: string; reqId: string; selector: AdminSelector }
  | { v: 1; kind: 'count-res'; pid: string; reqId: string; count: number }

/**
 * One dynamic bus-topic subscription of this process (a channel/space/room topic — the shared channel and the inbox are
 * start()-owned and never in this map). `needs` is why the topic is held — one entry per index-derived reason
 * (`channel:…` / `space:…` / `room:…`), each a predicate over the live indexes; a release check prunes the reasons that
 * stopped holding and unsubscribes after the linger once none remain. `promise` settles when the backplane subscribe
 * settled — the joins/enrolls await it BEFORE indexing and confirming, so a push published right after the confirmation
 * already has a listening subscription (a failed subscribe logs, resolves, and leaves the map so a later need retries —
 * degraded delivery, same posture as a failed `start()`).
 */
type BusTopicSubscription = {
  promise: Promise<void>
  unsubscribe: (() => void) | undefined
  needs: Map<string, () => boolean>
  lingerTimer: ReturnType<typeof setTimeout> | undefined
}

/** A bus topic plus the reason a subscriber holds it — what `subscribeBusTopics` takes. */
type BusTopicNeed = {
  topic: string
  needKey: string
  stillNeeded: () => boolean
}

const rawSiftQueryTester = ((siftModule as { default?: unknown }).default ?? siftModule) as (
  query: unknown,
) => (item: unknown) => boolean

/** sift accepts a STRING `$where` and `new Function()`s it — a JSON-representable eval hole; refuse it deep. */
const assertNoWhereOperatorDeep = (matcher: unknown): void => {
  if (!matcher || typeof matcher !== 'object') {
    return
  }
  for (const [key, value] of Object.entries(matcher)) {
    if (key === '$where') {
      throw new Error('$where is not allowed in an identity/room matcher')
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        assertNoWhereOperatorDeep(item)
      }
    } else {
      assertNoWhereOperatorDeep(value)
    }
  }
}

// core rejects $where at the initiating call site, but a matcher also arrives over the backplane bus — every
// sift construction re-asserts, so a forged envelope cannot escalate to code execution
const siftQueryTester = (query: unknown): ((item: unknown) => boolean) => {
  assertNoWhereOperatorDeep(query)
  return rawSiftQueryTester(query)
}

/** Bun's `ws.send` status for a frame it threw away — the backpressure drop, or a socket that is already gone */
const SOCKET_SEND_DROPPED = 0
/** `ws.readyState` OPEN — what tells a backpressure drop apart from a send into an already closing socket */
const SOCKET_READY_STATE_OPEN = 1
/**
 * The close code a socket gets when a frame could not be delivered to it (the app-private 4000-4999 range, mirroring
 * RFC 6455's 1008 policy violation): "you fell behind, everything you missed is missed — reconnect and re-read".
 */
const SOCKET_BACKPRESSURE_CLOSE_CODE = 4008
const SOCKET_BACKPRESSURE_CLOSE_REASON = 'Socket backpressure'

// the process-wide infra floors and windows are the server `socket` option's object form —
// `EngineSocketServerOptions` (config.ts), read here via `this.server.socketOptions`, defaults applied there
/** the per-handler stream-buffer ceiling a clientHandler's `resumable: true` resolves to (a number names its own) */
const RESUME_HANDLER_BUFFER_DEFAULT = 128

/**
 * The backplane bus is SHARDED by topic — a process subscribes only to channels whose traffic it can deliver, instead
 * of every process reading (and mostly discarding) one shared stream:
 *
 * - the SHARED channel ({@link BUS_CHANNEL}, subscribed from start) carries the rare commands and everything that has no
 *   exact address: kick/refresh/amendIdentity/enroll, the count/connections scatter REQUESTS, and pushes with a
 *   selection part (`connectionId` / `$identity` / `$room` — a matcher resolves per process and cannot be laid out over
 *   topics; a cid names no room);
 * - the process INBOX (`point0:socket:proc:<pid>`, subscribed from start) carries every ANSWER — collected replies,
 *   `count-res`, `connections-res` — addressed straight back to the initiator: its pid rides the request envelope, and
 *   a collect mid is minted as `<pid>:<id>` so a reply forwarded from any process finds the initiator's inbox;
 * - a push with NO selection parts rides the topic of its exact address: the channel-wide topic, the space-wide topic, or
 *   one publish per targeted room topic. A process subscribes such a topic while it holds at least one live or PARKED
 *   connection the topic can address (first member in — awaited before the join/enroll is confirmed — last member out
 *   after the `busTopicLinger` option of no need), so its incoming traffic is its own.
 *
 * LOCAL FILTERING STAYS EVERYWHERE: every envelope carries its full target, and the receiving process matches it
 * against its own entries exactly as before. That is what keeps a `void`-subscribe implementation correct (it simply
 * broadcasts everything to everyone), makes a room-name hash collision harmless (an extra envelope to discard, not a
 * wrong delivery), and lets the shared channel keep understanding every envelope kind (a rolling deploy publishes
 * commands there for old and new nodes alike). The channel names are point0's concern and travel to the backplane as
 * arguments; a user implementation just routes what it is given (a future second consumer — cache invalidation, crons —
 * takes its own channels, never multiplexes these).
 */
const isStr = (value: unknown): value is string => typeof value === 'string'
const isOptStr = (value: unknown): value is string | undefined => value === undefined || typeof value === 'string'
const isStrArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isStr)
const isOptStrArray = (value: unknown): value is string[] | undefined => value === undefined || isStrArray(value)

/** An admin selector as it arrives on the bus: the addressing half of `kick` / `enroll` / `refresh` / the gathers. */
const isBusSelector = (value: unknown): value is AdminSelector => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const selector = value as Record<string, unknown>
  return (
    isStr(selector.scope) &&
    isStr(selector.channel) &&
    isOptStr(selector.space) &&
    isOptStr(selector.matcher) &&
    isOptStr(selector.roomMatcher) &&
    isOptStrArray(selector.rooms) &&
    isOptStrArray(selector.connectionId)
  )
}

/**
 * Parse ONE envelope off the bus — the {@link parseSocketClientFrame} of the backplane.
 *
 * The bus is infrastructure, not a client, so this is not a trust boundary in the same sense: whoever can publish here
 * can usually read the KV too. It is a SHAPE boundary all the same. These envelopes kick connections, rewrite stored
 * identities and answer with connection snapshots addressed to a topic the envelope itself names, and they arrive from
 * whatever else shares the Redis: an older point0 mid-deploy, a neighbouring app, a fuzzed key. A field is used only
 * once its type is known, and an envelope that does not match its `kind` never happened.
 */
const parseBusEnvelope = (parsed: unknown): BusEnvelope | undefined => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return undefined
  }
  const envelope = parsed as Record<string, unknown>
  if (envelope.v !== 1 || !isStr(envelope.pid)) {
    return undefined
  }
  const ok = ((): boolean => {
    switch (envelope.kind) {
      case 'push':
        return (
          isStr(envelope.scope) &&
          isStr(envelope.channel) &&
          isStr(envelope.handler) &&
          typeof envelope.target === 'object' &&
          envelope.target !== null &&
          !Array.isArray(envelope.target) &&
          isOptStr(envelope.input) &&
          isOptStr(envelope.mid) &&
          isOptStr(envelope.eid)
        )
      case 'reply':
        return isStr(envelope.mid) && isStr(envelope.cid) && isOptStr(envelope.data) && isOptStr(envelope.error)
      case 'kick':
        return isBusSelector(envelope.selector) && isOptStr(envelope.reason)
      case 'enroll':
        return isBusSelector(envelope.selector) && isStrArray(envelope.rooms)
      case 'refresh':
        return isBusSelector(envelope.selector)
      case 'amend':
        return isBusSelector(envelope.selector) && isStr(envelope.patch)
      case 'connections-req':
      case 'count-req':
        return isStr(envelope.reqId) && isBusSelector(envelope.selector)
      case 'connections-res':
        return isStr(envelope.reqId) && Array.isArray(envelope.items)
      case 'count-res':
        return isStr(envelope.reqId) && typeof envelope.count === 'number' && Number.isFinite(envelope.count)
      default:
        return false
    }
  })()
  return ok ? (envelope as BusEnvelope) : undefined
}

const BUS_CHANNEL = 'point0:socket:bus'
const BUS_PROC_TOPIC_PREFIX = 'point0:socket:proc:'
const BUS_ROOM_TOPIC_PREFIX = 'point0:socket:room:'
const BUS_SPACE_TOPIC_PREFIX = 'point0:socket:space:'
const BUS_CHANNEL_TOPIC_PREFIX = 'point0:socket:channel:'
/**
 * A room bus-topic name reuses the room's canonical serialization (serialization = identity) while it stays short, and
 * switches to its SHA-256 (base64url, 43 chars) past this length — pub/sub channel names must stay bounded. A hash
 * collision only merges two topics' traffic; the local target match filters the stranger's envelopes out.
 */
const BUS_ROOM_TOPIC_NAME_MAX = 128

/**
 * One live connection of THIS process, as `engine.socket.local.get()` reports it. The identity is PARSED — the very
 * value the events and the point-level `connections.local.list()` carry. Records are objects on purpose: a later field
 * (connected-at, remote address, …) is an addition, not a break.
 */
export type EngineSocketLocalConnection = {
  scope: PointsScope
  /** the channel point's name */
  channel: string
  connectionId: string
  /** the connection's identity, parsed with the channel's transformer */
  identity: unknown
}

/** One (connection, space) participation of THIS process — the rooms it holds in that space, parsed. */
export type EngineSocketLocalMembership = {
  scope: PointsScope
  /** the channel the space belongs to */
  channel: string
  /** the space point's name */
  space: string
  connectionId: string
  /** the rooms the connection is in within the space, parsed with the space's transformer */
  rooms: unknown[]
}

/**
 * A synchronous read of this PROCESS's socket floor — the server-side mirror of the client's `getSocket()`: plain
 * values, read once, no promises. Cluster-wide reads are the points' own `connections.server.*` /
 * `memberships.server.*` (they scatter-gather over the bus).
 */
export type EngineSocketLocalSnapshot = {
  /** distinct live WebSockets holding at least one claimed connection (one socket can carry several) */
  socketsCount: number
  /** distinct rooms held on this process — the size of the room index, across every scope and space */
  roomsCount: number
  /**
   * resumable connections currently PARKED on this process (socket died, streams still addressed inside the
   * `parkWindow`) — publicly dead, so they appear nowhere else in this snapshot
   */
  parkedCount: number
  /**
   * the resume TOPIC STREAMS of this process — the feature's main memory consumer, shared (channel/space/room) and
   * personal streams aggregated. `bytes` creeping toward the `server.resume` ceilings and a growing
   * `evictedFramesTotal` are the "buffers too small" signals: every eviction turns some client's future resume into an
   * honest `gapless: false` refetch
   */
  streams: {
    /** live stream objects (a stream is born with its first frame and dies with its last subscriber) */
    count: number
    /** buffered frames across every stream's log */
    frames: number
    /** buffered bytes across every stream's log (the serialized frames) */
    bytes: number
    /** frames evicted by the ceilings since the process started — cumulative, monotonic */
    evictedFramesTotal: number
  }
  connections: EngineSocketLocalConnection[]
  memberships: EngineSocketLocalMembership[]
}

/** The socket machinery's service state — for health checks. */
export type EngineSocketStatus = {
  /** the backplane bus subscription is up (a failed subscribe, or a disposed engine, reads `false`) */
  started: boolean
  /** how the backplane was configured: the in-process default, a Redis URL shortcut, or a supplied implementation */
  backplane: 'memory' | 'redis-url' | 'custom'
  /**
   * live backplane bus subscriptions this process holds: the shared channel and the process inbox (once started) plus
   * one per channel/space/room topic currently subscribed — the observable of the bus sharding (grows with the first
   * local member of a room, shrinks after the unsubscribe linger)
   */
  busSubscriptions: number
}

/** The public `engine.socket` surface — the introspection facade, never the raw {@link EngineSocket}. */
export type EngineSocketFacade = {
  local: {
    /** A synchronous snapshot of this process's socket floor. */
    get: () => EngineSocketLocalSnapshot
  }
  /** Bus + backplane service state. */
  status: () => EngineSocketStatus
}

/** How the `backplane` server option was configured — knowable without resolving the (possibly lazy) implementation. */
export const engineSocketBackplaneKind = (provided: BackplaneOptionsInput | null): EngineSocketStatus['backplane'] => {
  if (provided === null) {
    return 'memory'
  }
  return typeof provided === 'string' ? 'redis-url' : 'custom'
}

/** The snapshot `engine.socket.local.get()` answers before `prepare()` and with the socket off — empty, never a throw. */
const emptyEngineSocketLocalSnapshot = (): EngineSocketLocalSnapshot => ({
  socketsCount: 0,
  roomsCount: 0,
  parkedCount: 0,
  streams: { count: 0, frames: 0, bytes: 0, evictedFramesTotal: 0 },
  connections: [],
  memberships: [],
})

/**
 * Build the `engine.socket` facade over an engine server. Both getters are lazy: the facade exists from `Engine.create`
 * on, while the {@link EngineSocket} is only born at `prepare()` — before that (and with the `socket` server option off)
 * the helpers answer with the empty snapshot and `started: false` instead of throwing.
 */
export const createEngineSocketFacade = ({
  socket,
  backplane,
}: {
  socket: () => EngineSocket<any> | null | undefined
  backplane: () => BackplaneOptionsInput | null
}): EngineSocketFacade => ({
  local: {
    get: () => socket()?.localSnapshot() ?? emptyEngineSocketLocalSnapshot(),
  },
  status: () =>
    socket()?.status() ?? {
      started: false,
      backplane: engineSocketBackplaneKind(backplane()),
      busSubscriptions: 0,
    },
})

export class EngineSocket<TError extends ErrorPoint0> {
  private readonly server: EngineServer<true, TError>
  /** this process on the bus — self-published envelopes are dropped by this id */
  private readonly pid = generateId()
  private readonly connections = new Map<string, SocketConnectionEntry>()
  private readonly pendingCollects = new Map<string, PendingCollect>()
  private readonly pendingGathers = new Map<string, PendingConnectionsGather>()
  private readonly pendingCounts = new Map<string, PendingCount>()
  /** cold-start upgrade seeds, keyed by cid — installed on the matching socket's `handleOpen`, TTL-swept if unclaimed */
  private readonly pendingUpgrades = new Map<string, PendingUpgrade>()
  /**
   * bare `websocket`-endpoint upgrade tokens → scope — minted by the pipeline handler, TTL-swept if the handshake never
   * lands
   */
  private readonly pendingBareUpgrades = new Map<string, { scope: PointsScope; timer: ReturnType<typeof setTimeout> }>()
  /** tickets with a claim mid-flight — the synchronous one-time guard over the non-atomic KV get→delete pair */
  private readonly claimingTickets = new Set<string>()
  /** parked resumable connections by cid — dead publicly, still buffering; see {@link ParkedConnection} */
  private readonly parkedByCid = new Map<string, ParkedConnection>()

  /**
   * The SHARED topic streams of the resumable channels — channel-wide, space-wide and room streams, keyed by the same
   * topic string the pub/sub publish uses (personal streams live on their entries). Born lazily with the first frame
   * while the topic has at least one live-or-parked subscriber, released when the last subscriber leaves the matching
   * index — next to the bus-topic release, the indexes are the one subscriber truth.
   */
  private readonly streams = new Map<string, TopicStream>()

  /**
   * The process DELIVERY CLOCK — one monotonic counter across every stream of this process, stamped into each frame's
   * log entry (never the wire): the merge-replay of a resume orders the tails of all a connection's streams by it,
   * which is what preserves the total per-connection order across streams within a process epoch.
   *
   * Bounded by `Number.MAX_SAFE_INTEGER` (2^53−1) and it does not wrap: past the bound `++` STICKS on the same value,
   * so both the stamps and the per-stream `tseq` they travel with would silently stop advancing — the gapless formula
   * would then keep proving `true` over frames that were never numbered apart. The counter resets with the process, and
   * at a million frames a second the bound is ~285 years away, so this is a floor under the arithmetic rather than a
   * live concern; {@link deliveryClockSaturated} is what makes it honest if it ever arrives.
   */
  private deliveryStamp = 0

  /**
   * Set once the delivery clock reached `Number.MAX_SAFE_INTEGER` — the clock is dead and so is the numbering it feeds:
   * `stream.tseq` and `deliveryStamp` are incremented ONLY together (in {@link stampStreamFrame}), so `tseq` can never
   * outrun the stamp and this one flag covers every stream of the process. From then on every resume is answered
   * non-vouched (`gapless: false`, no replay) — the dangerous branch is a FALSE `gapless: true` telling a client
   * nothing was missed while frames it never saw kept reusing the same number.
   */
  private deliveryClockSaturated = false

  /**
   * Frames evicted from the stream logs by the ceilings since the process started — the observability counter behind
   * `localSnapshot().streams.evictedFramesTotal`: steady growth means the `server.resume` budgets are smaller than the
   * traffic, and resumes are degrading into honest `gapless: false` refetches.
   */
  private evictedFramesTotal = 0
  // the per-process room index: room-addressed operations (pushes, kicks, enumerations, collect expectations, topic
  // refcounts) walk the room's members, not every connection. Keys reuse the topic strings (canonical by the space
  // transformer's stable stringify).
  private readonly entriesByRoom = new Map<string, Set<SocketConnectionEntry>>()
  private readonly entriesBySpace = new Map<string, Set<SocketConnectionEntry>>()
  /** entries per (scope, channel) — live AND parked, like the room index; the channel bus-topic refcount */
  private readonly entriesByChannel = new Map<string, Set<SocketConnectionEntry>>()
  /** the dynamic bus-topic subscriptions (channel/space/room topics) — see {@link BusTopicSubscription} */
  private readonly busTopics = new Map<string, BusTopicSubscription>()
  /** recent multi-topic push envelope ids — the dedup memory (a Set for the lookup, a FIFO queue for the eviction) */
  private readonly seenEnvelopeIds = new Set<string>()
  private readonly seenEnvelopeIdQueue: string[] = []
  /**
   * The debug/rollback handle: publish every envelope to the shared channel and subscribe no dynamic topics — the
   * pre-sharding wire behavior. Fleet-wide by nature (a forced process does not listen on the topics an unforced one
   * publishes to), so set it on EVERY process sharing the backplane, exactly like a rolling deploy constraint.
   */
  private readonly forceSharedBus = process.env.POINT0_SOCKET_BUS_FORCE_SHARED === 'true'
  private backplanePromise: Promise<Backplane> | undefined
  private busStarted = false
  private busUnsubscribe: (() => void) | undefined
  private disposed = false
  private registeredScopes: PointsScope[] = []

  constructor({ server }: { server: EngineServer<true, TError> }) {
    this.server = server
  }

  /**
   * Register the publish adapter for every scope this server serves — core's server-side `sendToClient()`/admin surface
   * resolves it.
   */
  registerAdapters(): void {
    this.unregisterAdapters()
    this.registeredScopes = [this.server.scope, ...this.server.clients.map((client) => client.scope)]
    for (const scope of this.registeredScopes) {
      registerSocketServerAdapter(scope, this.adapter)
    }
    // the bus subscription must be eager: a lazy subscribe would silently drop envelopes published before this
    // process's first socket touch
    void this.start().catch((error) => {
      this.server.log({
        level: 'error',
        category: ['point0', 'socket'],
        message: 'Socket backplane subscribe failed',
        error,
      })
    })
  }

  unregisterAdapters(): void {
    for (const scope of this.registeredScopes) {
      unregisterSocketServerAdapter(scope)
    }
    this.registeredScopes = []
  }

  // the backplane — strings only; the point's transformer already did the serializing

  private hasExternalBackplane(): boolean {
    return this.server.backplaneProvided !== null
  }

  private async resolveBackplane(): Promise<Backplane> {
    const provided = this.server.backplaneProvided
    const config = typeof provided === 'function' ? await provided() : provided
    if (typeof config === 'string') {
      // the URL shortcut — the bun-redis adapter over Bun's built-in client. The client exists solely for the
      // backplane, so `closeClient` hands its lifecycle to the adapter's dispose. Errors ride the ambient Point0
      // server logger inside the adapter — the engine keeps it in sync with `this.server.log`.
      return bunRedisBackplane(new Bun.RedisClient(config), { closeClient: true })
    }
    if (config) {
      return config
    }
    // the in-memory default: TTL via unref'd timers; publish loops straight back to the channel's local subscribers
    // (the pid filter drops the echo — same behavior as Redis pub/sub, so both paths run identical code). Subscribers
    // are kept in a Map keyed by channel name, so a second consumer on its own channel never sees the bus traffic.
    const memory = new Map<string, { value: string; timer: ReturnType<typeof setTimeout> | undefined }>()
    const subscribersByChannel = new Map<string, Set<(message: string) => void>>()
    return {
      get: (key) => memory.get(key)?.value,
      // atomic by construction — one process, one turn of the loop between the read and the delete
      getDelete: (key) => {
        const previous = memory.get(key)
        if (previous?.timer) {
          clearTimeout(previous.timer)
        }
        memory.delete(key)
        return previous?.value
      },
      set: (key, value, ttlMs) => {
        const previous = memory.get(key)
        if (previous?.timer) {
          clearTimeout(previous.timer)
        }
        const timer =
          ttlMs === undefined
            ? undefined
            : setTimeout(() => {
                memory.delete(key)
              }, ttlMs)
        timer?.unref()
        memory.set(key, { value, timer })
      },
      delete: (key) => {
        const previous = memory.get(key)
        if (previous?.timer) {
          clearTimeout(previous.timer)
        }
        memory.delete(key)
      },
      publish: (channel, message) => {
        const subscribers = subscribersByChannel.get(channel)
        if (!subscribers) {
          return
        }
        for (const subscriber of [...subscribers]) {
          subscriber(message)
        }
      },
      subscribe: (channel, onMessage) => {
        const subscribers = subscribersByChannel.get(channel) ?? new Set()
        subscribers.add(onMessage)
        subscribersByChannel.set(channel, subscribers)
        return () => {
          subscribers.delete(onMessage)
          if (subscribers.size === 0) {
            subscribersByChannel.delete(channel)
          }
        }
      },
      // the TTL timers are unref'd, but a test process creating many engines should not accumulate them either
      dispose: () => {
        for (const { timer } of memory.values()) {
          if (timer) {
            clearTimeout(timer)
          }
        }
        memory.clear()
        subscribersByChannel.clear()
      },
    }
  }

  private async getBackplane(): Promise<Backplane> {
    this.backplanePromise ??= this.resolveBackplane()
    return await this.backplanePromise
  }

  /**
   * Subscribe the two start-owned bus channels — the shared command channel and this process's inbox. Idempotent;
   * kicked off eagerly by `registerAdapters`. The dynamic channel/space/room topics are not here: they follow the
   * connections ({@link subscribeBusTopics}).
   */
  async start(): Promise<void> {
    if (this.busStarted) {
      return
    }
    this.busStarted = true
    const unsubscribes: Array<() => void> = []
    try {
      const backplane = await this.getBackplane()
      for (const channel of [BUS_CHANNEL, this.procTopic()]) {
        const unsubscribe = await backplane.subscribe(channel, (message) => {
          this.handleBusMessage(message)
        })
        if (typeof unsubscribe === 'function') {
          unsubscribes.push(unsubscribe)
        }
      }
      this.busUnsubscribe = () => {
        for (const unsubscribe of unsubscribes) {
          unsubscribe()
        }
      }
    } catch (error) {
      // a failed subscribe must not read as started — the process would publish forever and never receive; a half
      // succeeded pair leaves nothing behind either
      for (const unsubscribe of unsubscribes) {
        unsubscribe()
      }
      this.busStarted = false
      throw error
    }
  }

  /** Fire-and-forget a backplane KV call — one flaky Redis op must not become an unhandled rejection. */
  private kvSafe(operation: () => void | Promise<unknown>, what: string): void {
    void (async () => {
      try {
        await operation()
      } catch (error) {
        this.server.log({
          level: 'error',
          category: ['point0', 'socket'],
          message: `Socket backplane ${what} failed`,
          error,
        })
      }
    })()
  }

  /** Publish one envelope to the given bus channels — the shared channel unless the caller routed it tighter. */
  private publishToBus(envelope: BusEnvelope, topics: string[] = [BUS_CHANNEL]): void {
    if (topics.length === 0) {
      return
    }
    void (async () => {
      try {
        const backplane = await this.getBackplane()
        const json = JSON.stringify(envelope)
        for (const topic of topics) {
          await backplane.publish(topic, json)
        }
      } catch (error) {
        this.server.log({
          level: 'error',
          category: ['point0', 'socket'],
          message: 'Socket backplane publish failed',
          error,
        })
      }
    })()
  }

  private handleBusMessage(raw: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    // the bus may carry anything — an older point0 sharing it, a neighbouring app on the same Redis, garbage. The
    // version gate is real, and the SHAPE gate behind it is the envelope's twin of the client wire's: these commands
    // kick connections, rewrite identities and answer with connection snapshots, so a field is used only once its
    // type is known
    const envelope = parseBusEnvelope(parsed)
    if (this.disposed || !envelope || envelope.pid === this.pid) {
      return
    }
    // a multi-topic push reaches a process once per topic it is subscribed to — the eid collapses the copies to one
    // delivery (and the local target match would absorb an eid that slipped past this window: one extra delivery of
    // an identical frame set is the failure mode, not a wrong recipient)
    if (envelope.kind === 'push' && envelope.eid !== undefined) {
      if (this.seenEnvelopeIds.has(envelope.eid)) {
        return
      }
      this.seenEnvelopeIds.add(envelope.eid)
      this.seenEnvelopeIdQueue.push(envelope.eid)
      if (this.seenEnvelopeIdQueue.length > this.server.socketOptions.busDedupSize) {
        const evicted = this.seenEnvelopeIdQueue.shift()
        if (evicted !== undefined) {
          this.seenEnvelopeIds.delete(evicted)
        }
      }
    }
    try {
      this.applyBusEnvelope(envelope)
    } catch (error) {
      // a malformed or hostile envelope must not take the bus subscriber down with it
      this.server.log({
        level: 'error',
        category: ['point0', 'socket'],
        message: 'Socket bus envelope handling failed',
        error,
      })
    }
  }

  private applyBusEnvelope(envelope: BusEnvelope): void {
    switch (envelope.kind) {
      case 'push': {
        // deliver to this process's sockets; replies from them flow back through handleReply → a 'reply' envelope
        const { expectedByCid } = this.deliverPushLocal({
          scope: envelope.scope,
          channel: envelope.channel,
          handler: envelope.handler,
          target: envelope.target,
          input: envelope.input,
          mid: envelope.mid,
        })
        // a collect push: remember what each local connection was actually sent — the forward authorization
        if (envelope.mid !== undefined && expectedByCid.size > 0) {
          this.rememberForwardAllowance(envelope.mid, expectedByCid)
        }
        return
      }
      case 'reply': {
        const pending = this.pendingCollects.get(envelope.mid)
        if (!pending) {
          return
        }
        this.landCollectedReply(pending, {
          cid: envelope.cid,
          data: envelope.data,
          error: envelope.error,
        })
        return
      }
      case 'kick': {
        this.kickLocal(envelope.selector, envelope.reason).catch((error: unknown) => {
          this.server.log({
            level: 'error',
            category: ['point0', 'socket'],
            message: 'Socket bus kick handling failed',
            error,
          })
        })
        return
      }
      case 'enroll': {
        this.enrollImperativeLocal(envelope.selector, envelope.rooms).catch((error: unknown) => {
          this.server.log({
            level: 'error',
            category: ['point0', 'socket'],
            message: 'Socket bus enroll handling failed',
            error,
          })
        })
        return
      }
      case 'refresh': {
        this.refreshLocal(this.matchLocal(envelope.selector))
        return
      }
      case 'amend': {
        this.amendLocal(envelope.selector, envelope.patch)
        return
      }
      case 'connections-req': {
        // the answer goes straight to the requester's inbox — its pid rides the request envelope
        const items = this.matchLocal(envelope.selector).map((entry) =>
          this.snapshotEntry(entry, envelope.selector.space),
        )
        this.publishToBus({ v: 1, kind: 'connections-res', pid: this.pid, reqId: envelope.reqId, items }, [
          this.procTopic(envelope.pid),
        ])
        return
      }
      case 'connections-res': {
        const gather = this.pendingGathers.get(envelope.reqId)
        if (gather) {
          for (const item of envelope.items) {
            gather.onItem(item)
          }
        }
        return
      }
      case 'count-req': {
        const count = this.matchLocal(envelope.selector).length
        this.publishToBus({ v: 1, kind: 'count-res', pid: this.pid, reqId: envelope.reqId, count }, [
          this.procTopic(envelope.pid),
        ])
        return
      }
      case 'count-res': {
        const pending = this.pendingCounts.get(envelope.reqId)
        if (pending) {
          pending.total += envelope.count
        }
        return
      }
    }
  }

  private ticketKey(ticket: string): string {
    return `point0:socket:ticket:${ticket}`
  }

  private connKey(cid: string): string {
    return `point0:socket:conn:${cid}`
  }

  // ------------------------------------------------------------------------------------------------------------
  // the sharded bus — topic names, the push router, and the dynamic subscription set (see the BUS_CHANNEL block)
  // ------------------------------------------------------------------------------------------------------------

  /** A process inbox — where every answer (collected replies, count/connections responses) is addressed. */
  private procTopic(pid = this.pid): string {
    return BUS_PROC_TOPIC_PREFIX + pid
  }

  private busChannelTopic(scope: PointsScope, channelName: string): string {
    return `${BUS_CHANNEL_TOPIC_PREFIX}${scope}:${channelName}`
  }

  private busSpaceTopic(scope: PointsScope, channelName: string, spaceName: string): string {
    return `${BUS_SPACE_TOPIC_PREFIX}${scope}:${channelName}:${spaceName}`
  }

  /** The room's canonical serialization IS the topic name — hashed past the length bound (collisions filter out). */
  private busRoomTopic(scope: PointsScope, channelName: string, spaceName: string, roomSerialized: string): string {
    const name =
      roomSerialized.length <= BUS_ROOM_TOPIC_NAME_MAX
        ? roomSerialized
        : createHash('sha256').update(roomSerialized).digest('base64url')
    return `${BUS_ROOM_TOPIC_PREFIX}${scope}:${channelName}:${spaceName}:${name}`
  }

  /**
   * Where a push envelope publishes. Any SELECTION part (`connectionId` / `$identity` / `$room`) rides the shared
   * channel — a matcher resolves per process against entries only that process can see, and a cid names no topic. An
   * exact address rides its own topic: the channel-wide one, the space-wide one, or one publish per targeted room —
   * only the processes holding a matching member are subscribed there.
   */
  private busTopicsForPushTarget(scope: PointsScope, channelName: string, target: SocketServerPushTarget): string[] {
    if (this.forceSharedBus) {
      return [BUS_CHANNEL]
    }
    if (target.connectionId !== undefined || target.identityMatcher !== undefined || target.roomMatcher !== undefined) {
      return [BUS_CHANNEL]
    }
    const space = target.space
    if (space === undefined) {
      return [this.busChannelTopic(scope, channelName)]
    }
    if (target.rooms === undefined) {
      return [this.busSpaceTopic(scope, channelName, space)]
    }
    return target.rooms.map((roomSerialized) => this.busRoomTopic(scope, channelName, space, roomSerialized))
  }

  /**
   * Where a forwarded collect reply publishes: a collect mid is minted as `<initiator pid>:<id>`, so the reply goes
   * straight to that process's inbox. A mid without the marker — an older node's window on a rolling deploy, or a
   * client-invented id — falls back to the shared channel, where an older initiator listens (the forward stays
   * rate-capped either way).
   */
  private replyTopicForMid(mid: string): string {
    const separator = mid.indexOf(':')
    return separator > 0 ? this.procTopic(mid.slice(0, separator)) : BUS_CHANNEL
  }

  /**
   * Subscribe (or reuse) a set of dynamic bus topics, resolving once every subscription SETTLED — the callers await
   * this before indexing rooms and confirming a join/enroll/claim, which closes the race where a push published right
   * after the confirmation had no listening subscription yet. No-ops without an external backplane (nothing is
   * published then) and under the forced shared channel.
   */
  private async subscribeBusTopics(needs: BusTopicNeed[]): Promise<void> {
    if (!this.hasExternalBackplane() || this.forceSharedBus || this.disposed || needs.length === 0) {
      return
    }
    await Promise.all(needs.map((need) => this.ensureBusTopic(need)))
  }

  private ensureBusTopic({ topic, needKey, stillNeeded }: BusTopicNeed): Promise<void> {
    const existing = this.busTopics.get(topic)
    if (existing) {
      existing.needs.set(needKey, stillNeeded)
      // a member re-entered inside the linger — the pending unsubscribe is void, the subscription is reused
      if (existing.lingerTimer !== undefined) {
        clearTimeout(existing.lingerTimer)
        existing.lingerTimer = undefined
      }
      return existing.promise
    }
    const subscription: BusTopicSubscription = {
      promise: Promise.resolve(),
      unsubscribe: undefined,
      needs: new Map([[needKey, stillNeeded]]),
      lingerTimer: undefined,
    }
    subscription.promise = (async () => {
      try {
        const backplane = await this.getBackplane()
        const unsubscribe = await backplane.subscribe(topic, (message) => {
          this.handleBusMessage(message)
        })
        if (this.busTopics.get(topic) !== subscription) {
          // released (a dispose) while the subscribe was in flight — leave no dangling subscription behind
          if (typeof unsubscribe === 'function') {
            unsubscribe()
          }
          return
        }
        if (typeof unsubscribe === 'function') {
          subscription.unsubscribe = unsubscribe
        }
      } catch (error) {
        // a failed subscribe must not sit in the map as if it listened — drop it so a later need retries; the
        // process keeps running degraded (local delivery works, this topic's remote envelopes are missed), the same
        // posture as a failed start()
        if (this.busTopics.get(topic) === subscription) {
          this.busTopics.delete(topic)
        }
        this.server.log({
          level: 'error',
          category: ['point0', 'socket'],
          message: `Socket backplane subscribe of "${topic}" failed`,
          error,
        })
      }
    })()
    this.busTopics.set(topic, subscription)
    return subscription.promise
  }

  /**
   * A topic may have stopped being needed — prune the reasons that no longer hold and, once none remain, unsubscribe
   * after the `busTopicLinger` option (the linger absorbs a last-member-out/first-member-in flutter; an `ensure` inside
   * it cancels the timer and reuses the live subscription).
   */
  private maybeReleaseBusTopic(topic: string): void {
    const subscription = this.busTopics.get(topic)
    if (!subscription) {
      return
    }
    for (const [needKey, stillNeeded] of [...subscription.needs]) {
      if (!stillNeeded()) {
        subscription.needs.delete(needKey)
      }
    }
    if (subscription.needs.size > 0 || subscription.lingerTimer !== undefined) {
      return
    }
    const timer = setTimeout(() => {
      subscription.lingerTimer = undefined
      for (const [needKey, stillNeeded] of [...subscription.needs]) {
        if (!stillNeeded()) {
          subscription.needs.delete(needKey)
        }
      }
      if (subscription.needs.size > 0) {
        return
      }
      this.busTopics.delete(topic)
      subscription.unsubscribe?.()
    }, this.server.socketOptions.busTopicLinger)
    timer.unref()
    subscription.lingerTimer = timer
  }

  private channelIndexKey(scope: PointsScope, channelName: string): string {
    return `${scope}:${channelName}`
  }

  private busTopicNeedForChannel(scope: PointsScope, channelName: string): BusTopicNeed {
    const channelKey = this.channelIndexKey(scope, channelName)
    return {
      topic: this.busChannelTopic(scope, channelName),
      needKey: `channel:${channelKey}`,
      stillNeeded: () => this.entriesByChannel.has(channelKey),
    }
  }

  /** The space topic plus one room topic per incoming room — what a join/enroll/restore must be subscribed to. */
  private busTopicNeedsForRooms(
    scope: PointsScope,
    channelName: string,
    spaceName: string,
    roomsSerialized: Iterable<string>,
  ): BusTopicNeed[] {
    const spaceKey = this.spaceKey(scope, spaceName)
    const needs: BusTopicNeed[] = [
      {
        topic: this.busSpaceTopic(scope, channelName, spaceName),
        needKey: `space:${spaceKey}`,
        stillNeeded: () => this.entriesBySpace.has(spaceKey),
      },
    ]
    for (const roomSerialized of roomsSerialized) {
      const indexKey = this.roomTopic(scope, spaceName, roomSerialized)
      needs.push({
        topic: this.busRoomTopic(scope, channelName, spaceName, roomSerialized),
        needKey: `room:${indexKey}`,
        stillNeeded: () => this.entriesByRoom.has(indexKey),
      })
    }
    return needs
  }

  /** The subscribe-before-confirm half of a room grant — awaited BEFORE the rooms are indexed and answered. */
  private async subscribeRoomBusTopics(
    entry: SocketConnectionEntry,
    spaceName: string,
    roomsSerialized: Iterable<string>,
  ): Promise<void> {
    await this.subscribeBusTopics(
      this.busTopicNeedsForRooms(entry.scope, entry.channelName, spaceName, roomsSerialized),
    )
  }

  /** The refusal half — a grant that subscribed topics and then did not index them releases what nothing needs. */
  private sweepRoomBusTopics(entry: SocketConnectionEntry, spaceName: string, roomsSerialized: Iterable<string>): void {
    if (!this.hasExternalBackplane() || this.forceSharedBus) {
      return
    }
    for (const need of this.busTopicNeedsForRooms(entry.scope, entry.channelName, spaceName, roomsSerialized)) {
      this.maybeReleaseBusTopic(need.topic)
    }
  }

  /** Register an entry with its channel's index (and topic) — live and parked entries both count. */
  private indexEntryChannel(entry: SocketConnectionEntry): void {
    const channelKey = this.channelIndexKey(entry.scope, entry.channelName)
    const byChannel = this.entriesByChannel.get(channelKey) ?? new Set()
    byChannel.add(entry)
    this.entriesByChannel.set(channelKey, byChannel)
  }

  private unindexEntryChannel(entry: SocketConnectionEntry): void {
    const channelKey = this.channelIndexKey(entry.scope, entry.channelName)
    const byChannel = this.entriesByChannel.get(channelKey)
    if (byChannel) {
      byChannel.delete(entry)
      if (byChannel.size === 0) {
        this.entriesByChannel.delete(channelKey)
        // the last local connection of the channel (parked included) — the channel-wide stream dies with it
        this.releaseStream(this.channelTopic(entry.scope, entry.channelName))
      }
    }
    this.maybeReleaseBusTopic(this.busChannelTopic(entry.scope, entry.channelName))
  }

  // ------------------------------------------------------------------------------------------------------------
  // resumable connections — the option reads, the key hash, the passport (conn-record) builder, the topic streams
  // ------------------------------------------------------------------------------------------------------------

  /** Is this channel resumable (`resumable: true`, a declaration-only channel option — both bundles carry it)? */
  private channelResumable(channelPoint: AnyPoint): boolean {
    return channelPoint._getChannelPointOptions().resumable === true
  }

  /** Does a resume restore this space's rooms — the channel is resumable and the space did not opt out. */
  private spaceInResume(spacePoint: AnyPoint): boolean {
    if (!spacePoint._channelPoint || !this.channelResumable(spacePoint._channelPoint)) {
      return false
    }
    return spacePoint._getSpacePointOptions().resumable !== false
  }

  /**
   * The stream-buffer ceiling a clientHandler opted into — `true` = the default, a number names its own; `undefined` =
   * no.
   */
  private handlerBufferLimit(handlerPoint: AnyPoint): number | undefined {
    const resumable = handlerPoint._getClientHandlerPointOptions().resumable
    if (resumable === undefined) {
      return undefined
    }
    if (resumable === true) {
      return RESUME_HANDLER_BUFFER_DEFAULT
    }
    if (typeof resumable === 'number') {
      return resumable
    }
    const buffer = resumable.buffer ?? true
    return buffer === true ? RESUME_HANDLER_BUFFER_DEFAULT : buffer
  }

  /**
   * The replay POLICY of a buffering handler — `'gapless'` (the object form's `replay`) makes {@link answerResume} skip
   * its frames when their stream's recovery is not provably gapless: messages only valuable as a complete sequence
   * never arrive as a partial tail, the honest verdict alone drives the refetch. Default `'always'`.
   */
  private handlerReplayPolicy(scope: PointsScope, handlerName: string): 'always' | 'gapless' {
    const point = this.server.points.findPoint({ scope, type: 'clientHandler', name: handlerName })?.point
    const resumable = point?._getClientHandlerPointOptions().resumable
    return typeof resumable === 'object' && resumable.replay === 'gapless' ? 'gapless' : 'always'
  }

  /** Does the channel have at least one buffering (`resumable`-opted) clientHandler — the parking condition. */
  private channelHasBufferingHandlers(scope: PointsScope, channelName: string): boolean {
    return this.server.points.manager.collection.some(
      (record) =>
        record.type === 'clientHandler' &&
        record.point.scope === scope &&
        record.point._channelPoint?.name === channelName &&
        this.handlerBufferLimit(record.point) !== undefined,
    )
  }

  /**
   * The resolved buffer ceilings of a stream — the channel's `server.resume` group, with the owning space's own
   * `server.resume` keys overriding for its room and space-wide streams (channel-wide and personal take the
   * channel's).
   */
  private streamCapsFor(channelPoint: AnyPoint, spacePoint?: AnyPoint): StreamCaps {
    const channelResume = channelPoint._getChannelPointOptions().resume
    const spaceResume = spacePoint?._getSpacePointOptions().resume
    return {
      streamMaxFrames: spaceResume?.streamMaxFrames ?? channelResume.streamMaxFrames,
      streamMaxBytes: spaceResume?.streamMaxBytes ?? channelResume.streamMaxBytes,
    }
  }

  private freshStream(): TopicStream {
    return {
      tseq: 0,
      log: [],
      logBytes: 0,
      countByHandler: new Map(),
      maxNonBufferedTseq: 0,
      evictedMaxTseq: 0,
    }
  }

  /** A topic stream's current tseq — `0` while the stream has not been born (the implicit empty stream). */
  private streamTseq(topicKey: string): number {
    return this.streams.get(topicKey)?.tseq ?? 0
  }

  /** The last subscriber of a shared topic left its index — the stream (and its epoch baseline) dies with it. */
  private releaseStream(topicKey: string): void {
    this.streams.delete(topicKey)
  }

  /**
   * Stamp one frame into a stream and return the ready wire json: assign the next `tseq` (every frame consumes one,
   * buffered or not — the gap proof needs the hole to be numbered), tick the process delivery clock, and either log the
   * frame (an opted-in handler, `bufferLimit` set) or mark the hole (`maxNonBufferedTseq`). Eviction is oldest-first
   * under three ceilings — the handler's own within the stream, the stream's frame total, the stream's byte total — and
   * every eviction raises `evictedMaxTseq`, which is what turns an overflow into an honest `gapless: false` instead of
   * a silent gap.
   */
  private stampStreamFrame(
    stream: TopicStream,
    frame: SocketServerFrame & { t: 'msg' },
    handlerName: string,
    bufferLimit: number | undefined,
    caps: StreamCaps,
  ): string {
    const tseq = ++stream.tseq
    const stamp = ++this.deliveryStamp
    if (stamp >= Number.MAX_SAFE_INTEGER) {
      this.deliveryClockSaturated = true
    }
    const json = JSON.stringify({ ...frame, tseq })
    if (bufferLimit === undefined) {
      stream.maxNonBufferedTseq = tseq
      return json
    }
    const bytes = Buffer.byteLength(json)
    stream.log.push({ tseq, stamp, handler: handlerName, bytes, json })
    stream.logBytes += bytes
    stream.countByHandler.set(handlerName, (stream.countByHandler.get(handlerName) ?? 0) + 1)
    const evict = (index: number): void => {
      const [evicted] = stream.log.splice(index, 1)
      stream.logBytes -= evicted.bytes
      stream.countByHandler.set(evicted.handler, (stream.countByHandler.get(evicted.handler) ?? 1) - 1)
      stream.evictedMaxTseq = Math.max(stream.evictedMaxTseq, evicted.tseq)
      this.evictedFramesTotal++
    }
    while ((stream.countByHandler.get(handlerName) ?? 0) > Math.max(1, bufferLimit)) {
      evict(stream.log.findIndex((buffered) => buffered.handler === handlerName))
    }
    while (stream.log.length > Math.max(1, caps.streamMaxFrames)) {
      evict(0)
    }
    while (stream.logBytes > caps.streamMaxBytes && stream.log.length > 1) {
      evict(0)
    }
    return json
  }

  /** SHA-256 of a resume key, base64url — what the KV record and the entry hold; the raw key never lands anywhere. */
  private hashResumeKey(key: string): string {
    return createHash('sha256').update(key).digest('base64url')
  }

  /** Constant-time comparison of an offered key against the stored hash — a resume must not become a timing oracle. */
  private resumeKeyMatchesHash(key: string, keyHash: string): boolean {
    const offered = createHash('sha256').update(key).digest()
    const stored = Buffer.from(keyHash, 'base64url')
    return offered.length === stored.length && timingSafeEqual(offered, stored)
  }

  /**
   * Build the entry's conn-record json. A resumable channel's record carries the resume passport — the key hash and the
   * per-space rooms (opt-out spaces excluded); a non-resumable one stays the bare connect→claim handoff.
   */
  private buildConnJson(entry: SocketConnectionEntry): string {
    const stored: StoredConnection = {
      scope: entry.scope,
      channel: entry.channelName,
      identity: entry.identitySerialized,
    }
    if (entry.resumeKeyHash !== undefined) {
      const rooms: Record<string, string[]> = {}
      for (const [spaceName, participation] of entry.spaces) {
        if (!this.spaceInResume(participation.spacePoint)) {
          continue
        }
        rooms[spaceName] = [...participation.rooms.keys()]
      }
      stored.resume = { keyHash: entry.resumeKeyHash, rooms }
    }
    return JSON.stringify(stored)
  }

  /**
   * Write the passport through after a room change of a resumable connection — join/leave/enroll/space-kick are rare
   * next to messages, so the record simply stays current (the ping renew and `amendIdentity` re-set the same json).
   * Writes for the LIVE entry of the cid — and for the current PARKED one, because a space kick shrinks a parked
   * passport too (revocation must not hide in a park). Any other dead entry never writes: its record is frozen at death
   * and the TTL owns it from there.
   */
  private writeConnRecordThrough(entry: SocketConnectionEntry): void {
    const isCurrent = this.connections.get(entry.cid) === entry || this.parkedByCid.get(entry.cid)?.entry === entry
    if (entry.resumeKeyHash === undefined || !isCurrent) {
      return
    }
    entry.connJson = this.buildConnJson(entry)
    this.kvSafe(async () => {
      const backplane = await this.getBackplane()
      await backplane.set(this.connKey(entry.cid), entry.connJson, entry.connectionTtl)
    }, 'passport write-through')
  }

  /**
   * Mint the resume credential for a fresh RESUMABLE connection — 128 bits of randomness for the client (it rides the
   * `claimed` frame once and never lands anywhere server-side), the HASH into the entry and the passport json. The
   * connection is born subscribed to its channel-wide stream — the epoch pins where its gap proof starts; the personal
   * stream needs no epoch (it is born with the entry, at zero). `undefined` on a non-resumable channel: no credential,
   * no passport, the record stays as it was.
   */
  private mintResumeCredential(entry: SocketConnectionEntry): string | undefined {
    if (!this.channelResumable(entry.channelPoint)) {
      return undefined
    }
    const key = randomBytes(16).toString('base64url')
    entry.resumeKeyHash = this.hashResumeKey(key)
    entry.streamEpochs = new Map([
      [
        this.channelTopic(entry.scope, entry.channelName),
        this.streamTseq(this.channelTopic(entry.scope, entry.channelName)),
      ],
    ])
    entry.connJson = this.buildConnJson(entry)
    return key
  }

  // stream wire keys — the compact stream names the client keys its cursors by: 'c' = channel-wide, 'p' = personal,
  // 's:<space>' = space-wide, 'r:<space>:<room>' = a room. The server speaks them in `heads` (claimed/joined/enrolled)
  // and in the per-stream `resumed` verdicts; internally streams stay keyed by their full topic strings.

  private roomStreamWireKey(spaceName: string, roomSerialized: string): string {
    return `r:${spaceName}:${roomSerialized}`
  }

  private spaceStreamWireKey(spaceName: string): string {
    return `s:${spaceName}`
  }

  /**
   * The stream HEADS of an entry's space/room subscriptions — wire key → current stream tseq. What `claimed` (the
   * enrolled spaces), `joined` (the admitted rooms) and `enrolled` (the grown set) announce so the client can seed its
   * cursors at the subscription point; only spaces in the resume (`spaceInResume`) speak — an opt-out space's streams
   * do not exist.
   */
  private spaceStreamHeads(
    entry: SocketConnectionEntry,
    perSpace: Array<{ space: string; rooms: string[] }>,
  ): Record<string, number> {
    const heads: Record<string, number> = {}
    for (const { space, rooms } of perSpace) {
      const spacePoint = this.server.points.findPoint({ scope: entry.scope, type: 'space', name: space })?.point
      if (!spacePoint || !this.spaceInResume(spacePoint)) {
        continue
      }
      heads[this.spaceStreamWireKey(space)] = this.streamTseq(this.spaceTopic(entry.scope, space))
      for (const roomSerialized of rooms) {
        heads[this.roomStreamWireKey(space, roomSerialized)] = this.streamTseq(
          this.roomTopic(entry.scope, space, roomSerialized),
        )
      }
    }
    return heads
  }

  // connect — the fetcher's channel branch calls this after the connector ran

  /**
   * Register a fresh connection: write its record (identity frozen at connect) with a sliding TTL, and — for the ticket
   * path — a one-time ticket the socket claims. The GET+Upgrade cold-start path passes `ticket: false`: the connection
   * is installed straight onto the upgraded socket in `handleOpen`, no ticket round-trip.
   */
  async createConnection(args: {
    point: AnyPoint
    identity: unknown
    ticket?: boolean
  }): Promise<{ cid: string; ticket: string | undefined; identitySerialized: string }> {
    const { point, identity, ticket: wantsTicket = true } = args
    const transformer = point._getSocketTransformer()
    const identitySerialized = stringifyOrThrow(transformer, identity ?? {}, point.id)
    const cid = generateId()
    const backplane = await this.getBackplane()
    const storedConnection: StoredConnection = {
      scope: point.scope,
      channel: point.name,
      identity: identitySerialized,
    }
    const connectionTtl = point._getChannelPointOptions().connectionTtl
    // every record carries a TTL — a process dying between here and the claim leaks nothing; live connections slide
    // the TTL on every client ping
    await backplane.set(this.connKey(cid), JSON.stringify(storedConnection), connectionTtl)
    if (!wantsTicket) {
      return { cid, ticket: undefined, identitySerialized }
    }
    const ticket = generateId()
    const storedTicket: StoredTicket = {
      cid,
      scope: point.scope,
      channel: point.name,
      exp: Date.now() + this.server.socketOptions.ticketTtl,
    }
    await backplane.set(this.ticketKey(ticket), JSON.stringify(storedTicket), this.server.socketOptions.ticketTtl)
    return { cid, ticket, identitySerialized }
  }

  /**
   * Stash a cold-start connection's seed (created with `ticket: false`) so the matching upgraded socket can install it
   * in `handleOpen` without a ticket. Same-process by construction (the upgrade rides the very request that created the
   * cid); an unref'd TTL sweep drops it if the handshake never lands.
   */
  stashPendingUpgrade(args: { cid: string; point: AnyPoint; identitySerialized: string }): boolean {
    const { cid, point, identitySerialized } = args
    // the same ceiling the bare path has: a cold-start connect is minted by an unauthenticated request too, and each
    // seed holds a channel point, an identity and a conn record until its TTL. Full means the handshake is refused,
    // not that the set grows
    if (this.pendingUpgrades.size >= this.server.socketOptions.maxPendingUpgrades) {
      return false
    }
    const connectionTtl = point._getChannelPointOptions().connectionTtl
    const connJson = JSON.stringify({
      scope: point.scope,
      channel: point.name,
      identity: identitySerialized,
    } satisfies StoredConnection)
    const timer = setTimeout(() => {
      this.pendingUpgrades.delete(cid)
    }, this.server.socketOptions.pendingUpgradeTtl)
    timer.unref()
    this.pendingUpgrades.set(cid, {
      cid,
      scope: point.scope,
      channelName: point.name,
      channelPoint: point,
      identitySerialized,
      connJson,
      connectionTtl,
      timer,
    })
    return true
  }

  /** Drop a stashed cold-start seed the handshake never used — the server top calls it when `bunServer.upgrade` fails. */
  releasePendingUpgrade(cid: string): void {
    const seed = this.pendingUpgrades.get(cid)
    if (!seed) {
      return
    }
    clearTimeout(seed.timer)
    this.pendingUpgrades.delete(cid)
  }

  /**
   * The socket data for an upgrade — the server top calls this with the marker-header value to build
   * `bunServer.upgrade`'s `data`. The value is either a cold-start connection cid (the channel-endpoint upgrade — the
   * socket installs the stashed connection in `handleOpen`) or a bare-endpoint token (the `websocket` endpoint — a
   * fresh socket with no connection yet; channels connect over it later). Returns `undefined` when neither is pending
   * (TTL lapsed): the server answers 400 and the browser handshake fails, so the client falls back / retries.
   */
  socketDataForUpgrade(marker: string): SocketData | undefined {
    const seed = this.pendingUpgrades.get(marker)
    if (seed) {
      return { __point0Socket: { scope: seed.scope, cids: new Set([marker]), pendingClaimCid: marker } }
    }
    const bare = this.pendingBareUpgrades.get(marker)
    if (bare) {
      this.pendingBareUpgrades.delete(marker)
      clearTimeout(bare.timer)
      return { __point0Socket: { scope: bare.scope, cids: new Set() } }
    }
    return undefined
  }

  // ------------------------------------------------------------------------------------------------------------
  // in-memory sockets — the FakeClient transport: a socket pair that never touches Bun.serve. The server end is a
  // duck of the `Bun.ServerWebSocket` surface this class actually uses (`data`/`send`/`subscribe`/`unsubscribe`);
  // its pub/sub twin is the `inMemoryTopics` registry below, fed by `publishTopic` next to every Bun publish.
  // ------------------------------------------------------------------------------------------------------------

  /** topic → the in-memory sockets subscribed to it (the Bun pub/sub twin for sockets living outside Bun.serve) */
  private inMemoryTopics = new Map<string, Set<InMemoryServerSocket>>()

  /** Publish a frame to a topic — Bun's pub/sub for real sockets AND the in-memory registry for FakeClient ones. */
  private publishTopic(topic: string, json: string): void {
    this.server.bunServer?.publish(topic, json)
    const sockets = this.inMemoryTopics.get(topic)
    if (!sockets) {
      return
    }
    for (const socket of [...sockets]) {
      socket.deliver(json)
    }
  }

  /**
   * Open an in-memory socket for an upgrade marker — the FakeClient handshake: the fake `WebSocket` ran the REAL fetch
   * pipeline (middlewares included), got the marker response, and lands here instead of `bunServer.upgrade`. Returns
   * the client-side handle, or `undefined` when the marker is stale (the same 400 a browser would get). `open()` runs
   * `handleOpen` — call it AFTER wiring the frame listener: a cold-start upgrade's `claimed` may land as soon as the
   * enrollers resolve (microtasks after `handleOpen`), so a listener wired later could miss it.
   */
  openInMemorySocket(
    marker: string,
    hooks: { onFrame: (json: string) => void },
  ): { open: () => void; sendText: (text: string) => void; close: () => void } | undefined {
    const data = this.socketDataForUpgrade(marker)
    if (!data) {
      return undefined
    }
    const socket = new InMemoryServerSocket({ data, topics: this.inMemoryTopics, onFrame: hooks.onFrame })
    return {
      open: () => {
        this.handleOpen(socket as never)
      },
      sendText: (text: string) => {
        this.handleMessage(socket as never, text).catch((error: unknown) => {
          this.server.log({
            level: 'error',
            category: ['point0', 'socket'],
            message: 'In-memory socket message handling failed',
            error,
          })
        })
      },
      close: () => {
        socket.dispose()
        this.handleClose(socket as never)
      },
    }
  }

  private async discardTicket(ticket: string, scope: PointsScope): Promise<void> {
    const backplane = await this.getBackplane()
    const raw = await backplane.get(this.ticketKey(ticket))
    if (!raw) {
      return
    }
    try {
      const stored = JSON.parse(raw) as StoredTicket
      // same gate as the claim — a socket may only discard tickets of its own scope
      if (stored.scope !== scope) {
        return
      }
      await backplane.delete(this.ticketKey(ticket))
      await backplane.delete(this.connKey(stored.cid))
    } catch {
      // an unparseable record is not this scope's to delete — nobody can claim it either, and its TTL sweeps it
    }
  }

  // the bare `websocket` endpoint — GET /_point0/<scope>/websocket + Upgrade. It is matched into its own request
  // variant and rides the FULL fetch pipeline (middlewares, engineFetch* events); the handler answers the
  // upgrade-marker response and the server top turns it into the Bun handshake — exactly the channel cold-start flow.

  private resolveScopeFromKebab(kebab: string): PointsScope | undefined {
    const scopes = [this.server.scope, ...this.server.clients.map((client) => client.scope)]
    return scopes.find((scope) => toKebabCase(scope) === kebab)
  }

  /**
   * Match a request against the bare `websocket` endpoint (`GET /_point0/<scope>/websocket` with an `Upgrade:
   * websocket` header). Returns the resolved scope, or `undefined` when the request is anything else — including when
   * the engine's `socket` server option is off: the endpoint then simply does not exist.
   */
  matchWebsocketEndpoint(request: Request): PointsScope | undefined {
    if (!this.server.socketEnabled) {
      return undefined
    }
    if (request.method !== 'GET' || request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
      return undefined
    }
    const pathname = new URL(request.url).pathname
    const segments = pathname.split('/').filter(Boolean)
    if (
      segments.length !== 3 ||
      segments[0] !== POINT0_INTERNAL_PATH_PREFIX ||
      segments[2] !== POINT0_WEBSOCKET_ENDPOINT_SEGMENT
    ) {
      return undefined
    }
    return this.resolveScopeFromKebab(segments[1])
  }

  /**
   * May this handshake open a socket? The CSRF gate of the WebSocket upgrade, applied to BOTH shapes — the bare
   * endpoint and the cold-start channel upgrade-connect — before either MINTS anything: no upgrade token, no
   * connection, and on the channel shape not even a `.connector` run. (A middleware still runs before it on the bare
   * shape, as one does for every request; this gate is the engine's own, not a replacement for yours.)
   *
   * A browser sends `Origin` on a handshake and then applies no same-origin policy to the answer — the upgrade succeeds
   * cross-site, cookies and all. So an `Origin` that is not ours is refused unless the app listed it; a request with NO
   * `Origin` passes, because that is not a browser and there is no site to forge from (a native client, a server, curl
   * — none of which carry someone else's cookies by ambient authority).
   *
   * Same-origin compares HOSTS, not full origins: a TLS-terminating proxy leaves the engine speaking http while the
   * browser dialed https, so the scheme would mismatch for every deployment behind one. `x-forwarded-host` wins when
   * present — the browser WebSocket API cannot set headers, so a hostile page cannot forge it.
   *
   * See {@link EngineSocketServerOptions.allowedOrigins}.
   */
  isUpgradeOriginAllowed(request: Request): boolean {
    const origin = request.headers.get('origin')
    if (origin === null) {
      return true
    }
    const { allowedOrigins } = this.server.socketOptions
    if (allowedOrigins === '*') {
      return true
    }
    if (allowedOrigins !== 'same-origin' && allowedOrigins.includes(origin)) {
      return true
    }
    // `null` (a sandboxed iframe, a `file://` page) and any other unparseable origin land here as undefined — refused
    const originHost = URL.canParse(origin) ? new URL(origin).host : undefined
    if (originHost === undefined) {
      return false
    }
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const ownHost = forwardedHost || request.headers.get('host') || new URL(request.url).host
    if (originHost === ownHost) {
      // the scheme too, WHEN the deployment tells us what it is: behind a TLS-terminating proxy the engine speaks
      // http while the browser dialed https, so `x-forwarded-proto` is the only honest source. Absent it, host
      // equality is the whole check — an http page on the same host is a same-site page either way
      const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
      return forwardedProto === undefined || `${forwardedProto}:` === new URL(origin).protocol
    }
    // THIS ENGINE's own dev client is not a foreign site. In dev the browser holds a page served by the client (its
    // own port) and the socket handshake reaches the server through the client's proxy, which replays the browser's
    // `Origin` verbatim — so a same-app handshake legitimately arrives with a different port on it. The ports are the
    // engine's own configuration, not something a request can claim, and a BUILT server never serves that way: there
    // the client rides the server's own origin, or it is hosted elsewhere and belongs in `allowedOrigins`
    if (this.server.itWasBuilt) {
      return false
    }
    return this.server.clients.some(
      (client) => originHost === `localhost:${client.port}` || originHost === `127.0.0.1:${client.port}`,
    )
  }

  /**
   * The 403 both upgrade shapes answer a refused origin with. The body is for the developer reading a log or a network
   * panel — a browser never shows a failed handshake's response to the page that attempted it.
   */
  private forbiddenOriginResponse(): Response {
    return new Response('Forbidden websocket origin', { status: 403 })
  }

  /**
   * The `websocket`-variant handler: mint a one-time upgrade token, emit the endpoint's own event, and answer the
   * marker response the server top turns into the Bun handshake. Runs AFTER every middleware passed the request through
   * — a middleware that answered an ordinary response instead is the veto (the handshake then fails).
   */
  acceptBareUpgrade(scope: PointsScope, request: Request): Response {
    if (!this.isUpgradeOriginAllowed(request)) {
      return this.forbiddenOriginResponse()
    }
    // an unauthenticated request mints a token — cap the pending set so a request flood cannot grow it unbounded
    if (this.pendingBareUpgrades.size >= this.server.socketOptions.maxPendingUpgrades) {
      return new Response('Too many pending websocket upgrades', { status: 503 })
    }
    const token = generateId()
    const timer = setTimeout(() => {
      this.pendingBareUpgrades.delete(token)
    }, this.server.socketOptions.pendingUpgradeTtl)
    timer.unref()
    this.pendingBareUpgrades.set(token, { scope, timer })
    this.emitSocketEvent('socketServerUpgrade', scope)
    return new Response(null, {
      status: 200,
      headers: { [POINT0_WEBSOCKET_UPGRADE_HEADER]: token, 'Cache-Control': 'private, no-store' },
    })
  }

  // socket handlers — wired into Bun.serve's websocket config by EngineServer.serve()

  handleOpen(ws: Bun.ServerWebSocket<SocketData>): void {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    this.emitSocketEvent('socketServerConnect', socketData.scope)
    // a cold-start GET+Upgrade socket carries the cid whose seed the connect leg stashed — install it now, no ticket
    if (socketData.pendingClaimCid !== undefined) {
      const cid = socketData.pendingClaimCid
      socketData.pendingClaimCid = undefined
      void this.installUpgradeConnection(ws, cid)
    }
  }

  private async installUpgradeConnection(ws: Bun.ServerWebSocket<SocketData>, cid: string): Promise<void> {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    const seed = this.pendingUpgrades.get(cid)
    if (!seed) {
      // by construction the seed is same-process and fresh; only a lapsed TTL (or a duplicate open) reaches here
      const error = this.infraError('Socket connection not found', POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND)
      this.send(ws, { t: 'claimErr', cid, error: this.serializeErrorInstance(error) })
      this.emitClaimError({ scope: socketData.scope, connectionId: cid, reason: 'connection', error })
      return
    }
    this.pendingUpgrades.delete(cid)
    clearTimeout(seed.timer)
    const entry: SocketConnectionEntry = {
      cid,
      scope: seed.scope,
      channelName: seed.channelName,
      channelPoint: seed.channelPoint,
      identitySerialized: seed.identitySerialized,
      identityParsed: seed.channelPoint._getSocketTransformer().parse(seed.identitySerialized),
      spaces: new Map(),
      connJson: seed.connJson,
      connectionTtl: seed.connectionTtl,
      lastRenewedAt: Date.now(),
      replyForwards: { windowStart: 0, count: 0 },
      ws,
    }
    this.connections.set(cid, entry)
    socketData.cids.add(cid)
    // a resumable channel's connection is born with its credential — the hash goes into the record below, the raw
    // key rides the claimed frame
    const resumeKey = this.mintResumeCredential(entry)
    // the record was written by createConnection; start its sliding TTL window from the open
    this.kvSafe(async () => {
      const backplane = await this.getBackplane()
      await backplane.set(this.connKey(cid), entry.connJson, entry.connectionTtl)
    }, 'renew-on-upgrade')
    ws.subscribe(this.channelTopic(entry.scope, entry.channelName))
    // the channel bus topic goes up BEFORE the claimed frame — a channel-wide push published right after the client
    // learns it is connected must already have this process listening
    this.indexEntryChannel(entry)
    await this.subscribeBusTopics([this.busTopicNeedForChannel(entry.scope, entry.channelName)])
    // the server-side enrollments (`.enroller` of every space of the channel) run BEFORE the claimed frame — the
    // client learns them from it; a throwing enroller fails the whole connection setup (a connection missing its
    // enrolled rooms would drop pushes silently)
    let enrolled: Array<{ space: string; rooms: string[] }>
    try {
      enrolled = await this.enrollConnection(entry)
    } catch (error) {
      await this.cleanupConnection(cid, 'close')
      this.send(ws, { t: 'claimErr', cid, error: this.serializeError(entry.channelPoint, error) })
      this.emitClaimError({
        scope: entry.scope,
        point: entry.channelPoint,
        connectionId: cid,
        reason: 'enroller',
        error,
      })
      return
    }
    // the socket may have died while the enrollers ran — see the same check in handleClaimInner
    if (this.connections.get(cid) !== entry) {
      return
    }
    this.send(ws, {
      t: 'claimed',
      cid,
      ...(enrolled.length > 0 ? { enrolled } : {}),
      ...(resumeKey === undefined ? {} : { resumeKey, heads: this.claimStreamHeads(entry, enrolled) }),
    })
    entry.opened = true
    this.emitChannelConnectionEvent('pointChannelOpenServer', entry, { resumed: false })
  }

  /**
   * The stream heads a `claimed` frame seeds the client's cursors with — the channel-wide stream at its current tseq,
   * the personal stream at zero (born with the entry), and the enrolled spaces' streams at theirs.
   */
  private claimStreamHeads(
    entry: SocketConnectionEntry,
    enrolled: Array<{ space: string; rooms: string[] }>,
  ): Record<string, number> {
    return {
      c: this.streamTseq(this.channelTopic(entry.scope, entry.channelName)),
      // usually a fresh 0 — but an enroller (or a join-Success subscriber) pushing to `connectionId` before the
      // claimed frame already births the personal stream, and those frames WERE sent to this socket: the honest
      // exact-set head is the stream's tseq, or the first blip would replay (or falsely gap) the pre-claim frames
      p: entry.personalStream?.tseq ?? 0,
      ...this.spaceStreamHeads(entry, enrolled),
    }
  }

  /** The frame caps this server resolved — {@link parseSocketClientFrame} takes them per message. */
  private get wireLimits(): SocketWireLimits {
    const options = this.server.socketOptions
    return {
      id: options.maxFrameIdLength,
      name: options.maxFrameNameLength,
      resumeEntries: options.maxResumeEntries,
      leaveRooms: options.maxLeaveRooms,
    }
  }

  handleClose(ws: Bun.ServerWebSocket<SocketData>): void {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    for (const cid of [...socketData.cids]) {
      void this.cleanupConnection(cid, 'socket')
    }
    this.emitSocketEvent('socketServerDisconnect', socketData.scope)
  }

  async handleMessage(ws: Bun.ServerWebSocket<SocketData>, message: string | Buffer): Promise<void> {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    // the pre-claim budget is charged BEFORE the parse: garbage costs a `JSON.parse` too, and a socket that only ever
    // sends garbage must still run out of budget
    if (this.exceedsFrameBudget(ws, socketData)) {
      return
    }
    // the wire is untrusted: `parseSocketClientFrame` is the door — a frame whose fields are not the types the union
    // promises never reaches a handler (see its JSDoc for why it drops rather than closes)
    const frame = parseSocketClientFrame(typeof message === 'string' ? message : message.toString(), this.wireLimits)
    if (!frame) {
      return
    }
    // Socket frames bypass the fetch pipeline, so they need its dev points gate too (same condition as
    // Fetcher.fetchDetailed): without it, WS-only traffic keeps dispatching into the previously imported points
    // forever — a server hot reload (or a Vite module-graph update) never reaches channel/space/handler code until
    // some unrelated HTTP request happens by. An unchanged hot store is a cheap manifest-hash compare; a changed one
    // swaps `this.server.points` before this frame resolves anything.
    if (!this.server.itWasBuilt && (this.server.viteConfig || this.server.hotStore)) {
      await this.server.readPoints()
    }
    switch (frame.t) {
      case 'ping': {
        this.send(ws, { t: 'pong' })
        // the ping doubles as the TTL heartbeat — live connections keep their backplane records alive
        this.renewConnectionRecords(socketData.cids)
        return
      }
      case 'claim': {
        await this.handleClaim(ws, frame.ticket)
        return
      }
      case 'resume': {
        await this.handleResume(ws, frame)
        return
      }
      case 'discard': {
        await this.discardTicket(frame.ticket, socketData.scope)
        return
      }
      case 'close': {
        const entry = this.connections.get(frame.cid)
        if (entry && entry.ws === ws) {
          await this.cleanupConnection(frame.cid, 'close')
        }
        return
      }
      case 'join': {
        await this.handleJoin(ws, frame, message)
        return
      }
      case 'leave': {
        this.handleLeave(ws, frame)
        return
      }
      case 'send': {
        await this.handleSend(ws, frame, message)
        return
      }
      case 'reply': {
        this.handleReply(ws, frame, message)
        return
      }
    }
  }

  /**
   * The frame budget of a socket, charged per raw message before anything is parsed. Two windows, because the two
   * halves of a socket's life are bounded for different reasons — both are engine options
   * ({@link EngineSocketServerOptions.unclaimedFrameMax} / {@link EngineSocketServerOptions.claimedFrameMax}), and either
   * is switched off with `0`.
   *
   * BEFORE the claim there is no identity and no hook of the app's at all — no `.connector` has run, no `.joiner`, no
   * `onBeforeServerReply` — yet `claim`, `discard` and `resume` each cost backplane round trips. That budget is the one
   * rate bound the engine owes outright, and it is tight: a real client spends ONE frame there.
   *
   * AFTER the claim the app's own hooks can refuse a message, and they are the ones that know what it costs — so this
   * budget is a coarse backstop, not the domain limit. Generous by default; an app doing tens of frames a second per
   * connection is normal, thousands is not.
   *
   * Exceeding either closes the socket: a client this far off protocol has nothing left to say on it.
   */
  private exceedsFrameBudget(
    ws: Bun.ServerWebSocket<SocketData>,
    socketData: NonNullable<SocketData['__point0Socket']>,
  ): boolean {
    const claimed = socketData.cids.size > 0
    const { unclaimedFrameMax, unclaimedFrameWindow, claimedFrameMax, claimedFrameWindow } = this.server.socketOptions
    const max = claimed ? claimedFrameMax : unclaimedFrameMax
    if (max <= 0) {
      return false
    }
    const windowMs = claimed ? claimedFrameWindow : unclaimedFrameWindow
    const now = Date.now()
    // one counter, reset on the switch: a socket that claims mid-window starts the claimed budget from zero, and the
    // pre-claim frames it already spent do not follow it in
    const budget = socketData.frameBudget
    if (!budget || budget.claimed !== claimed || now - budget.windowStart >= windowMs) {
      socketData.frameBudget = { windowStart: now, count: 1, claimed }
      return false
    }
    budget.count++
    if (budget.count <= max) {
      return false
    }
    this.server.log({
      level: 'warn',
      category: ['point0', 'socket'],
      message: `Closing a socket that flooded its ${claimed ? 'claimed' : 'pre-claim'} frame budget`,
      meta: { scope: socketData.scope },
    })
    ws.close()
    return true
  }

  private renewConnectionRecords(cids: Set<string>): void {
    const now = Date.now()
    for (const cid of cids) {
      const entry = this.connections.get(cid)
      // the floor keeps a ping flood from becoming a KV write flood — the TTL has plenty of slack over it
      if (entry && now - entry.lastRenewedAt >= this.server.socketOptions.renewMinInterval) {
        entry.lastRenewedAt = now
        this.kvSafe(async () => {
          const backplane = await this.getBackplane()
          await backplane.set(this.connKey(cid), entry.connJson, entry.connectionTtl)
        }, 'renew')
      }
    }
  }

  /**
   * The one funnel every server→client frame goes through — and where the delivery contract is enforced on the
   * `ws.send` half.
   *
   * Bun's send status: a positive number is the byte count (written straight out), `-1` is backpressure — the frame
   * sits in the socket's own buffer and WILL be delivered, in order, so it is not an error and nothing is done about it
   * — and `0` means the frame is GONE. Past `backpressureLimit` uWS discards it before framing: never queued, never
   * retried, the buffered amount does not move, `readyState` stays OPEN and no `drain`/`error` reports the loss. A `0`
   * on a socket that is still open is therefore a contract violation ("delivered while the connection is alive"), and
   * the only honest repair is to stop the connection being alive: close it, so the client's reconnect re-claims,
   * re-joins every space, and the app re-reads its state. A `0` on an already closing/closed socket is the ordinary
   * teardown, which `handleClose` sweeps.
   *
   * The kill cannot be ANNOUNCED. A `closed` frame would be dropped by the very rule that triggered this, and so is the
   * close frame itself — measured: over the limit, `ws.close(code, reason)` reaches the peer as a bare hang-up, code
   * and reason gone, along with whatever Bun still held buffered. The code is set anyway (it is what a close that
   * happens to find the socket drained again will carry, and it names the cause in Bun's own close callback), but the
   * contract does not rest on it: the observable is the disconnect, which is all the reconnect needs.
   *
   * In practice the engine's `closeOnBackpressureLimit: true` (see the websocket settings in server.ts) wins the race —
   * uWS tears the socket down inside the very `send` that trips the limit, so `readyState` is already CLOSED by the
   * time it returns here and this branch is dormant. It is what keeps the funnel honest when that setting is
   * overridden. Note the one wart it comes with: after this close, Bun's `server.stop()` does not settle (forced or
   * graceful, and `terminate()` behaves the same), so an `engine.dispose()` in a process that killed a backpressured
   * socket this way can hang — the uWS path does not do that, which is another reason the default stays on.
   *
   * Closing from here is re-entrant-safe: Bun fires `close` synchronously, so `handleClose` runs (and deletes this
   * socket's entries from `connections` / the room indexes) before the send returns. Deleting from a Map/Set that a
   * fan-out loop is walking is well-defined — the removed entries are simply not visited — and any further send on the
   * same socket returns 0 with `readyState` no longer OPEN, so the close cannot recurse.
   */
  private send(ws: Bun.ServerWebSocket<SocketData>, frame: SocketServerFrame): void {
    this.sendJson(ws, JSON.stringify(frame), frame.t)
  }

  /**
   * The pre-serialized half of the funnel — a resumable channel's pushes (and their stream replays) arrive as ready
   * json, everything else goes through {@link send}. Same contract enforcement either way.
   */
  private sendJson(ws: Bun.ServerWebSocket<SocketData>, json: string, frameType: string): void {
    // the in-memory (FakeClient) socket returns undefined here — no transport, hence no backpressure to check
    const status = ws.send(json)
    if (status !== SOCKET_SEND_DROPPED || ws.readyState !== SOCKET_READY_STATE_OPEN) {
      return
    }
    this.server.log({
      level: 'warn',
      category: ['point0', 'socket'],
      message: `Closing a socket that fell behind: Bun dropped a "${frameType}" frame past the websocket backpressureLimit`,
    })
    ws.close(SOCKET_BACKPRESSURE_CLOSE_CODE, SOCKET_BACKPRESSURE_CLOSE_REASON)
  }

  /**
   * An infrastructure failure as an INSTANCE of the ROOT error class — for refusals where no channel point is (or may
   * be) resolved yet: bad tickets, unknown connections. The instance is what the refusal events carry; the wire gets
   * {@link serializeErrorInstance} of the same object, so the frame and the event never drift.
   */
  private infraError(message: string, code: string): ErrorPoint0 {
    const ErrorClass = this.server.points.manager.root._Error
    return new ErrorClass(message, { code })
  }

  /** Same public serialization as every other error on the wire, for an error instance already in hand. */
  private serializeErrorInstance(error: ErrorPoint0): string {
    return JSON.stringify(this.server.points.manager.root._Error.serializePublic(error))
  }

  private serializeInfraError(message: string, code: string): string {
    return this.serializeErrorInstance(this.infraError(message, code))
  }

  private serializeError(point: AnyPoint, error: unknown): string {
    const ErrorClass = point._Error
    return JSON.stringify(ErrorClass.serializePublic(ErrorClass.from(error)))
  }

  /**
   * A room topic is namespaced by the SPACE name (a space belongs to exactly one channel; space names are unique per
   * scope).
   */
  private roomTopic(scope: PointsScope, spaceName: string, roomSerialized: string): string {
    return `${scope}:${spaceName}:${roomSerialized}`
  }

  /**
   * The space-wide topic — every socket with at least one membership of the space subscribes it (first membership in,
   * last one out). A bare space-handler `sendToClient(input)` publishes here: "everyone in the space" stays a hot
   * pub/sub path, not a scan. The star name cannot collide with a room (rooms are serialized JSON).
   */
  private spaceTopic(scope: PointsScope, spaceName: string): string {
    return `${scope}:${spaceName}:*space*`
  }

  private channelTopic(scope: PointsScope, channelName: string): string {
    return `${scope}:${channelName}:*all*`
  }

  /** The `entriesBySpace` index key (also the space-topic string — one canonical form). */
  private spaceKey(scope: PointsScope, spaceName: string): string {
    return `${scope}:${spaceName}`
  }

  // the room index — kept in step with the entries' room sets; keys are canonical (space-transformer stringify)

  private indexRooms(entry: SocketConnectionEntry, spaceName: string, roomsSerialized: Iterable<string>): void {
    const spaceKey = this.spaceKey(entry.scope, spaceName)
    const bySpace = this.entriesBySpace.get(spaceKey) ?? new Set()
    bySpace.add(entry)
    this.entriesBySpace.set(spaceKey, bySpace)
    for (const roomSerialized of roomsSerialized) {
      const roomKey = this.roomTopic(entry.scope, spaceName, roomSerialized)
      const byRoom = this.entriesByRoom.get(roomKey) ?? new Set()
      byRoom.add(entry)
      this.entriesByRoom.set(roomKey, byRoom)
    }
  }

  /**
   * Drop an entry from the index for the given rooms — call AFTER removing them from its participation (the room map IS
   * the truth); the space index goes at zero rooms.
   */
  private unindexRooms(entry: SocketConnectionEntry, spaceName: string, roomsSerialized: Iterable<string>): void {
    const participation = entry.spaces.get(spaceName)
    for (const roomSerialized of roomsSerialized) {
      if (participation?.rooms.has(roomSerialized)) {
        continue
      }
      const roomKey = this.roomTopic(entry.scope, spaceName, roomSerialized)
      const byRoom = this.entriesByRoom.get(roomKey)
      if (byRoom) {
        byRoom.delete(entry)
        if (byRoom.size === 0) {
          this.entriesByRoom.delete(roomKey)
          // the last local member of the room left — its bus topic starts the unsubscribe linger, its stream dies
          this.maybeReleaseBusTopic(this.busRoomTopic(entry.scope, entry.channelName, spaceName, roomSerialized))
          this.releaseStream(roomKey)
        }
      }
    }
    if (!participation || participation.rooms.size === 0) {
      const spaceKey = this.spaceKey(entry.scope, spaceName)
      const bySpace = this.entriesBySpace.get(spaceKey)
      if (bySpace) {
        bySpace.delete(entry)
        if (bySpace.size === 0) {
          this.entriesBySpace.delete(spaceKey)
          this.maybeReleaseBusTopic(this.busSpaceTopic(entry.scope, entry.channelName, spaceName))
          this.releaseStream(this.spaceTopic(entry.scope, spaceName))
        }
      }
    }
  }

  /**
   * The ONE write path for rooms — a client join, the `.enroller`, an imperative `space.enroll`: union the rooms into
   * the connection's participation, index them, subscribe the space-wide and room topics. Returns the rooms that were
   * actually new. The cap is checked by the caller (`roomsFit`) so each entry point answers in its own dialect (joinErr
   * / claimErr / a skipped connection).
   */
  private addRoomsToEntry(
    entry: SocketConnectionEntry,
    spacePoint: AnyPoint,
    rooms: Array<{ serialized: string; parsed: unknown }>,
  ): string[] {
    // a clean deny (or an empty enrollment) adds NOTHING — creating an empty participation here would index the
    // connection as a space member and subscribe it to the space-wide topic, so a DENIED join would still hear every
    // bare space push. A participation exists from the first room and drops at zero rooms, exactly as documented
    if (rooms.length === 0) {
      return []
    }
    const spaceName = spacePoint.name
    const hadParticipation = entry.spaces.has(spaceName)
    const participation = entry.spaces.get(spaceName) ?? { spacePoint, rooms: new Map<string, unknown>() }
    entry.spaces.set(spaceName, participation)
    const added: string[] = []
    for (const room of rooms) {
      if (!participation.rooms.has(room.serialized)) {
        added.push(room.serialized)
      }
      participation.rooms.set(room.serialized, room.parsed)
    }
    this.indexRooms(entry, spaceName, participation.rooms.keys())
    // the first room of the space on this socket subscribes the space-wide topic (idempotent — Bun's pub/sub is a set)
    entry.ws.subscribe(this.spaceTopic(entry.scope, spaceName))
    for (const roomSerialized of added) {
      entry.ws.subscribe(this.roomTopic(entry.scope, spaceName, roomSerialized))
    }
    if (this.spaceInResume(spacePoint) && entry.streamEpochs) {
      // the subscription EPOCHS — where each freshly-entered stream's gap proof starts for this connection: frames
      // from before it subscribed are not its gap. A re-entered room re-stamps (the leave deleted the old epoch)
      if (!hadParticipation) {
        entry.streamEpochs.set(
          this.spaceTopic(entry.scope, spaceName),
          this.streamTseq(this.spaceTopic(entry.scope, spaceName)),
        )
      }
      for (const roomSerialized of added) {
        const roomKey = this.roomTopic(entry.scope, spaceName, roomSerialized)
        entry.streamEpochs.set(roomKey, this.streamTseq(roomKey))
      }
      // a resumable connection's passport mirrors its rooms — write it through (an opt-out space's change never
      // touches the KV: its rooms are not in the passport, so the record is unchanged)
      if (added.length > 0) {
        this.writeConnRecordThrough(entry)
      }
    }
    return added
  }

  /**
   * The ONE removal path — a client leave, a space kick, a cleanup: drop the named rooms from the participation,
   * unindex, release the now-unneeded topics (and the space-wide one when the space is empty), and emit the leave event
   * with what actually went. Returns the removed rooms (serialized).
   */
  private removeRoomsFromEntry(
    entry: SocketConnectionEntry,
    spaceName: string,
    roomsSerialized: Iterable<string>,
    reason: 'leave' | 'socket' | 'kick' | 'close',
  ): string[] {
    const participation = entry.spaces.get(spaceName)
    if (!participation) {
      return []
    }
    const removed: string[] = []
    const removedParsed: unknown[] = []
    for (const roomSerialized of roomsSerialized) {
      if (!participation.rooms.has(roomSerialized)) {
        continue
      }
      removedParsed.push(participation.rooms.get(roomSerialized))
      participation.rooms.delete(roomSerialized)
      removed.push(roomSerialized)
    }
    if (removed.length === 0) {
      return []
    }
    const spacePoint = participation.spacePoint
    if (participation.rooms.size === 0) {
      entry.spaces.delete(spaceName)
    }
    // the epochs die with the subscriptions — a later re-join re-stamps fresh ones (frames from the absence are not
    // this connection's gap, and the floor `max(cursor, epoch)` is what encodes that)
    if (entry.streamEpochs) {
      for (const roomSerialized of removed) {
        entry.streamEpochs.delete(this.roomTopic(entry.scope, spaceName, roomSerialized))
      }
      if (!entry.spaces.has(spaceName)) {
        entry.streamEpochs.delete(this.spaceTopic(entry.scope, spaceName))
      }
    }
    this.unindexRooms(entry, spaceName, removed)
    for (const roomSerialized of removed) {
      this.releaseRoomTopic(entry.ws, entry.scope, spaceName, roomSerialized)
    }
    this.releaseSpaceTopic(entry.ws, entry.scope, spaceName)
    // the passport mirror of the removal — a no-op for a dead entry (its record is frozen at death) and for an
    // opt-out space (its rooms were never in the passport). A PARKED entry's passport DOES shrink: a space kick
    // during the park is a revocation, and the record must stop promising the kicked rooms
    if (this.spaceInResume(spacePoint)) {
      this.writeConnRecordThrough(entry)
    }
    // a parked entry's death already announced the leave of every room ('socket') — a removal while parked must not
    // announce a second leave for a publicly dead connection
    if (this.parkedByCid.get(entry.cid)?.entry !== entry) {
      this.emitSpaceLeaveEvent(entry, spacePoint, removedParsed, reason)
    }
    return removed
  }

  /**
   * The room cap — `maxRooms` counts EVERY room of the space on the connection, whoever put it there. Deliberate: an
   * option set is an option respected on every write path (the channel's `maxConnections` is not "unless the server
   * meant it" either); an app that enrolls widely raises the number.
   */
  private roomsFit(entry: SocketConnectionEntry, spacePoint: AnyPoint, incoming: Iterable<string>): boolean {
    const maxRooms = spacePoint._getSpacePointOptions().maxRooms
    const existing = entry.spaces.get(spacePoint.name)?.rooms
    const total = new Set(existing ? existing.keys() : [])
    for (const roomSerialized of incoming) {
      total.add(roomSerialized)
    }
    return total.size <= maxRooms
  }

  /** Every space point of a channel (collection order) — the enrollment walk. */
  private spacePointsOfChannel(scope: PointsScope, channelName: string): AnyPoint[] {
    return this.server.points.manager.collection
      .filter((record) => record.type === 'space')
      .map((record) => record.point)
      .filter((point) => point.scope === scope && point._channelPoint?.name === channelName)
  }

  /**
   * Run every space's `.enroller` for a fresh connection (both connect paths call this before the `claimed` frame) —
   * union the rooms into the entry, subscribe the topics, and return what the claimed frame carries. Sequential in
   * collection order, so a later enroller's `memberships.local.rooms({ connectionId })` sees the earlier enrollments. A
   * throw propagates — the caller fails the connection setup; an enrollment past `maxRooms` throws the same way (the
   * cap is respected on every write path).
   */
  private async enrollConnection(entry: SocketConnectionEntry): Promise<Array<{ space: string; rooms: string[] }>> {
    const enrolled: Array<{ space: string; rooms: string[] }> = []
    for (const spacePoint of this.spacePointsOfChannel(entry.scope, entry.channelName)) {
      if (!spacePoint._enrollerFn) {
        continue
      }
      const { roomsSerialized, rooms } = await spacePoint._executeEnroller({
        identity: entry.identityParsed,
        connectionId: entry.cid,
        points: this.server.points as NiceServerPoints,
      })
      // the room bus topics go up BEFORE the enrollment is indexed and the claimed frame announces it — a room push
      // published right after the connect confirmation must already have this process listening
      await this.subscribeRoomBusTopics(entry, spacePoint.name, roomsSerialized)
      // the socket may have died while the enroller (or the subscribe) ran — a dead entry must not re-enter the room
      // index (nothing could ever remove it: every removal path starts from the live `connections` map). Both
      // engine-side refusals close the join family with the error — a Start must never dangle
      if (this.connections.get(entry.cid) !== entry) {
        this.sweepRoomBusTopics(entry, spacePoint.name, roomsSerialized)
        const closedError = new spacePoint._Error('Socket connection closed during enrollment', {
          code: POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND,
        })
        spacePoint._emitSpaceJoinSettled({
          rooms: undefined,
          identity: entry.identityParsed,
          connectionId: entry.cid,
          error: closedError,
        })
        throw closedError
      }
      if (!this.roomsFit(entry, spacePoint, roomsSerialized)) {
        this.sweepRoomBusTopics(entry, spacePoint.name, roomsSerialized)
        const maxRoomsError = new spacePoint._Error(`Too many rooms of space "${spacePoint.name}" on one connection`, {
          code: POINT0_ERROR_CODES_MAP.SOCKET_MAX_ROOMS,
        })
        spacePoint._emitSpaceJoinSettled({
          rooms: undefined,
          identity: entry.identityParsed,
          connectionId: entry.cid,
          error: maxRoomsError,
        })
        throw maxRoomsError
      }
      this.addRoomsToEntry(
        entry,
        spacePoint,
        roomsSerialized.map((serialized, index) => ({ serialized, parsed: rooms[index] })),
      )
      // the enrollment is registered — only now does the join family settle (an enrollment IS a join, with an empty
      // input): a `pointSpaceJoinServerSuccess` handler reading the room sees this connection in it
      spacePoint._emitSpaceJoinSettled({ rooms, identity: entry.identityParsed, connectionId: entry.cid })
      enrolled.push({ space: spacePoint.name, rooms: roomsSerialized })
    }
    return enrolled
  }

  private async handleClaim(ws: Bun.ServerWebSocket<SocketData>, ticket: string): Promise<void> {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    // the ONE refusal path of the ticket claim: the frame the client reads and the server-side event, from one place —
    // the cid is known only once the ticket resolved to a record (`reason` says how far the claim got)
    const fail: ClaimFailFn = (message, code, reason, cid) => {
      const error = this.infraError(message, code)
      this.send(ws, { t: 'claimErr', ticket, cid: '', error: this.serializeErrorInstance(error) })
      this.emitClaimError({ scope: socketData.scope, connectionId: cid, reason, error })
    }
    // a ticket is one-time: the KV get→delete pair is not atomic, so a concurrent claim of the SAME ticket (two
    // frames racing the awaits) is refused synchronously here — the in-flight set is this process's atomicity
    if (this.claimingTickets.has(ticket)) {
      fail('Unknown or expired socket ticket', POINT0_ERROR_CODES_MAP.SOCKET_TICKET_INVALID, 'ticket')
      return
    }
    this.claimingTickets.add(ticket)
    try {
      await this.handleClaimInner(ws, ticket, fail)
    } finally {
      this.claimingTickets.delete(ticket)
    }
  }

  private async handleClaimInner(
    ws: Bun.ServerWebSocket<SocketData>,
    ticket: string,
    fail: ClaimFailFn,
  ): Promise<void> {
    const socketData = ws.data.__point0Socket
    if (!socketData) {
      return
    }
    const backplane = await this.getBackplane()
    // the ticket is consumed by the read: `getDelete` (Redis GETDEL) does it atomically, which is what closes a double
    // claim ACROSS processes — a backplane without it falls back to the read then the delete, two steps that only the
    // in-flight `claimingTickets` guard (this process) can keep from interleaving
    const ticketKey = this.ticketKey(ticket)
    const rawTicket = backplane.getDelete ? await backplane.getDelete(ticketKey) : await backplane.get(ticketKey)
    if (!rawTicket) {
      fail('Unknown or expired socket ticket', POINT0_ERROR_CODES_MAP.SOCKET_TICKET_INVALID, 'ticket')
      return
    }
    const storedTicket = JSON.parse(rawTicket) as StoredTicket
    if (!backplane.getDelete) {
      await backplane.delete(ticketKey)
    }
    if (storedTicket.exp < Date.now()) {
      await backplane.delete(this.connKey(storedTicket.cid))
      fail('Socket ticket expired', POINT0_ERROR_CODES_MAP.SOCKET_TICKET_INVALID, 'ticket', storedTicket.cid)
      return
    }
    // the bare websocket endpoint is per-scope — a ticket minted for another scope's channel must not bind here
    // (the socket rode this scope's middleware pipeline; the entry would land in topics the dial never authorized)
    if (storedTicket.scope !== socketData.scope) {
      await backplane.delete(this.connKey(storedTicket.cid))
      fail('Unknown or expired socket ticket', POINT0_ERROR_CODES_MAP.SOCKET_TICKET_INVALID, 'ticket', storedTicket.cid)
      return
    }
    const rawConnection = await backplane.get(this.connKey(storedTicket.cid))
    if (!rawConnection) {
      fail(
        'Socket connection not found',
        POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND,
        'connection',
        storedTicket.cid,
      )
      return
    }
    const storedConnection = JSON.parse(rawConnection) as StoredConnection
    // the ticket's scope was checked above; the RECORD carries its own, and it is the one the entry is filed under.
    // Both are written by the same `createConnection`, so they agree — but every resume path re-checks the record's
    // scope, and a claim that trusted it would be the one way a record could file an entry into a scope this socket
    // never dialed (and never ran the middlewares of)
    if (storedConnection.scope !== socketData.scope) {
      await backplane.delete(this.connKey(storedTicket.cid))
      fail('Unknown or expired socket ticket', POINT0_ERROR_CODES_MAP.SOCKET_TICKET_INVALID, 'ticket', storedTicket.cid)
      return
    }
    const channelRecord = this.server.points.findPoint({
      scope: storedConnection.scope,
      type: 'channel',
      name: storedConnection.channel,
    })
    if (!channelRecord) {
      await backplane.delete(this.connKey(storedTicket.cid))
      fail(
        `Channel point "${storedConnection.channel}" not found`,
        POINT0_ERROR_CODES_MAP.NOT_FOUND,
        'channel',
        storedTicket.cid,
      )
      return
    }
    const channelPoint = channelRecord.point
    const options = channelPoint._getChannelPointOptions()
    const sameChannelCount = [...socketData.cids].filter(
      (cid) => this.connections.get(cid)?.channelName === storedConnection.channel,
    ).length
    if (sameChannelCount >= options.maxConnections) {
      const capError = Object.assign(new Error(`Too many live connections to channel "${storedConnection.channel}"`), {
        code: POINT0_ERROR_CODES_MAP.SOCKET_MAX_CONNECTIONS,
      })
      this.send(ws, {
        t: 'claimErr',
        ticket,
        cid: storedTicket.cid,
        error: this.serializeError(channelPoint, capError),
      })
      this.emitClaimError({
        scope: storedConnection.scope,
        point: channelPoint,
        connectionId: storedTicket.cid,
        reason: 'maxConnections',
        error: capError,
      })
      await backplane.delete(this.connKey(storedTicket.cid))
      return
    }
    const channelTransformer = channelPoint._getSocketTransformer()
    const entry: SocketConnectionEntry = {
      cid: storedTicket.cid,
      scope: storedConnection.scope,
      channelName: storedConnection.channel,
      channelPoint,
      identitySerialized: storedConnection.identity,
      identityParsed: channelTransformer.parse(storedConnection.identity),
      spaces: new Map(),
      connJson: rawConnection,
      connectionTtl: options.connectionTtl,
      lastRenewedAt: Date.now(),
      replyForwards: { windowStart: 0, count: 0 },
      ws,
    }
    this.connections.set(storedTicket.cid, entry)
    socketData.cids.add(storedTicket.cid)
    // a resumable channel's connection is born with its credential — the hash rides the record, the key the frame
    const resumeKey = this.mintResumeCredential(entry)
    // start the sliding TTL window from the claim
    this.kvSafe(() => backplane.set(this.connKey(entry.cid), entry.connJson, entry.connectionTtl), 'renew-on-claim')
    // client-joined rooms arrive via joins — the claim subscribes the channel-wide `*all*` topic and runs the
    // server-side enrollments (see `installUpgradeConnection` for why a throwing enroller fails the claim)
    ws.subscribe(this.channelTopic(entry.scope, entry.channelName))
    // the channel bus topic goes up BEFORE the claimed frame (subscribe-before-confirm, like every room grant)
    this.indexEntryChannel(entry)
    await this.subscribeBusTopics([this.busTopicNeedForChannel(entry.scope, entry.channelName)])
    let enrolled: Array<{ space: string; rooms: string[] }>
    try {
      enrolled = await this.enrollConnection(entry)
    } catch (error) {
      await this.cleanupConnection(entry.cid, 'close')
      this.send(ws, {
        t: 'claimErr',
        ticket,
        cid: entry.cid,
        error: this.serializeError(entry.channelPoint, error),
      })
      this.emitClaimError({
        scope: entry.scope,
        point: entry.channelPoint,
        connectionId: entry.cid,
        reason: 'enroller',
        error,
      })
      return
    }
    // the socket may have died while the enrollers ran — its close already cleaned the entry up; announcing a dead
    // connection open would leave an Open with no Close
    if (this.connections.get(entry.cid) !== entry) {
      return
    }
    this.send(ws, {
      t: 'claimed',
      cid: storedTicket.cid,
      ...(enrolled.length > 0 ? { enrolled } : {}),
      ...(resumeKey === undefined ? {} : { resumeKey, heads: this.claimStreamHeads(entry, enrolled) }),
    })
    entry.opened = true
    this.emitChannelConnectionEvent('pointChannelOpenServer', entry, { resumed: false })
  }

  // resume — the claim's cheap sibling: restore what a record (or this process's memory) already proves, run nothing

  /**
   * The first frame of a fresh socket may offer resume entries for the client's resumable connections — each is settled
   * independently (`resumed` / `resumeErr`; mixed results are legal, order preserved). Three paths per cid, cheapest
   * first: a LIVE entry (the server never noticed the death) is a TAKEOVER — the zombie socket loses the binding, the
   * new one gets it; a PARKED entry revives in place and its streams replay; anything else restores from the KV
   * passport — identity and rooms re-enter from the record, no connector, no joiners, no enrollers. Every refusal is
   * the ONE `resumeErr` shape: an unknown cid and a wrong key answer identically, so the frame tells an attacker
   * nothing, and the client's answer to any refusal is the ordinary full connect anyway. (The frame, not the clock: a
   * cid live or parked on THIS process is refused without touching the backplane, so the latency still separates "not
   * here" from "here, wrong key". Cids are random uuids, so that is a liveness probe for a cid you already hold, not an
   * enumeration primitive.)
   */
  private async handleResume(
    ws: Bun.ServerWebSocket<SocketData>,
    frame: SocketClientFrame & { t: 'resume' },
  ): Promise<void> {
    const socketData = ws.data.__point0Socket
    if (!socketData || !Array.isArray(frame.entries)) {
      return
    }
    // the frame came off the wire — the cast above promises nothing about the ELEMENTS, so each is re-read as the
    // untrusted record it is (a malformed entry with a readable cid still gets its refusal; one without is ignored).
    // Non-numeric cursor values are dropped rather than refused — an absent cursor means "never heard the stream",
    // which the floor (`max(cursor, epoch)`) resolves honestly
    for (const offered of frame.entries as unknown[]) {
      const entry = (offered ?? {}) as { cid?: unknown; key?: unknown; cursors?: unknown }
      // the same bound the frame's own ids answer to (the resolved wire limits) — a cid is interpolated into a
      // backplane key, and one the size of a payload is not a cid
      if (
        typeof entry.cid !== 'string' ||
        entry.cid === '' ||
        entry.cid.length > this.server.socketOptions.maxFrameIdLength
      ) {
        continue
      }
      if (
        typeof entry.key !== 'string' ||
        entry.key.length > this.server.socketOptions.maxFrameIdLength ||
        entry.cursors === null ||
        typeof entry.cursors !== 'object' ||
        Array.isArray(entry.cursors)
      ) {
        this.send(ws, { t: 'resumeErr', cid: entry.cid })
        continue
      }
      const cursors: Record<string, number> = {}
      for (const [streamKey, value] of Object.entries(entry.cursors as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          cursors[streamKey] = Math.max(0, Math.floor(value))
        }
      }
      await this.resumeOne(ws, socketData, { cid: entry.cid, key: entry.key, cursors })
    }
  }

  /** `maxConnections` counts on the NEW socket from zero — a resume batch respects the cap like a claim would. */
  private resumeFitsSocket(
    socketData: NonNullable<SocketData['__point0Socket']>,
    channelPoint: AnyPoint,
    channelName: string,
  ): boolean {
    const sameChannelCount = [...socketData.cids].filter(
      (cid) => this.connections.get(cid)?.channelName === channelName,
    ).length
    return sameChannelCount < channelPoint._getChannelPointOptions().maxConnections
  }

  private async resumeOne(
    ws: Bun.ServerWebSocket<SocketData>,
    socketData: NonNullable<SocketData['__point0Socket']>,
    offered: { cid: string; key: string; cursors: Record<string, number> },
  ): Promise<void> {
    const { cid, key, cursors } = offered
    const refuse = (): void => {
      this.send(ws, { t: 'resumeErr', cid })
    }
    // 1. TAKEOVER — the entry is alive (the client noticed the death first; its pong deadline beats the server's
    // idleTimeout by design). Not an anomaly but the main scenario: close the zombie binding, attach the new socket,
    // and the streams make the handover seamless. Last-wins on purpose — see "two tabs" in the security notes.
    const live = this.connections.get(cid)
    if (live) {
      if (
        live.scope !== socketData.scope ||
        live.resumeKeyHash === undefined ||
        !this.resumeKeyMatchesHash(key, live.resumeKeyHash)
      ) {
        refuse()
        return
      }
      if (live.ws !== ws && !this.resumeFitsSocket(socketData, live.channelPoint, live.channelName)) {
        refuse()
        return
      }
      this.takeOverEntry(live, ws, socketData)
      this.answerResume(live, cursors)
      return
    }
    // 2. UNPARK — this process parked it and has been buffering; the KV record is still the RIGHT to resume (a kick
    // deleted it, a TTL lapse ended it — the buffer alone must not outvote either). ORDER IS LOAD-BEARING: every
    // await runs while the entry is STILL PARKED (frames landing meanwhile keep going to the streams only), each
    // await re-validates the park (the sweep timer or a concurrent resume may have raced it — an entry revived after
    // a sweep would live OUTSIDE every index), and the unpark→attach→answer runs as ONE synchronous block, with the
    // Open/join announcements AFTER the answer — an event subscriber that synchronously pushes must land its frame
    // after the replay, delivered live exactly once (before this ordering it was both logged above the client's
    // floor AND sent live: a duplicate).
    const parked = this.parkedByCid.get(cid)
    if (parked) {
      const entry = parked.entry
      if (
        entry.scope !== socketData.scope ||
        entry.resumeKeyHash === undefined ||
        !this.resumeKeyMatchesHash(key, entry.resumeKeyHash)
      ) {
        // the park stays — a wrong key must not evict the rightful owner's buffer
        refuse()
        return
      }
      const backplane = await this.getBackplane()
      const raw = await backplane.get(this.connKey(cid))
      if (this.parkedByCid.get(cid)?.entry !== entry) {
        // the park ended under the await (swept, or another socket's resume won it) — this offer starts over against
        // the CURRENT state: a live entry is a takeover, a swept one a KV restore (both re-index in full)
        await this.resumeOne(ws, socketData, offered)
        return
      }
      if (!raw) {
        this.sweepParked(cid)
        refuse()
        return
      }
      if (!this.resumeFitsSocket(socketData, entry.channelPoint, entry.channelName)) {
        refuse()
        return
      }
      // the park kept the topics subscribed (its rooms never left the index) — the ensure is an idempotent belt that
      // also retries a subscribe that failed during the park, done BEFORE the entry goes live
      await this.subscribeBusTopics([
        this.busTopicNeedForChannel(entry.scope, entry.channelName),
        ...[...entry.spaces.entries()].flatMap(([spaceName, participation]) =>
          this.busTopicNeedsForRooms(entry.scope, entry.channelName, spaceName, participation.rooms.keys()),
        ),
      ])
      if (this.parkedByCid.get(cid)?.entry !== entry) {
        await this.resumeOne(ws, socketData, offered)
        return
      }
      // the FRESH socket may have died while the awaits ran — its close already happened (no cid was bound to it, so
      // nothing cleaned this entry): leave the park in place for a later resume instead of attaching a corpse
      if (((ws as unknown as { readyState?: number }).readyState ?? 1) !== 1) {
        return
      }
      // ---- the synchronous unpark: nothing can interleave from here to the answer ----
      this.parkedByCid.delete(cid)
      clearTimeout(parked.timer)
      this.attachEntryToSocket(entry, ws, socketData)
      this.connections.set(cid, entry)
      this.kvSafe(() => backplane.set(this.connKey(cid), entry.connJson, entry.connectionTtl), 'renew-on-resume')
      this.answerResume(entry, cursors)
      // the revocations the client slept through: a space kick during the park removed rooms it still believes in —
      // the queued `left` frames follow the replay, exactly where a live kick's `left` would have landed
      for (const frame of parked.pendingLeft) {
        this.send(entry.ws, frame)
      }
      // the park announced the death (Close + leaves) — the revival announces the re-entry symmetrically, with the
      // resumed flag: no connector ran for this open. AFTER the answer on purpose (see the block comment above)
      entry.opened = true
      this.emitChannelConnectionEvent('pointChannelOpenServer', entry, { resumed: true })
      this.emitResumedJoins(entry)
      return
    }
    // 3. KV RESTORE — the passport is all there is (a redeploy, a lapsed park): rebuild the entry from the record,
    // run nothing, and let the client know the buffer could not vouch for the gap (`gapless: false`)
    const backplane = await this.getBackplane()
    const raw = await backplane.get(this.connKey(cid))
    if (!raw) {
      refuse()
      return
    }
    let stored: StoredConnection
    try {
      stored = JSON.parse(raw) as StoredConnection
    } catch {
      refuse()
      return
    }
    if (!stored.resume || stored.scope !== socketData.scope) {
      refuse()
      return
    }
    const channelRecord = this.server.points.findPoint({ scope: stored.scope, type: 'channel', name: stored.channel })
    if (!channelRecord || !this.channelResumable(channelRecord.point)) {
      // the channel left the codebase, or the deploy flipped `resumable` off — the record no longer grants anything
      refuse()
      return
    }
    if (!this.resumeKeyMatchesHash(key, stored.resume.keyHash)) {
      refuse()
      return
    }
    const channelPoint = channelRecord.point
    if (!this.resumeFitsSocket(socketData, channelPoint, stored.channel)) {
      refuse()
      return
    }
    const entry: SocketConnectionEntry = {
      cid,
      scope: stored.scope,
      channelName: stored.channel,
      channelPoint,
      identitySerialized: stored.identity,
      identityParsed: channelPoint._getSocketTransformer().parse(stored.identity),
      spaces: new Map(),
      connJson: raw,
      connectionTtl: channelPoint._getChannelPointOptions().connectionTtl,
      lastRenewedAt: Date.now(),
      replyForwards: { windowStart: 0, count: 0 },
      resumeKeyHash: stored.resume.keyHash,
      // fresh epochs at the CURRENT stream heads (the room adds below stamp theirs the same way): the restored entry
      // re-enters every stream NOW — and THIS resume answers every verdict `gapless: false` (a restore cannot vouch
      // for the dead window: the personal stream is reborn, and a surviving shared stream's continuity says nothing
      // about the frames assigned while this entry was out of the indexes). The heads reset the client's cursors so
      // the NEXT blip can prove itself against this baseline
      streamEpochs: new Map([
        [
          this.channelTopic(stored.scope, stored.channel),
          this.streamTseq(this.channelTopic(stored.scope, stored.channel)),
        ],
      ]),
      ws,
    }
    this.connections.set(cid, entry)
    this.attachEntryToSocket(entry, ws, socketData)
    // the channel bus topic goes up BEFORE the restore is confirmed — same subscribe-before-confirm as a claim
    this.indexEntryChannel(entry)
    // a bail from the awaits below must UNWIND what this entry already indexed: a close's cleanup handles its own
    // paths, but a CONCURRENT restore of the same cid replaces the map slot without one — the loser's channel/room
    // index entries would otherwise pin streams and bus topics forever. Never touch the state of a park that took
    // the entry over (its rooms belong in the index); the drop is idempotent against a cleanup that already ran
    const unwindLostRestore = (): void => {
      if (this.parkedByCid.get(cid)?.entry !== entry) {
        this.dropEntryFromIndexes(entry)
      }
    }
    await this.subscribeBusTopics([this.busTopicNeedForChannel(entry.scope, entry.channelName)])
    if (this.connections.get(cid) !== entry) {
      unwindLostRestore()
      return
    }
    for (const [spaceName, roomsSerialized] of Object.entries(stored.resume.rooms)) {
      if (roomsSerialized.length === 0) {
        continue
      }
      const spacePoint = this.server.points.findPoint({ scope: stored.scope, type: 'space', name: spaceName })?.point
      // a space the deploy removed (or opted out) restores nothing — the client's own state re-derives what it can
      if (!spacePoint || !this.spaceInResume(spacePoint)) {
        continue
      }
      const transformer = spacePoint._getSocketTransformer()
      const rooms = roomsSerialized.map((serialized) => ({ serialized, parsed: transformer.parse(serialized) }))
      // a restore is a room grant like any other — its bus topics go up before the rooms are indexed
      await this.subscribeRoomBusTopics(entry, spaceName, roomsSerialized)
      if (this.connections.get(cid) !== entry) {
        this.sweepRoomBusTopics(entry, spaceName, roomsSerialized)
        unwindLostRestore()
        return
      }
      this.addRoomsToEntry(entry, spacePoint, rooms)
      // a restore IS a (server-side) re-enter of the rooms — the join family announces it with an empty input,
      // exactly like an enrollment, flagged `resumed` (no joiner/enroller ran); presence recipes stay symmetric with
      // the leave the death announced
      spacePoint._emit(
        'pointSpaceJoinServerStart',
        { input: {}, point: spacePoint, connectionId: cid, identity: entry.identityParsed, resumed: true } as never,
        { point: spacePoint.id, connection: cid },
      )
      spacePoint._emitSpaceJoinSettled({
        rooms: rooms.map((room) => room.parsed),
        identity: entry.identityParsed,
        connectionId: cid,
        resumed: true,
      })
    }
    entry.connJson = this.buildConnJson(entry)
    this.kvSafe(() => backplane.set(this.connKey(cid), entry.connJson, entry.connectionTtl), 'renew-on-resume')
    entry.opened = true
    this.emitChannelConnectionEvent('pointChannelOpenServer', entry, { resumed: true })
    this.answerResume(entry, cursors, { vouch: false })
  }

  /** Bind an entry to its fresh socket: the cid set, the channel topic and its rooms' topics (uniform with a claim). */
  private attachEntryToSocket(
    entry: SocketConnectionEntry,
    ws: Bun.ServerWebSocket<SocketData>,
    socketData: NonNullable<SocketData['__point0Socket']>,
  ): void {
    entry.ws = ws
    socketData.cids.add(entry.cid)
    ws.subscribe(this.channelTopic(entry.scope, entry.channelName))
    for (const [spaceName, participation] of entry.spaces) {
      ws.subscribe(this.spaceTopic(entry.scope, spaceName))
      for (const roomSerialized of participation.rooms.keys()) {
        ws.subscribe(this.roomTopic(entry.scope, spaceName, roomSerialized))
      }
    }
  }

  /** The takeover half of a resume — the LIVE entry moves to the new socket, the zombie binding closes. */
  private takeOverEntry(
    entry: SocketConnectionEntry,
    ws: Bun.ServerWebSocket<SocketData>,
    socketData: NonNullable<SocketData['__point0Socket']>,
  ): void {
    const oldWs = entry.ws
    if (oldWs === ws) {
      // a repeated resume on the same socket — nothing to move
      socketData.cids.add(entry.cid)
      return
    }
    oldWs.data.__point0Socket?.cids.delete(entry.cid)
    this.attachEntryToSocket(entry, ws, socketData)
    // the zombie socket: usually long dead (the client noticed first); close it once it carries nothing — its
    // handleClose then sweeps an empty cid set and cannot touch the moved connection
    if ((oldWs.data.__point0Socket?.cids.size ?? 0) === 0) {
      try {
        oldWs.close()
      } catch {
        // already gone
      }
    }
    this.kvSafe(async () => {
      const backplane = await this.getBackplane()
      await backplane.set(this.connKey(entry.cid), entry.connJson, entry.connectionTtl)
    }, 'renew-on-resume')
  }

  /** Re-announce the join family for a revived (unparked) entry's rooms — the mirror of the leaves the park fired. */
  private emitResumedJoins(entry: SocketConnectionEntry): void {
    for (const participation of entry.spaces.values()) {
      if (participation.rooms.size === 0) {
        continue
      }
      const spacePoint = participation.spacePoint
      spacePoint._emit(
        'pointSpaceJoinServerStart',
        {
          input: {},
          point: spacePoint,
          connectionId: entry.cid,
          identity: entry.identityParsed,
          resumed: true,
        } as never,
        { point: spacePoint.id, connection: entry.cid },
      )
      spacePoint._emitSpaceJoinSettled({
        rooms: [...participation.rooms.values()],
        identity: entry.identityParsed,
        connectionId: entry.cid,
        resumed: true,
      })
    }
  }

  /**
   * Answer a resume — per STREAM of the connection (channel-wide, personal, each space-wide, each room of the spaces in
   * the resume): the verdict and the head, then the merged replay. The floor of a stream is `max(client cursor,
   * subscription epoch)` — frames from before this connection subscribed are not its gap. `gapless` is the PROOF, not a
   * guess: the cursor is within what the stream assigned, no non-buffered frame passed the floor, and nothing above the
   * floor was evicted. The replay is the union of every stream's log above its floor, ordered by the process delivery
   * clock — ONE tail, so the total per-connection order survives across streams; a replayed TOPIC frame is re-addressed
   * to this connection (`rcid`) so another connection sharing the topic does not dispatch it twice. A KV restore passes
   * `vouch: false`: every verdict is forced `false` and nothing replays — the reborn entry re-enters its streams at the
   * current heads (its epochs), and a restore cannot vouch for the window it slept through. A process whose delivery
   * clock saturated ({@link deliveryClockSaturated}) takes the same branch for every resume, for the same reason: it can
   * no longer number frames apart, so it cannot prove a gap's absence.
   */
  private answerResume(
    entry: SocketConnectionEntry,
    cursors: Record<string, number>,
    options?: { vouch?: false },
  ): void {
    const vouch = options?.vouch !== false && !this.deliveryClockSaturated
    const streams: Record<string, { gapless: boolean; head: number }> = {}
    const replay: Array<{ stamp: number; json: string; topicFrame: boolean }> = []
    const epochs = entry.streamEpochs
    // the per-handler replay policy, memoized per answer — a `'gapless'` handler's frames are skipped in a stream
    // whose recovery is gappy (only the honest verdict reaches the client; the refetch is its whole catch-up)
    const replayPolicies = new Map<string, 'always' | 'gapless'>()
    const replayPolicyOf = (handlerName: string): 'always' | 'gapless' => {
      let policy = replayPolicies.get(handlerName)
      if (policy === undefined) {
        policy = this.handlerReplayPolicy(entry.scope, handlerName)
        replayPolicies.set(handlerName, policy)
      }
      return policy
    }
    const judge = (wireKey: string, stream: TopicStream | undefined, epoch: number, topicFrame: boolean): void => {
      const cursor = cursors[wireKey] ?? 0
      const floor = Math.max(cursor, epoch)
      const tseq = stream?.tseq ?? 0
      const gapless =
        vouch &&
        cursor <= tseq &&
        (stream === undefined || (stream.maxNonBufferedTseq <= floor && stream.evictedMaxTseq <= floor))
      streams[wireKey] = { gapless, head: tseq }
      if (vouch && stream !== undefined) {
        for (const buffered of stream.log) {
          if (buffered.tseq > floor && (gapless || replayPolicyOf(buffered.handler) === 'always')) {
            replay.push({ stamp: buffered.stamp, json: buffered.json, topicFrame })
          }
        }
      }
    }
    const channelTopicKey = this.channelTopic(entry.scope, entry.channelName)
    judge('c', this.streams.get(channelTopicKey), epochs?.get(channelTopicKey) ?? 0, true)
    judge('p', entry.personalStream, 0, false)
    for (const [spaceName, participation] of entry.spaces) {
      if (!this.spaceInResume(participation.spacePoint)) {
        continue
      }
      const spaceTopicKey = this.spaceTopic(entry.scope, spaceName)
      judge(this.spaceStreamWireKey(spaceName), this.streams.get(spaceTopicKey), epochs?.get(spaceTopicKey) ?? 0, true)
      for (const roomSerialized of participation.rooms.keys()) {
        const roomKey = this.roomTopic(entry.scope, spaceName, roomSerialized)
        judge(
          this.roomStreamWireKey(spaceName, roomSerialized),
          this.streams.get(roomKey),
          epochs?.get(roomKey) ?? 0,
          true,
        )
      }
    }
    this.send(entry.ws, { t: 'resumed', cid: entry.cid, streams })
    replay.sort((a, b) => a.stamp - b.stamp)
    for (const item of replay) {
      // every replayed frame is MARKED (`rp`) — the client surfaces it as `replayed` in the message props, so an app
      // that refetches on a gap can skip the partial catch-up in one line; a topic frame is additionally re-addressed
      // to this connection (`rcid`). A parse+patch at replay time (rare) instead of a per-recipient copy at push
      // time (hot)
      const frame = JSON.parse(item.json) as SocketServerFrame & { t: 'msg' }
      this.send(entry.ws, { ...frame, rp: true, ...(item.topicFrame ? { rcid: entry.cid } : {}) })
    }
  }

  // join / leave — the participation model: the join INPUT lives exactly one function call (it enters the joiner,
  // rooms come out, it is forgotten); the server stores connection + rooms, nothing keyed by input

  private async handleJoin(
    ws: Bun.ServerWebSocket<SocketData>,
    frame: SocketClientFrame & { t: 'join' },
    message: string | Buffer,
  ): Promise<void> {
    const entry = this.connections.get(frame.cid)
    if (!entry || entry.ws !== ws) {
      this.send(ws, {
        t: 'joinErr',
        id: frame.id,
        error: this.serializeInfraError(
          'Unknown socket connection',
          POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND,
        ),
      })
      return
    }
    const spaceRecord = this.server.points.findPoint({ scope: entry.scope, type: 'space', name: frame.space })
    // a space of ANOTHER channel is "not found" for this connection (same message — no oracle): the join would run
    // the joiner against an identity a different connector produced, bypassing that channel's own gate
    if (!spaceRecord || spaceRecord.point._channelPoint?.name !== entry.channelName) {
      this.send(ws, {
        t: 'joinErr',
        id: frame.id,
        error: this.serializeError(
          entry.channelPoint,
          Object.assign(new Error(`space point "${frame.space}" not found`), {
            code: POINT0_ERROR_CODES_MAP.SOCKET_SPACE_NOT_FOUND,
          }),
        ),
      })
      return
    }
    const spacePoint = spaceRecord.point
    // the join frame is bounded by the CHANNEL's maxMessageSize (the same cap every socket message answers to) —
    // measured on the RAW message, like `send`/`reply`, so whitespace padding cannot slip past the cap
    if (this.exceedsChannelMaxMessageSize(entry, message)) {
      this.send(ws, {
        t: 'joinErr',
        id: frame.id,
        error: this.serializeError(
          entry.channelPoint,
          Object.assign(new Error('Join message is bigger than the channel maxMessageSize'), {
            code: POINT0_ERROR_CODES_MAP.SOCKET_MESSAGE_TOO_BIG,
          }),
        ),
      })
      return
    }
    try {
      const { rooms, roomsSerialized, input } = await spacePoint._executeJoiner({
        inputSerialized: frame.input,
        identity: entry.identityParsed,
        connectionId: entry.cid,
        points: this.server.points as NiceServerPoints,
      })
      // an engine-side refusal after the joiner ran — closes the family with the error, exactly like a joiner throw
      const refuseOverCap = (): void => {
        const maxRoomsError = new spacePoint._Error(`Too many rooms of space "${frame.space}" on one connection`, {
          code: POINT0_ERROR_CODES_MAP.SOCKET_MAX_ROOMS,
        })
        this.send(ws, { t: 'joinErr', id: frame.id, error: this.serializeError(spacePoint, maxRoomsError) })
        spacePoint._emitSpaceJoinSettled({
          rooms: undefined,
          identity: entry.identityParsed,
          connectionId: entry.cid,
          input,
          error: maxRoomsError,
        })
      }
      // the cap BEFORE the topics: a refused join must cost no bus traffic. Walking a subscribe back afterwards still
      // issued it, and holds the topic through the unsubscribe linger — so a connection at its ceiling could otherwise
      // make the process subscribe a fresh room per frame and release it a moment later
      if (!this.roomsFit(entry, spacePoint, roomsSerialized)) {
        refuseOverCap()
        return
      }
      // the room bus topics go up BEFORE the rooms are indexed and the `joined` frame confirms them — a push
      // published right after the confirmation must already have this process listening
      await this.subscribeRoomBusTopics(entry, spacePoint.name, roomsSerialized)
      // the socket may have died while the joiner (or the subscribe) ran — its cleanup already removed the entry, and
      // a dead entry written into the room index could never be removed (every removal path starts from the live
      // map). The event family still closes: a Start must never dangle
      if (this.connections.get(frame.cid) !== entry) {
        this.sweepRoomBusTopics(entry, spacePoint.name, roomsSerialized)
        spacePoint._emitSpaceJoinSettled({
          rooms: undefined,
          identity: entry.identityParsed,
          connectionId: entry.cid,
          input,
          error: new spacePoint._Error('Socket connection closed while the joiner ran', {
            code: POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND,
          }),
        })
        return
      }
      // a join UNIONS — in what you were, you stay; what the joiner admitted, you additionally enter. Removal is
      // never a join side-effect: it is `leave` (the client's), `kick` (the server's) or `refresh` (start over).
      // Re-checked past the await: frames interleave, so another join of this same connection may have landed rooms
      // while this one subscribed
      if (!this.roomsFit(entry, spacePoint, roomsSerialized)) {
        this.sweepRoomBusTopics(entry, spacePoint.name, roomsSerialized)
        refuseOverCap()
        return
      }
      this.addRoomsToEntry(
        entry,
        spacePoint,
        roomsSerialized.map((serialized, index) => ({ serialized, parsed: rooms[index] })),
      )
      // a resumable connection's join seeds the freshly-entered streams' cursors — heads at the subscription moment
      const heads =
        entry.resumeKeyHash === undefined
          ? undefined
          : this.spaceStreamHeads(entry, [{ space: spacePoint.name, rooms: roomsSerialized }])
      this.send(ws, {
        t: 'joined',
        id: frame.id,
        rooms: roomsSerialized,
        ...(heads !== undefined && Object.keys(heads).length > 0 ? { heads } : {}),
      })
      // the join is DONE — the rooms are registered and the client has its answer, so a `pointSpaceJoinServerSuccess`
      // handler both SEES the joiner in `memberships.list({ room })` and can push to it. Every refusal above returned
      // already: a join that never landed emits no Success (the engine answers those in its own dialect — `joinErr`)
      spacePoint._emitSpaceJoinSettled({ rooms, identity: entry.identityParsed, connectionId: entry.cid, input })
    } catch (error) {
      this.send(ws, { t: 'joinErr', id: frame.id, error: this.serializeError(spacePoint, error) })
    }
  }

  private handleLeave(ws: Bun.ServerWebSocket<SocketData>, frame: SocketClientFrame & { t: 'leave' }): void {
    const entry = this.connections.get(frame.cid)
    if (!entry || entry.ws !== ws) {
      return
    }
    // the client names the rooms to drop — IT owns the shared-room refcount across its own joins (a room another of
    // its joins still covers is simply not in the list); the server just removes what it is told
    this.removeRoomsFromEntry(entry, frame.space, frame.rooms, 'leave')
  }

  /**
   * Unsubscribe a room topic from a ws unless another live membership on that ws still covers it (Bun pub/sub is a
   * set).
   */
  private releaseRoomTopic(
    ws: Bun.ServerWebSocket<SocketData>,
    scope: PointsScope,
    spaceName: string,
    roomSerialized: string,
  ): void {
    // the room index narrows the scan to the room's members — only same-ws entries can still need the topic
    const byRoom = this.entriesByRoom.get(this.roomTopic(scope, spaceName, roomSerialized))
    if (byRoom) {
      for (const other of byRoom) {
        if (other.ws === ws && other.scope === scope) {
          return
        }
      }
    }
    try {
      ws.unsubscribe(this.roomTopic(scope, spaceName, roomSerialized))
    } catch {
      // the socket may already be closed
    }
  }

  /** Unsubscribe the space-wide topic from a ws when no membership of the space remains on it (last membership out). */
  private releaseSpaceTopic(ws: Bun.ServerWebSocket<SocketData>, scope: PointsScope, spaceName: string): void {
    const bySpace = this.entriesBySpace.get(this.spaceKey(scope, spaceName))
    if (bySpace) {
      for (const other of bySpace) {
        if (other.ws === ws) {
          return
        }
      }
    }
    try {
      ws.unsubscribe(this.spaceTopic(scope, spaceName))
    } catch {
      // the socket may already be closed
    }
  }

  private async cleanupConnection(cid: string, reason: 'close' | 'socket' | 'kick'): Promise<void> {
    const entry = this.connections.get(cid)
    if (!entry) {
      return
    }
    // PARKING — a resumable connection whose SOCKET died while its channel has buffering handlers dies publicly but
    // keeps its address: the entry leaves `connections` (enumerations, admin and counting all key off it), the leave
    // and close events fire right away (presence stays honest), and the room index KEEPS the entry so pushes into its
    // rooms keep landing in the topic streams until the window closes or a resume drains them
    if (reason === 'socket' && entry.resumeKeyHash !== undefined) {
      if (this.channelHasBufferingHandlers(entry.scope, entry.channelName)) {
        this.parkConnection(entry)
        return
      }
      // no buffering handlers → nothing to park FOR: clean everything now; only the KV record survives (below) — it
      // is the resume right, and its TTL owns it
    }
    this.connections.delete(cid)
    entry.ws.data.__point0Socket?.cids.delete(cid)
    // release every space's rooms (topic refcount across the surviving entries on the ws) and announce each leave
    for (const [spaceName, participation] of [...entry.spaces.entries()]) {
      this.removeRoomsFromEntry(entry, spaceName, [...participation.rooms.keys()], reason)
    }
    // the channel bus-topic refcount — the last local connection of the channel out starts the unsubscribe linger
    this.unindexEntryChannel(entry)
    const stillInChannel = [...this.connections.values()].some(
      (other) => other.ws === entry.ws && other.scope === entry.scope && other.channelName === entry.channelName,
    )
    if (!stillInChannel) {
      try {
        entry.ws.unsubscribe(this.channelTopic(entry.scope, entry.channelName))
      } catch {
        // the socket may already be closed
      }
    }
    // the Close half only for an entry whose Open was announced — a failed setup (a throwing enroller) never opened
    if (entry.opened) {
      this.emitChannelConnectionEvent('pointChannelCloseServer', entry, { reason })
    }
    // a SILENT socket death keeps a resumable connection's record — it is the right to resume, and only its TTL (or
    // an explicit way out) ends it. A voluntary close and a kick delete it: revocation is never resumable, and a
    // graceful shutdown closes sockets exactly like a crash does ('socket'), which is what keeps a redeploy resumable
    if (reason === 'socket' && entry.resumeKeyHash !== undefined) {
      return
    }
    this.kvSafe(async () => {
      const backplane = await this.getBackplane()
      await backplane.delete(this.connKey(cid))
    }, 'record delete')
  }

  /** Park a resumable connection whose socket died — see the parking block in {@link cleanupConnection}. */
  private parkConnection(entry: SocketConnectionEntry): void {
    this.connections.delete(entry.cid)
    entry.ws.data.__point0Socket?.cids.delete(entry.cid)
    // the death is PUBLIC — the same events a full cleanup announces, in the same order; the RESUMABLE spaces' rooms
    // stay in the participation and the index on purpose (the buffer address), and the dead ws needs no topic
    // housekeeping. An OPT-OUT space's rooms are no part of the resume right — they go for real (index included), so
    // an unpark revives exactly what the passport promises and nothing more
    for (const [spaceName, participation] of [...entry.spaces.entries()]) {
      if (!this.spaceInResume(participation.spacePoint)) {
        this.removeRoomsFromEntry(entry, spaceName, [...participation.rooms.keys()], 'socket')
        continue
      }
      if (participation.rooms.size > 0) {
        this.emitSpaceLeaveEvent(entry, participation.spacePoint, [...participation.rooms.values()], 'socket')
      }
    }
    if (entry.opened) {
      this.emitChannelConnectionEvent('pointChannelCloseServer', entry, { reason: 'socket' })
    }
    // the ceiling on parks this process holds: every park keeps its rooms indexed, its streams buffered and its bus
    // topics subscribed for the whole park window, and connect-then-drop is a cheap thing to do in a loop. Oldest goes
    // first — it is the closest to expiring anyway, and the one whose client is least likely to still be coming back.
    // A swept park is not a lost connection: the KV record and its resume right outlive the buffer, so the client
    // resumes from the passport instead of the buffer (and hears `gapless: false` for what the buffer would have held)
    const maxParked = this.server.socketOptions.maxParkedConnections
    while (maxParked > 0 && this.parkedByCid.size >= maxParked) {
      const oldest = this.parkedByCid.keys().next()
      if (oldest.done) {
        break
      }
      this.sweepParked(oldest.value)
    }
    const timer = setTimeout(() => {
      this.sweepParked(entry.cid)
    }, entry.channelPoint._getChannelPointOptions().resume.parkWindow)
    timer.unref()
    this.parkedByCid.set(entry.cid, { entry, timer, pendingLeft: [] })
    // the KV record stays untouched — the resume right outlives the park window on its own TTL
  }

  /** The park window closed (or the park was voided) — the buffer is gone, the entry leaves the index. */
  private sweepParked(cid: string): void {
    const parked = this.parkedByCid.get(cid)
    if (!parked) {
      return
    }
    this.parkedByCid.delete(cid)
    clearTimeout(parked.timer)
    this.dropEntryFromIndexes(parked.entry)
  }

  /** Full unindex of a DEAD entry — the parked entry's rooms never went through `removeRoomsFromEntry`. */
  private dropEntryFromIndexes(entry: SocketConnectionEntry): void {
    for (const [spaceName, participation] of entry.spaces) {
      for (const roomSerialized of participation.rooms.keys()) {
        const roomKey = this.roomTopic(entry.scope, spaceName, roomSerialized)
        const byRoom = this.entriesByRoom.get(roomKey)
        if (byRoom) {
          byRoom.delete(entry)
          if (byRoom.size === 0) {
            this.entriesByRoom.delete(roomKey)
            this.maybeReleaseBusTopic(this.busRoomTopic(entry.scope, entry.channelName, spaceName, roomSerialized))
            this.releaseStream(roomKey)
          }
        }
      }
      const spaceKey = this.spaceKey(entry.scope, spaceName)
      const bySpace = this.entriesBySpace.get(spaceKey)
      if (bySpace) {
        bySpace.delete(entry)
        if (bySpace.size === 0) {
          this.entriesBySpace.delete(spaceKey)
          this.maybeReleaseBusTopic(this.busSpaceTopic(entry.scope, entry.channelName, spaceName))
          this.releaseStream(this.spaceTopic(entry.scope, spaceName))
        }
      }
    }
    // the parked entry held its channel's topic too — the park is over, the refcount lets it go
    this.unindexEntryChannel(entry)
  }

  private exceedsChannelMaxMessageSize(entry: SocketConnectionEntry, message: string | Buffer): boolean {
    const size = typeof message === 'string' ? Buffer.byteLength(message) : message.byteLength
    return size > entry.channelPoint._getChannelPointOptions().maxMessageSize
  }

  private async handleSend(
    ws: Bun.ServerWebSocket<SocketData>,
    frame: SocketClientFrame & { t: 'send' },
    message: string | Buffer,
  ): Promise<void> {
    const entry = this.connections.get(frame.cid)
    // the four refusals below happen BEFORE any point runs — the sender reads them off the `sendErr` frame, the server
    // off `socketServerSendRefused` (a `.serverReply` that ran and threw is the other family's business)
    if (!entry || entry.ws !== ws) {
      const unknownError = this.infraError(
        'Unknown socket connection',
        POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_NOT_FOUND,
      )
      this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeErrorInstance(unknownError) })
      this.emitSendRefused({
        scope: ws.data.__point0Socket?.scope ?? this.server.scope,
        reason: 'unknownConnection',
        handlerName: frame.handler,
        connectionId: frame.cid,
        error: unknownError,
      })
      return
    }
    if (this.exceedsChannelMaxMessageSize(entry, message)) {
      const tooBigError = Object.assign(new Error('Message is bigger than the channel maxMessageSize'), {
        code: POINT0_ERROR_CODES_MAP.SOCKET_MESSAGE_TOO_BIG,
      })
      this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeError(entry.channelPoint, tooBigError) })
      this.emitSendRefused({
        scope: entry.scope,
        point: entry.channelPoint,
        reason: 'tooLarge',
        handlerName: frame.handler,
        connectionId: entry.cid,
        error: tooBigError,
      })
      return
    }
    const handlerRecord = this.server.points.findPoint({
      scope: entry.scope,
      type: 'serverHandler',
      name: frame.handler,
    })
    // a handler of ANOTHER channel is "not found" for this connection (same message — no oracle): the reply would run
    // against an identity a different connector produced, bypassing that channel's own gate
    if (!handlerRecord || handlerRecord.point._channelPoint?.name !== entry.channelName) {
      const notFoundError = Object.assign(new Error(`serverHandler point "${frame.handler}" not found`), {
        code: POINT0_ERROR_CODES_MAP.SOCKET_HANDLER_NOT_FOUND,
      })
      this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeError(entry.channelPoint, notFoundError) })
      this.emitSendRefused({
        scope: entry.scope,
        point: entry.channelPoint,
        reason: 'handlerNotFound',
        handlerName: frame.handler,
        connectionId: entry.cid,
        error: notFoundError,
      })
      return
    }
    const handler = handlerRecord.point
    // a space handler's send names the concrete room it addresses — verify this connection IS in that room, then
    // parse it with the SPACE transformer; a channel handler send carries no room. A frame that names NO room is
    // refused by the same check: the client always fills it for a space handler, and a hand-built frame that leaves it
    // out must not buy a run of the reply — the reply would execute for a non-member with `room` missing, and its
    // `{ room }` pushes would widen into space-WIDE ones
    const spacePoint = handler._spacePoint
    let room: unknown = undefined
    if (spacePoint) {
      const roomSerialized = frame.room
      if (roomSerialized === undefined || entry.spaces.get(spacePoint.name)?.rooms.has(roomSerialized) !== true) {
        const notInRoomError = Object.assign(
          new Error(
            roomSerialized === undefined
              ? `Space handler send named no room for space "${spacePoint.name}"`
              : `Connection is not in room for space "${spacePoint.name}"`,
          ),
          { code: POINT0_ERROR_CODES_MAP.SOCKET_NOT_IN_ROOM },
        )
        this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeError(handler, notInRoomError) })
        this.emitSendRefused({
          scope: entry.scope,
          point: handler,
          reason: 'notInRoom',
          handlerName: frame.handler,
          connectionId: entry.cid,
          error: notInRoomError,
        })
        return
      }
      room = spacePoint._getSocketTransformer().parse(roomSerialized)
    }
    try {
      // the server-side message id — `.serverReply` sees it as `messageId`
      const rid = generateId()
      const result = await handler._executeServerReply({
        inputSerialized: frame.input,
        room,
        identity: entry.identityParsed,
        connectionId: entry.cid,
        messageId: rid,
        points: this.server.points as NiceServerPoints,
        // the imperative reply() — frame the envelope the moment the callback answers, while it keeps running.
        // A gone connection drops it silently (at-most-once, like any push into a dead socket)
        sendReply: (early) => {
          const liveEntry = this.connections.get(frame.cid)
          if (!liveEntry || liveEntry.ws !== ws) {
            return
          }
          if ('error' in early) {
            this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeError(handler, early.error) })
            return
          }
          this.send(ws, {
            t: 'reply',
            id: frame.id,
            ...(early.dataSerialized === undefined ? {} : { data: early.dataSerialized }),
          })
        },
      })
      if (result.replied) {
        // the imperative reply already framed the envelope — nothing more to send
        return
      }
      this.send(ws, {
        t: 'reply',
        id: frame.id,
        ...(result.dataSerialized === undefined ? {} : { data: result.dataSerialized }),
      })
    } catch (error) {
      this.send(ws, { t: 'sendErr', id: frame.id, error: this.serializeError(handler, error) })
    }
  }

  /**
   * What a collect push published from ANOTHER process delivered to this one's connections — mid → cid → frames sent.
   * The forwarding half of the collect window's per-connection allowance: this process is the only one that knows what
   * its own sockets received, and a reply it never sent a frame for is not a reply.
   *
   * Bounded twice, because it is fed by traffic: entries fall out after `forwardAllowanceTtl` (an initiator's window is
   * seconds, never a minute) and the oldest are evicted past `forwardAllowanceMax`, exactly like the bus dedup set.
   * Losing an entry early only costs a late reply its forward.
   */
  private forwardAllowances = new Map<string, { allowanceByCid: Map<string, number>; expiresAt: number }>()

  private rememberForwardAllowance(mid: string, expectedByCid: Map<string, number>): void {
    const existing = this.forwardAllowances.get(mid)
    if (existing) {
      for (const [cid, count] of expectedByCid) {
        existing.allowanceByCid.set(cid, (existing.allowanceByCid.get(cid) ?? 0) + count)
      }
      return
    }
    if (this.forwardAllowances.size >= this.server.socketOptions.forwardAllowanceMax) {
      const oldest = this.forwardAllowances.keys().next()
      if (!oldest.done) {
        this.forwardAllowances.delete(oldest.value)
      }
    }
    this.forwardAllowances.set(mid, {
      allowanceByCid: new Map(expectedByCid),
      expiresAt: Date.now() + this.server.socketOptions.forwardAllowanceTtl,
    })
  }

  /** Spend one forward of `(mid, cid)` — false when this process never sent that connection a frame of that push. */
  private spendForwardAllowance(mid: string, cid: string): boolean {
    const refuse = (why: string): false => {
      this.server.log({
        level: 'warn',
        category: ['point0', 'socket'],
        message: `Dropped a collected reply this process never sent a frame for (connection ${cid}): ${why}`,
      })
      return false
    }
    const record = this.forwardAllowances.get(mid)
    if (!record) {
      return refuse('unknown message id')
    }
    if (record.expiresAt <= Date.now()) {
      this.forwardAllowances.delete(mid)
      return refuse('the push is older than the forward window')
    }
    const left = record.allowanceByCid.get(cid) ?? 0
    if (left <= 0) {
      return refuse('no frames of that push were delivered to it')
    }
    record.allowanceByCid.set(cid, left - 1)
    return true
  }

  private handleReply(
    ws: Bun.ServerWebSocket<SocketData>,
    frame: SocketClientFrame & { t: 'reply' },
    message: string | Buffer,
  ): void {
    const entry = this.connections.get(frame.cid)
    if (!entry || entry.ws !== ws) {
      return
    }
    if (this.exceedsChannelMaxMessageSize(entry, message)) {
      return
    }
    const pending = this.pendingCollects.get(frame.id)
    if (!pending) {
      // not ours — the collect lives in the process that initiated the push; forward the reply over the bus (the
      // reply's room/space context comes from that collect's push target, so the envelope carries only the answer).
      // The mid is CLIENT-supplied, so the forward is authorized first: this process delivered that push, so it knows
      // exactly how many frames of it this cid received. Without that check a member of the room could answer any mid
      // it ever saw, any number of times, as a reply the initiator cannot tell from a real one — the local half of the
      // window has always checked this ({@link landCollectedReply}), and the remote half now checks the same thing on
      // the process that actually knows the answer. It also settles the amplification: an invented mid was delivered
      // to nobody, so it never becomes bus traffic
      if (this.hasExternalBackplane()) {
        if (!this.spendForwardAllowance(frame.id, frame.cid)) {
          return
        }
        const now = Date.now()
        if (now - entry.replyForwards.windowStart >= this.server.socketOptions.replyForwardWindow) {
          entry.replyForwards = { windowStart: now, count: 0 }
        }
        if (entry.replyForwards.count >= this.server.socketOptions.replyForwardMax) {
          return
        }
        entry.replyForwards.count++
        // routed by the mid — a collect mid carries the initiator's pid, so the reply goes straight to its inbox
        this.publishToBus(
          {
            v: 1,
            kind: 'reply',
            pid: this.pid,
            mid: frame.id,
            cid: frame.cid,
            data: frame.data,
            error: frame.error,
          },
          [this.replyTopicForMid(frame.id)],
        )
      }
      return
    }
    this.landCollectedReply(pending, {
      cid: frame.cid,
      data: frame.data,
      error: frame.error,
    })
  }

  /**
   * Land one collected reply on its window. An ERRORED reply — the client's `.clientReply` threw — counts toward the
   * window (the collector must not wait for an answer that will never come) but delivers nothing: it is logged, not
   * surfaced through `onReply`/the iterable. The reply's room/space context rides from the push target the window was
   * opened with, not from the reply frame.
   */
  private landCollectedReply(
    pending: PendingCollect,
    reply: { cid: string; data: string | undefined; error: string | undefined },
  ): void {
    // the protocol lets any client that SAW the mid send any number of reply frames — enforce the window's per-cid
    // accounting before anything counts: excepted cids never legitimately reply, and a cid past its allowance (exact
    // when countable, the coarse cap otherwise) is abuse or a stale duplicate — dropped either way, and dropped
    // WITHOUT advancing `received`, so a flood cannot close the window on honest repliers
    if (pending.exceptConnectionIds !== undefined && pending.exceptConnectionIds.includes(reply.cid)) {
      this.server.log({
        level: 'warn',
        category: ['point0', 'socket'],
        message: `Dropped a collected reply from an excepted connection ${reply.cid}`,
      })
      return
    }
    if (pending.allowanceByCid !== null) {
      const allowance = pending.allowanceByCid.get(reply.cid) ?? 0
      if (allowance <= 0) {
        this.server.log({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `Dropped a collected reply beyond the expected count for connection ${reply.cid}`,
        })
        return
      }
      pending.allowanceByCid.set(reply.cid, allowance - 1)
    } else if (this.connections.has(reply.cid)) {
      // the window is uncountable (remote processes hold entries this one cannot see) — but its LOCAL half never is:
      // a cid living on THIS process got exactly the frames `deliverPushLocal` sent it. Zero frames and yet a reply
      // means the connection never saw the mid — a client holding two connections on one socket answering as the cid
      // the push did NOT address — so it is dropped outright, not merely capped
      const localAllowance = pending.localAllowanceByCid.get(reply.cid) ?? 0
      if (localAllowance <= 0) {
        this.server.log({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `Dropped a collected reply from local connection ${reply.cid}, which the push never addressed`,
        })
        return
      }
      pending.localAllowanceByCid.set(reply.cid, localAllowance - 1)
    } else {
      // a remote cid — this process knows nothing about what it was sent, so the coarse per-cid cap is the bound
      const seen = pending.receivedByCid.get(reply.cid) ?? 0
      if (seen >= pending.perCidCap) {
        this.server.log({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `Dropped a collected reply beyond the per-connection cap for connection ${reply.cid}`,
        })
        return
      }
      pending.receivedByCid.set(reply.cid, seen + 1)
    }
    // the window's accounting comes FIRST, and the consumer runs guarded: `onReply` deserializes a client-supplied
    // payload and then runs app code. A throw there must not leave the slot spent but uncounted — the window would
    // stop closing early and wait out its whole timeout, which one malformed byte per addressed client would buy
    pending.received++
    if (reply.error !== undefined) {
      this.server.log({
        level: 'warn',
        category: ['point0', 'socket'],
        // the string is the CLIENT's — control characters would forge lines in a pretty-printed log, so it rides as
        // bounded, stripped meta rather than inside the message
        message: `A client .clientReply failed for a collected push (connection ${reply.cid})`,
        meta: { error: reply.error.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 500) },
      })
    } else {
      try {
        pending.onReply({ cid: reply.cid, data: reply.data, room: pending.room, space: pending.space })
      } catch (error) {
        this.server.log({
          level: 'error',
          category: ['point0', 'socket'],
          message: `A collected reply consumer threw (connection ${reply.cid})`,
          error,
        })
      }
    }
    if (pending.expected !== null && pending.received >= pending.expected) {
      this.finishCollect(pending.mid)
    }
  }

  private finishCollect(mid: string): void {
    const pending = this.pendingCollects.get(mid)
    if (!pending) {
      return
    }
    this.pendingCollects.delete(mid)
    clearTimeout(pending.timer)
    pending.onDone()
  }

  // the publish seam — core's `clientHandler.sendToClient()` and the channel/space admin surface land here

  readonly adapter: SocketServerAdapter = {
    push: (args) => {
      this.push(args)
    },
    kick: async (args) => {
      const selector = this.toSelector(args)
      await this.kickLocal(selector, args.reason)
      if (this.hasExternalBackplane()) {
        this.publishToBus({ v: 1, kind: 'kick', pid: this.pid, selector, reason: args.reason })
      }
    },
    enroll: async (args) => {
      const selector = this.toSelector(args)
      await this.enrollImperativeLocal(selector, args.enrollRooms)
      if (this.hasExternalBackplane()) {
        this.publishToBus({ v: 1, kind: 'enroll', pid: this.pid, selector, rooms: args.enrollRooms })
      }
    },
    refresh: (args) => {
      const selector = this.toSelector(args)
      this.refreshLocal(this.matchLocal(selector))
      if (this.hasExternalBackplane()) {
        this.publishToBus({ v: 1, kind: 'refresh', pid: this.pid, selector })
      }
      return Promise.resolve()
    },
    amendIdentity: (args) => {
      const selector = this.toSelector(args)
      this.amendLocal(selector, args.patchSerialized)
      if (this.hasExternalBackplane()) {
        this.publishToBus({ v: 1, kind: 'amend', pid: this.pid, selector, patch: args.patchSerialized })
      }
      return Promise.resolve()
    },
    count: (args) => {
      const selector = this.toSelector(args)
      const local = this.matchLocal(selector).length
      if (!this.hasExternalBackplane()) {
        return Promise.resolve(local)
      }
      // numbers-only scatter-gather: every process answers its local count, the window closes on the timeout
      const reqId = generateId()
      return new Promise<number>((resolve) => {
        const pending: PendingCount = {
          reqId,
          total: local,
          resolve,
          timer: setTimeout(() => {
            this.pendingCounts.delete(reqId)
            resolve(pending.total)
          }, args.timeoutMs ?? this.server.socketOptions.gatherTimeout),
        }
        this.pendingCounts.set(reqId, pending)
        this.publishToBus({ v: 1, kind: 'count-req', pid: this.pid, reqId, selector })
      })
    },
    list: (args) => {
      return new Promise<SocketConnectionSnapshot[]>((resolve) => {
        const items: SocketConnectionSnapshot[] = []
        this.enumerateSnapshots(args, {
          onItem: (item) => items.push(item),
          onDone: () => resolve(items),
        })
      })
    },
    forEach: (args) => {
      this.enumerateSnapshots(args, { onItem: args.onItem, onDone: args.onDone })
    },
    // the synchronous local floor — this process's matching slice only, narrowed by the room index (no bus/window)
    localCount: (args) => {
      return this.matchLocal(this.toSelector(args)).length
    },
    localList: (args) => {
      const selector = this.toSelector(args)
      return this.matchLocal(selector).map((entry) => {
        const snapshot = this.snapshotEntry(entry, selector.space)
        // a channel snapshot gets its per-space rooms parsed here (a space snapshot is parsed in core by the point)
        return selector.space === undefined ? this.withSpacesParsed(selector.scope, snapshot) : snapshot
      })
    },
  }

  /**
   * The shared `list`/`forEach` machinery: local matches stream immediately, bus answers stream as they arrive, the
   * window closes on the timeout (no backplane = right away). Channel-shaped snapshots get their `spacesParsed` filled
   * here — the space transformers live with this registry, not with the calling point.
   */
  private enumerateSnapshots(
    args: SocketAdminTarget & { timeoutMs?: number },
    { onItem, onDone }: { onItem: (item: SocketConnectionSnapshot) => void; onDone: () => void },
  ): void {
    const selector = this.toSelector(args)
    const emit = (item: SocketConnectionSnapshot): void => {
      onItem(selector.space === undefined ? this.withSpacesParsed(selector.scope, item) : item)
    }
    for (const entry of this.matchLocal(selector)) {
      emit(this.snapshotEntry(entry, selector.space))
    }
    if (!this.hasExternalBackplane()) {
      onDone()
      return
    }
    const reqId = generateId()
    const gather: PendingConnectionsGather = {
      reqId,
      onItem: emit,
      onDone,
      timer: setTimeout(() => {
        this.pendingGathers.delete(reqId)
        onDone()
      }, args.timeoutMs ?? this.server.socketOptions.gatherTimeout),
    }
    this.pendingGathers.set(reqId, gather)
    this.publishToBus({ v: 1, kind: 'connections-req', pid: this.pid, reqId, selector })
  }

  /** Parse a channel snapshot's per-space rooms with each space's own transformer (unknown spaces stay unparsed-out). */
  private withSpacesParsed(scope: PointsScope, item: SocketConnectionSnapshot): SocketConnectionSnapshot {
    if (!item.spaces) {
      return { ...item, spacesParsed: {} }
    }
    const spacesParsed: Record<string, unknown[]> = {}
    for (const [spaceName, rooms] of Object.entries(item.spaces)) {
      const spacePoint = this.server.points.findPoint({ scope, type: 'space', name: spaceName })?.point
      if (!spacePoint) {
        continue
      }
      const transformer = spacePoint._getSocketTransformer()
      spacesParsed[spaceName] = rooms.map((room) => transformer.parse(room))
    }
    return { ...item, spacesParsed }
  }

  private toSelector(args: SocketAdminTarget): AdminSelector {
    return {
      scope: args.channel.scope,
      channel: args.channel.name,
      space: args.space,
      matcher: args.matcher,
      roomMatcher: args.roomMatcher,
      rooms: args.rooms,
      connectionId: args.connectionId,
    }
  }

  /**
   * Narrow the candidate entries for a room/space-addressed match BEFORE the per-entry sift, using the per-process room
   * index — so a room/space target costs O(members), not O(connections). The priority:
   *
   * 1. exact `connectionId` → O(1) `this.connections.get(cid)` lookups.
   * 2. a `space` AND a non-empty exact `rooms` list → the UNION of the room-index sets over those rooms (deduped). A
   *    correct superset: a match must hold a membership of the space whose room satisfies ALL present room parts, so
   *    membership in at least one of the exact rooms is a necessary condition — the per-entry sift (scope/channel,
   *    identity matcher, room matcher, membership) then drops the rest, leaving the exact same set.
   * 3. a `space` (no exact rooms, maybe a `$room` matcher) → the space-index set (the space's members), sifted after.
   * 4. otherwise a channel-only selector → every connection (no per-channel index exists to narrow by; the per-entry
   *    filter drops the other channels/scopes).
   *
   * The index is a slice of THIS process only, which is exactly the local slice `matchLocal`/`deliverPushLocal` operate
   * on — the bus reaches the other processes separately, so narrowing by the local index loses no remote matches.
   */
  private narrowCandidates(
    scope: PointsScope,
    space: string | undefined,
    rooms: string[] | undefined,
    connectionId: string[] | undefined,
  ): Iterable<SocketConnectionEntry> {
    if (connectionId !== undefined) {
      return connectionId
        .map((cid) => this.connections.get(cid))
        .filter((entry): entry is SocketConnectionEntry => entry !== undefined)
    }
    if (space !== undefined && rooms !== undefined && rooms.length > 0) {
      const union = new Set<SocketConnectionEntry>()
      for (const roomSerialized of rooms) {
        for (const entry of this.entriesByRoom.get(this.roomTopic(scope, space, roomSerialized)) ?? []) {
          union.add(entry)
        }
      }
      return union
    }
    if (space !== undefined) {
      return this.entriesBySpace.get(this.spaceKey(scope, space)) ?? []
    }
    return this.connections.values()
  }

  /**
   * Every local live connection the selector matches — the `$`-dictionary, parts AND-combined. `connectionId` narrows
   * by exact cids (O(1) lookups when it is the only part), the identity matcher rides sift over the parsed identity; a
   * SPACE selector additionally requires a membership of the space whose rooms satisfy the room parts (exact `rooms`
   * and/or the `$room` matcher — a room must satisfy BOTH present parts). The identity matcher is parsed with the
   * CHANNEL transformer, the room matcher with the SPACE transformer.
   */
  private matchLocal(selector: AdminSelector): SocketConnectionEntry[] {
    const channelRecord = this.server.points.findPoint({
      scope: selector.scope,
      type: 'channel',
      name: selector.channel,
    })
    if (!channelRecord) {
      return []
    }
    const channelPoint = channelRecord.point
    const spacePoint =
      selector.space === undefined
        ? undefined
        : this.server.points.findPoint({ scope: selector.scope, type: 'space', name: selector.space })?.point
    // both matchers were serialized with their respective transformer — parse with the same one, so Dates and friends
    // compare as live values; sift runs any Mongo operator ($where is rejected in core)
    const matchesIdentity =
      selector.matcher === undefined
        ? undefined
        : siftQueryTester(channelPoint._getSocketTransformer().parse(selector.matcher))
    const matchesRoom =
      selector.roomMatcher === undefined || !spacePoint
        ? undefined
        : siftQueryTester(spacePoint._getSocketTransformer().parse(selector.roomMatcher))
    const roomSatisfies = (roomSerialized: string, roomParsed: unknown): boolean => {
      if (selector.rooms !== undefined && !selector.rooms.includes(roomSerialized)) {
        return false
      }
      if (matchesRoom && !matchesRoom(roomParsed)) {
        return false
      }
      return true
    }
    // narrow by the room index first (cids → O(1); space+rooms → the room-index union; space → the space index;
    // channel-only → every connection), then sift each candidate down to the exact match
    const candidates = [...this.narrowCandidates(selector.scope, selector.space, selector.rooms, selector.connectionId)]
    return candidates.filter((entry) => {
      // liveness belt over the index — a candidate must still be THE live entry of its cid (never answer for a
      // dead connection, whatever put it into an index set)
      if (this.connections.get(entry.cid) !== entry) {
        return false
      }
      if (entry.scope !== selector.scope || entry.channelName !== selector.channel) {
        return false
      }
      if (matchesIdentity && !matchesIdentity(entry.identityParsed)) {
        return false
      }
      if (selector.space !== undefined) {
        const participation = entry.spaces.get(selector.space)
        if (!participation) {
          return false
        }
        if (selector.rooms !== undefined || matchesRoom) {
          const anyRoomSatisfies = [...participation.rooms.entries()].some(([roomSerialized, roomParsed]) =>
            roomSatisfies(roomSerialized, roomParsed),
          )
          if (!anyRoomSatisfies) {
            return false
          }
        }
      }
      return true
    })
  }

  private snapshotEntry(entry: SocketConnectionEntry, space: string | undefined): SocketConnectionSnapshot {
    if (space === undefined) {
      // a channel snapshot — every space this connection is in, so the admin surface can read presence
      const spaces: Record<string, string[]> = {}
      for (const [spaceName, participation] of entry.spaces) {
        spaces[spaceName] = [...participation.rooms.keys()]
      }
      const hasSpaces = Object.keys(spaces).length > 0
      return { cid: entry.cid, identity: entry.identitySerialized, ...(hasSpaces ? { spaces } : {}) }
    }
    // a space snapshot — only the rooms this connection is in within the queried space
    const rooms = [...(entry.spaces.get(space)?.rooms.keys() ?? [])]
    return { cid: entry.cid, identity: entry.identitySerialized, spaces: { [space]: rooms } }
  }

  /**
   * Apply a kick to the local matches. A CHANNEL selector (no space) closes each matched connection — a `closed` frame,
   * then full cleanup. A SPACE selector is NOT a connection kill: it forces a LEAVE of the rooms satisfying the room
   * parts (exact `rooms` and/or `$room`; neither = all rooms) — remove them from each entry's participation, release
   * the topics, tell the client with a `left` frame, and announce the leave. Both shapes sweep matching PARKED entries
   * too (revocation must not hide in a park): the channel kick drops the park and deletes the record, the space kick
   * shrinks the parked participation and passport and queues the `left` for the unpark.
   */
  private async kickLocal(selector: AdminSelector, reason: string | undefined): Promise<void> {
    const entries = this.matchLocal(selector)
    if (selector.space === undefined) {
      for (const entry of entries) {
        this.send(entry.ws, { t: 'closed', cid: entry.cid, ...(reason === undefined ? {} : { reason }) })
        await this.cleanupConnection(entry.cid, 'kick')
      }
      // a kick voids the resume right too: PARKED connections are publicly dead (matchLocal skips them) but their
      // record and buffer would otherwise revive the kicked identity — sweep the matching ones and delete their
      // records, so the later resume refuses and the full connect puts the connector back in charge
      for (const entry of this.parkedKickMatches(selector)) {
        this.sweepParked(entry.cid)
        this.kvSafe(async () => {
          const backplane = await this.getBackplane()
          await backplane.delete(this.connKey(entry.cid))
        }, 'record delete')
      }
      return
    }
    const spaceName = selector.space
    const spacePoint = this.server.points.findPoint({ scope: selector.scope, type: 'space', name: spaceName })?.point
    const matchesRoom =
      selector.roomMatcher === undefined || !spacePoint
        ? undefined
        : siftQueryTester(spacePoint._getSocketTransformer().parse(selector.roomMatcher))
    const removeRoom = (roomSerialized: string, roomParsed: unknown): boolean => {
      if (selector.rooms !== undefined && !selector.rooms.includes(roomSerialized)) {
        return false
      }
      if (matchesRoom && !matchesRoom(roomParsed)) {
        return false
      }
      return true
    }
    for (const entry of entries) {
      const participation = entry.spaces.get(spaceName)
      if (!participation) {
        continue
      }
      const toRemove = [...participation.rooms.entries()]
        .filter(([roomSerialized, roomParsed]) => removeRoom(roomSerialized, roomParsed))
        .map(([roomSerialized]) => roomSerialized)
      const removed = this.removeRoomsFromEntry(entry, spaceName, toRemove, 'kick')
      if (removed.length > 0) {
        this.send(entry.ws, {
          t: 'left',
          cid: entry.cid,
          space: spaceName,
          rooms: removed,
          ...(reason === undefined ? {} : { reason }),
        })
      }
    }
    // a space kick must not hide in a park either: a PARKED entry's indexed rooms are the buffer address and its
    // passport still promises them, so a kicked room would otherwise survive the park and come back on resume —
    // through a stream replay (pushes into the window) or through the KV passport (a later restore). The removal shrinks
    // both (`removeRoomsFromEntry` unindexes and rewrites the parked passport) and stays event-silent — the park
    // already announced every room's leave ('socket'); the dead ws gets no frame, the client learns through the
    // queued `left` on unpark. The entry stays parked to its window: parking is per CONNECTION (the channel's
    // buffering handlers), not per room — channel-wide pushes still buffer, and the surviving streams' pre-kick frames still
    // replay
    for (const entry of this.parkedKickMatches(selector)) {
      const participation = entry.spaces.get(spaceName)
      if (!participation) {
        continue
      }
      const toRemove = [...participation.rooms.entries()]
        .filter(([roomSerialized, roomParsed]) => removeRoom(roomSerialized, roomParsed))
        .map(([roomSerialized]) => roomSerialized)
      const removed = this.removeRoomsFromEntry(entry, spaceName, toRemove, 'kick')
      if (removed.length > 0) {
        this.parkedByCid.get(entry.cid)?.pendingLeft.push({
          t: 'left',
          cid: entry.cid,
          space: spaceName,
          rooms: removed,
          ...(reason === undefined ? {} : { reason }),
        })
      }
    }
  }

  /**
   * The PARKED entries a kick selector's connection parts reach — same scope/channel, the exact `connectionId` cids and
   * the sift identity matcher (room parts stay the caller's business). Parked entries are publicly dead and
   * `matchLocal` skips them on purpose, but a revocation must not hide in a park — both kick shapes sweep through
   * this.
   */
  private parkedKickMatches(selector: AdminSelector): SocketConnectionEntry[] {
    const matchesIdentity =
      selector.matcher === undefined
        ? undefined
        : ((): ((item: unknown) => boolean) => {
            const channelPoint = this.server.points.findPoint({
              scope: selector.scope,
              type: 'channel',
              name: selector.channel,
            })?.point
            return channelPoint
              ? siftQueryTester(channelPoint._getSocketTransformer().parse(selector.matcher))
              : () => false
          })()
    return [...this.parkedByCid.values()]
      .map((parked) => parked.entry)
      .filter((entry) => {
        if (entry.scope !== selector.scope || entry.channelName !== selector.channel) {
          return false
        }
        if (selector.connectionId !== undefined && !selector.connectionId.includes(entry.cid)) {
          return false
        }
        if (matchesIdentity && !matchesIdentity(entry.identityParsed)) {
          return false
        }
        return true
      })
  }

  private refreshLocal(entries: SocketConnectionEntry[]): void {
    for (const entry of entries) {
      this.send(entry.ws, { t: 'refresh', cid: entry.cid })
    }
  }

  /**
   * Apply an imperative `space.enroll` to the local matches: union the rooms into each entry's participation, index and
   * subscribe the topics, announce the connection's FULL new room set of the space with an `enrolled` frame, and emit
   * the server join events (an enrollment IS a join, server-initiated — the same family `.enroller` emits, with an
   * empty input). WHO matches: room parts select by the rooms connections are already in, but a bare / `connectionId` /
   * `$identity` target selects among ALL connections of the channel — requiring existing rooms would defeat the point
   * (enrolling a connection into its FIRST room of the space). A connection the rooms would push past `maxRooms` is
   * SKIPPED with a warning — an admin fan-out has no one requester to answer.
   */
  private async enrollImperativeLocal(selector: AdminSelector, roomsSerialized: string[]): Promise<void> {
    const spaceName = selector.space
    if (spaceName === undefined) {
      return
    }
    const spaceRecord = this.server.points.findPoint({ scope: selector.scope, type: 'space', name: spaceName })
    if (!spaceRecord) {
      return
    }
    const spacePoint = spaceRecord.point
    const transformer = spacePoint._getSocketTransformer()
    const hasRoomParts = selector.rooms !== undefined || selector.roomMatcher !== undefined
    const matchSelector = hasRoomParts ? selector : { ...selector, space: undefined }
    for (const entry of this.matchLocal(matchSelector)) {
      // the room bus topics go up BEFORE the rooms are indexed and the `enrolled` frame announces them — same
      // subscribe-before-confirm as a client join; the entry may die while the subscribe settles
      await this.subscribeRoomBusTopics(entry, spaceName, roomsSerialized)
      if (this.connections.get(entry.cid) !== entry) {
        this.sweepRoomBusTopics(entry, spaceName, roomsSerialized)
        continue
      }
      if (!this.roomsFit(entry, spacePoint, roomsSerialized)) {
        this.sweepRoomBusTopics(entry, spaceName, roomsSerialized)
        this.server.log({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `space.enroll skipped connection ${entry.cid} — the rooms would exceed maxRooms of space "${spaceName}"`,
        })
        continue
      }
      const added = this.addRoomsToEntry(
        entry,
        spacePoint,
        roomsSerialized.map((serialized) => ({ serialized, parsed: transformer.parse(serialized) })),
      )
      const fullSet = [...(entry.spaces.get(spaceName)?.rooms.keys() ?? [])]
      // seed the grown streams' cursors, like a join's answer would — heads for the FULL set (announcements replace)
      const heads =
        entry.resumeKeyHash === undefined
          ? undefined
          : this.spaceStreamHeads(entry, [{ space: spaceName, rooms: fullSet }])
      this.send(entry.ws, {
        t: 'enrolled',
        cid: entry.cid,
        space: spaceName,
        rooms: fullSet,
        ...(heads !== undefined && Object.keys(heads).length > 0 ? { heads } : {}),
      })
      const addedParsed = added.map((roomSerialized) => transformer.parse(roomSerialized))
      spacePoint._emit(
        'pointSpaceJoinServerStart',
        {
          input: {},
          point: spacePoint,
          connectionId: entry.cid,
          identity: entry.identityParsed,
          resumed: false,
        } as never,
        { point: spacePoint.id, connection: entry.cid },
      )
      // after the rooms are in, like every other join — the Success handler sees this connection in the room
      spacePoint._emitSpaceJoinSettled({ rooms: addedParsed, identity: entry.identityParsed, connectionId: entry.cid })
    }
  }

  /**
   * Apply an `amendIdentity` to the local matches: shallow-merge the patch (parsed with the channel transformer) into
   * each entry's identity, re-serialize, rewrite the KV record. Data only — granted rooms stay granted; the client
   * learns nothing (identity never leaves the server).
   */
  private amendLocal(selector: AdminSelector, patchSerialized: string): void {
    const entries = this.matchLocal(selector)
    if (entries.length === 0) {
      return
    }
    const channelRecord = this.server.points.findPoint({
      scope: selector.scope,
      type: 'channel',
      name: selector.channel,
    })
    if (!channelRecord) {
      return
    }
    const transformer = channelRecord.point._getSocketTransformer()
    const patch = transformer.parse(patchSerialized)
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return
    }
    for (const entry of entries) {
      const base =
        entry.identityParsed && typeof entry.identityParsed === 'object' && !Array.isArray(entry.identityParsed)
          ? (entry.identityParsed as Record<string, unknown>)
          : {}
      entry.identityParsed = { ...base, ...(patch as Record<string, unknown>) }
      entry.identitySerialized = stringifyOrThrow(transformer, entry.identityParsed, channelRecord.point.id)
      // the central builder keeps the resume passport (key hash + rooms) riding the record through the amend
      entry.connJson = this.buildConnJson(entry)
      this.kvSafe(async () => {
        const backplane = await this.getBackplane()
        await backplane.set(this.connKey(entry.cid), entry.connJson, entry.connectionTtl)
      }, 'amend')
    }
  }

  private push(args: SocketServerPushArgs): void {
    const scope = args.channel.scope
    const channelName = args.channel.name
    // the collect mid embeds this process's pid — a reply forwarded from any process routes to this inbox by the mid
    // alone (the client echoes the mid opaquely; see `replyTopicForMid`)
    const mid = args.collect ? `${this.pid}:${generateId()}` : undefined
    const external = this.hasExternalBackplane()
    const { expected, expectedByCid } = this.deliverPushLocal({
      scope,
      channel: channelName,
      handler: args.handler.name,
      target: args.target,
      input: args.input,
      mid,
    })
    if (external) {
      const topics = this.busTopicsForPushTarget(scope, channelName, args.target)
      this.publishToBus(
        {
          v: 1,
          kind: 'push',
          pid: this.pid,
          scope,
          channel: channelName,
          handler: args.handler.name,
          target: args.target,
          input: args.input,
          mid,
          // several topics carry the SAME envelope (a multi-room push) — the eid is the receivers' dedup key
          ...(topics.length > 1 ? { eid: generateId() } : {}),
        },
        topics,
      )
    }
    if (args.collect && mid !== undefined) {
      // remote processes may hold more connections — with an external backplane only the timeout closes the window.
      // An exact-cid-only target whose every cid resolves LOCALLY is the exception: cids are globally unique, so that
      // resolution is total (a cid living on another process makes the count unknowable — it may not exist at all)
      const target = args.target
      const isExactCidsOnly =
        target.connectionId !== undefined && target.identityMatcher === undefined && target.space === undefined
      const canCountLocally =
        !external || (isExactCidsOnly && target.connectionId!.every((cid) => this.connections.has(cid)))
      // the uncountable window (remote processes hold entries this one cannot see) still bounds per-cid replies —
      // ONE frame = ONE reply, so the legit per-cid count is the frames a remote process sent it: 1 for a channel or
      // space-wide push, one per targeted room for a room push; a `$room` matcher resolves remotely, so a generous
      // constant bounds the abuse instead
      const perCidCap = ((): number => {
        if (target.space === undefined || target.roomMatcher !== undefined) {
          return target.roomMatcher !== undefined ? this.server.socketOptions.uncountableReplyCap : 1
        }
        return target.rooms !== undefined ? target.rooms.length : 1
      })()
      // the reply context (a space handler): the space always, and the room only for a single-room push (a multi-room
      // push has no one room to attribute a reply to)
      const pending: PendingCollect = {
        mid,
        expected: canCountLocally ? expected : null,
        received: 0,
        allowanceByCid: canCountLocally ? expectedByCid : null,
        localAllowanceByCid: expectedByCid,
        perCidCap,
        receivedByCid: new Map(),
        exceptConnectionIds: target.exceptConnectionIds,
        space: target.space,
        room: target.rooms !== undefined && target.rooms.length === 1 ? target.rooms[0] : undefined,
        onReply: args.collect.onReply,
        onDone: args.collect.onDone,
        timer: setTimeout(() => {
          this.finishCollect(mid)
        }, args.collect.timeoutMs),
      }
      this.pendingCollects.set(mid, pending)
      if (pending.expected !== null && pending.expected === 0) {
        this.finishCollect(mid)
      }
    }
  }

  /** Is this entry excluded by the target's `exceptConnectionIds`/`exceptRooms` (a member of an excluded room)? */
  private isEntryExcepted(entry: SocketConnectionEntry, target: SocketServerPushTarget): boolean {
    if (target.exceptConnectionIds !== undefined && target.exceptConnectionIds.includes(entry.cid)) {
      return true
    }
    if (target.exceptRooms !== undefined && target.exceptRooms.length > 0 && target.space !== undefined) {
      const participation = entry.spaces.get(target.space)
      if (participation && target.exceptRooms.some((roomSerialized) => participation.rooms.has(roomSerialized))) {
        return true
      }
    }
    return false
  }

  /**
   * Deliver one push to this process's sockets and count the local answers expected. ONE addressing watershed for
   * resumable and plain channels alike — what decides the path is whether the frame's audience is exactly a topic's
   * audience, which it is not when the target names CONNECTIONS (`connectionId` / `identityMatcher`) or carves an
   * audience out of the topic (`exceptRooms`):
   *
   * - a topic-shaped audience (bare / `space` / `rooms` / `$room`) → the TOPIC path: one frame per topic — the channel
   *   `*all*` topic, the space-wide topic, or one publish per targeted room — serialized ONCE and fanned out by the
   *   native pub/sub. A `$room` matcher resolves here, per process, into the concrete local rooms (the sift scan the
   *   `$`-key announces) and then rides the same room topics — a room push with late binding of the room set. On a
   *   resumable channel the frame is stamped into the topic's STREAM first ({@link stampStreamFrame}); parked
   *   subscribers cost nothing — the stream IS their buffer.
   * - ANY connection part, or an `exceptRooms` carve-out → the PERSONAL path: AND-filter the entries (exact cids are O(1)
   *   lookups, the identity matcher is a sift scan; room parts require a covering membership), then a direct send per
   *   frame, stamped into each recipient's personal stream on a resumable channel ({@link sendPersonalFrame}; parked
   *   recipients only log). Every exclusion is applied HERE, so the frames carry no `except` fields onward.
   *
   * ONE frame = ONE reply: the expectation is the frames that reach a LIVE connection — one for a channel or space-wide
   * push, one per targeted room the connection is in for a room push (how many components the client mounted is its own
   * business and never changes the count). Parked entries never count — a parked client cannot answer.
   */
  private deliverPushLocal(push: {
    scope: PointsScope
    channel: string
    handler: string
    target: SocketServerPushTarget
    input?: string | undefined
    mid?: string | undefined
  }): { expected: number; expectedByCid: Map<string, number> } {
    const target = push.target
    const channelPoint = this.server.points.findPoint({
      scope: push.scope,
      type: 'channel',
      name: push.channel,
    })?.point
    const resumable = channelPoint !== undefined && this.channelResumable(channelPoint)
    const handlerPoint = resumable
      ? this.server.points.findPoint({ scope: push.scope, type: 'clientHandler', name: push.handler })?.point
      : undefined
    const bufferLimit = handlerPoint ? this.handlerBufferLimit(handlerPoint) : undefined
    // the frame as a recipient of the PERSONAL path sees it: that path applies every exclusion itself, so shipping the
    // excepts on would only tell each recipient which connections and rooms were left out
    const personalBaseFrame: SocketServerFrame & { t: 'msg' } = {
      t: 'msg',
      channel: push.channel,
      handler: push.handler,
      ...(push.input === undefined ? {} : { input: push.input }),
      ...(push.mid === undefined ? {} : { mid: push.mid }),
    }
    // the topic path cannot filter — a topic's audience is its subscribers — so the frame carries the excepted
    // connection ids for the client to drop on (echo suppression; `exceptRooms` never takes this path)
    const baseFrame: SocketServerFrame & { t: 'msg' } = {
      ...personalBaseFrame,
      ...(target.exceptConnectionIds === undefined ? {} : { exceptConnectionIds: target.exceptConnectionIds }),
      ...(target.exceptRooms === undefined ? {} : { exceptRooms: target.exceptRooms }),
    }
    // the per-cid slice of `expected` — the collect window's reply allowance (see PendingCollect.allowanceByCid)
    const expectedByCid = new Map<string, number>()
    const countExpected = (entry: SocketConnectionEntry, count: number): void => {
      if (count > 0) {
        expectedByCid.set(entry.cid, (expectedByCid.get(entry.cid) ?? 0) + count)
      }
    }
    // the indexes keep PARKED entries of a resumable channel on purpose (they are the streams' subscriber truth) —
    // a parked recipient is buffered for, but only live entries receive frames and count toward a collect window
    const isLive = (entry: SocketConnectionEntry): boolean => this.connections.get(entry.cid) === entry
    const matchesIdentity = ((): ((identity: unknown) => boolean) | undefined => {
      if (target.identityMatcher === undefined) {
        return undefined
      }
      if (!channelPoint) {
        return () => false
      }
      return siftQueryTester(channelPoint._getSocketTransformer().parse(target.identityMatcher))
    })()
    const spacePoint =
      target.space === undefined
        ? undefined
        : this.server.points.findPoint({ scope: push.scope, type: 'space', name: target.space })?.point
    // the `$room` matcher — parsed with the SPACE transformer (rooms are the space's serialization), sift over the
    // parsed rooms of this process's local index; the explicit scan the `$`-key announces
    const matchesRoom = ((): ((room: unknown) => boolean) | undefined => {
      if (target.roomMatcher === undefined || target.space === undefined) {
        return undefined
      }
      if (!spacePoint) {
        return () => false
      }
      return siftQueryTester(spacePoint._getSocketTransformer().parse(target.roomMatcher))
    })()
    // an `except` of ROOMS names an audience — other people — so it is enforced here, per entry, and never by asking
    // the recipient to drop the frame. An `except` of CONNECTION IDS stays on the topic path on purpose: it excludes
    // the connection that authored the payload (echo suppression), and hiding a message from its own author protects
    // nothing. See the `except` section of docs/core/socket.md
    const needsEntryFilter =
      target.connectionId !== undefined ||
      target.identityMatcher !== undefined ||
      (target.exceptRooms !== undefined && target.exceptRooms.length > 0)
    let expected = 0
    if (!needsEntryFilter) {
      // ---- the TOPIC path: serialize once, publish once per topic ----
      const publishToStream = (
        topicKey: string,
        frame: SocketServerFrame & { t: 'msg' },
        hasSubscribers: boolean,
      ): void => {
        const inResume =
          resumable && (frame.space === undefined || (spacePoint !== undefined && this.spaceInResume(spacePoint)))
        if (!inResume || !hasSubscribers) {
          // a plain channel, an opt-out space, or a topic nobody (live or parked) holds — no stream to feed: a
          // subscriber-less stream could never be released, and no absent subscriber's proof needs the tseq
          this.publishTopic(topicKey, JSON.stringify(frame))
          return
        }
        let stream = this.streams.get(topicKey)
        if (!stream) {
          stream = this.freshStream()
          this.streams.set(topicKey, stream)
        }
        this.publishTopic(
          topicKey,
          this.stampStreamFrame(
            stream,
            frame,
            push.handler,
            bufferLimit,
            this.streamCapsFor(channelPoint!, spacePoint),
          ),
        )
      }
      if (target.space === undefined) {
        // channel-wide — every live connection of the channel answers once
        for (const entry of this.connections.values()) {
          if (
            entry.scope === push.scope &&
            entry.channelName === push.channel &&
            !this.isEntryExcepted(entry, target)
          ) {
            expected++
            countExpected(entry, 1)
          }
        }
        const channelIndex = this.entriesByChannel.get(this.channelIndexKey(push.scope, push.channel))
        publishToStream(
          this.channelTopic(push.scope, push.channel),
          baseFrame,
          channelIndex !== undefined && channelIndex.size > 0,
        )
        return { expected, expectedByCid }
      }
      if (target.rooms === undefined && matchesRoom === undefined) {
        // space-wide — one publish, every live member of the space answers once
        const bySpace = this.entriesBySpace.get(this.spaceKey(push.scope, target.space))
        for (const entry of bySpace ?? []) {
          if (entry.channelName !== push.channel || !isLive(entry) || this.isEntryExcepted(entry, target)) {
            continue
          }
          expected++
          countExpected(entry, 1)
        }
        publishToStream(
          this.spaceTopic(push.scope, target.space),
          { ...baseFrame, space: target.space },
          bySpace !== undefined && bySpace.size > 0,
        )
        return { expected, expectedByCid }
      }
      // room-addressed: the exact list, and/or the `$room` matcher resolved into this process's concrete local rooms
      // — then ordinary room publishes (one per room; a member of several targeted rooms answers one per room)
      const roomsSerialized = ((): string[] => {
        if (matchesRoom === undefined) {
          return target.rooms ?? []
        }
        const matched = new Set<string>()
        for (const entry of this.entriesBySpace.get(this.spaceKey(push.scope, target.space)) ?? []) {
          if (entry.channelName !== push.channel) {
            continue
          }
          const participation = entry.spaces.get(target.space)
          for (const [roomSerialized, roomParsed] of participation?.rooms ?? []) {
            if (matched.has(roomSerialized)) {
              continue
            }
            if (target.rooms !== undefined && !target.rooms.includes(roomSerialized)) {
              continue
            }
            if (matchesRoom(roomParsed)) {
              matched.add(roomSerialized)
            }
          }
        }
        return [...matched]
      })()
      for (const roomSerialized of roomsSerialized) {
        const roomKey = this.roomTopic(push.scope, target.space, roomSerialized)
        const byRoom = this.entriesByRoom.get(roomKey)
        for (const entry of byRoom ?? []) {
          if (entry.channelName !== push.channel || !isLive(entry) || this.isEntryExcepted(entry, target)) {
            continue
          }
          expected++
          countExpected(entry, 1)
        }
        publishToStream(
          roomKey,
          { ...baseFrame, space: target.space, room: roomSerialized },
          byRoom !== undefined && byRoom.size > 0,
        )
      }
      return { expected, expectedByCid }
    }
    // ---- the PERSONAL path: a selection names connections — no topic's audience matches it ----
    const candidates: Iterable<{ entry: SocketConnectionEntry; live: boolean }> = resumable
      ? this.resumableCandidates(push.scope, push.channel, target)
      : [...this.narrowCandidates(push.scope, target.space, target.rooms, target.connectionId)].map((entry) => ({
          entry,
          live: true,
        }))
    for (const { entry, live } of candidates) {
      if (entry.scope !== push.scope || entry.channelName !== push.channel) {
        continue
      }
      if (this.isEntryExcepted(entry, target)) {
        continue
      }
      if (matchesIdentity && !matchesIdentity(entry.identityParsed)) {
        continue
      }
      // the frames this entry receives — one for a channel or space-wide push, one per targeted room it is in
      const frames: Array<SocketServerFrame & { t: 'msg' }> = []
      if (target.space === undefined) {
        frames.push({ ...personalBaseFrame, cid: entry.cid })
      } else {
        const participation = entry.spaces.get(target.space)
        if (!participation) {
          continue
        }
        if (target.rooms === undefined && matchesRoom === undefined) {
          frames.push({ ...personalBaseFrame, space: target.space, cid: entry.cid })
        } else {
          for (const [roomSerialized, roomParsed] of participation.rooms) {
            if (target.rooms !== undefined && !target.rooms.includes(roomSerialized)) {
              continue
            }
            if (matchesRoom && !matchesRoom(roomParsed)) {
              continue
            }
            frames.push({ ...personalBaseFrame, space: target.space, room: roomSerialized, cid: entry.cid })
          }
        }
      }
      for (const frame of frames) {
        if (resumable) {
          this.sendPersonalFrame(entry, live, frame, bufferLimit, this.streamCapsFor(channelPoint!))
        } else {
          this.send(entry.ws, frame)
        }
      }
      if (live && frames.length > 0) {
        expected += frames.length
        countExpected(entry, frames.length)
      }
    }
    return { expected, expectedByCid }
  }

  /**
   * The candidates of a PERSONAL push on a resumable channel — live AND parked, deduped, narrowed like
   * {@link narrowCandidates} (exact cids → O(1) lookups in both maps; room/space parts ride the index, which keeps
   * parked entries on purpose; a bare selection walks the connections plus this channel's parked few). A selection push
   * must reach a parked recipient's personal stream exactly like a topic push reaches its room stream — or the gap
   * would go unmarked and `gapless` would lie. A stale index survivor that is neither the live entry of its cid nor the
   * parked one is skipped outright.
   */
  private *resumableCandidates(
    scope: PointsScope,
    channel: string,
    target: SocketServerPushTarget,
  ): Generator<{ entry: SocketConnectionEntry; live: boolean }> {
    const seen = new Set<SocketConnectionEntry>()
    const classify = (entry: SocketConnectionEntry): { entry: SocketConnectionEntry; live: boolean } | undefined => {
      if (seen.has(entry)) {
        return undefined
      }
      seen.add(entry)
      if (this.connections.get(entry.cid) === entry) {
        return { entry, live: true }
      }
      if (this.parkedByCid.get(entry.cid)?.entry === entry) {
        return { entry, live: false }
      }
      return undefined
    }
    if (target.connectionId !== undefined) {
      for (const cid of target.connectionId) {
        const entry = this.connections.get(cid) ?? this.parkedByCid.get(cid)?.entry
        if (entry) {
          const classified = classify(entry)
          if (classified) {
            yield classified
          }
        }
      }
      return
    }
    if (target.space !== undefined && target.rooms !== undefined && target.rooms.length > 0) {
      for (const roomSerialized of target.rooms) {
        for (const entry of this.entriesByRoom.get(this.roomTopic(scope, target.space, roomSerialized)) ?? []) {
          const classified = classify(entry)
          if (classified) {
            yield classified
          }
        }
      }
      return
    }
    if (target.space !== undefined) {
      for (const entry of this.entriesBySpace.get(this.spaceKey(scope, target.space)) ?? []) {
        const classified = classify(entry)
        if (classified) {
          yield classified
        }
      }
      return
    }
    for (const entry of this.connections.values()) {
      const classified = classify(entry)
      if (classified) {
        yield classified
      }
    }
    for (const parked of this.parkedByCid.values()) {
      if (parked.entry.scope !== scope || parked.entry.channelName !== channel) {
        continue
      }
      const classified = classify(parked.entry)
      if (classified) {
        yield classified
      }
    }
  }

  /**
   * One personal-stream frame to one connection — the selection push's delivery: stamp it into the recipient's personal
   * stream (tseq + delivery stamp; an opted handler logs it, others mark the hole — {@link stampStreamFrame}) and send
   * it when the entry is live. A parked recipient only logs: the frames wait for the resume.
   */
  private sendPersonalFrame(
    entry: SocketConnectionEntry,
    live: boolean,
    frame: SocketServerFrame & { t: 'msg' },
    bufferLimit: number | undefined,
    caps: StreamCaps,
  ): void {
    const stream = (entry.personalStream ??= this.freshStream())
    const json = this.stampStreamFrame(stream, frame, frame.handler, bufferLimit, caps)
    if (live) {
      this.sendJson(entry.ws, json, 'msg')
    }
  }

  private emitSocketEvent(
    name: 'socketServerUpgrade' | 'socketServerConnect' | 'socketServerDisconnect',
    scope: PointsScope,
  ): void {
    this.server.points.manager.root._emit(name, { scope }, { scope })
  }

  /**
   * `pointChannelClaimServerError` — the claim's refusal single, emitted wherever a `claimErr` frame is answered. The
   * connect family fires at connector time, BEFORE the claim, so without this a connection that never went live leaves
   * the server eventer silent. Rides the channel point once the refusal knows one (a channel-level subscription then
   * sees it), the root otherwise — a refused ticket names no channel at all.
   */
  private emitClaimError({
    scope,
    point,
    connectionId,
    reason,
    error,
  }: {
    scope: PointsScope
    point?: AnyPoint
    connectionId?: string
    reason: 'ticket' | 'connection' | 'channel' | 'maxConnections' | 'enroller'
    error: unknown
  }): void {
    const emitPoint = point ?? (this.server.points.manager.root as AnyPoint)
    emitPoint._emit(
      'pointChannelClaimServerError',
      {
        scope,
        point,
        connectionId,
        reason,
        error: emitPoint._Error.from(error),
      } as never,
      { scope, point: point?.id, connection: connectionId, reason },
    )
  }

  /**
   * `socketServerSendRefused` — an incoming send the engine refused before any point could run. The sender learns it
   * from the `sendErr` frame (and its own `pointHandlerSendClientError`); this is the server-side half, which is where
   * abuse and misconfiguration are worth watching. Rides the channel point when the connection is known.
   */
  private emitSendRefused({
    scope,
    point,
    reason,
    handlerName,
    connectionId,
    error,
  }: {
    scope: PointsScope
    point?: AnyPoint
    reason: 'unknownConnection' | 'tooLarge' | 'handlerNotFound' | 'notInRoom'
    handlerName: string | undefined
    connectionId: string | undefined
    error: unknown
  }): void {
    const emitPoint = point ?? (this.server.points.manager.root as AnyPoint)
    emitPoint._emit(
      'socketServerSendRefused',
      {
        scope,
        reason,
        handlerName,
        connectionId,
        error: emitPoint._Error.from(error),
      } as never,
      { scope, point: point?.id, reason, handler: handlerName, connection: connectionId },
    )
  }

  /**
   * The per-connection live-state singles. An Open carries `resumed` — `true` when the connection came back through a
   * resume (an unpark or a KV restore: no connector ran); a Close carries the `reason`.
   */
  private emitChannelConnectionEvent(
    name: 'pointChannelOpenServer' | 'pointChannelCloseServer',
    entry: SocketConnectionEntry,
    options: { resumed: boolean } | { reason: 'close' | 'socket' | 'kick' },
  ): void {
    entry.channelPoint._emit(
      name,
      {
        point: entry.channelPoint,
        connectionId: entry.cid,
        identity: entry.identityParsed,
        ...options,
      },
      { point: entry.channelPoint.id, connection: entry.cid },
    )
  }

  /**
   * Server-only `pointSpaceLeaveServer` — a connection leaving rooms of a space (client leave, socket death, room kick,
   * or close). `rooms` = the parsed rooms that actually went.
   */
  private emitSpaceLeaveEvent(
    entry: SocketConnectionEntry,
    spacePoint: AnyPoint,
    roomsParsed: unknown[],
    reason: 'leave' | 'socket' | 'kick' | 'close',
  ): void {
    spacePoint._emit(
      'pointSpaceLeaveServer',
      {
        point: spacePoint,
        connectionId: entry.cid,
        identity: entry.identityParsed,
        rooms: roomsParsed,
        reason,
      },
      { point: spacePoint.id, connection: entry.cid },
    )
  }

  // the introspection floor — what `engine.socket` hands out (see `createEngineSocketFacade`)

  /**
   * A SYNCHRONOUS snapshot of this process: every claimed connection and every (connection, space) participation it
   * holds, read straight off the connections map and the room index. Nothing crosses the bus — the cluster picture is
   * the points' own `connections.server.*` / `memberships.server.*`.
   */
  localSnapshot(): EngineSocketLocalSnapshot {
    const connections: EngineSocketLocalConnection[] = []
    const memberships: EngineSocketLocalMembership[] = []
    // a socket can carry several claimed connections (the client multiplexes its channels over one ws), so count the
    // distinct sockets the live entries point at — the honest source, there is no separate socket registry
    const sockets = new Set<SocketConnectionEntry['ws']>()
    // the stream aggregates: the shared topic streams plus the personal streams, which live on their entries — live
    // AND parked (a parked entry's personal stream is buffering, that is what the park is for)
    const streams = { count: 0, frames: 0, bytes: 0, evictedFramesTotal: this.evictedFramesTotal }
    const countStream = (stream: TopicStream | undefined): void => {
      if (!stream) {
        return
      }
      streams.count++
      streams.frames += stream.log.length
      streams.bytes += stream.logBytes
    }
    for (const stream of this.streams.values()) {
      countStream(stream)
    }
    for (const parked of this.parkedByCid.values()) {
      countStream(parked.entry.personalStream)
    }
    for (const entry of this.connections.values()) {
      countStream(entry.personalStream)
      sockets.add(entry.ws)
      connections.push({
        scope: entry.scope,
        channel: entry.channelName,
        connectionId: entry.cid,
        identity: entry.identityParsed,
      })
      for (const [spaceName, participation] of entry.spaces) {
        memberships.push({
          scope: entry.scope,
          channel: entry.channelName,
          space: spaceName,
          connectionId: entry.cid,
          rooms: [...participation.rooms.values()],
        })
      }
    }
    return {
      socketsCount: sockets.size,
      roomsCount: this.entriesByRoom.size,
      parkedCount: this.parkedByCid.size,
      streams,
      connections,
      memberships,
    }
  }

  /** Bus + backplane service state — `started` is the bus subscription, `backplane` how the option was configured. */
  status(): EngineSocketStatus {
    const started = this.busStarted && !this.disposed
    return {
      started,
      backplane: engineSocketBackplaneKind(this.server.backplaneProvided),
      // the shared channel + the inbox once started, plus the dynamic channel/space/room topics currently held
      busSubscriptions: (started ? 2 : 0) + this.busTopics.size,
    }
  }

  dispose(): void {
    this.disposed = true
    this.busUnsubscribe?.()
    this.busUnsubscribe = undefined
    this.unregisterAdapters()
    for (const pending of [...this.pendingCollects.values()]) {
      this.finishCollect(pending.mid)
    }
    for (const gather of [...this.pendingGathers.values()]) {
      clearTimeout(gather.timer)
      gather.onDone()
      this.pendingGathers.delete(gather.reqId)
    }
    for (const pending of [...this.pendingCounts.values()]) {
      clearTimeout(pending.timer)
      pending.resolve(pending.total)
      this.pendingCounts.delete(pending.reqId)
    }
    for (const seed of this.pendingUpgrades.values()) {
      clearTimeout(seed.timer)
    }
    this.pendingUpgrades.clear()
    for (const bare of this.pendingBareUpgrades.values()) {
      clearTimeout(bare.timer)
    }
    this.pendingBareUpgrades.clear()
    // the parked buffers die with the process — their KV records deliberately do NOT (a graceful shutdown must keep
    // the redeploy resumable; the TTL reclaims what nobody resumes)
    for (const parked of this.parkedByCid.values()) {
      clearTimeout(parked.timer)
    }
    this.parkedByCid.clear()
    // the dynamic topic subscriptions go with the start-owned ones — dev-server restarts against one long-lived
    // user Backplane must not stack subscriptions (an in-flight subscribe unsubscribes itself on settle: it finds
    // its map entry gone)
    for (const subscription of this.busTopics.values()) {
      if (subscription.lingerTimer !== undefined) {
        clearTimeout(subscription.lingerTimer)
      }
      subscription.unsubscribe?.()
    }
    this.busTopics.clear()
    this.connections.clear()
    this.entriesByRoom.clear()
    this.entriesBySpace.clear()
    this.entriesByChannel.clear()
    this.streams.clear()
    this.seenEnvelopeIds.clear()
    this.seenEnvelopeIdQueue.length = 0
    // release what the backplane itself owns — the URL shortcut's Redis clients, an adapter's duplicated subscriber,
    // the in-memory default's TTL timers. After the unsubscribes above, so they still had a transport to ride.
    const backplanePromise = this.backplanePromise
    this.backplanePromise = undefined
    void backplanePromise
      ?.then(async (backplane) => await backplane.dispose?.())
      .catch((error) => {
        this.server.log({
          level: 'error',
          category: ['point0', 'socket'],
          message: 'Socket backplane dispose failed',
          error,
        })
      })
  }
}

/**
 * The server end of a FakeClient socket pair — the duck of the `Bun.ServerWebSocket` surface EngineSocket uses: `data`
 * (the upgrade's SocketData), `send` (a frame to the client), `subscribe`/`unsubscribe` (the in-memory topic registry
 * standing in for Bun's pub/sub). Frames are delivered to the client end through `onFrame`.
 */
class InMemoryServerSocket {
  data: SocketData
  private topics: Map<string, Set<InMemoryServerSocket>>
  private onFrame: (json: string) => void
  private disposed = false

  /** mirrors the real ws's readyState just enough for the liveness guards (1 = OPEN, 3 = CLOSED) */
  get readyState(): number {
    return this.disposed ? 3 : 1
  }

  constructor({
    data,
    topics,
    onFrame,
  }: {
    data: SocketData
    topics: Map<string, Set<InMemoryServerSocket>>
    onFrame: (json: string) => void
  }) {
    this.data = data
    this.topics = topics
    this.onFrame = onFrame
  }

  send(json: string): void {
    this.deliver(json)
  }

  /** A topic publish (or a direct send) reaching this socket — hand the frame to the client end. */
  deliver(json: string): void {
    if (this.disposed) {
      return
    }
    this.onFrame(json)
  }

  subscribe(topic: string): void {
    // an in-flight async handler (a join awaiting its joiner) may race the client's close — never re-enter a topic
    if (this.disposed) {
      return
    }
    const sockets = this.topics.get(topic) ?? new Set()
    sockets.add(this)
    this.topics.set(topic, sockets)
  }

  unsubscribe(topic: string): void {
    const sockets = this.topics.get(topic)
    if (!sockets) {
      return
    }
    sockets.delete(this)
    if (sockets.size === 0) {
      this.topics.delete(topic)
    }
  }

  /** The client end closed — stop delivering and leave every topic. */
  dispose(): void {
    this.disposed = true
    for (const [topic, sockets] of [...this.topics.entries()]) {
      sockets.delete(this)
      if (sockets.size === 0) {
        this.topics.delete(topic)
      }
    }
  }
}
