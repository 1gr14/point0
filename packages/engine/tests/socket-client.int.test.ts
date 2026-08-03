/**
 * Drives the REAL core client runtime (connect + join, holds and membership dedup, membership-bound sends, listeners,
 * clientReply, the cascade, join replay after a server refresh/reconnect, and the cold-start upgrade-connect fallback)
 * against a spawned dev server — what the browser does, headless. The wire-protocol e2e lives in socket.int.test.ts;
 * this file covers the client state machine on top of it: the channel carries an identity, rooms come from a space's
 * join (or a server-side `.enroller` enrollment), handlers bind by a membership (space) or a connection (channel).
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { render, waitFor as rtlWaitFor } from '@testing-library/react/pure.js'
import { QueryClientProvider } from '@tanstack/react-query'
import { Window } from 'happy-dom'
import * as React from 'react'
import { z } from 'zod'
import type { AnyEventerEventName, ErrorPoint0 } from '@point0/core'
import { ClientPoints, createQueryClient, POINT0_ERROR_CODES_MAP, Point0 } from '@point0/core'
import { connectToChannel, disconnectAll, getSocket, joinSpace, reconnectAll, Socket } from '@point0/core/socket'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-client',
  portsRange: [4300, 4349],
  superjson: false,
})

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { ErrorPoint0 } from '@point0/core'
import { root } from './lib/root.js'

// the channel authenticates and establishes an identity — no room, no data from the connector;
// 'banned' is a hard deny: the typed error carries preventRetry, so the client never knocks again
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    if (input.userId === 'banned') {
      throw new ErrorPoint0('banned', { preventRetry: true })
    }
    return { me: 'user-' + input.userId }
  })
  .channel()

// a space of chat rooms { chatId }; the joiner admits nobody into the 'denied' room (a clean deny),
// and 'hard-denied' throws with preventRetry — the client must not replay that join on reconnects
export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => {
    if (input.chatId === 'hard-denied') {
      throw new ErrorPoint0('hard denied', { preventRetry: true })
    }
    if (input.chatId.startsWith('slow')) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    return input.chatId === 'denied' ? undefined : { chatId: input.chatId }
  })
  .space()

// the server-side enrollment: every connection gets a personal { userId } room, no client join involved.
// The enroller reads MUTABLE server state — by default the identity's own room, but adminPersonalRoomsHandler can
// rewrite the answer for one identity, so the next connection setup (a refresh) enrolls it somewhere else
const personalRoomsOverrides = new Map<string, string[]>()
export const userSpace = chatChannel.lets<{ userId: string }>('space', 'userSpace')
  .enroller(({ identity }) => (personalRoomsOverrides.get(identity.me) ?? [identity.me]).map((userId) => ({ userId })))
  .space()

// rewrite what the enroller will answer for one identity, then refresh it — the reconcile input
export const adminPersonalRoomsHandler = chatChannel.lets('serverHandler', 'adminPersonalRoomsHandler')
  .clientSend(z.object({ me: z.string(), rooms: z.array(z.string()) }))
  .serverReply(async ({ input }) => {
    personalRoomsOverrides.set(input.me, input.rooms)
    await chatChannel.refresh({ $identity: { me: input.me } })
    return { ok: true }
  })
  .serverHandler()

export const personalHandler = userSpace.lets('clientHandler', 'personalHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// pushes to the personal enrolled room of one user
export const personalPushHandler = chatChannel.lets('serverHandler', 'personalPushHandler')
  .clientSend(z.object({ me: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void personalHandler.sendToClient({ text: input.text }, { room: { userId: input.me } })
    return { ok: true }
  })
  .serverHandler()

export const messageSendHandler = chatSpace.lets('serverHandler', 'messageSendHandler')
  .clientSend(z.object({ text: z.string().min(1) }))
  .serverReply(async ({ input, identity, room }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: identity.me }, { room })
    return { ok: true, echo: input.text, chatId: room.chatId }
  })
  .serverHandler()

export const messageReceivedHandler = chatSpace.lets('clientHandler', 'messageReceivedHandler')
  .serverSend(z.object({ text: z.string(), from: z.string() }))
  .clientHandler()

export const pingCollectHandler = chatSpace.lets('serverHandler', 'pingCollectHandler')
  .serverReply(async ({ room }) => {
    const replies = await pingHandler.sendToClient({ ask: 'hi' }, { room }, { timeout: 3000, waitForAll: true })
    return { answers: replies.map((reply) => reply.data.answer).sort() }
  })
  .serverHandler()

export const pingHandler = chatSpace.lets('clientHandler', 'pingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'pong:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

// pushes to an arbitrary room from an admin connection
export const roomPushHandler = chatChannel.lets('serverHandler', 'roomPushHandler')
  .clientSend(z.object({ chatId: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: 'sys' }, { room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// a room push that EXCEPTS a room — a connection holding the excluded room must not see it
export const exceptRoomPushHandler = chatChannel.lets('serverHandler', 'exceptRoomPushHandler')
  .clientSend(z.object({ chatId: z.string(), exceptChatId: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient(
      { text: input.text, from: 'sys' },
      { room: { chatId: input.chatId }, except: { chatId: input.exceptChatId } },
    )
    return { ok: true }
  })
  .serverHandler()

// pushes to a single connection by cid
export const cidPushHandler = chatChannel.lets('serverHandler', 'cidPushHandler')
  .clientSend(z.object({ cid: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: 'sys' }, { connectionId: input.cid })
    return { ok: true }
  })
  .serverHandler()

export const adminKickHandler = chatChannel.lets('serverHandler', 'adminKickHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.kick({ $identity: { me: input.me }, reason: 'kicked' })
    return { ok: true }
  })
  .serverHandler()

export const adminRefreshHandler = chatChannel.lets('serverHandler', 'adminRefreshHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.refresh({ $identity: { me: input.me } })
    return { ok: true }
  })
  .serverHandler()

// a SPACE memberships.list() — { connectionId, identity, rooms } per membership of the room
export const adminSpaceListHandler = chatChannel.lets('serverHandler', 'adminSpaceListHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    const list = await chatSpace.memberships.server.list({ room: { chatId: input.chatId } })
    return { ids: list.map((membership) => membership.connectionId) }
  })
  .serverHandler()

// the same listing for the enroller-only userSpace — who the SERVER has in a personal room right now
export const adminUserListHandler = chatChannel.lets('serverHandler', 'adminUserListHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    const list = await userSpace.memberships.server.list({ room: { userId: input.me } })
    return { ids: list.map((membership) => membership.connectionId) }
  })
  .serverHandler()

// a space kick — a forced LEAVE of a room; the client's membership loses those rooms without closing the connection
export const adminSpaceKickHandler = chatChannel.lets('serverHandler', 'adminSpaceKickHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    await chatSpace.kick({ room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// two DIFFERENT inputs resolve to ONE room — the shared-room refcount lives on the client
export const dmSpace = chatChannel.lets<{ pair: string }>('space', 'dmSpace')
  .input(z.object({ a: z.string(), b: z.string() }))
  .joiner(async ({ input }) => ({ pair: [input.a, input.b].sort().join('+') }))
  .space()

export const dmNoticeHandler = dmSpace.lets('clientHandler', 'dmNoticeHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

export const dmPushHandler = chatChannel.lets('serverHandler', 'dmPushHandler')
  .clientSend(z.object({ pair: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void dmNoticeHandler.sendToClient({ text: input.text }, { room: { pair: input.pair } })
    return { ok: true }
  })
  .serverHandler()

// a MULTI-ROOM membership: ONE join lands in TWO rooms. The membership is information about participation — the
// ROOM is the address, so every bound surface here is bound by room
export const multiSpace = chatChannel.lets<{ chatId: string }>('space', 'multiSpace')
  .input(z.object({ prefix: z.string() }))
  .joiner(async ({ input }) => [{ chatId: input.prefix + '-a' }, { chatId: input.prefix + '-b' }])
  .space()

export const multiEchoHandler = multiSpace.lets('serverHandler', 'multiEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => {
    void multiNoticeHandler.sendToClient({ text: input.text, chatId: room.chatId }, { room })
    return { echo: input.text, chatId: room.chatId }
  })
  .serverHandler()

export const multiNoticeHandler = multiSpace.lets('clientHandler', 'multiNoticeHandler')
  .serverSend(z.object({ text: z.string(), chatId: z.string() }))
  .clientHandler()

// a QUERY-flavored space handler on the multi-room space — one cache entry per room
let multiWhoCalls = 0
export const multiWhoHandler = multiSpace.lets('serverHandler', 'multiWhoHandler')
  .serverReply(async ({ room }) => ({ n: ++multiWhoCalls, chatId: room.chatId }))
  .query({ staleTime: 60_000 })
  .serverHandler()

// the imperative enroll — grows the matches' enrolled membership of chatSpace mid-life (the kick's mirror)
export const adminEnrollHandler = chatChannel.lets('serverHandler', 'adminEnrollHandler')
  .clientSend(z.object({ me: z.string(), chatIds: z.array(z.string()) }))
  .serverReply(async ({ input }) => {
    await chatSpace.enroll({ $identity: { me: input.me } }, input.chatIds.map((chatId) => ({ chatId })))
    return { ok: true }
  })
  .serverHandler()

// a space whose joiner consults MUTABLE server state: it admits a room until that room is revoked, and refuses
// every join afterwards. A revoke + refresh replays the client's join, the server refuses the replay, and the
// membership lands in the terminal 'error' — the REVOKED-MEMBERSHIP fixture
const revokedRooms = new Set()
export const revokeSpace = chatChannel.lets<{ chatId: string }>('space', 'revokeSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => {
    if (revokedRooms.has(input.chatId)) {
      throw new ErrorPoint0('membership revoked', { preventRetry: true })
    }
    return { chatId: input.chatId }
  })
  .space()

// the query-flavored handler of that space — one cache entry per room, and the entry a deny must take with it
let revokeWhoCalls = 0
export const revokeWhoHandler = revokeSpace.lets('serverHandler', 'revokeWhoHandler')
  .serverReply(async ({ room }) => ({ n: ++revokeWhoCalls, chatId: room.chatId }))
  .query({ staleTime: 60_000 })
  .serverHandler()

// revoke the room, then refresh the identity — the refresh replays the join the joiner now refuses
export const adminRevokeRoomHandler = chatChannel.lets('serverHandler', 'adminRevokeRoomHandler')
  .clientSend(z.object({ chatId: z.string(), me: z.string() }))
  .serverReply(async ({ input }) => {
    revokedRooms.add(input.chatId)
    await chatChannel.refresh({ $identity: { me: input.me } })
    return { ok: true }
  })
  .serverHandler()

// the streaming pair — the LLM pattern: a clientHandler carries the feed (its iterator consumes it), a mutation starts the job
export const tickFeedHandler = chatChannel.lets('clientHandler', 'tickFeedHandler')
  .serverSend(z.object({ i: z.number() }))
  .clientHandler()

export const startTicksHandler = chatChannel.lets('serverHandler', 'startTicksHandler')
  .clientSend(z.object({ count: z.number() }))
  .serverReply(async ({ input, connectionId }) => {
    void (async () => {
      for (let i = 1; i <= input.count; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        await tickFeedHandler.sendToClient({ i }, { connectionId })
      }
    })()
    return { started: true }
  })
  .serverHandler()

let chatInfoCalls = 0
export const chatInfoHandler = chatChannel.lets('serverHandler', 'chatInfoHandler')
  .clientSend(z.object({ q: z.string() }))
  .serverReply(async ({ input, identity }) => ({ n: ++chatInfoCalls, q: input.q, me: identity.me }))
  .query({ staleTime: 60_000 })
  .serverHandler()

// answers imperatively mid-callback, then keeps working for a long tail — the client must resolve at reply() time
export const earlyEchoHandler = chatChannel.lets('serverHandler', 'earlyEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply<{ echo: string }>(async ({ input, reply }) => {
    reply({ echo: 'early:' + input.text })
    await new Promise((resolve) => setTimeout(resolve, 1200))
  })
  .serverHandler()

export const earlyFailHandler = chatChannel.lets('serverHandler', 'earlyFailHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply<{ ok: boolean }>(async ({ input, reply }) => {
    reply(Object.assign(new Error('Transcode failed: ' + input.text), { code: 'TRANSCODE_FAILED' }))
  })
  .serverHandler()

// a channel whose connector always refuses — for the cold-start upgrade-connect fallback
export const forbiddenChannel = root.lets('channel', 'forbiddenChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async () => {
    throw Object.assign(new Error('Access denied'), { code: 'ACCESS_DENIED' })
  })
  .channel()

// the connector ADMITS, the enroller refuses — an upgrade-connect that dies AFTER the handshake, so the refusal
// answers on a cid the client never learned
export const upgradeChannel = root.lets('channel', 'upgradeChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const upgradeSpace = upgradeChannel.lets<{ userId: string }>('space', 'upgradeSpace')
  .enroller(({ identity }) => {
    // every \`cursed*\` identity is refused, so a test that needs its OWN refused connect (a different input = a
    // different connection key, no reuse of a lingering one) just picks another suffix
    if (identity.me.startsWith('user-cursed')) {
      throw new ErrorPoint0('enrollment refused')
    }
    return { userId: identity.me }
  })
  .space()

// the INFINITE-flavored socket query: the page cursor rides the message input under \`pageParamFromInput\`, so every
// page is one ordinary send — this handler records the cursor it was called with, per query
const feedCursors: string[] = []
export const feedPageHandler = chatChannel.lets('serverHandler', 'feedPageHandler')
  .clientSend(z.object({ q: z.string(), cursor: z.number().optional() }))
  .serverReply(async ({ input }) => {
    const cursor = input.cursor ?? 0
    feedCursors.push(input.q + ':' + cursor)
    return { q: input.q, cursor, items: [input.q + '-' + cursor], nextCursor: cursor >= 2 ? null : cursor + 1 }
  })
  .infiniteQuery({
    pageParamFromInput: 'cursor',
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
  .serverHandler()

// what the SERVER actually received per page — "one send per page" is only provable from this side
export const feedCursorsHandler = chatChannel.lets('serverHandler', 'feedCursorsHandler')
  .clientSend(z.object({ q: z.string() }))
  .serverReply(async ({ input }) => ({ cursors: feedCursors.filter((entry) => entry.split(':')[0] === input.q) }))
  .serverHandler()

// a push whose CLIENT-side .clientReply throws — the error half of the pointHandlerClient* family. The responder is
// client code, so this server-side declaration carries no .clientReply at all
export const boomHandler = chatChannel.lets('clientHandler', 'boomHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

export const boomPushHandler = chatChannel.lets('serverHandler', 'boomPushHandler')
  .clientSend(z.object({ cid: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void boomHandler.sendToClient({ text: input.text }, { connectionId: input.cid })
    return { ok: true }
  })
  .serverHandler()

// a channel whose own middleware records the HTTP METHOD of every connect that reaches its endpoint: the GET/POST
// split is a CLIENT decision (the input rides \`?input=\` until the URL would overflow the cap), and this is where it
// becomes a fact. Its own channel so the log holds this one test's connects and nothing else
const connectMethods: string[] = []
export const methodChannel = root.lets('channel', 'methodChannel')
  .input(z.object({ userId: z.string() }))
  .middleware(({ request, next }) => {
    connectMethods.push(request.method)
    return next()
  })
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const adminConnectMethodsHandler = chatChannel.lets('serverHandler', 'adminConnectMethodsHandler')
  .serverReply(async () => ({ methods: [...connectMethods] }))
  .serverHandler()
`,
  )
}

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000): Promise<void> => {
  const startedAt = Date.now()
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`waitFor timed out in ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/** The async twin of `waitFor`: re-read a SERVER-side answer (a memberships listing) until it settles. */
const waitForRead = async <T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 10_000,
): Promise<T> => {
  const startedAt = Date.now()
  let value = await read()
  while (!predicate(value)) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`waitForRead timed out in ${timeoutMs}ms`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
    value = await read()
  }
  return value
}

