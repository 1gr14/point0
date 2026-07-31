/**
 * The socket in one module: the client runtime (the one WebSocket per client, connection holds and dedup by input, the
 * send queue, message dispatch to handler listeners), the wire protocol both sides speak, and the server-only adapter
 * seam the engine plugs into for pushes and admin commands.
 *
 * The socket is lazy: it opens with the first connection of any channel and closes shortly after the last one is gone.
 * Connecting to a channel is a regular HTTP request to the channel's `_endpoint` — GET-first with `?input=`, POST only
 * on the binary/over-long fallback; the response carries a one-time ticket the socket claims. From then on messages
 * flow over the socket.
 *
 * The server seam is one adapter per scope, and nothing in it ever runs in a browser: every use site opens with a
 * `_point0_env.side.is.client` guard, and the adapter registry is defined on first touch rather than at import — this
 * module is the client runtime as well, so it stays free of module-level side effects (the reasoning sits at the
 * registry).
 *
 * The whole module is one OPTIONAL FEATURE. It is deliberately NOT re-exported from `@point0/core` —
 * `@point0/core/socket` is the only door — and every public entry here (like every socket method in `point0.ts`) opens
 * with `if (!_point0_env.feature.socket) { throw }`. In an app that never turned the socket on, the client compile
 * folds that access to `false`, the bodies die, the last live references die with them, and this file never reaches the
 * browser. See `EnvFeature` in `env.ts` and the `features` option in the engine config.
 */
import * as React from 'react'
import { POINT0_ERROR_CODES_MAP } from './error.js'
import type { ErrorPoint0 } from './error.js'
import { getLogFnForPoint } from './logger.js'
import { _point0_env } from './env.js'
import { _ss } from './internals.js'
import { superstore } from './super-store.js'
import { POINT0_INTERNAL_PATH_PREFIX, POINT0_WEBSOCKET_ENDPOINT_SEGMENT } from './protocol.js'
import { reconnectAttemptAllowed, reconnectDelayMs, resolveReconnectPolicy } from './reconnect.js'
import type {
  AnyClientChannelConnection,
  AnyClientSpaceMembership,
  AnyPoint,
  ChannelConnectionStatus,
  ClientHandlerListenerFn,
  ExtraUseConnectionOptions,
  ExtraUseMembershipOptions,
  Gate,
  InputRawUnknown,
  PointsScope,
  SpaceMembershipStatus,
} from './types.js'
import {
  generateId,
  mergeChannelOptions,
  stringifyOrThrow,
  mergeSpaceOptions,
  mergeClientHandlerOptions,
  mergeServerHandlerOptions,
  toKebabCase,
  socketFeatureOffError,
} from './utils.js'

// ------------------------------------------------------------------------------------------------------------------
// internal vocabulary — the three values this module carries UNTYPED, all for the same reason: their real types live in
// the point's generics (a space's `TRoom`, a handler's schemas) and everything here runs on the ERASED `AnyPoint`, so
// `unknown` is the truth. The aliases add no safety — they add the WORD, so a signature says WHICH unknown it means.
// Deliberately not exported: documentation, not a contract.
// ------------------------------------------------------------------------------------------------------------------

/** A room in its un-serialized form — what `handler(room)` bound, or what a space transformer parsed off a frame. */
type RoomUnknown = unknown

/** A handler message past the point transformer — a `sendToServer` input, a `sendToClient` push's payload. */
type MessageUnknown = unknown

/** A reply past the point transformer — what `.serverReply` answered a send with, what `.clientReply` answers a push. */
type ReplyUnknown = unknown

// ------------------------------------------------------------------------------------------------------------------
// wire protocol
// ------------------------------------------------------------------------------------------------------------------

/** Frames the client sends over the socket. Payload fields (`input`, `data`) are point-transformer-serialized strings. */
export type SocketClientFrame =
  | { t: 'claim'; ticket: string }
  | { t: 'discard'; ticket: string }
  | { t: 'close'; cid: string }
  /** `handler` = the serverHandler point name; `room` (a space handler) is the serialized room this message addresses */
  | { t: 'send'; id: string; cid: string; handler: string; input?: string; room?: string }
  /** join a space — the server runs `.joiner` and answers `joined` / `joinErr`; `id` correlates the answer */
  | { t: 'join'; id: string; cid: string; space: string; input?: string }
  /**
   * leave the named rooms of a space — the CLIENT names them (it owns the shared-room refcount across its own
   * memberships: a room another of its joins still covers is simply not in the list; the server keys nothing by input)
   */
  | { t: 'leave'; cid: string; space: string; rooms: string[] }
  | {
      t: 'reply'
      id: string
      cid: string
      data?: string
      /**
       * the client's `.clientReply` threw — its public serialization; counts toward the collect window, delivers
       * nothing
       */
      error?: string
    }
  /**
   * the FIRST frame of a fresh socket when the client holds resumable connections — restore them all in one go: per
   * entry the connection id, the raw resume key (the server stores only its hash) and the connection's STREAM CURSORS —
   * stream wire key → the `tseq` of the last `msg` frame received on that stream (see the stream-key dictionary on the
   * `msg` frame; an absent key = the client never heard the stream). The server answers per cid — `resumed` or
   * `resumeErr`; mixed results are legal, and a refused cid falls back to the ordinary full connect
   */
  | { t: 'resume'; entries: Array<{ cid: string; key: string; cursors: Record<string, number> }> }
  | { t: 'ping' }

/** Frames the server sends over the socket. `error` fields carry the error class's public serialization as JSON. */
export type SocketServerFrame =
  /**
   * the connect confirmation; `enrolled` = the server-side `.enroller` enrollments (space name → serialized rooms);
   * `resumeKey` = the raw resume credential of a RESUMABLE channel's connection — sent exactly once, here (the server
   * keeps only its hash), and the client holds it in memory for the connection's lifetime; `heads` (a resumable
   * channel) seeds the client's stream cursors — stream wire key → the stream's current `tseq` at the subscription
   * moment, for the channel-wide ('c') and personal ('p') streams plus the enrolled spaces' streams
   */
  | {
      t: 'claimed'
      cid: string
      enrolled?: Array<{ space: string; rooms: string[] }>
      resumeKey?: string
      heads?: Record<string, number>
    }
  | { t: 'claimErr'; cid: string; ticket?: string; error: string }
  /**
   * a resume succeeded for this cid — the connection is live again with its identity, rooms and subscriptions restored,
   * no connector/joiner/enroller ran. `streams` is the PER-STREAM verdict map (stream wire key → verdict): `gapless` is
   * the server's proof that the replay covers everything the client missed on THAT stream since its cursor, and `head`
   * is the stream's current `tseq` — the client re-seeds its cursor from it (authoritative: a rebuilt stream may have
   * restarted the numbering). The replayed `msg` frames follow this frame as one tail, merge-ordered by the server's
   * delivery clock across all the connection's streams — the total per-connection order survives the replay
   */
  | { t: 'resumed'; cid: string; streams: Record<string, { gapless: boolean; head: number }> }
  /**
   * a resume was refused for this cid — deliberately without a reason (an unknown cid and a wrong key answer
   * IDENTICALLY; no oracle): the client falls back to the ordinary full connect for this connection
   */
  | { t: 'resumeErr'; cid: string }
  | { t: 'reply'; id: string; data?: string }
  | { t: 'sendErr'; id: string; error: string }
  /**
   * the server closed this connection (a channel kick) — the client marks it `closed`; declarative holds
   * (hooks/components) auto-revive through the reconnect policy, imperative ones stay closed until
   * `reconnectAll()`/remount
   */
  | { t: 'closed'; cid: string; reason?: string }
  /** the server asks this connection to re-run its connect request (the loader re-runs) without dropping the socket */
  | { t: 'refresh'; cid: string }
  /**
   * a join succeeded — `rooms` are the serialized rooms the client entered (empty = joined nothing, a clean deny);
   * `heads` (a resumable channel, space in the resume) seeds the cursors of the freshly-entered streams — the
   * space-wide and per-room stream wire keys → current `tseq`
   */
  | { t: 'joined'; id: string; rooms: string[]; heads?: Record<string, number> }
  /** a join failed — the `.joiner` threw; `error` is its public serialization */
  | { t: 'joinErr'; id: string; error: string }
  /** a space kick — the server removed the client from `rooms` of `space`; the membership stays, its rooms shrink */
  | { t: 'left'; cid: string; space: string; rooms: string[]; reason?: string }
  /**
   * an imperative `space.enroll` grew this connection's enrollment of `space` — `rooms` is the FULL new enrolled set;
   * `heads` seeds the cursors of the grown streams, like a join's
   */
  | { t: 'enrolled'; cid: string; space: string; rooms: string[]; heads?: Record<string, number> }
  | {
      t: 'msg'
      /** set when the push requests replies — the client answers with ONE `reply` frame carrying it back */
      mid?: string
      /**
       * the TOPIC-STREAM sequence number of a RESUMABLE channel's push — dense per stream, every frame of a stream
       * consumes one. The frame's shape names its stream (the client keys its cursors by the same wire keys): a frame
       * with `cid` belongs to that connection's PERSONAL stream ('p'); without `cid` it belongs to the topic it was
       * published on — `space`+`room` = the room stream ('r:<space>:<room>'), `space` alone = the space-wide stream
       * ('s:<space>'), neither = the channel-wide stream ('c'). The client remembers the last received `tseq` per
       * stream and hands the cursor map back in `resume`; the server replays each stream's log from there
       */
      tseq?: number
      /**
       * the REPLAY target — set only on a topic-stream frame re-sent by a resume (the stored frame carries no `cid`;
       * the replay addresses one connection): the client dispatches it to that connection alone, exactly like an
       * addressed push, while the cursor still advances the frame's TOPIC stream
       */
      rcid?: string
      /**
       * set on EVERY frame a resume re-sent (topic and personal alike) — surfaced as `replayed` in the message props,
       * so an app that refetches on a gap can skip the partial catch-up itself; a live push never carries it
       */
      rp?: true
      channel: string
      /** the clientHandler point name this push dispatches to */
      handler: string
      /** a space push — the space name; with `room` = a room-scoped push, without = a space-wide push */
      space?: string
      /** an addressed push — the connection(s) it targets (`connectionId` in the send target) */
      cid?: string
      /** a room push — the serialized room (rides `space`); a `space` without `room` = every member of the space */
      room?: string
      input?: string
      /** connection ids this frame must not wake (`except` in the send target) */
      exceptConnectionIds?: string[]
      /** serialized rooms whose members this frame must not wake (`except` room snapshots in a space send target) */
      exceptRooms?: string[]
    }
  | { t: 'pong' }

/** What the channel connect endpoint answers with — the connection id and the one-time ticket the socket claims. */
export type ChannelConnectOutput = {
  id: string
  ticket: string
}

/**
 * The default window of a client send — waiting for the connect/join and queueing through a reconnect included. The
 * serverHandler `timeout` option overrides it per handler (`.serverHandlerOptions({ client: { timeout } })` on the
 * channel chain sets a channel-wide default) or per call; there is deliberately NO channel-level knob for it. The
 * upgrade-connect and resume answer guards are channel CLIENT options (`upgradeTimeout` / `resumeTimeout`, both
 * defaulting to the same 5 s).
 */
export const DEFAULT_SEND_TIMEOUT_MS = 5000

// ------------------------------------------------------------------------------------------------------------------
// server adapter seam — SERVER-ONLY: what the engine plugs in per scope, the wire shapes a push or an admin command
// travels in, the snapshot shape the enumerations report
// ------------------------------------------------------------------------------------------------------------------

export type SocketServerPushReply = {
  cid: string
  /** the client's reply, transformer-serialized — validated by the handler's `.clientReply` schema in core */
  data: string | undefined
  /** the room this reply is about (a space handler), transformer-serialized */
  room?: string | undefined
  /** the space this reply is about (a space handler) */
  space?: string | undefined
}

/**
 * Where a push goes — the serialized `$`-dictionary target, parts AND-combined. An empty target = everyone in the
 * handler's scope: the channel's `*all*` topic (no `space`) or the space-wide topic (`space` set, no `rooms`).
 */
export type SocketServerPushTarget = {
  /** exact connection ids — the O(1) address */
  connectionId?: string[] | undefined
  /** sift matcher over the identity (`$identity`), channel-transformer-serialized */
  identityMatcher?: string | undefined
  /** the space name — present on every SPACE handler push */
  space?: string | undefined
  /** exact rooms, space-transformer-serialized; `space` with no `rooms` = the whole space (the space-wide topic) */
  rooms?: string[] | undefined
  /** the `$room` sift matcher, space-transformer-serialized — an explicit scan over each process's local room index */
  roomMatcher?: string | undefined
  /** connection ids to skip */
  exceptConnectionIds?: string[] | undefined
  /** serialized rooms to skip — a connection holding any of them does not get the push (space handlers) */
  exceptRooms?: string[] | undefined
}

export type SocketServerPushArgs = {
  /** the channel point the handler belongs to */
  channel: AnyPoint
  /** the clientHandler point being sent */
  handler: AnyPoint
  target: SocketServerPushTarget
  /** the message input, transformer-serialized */
  input?: string | undefined
  /** when present, the push requests replies: the adapter streams them in until the window closes */
  collect?:
    | {
        timeoutMs: number
        onReply: (reply: SocketServerPushReply) => void
        onDone: () => void
      }
    | undefined
}

/**
 * Server-side admin targeting: which connections (or space memberships) an operation applies to — the serialized
 * `$`-dictionary, parts AND-combined. All parts optional — a bare target means every connection of the channel (or
 * every membership of the space). Matchers are Mongo-style queries evaluated by sift; everything travels the backplane
 * bus transformer-serialized (identity parts by the channel point, room parts by the space point) so Dates survive.
 */
export type SocketAdminTarget = {
  channel: AnyPoint
  /** the space name — set for space-level admin (`space.kick` / `space.memberships.*`) */
  space?: string | undefined
  /** the `$identity` sift matcher, channel-transformer-serialized */
  matcher?: string | undefined
  /** the `$room` sift matcher, space-transformer-serialized */
  roomMatcher?: string | undefined
  /** exact room snapshots (`room`), space-transformer-serialized */
  rooms?: string[] | undefined
  /** exact connection ids (`connectionId`) */
  connectionId?: string[] | undefined
}

/** One live connection as the admin surface reports it — serialized fields, core parses with the channel transformer. */
export type SocketConnectionSnapshot = {
  cid: string
  /** the connection's identity, transformer-serialized */
  identity: string
  /** per-space rooms this connection holds (space name → serialized rooms) — present for space admin */
  spaces?: Record<string, string[]> | undefined
  /**
   * `spaces` parsed with each space's own transformer — filled by the initiating adapter right before handing the
   * gathered items to core (the space transformers live with the engine's point registry, not with the calling point)
   */
  spacesParsed?: Record<string, RoomUnknown[]> | undefined
}

/** What the engine plugs in per scope. All publishing goes through this seam so a multi-process backplane carries it. */
export type SocketServerAdapter = {
  push: (args: SocketServerPushArgs) => void
  /** close matching connections (a `closed` frame goes to each client), local + across the backplane bus */
  kick: (args: SocketAdminTarget & { reason?: string }) => Promise<void>
  /**
   * grow the matching connections' server-side enrollment of the target's space by `enrollRooms` (space-transformer
   * serialized), local + across the backplane bus — the imperative twin of `.enroller`, the mirror of a space kick
   */
  enroll: (args: SocketAdminTarget & { enrollRooms: string[] }) => Promise<void>
  /** ask matching connections to re-run their connect request (the connector re-applies), socket stays up */
  refresh: (args: SocketAdminTarget) => Promise<void>
  /** count matching live connections — local + a numbers-only scatter-gather over the backplane bus */
  count: (args: SocketAdminTarget & { timeoutMs?: number }) => Promise<number>
  /** enumerate matching live connections — local + a scatter-gather over the backplane bus, merged at window close */
  list: (args: SocketAdminTarget & { timeoutMs?: number }) => Promise<SocketConnectionSnapshot[]>
  /** SYNCHRONOUS local-only count — this process's matching slice, straight off the room index, no bus */
  localCount: (args: SocketAdminTarget) => number
  /**
   * SYNCHRONOUS local-only list — this process's matching snapshots, straight off the room index (no bus). A channel
   * snapshot's `spacesParsed` is filled here (the space transformers live with the engine registry, same process).
   */
  localList: (args: SocketAdminTarget) => SocketConnectionSnapshot[]
  /** stream matching live connections as they arrive (local first, bus answers next); `onDone` closes the window */
  forEach: (
    args: SocketAdminTarget & {
      timeoutMs?: number
      onItem: (item: SocketConnectionSnapshot) => void
      onDone: () => void
    },
  ) => void
  /** shallow-merge a patch into the stored identity of matching connections — the entry and the KV record, everywhere */
  amendIdentity: (args: SocketAdminTarget & { patchSerialized: string }) => Promise<void>
}

// the engine registers at boot (outside any request storage), server sends read from requests and crons — the one
// socket store that is genuinely server-global; every client-side store of the client runtime is side-scoped through
// the superstore. DEFINED LAZILY: `superstore.define` mutates the store's item registry, and at module level that
// would be a side effect every client pays on import — this module is the client runtime as well, so it is in the
// browser bundle whether or not a single line of the server seam survives the `_point0_env.side.is.client` guards.
// On first touch instead: the registry only ever comes into being on a server.
const defineSocketServerAdapters = () =>
  superstore.define<Map<PointsScope, SocketServerAdapter>>(
    '__POINT0_SOCKET_SERVER_ADAPTERS__',
    () => new Map(),
    'serverOnlyGlobal',
  )

let socketServerAdaptersSsItemMemo: ReturnType<typeof defineSocketServerAdapters> | undefined

const socketServerAdaptersSsItem = (): ReturnType<typeof defineSocketServerAdapters> =>
  (socketServerAdaptersSsItemMemo ??= defineSocketServerAdapters())

/**
 * The engine registers its running socket server here (one adapter per served scope) — how a server-side `sendToClient`
 * / `kick` / enumeration finds the live server without importing the engine.
 */
export const registerSocketServerAdapter = (scope: PointsScope, adapter: SocketServerAdapter): void => {
  socketServerAdaptersSsItem().get().set(scope, adapter)
}

/**
 * The engine's dispose calls this — a later server-side send answers with the clear "not running" throw instead of
 * reaching a dead adapter.
 */
export const unregisterSocketServerAdapter = (scope: PointsScope): void => {
  socketServerAdaptersSsItem().get().delete(scope)
}

/**
 * Resolve the scope's running adapter — every server-side push and admin call goes through this seam; throws when no
 * engine server registered one (the process is not serving sockets).
 */
export const getSocketServerAdapterOrThrow = (scope: PointsScope, pointId: string): SocketServerAdapter => {
  const adapter = socketServerAdaptersSsItem().get().get(scope)
  if (!adapter) {
    throw new Error(
      `Socket server is not running for scope "${scope}" (sending ${pointId}). Server-side sendToClient() works inside a running engine server.`,
    )
  }
  return adapter
}

// ------------------------------------------------------------------------------------------------------------------
// client runtime
// ------------------------------------------------------------------------------------------------------------------

type HoldToken = {
  internal: InternalConnection
  released: boolean
  /** a use-hook/component hold ("stay connected while mounted") — the auto-revive after a kick serves these only */
  declarative: boolean
  callSiteOptions: ExtraUseConnectionOptions<any, any> | undefined
}

type PendingSend = {
  id: string
  frame: SocketClientFrame & { t: 'send' }
  resolve: (dataSerialized: string | undefined) => void
  reject: (error: unknown) => void
  timeoutTimer: ReturnType<typeof setTimeout>
  queue: boolean
  sent: boolean
  handler: AnyPoint
  internal: InternalConnection
  /** a SPACE-handler send waits for its membership too: the flush gate is `membership.status === 'joined'` */
  membership?: InternalMembership | undefined
  /**
   * the room this space-handler send addresses (un-serialized) — what `handler(room)` bound. Undefined = the binding
   * named a membership (or nothing), and the room is its single one, resolved to a frame `room` at send time
   * (post-join)
   */
  boundRoom?: RoomUnknown
}

type InternalConnection = {
  key: string
  channel: AnyPoint
  channelKey: string
  input: InputRawUnknown
  status: ChannelConnectionStatus
  error: ErrorPoint0 | null
  cid: string | undefined
  ticket: string | undefined
  claimed: boolean
  holds: Set<HoldToken>
  lingerTimer: ReturnType<typeof setTimeout> | undefined
  /** previous server-side cids of this connection (refresh re-POSTs): closed on the server once a claim lands */
  refreshOldCids: Set<string>
  /** the connect request in flight — concurrent connect calls (refresh + socket reconnect) coalesce into it */
  connectInFlight: Promise<void> | undefined
  version: number
  listeners: Set<() => void>
  handlerListeners: Map<string, Set<ClientHandlerListenerFn<any, any>>>
  mergedInto: InternalConnection | undefined
  disposed: boolean
  everOpened: boolean
  /** successful claims so far — `connectionIndex` on the facade and in the lifecycle callbacks (`> 0` = a reconnect) */
  connectIndex: number
  /** auto-revive attempts since the last successful claim — paces the declarative revive through the reconnect policy */
  reviveAttempt: number
  reviveTimer: ReturnType<typeof setTimeout> | undefined
  /** the last connect answered with `preventRetry` — no auto-revive and no re-POST until `reconnectAll()`/remount */
  preventRevive: boolean
  /**
   * the resume credential of a RESUMABLE channel's live connection — arrives once with the `claimed` frame, lives in
   * memory only (a page reload = no key = an honest full connect). While it is set, a socket drop KEEPS the cid: the
   * next socket's first frame offers `{ cid, key, cursors }` and a `resumed` answer revives the connection without a
   * connect request. Cleared by a `refresh` frame (the resume bypass — the re-connect mints a fresh key) and gone with
   * the internal on any dispose (kick, close, logout)
   */
  resumeKey: string | undefined
  /**
   * the PERSONAL ('p') stream cursor — `tseq` of the last connection-addressed `msg` frame received (a resumable
   * channel; topic streams keep their cursors on the manager, shared per channel). Seeded by the server's heads
   * (claimed/resumed — authoritative), advanced monotonically by every received frame
   */
  personalCursor: number
  /**
   * the PER-STREAM `gapless` verdicts of the last `resumed` answer (wire stream key → bit) — what the dispatch reads to
   * shape a replayed frame's `replayed: { gapless }` props. Written by `handleResumedFrame`, voided by a full connect's
   * claim (a fresh entry has no replay to describe)
   */
  resumeVerdicts: Record<string, boolean> | undefined
  /** a `resume` entry for this connection is in flight on the current socket — its `resumed`/`resumeErr` settles it */
  resumePending: boolean
  facade: AnyClientChannelConnection
  manager: SocketManager
}

/**
 * One hold on a membership — a mounted `useMembership` / `<Membership>` / imperative `join()`; the last one gone →
 * leave.
 */
type MembershipHoldToken = {
  membership: InternalMembership
  released: boolean
  /** a use-hook/component hold ("stay joined while mounted") — the auto-rejoin after a space kick serves these only */
  declarative: boolean
  callSiteOptions: ExtraUseMembershipOptions | undefined
}

/**
 * One live membership: a client's join of a space's rooms, riding one channel connection. Keyed by
 * `${connectionKey}|${spaceName}|${inputKey}` so two holders of the same join share it. Its lifecycle CASCADES off its
 * connection — the connection opens (fresh cid) → it (re)sends its join; the connection is lost → it waits ('joining');
 * the connection is disposed → it closes.
 */
