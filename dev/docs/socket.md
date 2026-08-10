# Sockets — channels, spaces, handlers (implementation knowledge base)

How Point0's sockets work inside: the three-level model (a channel is an
identity pipe, a space is a family of rooms, a room is one plain object), the
connect matrix (GET/POST by input length × upgrade-vs-ticket by socket
presence), the membership cascade (join/leave over the socket, `.enroller` at
connection setup), the wire protocol, the socket backplane (KV + a bus sharded
by topic) that binds multiple processes, the admin surface (channel
`kill`/`refresh`/`amendIdentity`/`connections.*`, space
`kick`/`kill`/`enroll`/`refresh`/`amendIdentity`/`memberships.*` — commands on
the point, enumerations under the `server`/`client` floors, server targets are
the `$`-dictionary), the per-process room index, the dev-server socket proxy,
and the compiler strip rules. This documents the code as it is TODAY.
User-facing docs: [docs/core/socket.md](../../docs/core/socket.md).

## The three-level model

The model has three levels — socket binding, server context, and rooms are
separate concerns, not one welded object:

1. **Channel** — an authenticated pipe. Its `.connector` returns the connection
   **identity** BARE (the whole loader output IS the identity — no `{ ctx }`
   envelope, no room, no data). Identity is the connection's server-side
   credential: what selections and pushes address it by (`userId`, `role`, …).
   One channel connection per input (client dedups by serialized channel input).
2. **Space** — a new point kind that grows from a closed channel: a family of
   rooms of one shape, and **the shape is declared at the opener**
   (`channel.lets<{ chatId: string }>('space', 'chat')` /
   `channel.lets.space<{ chatId: string }>()`; omitted, it is the strict empty
   object — one global room `{}`).
   `.joiner(({ input, identity, connectionId }) => …)` runs over the socket per
   join and returns which rooms the client enters — one room object, an ARRAY of
   room objects, an empty array, or nothing (a clean deny) — CHECKED against the
   declared shape (extra keys included: the snapshot is the address, so an
   undeclared key is a DIFFERENT room — `AssertRoomNotWider`), never inferred
   from it. **No `.joiner` → the space takes no client joins at all**: the
   client throws `POINT0_SOCKET_JOIN_NOT_ALLOWED` before framing anything (it
   reads `point._joinerDeclared`, the fact `.joiner()` records whatever its
   argument — the compiler blanks the callback, the call survives), and
   `_executeJoiner` throws the same code for a hand-framed join, before the
   guards run. `.enroller(({ identity, connectionId }) => …)` is the
   server-initiated join — it runs at connection setup (both connect paths) and
   enrolls the fresh connection without the client asking; max one per space,
   coexists with `.joiner`, and alone makes the space server-enrolled only. A
   concrete room is a serialized room object. (A callback reads the connection's
   current rooms with the synchronous
   `space.memberships.server.local.rooms({ connectionId })`.)
3. **Room** — one member of a space's family; the addressable unit of a push.