/**
 * A membership facade as `memberships.client.list()` hands it back here — the points in this file are declared through
 * the untyped `anyLets` helper, so the facades come back loose.
 */
type LooseMembership = {
  status: string
  input: unknown
  rooms: Array<Record<string, string>>
  connection: { id: string | undefined }
  leave: () => void
}

/**
 * The error a call produced, however it produced it: a strict target resolution throws SYNCHRONOUSLY (the bound surface
 * resolves before it frames anything), a transport refusal rejects.
 */
const failureOf = async (run: () => unknown): Promise<Error | undefined> => {
  try {
    await run()
    return undefined
  } catch (thrown) {
    return thrown as Error
  }
}

// what the module-level personalHandler listener received — the enrolled-membership pushes land here
const personalReceived: Array<{ text: string }> = []

// what the module-level messageReceivedHandler listener received — imperative-enroll pushes have no facade to bind on
const roomReceived: Array<{ text: string }> = []

/** One framework event as this file reads it — the payload plus the log-friendly `meta` the emitter built. */
type RecordedEvent = { name: string; side: string; data: Record<string, unknown>; meta: Record<string, unknown> }

/**
 * Every CLIENT-side socket event: the three four-phase families (the connect request, the join frame, a clientHandler
 * dispatch) plus the two socket-level singles. The `...Server*` twins fire in the spawned server child and are covered
 * there — this process is the browser.
 */
const socketClientEventNames: AnyEventerEventName[] = [
  'pointChannelConnectClientStart',
  'pointChannelConnectClientSettled',
  'pointChannelConnectClientSuccess',
  'pointChannelConnectClientError',
  'pointSpaceJoinClientStart',
  'pointSpaceJoinClientSettled',
  'pointSpaceJoinClientSuccess',
  'pointSpaceJoinClientError',
  'pointHandlerClientStart',
  'pointHandlerClientSettled',
  'pointHandlerClientSuccess',
  'pointHandlerClientError',
  'pointHandlerSendClientStart',
  'pointHandlerSendClientSettled',
  'pointHandlerSendClientSuccess',
  'pointHandlerSendClientError',
  'socketClientConnect',
  'socketClientDisconnect',
]

/**
 * The root's subscription writes here and nowhere else — a test switches the recorder on for its own window instead of
 * every connect in this file feeding one array. `_emit` dispatches on a microtask, so reads always poll.
 */
let socketEventRecorder: ((event: RecordedEvent) => void) | undefined
/** Open a recording window — the returned array collects from now until the next call or `stopRecordingSocketEvents`. */
const recordSocketEvents = (): RecordedEvent[] => {
  const events: RecordedEvent[] = []
  socketEventRecorder = (event) => void events.push(event)
  return events
}
const stopRecordingSocketEvents = (): void => {
  socketEventRecorder = undefined
}

/** The recorded phases of one family on one point, in order: `['Start', 'Settled', 'Success']` and friends. */
const phasesOf = (events: RecordedEvent[], family: string, pointId?: string): string[] =>
  events
    .filter((event) => event.name.startsWith(family) && (pointId === undefined || event.meta.point === pointId))
    .map((event) => event.name.slice(family.length))

const eventOf = (events: RecordedEvent[], name: string, pointId?: string): RecordedEvent | undefined =>
  events.find((event) => event.name === name && (pointId === undefined || event.meta.point === pointId))

/** The point id an event's `meta.point` carries — the same string for the client point that emitted it. */
const idOf = (point: unknown): string => (point as { point: { id: string } }).point.id

/**
 * Take over `globalThis.WebSocket` so a test can reach the socket instance the runtime opened — the only lever for a
 * TRANSPORT-level drop (a NAT timeout, a proxy restart), which is a different story from a server-side kick. The socket
 * is shared by the whole file, so a tracker only sees the sockets opened while it is installed: gate on
 * `getSocket().status === 'idle'` first.
 */
const trackWebSockets = (): { created: WebSocket[]; restore: () => void } => {
  const RealWebSocket = globalThis.WebSocket
  const created: WebSocket[] = []
  class TrackedWebSocket extends RealWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols)
      created.push(this)
    }
  }
  globalThis.WebSocket = TrackedWebSocket as unknown as typeof WebSocket
  return {
    created,
    restore: () => {
      globalThis.WebSocket = RealWebSocket
    },
  }
}

/**
 * Run `fn` with a happy-dom document in place — the DOM globals React needs and nothing more. `fetch` and `WebSocket`
 * stay the real ones, so the client runtime under test keeps talking to the spawned server. (The twin of
 * `withFakeBrowserGlobals` in tests/utils/internal-testing, kept local so this file pulls in no engine machinery.)
 */
const withDomGlobals = async (fn: () => Promise<void>): Promise<void> => {
  const window = new Window({ url: 'http://localhost/' })
  const globals: Record<string, unknown> = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    DOMParser: window.DOMParser,
    MutationObserver: window.MutationObserver,
    history: window.history,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  }
  const mutable = globalThis as unknown as Record<string, unknown>
  const originals = Object.fromEntries(Object.keys(globals).map((key) => [key, mutable[key]]))
  Object.assign(mutable, globals)
  try {
    await fn()
  } finally {
    Object.assign(mutable, originals)
  }
}