type InternalMembership = {
  key: string
  space: AnyPoint
  spaceName: string
  channel: AnyPoint
  /** the key of the channel connection this membership rides — resolved live off the manager so a revive is transparent */
  connectionKey: string
  /** the join input; `undefined` for a server-enrolled membership (born without a join) */
  input: InputRawUnknown | undefined
  inputSerialized: string
  status: SpaceMembershipStatus
  /** the rooms the server admitted this client into (parsed with the space transformer); `[]` = a clean deny */
  rooms: RoomUnknown[]
  roomsSerialized: string[]
  /** `${channelKey}|${spaceName}|${roomSerialized}` for each room — the msg-dispatch index keys */
  roomKeys: string[]
  error: ErrorPoint0 | null
  holds: Set<MembershipHoldToken>
  lingerTimer: ReturnType<typeof setTimeout> | undefined
  /** the cid the current join was sent for — a fresh cid means the connection re-opened and the join must replay */
  lastCid: string | undefined
  /** the in-flight join's correlation id — `joined` / `joinErr` resolve it through `pendingJoins` */
  joinId: string | undefined
  version: number
  listeners: Set<() => void>
  /** space-handler listeners live on the MEMBERSHIP (a channel handler's live on the connection) */
  handlerListeners: Map<string, Set<ClientHandlerListenerFn<any, any>>>
  mergedInto: InternalMembership | undefined
  disposed: boolean
  everJoined: boolean
  /** successful joins so far — `membershipIndex` on the facade and in the lifecycle callbacks (`> 0` = a re-enter) */
  joinIndex: number
  /**
   * the most recently released hold — a voluntary `leave()` empties `holds` before the linger dispose, but the leaver
   * still wants its `onLeave` (live holds cover every other lifecycle moment; released holders must NOT keep firing —
   * their components unmounted)
   */
  lastReleasedHold: MembershipHoldToken | undefined
  /** auto-rejoin attempts since the last successful join — paces the declarative rejoin through the reconnect policy */
  rejoinAttempt: number
  rejoinTimer: ReturnType<typeof setTimeout> | undefined
  /** the last join was denied with `preventRetry` — no replay on reconnects until `reconnectAll()`/remount */
  preventRejoin: boolean
  /**
   * a server-side enrollment (`.enroller`) — no holds, no join frames: it is born from the `claimed` frame and its
   * rooms are whatever the last claim announced. It lives with the connection OR until an explicit `leave()` drops it
   * (the next connection setup re-runs the enroller and installs it again)
   */
  enrolled: boolean
  facade: AnyClientSpaceMembership
  manager: SocketManager
}

type SocketManager = {
  scope: PointsScope
  serverUrl: string | undefined
  ws: WebSocket | null
  wsStatus: 'idle' | 'connecting' | 'open' | 'closed'
  /**
   * successful transport opens so far — `socketIndex` in `socketClientConnect` (`> 0` = a reopen); a full idle teardown
   * resets it, so the next socket is honestly the first again
   */
  socketIndex: number
  wsVersion: number
  wsListeners: Set<() => void>
  connections: Map<string, InternalConnection>
  connectionsByCid: Map<string, InternalConnection>
  pendingSends: Map<string, PendingSend>
  /** closed-but-still-held connections (kick / disconnectAll) — dormant until a remount or `reconnectAll()` */
  closedHeld: Set<InternalConnection>
  /**
   * the TOPIC stream cursors, shared per channel across its connections (the manager is per scope, so the channel NAME
   * namespaces): `${channelName}|${streamKey}` → the `tseq` of the last frame received on that stream. Shared on
   * purpose — a topic frame reaches the socket once however many of the channel's connections subscribe, and the
   * per-connection difference (when each one entered) lives server-side in the subscription epochs. Seeded EXACTLY by
   * the server's heads (claimed/joined/enrolled/resumed — authoritative, a rebuilt stream may restart the numbering),
   * advanced monotonically by received frames
   */
  topicCursors: Map<string, number>
  /** live memberships keyed by `${connectionKey}|${spaceName}|${inputKey}` (hold dedup, like connections) */
  memberships: Map<string, InternalMembership>
  /** msg-dispatch index: `${channelKey}|${spaceName}|${roomSerialized}` → the memberships holding that room */
  membershipsByRoomKey: Map<string, Set<InternalMembership>>
  /** in-flight joins by correlation id — `joined` / `joinErr` resolve them */
  pendingJoins: Map<string, InternalMembership>
  /**
   * the cold-start upgrade-connect in flight: the socket was opened against this connection's channel endpoint and the
   * first `claimed` frame binds it — a handshake failure resolves `'failed'` and the connect falls back to the ticket
   * path (a plain fetch, which can actually READ the typed error a browser hides on a failed handshake)
   */
  pendingUpgradeConnect: { internal: InternalConnection; resolve: (outcome: 'claimed' | 'failed') => void } | undefined
  socketHolds: number
  reconnectAttempt: number
  reconnectTimer: ReturnType<typeof setTimeout> | undefined
  pingTimer: ReturnType<typeof setInterval> | undefined
  /**
   * when the last frame of ANY kind arrived on the live socket (stamped at open, then on every inbound frame) — the
   * client half of the liveness contract: the ping timer measures the socket's freshness against it
   */
  lastInboundAt: number
  /** pings written since that frame — two of them answered by nothing at all is a half-open socket */
  pingsSinceInbound: number
  closeTimer: ReturnType<typeof setTimeout> | undefined
  /** bumped whenever the connections map changes (connect/dispose/merge/revive) — input-bound hooks re-resolve on it */
  connectionsVersion: number
  connectionsListeners: Set<() => void>
  /** bumped whenever the memberships map changes — input-bound membership hooks re-resolve on it */
  membershipsVersion: number
  membershipsListeners: Set<() => void>
  /** re-entrancy guard for the membership cascade (`pollMemberships` runs off notify, which it also triggers) */
  pollingMemberships: boolean
}

// Every client-runtime store below is a `clientOnly` superstore item — the client side literally owns them: the
// browser (and a POINT0_SIDE=client process) reads one global client state, a FakeClient gets its OWN isolated
// state (two fake clients never share a manager), and the SERVER has no state at all. Access is always through the
// item, chosen per call site: strict `<name>SsItem.get()` on client-only paths (a server call is a LOUD clientOnly
// error — misuse, not degradation), `<name>SsItem.getOrUndefined()` on the few render paths that run on both sides —
// `undefined` on the server, with the degradation written explicitly at the call site.
const socketManagersSsItem = superstore.define<Map<PointsScope, SocketManager>>(
  '__POINT0_SOCKET_MANAGERS__',
  () => new Map(),
  'clientOnly',
)

/** Client handler points register themselves at close time so incoming frames can be dispatched to them. */
const clientHandlerPointsSsItem = superstore.define<Map<string, AnyPoint>>(
  '__POINT0_SOCKET_CLIENT_HANDLERS__',
  () => new Map(),
  'clientOnly',
)

/**
 * clientHandler points register themselves at close time (module load) — the frame dispatch resolves handlers by name
 * through this map.
 */
export const registerClientHandlerPoint = (point: AnyPoint): void => {
  // dispatch is a client concern — on the server (module load of an isomorphic points file) there is nothing to feed
  if (_point0_env.side.is.server) {
    return
  }
  clientHandlerPointsSsItem.get().set(point.id, point)
}

/**
 * Space points register themselves at close time — the `claimed` frame names enrolled spaces by NAME, and the client
 * needs the point (its transformer parses the rooms) to hold the enrollment. Spaces preload alongside their channel's
 * handlers (the manifest tags both with the channel), so a registered space is guaranteed by claim time.
 */
const spacePointsSsItem = superstore.define<Map<string, AnyPoint>>(
  '__POINT0_SOCKET_SPACE_POINTS__',
  () => new Map(),
  'clientOnly',
)

/**
 * Space points register themselves at close time (module load) — enrollment reconciliation resolves spaces by the name
 * the `claimed` frame carries.
 */
export const registerSpacePoint = (point: AnyPoint): void => {
  // enrollment resolution is a client concern — the server-side module load has no client state to write into
  if (_point0_env.side.is.server) {
    return
  }
  spacePointsSsItem.get().set(point.id, point)
}

/**
 * The key-slot an ENROLLED membership occupies where a client join would put its serialized input. Joins serialize to
 * JSON, and this is not valid JSON — the two can never collide.
 */
const ENROLLED_MEMBERSHIP_KEY_INPUT = '*enrolled*'

const holdsByFacadeSsItem = superstore.define<WeakMap<object, HoldToken>>(
  '__POINT0_SOCKET_HOLDS__',
  () => new WeakMap(),
  'clientOnly',
)

/** One preload per channel per client — the promise is kept so racing connects share it. */
const channelHandlersLoadsSsItem = superstore.define<Map<string, Promise<void>>>(
  '__POINT0_SOCKET_HANDLER_LOADS__',
  () => new Map(),
  'clientOnly',
)

/**
 * Import (and thereby register) every manifest handler of the channel BEFORE connecting — a push arriving right after
 * the claim must find its handler even when the handler's module is imported by nothing (the generated client points
 * manifest carries every handler as a lazy record tagged with its channel; see the engine's FilesGenerator).
 */
const ensureChannelHandlersLoaded = (channel: AnyPoint): Promise<void> => {
  const key = getChannelKey(channel)
  const existing = channelHandlersLoadsSsItem.get().get(key)
  if (existing) {
    return existing
  }
  const clientPoints = _ss.__POINT0_CLIENT_POINTS__.getOrUndefined()
  const manager = clientPoints?.manager as
    | { loadChannelHandlerPoints?: (channelName: string) => Promise<void> }
    | undefined
  const promise = manager?.loadChannelHandlerPoints
    ? manager.loadChannelHandlerPoints(channel.name).catch((error: unknown) => {
        // a transient chunk-load failure must not be cached forever — the next connect retries the preload
        channelHandlersLoadsSsItem.get().delete(key)
        getLogFnForPoint(channel)({
          level: 'warn',
          category: ['point0', 'socket'],
          message: `Failed to preload the handlers of channel ${channel.id} before connecting`,
          error,
        })
      })
    : Promise.resolve()
  channelHandlersLoadsSsItem.get().set(key, promise)
  return promise
}

/**
 * Canonical facades (`internal.facade` — what listeners and bound targets see) mapped back to their internal. A cid
 * lookup can't do this before the claim lands, and a send bound to a still-connecting connection must QUEUE, not
 * throw.
 */
const internalsByCanonicalFacadeSsItem = superstore.define<WeakMap<object, InternalConnection>>(
  '__POINT0_SOCKET_CANONICAL_FACADES__',
  () => new WeakMap(),
  'clientOnly',
)

/**
 * Membership facades handed to holders (`join()`/`useMembership`) → their hold, and canonical membership facades →
 * their internal.
 */
const membershipHoldsByFacadeSsItem = superstore.define<WeakMap<object, MembershipHoldToken>>(
  '__POINT0_SOCKET_MEMBERSHIP_HOLDS__',
  () => new WeakMap(),
  'clientOnly',
)
const internalsByCanonicalMembershipFacadeSsItem = superstore.define<WeakMap<object, InternalMembership>>(
  '__POINT0_SOCKET_CANONICAL_MEMBERSHIP_FACADES__',
  () => new WeakMap(),
  'clientOnly',
)

const resolveInternal = (internal: InternalConnection): InternalConnection => {
  let current = internal
  while (current.mergedInto) {
    current = current.mergedInto
  }
  return current
}

const resolveMembership = (membership: InternalMembership): InternalMembership => {
  let current = membership
  while (current.mergedInto) {
    current = current.mergedInto
  }
  return current
}

const notifyConnection = (internal: InternalConnection): void => {
  internal.version++
  for (const listener of [...internal.listeners]) {
    listener()
  }
  // a connection's state moved (open/claim/lost/error) — the memberships riding it may need to (re)join or wait
  pollMemberships(internal.manager)
}

const notifyManager = (manager: SocketManager): void => {
  manager.wsVersion++
  for (const listener of [...manager.wsListeners]) {
    listener()
  }
}

const getChannelKey = (channel: AnyPoint): string => `${channel.scope}:${channel.name}`

const getResolvedChannelOptions = (
  internal: InternalConnection,
): ExtraUseConnectionOptions<any, any> & {
  linger: number
  ping: number
  upgradable: boolean
} => {
  const channel = internal.channel
  const firstHold = [...internal.holds].at(0)
  const merged = mergeChannelOptions(
    {
      reconnect: true,
      upgradable: false,
      linger: 1000,
      ping: 30_000,
    },
    channel._defaultChannelOptions,
    channel._channelOptions,
    firstHold?.callSiteOptions,
  )
  return merged as never
}

const fireConnectionLifecycle = (
  internal: InternalConnection,
  name: 'onConnect' | 'onDisconnect' | 'onError',
  // the entry markers: an `onConnect` off a landed RESUME passes them explicitly ({ resumed: true, gapless: the
  // server's verdict }); everywhere else the default is the full-path truth table — resumed false, gapless only on
  // the very first entry (nothing to miss yet)
  markers?: { resumed: boolean; gapless: boolean },
): void => {
  const channel = internal.channel
  const pointLevel = mergeChannelOptions(channel._defaultChannelOptions, channel._channelOptions)
  const input = {
    connection: internal.facade,
    point: channel,
    connectionIndex: internal.connectIndex,
    resumed: markers?.resumed ?? false,
    gapless: markers?.gapless ?? internal.connectIndex === 0,
    ...(name === 'onError' ? { error: internal.error } : {}),
  }
  const callbacks = [pointLevel[name], ...[...internal.holds].map((hold) => hold.callSiteOptions?.[name])]
  for (const callback of callbacks) {
    if (!callback) {
      continue
    }
    void (async () => {
      try {
        await callback(input as never)
      } catch (error) {
        getLogFnForPoint(channel)({
          level: 'error',
          category: ['point0', 'socket'],
          message: `A channel ${name} callback threw (point ${channel.id})`,
          error,
        })
      }
    })()
  }
}

const getManager = (scope: PointsScope, fromPoint: AnyPoint | undefined): SocketManager => {
  const existing = socketManagersSsItem.get().get(scope)
  if (existing) {
    if (!existing.serverUrl && fromPoint) {
      existing.serverUrl = fromPoint._getServerUrl()
    }
    return existing
  }
  const manager: SocketManager = {
    scope,
    serverUrl: fromPoint ? fromPoint._getServerUrl() : undefined,
    ws: null,
    wsStatus: 'idle',
    socketIndex: 0,
    wsVersion: 0,
    wsListeners: new Set(),
    connections: new Map(),
    connectionsByCid: new Map(),
    pendingSends: new Map(),
    closedHeld: new Set(),
    topicCursors: new Map(),
    memberships: new Map(),
    membershipsByRoomKey: new Map(),
    pendingJoins: new Map(),
    socketHolds: 0,
    reconnectAttempt: 0,
    reconnectTimer: undefined,
    pingTimer: undefined,
    lastInboundAt: Date.now(),
    pingsSinceInbound: 0,
    closeTimer: undefined,
    connectionsVersion: 0,
    connectionsListeners: new Set(),
    membershipsVersion: 0,
    membershipsListeners: new Set(),
    pollingMemberships: false,
    pendingUpgradeConnect: undefined,
  }
  socketManagersSsItem.get().set(scope, manager)
  return manager
}

const getManagerForClientScope = (): SocketManager | undefined => {
  const clientPoints = _ss.__POINT0_CLIENT_POINTS__.getOrUndefined()
  const scope = clientPoints?.manager.scope
  if (!scope) {
    return undefined
  }
  return getManager(scope, clientPoints.manager.root)
}

const getSocketWsUrl = (manager: SocketManager): string => {
  const path = `/${POINT0_INTERNAL_PATH_PREFIX}/${toKebabCase(manager.scope)}/${POINT0_WEBSOCKET_ENDPOINT_SEGMENT}`
  const base = manager.serverUrl || (typeof location !== 'undefined' ? location.origin : undefined)
  if (!base) {
    throw new Error(`Cannot resolve the socket socket url for scope "${manager.scope}" — server url is not set`)
  }
  const url = new URL(path, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

const sendFrame = (manager: SocketManager, frame: SocketClientFrame): boolean => {
  if (manager.ws && manager.ws.readyState === 1) {
    manager.ws.send(JSON.stringify(frame))
    return true
  }
  return false
}

const heldInternals = (manager: SocketManager): InternalConnection[] => {
  return [...new Set(manager.connections.values())].filter((internal) => !internal.disposed)
}

const maybeCloseSocket = (manager: SocketManager): void => {
  if (manager.socketHolds > 0 || heldInternals(manager).length > 0) {
    return
  }
  if (manager.closeTimer) {
    return
  }
  // shortly after the last connection is gone — a route transition may bring the next one right away
  manager.closeTimer = setTimeout(() => {
    manager.closeTimer = undefined
    if (manager.socketHolds > 0 || heldInternals(manager).length > 0) {
      return
    }
    if (manager.reconnectTimer) {
      clearTimeout(manager.reconnectTimer)
      manager.reconnectTimer = undefined
    }
    if (manager.pingTimer) {
      clearInterval(manager.pingTimer)
      manager.pingTimer = undefined
    }
    const ws = manager.ws
    manager.ws = null
    manager.wsStatus = 'idle'
    manager.socketIndex = 0
    manager.reconnectAttempt = 0
    notifyManager(manager)
    ws?.close()
  }, 250)
}

const ensureSocket = (manager: SocketManager, upgradeUrl?: string): void => {
  if (_point0_env.side.is.server) {
    return
  }
  if (manager.ws && (manager.ws.readyState === 0 || manager.ws.readyState === 1)) {
    return
  }
  // an upgrade-connect opens the socket AGAINST THE CHANNEL ENDPOINT itself — the handshake runs the connect
  // pipeline and the first frame back is `claimed`; everything else about the socket is the same
  const url = upgradeUrl ?? getSocketWsUrl(manager)
  const ws = new WebSocket(url)
  manager.ws = ws
  manager.wsStatus = 'connecting'
  notifyManager(manager)
  // The ONE close path of this socket: its own `onclose`, and the liveness deadline below, which calls it directly —
  // a half-open socket never answers the closing handshake either, so waiting for the close EVENT would mean waiting
  // for TCP to give up, exactly what the deadline exists to avoid. Runs once: whichever comes second finds the flag
  // (or a manager that already moved on to the next socket) and stops.
  let closeHandled = false
  const handleSocketClosed = (): void => {
    if (manager.ws !== ws || closeHandled) {
      return
    }
    closeHandled = true
    manager.wsStatus = 'closed'
    if (manager.pingTimer) {
      clearInterval(manager.pingTimer)
      manager.pingTimer = undefined
    }
    notifyManager(manager)
    // an upgrade-connect handshake died before its `claimed` — hand the connect back to the ticket path
    const pendingUpgrade = manager.pendingUpgradeConnect
    if (pendingUpgrade) {
      manager.pendingUpgradeConnect = undefined
      pendingUpgrade.resolve('failed')
    }
    const internals = heldInternals(manager)
    for (const internal of internals) {
      // a resume left unanswered by a dying socket is simply re-offered on the next one — the key stays valid
      internal.resumePending = false
      if (internal.status === 'open') {
        internal.status = 'connecting'
        internal.claimed = false
        // a RESUMABLE connection keeps its cid across the drop — cid + key + the stream cursors ARE the resume
        // credential the next socket's first frame offers (and `connectionsByCid` keeps resolving the answer frames)
        if (internal.resumeKey === undefined) {
          internal.cid = undefined
        }
        internal.ticket = undefined
        notifyConnection(internal)
        fireConnectionLifecycle(internal, 'onDisconnect')
      }
    }
    if (internals.length > 0) {
      // one socket — one event; emit through the first held channel so chain subscriptions see it
      internals[0].channel._emit('socketClientDisconnect', { scope: manager.scope }, { scope: manager.scope })
    }
    // fail non-queueing sends right away; queueing ones wait for the reconnect inside their own timeout
    for (const pending of [...manager.pendingSends.values()]) {
      if (!pending.queue || !shouldReconnect(manager)) {
        failPendingSend(manager, pending, connectionLostError(pending.handler))
      }
    }
    scheduleReconnect(manager)
  }
  ws.onopen = () => {
    if (manager.ws !== ws) {
      return
    }
    // the open lands: `socketClientConnect` fires on EVERY successful open — the data's `socketIndex` (read before
    // the increment, like the lifecycle counters) tells the first (0) from a reopen (> 0)
    const socketIndex = manager.socketIndex
    const isReconnect = socketIndex > 0
    manager.wsStatus = 'open'
    manager.socketIndex++
    manager.reconnectAttempt = 0
    // a socket that just completed its handshake is fresh by definition — the liveness clock starts here and every
    // inbound frame slides it forward from then on
    manager.lastInboundAt = Date.now()
    manager.pingsSinceInbound = 0
    notifyManager(manager)
    const internals = heldInternals(manager)
    const anyChannel = internals.at(0)?.channel
    // one socket — one event; emit through the first held channel so chain subscriptions see it (a socket held open
    // by <Socket> alone has no channel to emit through — nothing to claim yet either)
    anyChannel?._emit(
      'socketClientConnect',
      { scope: manager.scope, socketIndex },
      { scope: manager.scope, socketIndex },
    )
    if (isReconnect) {
      // RESUMABLE connections go first, all in ONE frame — the very first frame of the fresh socket: cid + key + the
      // stream cursor map per connection, no connect request, no connector. The per-cid answers settle them
      // (`resumed` revives in place, `resumeErr` falls back to the full connect below); everything else re-connects
      // as always
      const resumables = internals.filter(
        (internal) =>
          internal.resumeKey !== undefined &&
          internal.cid !== undefined &&
          !internal.preventRevive &&
          resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect).enabled,
      )
      if (resumables.length > 0) {
        sendFrame(manager, {
          t: 'resume',
          entries: resumables.map((internal) => ({
            cid: internal.cid!,
            key: internal.resumeKey!,
            cursors: buildResumeCursors(manager, internal),
          })),
        })
        for (const internal of resumables) {
          internal.resumePending = true
          // a server that does not speak resume ignores the frame silently (a rolling deploy) — an unanswered entry
          // must fall back to the full connect instead of hanging on a promise nobody made. Per connection, at the
          // channel's own `resumeTimeout`; a timer that outlives its socket (or its answer) finds nothing to do
          setTimeout(
            () => {
              if (manager.ws !== ws) {
                return
              }
              if (internal.resumePending && !internal.disposed) {
                internal.resumePending = false
                void connectInternal(internal, { isReconnect: true })
              }
            },
            getResolvedChannelOptions(internal).resumeTimeout ?? 5000,
          )
        }
      }
      // every other held connection re-sends its connect request — the loader runs again, the check is re-applied
      for (const internal of internals) {
        if (internal.resumePending) {
          continue
        }
        const options = getResolvedChannelOptions(internal)
        if (!resolveReconnectPolicy(options.reconnect).enabled) {
          disposeInternal(internal, { silent: false })
          continue
        }
        if (internal.preventRevive) {
          // the last connect answered `preventRetry` — this connection sits out until reconnectAll()/remount
          continue
        }
        void connectInternal(internal, { isReconnect: true })
      }
    } else {
      for (const internal of internals) {
        claimInternal(internal)
      }
    }
    const pingMs = internals.length > 0 ? getResolvedChannelOptions(internals[0]).ping : 30_000
    if (manager.pingTimer) {
      clearInterval(manager.pingTimer)
    }
    if (pingMs !== 0) {
      manager.pingTimer = setInterval(() => {
        if (manager.ws !== ws) {
          return
        }
        // The CLIENT half of the liveness contract (the server's half is the engine's WS `idleTimeout`). A half-open
        // socket — a NAT or router that dropped the flow, a machine that slept — is invisible from up here: sends
        // keep "succeeding" into it and nothing ever comes back, so every push is lost while the client still calls
        // itself connected. Two pings answered by NOTHING AT ALL (no pong, no push, no reply) plus more than two
        // intervals of silence is that socket: close it locally and let the standard close path reconnect, which is
        // what puts the catch-up recipes back in play. Counting the unanswered pings is what keeps a THROTTLED tab
        // honest — a background tab stretches this interval, but a live socket answers every ping it does send, so
        // the count never reaches two there.
        if (manager.pingsSinceInbound >= 2 && Date.now() - manager.lastInboundAt > pingMs * 2) {
          ws.close()
          handleSocketClosed()
          return
        }
        if (sendFrame(manager, { t: 'ping' })) {
          manager.pingsSinceInbound++
        }
      }, pingMs)
    }
  }
  ws.onmessage = (event: MessageEvent) => {
    if (manager.ws !== ws) {
      return
    }
    // ANY frame proves the peer is alive, so the liveness deadline above measures from HERE — the single inbound
    // funnel — and not from the pongs alone: a busy socket carrying nothing but pushes is not a silent one. Stamped
    // before the parse, because a frame we cannot read still came off a live connection.
    manager.lastInboundAt = Date.now()
    manager.pingsSinceInbound = 0
    let frame: SocketServerFrame
    try {
      frame = JSON.parse(String(event.data)) as SocketServerFrame
    } catch {
      return
    }
    // one unparseable or throwing frame must not become an unhandled rejection that takes nothing down but hides
    // everything — log it and keep consuming the socket
    handleServerFrame(manager, frame).catch((error: unknown) => {
      getLogFnForPoint(heldInternals(manager)[0]?.channel)({
        level: 'error',
        category: ['point0', 'socket'],
        message: 'Socket frame handling failed',
        error,
      })
    })
  }
  ws.onclose = () => {
    handleSocketClosed()
  }
  ws.onerror = () => {
    // the close handler does the bookkeeping
  }
}

const shouldReconnect = (manager: SocketManager): boolean => {
  if (manager.socketHolds > 0) {
    return true
  }
  return heldInternals(manager).some(
    (internal) => resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect).enabled,
  )
}

