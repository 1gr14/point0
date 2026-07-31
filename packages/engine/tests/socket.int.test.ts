import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(120_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket',
  portsRange: [4200, 4299],
  // the test drives the wire protocol directly — a blank transformer keeps payload strings plain JSON
  superjson: false,
})

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'

// lifecycle events recorded per connection — read back over the wire through eventsLogHandler
export const channelEvents: Array<{ name: string; id: string; reason?: string; resumed?: boolean; identity: unknown }> = []

// the channel authenticates and freezes an identity; rooms come from a space's join, not the connector
export const chatChannel = root.lets('channel', 'chatChannel')
  .serverOn(['pointChannelOpenServer', 'pointChannelCloseServer'], (event) => {
    const data = event.data as { connectionId: string; reason?: string; resumed?: boolean; identity: unknown }
    channelEvents.push({ name: event.name, id: data.connectionId, reason: data.reason, resumed: data.resumed, identity: data.identity })
  })
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    if (input.userId === 'forbidden') {
      throw new Error('Not a member')
    }
    return { me: 'user-' + input.userId }
  })
  .channel()

// a space of chat rooms of the shape { chatId }; the joiner admits nobody into the 'denied' room
export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => (input.chatId === 'denied' ? undefined : { chatId: input.chatId }))
  .space()

// a second space with two-field rooms — exact \`room\` kicks and subset \`$room\` kicks tell apart on it
export const deskSpace = chatChannel.lets<{ deskId: string; zone: string }>('space', 'deskSpace')
  .input(z.object({ deskId: z.string(), zone: z.string() }))
  .joiner(async ({ input }) => ({ deskId: input.deskId, zone: input.zone }))
  .space()

// the server-side enrollment: every connection gets a personal { userId } room, no client join involved. It declares
// NO .joiner — so a client can never join it, whatever room it asks for (that used to be the identity-fallback hole)
export const userSpace = chatChannel.lets<{ userId: string }>('space', 'userSpace')
  .enroller(({ identity }) => ({ userId: identity.me }))
  .space()

export const personalHandler = userSpace.lets('clientHandler', 'personalHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// no opener generic and no input: the default room is the one global room {}, and \`joiner(() => ({}))\` is what makes
// it joinable at all
export const globalSpace = chatChannel.lets('space', 'globalSpace')
  .joiner(() => ({}))
  .space()

export const globalNoticeHandler = globalSpace.lets('clientHandler', 'globalNoticeHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

export const globalPushHandler = chatChannel.lets('serverHandler', 'globalPushHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => {
    // a bare space push — the space-wide topic, no room named
    void globalNoticeHandler.sendToClient({ text: input.text })
    return { ok: true }
  })
  .serverHandler()

// the cap: maxRooms bounds the rooms a connection is in, whoever put it there; a join is a UNION
export const cappedSpace = chatChannel.lets<{ slot: string }>('space', 'cappedSpace')
  .input(z.object({ slot: z.string() }))
  .joiner(async ({ input }) => ({ slot: input.slot }))
  .space({ server: { maxRooms: 2 } })

// the cap on the IMPERATIVE enroll path: an over-cap space.enroll SKIPS the connection (an admin fan-out has no one
// requester to answer) — nothing announced, the connection keeps working
export const capEnrollSpace = chatChannel.lets<{ slot: string }>('space', 'capEnrollSpace')
  .input(z.object({ slot: z.string() }))
  .joiner(async ({ input }) => ({ slot: input.slot }))
  .space({ server: { maxRooms: 2 } })

export const adminCapEnrollHandler = chatChannel.lets('serverHandler', 'adminCapEnrollHandler')
  .clientSend(z.object({ cid: z.string(), slots: z.array(z.string()) }))
  .serverReply(async ({ input }) => {
    await capEnrollSpace.enroll({ connectionId: input.cid }, input.slots.map((slot) => ({ slot })))
    return { ok: true }
  })
  .serverHandler()

// a joiner that takes its time — the window in which the connection can die WHILE the join runs
export const slowSpace = chatChannel.lets<{ chatId: string }>('space', 'slowSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return { chatId: input.chatId }
  })
  .space()

// the room index of slowSpace read straight off this process — a mid-join casualty must never appear in it
export const adminSlowRoomHandler = chatChannel.lets('serverHandler', 'adminSlowRoomHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(({ input }) => ({
    count: slowSpace.memberships.server.local.count({ room: { chatId: input.chatId } }),
    ids: slowSpace.memberships.server.local
      .list({ room: { chatId: input.chatId } })
      .map((membership) => membership.connectionId),
  }))
  .serverHandler()

// each join admits TWO rooms — the cap trips when the union would exceed it
export const roomsCappedSpace = chatChannel.lets<{ id: string }>('space', 'roomsCappedSpace')
  .input(z.object({ k: z.string() }))
  .joiner(async ({ input }) => [{ id: input.k + '-1' }, { id: input.k + '-2' }])
  .space({ server: { maxRooms: 3 } })

// two DIFFERENT inputs resolve to ONE room — the server holds the room once, one push frame = one reply
export const dmSpace = chatChannel.lets<{ pair: string }>('space', 'dmSpace')
  .input(z.object({ a: z.string(), b: z.string() }))
  .joiner(async ({ input }) => ({ pair: [input.a, input.b].sort().join('+') }))
  .space()

export const dmPingHandler = dmSpace.lets('clientHandler', 'dmPingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'dm:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

export const dmCollectHandler = chatChannel.lets('serverHandler', 'dmCollectHandler')
  .clientSend(z.object({ pair: z.string() }))
  .serverReply(async ({ input }) => {
    const replies = await dmPingHandler.sendToClient(
      { ask: 'hi' },
      { room: { pair: input.pair } },
      { timeout: 1500, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer) }
  })
  .serverHandler()

// a space serverHandler: its reply gets a typed \`room\` (the chatSpace slepok) and pushes to that room
export const messageSendHandler = chatSpace.lets('serverHandler', 'messageSendHandler')
  .clientSend(z.object({ text: z.string().min(1) }))
  .serverReply(async ({ input, identity, room, connectionId }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: identity.me }, { room, except: connectionId })
    return { ok: true, echo: input.text, me: identity.me, chatId: room.chatId }
  })
  .serverHandler()

export const messageReceivedHandler = chatSpace.lets('clientHandler', 'messageReceivedHandler')
  .serverSend(z.object({ text: z.string(), from: z.string() }))
  .clientHandler()

export const pingCollectHandler = chatSpace.lets('serverHandler', 'pingCollectHandler')
  .serverReply(async ({ room }) => {
    const startedAt = Date.now()
    const replies = await pingHandler.sendToClient({ ask: 'hi' }, { room }, { timeout: 3000, waitForAll: true })
    return {
      answers: replies.map((reply) => reply.data.answer).sort(),
      cidsAreStrings: replies.every((reply) => typeof reply.connectionId === 'string'),
      elapsed: Date.now() - startedAt,
    }
  })
  .serverHandler()