// the client-side point declarations — what the compiled client bundle carries after the strip (connector/joiner/
// enroller args gone)
const buildClientPoints = (serverPort: number) => {
  const root = Point0.lets('root', 'root')
    .serverUrl(`http://localhost:${serverPort}`)
    // the file-wide event tap: the subscription is inherited by every point built off this root, so one registration
    // sees the whole client vertical. It only forwards — a test owns the window it records
    .on(socketClientEventNames, (event) => {
      socketEventRecorder?.({
        name: event.name,
        side: event.side,
        data: event.data as unknown as Record<string, unknown>,
        meta: event.meta,
      })
    })
    .root()
  const anyLets = (point: unknown) => (point as { lets: (...args: unknown[]) => any }).lets

  const chatChannel = root
    .lets('channel', 'chatChannel')
    .input(z.object({ userId: z.string() }))
    .channel()
  const chatSpace = anyLets(chatChannel)('space', 'chatSpace')
    .input(z.object({ chatId: z.string() }))
    .joiner()
    .space()
  // the stripped client bundle keeps a bare `.enroller()` — the client learns the enrollments from the claimed frame
  const userSpace = anyLets(chatChannel)('space', 'userSpace').enroller().space()
  // its own scope on a dead port — the transport-failure fixture: every connect request fails at fetch, no server
  // answer ever (nothing listens on port 1)
  const deadRoot = Point0.lets('root', 'dead').serverUrl('http://localhost:1').root()
  const deadChannel = deadRoot.lets('channel', 'deadChannel').channel()
  const deadEchoHandler = anyLets(deadChannel)('serverHandler', 'deadEchoHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const dmSpace = anyLets(chatChannel)('space', 'dmSpace')
    .input(z.object({ a: z.string(), b: z.string() }))
    .joiner()
    .space()

  const messageSendHandler = anyLets(chatSpace)('serverHandler', 'messageSendHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const messageReceivedHandler = anyLets(chatSpace)('clientHandler', 'messageReceivedHandler')
    .serverSend(z.object({ text: z.string(), from: z.string() }))
    // the module-level listener observes pushes into ENROLLED memberships too (no facade to bind a listener on)
    .clientHandler({
      client: {
        onMessageFromServer: ({ message }: { message: { text: string } }) => {
          roomReceived.push(message)
        },
      },
    })
  const pingHandler = anyLets(chatSpace)('clientHandler', 'pingHandler')
    .clientReply(({ message }: { message: { ask: string } }) => ({ answer: 'pong:' + message.ask }))
    .clientHandler()
  const pingCollectHandler = anyLets(chatSpace)('serverHandler', 'pingCollectHandler').serverReply().serverHandler()
  const personalHandler = anyLets(userSpace)('clientHandler', 'personalHandler')
    .serverSend(z.object({ text: z.string() }))
    // the module-level listener — enrolled memberships have no facade to bind a per-membership listener on
    .clientHandler({
      client: {
        onMessageFromServer: ({ message }: { message: { text: string } }) => {
          personalReceived.push(message)
        },
      },
    })
  const personalPushHandler = anyLets(chatChannel)('serverHandler', 'personalPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()

  const roomPushHandler = anyLets(chatChannel)('serverHandler', 'roomPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const exceptRoomPushHandler = anyLets(chatChannel)('serverHandler', 'exceptRoomPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const cidPushHandler = anyLets(chatChannel)('serverHandler', 'cidPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminKickHandler = anyLets(chatChannel)('serverHandler', 'adminKickHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminRefreshHandler = anyLets(chatChannel)('serverHandler', 'adminRefreshHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminSpaceListHandler = anyLets(chatChannel)('serverHandler', 'adminSpaceListHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminUserListHandler = anyLets(chatChannel)('serverHandler', 'adminUserListHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminSpaceKickHandler = anyLets(chatChannel)('serverHandler', 'adminSpaceKickHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminEnrollHandler = anyLets(chatChannel)('serverHandler', 'adminEnrollHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const multiSpace = anyLets(chatChannel)('space', 'multiSpace')
    .input(z.object({ prefix: z.string() }))
    .joiner()
    .space()
  const multiEchoHandler = anyLets(multiSpace)('serverHandler', 'multiEchoHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const multiNoticeHandler = anyLets(multiSpace)('clientHandler', 'multiNoticeHandler')
    .serverSend(z.object({ text: z.string(), chatId: z.string() }))
    .clientHandler()
  const multiWhoHandler = anyLets(multiSpace)('serverHandler', 'multiWhoHandler')
    .serverReply()
    .query({ staleTime: 60_000 })
    .serverHandler()
  const revokeSpace = anyLets(chatChannel)('space', 'revokeSpace')
    .input(z.object({ chatId: z.string() }))
    .joiner()
    .space()
  const revokeWhoHandler = anyLets(revokeSpace)('serverHandler', 'revokeWhoHandler')
    .serverReply()
    .query({ staleTime: 60_000 })
    .serverHandler()
  const adminRevokeRoomHandler = anyLets(chatChannel)('serverHandler', 'adminRevokeRoomHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const dmNoticeHandler = anyLets(dmSpace)('clientHandler', 'dmNoticeHandler')
    .serverSend(z.object({ text: z.string() }))
    .clientHandler()
  const dmPushHandler = anyLets(chatChannel)('serverHandler', 'dmPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const chatInfoHandler = anyLets(chatChannel)('serverHandler', 'chatInfoHandler')
    .clientSend()
    .serverReply()
    .query({ staleTime: 60_000 })
    .serverHandler()
  const earlyEchoHandler = anyLets(chatChannel)('serverHandler', 'earlyEchoHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const earlyFailHandler = anyLets(chatChannel)('serverHandler', 'earlyFailHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const tickFeedHandler = anyLets(chatChannel)('clientHandler', 'tickFeedHandler').serverSend().clientHandler()
  const startTicksHandler = anyLets(chatChannel)('serverHandler', 'startTicksHandler')
    .clientSend()
    .serverReply()
    .serverHandler()

  const feedPageHandler = anyLets(chatChannel)('serverHandler', 'feedPageHandler')
    .clientSend()
    .serverReply()
    // the flavor options ship to the client — that is where the cursor is folded into each page's message input
    .infiniteQuery({
      pageParamFromInput: 'cursor',
      initialPageParam: 0,
      getNextPageParam: (lastPage: { nextCursor: number | null }) => lastPage.nextCursor,
    })
    .serverHandler()
  const feedCursorsHandler = anyLets(chatChannel)('serverHandler', 'feedCursorsHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const boomHandler = anyLets(chatChannel)('clientHandler', 'boomHandler')
    .serverSend(z.object({ text: z.string() }))
    .clientReply(() => {
      throw new Error('clientReply boom')
    })
    .clientHandler()
  const boomPushHandler = anyLets(chatChannel)('serverHandler', 'boomPushHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminPersonalRoomsHandler = anyLets(chatChannel)('serverHandler', 'adminPersonalRoomsHandler')
    .clientSend()
    .serverReply()
    .serverHandler()
  const adminConnectMethodsHandler = anyLets(chatChannel)('serverHandler', 'adminConnectMethodsHandler')
    .serverReply()
    .serverHandler()
  const methodChannel = root
    .lets('channel', 'methodChannel')
    .input(z.object({ userId: z.string() }))
    .channel()

  const forbiddenChannel = root
    .lets('channel', 'forbiddenChannel')
    .input(z.object({ userId: z.string() }))
    .channel()
  const upgradeChannel = root
    .lets('channel', 'upgradeChannel')
    .input(z.object({ userId: z.string() }))
    .channel()
  // the stripped client bundle keeps a bare `.enroller()` — the enrollment is the server's business
  const upgradeSpace = anyLets(upgradeChannel)('space', 'upgradeSpace').enroller().space()

  return {
    root,
    deadChannel,
    deadEchoHandler,
    chatChannel,
    chatSpace,
    userSpace,
    messageSendHandler,
    messageReceivedHandler,
    pingHandler,
    pingCollectHandler,
    personalHandler,
    personalPushHandler,
    roomPushHandler,
    exceptRoomPushHandler,
    cidPushHandler,
    adminKickHandler,
    adminRefreshHandler,
    adminSpaceListHandler,
    adminUserListHandler,
    adminSpaceKickHandler,
    adminEnrollHandler,
    dmSpace,
    dmNoticeHandler,
    dmPushHandler,
    multiSpace,
    multiEchoHandler,
    multiNoticeHandler,
    multiWhoHandler,
    revokeSpace,
    revokeWhoHandler,
    adminRevokeRoomHandler,
    chatInfoHandler,
    earlyEchoHandler,
    earlyFailHandler,
    tickFeedHandler,
    startTicksHandler,
    feedPageHandler,
    feedCursorsHandler,
    boomHandler,
    boomPushHandler,
    adminPersonalRoomsHandler,
    adminConnectMethodsHandler,
    methodChannel,
    forbiddenChannel,
    upgradeChannel,
    upgradeSpace,
  }
}

describe('socket client runtime', () => {
  let tp: TestProjectOneClient
  let points: ReturnType<typeof buildClientPoints>

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    tp = tpf.create()
    await tp.cleanup('ports')
    await tp.init()
    await writePoints(tp)
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
    // from here on this test process acts as the browser — the spawned server child kept its own side
    process.env.POINT0_SIDE = 'client'
    points = buildClientPoints(tp.serverPort)
    // register the client points globally so reconnectAll()/disconnectAll() can resolve the client-scope manager
    ClientPoints.mount([
      points.root,
      points.chatChannel,
      points.chatSpace,
      points.userSpace,
      points.messageSendHandler,
      points.messageReceivedHandler,
      points.pingHandler,
      points.pingCollectHandler,
      points.personalHandler,
      points.personalPushHandler,
      points.roomPushHandler,
      points.exceptRoomPushHandler,
      points.cidPushHandler,
      points.adminKickHandler,
      points.adminRefreshHandler,
      points.adminSpaceListHandler,
      points.adminUserListHandler,
      points.adminSpaceKickHandler,
      points.adminEnrollHandler,
      points.dmSpace,
      points.dmNoticeHandler,
      points.dmPushHandler,
      points.multiSpace,
      points.multiEchoHandler,
      points.multiNoticeHandler,
      points.multiWhoHandler,
      points.revokeSpace,
      points.revokeWhoHandler,
      points.adminRevokeRoomHandler,
      points.chatInfoHandler,
      points.earlyEchoHandler,
      points.earlyFailHandler,
      points.tickFeedHandler,
      points.startTicksHandler,
      points.feedPageHandler,
      points.feedCursorsHandler,
      points.boomHandler,
      points.boomPushHandler,
      points.adminPersonalRoomsHandler,
      points.adminConnectMethodsHandler,
      points.methodChannel,
      points.forbiddenChannel,
      points.upgradeChannel,
      points.upgradeSpace,
    ] as never)
  })

  afterAll(async () => {
    delete process.env.POINT0_SIDE
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('connects, joins a space, exposes the rooms, sends and resolves with the serverReply', async () => {
    const connection = points.chatChannel.connect({ userId: 'c1' })
    expect(connection.status).toBe('connecting')
    await waitFor(() => connection.status === 'open')
    expect(connection.id).toBeDefined()
    // no room/data on the connection anymore — those types are gone from the facade
    expect((connection as { room?: unknown }).room).toBeUndefined()

    const membership = points.chatSpace.join({ chatId: 'c1' }, undefined, { userId: 'c1' })
    expect(membership.status).toBe('joining')
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'c1' }])

    // the per-call reply callback correlates the reply with its send: `input` rides next to `data`
    const replyProps: Array<{ input: unknown; data: unknown }> = []
    const reply = await points.messageSendHandler(membership).sendToServer(
      { text: 'hello' },
      {
        onReplyFromServer: ({ input, data }: { input: unknown; data: unknown }) =>
          void replyProps.push({ input, data }),
      },
    )
    expect(reply).toEqual({ ok: true, echo: 'hello', chatId: 'c1' })
    await waitFor(() => replyProps.length === 1)
    expect(replyProps[0]).toEqual({ input: { text: 'hello' }, data: { ok: true, echo: 'hello', chatId: 'c1' } })

    membership.leave()
    connection.disconnect()
  })

  it('a send bound to a still-joining membership queues and resolves once the join lands', async () => {
    const connection = points.chatChannel.connect({ userId: 'queue1' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'queue1' }, undefined, { userId: 'queue1' })
    // still joining — the send waits for the cascade (membership joined ⇒ connection claimed)
    expect(membership.status).toBe('joining')
    const reply = (await points.messageSendHandler(membership).sendToServer({ text: 'queued' })) as { echo: string }
    expect(reply.echo).toBe('queued')
    membership.leave()
    connection.disconnect()
  })

  it('a joiner deny is a clean join: status joined, rooms empty', async () => {
    const connection = points.chatChannel.connect({ userId: 'deny' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'denied' }, undefined, { userId: 'deny' })
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([])
    membership.leave()
    connection.disconnect()
  })

  it('memberships are held and equal input shares one membership; getMembership looks it up without holding', async () => {
    const connection = points.chatChannel.connect({ userId: 'hold' })
    await waitFor(() => connection.status === 'open')
    const first = points.chatSpace.join({ chatId: 'shared' }, undefined, { userId: 'hold' })
    await waitFor(() => first.status === 'joined')
    const second = points.chatSpace.join({ chatId: 'shared' }, undefined, { userId: 'hold' })
    // the second hold shares the joined membership immediately — no second join
    expect(second.status).toBe('joined')
    expect(second.rooms).toEqual([{ chatId: 'shared' }])

    const found = points.chatSpace.getMembership({ chatId: 'shared' }, { userId: 'hold' })
    expect(found.rooms).toEqual([{ chatId: 'shared' }])
    expect(points.chatSpace.getMembershipOrUndefined({ chatId: 'nope' }, { userId: 'hold' })).toBeUndefined()
    expect(() => points.chatSpace.getMembership({ chatId: 'nope' }, { userId: 'hold' })).toThrow('No live membership')

    second.leave()
    // the first hold keeps the membership alive
    expect(first.status).toBe('joined')
    first.leave()
    connection.disconnect()
  })

  it('the ROOM bind resolves the covering membership: messageSendHandler({ chatId }).sendToServer()', async () => {
    const connection = points.chatChannel.connect({ userId: 'sugar' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'sugar-room' }, undefined, { userId: 'sugar' })
    await waitFor(() => membership.status === 'joined')
    // the object is the ROOM, not the join input — it resolves through the client's room index
    const reply = (await points
      .messageSendHandler({ chatId: 'sugar-room' }, { userId: 'sugar' })
      .sendToServer({ text: 'via-room' })) as {
      echo: string
    }
    expect(reply.echo).toBe('via-room')

    // a room nothing joined is a client-side refusal — nothing is framed, nothing waits for a timeout
    const startedAt = Date.now()
    const error = await failureOf(() =>
      points.messageSendHandler({ chatId: 'never-joined' }, { userId: 'sugar' }).sendToServer({ text: 'nowhere' }),
    )
    expect(error?.message).toContain('No live membership covers the room bound')
    expect(Date.now() - startedAt).toBeLessThan(1000)

    membership.leave()
    connection.disconnect()
  })

  it('a multi-room membership: one send and one query cache PER ROOM, both bound by room', async () => {
    const connection = points.chatChannel.connect({ userId: 'multi' })
    await waitFor(() => connection.status === 'open')
    const membership = points.multiSpace.join({ prefix: 'mr' }, undefined, { userId: 'multi' })
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'mr-a' }, { chatId: 'mr-b' }])

    // ONE send per room — the bound room is the address, and the server sees it as the reply's `room`
    const toA = (await points.multiEchoHandler({ chatId: 'mr-a' }).sendToServer({ text: 'hey-a' })) as {
      chatId: string
    }
    const toB = (await points.multiEchoHandler({ chatId: 'mr-b' }).sendToServer({ text: 'hey-b' })) as {
      chatId: string
    }
    expect([toA.chatId, toB.chatId]).toEqual(['mr-a', 'mr-b'])

    // the membership shorthand cannot address a multi-room membership — it names no single room
    const ambiguous = await failureOf(() => points.multiEchoHandler(membership).sendToServer({ text: 'which?' }))
    expect(ambiguous?.message).toContain('spans several rooms')

    // TWO caches, one per room: the key carries the room and never the membership input
    const boundA = points.multiWhoHandler({ chatId: 'mr-a' })
    const boundB = points.multiWhoHandler({ chatId: 'mr-b' })
    const keyA = boundA.getSocketQueryKey() as [unknown, Record<string, unknown>]
    const keyB = boundB.getSocketQueryKey() as [unknown, Record<string, unknown>]
    expect(keyA[1].space).toBe('multiSpace')
    expect(keyA[1].room).toBe(JSON.stringify({ chatId: 'mr-a' }))
    expect(keyB[1].room).toBe(JSON.stringify({ chatId: 'mr-b' }))
    expect(keyA[1].membershipInput).toBeUndefined()
    expect(keyA[1].connectionInput).toBe(JSON.stringify({ userId: 'multi' }))

    const whoA = (await boundA.fetchSocketQuery()) as { chatId: string; n: number }
    const whoB = (await boundB.fetchSocketQuery()) as { chatId: string; n: number }
    expect(whoA.chatId).toBe('mr-a')
    expect(whoB.chatId).toBe('mr-b')
    // two live entries, and each room's cache serves its own repeat (staleTime)
    expect((await boundA.fetchSocketQuery()) as { n: number }).toEqual(whoA)
    expect(boundA.getSocketQueryData()).toEqual(whoA)
    expect(boundB.getSocketQueryData()).toEqual(whoB)

    membership.leave()
    connection.disconnect()
  })

  it('a ROOM-bound listener hears only its room; a membership-bound one hears both, with `room`', async () => {
    const connection = points.chatChannel.connect({ userId: 'mlisten' })
    await waitFor(() => connection.status === 'open')
    const membership = points.multiSpace.join({ prefix: 'ml' }, undefined, { userId: 'mlisten' })
    await waitFor(() => membership.status === 'joined')

    const onlyA: string[] = []
    const both: Array<{ chatId: string; room: unknown }> = []
    const boundListener = points
      .multiNoticeHandler({ chatId: 'ml-a' })
      .onMessageFromServer(({ message }: { message: { chatId: string } }) => {
        onlyA.push(message.chatId)
      })
    const membershipListener = points
      .multiNoticeHandler(membership)
      .onMessageFromServer(({ message, room }: { message: { chatId: string }; room: unknown }) => {
        both.push({ chatId: message.chatId, room })
      })

    await points.multiEchoHandler({ chatId: 'ml-a' }).sendToServer({ text: 'to-a' })
    await points.multiEchoHandler({ chatId: 'ml-b' }).sendToServer({ text: 'to-b' })
    await waitFor(() => both.length === 2)
    // a little slack: a stray delivery to the room-bound listener would have landed by now
    await new Promise((resolve) => setTimeout(resolve, 200))

    expect(onlyA).toEqual(['ml-a'])
    expect(both.map((entry) => entry.chatId).sort()).toEqual(['ml-a', 'ml-b'])
    expect(both.map((entry) => entry.room).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))).toEqual([
      { chatId: 'ml-a' },
      { chatId: 'ml-b' },
    ])

    boundListener.remove()
    membershipListener.remove()
    membership.leave()
    connection.disconnect()
  })

  it('the BARE form refuses when several live memberships of the space could be meant', async () => {
    const connection = points.chatChannel.connect({ userId: 'bare2' })
    await waitFor(() => connection.status === 'open')
    const first = points.chatSpace.join({ chatId: 'bare-one' }, undefined, { userId: 'bare2' })
    const second = points.chatSpace.join({ chatId: 'bare-two' }, undefined, { userId: 'bare2' })
    await waitFor(() => first.status === 'joined' && second.status === 'joined')

    const error = await failureOf(() => points.messageSendHandler.sendToServer({ text: 'ambiguous' }))
    expect(error?.message).toContain('Several live memberships for space chatSpace')

    first.leave()
    second.leave()
    connection.disconnect()
  })

  it('receives room pushes through onMessageFromServer and runs .clientReply for collections', async () => {
    const connection = points.chatChannel.connect({ userId: 'c3' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'c3' }, undefined, { userId: 'c3' })
    await waitFor(() => membership.status === 'joined')
    const received: unknown[] = []
    const listener = points
      .messageReceivedHandler(membership)
      .onMessageFromServer(({ message }: { message: unknown }) => {
        received.push(message)
      })
    // the server pushes to the room from messageSendHandler's reply
    await points.messageSendHandler(membership).sendToServer({ text: 'room push' })
    await waitFor(() => received.length === 1)
    expect(received[0]).toEqual({ text: 'room push', from: 'user-c3' })
    listener.remove()

    // pingCollectHandler pushes pingHandler to the room and waits for replies — this client's .clientReply answers
    const collected = (await points.pingCollectHandler(membership).sendToServer()) as { answers: string[] }
    expect(collected).toEqual({ answers: ['pong:hi'] })
    membership.leave()
    connection.disconnect()
  })

  it('.enroller: a hold-less joined membership appears from the claimed frame; a refresh re-runs the enrollment', async () => {
    const before = personalReceived.length
    const connection = points.chatChannel.connect({ userId: 'enr' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'enr-adm' })
    await waitFor(() => admin.status === 'open')

    // a push to the personal enrolled room lands — the membership was created from `enrolled`, no join ever sent
    await points.personalPushHandler(admin).sendToServer({ me: 'user-enr', text: 'first' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'first'))
    // the admin's own personal room is a different one — its push never fired the listener with this text twice
    expect(personalReceived.slice(before).filter((message) => message.text === 'first')).toHaveLength(1)

    // a server refresh re-runs the connect AND the enrollments on the fresh cid
    const oldCid = connection.id as string
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-enr' })
    await waitFor(() => connection.status === 'open' && connection.id !== oldCid)
    await points.personalPushHandler(admin).sendToServer({ me: 'user-enr', text: 'second' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'second'))

    admin.disconnect()
    connection.disconnect()
  })

  it('a room push excepting a room skips the connection that holds the excluded room', async () => {
    const a = points.chatChannel.connect({ userId: 'exr-a' })
    await waitFor(() => a.status === 'open')
    const b = points.chatChannel.connect({ userId: 'exr-b' })
    await waitFor(() => b.status === 'open')
    // A sits in BOTH rooms, B only in the pushed one
    const aShared = points.chatSpace.join({ chatId: 'exr-1' }, undefined, { userId: 'exr-a' })
    const aExcluded = points.chatSpace.join({ chatId: 'exr-2' }, undefined, { userId: 'exr-a' })
    const bShared = points.chatSpace.join({ chatId: 'exr-1' }, undefined, { userId: 'exr-b' })
    await waitFor(() => aShared.status === 'joined' && aExcluded.status === 'joined' && bShared.status === 'joined')

    const aReceived: string[] = []
    const bReceived: string[] = []
    const aListener = points
      .messageReceivedHandler(aShared)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        aReceived.push(message.text)
      })
    const bListener = points
      .messageReceivedHandler(bShared)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        bReceived.push(message.text)
      })
    await points.exceptRoomPushHandler(b).sendToServer({ chatId: 'exr-1', exceptChatId: 'exr-2', text: 'skip-a' })
    await waitFor(() => bReceived.includes('skip-a'))
    await new Promise((resolve) => setTimeout(resolve, 300))
    // A is a member of the pushed room, but it also holds the excluded room — the client runtime dropped the frame
    expect(aReceived).toEqual([])

    aListener.remove()
    bListener.remove()
    aShared.leave()
    aExcluded.leave()
    bShared.leave()
    a.disconnect()
    b.disconnect()
  })

  it('a send on a space handler with no membership started throws — the cascade does not auto-join', async () => {
    const connection = points.chatChannel.connect({ userId: 'nomem' })
    await waitFor(() => connection.status === 'open')
    // never joined chatSpace for this input — the bind has no membership to wait on
    expect(() =>
      points.messageSendHandler({ chatId: 'never-joined' }, { userId: 'nomem' }).sendToServer({ text: 'x' }),
    ).toThrow(/No (live )?membership/i)
    connection.disconnect()
  })

  it('a space kick prunes the membership rooms client-side (a `left` frame), the connection stays open', async () => {
    const connection = points.chatChannel.connect({ userId: 'sk' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'sk-adm' })
    await waitFor(() => admin.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'sk-room' }, undefined, { userId: 'sk' })
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'sk-room' }])

    await points.adminSpaceKickHandler(admin).sendToServer({ chatId: 'sk-room' })
    // the `left` frame prunes the room from the membership; the connection never closes
    await waitFor(() => membership.rooms.length === 0)
    expect(connection.status).toBe('open')

    membership.leave()
    admin.disconnect()
    connection.disconnect()
  })

  it('getSocket() reads the whole vertical: transport status, live connections and memberships, and their departure', async () => {
    const connection = points.chatChannel.connect({ userId: 'gsock' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'gsock-room' }, undefined, { userId: 'gsock' })
    await waitFor(() => membership.status === 'joined')

    const during = getSocket()
    expect(during.status).toBe('open')
    // the lists carry live facades — find ours by its cid / its input
    const listedConnection = during.connections.find((candidate) => candidate.id === connection.id)
    expect(listedConnection?.status).toBe('open')
    const listedMembership = during.memberships.find(
      (candidate) => JSON.stringify(candidate.input) === JSON.stringify({ chatId: 'gsock-room' }),
    )
    expect(listedMembership?.status).toBe('joined')
    expect(listedMembership?.rooms).toEqual([{ chatId: 'gsock-room' }])

    // released holds leave the picture after the linger
    membership.leave()
    connection.disconnect()
    await waitFor(() => !getSocket().connections.some((candidate) => candidate.id === connection.id))
    await waitFor(
      () =>
        !getSocket().memberships.some(
          (candidate) => JSON.stringify(candidate.input) === JSON.stringify({ chatId: 'gsock-room' }),
        ),
    )
  })

  it('the client refuses a join on a space with no .joiner — synchronously, nothing leaves the browser', async () => {
    const connection = points.chatChannel.connect({ userId: 'nojoin' })
    await waitFor(() => connection.status === 'open')
    // userSpace is enroller-only: its client bundle carries a bare `.enroller()` and NO `.joiner()` call at all, so
    // the client knows the join is refused without asking the server
    let thrown: ErrorPoint0 | undefined
    try {
      points.userSpace.join({ userId: 'user-victim' }, undefined, { userId: 'nojoin' })
    } catch (error) {
      thrown = error as ErrorPoint0
    }
    expect(thrown?.code).toBe(POINT0_ERROR_CODES_MAP.SOCKET_JOIN_NOT_ALLOWED)
    // nothing was registered — no membership to frame a join for, now or on a later reconnect replay
    expect(
      getSocket().memberships.some(
        (candidate) => JSON.stringify(candidate.input) === JSON.stringify({ userId: 'user-victim' }),
      ),
    ).toBe(false)
    // and the refusal comes BEFORE the connection lookup: naming a channel input nothing is connected on still
    // answers "no joiner", not "no live connection"
    let offlineThrown: ErrorPoint0 | undefined
    try {
      points.userSpace.join({ userId: 'user-victim' }, undefined, { userId: 'nobody-connected' })
    } catch (error) {
      offlineThrown = error as ErrorPoint0
    }
    expect(offlineThrown?.code).toBe(POINT0_ERROR_CODES_MAP.SOCKET_JOIN_NOT_ALLOWED)
    connection.disconnect()
  })

  it('connections.client.* / memberships.client.* read THIS client per point — enrolled memberships included', async () => {
    // scoped to this test's own connections: the client scope is shared by the whole file
    const ourConnections = (): Array<{ id: string | undefined; status: string; input: { userId: string } }> =>
      points.chatChannel.connections.client.list().filter((candidate) => candidate.input.userId.startsWith('cfloor-'))
    expect(ourConnections()).toHaveLength(0)

    const a = points.chatChannel.connect({ userId: 'cfloor-a' })
    const b = points.chatChannel.connect({ userId: 'cfloor-b' })
    await waitFor(() => a.status === 'open' && b.status === 'open')

    // two live connections of this channel, as the very facades the holders see (canonical, so compare by cid)
    expect(ourConnections()).toHaveLength(2)
    expect(
      ourConnections()
        .map((candidate) => candidate.id)
        .sort(),
    ).toEqual([a.id as string, b.id as string].sort())
    expect(ourConnections().every((candidate) => candidate.status === 'open')).toBe(true)
    // count() is the same read without the array
    expect(points.chatChannel.connections.client.count()).toBe(points.chatChannel.connections.client.list().length)

    // the ENROLLED memberships of the joiner-less userSpace are readable one by one here — no join, no input to look up
    type EnrolledMembership = { status: string; input: unknown; rooms: Array<{ userId: string }> }
    // `userSpace` is declared through the untyped `anyLets` helper here, so the facades come back loose
    const ourMemberships = (): EnrolledMembership[] =>
      (points.userSpace.memberships.client.list() as EnrolledMembership[]).filter((candidate) =>
        candidate.rooms.some((room) => room.userId.startsWith('user-cfloor-')),
      )
    await waitFor(() => ourMemberships().length === 2)
    expect(
      ourMemberships()
        .map((candidate) => candidate.rooms[0]!.userId)
        .sort(),
    ).toEqual(['user-cfloor-a', 'user-cfloor-b'])
    expect(ourMemberships().every((candidate) => candidate.status === 'joined')).toBe(true)
    // an enrollment is born from the `claimed` frame — it never joined, so its input is the empty object
    expect(ourMemberships().every((candidate) => JSON.stringify(candidate.input) === '{}')).toBe(true)

    // one connection leaves → its membership cascades out with it, and the reads shrink
    b.disconnect()
    await waitFor(() => ourConnections().length === 1)
    expect(ourConnections()[0]!.id).toBe(a.id as string)
    await waitFor(() => ourMemberships().length === 1)
    expect(ourMemberships()[0]!.rooms).toEqual([{ userId: 'user-cfloor-a' }])

    a.disconnect()
    await waitFor(() => ourConnections().length === 0)
  })

  it('space.enroll grows a hold-less enrolled membership mid-life: pushes land with no join, a kick shrinks it', async () => {
    const before = roomReceived.length
    const connection = points.chatChannel.connect({ userId: 'ien' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'ien-adm' })
    await waitFor(() => admin.status === 'open')

    // enroll the live connection into a chatSpace room it never joined — the `enrolled` frame installs the membership
    await points.adminEnrollHandler(admin).sendToServer({ me: 'user-ien', chatIds: ['ien-room'] })
    await points.roomPushHandler(admin).sendToServer({ chatId: 'ien-room', text: 'to-enrolled' })
    await waitFor(() => roomReceived.slice(before).some((message) => message.text === 'to-enrolled'))

    // the server counts the enrolled connection as a member of the room
    const listed = (await points.adminSpaceListHandler(admin).sendToServer({ chatId: 'ien-room' })) as {
      ids: string[]
    }
    expect(listed.ids).toContain(connection.id as string)

    // a space kick undoes the enrollment (the kick applies before its reply resolves) — pushes stop
    await points.adminSpaceKickHandler(admin).sendToServer({ chatId: 'ien-room' })
    await points.roomPushHandler(admin).sendToServer({ chatId: 'ien-room', text: 'after-kick' })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(roomReceived.slice(before).some((message) => message.text === 'after-kick')).toBe(false)

    admin.disconnect()
    connection.disconnect()
  })

  it('leave() on an ENROLLED membership drops its rooms server-side — the other member of the room keeps hearing it', async () => {
    const enrolled = points.chatChannel.connect({ userId: 'lvs-a' })
    const joiner = points.chatChannel.connect({ userId: 'lvs-b' })
    await waitFor(() => enrolled.status === 'open' && joiner.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'lvs-adm' })
    await waitFor(() => admin.status === 'open')
    const membersOfRoom = async (): Promise<string[]> =>
      ((await points.adminSpaceListHandler(admin).sendToServer({ chatId: 'lvs-room' })) as { ids: string[] }).ids

    // B is in the room the regular way (a join); A is ENROLLED into the same room from the server, no join behind it
    const bMembership = points.chatSpace.join({ chatId: 'lvs-room' }, undefined, { userId: 'lvs-b' })
    await waitFor(() => bMembership.status === 'joined')
    await points.adminEnrollHandler(admin).sendToServer({ me: 'user-lvs-a', chatIds: ['lvs-room'] })
    const enrollmentOfA = (): LooseMembership | undefined =>
      (points.chatSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) =>
          candidate.connection.id === enrolled.id && candidate.rooms.some((room) => room.chatId === 'lvs-room'),
      )
    await waitFor(() => enrollmentOfA() !== undefined)
    expect(await membersOfRoom()).toContain(enrolled.id as string)

    const bReceived: string[] = []
    const bListener = points
      .messageReceivedHandler(bMembership)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        bReceived.push(message.text)
      })

    // the enrollment leaves on the client's own initiative: a `leave` frame naming ITS rooms, and the facade is dead
    // right away — no hold behind it, so no linger to outwait
    const membership = enrollmentOfA()!
    membership.leave()
    expect(membership.status).toBe('closed')
    expect(enrollmentOfA()).toBeUndefined()
    // leaving twice is a no-op, not a throw (the same as a refresh that already dropped the enrollment)
    membership.leave()

    // the server dropped THIS connection from the room — and only this one
    const ids = await waitForRead(membersOfRoom, (value) => !value.includes(enrolled.id as string))
    expect(ids).toContain(joiner.id as string)
    // the room itself is untouched: the member that stayed still gets its pushes
    await points.roomPushHandler(admin).sendToServer({ chatId: 'lvs-room', text: 'after-leave' })
    await waitFor(() => bReceived.includes('after-leave'))

    bListener.remove()
    bMembership.leave()
    admin.disconnect()
    joiner.disconnect()
    enrolled.disconnect()
  })

  it('an enrolled and a joined membership share ONE room: a leave names it only when nothing else covers it', async () => {
    const connection = points.chatChannel.connect({ userId: 'lvr' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'lvr-adm' })
    await waitFor(() => admin.status === 'open')
    const membersOfRoom = async (): Promise<string[]> =>
      ((await points.adminSpaceListHandler(admin).sendToServer({ chatId: 'lvr-room' })) as { ids: string[] }).ids
    const enroll = async (): Promise<void> => {
      await points.adminEnrollHandler(admin).sendToServer({ me: 'user-lvr', chatIds: ['lvr-room'] })
    }
    // the ENROLLED membership of this connection — the joined one covering the same room carries its join input
    const enrollment = (): LooseMembership | undefined =>
      (points.chatSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) =>
          candidate.connection.id === connection.id &&
          JSON.stringify(candidate.input) === '{}' &&
          candidate.rooms.some((room) => room.chatId === 'lvr-room'),
      )

    // ONE connection, ONE room, TWO memberships: a regular join and a server enrollment
    const joined = points.chatSpace.join({ chatId: 'lvr-room' }, undefined, { userId: 'lvr' })
    await waitFor(() => joined.status === 'joined')
    await enroll()
    await waitFor(() => enrollment() !== undefined)

    const received: string[] = []
    const joinedListener = points
      .messageReceivedHandler(joined)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        received.push(message.text)
      })
    // the ENROLLMENT leaves while the join still covers the room — the server keys nothing by how a room was entered,
    // so naming it here would silence the join too: the leave frame must not carry it
    enrollment()!.leave()
    await points.roomPushHandler(admin).sendToServer({ chatId: 'lvr-room', text: 'join-still-here' })
    await waitFor(() => received.includes('join-still-here'))
    expect(await membersOfRoom()).toContain(connection.id as string)

    // the mirror: enroll again, then let the JOIN go — the enrollment covers the room, so this leave stays silent too
    await enroll()
    await waitFor(() => enrollment() !== undefined)
    const enrolledReceived: string[] = []
    const enrolledListener = points
      .messageReceivedHandler(enrollment()!)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        enrolledReceived.push(message.text)
      })
    joinedListener.remove()
    joined.leave()
    // outwait the membership linger — the dispose (and any leave frame it would send) happens at its end
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await points.roomPushHandler(admin).sendToServer({ chatId: 'lvr-room', text: 'enrollment-still-here' })
    await waitFor(() => enrolledReceived.includes('enrollment-still-here'))
    expect(await membersOfRoom()).toContain(connection.id as string)

    // nothing covers the room now — this last leave DOES name it and the server drops it
    enrollment()!.leave()
    expect(await waitForRead(membersOfRoom, (value) => !value.includes(connection.id as string))).not.toContain(
      connection.id as string,
    )
    enrolledListener.remove()
    admin.disconnect()
    connection.disconnect()
  })

  it('a left enrollment comes back on the next connection setup — a refresh re-runs the enroller', async () => {
    const before = personalReceived.length
    const connection = points.chatChannel.connect({ userId: 'lve' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'lve-adm' })
    await waitFor(() => admin.status === 'open')
    const membersOfPersonalRoom = async (): Promise<string[]> =>
      ((await points.adminUserListHandler(admin).sendToServer({ me: 'user-lve' })) as { ids: string[] }).ids

    // the personal room every connection is enrolled into by `.enroller` — pushes land with no join anywhere
    const enrollment = (): LooseMembership | undefined =>
      (points.userSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) => candidate.connection.id === connection.id,
      )
    await waitFor(() => enrollment() !== undefined)
    await points.personalPushHandler(admin).sendToServer({ me: 'user-lve', text: 'while-enrolled' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'while-enrolled'))
    expect(await membersOfPersonalRoom()).toContain(connection.id as string)

    // out — the client dropped its own enrollment; the connection stays open and the room is empty server-side
    enrollment()!.leave()
    expect(enrollment()).toBeUndefined()
    expect(connection.status).toBe('open')
    const leftCid = connection.id as string
    expect(await waitForRead(membersOfPersonalRoom, (value) => !value.includes(leftCid))).toEqual([])
    // this push reaches nobody — the assertion below is barriered by the 'after-refresh' one arriving after it
    await points.personalPushHandler(admin).sendToServer({ me: 'user-lve', text: 'while-out' })

    // a refresh re-runs the connect AND the enroller on a fresh cid — the enrollment is installed again
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-lve' })
    await waitFor(() => connection.status === 'open' && connection.id !== leftCid)
    await waitFor(() => enrollment() !== undefined)
    expect(await membersOfPersonalRoom()).toContain(connection.id as string)
    await points.personalPushHandler(admin).sendToServer({ me: 'user-lve', text: 'after-refresh' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'after-refresh'))
    expect(personalReceived.slice(before).some((message) => message.text === 'while-out')).toBe(false)

    admin.disconnect()
    connection.disconnect()
  })

  it('two memberships share ONE room: releasing one must NOT leave it — the other still holds it (client refcount)', async () => {
    const connection = points.chatChannel.connect({ userId: 'dm' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'dm-adm' })
    await waitFor(() => admin.status === 'open')
    // two different join inputs → the same room, held by two memberships
    const first = points.dmSpace.join({ a: 'x', b: 'y' }, undefined, { userId: 'dm' })
    const second = points.dmSpace.join({ a: 'y', b: 'x' }, undefined, { userId: 'dm' })
    await waitFor(() => first.status === 'joined' && second.status === 'joined')
    expect(first.rooms).toEqual([{ pair: 'x+y' }])
    expect(second.rooms).toEqual([{ pair: 'x+y' }])

    const received: string[] = []
    const listener = points
      .dmNoticeHandler(second)
      .onMessageFromServer(({ message }: { message: { text: string } }) => {
        received.push(message.text)
      })
    // release ONE of the two and outwait its linger — the room is still held, so no leave frame may go out
    first.leave()
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await points.dmPushHandler(admin).sendToServer({ pair: 'x+y', text: 'still-here' })
    await waitFor(() => received.includes('still-here'))

    // release the LAST holder — now the leave goes out and the room falls silent
    listener.remove()
    second.leave()
    await new Promise((resolve) => setTimeout(resolve, 1300))
    await points.dmPushHandler(admin).sendToServer({ pair: 'x+y', text: 'gone' })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(received.includes('gone')).toBe(false)

    admin.disconnect()
    connection.disconnect()
  })

  it('a query-flavored channel handler caches under the connection key, staleTime serves the repeat, invalidate refetches', async () => {
    const connection = points.chatChannel.connect({ userId: 'q1' })
    await waitFor(() => connection.status === 'open')
    const bound = points.chatInfoHandler(connection)

    const first = (await bound.fetchSocketQuery({ q: 'alpha' })) as { n: number; q: string; me: string }
    expect(first.q).toBe('alpha')
    expect(first.me).toBe('user-q1')

    const key = bound.getSocketQueryKey({ q: 'alpha' }) as [unknown, Record<string, unknown>]
    expect(key[1].mode).toBe('socket')
    expect(key[1].channel).toBe('chatChannel')
    const queryClient = createQueryClient()
    expect(queryClient.getQueryData<typeof first>(key as never)).toEqual(first)

    const second = (await bound.fetchSocketQuery({ q: 'alpha' })) as { n: number }
    expect(second.n).toBe(first.n)

    const other = (await bound.fetchSocketQuery({ q: 'beta' })) as { n: number }
    expect(other.n).toBe(first.n + 1)

    await bound.invalidateSocketQuery({ q: 'alpha' })
    const third = (await bound.fetchSocketQuery({ q: 'alpha' })) as { n: number }
    expect(third.n).toBeGreaterThan(other.n)

    connection.disconnect()
  })

  it('a DENIED membership drops its socket query from the CACHE — the roomful key, not the roomless one the deny leaves behind', async () => {
    // `enabled: false` stops a query from FETCHING, never from RENDERING what it already holds: without the eviction a
    // membership the server just refused keeps serving its last answer to the next identity forever. The proof has to
    // be the cache — a component that merely fell back to pending would look identical
    const connection = points.chatChannel.connect({ userId: 'rvk' })
    await waitFor(() => connection.status === 'open')
    const membership = points.revokeSpace.join({ chatId: 'rvk-room' }, undefined, { userId: 'rvk' }) as LooseMembership
    await waitFor(() => membership.status === 'joined')
    const admin = points.chatChannel.connect({ userId: 'rvkadm' })
    await waitFor(() => admin.status === 'open')

    // every assertion below sits inside the try: a failure here must not leave a live connection and a held
    // membership behind for the rest of the file (the `<Socket>` keeper waits on an idle transport)
    try {
      const bound = points.revokeWhoHandler(membership)
      // the key while the membership is still GOOD — it carries the room, the entry that must not survive
      const roomfulKey = bound.getSocketQueryKey() as [unknown, Record<string, unknown>]
      expect(roomfulKey[1].space).toBe('revokeSpace')
      expect(roomfulKey[1].room).toBe(JSON.stringify({ chatId: 'rvk-room' }))

      const queryClient = createQueryClient()
      // the cache ENTRY, rendered as `status:data` — the failure message then names what leaked instead of dumping a
      // whole `Query`; `undefined` means the entry itself is gone, which is stronger than "its data is undefined"
      const entryFor = (key: unknown): string | undefined => {
        const query = queryClient.getQueryCache().find({ queryKey: key as never, exact: true })
        return query === undefined ? undefined : query.state.status + ':' + JSON.stringify(query.state.data)
      }
      // every cached socket query still addressed at the revoked room, by handler name — the honest sweep: an entry that
      // survived under a DIFFERENT key would still be the denied room's data sitting there for the next identity
      const cachedAtRevokedRoom = (): string[] =>
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.queryKey[1] as { name?: string; room?: string } | undefined)
          .filter((meta) => meta?.room === JSON.stringify({ chatId: 'rvk-room' }))
          .map((meta) => String(meta?.name))

      await withDomGlobals(async () => {
        const Who = (): React.ReactNode => {
          const { data } = bound.useSocketQuery() as { data?: { chatId: string } }
          return React.createElement('div', null, data ? 'room:' + data.chatId : 'pending')
        }
        const view = render(
          React.createElement(QueryClientProvider, { client: queryClient as never }, React.createElement(Who)),
        )
        try {
          // the hook ran over the socket and its answer IS in the cache, under the roomful key
          await rtlWaitFor(
            () => {
              expect(queryClient.getQueryData(roomfulKey as never)).toBeDefined()
            },
            { timeout: 20_000 },
          )
          expect((queryClient.getQueryData(roomfulKey as never) as { chatId: string }).chatId).toBe('rvk-room')
          expect(cachedAtRevokedRoom()).toEqual(['revokeWhoHandler'])

          // the server revokes the room and refreshes the identity: the connect re-runs, the join is REPLAYED, and this
          // time the joiner refuses it — the membership lands in the terminal 'error'
          const oldCid = connection.id as string
          await points.adminRevokeRoomHandler(admin).sendToServer({ chatId: 'rvk-room', me: 'user-rvk' })
          await rtlWaitFor(
            () => {
              expect(membership.status).toBe('error')
            },
            { timeout: 20_000 },
          )
          expect(connection.id).not.toBe(oldCid)

          // the deny granted nothing and CLEARED the rooms, so the key this render computes carries no room at all —
          // exactly why the eviction has to drop the last key seen while the membership was still good. Evicting the
          // key of the denied render would remove an entry that never held anything (below) and leave the real one
          const roomlessKey = bound.getSocketQueryKey() as [unknown, Record<string, unknown>]
          expect(membership.rooms).toEqual([])
          expect(roomlessKey[1].room).toBeUndefined()
          expect(queryClient.getQueryData(roomlessKey as never)).toBeUndefined()

          // THE POINT: the denied membership's answer is gone from the CACHE, not merely unrendered
          await rtlWaitFor(
            () => {
              expect(cachedAtRevokedRoom()).toEqual([])
            },
            { timeout: 10_000 },
          )
          expect(entryFor(roomfulKey)).toBeUndefined()
          expect(queryClient.getQueryData(roomfulKey as never)).toBeUndefined()

          // and it stays gone — the membership is denied, so nothing re-enables the query and refetches it back
          await new Promise((resolve) => setTimeout(resolve, 500))
          expect(cachedAtRevokedRoom()).toEqual([])
        } finally {
          view.unmount()
        }
      })
    } finally {
      membership.leave()
      admin.disconnect()
      connection.disconnect()
    }
  })

  it('the socket parity surface: await-the-connect fetches, cache read/write, fuzzy ops, the mutation machinery', async () => {
    // fetchSocketQuery AWAITS the connect — fired while the connection is still connecting, it resolves once claimed
    const connection = points.chatChannel.connect({ userId: 'parity' })
    const bound = points.chatInfoHandler(connection)
    const eager = (await bound.fetchSocketQuery({ q: 'early' })) as { q: string; me: string }
    expect(eager.q).toBe('early')
    expect(eager.me).toBe('user-parity')
    expect(connection.status).toBe('open')

    // prefetch warms the cache, ensure reads it without refetching, the exact-key readers see the same entry
    await bound.prefetchSocketQuery({ q: 'warm' })
    const warm = (await bound.ensureSocketQueryData({ q: 'warm' })) as { n: number }
    expect((bound.getSocketQueryData({ q: 'warm' }) as { n: number }).n).toBe(warm.n)
    expect((bound.getSocketQueryState({ q: 'warm' }) as { status: string }).status).toBe('success')
    expect(bound.getSocketQueryCache({ q: 'warm' })).toBeDefined()
    expect((bound.getSocketQueriesCache(true) as unknown[]).length).toBeGreaterThanOrEqual(2)

    // the resolved options carry the socket key and the always-threaded ssr: false
    const options = bound.getSocketQueryOptions({ q: 'warm' }) as {
      ssr: boolean
      queryKey: [unknown, { mode: string }]
    }
    expect(options.ssr).toBe(false)
    expect(options.queryKey[1].mode).toBe('socket')

    // setSocketQueryData writes exact-key; removeSocketQuery drops the entry; the fuzzy forms sweep
    bound.setSocketQueryData({ q: 'warm' }, () => ({ n: 999, q: 'warm', me: 'x' }))
    expect((bound.getSocketQueryData({ q: 'warm' }) as { n: number }).n).toBe(999)
    bound.removeSocketQuery({ q: 'warm' })
    expect(bound.getSocketQueryData({ q: 'warm' })).toBeUndefined()
    await bound.refetchSocketQuery(true)
    await bound.cancelSocketQuery(true)
    await bound.resetSocketQuery((input: { q: string }) => input.q === 'early')

    // fetchSocketMutation rides the mutation cache machinery — the plain sendToServer bypasses it
    const membership = points.chatSpace.join({ chatId: 'parity' }, undefined, { userId: 'parity' })
    const sendBound = points.messageSendHandler(membership)
    // fired while the membership is still joining — the send queues until the join lands
    const reply = (await sendBound.fetchSocketMutation({ text: 'via-mutation' })) as { ok: boolean; echo: string }
    expect(reply.echo).toBe('via-mutation')
    const mutationKey = sendBound.getSocketMutationKey() as [unknown, { name: string }]
    expect(mutationKey[1].name).toBe('messageSendHandler')
    expect(sendBound.getSocketMutationCache({ text: 'via-mutation' })).toBeDefined()
    expect((sendBound.getSocketMutationsCache(true) as unknown[]).length).toBeGreaterThanOrEqual(1)

    membership.leave()
    connection.disconnect()
  })

  it('an UNSENT queued send fails immediately when its connection closes — no dangling until the send timeout', async () => {
    const connection = points.chatChannel.connect({ userId: 'dispose-queue' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'dispose-queue' }, undefined, { userId: 'dispose-queue' })
    // still joining — the send queues, waiting for the join that disconnectAll will cancel
    const startedAt = Date.now()
    const promise = points.messageSendHandler(membership).sendToServer({ text: 'never' })
    disconnectAll()
    // the TYPED connection-lost refusal, not just any throw — a generic error would hide a send that merely timed out
    const error = (await promise.then(
      () => undefined,
      (reason: unknown) => reason as ErrorPoint0,
    )) as ErrorPoint0 | undefined
    expect(error).toBeDefined()
    expect(error?.code).toBe(POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_LOST)
    expect(error?.message).toMatch(/connection is not available/i)
    expect(Date.now() - startedAt).toBeLessThan(3000)
    reconnectAll()
    connection.disconnect()
  })

  it('a disposed membership fails its UNSENT queued sends NOW — no dangling until the send timeout', async () => {
    const connection = points.chatChannel.connect({ userId: 'mdisp' })
    await waitFor(() => connection.status === 'open')
    // the slow joiner keeps the join in flight; `linger: 0` makes the release dispose the membership at once
    const membership = points.chatSpace.join({ chatId: 'slow-mdisp' }, { linger: 0 }, { userId: 'mdisp' })
    expect(membership.status).toBe('joining')
    const startedAt = Date.now()
    const promise = points.messageSendHandler(membership).sendToServer({ text: 'never' })
    membership.leave()
    const error = (await promise.then(
      () => undefined,
      (reason: unknown) => reason as ErrorPoint0,
    )) as ErrorPoint0 | undefined
    expect(error?.code).toBe(POINT0_ERROR_CODES_MAP.SOCKET_CONNECTION_LOST)
    expect(error?.message).toMatch(/connection is not available/i)
    // the dispose failed it — nowhere near the 5000ms send window (nor the 800ms the joiner still owes)
    expect(Date.now() - startedAt).toBeLessThan(500)
    // the connection itself is untouched: a channel handler still answers on it
    const reply = (await points.earlyEchoHandler(connection).sendToServer({ text: 'alive' })) as { echo: string }
    expect(reply.echo).toBe('early:alive')
    connection.disconnect()
  })

  it('an imperative reply() resolves the client at reply time — the handler keeps its long tail server-side', async () => {
    const connection = points.chatChannel.connect({ userId: 'early1' })
    await waitFor(() => connection.status === 'open')
    const startedAt = Date.now()
    const reply = (await points.earlyEchoHandler(connection).sendToServer({ text: 'job' })) as { echo: string }
    expect(reply.echo).toBe('early:job')
    // the handler's tail sleeps 1200ms — resolving well under that proves the envelope left at reply()
    expect(Date.now() - startedAt).toBeLessThan(1000)
    connection.disconnect()
  })

  it('reply(Error) rejects the pending send with the typed error — the imperative refusal', async () => {
    const connection = points.chatChannel.connect({ userId: 'earlyerr' })
    await waitFor(() => connection.status === 'open')
    await expect(points.earlyFailHandler(connection).sendToServer({ text: 'x' })).rejects.toThrow('Transcode failed: x')
    connection.disconnect()
  })

  it('the LLM pattern: a mutation starts the job, the pushes stream through iterateMessagesFromServer', async () => {
    const connection = points.chatChannel.connect({ userId: 'feed' })
    await waitFor(() => connection.status === 'open')
    const ticks: number[] = []
    const iterator = points.tickFeedHandler(connection).iterateMessagesFromServer() as AsyncGenerator<{ i: number }>
    const consumed = (async () => {
      for await (const message of iterator) {
        ticks.push(message.i)
        if (ticks.length >= 3) {
          break // breaking out detaches the listener — later pushes stay unconsumed
        }
      }
    })()
    const started = await points.startTicksHandler(connection).sendToServer({ count: 5 })
    expect(started).toEqual({ started: true })
    await consumed
    expect(ticks).toEqual([1, 2, 3])
    connection.disconnect()
  })

  it('iterateMessagesFromServer ends when the connection closes for good', async () => {
    const connection = points.chatChannel.connect({ userId: 'feed-close' })
    await waitFor(() => connection.status === 'open')
    let ended = false
    const iterator = points.tickFeedHandler(connection).iterateMessagesFromServer() as AsyncGenerator<{ i: number }>
    const consumed = (async () => {
      for await (const message of iterator) {
        void message
      }
      ended = true
    })()
    // no pushes in flight — the iterator parks; an imperative disconnect closes the target for good
    await new Promise((resolve) => setTimeout(resolve, 100))
    connection.disconnect()
    await consumed
    expect(ended).toBe(true)
  })

  it('a server error in .serverReply rejects the send with the typed error', async () => {
    const connection = points.chatChannel.connect({ userId: 'c5' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'c5' }, undefined, { userId: 'c5' })
    await waitFor(() => membership.status === 'joined')
    // empty text fails the .clientSend schema on the server
    await expect(points.messageSendHandler(membership).sendToServer({ text: '' })).rejects.toThrow()
    membership.leave()
    connection.disconnect()
  })

  it('an IMPERATIVE kicked connection stays closed; reconnectAll revives it and REPLAYS the join', async () => {
    const victim = points.chatChannel.connect({ userId: 'kv' })
    await waitFor(() => victim.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'kv' }, undefined, { userId: 'kv' })
    await waitFor(() => membership.status === 'joined')
    const admin = points.chatChannel.connect({ userId: 'kadm' })
    await waitFor(() => admin.status === 'open')

    await points.adminKickHandler(admin).sendToServer({ me: 'user-kv' })
    await waitFor(() => victim.status === 'closed')
    // the membership follows its connection down
    await waitFor(() => membership.status === 'closed')

    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(victim.status).toBe('closed')

    admin.disconnect()

    // reconnectAll revives the connection with a fresh id AND replays the held membership's join
    reconnectAll()
    await waitFor(() => victim.status === 'open')
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'kv' }])
    const reply = await points.messageSendHandler(membership).sendToServer({ text: 'back' })
    expect(reply).toMatchObject({ ok: true, echo: 'back' })

    disconnectAll()
    await waitFor(() => victim.status === 'closed')
    reconnectAll()
    membership.leave()
    victim.disconnect()
  })

  it('a DECLARATIVE kicked connection auto-revives through the reconnect policy and replays the join', async () => {
    // the use-hook path without React: connectToChannel/joinSpace with the declarative flag is exactly what
    // useConnection/useMembership call — "stay connected while mounted"
    const victim = connectToChannel(points.chatChannel.point as never, { userId: 'akv' }, undefined, {
      declarative: true,
    })
    await waitFor(() => victim.status === 'open')
    const firstCid = victim.id
    const membership = joinSpace(
      points.chatSpace.point as never,
      { chatId: 'akv' },
      undefined,
      { userId: 'akv' },
      undefined,
      { declarative: true },
    )
    await waitFor(() => membership.status === 'joined')
    const admin = points.chatChannel.connect({ userId: 'akadm' })
    await waitFor(() => admin.status === 'open')

    await points.adminKickHandler(admin).sendToServer({ me: 'user-akv' })
    // the kick interrupts, the declarative hold comes back on its own — a fresh cid, the join replayed
    await waitFor(() => victim.status === 'open' && victim.id !== firstCid)
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'akv' }])
    const reply = await points.messageSendHandler(membership).sendToServer({ text: 'revived' })
    expect(reply).toMatchObject({ ok: true, echo: 'revived' })

    membership.leave()
    victim.disconnect()
    admin.disconnect()
    await waitFor(() => victim.status === 'closed')
  })

  it('a kick landing while a join is IN FLIGHT closes the membership cleanly — no dangling joining, no crash', async () => {
    const connection = points.chatChannel.connect({ userId: 'kj' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'kj-adm' })
    await waitFor(() => admin.status === 'open')
    // the slow joiner keeps the join in flight while the kick lands
    const membership = points.chatSpace.join({ chatId: 'slow-kj' }, undefined, { userId: 'kj' })
    expect(membership.status).toBe('joining')
    await points.adminKickHandler(admin).sendToServer({ me: 'user-kj' })
    // the connection dies mid-join; the IMPERATIVE membership follows it down — never stuck in 'joining'
    await waitFor(() => membership.status === 'closed')
    expect(connection.status).toBe('closed')
    membership.leave()
    admin.disconnect()
    connection.disconnect()
  })

  it('a send queued behind a DENIED connect fails promptly with the TYPED connector error, not a generic timeout', async () => {
    const connection = points.chatChannel.connect({ userId: 'banned' })
    // queued while 'connecting'; the connector answers a deny → the queue fails NOW with that error
    const startedAt = Date.now()
    const promise = points.earlyEchoHandler(connection).sendToServer({ text: 'x' })
    await expect(promise).rejects.toThrow(/banned/)
    // well under the 5s send window — the deny failed it, not the timer
    expect(Date.now() - startedAt).toBeLessThan(3000)
    expect(connection.status).toBe('error')
    connection.disconnect()
  })

  it('a send gated on a membership whose join was DENIED fails promptly with the TYPED join error', async () => {
    const connection = points.chatChannel.connect({ userId: 'jf' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'hard-denied' }, undefined, { userId: 'jf' })
    const startedAt = Date.now()
    const promise = points.messageSendHandler(membership).sendToServer({ text: 'x' })
    await expect(promise).rejects.toThrow(/hard denied/)
    expect(Date.now() - startedAt).toBeLessThan(3000)
    expect(membership.status).toBe('error')
    membership.leave()
    connection.disconnect()
  })

  it('a TRANSPORT-failed connect with an IMPERATIVE-only hold fails its queued sends immediately — no retry is scheduled', async () => {
    // the failure-matrix row: a connect failure WITHOUT a server answer is transport, and only DECLARATIVE holds
    // retry it through the policy — an imperative-only hold schedules nothing, so the queue must fail NOW with the
    // transport error, not dangle until the 5s send window
    const connection = points.deadChannel.connect()
    const startedAt = Date.now()
    const promise = points.deadEchoHandler(connection).sendToServer({ text: 'x' })
    await expect(promise).rejects.toThrow()
    expect(Date.now() - startedAt).toBeLessThan(3000)
    expect(connection.status).toBe('error')
    connection.disconnect()
  })

  it('queue: false fails fast while the connection is still connecting — no waiting on the cascade', async () => {
    const connection = points.chatChannel.connect({ userId: 'qf' })
    expect(connection.status).toBe('connecting')
    await expect(points.earlyEchoHandler(connection).sendToServer({ text: 'x' }, { queue: false })).rejects.toThrow(
      /connection is not available/i,
    )
    connection.disconnect()
  })

  it('a connector deny with preventRetry travels the wire and marks the connection error', async () => {
    const banned = connectToChannel(points.chatChannel.point as never, { userId: 'banned' }, undefined, {
      declarative: true,
    })
    await waitFor(() => banned.status === 'error')
    expect(banned.error?.message).toBe('banned')
    expect(banned.error?.preventRetry).toBe(true)
    banned.disconnect()
  })

  it('a join denied with preventRetry is NOT replayed on a refresh cycle; a normal membership is', async () => {
    const connection = connectToChannel(points.chatChannel.point as never, { userId: 'hd' }, undefined, {
      declarative: true,
    })
    await waitFor(() => connection.status === 'open')
    const good = joinSpace(
      points.chatSpace.point as never,
      { chatId: 'hd-good' },
      undefined,
      { userId: 'hd' },
      undefined,
      {
        declarative: true,
      },
    )
    await waitFor(() => good.status === 'joined')
    const denied = joinSpace(
      points.chatSpace.point as never,
      { chatId: 'hard-denied' },
      undefined,
      { userId: 'hd' },
      undefined,
      { declarative: true },
    )
    await waitFor(() => denied.status === 'error')
    expect(denied.error?.preventRetry).toBe(true)

    // a server refresh re-runs the connect and replays the joins — the hard-denied one must sit out
    const admin = points.chatChannel.connect({ userId: 'hdadm' })
    await waitFor(() => admin.status === 'open')
    const oldCid = connection.id
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-hd' })
    await waitFor(() => connection.id !== oldCid && connection.status === 'open')
    // the good membership replayed on the fresh cid; the denied one stayed errored, no join was resent
    await waitFor(() => good.status === 'joined')
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(denied.status).toBe('error')

    good.leave()
    denied.leave()
    connection.disconnect()
    admin.disconnect()
  })

  it('membership lifecycle: onEnter on EVERY landed join — index 0 first, 1 on the replay — onLeave on close', async () => {
    const events: string[] = []
    const connection = points.chatChannel.connect({ userId: 'lc' })
    await waitFor(() => connection.status === 'open')
    expect(connection.connectionIndex).toBe(1)
    const membership = points.chatSpace.join(
      { chatId: 'lc' },
      {
        linger: 0,
        onEnter: ({ membershipIndex }: { membershipIndex: number }) => events.push('enter:' + membershipIndex),
        onLeave: ({ membershipIndex }: { membershipIndex: number }) => events.push('leave:' + membershipIndex),
      },
      { userId: 'lc' },
    )
    await waitFor(() => membership.status === 'joined')
    expect(events).toEqual(['enter:0'])
    expect(membership.membershipIndex).toBe(1)

    // a SECOND hold of the same membership with its own callbacks — released BEFORE the replay: its callbacks must
    // NOT fire afterwards (a released holder's component unmounted, its closures are stale)
    const staleEvents: string[] = []
    const secondHold = points.chatSpace.join(
      { chatId: 'lc' },
      { onEnter: () => staleEvents.push('stale-enter'), onLeave: () => staleEvents.push('stale-leave') },
      { userId: 'lc' },
    )
    await waitFor(() => secondHold.status === 'joined')
    secondHold.leave() // released — the membership itself lives on (the first hold keeps it)

    // a server refresh re-runs the connect and replays the join — the replayed join fires onEnter with index 1
    const admin = points.chatChannel.connect({ userId: 'lcadm' })
    await waitFor(() => admin.status === 'open')
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-lc' })
    await waitFor(() => events.includes('enter:1'))
    expect(membership.membershipIndex).toBe(2)
    expect(connection.connectionIndex).toBe(2)
    // the released second holder saw nothing
    expect(staleEvents).toEqual([])

    membership.leave()
    await waitFor(() => events.some((event) => event.startsWith('leave:')))
    expect(events).toEqual(['enter:0', 'enter:1', 'leave:2'])
    // the final leaver got its onLeave (through lastReleasedHold); the earlier-released holder still saw nothing
    expect(staleEvents).toEqual([])
    connection.disconnect()
    admin.disconnect()
  })

  it('a server refresh re-runs the connect with a new cid and the client REPLAYS its joins automatically', async () => {
    const connection = points.chatChannel.connect({ userId: 'refc' })
    await waitFor(() => connection.status === 'open')
    const membership = points.chatSpace.join({ chatId: 'refc' }, undefined, { userId: 'refc' })
    await waitFor(() => membership.status === 'joined')
    const oldCid = connection.id as string
    const admin = points.chatChannel.connect({ userId: 'refadm' })
    await waitFor(() => admin.status === 'open')

    const received: string[] = []
    const listener = points
      .messageReceivedHandler(membership)
      .onMessageFromServer(({ message }: { message: unknown }) => {
        received.push((message as { text: string }).text)
      })

    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-refc' })
    // the connection re-POSTs and claims a new cid; the membership re-joins on the fresh cid (replay), status returns
    await waitFor(() => connection.status === 'open' && connection.id !== oldCid)
    await waitFor(() => membership.status === 'joined')
    expect(membership.rooms).toEqual([{ chatId: 'refc' }])

    // a push aimed at the OLD cid never arrives; a room push reaches the replayed membership
    await points.cidPushHandler(admin).sendToServer({ cid: oldCid, text: 'to-old' })
    await points.roomPushHandler(admin).sendToServer({ chatId: 'refc', text: 'to-room' })
    await waitFor(() => received.includes('to-room'))
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(received).not.toContain('to-old')

    // exactly one server-side connection is in the room after the refresh — no ghost
    const listed = (await points.adminSpaceListHandler(admin).sendToServer({ chatId: 'refc' })) as { ids: string[] }
    expect(listed.ids).toEqual([connection.id as string])

    listener.remove()
    membership.leave()
    admin.disconnect()
    connection.disconnect()
  })

  it('cold-start upgrade-connect falls back to the ticket path when the connector refuses — the typed error surfaces', async () => {
    // no socket exists yet for forbiddenChannel and the connect opted in (`upgradable`): the client opens the
    // WebSocket straight against the channel endpoint (GET+Upgrade). The connector throws, so the handshake fails;
    // the client falls back to the ticket-path fetch, which answers the typed error — the connection ends up
    // errored/closed, never open.
    const connection = points.forbiddenChannel.connect({ userId: 'nope' }, { upgradable: true })
    await waitFor(() => connection.status === 'error' || connection.status === 'closed')
    expect(connection.status).not.toBe('open')
    expect(connection.error?.message).toContain('Access denied')
    connection.disconnect()
  })

  it('connection lifecycle: onConnect on EVERY landed claim — index 0, then 1 on a refresh (no onDisconnect) — a kick fires onDisconnect', async () => {
    const events: string[] = []
    const record =
      (name: string) =>
      ({ connectionIndex }: { connectionIndex: number }) =>
        void events.push(name + ':' + connectionIndex)
    const connection = points.chatChannel.connect(
      { userId: 'lifec' },
      {
        onConnect: record('connect'),
        onDisconnect: record('disconnect'),
        onError: record('error'),
      },
    )
    await waitFor(() => connection.status === 'open')
    // the counter reads how many successful claims came BEFORE this one — the first connect fires with 0
    await waitFor(() => events.length === 1)
    expect(events).toEqual(['connect:0'])
    expect(connection.connectionIndex).toBe(1)

    // a server refresh re-runs the connect with the socket still up: that is a RE-connect, not a drop — no
    // onDisconnect, just the next onConnect with index 1
    const admin = points.chatChannel.connect({ userId: 'lifec-adm' })
    await waitFor(() => admin.status === 'open')
    const oldCid = connection.id as string
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-lifec' })
    await waitFor(() => connection.status === 'open' && connection.id !== oldCid)
    await waitFor(() => events.length === 2)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(events).toEqual(['connect:0', 'connect:1'])
    expect(connection.connectionIndex).toBe(2)

    // a kick DOES drop the connection — onDisconnect, with the two claims it had behind it
    await points.adminKickHandler(admin).sendToServer({ me: 'user-lifec' })
    await waitFor(() => connection.status === 'closed')
    await waitFor(() => events.length === 3)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(events).toEqual(['connect:0', 'connect:1', 'disconnect:2'])

    admin.disconnect()
    connection.disconnect()
  })

  it('a call-site `linger` applies to the release that resolves it — the connection goes down on ITS timer', async () => {
    // the resolved options are read BEFORE the hold is deleted, so the released call site's own linger still counts;
    // with the default 1000ms in its place this connection would still be open when the deadline below expires
    const connection = points.chatChannel.connect({ userId: 'ling' }, { linger: 100 })
    await waitFor(() => connection.status === 'open')
    const startedAt = Date.now()
    connection.disconnect()
    await waitFor(() => connection.status === 'closed')
    expect(Date.now() - startedAt).toBeLessThan(700)
  })

  it('iterateMessagesFromServer PARKS through a kick and resumes on the auto-revive; the release ends it', async () => {
    // a DECLARATIVE hold: the kick only interrupts — the reconnect policy brings the connection back on its own, so
    // the loop must not treat the transient close as the end of the feed
    const victim = connectToChannel(points.chatChannel.point as never, { userId: 'iterkick' }, undefined, {
      declarative: true,
    })
    await waitFor(() => victim.status === 'open')
    const firstCid = victim.id
    const admin = points.chatChannel.connect({ userId: 'iterkick-adm' })
    await waitFor(() => admin.status === 'open')

    const ticks: number[] = []
    let ended = false
    const iterator = points.tickFeedHandler(victim).iterateMessagesFromServer() as AsyncGenerator<{ i: number }>
    const consumed = (async () => {
      for await (const message of iterator) {
        ticks.push(message.i)
      }
      ended = true
    })()

    await points.startTicksHandler(victim).sendToServer({ count: 1 })
    await waitFor(() => ticks.length === 1)

    await points.adminKickHandler(admin).sendToServer({ me: 'user-iterkick' })
    await waitFor(() => victim.status === 'open' && victim.id !== firstCid)
    expect(ended).toBe(false)

    // the revived connection is a fresh cid — the listener rode the revive, so the feed keeps landing in the loop
    await points.startTicksHandler(victim).sendToServer({ count: 2 })
    await waitFor(() => ticks.length === 3)
    expect(ticks).toEqual([1, 1, 2])
    expect(ended).toBe(false)

    // releasing the hold closes it FOR GOOD — nothing revives it, so the loop ends
    victim.disconnect()
    await consumed
    expect(ended).toBe(true)
    admin.disconnect()
  })

  it('an upgrade-connect refused AFTER the handshake falls back at once — no wait on the upgrade timeout', async () => {
    // the fallback needs the shared socket down, or the upgrade path is not even attempted
    await waitFor(() => getSocket().status !== 'open')
    const events = recordSocketEvents()
    // the connector admits and the handshake succeeds, so the refusal (a throwing enroller) answers a claimErr on a
    // cid the client never learned: resolving the upgrade attempt right there is what keeps this under the 5000ms
    // the `upgradeTimeout` guard — the ticket-path retry then surfaces the typed error
    const startedAt = Date.now()
    const connection = points.upgradeChannel.connect({ userId: 'cursed' }, { upgradable: true })
    try {
      await waitFor(() => connection.status === 'error', 8000)
      expect(connection.error?.message).toContain('enrollment refused')
      expect(Date.now() - startedAt).toBeLessThan(3000)
      // ONE attempt, ONE family: the upgrade and the ticket-path fallback are two ways to reach the same claim, so the
      // hand-over opens no second `Start` and the refusal settles the one that is open — exactly once
      const channelId = idOf(points.upgradeChannel)
      await waitFor(() => phasesOf(events, 'pointChannelConnectClient', channelId).length === 3)
      expect(phasesOf(events, 'pointChannelConnectClient', channelId)).toEqual(['Start', 'Settled', 'Error'])
    } finally {
      connection.disconnect()
      stopRecordingSocketEvents()
    }
  })

  it('a claim refused AFTER a successful connect request settles the family with Error — the ticket announced nothing', async () => {
    const events = recordSocketEvents()
    // the plain ticket path, no upgrade: the connector ADMITS, so the POST answers a cid and a ticket — and the
    // `.enroller` then throws at the claim (its own `cursed*` identity, so this connect is not the previous test's
    // still-lingering one). The family settles at the CLAIM, so the successful request announces nothing at all and
    // the refusal is what closes it: no `Success` was ever emitted for a connection that never went live (before the
    // settle moved to the claim, this attempt reported Settled/Success and the refusal was silent)
    const connection = points.upgradeChannel.connect({ userId: 'cursed-ticket' })
    try {
      const channelId = idOf(points.upgradeChannel)
      await waitFor(() => connection.status === 'error', 8000)
      await waitFor(() => phasesOf(events, 'pointChannelConnectClient', channelId).length === 3)
      expect(phasesOf(events, 'pointChannelConnectClient', channelId)).toEqual(['Start', 'Settled', 'Error'])
      const refused = eventOf(events, 'pointChannelConnectClientError', channelId)
      expect((refused?.data.error as ErrorPoint0 | undefined)?.message).toContain('enrollment refused')
      // a claim refusal is an error phase like any other: the counter, the typed error, and no entry to describe —
      // the cid the ticket named never became a connection
      expect(refused?.data.connectionId).toBeUndefined()
      expect(refused?.data.connectionIndex).toBe(0)
      expect(refused?.data.resumed).toBeUndefined()
      expect(refused?.data.gapless).toBeUndefined()
    } finally {
      connection.disconnect()
      stopRecordingSocketEvents()
    }
  })

  it('a half-open socket trips the client liveness deadline: the client closes it itself and reconnects', async () => {
    // the deadline rides the ping interval, which is armed from the FIRST held connection when the socket opens —
    // so this test needs a socket of its own, opened with a tiny `ping`: wait the previous one all the way out
    await waitFor(() => getSocket().status === 'idle', 15_000)
    const { created, restore } = trackWebSockets()
    try {
      // the lifecycle callbacks are what the app sees here — the drop-and-return is far too quick on localhost to
      // catch by polling `status`
      const events: string[] = []
      const connection = points.chatChannel.connect(
        { userId: 'halfopen' },
        {
          ping: 60,
          onDisconnect: () => void events.push('disconnect'),
          onConnect: ({ connectionIndex }: { connectionIndex: number }) =>
            void events.push('connect:' + connectionIndex),
        },
      )
      await waitFor(() => connection.status === 'open')
      expect(created.length).toBe(1)
      const firstCid = connection.id

      // What a half-open connection (a NAT timeout, a slept machine) looks like from the client: the socket is still
      // OPEN, the sends still succeed, and nothing ever arrives — the pongs the live server keeps writing stop
      // reaching the runtime. Nothing else can tell the client its pushes are being lost.
      created[0].onmessage = () => {}

      // two unanswered pings later the client stops believing the socket and closes it — from HERE, without waiting
      // for TCP — and the standard close path takes over: onDisconnect, a second socket, a re-connect (the onConnect
      // with connectionIndex > 0)
      await waitFor(() => events.includes('disconnect'), 5000)
      expect(created[0].readyState).toBeGreaterThan(1)
      await waitFor(() => created.length >= 2 && events.includes('connect:1'), 5000)

      // the fresh socket is not muted: the connection is rebuilt (a new cid, the connector re-ran) and works again
      await waitFor(() => connection.status === 'open', 10_000)
      expect(connection.id).not.toBe(firstCid)
      const reply = await points.personalPushHandler(connection).sendToServer({ me: 'user-halfopen', text: 'back' })
      expect(reply).toEqual({ ok: true })

      connection.disconnect()
      // leave no 60ms ping timer running behind this test
      await waitFor(() => getSocket().status === 'idle', 15_000)
    } finally {
      restore()
    }
  })

  it('an infinite-flavored socket query folds the page cursor into the message input — ONE send per page', async () => {
    const connection = points.chatChannel.connect({ userId: 'inf' })
    await waitFor(() => connection.status === 'open')
    const bound = points.feedPageHandler(connection)
    const cursorsSeen = async (q: string): Promise<string[]> =>
      ((await points.feedCursorsHandler(connection).sendToServer({ q })) as { cursors: string[] }).cursors

    // the infinite twin of the finite key: same connection scoping, `finiteness: 'infinite'` — and the cursor is NOT
    // in it, because it belongs to a PAGE, not to the query
    const key = bound.getSocketInfiniteQueryKey({ q: 'infa' }) as [unknown, Record<string, unknown>]
    expect(key[1].mode).toBe('socket')
    expect(key[1].finiteness).toBe('infinite')
    expect(key[1].channel).toBe('chatChannel')
    expect(key[1].input).toBe(JSON.stringify({ q: 'infa' }))

    // ONE page = ONE send, and the cursor rode the message input under the flavor's `pageParamFromInput` key
    const firstPage = (await bound.fetchSocketInfiniteQuery({ q: 'infa' })) as {
      pages: Array<{ q: string; cursor: number }>
      pageParams: unknown[]
    }
    expect(firstPage.pages.map((page) => page.cursor)).toEqual([0])
    expect(firstPage.pageParams).toEqual([0])
    expect(await cursorsSeen('infa')).toEqual(['infa:0'])

    // three pages: the cursor walks `getNextPageParam` from `initialPageParam`, and the server counts exactly three
    // sends — no page rides on another page's message
    const options = bound.getSocketInfiniteQueryOptions({ q: 'infb' }) as Record<string, unknown>
    const allPages = (await createQueryClient().fetchInfiniteQuery({ ...options, pages: 3 } as never)) as {
      pages: Array<{ cursor: number; nextCursor: number | null }>
      pageParams: unknown[]
    }
    expect(allPages.pages.map((page) => page.cursor)).toEqual([0, 1, 2])
    expect(allPages.pageParams).toEqual([0, 1, 2])
    // the last page ends the walk, so a fourth send never went out
    expect(allPages.pages.at(-1)?.nextCursor).toBeNull()
    expect(await cursorsSeen('infb')).toEqual(['infb:0', 'infb:1', 'infb:2'])

    connection.disconnect()
  })

  it('the client event families run Start → Settled → Success: the connect, the join, a handler dispatch', async () => {
    const events = recordSocketEvents()
    try {
      const channelId = idOf(points.chatChannel)
      const connection = points.chatChannel.connect({ userId: 'evh' })
      await waitFor(() => connection.status === 'open')
      const cid = connection.id as string
      await waitFor(() => phasesOf(events, 'pointChannelConnectClient', channelId).length === 3)
      expect(phasesOf(events, 'pointChannelConnectClient', channelId)).toEqual(['Start', 'Settled', 'Success'])
      // the CLIENT family is the connect the app asked for, settled by the CLAIM that made it live: the input it
      // asked with and the cid that answered — the identity is the server family's, it never leaves the server
      const connectSuccess = eventOf(events, 'pointChannelConnectClientSuccess', channelId)
      expect(connectSuccess?.side).toBe('client')
      expect(connectSuccess?.data.input).toEqual({ userId: 'evh' })
      expect(connectSuccess?.data.connectionId).toBe(cid)
      expect(connectSuccess?.data.error).toBeUndefined()
      expect(connectSuccess?.data.identity).toBeUndefined()
      // the lifecycle counter and the entry markers, mirroring the `onConnect` props: a first connect is index 0,
      // not a resume, provably gapless
      expect(connectSuccess?.data.connectionIndex).toBe(0)
      expect(connectSuccess?.data.resumed).toBe(false)
      expect(connectSuccess?.data.gapless).toBe(true)
      // `Start` is the pre-answer phase — there is no cid to carry yet, but the index is already known
      expect(eventOf(events, 'pointChannelConnectClientStart', channelId)?.data.connectionId).toBeUndefined()
      expect(eventOf(events, 'pointChannelConnectClientStart', channelId)?.data.connectionIndex).toBe(0)

      const spaceId = idOf(points.chatSpace)
      const membership = points.chatSpace.join({ chatId: 'evh' }, undefined, { userId: 'evh' })
      await waitFor(() => membership.status === 'joined')
      await waitFor(() => phasesOf(events, 'pointSpaceJoinClient', spaceId).length === 3)
      expect(phasesOf(events, 'pointSpaceJoinClient', spaceId)).toEqual(['Start', 'Settled', 'Success'])
      const joinSuccess = eventOf(events, 'pointSpaceJoinClientSuccess', spaceId)
      expect(joinSuccess?.data.input).toEqual({ chatId: 'evh' })
      expect(joinSuccess?.data.connectionId).toBe(cid)
      expect(joinSuccess?.data.rooms).toEqual([{ chatId: 'evh' }])
      expect(joinSuccess?.data.identity).toBeUndefined()
      // same counter/marker set as `onEnter`: first join — index 0, not a resume, gapless
      expect(joinSuccess?.data.membershipIndex).toBe(0)
      expect(joinSuccess?.data.resumed).toBe(false)
      expect(joinSuccess?.data.gapless).toBe(true)
      expect(eventOf(events, 'pointSpaceJoinClientStart', spaceId)?.data.membershipIndex).toBe(0)

      // the handler family fires on the RECEIVING side, around the auto-responder: pingCollectHandler pushes
      // pingHandler into the room and this client's `.clientReply` answers it
      const pingId = idOf(points.pingHandler)
      const collected = (await points.pingCollectHandler(membership).sendToServer()) as { answers: string[] }
      expect(collected.answers).toEqual(['pong:hi'])
      await waitFor(() => phasesOf(events, 'pointHandlerClient', pingId).length === 3)
      expect(phasesOf(events, 'pointHandlerClient', pingId)).toEqual(['Start', 'Settled', 'Success'])
      const handlerSuccess = eventOf(events, 'pointHandlerClientSuccess', pingId)
      // `input` is the pushed message, `output` the `.clientReply` that answered it
      expect(handlerSuccess?.data.input).toEqual({ ask: 'hi' })
      expect(handlerSuccess?.data.output).toEqual({ answer: 'pong:hi' })
      expect(handlerSuccess?.data.connectionId).toBe(cid)

      // …and the TRANSPORT family of the send that started all this — the other altitude: `pointHandlerClient*` is the
      // dispatch this client RAN, `pointHandlerSendClient*` is the send this client TRANSMITTED, closed by the
      // server's reply
      const collectId = idOf(points.pingCollectHandler)
      await waitFor(() => phasesOf(events, 'pointHandlerSendClient', collectId).length === 3)
      expect(phasesOf(events, 'pointHandlerSendClient', collectId)).toEqual(['Start', 'Settled', 'Success'])
      const sendSuccess = eventOf(events, 'pointHandlerSendClientSuccess', collectId)
      expect(sendSuccess?.side).toBe('client')
      // `output` is the `.serverReply` return, exactly as `sendToServer` resolved it
      expect(sendSuccess?.data.output).toEqual({ answers: ['pong:hi'] })
      expect(sendSuccess?.data.error).toBeUndefined()
      expect(sendSuccess?.data.connectionId).toBe(cid)
      // `Start` fires at the call, before the target is resolved — no connection to name yet
      expect(eventOf(events, 'pointHandlerSendClientStart', collectId)?.data.connectionId).toBeUndefined()

      membership.leave()
      connection.disconnect()
    } finally {
      stopRecordingSocketEvents()
    }
  })

  it('the client families close on the ERROR side too: a denied connect, a denied join, a throwing clientReply', async () => {
    try {
      const channelId = idOf(points.chatChannel)
      // the connector denies — Settled/Error instead of Settled/Success, and no cid was ever learned
      const deniedConnect = recordSocketEvents()
      const banned = points.chatChannel.connect({ userId: 'banned' })
      await waitFor(() => banned.status === 'error')
      await waitFor(() => phasesOf(deniedConnect, 'pointChannelConnectClient', channelId).length === 3)
      expect(phasesOf(deniedConnect, 'pointChannelConnectClient', channelId)).toEqual(['Start', 'Settled', 'Error'])
      const connectError = eventOf(deniedConnect, 'pointChannelConnectClientError', channelId)
      expect((connectError?.data.error as ErrorPoint0 | undefined)?.message).toBe('banned')
      expect(connectError?.data.connectionId).toBeUndefined()
      // the error phases carry the counter (no landed entry preceded this attempt) but NO entry markers — a failed
      // connect has no entry to describe
      expect(connectError?.data.connectionIndex).toBe(0)
      expect(connectError?.data.resumed).toBeUndefined()
      expect(connectError?.data.gapless).toBeUndefined()
      banned.disconnect()

      const connection = points.chatChannel.connect({ userId: 'everr' })
      await waitFor(() => connection.status === 'open')

      // the joiner denies HARD (a throw, not an empty room list) — the join family closes with the typed error
      const spaceId = idOf(points.chatSpace)
      const deniedJoin = recordSocketEvents()
      const membership = points.chatSpace.join({ chatId: 'hard-denied' }, undefined, { userId: 'everr' })
      await waitFor(() => membership.status === 'error')
      await waitFor(() => phasesOf(deniedJoin, 'pointSpaceJoinClient', spaceId).length === 3)
      expect(phasesOf(deniedJoin, 'pointSpaceJoinClient', spaceId)).toEqual(['Start', 'Settled', 'Error'])
      const joinError = eventOf(deniedJoin, 'pointSpaceJoinClientError', spaceId)
      expect((joinError?.data.error as ErrorPoint0 | undefined)?.message).toBe('hard denied')
      expect(joinError?.data.rooms).toBeUndefined()
      expect(joinError?.data.connectionId).toBe(connection.id)
      expect(joinError?.data.membershipIndex).toBe(0)
      expect(joinError?.data.resumed).toBeUndefined()
      membership.leave()

      // the dispatch's own failure: a `.clientReply` that throws closes the handler family with the error
      const boomId = idOf(points.boomHandler)
      const boom = recordSocketEvents()
      await points.boomPushHandler(connection).sendToServer({ cid: connection.id as string, text: 'kaboom' })
      await waitFor(() => phasesOf(boom, 'pointHandlerClient', boomId).length === 3)
      expect(phasesOf(boom, 'pointHandlerClient', boomId)).toEqual(['Start', 'Settled', 'Error'])
      const handlerError = eventOf(boom, 'pointHandlerClientError', boomId)
      expect((handlerError?.data.error as ErrorPoint0 | undefined)?.message).toBe('clientReply boom')
      expect(handlerError?.data.output).toBeUndefined()
      expect(handlerError?.data.input).toEqual({ text: 'kaboom' })
      expect(handlerError?.data.connectionId).toBe(connection.id)

      // the TRANSPORT family's error side: the server refuses the send (an empty text fails `.clientSend` there) and
      // the `sendErr` comes back as the typed error — the one sink a fire-and-forget `void ...sendToServer()` has
      const membershipForSend = points.chatSpace.join({ chatId: 'everr' }, undefined, { userId: 'everr' })
      await waitFor(() => membershipForSend.status === 'joined')
      const sendId = idOf(points.messageSendHandler)
      const refused = recordSocketEvents()
      await expect(points.messageSendHandler(membershipForSend).sendToServer({ text: '' })).rejects.toThrow()
      await waitFor(() => phasesOf(refused, 'pointHandlerSendClient', sendId).length === 3)
      expect(phasesOf(refused, 'pointHandlerSendClient', sendId)).toEqual(['Start', 'Settled', 'Error'])
      const sendError = eventOf(refused, 'pointHandlerSendClientError', sendId)
      expect(sendError?.data.error).toBeDefined()
      expect(sendError?.data.output).toBeUndefined()
      expect(sendError?.data.input).toEqual({ text: '' })
      expect(sendError?.data.connectionId).toBe(connection.id)
      membershipForSend.leave()

      connection.disconnect()
    } finally {
      stopRecordingSocketEvents()
    }
  })

  it('the socket-level client singles: connect fires on EVERY open with its socketIndex, disconnect on the drop', async () => {
    // one socket, one event per transport move — the singles are NOT per connection. `socketClientConnect` fires on
    // every successful open (there is no separate reconnect event); the data's `socketIndex` tells the first (0) from
    // a redial (> 0), so start from a transport that is all the way down and its counter honestly at zero
    await waitFor(() => getSocket().status === 'idle', 20_000)
    const tracker = trackWebSockets()
    const events = recordSocketEvents()
    const socketEvents = (): RecordedEvent[] => events.filter((event) => event.name.startsWith('socketClient'))
    const socketNames = (): string[] => socketEvents().map((event) => event.name)
    try {
      const connection = points.chatChannel.connect({ userId: 'evsock' })
      await waitFor(() => connection.status === 'open')
      const firstCid = connection.id
      await waitFor(() => socketNames().length === 1)
      expect(socketNames()).toEqual(['socketClientConnect'])
      const opened = eventOf(events, 'socketClientConnect')
      expect(opened?.side).toBe('client')
      expect(opened?.data.scope).toBe('root')
      expect(opened?.data.socketIndex).toBe(0)

      // the socket itself dies under the held connection: the client sees it go and redials — the SAME connect event
      // announces the reopen, with the incremented index
      tracker.created[0]?.close()
      await waitFor(
        () => socketNames().join(',') === 'socketClientConnect,socketClientDisconnect,socketClientConnect',
        20_000,
      )
      await waitFor(() => connection.status === 'open' && connection.id !== firstCid, 20_000)
      const [, dropped, reopened] = socketEvents()
      expect(dropped.data.scope).toBe('root')
      expect(dropped.data.socketIndex).toBeUndefined()
      expect(reopened.data.socketIndex).toBe(1)

      connection.disconnect()
      await waitFor(() => getSocket().status === 'idle', 20_000)
    } finally {
      tracker.restore()
      stopRecordingSocketEvents()
    }
  })

  it('iterateMessagesFromServer PARKS through a TRANSPORT drop and resumes on the redial', async () => {
    // the twin of the kick case above, one layer down: nothing kicked this connection — the SOCKET died (a NAT
    // timeout, a proxy restart), so every held connection is only interrupted and the runtime redials it. The loop
    // must not read that gap as the end of the feed
    await waitFor(() => getSocket().status === 'idle', 20_000)
    const tracker = trackWebSockets()
    try {
      const connection = points.chatChannel.connect({ userId: 'itertr' })
      await waitFor(() => connection.status === 'open')
      const firstCid = connection.id
      expect(tracker.created.length).toBe(1)

      const ticks: number[] = []
      let ended = false
      const iterator = points.tickFeedHandler(connection).iterateMessagesFromServer() as AsyncGenerator<{ i: number }>
      const consumed = (async () => {
        for await (const message of iterator) {
          ticks.push(message.i)
        }
        ended = true
      })()
      await points.startTicksHandler(connection).sendToServer({ count: 1 })
      await waitFor(() => ticks.length === 1)

      tracker.created[0]?.close()
      await waitFor(() => tracker.created.length >= 2, 20_000)
      await waitFor(() => connection.status === 'open' && connection.id !== firstCid, 20_000)
      expect(ended).toBe(false)

      // a fresh socket AND a fresh cid — the listener rode both, so the feed keeps landing in the SAME loop
      await points.startTicksHandler(connection).sendToServer({ count: 2 })
      await waitFor(() => ticks.length === 3, 20_000)
      expect(ticks).toEqual([1, 1, 2])
      expect(ended).toBe(false)

      // only the hold going away ends it
      connection.disconnect()
      await consumed
      expect(ended).toBe(true)
      await waitFor(() => getSocket().status === 'idle', 20_000)
    } finally {
      tracker.restore()
    }
  })

  it('iterateMessagesFromServer({ signal }): the abort ends the loop and leaves nothing attached behind it', async () => {
    const connection = points.chatChannel.connect({ userId: 'itersig' })
    await waitFor(() => connection.status === 'open')

    // the signal belongs to the CALLER, and one long-lived signal drives many iterations — so count what the generator
    // registers on it: whatever it added must come off when the loop is done
    const controller = new AbortController()
    const signal = controller.signal
    const added: string[] = []
    const removed: string[] = []
    const realAdd = signal.addEventListener.bind(signal) as (...args: unknown[]) => void
    const realRemove = signal.removeEventListener.bind(signal) as (...args: unknown[]) => void
    signal.addEventListener = ((type: string, ...rest: unknown[]) => {
      added.push(type)
      realAdd(type, ...rest)
    }) as never
    signal.removeEventListener = ((type: string, ...rest: unknown[]) => {
      removed.push(type)
      realRemove(type, ...rest)
    }) as never

    const ticks: number[] = []
    let ended = false
    const iterator = points.tickFeedHandler(connection).iterateMessagesFromServer({ signal }) as AsyncGenerator<{
      i: number
    }>
    const consumed = (async () => {
      for await (const message of iterator) {
        ticks.push(message.i)
      }
      ended = true
    })()
    await points.startTicksHandler(connection).sendToServer({ count: 1 })
    await waitFor(() => ticks.length === 1)
    expect(added).toEqual(['abort'])
    expect(removed).toEqual([])

    controller.abort()
    await consumed
    expect(ended).toBe(true)
    expect(removed).toEqual(['abort'])

    // the target itself is untouched: the connection stays open, further pushes reach the aborted loop no more, and a
    // FRESH iterator starts from now — it inherits no backlog from the one that left
    expect(connection.status).toBe('open')
    await points.startTicksHandler(connection).sendToServer({ count: 2 })
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(ticks).toEqual([1])

    const laterTicks: number[] = []
    const later = points.tickFeedHandler(connection).iterateMessagesFromServer() as AsyncGenerator<{ i: number }>
    const laterConsumed = (async () => {
      for await (const message of later) {
        laterTicks.push(message.i)
        if (laterTicks.length >= 2) {
          break
        }
      }
    })()
    await points.startTicksHandler(connection).sendToServer({ count: 2 })
    await laterConsumed
    expect(laterTicks).toEqual([1, 2])
    expect(ticks).toEqual([1])

    // a signal ALREADY aborted at call time never yields at all — the loop checks before it parks
    const preTicks: number[] = []
    const preIterator = points.tickFeedHandler(connection).iterateMessagesFromServer({
      signal: AbortSignal.abort(),
    }) as AsyncGenerator<{ i: number }>
    await points.startTicksHandler(connection).sendToServer({ count: 1 })
    for await (const message of preIterator) {
      preTicks.push(message.i)
    }
    expect(preTicks).toEqual([])

    connection.disconnect()
  })

  it('a refresh re-runs the enroller and REPLACES the enrolled rooms — the reconcile update branch', async () => {
    const before = personalReceived.length
    const connection = points.chatChannel.connect({ userId: 'rcu' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'rcu-adm' })
    await waitFor(() => admin.status === 'open')
    const enrollment = (): LooseMembership | undefined =>
      (points.userSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) => candidate.connection.id === connection.id,
      )
    await waitFor(() => enrollment() !== undefined)
    expect(enrollment()?.rooms).toEqual([{ userId: 'user-rcu' }])
    await points.personalPushHandler(admin).sendToServer({ me: 'user-rcu', text: 'own-room' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'own-room'))

    // the enroller reads server state, and that state now says a DIFFERENT room for this identity: the refresh re-runs
    // it on the fresh cid and the announcement REPLACES the rooms of the membership that is already there
    const firstCid = connection.id as string
    await points.adminPersonalRoomsHandler(admin).sendToServer({ me: 'user-rcu', rooms: ['user-rcu-alt'] })
    await waitFor(() => connection.status === 'open' && connection.id !== firstCid)
    await waitFor(() => JSON.stringify(enrollment()?.rooms) === JSON.stringify([{ userId: 'user-rcu-alt' }]))
    expect(enrollment()?.status).toBe('joined')
    await points.personalPushHandler(admin).sendToServer({ me: 'user-rcu-alt', text: 'moved-room' })
    await waitFor(() => personalReceived.slice(before).some((message) => message.text === 'moved-room'))
    // and the room it was moved out of is silent
    await points.personalPushHandler(admin).sendToServer({ me: 'user-rcu', text: 'left-behind' })
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(personalReceived.slice(before).some((message) => message.text === 'left-behind')).toBe(false)

    // an enroller answering NOTHING still ANNOUNCES its space, so the membership stays — with no rooms, exactly like a
    // joiner's clean deny. Dropping a membership takes a claim that does not name its space at all (the test below)
    const secondCid = connection.id as string
    await points.adminPersonalRoomsHandler(admin).sendToServer({ me: 'user-rcu', rooms: [] })
    await waitFor(() => connection.status === 'open' && connection.id !== secondCid)
    await waitFor(() => enrollment() !== undefined && enrollment()?.rooms.length === 0)
    expect(enrollment()?.status).toBe('joined')

    admin.disconnect()
    connection.disconnect()
  })

  it('an enrollment the fresh claim no longer announces is DISPOSED — the reconcile drop branch', async () => {
    const connection = points.chatChannel.connect({ userId: 'rcd' })
    await waitFor(() => connection.status === 'open')
    const admin = points.chatChannel.connect({ userId: 'rcd-adm' })
    await waitFor(() => admin.status === 'open')
    // an IMPERATIVE enrollment into a joiner-only space: chatSpace has no `.enroller`, so the next connection setup
    // announces the enrolled spaces WITHOUT it — nothing on the server will ever re-announce this one
    await points.adminEnrollHandler(admin).sendToServer({ me: 'user-rcd', chatIds: ['rcd-room'] })
    const enrollment = (): LooseMembership | undefined =>
      (points.chatSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) =>
          candidate.connection.id === connection.id && candidate.rooms.some((room) => room.chatId === 'rcd-room'),
      )
    await waitFor(() => enrollment() !== undefined)
    const dropped = enrollment() as LooseMembership
    // the enroller-backed membership of the SAME connection — the claim does name userSpace, so it must survive
    const personal = (): LooseMembership | undefined =>
      (points.userSpace.memberships.client.list() as LooseMembership[]).find(
        (candidate) => candidate.connection.id === connection.id,
      )
    await waitFor(() => personal() !== undefined)

    const oldCid = connection.id as string
    await points.adminRefreshHandler(admin).sendToServer({ me: 'user-rcd' })
    await waitFor(() => connection.status === 'open' && connection.id !== oldCid)

    // the claimed frame named userSpace and nothing else: the chatSpace enrollment left the client's list and its
    // facade is closed — no `leave` frame was owed, the server-side connection it belonged to is gone with the refresh
    await waitFor(() => enrollment() === undefined)
    expect(dropped.status).toBe('closed')
    expect(personal()).toBeDefined()
    expect(personal()?.status).toBe('joined')
    // the drop is real on the server too — the old connection went with the refresh and the fresh one never entered
    // the room, so nothing is left in it
    expect(
      await waitForRead(
        async () =>
          ((await points.adminSpaceListHandler(admin).sendToServer({ chatId: 'rcd-room' })) as { ids: string[] }).ids,
        (ids) => ids.length === 0,
      ),
    ).toEqual([])

    admin.disconnect()
    connection.disconnect()
  })

  it('the channel connect rides GET while its input fits the URL cap, and falls back to POST when it does not', async () => {
    const admin = points.chatChannel.connect({ userId: 'gp-adm' })
    await waitFor(() => admin.status === 'open')
    const methodsSeen = async (): Promise<string[]> =>
      ((await points.adminConnectMethodsHandler(admin).sendToServer()) as { methods: string[] }).methods
    expect(await methodsSeen()).toEqual([])

    // a channel connect is a query-transport endpoint: the input rides `?input=` so a proxy sees a plain cacheable GET
    const short = points.methodChannel.connect({ userId: 'gp' })
    await waitFor(() => short.status === 'open')
    expect(await waitForRead(methodsSeen, (methods) => methods.length >= 1)).toEqual(['GET'])

    // the same connect with an input too long for a URL — over the cap the client POSTs the body instead, and the
    // endpoint answers both methods alike
    const long = points.methodChannel.connect({ userId: 'gp-' + 'x'.repeat(2100) })
    await waitFor(() => long.status === 'open')
    expect(await waitForRead(methodsSeen, (methods) => methods.length >= 2)).toEqual(['GET', 'POST'])

    short.disconnect()
    long.disconnect()
    admin.disconnect()
  })

  it('<Socket>: `hold: false` releases the hold, and the transport closes after the LAST one', async () => {
    // the keeper's whole job is the socket-level HOLD — it opens the transport with zero connections. The release is
    // its mirror: `maybeCloseSocket` runs on every release, but only the LAST one takes the socket down
    await waitFor(() => getSocket().status === 'idle', 20_000)
    await withDomGlobals(async () => {
      const Keepers = ({ first, second }: { first: boolean; second: boolean }): React.ReactNode =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(Socket, { hold: first }),
          React.createElement(Socket, { hold: second }),
        )
      const view = render(React.createElement(Keepers, { first: true, second: true }))
      try {
        await rtlWaitFor(
          () => {
            expect(getSocket().status).toBe('open')
          },
          { timeout: 20_000 },
        )
        expect(getSocket().connections).toEqual([])

        // one keeper flips to `hold: false`: its effect cleanup releases that hold, and the other one holds the line
        view.rerender(React.createElement(Keepers, { first: false, second: true }))
        await new Promise((resolve) => setTimeout(resolve, 700))
        expect(getSocket().status).toBe('open')

        // the last hold goes — now the close timer runs out and the transport is idle again
        view.rerender(React.createElement(Keepers, { first: false, second: false }))
        await rtlWaitFor(
          () => {
            expect(getSocket().status).toBe('idle')
          },
          { timeout: 20_000 },
        )
      } finally {
        view.unmount()
      }
    })
    expect(getSocket().status).toBe('idle')
  })
})