const scheduleReconnect = (manager: SocketManager): void => {
  if (manager.reconnectTimer) {
    return
  }
  if (!shouldReconnect(manager)) {
    maybeCloseSocket(manager)
    return
  }
  const internals = heldInternals(manager)
  // the first held connection with reconnect on drives the shared socket's policy
  const policy =
    internals
      .map((internal) => resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect))
      .find((candidate) => candidate.enabled) ?? resolveReconnectPolicy(undefined)
  if (!reconnectAttemptAllowed(policy, manager.reconnectAttempt)) {
    for (const internal of internals) {
      if (internal.status !== 'error') {
        internal.status = 'closed'
        notifyConnection(internal)
      }
    }
    return
  }
  const waitMs = reconnectDelayMs(policy, manager.reconnectAttempt)
  manager.reconnectAttempt++
  manager.reconnectTimer = setTimeout(() => {
    manager.reconnectTimer = undefined
    if (!shouldReconnect(manager)) {
      maybeCloseSocket(manager)
      return
    }
    ensureSocket(manager)
  }, waitMs)
}

/**
 * Fire a membership lifecycle callback (`onEnter` / `onLeave`) — the space point-level options (`.space({...})` /
 * `.spaceOptions()`) and every hold's call-site options, in order. A callback's own throw only logs, mirroring the
 * channel lifecycle.
 */
const fireMembershipLifecycle = (
  membership: InternalMembership,
  name: 'onEnter' | 'onLeave',
  // same contract as fireConnectionLifecycle's markers: a resume passes them, the full path defaults — resumed
  // false, gapless only on the first enter
  markers?: { resumed: boolean; gapless: boolean },
): void => {
  const space = membership.space
  const pointLevel = mergeSpaceOptions(space._defaultSpaceOptions, space._spaceOptions)
  const input = {
    membership: membership.facade,
    point: space,
    membershipIndex: membership.joinIndex,
    resumed: markers?.resumed ?? false,
    gapless: markers?.gapless ?? membership.joinIndex === 0,
  }
  // live holds only — a released holder's component unmounted, its closures are stale. The one exception: `onLeave`
  // also reaches the LAST released hold, so a voluntary `leave()` (which empties `holds` before the dispose) still
  // notifies the leaver.
  const callbacks = [
    pointLevel[name],
    ...[...membership.holds].map((hold) => hold.callSiteOptions?.[name]),
    ...(name === 'onLeave' ? [membership.lastReleasedHold?.callSiteOptions?.onLeave] : []),
  ]
  for (const callback of callbacks) {
    if (!callback) {
      continue
    }
    void (async () => {
      try {
        // the callback's props are typed by the SPACE's generics, erased to `AnyPoint` here — the call goes through
        // the untyped shape (the channel twin above does the same with `as never`)
        await (callback as (input: unknown) => void | Promise<void>)(input)
      } catch (error) {
        getLogFnForPoint(space)({
          level: 'error',
          category: ['point0', 'socket'],
          message: `A space ${name} callback threw (point ${space.id})`,
          error,
        })
      }
    })()
  }
}

const connectionLostError = (point: AnyPoint): ErrorPoint0 => {
  return new point._Error('Socket connection is not available', {
    code: POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_LOST,
  })
}

/**
 * A space with no `.joiner` takes no client joins — the server enrolls into it (`.enroller`, `space.enroll()`). The
 * client knows this without asking: `.joiner()` records the FACT on the point, and the compiler only blanks its
 * callback, so `_joinerDeclared` survives into the client bundle. The refusal happens here, before a frame is built —
 * the server answers the same `POINT0_SOCKET_JOIN_NOT_ALLOWED` to anyone who frames one by hand.
 */
const joinNotAllowedError = (space: AnyPoint): ErrorPoint0 => {
  return new space._Error(`Space ${space.id} takes no client joins — it declares no .joiner`, {
    code: POINT0_ERROR_CODES_MAP.SOCKET_JOIN_NOT_ALLOWED,
  })
}

const claimInternal = (internal: InternalConnection): void => {
  const manager = internal.manager
  if (internal.disposed || internal.claimed || !internal.ticket) {
    return
  }
  sendFrame(manager, { t: 'claim', ticket: internal.ticket })
}

const connectInternal = (internal: InternalConnection, options: { isReconnect: boolean }): Promise<void> => {
  // two rapid refresh frames, reconnectAll under StrictMode, a socket reconnect racing a refresh — all coalesce into
  // the one POST already in flight instead of creating ghost server-side connections
  if (internal.connectInFlight) {
    return internal.connectInFlight
  }
  const inFlight = connectInternalRun(internal, options).finally(() => {
    if (internal.connectInFlight === inFlight) {
      internal.connectInFlight = undefined
    }
  })
  internal.connectInFlight = inFlight
  return inFlight
}

/**
 * The cold-start fast path: no socket exists yet, so the connect request ITSELF becomes the WebSocket — a GET+Upgrade
 * on the channel endpoint runs the full connect pipeline server-side and upgrades in the same round trip (no ticket, no
 * claim). OPT-IN: the caller gates it on the resolved `upgradable` option (default off — the ticket path is the one
 * connect shape). Attempted only when the socket is down, nothing else is upgrading, and the input fits in the URL.
 * Resolves `'claimed'` when the server's first `claimed` frame binds the connection, `'failed'` when the handshake dies
 * first — the caller then falls back to the ticket path, whose plain fetch surfaces the typed error a browser hides on
 * a failed handshake. Reconnects never come here: they restore many connections and use the ticket path.
 */
const tryUpgradeConnect = (internal: InternalConnection): Promise<'claimed' | 'failed'> | undefined => {
  const manager = internal.manager
  if (_point0_env.side.is.server || manager.pendingUpgradeConnect) {
    return undefined
  }
  if (manager.ws && (manager.ws.readyState === 0 || manager.ws.readyState === 1)) {
    return undefined
  }
  const url = internal.channel._getChannelConnectUpgradeUrl(internal.input)
  if (url === undefined) {
    return undefined
  }
  return new Promise((resolve) => {
    // a middlebox (or a dev proxy) may swallow the handshake without ever failing it — a silent upgrade must not
    // strand the connect, so a claim that hasn't landed in time closes the socket and hands over to the ticket path
    const timer = setTimeout(
      () => {
        if (manager.pendingUpgradeConnect?.internal !== internal) {
          return
        }
        manager.ws?.close()
      },
      getResolvedChannelOptions(internal).upgradeTimeout ?? 5000,
    )
    manager.pendingUpgradeConnect = {
      internal,
      resolve: (outcome) => {
        clearTimeout(timer)
        resolve(outcome)
      },
    }
    ensureSocket(manager, url)
  })
}

const connectInternalRun = async (
  internal: InternalConnection,
  { isReconnect }: { isReconnect: boolean },
): Promise<void> => {
  const manager = internal.manager
  const channel = internal.channel
  internal.status = 'connecting'
  internal.error = null
  notifyConnection(internal)
  // every module-level listener must exist before the claim — no push may find its handler missing (a dispose during
  // the preload falls through to the post-fetch discard path below, like any dispose-in-flight)
  await ensureChannelHandlersLoaded(internal.channel)
  const eventMeta = { point: internal.channel.id }
  // `connectionIndex` mirrors the lifecycle callbacks: successful claims BEFORE this operation (0 = the first
  // connect, > 0 = a re-connect) — the ++ lands only when the claim does
  channel._emit(
    'pointChannelConnectClientStart',
    { input: internal.input, point: internal.channel, connectionIndex: internal.connectIndex },
    eventMeta,
  )
  // the upgrade fast path is OPT-IN (`upgradable`, default off): the ticket path is a plain fetch — custom headers
  // apply, the connector's typed error is readable — and taking it always keeps the connect one shape for the server
  if (!isReconnect && getResolvedChannelOptions(internal).upgradable) {
    const upgrade = tryUpgradeConnect(internal)
    if (upgrade) {
      const outcome = await upgrade
      if (outcome === 'claimed' || internal.disposed) {
        // the `claimed` handler did the whole bookkeeping (and emitted Settled/Success — the claim IS the answer here)
        return
      }
      // 'failed' — fall through to the ticket path: the fetch below re-runs the pipeline and surfaces the typed error
    }
  }
  const { data, error } = await channel._fetchChannelConnect(internal.input)
  if (internal.disposed) {
    if (data && manager.wsStatus === 'open') {
      sendFrame(manager, { t: 'discard', ticket: data.ticket })
    }
    return
  }
  if (error || !data) {
    const connectError = error ?? connectionLostError(internal.channel)
    internal.status = 'error'
    internal.error = connectError
    // the connector said "and don't come back" — no auto-revive and no re-POST until reconnectAll()/remount
    if (connectError.preventRetry) {
      internal.preventRevive = true
    }
    notifyConnection(internal)
    // a failure WITHOUT a server answer (no HTTP status) is transport, not a deny — declarative holds retry it
    // through the reconnect policy; an answered deny stays terminal
    if (connectError.status === undefined && !connectError.preventRetry) {
      scheduleDeclarativeConnectRetry(internal)
    }
    // no retry scheduled → nothing will ever flush this connection's queue: fail its unsent sends NOW with the
    // TYPED connect error instead of letting them dangle into a generic timeout (with a retry pending they stay
    // queued — the retry may land within their window)
    if (!internal.reviveTimer) {
      for (const pending of [...manager.pendingSends.values()]) {
        if (!pending.sent && resolveInternal(pending.internal) === internal) {
          failPendingSend(manager, pending, connectError)
        }
      }
    }
    channel._emit(
      'pointChannelConnectClientSettled',
      {
        input: internal.input,
        point: internal.channel,
        connectionId: undefined,
        connectionIndex: internal.connectIndex,
        error: connectError,
      },
      eventMeta,
    )
    channel._emit(
      'pointChannelConnectClientError',
      {
        input: internal.input,
        point: internal.channel,
        connectionId: undefined,
        connectionIndex: internal.connectIndex,
        error: connectError,
      },
      eventMeta,
    )
    fireConnectionLifecycle(internal, 'onError')
    return
  }
  const previousCid = internal.cid
  if (previousCid && previousCid !== data.id && manager.connectionsByCid.get(previousCid) === internal) {
    manager.connectionsByCid.delete(previousCid)
  }
  internal.cid = data.id
  internal.ticket = data.ticket
  internal.claimed = false
  // the old resume credential named the PREVIOUS cid — void it until this connect's claim mints the fresh one (a
  // socket drop in the window would otherwise offer a mismatched pair and eat a pointless refusal)
  internal.resumeKey = undefined
  internal.personalCursor = 0
  internal.resumePending = false
  // the full-path truth table, same as the lifecycle defaults: not a resume, gapless only on the very first entry
  channel._emit(
    'pointChannelConnectClientSettled',
    {
      input: internal.input,
      point: internal.channel,
      connectionId: data.id,
      connectionIndex: internal.connectIndex,
      resumed: false,
      gapless: internal.connectIndex === 0,
      error: undefined,
    },
    eventMeta,
  )
  channel._emit(
    'pointChannelConnectClientSuccess',
    {
      input: internal.input,
      point: internal.channel,
      connectionId: data.id,
      connectionIndex: internal.connectIndex,
      resumed: false,
      gapless: internal.connectIndex === 0,
      error: undefined,
    },
    eventMeta,
  )

  manager.connectionsByCid.set(data.id, internal)
  ensureSocket(manager)
  if (manager.wsStatus === 'open') {
    claimInternal(internal)
  }
  // no lifecycle here: `onConnect` fires when the claim LANDS — the connect POST only earned the ticket
}

const refreshInternal = (internal: InternalConnection): void => {
  if (internal.disposed) {
    return
  }
  // remember the previous server-side connection: it stays subscribed until the new claim lands, then we close it
  // (the socket never dropped, so nothing swept it)
  if (internal.cid) {
    internal.refreshOldCids.add(internal.cid)
  }
  void connectInternal(internal, { isReconnect: true })
}

/** Revive a closed-but-held connection (kick / disconnectAll): a fresh internal takes over the holds and listeners. */
const reviveInternal = (old: InternalConnection): void => {
  const manager = old.manager
  if (!manager.closedHeld.has(old)) {
    return
  }
  manager.closedHeld.delete(old)
  if (old.reviveTimer) {
    clearTimeout(old.reviveTimer)
    old.reviveTimer = undefined
  }
  // a hook may have remounted while this one sat closed — a live internal already owns the key; hand it the holds
  // and listeners instead of connecting a duplicate
  const existing = manager.connections.get(old.key)
  const existingLive = existing ? resolveInternal(existing) : undefined
  if (existingLive && existingLive !== old && !existingLive.disposed) {
    for (const hold of old.holds) {
      hold.internal = existingLive
      existingLive.holds.add(hold)
    }
    old.holds.clear()
    for (const [handlerId, listeners] of old.handlerListeners) {
      const keptListeners = existingLive.handlerListeners.get(handlerId) ?? new Set()
      for (const listener of listeners) {
        keptListeners.add(listener)
      }
      existingLive.handlerListeners.set(handlerId, keptListeners)
    }
    old.handlerListeners.clear()
    for (const listener of old.listeners) {
      existingLive.listeners.add(listener)
    }
    old.listeners.clear()
    old.mergedInto = existingLive
    notifyConnection(existingLive)
    return
  }
  const fresh: InternalConnection = {
    key: old.key,
    channel: old.channel,
    channelKey: old.channelKey,
    input: old.input,
    status: 'connecting',
    error: null,
    cid: undefined,
    ticket: undefined,
    claimed: false,
    holds: new Set(),
    lingerTimer: undefined,
    refreshOldCids: new Set(),
    connectInFlight: undefined,
    version: old.version + 1,
    listeners: new Set(),
    handlerListeners: new Map(),
    mergedInto: undefined,
    disposed: false,
    // the facade survives the revive: everOpened and the connect counter carry over, so the revived claim fires
    // `onConnect` with a `connectionIndex > 0` — the props tell it from a first connect
    everOpened: old.everOpened,
    connectIndex: old.connectIndex,
    // pace repeated revives (a kick loop) through the reconnect policy; a successful claim resets it
    reviveAttempt: old.reviveAttempt + 1,
    reviveTimer: undefined,
    preventRevive: false,
    // a revive is a FULL re-entry by design (the dispose voided the old credential) — the fresh claim mints a new key
    resumeKey: undefined,
    personalCursor: 0,
    resumeVerdicts: undefined,
    resumePending: false,
    facade: old.facade,
    manager,
  }
  for (const hold of old.holds) {
    hold.internal = fresh
    fresh.holds.add(hold)
  }
  old.holds.clear()
  for (const [handlerId, listeners] of old.handlerListeners) {
    fresh.handlerListeners.set(handlerId, new Set(listeners))
  }
  old.handlerListeners.clear()
  for (const listener of old.listeners) {
    fresh.listeners.add(listener)
  }
  old.listeners.clear()
  old.mergedInto = fresh
  manager.connections.set(fresh.key, fresh)
  notifyConnectionsChange(manager)
  void connectInternal(fresh, { isReconnect: true })
  notifyConnection(fresh)
}

/**
 * Re-run the connect request of every live connection and revive the closed-but-held ones — the client-side "my
 * identity changed" signal (after a login). The connectors re-run, each connection's identity is rebuilt.
 */
export const reconnectAll = (): void => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('reconnectAll')
  }
  // no sockets on the server — a shared auth flow may call this from SSR-reachable code, and "nothing to revive"
  // is the truthful degradation (the client store must not even be consulted here)
  if (_point0_env.side.is.server) {
    return
  }
  const manager = getManagerForClientScope()
  if (!manager) {
    return
  }
  // an explicit re-evaluation clears every "sit out" mark — the connectors and joiners judge everything afresh
  for (const membership of manager.memberships.values()) {
    membership.preventRejoin = false
    membership.rejoinAttempt = 0
  }
  // snapshot first: reviveInternal inserts fresh connections into the manager, and those are already connecting —
  // refreshing them too would double-POST
  const live = heldInternals(manager)
  for (const internal of [...manager.closedHeld]) {
    internal.preventRevive = false
    internal.reviveAttempt = 0
    reviveInternal(internal)
  }
  for (const internal of live) {
    internal.preventRevive = false
    internal.reviveAttempt = 0
    refreshInternal(internal)
  }
}

/**
 * Force-close every live connection (a logout). Imperative holders (`connect()`) see `closed` and stay closed until a
 * remount or `reconnectAll()`; declarative holders (use-hooks/components) re-establish on their own through the
 * reconnect policy — their connectors re-run and judge afresh (after a logout: typically a typed deny, ideally with
 * `preventRetry`).
 */
export const disconnectAll = (): void => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('disconnectAll')
  }
  // no sockets on the server — same truthful degradation as reconnectAll
  if (_point0_env.side.is.server) {
    return
  }
  const manager = getManagerForClientScope()
  if (!manager) {
    return
  }
  for (const internal of heldInternals(manager)) {
    disposeInternal(internal, { silent: false })
  }
}

const disposeInternal = (internal: InternalConnection, { silent }: { silent: boolean }): void => {
  const manager = internal.manager
  if (internal.disposed) {
    return
  }
  internal.disposed = true
  // still held (a mounted hook, an unreleased connect()) — keep it revivable: declarative holds auto-revive through
  // the reconnect policy (see scheduleDeclarativeRevive at the end), imperative ones wait for reconnectAll()/remount
  if (internal.holds.size > 0) {
    manager.closedHeld.add(internal)
  }
  if (internal.lingerTimer) {
    clearTimeout(internal.lingerTimer)
    internal.lingerTimer = undefined
  }
  if (manager.wsStatus === 'open') {
    for (const oldCid of internal.refreshOldCids) {
      if (oldCid !== internal.cid) {
        sendFrame(manager, { t: 'close', cid: oldCid })
      }
    }
  }
  internal.refreshOldCids.clear()
  if (internal.cid && manager.wsStatus === 'open') {
    sendFrame(manager, { t: 'close', cid: internal.cid })
  } else if (internal.ticket && !internal.claimed && manager.wsStatus === 'open') {
    sendFrame(manager, { t: 'discard', ticket: internal.ticket })
  }
  for (const [key, value] of manager.connections) {
    if (value === internal) {
      manager.connections.delete(key)
    }
  }
  if (internal.cid) {
    manager.connectionsByCid.delete(internal.cid)
  }
  if (internal.status !== 'error') {
    internal.status = 'closed'
  }
  // an UNSENT queued send can never leave now — its connection will never claim; fail it right away instead of
  // letting it dangle until its send timeout. A SENT one keeps its chance: the reply may already be in flight.
  for (const pending of [...manager.pendingSends.values()]) {
    if (!pending.sent && resolveInternal(pending.internal) === internal) {
      failPendingSend(manager, pending, connectionLostError(pending.handler))
    }
  }
  // enrolled memberships die with the connection (their other end is an explicit `leave()`) — a revive gets fresh ones
  // from its new claimed frame
  for (const membership of [...manager.memberships.values()]) {
    if (membership.enrolled && !membership.disposed && membership.connectionKey === internal.key) {
      disposeMembership(membership, { sendLeave: false })
    }
  }
  notifyConnection(internal)
  notifyConnectionsChange(manager)
  if (!silent && internal.everOpened) {
    fireConnectionLifecycle(internal, 'onDisconnect')
  }
  maybeCloseSocket(manager)
  // the use-nature: a declarative hold means "stay connected while mounted", so a server kick (or disconnectAll)
  // only interrupts — the connection re-establishes through the reconnect policy, and the connector stays the judge
  scheduleDeclarativeRevive(internal)
}

/**
 * Auto-revive a closed-but-declaratively-held connection after the reconnect policy's wait. Imperative holds
 * (`connect()`) stay closed — their owner reconnects on their own terms (or via `reconnectAll()`); a connect that
 * answered `preventRetry` stays down until `reconnectAll()`/remount.
 */
const scheduleDeclarativeRevive = (internal: InternalConnection): void => {
  const manager = internal.manager
  if (!manager.closedHeld.has(internal) || internal.reviveTimer || internal.preventRevive) {
    return
  }
  if (![...internal.holds].some((hold) => hold.declarative && !hold.released)) {
    return
  }
  const policy = resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect)
  if (!reconnectAttemptAllowed(policy, internal.reviveAttempt)) {
    return
  }
  internal.reviveTimer = setTimeout(
    () => {
      internal.reviveTimer = undefined
      // re-check — the holder may have unmounted (or reconnectAll already revived it) while the wait ran
      if (!manager.closedHeld.has(internal) || internal.preventRevive) {
        return
      }
      if (![...internal.holds].some((hold) => hold.declarative && !hold.released)) {
        return
      }
      reviveInternal(internal)
    },
    reconnectDelayMs(policy, internal.reviveAttempt),
  )
}

/**
 * Retry a declaratively-held connect that failed WITHOUT a server answer (no HTTP status — a network drop, a dead
 * server): a transport failure is not a deny, so the use-nature keeps knocking through the reconnect policy. A typed
 * deny (it carries a status) stays terminal until `reconnectAll()`/remount; `preventRetry` sits everything out.
 */
const scheduleDeclarativeConnectRetry = (internal: InternalConnection): void => {
  if (internal.disposed || internal.reviveTimer || internal.preventRevive) {
    return
  }
  if (![...internal.holds].some((hold) => hold.declarative && !hold.released)) {
    return
  }
  const policy = resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect)
  if (!reconnectAttemptAllowed(policy, internal.reviveAttempt)) {
    return
  }
  const waitMs = reconnectDelayMs(policy, internal.reviveAttempt)
  internal.reviveAttempt++
  internal.reviveTimer = setTimeout(() => {
    internal.reviveTimer = undefined
    // re-check — the holder may have unmounted (or something else reconnected) while the wait ran
    if (internal.disposed || internal.preventRevive || internal.status !== 'error') {
      return
    }
    if (![...internal.holds].some((hold) => hold.declarative && !hold.released)) {
      return
    }
    void connectInternal(internal, { isReconnect: true })
  }, waitMs)
}