export const pingHandler = chatSpace.lets('clientHandler', 'pingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: 'pong:' + message.ask }), z.object({ answer: z.string() }))
  .clientHandler()

// a collect window with an except — the excepted connection still SEES the frame (excepts ride it, the client
// self-filters), so the server must drop whatever it answers anyway
export const exceptCollectHandler = chatChannel.lets('serverHandler', 'exceptCollectHandler')
  .clientSend(z.object({ chatId: z.string(), exceptCid: z.string() }))
  .serverReply(async ({ input }) => {
    const startedAt = Date.now()
    const replies = await pingHandler.sendToClient(
      { ask: 'exc' },
      { room: { chatId: input.chatId }, except: input.exceptCid },
      { timeout: 1500, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// a channel clientHandler — pushed to connections by identity or cid, not by room (no space slot)
export const channelAnnounceHandler = chatChannel.lets('clientHandler', 'channelAnnounceHandler')
  .serverSend(z.object({ text: z.string(), from: z.string() }))
  .clientHandler()

// pushes to an arbitrary room from the server — lets a test drive a room push it can observe
export const roomPushHandler = chatChannel.lets('serverHandler', 'roomPushHandler')
  .clientSend(z.object({ chatId: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: 'system' }, { room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// pushes to every connection matching an identity (the channel-handler $identity target)
export const identityPushHandler = chatChannel.lets('serverHandler', 'identityPushHandler')
  .clientSend(z.object({ me: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void channelAnnounceHandler.sendToClient({ text: input.text, from: 'system' }, { $identity: { me: input.me } })
    return { ok: true }
  })
  .serverHandler()

// a channel push narrowed by exact connection ids
export const cidAnnounceHandler = chatChannel.lets('serverHandler', 'cidAnnounceHandler')
  .clientSend(z.object({ cids: z.array(z.string()), text: z.string() }))
  .serverReply(async ({ input }) => {
    void channelAnnounceHandler.sendToClient({ text: input.text, from: 'system' }, { connectionId: input.cids })
    return { ok: true }
  })
  .serverHandler()

// a space push with the whole $-dictionary opened up — AND-combined narrowing + excepts, driven by the test
export const targetedRoomPushHandler = chatChannel.lets('serverHandler', 'targetedRoomPushHandler')
  .clientSend(
    z.object({
      chatId: z.string().optional(),
      me: z.string().optional(),
      cid: z.string().optional(),
      exceptCids: z.array(z.string()).optional(),
      exceptChatIds: z.array(z.string()).optional(),
      text: z.string(),
    }),
  )
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient(
      { text: input.text, from: 'system' },
      {
        ...(input.chatId === undefined ? {} : { room: { chatId: input.chatId } }),
        ...(input.me === undefined ? {} : { $identity: { me: input.me } }),
        ...(input.cid === undefined ? {} : { connectionId: input.cid }),
        ...(input.exceptCids === undefined ? {} : { except: input.exceptCids }),
        ...(input.exceptChatIds === undefined ? {} : { except: input.exceptChatIds.map((chatId) => ({ chatId })) }),
      } as never,
    )
    return { ok: true }
  })
  .serverHandler()

// a bare space-handler send — space-wide: every member of chatSpace
export const spaceWidePushHandler = chatChannel.lets('serverHandler', 'spaceWidePushHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => {
    void messageReceivedHandler.sendToClient({ text: input.text, from: 'wide' })
    return { ok: true }
  })
  .serverHandler()

// a bare send on the ENROLLED space — reaches every connection (everyone is enrolled)
export const userWidePushHandler = chatChannel.lets('serverHandler', 'userWidePushHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => {
    void personalHandler.sendToClient({ text: input.text })
    return { ok: true }
  })
  .serverHandler()

// pushes to the personal enrolled room of one user
export const personalPushHandler = chatChannel.lets('serverHandler', 'personalPushHandler')
  .clientSend(z.object({ me: z.string(), text: z.string() }))
  .serverReply(async ({ input }) => {
    void personalHandler.sendToClient({ text: input.text }, { room: { userId: input.me } })
    return { ok: true }
  })
  .serverHandler()

// the admin surface, driven from inside the app (that is how server-side code runs in these tests)
export const adminKickHandler = chatChannel.lets('serverHandler', 'adminKickHandler')
  .clientSend(z.object({ me: z.string().optional(), cid: z.string().optional(), reason: z.string().optional() }))
  .serverReply(async ({ input }) => {
    await chatChannel.kick({
      ...(input.me === undefined ? {} : { $identity: { me: input.me } }),
      ...(input.cid === undefined ? {} : { connectionId: input.cid }),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
    })
    return { kicked: input.me ?? input.cid }
  })
  .serverHandler()

// a space kick — a forced LEAVE of a room, not a connection kill (the client gets a \`left\` frame)
export const adminSpaceKickHandler = chatChannel.lets('serverHandler', 'adminSpaceKickHandler')
  .clientSend(z.object({ chatId: z.string(), reason: z.string().optional() }))
  .serverReply(async ({ input }) => {
    await chatSpace.kick({ room: { chatId: input.chatId }, ...(input.reason ? { reason: input.reason } : {}) })
    return { kicked: input.chatId }
  })
  .serverHandler()

// a deskSpace clientHandler + a push by \`$room\` — the explicit sift scan in a PUSH target (same rule as everywhere)
export const deskNoticeHandler = deskSpace.lets('clientHandler', 'deskNoticeHandler')
  .serverSend(z.object({ note: z.string() }))
  .clientHandler()

export const deskZonePushHandler = chatChannel.lets('serverHandler', 'deskZonePushHandler')
  .clientSend(z.object({ zone: z.string(), note: z.string() }))
  .serverReply(async ({ input }) => {
    void deskNoticeHandler.sendToClient({ note: input.note }, { $room: { zone: input.zone } })
    return { ok: true }
  })
  .serverHandler()

// deskSpace kicks: \`room\` = the exact snapshot, \`$room\` = the sift selection (subset semantics)
export const adminDeskKickHandler = chatChannel.lets('serverHandler', 'adminDeskKickHandler')
  .clientSend(
    z.object({
      exact: z.object({ deskId: z.string(), zone: z.string() }).optional(),
      zone: z.string().optional(),
      reason: z.string().optional(),
    }),
  )
  .serverReply(async ({ input }) => {
    await deskSpace.kick({
      ...(input.exact === undefined ? {} : { room: input.exact }),
      ...(input.zone === undefined ? {} : { $room: { zone: input.zone } }),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
    })
    return { ok: true }
  })
  .serverHandler()

// the imperative server-side enroll — the mirror of the space kick: grow the matches' enrolled rooms of chatSpace
export const adminEnrollHandler = chatChannel.lets('serverHandler', 'adminEnrollHandler')
  .clientSend(
    z.object({
      me: z.string().optional(),
      cid: z.string().optional(),
      inRoomChatId: z.string().optional(),
      chatIds: z.array(z.string()),
    }),
  )
  .serverReply(async ({ input }) => {
    await chatSpace.enroll(
      {
        ...(input.me === undefined ? {} : { $identity: { me: input.me } }),
        ...(input.cid === undefined ? {} : { connectionId: input.cid }),
        ...(input.inRoomChatId === undefined ? {} : { room: { chatId: input.inRoomChatId } }),
      } as never,
      input.chatIds.map((chatId) => ({ chatId })),
    )
    return { ok: true }
  })
  .serverHandler()

export const adminRefreshHandler = chatChannel.lets('serverHandler', 'adminRefreshHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.refresh({ $identity: { me: input.me } })
    return { refreshed: input.me }
  })
  .serverHandler()

// amendIdentity patches what selections match over — prove it by re-selecting on the patched key
export const adminAmendHandler = chatChannel.lets('serverHandler', 'adminAmendHandler')
  .clientSend(z.object({ me: z.string(), plan: z.string() }))
  .serverReply(async ({ input }) => {
    await chatChannel.amendIdentity({ $identity: { me: input.me } }, { plan: input.plan } as never)
    const matched = await chatChannel.connections.server.list({ $identity: { plan: input.plan } } as never)
    return { matched }
  })
  .serverHandler()

export const adminListHandler = chatChannel.lets('serverHandler', 'adminListHandler')
  .clientSend(z.object({ me: z.string() }))
  .serverReply(async ({ input }) => {
    const list = await chatChannel.connections.server.list({ $identity: { me: input.me } })
    return { list }
  })
  .serverHandler()

// a SPACE memberships.list() — items carry the rooms each connection holds in the space
export const adminSpaceListHandler = chatChannel.lets('serverHandler', 'adminSpaceListHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    const list = await chatSpace.memberships.server.list({ room: { chatId: input.chatId } })
    return { list }
  })
  .serverHandler()

// the three enumeration forms, local path (no external backplane — the window closes immediately)
export const adminEnumerateHandler = chatChannel.lets('serverHandler', 'adminEnumerateHandler')
  .clientSend(z.object({ me: z.string(), chatId: z.string() }))
  .serverReply(async ({ input }) => {
    const channelCount = await chatChannel.connections.server.count({ $identity: { me: input.me } })
    const roomCount = await chatSpace.memberships.server.count({ room: { chatId: input.chatId } })
    const seen: string[] = []
    const processed = await chatChannel.connections.server.forEach(
      { $identity: { me: input.me } },
      {
        onConnection: ({ connectionId }) => {
          seen.push(connectionId)
        },
      },
    )
    const iterated: string[] = []
    for await (const item of chatSpace.memberships.server.forEach({ room: { chatId: input.chatId } })) {
      iterated.push((item as { connectionId: string }).connectionId)
    }
    return { channelCount, roomCount, processed, seen, iterated }
  })
  .serverHandler()

// the SYNCHRONOUS local floor — plain values off this process's room index, no bus, no await (single process here,
// so the local slice is the whole truth); memberships.local.rooms is the join-guard's per-connection room read
export const adminLocalHandler = chatChannel.lets('serverHandler', 'adminLocalHandler')
  .clientSend(z.object({ me: z.string(), chatId: z.string(), connectionId: z.string() }))
  .serverReply(({ input }) => {
    const channelCount = chatChannel.connections.server.local.count({ $identity: { me: input.me } })
    const channelList = chatChannel.connections.server.local
      .list({ $identity: { me: input.me } })
      .map((connection) => connection.connectionId)
    const roomCount = chatSpace.memberships.server.local.count({ room: { chatId: input.chatId } })
    const rooms = chatSpace.memberships.server.local.rooms({ connectionId: input.connectionId })
    return { channelCount, channelList, roomCount, rooms }
  })
  .serverHandler()

export const adminWhereHandler = chatChannel.lets('serverHandler', 'adminWhereHandler')
  .serverReply(async () => {
    try {
      await chatChannel.kick({ $identity: { $where: 'return true' } as never })
      return { error: 'no-throw' }
    } catch (error) {
      return { error: (error as Error).message }
    }
  })
  .serverHandler()

export const eventsLogHandler = chatChannel.lets('serverHandler', 'eventsLogHandler')
  .serverReply(async () => ({ events: channelEvents }))
  .serverHandler()

// the per-socket connection cap: ONE connection to this channel per socket, whatever the client does
export const capChannel = root.lets('channel', 'capChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'cap-' + input.userId }))
  .channel({ server: { maxConnections: 1 } })

export const capEchoHandler = capChannel.lets('serverHandler', 'capEchoHandler')
  .serverReply(async ({ identity }) => ({ me: identity.me }))
  .serverHandler()

// a deliberately small message cap. It is measured on the RAW frame — the transport bound Bun enforces is derived from
// the WIDEST channel (chatChannel's 1 MiB default), so a couple of over-cap kilobytes reach the engine and are refused
// by the channel's own error rather than by a silent socket close
export const smallChannel = root.lets('channel', 'smallChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'small-' + input.userId }))
  .channel({ server: { maxMessageSize: 512 } })

export const smallSpace = smallChannel.lets<{ chatId: string }>('space', 'smallSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .space()

export const smallEchoHandler = smallChannel.lets('serverHandler', 'smallEchoHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => ({ length: input.text.length }))
  .serverHandler()

// pointSpaceLeaveServer carries WHY the rooms went — its own space, so the other tests' comings and goings stay out
export const leaveLog: Array<{ id: string; rooms: unknown[]; reason: string; identity: unknown }> = []

export const leaveSpace = chatChannel.lets<{ chatId: string }>('space', 'leaveSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .serverOn(['pointSpaceLeaveServer'], (event) => {
    const data = event.data as { connectionId: string; rooms: unknown[]; reason: string; identity: unknown }
    leaveLog.push({ id: data.connectionId, rooms: data.rooms, reason: data.reason, identity: data.identity })
  })
  .space()

export const leaveLogHandler = chatChannel.lets('serverHandler', 'leaveLogHandler')
  .serverReply(async () => ({ log: leaveLog }))
  .serverHandler()

// the space kick — the fourth way a membership ends
export const adminLeaveKickHandler = chatChannel.lets('serverHandler', 'adminLeaveKickHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    await leaveSpace.kick({ room: { chatId: input.chatId } })
    return { ok: true }
  })
  .serverHandler()

// the four-phase pointChannelConnectServer* family around the connector run — its own channel, so the log holds
// exactly this test's connects
export const connectLog: Array<{
  name: string
  id: string | undefined
  input: unknown
  identity: unknown
  error: string | undefined
  hasErrorKey: boolean
}> = []

export const connectEventsChannel = root.lets('channel', 'connectEventsChannel')
  .serverOn(
    [
      'pointChannelConnectServerStart',
      'pointChannelConnectServerSettled',
      'pointChannelConnectServerSuccess',
      'pointChannelConnectServerError',
    ],
    (event) => {
      const data = event.data as {
        connectionId?: string
        input: unknown
        identity?: unknown
        error?: { message?: string }
      }
      connectLog.push({
        name: event.name,
        id: data.connectionId,
        input: data.input,
        identity: data.identity,
        error: data.error === undefined ? undefined : String(data.error.message),
        hasErrorKey: 'error' in data,
      })
    },
  )
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => {
    if (input.userId === 'nope') {
      throw new Error('connector refused')
    }
    return { me: 'ce-' + input.userId }
  })
  .channel()

export const connectLogHandler = chatChannel.lets('serverHandler', 'connectLogHandler')
  .serverReply(async () => ({ log: connectLog }))
  .serverHandler()

// a collect window with NOBODY to answer: the expectation is 0, which closes it at once instead of waiting the timeout
export const emptyCollectHandler = chatChannel.lets('serverHandler', 'emptyCollectHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    const startedAt = Date.now()
    const replies = await pingHandler.sendToClient(
      { ask: 'anyone' },
      { room: { chatId: input.chatId } },
      { timeout: 4000, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// a SHORT window over a room whose member answers too late — the reply then lands on a mid nobody holds any more
export const lateCollectHandler = chatChannel.lets('serverHandler', 'lateCollectHandler')
  .clientSend(z.object({ chatId: z.string() }))
  .serverReply(async ({ input }) => {
    const startedAt = Date.now()
    const replies = await pingHandler.sendToClient(
      { ask: 'late' },
      { room: { chatId: input.chatId } },
      { timeout: 500, waitForAll: true },
    )
    return { answers: replies.map((reply) => reply.data.answer), elapsed: Date.now() - startedAt }
  })
  .serverHandler()

// a short connection TTL: the stored conn record expires before an unclaimed ticket is claimed
export const ttlChannel = root.lets('channel', 'ttlChannel')
  .connector(async () => ({}))
  .channel({ server: { connectionTtl: 400 } })

// no input, no connector — a bare authenticated pipe
export const lobbyChannel = root.lets('channel', 'lobbyChannel').channel()

// a throwing enroller must fail the WHOLE connection setup — the claim answers claimErr, never claimed. It records
// into the same log as chatChannel: a setup that failed must leave NEITHER half of the Open/Close pair behind
export const cursedChannel = root.lets('channel', 'cursedChannel')
  .serverOn(['pointChannelOpenServer', 'pointChannelCloseServer'], (event) => {
    const data = event.data as { connectionId: string; reason?: string; resumed?: boolean; identity: unknown }
    channelEvents.push({ name: event.name, id: data.connectionId, reason: data.reason, resumed: data.resumed, identity: data.identity })
  })
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel()

export const cursedSpace = cursedChannel.lets<{ userId: string }>('space', 'cursedSpace')
  .enroller(({ identity }) => {
    if (identity.me === 'cursed') {
      throw new Error('enrollment refused')
    }
    return { userId: identity.me }
  })
  .space()

// the cap on the ENROLLER path: 'greedy' is enrolled into three rooms of a maxRooms-2 space — the whole connect fails
// like a throwing enroller does (an option set is respected on every write path)
export const enrollCapChannel = root.lets('channel', 'enrollCapChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: input.userId }))
  .channel()

export const enrollCapSpace = enrollCapChannel.lets<{ slot: string }>('space', 'enrollCapSpace')
  .enroller(({ identity }) =>
    identity.me === 'greedy' ? [{ slot: 'a' }, { slot: 'b' }, { slot: 'c' }] : [{ slot: identity.me }],
  )
  .space({ server: { maxRooms: 2 } })

// the presence recipe from the docs, wired to a log: a \`pointSpaceJoinServerSuccess\` handler reads the room's live
// slice the moment the event fires. The Success pair is emitted AFTER the engine registered the rooms, so the
// connection that just joined (or was just enrolled) IS in that list. Its own channel — the enrollment below would
// otherwise show up in every chatChannel \`claimed\` frame
export const presenceLog: Array<{ space: string; id: string; room: unknown; resumed: boolean; ids: string[] }> = []

export const presenceChannel = root.lets('channel', 'presenceChannel')
  .input(z.object({ userId: z.string() }))
  .connector(async ({ input }) => ({ me: 'user-' + input.userId }))
  .channel()

export const presenceSpace = presenceChannel.lets<{ chatId: string }>('space', 'presenceSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .serverOn(['pointSpaceJoinServerSuccess'], (event) => {
    const data = event.data as { connectionId: string; rooms: unknown[]; resumed: boolean }
    for (const room of data.rooms as Array<{ chatId: string }>) {
      presenceLog.push({
        space: 'presenceSpace',
        id: data.connectionId,
        room,
        resumed: data.resumed,
        ids: presenceSpace.memberships.server.local.list({ room }).map((membership) => membership.connectionId),
      })
    }
  })
  .space()

// an enrollment IS a join — the same family, the same promise about when it fires
export const presenceEnrollSpace = presenceChannel.lets<{ userId: string }>('space', 'presenceEnrollSpace')
  .enroller(({ identity }) => ({ userId: identity.me }))
  .serverOn(['pointSpaceJoinServerSuccess'], (event) => {
    const data = event.data as { connectionId: string; rooms: unknown[]; resumed: boolean }
    for (const room of data.rooms as Array<{ userId: string }>) {
      presenceLog.push({
        space: 'presenceEnrollSpace',
        id: data.connectionId,
        room,
        resumed: data.resumed,
        ids: presenceEnrollSpace.memberships.server.local.list({ room }).map((membership) => membership.connectionId),
      })
    }
  })
  .space()

export const presenceLogHandler = presenceChannel.lets('serverHandler', 'presenceLogHandler')
  .serverReply(async () => ({ log: presenceLog }))
  .serverHandler()
`,
  )
}

type WireFrame = Record<string, unknown> & { t: string }

class WireClient {
  ws: WebSocket
  frames: WireFrame[] = []
  private waiters: Array<{ predicate: (frame: WireFrame) => boolean; resolve: (frame: WireFrame) => void }> = []
  private opened: Promise<void>

  constructor(url: string) {
    this.ws = new WebSocket(url)
    this.opened = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        resolve()
      })
      this.ws.addEventListener('error', (event) => {
        reject(new Error(`WebSocket error: ${String((event as { message?: string }).message ?? 'unknown')}`))
      })
    })
    this.ws.addEventListener('message', (event) => {
      const frame = JSON.parse(String(event.data)) as WireFrame
      this.frames.push(frame)
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(frame)) {
          this.waiters.splice(this.waiters.indexOf(waiter), 1)
          waiter.resolve(frame)
        }
      }
    })
  }

  async waitOpen(): Promise<void> {
    await this.opened
  }

  send(frame: WireFrame): void {
    this.ws.send(JSON.stringify(frame))
  }

  /** Put an exact byte sequence on the wire — what a frame padded past the cap needs (the engine measures the RAW text). */
  sendRaw(text: string): void {
    this.ws.send(text)
  }

  async waitFrame(predicate: (frame: WireFrame) => boolean, timeoutMs = 10_000): Promise<WireFrame> {
    const existing = this.frames.find(predicate)
    if (existing) {
      return existing
    }
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Frame not received in ${timeoutMs}ms. Got: ${JSON.stringify(this.frames)}`))
      }, timeoutMs)
      this.waiters.push({
        predicate,
        resolve: (frame) => {
          clearTimeout(timer)
          resolve(frame)
        },
      })
    })
  }

  close(): void {
    this.ws.close()
  }
}