**Handlers grow from EITHER a channel OR a space, and attach to the level that
addresses them.** Send targets are the `$`-dictionary (bare key = exact address,
`$`-key = sift selection, parts AND-combined, empty = everyone in scope): a
channel handler addresses connections (`connectionId` / `$identity` / bare = the
whole channel); a space handler addresses rooms (`room` snapshot(s) / bare = the
whole space — the space-wide topic) plus the same connection keys, with `except`
taking connection ids or room snapshots. `$room` — the explicit sift scan over
rooms — is a target part everywhere targets are taken: pushes, admin,
enumerations (uniform `$`-rule). Targets and matchers are typed by the declared
`$`-dictionary and identity/room keys with the ORDINARY structural rules — a
fresh literal with a mistyped key is caught by the excess-property check, a
variable is the caller's responsibility (per-key assert verdicts on this surface
were tried and REMOVED 2026-07-31: signature noise for a matches-nobody bug
class no mainstream framework guards against; the strict exception stays where
an extra key CREATES wrong state — `AssertRoomNotWider` on joiner/enroller
returns and `AssertIdentityAmendable` on amendIdentity). The type-level marker
of channel-ness is `TRoom = undefined` — the slot is absent.
`TRoom = EmptyObjectOnly` (the opener's default) is a REAL empty room — a global
space, `joiner(() => ({}))` — not channel-ness. Conditionals are
non-distributive `[TRoom] extends [undefined]`.

The four trailing handler generics are flat, in lifecycle order:
`TChannelInput, TIdentity, TSpaceInput, TRoom` (channel input → connector's
identity → space input → joiner's room element). Channel handlers are
`<…, undefined, undefined>`; space handlers carry all four.

**Who writes the identity/room slots.** They have DIFFERENT authors, on purpose:

- `TIdentity` is written by the declaring method — `.connector()` writes the
  extracted output of its callback (`.connector<TIdentity>` writes it directly,
  which is what breaks a self-referential connector). The `.channel()` closer
  fills the fallback when the slot is still the sentinel: `TIdentity = {}`, a
  connectorless pipe. Identity has ONE producer and no self-reference problem,
  so inference stays.
- `TRoom` is written by the OPENER — the `lets` generic
  (`channel.lets<TRoom>('space', name)` / `channel.lets.space<TRoom>()`),
  mirroring a component's props. Default: `EmptyObjectOnly`
  (`Record<string, never>`) — the STRICT empty object, so a joiner/enroller
  returning anything keyed is a type error, which is the nudge to declare the
  generic. Nothing is inferred from `.joiner` / `.enroller`: both take the room
  as a plain parameter type (`JoinerFn<…, TRoom & UnknownData>`) and are CHECKED
  against it, and neither takes a type argument any more (there is no inference
  left to break — see `socket-selfref.unit.test.ts`). The `.space()` closer
  writes `TSpaceInput` and passes `TRoom` through untouched — it fills no
  fallback.

Nothing threads room/identity through a loader slot — no extractor types exist.
The enroller-declared marker rides the otherwise-unused client-loader slot,
purely as a flag (does this space enroll), not as a carrier of the room type.
`UndefinedRoom` stays the CHANNEL-ness marker (`[TRoom] extends [undefined]`) —
a space's `TRoom` is never undefined now.

## File map

| Piece                                                                                                                                                | Where                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Client runtime: socket manager, connection holds, membership registry, send queue, dispatch                                                          | `packages/core/src/socket.ts`                                                     |
| Wire protocol types (`SocketClientFrame` / `SocketServerFrame`) + `ChannelConnectOutput`                                                             | `packages/core/src/socket.ts` (top)                                               |
| Server adapter seam (`SocketServerAdapter`: push/kick/kill/refresh/count/list/forEach/localCount/localList/amendIdentity) + the adapter registry     | `packages/core/src/socket.ts` (server-only half, same module)                     |
| Client helpers `reconnectAll` / `disconnectAll`, `getSocket`/`useSocket`/`<Socket>`                                                                  | `packages/core/src/socket.ts`                                                     |
| Client enumeration floor (`listChannelConnectionFacades` / `listSpaceMembershipFacades` — `connections.client.*` / `memberships.client.*`)           | `packages/core/src/socket.ts`                                                     |
| Builder surface: `.channel()`, `.space()`/`.joiner`, handlers, send methods, admin, `.with`                                                          | `packages/core/src/point0.ts` (search `// socket`, `_executeJoiner`)              |
| Callable handler export + binding (`_getCallableHandler` / `_bindHandler`)                                                                           | `packages/core/src/point0.ts`                                                     |
| Socket-query family (`useSocketQuery`, key/options builders, flavor guard)                                                                           | `packages/core/src/point0.ts` (search `_getSocketQueryKey`)                       |
| Handler target resolution (channel connection vs space ROOM → covering membership)                                                                   | `packages/core/src/socket.ts`                                                     |
| Socket types: 4 generics, `ClientChannelConnection`, `ClientSpaceMembership`, admin targets, matchers                                                | `packages/core/src/types.ts` (search `// socket`)                                 |
| Events `pointChannelConnectServer*`/`Client*` / `pointChannelOpenServer`/`CloseServer` / `pointSpaceJoinServer*`/`Client*` / `pointSpaceLeaveServer` | `packages/core/src/eventer.ts`                                                    |
| Server: upgrade, claim, join/leave, room topics, dispatch, backplane KV + bus, admin surface                                                         | `packages/engine/src/socket.ts` (`EngineSocket`)                                  |
| Topic streams (`TopicStream`, `streams` map, `stampStreamFrame`, epochs, the merge-replay `answerResume`)                                            | `packages/engine/src/socket.ts`                                                   |
| Client stream cursors (`topicCursors` / `personalCursor`, `buildResumeCursors`, `applyStreamHeads`)                                                  | `packages/core/src/socket.ts`                                                     |
| Engine introspection facade (`engine.socket.local.get()` / `.status()`)                                                                              | `packages/engine/src/socket.ts` (`createEngineSocketFacade`, `localSnapshot`)     |
| Channel connect branch (ticket path answer `{id, ticket}`; upgrade path stash + marker)                                                              | `packages/engine/src/fetcher.ts` / `executor.ts` (search `channel`, `upgrade`)    |
| `server.backplane` (`Backplane`) + `server.socket` config + `features` normalization (`parseFeatures`)                                               | `packages/engine/src/config.ts`                                                   |
| Ready-made backplane adapters (postgres/ioredis/node-redis/bun-redis) + the resilient redis subscriber wrapper                                       | `packages/engine/src/backplane/*.ts`                                              |
| The feature flag itself: `Point0Feature`, `EnvFeature`, `env.feature.socket`                                                                         | `packages/core/src/env.types.ts` / `env.ts`                                       |
| Client-only inlining of `_point0_env.feature.<name>`                                                                                                 | `packages/compiler/src/file.ts` (`shakeForEnv`, search `env.feature`)             |
| WS `idleTimeout: 120`, upgrade wiring, the 101-marker handoff to `bunServer.upgrade`                                                                 | `packages/engine/src/server.ts`                                                   |
| Dev WS proxy — the bare `/websocket` upgrade AND channel-endpoint GET+Upgrade                                                                        | `packages/engine/src/utils.ts` (`upgradeWebsocketDevProxy`), wired in `client.ts` |
| Compiler: point kinds incl. `space`, strip rules, `.joiner`/`.clientReply` split, options-object split                                               | `packages/compiler/src/point.ts`                                                  |

## Connecting to a channel — the connect matrix

Connecting is ALWAYS a real HTTP request to the channel endpoint (fresh cookies,
input, the full pipeline: middleware, plugins, `.ctx`, connector — exactly as
before). Two INDEPENDENT axes decide the shape:

- **Method (GET vs POST)** — purely by input length, exactly like queries (input
  in `?input=` for a short GET, in the body for POST). The channel endpoint's
  nominal method is GET and it registers `methods: ['GET','POST']`;
  `pointTypeUsesQueryTransport` (core protocol.ts) is the one shared predicate
  for the GET-`?input=`-with-POST-fallback family — query, infiniteQuery,
  component, provider, subscription, channel — and it counts `type: 'channel'`,
  so the GET-input parse gate accepts it. Core's `_usesQueryTransport()`, the
  engine's input read, and the compiler's endpoint meta all call this one
  predicate. The client reuses the query GET-vs-POST decision (same URL-length
  threshold, `_getQueryMaxUrlLength()` default 2000).
- **Upgrade vs ticket** — the upgrade is OPT-IN (`upgradable: true`, a client
  channel option next to `reconnect`; the connect-creating call site — the FIRST
  hold — can override it, like `linger`/`ping`); the default is the ticket path
  for EVERY connect. Rationale (decided 2026-07-25): the upgrade cannot carry
  custom client headers, so under header-or-fallback auth it would silently pass
  the connector a different identity; default-off also keeps the connect one
  request shape always (reconnects are ticket-path regardless).

| Upgradable + socket | Input | Path                                                                                                                                                                                                                                                                      |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| on + none           | short | **GET+Upgrade**: the client opens `new WebSocket(endpointUrl?input=…)`. The request runs the normal pipeline as a GET; the engine upgrades THIS request. The connection is born with the socket, in one round trip — no ticket. First frame from the server is `claimed`. |
| on + none           | long  | POST → answer `{ id, ticket }` → a separate bare `/websocket` GET-upgrade → `claim` (RFC: only a GET can upgrade — physics, not choice).                                                                                                                                  |
| off, or socket open | any   | GET or POST by length → answer `{ id, ticket }` → `claim` over the socket, opened via the bare endpoint first if needed (behind a balancer the request and the socket may live on different processes — the ticket crosses via the backplane KV).                         |

The ticket response is `{ id, ticket }` — no room (rooms come from `join`), no
data. The server never gates upgrades on the option — `upgradable` is client
strategy, and a raw external ws client may upgrade-connect to any channel.

- **Upgrade-connect internals**: `prepareFetch` marks the variant endpoint
  `outputType: 'upgrade'` when
  `point.type === 'channel' && method GET && Upgrade: websocket`, and reads the
  transform fact from `?x-point0-transform=true` (see the fetcher facts in the
  FakeClient section — the handshake carries no custom headers). The channel
  branch of the executor builds the connection WITHOUT a ticket, stashes an
  entry seed in `EngineSocket.pendingUpgrades` (`Map<cid, seed>`, small TTL
  sweep — same process by construction), and returns a marker `Response`: status
  200 with the internal header `x-point0-websocket-upgrade: <cid>`. (A
  `Response` cannot carry status 101 through Bun/undici — the header IS the
  marker.) Middleware see and may augment this Response.
- **Handoff**: `server.ts`, after the middleware onion, sees the marker header +
  `bunServer` in scope → strips the marker →
  `bunServer.upgrade(request, { headers, data: { __point0Socket: { scope, pendingClaimCid: cid } } })`.
  On success Bun writes its own 101; on failure it returns 400.
- **handleOpen** pops the `pendingUpgrades` seed → installs the entry →
  subscribes `*all*` → runs the enrollers (`enrollConnection`; a throw →
  `claimErr`, see Enrollment below) → sends `{t:'claimed', cid, enrolled?}`.
- **Handshake failure is unreadable from browser JS** → on a WS error/close
  before `claimed`, the client FALLS BACK to the ticket path (a plain fetch): it
  either surfaces the typed error or succeeds transiently. One extra round on
  the error path only. A handshake that neither completes nor fails (a middlebox
  or a dev proxy swallowing the upgrade) is cut by the channel client
  `upgradeTimeout` (5 s): the client closes the socket itself and the same
  fallback runs. A `claimErr` answering on a cid the client never learned (a
  throwing enroller on the upgrade path, a lapsed seed) hands over to the ticket
  path IMMEDIATELY — no wait on the 5 s timeout; the plain fetch + claim surface
  the same typed error.
- **Reconnect always uses the legacy path** (bare `/websocket` + a connect
  request/claim per connection). Upgrade-connect is a cold-start optimization
  only.

Changing identity (login/logout) is not part of connect mechanics — it's
`reconnectAll()` / `disconnectAll()` by hand.

## Middleware and the upgrade

- The pipeline runs ENTIRELY before the upgrade. The endpoint's "response" on
  the upgrade path is the marker Response (status 200 + the upgrade header); the
  middleware onion works unchanged (request → Response), and headers can be
  appended to the marker — `Set-Cookie` on the handshake is applied by browsers,
  so cookie middleware works.
- A short-circuit is free: an auth middleware returning 302/401 instead of
  continuing means the marker never reaches the top — no upgrade, the client
  gets a normal HTTP response and treats it as a failed connect (the existing
  path).
- "What happened" is not a new endpoint variant — it's
  `RequestVariantEndpoint. outputType` extended with `'upgrade'` (alongside
  `'html' | 'data' | 'queryClientDehydratedState'`); the ticket path stays
  `'data'`. Middleware see both paths uniformly.
- **Middleware see only the handshake** — frames over the socket never go
  through them. Per-message logic is the handler customizers
  (`onBeforeServerReply` / `onAfterServerReply`) and channel callbacks.

## Join and leave — the membership cascade

- **Join**: the client sends `{t:'join', id, cid, space, input?}` over the
  socket → the server runs `.joiner` → answers `{t:'joined', id, rooms}` (or
  `{t:'joinErr', id, error}`) and subscribes the socket to those room topics.
  Leave is `{t:'leave', cid, space, rooms}` — the client NAMES the rooms to drop
  (it owns the shared-room refcount across its own joins: a room another of its
  memberships still covers stays out of the list); the server sheds only the
  `joined` mark — an ENROLLED room survives any leave frame (provenance, the
  enroll guarantee).
- **The waiting cascade — one invariant across all levels: each level waits for
  the one below IF it was started, and throws if it was never started.** A send
  on a space handler waits for the membership (`joining` → `joined` → sends);
  the membership waits for the connection (`connecting` → `open` → the join goes
  out); the connection waits for the socket. Nothing below started and nobody
  started it → a synchronous throw ("No live connection" / "No membership"),
  exactly like a send with no connection today.
- **No auto-connect from join.** A join requires someone to hold the channel
  connection (canonically `<appChannel.Connection>` at the app root); the
  server-side way in is `.enroller`. Keeping the join explicit is the
  additive-safe choice — auto-connect could be layered on without breaking
  callers, whereas removing it could not. A bonus of the cascade: the claim →
  join race cannot exist — a join is physically not sent until its channel's
  claim landed.
- Start latency is low: commands are written to the socket in order, the server
  executes them in order. A cold chat start is GET-upgrade + join right after =
  one round trip.
- No data from `.joiner` — a join returns only room objects; data lives in
  queries (uniform with the connector).
- **Client-side dedup** is the same hold machinery as connections, one level
  down: two components calling `useMembership({ chatId: '5' })` share one
  membership with two holders, the second join is not sent; both released →
  `linger` → `leave`. A membership is keyed by its OWN input within its
  connection — a purely CLIENT key (like a query key). The server holds a room
  once per connection whatever led into it (a DM pair reached from two inputs is
  one room), so the refcount across a connection's own joins lives on the
  client: a disposing membership's `leave` simply omits a room another of its
  memberships still covers.

### The client membership registry

**What a membership IS** (fixed with Sergei 2026-07-28): _information about
participation, never an address._ Server-side it is exactly a
`SpaceParticipation` — `(space, channel, connectionId, rooms)`; the wire has no
membership entity at all (frames carry space + rooms + cid). Client-side it is
that same participation PLUS `input`, which is the hold-dedup key (a query key,
not an address). **Addressing is always by ROOM**: pushes target rooms, handlers
bind rooms, socket-query keys carry rooms. A membership facade is accepted where
a room is expected purely as the convenience "take its single room" — it
resolves to a room before anything is addressed.

- `InternalConnection` carries no `room` / `roomKey` / `data`; a connection is
  keyed by channel input only. There is no connection-level room dedup — the
  server dedups topics, the client dedups memberships by input.
- `InternalMembership` (key `${connectionKey}|${space.name}|${inputKey}`) holds:
  the space, its internal connection, the input, `status`, `rooms` (parsed),
  `roomKeys`, `error`, `holds`, `lingerTimer`, `joinInFlight`, `version`,
  listeners. The manager carries `memberships: Map<key, InternalMembership>` and
  `membershipsByRoomKey: Map<`${channelKey}|${space.name}|${roomSerialized}`, Set<InternalMembership>>`
  for msg dispatch.
- **Replay on every new cid.** A membership subscribes to its connection's
  status; when the connection opens (claim landed, cid fresh) it (re)sends its
  join — so a reconnect or a `refresh` (new cid) makes the client REPLAY all
  live joins automatically (it holds the inputs). On connection loss the
  membership stays and its status follows the connection down; on connection
  dispose (kill/logout) it goes `closed`.
- Two different mechanisms, often confused. The stale-answer guard is the JOIN
  CORRELATION ID: `sendJoinFrame` mints a fresh `joinId` and registers the
  membership in `manager.pendingJoins` under it; re-sending a join deletes the
  previous id first, so a late `joined`/`joinErr` naming it finds nothing and is
  dropped (`joined`/`joinErr` frames carry no cid at all — they resolve by
  `frame.id`). `lastCid` is the replay TRIGGER: `pollMemberships` compares it
  against the connection's current cid and sends a join whenever they differ (a
  fresh cid = a reconnect), and clears it while the connection is down so the
  next open replays.
- **Rooms are parsed with the SPACE transformer** (the channel transformer
  serializes identity; the space transformer serializes rooms).
- These two maps ARE the client enumeration floor: `connections.client.list()`
  is `manager.connections` filtered by `channelKey`, `memberships.client.list()`
  is `manager.memberships` filtered by `spaceName` (both merge-resolved,
  disposed dropped, deduped) — see Admin surface.

## Wire protocol

One JSON envelope per WebSocket message; payload fields (`input`, `data`) are
transformer-serialized strings, `error` fields are the error class's
`serializePublic` JSON. Infrastructure refusals serialize through the ROOT error
class with registry codes (`POINT0_SOCKET_TICKET_INVALID`,
`POINT0_SOCKET_CONNECTION_NOT_FOUND`, `POINT0_SOCKET_NOT_IN_ROOM`, …) — every
socket/subscription code lives in `POINT0_ERROR_CODES` (error.ts).

| Direction       | Frame                                                                                                              | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| client → server | `{t:'claim', ticket}`                                                                                              | bind the connection behind this ticket to this socket                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| client → server | `{t:'discard', ticket}`                                                                                            | release an unclaimed ticket (dedup merged the connection away)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| client → server | `{t:'close', cid}`                                                                                                 | close one connection                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| client → server | `{t:'join', id, cid, space, input?}`                                                                               | run a space's `.joiner`; `id` correlates the answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| client → server | `{t:'leave', cid, space, rooms}`                                                                                   | leave the NAMED rooms — the client computes the list (it owns the refcount across its own memberships, enrolled ones included); the server drops only rooms whose sole mark is `joined` — an ENROLLED room never leaves by a client frame                                                                                                                                                                                                                                                                                                                                                          |
| client → server | `{t:'send', id, cid, handler, input?, room?}`                                                                      | message to a handler; `room` = the serialized room a SPACE handler addresses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| client → server | `{t:'reply', id, cid, data?, error?}`                                                                              | this client's `.clientReply` answer (`error` = the reply fn threw)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| client → server | `{t:'ping'}`                                                                                                       | keepalive (client-initiated, interval = channel `ping`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| client → server | `{t:'resume', entries: [{cid, key, cursors}]}`                                                                     | the FIRST frame of a fresh socket when the client holds resumable connections — restore them all; `cursors` = stream wire key → last received tseq; per-cid answers, mixed results legal                                                                                                                                                                                                                                                                                                                                                                                                           |
| server → client | `{t:'claimed', cid, enrolled?, resumeKey?, heads?}`                                                                | claim (or upgrade-connect) succeeded — connection live; `enrolled` = the `.enroller` enrollments (`[{ space, rooms: string[] }]`); `resumeKey` = a resumable channel's raw resume credential, sent exactly once; `heads` seeds the stream cursors ('c'/'p' + the enrolled spaces' keys)                                                                                                                                                                                                                                                                                                            |
| server → client | `{t:'claimErr', cid, ticket?, error}`                                                                              | claim failed (expired ticket, maxConnections, …)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| server → client | `{t:'joined', id, rooms, heads?}`                                                                                  | a join succeeded — `rooms` = serialized room objects (empty = a clean deny); `heads` seeds the freshly-entered streams' cursors (a resumable channel, space in the resume)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| server → client | `{t:'joinErr', id, error}`                                                                                         | `.joiner` threw — the typed join error                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| server → client | `{t:'left', cid, space, rooms, reason?}`                                                                           | a space kick — the membership's `rooms` shrink; it stays `joined`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| server → client | `{t:'enrolled', cid, space, rooms, heads?}`                                                                        | an imperative `space.enroll` grew this connection's enrollment — `rooms` is the FULL new enrolled set of the space; `heads` seeds the grown streams' cursors                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| server → client | `{t:'reply', id, data?}`                                                                                           | the `.serverReply` return for a `send` — a deferred reply reuses it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| server → client | `{t:'sendErr', id, error}`                                                                                         | a `send` failed (typed error) — a deferred REFUSAL reuses it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| server → client | `{t:'resumed', cid, streams}`                                                                                      | a resume succeeded — the connection is live again (identity/rooms/subscriptions restored, nothing ran); `streams` = wire key → `{gapless, head}`, the PER-STREAM proof and the authoritative cursor re-seed; the replayed `msg` frames follow as ONE tail, merge-ordered by the delivery clock across streams                                                                                                                                                                                                                                                                                      |
| server → client | `{t:'resumeErr', cid}`                                                                                             | a resume refused — deliberately reasonless (unknown cid ≡ wrong key, no oracle); the client full-connects that one channel                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| server → client | `{t:'msg', channel, handler, space?, room?, cid?, rcid?, mid?, tseq?, input?, exceptConnectionIds?, exceptRooms?}` | a push; `space`+`room` = room push, `space` w/o `room` = space-wide, `cid` = personal (connection-addressed), none = channel-wide; `tseq` = the TOPIC STREAM's dense sequence (a resumable channel — the frame's shape names the stream: `cid` → 'p', else the topic); `rcid` = the replay target of a re-sent topic frame (dispatch narrows, the stream identity stays the topic's); `rp` = the replay marker on EVERY re-sent frame (props surface it as `replayed: { gapless }`); `exceptConnectionIds: string[]` = cids to skip, `exceptRooms: string[]` = serialized rooms whose members skip |
| server → client | `{t:'closed', cid, reason?}`                                                                                       | a server kill — client marks the connection `closed`; declarative holds auto-revive via the reconnect policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| server → client | `{t:'refresh', cid}`                                                                                               | re-run the connect request with the socket up (loader re-runs)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| server → client | `{t:'pong'}`                                                                                                       | keepalive answer — the client reads nothing off the frame; it exists so that a silent connection still produces inbound traffic for the client's liveness deadline to measure                                                                                                                                                                                                                                                                                                                                                                                                                      |

Two watersheds hide in this table. **Space vs channel push**: a `msg` with
`space`+`room` is a room push (dispatched via `membershipsByRoomKey`); a `msg`
with `space` and NO `room` is a space-wide push (dispatched to every membership
of that space on the connection); a `msg` without `space` is a channel push
(dispatched per connection). A `space` push may also carry `cid` — the
space/room push narrowed to one connection (a connection-selection target,
delivered on the PERSONAL stream) — or `rcid`, the same narrowing for a replayed
topic frame. The client drops a frame its `exceptConnectionIds`/`exceptRooms`
covers (it knows its own cid and memberships) — AFTER advancing the stream
cursor: a cursor records receipt, not display. **Space kick vs kill**: `left`
shrinks a membership's rooms (the connection lives on); `closed` disposes the
whole connection.

**The stream wire keys** — the dictionary cursors, heads and verdicts all speak:
`'c'` = the channel-wide stream, `'p'` = the connection's personal stream,
`'s:<space>'` = a space-wide stream, `'r:<space>:<room>'` = a room stream
(`<room>` is the serialized room). Client-side the topic cursors are SHARED per
channel (`manager.topicCursors`, key `<channel>|<streamKey>`) — a topic frame
reaches the socket once however many of the channel's connections subscribe;
only 'p' lives on the connection (`personalCursor`). Heads are an EXACT set (a
rebuilt stream may restart the numbering — the server is the authority), frames
advance monotonically (`max`).

## Server model

### Participations, room topics, and the room index

- **The server model is connection + rooms — nothing keyed by input.**
  `SocketConnectionEntry` carries `identitySerialized`/`identityParsed` and
  `spaces: Map<spaceName, SpaceParticipation>` where a participation is
  `{ spacePoint, rooms: Map<serialized, parsed> }` — ONE per (connection,
  space), holding the rooms the connection is in, however they got there (a
  client join, the `.enroller`, an imperative `space.enroll` — the server does
  not remember which). The join INPUT is ephemeral server-side: it enters the
  joiner, rooms come out, it is forgotten. The client keeps inputs — they are
  its hook-dedup keys, like query keys — and that is a purely client concern.
- A room topic is namespaced by SPACE: `${scope}:${spaceName}:${roomSerialized}`
  (`roomTopic()`). The channel-wide topic stays `${scope}:${channelName}:*all*`,
  subscribed automatically at claim. The **space-wide topic** is
  `${scope}:${spaceName}:*space*` (`spaceTopic()`) — subscribed with the FIRST
  room of the space on the socket (Bun's pub/sub is a set, so the subscribe is
  idempotent), unsubscribed when the last room of the space leaves the ws
  (`releaseSpaceTopic`). A bare space send publishes there. A space belongs to
  exactly one channel and space names are unique per scope, so the space name
  alone namespaces the topic.
- **The per-process room index**: `entriesByRoom: Map<roomTopic, Set<entry>>`
  and `entriesBySpace: Map<spaceKey, Set<entry>>` (the space key IS the
  space-topic string — one canonical form), maintained on
  join/enroll/leave/kick/cleanup (`indexRooms` / `unindexRooms` inside the two
  write/remove paths `addRoomsToEntry` / `removeRoomsFromEntry`). It makes
  room-addressed operations O(members) instead of O(connections):
  collect-expectation counting for room and space-wide pushes, the topic release
  refcount (only same-ws entries in the room can still need the topic), and the
  room-targeted admin/enumeration scans. Room keys are canonical because the
  space transformer serialized them (`safe-stable-stringify` in the core) — keys
  go through the point's transformer only, bare `JSON.stringify` for keys is
  banned.
- **Topic refcount**: on join the socket subscribes each room topic (idempotent
  set); on leave/cleanup `releaseRoomTopic` unsubscribes only when no other
  same-ws entry is still in the room (checked through `entriesByRoom`). The
  refcount across a connection's OWN joins lives on the CLIENT: two of its
  memberships sharing one room are one server-side room, and its `leave` frame
  simply omits a room another of its joins still covers.

### handleJoin / handleLeave / cleanup

- **The cross-channel guard**: `handleJoin` and `handleSend` refuse a
  space/serverHandler whose `_channelPoint` is not the connection's channel —
  with the SAME "not found" error as a real miss (no oracle). Without it a
  connection to channel A could join B's spaces / call B's handlers, feeding
  their callbacks A's identity under B's identity type — a bypass of B's
  connector. (`enrollConnection` always filtered by channel; join/send now match
  it.) Pinned by the cross-channel test in `socket.int.test.ts`.
- **The room cap**: `maxRooms` (default 256, `Infinity` opts out) bounds the
  rooms of the space a connection is in, whoever put it there — an option set is
  an option respected on EVERY write path (`roomsFit`): a join past it →
  `joinErr SOCKET_MAX_ROOMS`, a connect whose enroller exceeds it → `claimErr`
  (the whole setup fails, like a throwing enroller), an over-cap `space.enroll`
  → that connection is skipped with a warning.
- `handleJoin`: resolve the space point by name (`type: 'space'`),
  `_executeJoiner({ inputSerialized, identity, connectionId, points })` parses
  the input with the space's `.input`, runs the join guards and the joiner —
  `onBeforeJoiner` first (chain `.spaceOptions()` → closer `.space({...})`, a
  throw → `joinErr` and the joiner never runs), then `.joiner`, then
  `onAfterJoiner` fire-and-forget with `{ output, error }` — normalizes
  room|rooms[]|undefined → an array, serializes each with the space transformer,
  dedupes, and returns `{ rooms, roomsSerialized, input }`. A space with NO
  `.joiner` never gets that far: `_executeJoiner` throws
  `SOCKET_JOIN_NOT_ALLOWED` at the very top — before the input parse, the guards
  and any event — and the engine frames it as `joinErr`. The engine UNIONS the
  admitted rooms into the participation (`addRoomsToEntry` — index + topics),
  answers `{t:'joined', id, rooms}` (THIS join's admitted rooms — the client
  membership shows what its own join granted), and only THEN closes the event
  family —
  `spacePoint._emitSpaceJoinSettled({ rooms, identity, connectionId, input })`,
  the Settled/Success pair (see [Events](#events): the emit moment is a
  contract). A refused join never reaches it: the mid-join liveness check and
  the `maxRooms` refusal both return above it, so nothing announces a join that
  did not land. A throw → `{t:'joinErr', id, error}` (typed with the space's
  error class). **A join only ever ADDS**: in what you were, you stay; removal
  is `leave`/`kick`/`refresh`, never a join side-effect (the old input-keyed
  model incidentally dropped rooms a repeat join no longer returned — that was
  an accident of bookkeeping, not a designed revocation path).
- `handleLeave`: `{t:'leave', cid, space, rooms}` — remove the NAMED rooms MINUS
  the enrolled ones (`removeRoomsFromEntry` gates on provenance: a `'leave'`
  clears the `joined` flag and keeps any room still flagged `enrolled`; unindex,
  release topics, emit `pointSpaceLeaveServer` reason `'leave'` for what
  actually went). The client computes the list — it owns the shared-room
  refcount across its own joins.
- `cleanupConnection` removes every space's rooms the same way (same refcount),
  reason-tagged `'socket'` / `'kick'` / `'kill'` / `'close'` — presence needs
  it.

### Enrollment (`.enroller`) — server-side joins at connection setup

- Both connect paths — `installUpgradeConnection` (cold-start GET+Upgrade) and
  `handleClaim` (ticket) — call `enrollConnection(entry)` after subscribing the
  `*all*` topic and BEFORE sending `claimed`. It walks every space point of the
  channel in collection order and runs
  `spacePoint._executeEnroller({ identity, connectionId, points })` —
  sequential, so a later enroller's
  `memberships.server.local.rooms({ connectionId })` sees the earlier
  enrollments of the same connect.
- Each enrollment UNIONS its rooms into the entry's participation
  (`addRoomsToEntry` — index + space-wide/room topics; over `maxRooms` → the
  whole setup fails, same as a throw) and lands in the `claimed` frame as
  `enrolled: [{ space, rooms }]` (omitted when empty). The server keeps no
  enrolled marker — how a room got there is not a fact it stores; the CLIENT
  marks the announced memberships enrolled (hold-less, no join behind them).
- A **throwing enroller fails the whole connection setup**: the engine
  `cleanupConnection(cid, 'close')` and answers `{t:'claimErr', cid, error}` — a
  connection missing its enrolled rooms would drop pushes silently.
- The `pointSpaceJoinServer*` family rides the enrollment with an empty input —
  an enrollment IS a join, server-initiated. `_executeEnroller` emits `Start`
  (and `Settled`/`Error` on a throw); the SUCCESS pair fires from
  `enrollConnection`, right after its `addRoomsToEntry`, exactly like a client
  join. A space with no `._enrollerFn` returns
  `{ rooms: [], roomsSerialized: [] }` without emitting.
- A `refresh` runs the whole connect path again → the enrollers re-run against
  the rebuilt identity, and the fresh `claimed` frame carries the new
  enrollments.

### The imperative enroll — `space.enroll(target, room)`

The mid-life twin of `.enroller` and the mirror of `space.kick` (kick = forced
leave, enroll = forced join). The first argument selects WHO with the usual
`$`-dictionary; the second is the room payload — a bare `TRoom | TRoom[]`, the
same one-or-many shape every other room surface takes (`kick`'s `room`, a push
target's `room`, a joiner's return); payload is separated from selection by
ARGUMENT POSITION, exactly like `amendIdentity(target, patch)`. **WHO matches
differently from every other space admin op**: room parts (`room`/`$room`)
select by the rooms connections are already in, but a bare / `connectionId` /
`$identity` target selects among ALL connections of the CHANNEL — requiring
existing rooms would defeat the point (enrolling a connection into its first
room of the space). `enrollImperativeLocal` (engine socket.ts) drops `space`
from the match selector when no room parts are present, exactly for that.

Per match it UNIONS the rooms into the participation (`addRoomsToEntry`; over
`maxRooms` → that connection is SKIPPED with a warning — an admin fan-out has no
one requester to answer), answers `{t:'enrolled', cid, space, rooms}` with the
connection's full new ENROLLED set of the space — a merely-joined room stays its
own membership's business (announcements replace client-side —
`applyEnrolledSpaces`, the same machinery the `claimed` reconcile uses), and
emits the `pointSpaceJoinServer*` family with an empty input (added rooms only)
— `Start`, then the Settled/Success pair after the union, like every join.
Crosses processes as the `enroll` bus envelope. A space kick shrinks enrollments
like any rooms — the pair is symmetric in SHAPE but not in park reach, by
decision: a kick reaches parked entries (`parkedSweepMatches` — a revocation
must not hide in a park), an imperative enroll does NOT (`matchLocal` is
live-only — parked connections are publicly dead, and a missed GRANT is
recoverable: the reconnect re-runs `.enroller`, and a durable enrollment is data
the enroller reads anyway). Lives as long as the CONNECTION: a resume restores
it (the passport keeps each room's provenance), but a full reconnect or a
`refresh` rebuilds enrollments from `.enroller` alone — a durable enrollment is
DATA the enroller reads; `enroll` delivers that fact to the connections already
live.

### Push targets and the addressing watershed

`SocketServerPushTarget` (core `socket.ts`) is one flat serialized shape, parts
AND-combined:
`{ connectionId?: string[], identityMatcher?: string, space?: string, rooms?: string[], exceptConnectionIds?: string[], exceptRooms?: string[] }`.
The core builder (`_buildPushTarget`) maps the user-facing `$`-dictionary onto
it at `sendToClient(message, target?, replies?)` time (the first positional is
the pushed **message** — a clientHandler sends messages, not input; the wire
frame field stays `input`): `connectionId` (string | string[]) → the array;
`$identity` → `identityMatcher` (channel-transformer-serialized sift query,
`$where` rejected); `room` (snapshot | array, space handlers) → `rooms`
(space-transformer-serialized); a space handler's `except` splits by element
kind — strings → `exceptConnectionIds`, objects → `exceptRooms`. `space` is set
on every space-handler push (the handler knows its space point).

`deliverPushLocal` picks the path from ONE criterion — does the target carry
CONNECTION parts (`connectionId` / `identityMatcher`), i.e. is the frame's
audience exactly a topic's audience? Resumable and plain channels take the SAME
watershed; the resumable one stamps its frames into topic streams on the way
(see Resumable connections):

- **No connection parts** (bare / `space` / `rooms` / `$room`) — the TOPIC path,
  the hot one: no `space` → the channel `*all*` topic; `space` without room
  parts → ONE publish on the space-wide topic (a bare space send); room parts →
  one publish per room topic, ONE serialization per topic however many members.
  A `$room` matcher resolves HERE, per process, into the concrete local rooms
  (sift over the parsed rooms of `entriesBySpace` participations — the explicit
  scan the `$`-key announces) and then rides the same room topics: a room push
  with LATE BINDING of the room set, not a personal one. Excepts ride the frame
  — the client filters itself (it knows its own cid and memberships).
- **Any connection part** — the PERSONAL path: direct per-socket sends after
  AND-filtering the entries (exact cids are O(1) `connections` lookups, the
  identity matcher is a sift scan; `space`/`rooms`/`$room` then require a
  covering membership) and the frame carries `cid` (plus `space`/`room` for the
  client's dispatch). On a resumable channel these frames belong to each
  recipient's PERSONAL stream.

**The watershed is a literal type fact** (`TRoom = undefined` → the target type
has no room keys at all — conditional assembly + Prettify, no `never` fields in
autocomplete). `$room`'s `$` is still the price tag of a scan — uniform across
pushes, admin and enumerations — but the scan resolves ROOMS, and rooms are
topics: only `connectionId`/`$identity` force per-recipient delivery.

- **cid is ephemeral** (a new one per reconnect): never store it as a long-lived
  address; the long-lived address is the ROOM name (it outlives a reconnect, the
  client re-joins). **Identity is DATA for selection, not an address**: two tabs
  of one user are two cids with equal identity. Identity/room sift matchers are
  a scan — for admin ops, not the hot path. Who the scan covers splits by WHAT
  scans: admin and the enumerations scan LIVE entries only (a parked connection
  is publicly dead), while a resumable PUSH's selection covers this process's
  parked entries too (`resumableCandidates`) — a selection push must reach a
  parked recipient's personal stream exactly like a topic push reaches its room
  stream, or the gap would go unmarked and `gapless` would lie.
- **StoredConnection (KV)** = `{ scope, channel, identity }`, plus — for a
  RESUMABLE channel only — the resume passport `{ keyHash, rooms }` (see the KV
  lifecycle below). A non-resumable channel keeps memberships OUT of the KV: a
  claim on another process rebuilds none, the client replays joins after a
  socket death, and the admin surface enumerates memberships from live entries
  over the bus — the KV stays small and the ping-renew cheap. A resumable
  channel trades exactly that: rooms ride the record (written through on the
  rare room changes) so a resume can restore them without a single joiner run.
- **Snapshots** carry spaces:
  `SocketConnectionSnapshot = { cid, identity: string, spaces?: Record<spaceName, string[]>, spacesParsed? }`
  — a channel snapshot lists every space of the entry, a space snapshot only the
  queried space's rooms (`snapshotEntry`). `spacesParsed` is filled by the
  INITIATING adapter right before handing gathered items to core
  (`withSpacesParsed`, channel-shaped items only — the space transformers live
  with the engine's point registry, not with the calling point); core then
  shapes the items: a channel `connections.server.list` item is
  `{ connectionId, identity, spaces }`, a space `memberships.server.list` item
  `{ connectionId, identity, rooms }`.

### matchLocal and the sift selectors

`AdminSelector` (the bus-serialized form of `SocketAdminTarget`) is
`{ scope, channel, space?, matcher? ($identity), roomMatcher? ($room), rooms? (exact snapshots), connectionId? }`.
`matchLocal(selector)` filters local `connections` by scope + channel — exact
`connectionId`s narrow the candidates to O(1) Map lookups — then AND-combines:
the identity matcher (sift over `identityParsed`) and, for a space selector, the
entry's participation in the space with a room satisfying the room parts. A room
must satisfy **both** present parts: be in the exact `rooms` list AND match
`roomMatcher`; an entry matches when ANY of its rooms does. `roomMatcher` is
where the `$room` subset semantics live: a flat `{ chatId: '5' }` sift query
matches every room whose `chatId` is `'5'` whatever its other fields, while an
exact snapshot in `rooms` is full-serialized-string equality. Matchers are Mongo
queries run by **sift**, parsed with the right transformer (identity → the
channel transformer, room → the space transformer) before sift runs, so Dates
compare as live values. `$where` is rejected in `_assertNoWhereOperator` (a
function can't cross the bus and is an eval hole).

### Space kick vs kill

- `space.kick({ room?, $room?, connectionId?, $identity? })` is NOT a connection
  kill — it's a forced LEAVE of the rooms satisfying the room parts (exact
  `room` snapshots and/or the `$room` matcher; neither = all rooms of the
  space): `kickLocal` removes them from each matched entry's participation
  (`removeRoomsFromEntry` — unindex, release topics, dropped at zero rooms) and
  sends the client one `{t:'left', cid, space, rooms, reason?}` frame per entry.
  The client removes those rooms from every covering `membership.rooms`; a
  membership at zero rooms stays `joined` with `[]` (it re-fills only by
  leave+join or a refresh). "Close a chat" = `kick({ room })` for everyone — a
  room has no state of its own, it exists while someone is in it.
- A space kick reaches PARKED entries too (`parkedSweepMatches` — the selector's
  connection parts; the room parts filter per entry like for live ones): the
  kicked rooms leave the participation, the room index (the streams' subscriber
  truth), the epochs and the KV passport, through the same
  `removeRoomsFromEntry` → `writeConnRecordThrough` path — the room comes back
  neither through a replay (no verdict is answered for a stream the connection
  no longer holds) nor through a later KV restore. Event-silent (the park
  already announced every room's leave as `'socket'`) and frame-less (the ws is
  dead): the `left` frame is queued on the park (`pendingLeft`) and delivered on
  unpark, right after the `resumed` answer and the replay. The entry stays
  parked to its window — parking is per CONNECTION (the channel's buffering
  handlers), not per room. A park that lapses before the resume leaves only the
  shrunken passport: the KV restore then restores the honest room set, but the
  client's own membership state keeps believing in the kicked room (no frame
  carried the news) — the same "the client re-derives what it can" weakness
  every KV restore has.
- `kill({ connectionId?, $identity? })` (rooms parts too, from a space point)
  stays a whole-connection `closed` + `cleanupConnection(reason: 'kill')`.

### Collect windows

A push whose `replies` argument is present (`.sendToClient`'s third positional —
`true` / `{ timeout?, onReply?, waitForAll? }`, typed into existence only by
`.clientReply`) opens a `PendingCollect`. **ONE frame = ONE reply**:
`deliverPushLocal` counts the frames that reach a LIVE connection — one per
targeted room it is in for a room push (off the room index), one for a
space-wide push, one for a channel push; excepted entries are skipped, and so
are PARKED ones (the indexes keep them for the streams, the counting loops check
liveness — a parked client cannot answer). How many components the client
mounted over a room is its own business — the client fans the frame's LISTENERS
out to every covering membership but runs the `.clientReply` responder once per
frame per connection. With an external backplane other processes can't be
counted — `expected` is `null` and only the timeout (the resolved `timeout`,
default 5000 ms) closes the window; the exception is an exact-cids-only channel
target (`connectionId` with no matcher and no space) whose every cid resolves
LOCALLY: cids are globally unique, so that resolution is total and `expected`
counts (a cid on another process — or nowhere — makes the count unknowable;
before this check a remote-cid window closed instantly with zero replies). An
`expected` of 0 closes the window immediately. The reply's room/space context
rides from the push TARGET onto every collected reply — the space always, the
room only for a single-room push (the reply frame carries only
`{ cid, data, error? }`); an errored reply (the client's `.clientReply` threw)
counts toward the window but delivers nothing (logged). Core validates each
reply against the `.clientReply` schema and drops invalid ones, then shapes the
item as `{ data, connectionId }`.

**Per-cid reply accounting** — the protocol lets any client that SAW a mid send
any number of `reply` frames, so the window never trusts the raw count:
`deliverPushLocal` also returns `expectedByCid`, and a countable window keeps it
as its per-cid allowance — a reply beyond a cid's allowance (or from a cid never
counted) is logged and dropped WITHOUT advancing `received`, so a dup flood can
neither close the window early nor land twice. An excepted cid
(`exceptConnectionIds` — it still receives the frame, excepts ride it) is
dropped the same way. An uncountable window coarse-bounds instead: per-cid cap =
1 for a channel or space-wide push, the targeted-room count for a room push, and
a generous bound (the engine `server.socket` option `uncountableReplyCap`,
default 1024) for a `$room`-matcher push (the matcher resolves remotely on other
processes) — duplicates within the cap are the multi-process trust boundary; the
schema validation still guards each reply's shape. Pinned by the dup-reply and
excepted-reply tests in `socket.int.test.ts`.

## Backplane KV lifecycle (`server.backplane`)

Strings only; the transformer already serialized. Written at the connect (POST
or the upgrade stash), read at claim, re-written on every ping (TTL slide) and
by `amendIdentity` (the patched identity), deleted on close/discard/kill. The KV
exists solely so the connect-serving process and the socket-holding process can
differ; the admin surface crosses processes over the BUS (every process matches
its OWN live entries), and the message hot path runs off in-memory
`connections`. Every record carries its own TTL — that, not a sweep timer,
reclaims what a crashed process left behind.

| Key                        | Written                                                             | Read          | TTL                    | Deleted                                                         |
| -------------------------- | ------------------------------------------------------------------- | ------------- | ---------------------- | --------------------------------------------------------------- |
| `point0:socket:ticket:<t>` | connect (POST/long path)                                            | claim         | 30 s                   | on claim, on `discard`, on TTL                                  |
| `point0:socket:conn:<cid>` | connect, re-set on claim + every ping + amend + every room change\* | claim, resume | `connectionTtl` (90 s) | on close/kill, on TTL; on socket death only for NON-resumable\* |

The `conn:<cid>` value is `{ scope, channel, identity }` — and, for a RESUMABLE
channel's connection, the resume passport on top:
`resume: { keyHash, rooms: { [spaceName]: { joined: string[]; enrolled: string[] } } }`
(the SHA-256 of the resume key and the per-space serialized rooms split by
PROVENANCE — a room both joined and enrolled sits in both lists;
`resumable: false` spaces excluded). \*The starred cells are the resumable
channel's additions: every room change (join/leave/enroll/space-kick — rare next
to messages) writes the record through (`writeConnRecordThrough`, skipped when
only an opt-out space changed), a resume is the record's second reader, and a
SILENT socket death deliberately does NOT delete it — the record IS the right to
resume and only its TTL (or a kill/close) ends it, which is also what keeps a
graceful shutdown redeployable. A non-resumable channel's record stays exactly
the old story: no rooms, no hash, deleted on every way out; its memberships are
rebuilt by the client replaying its joins.

**A live connection's identity lives in process memory and has no TTL.** The
socket-holding process keeps `identityParsed` / `identitySerialized` on the
entry, and the entry is what every push, guard, callback and enumeration reads —
nothing expires it, and nothing re-reads the KV to serve a message or to match
an admin target. `conn:<cid>` is the connect→claim handoff plus the resume
passport, and nothing else: the claim and the resume are its only readers. After
that the record is a copy the system keeps current — the ping slides its TTL,
`amendIdentity` rewrites it, the room write-through mirrors the rooms, the close
deletes it — and a copy that lapsed under a LIVE connection costs that
connection nothing: it keeps running, keeps its identity, keeps being pushed to
and enumerated (only the resume right lapses with it). The TTL bites on what has
not claimed yet — a record gone before its claim fails that claim with
`SOCKET_CONNECTION_NOT_FOUND` — and on a resume past the window, which is
refused into an ordinary full connect.

Abuse floors on the client-driven KV/bus paths: the ping renew is debounced per
entry (`RENEW_MIN_INTERVAL_MS` 10 s — a ping flood must not become a KV write
flood; the TTL has plenty of slack), and an unknown-mid `reply` frame is
bus-forwarded at most `REPLY_FORWARD_MAX_PER_WINDOW` (256) per 10 s per
connection (the mid is client-supplied on that path). A claim also checks the
ticket's `scope` against the socket's own (the bare endpoint is per-scope; a
cross-scope ticket is refused as invalid — the entry would otherwise land in
topics the dial's middleware pipeline never saw).

## Ready-made backplane adapters (`engine/src/backplane/*`)

Factories over a USER-CONSTRUCTED client, subpath-exported as
`@point0/engine/backplane/{postgres,ioredis,node-redis,bun-redis}`. Zero
dependencies by design: each is typed STRUCTURALLY against the slice of the
client it calls (the real `postgres`/`ioredis`/`redis` packages are engine
devDeps only, pinned by a never-called type-assert function in
backplane-adapters.unit.test.ts — a duck-type drift fails `bun run types`, not a
user install). Polling-based backplanes were considered and REJECTED — a poll
interval on the bus is latency on every cross-process message; only push
transports ship (which is why there is no Prisma adapter: Prisma cannot
`LISTEN`).

- **bun-redis** — `bunRedisBackplane(client)` over `Bun.RedisClient`; the
  `redis://…` URL shortcut in socket.ts `resolveBackplane` is now literally
  `bunRedisBackplane(new Bun.RedisClient(url), { closeClient: true })`. Owns the
  resilient subscriber wrapper both redis adapters that need it build on.
- **Error sink** — no `onError` option and no `console.*`: background failures
  (resubscribes, sweeps, detached disposes) go through
  `backplaneLogError(adapter)` in `engine/src/backplane/log.ts` → the ambient
  `log` from `@point0/core` (`_ssServerLog`), which `Engine.create`/`_setLog`
  keep pointed at the effective server logger (the `logger` engine option, then
  the root point's override) — an adapter constructed in the config factory logs
  where the rest of the server does, category `['point0', 'socket']`.
- **ioredis / node-redis** — thin command mapping (`SET PX`, `GETDEL` → Redis >=
  6.2), lazy `duplicate()` for the subscriber (or the `subscriber` option).
  Reconnect durability: ioredis re-subscribes on its own (documented
  `autoResubscribe`, default on); node-redis restores pub/sub too but does not
  document it, so its adapter wraps the subscriber in
  `createResilientRedisSubscriber` replayed on `'ready'` — correct in both
  worlds (the defensive unsubscribe clears, the subscribe re-adds one). Both
  client majors are supported (ioredis 5/6, node-redis 4/5/6): the 6s default to
  **RESP3**, and every command signature, reply type and subscribe-listener
  shape the adapters touch survives it unchanged (ioredis 6 ships
  `replyMapping: 'legacy'`). The devDeps ride the 6s, so
  `realClientTypesCheck` + `backplane-redis-clients.int.test.ts` pin the newer
  typings and the newer wire.
- **postgres** — postgres.js only (`sql.listen` keeps a dedicated auto-reconnect
  connection and re-listens itself). Absorbs the two Postgres limits: channel
  names are identifiers (63-byte cap, SILENT truncation → long room topics would
  fold) so every channel maps to `p0_<sha256-hex-48>`; NOTIFY payloads cap at
  ~8000 bytes so a message over 7000 bytes spills through the payload table
  (`r<id>` vs `i<inline>` wire prefixes) and delivery rides a per-channel
  promise lane so a spill fetch cannot be overtaken. KV = UNLOGGED table, TTL
  computed on the DATABASE clock (`make_interval`), expired rows read as missing
  before the sweeper (unref'd interval, also ages out payload rows) deletes
  them; `getDelete` = `DELETE … RETURNING` + the `live` flag. Tables
  auto-created on first use (`createTables: false` for restricted roles — SQL in
  the public docs). Requires a DIRECT connection (`LISTEN` dies in
  transaction-mode poolers).

**`dispose` is the contract's optional seventh function** (added with the
adapters): the engine calls it at `EngineSocket.dispose()` — after the topic
unsubscribes, detached, errors logged. Ownership rule everywhere: an adapter
closes what IT created (duplicated subscriber, listens, timers), never the
passed-in client; `closeClient: true` extends the close to the client for the
constructed-inline case (the URL shortcut uses exactly that). The in-memory
default's dispose clears its TTL timers (test processes create many engines).
Dev lifecycle: the factory form is re-invoked per engine generation so
per-generation dispose is clean; an adapter OBJECT passed directly is
re-resolved as the SAME object across hot restarts — its dispose must be
survivable (the `Backplane.dispose` docblock states this).

## Resumable connections

The opt-in that turns a reconnect from a full connect cascade into a couple of
KV reads. Storage and numbering live on TOPIC STREAMS — the unit is the topic
(channel-wide, space-wide, room, plus the per-connection PERSONAL stream for
connection-addressed pushes), never the recipient: one copy of every frame,
however many connections subscribe, and the shared topics keep riding the native
pub/sub publish (one serialization per topic). Three declaration-only options,
all TOP-LEVEL in their family's grouped point options (they survive both bundles
through the structural split, like `preventTransformer`): channel
`resumable: boolean` (the switch), space `resumable: false` (the opt-out — typed
as the literal `false`; a space cannot opt IN on a plain channel), clientHandler
`resumable: number | true | { buffer?, replay? }` (the per-stream buffer ceiling
of THIS handler's frames; `true` = `RESUME_HANDLER_BUFFER_DEFAULT` 128; the
object form adds `replay: 'always' | 'gapless'` — the replay policy, see the
gapless formula below). The tuning is the channel's `server.resume` group —
`{ parkWindow (30 s), streamMaxFrames (1024), streamMaxBytes (4 MiB) }`,
defaults applied in `_getChannelPointOptions`; a space's own `server.resume`
overrides the two ceilings for its room and space-wide streams. The validation
cascade fails at the CLOSERS: a buffering handler needs `resumable: true` on its
channel and is not allowed on a handler of a `resumable: false` space; the space
opt-out needs a resumable channel and refuses `.enroller` (a resume drops the
client's enrolled memberships of an opt-out space and the enroller re-runs only
on a FULL connect); `server.resume` (channel or space) without the switch — or
on an opt-out space — is refused as dead config. Resolution helpers:
`_getChannelPointOptions().resumable`/`.resume`,
`_getSpacePointOptions().resumable`/`.resume`,
`_getClientHandlerPointOptions().resumable`.

**The credential.** `mintResumeCredential` at both connect paths (ticket claim
and upgrade install): 128 bits of `randomBytes`, base64url, sent ONCE in the
`claimed` frame's `resumeKey`; the entry and the KV record keep only the SHA-256
(`resumeKeyHash`), compared with `timingSafeEqual`. Client-side the key lives on
the `InternalConnection` (`resumeKey` + `personalCursor` + `resumePending`) —
memory only, a page reload has no key and full-connects honestly. No rotation on
resume (deliberate — see the card's security notes).

**The passport.** `StoredConnection.resume = { keyHash, rooms }` built by
`buildConnJson(entry)` — the per-space serialized rooms, split `joined` /
`enrolled` by each room's provenance flags, of the spaces `spaceInResume` admits
(channel resumable AND space not opted out). `writeConnRecordThrough` mirrors
every room change of a LIVE entry (`addRoomsToEntry` / `removeRoomsFromEntry`
call it; a change that only touched an opt-out space skips the write — that is
the whole point of the opt-out), the ping renew re-sets the same json,
`amendLocal` rebuilds through the same builder so the passport rides an identity
amend.

**The topic streams** (`TopicStream`: `tseq`, `log`, `logBytes`,
`countByHandler`, `maxNonBufferedTseq`, `evictedMaxTseq`). Shared streams live
in `EngineSocket.streams` keyed by the SAME topic string the publish uses; the
personal stream lives on its entry (`entry.personalStream`). Two numbers per
frame: `tseq` — DENSE per stream, every frame consumes one whether it buffers or
not (the gap proof needs the hole numbered) and rides the wire; `stamp` — the
process delivery clock (`deliveryStamp`), one monotonic counter across every
stream of the process, kept in the log entry ONLY (never the wire) — the
merge-replay orders by it. `stampStreamFrame` assigns both, serializes once
(tseq baked in), then either logs the frame (an opted-in handler) or stamps
`maxNonBufferedTseq` — buffered or honestly holed, never silently lost. Eviction
is oldest-first under three ceilings — the handler's own within the stream
(`resumable: number`), the stream's `streamMaxFrames`, the stream's
`streamMaxBytes` (at least one frame always stays) — and every eviction raises
`evictedMaxTseq`, which is what turns an overflow into an honest
`gapless: false` instead of a silent gap. A stream is born lazily with the first
frame while its topic has at least one live-or-parked subscriber (a
subscriber-less topic publishes plain — a stream nobody holds could never be
released) and dies with the last subscriber leaving the matching index
(`releaseStream` next to the bus-topic release in `unindexRooms` /
`dropEntryFromIndexes` / `unindexEntryChannel`).

Both counters are bounded by `Number.MAX_SAFE_INTEGER` (2^53−1) and neither
wraps — past the bound JS `++` returns the same value forever, so the numbering
would STICK and the gapless formula would start proving `true` over frames that
share a number. They only ever advance together (one `stampStreamFrame` ticks
both), so `stream.tseq <= deliveryStamp` always and a single flag covers every
stream: `stampStreamFrame` sets `deliveryClockSaturated` when the stamp reaches
the bound, and `answerResume` then folds it into `vouch` — every resume of that
process is answered `gapless: false` with no replay, exactly the KV-restore
branch, and the clients refetch. The counters reset with the process, and at a
million frames a second the bound is ~285 years out; the guard exists so the
failure mode is an honest refetch rather than silent message loss.

**Subscription epochs** (`entry.streamEpochs`: topic string → tseq at entry).
Stamped at claim (the channel topic), at `addRoomsToEntry` (each ADDED room +
the space topic when the participation is born), deleted at
`removeRoomsFromEntry` — a re-entered room re-stamps a fresh epoch. The replay
floor of a stream is `max(client cursor, epoch)`: frames from before this
connection subscribed are not its gap (the epoch is what makes a topic log
shared across members with different histories provably correct per member). The
personal stream needs no epoch — it is born with the entry, at zero.

**The gapless formula** (`answerResume`, per stream):
`cursor <= tseq && maxNonBufferedTseq <= floor && evictedMaxTseq <= floor` where
`floor = max(cursor, epoch)` — a proof, not a guess. The verdicts ride the
`resumed` frame per stream (`streams: { [wireKey]: { gapless, head } }`); the
client re-seeds every named cursor from its head (authoritative), computes
`onConnect`'s verdict as `'c' ∧ 'p'` and each ROOM's `onEnter` verdict as its
own stream ∧ the space-wide stream (a room the server did not answer for is
being revoked — the queued `left` follows — and folds to `true`: the revocation
arrives as its own signal). Each stream is covered by exactly ONE callback
level, so a gap in a busy room never forces the quiet rooms or the global data
to refetch. The REPLAY is the union of every stream's log above its floor,
sorted by `stamp` and sent as one tail after the `resumed` frame — the total
per-connection order survives across streams within a process epoch. Every
replayed frame is MARKED (`rp`), and a replayed TOPIC frame is additionally
re-addressed to the resuming connection (`rcid`, a parse+patch at replay time —
rare — instead of a per-recipient copy at push time — hot): another connection
sharing the topic must not dispatch it twice; personal frames already carry
their `cid`. A handler declared `replay: 'gapless'` is FILTERED out of a GAPPY
stream's replay (`replayPolicyOf` memo in `answerResume`): its messages are only
valuable as a complete sequence, so a partial tail never arrives and the honest
verdict alone drives the refetch — the withheld frames STAY in the log, and a
later resume provably clean from the client's cursor delivers them in full.
Client-side the verdict bits live on the connection (`internal.resumeVerdicts`,
voided by a full connect's claim), and every dispatched frame's props carry
`replayed: false | { gapless }` — the frame's OWN stream's verdict
(`msgStreamWireKey` names the stream from the frame's shape; `rcid` deliberately
does not participate) — the per-listener escape hatch next to the per-handler
declaration.

**Parking = death + subscriber-ship** (`parkConnection` from
`cleanupConnection(reason: 'socket')`, only when the channel HAS buffering
handlers — `channelHasBufferingHandlers`). The entry leaves `connections` (so
`matchLocal`'s liveness belt drops it from enumerations, admin and counting) and
the death is announced at once — `pointSpaceLeaveServer(reason 'socket')` per
space, `pointChannelCloseServer` — but the RESUMABLE spaces' rooms stay in the
participation and the room index, which is what keeps the topic streams alive
and the personal stream reachable: THE PARK ITSELF BUFFERS NOTHING, the streams
are the buffer, and a parked subscriber costs a topic push exactly zero extra
work. Parked ones never receive and never count toward a collect window
(`deliverPushLocal` counts LIVE entries only — the indexes keep parked ones, so
the counting loops check liveness). Opt-out spaces' rooms go for REAL at park
time (`removeRoomsFromEntry`) — an unpark revives exactly what the passport
promises. The window is the channel's `server.resume.parkWindow` (default 30 s);
`sweepParked` drops the entry from the indexes (releasing streams nobody else
holds) — the KV record lives on to its own TTL, so a later resume still works,
replaying only what surviving shared streams can still prove. A KILL sweeps
matching parked entries too and deletes their records, and a SPACE kick shrinks
a parked entry's participation, index slot, epochs and passport the same way
(revocation must not hide in a park — see «Space kick vs kill»); a `'socket'`
cleanup of a resumable channel keeps the record even without parking — the
record is the resume right, only kill/close/TTL end it, and a graceful shutdown
(sockets closing = `'socket'`) therefore keeps a redeploy resumable by
construction.

**The resume itself** (`handleResume` — a bare socket accepts `resume` and
`claim` alike as its first frame; per-entry answers in offer order, every
refusal the ONE `{t:'resumeErr', cid}` shape, no oracle). The offer is
`{ cid, key, cursors }` — the cursor map, validated defensively (non-numeric
values dropped; an absent cursor means "never heard the stream" and the floor
resolves it). Three paths, cheapest first, each behind the hash check and the
`maxConnections`-on-the-new-socket cap (`resumeFitsSocket`):

1. **Takeover** — the entry is LIVE (the client's pong deadline beats the
   server's `idleTimeout`, so this is the main scenario, not an edge):
   `takeOverEntry` detaches the cid from the zombie socket, attaches the new one
   (`attachEntryToSocket` re-subscribes the topics), closes the old ws once it
   carries no cids, then `answerResume` — streams and epochs never moved, the
   verdicts are usually all-gapless. No server events — the connection never
   died publicly. Two tabs sharing an exported key steal the connection from
   each other, last-wins — documented.
2. **Unpark** — same process, the entry is parked. The KV record is re-read
   first: a kill's delete or a TTL lapse refuses the resume even though the park
   is warm (the streams must not outvote the record). The revival re-announces
   symmetrically — `pointChannelOpenServer` + the join family per space
   (`emitResumedJoins`, empty input, like an enrollment); after the `resumed`
   answer and the merged replay, the park's queued `pendingLeft` frames go out —
   the space kicks the client slept through.
3. **KV restore** — the passport is all there is (a redeploy, a lapsed park):
   rebuild the entry from the record — identity parse, `addRoomsToEntry` per
   passport space with the stored provenance (the `joined` and `enrolled` lists
   restore their flags — a restored enrollment stays leave-proof; spaces the
   deploy removed or opted out restore nothing), fresh epochs at the CURRENT
   stream heads — run NOTHING (no connector/joiner/enroller) and answer through
   `answerResume(…, { vouch: false })`: every verdict `false`, no replay, heads
   reset the client's cursors so the NEXT blip can prove itself. Deliberately
   conservative even when a shared stream survived on this process: the personal
   stream is reborn, and a surviving room log says nothing about what was
   assigned while this entry was out of the indexes — a restore cannot vouch for
   the window it slept through.

**The client half** (core socket.ts). On a reconnected socket's `open`, the
resumable connections (`resumeKey && cid`, policy allows) go FIRST as one
`resume` frame — per entry the cursor map from `buildResumeCursors`: 'c' and 'p'
always, plus the space-wide and room streams of every membership riding the
connection (opt-out spaces are not offered — they re-join). A socket drop KEEPS
a resumable connection's cid (`handleSocketClosed` skips the wipe) — cid + key

- cursors are the credential, and `connectionsByCid` keeps resolving the
  answers. `resumed` → `handleResumedFrame`: read the verdict map defensively,
  re-seed every named cursor from its head FIRST, mark every restored membership
  SYNCED (`lastCid = cid`) BEFORE anything polls the cascade (a mid-loop poll
  would replay the joins the resume just skipped — the ordering is
  load-bearing), re-enter the restored rooms (`enterRooms` reason `'resume'`,
  each room with ITS OWN verdict — enrolled memberships' rooms included) and
  fire `onConnect({ resumed: true, gapless })` once with `'c' ∧ 'p'`,
  `connectIndex++`, flush the queued sends; the replayed frames then ride the
  ordinary dispatch (`rcid` narrows a topic frame to the resuming connection;
  cursors advance in the `msg` case, before dispatch, by `max`). The EVENTS
  mirror the callbacks at the same spots: each restored membership's join family
  and the connection's connect family close `Settled` → `Success` with the same
  markers and pre-increment index (no `Start` — see the Events section). Opt-out
  spaces' memberships stay un-synced on purpose — the cascade replays their
  joins (the joiner re-judges); their ENROLLED memberships are disposed (the
  announcement is gone). `resumeErr` → clear the credential, full-connect that
  one channel. `refresh` VOIDS the credential before the re-connect (the resume
  bypass); a full connect voids it until its claim mints the fresh one.
  Per-connection fallback timers at the channel's client `resumeTimeout`
  (default 5 s) guard against a server that does not speak resume (a rolling
  deploy): an unanswered entry falls back to the full connect instead of
  hanging.

**The markers.** `ChannelConnectionEventProps` / `SpaceMembershipEventProps`
carry `resumed: boolean` + `gapless: boolean` next to the index; the fire
helpers default them to the full-path truth (`resumed: false`,
`gapless: index === 0`) and the resume path passes the server's PER-STREAM
verdicts folded per level (connection = `'c' ∧ 'p'`, membership = its rooms +
its space-wide). The truth table (the card's): first entry `false/true/0`; full
re-entry `false/false/>0`; resume without proof `true/false/>0`; resume with
whole streams `true/true/>0`. On a non-resumable channel `resumed` is always
`false` and `gapless` is exactly `index === 0`. The EVENTER speaks the same
dictionary: the client connect/join families carry the index on every phase and
the markers on the successful outcome (same truth table), the server join family
and `pointChannelOpenServer` carry `resumed` on the re-announce paths — see the
Events section.

## The socket backplane bus

`Backplane` is a KV **plus** channel pub/sub (`publish(channel, message)` /
`subscribe(channel, onMessage)`). point0 owns every channel name — each travels
to the backplane as an argument; the implementation just routes what it is given
and knows nothing about `point0:*` (same as the KV side, where keys arrive
ready-made). A future second consumer of the bus (cache invalidation, crons)
takes its own channels — no hand demultiplexing. The in-memory default keeps
subscribers in a `Map` keyed by channel name and loops `publish` straight back
to that channel's local subscribers, so the single-process and multi-process
paths run identical code. Every process publishes with its own `pid`;
`handleBusMessage` drops any envelope whose `pid` is its own — so a `publish`
that echoes back is not double-applied. Envelopes carry `v: 1` to guard a
rolling deploy sharing one bus.

### The sharded topology — topic-per-room

The bus is SHARDED: a process subscribes only to channels whose traffic it can
deliver, instead of every process reading (and mostly discarding) one shared
stream — on N nodes the old single channel cost every node the whole cluster's
message flow (per-node work linear in cluster size, total quadratic). The
channels:

| Channel                                                   | Subscribed                                                        | Carries                                                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `point0:socket:bus` (shared)                              | every process, from `start()`                                     | commands (`kick`/`kill`/`refresh`/`amend`/`enroll`), `count-req`/`connections-req`, and pushes with a SELECTION part (`connectionId` / `$identity` / `$room`) |
| `point0:socket:proc:<pid>` (inbox)                        | its own process, from `start()`                                   | every ANSWER: forwarded collect `reply`s, `count-res`, `connections-res`                                                                                      |
| `point0:socket:channel:<scope>:<channel>`                 | processes holding ≥ 1 connection of the channel (parked included) | channel-wide pushes (no `space`, no selection)                                                                                                                |
| `point0:socket:space:<scope>:<channel>:<space>`           | processes holding ≥ 1 member of the space (parked included)       | space-wide pushes (a bare space send)                                                                                                                         |
| `point0:socket:room:<scope>:<channel>:<space>:<roomName>` | processes holding ≥ 1 member of the room (parked included)        | exact-room pushes — one publish per targeted room                                                                                                             |

The routing watershed for a push mirrors `deliverPushLocal`'s addressing
watershed exactly: NO selection parts → the topic of the exact address; ANY
selection part → the shared channel (a sift matcher resolves per process against
entries only that process can see — it cannot be laid out over topics — and a
cid names no room). Answers never broadcast: the requester's `pid` rides
`count-req`/`connections-req`, and a collect **mid is minted as
`<pid>:<generateId()>`** so any process can route the reply to the initiator's
inbox off the mid alone (`replyTopicForMid`); a mid without the `:` marker — an
older node's window on a rolling deploy, or a client-invented id — falls back to
the shared channel, still under the reply-forward rate cap.

`<roomName>` is the room's canonical serialization (serialization = identity —
the same invariant the local room index keys build on), switched to its SHA-256
(base64url) past `BUS_ROOM_TOPIC_NAME_MAX` (128) so channel names stay bounded.

**Local filtering stays everywhere.** Every envelope carries its full target and
the receiving process matches it against its own entries exactly as before
(`deliverPushLocal` / `matchLocal`). That is the safety net that makes the
sharding an OPTIMIZATION, not a correctness dependency: a `void`-subscribe
implementation that broadcasts everything to everyone stays correct (it just
pays more), a room-name hash collision merges two topics' traffic without a
wrong delivery (the stranger's envelopes filter out), and the shared channel
keeps understanding every envelope kind.

**Dedup of the multi-room push.** `rooms: [a, b]` publishes the SAME envelope
once per room topic — a process subscribed to both receives two copies. The
envelope carries an `eid` (set only when it goes to more than one topic) and the
receiver keeps the recent ones (`BUS_DEDUP_REMEMBERED_IDS` 2048, a FIFO window —
copies arrive back-to-back) — one delivery pass per push. An id, not "idempotent
delivery by local match": delivering the same frame set twice is observable (a
client handler runs per frame), so there is no natural idempotency key — the
envelope id is the honest one. A copy that somehow outlived the window would
mean one extra delivery of identical frames, not a wrong recipient.

**Subscribe BEFORE confirm.** The topic of a room goes up before the room is
indexed and the client (or the enroller's `claimed`, or `space.enroll`'s
`enrolled`, or a resume's restore) is answered — `handleJoin` /
`enrollConnection` / `enrollImperativeLocal` / the KV-restore await
`subscribeBusTopics` between the joiner's answer and `addRoomsToEntry`. That
closes the loss window: once the membership is VISIBLE anywhere (confirmed,
indexed, enumerable), the subscription is already listening, so any push
published after the join landed reaches this process; a push published before
that is indistinguishable from a push before the join — no promise broken. After
every such await the entry's liveness is re-checked (the socket may have died
mid-subscribe), and a refusal path releases what it subscribed
(`sweepRoomBusTopics`). A FAILED subscribe logs, resolves and leaves the map so
a later need retries — the join still lands, delivery degraded, the same posture
as a failed `start()`.

**The unsubscribe linger.** Subscriptions are refcounted off the live indexes
(`entriesByRoom` / `entriesBySpace` / `entriesByChannel` — the last one added
for the channel topic, live + parked entries like the other two). The last
member out does not unsubscribe: the topic lingers `BUS_TOPIC_LINGER_MS` (2 s)
and a re-entry inside the window cancels the timer and reuses the live
subscription — a join/leave flutter on the last member must not become a
subscribe/unsubscribe storm. PARKED entries stay in all three indexes on
purpose: a parked connection's ring is the topic's live consumer, so its
subscriptions live as long as the park (swept by `sweepParked` →
`dropEntryFromIndexes`).

**Resubscribe is the implementation's duty.** A settled `subscribe` is durable
until the engine calls the returned unsubscribe — the engine owns a SET of
topics now, cannot see a transport blip, and never re-issues subscribes after
one (the `Backplane.subscribe` docblock in config.ts states this). The built-in
`redis://…` shortcut wraps its subscriber-mode duplicate in
`createResilientRedisSubscriber` (in `engine/src/backplane/bun-redis.ts`,
applied to Bun's client by `createResilientBunRedisSubscriber`; the node-redis
adapter reuses the same wrapper over its `'ready'` event): it keeps a channel →
listener registry and replays the whole set on EVERY `onconnect` — Bun's client
fires `onconnect` on each successful (re)connect and does NOT fire `onclose` for
a drop it is still retrying (`onclose` is terminal-only: an explicit `close()`
or a client that will not retry), so onconnect is the only reconnect signal
there is and the initial one replays an empty registry, a no-op. The replay
unsubscribes before it subscribes per channel: Bun restores no subscriptions on
its own, a second `subscribe` of a channel STACKS another listener (double
delivery), and `unsubscribe(channel)` clears every listener of the channel — all
of it pinned against a killed-and-restarted real Redis in
redis-subscriber-reconnect.int.test.ts (spawns its own `redis-server`, skips
without the binary).

**Ordering across channels — the races, analyzed.** One shared channel gave a
total order per publisher; per-topic channels order only within a topic, so a
command on the shared channel and a push on a room topic from the SAME publisher
may now apply in either order on a receiver. The local index is authoritative at
delivery time, and both orders land in a consistent state:

- _kick published, then push_: if the push overtakes the kick, the receiver
  still holds the membership and delivers — one last frame to a
  member-about-to-be-kicked, exactly what a cross-publisher race could always
  produce; when the kick lands, the membership goes. If the kick applies first,
  the push finds no member and delivers nothing. No wedged state either way.
- _push published, then kick_: if the kick overtakes the push, the push arrives
  to a membership already gone and is dropped — the member loses a frame it
  would have received under the old total order. Accepted: delivery is
  at-most-once by design, the member is out either way, and the truth lives in
  queries.
- _join confirm vs push_ is not a cross-channel race at all — the
  subscribe-before-confirm rule above closes it locally.
- _enroll (shared) then push (topic)_: same shape as kick-then-push mirrored — a
  push overtaking the enroll finds no membership yet and drops (the enrollment
  was not yet visible on that process, so nothing promised the frame); once the
  enroll applies, its subscribe-before-confirm has the topic listening before
  the membership is announced.

Within one topic order is preserved end-to-end (Redis pub/sub and the in-memory
default both deliver in publish order), so the per-room frame stream a client
observes keeps its order — and a resumable channel's dense per-stream `tseq`
numbers every frame of that stream anyway.

**Rolling deploys across the sharding change** lose cross-version pushes: an old
node subscribes only the shared channel, a new node publishes exact-address
pushes to topics the old node never reads (commands still cross — both sides
keep the shared channel; new-node roll-call answers ride inboxes old nodes do
not have). Pre-1.0 accepted; noted in [deploy](../../docs/engine/deploy.md)
(generic mixed-version guidance — the sharding never shipped unsharded, so no
release note names it).

**The escape hatch.** `POINT0_SOCKET_BUS_FORCE_SHARED=true` (read once at
`EngineSocket` construction) publishes everything to the shared channel and
subscribes no dynamic topics — the pre-sharding wire. Fleet-wide by nature: a
forced process does not listen where an unforced one publishes, so set it on
every process sharing the backplane. Observability: `engine.socket.status()`
reports `busSubscriptions` — the shared channel + the inbox (once started) plus
the dynamic topics currently held.

Envelope kinds (`BusEnvelope` in `engine/src/socket.ts`) and their channels:

| Kind              | Sent when                                                           | Channel                                                | Receiver does                                           |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------- |
| `push`            | a handler `send` with an external backplane                         | topic of the exact address; shared if a selection part | `deliverPushLocal` to its own sockets                   |
| `reply`           | a collected push's reply lands on a process that didn't initiate it | the initiator's inbox (off the mid)                    | forwards it to the initiator's `PendingCollect`         |
| `kick`            | `space.kick` with an external backplane                             | shared                                                 | `kickLocal` on its matching rooms                       |
| `kill`            | `kill` with an external backplane                                   | shared                                                 | `killLocal` on its matching connections                 |
| `enroll`          | `space.enroll` ⋯ (selector + serialized rooms)                      | shared                                                 | `enrollImperativeLocal` — grow its matches' enrollments |
| `refresh`         | `channel.refresh` ⋯                                                 | shared                                                 | `refreshLocal` on its matching connections              |
| `amend`           | `channel.amendIdentity` ⋯ (selector + serialized patch)             | shared                                                 | `amendLocal` — shallow-merge into its matching entries  |
| `connections-req` | `connections.server.list`/`.forEach` / `memberships.server.*` ⋯     | shared                                                 | answers with a `connections-res` of its local snapshots |
| `connections-res` | a process answering a `connections-req`                             | the requester's inbox                                  | the initiator streams the items into its pending gather |
| `count-req`       | `connections.server.count` / `memberships.server.count` ⋯           | shared                                                 | answers with a `count-res` of its local match count     |
| `count-res`       | a process answering a `count-req` (a number, never items)           | the requester's inbox                                  | the initiator adds it to its pending count              |

`connections-req`/`connections-res` serve `list` AND `forEach` — the shared
`enumerateSnapshots` machinery streams local matches first, then bus items as
they arrive, and closes the gather on the timeout; `list` is `forEach` with an
accumulating `onItem`. `count` rides its own numbers-only envelopes. The
selector on `kick`/`kill`/`refresh`/`amend`/`*-req` envelopes is the
`AdminSelector` above — `space` set for a space selector, absent for a channel
one.

**Eager subscribe.** `registerAdapters` (at server start) kicks off `start()`,
which subscribes the shared channel and this process's inbox immediately — a
lazy subscribe would drop envelopes published before this process's first socket
touch. `start()` is idempotent (`busStarted` guard), `subscribe` may return an
unsubscribe fn, and `dispose()` calls every held one — the two start-owned plus
the dynamic topics (plus a `disposed` flag that no-ops `handleBusMessage`) —
dev-server restarts against one long-lived user `Backplane` must not stack
subscriptions. Off-hot-path KV calls go through `kvSafe` (catch + log).

## Admin surface

The channel owns `kill` / `refresh` / `amendIdentity` and the `connections.*`
enumerations; the space owns `kick` / `kill` / `enroll` / `refresh` /
`amendIdentity` and the `memberships.*` enumerations (`refresh` is channel-only
— a space has no identity to rebuild). The COMMANDS sit directly on the point —
actions, not reads, and server-only, period. The ENUMERATIONS name a FLOOR
first: `server.*` (the cluster, over the bus), `server.local.*` (this process,
synchronous), `client.*` (this browser tab, synchronous). There is no flat
`connections.count`, and a floor throws on the wrong side rather than answering
empty. Every server-floor target is the `$`-dictionary (`ChannelAdminTarget` /
`SpaceAdminTarget` in core types.ts), parts AND-combined, bare = everything in
scope; the client floor takes no target at all:

- `kill({ connectionId?, $identity?, reason? })` — `closed` per match, then
  `cleanupConnection(reason:'kill')`; from a space point the target adds the
  room parts (the connections HOLDING matching rooms).
- `channel.refresh({ connectionId?, $identity? })` — `refresh` frame; the client
  re-connects (connector + enrollers re-run) and re-joins its spaces.
- `channel.amendIdentity({ connectionId? | $identity? }, patch)` — shallow-merge
  the patch into the stored identity of the matches, everywhere.
- `space.kick({ room?, $room?, connectionId?, $identity?, reason? })` — `left`
  frames; forced leave of the matching rooms (not a connection kill).
- `space.enroll({ room?, $room?, connectionId?, $identity? }, room | room[])` —
  `enrolled` frames; grow the matches' server-side enrollment (see The
  imperative enroll above — a target with no room parts matches ALL connections
  of the channel).
- `channel.connections.server.count/.list/.forEach(target?, { timeout?, on…? })`
  — items `{ connectionId, identity, spaces }`.
- `space.memberships.server.count/.list/.forEach(target?, { timeout?, on…? })` —
  items `{ connectionId, identity, rooms }` (rooms of that space, parsed with
  the space transformer).
- `channel.connections.client.count()/.list()` — the live connection FACADES of
  this channel on this client.
- `space.memberships.client.count()/.list()` — the live membership facades of
  this space on this client, ENROLLED ones included (nothing else reads those
  one at a time: an enrollment has no join input for `getMembership` to look up
  — this is the read on a joiner-less space).

`_resolveAdminTarget` is the shared core guard: it builds the serialized
`SocketAdminTarget` — the identity matcher rides the CHANNEL transformer
(identity lives on the channel), the room matcher and the exact room snapshots
the SPACE transformer — asserts no `$where`, and resolves the scope's adapter.
`_buildEnumeration` builds the `connections`/`memberships` namespace lazily
(cached per point), both floors in one object, with the kind guard at call time.
`count` travels the bus as numbers only; `list`/`forEach` scatter-gather
snapshots into a `PendingConnectionsGather`; every window closes on `timeout`
(default 1000 ms, `CONNECTIONS_GATHER_DEFAULT_MS`) — a snapshot over a window,
latecomers are not in the result. `forEach` with a callback resolves with the
processed count; bare, core wraps the stream into an async iterable.

The **client floor** is a different machine entirely: it never touches the
adapter seam, it reads the socket manager's own registries through
`listChannelConnectionFacades` / `listSpaceMembershipFacades` (core socket.ts) —
`manager.connections` filtered by `channelKey`, `manager.memberships` filtered
by `spaceName`, merge chains resolved, disposed ones out, deduped — and hands
back the canonical facades. Synchronous, hold-less, no targets in v1. A
killed-but-still-held connection (`manager.closedHeld`) is NOT in it;
`getSocket()` is the surface that still shows those. `count()` is
`list().length`. Its guard is `if (_point0_env.side.is.client) …` inverted —
`side.is.server` first line, so the server bundle keeps only the throw. NOT in
v1 (deliberate, revisit on a real case): reactive `useList()` / `useCount()`
hooks, and moving `getConnection` / `getMembership` under `.client.get()`.

### Engine introspection — `engine.socket`

The points' enumerations answer "which connections match THIS target"; the
engine facade answers "what does this PROCESS hold right now". Two synchronous
reads, built in the `Engine` CONSTRUCTOR (`createEngineSocketFacade`,
engine/socket.ts) over two lazy getters — the live `EngineSocket`
(`server.socket`) and the configured backplane option — so `engine.socket`
exists from `Engine.create` on, predates `prepare()`, survives `socket: false`,
and never throws: with no socket it answers the empty snapshot
(`emptyEngineSocketLocalSnapshot`) and `started: false`. `EngineSocket` itself
stays internal; this is the public window onto it.

- `engine.socket.local.get()` → `EngineSocketLocalSnapshot` (`localSnapshot()`)
  —
  `{ socketsCount, roomsCount, parkedCount, streams, connections, memberships }`.
  `parkedCount` is `parkedByCid.size`; `streams` aggregates the resume buffers —
  shared topic streams plus the personal streams of live AND parked entries
  (`{ count, frames, bytes }`) and the cumulative `evictedFramesTotal`
  (`this.evictedFramesTotal`, bumped in `stampStreamFrame`'s evict) — the
  observability of the feature's main memory and of "the ceilings are too
  small". `socketsCount` counts the DISTINCT `entry.ws` of the live entries (one
  socket multiplexes every channel connection of a client, so it is ≤
  `connections.length`; there is no separate socket registry to read).
  `roomsCount` is `entriesByRoom.size` — distinct `(scope, space, room)` topics,
  not memberships. `connections` is one item per claimed connection
  (`{ scope, channel, connectionId, identity }`), `memberships` one per
  `(connection, space)` participation
  (`{ scope, channel, space, connectionId, rooms }`) — a participation is
  created on the first room and dropped at zero rooms, so a connection with no
  rooms of a space is simply absent. Identity and rooms come out PARSED (the
  entry keeps both forms; the facade hands out the parsed one, like the events
  do).
- `engine.socket.status()` → `{ started, backplane, busSubscriptions }`.
  `started` is `busStarted && !disposed` — the bus SUBSCRIPTION, not "a socket
  is open" (a failed subscribe and a disposed engine both read `false`).
  `backplane` is `'memory' | 'redis-url' | 'custom'`, classified from the
  configured option (`engineSocketBackplaneKind`) — a health check dials
  nothing. `busSubscriptions` counts the live bus subscriptions this process
  holds: the shared channel + the inbox once started, plus the dynamic
  channel/space/room topics of the sharded bus (grows with the first local
  member of a room, shrinks after the unsubscribe linger).
- The CLUSTER floor is deliberately not here: it already exists as the points'
  `connections.server.*` / `memberships.server.*` over the bus (with targets).
  `engine.socket` is the local floor for metrics, health checks and devtools.
  Pinned by `engine/tests/engine-socket-helpers.unit.test.ts`.

### amendIdentity flow

`channel.amendIdentity(target, patch)` → core serializes the patch with the
channel transformer → the adapter's `amendIdentity` applies `amendLocal` locally
and publishes the `amend` envelope. `amendLocal` shallow-merges the parsed patch
into each matched entry's `identityParsed`, re-stringifies `identitySerialized`,
rewrites the entry's `connJson`, and re-`set`s the `conn:<cid>` KV record
(kvSafe). Data, not rights: memberships, topics, and rooms are untouched; the
client is not notified (the identity never leaves the server). A function
updater is impossible by construction — the patch must ride the bus as data. A
CONNECTORLESS channel is refused before any of this: its identity is the strict
`{}`, so the call is a compile error (`AssertIdentityAmendable` —
`keyof TIdentity` empty; `Partial<Record<never, never>>` alone would take ANY
patch) and the public method throws on the `_connectorDeclared` fact (the
declaration, never the runtime identity value) — the runtime identity can never
grow keys the type never admitted. Pinned by `socket-builders.unit` (type) and
`socket-connectorless.int` (runtime).

## Events

Every socket event carries the connection as the bare `connectionId: string`
(`connectionId: undefined` on the error/settled variants where the connection
never materialized — e.g. a failed connect). The rich client `connection` FACADE
stays on the client-side listener inputs (`onMessageFromServer`,
`onReplyFromServer`, `.clientReply`) — those are a different surface.

**THE PAYLOAD NAMING LAW — the word encodes the transport semantics** (the
canonical legend lives as a comment block above `ClientHandlerMessageEventProps`
in types.ts):

- **`input`** — the payload of a CALL addressed to a point (someone called it
  and gets an answer): the channel connect (`.connector`), a space join
  (`.joiner` + join guards), a serverHandler send (`.serverReply` +
  `onBefore/AfterServerReply`) — query vocabulary. Decisive argument: the
  serverHandler has query/mutation flavors (`useSocketQuery(input)`), so its
  payload MUST speak query vocabulary end to end.
- **`message`** — the payload of a PUSH (`sendToClient` — a broadcast, nobody
  awaits): `.clientReply` props, `onMessageFromServer`/`useOnMessageFromServer`
  listener props (`ClientHandlerMessageEventProps` — also carries the typed
  `room` for a space handler), `iterateMessagesFromServer` (yields the bare
  message).
- **`data`** — the OTHER side's answer to you: `await sendToServer()` resolves
  with it, `onReplyFromServer.data` (its `input` is the RAW send input —
  pre-parse, the callback fires client-side), a collected push reply
  `{ data, connectionId }`.
- **`output` XOR `error`** — your own execution result in telemetry: the
  `onAfter*` customizers and the `point*` events (the eventer pair).

The lower layers keep `input` on purpose: the WIRE frame field
(`{t:'msg', input}` / `{t:'send', input}`), the `pointHandler*` EVENTS (one
family shared with the server side), and `?input=` URLs are all still `input`.

**The listeners are DECOUPLED from `.clientReply`** (2026-07-27): a push
dispatch runs two independent tails via `runIncomingMessageDispatch` (core
socket.ts) — the listeners fire immediately with
`{ message, connection, point, room? }` (NO `data`: they never wait for the
auto-responder, a slow/throwing `.clientReply` cannot delay or suppress them),
while the responder computes the reply, answers the collect window (data or the
typed error), and emits the `pointHandlerClient*` events (`output` = the reply).
A LISTENER throw only logs (like every lifecycle callback) — it never reaches
the events and never sends an error reply. Before the decoupling the listeners
ran AFTER an awaited clientReply, so a throwing responder silently suppressed
them.

- The socket four-phase families are SPLIT BY SIDE — the two sides are different
  operations with different data, not one event on two sides: `...Server*` fires
  around the server execution and carries the connection `identity`;
  `...Client*` fires around the client operation and has no identity field at
  all.
- `pointChannelConnectServer*` (the connector run — `Success`/`Settled` carry
  `identity`) / `pointChannelConnectClient*` (the connect, settled at its
  CLAIM): `Settled`/`Success`/`Error` carry `connectionId` (`undefined` on
  error); the server-only singles `pointChannelOpenServer` /
  `pointChannelCloseServer` carry `{ connectionId, identity }`;
  `pointChannelOpenServer` adds `resumed: boolean` (`true` on a resume revival —
  unpark or KV restore, no connector ran for that open);
  `pointChannelCloseServer` adds `reason: 'close' | 'socket' | 'kill'`.
- `pointChannelClaimServerError` — the server-only single for a claim that never
  landed, emitted at EVERY site answering a `claimErr` frame (`emitClaimError`
  in engine/src/socket.ts; the ticket path routes through the one `fail` closure
  of `handleClaim`):
  `reason: 'ticket' | 'connection' | 'channel' | 'maxConnections' | 'enroller'`,
  plus `{ scope, point, connectionId, error }` — `point`/`connectionId` are
  undefined when the refusal came before the ticket resolved to a record (a bad
  ticket must name nothing: no oracle). The connect family fires at connector
  time, BEFORE the claim, so this is the only server-side trace of a connection
  that never went live. No CLIENT counterpart is needed — and this is the reason
  a `pointChannelClaimClient*` was never added: the client family SETTLES at the
  claim (`handleServerFrame`'s `claimed` / `claimErr` cases in core socket.ts),
  so the same refusal closes `pointChannelConnectClient*` with `Settled`/`Error`
  carrying the server's typed error.
- `pointSpaceJoinServer*` (the `.joiner` run, with `identity`) /
  `pointSpaceJoinClient*` (the join frame): `Start` / `Settled` / `Success` /
  `Error`, each with `connectionId`; `Success` carries `rooms: unknown[]` (`[]`
  = a clean deny). The server family also fires around each `.enroller` run
  (with an empty input — an enrollment is a server-initiated join), and around
  each `space.enroll` match. The server family's `Start`, `Success` and
  `Settled`'s success side carry `resumed: boolean` — `true` only on the resume
  re-announces (`emitResumedJoins` / the KV-restore path), which ride the family
  `Start` included; the error variants carry no `resumed` at all (a refused
  resume never reaches the family).
- **The CLIENT families carry the lifecycle counters/markers** — the exact
  values the callbacks read, captured before the same `++`:
  `pointChannelConnectClient*` carries `connectionIndex` and
  `pointSpaceJoinClient*` carries `membershipIndex` on EVERY phase (a reconnect
  = the next `Start` with index `> 0`, no separate event); the successful
  outcome (`Success` + the success side of `Settled`) adds `resumed`/`gapless`.
  The error phases carry no markers — a failed operation has no entry to
  describe. A landed RESUME closes each family with `Settled` → `Success`
  (`resumed: true`, `gapless` = the server's verdict) and NO `Start` — the
  resume is one shared frame at the socket's open, and its refusal falls back
  into the full connect/join whose family runs the complete cycle (a resume
  `Start` would dangle there).
- **The CLIENT connect family settles at the CLAIM, and settles ONCE**
  (2026-08-01). A connect POST only earns a ticket, so `connectInternalRun`
  emits the `Start` and nothing else on a successful request; the settle lives
  in `handleServerFrame`: `claimed` → `Settled`/`Success` with the outcome
  `onConnect` just read (`connectionIndex` captured before the same `++`,
  `resumed: false` — a resume never arrives as a `claimed` frame — and
  `gapless: index === 0`), `claimErr` → `Settled`/`Error` with the server's
  typed error. Both go through `settleConnectClient` (core socket.ts), the one
  place the family closes. The four settle sites and their attempt:
  1. the claim (`claimed`) — the ticket path AND the cold-start upgrade, which
     now reaches the SAME site: the upgrade hand-off writes the cid and falls
     through into the shared claim bookkeeping instead of emitting its own pair
     (that duplicate is exactly what the move would have caused);
  2. the claim refusal (`claimErr`) — the enroller throw, the `maxConnections`
     cap, a lapsed record, an unresolvable ticket. The `!internal` branch (an
     upgrade refusal on a cid the client never learned) emits NOTHING and hands
     over to the ticket path: the attempt continues on the same `Start` and
     settles at ITS claim, so the whole upgrade-then-fallback story is one
     `Start` and one settle;
  3. a connect request that never earned a ticket (`connectInternalRun`'s error
     branch) — the claim it would have settled at never happens;
  4. a socket that died with the claim unanswered (`handleSocketClosed`, ticket
     in hand + not claimed + still `connecting`): the ticket is burned with the
     socket and the reconnect re-POSTs a fresh `Start`, so the dying attempt
     settles with `POINT0_SOCKET_CONNECTION_LOST` instead of dangling. An
     attempt still waiting for its POST is left alone — its claim goes out on
     the next socket.

  The single deliberate gap: a connection DISPOSED mid-attempt abandons its
  family (no settle), like a cancelled operation — the discard/close paths
  already tear the connection down and nobody is left to report to. Before the
  move the ticket path emitted `Settled`/`Success` with a hardcoded
  `resumed: false` and a GUESSED `gapless: index === 0` one round trip early,
  and a `claimErr` emitted nothing at all — a connection that never went live
  was reported as a successful connect and its refusal was invisible to
  `.on('error')`.

- **The `Start` of both server families sits ABOVE the schema parse**
  (2026-08-01). `_executeServerReply` emits `pointHandlerServerStart` before the
  `.clientSend` parse and `_executeJoiner` emits `pointSpaceJoinServerStart`
  before the space's `.input` parse, so the commonest refusal of all — a bad
  input — closes the family with `Settled`/`Error` instead of throwing before
  anything was announced. The consequence, and the reason it is safe: the
  family's `input` is now the RAW payload on every phase, exactly like the
  fetch/query/mutation families (whose one `_eventData` carries what the caller
  passed, unvalidated). The `.serverReply` / `.joiner` callbacks and their
  `onBefore*`/`onAfter*` customizers still see the PARSED input — the
  customizers are merged below the parse and do not run for a parse failure (a
  schema refusal is neither the reply nor a guard). `_executeEnroller` needs
  nothing: an enrollment has no input to parse.
- **The socket-level client singles are two**: `socketClientConnect` fires on
  EVERY successful transport open — its data carries `socketIndex: number`
  (successful opens before this one; the manager counter resets on a full idle
  teardown, so the next socket is honestly the first again) — and
  `socketClientDisconnect` on the drop. The separate reconnect single is GONE
  (folded into the connect single, 2026-07-31): one event per open, the index is
  the first-vs-repeat distinction, mirroring the lifecycle indexes. No
  `resumed`/`gapless` on the singles — those are per-connection entry verdicts,
  while the transport always opens with a fresh handshake.
- **`socketClientError`** is their failure sibling (client-only single,
  `{ scope, socketIndex, reason: 'open' | 'exhausted', error }`): `'open'` from
  the socket's `onerror` when the handshake never completed (guarded on
  `wsStatus !== 'open'` — an error on a LIVE socket is the ordinary drop, which
  `socketClientDisconnect` reports), `'exhausted'` from `scheduleReconnect` when
  the policy runs out of attempts and the connections flip to `closed`. The
  browser's error event carries nothing by design, so the payload's error is a
  framework-built `POINT0_SOCKET_CONNECTION_LOST`. Like the other client singles
  the emit rides `heldInternals(manager)[0].channel` — a socket held with zero
  connections (a bare `<Socket>`) fails silently, there is no point to emit
  through.
- **When the server join events fire is a contract.** `Start` fires before the
  joiner/enroller runs, from `_executeJoiner`/`_executeEnroller`. The
  Settled/Success pair does NOT: the execute returns the rooms, the engine
  registers them (`addRoomsToEntry` — participation, index, topics) and only
  then calls `point._emitSpaceJoinSettled(...)`. The event therefore means "the
  join is DONE": a handler on `pointSpaceJoinServerSuccess` reading
  `space.memberships.server.list({ room })` SEES the connection it was told
  about — that is the whole presence recipe, and it is symmetric with
  `pointSpaceLeaveServer`, which fires after the removal. A throw still emits
  `Settled`/`Error` inside the execute (nothing was registered, nothing to wait
  for), and a join the ENGINE refuses after the joiner ran — the socket died
  mid-join, or the rooms would pass `maxRooms` — closes the family through the
  helper's ERROR variant (`Settled` then `Error`, rooms undefined): a `Start`
  never dangles, and only a join that landed announces a `Success`. (The
  imperative `space.enroll` skip on an over-cap connection emits nothing — its
  `Start` fires only on the success path.)
- `pointSpaceLeaveServer` — server-only single:
  `{ point, connectionId, identity, rooms, reason: 'leave' | 'socket' | 'kick' | 'kill' | 'close' }`.
  Presence depends on it.
- `pointHandlerServer*` (`.serverReply`, with `identity`) /
  `pointHandlerClient*` (a clientHandler dispatch) carry `connectionId` on every
  phase.
- `pointHandlerServerLateError` — the server-only single for a `.serverReply`
  that threw AFTER its imperative `reply()` settled the message. It cannot
  re-settle the family (the client already has its answer and
  `onAfterServerReply` already ran with it), so the throw rides its own event
  next to the error log — otherwise the post-reply work an early `reply()`
  exists to keep running would fail invisibly to every app reporter.
- `pointHandlerSendClient*` / `pointHandlerSendServer*` — the TRANSPORT
  altitude, the socket's answer to `engineFetch*` vs `pointQuery*`: the families
  above report the side that RAN a message, these report the side that
  TRANSMITTED it. The client family wraps `sendToServerHandler` end to end
  (`Start` at the call — the target is not resolved yet, so its `connectionId`
  is undefined — `Settled`/`Success` when the server's reply resolves the send,
  `Settled`/`Error` on every failure, since every one of them comes out of that
  single `await`: an unresolvable target, a serialize throw, the timeout, a
  fail-fast, a `claimErr`, a `sendErr`). The server family wraps
  `_sendClientHandler`: `Start` before anything is built, `Success` when the
  engine ACCEPTED the frame (a push is fire-and-forget — never a delivery claim;
  the collect window is a different surface), `Error` when the target, the
  serialization or the dispatch threw. A push nobody receives is a successful
  send.
- **`socketServerSendRefused`** — the server-only single for an incoming send
  the engine refused BEFORE any point ran (`emitSendRefused`, wired at the four
  pre-execution `sendErr` sites of `handleSend`):
  `reason: 'unknownConnection' | 'tooLarge' | 'handlerNotFound' | 'notInRoom'`,
  plus `{ scope, handlerName, connectionId, error }`. Not to be confused with
  `pointHandlerServerError` (a `.serverReply` that RAN and threw) — nothing
  executed here, so nothing settles. The two `sendErr` sites INSIDE the
  execution (the imperative `reply(Error)` and the catch around
  `_executeServerReply`) are deliberately not wired: the handler family already
  owns them.
- Every side-split `...Error` name sits in `uniqEventerErrorEventNames` — the
  transport errors and the three refusal singles
  (`pointChannelClaimServerError`, `socketServerSendRefused`,
  `socketClientError`) included, which is what gives a fire-and-forget
  `void handler.sendToServer(...)` a sink and puts an unclaimable connection or
  a dead transport in front of the same reporter. Nineteen names in all.
- A push whose clientHandler MODULE is not loaded in this client bundle is
  dropped (nothing can dispatch it) with a `warn` naming the handler id —
  `logMissingClientHandler`, both the connection and the memberships path. No
  event: the server cannot know what a client loaded, so this is not a failure
  of the send.

## The message iterator (clientHandler `iterateMessagesFromServer`)

A reply never streams — `serverReply()` refuses an `AsyncGeneratorFunction` at
runtime and the chain constraint (`ServerReplyChainFn`) refuses it at the type
level. Streaming is the pipe's job: the server pushes through a clientHandler,
and every clientHandler carries `iterateMessagesFromServer(options?)` — the
pushes as an async iterable, no request, no envelope, no flavor. The LLM-chat
shape composes from standard bricks: a mutation starts the job, the server
`sendToClient`s the tokens (addressed to `connectionId` or a room), a cancel is
another mutation; unlike the old generator-reply stream this rides the backplane
and survives reconnects like every push.

- **The observer** (`observeClientHandlerTarget` in `core/src/socket.ts`)
  resolves the target (the channel connection — a space handler's, its
  membership), reads its LIVENESS (`ended` — closed for good; `error` — failed
  for good; `version` keys change detection), subscribes to its state moves
  through `internal.listeners`, and attaches message listeners through
  `addClientHandlerListener` (each push's parsed input is the message).
  Listeners survive revives — the merge machinery carries both listener sets.
- **The iterator** (`iterateClientHandlerMessages`, same file) yields each push,
  PARKS through a drop (the channel policy redials — nothing here restarts),
  ends when the target closes for good, throws the target's typed error;
  breaking out or aborting `options.signal` detaches the listeners. Client-only
  — the server call throws.
- **No subscription vocabulary anywhere**: `.subscription()` is the HTTP
  closer's, period — a clientHandler chain refuses it at the type level AND at
  runtime (removed 2026-07-25, see Rejected ideas). Connection state is the
  channel's surface (`useConnection`/`useMembership`), not the iterator's.
- **Boundaries**: no `pointSubscriptionClient*` events — there are no attempts;
  the per-message truth is the handler dispatch (`pointHandlerClient*`).
  `onMessageFromServer`/`useOnMessageFromServer` and `.clientReply` keep working
  on the same handler — the iterator is one more consumer of the same dispatch.

## The imperative reply (`.serverReply<T>()`'s `reply`)

Answer now, keep running — the route:

1. The explicit generic `.serverReply<T>(...)` puts `reply` into the callback's
   args (type-level; the runtime always passes it — types are the gate). The
   generic exists because a call argument cannot drive inference the way a
   `return` does: the reply type must be NAMED to type the imperative call.
2. `_executeServerReply` builds the closure over the engine's `sendReply`
   callback: the first `reply(data)` serializes, emits
   `pointHandlerServerSettled`/`Success` (or `Settled`/`Error` for
   `reply(Error)`), runs `onAfterServerReply`, and frames the envelope via
   `sendReply` — the engine sends `{t:'reply'|'sendErr', id}` if the connection
   still lives (at-most-once, a dead socket drops it silently).
3. Everything after the first call no longer reaches the client: later `reply()`
   calls warn, the `return` is ignored, a throw is logged AND emitted as
   `pointHandlerServerLateError` (the message is NOT re-settled — the reply
   already emitted `Settled`/`Success` and already ran `onAfterServerReply`, so
   the late event is the only trace, and the `'error'` shorthand carries it to
   the app's reporter). `_executeServerReply` reports `replied: true` and the
   engine skips its own send.
4. A result that outlives the request is DATA, not a pending promise: write it,
   push into a personal room (`.enroller`) or invalidate a query — survives
   reconnect/redeploy/closed tab. This replaced the old `replyLater`/
   `replyToClient` deferred-window machinery (KV window + bus forwarding),
   removed deliberately: see Rejected ideas.

## Lifecycle callbacks and the indexes

The connection carries `onConnect`/`onDisconnect`/`onError`
(`fireConnectionLifecycle`), merged point-level → call-site (every hold's
options; a callback throw only logs). `onConnect` fires on every gained
liveness; `onDisconnect` on every LOST one with the cause — `'socket'` at
`handleSocketClosed`, `'kill'`/`'close'` at `disposeInternal` (which fires only
if the connection was still live at dispose time — a dispose after the socket
death finalizes silently, so the pair alternates strictly). The counters:
`connectIndex` on the internal connection (successful claims; ++ AFTER the
callbacks read it, carried across a revive) and `joinIndex` on the membership —
exposed as `connection.connectionIndex` / `membership.membershipIndex` (facade
counters; the join/connect EVENT families carry them, the lifecycle props do
not).

The space carries the ROOM lifecycle — `onEnter`/`onLeave` are the events of
actually entering/leaving rooms, whatever the cause. The single source is
`InternalConnection.liveRoomKeys`: `enterRooms`/`exitRooms` are the only write
paths, so a double enter/leave is impossible; `enteredRoomKeys` (never cleared)
tells a first entry (`gapless: true`) from a re-entry (`false`; a resume's
per-room verdicts win). Dispatch (`fireRoomLifecycle`): the space point-level
options hear every room of the space, each live membership's call-site options
hear the slice ITS rooms cover (the message-listener visibility rule; the SOURCE
membership of a change is never sliced — its keys may already be shrunk),
`onLeave` with reason `'leave'` also reaches `lastReleasedHold` (a voluntary
`leave()` empties `holds` before the dispose, but the leaver still wants its
callback), and the client event pair
(`pointSpaceEnterClient`/`pointSpaceLeaveClient`) goes out with the same
payload. Cause map — enters: `'join'` (`joined` handler), `'enroll'`
(`applyEnrolledSpaces`, install and growth), `'resume'` (`handleResumedFrame`,
enrolled included); exits: `'leave'` (`disposeMembership`'s uncovered list),
`'kick'` (the `left` handler, fired BEFORE the shrink so call sites still
cover), `'kill'`/`'close'` (`disposeInternal` → `exitAllRooms`), `'socket'`
(`handleSocketClosed` → `exitAllRooms`), `'refresh'` (a re-judged grant dropped
rooms: the `joined`/`joinErr` shrink, the enrolled reconcile). The compiler cuts
the membership trio from the SERVER bundle with the rest of the `client` group
(space/spaceOptions case), mirroring the channel lifecycle split.
`SpaceOptionsClientOnly.linger` (the `client` group of `.space({...})`) is the
point-level default of the membership linger (call-site wins).

## Option sides — the type-pair system

The socket families broke the old invariant «closer options = the options of the
`use`-analog» legally: SERVER-read point options exist that no client call site
could ever read. The system (in `types.ts`) that replaces ad-hoc `Pick`s:

- Every family has per-side buckets — `<X>OptionsClientOnly` /
  `<X>OptionsServerOnly` (channel also has `ChannelOptionsDeclarationOnly` for
  the one option both sides read).
- The POINT surface (`<X>PointOptions` — the chain `.xOptions()` and the closer)
  GROUPS them: `{ server: <X>OptionsServerOnly, client: <X>OptionsClientOnly }`,
  with the both-sides options top-level next to the groups (`preventTransformer`
  only, so far; a `shared` group is deliberately not introduced). The words are
  NOT renamed — the group gives the meaning, which is how the two `timeout`s
  (serverHandler `client.timeout` = the send window, clientHandler
  `server.timeout` = the reply-collection window) stopped being confusable, and
  how `onReplyFromServer` (a CLIENT callback whose name says the author) reads
  right sitting in `client`.
- Each CALL SITE composes exactly its own bucket FLAT, plus its call-only fields
  — the call already names the side:
  `ExtraUseConnectionOptions = ChannelOptionsClientOnly & { enabled }`,
  `ExtraUseMembershipOptions = SpaceOptionsClientOnly & { enabled }`,
  `ServerHandlerCallOptions = ServerHandlerOptionsClientOnly`, the `replies`
  argument of `sendToClient` =
  `ClientHandlerOptionsServerOnly & { onReply?, waitForAll? }`.
- `<X>OptionsResolved` is the FLAT union of a family's buckets — what the merge
  produces and the whole runtime reads. No key collides across the sides of a
  family, so flattening is lossless and per-key last-wins IS per-side last-wins.
  `flattenSidedOptions` (utils.ts) does the grouped → flat step, and it runs
  ONCE, at each of the eight declaration entry points (the four closers and the
  four `.xOptions()`): every `_defaultXOptions` / `_xOptions` slot on a point
  already holds the resolved flat shape, so `mergeXOptions` and
  `_getChannelPointOptions()` / `_getSpacePointOptions()` are unchanged —
  defaults → chain → closer → call site, callbacks stacking in order.
- The concrete split: channel ClientOnly = `reconnect`/`linger`/`ping`/
  `upgradable`/`upgradeTimeout`/`resumeTimeout` + the three client lifecycle
  callbacks, ServerOnly = the caps
  (`maxMessageSize`/`maxConnections`/`connectionTtl`) + the `resume` tuning
  group (`parkWindow`/`streamMaxFrames`/`streamMaxBytes` — per-KEY merged across
  the levels in `mergeChannelOptions`), top-level = `preventTransformer`
  - `resumable`; space ClientOnly = `linger` + `onEnter`/`onLeave`, ServerOnly =
    `onBeforeJoiner`/`onAfterJoiner` + `maxRooms` (default 256, `Infinity` opts
    out — rooms per connection per space, however they got there; resolved via
    `_getSpacePointOptions()`, respected on every write path with
    `POINT0_SOCKET_MAX_ROOMS`) + its own `resume` ceilings override, top-level =
    `resumable: false`; serverHandler ClientOnly =
    `timeout`/`queue`/`onReplyFromServer`/`onSendError` (the reply callback's
    twin — the failure half of the same send, fired from the one `failSend`
    choke point next to `pointHandlerSendClientError`), ServerOnly =
    `onBeforeServerReply`/`onAfterServerReply`; clientHandler ClientOnly =
    `onMessageFromServer`, ServerOnly = `timeout`, top-level = `resumable`.
- The grouping is what makes the compiler's split STRUCTURAL: the client bundle
  deletes the whole `server` property, the server bundle the whole `client` one
  — no per-key lists to forget a new option in. The price is the literal rule:
  the options ARGUMENT of the eight methods must be an object literal without a
  top-level spread, or absent, else it is a compile error (see Compiler). The
  group VALUES are unconstrained — `server: caps` with a variable is fine, since
  dropping the property drops the reference (and the import prunes with it).
- On the bundle where a group was cut, the resolved object simply lacks those
  keys and the merge defaults stand in — harmless, because only the other side
  ever reads them (the client never reads `maxMessageSize`, the server never
  reads `ping`).
- Subscription options stay one-sided (already a system of their own) —
  untouched, and their compiler split stays PER-KEY.

Adding an option = put it in the right bucket with a «who reads it / where the
compiler cuts it» JSDoc line, and every surface (the point's group + the right
call sites) picks it up by composition. Nothing in the compiler changes.

## Client runtime specifics

- **Holds are counted** at both levels. Every `useConnection` / `<Connection>` /
  `connect()` with an equal input shares one `InternalConnection`; every
  `useMembership` / `<Membership>` / `join()` with an equal input (within a
  connection) shares one `InternalMembership`. Releasing the last hold disposes
  after `linger`.
- **Send queue.** `PendingSend`s wait to flush; a space-handler send also
  carries `membership` and flushes only when `membership.status === 'joined'`
  (which implies the connection is claimed). The addressed `room` is
  `pending.boundRoom` — what `handler(room)` bound, checked against the
  membership's rooms — else the single room of a single-room membership, else a
  throw (`bind the room instead: handler(room)` for several rooms, "holds no
  rooms" for none). There is no `{ room }` call option: binding is the one way.
  `queue: false` fails fast on a closed socket; every send has a timeout timer
  (the handler's `timeout`, default `DEFAULT_SEND_TIMEOUT_MS` 5000 — there is
  deliberately NO channel-level `sendTimeout`: a channel-wide default is
  `.serverHandlerOptions({ client: { timeout } })` on the channel chain).
- **Dispatch.** A `msg` with `space`+`room` → `membershipsByRoomKey` lookup; a
  `msg` with `space` and NO `room` (a space-wide push) → every local membership
  of that space; either way each membership's handler listeners + the
  module-level `onMessageFromServer` fire. A space frame with `cid` (an
  addressed space push) only wakes memberships riding that connection; a
  connection covered by the frame's `exceptConnectionIds` (its cid) or
  `exceptRooms` (any of its memberships of the space holds an excluded room —
  `isConnectionExceptedFromSpaceFrame`) is skipped. A `msg` without `space` →
  the per-connection dispatch (channel handlers), `cid` = one connection, bare =
  every local connection of the channel, minus `exceptConnectionIds`.
  `.clientReply` for a space handler gets `room` (parsed with the space
  transformer). A ROOM-BOUND listener (`handler(room).useOnMessageFromServer` /
  `onMessageFromServer` / `iterateMessagesFromServer`) is wrapped at
  registration (`filterListenerByRoom`) and fires only for frames whose parsed
  `room` serializes to the bound one — a space-wide push (no `room`) is
  addressed to no room and never reaches it. Membership-bound and bare listeners
  are unwrapped: every covered room, `room` says which.
- **Enrolled memberships.** The `claimed` frame's `enrolled` array feeds
  `reconcileEnrolledMemberships`: it creates a hold-less `InternalMembership`
  per announced space (keyed by the sentinel input `*enrolled*`,
  `enrolled: true`, `status: 'joined'` right away — the server already
  subscribed the topics), updates the rooms of existing ones (a refresh may
  change enrollments with the identity), and disposes ones no longer announced.
  They send NO join frames ever (the `pollMemberships` replay loop only marks an
  `enrolled` membership synced to the fresh cid — the `claimed` frame already
  carried its rooms), and they live with the connection — a revive gets fresh
  ones from its new `claimed` frame. Dispatch, listeners, `left` shrinking — all
  regular membership machinery. A space whose module is not loaded on the client
  is skipped (nothing could dispatch to it anyway). No `join` call handed the
  app a facade for one, and the sentinel input is not a key anyone would pass to
  `getMembership`, so `space.memberships.client.list()` is how an enrollment is
  read individually — it lists the registry, sentinel key and all.
- **`leave()` on an enrollment is a warn + no-op**
  (`warnEnrolledMembershipLeave`, the facade's `leave()`): an enrollment is the
  server's GUARANTEE, and the server enforces the same wall on the wire —
  `removeRoomsFromEntry` keeps any room flagged `enrolled`, whatever a `leave`
  frame names. The membership stays live and `joined`; it ends only with the
  connection, a `space.kick`, or a `refresh` whose re-run enroller no longer
  grants it (the reconcile disposes it, `sendLeave: false`). A permanent opt-out
  is DATA the enroller reads, applied with a `refresh`.
- **Dispatch registry + preload.** clientHandler points register in a global map
  at close time (module load). The generated client points manifest carries
  every channel/space/handler as a lazy record (handlers tagged with their
  channel), and `ensureChannelHandlersLoaded` imports a channel's handlers
  BEFORE the connect — so a handler module nothing imports still registers by
  claim time.
- **React.** `useSocketConnection` / `useSpaceMembership` subscribe via
  `useSyncExternalStore` on per-object version counters; `<channel.Connection>`
  / `<space.Membership>` render through the SAME mountable interpreter
  (`_Mountable`) as `Layout` / `Provider`. That is the point-kind taxonomy:
  `MountablePointType` is the kinds whose SELF is content backed by the data
  pipeline; `RenderablePointType = MountablePointType | 'channel' | 'space'` is
  everything that renders through the `_Mountable` interpreter (the mountables
  plus channel/space, which hold + gate but carry no loader). The socket
  handlers (`serverHandler` / `clientHandler`) are in neither set — they never
  render. Channel/space add their own terminal mount actions (`selfConnection` /
  `selfMembership`) that hold the connection/membership, gate it, provide the
  ambient connection/membership through per-point React contexts, and land the
  facade in the typed `connections` / `memberships` layer, while the chain's
  inherited `.with(...)` wrappers and `.loading()`/`.error()` apply around the
  children (the `gate` prop — default `{ loading: false, error: true }` — picks
  which non-ready states gate; `gate={false}` is the old `passthrough`, `closed`
  does not gate); the socket floor is `getSocket()` / `useSocket(options?)` /
  `<Socket>`: one `SocketState` shape — the transport `status` plus every live
  connection and membership facade (closed-but-held included) — read once, read
  reactively (`useSocket` subscribes to the manager versions AND the per-object
  versions, re-subscribing when the object set changes), or held: `hold: true`
  adds a socket-level hold (keep it open with zero connections — a KEEPER,
  deliberately not a provider/gate: no context, no gating, position-irrelevant).
  The hook defaults `hold: false` (a bare `useSocket()` only reads); the
  component defaults `hold: true` (holding is its whole job). The old
  `SocketKeeper`/`useSocketKeeper` names and their `enabled` option are gone
  (2026-07-27) — one vocabulary: HOLD, same word as the connection/membership
  holds.
- The one socket per scope is lazy: opens with the first connection, closes ~250
  ms after the last hold/connection is gone.
- **`getConnection` / `getConnectionOrUndefined`** and **`getMembership` /
  `getMembershipOrUndefined(membershipInput, channelInput?)`** — the non-holding
  lookups: the same key the holds/dedup use, return the live facade, no hold.
  The strict forms throw; on the server strict throws / probing returns
  `undefined`.
- **`reconnectAll()` / `disconnectAll()`** (from `@point0/core/socket`) reset
  every connection of the scope. `reconnectAll` revives closed-but-held ones,
  re-connects the live ones and clears every `preventRetry` "sit out" mark; the
  memberships re-join naturally on the new cids. After a kill or
  `disconnectAll`, DECLARATIVE holds (use-hooks/components — the `declarative`
  flag on the hold token) auto-revive through the reconnect policy
  (`scheduleDeclarativeRevive`, paced by `reviveAttempt`, reset on claim);
  imperative `connect()`/`join()` holders stay closed until a remount or
  `reconnectAll`. A connect denied with `preventRetry` sets `preventRevive`
  (sits out revives and socket-cycle re-connects); a join denied with it sets
  `preventRejoin` (the cascade never resends that join). A space kick (`left`)
  triggers the same declarative replay for memberships
  (`scheduleDeclarativeRejoin`). A connect failure WITHOUT a server answer (no
  HTTP status) is transport, not a deny — declarative holds retry it through the
  same policy (`scheduleDeclarativeConnectRetry`); an ANSWERED deny is terminal
  until `reconnectAll()`/remount (an answer is an answer), and so is a `joinErr`
  (it always comes from the server). Deliberate: the backoff counters reset on a
  successful claim/join — a server killing an accepted client in a tight loop
  ping-pongs at its own kill rate, which is a server bug, not a client pacing
  concern (the connector is the place to deny).

## The callable handler export

- A handler point's runtime export is a **callable binder**: `handler(target)`
  returns the bound surface, the point rides on `.point`. `_getCallableHandler`
  builds it once and memoizes it; both closers and `_tail` (the compiled path)
  return the SAME function. Bare nice methods are assigned onto the function.
- The target differs by level: a **channel handler** binds a connection facade
  OR the channel input; a **space handler** binds a **ROOM**
  (`handler(room, channelInput?)`) or a membership facade as the "use its single
  room" shorthand. Binding SEARCHES the live registry, it never opens or joins
  one. Membership vs room is told apart by `isMembershipFacade` (the
  leave/rooms/ status duck check + the space stamp) — a plain object is always
  the room.
- **Space resolution, exact precedence** (`resolveSpaceHandlerTarget`):
  1. membership facade → `resolveMembershipArg` (hold map → canonical map →
     throw "Unknown membership");
  2. plain object = the room → `resolveMembershipByRoom`: serialize with the
     SPACE transformer, look the room key up in `membershipsByRoomKey` (which is
     keyed per CHANNEL, `${scope}:${channel}|${space}|${room}` — NOT per
     connection), keep the non-disposed `joined` ones that still list the room
     and have a live connection; an explicit `channelInput` narrows to that
     connection, otherwise the survivors must all ride ONE connection (several =
     an ambiguous address, a throw naming `channelInput`); a held membership
     wins over a lingering one, and which of several memberships of the same
     connection covers the room does not matter (the frame carries cid + room).
     Nothing covers it → `undefined` → the strict path throws "No live
     membership covers the room bound for …".
  3. bare → the ambient `<Membership>` (hooks only) → the single live membership
     → a `strict` throw.
- The room index only holds JOINED memberships, so `handler(room)` addresses a
  LIVE room: bound before the join lands, hooks stay unresolved (lax) and
  imperative calls throw (strict). That is the price of "the room is the
  address" — the client cannot know its rooms before the joiner answers.
- **What the binding addresses** (`readBoundSpaceRoom`) is one function used by
  the key builder (strict) and the ready gate (lax): a bound room verbatim (plus
  "does the membership still hold it"), else the membership's single room, else
  — several rooms — the strict `bind the room instead: handler(room)` throw / a
  lax "not live", else — no rooms yet — "not live".
- Hooks subscribe through a `useSyncExternalStore` over the manager's version
  counters plus the resolved object's own version/status — a target bound before
  its connect/join lands re-renders the consumer when it appears.

## Socket queries (serverHandler flavors)

- `.query(opts?)` / `.infiniteQuery(opts)` / `.mutation(opts?)` between
  `.serverReply` and the closer set `_queryResultType` (mutation is the default
  — stays `undefined`). Declared once; the type level guards it,
  `_assertServerHandlerFlavor` is the runtime mirror. That guard also
  RUNTIME-checks that `.serverReply` was declared — a `.query()` /
  `.infiniteQuery()` / `.mutation()` flavor call throws "Handler has no reply"
  without it, the mirror of the action closers' loader check.
- Key shape (`_getSocketQueryKey`): a **channel handler** key carries
  `{ channel, connectionInput, input }`; a **space handler** key carries
  `{ channel, connectionInput, space, room, input }` — `connectionInput` read
  off `membership.connection.input`, `room` off `readBoundSpaceRoom`. The
  membership INPUT is NOT in the key (2026-07-28): it is a hold-dedup key, not
  an address, so two memberships landing in one room share one cache entry and a
  multi-room membership gets one entry per room via `handler(room)`.
  `_getSocketQueryPredicate` matches `connectionInput` when a facade resolved
  and `room` only when the binding NAMED one — a membership-bound/bare fuzzy
  form still sweeps every room of the space on that connection (which is what
  clears entries left under rooms a re-join replaced).
- The FULL regular query/infinite/mutation surface is mirrored per flavor
  (parity, 2026-07-24): `fetch`/`prefetch`/`ensure`/`getOptions`/`getKey`/
  `getData`/`setData`/`getState`/`getCache(s)`/`refetch`/`invalidate`/`cancel`/
  `remove`/`reset` + the suspense hooks, and the mutation family
  (`fetchSocketMutation` through the mutation cache, `getSocketMutationKey`/
  `Options`/`Cache(s)`). Exact-input forms are exact-key over the STRICTLY
  resolved facade; the fuzzy forms (predicate / `true`) run
  `_getSocketQueryPredicate` — laxly scoped to the resolved facade, unscoped
  with none. The invalidate/key/set pairs are flavor-paired
  (`invalidateSocketQuery` ↔ `.query()`, `invalidateSocketInfiniteQuery` ↔
  `.infiniteQuery()`), mirroring the regular pairing.
- The `enabled` gate is `status === 'open'` (channel) or, for a space,
  `'joined'` AND the membership currently HOLDS the addressed room
  (`_connectionFacadeReady(facade, boundRoom)`) — a socket query never runs
  before the claim/join lands, and never against a room the client left. That
  gate IS the SSR guarantee: nothing is open on the server, and the options
  always carry `ssr: false` explicitly. The imperative
  `fetchSocket*`/`prefetchSocket*`/ `ensureSocket*` AWAIT the connect
  (`_awaitReadyFacadeForFetch` — a 25 ms status poll bounded by the handler's
  resolved `timeout`, the send queue's window); they throw on the server, on a
  failed connect, and on the window running out. The suspense hooks suspend on
  the CONNECT first (`_facadeReadySuspensePromise`, thrown after every hook so
  the hook order stays stable), then on the fetch through the shared
  `_suspenseHookResult` tail; during SSR render they throw the descriptive error
  (fallback ships), during discovery the never-resolving pause marker.
- The infinite flavor folds the page cursor into the message input under
  `pageParamFromInput` — each page is one send.

## Server specifics

- Rooms ARE Bun pub/sub topics; `deliverPushLocal` does one `publish` per topic,
  Bun fans it out. Per-socket the client dispatches to local memberships, so a
  socket in several memberships of one room still gets ONE frame (dedup keeps ≤1
  subscription per room per socket).
- `EngineSocket` registers one `SocketServerAdapter` per served scope in a
  core-side global map — that is how `handler.sendToClient()` / `channel.kill()`
  / `space.kick()` called anywhere server-side finds the running server without
  importing the engine. All publishing AND the admin surface go through this
  seam.
- **The `server.local` floor.** The callbacks (`.joiner` / `.enroller` / the
  join guards / `.serverReply`) carry only pure data — `input`, `identity`,
  `connectionId`, `messageId`. To read a connection's current rooms a callback
  uses the synchronous sub-floor of the server floor —
  `space.memberships.server.local.count/list/rooms` and
  `channel.connections.server.local.count/list`. It goes through the SAME
  adapter seam: `_buildEnumeration`'s `server.local.*` closures call the
  adapter's synchronous `localCount(target)` / `localList(target)`, which are
  `matchLocal(selector)` (`.length`, or mapped through `snapshotEntry` +
  `withSpacesParsed` for a channel) — this process's slice only, no bus, no
  gather window, no promise. `server.local.rooms(target)` flattens and dedupes
  the matching memberships' rooms into a `Room[]`. In the join path this local
  slice is the full truth by construction (joins/enrollments/replies execute on
  the process holding the socket); a callback reads rooms through this floor,
  not through any per-callback `rooms()` argument. The seam names are untouched
  by the floor split — `localCount`/`localList` on `SocketServerAdapter` stay
  exactly as they were; the regrouping is core-side only.
- The WS `idleTimeout` is 120 s; the client ping (30 s) keeps a live socket
  under it, so a silently dead client is dropped by Bun and its conn record
  lapses. The mirror half runs on the client — the same ping arms a liveness
  deadline (below), so a silently dead SERVER (or network) is dropped just as
  fast from the other end.
- Origin gating is a middleware recipe, not an engine option — browsers do not
  apply CORS to WebSockets, and the bare upgrade rides the full pipeline as the
  `websocket` request variant, so `request.variant.type === 'websocket'` + an
  `Origin` check in `.middleware()` is the gate (documented in the channel
  docs). The former engine-level origins option is gone.
- The bare `/_point0/<scope>/websocket` upgrade is NOT intercepted early: it is
  matched into its own `websocket` request variant in `prepareFetch` (only when
  `server.socket` is on — off, the endpoint does not exist and declaring
  channels logs a startup warning), rides the middleware onion, and the
  `_fetchDetailed` handler answers the marker response
  (`EngineSocket.acceptBareUpgrade`: one-time token in
  `x-point0-websocket-upgrade`, `socketServerUpgrade` event). The marker handoff
  at the top of `server.ts` resolves the token (or a cold-start cid) through
  `socketDataForUpgrade` into the Bun handshake. The dev-clients proxy skips
  socket upgrades (`isSocketUpgradeRequest`) so it never swallows them. A
  channel-endpoint GET+Upgrade flows the same way (its marker carries the cid),
  and both upgrade shapes are gated on `server.socket`.

## Dev: the socket proxy

Client dev servers (bun host and vite host) forward HTTP to the engine with a
plain `fetch`, which cannot carry a WebSocket upgrade. So both hosts upgrade the
browser's socket locally and pipe frames to a second WebSocket into the engine
port, both ways, with a queue until the upstream opens
(`upgradeWebsocketDevProxy` + `websocketDevProxyHandlers` in
`packages/engine/src/utils.ts`). The proxy handles TWO upgrade shapes: the bare
`/websocket` socket AND a GET+Upgrade on a channel-endpoint path (preserving its
query string, for the cold-start upgrade-connect). This is why sockets work from
the client port in dev, `--hot` included.

The upstream dial REPLAYS the browser's original handshake headers — cookies,
`Origin`, `Authorization`, any custom header — so the engine sees the same
request it would receive without a proxy; only the WebSocket handshake mechanics
(`sec-websocket-*`, `upgrade`, `connection`, `host`) are the upstream dial's
own. Without the replay the cold-start GET+Upgrade channel connect lost its
cookies at the proxy, so a signed-in user's connector denied the connection — a
dev-only bug (production has no proxy).

One known dev-only tail: the VITE host's proxy hangs the SECOND simultaneous
cold-start upgrade-connect (two tabs at once) — the client's `upgradeTimeout`
fallback reconnects it via the ticket path after 5 s, the two vite multi-tab e2e
scenarios are `skipIf`-parked, and the root-cause hunt lives in
[dev/backlog/socket-vite-dev.md](../backlog/socket-vite-dev.md).

## Compiler

Point kinds: `channel`, `space`, `serverHandler`, `clientHandler` (kind known at
the opener). A channel gets an endpoint (connect is GET+POST); the `.channel()`
closer registers the default connector itself (identity `{}`) when none was
declared, so a channel always has a connector and downstream code never
special-cases "channel without a loader"; `space` and the handlers get NO
endpoint but must land in the server points manager + the client manifest
(`shouldExistsInServer/ClientPointsFile` include `space`; the manifest tags
handlers with their channel; spaces with handlers preload). Strip rules (all
keyed by method NAME):

- `clientSend`, `serverReply`, `joiner`, `enroller` — server-only: args removed
  in the client bundle. `.joiner` mirrors `.connector` — it reads the connection
  identity and returns rooms, pure server code; `.enroller` runs at connection
  setup, the client learns the enrolled rooms from the `claimed` frame.
- `serverSend` — client-only: args removed in the server bundle.
- `clientReply` — argument-split: the client bundle drops everything after the
  first arg (the schema is server code); the server bundle replaces the first
  arg with `() => {}` and keeps the schema.
- `channel` / `channelOptions`, `space` / `spaceOptions`, `serverHandler` /
  `serverHandlerOptions`, `clientHandler` / `clientHandlerOptions` — the closers
  stay (all four are isomorphic), and their **options object is split
  STRUCTURALLY, by group**: one `removeObjectArgProperties` call per side drops
  the whole `server` property in the client bundle and the whole `client`
  property in the server bundle, imports pruning with them. Top-level keys
  (`preventTransformer`, and anything both-sides added later) stay on both
  bundles. There are no per-key lists for these eight methods any more — a new
  option physically cannot leak into the wrong bundle.
- The literal rule (`validateSidedOptionsArgs`, run from `parse()` over
  `getSelfMethods()`): the options argument of those eight methods must be an
  object LITERAL without a top-level spread, or absent — anything else is a
  compile error in `this.errors` (so the point is `valid: false`), naming the
  method and what arrived (`a variable (\`chOpts\`)`, `a function call`, a
  top-level spread). The reason is mechanical: dropping a property means finding
  it. Only the OUTER object is constrained — a group's value may be any
  expression, including a variable or an object with spreads inside, since the
  whole property is what gets dropped.
- `subscription` / `subscriptionOptions` — unchanged, still a PER-KEY split
  (one-sided family, no groups): the server bundle loses `onMessageFromServer`
  and the three lifecycle callbacks (`onConnect`/`onDisconnect`/`onError`);
  `reconnect` and the tracked-cursor pair stay on both sides.

Strip rules cover the DECLARATION side. The runtime side is a convention, and it
is the same mechanism read from the other end: **every server-only method body
opens with the literal side guard**

```ts
if (_point0_env.side.is.client) {
  throw new Error(`kick() is server-side (point ${this.id})`)
}
```

`_point0_env.side.is.client` folds to `true` in an app's client build (dev
included — the shake runs on the fly over `@point0/core`'s dist too), so
everything after the guard is dead code the bundler cuts. The method shell and
its throw survive; that is the point — a client call still fails loudly, and the
body it would have run never shipped. Three rules make it work: the guard must
be the FIRST statement (a check that runs after an adapter lookup cuts nothing),
it must be an inline `throw` (a call into a shared `serverOnly()` helper is not
dead code to a bundler), and each closure needs its own — `_buildEnumeration`
guards each `connections.server.*` / `memberships.server.*` closure separately
while the `client` floor stays guard-free. Guarded today:
`_buildPushTarget`/`_sendClientHandler`,
`kick`/`kill`/`enroll`/`refresh`/`amendIdentity`, `_resolveAdminTarget`,
`_assertNoWhereOperator`, the server floors of `_buildEnumeration`,
`_executeServerReply`, `_executeJoiner`, `_executeEnroller`, `_normalizeRooms`,
`_emitSpaceJoinSettled`.

The twin of the same idea one level up: the server-only half of
**`packages/core/src/socket.ts`** — the adapter registry and its types — carries
NO top-level side effects (the superstore item holding the registry is defined
on FIRST TOUCH, not at module load), so once the guards killed the last live
reference the bundler drops it out of the client graph. Nothing is split across
files to make that work: `socket.ts` is ONE module — client runtime, wire
protocol and the server adapter seam side by side — and `@point0/core/socket` is
exactly that module to a consumer (the subpath export resolves to
`dist/socket.js`). Verified on a real build: in `examples/socket`'s client
chunks the `$where` rejection, the push-target messages,
`__POINT0_SOCKET_SERVER_ADAPTERS__` and the joiner/reply internals are all
absent, while the server build has them.

## The socket feature — cutting the whole thing from the client

The side guards drop the server half. The FEATURE flag drops the other half too:
an app that never turns the socket on ships no socket runtime at all.

**The mechanism, end to end.**

1. **Config** — `features?: Partial<Record<Point0Feature, boolean>>` at the top
   level of the engine config and inside `server` / each client
   (`EngineOptionsFeatures`). `parseFeatures` (engine `config.ts`) resolves one
   side at a time, PER FEATURE — the side's own value, then the general one,
   then that feature's entry in a `defaults` record (`socket` →
   `server.socket`), then `false` — into the FULL record
   (`EngineOptionsFeaturesParsed`). Partial exists only in the config; every
   consumer sees the full record. `server.socket: true` with the SERVER's
   feature resolved off is refused at parse time (nothing would work and nothing
   would say why); a CLIENT opting out is legal — it strips only its own bundle.
2. **Compiler config** — the resolved record then rides to the transform the way
   every other compiler option does: `compiler.features` in the merged compiler
   record of each side, resolved by the SAME `parseFeatures` over the compiler
   blocks — side `compiler.features`, then general `compiler.features`, then the
   side's resolved record as the `defaults`. A compiler block is an explicit
   override for compilation (the `compiler.ssr` split); with none in play the
   compiler record is the side's record verbatim. `getCompilerOptions()` reads
   `this.compiler.features` — no side channel — and the server is handed the
   record too, even though it never strips: what to inline is the compiler's
   call by side, not a reason to withhold config.
3. **Runtime env** — separately, `EngineServer`/`EngineClient` keep the side's
   own `features` and write `POINT0_FEATURE_SOCKET` into `envConsts` in
   `setEnvVars`, exactly like `POINT0_SSR_ENABLED_DEFAULT`. That is the RUNTIME
   channel (env-consts script / `define`), which is what a `compiler: false`
   side reads and what the server always reads. Same resolved record the
   compiler's was derived from, so the two agree unless a `compiler.features`
   block deliberately moves the compile alone.
4. **Compiler** — `shakeForEnv` rewrites `_point0_env.feature.<name>` to a
   boolean literal **on the client compile only** (`side === 'client'` and
   `features !== false`). The server is never cut: it has nothing to gain and
   its tooling should keep answering. `features` is in the compiler's cache key.
5. **Runtime** — `env.feature` (core `env.ts`) is the full record built the way
   `side`/`mode`/`build` are, reading `POINT0_FEATURE_SOCKET`. **Unset means
   `true`**, deliberately: the flag says "was this cut from THIS build", and
   outside a Point0 build (a bare-core unit test, a `compiler: false` side)
   nothing was cut. Only a build that resolved the feature off says `false`,
   which is exactly when the throw is the truth. A `false` default would have
   made every bare-core socket unit test throw for no reason.
6. **Guards** —
   `if (!_point0_env.feature.socket) { throw socketFeatureOffError(…) }` as the
   FIRST statement, same three rules as the side guards (first, inline CHECK,
   one per closure). On EVERY socket method of `point0.ts` (~120 sites,
   2026-07-31): the public runtime surface, every private helper (a class method
   is never tree-shaken — an unguarded body keeps its code and imports alive no
   matter who calls it), the whole socket-query family and its inners, AND the
   declaration-time methods — the socket-only chain methods
   (`.connector`/`.joiner`/`.enroller`/`.clientSend`/`.serverSend`/
   `.serverReply`/`.clientReply`), the four closers with their `*Options`
   setters, and the serverHandler branch of the shared `.query()`/
   `.infiniteQuery()`/`.mutation()` flavor closers. Only the MESSAGE is shared
   (`socketFeatureOffError` in utils.ts) — the check stays inline because a
   helper performing it would not fold to dead code. And on the public entries
   of `socket.ts` itself (`getSocket`/`useSocket`/`<Socket>`/
   `connectToChannel`/`joinSpace`/`reconnectAll`/`disconnectAll`), so a direct
   subpath consumer in a stripped app gets the same clear failure.
7. **Declaring a socket point REQUIRES the feature** (flipped 2026-07-31 by
   Sergei: the feature off means no socket code at all, declarations included —
   «тупо отрубаем»). The closers and the socket-only chain methods throw like
   every other guarded method, so `server.socket: false` with channels declared
   and the default features fails the server loudly at the points import (pinned
   by `websocket-endpoint.int`'s `socket: false` case); the sanctioned "declared
   but endpoint off" split is `features: { socket: true }` +
   `server.socket: false` — there the closers run and the
   channel-without-endpoint startup warning speaks. ONE place stays a
   non-throwing wrap: the facade recognition in the mountable interpreter's
   `with` case (classification on a render path every app shares); the
   `space()`/`clientHandler()` registry calls sit AFTER their closer's guard and
   are unconditional.
8. **One door** — `export * from './socket.js'` is GONE from core's `index.ts`.
   `@point0/core/socket` is the only way in; engine (`socket.ts`,
   `fake-client.ts`) and the tests import from there. A re-export would put the
   module back into the main entry's graph and the strip would stop being
   complete.

Measured on `examples/vite` (the same project built twice, `features.socket` the
only difference; 2026-07-31, after the full guard sweep): **646 378 → 722 636
raw bytes, 189 219 → 206 686 gzip** — ~74.5 KB raw / ~17 KB gzip that an app
without sockets stops downloading. What survives the strip is ~120 short throws
sharing one message builder (`socketFeatureOffError`), which gzip to almost
nothing. The guards' own cost with the feature ON is ~1.3 KB raw / ~0.3 KB gzip
on the core row.

`scripts/size.ts` reproduces the strip rather than ignoring it: it folds
`_point0_env.feature.socket` in the materialized `dist` and then runs the
compiler's own `optimizeGuardedExpressions()` over the folded file — the fold
alone is not enough, because Bun kills the statements after the throw but keeps
the import records that reference `socket.js`. So the docs' `@point0/core` row
is the STRIPPED core, with a second `optional` row (`@point0/core` + sockets)
for the feature on; the gap there is ~71.6 KB raw / ~16 KB gzip — the same cut,
smaller only because that table measures core alone rather than a whole app.

Pinned by `engine/tests/socket-strip.int.test.ts` (one project, built with the
socket on and off, socket-only literals asserted present/absent in the client
bundle and always present in the server one),
`compiler/tests/file.unit.test.tsx` (`env.feature` shake, incl. "the server
never inlines") and `engine/tests/config.unit.test.ts` (`features resolution`).

## .with

`.with(channel)` / `.with(space)` is now a closure like every other `.with`: the
hook runs inside it, and the interpreter recognizes the returned facade (a
socket registry — no public field) to land it in the `connections` /
`memberships` layer and provide the point's React context. One uniform machinery
drives both the injection and the entities' own `<Connection>`/`<Membership>`
(whose terminal `selfConnection` / `selfMembership` mount actions are the
closure). `.with(...)` is available ON channel and space chains too now (type
surface included).

- `.with(channel, input, opts, gate?)` holds a connection for a mountable: the
  connection lands in the **`connections`** tuple prop (next to `queries`) and
  the subtree gets the channel context. The trailing positional `gate`
  (`boolean | { loading?: boolean; error?: boolean }`, DEFAULT
  `{ loading: false, error: true }` — the ONE default across `.with` and
  `<Connection>`/`<Membership>`) decides which non-ready states gate the render
  with the HOSTING point's `.loading()`/`.error()`: by default the render is
  progressive (loading not gated — socket handlers inside wait on their own) but
  a failed connect surfaces the error; `gate: true` also waits on the connect,
  `gate: false` renders through everything, and the object form OVERRIDES only
  its named aspects — an unnamed key keeps its default (the partial-options
  convention: `gate: { loading: true }` waits AND keeps surfacing errors; hiding
  errors takes an explicit `error: false`). An injected connection never brings
  the channel's own components — the gate renders `'loading'`/the error through
  the HOST's. **`gate` is a pure RENDER gate — it never narrows the tuple's
  facade type** (a connection carries no data and its status can flip on
  reconnect, so the element is ALWAYS the indeterminate
  `ClientChannelConnection` / `ClientSpaceMembership`; the old `GatedClient*`
  narrowed types were removed). Distinct from a query `.with`'s `resolve` (which
  spreads data into props).
- `.with(space, input, opts, gate?)` uses the same `gate`; the membership lands
  in the **`memberships`** tuple prop next to `connections`, and the subtree
  gets the space context. It requires the channel connection to be held — it
  resolves from the chain's own `connections`; a space `.with` without its
  channel's connection in the chain is a runtime error, not caught statically by
  the type check.
- **Chain-wrapper inheritance follows the common rule.** `<channel.Connection>`
  is opened from root/base, so root/base `.with(...)` wrappers reach it; a
  `<space.Membership>` is opened from a non-base point (its channel) and
  inherits only the meta subset — root/base wrappers do NOT reach it.

## Rejected ideas (do not re-propose)

Alternatives that were considered and deliberately left out — each with the fact
that already covers its use case:

- **Per-connection replay RINGS (the resume buffer keyed by recipient)** —
  REPLACED 2026-07-31 by the topic streams, with Sergei, wholesale (the wire
  changed with it — the protocol was unreleased). The old model stamped a
  per-connection `seq` into every resumable frame, which forced EVERY resumable
  push onto direct per-socket sends (a shared publish cannot carry N numbers)
  and duplicated every room frame into every member's ring — memory and CPU
  multiplied by the room size. The stream model stores one copy per TOPIC
  (room/space/channel/personal), numbers per stream (`tseq`), keeps the total
  per-connection order through the process delivery clock (`stamp`, log-only)
  and proves gaps per stream against `max(cursor, epoch)`. Two descendants of
  the old design died with it: the single connection-wide `gapless` bit (now per
  stream, folded per callback level) and the `RESUME_RING_MAX_PER_CONNECTION`
  cap (now the channel/space `server.resume` ceilings, frames AND bytes).
  Payload interning inside the rings was designed as the cheap alternative and
  SUPERSEDED unimplemented — the streams get the same memory win by
  construction. Do not reintroduce per-recipient buffering; anything that seems
  to need it is either the personal stream (connection-addressed pushes) or a
  catch-up refetch.

- **Identity fallback (no `.joiner` → the room is the parsed input)** — REMOVED
  2026-07-28 as a security hole, do not re-propose. It mirrored the
  connectorless channel's identity passthrough, but the two are not symmetric: a
  connector's absence means "no credential", while a joiner's absence on an
  ENROLLER-ONLY space (the `userSpace` notifications recipe) meant any client
  could frame a join naming someone else's personal room and be admitted — the
  room was whatever it typed. A space whose rooms the server chooses must never
  take a client-authored one. No `.joiner` now means no client joins at all
  (`POINT0_SOCKET_JOIN_NOT_ALLOWED`, refused on both ends); a space that WANTS
  one global room writes `joiner(() => ({}))`, which is one line and says so.
- **Inferring `TRoom` from the `.joiner` / `.enroller` return** — replaced
  2026-07-28 by the opener generic. Two producers of one type made the rules
  ("whoever declared it first wins") and forced the `.joiner<TRoom>` /
  `.enroller<TRoom>` escape hatches for self-referential callbacks. Declaring it
  where the space is born is the component-props precedent, kills the inference
  cycle outright, and lets the closer stop inventing fallbacks.
- **Binding space handlers by MEMBERSHIP INPUT, and the `{ room }` send call
  option** — replaced 2026-07-28 by room binding. The input form was ambiguous
  at its root (an object meant "the join request", while the thing being
  addressed is a room) and it made multi-room memberships unusable: the key
  degraded to `room: undefined`, and every send threw «pass { room }» with no
  place to pass it from a query family. Two ways to name a room (bind + call
  option) also meant two code paths for listeners and queries, which is why
  listeners could never be narrowed to one room. Now `handler(room)` is the ONE
  address, it applies to the whole bound surface, and the membership survives
  only as the "take its single room" shorthand.
- **Per-key compiler split lists + FLAT point options** — replaced 2026-07-28 by
  the `{ server, client }` groups. The point surface used to be the flat
  intersection of the side buckets, and the compiler cut it by naming every key
  in two lists (`shakeMethodsForClient` / `ForServer`). Two failures: a new
  server-read option shipped to the browser the moment someone forgot to add it
  to a list (silently — with its imports), and a non-literal options argument
  was skipped whole, which leaked the guards outright. Grouping makes the cut
  structural (drop one property), which is unforgettable by construction, and it
  fixed the flat form's own readability problem — the two `timeout`s side by
  side, and `Server`/`Client` in a callback name meaning the AUTHOR, not the
  side that runs it. Call sites stay flat: a call already names its side. The
  cost, accepted: the options argument must now be an object literal without a
  top-level spread, enforced as a compile error.
- ~~**Durable cid / connection resume** (reconnect with the OLD cid)~~ —
  REVERSED 2026-07-30: resumable connections exist (the opt-in channel
  `resumable: true` — see Resumable connections above), designed for a different
  beneficiary than the one this entry rejected. The rejection was about DEFERRED
  REPLIES riding a session — that stays rejected (a long result is DATA, not a
  wait on a socket; the enroller-room/invalidate recipe stands). The resume
  exists for the RECONNECT COST: a redeploy's thundering herd of connect
  cascades becomes a couple of KV reads per client. At-most-once survives intact
  — the opt-in stream logs replay or honestly report the hole (per-stream
  `gapless`), never acknowledge, never retry.
- **`replyLater()` / `replyToClient` deferred windows** — REMOVED after living a
  while: the machinery (a KV window per message, bus forwarding, a re-armed
  client timer) served only the case the recipe above already covers better, and
  the imperative `reply()` covers the honest rest ("answer now, keep working").
  A slow answer that fits the send window is just a slow handler — raise the
  send's `timeout`; a slower one is data + a push.
- **Server commands to the client** ("call `reconnectAll`") — the cases are
  covered by `refresh` / `kill` / `amendIdentity`.
- **The `.subscription()` clientHandler flavor itself** — REMOVED 2026-07-25
  after living a day: `useSocketSubscription` duplicated
  `useOnMessageFromServer` (same listener, same `lastMessageFromServerAsData`
  sugar), the flavor's options place duplicated
  `.clientHandler({ client: { onMessageFromServer } })`, and its `status`
  restated the connection's while slightly lying about whose it was. The one
  real capability — iteration — became every clientHandler's
  `iterateMessagesFromServer`. `.subscription()` = an HTTP REQUEST the server
  answers with a stream; a push pipe has no request, so no subscription
  vocabulary on socket points. The same reasoning had already killed lifecycle
  callbacks on the flavor: those moments belong to the channel/space
  (`onConnect`, `onEnter`).
- **Overriding `_transformer` with a blank instance at the channel closer** (the
  first `preventTransformer` cut) — REMOVED 2026-07-25 after a day: it made
  `_transformer` mean two things at once ("the app transformer" and "the socket
  wire happens to be blank") and forced openapi to grow a `_hasWireTransformer`
  predicate. Replaced by the `_preventSocketTransformer` fact-field +
  `_getSocketTransformer()`; openapi went back to `!!point._transformer`.
- **Default (always-on) upgrade-connect** — flipped to the opt-in `upgradable`
  2026-07-25: the upgrade cannot carry custom client headers, so under
  header-or-fallback auth it silently passed the connector a different identity;
  opt-out kept the trap open by default, opt-in keeps every connect one shape
  unless the app declares the handshake is enough (same-origin cookie auth).
- ~~**A `maxRooms` option**~~ — REVERSED 2026-07-27: `maxRooms` exists (a blunt
  per-connection bound, mirroring the channel's `maxConnections` /
  `maxMessageSize`; default 256, `Infinity` opts out) and is respected on EVERY
  write path — join, enroller, `space.enroll` (an option set is an option
  respected, whoever writes). A `maxMemberships` cap existed for a day and died
  with the input-keyed server model itself (see the next entry). The join
  guards + introspection remain the POLICY mechanism — the cap is the floor.
- **Per-join server bookkeeping (input-keyed memberships)** — REMOVED
  2026-07-27: the server stored `memberships: Map<space|input, rooms>` plus an
  enrolled sentinel, and the input was used for NOTHING but that key. The server
  model is connection + rooms (`spaces: Map<spaceName, rooms>`); the join input
  is ephemeral (enters the joiner, forgotten), the client keeps inputs as its
  hook-dedup keys and owns the shared-room refcount across its own joins
  (`leave` names rooms). Do not reintroduce per-join state server-side —
  anything that seems to need it is either the client's bookkeeping or a
  kick/refresh.
- **A channel-level `sendTimeout`** — REMOVED 2026-07-27 after living a while:
  it was nothing but a channel-wide default for the serverHandler `timeout` (the
  same window — awaiting the connect/join plus queueing through a reconnect),
  and that default is already expressible as
  `.serverHandlerOptions({ client: { timeout } })` on the channel chain — one
  knob, one bucket, no "whose send is this" ambiguity next to the clientHandler
  `timeout` (the server-side reply-collect window). The default is
  `DEFAULT_SEND_TIMEOUT_MS` (5000, core socket.ts); the imperative socket
  fetches take the handler's resolved `timeout` too.
- **Cross-space `except`** — covered by `$identity` narrowing.
- **A server-side binder for `sendToClient`** (`handler(room).sendToClient(…)`)
  — rejected in favor of the three positional arguments
  `sendToClient(message, target?, replies?)`.
- **`room: true`** ("all rooms") — "everyone in the space" is a bare space send.
- **Auto-detecting snapshot-vs-matcher** — semantically impossible; resolved by
  the `$`-dictionary (bare key = exact snapshot, `$`-key = sift matcher).
- **A separate boolean `upgrade` on the endpoint variant** —
  `outputType: 'upgrade'` is enough.
- **Streaming enumerations beyond `forEach`** (bus pagination) — "push hundreds
  of thousands through" is a metric, not an enumeration.
- **`close({ room })` as an alias of `kick({ room })`** — not added.
- **Inferring the imperative reply's type from the call** — impossible: a call
  argument cannot drive inference the way a `return` does, which is exactly why
  the imperative `reply` exists only behind the EXPLICIT generic
  `.serverReply<T>()` (which also breaks the self-referential inference cycle —
  pinned by `core/tests/socket-selfref.unit.test.ts`).
- **Headers/cookies in socket server callbacks** (serverReply/joiner reading the
  handshake's raw headers) — the standard itself keeps nothing: a browser
  WebSocket exposes no handshake headers, Bun holds no Request after the
  upgrade; everything a later callback needs the connector puts into the
  identity. Decided 2026-07-24.
- **Last-Event-ID** — replay history is a user-space recipe (a cursor in the
  DB + a catch-up refetch), not a transport feature.
- **`onBeforeSendToClient`** — per-message server logic is the handler
  customizers (`onBeforeServerReply` / `onAfterServerReply`), not a push
  interceptor.

## In-memory sockets (FakeClient) and the store policies

Sockets run with NO server listening: `FakeClient` injects a fake `WebSocket`
global (per fake client, through the GlobalThisItemProxy) whose constructor
replays the REAL upgrade handshake through `engine.fetch` — middlewares and the
cookie jar included — and swaps the `bunServer.upgrade` step for
`EngineSocket.openInMemorySocket(marker, hooks)`: an in-memory server socket
(the duck of the `Bun.ServerWebSocket` surface the engine uses —
`data`/`send`/`subscribe`/`unsubscribe`) plus the `inMemoryTopics` registry, fed
by `publishTopic` next to every Bun publish (both worlds coexist — a listening
server with real sockets AND fake clients in one process).

Two fetcher facts keep BOTH transports honest (found by driving transformer
channels through the in-memory pair, 2026-07-25):

- **On the upgrade the transform fact rides the URL, not the header** — browser
  JS cannot attach CUSTOM headers to the handshake GET (`new WebSocket(url)`
  exposes none; the request itself is a normal GET, browser-set Cookie/Origin
  arrive), so the client appends `?x-point0-transform=true`
  (`POINT0_UPGRADE_TRANSFORM_SEARCH_PARAM`, same string as the header) when its
  socket transformer is non-blank, and the fetcher reads the param on the
  `upgrade` variant ONLY — everywhere else transform stays header-carried. A raw
  external ws client sends neither → blank parse. (The first cut FORCED
  `transform: true` on the upgrade variant — replaced by the query param when
  the socket transformer became an explicit surface, see below.)
- **The bare `/_point0/<scope>/websocket` endpoint matches on `socketEnabled`,
  not on a live `bunServer`** — the FakeClient ticket path (a reconnect, an
  input too long for the upgrade URL) dials it through the pipeline with no
  Bun.serve anywhere. Both are pinned by
  `packages/engine/tests/socket-transformer.int.test.tsx` (a request ledger: an
  `upgradable` connect is exactly one `GET+upgrade` on the channel endpoint; a
  default or long-input connect never upgrade-hits the channel endpoint and
  dials the bare one).

The socket transformer is an explicit surface, not an override:
`preventTransformer` resolves at `.channel()` into the
`_preventSocketTransformer` fact-field (inherited by the channel's spaces and
handlers through `_continue`), and every socket serialization site — client
frames and keys (core `socket.ts`'s `pointTransformer`), push targets, socket
query keys, the upgrade `?input=`, joiner/serverReply/rooms parsing, the
engine's identity/rooms/frames (`engine/src/socket.ts`), the admin surface —
reads `_getSocketTransformer()`
(`_preventSocketTransformer ? blank : _getTransformer()`, the
`_getTransformerWithRsc` naming precedent). `_transformer` itself stays
untouched — it keeps meaning "the app transformer from `.transformer()`", which
is why openapi's transform-header predicate is a dumb `!!point._transformer`
(openapi has no socket knowledge: of the socket points only the channel connect
endpoint and the bare `/websocket` reach the spec). The channel's HTTP connect
leg follows the same fact from both ends: the client forces `transform: false`
on a `preventTransformer` channel's fetch (no header, plain body, blank-RSC
response parse — the shape a raw client produces naturally), and the server
fetcher resolves a channel point's transformer through `_getSocketTransformer()`
even against a wrongly-advertised header.

Context discipline is the heart of it:

- the server end processes frames in a BARE server context
  (`runAsBareSocketServer` in fake-client.ts — every known store key an error,
  `__POINT0_FAKE_CLIENT__` included), NOT in `engine.withFetch`: the fake
  client's ALS must not leak into server handlers (`sendToClient` would see
  itself client-side), AND production parity demands no request state either —
  the real Bun `message:` handler wraps nothing, so `getFetch()` /
  `getQueryClient()` throw in production frames and throw under FakeClient too
  (socket callbacks reach the world through `points` and the adapter seam). The
  earlier `withFetch` wrap made the fake server end RICHER than production and
  forced an `isFakeClient` patch inside `withFetch` (a fake run's CLIENT query
  client leaked into the server state via a pre-entry `getOrUndefined()`) — both
  removed 2026-07-27;
- frames back to the client re-enter **the storage state of the run that opened
  the socket** (captured at `new WebSocket`): a `run()` is one loaded PAGE, and
  the socket's managers/listeners/facades live in that page's state;
- `fakeClient.createRunState()` + `run(fn, { state })` CONTINUE one page across
  several runs (the socket stays live); a run without `state` is a fresh page
  load — sockets die with the page, exactly like a browser reload. A page's live
  connection is released by the HOLD facade (`connect()`'s return) —
  `fakeClient.destroy()` does not sweep held sockets, close them like a browser
  test would.
- every `run()` replays the page's "module load" (`registerPagePoints`): space
  and clientHandler registration is a client-side module-eval effect, and under
  FakeClient the modules evaluated server-side where it is a no-op — without the
  replay, `.enroller` enrollments and module-level `onMessageFromServer` would
  silently never fire.

The client-runtime stores back this, and the server owns NONE of them: every
`__POINT0_SOCKET_*__` store is a `clientOnly` superstore item with two access
forms chosen per call site — the strict `<store>()` for client-only paths (a
server call is a LOUD clientOnly error: misuse, not degradation) and
`<store>OrUndefined()` for the few render paths that run on both sides
(`useBoundConnection` / `useBoundMembership` / `resolveBoundTargetInternal`),
where the server's `undefined` degrades EXPLICITLY at the call site to "no
target resolved". Nothing reads a coincidentally-empty server map anymore. Two
former stores are gone entirely: dead facades are marked on the facade OBJECT
(`Symbol.for('point0.deadSocketFacade')` — works on any executor by
construction), and the channel/space React contexts live as a lazy per-point
cache (`_getReactContext()` on the point — the Provider and every consumer reach
the context through the same module-level point object, so identity holds
everywhere with no registry). The one server store is `socketServerAdapters` —
`serverOnlyGlobal` (the engine registers at boot, server sends read from
requests and crons). The `clientServerGlobal` policy itself stays in the
superstore, currently without consumers.

## Failure matrix — what the caller observes per intersection

The waiting-cascade invariant plus the fast-fail rule: **an ANSWERED deny fails
whatever waits on it IMMEDIATELY with the typed error** (nothing will retry an
answer); only a failure a retry is scheduled for leaves the queue waiting (the
retry may land inside the send window). `SC` = `socket-client.int.test.ts`, `S`
= `socket.int.test.ts` (both in `packages/engine/tests`); unpinned rows say so.

| Situation                                                        | The caller observes                                                                                                                                                                                                                                        | Pinned                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| send with nothing started below                                  | the target resolver throws ("No live connection" / "No membership") — the cascade never auto-starts. The BARE form is `async`, so the caller sees a rejected promise; the BOUND form resolves its target first and throws SYNCHRONOUSLY                    | SC                                                                                                                     |
| send queued; connect DENIED (answered / claimErr / preventRetry) | rejects NOW with the TYPED connector error (`connectInternalRun` / `claimErr` fail the unsent queue when no retry is scheduled)                                                                                                                            | SC                                                                                                                     |
| send queued; connect fails on TRANSPORT with declarative holds   | stays queued through the retry policy; rejects with `SOCKET_CONNECTION_LOST` when its `timeout` runs out first. With IMPERATIVE-only holds (or the retry budget spent) no retry is scheduled, so the queue fails immediately with the transport error      | SC (the imperative branch — the dead-port fixture); the declarative branch by reading                                  |
| space send queued; join DENIED (`joinErr`)                       | rejects NOW with the TYPED join error (the `joinErr` handler fails the unsent queue — the cascade would never flush it)                                                                                                                                    | SC                                                                                                                     |
| `queue: false` while connecting/closed                           | rejects immediately with `SOCKET_CONNECTION_LOST`                                                                                                                                                                                                          | SC                                                                                                                     |
| send queued; connection disposed (kill / disconnect)             | unsent rejects NOW with `SOCKET_CONNECTION_LOST` (`disposeInternal`); a SENT one keeps its chance — the reply may be in flight                                                                                                                             | SC                                                                                                                     |
| space send queued; membership disposed                           | unsent rejects NOW with `SOCKET_CONNECTION_LOST` (`disposeMembership`)                                                                                                                                                                                     | SC                                                                                                                     |
| join on a space with NO `.joiner`                                | refused on the CLIENT before any frame (`join()` throws `SOCKET_JOIN_NOT_ALLOWED` synchronously, `useMembership` registers nothing); a hand-framed join gets `joinErr SOCKET_JOIN_NOT_ALLOWED`                                                             | SC, S                                                                                                                  |
| `handler(room)` bound to a room no live membership covers        | refused on the CLIENT before any frame — `resolveSpaceHandlerTarget` throws "No live membership covers the room bound for …" (synchronously, from the bound surface); join or be enrolled first                                                            | SC                                                                                                                     |
| `handler(membership)` on a MULTI-room membership                 | refused on the CLIENT — "spans several rooms — bind the room instead: `handler(room)`"; the query-key path throws the same during render                                                                                                                   | SC                                                                                                                     |
| a hand-framed send naming a room the connection is not in        | server refuses with `SOCKET_NOT_IN_ROOM` (`sendErr`) — the raw-client backstop; the typed client can no longer produce it                                                                                                                                  | S                                                                                                                      |
| send/join addressed to another channel's handler/space           | refused as NOT_FOUND (the cross-channel guard — no oracle)                                                                                                                                                                                                 | S                                                                                                                      |
| a write exceeding `maxRooms` (join / enroller / enroll)          | join → `joinErr SOCKET_MAX_ROOMS`; connect-time enroller → `claimErr`; `space.enroll` → connection skipped with a warning; a repeat join unions and never trips                                                                                            | S                                                                                                                      |
| connector deny with `preventRetry`                               | connection `error`, no auto-revive and no re-POST until `reconnectAll()`/remount                                                                                                                                                                           | SC                                                                                                                     |
| join deny with `preventRetry`                                    | membership `error`, the join is never replayed on later cids until `reconnectAll()`/remount                                                                                                                                                                | SC                                                                                                                     |
| enroller throws at connect                                       | the WHOLE connection setup fails — `claimErr`, no `claimed` frame ever                                                                                                                                                                                     | S                                                                                                                      |
| kill                                                             | `closed` frame → dispose; declarative holds auto-revive through the policy, imperative wait for `reconnectAll()`/remount                                                                                                                                   | SC                                                                                                                     |
| space kick                                                       | `left` frame → rooms shrink (enrolled ones included), membership stays `joined`; declarative holds replay the join, the joiner re-judges                                                                                                                   | SC, S                                                                                                                  |
| `leave()` on an ENROLLED membership                              | a `leave` frame naming ITS rooms (minus any another live membership of the connection still covers) plus a local dispose — the server drops exactly those; the next connection setup (reconnect / `refresh`) re-runs the `.enroller` and installs it again | SC                                                                                                                     |
| kill lands while a join is in flight                             | the join's `joined`/`joinErr` answers a connection being disposed — the `pendingJoins`/dispose guards drop the stale answer, the membership closes cleanly                                                                                                 | SC                                                                                                                     |
| reply after the collect window closed                            | dropped server-side (`pendingCollects` miss; single-process) or bus-forwarded and dropped at the initiator (`landCollectedReply` accounting)                                                                                                               | S (the single-process drop); bus half: the forward pinned by `socket-external.int`, the initiator-side drop by reading |
| duplicate / excepted replies into an open window                 | dropped by the per-cid accounting WITHOUT advancing `received` — no early close, no dup items                                                                                                                                                              | S                                                                                                                      |
| stale `joined` for a previous cid after a refresh                | dropped (`lastCid` guard); the fresh cid's replayed join is the live one                                                                                                                                                                                   | SC (refresh)                                                                                                           |
| socket drops mid-everything                                      | connections revive per the reconnect policy, memberships replay on the fresh cid, SENT sends may still resolve, unsent wait their `timeout`                                                                                                                | SC                                                                                                                     |

## Tests

| File                                                  | Covers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/tests/socket-builders.unit.test.ts`             | builders, guards, `_executeServerReply`/`_executeJoiner`, events (incl. the `Start`-above-the-parse contract and the raw-input payload), `onSendError`, type surface (148 `expectTypeOf` + 79 `@ts-expect-error`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `core/tests/socket-selfref.unit.test.ts`              | self-referential callbacks compile: `.serverReply<T>`, and `.joiner`/`.enroller`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `core/tests/socket-mountable.unit.test.tsx`           | `<Connection>`/`<Membership>` gates (`gate` defaults, `gate={false}`), `.with(channel)`/`.with(space)`, the `LoadingComponent`/`ErrorComponent` overrides, the joiner-less refusal in the tree                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `core/tests/reconnect.unit.test.ts`                   | the SHARED reconnect policy math (channels + subscriptions): delays, backoff, `retries`, `immediately`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `compiler/tests/socket.unit.test.tsx`                 | strip rules incl. `space`, `.joiner`, the `.clientReply` split, the structural options split + the literal-argument errors                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `engine/tests/socket.int.test.ts`                     | protocol e2e with raw WebSockets, 58 tests: connect (ticket + upgrade) → join → send → push, plus the failure-matrix guards — cross-channel, foreign cid, `$where` over the wire, `maxRooms` on every write path, kick semantics, the collect windows (late/dup/excepted replies), one-ticket-one-claim, the event families                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `engine/tests/socket-scope.int.test.ts`               | scope isolation: per-scope bare endpoints, a cross-scope claim refused as unknown AND burning the ticket, a cross-scope discard a no-op                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `engine/tests/socket-connectorless.int.test.ts`       | the connectorless channel: `{}` identity end-to-end, `amendIdentity`'s runtime throw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `engine/tests/socket-transformer.int.test.tsx`        | transformer channels through BOTH transports (real ws + FakeClient), `preventTransformer`, and the request ledger — an `upgradable` connect is exactly one GET+upgrade on the channel endpoint, other connects dial the bare one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `engine/tests/socket-external.int.test.ts`            | the abuse floors: the ping-renew debounce, conn-record deletion on every exit path, uncountable collect windows, the bus reply-forward rate cap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `engine/tests/socket-upgrade-timeout.int.test.ts`     | a handshake that neither completes nor fails: the 5 s `upgradeTimeout` cut → ticket-path fallback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `engine/tests/socket-redis.int.test.ts`               | one ticket, two processes, one winner — `getDelete` claim atomicity over a real Redis (gated on `REDIS_URL`; CI: the engine-backplane runner)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `engine/tests/websocket-endpoint.int.test.ts`         | the bare endpoint as a request variant: middleware sees/vetoes it — the origin recipe's `endpoint` arm pinned against the cold-start channel-endpoint upgrade too — `socket: false` (channels declared + default features = the loud startup refusal; with `features: { socket: true }` = no endpoint + the startup warning), the websocket settings merge (engine defaults → `bunServeConfig.websocket` → `serve()`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `engine/tests/websocket-dev-proxy.int.test.ts`        | the dev proxy replays the browser's handshake headers upstream (the cookie-loss bug), `isSocketUpgradeRequest` recognition of both upgrade shapes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `engine/tests/socket-client.int.test.ts`              | the real core client runtime headless: holds, memberships, room binding (multi-room sends/queries/listeners), kill/refresh/reconnect, enrollments (install, the leave no-op, re-enroll on refresh), the `client` enumeration floor, the client event families incl. the settle-at-the-claim contract (a claim refused after a successful connect request → `Start`/`Settled`/`Error`, no `Success`; the upgrade-then-fallback story settling exactly once)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `engine/tests/socket-backplane.int.test.ts`           | a custom Backplane end-to-end (+ a REDIS_URL-gated real-Redis block; CI: the engine-backplane runner)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `engine/tests/backplane-adapters.unit.test.ts`        | the ready-made adapters over fakes: command mapping, lazy duplicate, dispose ownership (+ `closeClient`), postgres channel hashing / payload spill without reordering / DB-clock TTL reads / sweeper stop; plus the never-called type-assert pinning the structural client types against the real `postgres`/`ioredis`/`redis` typings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `engine/tests/backplane-redis-clients.int.test.ts`    | ioredis + node-redis adapters against a real Redis this file spawns itself (skips without the binary; CI provisions it on the engine-backplane Linux runner): the shared contract run — KV TTL expiry, one-shot getDelete, cross-instance pub/sub, unsubscribe, dispose leaves the passed client alive                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `engine/tests/redis-subscriber-reconnect.int.test.ts` | the resilient subscriber wrapper against a killed-and-restarted real Redis (skips without the binary; CI: the engine-backplane runner): the whole channel set replays on reconnect, no listener stacking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `engine/tests/backplane-postgres.int.test.ts`         | the postgres adapter against a real Postgres (`POSTGRES_URL` or the probed local default; skips otherwise; CI: the engine-backplane runner): UNLOGGED tables on first use, DB-clock TTL, cross-instance getDelete race, LISTEN/NOTIFY across instances with >63-byte sibling topics staying distinct, a 100 KB spill arriving intact, dispose ownership                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `engine/tests/socket-resumable.int.test.ts`           | resumable connections over a FILE-backed backplane: the redeploy (server killed + respawned; the real client runtime resumes — markers fire, connector/joiner counters stay zero), the blip (park + stream replay in tseq order with `rcid` re-addressing, verdicts both ways), the PER-STREAM verdict divergence (a hole in the busy room, the quiet one provably clean), the `$room`-matcher push riding the room topics, the MERGE replay (room + personal frames back in delivery order), the byte ceiling (`server.resume.streamMaxBytes` evicting oldest with an honest gap), the takeover, the oracle-free refusals (wrong key ≡ unknown cid; kill/close/TTL void the record), the hash-only KV dump, the opt-out space, the space kick into a park (room stream out of the connection's verdicts + passport, the queued `left` on resume, ordinary rooms survive), the `$identity` push into a park («случай Бори»: the personal stream buffers + `gapless: true`, non-opted holes it + `gapless: false`, the live twin receives at once, the parked one stays out of the enumerations), the UNPARK order (a synchronous push from the resumed Open lands after the replay, exactly once), the `replay: 'gapless'` policy (a gappy stream withholds the strict handler and replays the ordinary one; the clean follow-up delivers the withheld tail in full) |
| `engine/tests/socket-bus.unit.test.ts`                | two EngineSocket instances over one backplane: push/reply/kill/kick/gather, plus the sharded-topology pins — channel layout per envelope kind, subscribe-before-confirm, the unsubscribe linger, multi-room dedup, the parked entry's streams as topic consumers (cross-process room and `$identity` pushes buffered for a park), the redis resubscribe wrapper, POINT0_SOCKET_BUS_FORCE_SHARED; plus the refusal singles (`pointChannelClaimServerError` on a bad ticket, `socketServerSendRefused` on an unknown handler / unknown connection, and neither on a send that reaches its handler)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `engine/tests/socket-backpressure.unit.test.ts`       | the send funnel's reading of Bun's status: `0` on an OPEN socket closes it, `-1` and a byte count do not, `0` on a closing one is the ordinary teardown, and the close never recurses                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `engine/tests/socket-backpressure.int.test.ts`        | a real Bun server + a raw TCP client that stops reading: the fan-out disconnects the slow subscriber, the funnel does it when an app overrode that, the fast peer keeps every frame                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `engine/tests/engine-socket-helpers.unit.test.ts`     | `engine.socket.local.get()` / `.status()`: empty (never throwing) before `prepare()` and with no live socket (`socket: () => null` stands in for the option; the real `socket: false` path is pinned by `websocket-endpoint.int`), the counts and parsed values once live, the backplane kinds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `engine/tests/socket-strip.int.test.ts`               | the feature strip on real builds: socket-only literals present with `socket: true` and absent without, the throw shipped either way, the server bundle never cut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `engine/tests/socket-browser.e2e.test.tsx`            | Playwright, all three hosts (bun / vite / bun-hot): connect, join, send, room push, the suspense socket query, `<Socket>` + `useSocket()`, standalone-handler preload, multi-tab broadcast (the vite multi-tab scenarios `skipIf`-parked — see the backlog card)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `engine/tests/fake-client.int.test.tsx`               | the in-memory socket under FakeClient: connect/join/send/push, page continuation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `examples/socket/tests/chat.e2e.test.ts`              | the example's chat in a real browser: the cross-tab room push, the GUEST flow (no sign-in — watches the room push live, cannot write), the blip catch-up through the resume streams, the reload showing persisted history (NOT in repo CI — the planner scans packages only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `examples/socket/tests/presence.e2e.test.ts`          | the example's presence scenario in a real browser (NOT in repo CI)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Gotchas

- **Go-to-definition on a handler call opens a two-entry peek — inherent TS,
  closed as a limitation.** A handler is the only point that is CALLED
  (`handler(membership)`), and on a call expression the language service always
  returns TWO definitions: the user's `export const` (first) and the binder's
  `__call` signature in types.d.ts — so the editor shows a peek instead of
  jumping. Non-callable points (queries, channels, spaces) return one result and
  jump cleanly. Unfixable without dropping callability (the bind-by-call is a
  locked decision); "simplifying the type" does not help — a call signature has
  to exist. Mitigation: the const is always the FIRST peek entry, and
  `editor.gotoLocation.multipleDefinitions: "goto"` makes the editor jump
  straight to it.
- **Identity is established at connect and lives server-side** — the socket
  carries no request, so nothing re-authenticates on its own. A socket reconnect
  re-runs the connector; the server `refresh` (or `reconnectAll()`) forces a
  re-run without dropping the socket, and the client re-joins every space on the
  new cid; `amendIdentity` shallow-merges a data patch in place without a
  re-run.
- The client `ping` doubles as the TTL heartbeat: it renews each `conn:<cid>`
  record. A silently dead client stops pinging → Bun's `idleTimeout` closes the
  socket and the record lapses on its own TTL.
- **The client's liveness deadline** is the mirror of that `idleTimeout`, and it
  rides the ping interval rather than a timer of its own. The manager stamps
  `lastInboundAt` on EVERY inbound frame — the stamp sits in `ws.onmessage`,
  before the JSON parse, because any frame at all proves the peer is alive (a
  socket busy with pushes is not a silent one, and a frame we cannot parse still
  came off a live connection) — and resets `pingsSinceInbound` there; the ping
  tick increments that counter for each ping it actually writes. Before sending,
  the tick checks both: two pings answered by NOTHING and more than `2 × ping`
  of silence means the socket is half-open (a NAT that dropped the flow, a slept
  machine) — invisible from the socket API, where sends keep succeeding into the
  void while every push is lost. The client then closes it locally and runs the
  normal close path, so the reconnect and the catch-up recipes take over. The
  counter is what keeps a THROTTLED background tab honest: throttling stretches
  the interval past `2 × ping`, but a live socket answers every ping it does
  send, so the count never reaches two there. Detection costs three ticks
  (`~3 × ping`, 90 s on the default) — inside the server's own 120 s window.
  `ping: 0` disables the deadline with the pings, the documented test-only
  compromise.
- The close path is one function per socket (`handleSocketClosed` inside
  `ensureSocket`), reached by `ws.onclose` AND directly by the liveness
  deadline: a dead network never answers the closing handshake either, so
  waiting for the close EVENT would mean waiting for TCP — the very wait the
  deadline exists to skip. A `closeHandled` flag makes whichever arrives second
  a no-op (in Bun `ws.close()` fires `onclose` synchronously; a browser on a
  dead network may never fire it at all).
- The connect four-phase families fire at command time (the connector, the POST)
  — BEFORE the claim, so a connect success is not yet a live connection. The
  join families open the same way (`Start` before the joiner/enroller) but
  SETTLE on the other side of the registration: the Settled/Success pair fires
  once the rooms are in, so `pointSpaceJoinServerSuccess` means a join that
  `memberships.server.list` already counts. The live-state singles are
  `pointChannelOpenServer`/`CloseServer` and `pointSpaceLeaveServer`.
- **Server-side callbacks never see the channel input** — put what a reply needs
  into `identity` from the connector. The connection on the server is the bare
  `connectionId` string. The client keeps `connection.input` and
  `membership.input`.
- **cid is not a durable address.** Store the room name (survives reconnect),
  not the cid. Identity is selection data, not an address.
- **The ambient facade is subscription-invisible without help** (found live in
  the browser e2e, 2026-07-27, TWO bugs of one root): the channel context
  provides the CANONICAL facade, whose identity never changes while its status
  flips — so nothing re-renders a consumer between `connecting` and `open`. (1)
  A bare hook under `<Connection>` (`useOnMessageFromServer`) captured frozen
  effect deps and its listener never attached — fixed by subscribing the AMBIENT
  facade's internal (listeners + snapshot) in `useBoundConnection` /
  `useBoundMembership`. (2) The suspense hooks' ready-poll parked forever on the
  DEAD hydration placeholder — fixed by treating a dead facade as "no facade
  yet" in `_useSuspenseSocketQueryInner` (the poll falls through to live
  re-resolution). Both pinned by the browser e2e (the broadcast and suspense
  scenarios).
- The message path parses only with `_clientSendSchema`; the clientHandler's
  `_serverSendSchema` is stored but not consulted at runtime — the server trusts
  itself.
- A space handler send that names a room the connection's membership does not
  cover is refused server-side with `POINT0_SOCKET_NOT_IN_ROOM` (a `sendErr`).
- **Bun drops frames silently under backpressure — the engine turns that into a
  disconnect.** Once a socket's buffered amount passes Bun's
  `backpressureLimit`, `ws.send()` returns `0` and uWS discards the frame
  outright: never queued, never retried, the buffered amount does not move,
  `readyState` stays `1` (OPEN), and no `drain`, `close` or `error` reports the
  loss. `-1` is the harmless case — the frame is buffered and delivered later,
  in order — and a positive return is the byte count. So the engine's websocket
  settings (server.ts) carry `closeOnBackpressureLimit: true` plus an explicit
  `backpressureLimit: 16 MiB`, and the one `send` funnel in `socket.ts` reads
  the status: a `0` on a socket that is still OPEN closes the connection. A
  client that cannot keep up loses its socket, not its frames — the reconnect
  re-claims, re-joins every space, and the app re-reads state through queries,
  which is the contract ("delivered while the connection is alive, otherwise the
  connection breaks"). The 16 MiB is Bun's own default, written out because the
  contract now leans on it; Bun's shipped reference table calls the default 1 MB
  and is stale (source and measurement both say 16 MiB). Never set it to `0` —
  that does not mean "no buffer", it disables the limit entirely.
- **`publish()` tells you nothing about delivery.** `server.publish(topic, …)`
  returns the message's byte length whenever the topic had at least one
  subscriber and `0` when it had none; per-subscriber outcomes are not in it.
  Under the hood the fan-out calls the same `send()` per subscriber and throws
  the result away (both paths — big frames go straight to each socket, small
  ones are buffered in the topic tree and drained later), so a backpressured
  subscriber is dropped exactly as above while the publish call reports success.
  `closeOnBackpressureLimit` is the ONLY mechanism that reaches it: the
  subscriber that would have lost frames is disconnected while every other
  subscriber of the topic still receives all of them. Read a `0` from a room
  push as "no subscriber on this topic in this process", never as an error.
- **The kill cannot be announced, and the two mechanisms do not race for long.**
  A `closed` frame would be dropped by the rule that triggered the kill — and so
  is the close frame itself: measured, `ws.close(4008, …)` on an over-limit
  socket reaches the peer as a bare hang-up, code and reason gone, along with
  whatever Bun still held buffered. The peer only ever learns "the connection
  ended", which is all the reconnect needs. With the default settings the funnel
  branch is in fact dormant: uWS tears the socket down inside the very `send`
  that trips the limit (the close handler fires synchronously, so `readyState`
  is already CLOSED when the status comes back), and the funnel is what keeps
  the contract when an app sets `closeOnBackpressureLimit: false`. A Bun wart
  rides along, and minimizing it showed it is BROADER than this path: EVERY
  normal websocket close — the funnel's `close()`, a `terminate()`, the client
  hanging up — leaks `server.pendingWebSockets`, and `server.stop()` (forced or
  graceful) never settles while the leaked counter is above zero; only the uWS
  `closeOnBackpressureLimit` teardown decrements correctly. The listener itself
  DOES close the moment `stop()` is called — only the promise hangs — so
  `dispose()` races the stop against a 2 s deadline and moves on (the port is
  free either way; the backpressure int test asserts the bound). Repro + issue
  draft: dev/backlog/bun-issue-server-stop.md.