const releaseHold = (hold: HoldToken): void => {
  if (hold.released) {
    return
  }
  hold.released = true
  const internal = resolveInternal(hold.internal)
  // resolve BEFORE deleting the hold — the released call site's own options (its `linger`) still apply to it
  const { linger } = getResolvedChannelOptions(internal)
  internal.holds.delete(hold)
  if (internal.disposed) {
    if (internal.holds.size === 0) {
      // nobody holds it anymore — reconnectAll() must not resurrect connections nobody wants
      internal.manager.closedHeld.delete(internal)
      if (internal.reviveTimer) {
        clearTimeout(internal.reviveTimer)
        internal.reviveTimer = undefined
      }
    }
    return
  }
  if (internal.holds.size > 0) {
    return
  }
  internal.lingerTimer = setTimeout(() => {
    internal.lingerTimer = undefined
    if (internal.holds.size === 0) {
      disposeInternal(internal, { silent: false })
    }
  }, linger)
}

// With-closure recognition: the mount interpreter tells a returned connection/membership facade apart from a props
// object by the owning point stamped ON the facade — a Symbol property, same pattern as the dead marker: a fact
// about the object itself, working on every executor with no registry and no visible field (symbol properties stay
// out of JSON/Object.keys). Every facade is stamped at creation, dead SSR facades included (an SSR render still
// provides the context and lands the facade in the typed layer).
const SOCKET_FACADE_CHANNEL = Symbol.for('point0.socketFacadeChannel')
const SOCKET_FACADE_SPACE = Symbol.for('point0.socketFacadeSpace')

const stampConnectionFacadeChannel = (facade: object, channel: AnyPoint): void => {
  Object.defineProperty(facade, SOCKET_FACADE_CHANNEL, { value: channel })
}
const stampMembershipFacadeSpace = (facade: object, space: AnyPoint): void => {
  Object.defineProperty(facade, SOCKET_FACADE_SPACE, { value: space })
}
/**
 * Read the channel point a connection facade belongs to (the socket-registry stamp) — how the mountable interpreter
 * recognizes a facade without a public field.
 */
export const getConnectionFacadeChannel = (value: unknown): AnyPoint | undefined =>
  typeof value === 'object' && value !== null
    ? (value as { [SOCKET_FACADE_CHANNEL]?: AnyPoint })[SOCKET_FACADE_CHANNEL]
    : undefined
/** Read the space point a membership facade belongs to — the membership twin of {@link getConnectionFacadeChannel}. */
export const getMembershipFacadeSpace = (value: unknown): AnyPoint | undefined =>
  typeof value === 'object' && value !== null
    ? (value as { [SOCKET_FACADE_SPACE]?: AnyPoint })[SOCKET_FACADE_SPACE]
    : undefined

const createFacade = (getInternal: () => InternalConnection, disconnect: () => void): AnyClientChannelConnection => {
  const facade = {
    get status() {
      return resolveInternal(getInternal()).status
    },
    get error() {
      return resolveInternal(getInternal()).error
    },
    get isLoading() {
      return resolveInternal(getInternal()).status === 'connecting'
    },
    get input() {
      return resolveInternal(getInternal()).input
    },
    get id() {
      return resolveInternal(getInternal()).cid
    },
    get connectionIndex() {
      return resolveInternal(getInternal()).connectIndex
    },
    disconnect,
  }
  stampConnectionFacadeChannel(facade, resolveInternal(getInternal()).channel)
  return facade
}

/**
 * Placeholder facades handed out where no live target exists (SSR, `enabled: false`, the render before the declarative
 * hook's connect effect lands) — they satisfy the facade shape but resolve to nothing, so callers that need a REAL
 * target (the clientHandler subscription machine) check {@link isDeadSocketFacade} instead of a guaranteed miss.
 */
// deadness is a property of the facade OBJECT, not of any registry — the marker works on every executor (server,
// client, fake client) by construction, with no store and no side question to answer
const DEAD_SOCKET_FACADE_MARKER = Symbol.for('point0.deadSocketFacade')

const markDeadSocketFacade = (facade: object): void => {
  Object.defineProperty(facade, DEAD_SOCKET_FACADE_MARKER, { value: true })
}

/** Whether the facade is a dead placeholder — never resolvable to a live target. */
export const isDeadSocketFacade = (facade: object): boolean =>
  (facade as { [DEAD_SOCKET_FACADE_MARKER]?: boolean })[DEAD_SOCKET_FACADE_MARKER] === true

const createDeadFacade = (
  channel: AnyPoint | undefined,
  // the input this connection WOULD have connected with; `undefined` where there is none to show (a membership's dead
  // connection stand-in)
  input: InputRawUnknown | undefined,
  status: ChannelConnectionStatus,
): AnyClientChannelConnection => {
  const facade = {
    status,
    error: null,
    isLoading: status === 'connecting',
    input,
    id: undefined,
    connectionIndex: 0,
    disconnect: () => {},
  }
  if (channel) {
    stampConnectionFacadeChannel(facade, channel)
  }
  markDeadSocketFacade(facade)
  return facade
}

/**
 * `channel.connect(input?, options?)` — the imperative client entry (`flags.declarative` marks the use-hook path).
 * Returns a hold-bound connection object.
 */
export const connectToChannel = (
  channel: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: ExtraUseConnectionOptions<any, any> | undefined,
  flags?: { declarative?: boolean },
): AnyClientChannelConnection => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('connectToChannel')
  }
  const normalizedInput = input ?? {}
  if (_point0_env.side.is.server) {
    // during SSR nothing connects — the client does the real work after mount
    return createDeadFacade(channel, normalizedInput, 'connecting')
  }
  if (options?.enabled === false) {
    return createDeadFacade(channel, normalizedInput, 'closed')
  }
  const manager = getManager(channel.scope, channel)
  const transformer = channel._getSocketTransformer()
  const inputKey = transformer.stringify(normalizedInput)
  const channelKey = getChannelKey(channel)
  const key = `${channelKey}|${inputKey}`
  const existing = manager.connections.get(key)
  const target = existing ? resolveInternal(existing) : undefined
  if (target && !target.disposed) {
    const hold: HoldToken = {
      internal: target,
      released: false,
      declarative: flags?.declarative === true,
      callSiteOptions: options,
    }
    target.holds.add(hold)
    if (target.lingerTimer) {
      clearTimeout(target.lingerTimer)
      target.lingerTimer = undefined
    }
    const facade = createFacade(
      () => hold.internal,
      () => releaseHold(hold),
    )
    holdsByFacadeSsItem.get().set(facade, hold)
    return facade
  }
  const internal: InternalConnection = {
    key,
    channel,
    channelKey,
    input: normalizedInput,
    status: 'connecting',
    error: null,
    cid: undefined,
    ticket: undefined,
    claimed: false,
    holds: new Set(),
    lingerTimer: undefined,
    refreshOldCids: new Set(),
    connectInFlight: undefined,
    version: 0,
    listeners: new Set(),
    handlerListeners: new Map(),
    mergedInto: undefined,
    disposed: false,
    everOpened: false,
    connectIndex: 0,
    reviveAttempt: 0,
    reviveTimer: undefined,
    preventRevive: false,
    resumeKey: undefined,
    personalCursor: 0,
    resumeVerdicts: undefined,
    resumePending: false,
    facade: undefined as never,
    manager,
  }
  internal.facade = createFacade(
    () => internal,
    () => {
      // the canonical facade belongs to the shared connection, not to one hold
      getLogFnForPoint(channel)({
        level: 'warn',
        category: ['point0', 'socket'],
        message: `disconnect() on a listener-received connection does nothing — call it on the connection returned by connect()/useConnection (point ${channel.id})`,
      })
    },
  )
  internalsByCanonicalFacadeSsItem.get().set(internal.facade, internal)
  const hold: HoldToken = {
    internal,
    released: false,
    declarative: flags?.declarative === true,
    callSiteOptions: options,
  }
  internal.holds.add(hold)
  manager.connections.set(key, internal)
  notifyConnectionsChange(manager)
  void connectInternal(internal, { isReconnect: false })
  const facade = createFacade(
    () => hold.internal,
    () => releaseHold(hold),
  )
  holdsByFacadeSsItem.get().set(facade, hold)
  return facade
}

/**
 * Find the live connection of a channel for an input — the same key the holds/dedup use. Purely a lookup: no hold is
 * added, nothing connects. `undefined` when no live connection matches — and always on the server, where nothing is
 * ever connected.
 */
export const getChannelConnectionOrUndefined = (
  channel: AnyPoint,
  input: InputRawUnknown | undefined | void,
): AnyClientChannelConnection | undefined => {
  if (_point0_env.side.is.server) {
    return undefined
  }
  const internal = resolveBoundTargetInternal(channel, (input ?? {}) as InputRawUnknown)
  return internal?.facade
}

/**
 * Every live connection facade of a channel ON THIS CLIENT — the manager's connections map filtered to this channel,
 * disposed ones out, merge chains resolved and deduped (`channel.connections.client.list()`). Purely a lookup: no hold
 * is added, nothing connects. A connection that was kicked but is still held (`closedHeld`) is NOT here — it is dormant
 * until a remount/`reconnectAll()`; `getSocket()` is the surface that still shows those. Empty on the server.
 */
export const listChannelConnectionFacades = (channel: AnyPoint): AnyClientChannelConnection[] => {
  if (_point0_env.side.is.server) {
    return []
  }
  const manager = socketManagersSsItem.get().get(channel.scope)
  if (!manager) {
    return []
  }
  const channelKey = getChannelKey(channel)
  const seen = new Set<InternalConnection>()
  const facades: AnyClientChannelConnection[] = []
  for (const internal of manager.connections.values()) {
    const live = resolveInternal(internal)
    if (live.disposed || live.channelKey !== channelKey || seen.has(live)) {
      continue
    }
    seen.add(live)
    facades.push(live.facade)
  }
  return facades
}

/** A connection facade quacks with `disconnect` + `status` — how a bound target is told apart from a channel input. */
export const isConnectionFacade = (value: unknown): value is AnyClientChannelConnection =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { disconnect?: unknown }).disconnect === 'function' &&
  'status' in (value as object)

const notifyConnectionsChange = (manager: SocketManager): void => {
  manager.connectionsVersion++
  for (const listener of [...manager.connectionsListeners]) {
    listener()
  }
  // the connections map moved (connect / dispose / merge / revive) — the membership cascade may need to (re)join or close
  pollMemberships(manager)
}

// ------------------------------------------------------------------------------------------------------------------
// membership runtime — a space join rides one channel connection; its lifecycle cascades off that connection
// ------------------------------------------------------------------------------------------------------------------

const getMembershipKey = (connectionKey: string, spaceName: string, inputKey: string): string =>
  `${connectionKey}|${spaceName}|${inputKey}`

const getRoomKey = (channelKey: string, spaceName: string, roomSerialized: string): string =>
  `${channelKey}|${spaceName}|${roomSerialized}`

const notifyMembership = (membership: InternalMembership): void => {
  membership.version++
  for (const listener of [...membership.listeners]) {
    listener()
  }
}

const notifyMembershipsChange = (manager: SocketManager): void => {
  manager.membershipsVersion++
  for (const listener of [...manager.membershipsListeners]) {
    listener()
  }
}

/**
 * Index a membership's rooms for msg dispatch (`membershipsByRoomKey`) — called on `joined` and cleared on room
 * removal.
 */
const indexMembershipRooms = (membership: InternalMembership): void => {
  const manager = membership.manager
  for (const roomKey of membership.roomKeys) {
    const set = manager.membershipsByRoomKey.get(roomKey) ?? new Set()
    set.add(membership)
    manager.membershipsByRoomKey.set(roomKey, set)
  }
}

const unindexMembershipRooms = (membership: InternalMembership): void => {
  const manager = membership.manager
  membership.roomKeys.forEach((roomKey, index) => {
    const set = manager.membershipsByRoomKey.get(roomKey)
    if (set) {
      set.delete(membership)
      if (set.size === 0) {
        manager.membershipsByRoomKey.delete(roomKey)
        // the last membership covering the room is gone — its stream cursor can never be OFFERED again (only live
        // memberships' rooms enter a resume, and a re-join re-seeds from the join's heads), so the entry is dead
        // weight: prune it. Space-wide/channel cursors stay — they are bounded by the point count, rooms are not
        manager.topicCursors.delete(
          `${membership.channel.name}|r:${membership.spaceName}:${membership.roomsSerialized[index]}`,
        )
      }
    }
  })
}

/**
 * The live connection a membership rides right now — resolved by KEY so a revive (fresh internal, same key) is
 * transparent.
 */
const membershipConnection = (membership: InternalMembership): InternalConnection | undefined => {
  const existing = membership.manager.connections.get(membership.connectionKey)
  if (!existing) {
    return undefined
  }
  const live = resolveInternal(existing)
  return live.disposed ? undefined : live
}

/**
 * Send this membership's join over the socket (a fresh cid, first join or a replay after reconnect): status →
 * 'joining', register the correlation id, emit `pointSpaceJoinClientStart`. The `joined` / `joinErr` frame resolves it
 * through `pendingJoins`.
 */
const sendJoinFrame = (membership: InternalMembership, internal: InternalConnection): void => {
  const manager = membership.manager
  if (!internal.cid) {
    return
  }
  // a replaced join id is stale — drop it from pendingJoins so a late answer to the old join is ignored
  if (membership.joinId) {
    manager.pendingJoins.delete(membership.joinId)
  }
  const joinId = generateId()
  membership.joinId = joinId
  membership.lastCid = internal.cid
  membership.status = 'joining'
  membership.error = null
  manager.pendingJoins.set(joinId, membership)
  emitSpaceJoinEvent(membership, 'pointSpaceJoinClientStart', internal.cid, membership.joinIndex, undefined)
  sendFrame(manager, {
    t: 'join',
    id: joinId,
    cid: internal.cid,
    space: membership.spaceName,
    input: membership.inputSerialized,
  })
  notifyMembership(membership)
}

/**
 * Auto-replay the join of a declaratively-held membership after a space kick, paced by the channel's reconnect policy.
 * Clearing `lastCid` makes the cascade heartbeat resend the join; the joiner (and its guards) decides again.
 */
const scheduleDeclarativeRejoin = (membership: InternalMembership): void => {
  if (membership.disposed || membership.enrolled || membership.rejoinTimer || membership.preventRejoin) {
    return
  }
  if (![...membership.holds].some((hold) => hold.declarative && !hold.released)) {
    return
  }
  const internal = membershipConnection(membership)
  if (!internal) {
    return
  }
  const policy = resolveReconnectPolicy(getResolvedChannelOptions(internal).reconnect)
  if (!reconnectAttemptAllowed(policy, membership.rejoinAttempt)) {
    return
  }
  const waitMs = reconnectDelayMs(policy, membership.rejoinAttempt)
  membership.rejoinAttempt++
  membership.rejoinTimer = setTimeout(() => {
    membership.rejoinTimer = undefined
    // re-check — the holder may have left (or the connection died) while the wait ran
    if (membership.disposed || membership.preventRejoin) {
      return
    }
    if (![...membership.holds].some((hold) => hold.declarative && !hold.released)) {
      return
    }
    membership.lastCid = undefined
    pollMemberships(membership.manager)
  }, waitMs)
}

/**
 * The cascade heartbeat: reconcile every live membership against its connection. Connection open with a NEW cid →
 * (re)send join; connection lost (connecting) → 'joining' (rooms kept as last-known); connection gone (disposed/kicked)
 * → 'closed'. Runs off `notifyConnection` / `notifyConnectionsChange` / claim — guarded against its own re-entrancy.
 */
const pollMemberships = (manager: SocketManager): void => {
  if (manager.pollingMemberships) {
    return
  }
  manager.pollingMemberships = true
  try {
    for (const membership of [...manager.memberships.values()]) {
      if (membership.disposed || membership.mergedInto) {
        continue
      }
      const internal = membershipConnection(membership)
      if (!internal) {
        // the connection is gone (disposed / kicked / logout) — the membership closes; a connection revive re-joins it
        if (membership.status !== 'closed') {
          membership.status = 'closed'
          membership.lastCid = undefined
          if (membership.joinId) {
            manager.pendingJoins.delete(membership.joinId)
            membership.joinId = undefined
          }
          notifyMembership(membership)
        }
        continue
      }
      if (internal.status === 'open' && internal.claimed && internal.cid) {
        if (membership.lastCid !== internal.cid) {
          // an ENROLLED membership never joins — the server enrolled it and the `claimed` frame already carried the
          // rooms (reconcileEnrolledMemberships set them); just mark it synced to this cid
          if (membership.enrolled) {
            membership.lastCid = internal.cid
            continue
          }
          // a hard deny (`preventRetry`) is not replayed — the membership stays errored until reconnectAll()/remount
          if (membership.preventRejoin) {
            membership.lastCid = internal.cid
            continue
          }
          sendJoinFrame(membership, internal)
        }
        continue
      }
      // the connection is connecting / reconnecting — wait, keep the last-known rooms but flag joining (a fresh cid replays)
      membership.lastCid = undefined
      if ((membership.status === 'joined' || membership.status === 'error') && !membership.preventRejoin) {
        membership.status = 'joining'
        notifyMembership(membership)
      }
    }
  } finally {
    manager.pollingMemberships = false
  }
}

/**
 * Emit a `pointSpace*` event through the SPACE point's eventer. Meta `{ point, connection }`, mirrors
 * `pointChannelConnect*`. `membershipIndex` is the value the lifecycle callbacks read — successful joins BEFORE this
 * operation (`> 0` = a replay). The success outcome carries the entry markers (`resumed`/`gapless`); the error outcome
 * only the typed error — a failed join has no entry to describe.
 */
const emitSpaceJoinEvent = (
  membership: InternalMembership,
  name:
    | 'pointSpaceJoinClientStart'
    | 'pointSpaceJoinClientSettled'
    | 'pointSpaceJoinClientSuccess'
    | 'pointSpaceJoinClientError',
  cid: string | undefined,
  membershipIndex: number,
  outcome: { rooms: RoomUnknown[]; resumed: boolean; gapless: boolean } | { error: ErrorPoint0 } | undefined,
): void => {
  membership.space._emit(
    name,
    {
      // a server-enrolled membership has no join input — its events carry the empty object, like a no-input join
      input: membership.input ?? {},
      point: membership.space,
      connectionId: cid ?? '',
      membershipIndex,
      ...(outcome === undefined
        ? {}
        : 'rooms' in outcome
          ? { rooms: outcome.rooms, resumed: outcome.resumed, gapless: outcome.gapless, error: undefined }
          : { rooms: undefined, error: outcome.error }),
    },
    { point: membership.space.id, connection: cid },
  )
}

const membershipConnectionFacade = (membership: InternalMembership): AnyClientChannelConnection => {
  const internal = membershipConnection(membership)
  return internal ? internal.facade : createDeadFacade(membership.space._channelPoint, undefined, 'closed')
}

const createMembershipFacade = (
  getMembership: () => InternalMembership,
  leave: () => void,
): AnyClientSpaceMembership => {
  const facade = {
    get status() {
      return resolveMembership(getMembership()).status
    },
    get rooms() {
      return resolveMembership(getMembership()).rooms
    },
    get error() {
      return resolveMembership(getMembership()).error
    },
    get isLoading() {
      return resolveMembership(getMembership()).status === 'joining'
    },
    get input() {
      // a server-enrolled membership has no join input — expose the empty object, like the events and query keys do
      return resolveMembership(getMembership()).input ?? {}
    },
    get connection() {
      return membershipConnectionFacade(resolveMembership(getMembership()))
    },
    get membershipIndex() {
      return resolveMembership(getMembership()).joinIndex
    },
    leave,
  }
  stampMembershipFacadeSpace(facade, resolveMembership(getMembership()).space)
  return facade
}

const createDeadMembershipFacade = (
  space: AnyPoint | undefined,
  input: InputRawUnknown,
  status: SpaceMembershipStatus,
  error: ErrorPoint0 | null = null,
): AnyClientSpaceMembership => {
  const facade = {
    status,
    rooms: [],
    error,
    isLoading: status === 'joining',
    input,
    connection: createDeadFacade(space?._channelPoint, undefined, status === 'joining' ? 'connecting' : 'closed'),
    membershipIndex: 0,
    leave: () => {},
  }
  if (space) {
    stampMembershipFacadeSpace(facade, space)
  }
  markDeadSocketFacade(facade)
  return facade
}

/**
 * Resolve the channel connection a membership rides: an explicit `channelInput` (by-input lookup) → the ambient
 * connection (the hook layer passes it) → the single live connection of the space's channel. NEVER auto-connects: no
 * live connection started throws. `space._channelPoint` is the space's channel.
 */
const resolveMembershipConnection = (
  space: AnyPoint,
  explicitChannelInput: InputRawUnknown | undefined,
  ambientConnection: AnyClientChannelConnection | undefined,
): InternalConnection => {
  const channel = space._channelPoint
  if (!channel) {
    throw new Error(`Space ${space.id} has no channel — a space grows from a channel point`)
  }
  if (explicitChannelInput !== undefined) {
    const internal = resolveBoundTargetInternal(channel, explicitChannelInput)
    if (!internal) {
      throw new Error(
        `No live connection of channel ${channel.id} for the given channelInput — connect first or wrap in <${channel.name}.Connection>`,
      )
    }
    return internal
  }
  if (ambientConnection) {
    return resolveConnectionArg(space, ambientConnection)
  }
  // the single live connection of the space's channel (resolveConnectionArg reads `space._channelPoint`)
  return resolveConnectionArg(space, undefined)
}

/**
 * `space.join(input?, options?, channelInput?)` — the imperative client entry (`flags.declarative` marks the use-hook
 * path). Returns a hold-bound membership object.
 */
export const joinSpace = (
  space: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: ExtraUseMembershipOptions | undefined,
  explicitChannelInput?: InputRawUnknown | undefined,
  ambientConnection?: AnyClientChannelConnection | undefined,
  flags?: { declarative?: boolean },
): AnyClientSpaceMembership => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('joinSpace')
  }
  const normalizedInput = input ?? {}
  if (_point0_env.side.is.server) {
    // during SSR nothing joins — the client does the real work after mount (mirrors a connection's SSR 'connecting')
    return createDeadMembershipFacade(space, normalizedInput, 'joining')
  }
  if (options?.enabled === false) {
    return createDeadMembershipFacade(space, normalizedInput, 'closed')
  }
  // no `.joiner` on the space — refuse here, exactly like a missing live connection: the imperative `join()` throws
  // synchronously and the declarative hook path (which catches) never registers a membership, so no join frame is
  // ever built. Enrolled memberships are unaffected — they arrive with the connect confirmation, not through here
  if (!space._joinerDeclared) {
    throw joinNotAllowedError(space)
  }
  const internal = resolveMembershipConnection(space, explicitChannelInput, ambientConnection)
  const manager = internal.manager
  const spaceTransformer = space._getSocketTransformer()
  const inputSerialized = stringifyOrThrow(spaceTransformer, normalizedInput, space.id)
  const key = getMembershipKey(internal.key, space.name, inputSerialized)
  const existing = manager.memberships.get(key)
  const target = existing ? resolveMembership(existing) : undefined
  if (target && !target.disposed) {
    const hold: MembershipHoldToken = {
      membership: target,
      released: false,
      declarative: flags?.declarative === true,
      callSiteOptions: options,
    }
    target.holds.add(hold)
    if (target.lingerTimer) {
      clearTimeout(target.lingerTimer)
      target.lingerTimer = undefined
    }
    const facade = createMembershipFacade(
      () => hold.membership,
      () => releaseMembershipHold(hold),
    )
    membershipHoldsByFacadeSsItem.get().set(facade, hold)
    return facade
  }
  const channel = space._channelPoint!
  const membership: InternalMembership = {
    key,
    space,
    spaceName: space.name,
    channel,
    connectionKey: internal.key,
    input: normalizedInput,
    inputSerialized,
    status: 'joining',
    rooms: [],
    roomsSerialized: [],
    roomKeys: [],
    error: null,
    holds: new Set(),
    lingerTimer: undefined,
    lastCid: undefined,
    joinId: undefined,
    version: 0,
    listeners: new Set(),
    handlerListeners: new Map(),
    mergedInto: undefined,
    disposed: false,
    everJoined: false,
    joinIndex: 0,
    lastReleasedHold: undefined,
    rejoinAttempt: 0,
    rejoinTimer: undefined,
    preventRejoin: false,
    enrolled: false,
    facade: undefined as never,
    manager,
  }
  membership.facade = createMembershipFacade(
    () => membership,
    () => {
      getLogFnForPoint(space)({
        level: 'warn',
        category: ['point0', 'socket'],
        message: `leave() on a listener-received membership does nothing — call it on the membership returned by join()/useMembership (point ${space.id})`,
      })
    },
  )
  internalsByCanonicalMembershipFacadeSsItem.get().set(membership.facade, membership)
  const hold: MembershipHoldToken = {
    membership,
    released: false,
    declarative: flags?.declarative === true,
    callSiteOptions: options,
  }
  membership.holds.add(hold)
  manager.memberships.set(key, membership)
  notifyMembershipsChange(manager)
  // the cascade sends the join the moment the connection is open (or right now if it already is)
  pollMemberships(manager)
  const facade = createMembershipFacade(
    () => hold.membership,
    () => releaseMembershipHold(hold),
  )
  membershipHoldsByFacadeSsItem.get().set(facade, hold)
  return facade
}