const setup = async (): Promise<{ tp: TestProjectOneClient }> => {
  const tp = tpf.create()
  await tp.cleanup('ports')
  await tp.init()
  await writePoints(tp)
  tp.spawn(['bun', 'run', 'dev'])
  await tp.waitStarted()
  return { tp }
}

const connectChannel = async (
  tp: TestProjectOneClient,
  input: Record<string, unknown>,
  channelKebab = 'chat-channel',
): Promise<{ id: string; ticket: string; response: Response }> => {
  const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/${channelKebab}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    return { id: '', ticket: '', response }
  }
  // the connect answer is just { id, ticket } now — rooms arrive from join, not from the connector
  const data = (await response.json()) as { id: string; ticket: string }
  return { ...data, response }
}

const openAndClaim = async (tp: TestProjectOneClient, userId: string): Promise<{ wire: WireClient; cid: string }> => {
  const connect = await connectChannel(tp, { userId })
  expect(connect.response.ok).toBe(true)
  const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
  await wire.waitOpen()
  wire.send({ t: 'claim', ticket: connect.ticket })
  await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
  return { wire, cid: connect.id }
}

/** join a chatSpace room over an existing claimed socket; returns the serialized rooms the server admitted. */
const joinRoom = async (
  wire: WireClient,
  cid: string,
  chatId: string,
  joinId = 'j-' + chatId + '-' + cid,
): Promise<string[]> => {
  wire.send({ t: 'join', id: joinId, cid, space: 'chatSpace', input: JSON.stringify({ chatId }) })
  const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
  return joined.rooms as string[]
}

/** join a deskSpace room (a two-field room shape — the exact-vs-$room kick tests use it). */
const joinDesk = async (wire: WireClient, cid: string, deskId: string, zone: string): Promise<string[]> => {
  const joinId = 'jd-' + deskId + '-' + cid
  wire.send({ t: 'join', id: joinId, cid, space: 'deskSpace', input: JSON.stringify({ deskId, zone }) })
  const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
  return joined.rooms as string[]
}

/**
 * Poll a predicate instead of sleeping on a guess — the suite shares a loaded machine, so the budget is generous and
 * the step small. Throws with the last state so a real failure reads as a failure, not as a mystery timeout.
 */
