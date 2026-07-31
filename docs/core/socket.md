---
index: 275
title: Socket
description:
  Live two-way messaging over one WebSocket — a channel is the connection,
  spaces are rooms, handlers are typed messages, all declared as points.
---

Sockets are four point types built in three levels. A **channel** is a live,
authenticated connection: the client connects with an input, the server checks
it and returns an **identity** for the connection. A **space** grows from a
channel — a family of rooms of one shape; the client **joins** it and the
server's `.joiner` decides which rooms it enters (or, with no `.joiner`, the
server enrolls it and nobody joins from outside). Inside live the message types
— the handlers: a **serverHandler** (client sends → `.serverReply` answers) and
a **clientHandler** (server sends → targeted clients receive, their
`.clientReply` optionally answers back). A handler grows from a channel (it
addresses connections) or from a space (it addresses rooms).

One WebSocket per client carries everything — every message arrives with its
channel, and a room message with its space and room, so the client knows which
connections to wake and the server knows which rooms each socket is in. The
socket opens with the first connection and closes when the last is gone.
Connecting is not a WebSocket frame — it's a normal HTTP request with everything
a request has (headers, cookies, middleware); only the messages after it travel
over the socket. Joining and leaving spaces are cheap socket frames.

```tsx
import { root } from '@/lib/root'
import { authorizedOnlyPlugin } from '@/lib/auth'
import { z } from 'zod'

// the channel: authentication. The connector returns the connection identity.
export const appChannel = root.lets
  .channel()
  .use(authorizedOnlyPlugin) // ctx.me — the current user
  .connector(async ({ ctx }) => ({ userId: ctx.me.user.id, role: ctx.me.role }))
  .channel()

// a space of chat rooms — one room per chat, its room shape declared at the opener
export const chatSpace = appChannel.lets
  .space<{ chatId: string }>()
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input, identity }) => {
    const ok = await isMember(identity.userId, input.chatId)
    return ok ? { chatId: input.chatId } : undefined // undefined = joined nothing
  })
  .space()

// client → server — a space handler: its callbacks get the typed room
export const messageSendHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ text: z.string().min(1) }))
  .serverReply(async ({ input, identity, room }) => {
    const message = await prisma.message.create({
      data: {
        text: input.text,
        chatId: room.chatId,
        authorId: identity.userId,
      },
    })
    void messageReceivedHandler.sendToClient(message, { room }) // to the room
    return message // what the sender gets back
  })
  .serverHandler()

// server → client — components subscribe themselves, no reply needed
export const messageReceivedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(messageSchema)
  .clientHandler()
```

```tsx
export const ChatPage = ({ chatId }: { chatId: string }) => {
  const membership = chatSpace.useMembership({ chatId })
  const [messages, setMessages] = useState<Message[]>([])

  messageReceivedHandler(membership).useOnMessageFromServer(({ message }) => {
    setMessages((prev) => [...prev, message])
  })

  const onSend = async (text: string) => {
    await messageSendHandler(membership).sendToServer({ text })
  }
  // ... a <appChannel.Connection> at the app root holds the connection
}
```

The channel connection lives once at the app root; every space rides it. That
split is the whole design: one authenticated pipe, many cheap room memberships
over it.

## Declaring a channel

Open with `.channel()`, close with `.channel(options?)`. The `.connector`
returns the connection **identity** — the value itself, bare:

```tsx
export const appChannel = root.lets
  .channel()
  .connector(async ({ request }) => {
    if (!request.state.userId) {
      throw new AppError('Unauthorized', { code: 'UNAUTHORIZED' })
    }
    return { userId: request.state.userId } // this connection's identity
  })
  .channel()
```