const resolvedMembershipOptions = (membership: InternalMembership): { linger: number } => {
  const space = membership.space
  const firstHold = [...membership.holds].at(0)
  // call-site wins over the space point-level default (`.space({ client: { linger } })` / `.spaceOptions({ client: { linger } })`)
  const linger =
    firstHold?.callSiteOptions?.linger ?? space._spaceOptions?.linger ?? space._defaultSpaceOptions?.linger ?? 1000
  return { linger }
}

const releaseMembershipHold = (hold: MembershipHoldToken): void => {
  if (hold.released) {
    return
  }
  hold.released = true
  const membership = resolveMembership(hold.membership)
  // resolve BEFORE deleting the hold — the released call site's own `linger` still applies to it
  const { linger } = resolvedMembershipOptions(membership)
  membership.holds.delete(hold)
  // remembered for `onLeave` only: when this release turns out to be the final `leave()`, the leaver still gets its
  // callback even though `holds` is already empty at dispose time
  membership.lastReleasedHold = hold
  if (membership.disposed) {
    return
  }
  if (membership.holds.size > 0) {
    return
  }
  membership.lingerTimer = setTimeout(() => {
    membership.lingerTimer = undefined
    if (membership.holds.size === 0) {
      disposeMembership(membership, { sendLeave: true })
    }
  }, linger)
}

/**
 * Dispose a membership: send a `leave` (the last hold released, connection alive) or not (the connection is disposing —
 * the server cleans by cid). Remove it from every map. `voluntary` marks the client ASKING to be out (the last
 * `leave()`) as opposed to the membership being taken from it — it only decides whether an enrolled membership fires
 * its `onLeave`.
 */
const disposeMembership = (
  membership: InternalMembership,
  { sendLeave, voluntary = false }: { sendLeave: boolean; voluntary?: boolean },
): void => {
  const manager = membership.manager
  if (membership.disposed) {
    return
  }
  membership.disposed = true
  if (membership.lingerTimer) {
    clearTimeout(membership.lingerTimer)
    membership.lingerTimer = undefined
  }
  if (membership.rejoinTimer) {
    clearTimeout(membership.rejoinTimer)
    membership.rejoinTimer = undefined
  }
  // a previously-joined membership closing is the `onLeave` moment. An ENROLLED one has no lifecycle of its own — it
  // was announced, not joined, so no `onEnter` ever fired for it and the connection dying (or a refresh dropping the
  // announcement) stays silent; its ONE lifecycle moment is an explicit `leave()`, which fires `onLeave` exactly like
  // the voluntary leave of a joined membership
  if (membership.everJoined && (!membership.enrolled || voluntary)) {
    fireMembershipLifecycle(membership, 'onLeave')
  }
  if (membership.joinId) {
    manager.pendingJoins.delete(membership.joinId)
    membership.joinId = undefined
  }
  unindexMembershipRooms(membership)
  const internal = membershipConnection(membership)
  if (sendLeave && internal && internal.cid && manager.wsStatus === 'open') {
    // the client owns the shared-room refcount: a room another of THIS connection's memberships still covers stays
    // out of the list (the server keys nothing by join input, nor by HOW a room was entered — it only hears which
    // rooms to drop, and one entry holds each room once); unindexed above, so the index holds exactly the OTHER
    // memberships — enrolled ones included, they are `joined` from birth and cover their rooms like any other
    const rooms: string[] = []
    membership.roomsSerialized.forEach((roomSerialized, index) => {
      const covering = manager.membershipsByRoomKey.get(membership.roomKeys[index])
      // only a currently-JOINED membership covers a room — a closed one replaying its join may never come back
      // (a denied rejoin would leave the server subscribed to a room no client membership covers)
      const stillCovered =
        covering &&
        [...covering].some(
          (candidate) =>
            !candidate.disposed && candidate.status === 'joined' && membershipConnection(candidate) === internal,
        )
      if (!stillCovered) {
        rooms.push(roomSerialized)
      }
    })
    if (rooms.length > 0) {
      sendFrame(manager, { t: 'leave', cid: internal.cid, space: membership.spaceName, rooms })
    }
  }
  for (const [key, value] of manager.memberships) {
    if (value === membership) {
      manager.memberships.delete(key)
    }
  }
  if (membership.status !== 'error') {
    membership.status = 'closed'
  }
  // fail any space-handler send still waiting on this membership
  for (const pending of [...manager.pendingSends.values()]) {
    if (pending.membership && resolveMembership(pending.membership) === membership && !pending.sent) {
      failPendingSend(manager, pending, connectionLostError(pending.handler))
    }
  }
  notifyMembership(membership)
  notifyMembershipsChange(manager)
}

/**
 * `leave()` on an ENROLLED membership — the one departure a server enrollment can have on the client's own initiative.
 * The protocol allows it: a `leave` frame NAMES its rooms and the server, which keys nothing by how a room was entered,
 * drops exactly those. So this is the regular dispose path with `sendLeave` — its shared-room refcount keeps a room
 * another live membership of this connection still covers. Immediate and local: there is no hold to release, hence no
 * `linger`, and the facade is dead right after. It is NOT a permanent exit — the next connection setup (a reconnect, a
 * `refresh`) re-runs the `.enroller` and installs the enrollment again; a permanent one is DATA the enroller reads.
 * Idempotent: a second call, or one after a refresh already dropped the enrollment, is a no-op.
 */
const leaveEnrolledMembership = (membership: InternalMembership): void => {
  const live = resolveMembership(membership)
  if (live.disposed) {
    return
  }
  disposeMembership(live, { sendLeave: true, voluntary: true })
}

/**
 * Reconcile the ENROLLED memberships of a connection with what its fresh `claimed` frame announced: create the missing
 * ones (hold-less, `status: 'joined'` right away — the server already subscribed the topics), update the rooms of the
 * existing ones (a refresh may have changed the identity and with it the enrollments), and dispose the ones no longer
 * announced. Dispatch, listeners, `left` shrinking — all regular membership machinery from here on.
 */
const reconcileEnrolledMemberships = (
  manager: SocketManager,
  internal: InternalConnection,
  enrolled: Array<{ space: string; rooms: string[] }>,
): void => {
  const announcedSpaces = new Set(enrolled.map((enrollment) => enrollment.space))
  // drop enrollments the fresh claim no longer announces
  for (const membership of [...manager.memberships.values()]) {
    if (!membership.enrolled || membership.disposed) {
      continue
    }
    if (membership.connectionKey !== internal.key) {
      continue
    }
    if (!announcedSpaces.has(membership.spaceName)) {
      disposeMembership(membership, { sendLeave: false })
    }
  }
  applyEnrolledSpaces(manager, internal, enrolled)
}

/**
 * Install or update the ENROLLED membership each announcement carries — `rooms` is the space's FULL current enrolled
 * set for this connection (announcements replace, they never merge client-side). Shared by the `claimed` reconcile and
 * the mid-life `enrolled` frame (an imperative `space.enroll`).
 */
const applyEnrolledSpaces = (
  manager: SocketManager,
  internal: InternalConnection,
  enrolled: Array<{ space: string; rooms: string[] }>,
): void => {
  for (const enrollment of enrolled) {
    const space = spacePointsSsItem.get().get(`${manager.scope}:space:${enrollment.space}`)
    if (!space) {
      // the space's module is not on this client (it has no handlers here) — nothing could dispatch to it anyway
      continue
    }
    const spaceTransformer = space._getSocketTransformer()
    const channelKey = internal.channelKey
    const key = getMembershipKey(internal.key, enrollment.space, ENROLLED_MEMBERSHIP_KEY_INPUT)
    const existing = manager.memberships.get(key)
    const live = existing ? resolveMembership(existing) : undefined
    if (live && !live.disposed) {
      unindexMembershipRooms(live)
      live.roomsSerialized = enrollment.rooms
      live.rooms = enrollment.rooms.map((room) => spaceTransformer.parse(room))
      live.roomKeys = enrollment.rooms.map((room) => getRoomKey(channelKey, enrollment.space, room))
      indexMembershipRooms(live)
      live.status = 'joined'
      live.error = null
      live.everJoined = true
      live.lastCid = internal.cid
      notifyMembership(live)
      continue
    }
    const membership: InternalMembership = {
      key,
      space,
      spaceName: enrollment.space,
      channel: internal.channel,
      connectionKey: internal.key,
      input: undefined,
      inputSerialized: ENROLLED_MEMBERSHIP_KEY_INPUT,
      status: 'joined',
      rooms: enrollment.rooms.map((room) => spaceTransformer.parse(room)),
      roomsSerialized: enrollment.rooms,
      roomKeys: enrollment.rooms.map((room) => getRoomKey(channelKey, enrollment.space, room)),
      error: null,
      holds: new Set(),
      lingerTimer: undefined,
      lastCid: internal.cid,
      joinId: undefined,
      version: 0,
      listeners: new Set(),
      handlerListeners: new Map(),
      mergedInto: undefined,
      disposed: false,
      everJoined: true,
      joinIndex: 1,
      lastReleasedHold: undefined,
      rejoinAttempt: 0,
      rejoinTimer: undefined,
      preventRejoin: false,
      enrolled: true,
      facade: undefined as never,
      manager,
    }
    membership.facade = createMembershipFacade(
      () => membership,
      // an enrollment HAS a leave: the frame names its rooms and the server drops them (a reconnect/refresh re-enrolls)
      () => leaveEnrolledMembership(membership),
    )
    internalsByCanonicalMembershipFacadeSsItem.get().set(membership.facade, membership)
    manager.memberships.set(key, membership)
    indexMembershipRooms(membership)
    notifyMembership(membership)
  }
  notifyMembershipsChange(manager)
}

/**
 * Resolve a bound target — a connection facade or a channel input — to the live internal connection. `undefined` when
 * nothing matches: binding by input SEARCHES the live connections, it never creates one.
 */
const resolveBoundTargetInternal = (
  channel: AnyPoint,
  target: AnyClientChannelConnection | InputRawUnknown | undefined,
): InternalConnection | undefined => {
  // runs from both-sides render helpers too — no client store (the server) degrades to "nothing resolved"
  const manager = socketManagersSsItem.getOrUndefined()?.get(channel.scope)
  if (!manager) {
    return undefined
  }
  if (isConnectionFacade(target)) {
    const hold = holdsByFacadeSsItem.get().get(target)
    if (hold) {
      return resolveInternal(hold.internal)
    }
    const canonical = internalsByCanonicalFacadeSsItem.get().get(target)
    if (canonical) {
      const live = resolveInternal(canonical)
      return live.disposed ? undefined : live
    }
    const cid = target.id
    const internal = cid ? manager.connectionsByCid.get(cid) : undefined
    return internal ? resolveInternal(internal) : undefined
  }
  const transformer = channel._getSocketTransformer()
  const key = `${getChannelKey(channel)}|${transformer.stringify(target ?? {})}`
  const existing = manager.connections.get(key)
  const live = existing ? resolveInternal(existing) : undefined
  return live && !live.disposed ? live : undefined
}

/**
 * The one resolution rule for every handler client method: an explicit bound target wins; nothing bound falls back to
 * the ambient `<Connection>` (hooks pass it in) or the single live connection of the channel. `strict` throws where a
 * send must not silently no-op; hooks use the lax form and wait for the connection to appear.
 */
export const resolveHandlerTarget = (
  handler: AnyPoint,
  target: AnyClientChannelConnection | InputRawUnknown | undefined,
  ambient: AnyClientChannelConnection | undefined,
  { strict }: { strict: boolean },
): AnyClientChannelConnection | undefined => {
  const channel = handler._channelPoint
  if (!channel) {
    throw new Error(`Point ${handler.id} has no channel — handlers grow from a channel point`)
  }
  if (target !== undefined) {
    const internal = resolveBoundTargetInternal(channel, target)
    if (internal) {
      return internal.facade
    }
    if (strict) {
      throw new Error(
        isConnectionFacade(target)
          ? `The bound connection for ${handler.id} is not live — it closed or was never opened`
          : `No live connection of channel ${channel.id} matches the bound input for ${handler.id} — connect first`,
      )
    }
    return undefined
  }
  if (ambient) {
    return ambient
  }
  if (strict) {
    return resolveConnectionArg(handler, undefined).facade
  }
  try {
    return resolveConnectionArg(handler, undefined).facade
  } catch {
    return undefined
  }
}

/** Subscribe a React consumer to a lazily-bound connection: re-resolves when the connections map or its state moves. */
export const useBoundConnection = (
  handler: AnyPoint,
  target: AnyClientChannelConnection | InputRawUnknown | undefined,
  ambient: AnyClientChannelConnection | undefined,
): AnyClientChannelConnection | undefined => {
  const channel = handler._channelPoint
  // renders on BOTH sides — on the server there is no client store and the hook degrades to an unresolved target
  const manager = channel ? socketManagersSsItem.getOrUndefined()?.get(channel.scope) : undefined
  const resolve = () => resolveHandlerTarget(handler, target, ambient, { strict: false })
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!manager) {
        return () => {}
      }
      manager.connectionsListeners.add(listener)
      const resolved = channel ? resolveBoundTargetInternal(channel, target) : undefined
      resolved?.listeners.add(listener)
      // the AMBIENT connection's state moves must re-render the consumer too: its status flips on the SAME canonical
      // facade object, so no context-value change ever re-renders — without this subscription a bare hook under
      // <Connection> froze on 'connecting' deps forever and its listener never attached (caught live in the browser
      // e2e: the module-level listener fired, the hook one never did)
      const ambientInternal = channel && ambient ? resolveBoundTargetInternal(channel, ambient) : undefined
      ambientInternal?.listeners.add(listener)
      return () => {
        manager.connectionsListeners.delete(listener)
        resolved?.listeners.delete(listener)
        ambientInternal?.listeners.delete(listener)
      }
    },
    // deliberately NOT the raw deps: the serialized target identity — a fresh object literal per render must not
    // resubscribe. Serialized by the CHANNEL transformer (the same canonical form the registry keys use). The ambient
    // rides by OBJECT identity — it is context-stable, and its dead→live identity change must resubscribe
    [
      manager,
      handler.id,
      isConnectionFacade(target)
        ? target.id
        : channel
          ? channel._getSocketTransformer().stringify(target ?? {})
          : undefined,
      ambient,
    ],
  )
  const getSnapshot = () => {
    const internal = channel ? resolveBoundTargetInternal(channel, target) : undefined
    const ambientInternal = channel && ambient ? resolveBoundTargetInternal(channel, ambient) : undefined
    return `${manager?.connectionsVersion ?? -1}:${internal ? internal.version : -1}:${internal ? internal.status : 'none'}:${ambientInternal ? ambientInternal.version : -1}:${ambientInternal ? ambientInternal.status : 'none'}`
  }
  React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return resolve()
}

const resolveConnectionArg = (
  handler: AnyPoint,
  connection: AnyClientChannelConnection | undefined,
): InternalConnection => {
  const channel = handler._channelPoint
  if (!channel) {
    throw new Error(`Point ${handler.id} has no channel — handlers grow from a channel point`)
  }
  if (connection) {
    const hold = holdsByFacadeSsItem.get().get(connection)
    if (hold) {
      return resolveInternal(hold.internal)
    }
    // a canonical facade (handed to listeners and resolved bound targets) — mapped directly, so a send bound to a
    // still-connecting connection (no cid yet) queues instead of throwing
    const canonical = internalsByCanonicalFacadeSsItem.get().get(connection)
    if (canonical && !resolveInternal(canonical).disposed) {
      return resolveInternal(canonical)
    }
    const manager = socketManagersSsItem.get().get(channel.scope)
    const cid = connection.id
    const internal = cid ? manager?.connectionsByCid.get(cid) : undefined
    if (internal) {
      return resolveInternal(internal)
    }
    throw new Error(`Unknown connection passed for ${handler.id} — pass the object returned by connect()/useConnection`)
  }
  const manager = socketManagersSsItem.get().get(channel.scope)
  const channelKey = getChannelKey(channel)
  const candidates = manager
    ? [...new Set(manager.connections.values())]
        .map(resolveInternal)
        .filter((internal) => !internal.disposed && internal.channelKey === channelKey)
    : []
  const unique = [...new Set(candidates)]
  // a connection lingering after its last hold is still live, but a held one is what the caller means
  const held = unique.filter((candidate) => candidate.holds.size > 0)
  if (held.length === 1) {
    return held[0]
  }
  if (unique.length === 1) {
    return unique[0]
  }
  if (unique.length === 0) {
    throw new Error(
      `No live connection for channel ${channel.id} — connect first, pass a connection, or wrap in <${channel.name}.Connection>`,
    )
  }
  throw new Error(
    `Several live connections for channel ${channel.id} — pass a connection or wrap in <${channel.name}.Connection>`,
  )
}

// `error` is an `ErrorPoint0` on every ANSWERED path (a connect deny, a `sendErr`, a joinErr, the connection-lost
// error) and a raw throw on the room-resolution path — `unknown` is the honest union of the two
const failPendingSend = (manager: SocketManager, pending: PendingSend, error: unknown): void => {
  manager.pendingSends.delete(pending.id)
  clearTimeout(pending.timeoutTimer)
  pending.reject(error)
}

/**
 * Which serialized room a space-handler send addresses: the BOUND room (`handler(room)` — must be one the membership
 * holds), else the single room of a single-room membership. A membership-bound (or bare) send on a multi-room
 * membership, or on one with no rooms, throws. Resolved at SEND time (post-join) — before the join lands the membership
 * has no rooms to pick from.
 */
const pickRoomSerialized = (handler: AnyPoint, membership: InternalMembership, boundRoom: RoomUnknown): string => {
  const spaceTransformer = membership.space._getSocketTransformer()
  if (boundRoom !== undefined) {
    const serialized = stringifyOrThrow(spaceTransformer, boundRoom, membership.space.id)
    if (!membership.roomsSerialized.includes(serialized)) {
      throw new Error(
        `The room bound for ${handler.id} is not one this membership holds (space ${membership.spaceName})`,
      )
    }
    return serialized
  }
  if (membership.roomsSerialized.length === 1) {
    return membership.roomsSerialized[0]
  }
  if (membership.roomsSerialized.length === 0) {
    throw new Error(
      `No room to address for ${handler.id} — this membership holds no rooms (join first, or it was a clean deny)`,
    )
  }
  throw new Error(multiRoomBindErrorMessage(handler, membership.spaceName))
}

/** The one wording of "you bound a membership that spans several rooms" — binding IS the way to address a room. */
const multiRoomBindErrorMessage = (handler: AnyPoint, spaceName: string): string =>
  `The membership of space ${spaceName} spans several rooms — bind the room instead: ${handler.name}(room)`

/** Set a space-handler send's frame `room` (resolved post-join). Returns false and fails the pending if it can't. */
const applySpaceRoomToFrame = (manager: SocketManager, pending: PendingSend): boolean => {
  if (!pending.membership) {
    return true
  }
  try {
    pending.frame.room = pickRoomSerialized(pending.handler, resolveMembership(pending.membership), pending.boundRoom)
    return true
  } catch (error) {
    failPendingSend(manager, pending, error)
    return false
  }
}

const flushQueuedSends = (manager: SocketManager): void => {
  for (const pending of [...manager.pendingSends.values()]) {
    if (pending.sent) {
      continue
    }
    const internal = resolveInternal(pending.internal)
    if (!internal.claimed || !internal.cid) {
      continue
    }
    // a space-handler send also waits for its membership to have joined (the room is only live once joined)
    if (pending.membership && resolveMembership(pending.membership).status !== 'joined') {
      continue
    }
    if (!applySpaceRoomToFrame(manager, pending)) {
      continue
    }
    pending.frame.cid = internal.cid
    if (sendFrame(manager, pending.frame)) {
      pending.sent = true
    }
  }
}

/**
 * Resolve which membership a space-handler send rides — an explicit membership facade (bound `handler(membership)`) or,
 * bare, the single live membership of the handler's space. Throws in the strict path when none/several match.
 */
const resolveMembershipArg = (handler: AnyPoint, target: AnyClientSpaceMembership | undefined): InternalMembership => {
  const space = handler._spacePoint
  if (!space) {
    throw new Error(`Point ${handler.id} has no space — a space handler grows from a space point`)
  }
  if (target) {
    const hold = membershipHoldsByFacadeSsItem.get().get(target)
    if (hold) {
      return resolveMembership(hold.membership)
    }
    const canonical = internalsByCanonicalMembershipFacadeSsItem.get().get(target)
    if (canonical && !resolveMembership(canonical).disposed) {
      return resolveMembership(canonical)
    }
    throw new Error(
      `Unknown membership passed for ${handler.id} — pass the object returned by join()/useMembership (space ${space.name})`,
    )
  }
  const manager = socketManagersSsItem.get().get(space.scope)
  const candidates = manager
    ? [...new Set(manager.memberships.values())]
        .map(resolveMembership)
        .filter((membership) => !membership.disposed && membership.spaceName === space.name)
    : []
  const unique = [...new Set(candidates)]
  const held = unique.filter((candidate) => candidate.holds.size > 0)
  if (held.length === 1) {
    return held[0]
  }
  if (unique.length === 1) {
    return unique[0]
  }
  if (unique.length === 0) {
    throw new Error(`No membership for space ${space.name} — join first or wrap in <${space.name}.Membership>`)
  }
  throw new Error(
    `Several live memberships for space ${space.name} — pass a membership or wrap in <${space.name}.Membership>`,
  )
}

/**
 * Is this value a membership facade (has `leave` + `rooms` + `status`)? Tells a membership from a space input at a call
 * site.
 */
export const isMembershipFacade = (value: unknown): value is AnyClientSpaceMembership =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as { leave?: unknown }).leave === 'function' &&
  'rooms' in (value as object) &&
  'status' in (value as object)

/**
 * Resolve which connection a handler send rides — and, for a space handler, its membership. A channel handler resolves
 * a connection (facade or single-live); a space handler resolves a membership (facade or single-live) and rides its
 * connection. The room this send addresses is deferred to send time (`roomOption`), resolved once the membership
 * joins.
 */
const resolveSendTarget = (
  handler: AnyPoint,
  target: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
  boundRoom: RoomUnknown,
): { internal: InternalConnection; membership: InternalMembership | undefined; boundRoom: RoomUnknown } => {
  if (handler._spacePoint) {
    const membership = resolveMembershipArg(handler, target as AnyClientSpaceMembership | undefined)
    const internal = membershipConnection(membership)
    if (!internal) {
      throw connectionLostError(handler)
    }
    return { internal, membership, boundRoom }
  }
  return {
    internal: resolveConnectionArg(handler, target as AnyClientChannelConnection | undefined),
    membership: undefined,
    boundRoom: undefined,
  }
}