const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  what: string,
  timeoutMs = 15_000,
): Promise<void> => {
  const startedAt = Date.now()
  for (;;) {
    if (await predicate()) {
      return
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for: ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
}

/** does this frame carry a messageReceivedHandler push with the given text? */
const isTextMsg =
  (text: string) =>
  (frame: WireFrame): boolean =>
    frame.t === 'msg' &&
    frame.handler === 'messageReceivedHandler' &&
    frame.input !== undefined &&
    (JSON.parse(frame.input as string) as { text: string }).text === text

describe('socket', () => {
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
    const created = await setup()
    tp = created.tp
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('connects over POST, claims the ticket, joins a room, sends and receives the serverReply', async () => {
    const { wire, cid } = await openAndClaim(tp, '5')
    try {
      const rooms = await joinRoom(wire, cid, '5')
      expect(rooms).toEqual([JSON.stringify({ chatId: '5' })])
      wire.send({
        t: 'send',
        id: 's1',
        cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: '5' }),
        input: JSON.stringify({ text: 'hello' }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's1')
      expect(JSON.parse(reply.data as string)).toEqual({
        ok: true,
        echo: 'hello',
        me: 'user-5',
        chatId: '5',
      })
    } finally {
      wire.close()
    }
  })

  it('join/joined/leave round-trip: a joiner deny yields an empty room list, leave stops room pushes', async () => {
    const { wire, cid } = await openAndClaim(tp, 'jl')
    try {
      // a normal join admits into the { chatId } room
      const rooms = await joinRoom(wire, cid, 'room-a', 'ja')
      expect(rooms).toEqual([JSON.stringify({ chatId: 'room-a' })])
      // the 'denied' room: the joiner returns undefined — joined with an empty room list, no joinErr
      const denied = await joinRoom(wire, cid, 'denied', 'jd')
      expect(denied).toEqual([])
      // leave the first room; a subsequent room push must not reach this socket
      wire.send({ t: 'leave', cid, space: 'chatSpace', rooms: [JSON.stringify({ chatId: 'room-a' })] })
      await new Promise((resolve) => setTimeout(resolve, 200))
      const pusher = await openAndClaim(tp, 'jl-push')
      pusher.wire.send({
        t: 'send',
        id: 'jp',
        cid: pusher.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'room-a', text: 'still there?' }),
      })
      await pusher.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'jp')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(
        wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler'),
      ).toBeUndefined()
      pusher.wire.close()
    } finally {
      wire.close()
    }
  })

  it('a denied join grants nothing: the connection is not in the space, a bare space-wide push never reaches it', async () => {
    // regression pin: an empty admitted-rooms list once created an empty participation and subscribed the socket to
    // the space-wide topic — a DENIED join kept hearing every bare space push
    const denied = await openAndClaim(tp, 'deny-iso')
    const member = await openAndClaim(tp, 'deny-member')
    try {
      // the ONLY join this connection ever attempts is cleanly denied (empty room list, no joinErr)
      const rooms = await joinRoom(denied.wire, denied.cid, 'denied', 'di')
      expect(rooms).toEqual([])
      await joinRoom(member.wire, member.cid, 'deny-room')
      member.wire.send({
        t: 'send',
        id: 'dw',
        cid: member.cid,
        handler: 'spaceWidePushHandler',
        input: JSON.stringify({ text: 'members-only' }),
      })
      await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dw')
      await member.wire.waitFrame(isTextMsg('members-only'))
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(denied.wire.frames.find((frame) => frame.t === 'msg' && frame.space === 'chatSpace')).toBeUndefined()
    } finally {
      denied.wire.close()
      member.wire.close()
    }
  })

  it('pushes a room message to the other member and honors except', async () => {
    const a = await openAndClaim(tp, 'pa')
    const b = await openAndClaim(tp, 'pb')
    try {
      await joinRoom(a.wire, a.cid, 'push')
      await joinRoom(b.wire, b.cid, 'push')
      a.wire.send({
        t: 'send',
        id: 's2',
        cid: a.cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: 'push' }),
        input: JSON.stringify({ text: 'to the room' }),
      })
      await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's2')
      const msg = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler')
      expect(msg.channel).toBe('chatChannel')
      // a room push carries the SPACE + ROOM it addresses
      expect(msg.space).toBe('chatSpace')
      expect(msg.room).toBe(JSON.stringify({ chatId: 'push' }))
      expect(JSON.parse(msg.input as string)).toEqual({ text: 'to the room', from: 'user-pa' })
      // the sender was excluded — the frame reaches its socket (room pub/sub is per-topic) but carries the except ids
      // (an array now), so the real client runtime drops it there
      expect(msg.exceptConnectionIds).toEqual([a.cid])
      await new Promise((resolve) => setTimeout(resolve, 300))
      const aMsg = a.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler')
      expect(aMsg?.exceptConnectionIds).toEqual([a.cid])
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('pushes to every connection matching an identity ($identity target)', async () => {
    // two connections share the identity user-im; a third does not — only the two get the push, direct with their cid
    const a = await openAndClaim(tp, 'im')
    const b = await openAndClaim(tp, 'im')
    const other = await openAndClaim(tp, 'im-other')
    const adm = await openAndClaim(tp, 'im-adm')
    try {
      adm.wire.send({
        t: 'send',
        id: 'im1',
        cid: adm.cid,
        handler: 'identityPushHandler',
        input: JSON.stringify({ me: 'user-im', text: 'ping-all' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'im1')
      const aMsg = await a.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'channelAnnounceHandler')
      const bMsg = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'channelAnnounceHandler')
      // a $identity push is a direct per-socket send carrying the cid; no space/room
      expect(aMsg.cid).toBe(a.cid)
      expect(aMsg.space).toBeUndefined()
      expect(JSON.parse(aMsg.input as string)).toEqual({ text: 'ping-all', from: 'system' })
      expect(bMsg.cid).toBe(b.cid)
      // the non-matching identity is left out
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(other.wire.frames.find((frame) => frame.t === 'msg')).toBeUndefined()
    } finally {
      a.wire.close()
      b.wire.close()
      other.wire.close()
      adm.wire.close()
    }
  })

  it('refuses a space-handler send that names a room the connection is not in (NOT_IN_ROOM)', async () => {
    const { wire, cid } = await openAndClaim(tp, 'nir')
    try {
      await joinRoom(wire, cid, 'mine')
      // name a room this connection never joined — the server refuses before running the reply
      wire.send({
        t: 'send',
        id: 'nir1',
        cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: 'not-mine' }),
        input: JSON.stringify({ text: 'sneak' }),
      })
      const sendErr = await wire.waitFrame((frame) => frame.t === 'sendErr' && frame.id === 'nir1')
      expect(String(sendErr.error)).toContain('POINT0_SOCKET_NOT_IN_ROOM')
    } finally {
      wire.close()
    }
  })

  it('collects clientReply answers from the whole room; the local expected count closes the window early', async () => {
    const a = await openAndClaim(tp, 'ca')
    const b = await openAndClaim(tp, 'cb')
    try {
      await joinRoom(a.wire, a.cid, 'collect')
      await joinRoom(b.wire, b.cid, 'collect')
      // both wires answer ping msg frames like the real client runtime would (.clientReply)
      for (const member of [a, b]) {
        void (async () => {
          const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
          member.wire.send({
            t: 'reply',
            id: msg.mid as string,
            cid: member.cid,
            data: JSON.stringify({ answer: 'pong:' + String(JSON.parse(msg.input as string).ask) }),
          })
        })()
      }
      a.wire.send({
        t: 'send',
        id: 's3',
        cid: a.cid,
        handler: 'pingCollectHandler',
        room: JSON.stringify({ chatId: 'collect' }),
      })
      const reply = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's3')
      const collected = JSON.parse(reply.data as string) as {
        answers: string[]
        cidsAreStrings: boolean
        elapsed: number
      }
      expect(collected.answers).toEqual(['pong:hi', 'pong:hi'])
      // every reply carries the answering connectionId
      expect(collected.cidsAreStrings).toBe(true)
      // no external backplane — the expected count (2 members) closed the window well before the 3000ms timeout
      expect(collected.elapsed).toBeLessThan(2500)
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it("a frame carrying ANOTHER client's cid is refused — the cid is an address, the SOCKET is the credential", async () => {
    const a = await openAndClaim(tp, 'ida')
    const b = await openAndClaim(tp, 'idb')
    try {
      await joinRoom(a.wire, a.cid, 'ident')
      // B knows A's cid (cids ride push frames — they are addresses, not secrets) and tries to speak as A: every
      // frame handler checks the cid's entry is bound to the PHYSICAL socket the frame arrived on
      b.wire.send({
        t: 'send',
        id: 'imp1',
        cid: a.cid,
        handler: 'spaceWidePushHandler',
        input: JSON.stringify({ text: 'evil' }),
      })
      const sendErr = await b.wire.waitFrame((frame) => frame.t === 'sendErr' && frame.id === 'imp1')
      expect(String(sendErr.error)).toContain('POINT0_SOCKET_CONNECTION_NOT_FOUND')
      // B tries to unsubscribe A from its room — silently refused, A keeps receiving pushes
      b.wire.send({ t: 'leave', cid: a.cid, space: 'chatSpace', rooms: [JSON.stringify({ chatId: 'ident' })] })
      await new Promise((resolve) => setTimeout(resolve, 150))
      a.wire.send({
        t: 'send',
        id: 'imp2',
        cid: a.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'ident', text: 'still-mine' }),
      })
      await a.wire.waitFrame(isTextMsg('still-mine'))
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it("refuses a join/send addressed to another channel's space/handler — no cross-channel identity smuggling", async () => {
    // a lobbyChannel connection carries the lobby connector's identity; chatChannel's spaces and handlers must be
    // "not found" for it (same message as a real miss — no oracle), or its identity would reach their callbacks
    const connect = await connectChannel(tp, {}, 'lobby-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      wire.send({ t: 'join', id: 'xj', cid: connect.id, space: 'chatSpace', input: JSON.stringify({ chatId: 'x' }) })
      const joinErr = await wire.waitFrame((frame) => frame.t === 'joinErr' && frame.id === 'xj')
      expect(String(joinErr.error)).toContain('POINT0_SOCKET_SPACE_NOT_FOUND')
      wire.send({
        t: 'send',
        id: 'xs',
        cid: connect.id,
        handler: 'spaceWidePushHandler',
        input: JSON.stringify({ text: 'x' }),
      })
      const sendErr = await wire.waitFrame((frame) => frame.t === 'sendErr' && frame.id === 'xs')
      expect(String(sendErr.error)).toContain('POINT0_SOCKET_HANDLER_NOT_FOUND')
    } finally {
      wire.close()
    }
  })

  it('drops duplicate replies to one collect mid — the flood neither closes the window early nor lands twice', async () => {
    const a = await openAndClaim(tp, 'dupa')
    const b = await openAndClaim(tp, 'dupb')
    try {
      await joinRoom(a.wire, a.cid, 'dup')
      await joinRoom(b.wire, b.cid, 'dup')
      // b answers the ping THREE times (the protocol allows sending any number of reply frames); a answers once, late
      void (async () => {
        const msg = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        for (const answer of ['pong:first', 'pong:dup2', 'pong:dup3']) {
          b.wire.send({ t: 'reply', id: msg.mid as string, cid: b.cid, data: JSON.stringify({ answer }) })
        }
      })()
      void (async () => {
        const msg = await a.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        await new Promise((resolve) => setTimeout(resolve, 400))
        a.wire.send({ t: 'reply', id: msg.mid as string, cid: a.cid, data: JSON.stringify({ answer: 'pong:late' }) })
      })()
      a.wire.send({
        t: 'send',
        id: 'dup1',
        cid: a.cid,
        handler: 'pingCollectHandler',
        room: JSON.stringify({ chatId: 'dup' }),
      })
      const reply = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dup1')
      const collected = JSON.parse(reply.data as string) as { answers: string[]; elapsed: number }
      // exactly one answer per member: b's FIRST reply and a's late one — the two dups were dropped
      expect(collected.answers).toEqual(['pong:first', 'pong:late'])
      // the window WAITED for a (the dup flood did not advance the count) and closed on its reply, not on the timeout
      expect(collected.elapsed).toBeGreaterThanOrEqual(380)
      expect(collected.elapsed).toBeLessThan(2500)
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('drops replies from an excepted connection — the window closes on the honest member alone', async () => {
    const a = await openAndClaim(tp, 'exca')
    const b = await openAndClaim(tp, 'excb')
    try {
      await joinRoom(a.wire, a.cid, 'exc')
      await joinRoom(b.wire, b.cid, 'exc')
      // b is excepted from the push but still receives the frame — a raw client replies anyway, instantly
      void (async () => {
        const msg = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        b.wire.send({ t: 'reply', id: msg.mid as string, cid: b.cid, data: JSON.stringify({ answer: 'pong:evil' }) })
      })()
      void (async () => {
        const msg = await a.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        await new Promise((resolve) => setTimeout(resolve, 300))
        a.wire.send({ t: 'reply', id: msg.mid as string, cid: a.cid, data: JSON.stringify({ answer: 'pong:honest' }) })
      })()
      a.wire.send({
        t: 'send',
        id: 'exc1',
        cid: a.cid,
        handler: 'exceptCollectHandler',
        input: JSON.stringify({ chatId: 'exc', exceptCid: b.cid }),
      })
      const reply = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'exc1')
      const collected = JSON.parse(reply.data as string) as { answers: string[]; elapsed: number }
      // b's early reply was dropped — had it counted, the window (expected: 1) would have closed with b's answer
      expect(collected.answers).toEqual(['pong:honest'])
      expect(collected.elapsed).toBeGreaterThanOrEqual(280)
      expect(collected.elapsed).toBeLessThan(1400)
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('space.enroll: the server enrolls live connections into rooms; kick undoes it; room-part targets need membership', async () => {
    const a = await openAndClaim(tp, 'ena')
    const b = await openAndClaim(tp, 'enb')
    try {
      // enroll A by identity into 'enr' — A never joined chatSpace; B stays untouched
      a.wire.send({
        t: 'send',
        id: 'en1',
        cid: a.cid,
        handler: 'adminEnrollHandler',
        input: JSON.stringify({ me: 'user-ena', chatIds: ['enr'] }),
      })
      const enrolledFrame = await a.wire.waitFrame((frame) => frame.t === 'enrolled' && frame.cid === a.cid)
      expect(enrolledFrame.space).toBe('chatSpace')
      expect(enrolledFrame.rooms).toEqual([JSON.stringify({ chatId: 'enr' })])
      // a room push reaches the enrolled A and not B
      a.wire.send({
        t: 'send',
        id: 'en2',
        cid: a.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'enr', text: 'hello-enrolled' }),
      })
      await a.wire.waitFrame(isTextMsg('hello-enrolled'))
      expect(b.wire.frames.some(isTextMsg('hello-enrolled'))).toBe(false)
      // a room-part target selects those ALREADY in the room: A (in 'enr') gains 'enr2', B does not qualify
      a.wire.send({
        t: 'send',
        id: 'en3',
        cid: a.cid,
        handler: 'adminEnrollHandler',
        input: JSON.stringify({ inRoomChatId: 'enr', chatIds: ['enr2'] }),
      })
      const grown = await a.wire.waitFrame(
        (frame) => frame.t === 'enrolled' && frame.cid === a.cid && (frame.rooms as string[]).length === 2,
      )
      expect(grown.rooms).toEqual([JSON.stringify({ chatId: 'enr' }), JSON.stringify({ chatId: 'enr2' })])
      expect(b.wire.frames.some((frame) => frame.t === 'enrolled')).toBe(false)
      // the space kick undoes an enrollment like any membership — the enroll/kick pair is symmetric
      a.wire.send({
        t: 'send',
        id: 'en4',
        cid: a.cid,
        handler: 'adminSpaceKickHandler',
        input: JSON.stringify({ chatId: 'enr' }),
      })
      const left = await a.wire.waitFrame((frame) => frame.t === 'left' && frame.cid === a.cid)
      expect(left.rooms).toEqual([JSON.stringify({ chatId: 'enr' })])
      // the kicked room is silent now; the other enrolled room still delivers
      a.wire.send({
        t: 'send',
        id: 'en5',
        cid: a.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'enr2', text: 'still-enrolled' }),
      })
      await a.wire.waitFrame(isTextMsg('still-enrolled'))
      expect(a.wire.frames.filter(isTextMsg('hello-enrolled')).length).toBe(1)
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('maxRooms bounds the rooms per connection; a join is a UNION — repeats add nothing and never trip the cap', async () => {
    const { wire, cid } = await openAndClaim(tp, 'caps')
    try {
      const join = async (space: string, input: Record<string, unknown>, id: string): Promise<WireFrame> => {
        wire.send({ t: 'join', id, cid, space, input: JSON.stringify(input) })
        return await wire.waitFrame((frame) => (frame.t === 'joined' || frame.t === 'joinErr') && frame.id === id)
      }
      // cappedSpace: maxRooms 2, one room per join — two rooms fit, a repeat join unions (still 2), the third trips
      expect((await join('cappedSpace', { slot: 'one' }, 'c1')).t).toBe('joined')
      expect((await join('cappedSpace', { slot: 'two' }, 'c2')).t).toBe('joined')
      expect((await join('cappedSpace', { slot: 'one' }, 'c3')).t).toBe('joined')
      const third = await join('cappedSpace', { slot: 'three' }, 'c4')
      expect(third.t).toBe('joinErr')
      expect(String(third.error)).toContain('POINT0_SOCKET_MAX_ROOMS')
      // roomsCappedSpace: maxRooms 3, each join admits two rooms — a second distinct join would make four
      expect((await join('roomsCappedSpace', { k: 'ka' }, 'r1')).t).toBe('joined')
      const overflow = await join('roomsCappedSpace', { k: 'kb' }, 'r2')
      expect(overflow.t).toBe('joinErr')
      expect(String(overflow.error)).toContain('POINT0_SOCKET_MAX_ROOMS')
      // a repeat of an already-held input adds nothing — the union keeps it under the cap
      expect((await join('roomsCappedSpace', { k: 'ka' }, 'r3')).t).toBe('joined')
    } finally {
      wire.close()
    }
  })

  it('two different join inputs resolving to ONE room: the server holds it once — one push frame, one reply', async () => {
    const { wire, cid } = await openAndClaim(tp, 'dm')
    try {
      const joinDm = async (a: string, b: string, id: string): Promise<WireFrame> => {
        wire.send({ t: 'join', id, cid, space: 'dmSpace', input: JSON.stringify({ a, b }) })
        return await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === id)
      }
      const roomSerialized = JSON.stringify({ pair: 'x+y' })
      expect((await joinDm('x', 'y', 'dm1')).rooms).toEqual([roomSerialized])
      expect((await joinDm('y', 'x', 'dm2')).rooms).toEqual([roomSerialized])
      // the raw client answers each incoming frame once — a collect over the room must see exactly ONE frame/reply
      void (async () => {
        const msg = await wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'dmPingHandler')
        wire.send({ t: 'reply', id: msg.mid as string, cid, data: JSON.stringify({ answer: 'dm:hi' }) })
      })()
      wire.send({ t: 'send', id: 'dmc', cid, handler: 'dmCollectHandler', input: JSON.stringify({ pair: 'x+y' }) })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dmc')
      expect((JSON.parse(reply.data as string) as { answers: string[] }).answers).toEqual(['dm:hi'])
      const dmFrames = wire.frames.filter((frame) => frame.t === 'msg' && frame.handler === 'dmPingHandler')
      expect(dmFrames).toHaveLength(1)
      // leaving the room ONCE removes it — the server never held it twice
      wire.send({ t: 'leave', cid, space: 'dmSpace', rooms: [roomSerialized] })
      await new Promise((resolve) => setTimeout(resolve, 150))
      wire.send({ t: 'send', id: 'dmc2', cid, handler: 'dmCollectHandler', input: JSON.stringify({ pair: 'x+y' }) })
      const empty = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dmc2')
      expect((JSON.parse(empty.data as string) as { answers: string[] }).answers).toEqual([])
    } finally {
      wire.close()
    }
  })

  it('rejects an invalid message input with a typed sendErr', async () => {
    const { wire, cid } = await openAndClaim(tp, 'invalid')
    try {
      await joinRoom(wire, cid, 'invalid')
      wire.send({
        t: 'send',
        id: 's4',
        cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: 'invalid' }),
        input: JSON.stringify({ text: '' }),
      })
      const sendErr = await wire.waitFrame((frame) => frame.t === 'sendErr' && frame.id === 's4')
      expect(String(sendErr.error)).toContain('message')
    } finally {
      wire.close()
    }
  })

  it('a loaderless channel connects and claims — the connect answer is just { id, ticket }', async () => {
    const response = await fetch(`http://localhost:${tp.serverPort}/_point0/root/channel/lobby-channel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(response.ok).toBe(true)
    const data = (await response.json()) as { id: string; ticket: string; room?: unknown }
    expect(data.id).toBeTruthy()
    expect(data.ticket).toBeTruthy()
    // no room on the connect — rooms come from join now
    expect(data.room).toBeUndefined()
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: data.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === data.id)
    } finally {
      wire.close()
    }
  })

  it('cold-start GET+Upgrade connect: the first frame is claimed, then join and send work on that socket', async () => {
    // no fetch — the WebSocket opens straight against the channel endpoint with the input in the query string; the
    // pipeline runs, the connector produces the identity, the very handshake becomes the connection
    const input = encodeURIComponent(JSON.stringify({ userId: 'up' }))
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/channel/chat-channel?input=${input}`)
    try {
      await wire.waitOpen()
      const claimed = await wire.waitFrame((frame) => frame.t === 'claimed')
      const cid = claimed.cid as string
      expect(cid).toBeTruthy()
      // a join over the very same socket
      wire.send({ t: 'join', id: 'u1', cid, space: 'chatSpace', input: JSON.stringify({ chatId: 'up' }) })
      const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'u1')
      expect(joined.rooms).toEqual([JSON.stringify({ chatId: 'up' })])
      // and a space-handler send
      wire.send({
        t: 'send',
        id: 'u2',
        cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: 'up' }),
        input: JSON.stringify({ text: 'cold' }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'u2')
      expect(JSON.parse(reply.data as string)).toMatchObject({ ok: true, echo: 'cold', me: 'user-up', chatId: 'up' })
    } finally {
      wire.close()
    }
  })

  it('a throwing enroller fails the whole connection setup — claimErr, no claimed frame', async () => {
    const connect = await connectChannel(tp, { userId: 'cursed' }, 'cursed-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      wire.send({ t: 'claim', ticket: connect.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('enrollment refused')
      expect(wire.frames.some((frame) => frame.t === 'claimed')).toBe(false)
      // the same channel claims fine for an identity the enroller accepts — with its enrollment on the claimed frame
      const ok = await connectChannel(tp, { userId: 'fine' }, 'cursed-channel')
      wire.send({ t: 'claim', ticket: ok.ticket })
      const claimed = await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === ok.id)
      expect((claimed.enrolled as Array<{ space: string }>)[0].space).toBe('cursedSpace')
    } finally {
      wire.close()
    }
  })

  it('rejects a bogus ticket with claimErr', async () => {
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: 'bogus-ticket' })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('ticket')
      // infra refusals serialize through the root error class with a registry code
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
    } finally {
      wire.close()
    }
  })

  it('a throwing connector rejects the connect POST with the typed error', async () => {
    const connect = await connectChannel(tp, { userId: 'forbidden' })
    expect(connect.response.ok).toBe(false)
    const errorJson = (await connect.response.json()) as { message?: string }
    expect(errorJson.message).toContain('Not a member')
  })

  it('reconnects: a fresh connect POST, claim and re-join works after the socket dies', async () => {
    const first = await openAndClaim(tp, 'reconnect')
    first.wire.close()
    // every held connection re-sends its connect POST and re-joins its spaces on reconnect — emulate the client runtime
    const second = await openAndClaim(tp, 'reconnect')
    try {
      await joinRoom(second.wire, second.cid, 'reconnect')
      second.wire.send({
        t: 'send',
        id: 's5',
        cid: second.cid,
        handler: 'messageSendHandler',
        room: JSON.stringify({ chatId: 'reconnect' }),
        input: JSON.stringify({ text: 'back' }),
      })
      const reply = await second.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's5')
      expect(JSON.parse(reply.data as string)).toMatchObject({ ok: true, echo: 'back' })
    } finally {
      second.wire.close()
    }
  })

  it('a closed connection stops receiving room pushes', async () => {
    const a = await openAndClaim(tp, 'la')
    const b = await openAndClaim(tp, 'lb')
    try {
      await joinRoom(a.wire, a.cid, 'leave')
      await joinRoom(b.wire, b.cid, 'leave')
      b.wire.send({ t: 'close', cid: b.cid })
      await new Promise((resolve) => setTimeout(resolve, 200))
      a.wire.send({
        t: 'send',
        id: 's6',
        cid: a.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'leave', text: 'anyone here?' }),
      })
      await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 's6')
      await new Promise((resolve) => setTimeout(resolve, 300))
      const bMsg = b.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler')
      expect(bMsg).toBeUndefined()
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('channel kick by identity matcher: the connection gets closed, stops receiving, others keep receiving', async () => {
    const a = await openAndClaim(tp, 'ka')
    const b = await openAndClaim(tp, 'kb')
    const adm = await openAndClaim(tp, 'adm')
    try {
      await joinRoom(a.wire, a.cid, 'ka')
      await joinRoom(b.wire, b.cid, 'kb')
      adm.wire.send({
        t: 'send',
        id: 'k1',
        cid: adm.cid,
        handler: 'adminKickHandler',
        input: JSON.stringify({ me: 'user-ka', reason: 'gone' }),
      })
      const closed = await a.wire.waitFrame((frame) => frame.t === 'closed')
      expect(closed.cid).toBe(a.cid)
      expect(closed.reason).toBe('gone')
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'k1')

      // a room push to the kicked connection's room does not reach it anymore
      adm.wire.send({
        t: 'send',
        id: 'k2',
        cid: adm.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'ka', text: 'still there?' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'k2')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(a.wire.frames.find((frame) => frame.t === 'msg')).toBeUndefined()

      // the other member keeps receiving room pushes
      adm.wire.send({
        t: 'send',
        id: 'k3',
        cid: adm.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'kb', text: 'hi b' }),
      })
      const bMsg = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler')
      expect(JSON.parse(bMsg.input as string)).toEqual({ text: 'hi b', from: 'system' })
    } finally {
      a.wire.close()
      b.wire.close()
      adm.wire.close()
    }
  })

  it('channel kick by connectionId closes exactly that connection, not its identity twin', async () => {
    const x = await openAndClaim(tp, 'kc')
    const y = await openAndClaim(tp, 'kc') // the SAME identity — proves the cid part targets, not the identity
    const adm = await openAndClaim(tp, 'kc-adm')
    try {
      adm.wire.send({
        t: 'send',
        id: 'kc1',
        cid: adm.cid,
        handler: 'adminKickHandler',
        input: JSON.stringify({ cid: x.cid, reason: 'bye' }),
      })
      const closed = await x.wire.waitFrame((frame) => frame.t === 'closed')
      expect(closed.cid).toBe(x.cid)
      expect(closed.reason).toBe('bye')
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'kc1')
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(y.wire.frames.find((frame) => frame.t === 'closed')).toBeUndefined()
    } finally {
      x.wire.close()
      y.wire.close()
      adm.wire.close()
    }
  })

  it('space kick forces a `left` (not a close): the connection survives, its membership shrinks, the topic is released', async () => {
    const member = await openAndClaim(tp, 'sk')
    const adm = await openAndClaim(tp, 'sk-adm')
    try {
      await joinRoom(member.wire, member.cid, 'sk-room')
      adm.wire.send({
        t: 'send',
        id: 'sk1',
        cid: adm.cid,
        handler: 'adminSpaceKickHandler',
        input: JSON.stringify({ chatId: 'sk-room', reason: 'room-closed' }),
      })
      const left = await member.wire.waitFrame((frame) => frame.t === 'left')
      expect(left.cid).toBe(member.cid)
      expect(left.space).toBe('chatSpace')
      expect(left.rooms).toEqual([JSON.stringify({ chatId: 'sk-room' })])
      expect(left.reason).toBe('room-closed')
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'sk1')
      // the connection is NOT closed — it never received a `closed` frame and still answers sends
      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(member.wire.frames.find((frame) => frame.t === 'closed')).toBeUndefined()
      // a fresh join still works on the same live connection
      const rooms = await joinRoom(member.wire, member.cid, 'sk-again', 'sk-rejoin')
      expect(rooms).toEqual([JSON.stringify({ chatId: 'sk-again' })])
      // the kicked room's topic was released — a later push to it never reaches this socket
      adm.wire.send({
        t: 'send',
        id: 'sk2',
        cid: adm.cid,
        handler: 'roomPushHandler',
        input: JSON.stringify({ chatId: 'sk-room', text: 'anyone left?' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'sk2')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(member.wire.frames.find(isTextMsg('anyone left?'))).toBeUndefined()
    } finally {
      member.wire.close()
      adm.wire.close()
    }
  })

  it('space kick: an exact `room` snapshot removes just that room, `$room` selects by subset', async () => {
    const member = await openAndClaim(tp, 'desk')
    const zoneB = await openAndClaim(tp, 'desk-b')
    try {
      // two memberships of deskSpace on one connection, both in zone a; the other member sits in zone b
      expect(await joinDesk(member.wire, member.cid, 'd1', 'a')).toEqual([JSON.stringify({ deskId: 'd1', zone: 'a' })])
      expect(await joinDesk(member.wire, member.cid, 'd2', 'a')).toEqual([JSON.stringify({ deskId: 'd2', zone: 'a' })])
      await joinDesk(zoneB.wire, zoneB.cid, 'd3', 'b')
      // the exact snapshot kicks ONLY { d1, a } — full-object equality, not a selection
      zoneB.wire.send({
        t: 'send',
        id: 'dk1',
        cid: zoneB.cid,
        handler: 'adminDeskKickHandler',
        input: JSON.stringify({ exact: { deskId: 'd1', zone: 'a' }, reason: 'exact' }),
      })
      const leftExact = await member.wire.waitFrame((frame) => frame.t === 'left' && frame.reason === 'exact')
      expect(leftExact.space).toBe('deskSpace')
      expect(leftExact.rooms).toEqual([JSON.stringify({ deskId: 'd1', zone: 'a' })])
      await zoneB.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dk1')
      // the subset $room selection: zone 'a' matches d2 whatever its deskId
      zoneB.wire.send({
        t: 'send',
        id: 'dk2',
        cid: zoneB.cid,
        handler: 'adminDeskKickHandler',
        input: JSON.stringify({ zone: 'a', reason: 'subset' }),
      })
      const leftSubset = await member.wire.waitFrame((frame) => frame.t === 'left' && frame.reason === 'subset')
      expect(leftSubset.rooms).toEqual([JSON.stringify({ deskId: 'd2', zone: 'a' })])
      await zoneB.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'dk2')
      // the zone-b member was never touched
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(zoneB.wire.frames.find((frame) => frame.t === 'left')).toBeUndefined()
    } finally {
      member.wire.close()
      zoneB.wire.close()
    }
  })

  it('a push by `$room` reaches every member whose room matches the subset, one frame per matched room', async () => {
    const zoneA = await openAndClaim(tp, 'push-a')
    const zoneB = await openAndClaim(tp, 'push-b')
    const adm = await openAndClaim(tp, 'push-adm')
    try {
      // zoneA holds TWO zone-a desks (two matched rooms → two frames); zoneB sits in zone b (no match)
      await joinDesk(zoneA.wire, zoneA.cid, 'd1', 'a')
      await joinDesk(zoneA.wire, zoneA.cid, 'd2', 'a')
      await joinDesk(zoneB.wire, zoneB.cid, 'd3', 'b')
      adm.wire.send({
        t: 'send',
        id: 'zp1',
        cid: adm.cid,
        handler: 'deskZonePushHandler',
        input: JSON.stringify({ zone: 'a', note: 'zone-a only' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'zp1')
      await zoneA.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'deskNoticeHandler')
      await new Promise((resolve) => setTimeout(resolve, 200))
      const zoneAMsgs = zoneA.wire.frames.filter((frame) => frame.t === 'msg' && frame.handler === 'deskNoticeHandler')
      expect(zoneAMsgs.map((frame) => frame.room).sort()).toEqual([
        JSON.stringify({ deskId: 'd1', zone: 'a' }),
        JSON.stringify({ deskId: 'd2', zone: 'a' }),
      ])
      for (const frame of zoneAMsgs) {
        expect(JSON.parse(frame.input as string)).toEqual({ note: 'zone-a only' })
      }
      // the zone-b member saw nothing
      expect(
        zoneB.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'deskNoticeHandler'),
      ).toBeUndefined()
    } finally {
      zoneA.wire.close()
      zoneB.wire.close()
      adm.wire.close()
    }
  })

  it('a join on a space with no .joiner is refused — POINT0_SOCKET_JOIN_NOT_ALLOWED, whatever the input asks for', async () => {
    // THE ATTACK: userSpace is enroller-only and its rooms are personal. A hand-framed join naming SOMEONE ELSE's room
    // used to be honored (the room was the parsed input); now the space refuses every client join outright
    const attacker = await openAndClaim(tp, 'nojoin')
    const victim = await openAndClaim(tp, 'victim')
    const adm = await openAndClaim(tp, 'nojoin-adm')
    try {
      attacker.wire.send({
        t: 'join',
        id: 'nj1',
        cid: attacker.cid,
        space: 'userSpace',
        input: JSON.stringify({ userId: 'user-victim' }),
      })
      const refused = await attacker.wire.waitFrame((frame) => frame.t === 'joinErr' && frame.id === 'nj1')
      expect(String(refused.error)).toContain('POINT0_SOCKET_JOIN_NOT_ALLOWED')
      // …and it left no membership behind: the victim's personal push reaches the victim and nobody else
      adm.wire.send({
        t: 'send',
        id: 'nj-p',
        cid: adm.cid,
        handler: 'personalPushHandler',
        input: JSON.stringify({ me: 'user-victim', text: 'secret' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'nj-p')
      const delivered = await victim.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'personalHandler')
      expect(JSON.parse(delivered.input as string)).toEqual({ text: 'secret' })
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(
        attacker.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'personalHandler'),
      ).toBeUndefined()
    } finally {
      attacker.wire.close()
      victim.wire.close()
      adm.wire.close()
    }
  })

  it('a global space (default room, joiner(() => ({}))) joins and takes the space-wide push', async () => {
    const { wire, cid } = await openAndClaim(tp, 'glob')
    const pusher = await openAndClaim(tp, 'glob-push')
    try {
      wire.send({ t: 'join', id: 'gj', cid, space: 'globalSpace', input: JSON.stringify({}) })
      const joined = await wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'gj')
      // the one global room is the empty object
      expect(joined.rooms).toEqual([JSON.stringify({})])
      pusher.wire.send({
        t: 'send',
        id: 'gp',
        cid: pusher.cid,
        handler: 'globalPushHandler',
        input: JSON.stringify({ text: 'everyone' }),
      })
      await pusher.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'gp')
      const msg = await wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'globalNoticeHandler')
      expect(msg.space).toBe('globalSpace')
      expect(JSON.parse(msg.input as string)).toEqual({ text: 'everyone' })
    } finally {
      wire.close()
      pusher.wire.close()
    }
  })

  it('.enroller: the claimed frame carries the enrolled rooms and a personal-room push lands, no join involved', async () => {
    const enrolledRoom = JSON.stringify({ userId: 'user-en1' })
    const member = await openAndClaim(tp, 'en1')
    const adm = await openAndClaim(tp, 'en1-adm')
    try {
      // the ticket-path claimed frame announces the server-side enrollment
      const claimed = member.wire.frames.find((frame) => frame.t === 'claimed')
      expect(claimed?.enrolled).toEqual([{ space: 'userSpace', rooms: [enrolledRoom] }])
      // a push to the personal enrolled room reaches the member over the room topic
      adm.wire.send({
        t: 'send',
        id: 'en-p',
        cid: adm.cid,
        handler: 'personalPushHandler',
        input: JSON.stringify({ me: 'user-en1', text: 'yours' }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'en-p')
      const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'personalHandler')
      expect(msg.space).toBe('userSpace')
      expect(msg.room).toBe(enrolledRoom)
      expect(JSON.parse(msg.input as string)).toEqual({ text: 'yours' })
      // the admin is enrolled into a DIFFERENT personal room — it never got the push
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(adm.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'personalHandler')).toBeUndefined()
    } finally {
      member.wire.close()
      adm.wire.close()
    }
  })

  it('.enroller runs on the cold-start GET+Upgrade path too — its claimed frame carries the enrolled rooms', async () => {
    const input = encodeURIComponent(JSON.stringify({ userId: 'en-up' }))
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/channel/chat-channel?input=${input}`)
    try {
      await wire.waitOpen()
      const claimed = await wire.waitFrame((frame) => frame.t === 'claimed')
      expect(claimed.enrolled).toEqual([{ space: 'userSpace', rooms: [JSON.stringify({ userId: 'user-en-up' })] }])
    } finally {
      wire.close()
    }
  })

  it('a bare space-handler send is space-wide: every member (joined or enrolled) gets it, a non-member does not', async () => {
    const a = await openAndClaim(tp, 'sw-a')
    const b = await openAndClaim(tp, 'sw-b')
    const outsider = await openAndClaim(tp, 'sw-out')
    try {
      await joinRoom(a.wire, a.cid, 'sw-1')
      await joinRoom(b.wire, b.cid, 'sw-2') // a DIFFERENT room of the same space
      a.wire.send({
        t: 'send',
        id: 'sw',
        cid: a.cid,
        handler: 'spaceWidePushHandler',
        input: JSON.stringify({ text: 'to-everyone' }),
      })
      await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'sw')
      const aMsg = await a.wire.waitFrame(isTextMsg('to-everyone'))
      const bMsg = await b.wire.waitFrame(isTextMsg('to-everyone'))
      // a space-wide frame carries the space and NO room
      expect(aMsg.space).toBe('chatSpace')
      expect(aMsg.room).toBeUndefined()
      expect(JSON.parse(bMsg.input as string)).toEqual({ text: 'to-everyone', from: 'wide' })
      // the outsider holds no chatSpace membership — its socket is not on the space topic
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(
        outsider.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'messageReceivedHandler'),
      ).toBeUndefined()
      // the ENROLLED space: a bare send reaches even connections that never joined anything — everyone is enrolled
      a.wire.send({
        t: 'send',
        id: 'uw',
        cid: a.cid,
        handler: 'userWidePushHandler',
        input: JSON.stringify({ text: 'all-enrolled' }),
      })
      const outsiderMsg = await outsider.wire.waitFrame(
        (frame) => frame.t === 'msg' && frame.handler === 'personalHandler',
      )
      expect(outsiderMsg.space).toBe('userSpace')
      expect(outsiderMsg.room).toBeUndefined()
    } finally {
      a.wire.close()
      b.wire.close()
      outsider.wire.close()
    }
  })

  it('except: by a connection-id array on the frame, by a room snapshot filtered server-side and on the frame', async () => {
    const a = await openAndClaim(tp, 'ex-a') // in ex-room AND ex-other
    const b = await openAndClaim(tp, 'ex-b') // in ex-room only
    try {
      await joinRoom(a.wire, a.cid, 'ex-room')
      await joinRoom(a.wire, a.cid, 'ex-other')
      await joinRoom(b.wire, b.cid, 'ex-room')
      // except by cid array — the pub/sub frame carries the array; the real client runtime drops it there
      b.wire.send({
        t: 'send',
        id: 'ex1',
        cid: b.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({ chatId: 'ex-room', exceptCids: [a.cid, b.cid], text: 'cids' }),
      })
      await b.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ex1')
      const cidsMsg = await b.wire.waitFrame(isTextMsg('cids'))
      expect(cidsMsg.exceptConnectionIds).toEqual([a.cid, b.cid])
      // except by a room snapshot on a NARROWED target ($identity forces the direct path): the server filters — the
      // member of the excluded room gets NOTHING at all
      b.wire.send({
        t: 'send',
        id: 'ex2',
        cid: b.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({
          chatId: 'ex-room',
          me: 'user-ex-a',
          exceptChatIds: ['ex-other'],
          text: 'rooms-narrowed',
        }),
      })
      await b.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ex2')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(a.wire.frames.find(isTextMsg('rooms-narrowed'))).toBeUndefined()
      // the same except on the pure pub/sub path rides the frame as exceptRooms (the client filters)
      b.wire.send({
        t: 'send',
        id: 'ex3',
        cid: b.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({ chatId: 'ex-room', exceptChatIds: ['ex-other'], text: 'rooms-pubsub' }),
      })
      const pubsubMsg = await b.wire.waitFrame(isTextMsg('rooms-pubsub'))
      expect(pubsubMsg.exceptRooms).toEqual([JSON.stringify({ chatId: 'ex-other' })])
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('AND-combined targets: { room, $identity } narrows, { connectionId } addresses, { $identity } scans the space', async () => {
    const a = await openAndClaim(tp, 'and-a')
    const b = await openAndClaim(tp, 'and-b')
    try {
      await joinRoom(a.wire, a.cid, 'and-room')
      await joinRoom(b.wire, b.cid, 'and-room')
      // { room, $identity } — both sit in the room, only the matching identity gets a direct cid-carrying frame
      a.wire.send({
        t: 'send',
        id: 'and1',
        cid: a.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({ chatId: 'and-room', me: 'user-and-b', text: 'narrowed' }),
      })
      const narrowed = await b.wire.waitFrame(isTextMsg('narrowed'))
      expect(narrowed.cid).toBe(b.cid)
      expect(narrowed.room).toBe(JSON.stringify({ chatId: 'and-room' }))
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(a.wire.frames.find(isTextMsg('narrowed'))).toBeUndefined()
      // { connectionId } on a space handler — space-wide narrowed to one connection: space set, no room
      a.wire.send({
        t: 'send',
        id: 'and2',
        cid: a.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({ cid: b.cid, text: 'by-cid' }),
      })
      const byCid = await b.wire.waitFrame(isTextMsg('by-cid'))
      expect(byCid.space).toBe('chatSpace')
      expect(byCid.cid).toBe(b.cid)
      expect(byCid.room).toBeUndefined()
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(a.wire.frames.find(isTextMsg('by-cid'))).toBeUndefined()
      // { $identity } alone on a space handler — a scan over the space members
      a.wire.send({
        t: 'send',
        id: 'and3',
        cid: a.cid,
        handler: 'targetedRoomPushHandler',
        input: JSON.stringify({ me: 'user-and-a', text: 'by-identity' }),
      })
      const byIdentity = await a.wire.waitFrame(isTextMsg('by-identity'))
      expect(byIdentity.cid).toBe(a.cid)
      // a CHANNEL handler narrowed by exact connection ids
      a.wire.send({
        t: 'send',
        id: 'and4',
        cid: a.cid,
        handler: 'cidAnnounceHandler',
        input: JSON.stringify({ cids: [b.cid], text: 'chan-cid' }),
      })
      const chanCid = await b.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'channelAnnounceHandler')
      expect(chanCid.cid).toBe(b.cid)
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(
        a.wire.frames.find((frame) => frame.t === 'msg' && frame.handler === 'channelAnnounceHandler'),
      ).toBeUndefined()
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('connections.list enumerates matching live connections with { connectionId, identity, spaces }', async () => {
    const target = await openAndClaim(tp, 'conn-1')
    const adm = await openAndClaim(tp, 'conn-adm')
    try {
      adm.wire.send({
        t: 'send',
        id: 'l1',
        cid: adm.cid,
        handler: 'adminListHandler',
        input: JSON.stringify({ me: 'user-conn-1' }),
      })
      const reply = await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'l1')
      const { list } = JSON.parse(reply.data as string) as {
        list: Array<{ connectionId: string; identity: { me: string }; spaces: Record<string, unknown[]> }>
      }
      expect(list).toHaveLength(1)
      expect(list[0].connectionId).toBe(target.cid)
      expect(list[0].identity).toEqual({ me: 'user-conn-1' })
      // the enrolled userSpace membership rides the snapshot, parsed per space
      expect(list[0].spaces).toEqual({ userSpace: [{ userId: 'user-conn-1' }] })
    } finally {
      target.wire.close()
      adm.wire.close()
    }
  })

  it('memberships.list enumerates the connections in a room with { connectionId, identity, rooms }', async () => {
    const target = await openAndClaim(tp, 'sc')
    const adm = await openAndClaim(tp, 'sc-adm')
    try {
      await joinRoom(target.wire, target.cid, 'sc-room')
      adm.wire.send({
        t: 'send',
        id: 'sl1',
        cid: adm.cid,
        handler: 'adminSpaceListHandler',
        input: JSON.stringify({ chatId: 'sc-room' }),
      })
      const reply = await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'sl1')
      const { list } = JSON.parse(reply.data as string) as {
        list: Array<{ connectionId: string; identity: { me: string }; rooms: Array<{ chatId: string }> }>
      }
      expect(list).toHaveLength(1)
      expect(list[0].connectionId).toBe(target.cid)
      expect(list[0].identity).toEqual({ me: 'user-sc' })
      expect(list[0].rooms).toEqual([{ chatId: 'sc-room' }])
    } finally {
      target.wire.close()
      adm.wire.close()
    }
  })

  it('count/list/forEach enumerate over the local path: counts, the streamed callback form and the iterable form agree', async () => {
    const a = await openAndClaim(tp, 'enum')
    const b = await openAndClaim(tp, 'enum') // the same identity — both match { me: 'user-enum' }
    const other = await openAndClaim(tp, 'enum-other')
    try {
      await joinRoom(a.wire, a.cid, 'enum-room')
      await joinRoom(b.wire, b.cid, 'enum-room')
      other.wire.send({
        t: 'send',
        id: 'en1',
        cid: other.cid,
        handler: 'adminEnumerateHandler',
        input: JSON.stringify({ me: 'user-enum', chatId: 'enum-room' }),
      })
      const reply = await other.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'en1')
      const out = JSON.parse(reply.data as string) as {
        channelCount: number
        roomCount: number
        processed: number
        seen: string[]
        iterated: string[]
      }
      expect(out.channelCount).toBe(2)
      expect(out.roomCount).toBe(2)
      // forEach with the callback resolves with the processed count; the iterable form streams the same items
      expect(out.processed).toBe(2)
      expect([...out.seen].sort()).toEqual([a.cid, b.cid].sort())
      expect([...out.iterated].sort()).toEqual([a.cid, b.cid].sort())
    } finally {
      a.wire.close()
      b.wire.close()
      other.wire.close()
    }
  })

  it('the synchronous local floor: connections.local + memberships.local read this process without a bus', async () => {
    const a = await openAndClaim(tp, 'loc')
    const b = await openAndClaim(tp, 'loc') // same identity { me: 'user-loc' }
    const other = await openAndClaim(tp, 'loc-other')
    try {
      await joinRoom(a.wire, a.cid, 'loc-room')
      await joinRoom(b.wire, b.cid, 'loc-room')
      other.wire.send({
        t: 'send',
        id: 'lo1',
        cid: other.cid,
        handler: 'adminLocalHandler',
        input: JSON.stringify({ me: 'user-loc', chatId: 'loc-room', connectionId: a.cid }),
      })
      const reply = await other.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'lo1')
      const out = JSON.parse(reply.data as string) as {
        channelCount: number
        channelList: string[]
        roomCount: number
        rooms: Array<{ chatId: string }>
      }
      // both same-identity connections are local and counted; the room has both memberships
      expect(out.channelCount).toBe(2)
      expect([...out.channelList].sort()).toEqual([a.cid, b.cid].sort())
      expect(out.roomCount).toBe(2)
      // memberships.local.rooms({ connectionId }) is a.cid's rooms in the space — the join-guard read
      expect(out.rooms).toEqual([{ chatId: 'loc-room' }])
    } finally {
      a.wire.close()
      b.wire.close()
      other.wire.close()
    }
  })

  it('amendIdentity patches the stored identity — subsequent $identity selections match over the patch', async () => {
    const target = await openAndClaim(tp, 'am')
    const adm = await openAndClaim(tp, 'am-adm')
    try {
      adm.wire.send({
        t: 'send',
        id: 'am1',
        cid: adm.cid,
        handler: 'adminAmendHandler',
        input: JSON.stringify({ me: 'user-am', plan: 'pro-am' }),
      })
      const reply = await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'am1')
      const { matched } = JSON.parse(reply.data as string) as {
        matched: Array<{ connectionId: string; identity: Record<string, unknown> }>
      }
      expect(matched).toHaveLength(1)
      expect(matched[0].connectionId).toBe(target.cid)
      // the patch shallow-merged into the frozen identity
      expect(matched[0].identity).toEqual({ me: 'user-am', plan: 'pro-am' })
    } finally {
      target.wire.close()
      adm.wire.close()
    }
  })

  it('refresh() asks the matching connection to re-run its connect', async () => {
    const target = await openAndClaim(tp, 'ref')
    const adm = await openAndClaim(tp, 'ref-adm')
    try {
      adm.wire.send({
        t: 'send',
        id: 'r1',
        cid: adm.cid,
        handler: 'adminRefreshHandler',
        input: JSON.stringify({ me: 'user-ref' }),
      })
      const refresh = await target.wire.waitFrame((frame) => frame.t === 'refresh')
      expect(refresh.cid).toBe(target.cid)
    } finally {
      target.wire.close()
      adm.wire.close()
    }
  })

  it('rejects a $where identity matcher with the typed error text', async () => {
    const { wire, cid } = await openAndClaim(tp, 'where')
    try {
      wire.send({ t: 'send', id: 'w1', cid, handler: 'adminWhereHandler' })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'w1')
      const { error } = JSON.parse(reply.data as string) as { error: string }
      expect(error).toContain('$where is not allowed')
    } finally {
      wire.close()
    }
  })

  it('a connection record expires after connectionTtl — a late claim fails', async () => {
    // connect but do NOT claim; the conn record's 400ms TTL lapses before we claim
    const connect = await connectChannel(tp, {}, 'ttl-channel')
    expect(connect.response.ok).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: connect.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('connection')
    } finally {
      wire.close()
    }
  })

  it('emits pointChannelOpenServer on claim and pointChannelCloseServer with the reason (close / kick)', async () => {
    type LoggedEvent = { name: string; id: string; reason?: string; resumed?: boolean; identity: unknown }
    const reader = await openAndClaim(tp, 'ev-reader')
    const readEvents = async (id: string): Promise<LoggedEvent[]> => {
      const sendId = 'ev-' + Math.random().toString(36).slice(2)
      reader.wire.send({ t: 'send', id: sendId, cid: reader.cid, handler: 'eventsLogHandler' })
      const reply = await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
      const { events } = JSON.parse(reply.data as string) as { events: LoggedEvent[] }
      return events.filter((event) => event.id === id)
    }
    try {
      // open: the claim emits pointChannelOpenServer with the connection id, the parsed identity, and the resumed
      // marker — false on a real claim (only a resume revival opens with true)
      const closer = await openAndClaim(tp, 'ev-close')
      let events = await readEvents(closer.cid)
      expect(events).toEqual([
        {
          name: 'pointChannelOpenServer',
          id: closer.cid,
          reason: undefined,
          resumed: false,
          identity: { me: 'user-ev-close' },
        },
      ])

      // a client close emits pointChannelCloseServer with reason 'close'
      closer.wire.send({ t: 'close', cid: closer.cid })
      await new Promise((resolve) => setTimeout(resolve, 200))
      events = await readEvents(closer.cid)
      expect(events).toHaveLength(2)
      expect(events[1]).toEqual({
        name: 'pointChannelCloseServer',
        id: closer.cid,
        reason: 'close',
        resumed: undefined,
        identity: { me: 'user-ev-close' },
      })
      closer.wire.close()

      // a kick emits pointChannelCloseServer with reason 'kick'
      const kicked = await openAndClaim(tp, 'ev-kick')
      reader.wire.send({
        t: 'send',
        id: 'ev-kick-cmd',
        cid: reader.cid,
        handler: 'adminKickHandler',
        input: JSON.stringify({ me: 'user-ev-kick' }),
      })
      await kicked.wire.waitFrame((frame) => frame.t === 'closed')
      events = await readEvents(kicked.cid)
      expect(events.map((event) => [event.name, event.reason])).toEqual([
        ['pointChannelOpenServer', undefined],
        ['pointChannelCloseServer', 'kick'],
      ])
      kicked.wire.close()
    } finally {
      reader.wire.close()
    }
  })

  it('a failed setup emits NEITHER pointChannelOpenServer NOR pointChannelCloseServer', async () => {
    // the Close half belongs to a connection whose Open was announced — a throwing enroller never got that far, so the
    // log must stay empty for it (an Open with no Close, or a Close with no Open, are both lies about the lifecycle)
    const reader = await openAndClaim(tp, 'ev-none')
    const connect = await connectChannel(tp, { userId: 'cursed' }, 'cursed-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      wire.send({ t: 'claim', ticket: connect.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('enrollment refused')
      // the cleanup runs BEFORE the claimErr goes out — a late Close would already be recorded; settle anyway
      await new Promise((resolve) => setTimeout(resolve, 300))
      reader.wire.send({ t: 'send', id: 'evn', cid: reader.cid, handler: 'eventsLogHandler' })
      const reply = await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'evn')
      const { events } = JSON.parse(reply.data as string) as { events: Array<{ name: string; id: string }> }
      expect(events.filter((event) => event.id === connect.id)).toEqual([])
      // the same channel DOES log both halves for a connection that opened — the recorder itself works here
      const ok = await connectChannel(tp, { userId: 'blessed' }, 'cursed-channel')
      wire.send({ t: 'claim', ticket: ok.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === ok.id)
      wire.send({ t: 'close', cid: ok.id })
      await new Promise((resolve) => setTimeout(resolve, 200))
      reader.wire.send({ t: 'send', id: 'evn2', cid: reader.cid, handler: 'eventsLogHandler' })
      const second = await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'evn2')
      const logged = (JSON.parse(second.data as string) as { events: Array<{ name: string; id: string }> }).events
      expect(logged.filter((event) => event.id === ok.id).map((event) => event.name)).toEqual([
        'pointChannelOpenServer',
        'pointChannelCloseServer',
      ])
    } finally {
      wire.close()
      reader.wire.close()
    }
  })

  it('presence: a pointSpaceJoinServerSuccess handler sees the join it announces in memberships.list', async () => {
    // the pin behind the whole presence recipe — the join events settle AFTER the engine registered the rooms, so a
    // handler computing the roster counts the member it was just told about (before the move it never did: the local
    // slice is read synchronously and the rooms were not written yet)
    type PresenceEntry = { space: string; id: string; room: unknown; resumed: boolean; ids: string[] }
    const open = async (userId: string): Promise<{ wire: WireClient; cid: string }> => {
      const connect = await connectChannel(tp, { userId }, 'presence-channel')
      expect(connect.response.ok).toBe(true)
      const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      return { wire, cid: connect.id }
    }
    const a = await open('pres-a')
    const b = await open('pres-b')
    try {
      const readLog = async (space: string): Promise<PresenceEntry[]> => {
        const sendId = 'pl-' + Math.random().toString(36).slice(2)
        a.wire.send({ t: 'send', id: sendId, cid: a.cid, handler: 'presenceLogHandler' })
        const reply = await a.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
        const { log } = JSON.parse(reply.data as string) as { log: PresenceEntry[] }
        return log.filter((entry) => entry.space === space)
      }
      const join = async (member: { wire: WireClient; cid: string }, chatId: string): Promise<void> => {
        const joinId = 'pj-' + chatId + '-' + member.cid
        member.wire.send({
          t: 'join',
          id: joinId,
          cid: member.cid,
          space: 'presenceSpace',
          input: JSON.stringify({ chatId }),
        })
        await member.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
      }

      await join(a, 'p1')
      // `resumed: false` — a real joiner run, not a resume re-announce
      expect(await readLog('presenceSpace')).toEqual([
        { space: 'presenceSpace', id: a.cid, room: { chatId: 'p1' }, resumed: false, ids: [a.cid] },
      ])

      // the second member joins the same room — the roster the handler computes carries both, no refetch, no delay
      await join(b, 'p1')
      const joined = await readLog('presenceSpace')
      expect(joined).toHaveLength(2)
      expect(joined[1].id).toBe(b.cid)
      expect([...joined[1].ids].sort()).toEqual([a.cid, b.cid].sort())

      // the ENROLLMENT path: each claim above ran the enroller, and its Success saw the enrolled connection too
      const enrolled = await readLog('presenceEnrollSpace')
      expect(enrolled).toEqual([
        { space: 'presenceEnrollSpace', id: a.cid, room: { userId: 'user-pres-a' }, resumed: false, ids: [a.cid] },
        { space: 'presenceEnrollSpace', id: b.cid, room: { userId: 'user-pres-b' }, resumed: false, ids: [b.cid] },
      ])
    } finally {
      a.wire.close()
      b.wire.close()
    }
  })

  it('maxRooms on the ENROLLER path fails the whole connect — claimErr, never a claimed frame', async () => {
    const connect = await connectChannel(tp, { userId: 'greedy' }, 'enroll-cap-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      // the enroller hands out three rooms of a maxRooms-2 space — the cap refuses the whole setup
      wire.send({ t: 'claim', ticket: connect.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_MAX_ROOMS')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(wire.frames.some((frame) => frame.t === 'claimed')).toBe(false)
      // an identity the same enroller keeps under the cap claims fine, enrollment announced
      const ok = await connectChannel(tp, { userId: 'modest' }, 'enroll-cap-channel')
      wire.send({ t: 'claim', ticket: ok.ticket })
      const claimed = await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === ok.id)
      expect(claimed.enrolled).toEqual([{ space: 'enrollCapSpace', rooms: [JSON.stringify({ slot: 'modest' })] }])
    } finally {
      wire.close()
    }
  })

  it('space.enroll past maxRooms SKIPS the connection: no `enrolled` frame, the connection keeps working', async () => {
    const target = await openAndClaim(tp, 'cap-en')
    const adm = await openAndClaim(tp, 'cap-en-adm')
    try {
      // one joined room of a maxRooms-2 space
      target.wire.send({
        t: 'join',
        id: 'ce1',
        cid: target.cid,
        space: 'capEnrollSpace',
        input: JSON.stringify({ slot: 'j1' }),
      })
      const joined = await target.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'ce1')
      expect(joined.rooms).toEqual([JSON.stringify({ slot: 'j1' })])
      // two more rooms would make three — over the cap: the fan-out skips this connection with a logged warning
      adm.wire.send({
        t: 'send',
        id: 'ce2',
        cid: adm.cid,
        handler: 'adminCapEnrollHandler',
        input: JSON.stringify({ cid: target.cid, slots: ['e1', 'e2'] }),
      })
      await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ce2')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(target.wire.frames.some((frame) => frame.t === 'enrolled')).toBe(false)
      // the skipped connection is untouched — it still answers a send
      target.wire.send({
        t: 'send',
        id: 'ce3',
        cid: target.cid,
        handler: 'adminListHandler',
        input: JSON.stringify({ me: 'user-cap-en' }),
      })
      const alive = await target.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ce3')
      expect((JSON.parse(alive.data as string) as { list: unknown[] }).list).toHaveLength(1)
      // an enroll that FITS lands and announces the connection's FULL room set of the space
      adm.wire.send({
        t: 'send',
        id: 'ce4',
        cid: adm.cid,
        handler: 'adminCapEnrollHandler',
        input: JSON.stringify({ cid: target.cid, slots: ['e1'] }),
      })
      const enrolled = await target.wire.waitFrame(
        (frame) => frame.t === 'enrolled' && frame.space === 'capEnrollSpace',
      )
      expect(enrolled.rooms).toEqual([JSON.stringify({ slot: 'j1' }), JSON.stringify({ slot: 'e1' })])
    } finally {
      target.wire.close()
      adm.wire.close()
    }
  })

  it('a discarded ticket cannot be claimed afterwards', async () => {
    const connect = await connectChannel(tp, { userId: 'disc' })
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      // the client abandoned the connect before claiming (a dispose in flight) — the discard drops ticket AND record
      wire.send({ t: 'discard', ticket: connect.ticket })
      await new Promise((resolve) => setTimeout(resolve, 200))
      wire.send({ t: 'claim', ticket: connect.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
      expect(wire.frames.some((frame) => frame.t === 'claimed')).toBe(false)
    } finally {
      wire.close()
    }
  })

  it('one ticket, one claim: two claims of the same ticket race into exactly one claimed and one claimErr', async () => {
    const connect = await connectChannel(tp, { userId: 'race' })
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    await wire.waitOpen()
    try {
      // both frames leave before either is answered — the second finds the ticket in flight (the get→delete pair is
      // not atomic, so the in-flight set is this process's atomicity)
      wire.send({ t: 'claim', ticket: connect.ticket })
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr')
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_TICKET_INVALID')
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(wire.frames.filter((frame) => frame.t === 'claimed')).toHaveLength(1)
      expect(wire.frames.filter((frame) => frame.t === 'claimErr')).toHaveLength(1)
    } finally {
      wire.close()
    }
  })

  it('a connection closed mid-join never lands in the room index', async () => {
    const joiner = await openAndClaim(tp, 'midj')
    const adm = await openAndClaim(tp, 'midj-adm')
    try {
      // the joiner sleeps 300ms; the close lands while it runs — the re-check after the await must drop the admitted
      // rooms on the floor (a dead entry in the room index could never be removed: every removal path starts from the
      // live connections map)
      joiner.wire.send({
        t: 'join',
        id: 'mj1',
        cid: joiner.cid,
        space: 'slowSpace',
        input: JSON.stringify({ chatId: 'mid-join' }),
      })
      joiner.wire.send({ t: 'close', cid: joiner.cid })
      // past the joiner's own delay — whatever it admitted has landed (or been dropped) by now
      await new Promise((resolve) => setTimeout(resolve, 700))
      adm.wire.send({
        t: 'send',
        id: 'mj2',
        cid: adm.cid,
        handler: 'adminSlowRoomHandler',
        input: JSON.stringify({ chatId: 'mid-join' }),
      })
      const reply = await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'mj2')
      const out = JSON.parse(reply.data as string) as { count: number; ids: string[] }
      expect(out.count).toBe(0)
      expect(out.ids).toEqual([])
      // and the dead joiner was never told it joined
      expect(joiner.wire.frames.some((frame) => frame.t === 'joined' && frame.id === 'mj1')).toBe(false)
      // a live connection joining the same room afterwards IS indexed — the reader is not blind
      const live = await openAndClaim(tp, 'midj-live')
      live.wire.send({
        t: 'join',
        id: 'mj3',
        cid: live.cid,
        space: 'slowSpace',
        input: JSON.stringify({ chatId: 'mid-join' }),
      })
      await live.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === 'mj3')
      adm.wire.send({
        t: 'send',
        id: 'mj4',
        cid: adm.cid,
        handler: 'adminSlowRoomHandler',
        input: JSON.stringify({ chatId: 'mid-join' }),
      })
      const second = await adm.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'mj4')
      expect(JSON.parse(second.data as string)).toEqual({ count: 1, ids: [live.cid] })
      live.wire.close()
    } finally {
      joiner.wire.close()
      adm.wire.close()
    }
  })

  it('answers a ping with a pong — on a bare socket as well as a claimed one', async () => {
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      // the ping needs no connection: it is the socket's own liveness beat first, the KV heartbeat second
      wire.send({ t: 'ping' })
      const pong = await wire.waitFrame((frame) => frame.t === 'pong')
      expect(pong).toEqual({ t: 'pong' })
      // and it keeps answering once the socket carries a claimed connection
      const connect = await connectChannel(tp, { userId: 'pp' })
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      wire.send({ t: 'ping' })
      await waitFor(() => wire.frames.filter((frame) => frame.t === 'pong').length === 2, 'the second pong')
    } finally {
      wire.close()
    }
  })

  it('SOCKET_MAX_CONNECTIONS: the cap counts one SOCKET`s connections to a channel, and refuses the one past it', async () => {
    const first = await connectChannel(tp, { userId: 'c1' }, 'cap-channel')
    const second = await connectChannel(tp, { userId: 'c2' }, 'cap-channel')
    expect(first.response.ok).toBe(true)
    expect(second.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    const other = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      await other.waitOpen()
      wire.send({ t: 'claim', ticket: first.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === first.id)
      // this socket already holds its one capChannel connection — the second claim is refused at the cap, and the
      // refusal names the cid it was for (the client can fail exactly that connect)
      wire.send({ t: 'claim', ticket: second.ticket })
      const claimErr = await wire.waitFrame((frame) => frame.t === 'claimErr' && frame.cid === second.id)
      expect(String(claimErr.error)).toContain('POINT0_SOCKET_MAX_CONNECTIONS')
      expect(String(claimErr.error)).toContain('capChannel')
      expect(wire.frames.filter((frame) => frame.t === 'claimed')).toHaveLength(1)
      // the cap is PER SOCKET: another socket claims a fresh ticket of the same channel without a word
      const third = await connectChannel(tp, { userId: 'c3' }, 'cap-channel')
      other.send({ t: 'claim', ticket: third.ticket })
      await other.waitFrame((frame) => frame.t === 'claimed' && frame.cid === third.id)
      // and the refused socket is untouched — its surviving connection still answers
      wire.send({ t: 'send', id: 'cap1', cid: first.id, handler: 'capEchoHandler' })
      const alive = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'cap1')
      expect(JSON.parse(alive.data as string)).toEqual({ me: 'cap-c1' })
      expect(wire.frames.some((frame) => frame.t === 'closed')).toBe(false)
    } finally {
      wire.close()
      other.close()
    }
  })

  it('SOCKET_MESSAGE_TOO_BIG: a send past the channel maxMessageSize is refused, one under it is answered', async () => {
    const connect = await connectChannel(tp, { userId: 'big' }, 'small-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      // 2 KiB over a 512-byte channel: the frame DOES reach the engine (Bun's transport cap is derived from the widest
      // channel of the app), so the answer is the channel's typed refusal, not a silent socket death
      wire.send({
        t: 'send',
        id: 'sb1',
        cid: connect.id,
        handler: 'smallEchoHandler',
        input: JSON.stringify({ text: 'x'.repeat(2000) }),
      })
      const sendErr = await wire.waitFrame((frame) => frame.t === 'sendErr' && frame.id === 'sb1')
      expect(String(sendErr.error)).toContain('POINT0_SOCKET_MESSAGE_TOO_BIG')
      // the control: the same handler answers a frame under the cap, so the socket really did survive
      wire.send({
        t: 'send',
        id: 'sb2',
        cid: connect.id,
        handler: 'smallEchoHandler',
        input: JSON.stringify({ text: 'x'.repeat(10) }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'sb2')
      expect(JSON.parse(reply.data as string)).toEqual({ length: 10 })
    } finally {
      wire.close()
    }
  })

  it('SOCKET_MESSAGE_TOO_BIG on a JOIN — measured on the RAW frame, so padding around a tiny input cannot slip past', async () => {
    const connect = await connectChannel(tp, { userId: 'bigjoin' }, 'small-channel')
    expect(connect.response.ok).toBe(true)
    const wire = new WireClient(`ws://localhost:${tp.serverPort}/_point0/root/websocket`)
    try {
      await wire.waitOpen()
      wire.send({ t: 'claim', ticket: connect.ticket })
      await wire.waitFrame((frame) => frame.t === 'claimed' && frame.cid === connect.id)
      const frame = {
        t: 'join',
        id: 'jb1',
        cid: connect.id,
        space: 'smallSpace',
        input: JSON.stringify({ chatId: 'pad' }),
      }
      // valid JSON, a tiny parsed input, 2 KiB on the wire: the cap answers to the bytes, not to what they mean
      wire.sendRaw(JSON.stringify(frame).slice(0, -1) + ' '.repeat(2000) + '}')
      const joinErr = await wire.waitFrame((f) => f.t === 'joinErr' && f.id === 'jb1')
      expect(String(joinErr.error)).toContain('POINT0_SOCKET_MESSAGE_TOO_BIG')
      // unpadded, the very same join lands
      wire.send({ ...frame, id: 'jb2' })
      const joined = await wire.waitFrame((f) => f.t === 'joined' && f.id === 'jb2')
      expect(joined.rooms).toEqual([JSON.stringify({ chatId: 'pad' })])
    } finally {
      wire.close()
    }
  })

  it('pointSpaceLeaveServer names WHY the rooms went: leave / close / socket / kick', async () => {
    type LeaveEntry = { id: string; rooms: unknown[]; reason: string; identity: unknown }
    const reader = await openAndClaim(tp, 'lv-reader')
    const readLeaves = async (id: string): Promise<LeaveEntry[]> => {
      const sendId = 'lv-' + Math.random().toString(36).slice(2)
      reader.wire.send({ t: 'send', id: sendId, cid: reader.cid, handler: 'leaveLogHandler' })
      const reply = await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
      const { log } = JSON.parse(reply.data as string) as { log: LeaveEntry[] }
      return log.filter((entry) => entry.id === id)
    }
    const joinLeaveRoom = async (member: { wire: WireClient; cid: string }, chatId: string): Promise<void> => {
      const joinId = 'lvj-' + chatId
      member.wire.send({
        t: 'join',
        id: joinId,
        cid: member.cid,
        space: 'leaveSpace',
        input: JSON.stringify({ chatId }),
      })
      await member.wire.waitFrame((frame) => frame.t === 'joined' && frame.id === joinId)
    }
    /** one member, one room, one way out — read back the single leave it produced */
    const leaveVia = async (
      userId: string,
      chatId: string,
      end: (member: { wire: WireClient; cid: string }) => void | Promise<void>,
    ): Promise<LeaveEntry[]> => {
      const member = await openAndClaim(tp, userId)
      await joinLeaveRoom(member, chatId)
      await end(member)
      await waitFor(async () => (await readLeaves(member.cid)).length === 1, `the leave of ${userId}`)
      const leaves = await readLeaves(member.cid)
      member.wire.close()
      return leaves.map((entry) => ({ ...entry, id: entry.id === member.cid ? 'CID' : entry.id }))
    }
    try {
      // 1. the client names the rooms it drops — the ordinary leave
      expect(
        await leaveVia('lv-leave', 'r-leave', (member) => {
          member.wire.send({
            t: 'leave',
            cid: member.cid,
            space: 'leaveSpace',
            rooms: [JSON.stringify({ chatId: 'r-leave' })],
          })
        }),
      ).toEqual([{ id: 'CID', rooms: [{ chatId: 'r-leave' }], reason: 'leave', identity: { me: 'user-lv-leave' } }])

      // 2. the CONNECTION is closed over a socket that stays up (the client multiplexes — one channel goes, the
      // socket lives on)
      expect(
        await leaveVia('lv-close', 'r-close', (member) => {
          member.wire.send({ t: 'close', cid: member.cid })
        }),
      ).toEqual([{ id: 'CID', rooms: [{ chatId: 'r-close' }], reason: 'close', identity: { me: 'user-lv-close' } }])

      // 3. the SOCKET dies under a live connection
      expect(
        await leaveVia('lv-socket', 'r-socket', (member) => {
          member.wire.close()
        }),
      ).toEqual([{ id: 'CID', rooms: [{ chatId: 'r-socket' }], reason: 'socket', identity: { me: 'user-lv-socket' } }])

      // 4. a space kick — a forced leave, from the server side
      expect(
        await leaveVia('lv-kick', 'r-kick', async () => {
          reader.wire.send({
            t: 'send',
            id: 'lvk',
            cid: reader.cid,
            handler: 'adminLeaveKickHandler',
            input: JSON.stringify({ chatId: 'r-kick' }),
          })
          await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'lvk')
        }),
      ).toEqual([{ id: 'CID', rooms: [{ chatId: 'r-kick' }], reason: 'kick', identity: { me: 'user-lv-kick' } }])
    } finally {
      reader.wire.close()
    }
  })

  it('pointChannelConnectServer*: Start, then Settled+Success around the connector — Settled+Error when it throws', async () => {
    type ConnectEntry = {
      name: string
      id?: string
      input: unknown
      identity?: unknown
      error?: string
      hasErrorKey: boolean
    }
    const reader = await openAndClaim(tp, 'cn-reader')
    const readConnects = async (): Promise<ConnectEntry[]> => {
      const sendId = 'cn-' + Math.random().toString(36).slice(2)
      reader.wire.send({ t: 'send', id: sendId, cid: reader.cid, handler: 'connectLogHandler' })
      const reply = await reader.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === sendId)
      return (JSON.parse(reply.data as string) as { log: ConnectEntry[] }).log
    }
    try {
      const ok = await connectChannel(tp, { userId: 'yes' }, 'connect-events-channel')
      expect(ok.response.ok).toBe(true)
      await waitFor(async () => (await readConnects()).length >= 3, 'the three connect events')
      const log = await readConnects()
      expect(log.map((entry) => entry.name)).toEqual([
        'pointChannelConnectServerStart',
        'pointChannelConnectServerSettled',
        'pointChannelConnectServerSuccess',
      ])
      // Start knows the input and nothing else — the connection does not exist yet, and there is no `error` key at all
      expect(log[0]).toEqual({
        name: 'pointChannelConnectServerStart',
        input: { userId: 'yes' },
        hasErrorKey: false,
      })
      // the settled pair carries the cid the POST answered with, plus the identity the connector produced
      for (const entry of log.slice(1)) {
        expect(entry.id).toBe(ok.id)
        expect(entry.identity).toEqual({ me: 'ce-yes' })
        expect(entry.error).toBeUndefined()
        expect(entry.hasErrorKey).toBe(true)
      }

      // a throwing connector: Start still fires, then the Settled/Error half — no connection, no identity
      const bad = await connectChannel(tp, { userId: 'nope' }, 'connect-events-channel')
      expect(bad.response.ok).toBe(false)
      await waitFor(async () => (await readConnects()).length >= 6, 'the three connect-error events')
      const failed = (await readConnects()).slice(3)
      expect(failed.map((entry) => entry.name)).toEqual([
        'pointChannelConnectServerStart',
        'pointChannelConnectServerSettled',
        'pointChannelConnectServerError',
      ])
      expect(failed[2].id).toBeUndefined()
      expect(failed[2].identity).toBeUndefined()
      expect(failed[2].error).toContain('connector refused')
    } finally {
      reader.wire.close()
    }
  })

  it('a collect window nobody can answer closes at once — expected 0, no wait on the timeout', async () => {
    const { wire, cid } = await openAndClaim(tp, 'ec')
    try {
      // the room has no members at all, so the local expectation is 0 — the window is finished before it is armed
      wire.send({
        t: 'send',
        id: 'ec1',
        cid,
        handler: 'emptyCollectHandler',
        input: JSON.stringify({ chatId: 'nobody-home' }),
      })
      const reply = await wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'ec1')
      const out = JSON.parse(reply.data as string) as { answers: string[]; elapsed: number }
      expect(out.answers).toEqual([])
      // the handler's own window is 4000ms — anything near it would mean the window sat there waiting it out
      expect(out.elapsed).toBeLessThan(1500)
    } finally {
      wire.close()
    }
  })

  it('a reply landing after its window closed is dropped in silence, and the connection carries on', async () => {
    const member = await openAndClaim(tp, 'lc-m')
    const caller = await openAndClaim(tp, 'lc-c')
    try {
      await joinRoom(member.wire, member.cid, 'late-room')
      // the member answers ~800ms after the 500ms window already shut
      const answering = (async () => {
        const msg = await member.wire.waitFrame((frame) => frame.t === 'msg' && frame.handler === 'pingHandler')
        await new Promise((resolve) => setTimeout(resolve, 800))
        member.wire.send({
          t: 'reply',
          id: msg.mid as string,
          cid: member.cid,
          data: JSON.stringify({ answer: 'pong:late' }),
        })
      })()
      caller.wire.send({
        t: 'send',
        id: 'lc1',
        cid: caller.cid,
        handler: 'lateCollectHandler',
        input: JSON.stringify({ chatId: 'late-room' }),
      })
      const reply = await caller.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'lc1')
      const out = JSON.parse(reply.data as string) as { answers: string[]; elapsed: number }
      // one member was expected and never answered in time — the timeout is what closed the window, empty
      expect(out.answers).toEqual([])
      expect(out.elapsed).toBeGreaterThanOrEqual(450)
      // the late reply then reaches a mid nobody holds any more: no throw, no forward (there is no external
      // backplane here), and both ends keep working
      await answering
      member.wire.send({
        t: 'send',
        id: 'lc2',
        cid: member.cid,
        handler: 'adminListHandler',
        input: JSON.stringify({ me: 'user-lc-m' }),
      })
      const alive = await member.wire.waitFrame((frame) => frame.t === 'reply' && frame.id === 'lc2')
      expect((JSON.parse(alive.data as string) as { list: unknown[] }).list).toHaveLength(1)
    } finally {
      member.wire.close()
      caller.wire.close()
    }
  })
})