See [points](points) for the `.lets` notation. A channel needs no input and no
connector — with neither, it's a bare authenticated pipe with an empty identity.
That identity is typed strictly empty (`{}`): reading a field off it — in a
joiner, an enroller, a `.serverReply` — is a compile error, and its `$identity`
matchers admit no keys (an empty matcher still means "every connection"). And
[`amendIdentity`](#patching-the-identity--amendidentity) is refused on it by
both layers — a compile error on the call and a runtime throw underneath it: a
connectorless channel has nothing declared to amend, so the runtime identity can
never grow keys the `{}` type never admitted.

Sockets also need the engine's `socket` server option on:

```tsx
Engine.create({ server: { socket: true /* … */ } /* … */ })
```

It turns on the bare WebSocket endpoint (`GET /_point0/<scope>/websocket`) that
every channel of the scope multiplexes over. The default is `false` — the
endpoint does not exist unless enabled, and with it off declaring socket points
is refused outright (the closer throws at startup: the feature is off, so the
code that would run them is not there). To keep channels declared while the
endpoint stays off, name the feature: `features: { socket: true }` — then the
declaration is legal and the channel-without-endpoint state logs a startup
warning instead.

That one line does a second thing: it turns on the socket **feature**. Sockets
are optional, and an app that never asked for them does not download them — with
the feature off, the compiler folds every socket body in `@point0/core` to a
throw in the CLIENT build and `@point0/core/socket` never reaches the browser
(~71.6 KB raw / ~16 KB gzip — the delta between the two `@point0/core` rows of
the size table). You can name the feature yourself when the two differ —
`features: { socket: true }` ships the code without serving an endpoint, a
client's own `features: { socket: false }` strips just that bundle — see
[features](engine-config#optional-features-features). Everything the socket
exports lives behind **one door**, the `@point0/core/socket` subpath; the main
`@point0/core` entry deliberately does not re-export it.

### Connecting

`useConnection` / `connect` send a regular request to the channel endpoint — not
a WebSocket frame. So `.connector` runs like a loader on any endpoint: full
`request`, headers, cookies, `set`, [middleware](middleware), [plugins](plugin).
Any server check works, and throwing rejects the connect — the client sees the
typed error in `connection.error`.

The channel endpoint is **dual-method** like a query: a short input rides a GET
(`?input=`), a long one a POST — chosen by URL length. What differs from a query
is the tail: once the pipeline passes, the connection binds to the client's
WebSocket. By default every connect — the first and every re- — is the **ticket
path**: the response carries a one-time ticket the socket claims (opening first
if needed). The `upgradable: true` channel option buys back the cold-start round
trip: with no socket open yet and a short input, the client upgrades the connect
GET itself into the socket — the handshake IS the connect, no ticket. Either
way, middleware and plugins see only this handshake — **messages after it carry
no headers or cookies**: everything a later reply needs must come out of the
connector, which establishes it as the identity.

### The two connect paths

Both paths run the identical server pipeline — same input, same middleware and
ctx, same connector — and both deliver cookies: the request's cookies follow the
browser's ordinary rules on each, and `set.cookies` from the pipeline reaches
the client on the upgrade too (the engine carries the effect headers into the
`101`, and browsers apply a handshake's `Set-Cookie`). What differs is the
transport shell around that pipeline:

|                       | Ticket path (default)                                                                       | Upgrade path (`upgradable: true`, cold start only)                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Method and body       | GET or POST by input length; binary inputs ride the POST                                    | GET only — the input rides `?input=` under the URL-length cap; too long or binary falls back to the ticket path                                                         |
| Custom client headers | a plain fetch — [`.fetchOptions`](stage-methods#fetchoptions) headers and credentials apply | browser JS cannot attach custom headers to a handshake (`new WebSocket(url)` exposes none) — only browser-set ones (Cookie, Origin) arrive                              |
| CORS                  | ordinary CORS rules                                                                         | a WebSocket handshake skips CORS entirely — control `Origin` with a [middleware](#origin-allowlist-for-the-socket)                                                      |
| Connector errors      | the typed error arrives in `connection.error`                                               | a browser hides a failed handshake's response — the client falls back to a ticket attempt, which surfaces the same typed error (one extra round trip on the error path) |
| Reconnects            | always this path                                                                            | never — the upgrade is a cold-start optimization only                                                                                                                   |

That asymmetry is why the upgrade is opt-in. A connect that authenticates
through custom headers (`.fetchOptions`) would silently pass the connector
WITHOUT them on the upgrade — under header-or-fallback auth that means a
different identity, not an error. Default-off keeps every connect one shape the
connector can rely on; turn `upgradable` on for same-origin apps on cookie auth,
where the handshake carries everything the connector reads and the saved round
trip is free.

## The connection identity

The connector returns the identity object — anything the connection needs to
select and authorize later, established at connect time:

```tsx
// identity from auth
.connector(async ({ request }) => ({ userId: request.state.userId }))

// identity from the input plus a lookup
.connector(async ({ input, ctx }) => ({
  workspaceId: input.workspaceId,
  role: await roleIn(ctx.me.user.id, input.workspaceId),
}))
```

Identity is the connection's server-side credential. The socket carries no
cookies or headers, so whoever the client is was decided at connect time and
lives here. Handlers read it, `kick` / the `$identity` selections match over it,
and it is rebuilt on a reconnect or a server [`refresh`](#managing-connections)
— or patched in place with [`amendIdentity`](#managing-connections). It is
deliberately not called `ctx`: that word stays a request's context (the `ctx`
argument, from `.use`/`.ctx`), so the connector's **return** is the identity.

The connector returns no `room` and no `data` — only the identity. Rooms come
from [spaces](#spaces); data a client needs lives in an ordinary [query](query)
right next to the connection — a connect is not a query, it's a pipe.

```tsx
.serverReply(async ({ input, identity, room, connectionId }) => {
  identity.userId // established at connect — never leaves the server
  room.chatId // the room this message addresses (space handlers only)
  connectionId // this connection — target it back with { connectionId }
})
```

On the server a connection is always the bare `connectionId` string — in
callbacks, in events, in targets, in listings. It is **ephemeral** (a reconnect
mints a new one): address rooms, not connection ids, for anything long-lived.

## Spaces

A **space** grows from a channel and describes a family of rooms of one shape.
**The room shape is declared at the opener**, the way a component declares its
props — then take an `.input`, decide rooms in `.joiner`, close with `.space()`:

```tsx
export const chatSpace = appChannel.lets
  .space<{ chatId: string }>() // the room shape — every room of this space is one of these
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input, identity }) => {
    const ok = await isMember(identity.userId, input.chatId)
    return ok ? { chatId: input.chatId } : undefined
  })
  .space()
```

The generic rides either spelling of the opener —
`appChannel.lets.space<{ chatId: string }>()` or
`appChannel.lets<{ chatId: string }>('space', 'chat')`. Everything downstream
reads it: the `.joiner` and `.enroller` returns are **checked** against it,
handlers get it as `room`, and every target (`room`, `$room`, `except`, `kick`,
`enroll`, the `memberships.*` listings) is typed by it. Omit it and the room is
the **empty object** — a space with exactly one room, `{}` (the
[global space](#recipes)); a joiner that then returns anything keyed is a type
error, which is the nudge to declare the shape.

**Checked means exactly, extra keys included.** A room the joiner returns with a
key the shape never declared is a type error, not a shrug — the snapshot IS the
address, so `{ chatId: 'c1', extra: 1 }` is a different pub/sub topic than
`{ chatId: 'c1' }` and would never hear a send aimed at it. Pass a wide row
through and TypeScript stops you; map it down to the room shape instead:

```tsx
.joiner(async ({ input }) => {
  const chat = await db.chat.find(input.chatId) // { id, chatId, title, … }
  return { chatId: chat.chatId } // not `chat` — the room is its keys, nothing more
})
```

The **input is not the room.** It is what the client passes to `join` — the
request. The joiner turns it into rooms, and may well return something else
entirely (`{ a, b }` in, one `{ pair: 'a+b' }` out), several rooms, or none.

**What a membership IS.** A membership is _information about participation_ —
never an address. On the server it is exactly
`(space, channel, connectionId, rooms)`; the wire carries no membership entity
at all (frames carry the space, the rooms and the connection id). On the client
it is that same participation plus its `input`, which is the client-side
hold-dedup key — like a query key, not an address. **Addressing is always by
ROOM**: the room is what a push targets, what a handler binds, and what a
socket-query key carries. Passing a membership where a room is expected is only
the convenience "take its single room".

`.joiner(({ input, identity, connectionId }) => …)` runs over the socket on
every join and gets the join input plus the connection's ready identity
(authentication already happened on the channel — there's no request here) and
its `connectionId`. To read this connection's current rooms, use the synchronous
[`local` floor](#join-guards-and-the-local-floor) —
`thisSpace.memberships.server.local.rooms({ connectionId })`. It returns which
rooms the client enters:

- **one room object** → joins that room;
- **an array of room objects** → joins several at once;
- **an empty array or nothing** (`undefined`) → joins none — a clean deny;
- **a throw** → a join error, delivered to the client on the membership as
  `status: 'error'` (exactly as a connector throw is a connect error).

An array on the input is normal — a live-entities space joins forty rooms in one
frame:

```tsx
export const entitySpace = appChannel.lets
  .space<{ model: string; id: string }>()
  .input(
    z.object({
      items: z.array(z.object({ model: z.string(), id: z.string() })),
    }),
  )
  .joiner(({ input, identity }) =>
    input.items.filter((item) => canSee(identity, item)),
  )
  .space()
```

**No `.joiner` at all → clients cannot join this space.** A `join` is refused
with a typed `POINT0_SOCKET_JOIN_NOT_ALLOWED` error — thrown on the client
before a frame leaves, and answered the same way by the server for anyone who
frames one by hand. Such a space is the server's to fill: `.enroller` at
connection setup, `space.enroll()` mid-life. That is deliberate — the rooms of
an enroller-only space are chosen from the identity, and a client-authored room
must never be able to slip in beside them.

No `.joiner` data return either — a join yields only room objects; data lives in
queries.

### Joining from the client

`useMembership(input, options?)` holds a membership while mounted; `join` is its
imperative twin. The membership is query-shaped — it reports where the join
stands and which rooms it actually got:

```tsx
const membership = chatSpace.useMembership({ chatId })
membership.status // 'joining' | 'joined' | 'error' | 'closed'
membership.rooms // the rooms the server admitted this client into — [] = joined nothing
membership.error // typed, when .joiner threw
membership.isLoading // status === 'joining'
membership.input // { chatId }
membership.membershipIndex // successful joins so far — > 1 means it re-entered
membership.connection // the channel connection this membership rides on
membership.leave() // release this hold
```

`rooms` is the server's answer, separate from the requested `input`: a partial
join (asked for forty, got thirty) is visible, and a clean deny is
`status: 'joined'` with `rooms: []` — distinct from `status: 'error'` (a
`.joiner` throw).

Holds dedupe like connections, one level down: two components calling
`useMembership({ chatId: '5' })` share one membership with two holders, the
second join is never sent; both released → `linger` → `leave`. Outside hooks,
`getMembership(membershipInput, channelInput?)` looks a live membership up (no
hold, no join — the second arg only when the channel has several live
connections); `getMembershipOrUndefined(...)` probes.

```tsx
;<chatSpace.Membership input={{ chatId }}>
  <Chat /> {/* gated on the join, like a mountable; gate={false} opts out */}
</chatSpace.Membership>

chatSpace.getMembershipOrUndefined({ chatId })?.rooms
```

**A join needs a connection.** There is no auto-connect from a join — a
membership requires someone to hold the channel connection (canonically an
`<appChannel.Connection>` at the app root); the server-side way in is
[`.enroller`](#enrolling-from-the-server--enroller). Nothing holds it → the join
throws "No live connection" synchronously, the same shape as a send with no
connection. A space that declares **no `.joiner`** refuses the same way, and
sooner: the client bundle knows the joiner is absent (the compiler cuts the
callback, not the declaration), so `join` throws
`POINT0_SOCKET_JOIN_NOT_ALLOWED` before it even looks for a connection, and
`useMembership` never registers a membership. Such a space still HAS memberships
on the client — the enrolled ones — and no input opened them, so `getMembership`
has nothing to look up: read them with
[`memberships.client.list()`](#enumerating--connections-and-memberships).

### Enrolling from the server — `.enroller`

`.joiner` is the client asking in; `.enroller` is the server putting a fresh
connection into rooms on its own. It runs **server-side at connection setup**
(both connect paths — the cold-start upgrade and the ticket claim), before the
connect confirms, so the rooms exist before the client renders anything. The
canonical case is the **personal-push room**:

```tsx
export const userSpace = appChannel.lets
  .space<{ userId: string }>()
  .enroller(({ identity }) => ({ userId: identity.userId })) // every connection lands in its own room
  .space() // no .joiner — nobody can join this space from the browser

export const notificationHandler = userSpace.lets
  .clientHandler()
  .serverSend(notificationSchema)
  .clientHandler()

// anywhere on the server — a hot pub/sub push, zero client code
void notificationHandler.sendToClient(notification, { room: { userId } })
```

`.enroller(({ identity, connectionId }) => …)` returns one room, an array, or
nothing — same normalization as `.joiner`, and checked against the same
opener-declared room shape (read earlier enrollments of the same connect with
`thisSpace.memberships.server.local.rooms({ connectionId })`). The client learns
its enrollments from the connect confirmation and holds them as regular
memberships, just **hold-less**: they are `joined` right away, receive pushes
and fire listeners like any membership, send no join frames, and live with the
connection. A `refresh` re-runs the enrollers with the rebuilt identity and the
client reconciles. Hold-less also means no facade came back from a `join` call,
so on the client an enrollment is read through
[`memberships.client.list()`](#enumerating--connections-and-memberships) — the
floor that includes them.

**Leaving an enrollment.** `leave()` on an enrolled membership works like any
other: the client names that membership's rooms in a `leave` frame, the server —
which keys nothing by how a room was entered — drops them, and the facade dies
immediately (no hold behind it, so no `linger`). A room another live membership
of the same connection still covers is left out of the frame, so leaving an
enrollment never silences a join of the same room. It is not a permanent exit,
though: the enroller runs at **every connection setup**, so a reconnect or a
`refresh` puts the connection right back in. Permanence is **data the enroller
reads**:

```tsx
export const userSpace = appChannel.lets
  .space<{ userId: string }>()
  .enroller(async ({ identity }) => {
    const user = await db.user.findUnique({ where: { id: identity.userId } })
    // muted → enroll into nothing: no personal room, no pushes, on every connection this identity opens
    return user.notificationsMuted ? undefined : { userId: identity.userId }
  })
  .space()
```

```tsx
// the client: leave() stops the pushes for THIS connection right now, the mutation makes it stick
userSpace.memberships.client.list().forEach((membership) => membership.leave())
await muteNotificationsMutation.fetchMutation()
```

An enrolled membership has no lifecycle of its own — it is announced, not
joined, so [`onEnter`](#reconnect) never fires for it and its connection dying
stays silent. The one exception is this `leave()`: it fires `onLeave`, exactly
like the voluntary leave of a joined membership.

A space takes at most **one** `.enroller`; it coexists with `.joiner` in either
order (the client can then join more rooms too — both callbacks answer to the
space's one declared room shape). Without a `.joiner` the space is
**server-enrolled only**, which is the shape you want for personal rooms. A
**throwing enroller fails the whole connection setup** — the client sees a
failed connect, exactly as a connector throw; a connection missing its enrolled
rooms would drop pushes silently. Each enrollment emits the
`pointSpaceJoinServer*` family (with an empty input) — an enrollment is a
server-initiated join. Like `.joiner`, the callback is server code — cut from
the client bundle with its imports. An `.enroller` on a `resumable: false` space
of a [resumable](#resumable-connections) channel fails at the closer: a resume
would silently drop the enrollments (they only re-run on a full connect).

**Enrolling mid-life — `space.enroll(target, room)`.** `.enroller` runs at
connection setup; `enroll` is the same act aimed at connections that are
**already live** — the mirror of [`space.kick`](#kicking-from-rooms--spacekick)
(kick = a forced leave, enroll = a forced join). The first argument selects who
with the usual `$`-dictionary; the second names the rooms:

```ts
// a thread was created — put every live connection of its author into its room
await notificationSpace.enroll({ $identity: { userId } }, { threadId })

// one or many — the same key, like every other room surface
await chatSpace.enroll({ connectionId }, [{ chatId: '5' }, { chatId: '6' }])
```

`connectionId` / `$identity` / a bare target select among **all connections of
the channel** (no membership required — you are enrolling them); `room` /
`$room` parts select by existing memberships ("those already in these rooms").
The enrolled rooms behave exactly like `.enroller` rooms — hold-less, `joined`,
no client join behind them — and a space kick (or the client's own `leave()`)
removes them like any others. A connection the new rooms would push past
[`maxRooms`](#join-guards-and-the-local-floor) is **skipped** with a logged
warning: an admin fan-out has no one requester to answer, so the rest of the
selection still gets its rooms. An imperative enrollment is **ephemeral**: it
lives until the connection does, and a reconnect or `refresh` rebuilds
enrollments from `.enroller` alone. A durable enrollment is data — write the
fact, have `.enroller` read it, and use `enroll` to deliver it to the
connections that are already online.

### Join guards and the `local` floor

The closing `.space({...})` takes the join guards in its `server` group;
`.spaceOptions({...})` declares them up the chain (root/base/plugin, and the
channel — callbacks stack chain → closer and run in order):

```tsx
export const chatSpace = appChannel.lets
  .space<{ chatId: string }>()
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input, identity }) =>
    (await isMember(identity.userId, input.chatId))
      ? { chatId: input.chatId }
      : undefined,
  )
  .space({
    server: {
      // the guard BEFORE the join — throw and the client's join fails, the joiner never runs
      onBeforeJoiner: ({ identity, connectionId }) => {
        if (
          chatSpace.memberships.server.local.rooms({ connectionId }).length >=
          50
        ) {
          throw new AppError('Too many rooms', { code: 'ROOM_LIMIT' })
        }
      },
      // after the join settles — audit, metrics; `output` (the admitted rooms) XOR `error`
      onAfterJoiner: ({ identity, output, error }) => {
        audit.log('space-join', {
          me: identity.userId,
          rooms: output?.length ?? 0,
          ok: !error,
        })
      },
    },
  })
```

Both receive `{ input, identity, connectionId, point }`; `onAfterJoiner` adds
`{ output, error }` and its own throw only logs. An `onBeforeJoiner` throw is a
join error — the client sees it on the membership as `status: 'error'`, same as
a `.joiner` throw. The blunt per-connection bound is the `maxRooms` option
([the table](#options)) — respected on every path that puts a connection into
rooms; the guard plus the `local` floor is the POLICY mechanism, and it composes
(per-role caps, per-space caps, rate limits).

**The `local` floor** is the synchronous sub-floor of the server floor of the
[enumerations](#enumerating--connections-and-memberships) —
`space.memberships.server.local.count/list/rooms` and
`channel.connections.server.local.count/list`. It reads **this process's slice**
of the room index straight from memory: no bus, no gather window, no promise
(plain values). The callback inputs are pure data again (`input`, `identity`,
`connectionId`, `messageId`); to read a connection's current rooms in a guard,
call `chatSpace.memberships.server.local.rooms({ connectionId })`.

In the join path (`.joiner`, `.enroller`, the join guards) the local slice is by
construction the **full truth** about the connection — a join always executes on
the socket's own process. Anywhere else it is local only; for truth across every
process use the async `count` / `list`. (There is no flat `rooms` without a
target — a target is always what you read against.)

## Server handlers: client → server

> **Naming — `input` / `message` / `data`.** One rule across every socket
> callback: **`input`** is the payload of a CALL — someone called a point and
> gets an answer (the channel connect, a space join, a serverHandler send —
> query vocabulary); **`message`** is the payload of a PUSH — the server
> broadcasts, nobody awaits (`sendToClient` → `.clientReply`, the
> `onMessageFromServer` listeners, `iterateMessagesFromServer`); **`data`** is
> the other side's ANSWER to you (`await sendToServer()` resolves with it,
> `onReplyFromServer.data`, a collected push reply). So `.serverReply` reads
> `input` and `.clientReply` reads `message` — the word tells you whether you
> are answering a call or reacting to a broadcast.

Open with `.serverHandler()`, close with `.serverHandler(options?)`. Takes
`.clientSend` (the schema of what clients send) and `.serverReply` (the server's
answer). The message is optional (like a mutation's input); the reply is not.
`.serverReply` takes no schema — the server trusts itself, only client answers
need checking. A handler grows from a **channel** or a **space**, and that is
what shapes its callbacks and its addressing:

```tsx
// from a space — the callbacks get the typed room
export const messageSendHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ text: z.string().min(1) }))
  .serverReply(async ({ input, identity, room }) => {
    const message = await create(input.text, room.chatId, identity.userId)
    return message
  })
  .serverHandler()

// from the channel — no room slot at all
export const markAllReadHandler = appChannel.lets
  .serverHandler()
  .serverReply(async ({ identity }) => {
    await prisma.chatRead.updateMany({ where: { userId: identity.userId } })
    return { ok: true }
  })
  .serverHandler()
```

```tsx
chatSpace.lets.serverHandler().clientSend(schema).serverHandler()
// type error: Point has no reply. Please add .serverReply()
//             before calling .serverHandler()
```

That closing guard is the only special error (same pattern as a loaderless
[mutation](mutation)). Nothing else needs one: `.loader` / `.clientLoader` /
plain `.input` simply don't exist on handler points. On handlers the method name
is the **author** — who produced the message or reply — so a chain reads as a
dialogue: `.clientSend` (the client said) → `.serverReply` (the server
answered). The side that RUNS the code is the opposite one — `.clientSend`'s
schema is parsed by the server — which is also how they strip (see
[the machinery](#the-usual-point-machinery)).

The channel/space input does **not** merge into the handler's input —
connecting, joining, and messaging are different things. On the server the input
isn't kept: what a reply needs comes from the identity (established at connect)
and the room (resolved at join). On the client the input stays as
`connection.input` / `membership.input`.

Handlers take no `.ctx` / `.use` — a type error, permanently. The identity was
built by the connector at connect time, and messages carry no request. Something
needed per message is computed in the reply itself.

### Sending from the client

`.sendToServer(input?, options?)` resolves with the `.serverReply`'s return —
one reply, always. Don't await it and it's fire-and-forget. Bind the handler to
a target by **calling** it — a channel handler binds a **connection**, a space
handler binds a **room**:

```tsx
const membership = chatSpace.useMembership({ chatId })

const message = await messageSendHandler({ chatId }).sendToServer({ text }) // the ROOM
void messageSendHandler({ chatId }).sendToServer({ text }) // fire and forget
void markAllReadHandler(connection).sendToServer() // a channel handler binds a connection
```

A space handler is **always addressed by room** — that is what the object in the
binder is. Passing a **membership** instead is the shorthand "use its single
room": exactly one room resolves, zero or several are an error telling you to
bind the room. A channel handler's target may equally be the connection object
or the **channel input** it was opened with. Either way the binder SEARCHES the
live registry — it never opens or joins anything.

```tsx
void messageSendHandler(membership).sendToServer({ text }) // = its single room
void messageSendHandler({ chatId }, { workspaceId }).sendToServer({ text }) // + channel input
```

The optional second argument is the **channel input**, needed only when the same
room lives under several live connections of the channel.

The target resolves lazily on every call/render: a room-bound hook waits for the
join that admits the room. An explicit target wins over the ambient
`<chatSpace.Membership>` / `<appChannel.Connection>`.

The bare form — no binding — resolves on its own: hooks read the enclosing
ambient wrapper, and every method falls back to the single live membership /
connection, then to its single room. With several live memberships (or several
rooms in one) the bare form is a runtime error — bind explicitly.

**A send waits for its level.** A space-handler send waits for the membership to
reach `joined` (which implies the connection is claimed) and flushes; a
channel-handler send waits for the connection to open. Nothing started and no
one started it → a synchronous throw. Binding a room the client does not
currently hold is that same throw: `handler(room)` addresses a LIVE room, so
join (or be enrolled) first.

**Multi-room memberships bind the room.** One join may land in several rooms —
then the membership names no single address and every bound surface takes the
room:

```tsx
const membership = entitySpace.useMembership({ ids }) // rooms: [{ model, id }, …]

void entityUpdateHandler({ model, id }).sendToServer(input) // this room
const { data } = entityInfoHandler({ model, id }).useSocketQuery() // one cache per room
```

There is no `room` send option — binding is the one way to name a room, across
`sendToServer`, the listeners, the iterator and the whole socket-query family.

A reply throw rejects the promise with the typed error — see
[error handling](error-handling). `onReplyFromServer` in the closing options'
`client` group fires on the client for every reply of the handler, including
fire-and-forget sends; its payload is `data`, the server's reply, next to the
`input` the send carried. Up the chain via
`.serverHandlerOptions({ client: { onReplyFromServer } })` it fires for every
handler beneath, there `data` is unknown and `point` tells which replied.

### The handler as a mutation, query, or infinite query

A serverHandler declares what it IS for the client — a **flavor**, after
`.serverReply` and before the closer: `.query(options?)`,
`.infiniteQuery(options)`, or `.mutation(options?)`. Nothing declared means
mutation (the default). One flavor per handler; a flavor before `.serverReply`
is a type error — the reply is what the query or mutation returns. The flavor
opens the matching connection family — the standard [query](query) /
[mutation](mutation) surface where the request travels the socket instead of
HTTP:

- `.query()` → the full query family: `useSocketQuery` /
  `useSuspenseSocketQuery` / `fetchSocketQuery` / `prefetchSocketQuery` /
  `ensureSocketQueryData` / `getSocketQueryOptions` / `getSocketQueryKey` /
  `getSocketQueryData` / `setSocketQueryData` / `getSocketQueryState` /
  `getSocketQueryCache` / `getSocketQueriesCache` / `refetchSocketQuery` /
  `invalidateSocketQuery` / `cancelSocketQuery` / `removeSocketQuery` /
  `resetSocketQuery`
- `.infiniteQuery({ pageParamFromInput, getNextPageParam, initialPageParam })` →
  the same family with the `Infinite` infix (`useSocketInfiniteQuery`,
  `invalidateSocketInfiniteQuery`, …) — the page cursor folds into the message
  input, each page is one send
- mutation (the default) → `useSocketMutation(options?)` /
  `fetchSocketMutation(input?, options?)` (the non-hook run through the mutation
  cache machinery — the plain `sendToServer` bypasses it) /
  `getSocketMutationKey` / `getSocketMutationOptions` / `getSocketMutationCache`
  / `getSocketMutationsCache`

Each method mirrors its regular [query](query) / [mutation](mutation)
counterpart: the exact-input forms act on one cache entry, and the cache-acting
methods (`refetch` / `invalidate` / `cancel` / `remove` / `reset` /
`getSocketQueriesCache`) also take a predicate over the parsed input or `true`
for every entry of this handler on the resolved connection (with no resolvable
connection, across all connections).

```tsx
export const chatInfoHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ q: z.string() }))
  .serverReply(async ({ input, room }) => ({
    info: await lookup(input.q, room.chatId),
  }))
  .query()
  .serverHandler()
```

The target resolves like every bare handler method — the ambient wrapper, else
the single live one — and binding by call fixes it. The cache key carries the
**address of the level**: a channel handler keys by the channel and its
connection input; a space handler adds the space and the **room** — so two chats
never share a cache cell, and a multi-room membership gets one cache entry per
room:

```tsx
const a = chatInfoHandler({ chatId: '5' }).useSocketQuery({ q }) // room 5's entry
const b = chatInfoHandler({ chatId: '7' }).useSocketQuery({ q }) // room 7's entry
```

The membership input is NOT part of the key: it is how the client dedups holds,
not an address (see [what a membership is](#spaces)). Two memberships whose
joins landed in the same room therefore read one cache entry — which is what you
want, since the server answers the room.

The cache-acting methods scope through the same key: an exact input acts on one
entry, a predicate or `true` sweeps the handler's entries — narrowed to the
bound room when the binding named one, otherwise across every room of the space
on the resolved connection:

```tsx
await chatInfoHandler({ chatId }).invalidateSocketQuery({ q }) // one input, one room
await chatInfoHandler({ chatId }).invalidateSocketQuery(true) // every input in that room
await chatInfoHandler(membership).invalidateSocketQuery(true) // every room on its connection
await chatInfoHandler.invalidateSocketQuery(true) // no live membership → across all
```

`setSocketQueryData(input?, updater)` is the push-driven mirror of a query's
[`setQueryData`](with): when a clientHandler push already carries the READY
data, write it straight into the cache and no refetch request goes out. It
matches the **exact** key (the level's identity plus this `input` — no partial
scoping) and resolves the connection/membership strictly (the ambient wrapper,
the single live one, or the bound target), so a bare call under no ambient level
with several live ones throws. The updater's `old` is `undefined` until the
query has resolved once; the return is the new data. It is client-side only. A
push carrying the fresh member list writes it in place — no member refetches:

```tsx
presenceChangedHandler(membership).useOnMessageFromServer(({ message }) => {
  whoIsHereHandler(membership).setSocketQueryData(undefined, () => ({
    nicknames: message.nicknames,
  }))
})
```

A socket query never runs before its level is ready: `open` for a channel
handler; for a space one, a `joined` membership that currently HOLDS the
addressed room — which also means [SSR](ssr) never fetches or dehydrates one
(every socket query is `ssr: false` by construction). The imperative
`fetchSocket*` / `prefetchSocket*` / `ensureSocket*` AWAIT the connect like the
send queue — fired while the level is still connecting or joining, they wait for
it to land (up to the handler's `timeout`) and fail only when the connect fails.
They throw on the server. The suspense hooks (`useSuspenseSocketQuery` /
`useSuspenseSocketInfiniteQuery`) suspend on the connect first, then on the
fetch; during SSR the HTML ships the Suspense fallback and the client resolves
after hydration.

### Answering early — the imperative `reply`

The `return` doesn't have to be the answer. Name the reply type with the
explicit generic — `.serverReply<T>(...)` — and the callback's args gain the
imperative `reply`: call it and the envelope leaves for the client
**immediately**, while your code keeps running. (The generic is what makes this
typeable at all — a call argument can't drive inference the way a `return` does,
so the type must be named.)

```tsx
export const transcodeHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ videoId: z.string() }))
  .serverReply<{ accepted: boolean }>(async ({ input, reply, identity }) => {
    reply({ accepted: true }) // the client's sendToServer resolves NOW…
    const url = await transcode(input.videoId) // …while the server keeps working
    void transcodeDoneHandler.sendToClient(
      { url },
      { room: { userId: identity.userId } },
    )
  })
  .serverHandler()
```

`reply` is called once — the first call wins, later calls only warn, a `return`
after it is ignored. `reply(new Error(...))` is the imperative refusal (the
client's send rejects with the typed error, exactly as a throw would);
`.serverReply<undefined>()` makes `reply(undefined)` the early **ack** (the
client types the resolve as the empty data, like any ack). `return` works the
same with or without the generic; a throw after `reply()` was sent only logs —
the client already has its answer.

A result that outlives the request (the transcode above) is **data, not a
pending promise**: write it, then push it into a room the user holds (an
[`.enroller`](#enrolling-from-the-server--enroller) personal room is the usual
shape) or invalidate a query — that survives a reconnect, a redeploy, and a
closed tab. See [Delivery](#delivery).

### A reply never streams

`.serverReply` answers one send — a generator callback is refused at the type
level and at runtime. When the answer IS a stream (the LLM-chat shape: one
action, the result arrives token by token), split it along the architecture: a
mutation **starts** the job, the server **pushes** the tokens through a
[clientHandler](#client-handlers-server--client) addressed to the calling
connection, and the client consumes them — reactively with
`useOnMessageFromServer`, or as an async iterable with
[`iterateMessagesFromServer`](#iterating-the-pushes):

```tsx
export const chatBotTokenHandler = chatSpace.lets
  .clientHandler()
  .serverSend(z.object({ token: z.string() }))
  .clientHandler()

export const chatBotAskHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ prompt: z.string() }))
  .serverReply(async ({ input, identity, connectionId }) => {
    void (async () => {
      for await (const token of llm.stream(input.prompt, {
        user: identity.userId,
      })) {
        await chatBotTokenHandler.sendToClient({ token }, { connectionId })
      }
    })()
    return { started: true }
  })
  .serverHandler()
```

The pushes ride the already-open socket, survive the channel's reconnects, and
scale across processes through the backplane like every push — and cancelling
the job is just another mutation. See [Delivery](#delivery) for the
stream-with-history shape that survives a gap.

### Guards and audit

Messages travel the socket, so request-time [middleware](middleware) and
[plugins](plugin) never see them — they ran once, at connect. What runs **per
message** are the handler's server-side callbacks:

```tsx
.serverHandler({
  server: {
    // the guard BEFORE the reply — throw and the client's send rejects, the reply never runs
    onBeforeServerReply: async ({ identity, connectionId }) => {
      if (await rateLimiter.exceeded(connectionId)) {
        throw new AppError('Slow down', { code: 'RATE_LIMITED' })
      }
    },
    // after the reply settles — audit, metrics; `output` XOR `error`, its own throw only logs
    onAfterServerReply: ({ input, identity, output, error }) => {
      audit.log('message-send', { input, me: identity.userId, ok: !error })
    },
  },
})
```

Both receive `{ input, identity, connectionId, messageId, point }` — plus `room`
for a space handler. `onAfterServerReply` adds `{ output, error }`; an
[imperative](#answering-early--the-imperative-reply) `reply()` fires it the
moment it's called (with the replied data). Both are **server code** — cut from
the client bundle with their imports.

## Client handlers: server → client

Open with `.clientHandler()`, close with `.clientHandler(options?)`. Everything
inside is optional — the minimal one is a pure trigger:

```tsx
export const ideasChangedHandler = ideasSpace.lets
  .clientHandler()
  .clientHandler()
```

Add `.serverSend` for a typed payload — the server produced the message, the
client reads it (the server never parses it, only types the send). A
module-level listener can live in the closing options — then connecting/joining
is all a client needs, no component subscription:

```tsx
export const messageReceivedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(messageSchema)
  .clientHandler({
    client: { onMessageFromServer: ({ message }) => notify(message) },
  })
```

Component listeners (`useOnMessageFromServer` / `onMessageFromServer`) add on
top — every registered listener fires exactly once per message, each also
receiving `point`. Add `.clientReply` when the client should answer back: a
module-level reaction that runs on every message; its return travels back to the
server and nowhere else. The listeners fire immediately with the message and
never see the reply — react to the reply inside `.clientReply` itself. Pass a
schema as the second argument and the server validates every reply:

```tsx
export const pingHandler = appChannel.lets
  .clientHandler()
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(
    ({ message, connection }) => ({ answer: `pong: ${message.ask}` }),
    z.object({ answer: z.string() }), // checked on the server, types the reply
  )
  .clientHandler()
```

The strip side is in the name: `.serverReply` is cut from the client bundle,
`.clientReply` from the server bundle. Inside `.clientReply(cb, schema?)` the
callback is client code but the schema is server code, so the compiler splits
the call — in the server bundle the callback becomes `() => {}` and the schema
stays; in the client bundle the schema argument is dropped. A space
clientHandler's `.clientReply` also gets `room`.

### Sending from the server — the addressing watershed

`sendToClient(message, target?, replies?)` — three positional arguments,
callable anywhere in a process running the engine server — mutation loaders,
other handlers, crons (a separate worker process without `engine.serve()` has no
socket adapter to send through). The **target** is a `$`-dictionary whose parts
combine with **AND**. One rule reads it: a bare key is an **exact address** (the
hot path), a `$`-key is a **Mongo-style selection** (a scan, run by sift). No
target — or `{}` — means everyone in the handler's scope. **What the target can
name follows from where the handler grew** — this is the watershed:

A **channel** clientHandler addresses connections:

```tsx
void announceHandler.sendToClient({ text }) // everyone in the channel
void announceHandler.sendToClient({ text }, { connectionId }) // one connection — the cheapest address
void announceHandler.sendToClient({ text }, { $identity: { role: 'admin' } }) // a selection (scan, admin)
```

A **space** clientHandler addresses rooms — typed by the space's room shape —
and may narrow by the same connection keys:

```tsx
void messageReceivedHandler.sendToClient(message, { room: { chatId: '5' } })
void messageReceivedHandler.sendToClient(message, {
  room: [{ chatId: '5' }, { chatId: '7' }],
})
void messageReceivedHandler.sendToClient(message) // bare — EVERYONE in the space
void messageReceivedHandler.sendToClient(message, {
  room,
  except: senderConnectionId,
})
```

- **`room`** — an exact room snapshot (or an array of them): the pub/sub topic
  address, the hot path. The **bare space send** is space-wide — one publish on
  the space-wide topic reaches every member of the space; also a hot pub/sub
  path, not a scan.
- **`$room`** — a sift selection over the space's rooms (subset semantics for a
  flat object: `$room: { workspaceId: '7' }` matches every room of workspace 7,
  whatever its other fields). An explicit **scan** — every process filters its
  local room index — costing what `$identity` costs; the `$` is the price tag.
- **`connectionId`** — exact connection id(s). AND-combined with `room`: the
  connection must be in the room.
- **`$identity`** — a sift selection over the connection identities — a scan,
  for the rare admin fan-out, not the hot path.
- **`except`** — connection id(s), or (on a space handler) room snapshot(s) of
  the same space, that the push must not reach.

The `$`-rule is uniform wherever a target is taken — pushes, `kick`,
`amendIdentity`, the enumerations: a bare key is an exact address (the hot
path), a `$`-key is an explicit sift scan. And "everyone except this user,
everywhere" is not an `except` — it's `$identity: { userId: { $ne: userId } }`.

A matcher is typed by the declared identity (or room) keys, and sift operators
belong in the **values** of those keys — `{ userId: { $in: [...] } }` — fully
typed there. Mind that a matcher naming a key nothing declares selects nobody:
TypeScript catches the mistyped literal, and a matcher built in a variable is on
you — the usual structural-typing rules apply.

### Collecting replies

The third argument, `replies`, collects each client's `.clientReply` answer — it
**exists only when the handler declares `.clientReply`** (no clientReply, no
argument), and without it nothing is collected. Three forms, and the return type
follows the one you pass:

```tsx
// true — the bare collection: an async iterable of replies
for await (const reply of pingHandler.sendToClient({ ask }, {}, true)) {
  reply.data // { answer } — validated by .clientReply's schema
  reply.connectionId
}

// { waitForAll: true } — the full array when the window closes
const replies = await pingHandler.sendToClient(
  { ask },
  { $identity: { role: 'admin' } },
  { waitForAll: true },
)

// { onReply } — a callback per reply; the promise resolves when the window closes
await pingHandler.sendToClient(
  { ask },
  {},
  {
    timeout: 3000,
    onReply: ({ data, connectionId }) => tally(data),
  },
)
```

Each reply is `{ data, connectionId }`, validated by the `.clientReply` schema
(an invalid one is dropped and logged). One delivered push = ONE reply per
connection (per targeted room, for a multi-room push) — how many components a
client mounted over the room never changes the count. `timeout` bounds the
collection window (default 5000 ms). A client whose `.clientReply` THROWS still
answers — as an error that counts toward the window (so `waitForAll` never
hangs) but delivers nothing (it's logged server-side).

### Listening in components

```tsx
const TypingIndicator = ({ chatId }: { chatId: string }) => {
  const membership = chatSpace.useMembership({ chatId })
  const [who, setWho] = useState<string | null>(null)
  typingHandler(membership).useOnMessageFromServer(({ message }) =>
    setWho(message.userName),
  )
  return who && <span>{who} is typing…</span>
}
```

The callback receives `{ message, connection, point }` — a space handler's adds
`room` (the room the push addressed). It fires immediately when the message
arrives, decoupled from the `.clientReply` auto-responder: a slow or throwing
reply never delays or suppresses the listeners (react to the reply inside
`.clientReply` itself). Same resolution as `.sendToServer`: under the ambient
wrapper (or a single live target) the bare
`typingHandler.useOnMessageFromServer(cb)` works.

**A ROOM-bound listener hears that room only.** Binding a room narrows the
listener the way it narrows a send — the pushes addressed elsewhere never reach
it, and a space-WIDE push (one with no room) is not addressed to a room, so it
does not either. A membership-bound (or bare) listener hears every room the
membership covers, space-wide pushes included, and `room` tells which one:

```tsx
typingHandler({ chatId }).useOnMessageFromServer(cb) // this room's pushes
typingHandler(membership).useOnMessageFromServer(({ message, room }) => …) // all of them
```

A second argument takes the options: `enabled` (`false` detaches the listener,
like a disabled query) and `lastMessageFromServerAsData` — keep the latest
message in state, the result gains `data` and re-renders on every push:

```tsx
const { data } = tickHandler.useOnMessageFromServer(() => {}, {
  lastMessageFromServerAsData: true,
})
```

By default the hook returns nothing and nothing re-renders — the typical
consumer reacts through the listener, and `lastMessageFromServerAsData: true`
turns the hook into the latest-message state when rendering is the point.

### Iterating the pushes

Every clientHandler also carries an imperative consumer —
`iterateMessagesFromServer(options?)`, the pushes as an async iterable. No
request leaves the client and there is no transport of its own: iterating
attaches a listener to the resolved target (the ambient connection, the single
live one, or an explicitly bound `handler(connection)` / `handler(room)`), and
each `sendToClient` push is one yield — filtered to the bound room, exactly like
the listeners.

```tsx
for await (const { tick } of tickHandler.iterateMessagesFromServer()) {
  append(tick)
}
```

The target owns its own life: a drop parks the loop while the channel's own
reconnect policy redials — there is no second policy at the message layer; the
iteration ends when the target closes for good and throws the target's typed
error when it fails. Break out of the loop (or abort `options.signal`) to detach
the listener. Connection state itself is the channel's surface — read it with
`useConnection` / `useMembership`, not here.

An HTTP [subscription](subscription) is a different thing on purpose — a REQUEST
the server answers with a stream. A clientHandler's pushes have no request, so
there is no `.subscription()` on socket points; the iterator and the listeners
are the whole consuming surface.

## Managing connections

A **channel** exposes `kick`, `refresh`, `amendIdentity`, and the
`connections.*` enumerations; a **space** exposes `kick`, `enroll` and the
`memberships.*` enumerations (a space has no identity to refresh). The commands
are server-only and take the same `$`-dictionary target the pushes use — parts
combine with AND, a bare call means everything in scope. The enumerations name a
[floor](#enumerating--connections-and-memberships) first (`server` / `client`)
and only the server floor takes targets:

```tsx
// channel target: { connectionId?, $identity? }
// space target:   { room?, $room?, connectionId?, $identity? }
```

- **`connectionId`** — exact connection id(s), the O(1) address.
- **`$identity`** — a Mongo-style query over the connection identity, run by
  [sift](https://github.com/crcn/sift.js). The TYPED surface is the common
  subset — `$eq` `$ne` `$gt` `$gte` `$lt` `$lte` `$in` `$nin` `$exists`, plus
  `$or` / `$and`; sift accepts more at runtime, so anything outside the subset
  takes a cast. `$where` is rejected. Serialized with the channel transformer,
  so Dates compare live. A nested object literal (`{ me: { id } }`) is exact
  subdocument equality — a field is a dot path (`{ 'me.id': userId }`; the typed
  keys are the top-level ones, so a dot path takes a cast, like the operators
  outside the subset).
- **`room`** (space only) — an exact room snapshot (or an array of them):
  full-object equality, the index address.
- **`$room`** (space only) — the same sift machinery over the space's rooms. A
  flat `$room: { chatId: '5' }` reads as **subset semantics**: it matches every
  room whose `chatId` is `'5'`, whatever its other fields — deliberately, this
  is what a selection means. A snapshot in `room` is exact equality of the whole
  object. An exact address and a selection are different operations, which is
  why they are different keys.

```tsx
// close a user's connections entirely (a role revoked, an admin logout) — a `closed` frame
await appChannel.kick({ $identity: { userId: '42' } })
await appChannel.kick({ connectionId, reason: 'signed-out' })

// re-run the connect for matching connections — the identity is rebuilt, the socket stays up
await appChannel.refresh({ $identity: { userId: '42' } })
```

`channel.kick` removes matching connections and marks each client `closed`. What
happens next follows the hold's nature: a connection held by `useConnection` /
`<Connection>` declares "stay connected while mounted", so it **re-establishes
on its own** through the [reconnect](#reconnect) policy — the connector re-runs
and judges afresh; an imperative `connect()` stays closed until its owner
reconnects (or [`reconnectAll()`](#client-helpers)). So a kick is an
_interruption_, never a _ban_ — a real ban belongs in the connector, which
re-applies on every connect (throw with
[`preventRetry`](error-handling#preventretry) and the client stops knocking
entirely). The optional `reason` rides the close frame — a raw WebSocket
consumer can read it off the wire; Point0's own client runtime does not surface
it (tell the user WHY with a push right before the kick). `refresh` is the "this
identity changed" signal: matching clients silently re-connect (the connector
re-runs, the identity is rebuilt, the enrollers re-run) and re-join their
spaces, without dropping the socket.

### Patching the identity — `amendIdentity`

`channel.amendIdentity(target, patch)` shallow-merges a patch into the stored
identity of matching connections, in place — no reconnect, no connector run:

```tsx
await appChannel.amendIdentity({ $identity: { userId: '42' } }, { plan: 'pro' })
await appChannel.amendIdentity({ connectionId }, { displayName })
```

It amends **data, not rights**: rooms already granted stay granted. Narrowed
rights are a `space.kick` next to it; a full re-evaluation (the connector and
the enrollers re-run) is `refresh`. The patch is a plain object — an updater
function cannot travel the backplane bus. The client learns nothing — the
identity is not its business. It needs a connector-declared identity to patch: a
[connectorless channel](#declaring-a-channel)'s identity is the strict `{}`, so
`amendIdentity` on it is a compile error on the call and a runtime throw
underneath — never a silent identity growing undeclared keys.

### Kicking from rooms — `space.kick`

Space admin targets rooms, not connections:

```tsx
// user 42 was banned in chat 5 — drop THEM from THAT room (their connection lives on)
await chatSpace.kick({ room: { chatId: '5' }, $identity: { userId: '42' } })

// chat 5 was deleted — drop EVERYONE from its room (this is "close the room")
await chatSpace.kick({ room: { chatId: '5' } })

// a selection — every room of workspace 7, whatever its other fields (subset semantics)
await chatSpace.kick({ $room: { workspaceId: '7' } })
```

`space.kick` is NOT a connection kill — it's a forced **leave** of the matching
rooms. The client's membership loses those rooms (its other rooms and its
connection live on) — and then the hold's nature decides again: a membership
held by `useMembership` / `<Membership>` **replays its join** through the
reconnect policy, so the joiner (and its guards) rules on it afresh — deny there
(with `preventRetry` for a hard deny) and the rooms stay gone; an imperative
`join()` stays shrunk until its owner re-joins. A room has no state of its own —
it exists while someone is in it, so "close the room" is just kicking everyone
out of it (and revoking the right to come back in the joiner). On a
[resumable](#resumable-connections) channel the kick reaches parked connections
and their passports too — a kicked room does not come back through a resume.
Like the channel kick's, the optional `reason` rides the `left` frame for raw
consumers only — the typed client runtime does not surface it.

Kick's mirror is [`space.enroll`](#enrolling-from-the-server--enroller) — a
forced **join**: the same `$`-dictionary selects who, the second argument names
the rooms. The two compose into a server-side "move": kick from the old room,
enroll into the new.

### Enumerating — connections and memberships

`channel.connections` and `space.memberships` are the enumeration namespaces —
the channel holds connections, the space holds memberships, the name follows the
entity. Each has **three floors**, because "which connections" is three
different questions:

| Floor          | Reads                               | Shape                              |
| -------------- | ----------------------------------- | ---------------------------------- |
| `server`       | the whole **cluster**, over the bus | `async` — a snapshot over a window |
| `server.local` | **this process** only               | synchronous, plain values          |
| `client`       | **this browser tab** only           | synchronous, the live facades      |

Naming the floor is mandatory — there is no bare `connections.count()`. And the
floors are side-locked: `.server.*` on the client and `.client.*` on the server
are runtime errors, never a silently empty answer.

**The `server` floor** — three reads over the live state everywhere in the
cluster. Targets are the same `$`-dictionary:

```tsx
await appChannel.connections.server.count({ $identity: { plan: 'free' } }) // → number
await chatSpace.memberships.server.count({ room: { chatId: '5' } }) // the presence counter

const list = await chatSpace.memberships.server.list({ room }, { timeout: 2000 })
// [{ connectionId, identity, rooms }, ...]

await chatSpace.memberships.server.forEach({ room }, {
  onMembership: async ({ connectionId, identity, rooms }) => { ... }, // per-member work
}) // → Promise<number> — how many were processed

for await (const m of chatSpace.memberships.server.forEach({ room })) { ... } // bare → AsyncIterable
```

**Every read on it is a snapshot over a window**: local connections answer
immediately, other processes answer over the backplane bus within `timeout` (ms,
default 1000) — whoever misses the window is not in the result. That's the
semantics of all six methods, once and for all.

- `count(target?, { timeout? })` — the cheap one: only **numbers** travel the
  bus, never the items.
- `list(target?, { timeout? })` — the merged array at window close. A channel
  item is `{ connectionId, identity, spaces }` (`spaces` = space name → parsed
  rooms); a space item is `{ connectionId, identity, rooms }`.
- `forEach(target?, options?)` — the streaming form: with the callback
  (`onConnection` / `onMembership` — named by the entity, like `onReply`) it
  processes items as they arrive and resolves with the processed count; bare, it
  is an async iterable. "Wait for all of them as an array" is `list` — `forEach`
  has no `waitForAll` on purpose.

Counts and lists are for showing numbers, not for deciding who gets in. A
snapshot tells you how things stood a moment ago, and two joins can land while
you act on it. A limit that must hold lives in your own database — the seat
recipe in [Self-referential callbacks](#self-referential-callbacks) shows both
versions.

**The `server.local` floor** is the sub-floor under it: this process's matching
slice only, straight off the room index. No bus, no gather window, no promise —
plain values:

```tsx
channel.connections.server.local.count(target?) // → number
channel.connections.server.local.list(target?) // → Array<{ connectionId, identity, spaces }>
space.memberships.server.local.count(target?) // → number
space.memberships.server.local.list(target?) // → Array<{ connectionId, identity, rooms }>
space.memberships.server.local.rooms(target?) // → Room[] — the flat, deduped room set the matches hold
```

Same `$`-dictionary targets and item shapes as the cluster floor. Use it in the
join path — `.joiner`, `.enroller`, the join guards, `.serverReply` — where the
socket lives on this very process, so the local slice is by construction the
**full truth** about the connection: a join guard caps rooms with
`space.memberships.server.local.rooms({ connectionId })`. Anywhere else it is
local only; for truth across every process use the async `count` / `list`.

**The `client` floor** is the browser's own picture: the live **facades** this
tab holds — the very objects `connect` / `useConnection` / `join` /
`useMembership` hand out, with their `status`, `rooms`, `input`, `disconnect` /
`leave`. Synchronous, hold-less (reading connects and joins nothing), and it
takes **no target** — a bare call is everything of that channel/space on this
client:

```tsx
appChannel.connections.client.count() // → number
appChannel.connections.client.list() // → ClientChannelConnection[]
chatSpace.memberships.client.count() // → number
chatSpace.memberships.client.list() // → ClientSpaceMembership[]
```

`memberships.client.list()` includes **enrolled** memberships — the ones
[`.enroller` or `space.enroll`](#enrolling-from-the-server--enroller) created
server-side with no join behind them. Nothing else reads those one at a time: an
enrollment has no join input, so `getMembership(input)` has nothing to look up.
On a space with no `.joiner` this is THE read — and since these are the real
facades, it is also where an enrollment is
[left](#enrolling-from-the-server--enroller): `membership.leave()` drops its
rooms until the next connection setup re-enrolls.

The lookups are the per-item twins — `getConnection(input)` /
`getMembership(input)` find the one that joined with that input, the `client`
floor gives you all of them. Across every point of a scope at once there is
[`getSocket()` / `useSocket()`](#client-helpers), which also lists
kicked-but-still-held connections (dormant until a remount); the `client` floor
is live ones only. A `local` sub-floor here would mean nothing: a browser tab IS
one process.

The **commands** stay directly on the point — `channel.kick(...)`,
`channel.refresh(...)`, `channel.amendIdentity(...)`, `space.enroll(...)`, never
under a floor. They are actions, not reads, and they are server-only, period.

Every read here is scoped to ONE point and answers a target. For the whole
**process** at once — every scope, channel and space it holds — the engine has
its own synchronous window,
[`engine.socket.local.get()` / `engine.socket.status()`](engine-config#server-side-socket-introspection):
per-process metrics, health checks, devtools.

### Self-referential callbacks

A callback may call its **own** point's server surface — a joiner that counts
its own space's memberships, say. The room comes from the opener, so the space's
type owes the callback nothing and the self-reference is just a value reference,
never TypeScript's "referenced in its own initializer":

```tsx
export const seatSpace = appChannel.lets
  .space<{ eventId: string }>()
  .input(z.object({ eventId: z.string() }))
  .joiner(async ({ input }) => {
    const seated = await seatSpace.memberships.server.count({
      room: { eventId: input.eventId },
    })
    if (seated >= 100) {
      return undefined // about full — a clean deny
    }
    return { eventId: input.eventId }
  })
  .space()
```

**Keep the self-reference out of the returned expression itself.** Above it
decides in a guard and the returns are plain room literals — that compiles. Fold
it into the return instead (`return seated < 100 ? { eventId } : undefined`) and
you are back to the ordinary circularity every `const` has: computing the
callback's return type needs `seatSpace`, whose type is still being computed
(`TS7024`). That one is not specific to points — it is the same reason a plain
`const x = f(() => x.y)` cannot type itself.

Note what this joiner promises: it caps the room's fanout at about a hundred —
one or two over is fine. The count is a snapshot over the bus, not a
transaction: two processes can both read 99 at the same moment and both admit.
For keeping a room reasonably sized that is exactly enough; for a hard limit it
is the wrong tool.

A hard limit — seat 101 must not exist — is a reservation in your **own
database**, made inside the joiner, where a transaction or a unique index can
refuse the extra insert. The joiner denies when the reservation fails, and a
server event frees the seat on every kind of leave:

```tsx
export const ticketSpace = appChannel.lets
  .space<{ eventId: string }>()
  .input(z.object({ eventId: z.string() }))
  .joiner(async ({ input, connectionId }) => {
    try {
      // one serializable transaction — the count and the insert commit
      // as one, so two racers cannot both see 99
      await prisma.$transaction(
        async (tx) => {
          const taken = await tx.seat.count({
            where: { eventId: input.eventId },
          })
          if (taken >= 100) throw new Error('full')
          await tx.seat.create({
            data: { eventId: input.eventId, connectionId },
          })
        },
        { isolationLevel: 'Serializable' },
      )
    } catch {
      return undefined // full, or lost the race — a clean deny either way
    }
    return { eventId: input.eventId }
  })
  // every leave lands here — `leave()`, a kick, a dead socket, a closed connection
  .serverOn(['pointSpaceLeaveServer'], async (event) => {
    const rooms = z
      .array(z.object({ eventId: z.string() }))
      .parse(event.data.rooms)
    await prisma.seat.deleteMany({
      where: {
        connectionId: event.data.connectionId,
        eventId: { in: rooms.map((room) => room.eventId) },
      },
    })
  })
  .space()
```

The count now lives where it can refuse: the transaction serializes the racers,
so the second one sees 100 and denies (a unique index on a seat number is the
same door in a single insert). `pointSpaceLeaveServer` fires for every way out —
the client's `leave()`, a `space.kick`, a dead socket — so a reservation never
outlives its membership.

The identity has no opener generic (a channel has one producer, its
`.connector`, and no self-reference problem), so `.connector<TIdentity>()` keeps
its optional explicit type argument for the same reason: reach for it when the
connector touches its own channel's `connections.*`.

### Where it's stored — the engine `server.backplane`

The connection identity is stored per connection (as
`{ scope, channel, identity }`), alongside the one-time connect tickets — and
not the memberships (the client replays its joins after a socket death, so the
store stays small; the one exception is a [resumable](#resumable-connections)
channel, whose record also carries the per-space rooms as the resume passport).
Default is server memory. To run several processes behind a load balancer (the
connect and the socket may hit different ones), plug a **socket backplane** into
the [engine config](engine-config). The options form a ladder — take the first
rung that fits: for plain Redis it is one line, a **URL string** (`'redis://…'`
/ `'rediss://…'` / `'valkey://…'`) served by Bun's built-in Redis client — one
connection for the KV and the publishes, a duplicate in subscriber mode for the
bus:

```ts
server: {
  socket: true,
  backplane: process.env.REDIS_URL, // 'redis://localhost:6379'
}
```

Next rung: the [ready-made adapters](#ready-made-adapters) below, for Postgres
and for a Redis client you already run. Last rung: [the contract](#the-contract)
— any KV + pub/sub you bring, as a plain object of functions.

### Ready-made adapters

For the clients you may already run there are **ready-made adapters** — subpath
exports of `@point0/engine`, each a factory that takes YOUR client and returns a
`Backplane`. They carry **no dependencies** (each is typed structurally against
the few methods it calls): install the client's package yourself, construct the
client, hand it over. Construct the client inside the **lazy factory** form —
the engine config module is also loaded by builds and codegen, where a database
connection has no business starting; the factory runs only on server start:

```ts
// Postgres — the stack that already has a database and no Redis. bun add postgres
import { postgresBackplane } from '@point0/engine/backplane/postgres'

server: {
  socket: true,
  backplane: async () => postgresBackplane((await import('@/lib/sql')).sql),
}
```

| Adapter                               | For                                                                                                       | Install    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| `@point0/engine/backplane/postgres`   | Postgres via [postgres.js](https://github.com/porsager/postgres) — real push, no Redis                    | `postgres` |
| `@point0/engine/backplane/ioredis`    | an ioredis client you already hold (BullMQ, Sentinel, custom TLS)                                         | `ioredis`  |
| `@point0/engine/backplane/node-redis` | a node-redis (`redis` package, v4/v5) client you already hold                                             | `redis`    |
| `@point0/engine/backplane/bun-redis`  | Bun's built-in client when it needs options a URL cannot carry — what the URL shortcut itself is built on | —          |

**`postgresBackplane(sql)`** turns the database you already have into the
backplane: the bus rides `LISTEN`/`NOTIFY` (millisecond push — postgres.js keeps
one dedicated listen connection, reconnects it with backoff and re-listens on
its own), the KV an **UNLOGGED** table with TTLs computed on the DATABASE clock.
Sharing the app's `sql` instance is fine — the KV rides the ordinary pool. Two
Postgres limits are absorbed for you: channel names (identifiers, capped at 63
bytes and silently truncated — long room topics would fold onto each other) are
hashed to `p0_<sha256-prefix>` on both sides, and a message over the ~8 KB
`NOTIFY` cap is spilled through a payload table and fetched on delivery, in
order. Both tables are created on first use; pass `createTables: false` and run
the SQL yourself when the app's DB role cannot create tables:

```sql
CREATE UNLOGGED TABLE IF NOT EXISTS point0_backplane_kv (
  key text PRIMARY KEY,
  value text NOT NULL,
  expires_at timestamptz
);
CREATE UNLOGGED TABLE IF NOT EXISTS point0_backplane_payload (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

The one requirement: a **direct connection**. `LISTEN` does not work through a
transaction-mode pooler (PgBouncer, Supabase's Supavisor, Neon's pooler) — point
the backplane at the direct URL; on hosts that connect you directly (Railway,
plain VMs) there is nothing to do.

**The Redis adapters** map the client 1:1 (`GET` / `SET PX` / `DEL` / `GETDEL` /
`PUBLISH` / `SUBSCRIBE`) and need Redis >= 6.2 (`GETDEL`). A Redis connection in
subscriber mode cannot run regular commands, so each adapter lazily
`duplicate()`s the client for the bus on first subscribe (or takes yours via the
`subscriber` option). Reconnect durability is covered per client: ioredis
re-subscribes on its own (`autoResubscribe`, on by default — keep it on),
node-redis and Bun's client are wrapped in a registry that replays every
subscription after a reconnect.

```ts
import { ioredisBackplane } from '@point0/engine/backplane/ioredis'

server: {
  socket: true,
  backplane: async () => ioredisBackplane((await import('@/lib/redis')).redis),
}
```

Every adapter follows one **ownership rule**: on engine dispose it closes what
it created itself (the duplicated subscriber, its listens, its timers) and never
the client you passed in. When the client exists solely for the backplane —
constructed inline in the factory — pass `closeClient: true` and the adapter
closes it too:

```ts
import { bunRedisBackplane } from '@point0/engine/backplane/bun-redis'

server: {
  socket: true,
  backplane: () => bunRedisBackplane(new Bun.RedisClient(url, { tls: { … } }), { closeClient: true }),
}
```

### The contract

The interface is Redis-shaped on purpose: a string KV with a per-key TTL plus
channel **pub/sub**. A node-redis client maps onto it 1:1 — `GET` / `SET PX` /
`DEL`, and `PUBLISH` / `SUBSCRIBE` on the channel it is handed. point0 owns the
channel names and passes each one as an argument (they all live under
`point0:socket:*`) — your implementation just routes what it is given and knows
nothing about `point0:*`, exactly like the KV side where keys already arrive
ready-made. The five functions carry everything the sockets need across
processes: the stored records, room and channel pushes, collected replies, the
`kick` / `refresh` / `amendIdentity` commands, and the enumerations.

```ts
// engine config — the backplane is a Redis-shaped KV + channel pub/sub
server: {
  backplane: {
    get: (key) => redis.get(key),
    set: async (key, value, ttlMs) => {
      if (ttlMs === undefined) await redis.set(key, value)
      else await redis.set(key, value, { PX: ttlMs })
    },
    delete: async (key) => {
      await redis.del(key)
    },
    // the channel name arrives ready-made — just route it; point0 owns `point0:*`
    publish: (channel, message) => sub.publisher.publish(channel, message),
    subscribe: (channel, onMessage) => {
      void sub.subscriber.subscribe(channel, onMessage)
    },
    // optional sixth — read-and-delete in one atomic step (Redis GETDEL)
    getDelete: (key) => redis.getDel(key),
  },
}
```

The bus is **sharded by topic** — traffic goes where it is needed instead of
everywhere. A push addressed to exact rooms is published on each room's own
channel, and only the processes currently holding a member of that room are
subscribed to it: the first local member subscribes, the last one out
unsubscribes after a short linger. Space-wide and channel-wide pushes ride a
per-space / per-channel topic the same way. The rare admin commands and the
`$identity` / `$room` selections ride one shared channel every process
subscribes, and answers — collected replies, count/list responses — go straight
to the asking process's own inbox channel. Every message still carries its full
target and each process filters locally, so an implementation that ignores
unsubscribes (or broadcasts everything to everyone) stays correct — it just pays
more traffic. The payoff: a node's incoming stream scales with its own users,
not with the size of the cluster.

**Redis Cluster.** In a clustered Redis, ordinary pub/sub broadcasts every
message to every node of the cluster regardless of who subscribed where — which
un-shards the bus at the Redis tier. Point the backplane at a single
(non-cluster) pub/sub Redis, or build a custom `Backplane` on sharded pub/sub
(`SSUBSCRIBE` / `SPUBLISH`, Redis 7+); the built-in `redis://…` shortcut speaks
ordinary pub/sub.

`subscribe` is not one-and-done. The engine subscribes and unsubscribes channels
throughout the server's lifetime — one per room its connections are in, plus the
shared and inbox channels — and it can call the unsubscribe a `subscribe`
returned once it is done with a channel. Returning nothing instead of an
unsubscribe is legal too — that implementation just keeps receiving traffic for
channels the engine wanted to leave, which costs bandwidth, not correctness. One
duty is yours: a settled `subscribe` is durable until point0 unsubscribes it, so
if your transport drops and reconnects, your implementation must restore its own
subscriptions — point0 cannot see the drop and will not re-subscribe. The
`redis://…` shortcut and the [ready-made adapters](#ready-made-adapters) do this
for you.

There is an **optional sixth**, `getDelete(key)` — read a key and delete it in
one atomic step (Redis `GETDEL`). Implement it and a connect ticket is claimed
atomically across processes: two processes racing the same ticket, exactly one
wins, because the read IS the delete. Leave it out and point0 falls back to
`get` + `delete`, which is a window two processes can both step into (one
process is always safe — an in-process guard holds a ticket while its claim is
mid-flight). The in-memory default, the `redis://…` URL shortcut and every
ready-made adapter implement it.

And an **optional seventh**, `dispose()` — release what the backplane itself
OWNS (a duplicated subscriber connection, a listen connection, timers). The
engine calls it when it is disposed. Close only what your implementation
created, never a client the app passed in — the app owns that lifecycle. A dev
server disposes and re-resolves the backplane across hot restarts: the factory
form returns a fresh adapter per call, so per-generation dispose is clean, while
an adapter OBJECT passed directly is re-resolved as the SAME object — give it a
dispose it can survive, or none.

Keys and values are always **strings** — the point's transformer already did the
serializing. Every record carries a **TTL**: connect tickets live 30 s,
connection records live `connectionTtl` (a channel option, default 90 s) and the
client ping slides that window forward — so a process dying between the connect
and the claim leaves nothing behind. `delete` is the fast path connections and
claimed tickets leave by; the TTL is the backstop. Anything with a KV and a
broadcast fits these functions — the ready-made
[postgres adapter](#ready-made-adapters) is exactly that shape (an unlogged KV
table + `LISTEN`/`NOTIFY`, with a `DELETE … RETURNING` for the sixth), no Redis
needed.

## Connections and memberships on the client

A connection is query-shaped — a connect is a request with an answer:

```tsx
const connection = appChannel.useConnection()
connection.status // 'connecting' | 'open' | 'error' | 'closed'
connection.error // typed, when the connector threw
connection.isLoading // status === 'connecting'
connection.input // what this connection connected with
connection.id // the connection id (undefined until the connect response arrives)
connection.connectionIndex // successful connects so far — > 1 means it reconnected
connection.disconnect() // release this hold
```

There is no `connection.data` and no `connection.room` — the connector returns
identity (server-side only), rooms come from memberships. Hooks are not the only
way in — the same surface exists imperatively (`connect` / `join`), and holds
are counted wherever they come from: every `useConnection` / `<Connection>` /
`connect()` with an equal input shares one connection; the real connection
closes when the last hold is gone, after `linger`. Memberships hold the same
way. On a no-input channel or space, `undefined` and `{}` are the same input —
pass either (or nothing), everything normalizes to `{}` and shares one hold.

```tsx
<appChannel.Connection>
  <Router />{' '}
  {/* the app runs inside; every space membership rides this connection */}
</appChannel.Connection>
```

`<Connection>` renders through the same mountable interpreter as `Layout` /
`Provider`: the chain's mount actions run, so the inherited `.with(...)`
wrappers from root/base wrap the children, and the nearest `.loading()` up the
channel's chain renders while connecting (during [SSR](ssr) too — nothing
connects there), a failed connect renders the nearest `.error()`, and once open
the children render. `<space.Membership>` does the same for a join — but a space
opened from its channel inherits only the meta subset, so root/base `.with(...)`
injections reach `<Connection>`, not `<Membership>` (`.wrapper()` elements apply
to both). The **`gate`** prop
(`boolean | { loading?: boolean; error?: boolean }`) controls the gating: by
default only errors gate (`{ loading: false, error: true }`), so the children
render while connecting (progressive enhancement) but a failed connect renders
the nearest `.error()`. Pass `gate={false}` to opt out entirely — the children
render immediately through everything and the handlers inside wait on their own;
`gate` / `gate={true}` waits on the connect too. The object form overrides only
the named aspects — an unnamed key keeps its default, so
`gate={{ loading: true }}` waits on the connect AND keeps surfacing errors;
hiding errors takes an explicit `error: false`.

Both take an **`options`** prop — the same options as `useConnection` /
`useMembership` (`reconnect`, the lifecycle callbacks, `enabled`, …) — applied
to the hold this mount opens. And both take **`LoadingComponent`** /
**`ErrorComponent`** — on-the-spot overrides of the gate's loading/error render
for THAT mount: passed here they win over the nearest `.loading()` / `.error()`
up the chain.

```tsx
<appChannel.Connection
  options={{ reconnect: { retries: 3 } }}
  LoadingComponent={Spinner}
  ErrorComponent={ConnectFailed}
>
  <Router />
</appChannel.Connection>
```

The WebSocket itself is lazy; the socket floor of the client surface lives in
`@point0/core/socket`:

- `getSocket()` — a read-only snapshot of the whole vertical:
  `{ status, connections, memberships }` (the transport
  `'idle' | 'connecting' | 'open' | 'closed'` plus every live connection and
  membership facade). The seed of any monitoring/devtools view.
- `useSocket({ hold? })` — the same shape as a live React value, re-rendering on
  every socket, connection, or membership move. `hold: true` also keeps the
  socket open while mounted; default `false` — a bare `useSocket()` only reads.
- `<Socket>` — the keeper component: holds the socket open while mounted
  (instant first message), `hold` defaults to `true` here (holding is its whole
  job; `hold: false` releases). A keeper, not a provider: it provides no context
  and gates nothing, so its position in the tree carries no meaning.

One vocabulary across the vertical: hooks and components HOLD sockets,
connections, and memberships — the last hold gone releases the thing after its
linger.

During [SSR](ssr) nothing connects — `useConnection` / `useMembership` report
the in-flight status on the server and do the real work after mount.

### On pages and components — `.with(channel)` and `.with(space)`

A page, layout, or component can hold a connection or a membership
declaratively, the way it holds a [query](with):

```tsx
export const ChatPage = root.lets
  .page('chatPage', '/chats/:chatId')
  .with(appChannel) // the connection lands in `connections`
  .with(chatSpace, ({ params }) => ({ chatId: params.chatId })) // the membership lands in `memberships`
  .page(({ connections, memberships }) => {
    const [connection] = connections
    const [membership] = memberships // typed: rooms, status, …
    return <Chat rooms={membership.rooms} />
  })
```

`.with(channel, input?, opts?, gate?)` holds a connection for the mountable and
lands it in **`connections`** next to `queries`;
`.with(space, input, opts?, gate?)` holds a membership and lands it in
**`memberships`** (it needs the space's channel connection held in the same
chain — a `.with(channel)` earlier, or an ambient one). By default only errors
gate (`{ loading: false, error: true }`) — a socket is progressive enhancement,
so the page shows while it connects, but a failed connect renders the HOSTING
point's own `.error()`. Pass a trailing `gate` / `gate: true` — the same
position a query injection's `resolve` gates with — to wait on
connecting/joining too: the host's own `.loading()` / `.error()` render (during
SSR too). The object form overrides only the named aspects (an unnamed key keeps
its default); `gate: false` renders through everything. Whatever the gate, the
injected facade type stays indeterminate — a connection carries no data and its
status can flip on a reconnect at any moment, so `gate` gates the render, never
the type. Both flow into with-fns and `.mapper()` like queries.

`.with(...)` is available on channel and space chains themselves too, not only
on mountables — a channel or a space takes chain wrappers the way every other
point does, and they compose in the usual order.

Outside hooks, `getConnection(input?)` /
`getMembership(membershipInput, channelInput?)` look the live one up — no hold,
no connect. Both throw when nothing matches; the `*OrUndefined` twins probe. On
the server they throw (strict) or return `undefined` (probing) — nothing is ever
connected there.

### Client helpers

Two module-level helpers from `@point0/core/socket` reset every connection at
once — the client side of a login/logout:

```tsx
import { reconnectAll, disconnectAll } from '@point0/core/socket'

onLogin(() => reconnectAll()) // re-run every connect (identities rebuilt), re-join spaces, revive kicked-but-held ones
onLogout(() => disconnectAll()) // close everything now — the connectors re-judge whatever comes back
```

`reconnectAll()` is the client counterpart of the server's `refresh`; it also
clears every `preventRetry` "sit out" mark — an explicit re-evaluation.
`disconnectAll()` closes everything immediately; connections held by hooks and
components then re-establish on their own (their nature is "stay connected while
mounted"), which is exactly right on a logout — the connectors re-run against
the cleared session and answer with the typed deny (ideally `preventRetry`), so
the UI lands in the honest `error` state. Imperative `connect()` holders stay
closed until their owner acts.

### Reconnect

The socket reconnects on its own — the first retry immediately, then with
backoff (`reconnect` options above). A drop nobody reported counts as one too:
the client measures the socket against its own `ping`, and two pings answered by
nothing at all — no pong, no push, no reply — plus more than two intervals of
silence is a half-open connection (a NAT timeout, a machine that slept), so the
client closes it locally and reconnects instead of writing pushes into a dead
pipe. That is the client's half of the same contract the engine's 120 s
`idleTimeout` keeps on the server side; `ping: 0` switches off the client's half
— the pings and the deadline they arm (the server's `idleTimeout` stands, so a
silent client is still dropped there).

Every held connection re-runs its connect (the connector re-applies the check,
the identity is rebuilt), and every held membership re-joins on the fresh
connection — the client remembers its inputs. A connect the connector **denies**
(a typed error) goes `error` and stops retrying — and a deny thrown with
[`preventRetry`](error-handling#preventretry) additionally sits the connection
out of future reconnect cycles until `reconnectAll()` or a remount; the same
flag on a joiner deny stops the join from replaying. A client `.sendToServer`
during the gap waits in a queue up to the handler's `timeout` (default 5000 ms);
handlers that shouldn't wait (typing pings) opt out with `queue: false`. The
queue never outlives an answer: a connect or join DENIED by the server fails the
sends waiting on it immediately with that typed error — only a transport failure
(which the reconnect policy keeps retrying) leaves them queued until their
window runs out.

Pushes the server sent during the gap are gone on this path — there is no
server-side buffer here (the contract is [Delivery](#delivery) below; a
[resumable](#resumable-connections) channel adds an opt-in one). Catching up is
a refetch, and the lifecycle callbacks are where it lives. Both levels have a
full set, point-level or per call: a connection takes `onConnect` /
`onDisconnect` / `onError`, a membership takes `onEnter` / `onLeave` (an
[enrolled](#enrolling-from-the-server--enroller) membership is outside this: no
`onEnter` fires for it, and only an explicit `leave()` fires its `onLeave`).
`onConnect` and `onEnter` fire on **every** successful connect/join — the first
and the replays alike — and each callback receives the facade plus three facts
about the entry: the counter (`connectionIndex` / `membershipIndex` — how many
successful connects/joins came BEFORE this one), `resumed` (this entry rode the
[resume path](#resumable-connections) — the connector/joiners were skipped;
always `false` on a non-resumable channel), and `gapless` — **provably nothing
was missed**: `true` on the first entry and on a resume whose buffers covered
the whole gap, `false` on every other re-entry. Each callback's `gapless` speaks
for exactly the data that reaches IT: `onEnter`'s verdict covers that
membership's rooms (and its space-wide pushes), `onConnect`'s the channel-wide
and connection-addressed pushes — so a gap in one busy chat never forces the
quiet ones (or the global data) to refetch. Each fact answers its own question:
"did I miss anything HERE?" → `gapless`; "did the connector re-run?" →
`resumed`; "is this the first time?" → the index. The catch-up is therefore ONE
condition, on both levels:

```tsx
chatSpace.useMembership(
  { chatId },
  {
    onEnter: ({ gapless }) => {
      if (!gapless) void chatMessagesQuery.invalidateQuery({ chatId })
    },
  },
)
// channel-wide catch-up rides the connection instead:
appChannel.useConnection(undefined, {
  onConnect: ({ gapless }) => {
    if (!gapless) void notificationsQuery.invalidateQuery()
  },
})
```

On a plain channel `gapless` is simply `index === 0` — the condition reads "is
this a re-entry?" there — and on a resumable channel it stops refetching exactly
when the buffer proves the refetch redundant.

### Resumable connections

`resumable: true` on the channel makes a reconnect CHEAP: instead of re-running
the connect request (connector), the joins (joiners) and the enrollments
(enrollers), the client presents a per-connection **resume key** and the server
restores the connection — identity, rooms, subscriptions — from what it already
knows. A redeploy then costs the server a couple of KV reads per client instead
of a thundering herd of full connects:

```tsx
export const appChannel = root.lets
  .channel()
  .input(z.object({ deviceId: z.string() }))
  .connector(async ({ ctx }) => ({ userId: ctx.me.user.id }))
  .channel({
    resumable: true,
    server: { connectionTtl: 300_000 }, // the restore window IS the record's life
  })
```

Nothing changes in the client API — everything is automatic. The key arrives
once with the connect confirmation and lives in the tab's memory (never in
`localStorage` — a page reload is an honest full connect); the connection record
every ping already renews becomes the **passport**: it carries the per-space
rooms and the SHA-256 of the key (never the key itself — a leaked backplane
mints no working credentials). The restore window is `connectionTtl` — there is
no second knob: a live connection renews the record anyway, and a dead one
leaves exactly the record behind.

What a resume restores and what it never bypasses:

- **`connectionId` survives the drop** — addressed pushes keep their addressee
  across a blip (a full reconnect mints a new cid).
- **Enrolled memberships** restore with the passport like joined rooms — the
  enroller does not re-run.
- A server **`refresh` bypasses resume** — it exists to re-run the connectors,
  and it voids the key; the fresh connect mints a new one. A **kick** and a
  voluntary close delete the record, so the later resume is refused and the full
  connect puts the connector back in charge — **revocation is never resumable**.
  A refused resume falls back to the ordinary full connect of that one
  connection, automatically.
- A space can opt OUT with `resumable: false` (a top-level space option): its
  rooms stay out of the passport and out of the restore — the client re-joins
  them itself from its own state (the joiner re-judges). For spaces whose rooms
  change many times a second (live-query-style rooms derived from client state),
  the passport write-through would hammer the backplane for rooms the client
  re-derives anyway.

**The buffer.** Restoring the connection does not by itself restore the frames
pushed into the gap. A clientHandler opts its pushes in with its own top-level
`resumable` (`true` = the default ceiling of 128, a number = up to that many of
its frames buffered per stream); the object form adds the replay POLICY next to
the ceiling:

```tsx
export const messageReceivedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(messageSchema)
  .clientHandler({ resumable: 128 })

// deltas are only valuable as a COMPLETE sequence — withhold the partial tail of a gappy recovery
export const docPatchHandler = docSpace.lets
  .clientHandler()
  .serverSend(patchSchema)
  .clientHandler({ resumable: { buffer: 256, replay: 'gapless' } })
```

`replay: 'gapless'` (default `'always'`) makes the server SKIP this handler's
frames when replaying a stream whose recovery is not provably gapless: the
client sees the honest `gapless: false` in `onEnter`/`onConnect` and refetches,
without a partial tail arriving first. The withheld frames are not thrown away —
they stay in the stream's log, and a later resume that IS provably clean from
the client's cursor delivers them in full. Channel-wide, the policy is one chain
line: `.clientHandlerOptions({ resumable: { replay: 'gapless' } })`.

For a per-listener decision instead of a per-handler declaration, every
delivered message carries `replayed` in its props — `false` on a live push,
`{ gapless }` on a replayed one (its OWN stream's verdict):

```tsx
messageReceivedHandler(chatMembership).onMessageFromServer(
  ({ message, replayed }) => {
    if (replayed && !replayed.gapless) return // the refetch below covers it
    appendMessage(message) // dedup by id — a replay may overlap the refetch
  },
)
```

The buffers live on **topic streams** — one per room, one per space, one
channel-wide, plus a personal stream for connection-addressed pushes: one copy
of every frame however many members subscribe, and every frame numbered per
stream. On a resume the client presents its per-stream cursors and the server
replays everything after them — all the streams merged back into ONE tail in the
original delivery order, through the ordinary dispatch. `gapless` is then a
**proof, not a guess**, and a PER-STREAM one: a stream's verdict is `true` only
when its log covered that stream's whole gap and no non-opted handler pushed
past the cursor — which is what makes the per-level verdicts above precise
instead of one smeared bit. The buffers live in process memory: a same-process
blip replays (`gapless: true`), a redeploy resumes without them
(`gapless: false` — the one-condition catch-up above refetches), which is
exactly why the truth stays in queries. The ceilings are the channel's
`server.resume` group — `streamMaxFrames` (1024) and `streamMaxBytes` (4 MiB)
per stream, a space overriding them for its own streams — and an overflow evicts
oldest-first while honestly flipping the affected stream's `gapless`.

When the socket of a buffering connection dies, the server **parks** it for the
`server.resume.parkWindow` (default 30 s): publicly the connection is dead at
once — the leave and close events fire, presence counts drop, enumerations skip
it — but its streams stay addressed, so every push that concerns it — its rooms,
its cid, a matching `$identity`/`$room` selection — keeps landing in them, and a
client that returns within the window misses nothing. The park itself buffers
nothing (the streams are the buffer — a parked member costs a room push zero
extra work). Past the window the connection leaves the streams; the record lives
on to its own TTL, so a later resume still works, just without the replay. A
kick reaches into the park too: `channel.kick` sweeps matching parked
connections and deletes their records, and a
[`space.kick`](#kicking-from-rooms--spacekick) removes the kicked rooms from
parked connections and their passports — the returning client receives the
forced leave right after the resume.

One price, deliberate: the identity a resume restores is as old as the record —
the freeze is bounded by `connectionTtl`, and the admin answer is `kick`
(instant) or `refresh` (soft), both of which force the full path. Delivery costs
nothing extra: room, space-wide and channel-wide pushes ride the same
one-publish fan-out as a plain channel's, buffered once per stream — however
many members, whatever their parked state. The config cannot lie about itself: a
buffering handler on a non-resumable channel, or on a handler of a
`resumable: false` space, fails at the closer — as do `resumable: false` on a
space of a non-resumable channel (nothing to opt out of) and `.enroller` on an
opted-out space (a resume would silently drop the enrollments, which only re-run
on a full connect).

Security, in three facts: the KV stores only the key's hash (compared in
constant time), a wrong key and an unknown cid are refused identically (no
oracle), and a resume against a LIVE connection is the **takeover** — the main
scenario, not an edge: the client notices a dead network first (its ping
deadline beats the server's `idleTimeout`), dials anew, and the server moves the
connection to the new socket, closing the zombie one. Exporting the key to
another tab is the documented "don't": two tabs with one cid steal the
connection from each other, last wins.

## Delivery

A push is **best-effort, at-most-once**: point0 writes one frame into a live
socket and moves on. There are no acknowledgements and no retries. If the socket
is gone at that instant — a reconnect gap, a redeploy, a closed tab — the frame
is dropped, and no later reconnect replays it. The one bounded exception is
opt-in: a [resumable](#resumable-connections) channel's opted-in handlers keep
short in-memory stream logs for a resume to drain — and even there the per-level
`gapless` flags tell the client honestly whether the logs covered its gap, so
the refetch below stays the ground truth.

What does not happen is a live connection quietly missing pushes. A client too
slow to read what the server writes loses its **socket**, not its frames — see
[outbound backpressure](engine-config#outbound-backpressure) — so a gap always
surfaces as a disconnect, which is what the reconnect catch-up below is for.

That is deliberate, because **the truth lives in queries, not in pushes**. A
push is a _signal_ — "something moved, look again" — and never carries the only
copy of a piece of data. The durable copy is in the database, read through a
[query](query); the push just tells the client the query is stale. So catching
up after any gap is a [catch-up refetch](#reconnect), not a frame replay — which
is exactly why a dropped push costs nothing.

**Stream with history.** When you want a client to render a stream and survive
reconnects without losing entries, keep the stream in the database with a cursor
and let pushes advance the tail. The client refetches from its last cursor on
mount and on reconnect; each push carries the new tail (or just a "refetch"
nudge). This is a few lines of your own code, not framework configuration:

```tsx
// events persist with a monotonic cursor; the query reads "everything after `cursor`"
export const feedSinceHandler = feedSpace.lets
  .serverHandler()
  .clientSend(z.object({ after: z.string() }))
  .serverReply(async ({ input, room }) => ({
    events: await db.event.findMany({
      where: { room: room.feedId, id: { gt: input.after } },
    }),
  }))
  .query()
  .serverHandler()

// a bare trigger — no payload; the server fires it on each new event
export const feedBumpedHandler = feedSpace.lets.clientHandler().clientHandler()

// a push signals the new tail; the client refetches from the cursor it holds
export const FeedView = ({
  feedId,
  cursor,
}: {
  feedId: string
  cursor: string
}) => {
  const { data } = feedSinceHandler.useSocketQuery({ after: cursor })
  feedBumpedHandler.useOnMessageFromServer(() =>
    feedSinceHandler.invalidateSocketQuery(true),
  )
  return <Feed events={data?.events ?? []} />
}
```

The socket lost a push mid-gap? The refetch from `cursor` returns every event
the database has, dropped frames included. History is the query's job; the push
only shortens the latency.

**Redeploys** need no special handling for the same reason. On a rolling deploy
the sockets drop; each client reconnects with backoff and re-runs its connect
request, so the connector re-runs — a full **re-authentication** — and its
memberships replay their joins while enrollers re-enroll on the fresh
connection. Work in flight fails cleanly: an in-flight `sendToServer` fails by
its own typed send timeout, and every connection / ticket record left in the
[socket backplane](#where-its-stored--the-engine-serverbackplane) expires on its
TTL. Nothing leaks across the restart, and the client is whole again after one
reconnect. A [resumable](#resumable-connections) channel makes that reconnect
cheap at scale: the fresh process restores each client from its record instead
of running the whole connect cascade — same outcome, a fraction of the load.

## Observability

Everything you need for metrics is synchronous reads and events — nothing has to
be sampled from inside the machinery.

**The process floor** is `engine.socket`
([the full field reference — engine-config](engine-config#server-side-socket-introspection)):
`local.get()` answers connections, sockets, rooms, parked resumable connections
and the resume-stream buffers of THIS process; `status()` answers the backplane
health. A metrics endpoint is one action point:

```ts
import { engine } from '../engine.js'

export const metricsAction = root
  .lets('action', 'metrics', 'GET', '/metrics')
  .action(async () => {
    const local = engine.socket.local.get()
    const service = engine.socket.status()
    return new Response(
      [
        `point0_socket_connections ${local.connections.length}`,
        `point0_socket_sockets ${local.socketsCount}`,
        `point0_socket_rooms ${local.roomsCount}`,
        `point0_socket_parked ${local.parkedCount}`,
        `point0_socket_stream_frames ${local.streams.frames}`,
        `point0_socket_stream_bytes ${local.streams.bytes}`,
        `point0_socket_stream_evicted_total ${local.streams.evictedFramesTotal}`,
        `point0_socket_bus_up ${service.started ? 1 : 0}`,
        `point0_socket_bus_subscriptions ${service.busSubscriptions}`,
      ].join('\n'),
      { headers: { 'Content-Type': 'text/plain; version=0.0.4' } },
    )
  })
```

Scrape it per process — the snapshot is deliberately the LOCAL floor, so a
cluster's dashboards sum the processes (which is what you want: per-process
memory and per-process buffers are what pages an operator).

**Cluster-wide gauges live on the points**, not on the engine:
`appChannel.connections.server.count()` and
`chatSpace.memberships.server.count({ room })` scatter-gather over the backplane
bus — use them for product-level numbers ("users online", "listeners in this
room"), not for scrape loops (each call is a bus round trip with a gather
window).

**Event-driven counters** ride the [server events](#the-events): count
`pointChannelOpenServer` / `pointChannelCloseServer` for connect/disconnect
rates, the `pointSpaceJoinServer*` / `pointSpaceLeaveServer` families for room
churn — every handler gets the identity and the connection id, so per-tenant
breakdowns are one field away.

**What to alert on**: `streams.bytes` approaching your
`server.resume.streamMaxBytes` budgets and a growing
`streams.evictedFramesTotal` — evictions mean the buffers are smaller than the
traffic and resumes are degrading into honest `gapless: false` refetches (raise
the ceilings or trim the buffering handlers); a persistently high `parkedCount`
— clients are dying faster than they resume; `bus_up` at `0` — the backplane
subscription is down and cross-process delivery is degraded.

## The events

Every socket operation emits the framework's lifecycle [events](events) —
subscribe with `.on` / `.serverOn` / `.clientOn` on any point up the chain, the
usual machinery. The four-phase families are **split by side** — the two sides
are genuinely different operations with different data, not one event observed
twice: the `Server` family fires around the server execution (the connector, the
`.joiner`, `.serverReply`) and its data carries the connection `identity`; the
`Client` family fires around the client operation (the connect request, the join
frame, a clientHandler dispatch) and has no identity field at all — the identity
never leaves the server. Besides the families, the server-only singles
(`pointChannelOpenServer` / `pointChannelCloseServer` / `pointSpaceLeaveServer`)
carry the full `identity` too; the four-phase server events carry the bare
`connectionId` (a connect family's `Start` has none yet — no connection exists
there — and a failed connect's `Settled` / `Error` carry it `undefined`).

| Event                                                | When it fires                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pointChannelConnectServer*`                         | four phases around the connector run — before the claim                                              |
| `pointChannelConnectClient*`                         | four phases around the connect request                                                               |
| `pointChannelOpenServer` / `pointChannelCloseServer` | server-only singles — a connection became live / went away                                           |
| `pointSpaceJoinServer*`                              | four phases around each `.joiner` / `.enroller` run                                                  |
| `pointSpaceJoinClient*`                              | four phases around the join frame                                                                    |
| `pointSpaceLeaveServer`                              | server-only single — a membership left its rooms                                                     |
| `pointHandlerServer*`                                | four phases around a `.serverReply` run                                                              |
| `pointHandlerClient*`                                | four phases around a clientHandler dispatch                                                          |
| `socketServer*` / `socketClient*`                    | socket-level singles — the upgrade, a socket arriving / leaving, the one WebSocket opening / closing |

Four phases means `Start`, `Settled`, `Success`, `Error` — the standard
[lifecycle phases](events#lifecycle-phases); what each event's `data` carries is
enumerated in the [per-event reference](events#per-event-data).

### Connect vs open — the claim is the watershed

`pointChannelOpenServer` / `pointChannelCloseServer` are per-connection singles,
**server only**: a channel connection actually became live (its ticket was
claimed, or its cold-start upgrade landed) or went away. They're distinct from
the four-phase `pointChannelConnectServer*` family, which fires at connector
time — _before_ the claim — so a connect success is not yet a live connection.
`pointChannelOpenServer` carries `resumed`: `true` when the connection came back
through a [resume revival](#resumable-connections) (an unpark or a KV restore —
no connector ran for that open), `false` on a real claim.
`pointChannelCloseServer` carries a `reason`: `'close'` (the client left),
`'socket'` (the socket died), or `'kick'` (a server-side `channel.kick`).

### The join family straddles the registration

`pointSpaceLeaveServer` is the space counterpart of `pointChannelCloseServer` —
a per-membership single, **server only**: a client left a space's rooms. Its
four-phase siblings `pointSpaceJoinServer*` / `pointSpaceJoinClient*` fire
around the join (the `.joiner` on the server, the join frame on the client) —
the server family also fires around each `.enroller` run, with an empty input:
an enrollment is a server-initiated join. On the server the two ends of the
family straddle the registration: `Start` fires before the `.joiner` /
`.enroller` runs, while `Settled` / `Success` fire **after** the rooms are
registered — so a handler on `pointSpaceJoinServerSuccess` reading
`space.memberships.server.list({ room })` already sees the joiner (that is the
[presence](#presence) recipe), symmetrically with `pointSpaceLeaveServer`, which
fires after the removal. A join the server refuses after the joiner ran (the
socket died mid-join, the rooms would pass `maxRooms`) closes the family with
`Settled` / `Error` instead — only a join that landed announces a `Success`.
`Success` carries the `rooms` the client entered (`[]` = a clean deny). The
**server** family's `Start`, `Success`, and `Settled`'s success side also carry
`resumed`: a resume revival re-announces the restored rooms through the family
(`Start` included, with an empty input, like an enrollment) flagged `true` — no
joiner or enroller ran for it; a real join, enrollment, or `space.enroll`
carries `false`, and the error variants carry no `resumed` at all (a refused
resume never reaches the family). `pointSpaceLeaveServer` carries a `reason`:
`'leave'` (the client left), `'socket'` (the socket died), `'kick'` (a
`space.kick`), or `'close'` (the whole connection closed).

### The client families carry the counters and markers

The client socket families carry the **lifecycle counters and entry markers** —
the same values the `onConnect` / `onEnter` [callback props](#reconnect) read.
Every phase of `pointChannelConnectClient*` carries `connectionIndex` and every
phase of `pointSpaceJoinClient*` carries `membershipIndex` (successful entries
before this operation — `0` = the first, `> 0` = a re-connect / a replay; a
reconnect is the next `Start` with an index `> 0`, not a separate event). The
successful outcome — `Success` and the success side of `Settled` — additionally
carries `resumed` (the entry rode the [resume path](#resumable-connections): no
connect request / join frame, no connector / joiner run) and `gapless` (the
server's proof that nothing was missed BY THIS LEVEL — the connect family's bit
covers the channel-wide and connection-addressed pushes, each join family's its
own membership's rooms: `true` on the first entry and on a fully-covered
resume). A landed resume closes each family with `Settled` → `Success` and
**no** `Start` — the resume is one shared frame at the socket's open, not a
per-connection client operation, and a refused resume falls back into the full
connect / join whose family runs the complete cycle. The error phases carry the
index but no markers — a failed operation has no entry to describe.

### The socket singles

The `socket*` events (`socketServerUpgrade` / `socketServerConnect` /
`socketServerDisconnect` / `socketClientConnect` / `socketClientDisconnect`) are
socket-level singles, not four-phase families, split by side the same way: the
server family is the bare `websocket` endpoint accepting an upgrade through the
fetch pipeline (`socketServerUpgrade`) and a socket landing on / leaving the
process; the client family is the one WebSocket opening and closing.
`socketClientConnect` fires on every successful open — the first and the
re-opens alike, there is no separate reconnect event (the emit rides a channel
point of the scope, so a socket held with zero connections opens silently) — and
its data carries `socketIndex` (`0` = the first open, `> 0` = a reopen), the
same first-vs-repeat convention as the lifecycle callbacks' indexes.

## Recipes

Ways to put the pieces together — nothing here is required.

### Live query

When a page already loads its data through a [query](query), a room push can
write into that query's data — the page re-renders through the `useQuery` it
already has, and the pushed data survives the component unmounting:

```tsx
export const messageReceivedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(messageSchema)
  .clientHandler({
    client: {
      onMessageFromServer: ({ message }) => {
        chatMessagesQuery.setQueryData({ chatId: message.chatId }, (old) => ({
          messages: [...(old?.messages ?? []), message],
        }))
      },
    },
  })
```

### User space — hot personal pushes

For per-user pushes, a **user space** whose `.enroller` puts each connection
into its own room is the hot path: the server enrolls at connect time, the
client joins nothing, and the push addresses the room by name (a pub/sub topic),
no scan. Reach for the `$identity` matcher only for rare admin fan-outs:

```tsx
export const userSpace = appChannel.lets
  .space<{ userId: string }>()
  .enroller(({ identity }) => ({ userId: identity.userId })) // your own room, no client code
  .space() // no .joiner: only the server puts anyone in here

export const notificationHandler = userSpace.lets
  .clientHandler()
  .serverSend(notificationSchema)
  .clientHandler({
    client: { onMessageFromServer: ({ message }) => notify(message) },
  })

// anywhere on the server — a direct topic push, no scan
void notificationHandler.sendToClient(notification, { room: { userId } })
```

### Global space vs channel handlers

A roomless message — an app-wide announce, an RPC-style `markAllRead`, a
connection-level query — grows straight from the **channel**: its handlers
address connections (bare / `connectionId` / `$identity`), no room ceremony.
When you want join-semantics for a broadcast instead (an explicit membership
everyone holds), a **global space** with `joiner(() => ({}))` gives one real
empty room:

```tsx
export const globalSpace = appChannel.lets
  .space() // no generic — the room shape is the empty object, so the space is ONE room
  .joiner(() => ({})) // and this is what makes it joinable: no joiner, no client joins
  .space()
```

Channel handlers stay for what a global space would only dress up: the `*all*`
topic is subscribed automatically at connect, so a channel clientHandler works
from the root with no membership to hold.

### Presence

Who's online is a composition of primitives you already have: the live list from
`space.memberships.server.list({ room })` (a `{ connectionId, identity, rooms }`
per member — `memberships.server.count` when the number is enough), and the
server-only lifecycle events `pointSpaceJoinServerSuccess` /
`pointSpaceLeaveServer` (each carries the `rooms` that changed; leave also its
`reason`). Both fire when the change is already DONE — the join is registered
before `Success`, the leave removed before its event — so the list you read
inside the handler is the list after the change: the member who just joined is
in it, the one who just left is not. **Compute the list once, push the data.**
When a member joins or leaves, the server computes the room's roster a single
time and pushes the READY list to the room; every member writes it straight into
the `whoIsHere` query's cache with
[`setSocketQueryData`](#the-handler-as-a-mutation-query-or-infinite-query) —
nobody refires a query, however big the room. The query itself stays the source
of truth for first paint and for catching up after a gap:

```tsx
export const chatSpace = appChannel.lets
  .space<{ chatId: string }>()
  .input(z.object({ chatId: z.string() }))
  .joiner(({ input }) => ({ chatId: input.chatId }))
  // a membership joined its rooms / left them — compute the list ONCE, push it to each room
  .serverOn(
    ['pointSpaceJoinServerSuccess', 'pointSpaceLeaveServer'],
    async (event) => {
      // the event's `rooms` is `unknown[]` up the chain — name the space's room shape
      for (const room of event.data.rooms as Array<{ chatId: string }>) {
        const here = await chatSpace.memberships.server.list({ room })
        const nicknames = here.map((membership) => membership.identity.nickname)
        void presenceChangedHandler.sendToClient({ nicknames }, { room })
      }
    },
  )
  .space()

// server → client — carries the READY member list, computed once per change
export const presenceChangedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(z.object({ nicknames: z.array(z.string()) }))
  .clientHandler()

export const whoIsHereHandler = chatSpace.lets
  .serverHandler()
  .serverReply(async ({ room }) => {
    const here = await chatSpace.memberships.server.list({ room })
    return { nicknames: here.map((membership) => membership.identity.nickname) }
  })
  .query()
  .serverHandler()
```

```tsx
export const PresenceList = ({ chatId }: { chatId: string }) => {
  const membership = chatSpace.useMembership({ chatId })
  const { data } = whoIsHereHandler(membership).useSocketQuery()
  presenceChangedHandler(membership).useOnMessageFromServer(({ message }) => {
    whoIsHereHandler(membership).setSocketQueryData(undefined, () => ({
      nicknames: message.nicknames,
    }))
  })
  return <Avatars nicknames={data?.nicknames ?? []} />
}
```

Dedup when one user opens several tabs (each tab is its own connection), and
remember a `space.kick` fires `pointSpaceLeaveServer` like any leave.

### Origin allowlist for the socket

Browsers do not apply CORS to WebSockets — any page can attempt the handshake.
The socket upgrade rides the full fetch pipeline as the `websocket`
[request variant](request#requestvariant), so the gate is an ordinary
[middleware](middleware): answer anything other than the pipeline's marker
response and the upgrade is off.

```tsx
export const root = Point0.lets('root', 'root')
  .middleware(async ({ request, next }) => {
    if (
      request.variant.type === 'websocket' ||
      request.variant.type === 'endpoint'
    ) {
      const origin = request.headers.origin
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response('Origin not allowed', { status: 403 })
      }
    }
    return await next()
  })
  .root()
```

The `endpoint` arm covers the cold-start channel-endpoint upgrade (and every
other endpoint) with the same list; scope it tighter if you only want to gate
the socket.

## The usual point machinery

- **Events** — every socket operation emits the standard lifecycle events: the
  four-phase families `pointChannelConnectServer*`/`Client*`,
  `pointSpaceJoinServer*`/`Client*`, `pointHandlerServer*`/`Client*`, the
  server-only singles `pointChannelOpenServer` / `pointChannelCloseServer` /
  `pointSpaceLeaveServer`, and the socket-level `socket*` singles. When each
  fires and what it carries: [The events](#the-events); the subscribing
  machinery itself — [events](events).
- **Transformer** — everything the sockets put on the wire goes through the
  point's [transformer](transformer): handler inputs, replies, the identity
  (channel transformer), rooms (space transformer — their serialization is the
  room identity), every socket frame. Set `.transformer(superjson)` up the chain
  and Dates or Maps survive the socket too. A channel can also opt its whole
  subtree OUT with the `preventTransformer: true` channel option — plain JSON
  for raw external consumers, and that channel's schemas must stay
  JSON-representable ([details](transformer)).
- **Options live on points** — `.channelOptions(...)`, `.spaceOptions(...)`,
  `.serverHandlerOptions(...)`, `.clientHandlerOptions(...)`, declarable on
  root/base/plugin (and handler options on a channel too). On a point they are
  GROUPED by side — `{ server: {...}, client: {...} }`, with the rare both-sides
  option (`preventTransformer`) top-level; call sites stay flat, since a call
  already names its side. Resolution lowest-to-highest, like queries, per group;
  callbacks at every level run in order. `server.backplane` is the engine's,
  like the logger. Full option sets: [Reference](#reference).
- **Plugins** — `.use` fits channels (a connect is an ordinary request); on
  spaces and handlers it's a type error, as is `.ctx`.
- **Stripping** — same categories as [query](query). On handlers the method name
  carries the AUTHOR, not the strip side — the reader is the opposite end, and
  the strip follows the reader. Server-only (cut from the **client** bundle,
  with its imports): the channel `.connector`, the space `.joiner` and
  `.enroller`, `.input`, `.clientSend`, `.serverReply`, `.ctx`, `.middleware`,
  `.serverOn`, plus `.clientReply`'s schema argument. What gets cut is the
  **arguments**, never the call — the client bundle still carries a bare
  `.joiner()`, which is how it knows that a space without one refuses joins.
  Client-only (cut from the **server** bundle): `.serverSend`, `.clientReply`'s
  callback, `.clientOn`. Isomorphic: `.tag`, `.on`, and the closing calls
  (`.channel` / `.space` / `.serverHandler` / `.clientHandler`). **Options
  objects** split STRUCTURALLY, by group: the client bundle loses the whole
  `server` property, the server bundle the whole `client` one, with their
  imports; anything top-level (`preventTransformer`) stays on both. That is why
  the options argument of these eight methods must be an object literal without
  a top-level spread — a variable, a call or a spread there is a compile error
  naming the method. Inside a group anything goes: `server: myCaps` is fine, the
  whole property is what gets dropped.

## Under the hood

- **Connect** hits the channel endpoint — a real dual-method endpoint (GET for a
  short input, POST for a long one), with middleware, ctx, connector, typed
  errors. The response carries a one-time ticket the socket claims; on an
  `upgradable` channel's cold start with a short input the GET upgrades straight
  into the socket instead (one round trip, no ticket — see
  [the two connect paths](#the-two-connect-paths)). Middleware and plugins see
  only this handshake.
- **The socket** is one per client, opened lazily; everything multiplexes over
  it. Its endpoint is `GET /_point0/<scope>/websocket` (on when the engine's
  `socket` server option is), and the upgrade rides the **full fetch pipeline**
  as its own request variant — middlewares run before the handshake and can veto
  it by answering an ordinary response (see the
  [Origin allowlist recipe](#origin-allowlist-for-the-socket)). Frames are JSON
  envelopes whose payload fields went through the transformer: claim / claimed /
  claimErr (plus discard and close), join / joined / joinErr / leave / left,
  `enrolled` (a server-side `space.enroll` grew a connection's enrollment —
  carrying the full new room set), send / reply / sendErr, msg, ping/pong,
  resume / resumed / resumeErr (the [resumable](#resumable-connections)
  handshake), and the server-initiated `closed` (a channel kick) and `refresh`.
  The `claimed` confirmation carries the `.enroller` enrollments.
- **Rooms are Bun pub/sub topics**, namespaced by space —
  `<scope>:<space>:<serialized room>`; the channel-wide
  `<scope>:<channel>:*all*` is subscribed at connect, and the space-wide
  `<scope>:<space>:*space*` with the first membership of a space on the socket
  (released with the last) — a bare space send publishes there. Within a process
  Bun fans a push out; across processes it rides the
  [backplane](#where-its-stored--the-engine-serverbackplane) broadcast channel.
  A room push is one frame per socket carrying the space and the serialized
  room; a channel push carries the cid or nothing (all).
- **The server stores connection + rooms — nothing else.** The join input never
  outlives the `.joiner` call: it goes in, rooms come out, it is forgotten (the
  client keys its hooks by input, like query keys — a purely client-side
  concern). A repeat join only ever ADDS rooms; removal is `leave`, a kick, or a
  `refresh`. The `leave` frame NAMES the rooms to drop — the client owns the
  shared-room refcount across its own memberships, and the server drops what it
  is told regardless of how the room was entered, which is why an enrollment
  leaves through that very frame.
- **Handlers load before the connect.** A clientHandler registers its dispatch
  entry when its module evaluates — and connecting a channel first imports every
  handler of that channel from the generated manifest, so a handler module
  nothing imports still catches pushes.
- In dev the client dev server proxies the socket to the engine — the bare
  `/_point0/<scope>/websocket` upgrade and the cold-start channel-endpoint
  upgrade alike — so sockets work from the client port with Bun and Vite,
  `--hot` included.
- Ordering is FIFO per socket, both directions; delivery is at-most-once — no
  replay after reconnect (the one bounded exception is the opt-in
  [resume](#resumable-connections) buffers, whose replay keeps the original
  delivery order across streams).
- Channel connects appear in the [OpenAPI](openapi) spec (real endpoints, both
  methods), and so does the bare `websocket` endpoint (documented for every
  scope with a channel in the point list — filter the channels out to hide it);
  the joins and the messages on the socket don't.
- Dead sockets close on their own, from both ends. The server's half is
  `idleTimeout` 120 s, which the client ping (30 s) keeps a live socket under: a
  silently dead client is dropped and its records expire on their TTL. The
  client's half is the deadline the same ping arms — two pings answered by
  nothing at all and more than two intervals of silence means a half-open
  socket, so the client closes it itself and reconnects (see
  [Reconnect](#reconnect)).

Not shipped yet (planned): durable message history (the
[resume](#resumable-connections) stream logs are in-memory and bounded — past
them, catching up is the refetch), AsyncAPI, binary payloads, rate limiting.

## Reference

### What each callback receives

| Callback                                                  | Receives                                                                                                               | Returns                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| channel `.connector`                                      | `{ input, ctx, request, set, points }`                                                                                 | the connection identity (an object) or nothing                                                                    |
| space `.joiner`                                           | `{ input, identity, connectionId, points }`                                                                            | a room, an array of rooms, `[]`, or nothing — checked against the opener's room shape (no schema: server-trusted) |
| space `.enroller`                                         | `{ identity, connectionId, points }` — no input, the server enrolls on its own                                         | a room, an array of rooms, or nothing — same check                                                                |
| `onBeforeJoiner` / `onAfterJoiner` (space options)        | `{ input, identity, connectionId, point, points }`; after adds `{ output, error }`                                     | — (a before-guard throw fails the join)                                                                           |
| serverHandler `.serverReply`                              | `{ input, identity, connectionId, messageId, points }` + `room` (space handler) + `reply` (with `.serverReply<T>()`)   | the reply (or nothing after an imperative `reply()`)                                                              |
| clientHandler `.clientReply`                              | `{ message, connection }` + `room` (space handler) — client side                                                       | the reply (schema as 2nd arg, checked on the server)                                                              |
| `onMessageFromServer` / `useOnMessageFromServer` callback | `{ message, connection, point }` + `room` (space handler) — up the chain `message` is `unknown`, narrow by `point`     | —                                                                                                                 |
| `onReply` (in `.sendToClient`'s `replies` argument)       | `{ data, connectionId }`                                                                                               | —                                                                                                                 |
| `onBeforeServerReply` / `onAfterServerReply` (options)    | `{ input, identity, connectionId, messageId, point, points }` + `room` (space handler); after adds `{ output, error }` | — (a before-guard throw rejects the send)                                                                         |
| `onReplyFromServer` (a serverHandler option)              | `{ input, data, connection, point }` — client side, fires on every reply                                               | —                                                                                                                 |

Server-side callbacks carry the bare `connectionId` string; read the
connection's current rooms with the synchronous
`space.memberships.server.local.rooms({ connectionId })`. On the client the
connection facade is
`{ status, error, isLoading, input, id, connectionIndex, disconnect() }` (no
`data`, no `room`); the membership facade is
`{ status, rooms, error, isLoading, input, membershipIndex, connection, leave() }`.

### Options

One rule across every family: the POINT surface (the chain `.xOptions()` and the
closer) takes all options of the family, GROUPED by the side that reads them —
`{ server: {...}, client: {...} }`, with the rare both-sides option top-level
next to the groups. A CALL SITE takes exactly its own side, FLAT: the call
already names the side, so `useConnection({ reconnect })`,
`sendToServer(input, { timeout })` and `useMembership(input, { linger })` list
the client-read options plus their call-only fields (`enabled`). Server-read
options (caps, server guards) exist on the point only.

The grouping is what makes the compiler's split structural — the client bundle
drops the whole `server` property, the server bundle the whole `client` one — so
the options argument must be an **object literal without a top-level spread**. A
group's value may be any expression (`.channel({ server: myCaps })`).

`.channel({...})` — also via `.channelOptions()` up the chain. The `client` rows
are also accepted per call on `useConnection` / `connect` (flat):

| Group              | Option                                   | Default     | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ---------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(call site only)_ | `enabled`                                | `true`      | connect or not — a call-site field, never on the point                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `client`           | `reconnect`                              | on          | a boolean or `{ enabled, immediately, delay, backoff, maxDelay, retries }` — first retry immediate, then 300 ms doubling up to 5 s                                                                                                                                                                                                                                                                                                                                      |
| `client`           | `upgradable`                             | `false`     | allow the cold-start GET+Upgrade connect (one round trip, no ticket); off = every connect takes the ticket path — a plain fetch whose `.fetchOptions` apply and whose connector error is readable ([the two connect paths](#the-two-connect-paths))                                                                                                                                                                                                                     |
| `client`           | `linger`                                 | `1000`      | ms a connection outlives its last hold                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `client`           | `ping`                                   | `30_000`    | keepalive interval; effective on the root — one socket. It also arms the client's liveness deadline: two pings answered by nothing at all and more than two intervals of silence is a half-open socket, which the client closes and reconnects. `0` turns off both halves                                                                                                                                                                                               |
| `client`           | `upgradeTimeout`                         | `5000`      | ms a cold-start GET+Upgrade waits for its confirmation before falling back to the ticket path (a middlebox may swallow a handshake without failing it)                                                                                                                                                                                                                                                                                                                  |
| `client`           | `resumeTimeout`                          | `5000`      | ms a [resume](#resumable-connections) offer waits for its answer before that connection falls back to the full connect (a rolling deploy may not speak resume yet)                                                                                                                                                                                                                                                                                                      |
| `client`           | `onConnect` / `onDisconnect` / `onError` | —           | connection lifecycle callbacks, chain in order; `onConnect` fires on every landed connect — `connectionIndex` `0` = the first, `> 0` = a reconnect; the props also carry `resumed`/`gapless` ([resumable connections](#resumable-connections))                                                                                                                                                                                                                          |
| `server`           | `maxMessageSize`                         | `1_048_576` | rejects bigger incoming frames                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `server`           | `maxConnections`                         | `32`        | live connections to this channel one SOCKET may hold — point0's client keeps one socket, so one browser tab; other sockets, other tabs and other channels each count on their own, so it bounds a socket, never a user. `1` is a fine value (the socket then holds one connection to the channel at most) and costs no reconnects: a socket takes its connections down with it, one that dies unnoticed goes on the idle timeout, and the fresh socket counts from zero |
| `server`           | `connectionTtl`                          | `90_000`    | ms a connection record lives in the backplane without a ping renewal (keep it above `ping`)                                                                                                                                                                                                                                                                                                                                                                             |
| `server`           | `resume`                                 | see right   | the [resume](#resumable-connections) tuning, only with `resumable: true` (refused otherwise): `{ parkWindow: 30_000, streamMaxFrames: 1024, streamMaxBytes: 4_194_304 }` — the park window and the per-stream buffer ceilings; merged per key across chain → closer                                                                                                                                                                                                     |
| _(top level)_      | `preventTransformer`                     | `false`     | both sides read it — `true` makes this channel's whole wire (spaces and handlers included) plain JSON for raw consumers; resolved at `.channel()`, never per call; the channel's schemas must stay JSON-representable ([details](transformer))                                                                                                                                                                                                                          |
| _(top level)_      | `resumable`                              | `false`     | both sides read it — `true` makes the connections [resumable](#resumable-connections): a reconnect restores identity/rooms from the record instead of re-running the connector/joiners/enrollers; the restore window is `connectionTtl`                                                                                                                                                                                                                                 |

`.space({...})` — also via `.spaceOptions()` up the chain. The `client` rows are
also accepted per call on `useMembership` / `join`:

| Group         | Option                | Default | What it does                                                                                                                                                                                                                             |
| ------------- | --------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`      | `linger`              | `1000`  | ms a membership outlives its last hold — the membership twin of the channel `linger`                                                                                                                                                     |
| `client`      | `onEnter` / `onLeave` | —       | membership lifecycle callbacks; `onEnter` fires on every landed join — `membershipIndex` `0` = the first, `> 0` = a replay; the props also carry `resumed`/`gapless`                                                                     |
| `server`      | `maxRooms`            | `256`   | rooms of this space one connection may be in, however it got there (join / enroller / `enroll`); `Infinity` opts out                                                                                                                     |
| `server`      | `onBeforeJoiner`      | —       | guard per incoming join — throw to refuse it. Typed at the closer                                                                                                                                                                        |
| `server`      | `onAfterJoiner`       | —       | observer after the join settles — audit/metrics                                                                                                                                                                                          |
| `server`      | `resume`              | —       | `{ streamMaxFrames?, streamMaxBytes? }` — this space's own buffer ceilings, overriding the channel's `server.resume` for its room and space-wide streams; needs the space in the resume (refused on a plain channel or an opt-out space) |
| _(top level)_ | `resumable`           | —       | `false` opts the space OUT of a [resumable](#resumable-connections) channel's restore: rooms out of the passport, the client re-joins them itself; needs a resumable channel and refuses `.enroller` — both fail at the closer           |

`.serverHandler({...})` — also via `.serverHandlerOptions()`. The `client` rows
are also accepted per send as `sendToServer(input, {...})`. There is no `room`
call option — a space handler's send addresses the room it was BOUND to
(`handler(room).sendToServer(...)`):

| Group    | Option                | Default | What it does                                                                                                                                                                                                  |
| -------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client` | `timeout`             | `5000`  | how long this send waits for its reply — awaiting the connect/join and queueing through a reconnect included; a channel-wide default is `.serverHandlerOptions({ client: { timeout } })` on the channel chain |
| `client` | `queue`               | `true`  | queue through a reconnect; `false` = fail fast                                                                                                                                                                |
| `client` | `onReplyFromServer`   | —       | callback on every reply — here and up the chain (there `data` is unknown, narrow by `point`)                                                                                                                  |
| `server` | `onBeforeServerReply` | —       | guard per incoming message — throw to refuse it. Typed at the closer                                                                                                                                          |
| `server` | `onAfterServerReply`  | —       | observer after the reply settles — audit/metrics                                                                                                                                                              |

`.clientHandler({...})` — also via `.clientHandlerOptions()`:

| Group         | Option                | Default | What it does                                                                                                                                                                                                                                                                                                                                                             |
| ------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `client`      | `onMessageFromServer` | —       | module-level listener — here and up the chain; listeners add up                                                                                                                                                                                                                                                                                                          |
| `server`      | `timeout`             | `5000`  | the reply-collection window when replies are requested                                                                                                                                                                                                                                                                                                                   |
| _(top level)_ | `resumable`           | —       | opt this handler's pushes into the [resume buffers](#resumable-connections) — `true` = the default ceiling of 128, a number = up to that many of ITS frames per stream (the stream totals are the channel's `server.resume`); the object form `{ buffer?, replay? }` adds the policy: `replay: 'gapless'` withholds this handler's frames from a gappy recovery's replay |

The two `timeout`s of the handler families are told apart by their group: the
serverHandler's is a `client` option (how long a send waits), the
clientHandler's a `server` one (how long a push collects replies).

Per-send targeting (the `target` argument — `room` / `connectionId` /
`$identity` / `except`) and collection (the `replies` argument — `true` /
`{ timeout, onReply, waitForAll }`) are call-site-only.

### Method surface

| Point          | Method                                                                                                                                                                                                                        | Returns                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| channel        | `useConnection(input?, options?)` / `connect(input?, options?)`                                                                                                                                                               | the connection facade                                                                                    |
| channel        | `getConnection(input?)` / `getConnectionOrUndefined(input?)` — client side                                                                                                                                                    | the live connection, no hold                                                                             |
| channel        | `<Connection input options gate LoadingComponent ErrorComponent>` / `.lets`                                                                                                                                                   | holds a connection / grows spaces and handlers                                                           |
| channel        | `kick(target?)` / `refresh(target?)` / `amendIdentity(target, patch)` — server                                                                                                                                                | `Promise<void>` each                                                                                     |
| channel        | `connections.server.count/.list/.forEach(target?, options?)` — server, the cluster                                                                                                                                            | `number` / `Array<{ connectionId, identity, spaces }>` / stream                                          |
| channel        | `connections.server.local.count/.list(target?)` — server, synchronous, this process                                                                                                                                           | `number` / `Array<{ connectionId, identity, spaces }>`                                                   |
| channel        | `connections.client.count/.list()` — client, synchronous, this tab                                                                                                                                                            | `number` / `ClientChannelConnection[]` — the live facades                                                |
| space          | `useMembership(input, options?)` / `join(input, options?, channelInput?)`                                                                                                                                                     | the membership facade                                                                                    |
| space          | `getMembership(membershipInput, channelInput?)` / `getMembershipOrUndefined(...)`                                                                                                                                             | the live membership, no hold                                                                             |
| space          | `<Membership input options gate LoadingComponent ErrorComponent>` / `.lets`                                                                                                                                                   | holds a membership / grows handlers                                                                      |
| space          | `kick(target?)` — server                                                                                                                                                                                                      | `Promise<void>` — a forced leave of the matching rooms                                                   |
| space          | `memberships.server.count/.list/.forEach(target?, options?)` — server, the cluster                                                                                                                                            | `number` / `Array<{ connectionId, identity, rooms }>` / stream                                           |
| space          | `memberships.server.local.count/.list/.rooms(target?)` — server, synchronous, this process                                                                                                                                    | `number` / `Array<{ connectionId, identity, rooms }>` / `Room[]`                                         |
| space          | `memberships.client.count/.list()` — client, synchronous, this tab (enrolled included)                                                                                                                                        | `number` / `ClientSpaceMembership[]` — the live facades                                                  |
| serverHandler  | `sendToServer(input?, options?)` — client side                                                                                                                                                                                | `Promise<reply>`                                                                                         |
| serverHandler  | `useSocketMutation` / `useSocketQuery` / `useSocketInfiniteQuery`                                                                                                                                                             | the flavor's TanStack surface (mutation is the default)                                                  |
| serverHandler  | the query flavors' full family — `useSuspenseSocket*`, `fetchSocket*`, `prefetchSocket*`, `ensureSocket*Data`, `getSocket*Options/Key/Data/State/Cache(s)`, `setSocket*Data`, `refetch/invalidate/cancel/remove/resetSocket*` | mirrors the regular query surface, transport socket (`*` = `Query` / `InfiniteQuery`, paired per flavor) |
| serverHandler  | the mutation flavor's family — `fetchSocketMutation` / `getSocketMutationKey` / `getSocketMutationOptions` / `getSocketMutationCache(s)`                                                                                      | mirrors the regular mutation surface                                                                     |
| clientHandler  | `sendToClient(message, target?, replies?)` — server side (the `$`-dictionary target)                                                                                                                                          | follows `replies`: nothing / async iterable / array / `void`                                             |
| clientHandler  | `useOnMessageFromServer(cb, options?)` / `onMessageFromServer(cb)` — client side                                                                                                                                              | hook: `data` with `lastMessageFromServerAsData` / imperative: `{ remove() }`                             |
| clientHandler  | `iterateMessagesFromServer(options?)` — the pushes as an async iterable                                                                                                                                                       | `AsyncGenerator<message>` — parks through a drop, ends when the target closes, throws its typed error    |
| either handler | `handler(connection \| channelInput)` (channel) / `handler(room \| membership, channelInput?)` (space)                                                                                                                        | the bound surface — the client methods with the target fixed; a space handler addresses a ROOM           |

All four also expose the standard `id` (`scope:type:name`), `type` (`'channel'`
/ `'space'` / `'serverHandler'` / `'clientHandler'`), `tags`, `point`, and
`Infer`.