/**
 * Client-side `serverHandler.send(target?, input?, options?)` — resolves with the `.serverReply` return. `boundRoom` is
 * what `handler(room)` bound (a space handler only): the frame's room. There is NO per-call room — binding is the one
 * way to address a room.
 */
export const sendToServerHandler = async (
  handler: AnyPoint,
  connection: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
  input: MessageUnknown,
  options: { timeout?: number; queue?: boolean } | undefined,
  boundRoom?: RoomUnknown,
): Promise<ReplyUnknown> => {
  if (_point0_env.side.is.server) {
    throw new Error(`serverHandler.send is for the client only (point ${handler.id})`)
  }
  const { internal, membership, boundRoom: resolvedBoundRoom } = resolveSendTarget(handler, connection, boundRoom)
  const manager = internal.manager
  const transformer = handler._getSocketTransformer()
  const resolvedOptions = mergeServerHandlerOptions(
    handler._defaultServerHandlerOptions,
    handler._serverHandlerOptions,
    options,
  )
  const timeoutMs = resolvedOptions.timeout ?? DEFAULT_SEND_TIMEOUT_MS
  const queue = resolvedOptions.queue !== false
  const id = generateId()
  const frame: SocketClientFrame & { t: 'send' } = {
    t: 'send',
    id,
    cid: internal.cid ?? '',
    handler: handler.name,
    ...(input === undefined ? {} : { input: transformer.stringify(input) }),
  }
  const dataSerialized = await new Promise<string | undefined>((resolve, reject) => {
    const pending: PendingSend = {
      id,
      frame,
      resolve,
      reject,
      queue,
      sent: false,
      handler,
      internal,
      membership,
      boundRoom: resolvedBoundRoom,
      timeoutTimer: setTimeout(() => {
        failPendingSend(manager, pending, connectionLostError(handler))
      }, timeoutMs),
    }
    manager.pendingSends.set(id, pending)
    const live = resolveInternal(internal)
    const membershipReady = !membership || resolveMembership(membership).status === 'joined'
    if (manager.wsStatus === 'open' && live.claimed && live.cid && membershipReady) {
      if (applySpaceRoomToFrame(manager, pending)) {
        frame.cid = live.cid
        if (sendFrame(manager, frame)) {
          pending.sent = true
        } else if (!queue) {
          // the manager thinks the socket is open but the write failed (readyState raced a close) — a
          // `queue: false` send fails fast here too, not on its timeout
          failPendingSend(manager, pending, connectionLostError(handler))
        }
      }
    } else if (!queue) {
      failPendingSend(manager, pending, connectionLostError(handler))
    }
  })
  const data = dataSerialized === undefined ? undefined : transformer.parse(dataSerialized)
  const onReplyFromServer = resolvedOptions.onReplyFromServer
  if (onReplyFromServer) {
    void (async () => {
      try {
        await onReplyFromServer({
          input,
          data,
          connection: resolveInternal(internal).facade,
          point: handler,
        })
      } catch (error) {
        getLogFnForPoint(handler)({
          level: 'error',
          category: ['point0', 'socket'],
          message: `A serverHandler onReplyFromServer callback threw (point ${handler.id})`,
          error,
        })
      }
    })()
  }
  return data
}

/**
 * A ROOM-bound listener hears only the pushes addressed to that room: the dispatch hands every listener of every
 * covering membership the frame's parsed `room`, so the filter is a serialized compare. A space-WIDE push (no `room` on
 * the frame) is not addressed to any room and never reaches a room-bound listener — bind the membership (or use the
 * bare form) to hear those. `undefined` bound room = no filter, today's every-covered-room behavior.
 */
const filterListenerByRoom = (
  space: AnyPoint,
  boundRoom: RoomUnknown,
  listener: ClientHandlerListenerFn<any, any>,
): ClientHandlerListenerFn<any, any> => {
  if (boundRoom === undefined) {
    return listener
  }
  const spaceTransformer = space._getSocketTransformer()
  const boundRoomSerialized = stringifyOrThrow(spaceTransformer, boundRoom, space.id)
  return (props) => {
    const room = (props as { room?: RoomUnknown }).room
    if (room === undefined || spaceTransformer.stringify(room) !== boundRoomSerialized) {
      return
    }
    return listener(props)
  }
}

/**
 * Register a component/imperative listener for a clientHandler. A CHANNEL handler's listeners live on the connection; a
 * SPACE handler's live on the MEMBERSHIP (a space push is dispatched per membership-room), and `boundRoom` (what
 * `handler(room)` bound) narrows them to that one room. Returns the remover.
 */
export const addClientHandlerListener = (
  handler: AnyPoint,
  target: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
  listener: ClientHandlerListenerFn<any, any>,
  boundRoom?: RoomUnknown,
): { remove: () => void } => {
  if (_point0_env.side.is.server) {
    return { remove: () => {} }
  }
  registerClientHandlerPoint(handler)
  const space = handler._spacePoint
  if (space) {
    const membership = resolveMembershipArg(handler, target as AnyClientSpaceMembership | undefined)
    const listeners = membership.handlerListeners.get(handler.id) ?? new Set()
    const scoped = filterListenerByRoom(space, boundRoom, listener)
    listeners.add(scoped)
    membership.handlerListeners.set(handler.id, listeners)
    return {
      remove: () => {
        const live = resolveMembership(membership)
        live.handlerListeners.get(handler.id)?.delete(scoped)
        if (live !== membership) {
          membership.handlerListeners.get(handler.id)?.delete(scoped)
        }
      },
    }
  }
  const internal = resolveConnectionArg(handler, target as AnyClientChannelConnection | undefined)
  const listeners = internal.handlerListeners.get(handler.id) ?? new Set()
  listeners.add(listener)
  internal.handlerListeners.set(handler.id, listeners)
  return {
    remove: () => {
      const live = resolveInternal(internal)
      live.handlerListeners.get(handler.id)?.delete(listener)
      if (live !== internal) {
        internal.handlerListeners.get(handler.id)?.delete(listener)
      }
    },
  }
}

/**
 * The state + wire-up behind `iterateMessagesFromServer`: attach a message listener to the resolved target (the channel
 * connection — a SPACE handler's, its membership) and read the target's liveness. There is no transport here — the
 * messages are the server's `sendToClient` pushes on the already open socket, and the target owns its own life: the
 * channel's reconnect policy redials a drop (the consumer just waits), a target gone for good ends the observation.
 * Listeners survive revives — the merge machinery carries both listener sets to the fresh internal.
 */
const observeClientHandlerTarget = (
  handler: AnyPoint,
  target: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
  boundRoom?: RoomUnknown,
): {
  /** the target's liveness (`version` keys change detection): `ended` — gone for good, `error` — failed for good */
  read: () => { ended: boolean; error: ErrorPoint0 | null; version: number }
  /** fires on every state move of the target */
  onStateChange: (listener: () => void) => { remove: () => void }
  /** one callback per delivered push — the message is the handler's parsed input */
  onMessage: (listener: (message: MessageUnknown) => void) => { remove: () => void }
} => {
  registerClientHandlerPoint(handler)
  if (handler._spacePoint) {
    const membership = resolveMembershipArg(handler, target as AnyClientSpaceMembership | undefined)
    return {
      read: () => {
        const live = resolveMembership(membership)
        // a non-disposed 'closed' membership is PARKED while its connection can come back (a live one under the
        // same key, or a kicked-but-held one the revive policy may restore) — the comeback replays the join; it is
        // gone for good only when disposed or when no such connection remains. An 'error' with a rejoin scheduled
        // is likewise transient.
        let ended = live.disposed
        if (!ended && live.status === 'closed') {
          const revivable =
            live.manager.connections.has(live.connectionKey) ||
            [...live.manager.closedHeld].some((internal) => internal.key === live.connectionKey)
          ended = !revivable
        }
        return {
          ended,
          error: live.status === 'error' && !live.rejoinTimer ? live.error : null,
          version: live.version,
        }
      },
      onStateChange: (listener) => {
        const live = resolveMembership(membership)
        live.listeners.add(listener)
        return {
          remove: () => {
            const current = resolveMembership(membership)
            current.listeners.delete(listener)
            if (current !== live) {
              live.listeners.delete(listener)
            }
          },
        }
      },
      onMessage: (listener) =>
        addClientHandlerListener(
          handler,
          membership.facade,
          (props) => listener((props as { message: MessageUnknown }).message),
          boundRoom,
        ),
    }
  }
  const internal = resolveConnectionArg(handler, target as AnyClientChannelConnection | undefined)
  return {
    read: () => {
      const live = resolveInternal(internal)
      // "closed for good" only: a kicked-but-held connection (closedHeld — declarative holds auto-revive,
      // imperative ones wait for reconnectAll) and a scheduled revive/retry are TRANSIENT — the loop parks through
      // them; same for a transport-failure 'error' the retry policy is still redialing
      const reviving = live.reviveTimer !== undefined || live.manager.closedHeld.has(live)
      return {
        ended: live.status === 'closed' && !reviving,
        error: live.status === 'error' && !reviving ? live.error : null,
        version: live.version,
      }
    },
    onStateChange: (listener) => {
      const live = resolveInternal(internal)
      live.listeners.add(listener)
      return {
        remove: () => {
          const current = resolveInternal(internal)
          current.listeners.delete(listener)
          if (current !== live) {
            live.listeners.delete(listener)
          }
        },
      }
    },
    onMessage: (listener) =>
      addClientHandlerListener(handler, internal.facade, (props) =>
        listener((props as { message: MessageUnknown }).message),
      ),
  }
}

/**
 * The async iterable behind `iterateMessagesFromServer(options)` — every clientHandler's imperative consumer, no
 * transport of its own: iterating attaches a message listener to the resolved target and yields each `sendToClient`
 * push. A connection drop parks the loop (the channel's own reconnect policy redials — nothing here restarts); the
 * iteration ends when the target closes for good and throws its typed error when it fails. Breaking out of the loop (or
 * aborting `options.signal`) detaches the listener.
 */
export const iterateClientHandlerMessages = (
  point: AnyPoint,
  facade: AnyClientChannelConnection | AnyClientSpaceMembership | undefined,
  options: { signal?: AbortSignal } | undefined,
  boundRoom?: RoomUnknown,
): AsyncGenerator<MessageUnknown, void, undefined> => {
  if (_point0_env.side.is.server) {
    throw new Error(`iterateMessagesFromServer is for the client only (point ${point.id})`)
  }
  // the target resolves at CALL time — an imperative caller with nothing resolvable gets the resolver's error now
  const observer = observeClientHandlerTarget(point, facade, boundRoom)
  const outerSignal = options?.signal
  const inner = async function* (): AsyncGenerator<MessageUnknown, void, undefined> {
    // consumed messages are shifted off — a long-lived feed must not grow one entry per push
    const messages: MessageUnknown[] = []
    // read through closures — the listeners mutate these from outside the loop (the repo's isStopped pattern)
    let aborted = false
    const isAborted = (): boolean => aborted
    // at most one parked wait exists at a time — a single wake slot is the whole wakeup machinery
    let wake: (() => void) | undefined
    const notify = (): void => {
      const parked = wake
      wake = undefined
      parked?.()
    }
    const onAbort = (): void => {
      aborted = true
      notify()
    }
    outerSignal?.addEventListener('abort', onAbort, { once: true })
    if (outerSignal?.aborted) {
      aborted = true
    }
    const messageSubscription = observer.onMessage((message) => {
      messages.push(message)
      notify()
    })
    const stateSubscription = observer.onStateChange(notify)
    try {
      for (;;) {
        if (isAborted()) {
          return
        }
        if (messages.length > 0) {
          yield messages.shift()
          continue
        }
        const { ended, error } = observer.read()
        if (error) {
          throw error
        }
        if (ended) {
          return
        }
        await new Promise<void>((resolve) => {
          wake = resolve
        })
      }
    } finally {
      messageSubscription.remove()
      stateSubscription.remove()
      outerSignal?.removeEventListener('abort', onAbort)
    }
  }
  return inner()
}

const handleServerFrame = async (manager: SocketManager, frame: SocketServerFrame): Promise<void> => {
  switch (frame.t) {
    case 'pong': {
      // Nothing to read off the frame — `pong` earns its place by EXISTING: it guarantees that even a silent
      // connection produces inbound traffic once per ping, which is what the client's liveness deadline measures.
      // The measurement itself is on the inbound funnel in `ensureSocket`, over every frame alike, so a socket busy
      // with pushes stays fresh without a single pong.
      return
    }
    case 'claimed': {
      // an upgrade-connect learns its cid HERE — there was no HTTP response to carry it, the first `claimed` frame
      // on the socket the handshake opened is the connect answer (Settled/Success fire now for the same reason)
      const pendingUpgrade = manager.pendingUpgradeConnect
      if (pendingUpgrade && !manager.connectionsByCid.has(frame.cid)) {
        manager.pendingUpgradeConnect = undefined
        const upgraded = pendingUpgrade.internal
        if (upgraded.disposed) {
          sendFrame(manager, { t: 'close', cid: frame.cid })
          pendingUpgrade.resolve('claimed')
          return
        }
        upgraded.cid = frame.cid
        upgraded.ticket = undefined
        manager.connectionsByCid.set(frame.cid, upgraded)
        const eventMeta = { point: upgraded.channel.id }
        for (const name of ['pointChannelConnectClientSettled', 'pointChannelConnectClientSuccess'] as const) {
          upgraded.channel._emit(
            name,
            {
              input: upgraded.input,
              point: upgraded.channel,
              connectionId: frame.cid,
              connectionIndex: upgraded.connectIndex,
              resumed: false,
              gapless: upgraded.connectIndex === 0,
              error: undefined,
            },
            eventMeta,
          )
        }
        pendingUpgrade.resolve('claimed')
        // fall through into the shared claimed bookkeeping below
      }
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal || internal.disposed) {
        return
      }
      internal.claimed = true
      for (const oldCid of internal.refreshOldCids) {
        if (oldCid !== internal.cid) {
          sendFrame(manager, { t: 'close', cid: oldCid })
          if (manager.connectionsByCid.get(oldCid) === internal) {
            manager.connectionsByCid.delete(oldCid)
          }
        }
      }
      internal.refreshOldCids.clear()
      internal.everOpened = true
      internal.status = 'open'
      // a successful claim resets the auto-revive pacing — the next kick starts a fresh backoff run
      internal.reviveAttempt = 0
      internal.preventRevive = false
      // a resumable channel's claim mints the resume credential — a fresh cid is a fresh personal stream
      internal.resumeKey = frame.resumeKey
      internal.personalCursor = 0
      internal.resumeVerdicts = undefined
      internal.resumePending = false
      // the server-side enrollments ride the claimed frame — install/refresh them before anything reacts to 'open'
      reconcileEnrolledMemberships(manager, internal, frame.enrolled ?? [])
      // the heads seed the stream cursors AFTER the reconcile re-indexed the enrolled rooms — a replaced room's
      // transient last-cover prune must not eat the seed (no frame can land inside this synchronous block)
      applyStreamHeads(manager, internal, frame.heads)
      notifyConnection(internal)
      // every landed claim is a successful connect — `onConnect` fires each time, the props' connectionIndex tells
      // the first (0) from a repeat (> 0)
      fireConnectionLifecycle(internal, 'onConnect')
      // count the successful claim AFTER the callbacks read it — the first connect fires with connectionIndex 0
      internal.connectIndex++
      flushQueuedSends(manager)
      return
    }
    case 'claimErr': {
      const internal =
        manager.connectionsByCid.get(frame.cid) ??
        (frame.ticket !== undefined
          ? heldInternals(manager).find((candidate) => candidate.ticket === frame.ticket)
          : undefined)
      if (!internal || internal.disposed) {
        // an upgrade-connect refusal (a throwing enroller, a lapsed seed) answers on a cid the client never learned
        // — hand over to the ticket path NOW instead of stalling into the upgrade timeout (the plain fetch + claim
        // surface the same typed error)
        const pendingUpgrade = manager.pendingUpgradeConnect
        if (pendingUpgrade && !internal) {
          manager.pendingUpgradeConnect = undefined
          pendingUpgrade.resolve('failed')
        }
        return
      }
      internal.status = 'error'
      internal.error = internal.channel._Error.from(safeJsonParse(frame.error))
      // a claimErr is an ANSWERED deny — terminal, nothing retries it: fail this connection's unsent queued sends
      // now with the typed error instead of letting them dangle into a generic timeout
      for (const pending of [...manager.pendingSends.values()]) {
        if (!pending.sent && resolveInternal(pending.internal) === internal) {
          failPendingSend(manager, pending, internal.error)
        }
      }
      // a failed refresh-claim must not leave the PREVIOUS server-side connection alive — close it like a landed
      // claim would (the client considers this connection down either way)
      for (const oldCid of internal.refreshOldCids) {
        if (oldCid !== internal.cid && manager.wsStatus === 'open') {
          sendFrame(manager, { t: 'close', cid: oldCid })
        }
        if (manager.connectionsByCid.get(oldCid) === internal && oldCid !== internal.cid) {
          manager.connectionsByCid.delete(oldCid)
        }
      }
      internal.refreshOldCids.clear()
      notifyConnection(internal)
      fireConnectionLifecycle(internal, 'onError')
      return
    }
    case 'reply': {
      const pending = manager.pendingSends.get(frame.id)
      if (!pending) {
        return
      }
      manager.pendingSends.delete(frame.id)
      clearTimeout(pending.timeoutTimer)
      pending.resolve(frame.data)
      return
    }
    case 'sendErr': {
      const pending = manager.pendingSends.get(frame.id)
      if (!pending) {
        return
      }
      failPendingSend(manager, pending, pending.handler._Error.from(safeJsonParse(frame.error)))
      return
    }
    case 'closed': {
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal || internal.disposed) {
        return
      }
      // server-initiated close (kick): dispose it — declarative holders come back on their own (the dispose schedules
      // the auto-revive; the connector re-judges), imperative ones wait for reconnectAll()/remount. A kick without a
      // right revoked is therefore only an interruption — the real ban lives in the connector.
      disposeInternal(internal, { silent: false })
      return
    }
    case 'refresh': {
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal || internal.disposed) {
        return
      }
      // a refresh BYPASSES resume by design — it exists to re-run the connectors, and a socket drop mid-refresh must
      // not revive the identity the server asked to rebuild: void the credential before the re-connect (the fresh
      // claim mints a new one)
      internal.resumeKey = undefined
      internal.personalCursor = 0
      internal.resumePending = false
      refreshInternal(internal)
      return
    }
    case 'joined': {
      const membership = manager.pendingJoins.get(frame.id)
      if (!membership || membership.disposed) {
        return
      }
      const spaceTransformer = membership.space._getSocketTransformer()
      // parse BEFORE any mutation — a transformer throw (schema drift on a rolling deploy) must not leave the
      // membership half-updated (unindexed, stale keys, a consumed join id)
      const parsedRooms = frame.rooms.map((room) => spaceTransformer.parse(room))
      manager.pendingJoins.delete(frame.id)
      membership.joinId = undefined
      // re-index rooms: drop the old set, install the admitted rooms, index the new
      unindexMembershipRooms(membership)
      membership.roomsSerialized = frame.rooms
      membership.rooms = parsedRooms
      const channelKey = getChannelKey(membership.channel)
      membership.roomKeys = frame.rooms.map((room) => getRoomKey(channelKey, membership.spaceName, room))
      indexMembershipRooms(membership)
      // the freshly-entered streams' cursors seed from the join's heads (a resumable channel) — AFTER the re-index,
      // so a re-join's transient last-cover prune cannot eat the seed; no frame can land inside this synchronous block
      const joinedConnection = membershipConnection(membership)
      if (joinedConnection) {
        applyStreamHeads(manager, joinedConnection, frame.heads)
      }
      membership.status = 'joined'
      membership.error = null
      membership.everJoined = true
      // a successful join resets the auto-rejoin pacing — the next space kick starts a fresh backoff run
      membership.rejoinAttempt = 0
      membership.preventRejoin = false
      // every landed join is an enter — `onEnter` fires each time, the props' membershipIndex tells the first (0)
      // from a replay (> 0); the events carry the SAME value, so capture it before the increment
      const membershipIndex = membership.joinIndex
      fireMembershipLifecycle(membership, 'onEnter')
      // count the successful join AFTER the callbacks read it — the first join fires with membershipIndex 0
      membership.joinIndex++
      const cid = membershipConnection(membership)?.cid
      // the full-path truth table, same as the lifecycle defaults: not a resume, gapless only on the first entry
      const outcome = { rooms: membership.rooms, resumed: false, gapless: membershipIndex === 0 }
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientSettled', cid, membershipIndex, outcome)
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientSuccess', cid, membershipIndex, outcome)
      notifyMembership(membership)
      // a queued space-handler send waiting on this membership can go now
      flushQueuedSends(manager)
      return
    }
    case 'joinErr': {
      const membership = manager.pendingJoins.get(frame.id)
      if (!membership || membership.disposed) {
        return
      }
      manager.pendingJoins.delete(frame.id)
      membership.joinId = undefined
      const joinError = membership.space._Error.from(safeJsonParse(frame.error))
      membership.status = 'error'
      membership.error = joinError
      // a hard deny — the join is not replayed on reconnects until reconnectAll()/remount
      if (joinError.preventRetry) {
        membership.preventRejoin = true
      }
      const cid = membershipConnection(membership)?.cid
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientSettled', cid, membership.joinIndex, { error: joinError })
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientError', cid, membership.joinIndex, { error: joinError })
      // a joinErr is an ANSWERED deny — the cascade will never flush a send gated on this membership: fail its
      // unsent sends now with the typed join error instead of letting them dangle into a generic timeout
      for (const pending of [...manager.pendingSends.values()]) {
        if (pending.membership && resolveMembership(pending.membership) === membership && !pending.sent) {
          failPendingSend(manager, pending, joinError)
        }
      }
      notifyMembership(membership)
      return
    }
    case 'enrolled': {
      // an imperative `space.enroll` grew this connection's server-side enrollment — the frame carries the FULL new
      // enrolled set of the space; the regular enrolled-membership machinery takes it from here
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal || internal.disposed) {
        return
      }
      applyEnrolledSpaces(manager, internal, [{ space: frame.space, rooms: frame.rooms }])
      // heads after the re-index — same ordering rule as the claimed/joined seeds
      applyStreamHeads(manager, internal, frame.heads)
      return
    }
    case 'left': {
      // a space kick: the server removed this connection from some rooms of `space`; shrink those memberships' rooms
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal) {
        return
      }
      const removedSet = new Set(frame.rooms)
      for (const membership of [...manager.memberships.values()]) {
        if (membership.disposed || membership.spaceName !== frame.space) {
          continue
        }
        if (membershipConnection(membership) !== resolveInternal(internal)) {
          continue
        }
        const keptIndices = membership.roomsSerialized
          .map((serialized, index) => ({ serialized, index }))
          .filter(({ serialized }) => !removedSet.has(serialized))
        if (keptIndices.length === membership.roomsSerialized.length) {
          continue
        }
        unindexMembershipRooms(membership)
        membership.roomsSerialized = keptIndices.map(({ serialized }) => serialized)
        membership.rooms = keptIndices.map(({ index }) => membership.rooms[index])
        const channelKey = getChannelKey(membership.channel)
        membership.roomKeys = membership.roomsSerialized.map((room) =>
          getRoomKey(channelKey, membership.spaceName, room),
        )
        indexMembershipRooms(membership)
        // status stays 'joined' — the membership lives, its room set just shrank (possibly to [])
        notifyMembership(membership)
        // the use-nature: a declaratively-held membership replays its join after the policy's wait — the joiner (and
        // its guards) stays the judge; an imperative join() stays shrunk until its owner re-joins
        scheduleDeclarativeRejoin(membership)
      }
      return
    }
    case 'msg': {
      // a resumable channel's frame advances its STREAM cursor BEFORE the dispatch (delivery is the fact that
      // matters; except-filtering and a handler module not being loaded do not un-deliver the frame). A frame with
      // `cid` is that connection's personal stream; a topic frame advances the channel-shared cursor — `rcid` (a
      // replayed topic frame) keeps its topic identity. Monotonic max: a replayed frame must not drag a cursor back
      if (frame.tseq !== undefined) {
        if (frame.cid !== undefined) {
          const internal = manager.connectionsByCid.get(frame.cid)
          if (internal && !internal.disposed && internal.resumeKey !== undefined) {
            internal.personalCursor = Math.max(internal.personalCursor, frame.tseq)
          }
        } else {
          const cursorKey = `${frame.channel}|${msgStreamWireKey(frame)}`
          manager.topicCursors.set(cursorKey, Math.max(manager.topicCursors.get(cursorKey) ?? 0, frame.tseq))
        }
      }
      await dispatchIncomingMessage(manager, frame)
      return
    }
    case 'resumed': {
      handleResumedFrame(manager, frame)
      return
    }
    case 'resumeErr': {
      // the uniform refusal — whatever the reason (unknown cid, wrong key, lapsed record, a kick), the answer is the
      // ordinary FULL connect for this one connection: the connector re-judges, the memberships re-join
      const internal = manager.connectionsByCid.get(frame.cid)
      if (!internal || internal.disposed || !internal.resumePending) {
        return
      }
      internal.resumePending = false
      internal.resumeKey = undefined
      internal.personalCursor = 0
      void connectInternal(internal, { isReconnect: true })
      return
    }
  }
}

/**
 * Is this space opted OUT of its channel's resume (`resumable: false` — a top-level space option, on both bundles)? Its
 * rooms are not in the connection passport and a resume does not restore them — the client re-joins them itself.
 */
const spaceResumeOptedOut = (space: AnyPoint): boolean =>
  mergeSpaceOptions(space._defaultSpaceOptions, space._spaceOptions).resumable === false

/**
 * Seed the client's stream cursors from a server `heads` announcement (claimed / joined / enrolled / resumed) — an
 * EXACT set, not a max: the server's head is authoritative (a rebuilt stream may have restarted the numbering, and only
 * the set-to-head keeps the client from offering a cursor from a stream that no longer exists). 'p' is the connection's
 * personal cursor; every other key is a channel-shared topic cursor.
 */
const applyStreamHeads = (
  manager: SocketManager,
  internal: InternalConnection,
  heads: Record<string, number> | undefined,
): void => {
  if (!heads) {
    return
  }
  for (const [streamKey, head] of Object.entries(heads)) {
    if (typeof head !== 'number' || !Number.isFinite(head)) {
      continue
    }
    if (streamKey === 'p') {
      internal.personalCursor = head
    } else {
      manager.topicCursors.set(`${internal.channel.name}|${streamKey}`, head)
    }
  }
}

/**
 * The cursor map a resume entry offers — 'c' and 'p' always, plus the space-wide and room streams of every membership
 * riding this connection (enrolled included). Opt-out spaces are not offered: a resume never restores them — their
 * memberships re-join and their streams do not exist.
 */
const buildResumeCursors = (manager: SocketManager, internal: InternalConnection): Record<string, number> => {
  const channelName = internal.channel.name
  const cursors: Record<string, number> = {
    c: manager.topicCursors.get(`${channelName}|c`) ?? 0,
    p: internal.personalCursor,
  }
  for (const membership of manager.memberships.values()) {
    if (membership.disposed || membership.mergedInto || membership.connectionKey !== internal.key) {
      continue
    }
    if (spaceResumeOptedOut(membership.space)) {
      continue
    }
    const spaceKey = `s:${membership.spaceName}`
    cursors[spaceKey] = manager.topicCursors.get(`${channelName}|${spaceKey}`) ?? 0
    for (const roomSerialized of membership.roomsSerialized) {
      const roomKey = `r:${membership.spaceName}:${roomSerialized}`
      cursors[roomKey] = manager.topicCursors.get(`${channelName}|${roomKey}`) ?? 0
    }
  }
  return cursors
}

/**
 * A `resumed` answer landed — the server revived the connection in place: identity, rooms and subscriptions are back
 * with NO connector/joiner/enroller run. The frame carries PER-STREAM verdicts; each callback level reads the streams
 * that feed it — `onConnect` the channel-level pair ('c' ∧ 'p'), each membership's `onEnter` its own rooms and its
 * space-wide stream — so a gap in one busy room never forces the quiet ones (or the global data) to refetch. Mark the
 * memberships synced BEFORE anything notifies (the cascade heartbeat must not replay their joins), re-seed the cursors
 * from the heads, fire the lifecycle with the resume markers, and let the queued sends flush. The replayed `msg` frames
 * follow this frame as one merge-ordered tail and ride the ordinary dispatch.
 */
const handleResumedFrame = (manager: SocketManager, frame: SocketServerFrame & { t: 'resumed' }): void => {
  const internal = manager.connectionsByCid.get(frame.cid)
  if (!internal || internal.disposed) {
    // the server just revived a connection nobody holds anymore — close it instead of leaking a server-side entry
    sendFrame(manager, { t: 'close', cid: frame.cid })
    return
  }
  if (!internal.resumePending) {
    return
  }
  internal.resumePending = false
  internal.claimed = true
  internal.status = 'open'
  internal.error = null
  internal.reviveAttempt = 0
  // the verdict map came off the wire — read it defensively (as unknown: the type is a claim, not a fact), and
  // re-seed every named cursor from its head FIRST (authoritative), so the replayed frames advance them monotonically
  // from the right baseline
  const streamVerdicts: Partial<Record<string, { gapless: boolean; head: number }>> = {}
  const heads: Record<string, number> = {}
  const rawStreams: unknown = frame.streams
  if (rawStreams !== null && typeof rawStreams === 'object' && !Array.isArray(rawStreams)) {
    for (const [streamKey, verdict] of Object.entries(rawStreams as Record<string, unknown>)) {
      const shaped = (verdict ?? {}) as { gapless?: unknown; head?: unknown }
      if (typeof shaped.head !== 'number' || !Number.isFinite(shaped.head)) {
        continue
      }
      streamVerdicts[streamKey] = { gapless: shaped.gapless === true, head: shaped.head }
      heads[streamKey] = shaped.head
    }
  }
  applyStreamHeads(manager, internal, heads)
  // keep the bits for the dispatch — a replayed frame's props carry ITS stream's verdict
  internal.resumeVerdicts = Object.fromEntries(
    Object.entries(streamVerdicts).map(([streamKey, verdict]) => [streamKey, verdict?.gapless === true]),
  )
  const channelGapless = (streamVerdicts.c?.gapless ?? false) && (streamVerdicts.p?.gapless ?? false)
  // pass 1 marks every restored membership SYNCED (lastCid) before anything can run the cascade heartbeat — a
  // mid-loop poll finding an unmarked membership on an open connection would replay its join, which is exactly what a
  // resume exists to skip. `disposeMembership` polls, so the opt-out disposals wait for pass 2.
  const enrolledOptOutsToDispose: InternalMembership[] = []
  for (const membership of [...manager.memberships.values()]) {
    if (membership.disposed || membership.mergedInto || membership.connectionKey !== internal.key) {
      continue
    }
    if (spaceResumeOptedOut(membership.space)) {
      // the opt-out space's rooms were not restored. A joined membership re-joins itself (`lastCid` stays unset — the
      // cascade replays the join, the joiner re-judges); an ENROLLED one has no join to replay and its server half is
      // gone — drop it (the announced set no longer includes it, exactly like a reconcile would)
      if (membership.enrolled) {
        enrolledOptOutsToDispose.push(membership)
      }
      continue
    }
    if (membership.enrolled) {
      // restored with the passport; no lifecycle — an enrolled membership never fires onEnter
      membership.lastCid = internal.cid
      if (membership.status !== 'joined') {
        membership.status = 'joined'
        notifyMembership(membership)
      }
      continue
    }
    if (membership.everJoined && membership.roomsSerialized.length > 0 && !membership.preventRejoin) {
      // the passport held exactly the rooms this membership knows — mark it synced to the surviving cid so the
      // cascade does NOT resend its join, and fire the enter with the resume markers. The verdict is THIS
      // membership's own: AND over the streams that feed it — its rooms and its space-wide stream. A room the server
      // did not answer for is being revoked (the queued `left` frames follow the replay) — it does not vote
      membership.lastCid = internal.cid
      membership.status = 'joined'
      membership.error = null
      const verdictParts: boolean[] = []
      const spaceVerdict = streamVerdicts[`s:${membership.spaceName}`]
      if (spaceVerdict !== undefined) {
        verdictParts.push(spaceVerdict.gapless)
      }
      for (const roomSerialized of membership.roomsSerialized) {
        const roomVerdict = streamVerdicts[`r:${membership.spaceName}:${roomSerialized}`]
        if (roomVerdict !== undefined) {
          verdictParts.push(roomVerdict.gapless)
        }
      }
      // zero voting streams (every room revoked during the park — the queued `left` frames follow the replay) folds
      // to `true` on purpose: the revocation arrives as its own signal, and a pre-emptive refetch of rooms about to
      // vanish would be work thrown away
      const membershipGapless = verdictParts.every(Boolean)
      const membershipIndex = membership.joinIndex
      fireMembershipLifecycle(membership, 'onEnter', { resumed: true, gapless: membershipGapless })
      membership.joinIndex++
      // the resume IS this membership's landed (re-)entry — the join family closes Settled → Success with the same
      // markers the callback read; no Start: no join frame was sent (a refused resume falls back to the full join
      // path, whose family runs the complete cycle)
      const outcome = { rooms: membership.rooms, resumed: true, gapless: membershipGapless }
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientSettled', frame.cid, membershipIndex, outcome)
      emitSpaceJoinEvent(membership, 'pointSpaceJoinClientSuccess', frame.cid, membershipIndex, outcome)
      notifyMembership(membership)
      continue
    }
    // never-joined / zero-room / hard-denied memberships held no rooms, so the passport has nothing for them — the
    // cascade takes them through the ordinary join path on this cid
  }
  for (const membership of enrolledOptOutsToDispose) {
    disposeMembership(membership, { sendLeave: false })
  }
  notifyConnection(internal)
  const connectionIndex = internal.connectIndex
  fireConnectionLifecycle(internal, 'onConnect', { resumed: true, gapless: channelGapless })
  internal.connectIndex++
  // the resume IS this connection's landed (re-)entry — the connect family closes Settled → Success with the same
  // markers the callback read; no Start: the resume is one shared frame at the socket's open, not a per-connection
  // connect operation (a refused resume falls back into the full connect, whose family runs the complete cycle)
  const eventMeta = { point: internal.channel.id }
  for (const name of ['pointChannelConnectClientSettled', 'pointChannelConnectClientSuccess'] as const) {
    internal.channel._emit(
      name,
      {
        input: internal.input,
        point: internal.channel,
        connectionId: frame.cid,
        connectionIndex,
        resumed: true,
        gapless: channelGapless,
        error: undefined,
      },
      eventMeta,
    )
  }
  flushQueuedSends(manager)
}

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw)
  } catch {
    return { message: raw }
  }
}

/**
 * Is this connection excluded from a space push by the frame's `except`/`exceptRooms`? A connection is excluded by cid,
 * or when any of its memberships of the pushed space holds an excluded room.
 */
const isConnectionExceptedFromSpaceFrame = (
  manager: SocketManager,
  frame: SocketServerFrame & { t: 'msg' },
  internal: InternalConnection,
): boolean => {
  if (
    frame.exceptConnectionIds !== undefined &&
    internal.cid !== undefined &&
    frame.exceptConnectionIds.includes(internal.cid)
  ) {
    return true
  }
  if (frame.exceptRooms === undefined || frame.exceptRooms.length === 0) {
    return false
  }
  for (const membership of manager.memberships.values()) {
    if (membership.disposed || membership.spaceName !== frame.space) {
      continue
    }
    if (membershipConnection(membership) !== internal) {
      continue
    }
    if (membership.roomsSerialized.some((room) => frame.exceptRooms!.includes(room))) {
      return true
    }
  }
  return false
}

/**
 * The wire stream key a `msg` frame belongs to — `cid` marks the personal stream ('p'), otherwise the topic its shape
 * names ('c' / 's:<space>' / 'r:<space>:<room>'); `rcid` (a replayed topic frame) deliberately does not participate:
 * the replay narrows dispatch, never the stream identity.
 */
const msgStreamWireKey = (frame: SocketServerFrame & { t: 'msg' }): string =>
  frame.cid !== undefined
    ? 'p'
    : frame.space === undefined
      ? 'c'
      : frame.room === undefined
        ? `s:${frame.space}`
        : `r:${frame.space}:${frame.room}`

const dispatchIncomingMessage = async (
  manager: SocketManager,
  frame: SocketServerFrame & { t: 'msg' },
): Promise<void> => {
  const channelKey = `${manager.scope}:${frame.channel}`
  // a space push: room-scoped routes by room key; space-wide (no room) routes to every membership of the space
  if (frame.space !== undefined) {
    const memberships = ((): InternalMembership[] => {
      if (frame.room !== undefined) {
        const roomKey = getRoomKey(channelKey, frame.space, frame.room)
        return [...(manager.membershipsByRoomKey.get(roomKey) ?? [])]
      }
      return [...manager.memberships.values()].filter((membership) => membership.spaceName === frame.space)
    })()
    // ONE frame = ONE reply: group the covering memberships by their connection — the listeners of every covering
    // membership fire (two hooks in one room both hear the push), but the `.clientReply` responder runs once per
    // connection per frame (the server counts frames sent, not components mounted)
    const byConnection = new Map<InternalConnection, InternalMembership[]>()
    for (const membership of memberships) {
      if (membership.disposed) {
        continue
      }
      const internal = membershipConnection(membership)
      if (!internal) {
        continue
      }
      // an addressed space push (`connectionId` in the target) — or a topic frame REPLAYED for one connection
      // (`rcid`, a resume) — only memberships riding that connection
      const addressedCid = frame.cid ?? frame.rcid
      if (addressedCid !== undefined && internal.cid !== addressedCid) {
        continue
      }
      if (isConnectionExceptedFromSpaceFrame(manager, frame, internal)) {
        continue
      }
      const list = byConnection.get(internal) ?? []
      list.push(membership)
      byConnection.set(internal, list)
    }
    for (const [internal, covering] of byConnection) {
      await dispatchIncomingMessageToMemberships(manager, frame, covering, internal)
    }
    return
  }
  const targets = ((): InternalConnection[] => {
    // an addressed push — or a channel-wide frame REPLAYED for one connection (`rcid`, a resume)
    const addressedCid = frame.cid ?? frame.rcid
    if (addressedCid) {
      const byCid = manager.connectionsByCid.get(addressedCid)
      return byCid ? [byCid] : []
    }
    // no space and no cid — every local connection of the channel (a channel-wide push)
    return [...new Set([...manager.connections.values()].map(resolveInternal))].filter(
      (candidate) => !candidate.disposed && candidate.channelKey === channelKey,
    )
  })()
  for (const internal of targets) {
    if (internal.disposed) {
      continue
    }
    if (
      frame.exceptConnectionIds !== undefined &&
      internal.cid !== undefined &&
      frame.exceptConnectionIds.includes(internal.cid)
    ) {
      continue
    }
    await dispatchIncomingMessageToConnection(manager, frame, internal)
  }
}

const dispatchIncomingMessageToConnection = async (
  manager: SocketManager,
  frame: SocketServerFrame & { t: 'msg' },
  internal: InternalConnection,
): Promise<void> => {
  const handlerId = `${manager.scope}:clientHandler:${frame.handler}`
  const handler = clientHandlerPointsSsItem.get().get(handlerId)
  if (!handler) {
    // the handler's module is not loaded on this client — nothing to wake
    return
  }
  await runIncomingMessageDispatch({
    manager,
    frame,
    internal,
    handler,
    roomPart: {},
    instanceListeners: internal.handlerListeners.get(handler.id),
  })
}

/**
 * The shared tail of a push dispatch — the message EVENT and the `.clientReply` AUTO-RESPONDER, decoupled on purpose:
 * the listeners fire immediately on arrival and never wait for (or depend on) the responder, so a slow or throwing
 * `.clientReply` cannot delay or suppress the client's reaction to a push. A throwing LISTENER is the listener's own
 * problem — logged like every lifecycle callback, never the handler's error. The responder computes the reply, answers
 * the collect window (the data, or the typed error — the server counts both), and emits the `pointHandlerClient*`
 * events (`output` = the reply; listener throws never reach them).
 */
const runIncomingMessageDispatch = async ({
  manager,
  frame,
  internal,
  handler,
  roomPart,
  instanceListeners,
}: {
  manager: SocketManager
  frame: SocketServerFrame & { t: 'msg' }
  internal: InternalConnection
  handler: AnyPoint
  /** `{}` for a channel handler, `{ room }` (parsed with the SPACE transformer) for a space handler */
  roomPart: { room?: RoomUnknown }
  instanceListeners: Set<ClientHandlerListenerFn<any, any>> | undefined
}): Promise<void> => {
  const transformer = handler._getSocketTransformer()
  const input = frame.input === undefined ? {} : transformer.parse<InputRawUnknown>(frame.input)
  const eventMeta = { point: handler.id, connection: internal.cid }
  handler._emit('pointHandlerClientStart', { input, point: handler, connectionId: internal.cid ?? '' }, eventMeta)
  // a replayed frame's props carry its stream's verdict — the one-liner policy `if (replayed && !replayed.gapless)`
  const replayed =
    frame.rp === true ? { gapless: internal.resumeVerdicts?.[msgStreamWireKey(frame)] === true } : (false as const)
  const notifyListeners = async (): Promise<void> => {
    const listenerProps = {
      message: input,
      connection: internal.facade,
      point: handler,
      replayed,
      ...roomPart,
    }
    const moduleLevel = mergeClientHandlerOptions(
      handler._defaultClientHandlerOptions,
      handler._clientHandlerOptions,
    ).onMessageFromServer
    for (const listener of [...(moduleLevel ? [moduleLevel] : []), ...(instanceListeners ?? [])]) {
      try {
        await listener(listenerProps as never)
      } catch (error) {
        getLogFnForPoint(handler)({
          level: 'error',
          category: ['point0', 'socket'],
          message: `An onMessageFromServer listener threw (point ${handler.id})`,
          error,
        })
      }
    }
  }
  const runReplier = async (): Promise<void> => {
    let replySent = false
    try {
      let data: ReplyUnknown = undefined
      if (handler._clientReplyFn) {
        data = await handler._clientReplyFn({
          message: input,
          connection: internal.facade,
          replayed,
          ...roomPart,
        })
      }
      if (frame.mid && internal.cid) {
        // build the frame BEFORE marking sent — a serialize throw must still answer the window with the typed error
        const replyFrame: SocketClientFrame = {
          t: 'reply',
          id: frame.mid,
          cid: internal.cid,
          ...(data === undefined ? {} : { data: transformer.stringify(data) }),
        }
        replySent = true
        sendFrame(manager, replyFrame)
      }
      handler._emit(
        'pointHandlerClientSettled',
        { input, point: handler, connectionId: internal.cid ?? '', output: data, error: undefined },
        eventMeta,
      )
      handler._emit(
        'pointHandlerClientSuccess',
        { input, point: handler, connectionId: internal.cid ?? '', output: data, error: undefined },
        eventMeta,
      )
    } catch (error) {
      const ErrorClass = handler._Error
      const error0 = ErrorClass.from(error)
      // a collected push must not wait for an answer that will never come — an errored `.clientReply` still answers,
      // as an error the server counts toward the window
      if (frame.mid && internal.cid && !replySent) {
        sendFrame(manager, {
          t: 'reply',
          id: frame.mid,
          cid: internal.cid,
          error: JSON.stringify(ErrorClass.serializePublic(error0)),
        })
      }
      handler._emit(
        'pointHandlerClientSettled',
        { input, point: handler, connectionId: internal.cid ?? '', output: undefined, error: error0 },
        eventMeta,
      )
      handler._emit(
        'pointHandlerClientError',
        { input, point: handler, connectionId: internal.cid ?? '', output: undefined, error: error0 },
        eventMeta,
      )
    }
  }
  await Promise.all([runReplier(), notifyListeners()])
}

/**
 * Dispatch a space push to one CONNECTION: same decoupled tail as the channel dispatch, with the parsed `room` added to
 * both the `.clientReply` props and the listener props. The listeners live on the MEMBERSHIPS — every covering one
 * contributes its set — while the responder tail runs once (one frame = one reply).
 */
const dispatchIncomingMessageToMemberships = async (
  manager: SocketManager,
  frame: SocketServerFrame & { t: 'msg' },
  memberships: InternalMembership[],
  internal: InternalConnection,
): Promise<void> => {
  const handlerId = `${manager.scope}:clientHandler:${frame.handler}`
  const handler = clientHandlerPointsSsItem.get().get(handlerId)
  if (!handler || memberships.length === 0) {
    return
  }
  const spaceTransformer = memberships[0].space._getSocketTransformer()
  const room = frame.room === undefined ? undefined : spaceTransformer.parse(frame.room)
  const instanceListeners = new Set<ClientHandlerListenerFn<any, any>>()
  for (const membership of memberships) {
    for (const listener of membership.handlerListeners.get(handler.id) ?? []) {
      instanceListeners.add(listener)
    }
  }
  await runIncomingMessageDispatch({
    manager,
    frame,
    internal,
    handler,
    roomPart: room === undefined ? {} : { room },
    instanceListeners,
  })
}

// ------------------------------------------------------------------------------------------------------------------
// React surface — hooks used by the Point0 class methods, plus the socket keep-open component
// ------------------------------------------------------------------------------------------------------------------

/** Subscribe a React consumer to a connection's state. Returns the facade; re-renders on state changes. */
export const useSocketConnection = (
  channel: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: ExtraUseConnectionOptions<any, any> | undefined,
): AnyClientChannelConnection => {
  const isServer = _point0_env.side.is.server
  const enabled = options?.enabled !== false && !isServer
  const transformer = channel._getSocketTransformer()
  const inputKey = transformer.stringify(input ?? {})
  const optionsRef = React.useRef(options)
  optionsRef.current = options
  const [facade, setFacade] = React.useState<AnyClientChannelConnection | undefined>(undefined)
  React.useEffect(() => {
    if (!enabled) {
      setFacade(undefined)
      return
    }
    const connection = connectToChannel(channel, input ?? {}, optionsRef.current, { declarative: true })
    setFacade(connection)
    return () => {
      connection.disconnect()
    }
    // reconnect only when the target changes — the input identity is its serialized form
  }, [channel.id, inputKey, enabled])
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!facade) {
        return () => {}
      }
      const hold = holdsByFacadeSsItem.get().get(facade)
      if (!hold) {
        return () => {}
      }
      const internal = resolveInternal(hold.internal)
      internal.listeners.add(listener)
      return () => {
        resolveInternal(hold.internal).listeners.delete(listener)
        internal.listeners.delete(listener)
      }
    },
    [facade],
  )
  const getSnapshot = React.useCallback(() => {
    if (!facade) {
      return -1
    }
    const hold = holdsByFacadeSsItem.get().get(facade)
    return hold ? resolveInternal(hold.internal).version : -1
  }, [facade])
  React.useSyncExternalStore(subscribe, getSnapshot, () => -1)
  return facade ?? createDeadFacade(channel, input ?? {}, isServer || enabled ? 'connecting' : 'closed')
}

/**
 * Subscribe a React consumer to a clientHandler on a connection (a space handler's: on a membership). `boundRoom` —
 * what `handler(room)` bound — narrows the listener to that room's pushes.
 */
export const useSocketOnMessage = (
  handler: AnyPoint,
  connection: AnyClientChannelConnection | undefined,
  listener: ClientHandlerListenerFn<any, any>,
  options?: { enabled?: boolean },
  boundRoom?: RoomUnknown,
): void => {
  const listenerRef = React.useRef(listener)
  listenerRef.current = listener
  const isServer = _point0_env.side.is.server
  const enabled = options?.enabled !== false
  const connectionId = connection?.id
  const connectionStatus = connection?.status
  // the serialized bound room — a fresh room literal per render must not re-attach the listener
  const space = handler._spacePoint
  const boundRoomKey = space && boundRoom !== undefined ? space._getSocketTransformer().stringify(boundRoom) : undefined
  React.useEffect(() => {
    if (isServer || !enabled) {
      return
    }
    let removed = false
    let remover: { remove: () => void } | undefined
    try {
      remover = addClientHandlerListener(handler, connection, (input) => listenerRef.current(input), boundRoom)
    } catch {
      // no live connection yet (still connecting) — the status dep below re-runs the effect when it lands
      return
    }
    return () => {
      if (!removed) {
        removed = true
        remover.remove()
      }
    }
  }, [handler.id, connectionId, connectionStatus, isServer, enabled, boundRoomKey])
}

// the context is a property of the POINT itself (a lazy per-instance cache, like `_callableHandlerCache`) — the
// Provider and the consumer both reach it through the same module-level point object, on ANY executor: no registry,
// no side, no store
/**
 * The channel's own React context (a lazy per-point cache) — `<channel.Connection>` provides through it,
 * {@link useAmbientChannelConnection} reads.
 */
export const getChannelReactContext = (channel: AnyPoint): React.Context<AnyClientChannelConnection | undefined> =>
  channel._getReactConnectionContext()

/** The ambient connection for a channel — what `<channel.Connection>` provided above, if anything. */
export const useAmbientChannelConnection = (channel: AnyPoint): AnyClientChannelConnection | undefined => {
  return React.useContext(getChannelReactContext(channel))
}

// ------------------------------------------------------------------------------------------------------------------
// space membership — React surface + resolution (mirrors the channel connection surface, one level down)
// ------------------------------------------------------------------------------------------------------------------

/**
 * Find the live membership of a space for an input (the same key holds/dedup use), riding the connection resolved by
 * `channelInput` / the ambient connection / the single live one. `undefined` when none matches — a pure lookup, no
 * hold, nothing joins.
 */
const resolveMembershipByInput = (
  space: AnyPoint,
  input: InputRawUnknown | undefined,
  channelInput: InputRawUnknown | undefined,
  ambientConnection: AnyClientChannelConnection | undefined,
): InternalMembership | undefined => {
  let internal: InternalConnection
  try {
    internal = resolveMembershipConnection(space, channelInput, ambientConnection)
  } catch {
    return undefined
  }
  const manager = internal.manager
  const spaceTransformer = space._getSocketTransformer()
  const key = getMembershipKey(internal.key, space.name, stringifyOrThrow(spaceTransformer, input ?? {}, space.id))
  const existing = manager.memberships.get(key)
  const live = existing ? resolveMembership(existing) : undefined
  return live && !live.disposed ? live : undefined
}

/** Look up a live membership by input, or `undefined`. Client-side; always `undefined` on the server. */
export const getSpaceMembershipOrUndefined = (
  space: AnyPoint,
  input: InputRawUnknown | undefined | void,
  channelInput?: InputRawUnknown | undefined,
): AnyClientSpaceMembership | undefined => {
  if (_point0_env.side.is.server) {
    return undefined
  }
  return resolveMembershipByInput(space, (input ?? {}) as InputRawUnknown, channelInput, undefined)?.facade
}

/**
 * Every live membership facade of a space ON THIS CLIENT — the manager's memberships map filtered to this space,
 * disposed ones out, merge chains resolved and deduped (`space.memberships.client.list()`). ENROLLED memberships are
 * in: they are born from the server's `claimed`/`enrolled` announcement with no join behind them, so no input looks
 * them up — this is how a space with no `.joiner` is read one membership at a time. Purely a lookup: no hold is added,
 * nothing joins. Empty on the server.
 */
export const listSpaceMembershipFacades = (space: AnyPoint): AnyClientSpaceMembership[] => {
  if (_point0_env.side.is.server) {
    return []
  }
  const manager = socketManagersSsItem.get().get(space.scope)
  if (!manager) {
    return []
  }
  const seen = new Set<InternalMembership>()
  const facades: AnyClientSpaceMembership[] = []
  for (const membership of manager.memberships.values()) {
    const live = resolveMembership(membership)
    if (live.disposed || live.spaceName !== space.name || seen.has(live)) {
      continue
    }
    seen.add(live)
    facades.push(live.facade)
  }
  return facades
}

/**
 * Find the live membership that covers a bound ROOM — the space-handler binder's room form. `membershipsByRoomKey` is
 * indexed per CHANNEL (`${scope}:${channelName}|${space}|${room}`), so the covering memberships may ride several
 * connections: an explicit `channelInput` picks one, otherwise the room must be covered under exactly one connection
 * (several = an ambiguous address, a throw). A held membership wins over a lingering one; which of several memberships
 * on the same connection covers the room does not matter — the room IS the address, and the frame carries cid + room.
 * `undefined` when no live membership holds the room. A pure lookup: no hold, nothing joins.
 */
const resolveMembershipByRoom = (
  space: AnyPoint,
  room: InputRawUnknown,
  channelInput: InputRawUnknown | undefined,
): InternalMembership | undefined => {
  const channel = space._channelPoint
  if (!channel) {
    throw new Error(`Space ${space.id} has no channel — a space grows from a channel point`)
  }
  // runs from both-sides render helpers too — no client store (the server) degrades to "nothing resolved"
  const manager = socketManagersSsItem.getOrUndefined()?.get(space.scope)
  if (!manager) {
    return undefined
  }
  const roomSerialized = stringifyOrThrow(space._getSocketTransformer(), room, space.id)
  const roomKey = getRoomKey(getChannelKey(channel), space.name, roomSerialized)
  const covering = [...new Set([...(manager.membershipsByRoomKey.get(roomKey) ?? [])].map(resolveMembership))].filter(
    (membership) =>
      !membership.disposed &&
      membership.status === 'joined' &&
      membership.roomsSerialized.includes(roomSerialized) &&
      membershipConnection(membership) !== undefined,
  )
  const scoped =
    channelInput === undefined
      ? covering
      : ((): InternalMembership[] => {
          const internal = resolveBoundTargetInternal(channel, channelInput)
          return internal ? covering.filter((membership) => membershipConnection(membership) === internal) : []
        })()
  if (scoped.length === 0) {
    return undefined
  }
  if (new Set(scoped.map(membershipConnection)).size > 1) {
    throw new Error(
      `Several live connections of channel ${channel.id} cover the room bound for space ${space.name} — pass the channel input as the second argument`,
    )
  }
  return scoped.find((membership) => membership.holds.size > 0) ?? scoped[0]
}

/**
 * The one resolution rule for a space handler's client methods. The binder takes a MEMBERSHIP FACADE or a ROOM:
 *
 * - a membership facade — the convenience "use this membership's single room"; it resolves to that membership;
 * - a plain object — the ROOM itself, resolved to whichever live membership covers it (a membership is information about
 *   participation, never an address; the room IS the address);
 * - bare — the ambient `<space.Membership>` (hooks pass it in), else the single live membership of the space.
 *
 * `strict` throws where a send must not silently no-op; the hook path stays lax and waits for the join to land.
 */
export const resolveSpaceHandlerTarget = (
  handler: AnyPoint,
  target: AnyClientSpaceMembership | InputRawUnknown | undefined,
  channelInput: InputRawUnknown | undefined,
  ambient: AnyClientSpaceMembership | undefined,
  { strict }: { strict: boolean },
): AnyClientSpaceMembership | undefined => {
  const space = handler._spacePoint
  if (!space) {
    throw new Error(`Point ${handler.id} has no space — a space handler grows from a space point`)
  }
  if (target !== undefined) {
    if (isMembershipFacade(target)) {
      try {
        return resolveMembershipArg(handler, target).facade
      } catch (error) {
        if (strict) {
          throw error
        }
        return undefined
      }
    }
    let membership: InternalMembership | undefined
    try {
      membership = resolveMembershipByRoom(space, target as InputRawUnknown, channelInput)
    } catch (error) {
      if (strict) {
        throw error
      }
      return undefined
    }
    if (membership) {
      return membership.facade
    }
    if (strict) {
      throw new Error(
        `No live membership covers the room bound for ${handler.id} (space ${space.name}) — join or enroll into it first`,
      )
    }
    return undefined
  }
  if (ambient) {
    return ambient
  }
  if (strict) {
    return resolveMembershipArg(handler, undefined).facade
  }
  try {
    return resolveMembershipArg(handler, undefined).facade
  } catch {
    return undefined
  }
}

/**
 * What room a space-handler binding addresses right now, and whether the membership currently holds it. The room comes
 * from the BOUND room (`handler(room)`) or, for a membership-bound / bare binding, from the membership's single room —
 * the convenience form. A membership that spans SEVERAL rooms has no single address: `strict` (the query-key path)
 * throws the bind-by-room error, the lax path reports "not live" and the query stays disabled. A membership with NO
 * rooms (still joining, a clean deny, a kick that shrank it to nothing) is simply not live yet.
 */
export const readBoundSpaceRoom = (
  handler: AnyPoint,
  membership: AnyClientSpaceMembership | undefined,
  boundRoom: RoomUnknown,
  { strict }: { strict: boolean },
): { room: RoomUnknown | undefined; live: boolean } => {
  const space = handler._spacePoint
  if (!space) {
    throw new Error(`Point ${handler.id} has no space — a space handler grows from a space point`)
  }
  const spaceTransformer = space._getSocketTransformer()
  // the facade is the ERASED `AnyClientSpaceMembership`, whose `rooms` is `any[]` — the cast narrows it back down so
  // nothing below this line reads a room as `any`
  const rooms = (membership?.rooms ?? []) as RoomUnknown[]
  const joined = membership?.status === 'joined'
  if (boundRoom !== undefined) {
    const boundRoomSerialized = stringifyOrThrow(spaceTransformer, boundRoom, space.id)
    const holds = joined && rooms.some((room) => spaceTransformer.stringify(room) === boundRoomSerialized)
    return { room: boundRoom, live: holds }
  }
  if (!joined || rooms.length === 0) {
    return { room: undefined, live: false }
  }
  if (rooms.length === 1) {
    return { room: rooms[0], live: true }
  }
  if (strict) {
    throw new Error(multiRoomBindErrorMessage(handler, space.name))
  }
  return { room: undefined, live: false }
}

/** Subscribe a React consumer to a lazily-bound membership: re-resolves when the memberships map or its state moves. */
export const useBoundMembership = (
  handler: AnyPoint,
  target: AnyClientSpaceMembership | InputRawUnknown | undefined,
  channelInput: InputRawUnknown | undefined,
  ambient: AnyClientSpaceMembership | undefined,
): AnyClientSpaceMembership | undefined => {
  const space = handler._spacePoint
  // renders on BOTH sides — on the server there is no client store and the hook degrades to an unresolved target
  const manager = space ? socketManagersSsItem.getOrUndefined()?.get(space.scope) : undefined
  const resolve = () => resolveSpaceHandlerTarget(handler, target, channelInput, ambient, { strict: false })
  const findInternal = (): InternalMembership | undefined => {
    if (!space) {
      return undefined
    }
    if (isMembershipFacade(target)) {
      try {
        return resolveMembershipArg(handler, target as AnyClientSpaceMembership)
      } catch {
        return undefined
      }
    }
    if (target !== undefined) {
      // a plain object is the ROOM — find the membership covering it (ambiguity throws; a render must not crash on it)
      try {
        return resolveMembershipByRoom(space, target as InputRawUnknown, channelInput)
      } catch {
        return undefined
      }
    }
    return undefined
  }
  const findAmbientInternal = (): InternalMembership | undefined => {
    if (!ambient) {
      return undefined
    }
    try {
      return resolveMembershipArg(handler, ambient)
    } catch {
      return undefined
    }
  }
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!manager) {
        return () => {}
      }
      manager.membershipsListeners.add(listener)
      const resolved = findInternal()
      resolved?.listeners.add(listener)
      // the ambient membership's own moves must re-render too — same reasoning as useBoundConnection's ambient
      // subscription (status flips on a stable facade object never re-render the consumer through context)
      const ambientInternal = findAmbientInternal()
      ambientInternal?.listeners.add(listener)
      return () => {
        manager.membershipsListeners.delete(listener)
        resolved?.listeners.delete(listener)
        ambientInternal?.listeners.delete(listener)
      }
    },
    // the serialized target identity — a fresh room literal per render must not resubscribe. Serialized by the
    // right point transformer (the same canonical form the registry keys use): space for the room, channel for
    // channelInput. The ambient rides by OBJECT identity — context-stable, dead→live change resubscribes
    [
      manager,
      handler.id,
      isMembershipFacade(target) ? '' : space ? space._getSocketTransformer().stringify(target ?? {}) : undefined,
      space?._channelPoint && channelInput !== undefined
        ? space._channelPoint._getSocketTransformer().stringify(channelInput)
        : undefined,
      ambient,
    ],
  )
  const getSnapshot = () => {
    const internal = findInternal()
    const ambientInternal = findAmbientInternal()
    return `${manager?.membershipsVersion ?? -1}:${internal ? internal.version : -1}:${internal ? internal.status : 'none'}:${ambientInternal ? ambientInternal.version : -1}:${ambientInternal ? ambientInternal.status : 'none'}`
  }
  React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return resolve()
}

/** Subscribe a React consumer to a space membership's state. Returns the facade; re-renders on state changes. */
export const useSpaceMembership = (
  space: AnyPoint,
  input: InputRawUnknown | undefined | void,
  options: ExtraUseMembershipOptions | undefined,
  channelInput?: InputRawUnknown | undefined,
): AnyClientSpaceMembership => {
  const isServer = _point0_env.side.is.server
  const enabled = options?.enabled !== false && !isServer
  const spaceTransformer = space._getSocketTransformer()
  const inputKey = spaceTransformer.stringify(input ?? {})
  // the channel input identity rides the CHANNEL transformer — the same canonical form the connection keys use
  const channelInputKey =
    space._channelPoint && channelInput !== undefined
      ? space._channelPoint._getSocketTransformer().stringify(channelInput)
      : undefined
  // a space always has a channel; the `?? space` keeps the hook call unconditional (rules of hooks) if it ever weren't
  const ambientConnection = useAmbientChannelConnection(space._channelPoint ?? space)
  const ambientConnectionId = ambientConnection?.id
  const optionsRef = React.useRef(options)
  optionsRef.current = options
  const [facade, setFacade] = React.useState<AnyClientSpaceMembership | undefined>(undefined)
  React.useEffect(() => {
    if (!enabled) {
      setFacade(undefined)
      return
    }
    let membership: AnyClientSpaceMembership
    try {
      membership = joinSpace(space, input ?? {}, optionsRef.current, channelInput, ambientConnection, {
        declarative: true,
      })
    } catch {
      // no live connection of the space's channel yet (the ambient-connection id dep re-runs the effect when it
      // lands), or the space takes no client joins at all (no `.joiner` — a permanent refusal)
      setFacade(undefined)
      return
    }
    setFacade(membership)
    return () => {
      membership.leave()
    }
    // rejoin only when the target changes — the input identity is its serialized form
  }, [space.id, inputKey, channelInputKey, enabled, ambientConnectionId])
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!facade) {
        return () => {}
      }
      const hold = membershipHoldsByFacadeSsItem.get().get(facade)
      if (!hold) {
        return () => {}
      }
      const membership = resolveMembership(hold.membership)
      membership.listeners.add(listener)
      return () => {
        resolveMembership(hold.membership).listeners.delete(listener)
        membership.listeners.delete(listener)
      }
    },
    [facade],
  )
  const getSnapshot = React.useCallback(() => {
    if (!facade) {
      return -1
    }
    const hold = membershipHoldsByFacadeSsItem.get().get(facade)
    return hold ? resolveMembership(hold.membership).version : -1
  }, [facade])
  React.useSyncExternalStore(subscribe, getSnapshot, () => -1)
  // a space with no `.joiner` refuses client joins PERMANENTLY — the declarative hold surfaces the typed error
  // right away instead of hanging in 'joining'. The fact is side-independent (`_joinerDeclared` survives the strip),
  // so the server render and the client's first render agree and hydration stays consistent.
  if (!facade && options?.enabled !== false && !space._joinerDeclared) {
    return createDeadMembershipFacade(space, input ?? {}, 'error', joinNotAllowedError(space))
  }
  return facade ?? createDeadMembershipFacade(space, input ?? {}, isServer || enabled ? 'joining' : 'closed')
}

// same as the connection context: the space point carries its own membership context — see getChannelReactContext
/** The space's own React context — the membership twin of {@link getChannelReactContext}. */
export const getSpaceReactContext = (space: AnyPoint): React.Context<AnyClientSpaceMembership | undefined> =>
  space._getReactMembershipContext()

/** The ambient membership for a space — what `<space.Membership>` provided above, if anything. */
export const useAmbientSpaceMembership = (space: AnyPoint): AnyClientSpaceMembership | undefined => {
  return React.useContext(getSpaceReactContext(space))
}

/**
 * Normalize a `<Connection>` / `<Membership>` / channel-space `.with` `gate` into the two flags the render reads.
 * `true` ≡ both, `false` ≡ neither (render through everything), an object OVERRIDES only its named aspects — an unnamed
 * key keeps its default, like every partial options object in point0. The default everywhere is `{ loading: false,
 * error: true }` — the socket subtree renders progressively, but a failed connect/join still surfaces.
 */
export const normalizeGate = (gate: Gate | undefined): { loading: boolean; error: boolean } => {
  if (gate === undefined) {
    return { loading: false, error: true }
  }
  if (typeof gate === 'boolean') {
    return { loading: gate, error: gate }
  }
  return { loading: gate.loading ?? false, error: gate.error ?? true }
}

// the socket surface — the third floor of the vertical (socket → connection → membership): status, holds, introspection

const addSocketHold = (): (() => void) => {
  const manager = getManagerForClientScope()
  if (!manager) {
    return () => {}
  }
  manager.socketHolds++
  ensureSocket(manager)
  let released = false
  return () => {
    if (released) {
      return
    }
    released = true
    manager.socketHolds--
    maybeCloseSocket(manager)
  }
}

/**
 * A read-only snapshot of the scope's whole socket vertical: the transport `status` plus every connection and
 * membership this tab holds (their facades — the same objects the hooks and `getConnection`/`getMembership` hand out),
 * kicked-but-still-held connections included (dormant until a remount — the one surface that still shows them; the
 * `client` enumeration floor lists live ones only). The seed of any monitoring/devtools surface.
 */
export type SocketState = {
  status: 'idle' | 'connecting' | 'open' | 'closed'
  connections: AnyClientChannelConnection[]
  memberships: AnyClientSpaceMembership[]
}

const emptySocketState: SocketState = { status: 'idle', connections: [], memberships: [] }

const snapshotSocketState = (manager: SocketManager): SocketState => {
  const seenConnections = new Set<InternalConnection>()
  const connections: AnyClientChannelConnection[] = []
  const collectConnection = (internal: InternalConnection): void => {
    const live = resolveInternal(internal)
    if (seenConnections.has(live)) {
      return
    }
    seenConnections.add(live)
    connections.push(live.facade)
  }
  for (const internal of manager.connections.values()) {
    collectConnection(internal)
  }
  // closed-but-still-held connections (a kick, disconnectAll) are part of the picture — they report status 'closed'
  for (const internal of manager.closedHeld) {
    collectConnection(internal)
  }
  const seenMemberships = new Set<InternalMembership>()
  const memberships: AnyClientSpaceMembership[] = []
  for (const membership of manager.memberships.values()) {
    const live = resolveMembership(membership)
    if (live.disposed || seenMemberships.has(live)) {
      continue
    }
    seenMemberships.add(live)
    memberships.push(live.facade)
  }
  return { status: manager.wsStatus, connections, memberships }
}

/**
 * Read the client scope's socket vertical without holding anything: the transport `status` (`'idle' | 'connecting' |
 * 'open' | 'closed'`) plus every live connection and membership facade. A plain snapshot — for the reactive form use
 * {@link useSocket}. On the server it degrades to `'idle'` with empty lists.
 *
 *     const { status, connections, memberships } = getSocket()
 */
export const getSocket = (): SocketState => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('getSocket')
  }
  const manager = _point0_env.side.is.server ? undefined : getManagerForClientScope()
  return manager ? snapshotSocketState(manager) : emptySocketState
}

/**
 * The socket vertical as a live React value — the same shape as {@link getSocket}, re-rendering on every socket,
 * connection, or membership move. `hold: true` ALSO keeps the WebSocket open while mounted (pre-warm, instant first
 * message) — a socket-level HOLD, not a provider and not a gate: no context, no gating, only a holder count; default
 * `false` (a bare `useSocket()` only reads).
 *
 *     const { status, connections, memberships } = useSocket()
 */
export const useSocket = (options?: { hold?: boolean }): SocketState => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('useSocket')
  }
  const isServer = _point0_env.side.is.server
  const hold = options?.hold === true
  React.useEffect(() => {
    if (isServer || !hold) {
      return
    }
    return addSocketHold()
  }, [isServer, hold])
  const manager = isServer ? undefined : getManagerForClientScope()
  // the connection/membership SET changes re-create `subscribe` (the lists' listeners are per-object) — React then
  // re-subscribes, picking up the new objects; the per-object versions make status flips re-read the snapshot
  const listVersion = manager ? `${manager.connectionsVersion}|${manager.membershipsVersion}` : '-'
  const subscribe = React.useCallback(
    (listener: () => void) => {
      if (!manager) {
        return () => {}
      }
      const removers: Array<() => void> = []
      const add = (set: Set<() => void>): void => {
        set.add(listener)
        removers.push(() => set.delete(listener))
      }
      add(manager.wsListeners)
      add(manager.connectionsListeners)
      add(manager.membershipsListeners)
      for (const internal of manager.connections.values()) {
        add(internal.listeners)
      }
      for (const internal of manager.closedHeld) {
        add(internal.listeners)
      }
      for (const membership of manager.memberships.values()) {
        add(membership.listeners)
      }
      return () => {
        for (const remove of removers) {
          remove()
        }
      }
    },
    // listVersion re-subscribes over the changed object set
    [manager, listVersion],
  )
  const version = React.useSyncExternalStore(
    subscribe,
    () => {
      if (!manager) {
        return '-'
      }
      const parts: Array<string | number> = [manager.wsVersion, manager.connectionsVersion, manager.membershipsVersion]
      for (const internal of manager.connections.values()) {
        parts.push(internal.version)
      }
      for (const internal of manager.closedHeld) {
        parts.push(internal.version)
      }
      for (const membership of manager.memberships.values()) {
        parts.push(membership.version)
      }
      return parts.join('|')
    },
    () => '-',
  )
  return React.useMemo(
    () => (manager ? snapshotSocketState(manager) : emptySocketState),
    // version keys the re-snapshot
    [manager, version],
  )
}

/**
 * Keep the WebSocket open while mounted — the component form of `useSocket({ hold: true })`, and holding is its whole
 * job, so `hold` defaults to `true` here (`hold: false` releases). A keeper, not a provider: the children render as-is,
 * unconditionally, and their position relative to it carries no meaning.
 *
 *     <Socket>
 *       <Router />
 *     </Socket>
 */
export const Socket = ({ hold = true, children }: { hold?: boolean; children?: React.ReactNode }): React.ReactNode => {
  if (!_point0_env.feature.socket) {
    throw socketFeatureOffError('Socket')
  }
  useSocket({ hold })
  return React.createElement(React.Fragment, null, children)
}
