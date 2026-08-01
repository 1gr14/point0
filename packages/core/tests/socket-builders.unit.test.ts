import { describe, expect, expectTypeOf, it, mock, spyOn } from 'bun:test'
import { z } from 'zod'
import { Point0 } from '../src/point0.js'
import {
  registerSocketServerAdapter,
  unregisterSocketServerAdapter,
  useSocketConnection,
  useSpaceMembership,
  type SocketServerAdapter,
} from '../src/socket.js'
import type {
  AnyClientChannelConnection,
  ChannelConnectionListed,
  ChannelConnectionStatus,
  ClientChannelConnection,
  ClientHandlerReply,
  ClientSpaceMembership,
  EmptyData,
  EmptyObjectOnly,
  IdentityMatcher,
  QueryKey,
  SpaceMembershipListed,
  SpaceMembershipStatus,
} from '../src/types.js'
import type { ErrorPoint0 } from '../src/error.js'
import { POINT0_ERROR_CODES_MAP } from '../src/error.js'

const root = Point0.lets('root', 'root').root()

/** A full wave-5 adapter with inert seams — each test overrides the one(s) it captures. */
const makeAdapter = (overrides?: Partial<SocketServerAdapter>): SocketServerAdapter => ({
  push: () => {},
  kick: async () => {},
  enroll: async () => {},
  refresh: async () => {},
  count: async () => 0,
  list: async () => [],
  forEach: ({ onDone }) => {
    onDone()
  },
  localCount: () => 0,
  localList: () => [],
  amendIdentity: async () => {},
  ...overrides,
})

describe('socket builders', () => {
  it('channel closes with a connect endpoint that answers GET and POST, loaderless included', () => {
    const ideasChannel = root.lets('channel', 'ideas').channel()
    expect(ideasChannel.type).toBe('channel')
    expect(ideasChannel.id).toBe('root:channel:ideas')
    // GET is the nominal method — the real connect is GET-first (short-input `?input=`, and the cold-start
    // GET+Upgrade handshake, which is GET by spec); POST stays registered as the binary/over-long fallback
    expect(ideasChannel.point._endpoint?.method).toBe('GET')
    expect(ideasChannel.point._endpoint?.methods).toEqual(['GET', 'POST'])
    expect(ideasChannel.point._endpoint?.route.definition).toBe('/_point0/root/channel/ideas')
  })

  it('channel with input and a connector keeps the endpoint and stores closing options', () => {
    // the connector returns the identity BARE — no room, no data envelope
    const chatChannel = root
      .lets('channel', 'chat')
      .input(z.object({ chatId: z.string() }))
      .connector(({ input }) => ({ me: 'u1', chatId: input.chatId }))
      .channel({ client: { linger: 3000 } })
    expect(chatChannel.point._endpoint?.route.definition).toBe('/_point0/root/channel/chat')
    expect(chatChannel.point._channelOptions?.linger).toBe(3000)
    expect(chatChannel.point._getChannelPointOptions().linger).toBe(3000)
    expect(chatChannel.point._getChannelPointOptions().maxConnections).toBe(32)
  })

  it('grouped point options resolve flat, per side, chain -> closer — and a cut group falls back to defaults', () => {
    const groupedRoot = Point0.lets('root', 'groupedOptions')
      .channelOptions({ server: { maxConnections: 10 }, client: { linger: 500, ping: 5000 } })
      .spaceOptions({ server: { maxRooms: 4 }, client: { linger: 300 } })
      .root()
    const bothSides = groupedRoot
      .lets('channel', 'bothSides')
      .channel({ server: { maxMessageSize: 2048 }, client: { linger: 700 }, preventTransformer: true })
    const resolved = bothSides.point._getChannelPointOptions()
    // both groups flatten into one resolved object; per-key last-wins is per-side last-wins (no key collides)
    expect(resolved.linger).toBe(700)
    expect(resolved.ping).toBe(5000)
    expect(resolved.maxConnections).toBe(10)
    expect(resolved.maxMessageSize).toBe(2048)
    expect(resolved.connectionTtl).toBe(90_000)
    // a both-sides option stays top-level and still resolves
    expect(bothSides.point._preventSocketTransformer).toBe(true)

    // what the CLIENT bundle runs after the compiler cut every `server` group (chain AND closer): the caps fall back
    // to the merge defaults — harmless, only the server reads them
    const clientBundleRoot = Point0.lets('root', 'groupedOptionsClientBundle')
      .channelOptions({ client: { linger: 500, ping: 5000 } })
      .root()
    const clientResolved = clientBundleRoot
      .lets('channel', 'clientBundle')
      .channel({ client: { linger: 700 } })
      .point._getChannelPointOptions()
    expect(clientResolved.linger).toBe(700)
    expect(clientResolved.ping).toBe(5000)
    expect(clientResolved.maxMessageSize).toBe(1_048_576)
    expect(clientResolved.maxConnections).toBe(32)
    expect(clientResolved.connectionTtl).toBe(90_000)

    // the mirror on the SERVER bundle: every `client` group is gone, the caps stand
    const serverBundleRoot = Point0.lets('root', 'groupedOptionsServerBundle')
      .channelOptions({ server: { maxConnections: 10 } })
      .root()
    const serverResolved = serverBundleRoot
      .lets('channel', 'serverBundle')
      .channel({ server: { maxMessageSize: 2048 } })
      .point._getChannelPointOptions()
    expect(serverResolved.maxMessageSize).toBe(2048)
    expect(serverResolved.maxConnections).toBe(10)
    expect(serverResolved.linger).toBe(1000)
    expect(serverResolved.ping).toBe(30_000)

    // the same story for a space
    const space = bothSides.lets<{ chatId: string }>('space', 'groupedRoom').space({ client: { linger: 900 } })
    expect(space.point._getSpacePointOptions().linger).toBe(900)
    expect(space.point._getSpacePointOptions().maxRooms).toBe(4)
    const spaceClientBundle = bothSides.lets<{ chatId: string }>('space', 'groupedRoomClient').space({})
    expect(spaceClientBundle.point._getSpacePointOptions().maxRooms).toBe(4)
    expect(spaceClientBundle.point._getSpacePointOptions().linger).toBe(300)
  })

  it('the `server.resume` tuning resolves with defaults, merges PER KEY across levels, and the space overrides its ceilings', () => {
    const tunedRoot = Point0.lets('root', 'resumeTuning')
      .channelOptions({ server: { resume: { parkWindow: 60_000 } } })
      .root()
    const tuned = tunedRoot
      .lets('channel', 'tuned')
      .channel({ resumable: true, server: { resume: { streamMaxBytes: 8_000_000 } } })
    const resolved = tuned.point._getChannelPointOptions().resume
    // per-key merge: the chain's parkWindow survives the closer naming only streamMaxBytes; the unnamed key defaults
    expect(resolved).toEqual({ parkWindow: 60_000, streamMaxFrames: 1024, streamMaxBytes: 8_000_000 })
    // the client timeouts are ordinary client options with defaults
    expect(tuned.point._getChannelPointOptions().upgradeTimeout).toBe(5000)
    expect(tuned.point._getChannelPointOptions().resumeTimeout).toBe(5000)
    // the chain's `server.resume` is inherited — the closer must keep the switch on (the cascade below pins the deny)
    const timed = tunedRoot
      .lets('channel', 'timed')
      .channel({ resumable: true, client: { upgradeTimeout: 1000, resumeTimeout: 2000 } })
    expect(timed.point._getChannelPointOptions().upgradeTimeout).toBe(1000)
    expect(timed.point._getChannelPointOptions().resumeTimeout).toBe(2000)
    // the space's own resume group overrides the ceilings for ITS streams (resolved raw — the engine falls back per key)
    const tunedSpace = tuned
      .lets<{ chatId: string }>('space', 'tunedSpace')
      .joiner(() => ({ chatId: '1' }))
      .space({ server: { resume: { streamMaxFrames: 8 } } })
    expect(tunedSpace.point._getSpacePointOptions().resume).toEqual({ streamMaxFrames: 8 })
  })

  it('the resume-tuning validation cascade fails at the closers: dead config must not sit silently', () => {
    const cascadeRoot = Point0.lets('root', 'resumeTuningCascade').root()
    // the channel leg: `server.resume` without the top-level switch
    expect(() => cascadeRoot.lets('channel', 'noSwitch').channel({ server: { resume: { parkWindow: 5000 } } })).toThrow(
      'needs the top-level `resumable: true`',
    )
    // the space legs: a plain channel has no streams to tune, an opt-out space neither
    const plain = cascadeRoot.lets('channel', 'plainForSpace').channel()
    expect(() =>
      plain
        .lets<{ chatId: string }>('space', 'plainSpaceTuned')
        .joiner(() => ({ chatId: '1' }))
        .space({ server: { resume: { streamMaxFrames: 8 } } }),
    ).toThrow('needs `resumable: true` on its channel')
    const resumable = cascadeRoot.lets('channel', 'resumableForSpace').channel({ resumable: true })
    expect(() =>
      resumable
        .lets<{ chatId: string }>('space', 'optOutTuned')
        .joiner(() => ({ chatId: '1' }))
        .space({ resumable: false, server: { resume: { streamMaxFrames: 8 } } }),
    ).toThrow('not allowed together with `resumable: false`')
    // the handler leg: an ambiguous zero must not silently become a 1-frame buffer — in either spelling
    expect(() =>
      resumable
        .lets('clientHandler', 'zeroBuffer')
        .serverSend(z.object({ n: z.number() }))
        .clientHandler({ resumable: 0 as never }),
    ).toThrow('must be `true`, a positive integer, or `{ buffer?, replay? }`')
    expect(() =>
      resumable
        .lets('clientHandler', 'zeroBufferObject')
        .serverSend(z.object({ n: z.number() }))
        .clientHandler({ resumable: { buffer: 0 as never } }),
    ).toThrow('resumable.buffer must be `true` or a positive integer')
    expect(() =>
      resumable
        .lets('clientHandler', 'wrongReplay')
        .serverSend(z.object({ n: z.number() }))
        .clientHandler({ resumable: { replay: 'sometimes' as never } }),
    ).toThrow("resumable.replay must be 'always' or 'gapless'")
    // the object form resolves: the ceiling and the policy land on the resolved options as declared
    const strict = resumable
      .lets('clientHandler', 'strictBuffer')
      .serverSend(z.object({ n: z.number() }))
      .clientHandler({ resumable: { buffer: 8, replay: 'gapless' } })
    expect(strict.point._getClientHandlerPointOptions().resumable).toEqual({ buffer: 8, replay: 'gapless' })
  })

  it('a space closes from a channel: type space, no endpoint, its channel at hand', () => {
    const chatChannel = root
      .lets('channel', 'chatWithSpace')
      .connector(() => ({ me: 'u1' }))
      .channel()
    const chatSpace = chatChannel
      .lets<{ chatId: string }>('space', 'chatRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    expect(chatSpace.type).toBe('space')
    expect(chatSpace.id).toBe('root:space:chatRoom')
    // a space runs over the socket — no HTTP endpoint (like a handler)
    expect(chatSpace.point._endpoint).toBeUndefined()
    expect(chatSpace.point._channelPoint?.name).toBe('chatWithSpace')
    // the space itself is not born from a space
    expect(chatSpace.point._spacePoint).toBeUndefined()
    expect(typeof chatSpace.point._joinerFn).toBe('function')
  })

  it('a space without a joiner closes fine — it just takes no client joins', () => {
    const channel = root.lets('channel', 'chatNoJoiner').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'roomNoJoiner')
      .input(z.object({ chatId: z.string() }))
      .space()
    expect(space.type).toBe('space')
    expect(space.point._joinerFn).toBeUndefined()
    // the fact the client bundle reads: no `.joiner` call happened, so a client join is refused before any frame
    expect(space.point._joinerDeclared).toBe(false)
  })

  it('.joiner records the DECLARATION separately from the callback — the fact the client bundle keeps', () => {
    const channel = root.lets('channel', 'chatJoinerDeclared').channel()
    const declared = channel
      .lets<{ chatId: string }>('space', 'roomJoinerDeclared')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    expect(declared.point._joinerDeclared).toBe(true)
    // the client bundle arrives with the callback blanked (`.joiner()`) — the CALL survives, so the fact does too
    const stripped = channel
      .lets<{ chatId: string }>('space', 'roomJoinerStripped')
      .input(z.object({ chatId: z.string() }))
      .joiner(undefined as never)
      .space()
    expect(stripped.point._joinerFn).toBeUndefined()
    expect(stripped.point._joinerDeclared).toBe(true)
  })

  it('handlers grow from a channel, keep it at hand, carry no space and get no endpoint', () => {
    const chatChannel = root
      .lets('channel', 'chat2')
      .input(z.object({ chatId: z.string() }))
      .connector(({ input }) => ({ chatId: input.chatId }))
      .channel()
    const sendHandler = chatChannel
      .lets('serverHandler', 'messageSend')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input }) => ({ echo: input.text }))
      .serverHandler()
    expect(sendHandler.type).toBe('serverHandler')
    expect(sendHandler.id).toBe('root:serverHandler:messageSend')
    expect(sendHandler.point._endpoint).toBeUndefined()
    expect(sendHandler.point._channelPoint?.name).toBe('chat2')
    expect(sendHandler.point._spacePoint).toBeUndefined()

    const receivedHandler = chatChannel
      .lets('clientHandler', 'messageReceived')
      .serverSend(z.object({ text: z.string() }))
      .clientHandler()
    expect(receivedHandler.type).toBe('clientHandler')
    expect(receivedHandler.point._channelPoint?.name).toBe('chat2')
    expect(receivedHandler.point._spacePoint).toBeUndefined()
  })

  it('handlers grow from a space too, keeping BOTH the space and its channel at hand', () => {
    const channel = root
      .lets('channel', 'chatSp')
      .connector(() => ({ me: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'chatSpRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const sendHandler = space
      .lets('serverHandler', 'messageSendSp')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input }) => ({ echo: input.text }))
      .serverHandler()
    expect(sendHandler.type).toBe('serverHandler')
    // a space handler rides the space's own channel and remembers the space
    expect(sendHandler.point._channelPoint?.name).toBe('chatSp')
    expect(sendHandler.point._spacePoint?.name).toBe('chatSpRoom')

    const newHandler = space
      .lets('clientHandler', 'messageNewSp')
      .serverSend(z.object({ text: z.string() }))
      .clientHandler()
    expect(newHandler.point._channelPoint?.name).toBe('chatSp')
    expect(newHandler.point._spacePoint?.name).toBe('chatSpRoom')
  })

  it('handlers inherit chain options and the channel closing options', () => {
    const optionedRoot = Point0.lets('root', 'optioned')
      .serverHandlerOptions({ client: { timeout: 7000 } })
      .root()
    const channel = optionedRoot.lets('channel', 'chat').channel({ client: { linger: 9000 } })
    const handler = channel
      .lets('serverHandler', 'poke')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    // the send window is the serverHandler `timeout` — a channel-wide default is `.serverHandlerOptions()` up the chain
    expect(handler.point._defaultServerHandlerOptions?.timeout).toBe(7000)
    expect(handler.point._channelOptions?.linger).toBe(9000)
    expect(handler.point._getChannelPointOptions().linger).toBe(9000)
  })

  it('a handler grown from a non-channel throws', () => {
    expect(() => (root.lets as (...args: unknown[]) => unknown)('serverHandler', 'oops')).toThrow(
      /grows from a channel/,
    )
  })

  it('a space grown from a non-channel throws', () => {
    expect(() => (root.lets as (...args: unknown[]) => unknown)('space', 'oops')).toThrow(
      /A space point grows from a channel/,
    )
  })

  it('a space grown from a space throws — spaces open from a closed channel only', () => {
    const channel = root.lets('channel', 'chatNested').channel()
    const space = channel.lets('space', 'nestedRoom').space()
    expect(() => (space.lets as (...args: unknown[]) => unknown)('space', 'deeper')).toThrow(
      /A space point grows from a channel/,
    )
  })

  it('joiner() on a non-space chain throws', () => {
    const channel = root.lets('channel', 'chatJoinerGuard').channel()
    const stage = channel.lets('serverHandler', 'notASpace') as any
    expect(() => stage.joiner(() => ({}))).toThrow(/joiner\(\) lives on space points only/)
  })

  it('serverHandler close without .serverReply throws (server side)', () => {
    const channel = root.lets('channel', 'chat3').channel()
    const stage = channel.lets('serverHandler', 'empty') as any
    expect(() => stage.serverHandler()).toThrow(/Point has no reply/)
  })

  it('executes a SPACE handler .serverReply with parsed input, identity, room and connection', async () => {
    const channel = root
      .lets('channel', 'chat4')
      .connector(() => ({ me: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'chat4Room')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const handler = space
      .lets('serverHandler', 'messageSend')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input, identity, room, connectionId }) => ({
        text: input.text,
        me: (identity as { me: string }).me,
        chatId: (room as { chatId: string }).chatId,
        connectionId,
      }))
      .serverHandler()
    const transformer = handler.point._getTransformer()
    const result = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ text: 'hello' }),
      room: { chatId: '5' },
      identity: { me: 'u1' },
      connectionId: 'c1',
      messageId: 'm1',
      points: undefined as never,
    })
    expect(result.data).toEqual({ text: 'hello', me: 'u1', chatId: '5', connectionId: 'c1' })
    expect(result.dataSerialized).toBe(transformer.stringify(result.data))
  })

  it('executes a CHANNEL handler .serverReply with identity and NO room prop', async () => {
    const channel = root
      .lets('channel', 'chat4c')
      .connector(() => ({ me: 'u1' }))
      .channel()
    const handler = channel
      .lets('serverHandler', 'poke')
      .clientSend(z.object({ text: z.string() }))
      .serverReply((args) => {
        // a channel handler has no room in its reply callback
        expect('room' in args).toBe(false)
        return { text: args.input.text, me: (args.identity as { me: string }).me, connectionId: args.connectionId }
      })
      .serverHandler()
    const transformer = handler.point._getTransformer()
    const result = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ text: 'hi' }),
      room: undefined,
      identity: { me: 'u1' },
      connectionId: 'c1',
      messageId: 'm1',
      points: undefined as never,
    })
    expect(result.data).toEqual({ text: 'hi', me: 'u1', connectionId: 'c1' })
  })

  it('rejects an invalid message input with the typed error', async () => {
    const channel = root.lets('channel', 'chat5').channel()
    const handler = channel
      .lets('serverHandler', 'strict')
      .clientSend(z.object({ n: z.number() }))
      .serverReply(({ input }) => ({ doubled: input.n * 2 }))
      .serverHandler()
    await expect(
      handler.point._executeServerReply({
        inputSerialized: handler.point._getTransformer().stringify({ n: 'nope' }),
        room: undefined,
        identity: {},
        connectionId: 'c1',
        messageId: 'm1',
        points: undefined as never,
      }),
    ).rejects.toThrow()
  })

  it('clientReply stores the callback and the schema; the schema types the client-side reply', () => {
    const channel = root.lets('channel', 'chat6').channel()
    const handler = channel
      .lets('clientHandler', 'ping')
      .serverSend(z.object({ ask: z.string() }))
      .clientReply(({ message }) => ({ answer: `pong: ${message.ask}` }), z.object({ answer: z.string() }))
      .clientHandler()
    expect(typeof handler.point._clientReplyFn).toBe('function')
    expect(handler.point._clientReplySchema).toBeDefined()
  })

  it('emits pointHandler* events to chain subscriptions', async () => {
    const events: string[] = []
    const eventedRoot = Point0.lets('root', 'evented')
      .serverOn(
        [
          'pointHandlerServerStart',
          'pointHandlerServerSettled',
          'pointHandlerServerSuccess',
          'pointHandlerServerError',
        ],
        (event) => {
          events.push(event.name)
        },
      )
      .root()
    const channel = eventedRoot.lets('channel', 'chat').channel()
    const handler = channel
      .lets('serverHandler', 'poke')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    await handler.point._executeServerReply({
      inputSerialized: undefined,
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'm1',
      points: undefined as never,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events).toEqual(['pointHandlerServerStart', 'pointHandlerServerSettled', 'pointHandlerServerSuccess'])

    const strictHandler = channel
      .lets('serverHandler', 'strictPoke')
      .clientSend(z.object({ n: z.number() }))
      .serverReply(({ input }) => ({ n: input.n }))
      .serverHandler()
    events.length = 0
    await expect(
      strictHandler.point._executeServerReply({
        inputSerialized: strictHandler.point._getTransformer().stringify({ n: 'x' }),
        room: undefined,
        identity: {},
        connectionId: 'c1',
        messageId: 'm1',
        points: undefined as never,
      }),
    ).rejects.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the schema rejected the input — the commonest refusal there is, and the family reports it like any other: Start
    // fires ABOVE the parse, so the failure closes it with Settled/Error instead of vanishing before it opened
    expect(events).toEqual(['pointHandlerServerStart', 'pointHandlerServerSettled', 'pointHandlerServerError'])
  })

  it('a refused .clientSend input settles the handler family — Start above the parse, no Success, raw input', async () => {
    const events: Array<{ name: string; input: unknown; error: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedParseFail')
      .serverOn('*', (event) => {
        if (event.name.startsWith('pointHandlerServer')) {
          events.push({
            name: event.name,
            input: (event.data as { input?: unknown }).input,
            error: event.error,
          })
        }
      })
      .root()
    const channel = eventedRoot.lets('channel', 'parseFailChannel').channel()
    const handler = channel
      .lets('serverHandler', 'parseFailPoke')
      // a schema that TRANSFORMS: the happy path proves the family carries the raw input, not the parsed one
      .clientSend(z.object({ n: z.number(), extra: z.string().default('filled') }))
      .serverReply(({ input }) => ({ n: input.n, extra: input.extra }))
      .serverHandler()
    const transformer = handler.point._getTransformer()
    const executeArgs = (input: unknown) => ({
      inputSerialized: transformer.stringify(input),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'm1',
      points: undefined as never,
    })

    const ok = await handler.point._executeServerReply(executeArgs({ n: 2 }))
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the reply saw the PARSED input (the default filled in); the events carry the RAW one, every phase alike
    expect(ok.data).toEqual({ n: 2, extra: 'filled' })
    expect(events.map((event) => event.name)).toEqual([
      'pointHandlerServerStart',
      'pointHandlerServerSettled',
      'pointHandlerServerSuccess',
    ])
    expect(events.map((event) => event.input)).toEqual([{ n: 2 }, { n: 2 }, { n: 2 }])

    events.length = 0
    await expect(handler.point._executeServerReply(executeArgs({ n: 'nope' }))).rejects.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    // one Start, one Settled — the family invariant holds on the refusal path too, and no Success ever fires
    expect(events.map((event) => event.name)).toEqual([
      'pointHandlerServerStart',
      'pointHandlerServerSettled',
      'pointHandlerServerError',
    ])
    expect(events.every((event) => (event.input as { n: unknown }).n === 'nope')).toBe(true)
    // the Settled/Error pair carries the schema error itself (400-coded), the Start none
    expect(events[0]!.error).toBeUndefined()
    expect((events[2]!.error as { status?: number }).status).toBe(400)
  })

  it('handler stages are strict: message schemas and replies close the setup stage like a loader', () => {
    const channel = root.lets('channel', 'chatStages').channel()
    const replied = channel.lets('serverHandler', 'strictStages').serverReply(() => ({ ok: true })) as any
    expect(() => replied.serverReply(() => ({ again: true }))).toThrow(/setup stage/)
    expect(() => replied.clientSend(z.object({ text: z.string() }))).toThrow(/setup stage/)
    const clientReplied = channel.lets('clientHandler', 'strictClientStages').clientReply(() => ({ pong: true })) as any
    expect(() => clientReplied.clientReply(() => ({ again: true }))).toThrow(/setup stage/)
    expect(() => clientReplied.serverSend(z.object({ ask: z.string() }))).toThrow(/setup stage/)
  })

  it('the imperative reply: the envelope leaves at reply(), the code keeps running, a later return is ignored', async () => {
    const channel = root.lets('channel', 'chatImperative').channel()
    const order: string[] = []
    const handler = channel
      .lets('serverHandler', 'earlyPoke')
      .clientSend(z.object({ fail: z.boolean() }))
      .serverReply<{ ok: boolean }>(async ({ input, messageId, reply }) => {
        order.push('seen:' + messageId)
        if (input.fail) {
          reply(Object.assign(new Error('refused imperatively'), { code: 'NOPE' }))
          return
        }
        reply({ ok: true })
        order.push('after-reply')
        // the return after reply() is ignored by contract
        return { ok: false }
      })
      .serverHandler()
    const transformer = handler.point._getTransformer()
    const early: Array<{ dataSerialized?: string | undefined; error?: ErrorPoint0 }> = []
    const okResult = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ fail: false }),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-1',
      points: undefined as never,
      sendReply: (sent) => early.push(sent),
    })
    expect(order).toEqual(['seen:rid-1', 'after-reply'])
    // the early envelope carried the imperative data; the ignored return never reached the engine
    expect(early).toEqual([{ dataSerialized: transformer.stringify({ ok: true }) }])
    expect(okResult.replied).toBe(true)
    expect(okResult.dataSerialized).toBeUndefined()

    early.length = 0
    const errResult = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ fail: true }),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-2',
      points: undefined as never,
      sendReply: (sent) => early.push(sent),
    })
    // reply(Error) is the imperative refusal — the typed error rides the early envelope, nothing throws
    expect(early).toHaveLength(1)
    expect((early[0] as { error: ErrorPoint0 }).error.message).toBe('refused imperatively')
    expect((early[0] as { error: ErrorPoint0 }).error.code).toBe('NOPE')
    expect(errResult.replied).toBe(true)
  })

  it('without reply() the return answers as always; a throw after reply() emits pointHandlerServerLateError', async () => {
    const events: Array<{ name: string; error: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedLate')
      .serverOn(
        [
          'pointHandlerServerStart',
          'pointHandlerServerSettled',
          'pointHandlerServerSuccess',
          'pointHandlerServerError',
          'pointHandlerServerLateError',
        ],
        (event) => {
          events.push({ name: event.name, error: (event.data as { error?: unknown }).error })
        },
      )
      .root()
    const channel = eventedRoot.lets('channel', 'chatImperative2').channel()
    const handler = channel
      .lets('serverHandler', 'lateBoom')
      .clientSend(z.object({ boom: z.boolean() }))
      .serverReply<{ ok: boolean }>(({ input, reply }) => {
        if (input.boom) {
          reply({ ok: true })
          throw new Error('after the fact')
        }
        return { ok: true }
      })
      .serverHandler()
    const transformer = handler.point._getTransformer()
    const plain = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ boom: false }),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-3',
      points: undefined as never,
    })
    expect(plain.data).toEqual({ ok: true })
    expect(plain.dataSerialized).toBe(transformer.stringify({ ok: true }))
    expect(events.map((event) => event.name)).toEqual([
      'pointHandlerServerStart',
      'pointHandlerServerSettled',
      'pointHandlerServerSuccess',
    ])

    // the client already has its answer — the late throw is the server's business only (never rethrown, never
    // re-settled), but it is NOT swallowed: it is logged AND emitted as the dedicated late event, which is what puts
    // it in front of an app's `.on('error')`
    events.length = 0
    const lateBoom = await handler.point._executeServerReply({
      inputSerialized: transformer.stringify({ boom: true }),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-4',
      points: undefined as never,
      sendReply: () => {},
    })
    expect(lateBoom.replied).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the reply() settled the message as a SUCCESS (the only settle) and the late failure rode its own event, once
    expect(events.map((event) => event.name)).toEqual([
      'pointHandlerServerStart',
      'pointHandlerServerSettled',
      'pointHandlerServerSuccess',
      'pointHandlerServerLateError',
    ])
    const late = events.at(-1)!.error as ErrorPoint0
    expect(late.message).toBe('after the fact')
    // wrapped into the point's own Error class, like every other typed error the family carries
    expect(late).toBeInstanceOf(handler.point._Error)
  })

  it('onBeforeServerReply guards the message (throw = refusal) and stacks chain -> closer; onAfter sees the outcome', async () => {
    const calls: string[] = []
    const channel = root
      .lets('channel', 'chatGuard')
      .serverHandlerOptions({
        server: {
          onBeforeServerReply: () => {
            calls.push('before:chain')
          },
        },
      })
      .channel()
    const handler = channel
      .lets('serverHandler', 'guarded')
      .clientSend(z.object({ n: z.number() }))
      .serverReply(({ input }) => {
        calls.push('reply')
        return { double: input.n * 2 }
      })
      .serverHandler({
        server: {
          onBeforeServerReply: (props) => {
            // the guard rides the same props bag as the stage callbacks — `points` included
            calls.push('points' in props ? 'before:closer' : 'before:closer:no-points')
            if ((props.input as { n: number }).n < 0) {
              throw Object.assign(new Error('negative refused'), { code: 'NEGATIVE' })
            }
          },
          onAfterServerReply: ({ output, error }) => {
            calls.push('after:' + JSON.stringify(output ?? null) + ':' + (error ? error.message : 'none'))
          },
        },
      })
    const transformer = handler.point._getTransformer()
    const executeArgs = (n: number) => ({
      inputSerialized: transformer.stringify({ n }),
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-g',
      points: undefined as never,
    })
    const ok = await handler.point._executeServerReply(executeArgs(2))
    expect(ok.data).toEqual({ double: 4 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(calls).toEqual(['before:chain', 'before:closer', 'reply', 'after:{"double":4}:none'])

    calls.length = 0
    await expect(handler.point._executeServerReply(executeArgs(-1))).rejects.toThrow('negative refused')
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the refused message never reached the reply; onAfter observed the refusal
    expect(calls).toEqual(['before:chain', 'before:closer', 'after:null:negative refused'])
  })

  it('onAfterServerReply fires at the imperative reply() with its data; its own throw only logs', async () => {
    const afterSeen: Array<{ output: unknown; error: unknown }> = []
    const channel = root.lets('channel', 'chatGuardImperative').channel()
    const handler = channel
      .lets('serverHandler', 'guardedImperative')
      .serverReply<{ ok: boolean }>(({ reply }) => {
        reply({ ok: true })
      })
      .serverHandler({
        server: {
          onAfterServerReply: ({ output, error }) => {
            afterSeen.push({ output, error })
            throw new Error('audit exploded — must only log')
          },
        },
      })
    const result = await handler.point._executeServerReply({
      inputSerialized: undefined,
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-gd',
      points: undefined as never,
      sendReply: () => {},
    })
    expect(result.replied).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(afterSeen).toEqual([{ output: { ok: true }, error: undefined }])
  })

  it('a generator .serverReply throws — the server streams through a clientHandler push pipe instead', () => {
    const channel = root.lets('channel', 'chatNoStream').channel()
    const stage = channel.lets('serverHandler', 'chatBot').clientSend(z.object({ prompt: z.string() })) as any
    expect(() =>
      stage.serverReply(async function* () {
        yield { token: 'x' }
      }),
    ).toThrow(/generator \.serverReply is not supported/)
    // the sync kind is refused the same way
    expect(() =>
      stage.serverReply(function* () {
        yield { token: 'x' }
      }),
    ).toThrow(/generator \.serverReply is not supported/)
  })

  it('an imperative reply() emits pointHandlerServerSuccess with its data the moment it is called', async () => {
    const events: Array<{ name: string; output: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedImperative')
      .serverOn(['pointHandlerServerSuccess'], (event) => {
        events.push({ name: event.name, output: (event.data as { output?: unknown }).output })
      })
      .root()
    const channel = eventedRoot.lets('channel', 'chat').channel()
    let sawEventsAtReplyTime: number | undefined
    const handler = channel
      .lets('serverHandler', 'earlyPoke')
      .serverReply<{ ok: boolean }>(async ({ reply }) => {
        reply({ ok: true })
        sawEventsAtReplyTime = events.length
        await new Promise((resolve) => setTimeout(resolve, 5))
      })
      .serverHandler()
    await handler.point._executeServerReply({
      inputSerialized: undefined,
      room: undefined,
      identity: {},
      connectionId: 'c1',
      messageId: 'rid-1',
      points: undefined as never,
      sendReply: () => {},
    })
    // Success fired synchronously at reply() — before the callback finished its slow tail
    expect(sawEventsAtReplyTime).toBe(1)
    expect(events).toEqual([{ name: 'pointHandlerServerSuccess', output: { ok: true } }])
  })

  // ---- _executeJoiner: the space's join entry ----

  it('_executeJoiner: a single-room joiner return normalizes to a one-room list', async () => {
    const channel = root.lets('channel', 'joinSingle').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinSingleRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const transformer = space.point._getTransformer()
    const result = await space.point._executeJoiner({
      inputSerialized: transformer.stringify({ chatId: '5' }),
      identity: { me: 'u1' },
      connectionId: 'c1',
      points: undefined as never,
    })
    expect(result.rooms).toEqual([{ chatId: '5' }])
    expect(result.roomsSerialized).toEqual([transformer.stringify({ chatId: '5' }) as string])
  })

  it('_executeJoiner: an array joiner return enters several rooms and dedupes by serialized form', async () => {
    const channel = root.lets('channel', 'joinArray').channel()
    const space = channel
      .lets<{ id: string }>('space', 'joinArrayRoom')
      .input(z.object({ ids: z.array(z.string()) }))
      .joiner(({ input }) => input.ids.map((id) => ({ id })))
      .space()
    const transformer = space.point._getTransformer()
    const result = await space.point._executeJoiner({
      // a duplicate id is deduped away
      inputSerialized: transformer.stringify({ ids: ['a', 'b', 'a'] }),
      identity: {},
      connectionId: 'c1',
      points: undefined as never,
    })
    expect(result.rooms).toEqual([{ id: 'a' }, { id: 'b' }])
    expect(result.roomsSerialized).toEqual([
      transformer.stringify({ id: 'a' }) as string,
      transformer.stringify({ id: 'b' }) as string,
    ])
  })

  it('_executeJoiner: an undefined joiner return is a clean deny — joined nothing', async () => {
    const channel = root.lets('channel', 'joinDeny').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinDenyRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(() => undefined)
      .space()
    const transformer = space.point._getTransformer()
    const result = await space.point._executeJoiner({
      inputSerialized: transformer.stringify({ chatId: '5' }),
      identity: {},
      connectionId: 'c1',
      points: undefined as never,
    })
    expect(result.rooms).toEqual([])
    expect(result.roomsSerialized).toEqual([])
  })

  it('_executeJoiner: with no joiner the join is REFUSED — the space takes no client joins', async () => {
    const guardCalls: string[] = []
    const channel = root.lets('channel', 'joinNoJoiner').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinNoJoinerRoom')
      .input(z.object({ chatId: z.string() }))
      .space({
        server: {
          onBeforeJoiner: () => {
            guardCalls.push('before')
          },
        },
      })
    const transformer = space.point._getTransformer()
    // the input would have parsed fine — the refusal is about the space, not the frame
    const error = await space.point
      ._executeJoiner({
        inputSerialized: transformer.stringify({ chatId: '9' }),
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      })
      .catch((caught: ErrorPoint0) => caught)
    expect((error as ErrorPoint0).code).toBe('POINT0_SOCKET_JOIN_NOT_ALLOWED')
    expect((error as ErrorPoint0).status).toBe(403)
    // refused before anything ran — the join guards never saw it
    expect(guardCalls).toEqual([])
  })

  it('_executeJoiner: a bad join input rejects with the typed error before the joiner runs', async () => {
    let joinerRan = false
    const channel = root.lets('channel', 'joinBadInput').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinBadInputRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => {
        joinerRan = true
        return { chatId: input.chatId }
      })
      .space()
    const transformer = space.point._getTransformer()
    await expect(
      space.point._executeJoiner({
        inputSerialized: transformer.stringify({ chatId: 123 }),
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow()
    expect(joinerRan).toBe(false)
  })

  it('_executeJoiner: a refused .input settles the join family — Start above the parse, no dangling Start', async () => {
    const events: Array<{ name: string; input: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedJoinParseFail')
      .serverOn('*', (event) => {
        if (event.name.startsWith('pointSpaceJoinServer')) {
          events.push({ name: event.name, input: (event.data as { input?: unknown }).input })
        }
      })
      .root()
    const channel = eventedRoot.lets('channel', 'joinParseFailChannel').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinParseFailRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    await expect(
      space.point._executeJoiner({
        inputSerialized: space.point._getTransformer().stringify({ chatId: 123 }),
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events.map((event) => event.name)).toEqual([
      'pointSpaceJoinServerStart',
      'pointSpaceJoinServerSettled',
      'pointSpaceJoinServerError',
    ])
    // the raw join input rides every phase — the parse never produced another one
    expect(events.every((event) => (event.input as { chatId: unknown }).chatId === 123)).toBe(true)
  })

  it('_executeJoiner: a throwing joiner propagates the typed error (a failed join)', async () => {
    const channel = root.lets('channel', 'joinThrow').channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'joinThrowRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(() => {
        throw Object.assign(new Error('not a member'), { code: 'FORBIDDEN' })
      })
      .space()
    const transformer = space.point._getTransformer()
    await expect(
      space.point._executeJoiner({
        inputSerialized: transformer.stringify({ chatId: '5' }),
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow('not a member')
  })

  it("_executeJoiner: emits Start (and Start/Settled/Error on a throw) — the SUCCESS pair is the caller's to fire", async () => {
    const events: string[] = []
    const eventedRoot = Point0.lets('root', 'eventedJoin')
      .serverOn(
        [
          'pointSpaceJoinServerStart',
          'pointSpaceJoinServerSettled',
          'pointSpaceJoinServerSuccess',
          'pointSpaceJoinServerError',
        ],
        (event) => {
          events.push(event.name)
        },
      )
      .root()
    const channel = eventedRoot.lets('channel', 'chat').channel()
    const okSpace = channel
      .lets<{ chatId: string }>('space', 'joinEventOk')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const transformer = okSpace.point._getTransformer()
    const entered = await okSpace.point._executeJoiner({
      inputSerialized: transformer.stringify({ chatId: '5' }),
      identity: {},
      connectionId: 'c1',
      points: undefined as never,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the joiner ran and the rooms came back — but nothing is registered yet, so the join has NOT settled
    expect(entered.rooms).toEqual([{ chatId: '5' }])
    expect(events).toEqual(['pointSpaceJoinServerStart'])
    // the caller (the engine, once its `addRoomsToEntry` is done) closes the family with the returned input
    okSpace.point._emitSpaceJoinSettled({
      rooms: entered.rooms,
      identity: {},
      connectionId: 'c1',
      input: entered.input,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events).toEqual(['pointSpaceJoinServerStart', 'pointSpaceJoinServerSettled', 'pointSpaceJoinServerSuccess'])

    events.length = 0
    const failSpace = channel
      .lets<{ chatId: string }>('space', 'joinEventFail')
      .input(z.object({ chatId: z.string() }))
      .joiner(() => {
        throw new Error('denied')
      })
      .space()
    await expect(
      failSpace.point._executeJoiner({
        inputSerialized: failSpace.point._getTransformer().stringify({ chatId: '5' }),
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow('denied')
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events).toEqual(['pointSpaceJoinServerStart', 'pointSpaceJoinServerSettled', 'pointSpaceJoinServerError'])

    // an ENGINE-side refusal after the run (maxRooms, a socket dying mid-join) closes the family through the
    // helper's error variant — Settled + Error, never a Success, never a dangling Start
    events.length = 0
    okSpace.point._emitSpaceJoinSettled({
      rooms: undefined,
      identity: {},
      connectionId: 'c1',
      error: new okSpace.point._Error('refused after the run'),
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events).toEqual(['pointSpaceJoinServerSettled', 'pointSpaceJoinServerError'])
  })

  // ---- .enroller: the space's server-side auto-enrollment at connection setup ----

  it('.enroller registers the callback and coexists with .joiner in either order', () => {
    const channel = root
      .lets('channel', 'enrollReg')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const enrollerFirst = channel
      .lets<{ userId: string }>('space', 'enrollRegA')
      .enroller(({ identity }) => ({ userId: identity.userId }))
      .joiner(() => ({ userId: 'u2' }))
      .space()
    expect(typeof enrollerFirst.point._enrollerFn).toBe('function')
    expect(typeof enrollerFirst.point._joinerFn).toBe('function')
    const joinerFirst = channel
      .lets<{ chatId: string }>('space', 'enrollRegB')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .enroller(() => ({ chatId: 'general' }))
      .space()
    expect(typeof joinerFirst.point._enrollerFn).toBe('function')
    expect(typeof joinerFirst.point._joinerFn).toBe('function')
  })

  it('a second .enroller throws — a space takes at most one', () => {
    const channel = root.lets('channel', 'enrollTwice').channel()
    const stage = channel.lets<{ a: string }>('space', 'enrollTwiceRoom').enroller(() => ({ a: '1' })) as any
    expect(() => stage.enroller(() => ({ b: '2' }))).toThrow(/a space takes at most one/)
  })

  it('.enroller on a non-space chain throws', () => {
    const channel = root.lets('channel', 'enrollGuard').channel()
    const stage = channel.lets('serverHandler', 'notASpaceEnroll') as any
    expect(() => stage.enroller(() => ({}))).toThrow(/enroller\(\) lives on space points only/)
  })

  it('_executeEnroller: normalizes and dedupes the rooms; the callback sees identity and connectionId', async () => {
    const seen: Array<{ identity: unknown; connectionId: string }> = []
    const channel = root
      .lets('channel', 'enrollExec')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ userId: string }>('space', 'enrollExecRoom')
      .enroller(({ identity, connectionId }) => {
        seen.push({ identity, connectionId })
        // the duplicate room is deduped away by its serialized form
        return [{ userId: identity.userId }, { userId: 'observer' }, { userId: identity.userId }]
      })
      .space()
    const transformer = space.point._getTransformer()
    const result = await space.point._executeEnroller({
      identity: { userId: 'u1' },
      connectionId: 'c1',
      points: undefined as never,
    })
    expect(result.rooms).toEqual([{ userId: 'u1' }, { userId: 'observer' }])
    expect(result.roomsSerialized).toEqual([
      transformer.stringify({ userId: 'u1' }) as string,
      transformer.stringify({ userId: 'observer' }) as string,
    ])
    expect(seen).toEqual([{ identity: { userId: 'u1' }, connectionId: 'c1' }])
  })

  it('_executeEnroller: no enroller = empty rooms (a clean no-op); a throw propagates and fails the setup', async () => {
    const channel = root.lets('channel', 'enrollNone').channel()
    const bare = channel.lets('space', 'enrollNoneRoom').space()
    await expect(
      bare.point._executeEnroller({
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).resolves.toEqual({ rooms: [], roomsSerialized: [] })

    const failing = channel
      .lets<{ seatId: string }>('space', 'enrollFailRoom')
      .enroller(() => {
        throw Object.assign(new Error('no seat'), { code: 'NO_SEAT' })
      })
      .space()
    await expect(
      failing.point._executeEnroller({
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow('no seat')
  })

  it('_executeEnroller: the pointSpaceJoin* family carries input {} and the connectionId — an enrollment IS a join', async () => {
    const events: Array<{ name: string; connectionId: unknown; input: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedEnroll')
      .serverOn(
        [
          'pointSpaceJoinServerStart',
          'pointSpaceJoinServerSettled',
          'pointSpaceJoinServerSuccess',
          'pointSpaceJoinServerError',
        ],
        (event) => {
          events.push({
            name: event.name,
            connectionId: (event.data as { connectionId?: string }).connectionId,
            input: (event.data as { input?: unknown }).input,
          })
        },
      )
      .root()
    const channel = eventedRoot
      .lets('channel', 'chat')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const okSpace = channel
      .lets<{ userId: string }>('space', 'enrollEventsOk')
      .enroller(({ identity }) => ({ userId: identity.userId }))
      .space()
    const enrolled = await okSpace.point._executeEnroller({
      identity: { userId: 'u1' },
      connectionId: 'c1',
      points: undefined as never,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the enroller ran; the family settles when the caller registered the rooms, not a line earlier
    expect(events.map((event) => event.name)).toEqual(['pointSpaceJoinServerStart'])
    // an enrollment has no input at all — the helper's empty object is what the events carry, exactly like Start
    okSpace.point._emitSpaceJoinSettled({ rooms: enrolled.rooms, identity: { userId: 'u1' }, connectionId: 'c1' })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events.map((event) => event.name)).toEqual([
      'pointSpaceJoinServerStart',
      'pointSpaceJoinServerSettled',
      'pointSpaceJoinServerSuccess',
    ])
    expect(events[0]).toEqual({ name: 'pointSpaceJoinServerStart', connectionId: 'c1', input: {} })
    expect(events[2]).toEqual({ name: 'pointSpaceJoinServerSuccess', connectionId: 'c1', input: {} })

    events.length = 0
    const failSpace = channel
      .lets<{ userId: string }>('space', 'enrollEventsFail')
      .enroller(() => {
        throw new Error('denied')
      })
      .space()
    await expect(
      failSpace.point._executeEnroller({
        identity: {},
        connectionId: 'c1',
        points: undefined as never,
      }),
    ).rejects.toThrow('denied')
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(events.map((event) => event.name)).toEqual([
      'pointSpaceJoinServerStart',
      'pointSpaceJoinServerSettled',
      'pointSpaceJoinServerError',
    ])
  })

  // ---- space options: the join guards (onBeforeJoiner / onAfterJoiner), chain .spaceOptions() -> closer ----

  it('onBeforeJoiner guards the join (throw = joinErr, joiner never runs) and stacks chain -> closer; onAfter sees the outcome', async () => {
    const calls: string[] = []
    const guardedRoot = Point0.lets('root', 'spaceGuardOrder')
      .spaceOptions({
        server: {
          onBeforeJoiner: () => {
            calls.push('before:chain')
          },
        },
      })
      .root()
    const channel = guardedRoot
      .lets('channel', 'chat')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'guardedRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => {
        calls.push('joiner')
        return { chatId: input.chatId }
      })
      .space({
        server: {
          onBeforeJoiner: ({ input }) => {
            calls.push('before:closer')
            if (input.chatId === 'refused') {
              throw Object.assign(new Error('join refused'), { code: 'REFUSED' })
            }
          },
          onAfterJoiner: ({ output, error }) => {
            calls.push('after:' + JSON.stringify(output ?? null) + ':' + (error ? error.message : 'none'))
          },
        },
      })
    const transformer = space.point._getTransformer()
    const executeArgs = (chatId: string) => ({
      inputSerialized: transformer.stringify({ chatId }),
      identity: { userId: 'u1' },
      connectionId: 'c1',
      points: undefined as never,
    })
    const ok = await space.point._executeJoiner(executeArgs('5'))
    expect(ok.rooms).toEqual([{ chatId: '5' }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(calls).toEqual(['before:chain', 'before:closer', 'joiner', 'after:[{"chatId":"5"}]:none'])

    calls.length = 0
    await expect(space.point._executeJoiner(executeArgs('refused'))).rejects.toThrow('join refused')
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the refused join never reached the joiner; onAfter observed the refusal
    expect(calls).toEqual(['before:chain', 'before:closer', 'after:null:join refused'])
  })

  it('onAfterJoiner receives the settled join and its own throw only logs — the join outcome is untouched', async () => {
    const afterSeen: Array<{ output: unknown; error: unknown }> = []
    const channel = root
      .lets('channel', 'afterJoinerThrowChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'afterJoinerThrowRoom')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space({
        server: {
          onAfterJoiner: ({ output, error }) => {
            afterSeen.push({ output, error })
            throw new Error('audit exploded — must only log')
          },
        },
      })
    const transformer = space.point._getTransformer()
    const result = await space.point._executeJoiner({
      inputSerialized: transformer.stringify({ chatId: '5' }),
      identity: { userId: 'u1' },
      connectionId: 'c1',
      points: undefined as never,
    })
    expect(result.rooms).toEqual([{ chatId: '5' }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(afterSeen).toEqual([{ output: [{ chatId: '5' }], error: undefined }])
  })

  // ---- the SYNCHRONOUS local floor: memberships.local / connections.local ----

  it('local.count/list/rooms serialize the target and sift THIS process synchronously — no bus, no promise', () => {
    const localListCalls: any[] = []
    const localCountCalls: any[] = []
    const channel = root
      .lets('channel', 'localFloorChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'localFloorSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const channelTransformer = channel.point._getTransformer()
    const spaceTransformer = space.point._getTransformer()
    // two local memberships of the space, one holding a duplicate room across two cids
    const snapshots = [
      {
        cid: 'c1',
        identity: channelTransformer.stringify({ userId: 'u1' }) as string,
        spaces: { localFloorSpace: [spaceTransformer.stringify({ chatId: '5' }) as string] },
      },
      {
        cid: 'c2',
        identity: channelTransformer.stringify({ userId: 'u2' }) as string,
        spaces: {
          localFloorSpace: [
            spaceTransformer.stringify({ chatId: '5' }) as string,
            spaceTransformer.stringify({ chatId: '9' }) as string,
          ],
        },
      },
    ]
    const adapter = makeAdapter({
      localCount: (args) => {
        localCountCalls.push(args)
        return snapshots.length
      },
      localList: (args) => {
        localListCalls.push(args)
        return snapshots
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      // count is a plain number — no await
      expect(space.memberships.server.local.count({ $room: { chatId: '5' } })).toBe(2)
      expect(localCountCalls[0].space).toBe('localFloorSpace')
      expect(localCountCalls[0].roomMatcher).toBe(spaceTransformer.stringify({ chatId: '5' }))
      // list is the parsed membership items, synchronously
      expect(space.memberships.server.local.list()).toEqual([
        { connectionId: 'c1', identity: { userId: 'u1' }, rooms: [{ chatId: '5' }] },
        { connectionId: 'c2', identity: { userId: 'u2' }, rooms: [{ chatId: '5' }, { chatId: '9' }] },
      ])
      // rooms is the flat, deduped room set across the matching local memberships — { chatId: '5' } collapses to one
      expect(space.memberships.server.local.rooms({ connectionId: ['c1', 'c2'] })).toEqual([
        { chatId: '5' },
        { chatId: '9' },
      ])
      expect(localListCalls.at(-1).connectionId).toEqual(['c1', 'c2'])
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('connections.local.count/list read the channel slice synchronously with spacesParsed', () => {
    const channel = root
      .lets('channel', 'localFloorChanC')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'localFloorSpaceC')
      .input(z.object({ chatId: z.string() }))
      .space()
    const channelTransformer = channel.point._getTransformer()
    const spaceTransformer = space.point._getTransformer()
    const adapter = makeAdapter({
      localCount: () => 1,
      // a channel snapshot arrives with spacesParsed already filled by the engine (same process)
      localList: () => [
        {
          cid: 'c1',
          identity: channelTransformer.stringify({ userId: 'u1' }) as string,
          spaces: { localFloorSpaceC: [spaceTransformer.stringify({ chatId: '5' }) as string] },
          spacesParsed: { localFloorSpaceC: [{ chatId: '5' }] },
        },
      ],
    })
    registerSocketServerAdapter('root', adapter)
    try {
      expect(channel.connections.server.local.count()).toBe(1)
      expect(channel.connections.server.local.list()).toEqual([
        { connectionId: 'c1', identity: { userId: 'u1' }, spaces: { localFloorSpaceC: [{ chatId: '5' }] } },
      ])
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('a join guard caps rooms via memberships.local.rooms({ connectionId }) — the old rooms() use-case', async () => {
    const channel = root
      .lets('channel', 'localGuardChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    let held: string[] = []
    const space = channel
      .lets<{ chatId: string }>('space', 'localGuardSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space({
        server: {
          onBeforeJoiner: ({ connectionId }) => {
            if (space.memberships.server.local.rooms({ connectionId }).length >= 3) {
              throw new Error('cap')
            }
          },
        },
      })
    const spaceTransformer = space.point._getTransformer()
    const adapter = makeAdapter({
      localList: (args) =>
        (args.connectionId ?? []).map((cid) => ({
          cid,
          identity: '{}',
          spaces: { localGuardSpace: held.map((chatId) => spaceTransformer.stringify({ chatId }) as string) },
        })),
    })
    registerSocketServerAdapter('root', adapter)
    try {
      // under the cap — the join runs
      held = ['1', '2']
      const ok = await space.point._executeJoiner({
        inputSerialized: spaceTransformer.stringify({ chatId: '5' }),
        identity: { userId: 'u1' },
        connectionId: 'c1',
        points: undefined as never,
      })
      expect(ok.rooms).toEqual([{ chatId: '5' }])
      // at the cap — the guard throws, the join fails, the joiner never runs
      held = ['1', '2', '3']
      await expect(
        space.point._executeJoiner({
          inputSerialized: spaceTransformer.stringify({ chatId: '5' }),
          identity: { userId: 'u1' },
          connectionId: 'c1',
          points: undefined as never,
        }),
      ).rejects.toThrow(/cap/)
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('the local floor is server-only and lives on the matching point kind', async () => {
    const channel = root.lets('channel', 'localCrossChan').channel()
    const space = channel.lets('space', 'localCrossSpace').space()
    // memberships.local on a channel (and connections.local on a space) throw pointing at the right namespace
    expect(() => (channel as any).memberships.server.local.count()).toThrow(
      /memberships\.\* lives on space points only/,
    )
    expect(() => (space as any).connections.server.local.count()).toThrow(
      /connections\.\* lives on channel points only/,
    )
  })

  // ---- sendToClient(input, target, replies): target building and reply collection over the adapter seam ----

  it('sendToClient serializes the target: rooms by the SPACE transformer, $identity by the CHANNEL transformer, except split by kind', () => {
    const pushes: any[] = []
    const channel = root
      .lets('channel', 'pushChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'pushSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const spaceHandler = space
      .lets('clientHandler', 'pushSpaceMsg')
      .serverSend(z.object({ text: z.string() }))
      .clientHandler()
    const channelHandler = channel
      .lets('clientHandler', 'pushChanMsg')
      .serverSend(z.object({ text: z.string() }))
      .clientHandler()
    const adapter = makeAdapter({
      push: (args) => {
        pushes.push(args)
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      const spaceTransformer = space.point._getTransformer()
      const channelTransformer = channel.point._getTransformer()
      // a room-addressed space push, narrowed by cid + identity, minus one cid and one room
      spaceHandler.sendToClient(
        { text: 'hi' },
        {
          room: [{ chatId: '5' }, { chatId: '7' }],
          connectionId: 'cid1',
          $identity: { userId: '42' },
          // the type admits cids OR rooms per call; the runtime splits a mixed list by element kind
          except: ['cid2', { chatId: '9' }] as never,
        },
      )
      expect(pushes).toHaveLength(1)
      expect(pushes[0].handler).toBe(spaceHandler.point)
      expect(pushes[0].input).toBe(spaceHandler.point._getTransformer().stringify({ text: 'hi' }))
      expect(pushes[0].collect).toBeUndefined()
      expect(pushes[0].target).toEqual({
        connectionId: ['cid1'],
        identityMatcher: channelTransformer.stringify({ userId: '42' }) as string,
        space: 'pushSpace',
        rooms: [
          spaceTransformer.stringify({ chatId: '5' }) as string,
          spaceTransformer.stringify({ chatId: '7' }) as string,
        ],
        exceptConnectionIds: ['cid2'],
        exceptRooms: [spaceTransformer.stringify({ chatId: '9' }) as string],
      })
      // the bare space send is space-wide: the space is named, no rooms
      spaceHandler.sendToClient({ text: 'hi' })
      expect(pushes[1].target).toEqual({
        connectionId: undefined,
        identityMatcher: undefined,
        space: 'pushSpace',
        rooms: undefined,
        exceptConnectionIds: undefined,
        exceptRooms: undefined,
      })
      // a channel push carries no space at all
      channelHandler.sendToClient({ text: 'hi' }, { connectionId: ['cid1', 'cid2'] })
      expect(pushes[2].target).toEqual({
        connectionId: ['cid1', 'cid2'],
        identityMatcher: undefined,
        space: undefined,
        rooms: undefined,
        exceptConnectionIds: undefined,
        exceptRooms: undefined,
      })
      // $where cannot ride an identity matcher — rejected before the adapter sees the push
      expect(() => spaceHandler.sendToClient({ text: 'x' }, { $identity: { $where: 'return true' } as never })).toThrow(
        /\$where is not allowed/,
      )
      // room targeting on a CHANNEL handler is the same error at runtime the types raise
      expect(() => (channelHandler as any).sendToClient({ text: 'x' }, { room: { chatId: '5' } })).toThrow(
        /has no space — room targeting lives on space handlers/,
      )
      expect(pushes).toHaveLength(3)
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('sendToClient replies: no arg = no collection, true = an iterable, waitForAll = the array, onReply = a streamed window', async () => {
    const channel = root
      .lets('channel', 'repliesChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const handler = channel
      .lets('clientHandler', 'repliesPing')
      .serverSend(z.object({ ask: z.string() }))
      .clientReply(({ message }) => ({ answer: message.ask }), z.object({ answer: z.string() }))
      .clientHandler()
    const transformer = handler.point._getTransformer()
    const collects: Array<{ timeoutMs: number }> = []
    const adapter = makeAdapter({
      push: (args) => {
        if (!args.collect) {
          return
        }
        collects.push({ timeoutMs: args.collect.timeoutMs })
        // two valid replies and one the .clientReply schema drops
        args.collect.onReply({ cid: 'c1', data: transformer.stringify({ answer: 'a1' }) as string })
        args.collect.onReply({ cid: 'c2', data: transformer.stringify({ nope: true }) as string })
        args.collect.onReply({ cid: 'c3', data: transformer.stringify({ answer: 'a3' }) as string })
        const onDone = args.collect.onDone
        setTimeout(() => onDone(), 5)
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      // replies: true → an async iterable of { data, connectionId }; the invalid reply never surfaces
      const seen: Array<ClientHandlerReply<{ answer: string }>> = []
      for await (const reply of handler.sendToClient({ ask: 'q' }, {}, true)) {
        seen.push(reply)
      }
      expect(seen).toEqual([
        { data: { answer: 'a1' }, connectionId: 'c1' },
        { data: { answer: 'a3' }, connectionId: 'c3' },
      ])
      expect(collects[0].timeoutMs).toBe(5000) // the default collection window

      // { waitForAll: true } → the full array at window close; the timeout rides into the adapter window
      const all = await handler.sendToClient({ ask: 'q' }, {}, { waitForAll: true, timeout: 1234 })
      expect(all).toEqual([
        { data: { answer: 'a1' }, connectionId: 'c1' },
        { data: { answer: 'a3' }, connectionId: 'c3' },
      ])
      expect(collects[1].timeoutMs).toBe(1234)

      // { onReply } → streams each reply, resolves with nothing when the window closes
      const streamed: Array<ClientHandlerReply<{ answer: string }>> = []
      const settled = await handler.sendToClient(
        { ask: 'q' },
        {},
        {
          onReply: (reply) => {
            streamed.push(reply)
          },
        },
      )
      expect(settled).toBeUndefined()
      expect(streamed).toEqual([
        { data: { answer: 'a1' }, connectionId: 'c1' },
        { data: { answer: 'a3' }, connectionId: 'c3' },
      ])

      // no third argument → fire-and-forget: no collect window rode the push
      const sent = handler.sendToClient({ ask: 'q' })
      expect(sent).toBeUndefined()
      expect(collects).toHaveLength(3)
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('sendToClient emits the SERVER transport family: Start → Settled → Success on the accept, Error when it never leaves', async () => {
    // the push side of the transport altitude: `pointHandlerSendServer*` reports the act of TRANSMITTING, while
    // `pointHandlerClient*` (on the receiving client) reports the dispatch. Success means the engine ACCEPTED the
    // frame — a push is fire-and-forget, nothing here waits for a client to receive it
    const events: Array<{ name: string; input: unknown; error: unknown; point: unknown }> = []
    const eventedRoot = Point0.lets('root', 'eventedPush')
      .serverOn(
        [
          'pointHandlerSendServerStart',
          'pointHandlerSendServerSettled',
          'pointHandlerSendServerSuccess',
          'pointHandlerSendServerError',
        ],
        (event) => {
          events.push({
            name: event.name,
            input: (event.data as { input?: unknown }).input,
            error: (event.data as { error?: unknown }).error,
            point: event.meta.point,
          })
        },
      )
      .root()
    const channel = eventedRoot.lets('channel', 'pushEventsChan').channel()
    const handler = channel
      .lets('clientHandler', 'pushEventsMsg')
      .serverSend(z.object({ text: z.string() }))
      .clientHandler()
    registerSocketServerAdapter('eventedPush', makeAdapter())
    try {
      handler.sendToClient({ text: 'hi' })
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(events.map((event) => event.name)).toEqual([
        'pointHandlerSendServerStart',
        'pointHandlerSendServerSettled',
        'pointHandlerSendServerSuccess',
      ])
      // the family keeps the wire vocabulary: the pushed message rides as `input`
      expect(events[2].input).toEqual({ text: 'hi' })
      expect(events[2].error).toBeUndefined()
      expect(events[2].point).toBe('eventedPush:clientHandler:pushEventsMsg')

      // a push that cannot even be built (room targeting on a channel handler) closes the family with the error —
      // and still throws to the caller, unchanged
      events.length = 0
      expect(() => (handler as any).sendToClient({ text: 'x' }, { room: { chatId: '5' } })).toThrow(
        /has no space — room targeting lives on space handlers/,
      )
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(events.map((event) => event.name)).toEqual([
        'pointHandlerSendServerStart',
        'pointHandlerSendServerSettled',
        'pointHandlerSendServerError',
      ])
      expect((events[2].error as ErrorPoint0).message).toMatch(/room targeting lives on space handlers/)
    } finally {
      unregisterSocketServerAdapter('eventedPush')
    }
  })

  // ---- amendIdentity + the connections/memberships enumeration namespaces ----

  it('amendIdentity serializes the patch with the channel transformer and rides the adapter; channel points only', async () => {
    const calls: any[] = []
    const channel = root
      .lets('channel', 'amendChan')
      .connector(() => ({ userId: 'u1', displayName: 'A' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'amendSpace')
      .input(z.object({ chatId: z.string() }))
      .space()
    const adapter = makeAdapter({
      amendIdentity: async (args) => {
        calls.push(args)
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      const transformer = channel.point._getTransformer()
      await channel.amendIdentity({ connectionId: 'c1', $identity: { userId: 'u1' } }, { displayName: 'B' })
      expect(calls).toHaveLength(1)
      expect(calls[0].connectionId).toEqual(['c1'])
      expect(calls[0].matcher).toBe(transformer.stringify({ userId: 'u1' }))
      expect(calls[0].patchSerialized).toBe(transformer.stringify({ displayName: 'B' }))
      expect(calls[0].space).toBeUndefined()
      await expect(
        (space as never as { amendIdentity: (target: unknown, patch: unknown) => Promise<void> }).amendIdentity({}, {}),
      ).rejects.toThrow(/amendIdentity\(\) lives on channel points only/)
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('connections/memberships count+list serialize the admin target and parse the snapshots back', async () => {
    const countCalls: any[] = []
    const listCalls: any[] = []
    const channel = root
      .lets('channel', 'enumChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'enumSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const channelTransformer = channel.point._getTransformer()
    const spaceTransformer = space.point._getTransformer()
    const snapshot = {
      cid: 'c1',
      identity: channelTransformer.stringify({ userId: 'u1' }) as string,
      spaces: { enumSpace: [spaceTransformer.stringify({ chatId: '5' }) as string] },
      spacesParsed: { enumSpace: [{ chatId: '5' }] },
    }
    const adapter = makeAdapter({
      count: async (args) => {
        countCalls.push(args)
        return 7
      },
      list: async (args) => {
        listCalls.push(args)
        return [snapshot]
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      // count rides the bus as numbers only — the target and window are what reach the adapter
      await expect(channel.connections.server.count({ $identity: { userId: 'u1' } }, { timeout: 250 })).resolves.toBe(7)
      expect(countCalls[0].matcher).toBe(channelTransformer.stringify({ userId: 'u1' }))
      expect(countCalls[0].timeoutMs).toBe(250)
      expect(countCalls[0].space).toBeUndefined()

      // a channel item is { connectionId, identity, spaces } — spaces from the engine-parsed spacesParsed
      const listed = await channel.connections.server.list()
      expect(listed).toEqual([
        { connectionId: 'c1', identity: { userId: 'u1' }, spaces: { enumSpace: [{ chatId: '5' }] } },
      ])

      // a membership item parses THIS space's rooms with the space transformer
      const memberships = await space.memberships.server.list({
        room: { chatId: '5' },
        $room: { chatId: '5' },
        connectionId: 'c9',
      })
      expect(memberships).toEqual([{ connectionId: 'c1', identity: { userId: 'u1' }, rooms: [{ chatId: '5' }] }])
      const spaceArgs = listCalls[1]
      expect(spaceArgs.space).toBe('enumSpace')
      expect(spaceArgs.rooms).toEqual([spaceTransformer.stringify({ chatId: '5' })])
      expect(spaceArgs.roomMatcher).toBe(spaceTransformer.stringify({ chatId: '5' }))
      expect(spaceArgs.connectionId).toEqual(['c9'])
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('forEach streams: with a callback it resolves the processed count after every callback settles; bare it iterates', async () => {
    const channel = root
      .lets('channel', 'enumForEachChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'enumForEachSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const channelTransformer = channel.point._getTransformer()
    const spaceTransformer = space.point._getTransformer()
    const makeSnapshot = (cid: string) => ({
      cid,
      identity: channelTransformer.stringify({ userId: 'u-' + cid }) as string,
      spaces: { enumForEachSpace: [spaceTransformer.stringify({ chatId: '5' }) as string] },
    })
    const adapter = makeAdapter({
      forEach: ({ onItem, onDone }) => {
        onItem(makeSnapshot('c1'))
        onItem(makeSnapshot('c2'))
        setTimeout(onDone, 5)
      },
    })
    registerSocketServerAdapter('root', adapter)
    try {
      const settledIds: string[] = []
      const processed = await channel.connections.server.forEach(
        {},
        {
          onConnection: async (connection: ChannelConnectionListed<{ userId: string }>) => {
            await new Promise((resolve) => setTimeout(resolve, 10))
            settledIds.push(connection.connectionId)
          },
        },
      )
      expect(processed).toBe(2)
      // the promise resolved only after BOTH async callbacks settled
      expect(settledIds.sort()).toEqual(['c1', 'c2'])

      const seen: Array<{ connectionId: string; rooms: unknown[] }> = []
      for await (const membership of space.memberships.server.forEach()) {
        seen.push({ connectionId: membership.connectionId, rooms: membership.rooms })
      }
      expect(seen).toEqual([
        { connectionId: 'c1', rooms: [{ chatId: '5' }] },
        { connectionId: 'c2', rooms: [{ chatId: '5' }] },
      ])
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('connections.* on a space (and memberships.* on a channel) throw pointing at the right namespace', async () => {
    const channel = root.lets('channel', 'crossNsChan').channel()
    const space = channel.lets('space', 'crossNsSpace').space()
    await expect((space as any).connections.server.count()).rejects.toThrow(
      /connections\.\* lives on channel points only \(a space enumerates memberships\.\*\)/,
    )
    await expect((channel as any).memberships.server.count()).rejects.toThrow(
      /memberships\.\* lives on space points only \(a channel enumerates connections\.\*\)/,
    )
  })

  it('the two floors are side-locked: `client.*` throws on the server, `server.*` throws on the client', async () => {
    const channel = root
      .lets('channel', 'floorSides')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'floorSidesSpace')
      .joiner(() => ({ chatId: '5' }))
      .space()
    // the CLIENT floor on the server — a loud error, never a silently empty list
    expect(() => channel.connections.client.count()).toThrow(
      /connections\.client\.\* is client-side — nothing is ever connected on the server/,
    )
    expect(() => space.memberships.client.list()).toThrow(
      /memberships\.client\.\* is client-side — nothing is ever joined on the server/,
    )
    // the SERVER floor on the client — the mirror error, thrown before any adapter is touched
    const originalSide = process.env.POINT0_SIDE
    let serverFloorOnClient: Promise<unknown>
    try {
      process.env.POINT0_SIDE = 'client'
      expect(() => channel.connections.server.local.count()).toThrow(/connections\.server\.\* is server-side/)
      // grabbed inside the flip, awaited outside it — the throw is synchronous, the promise is already rejected
      serverFloorOnClient = space.memberships.server.count()
    } finally {
      if (originalSide === undefined) {
        delete process.env.POINT0_SIDE
      } else {
        process.env.POINT0_SIDE = originalSide
      }
    }
    await expect(serverFloorOnClient).rejects.toThrow(/memberships\.server\.\* is server-side/)
  })

  it('type surface', () => {
    // never called — tsc checks the body

    const typesOnly = () => {
      // the app channel: its connector returns the identity BARE (no room, no data)
      const appChannel = root
        .lets('channel', 'appT')
        .input(z.object({ workspaceId: z.string() }))
        .connector(({ input }) => ({ userId: 'u1', workspaceId: input.workspaceId }))
        .channel()

      // connect input and connection shape — no data, no room on a wave-4 connection
      const connection = appChannel.connect({ workspaceId: 'w1' })
      expectTypeOf(connection.status).toEqualTypeOf<ChannelConnectionStatus>()
      expectTypeOf(connection.status).toEqualTypeOf<'connecting' | 'open' | 'error' | 'closed'>()
      expectTypeOf(connection.input).toEqualTypeOf<{ workspaceId: string }>()
      expectTypeOf(connection.id).toEqualTypeOf<string | undefined>()
      expectTypeOf(connection.isLoading).toEqualTypeOf<boolean>()
      // @ts-expect-error — a wave-4 connection carries no data
      void connection.data
      // @ts-expect-error — a wave-4 connection carries no room
      void connection.room

      // CHANNEL serverHandler: identity flows into the reply, there is no room, the connection is `{ id }` only
      const announceHandler = appChannel
        .lets('serverHandler', 'announceT')
        .clientSend(z.object({ text: z.string() }))
        .serverReply((args) => {
          expectTypeOf(args.input).toEqualTypeOf<{ text: string }>()
          expectTypeOf(args.identity).toEqualTypeOf<{ userId: string; workspaceId: string }>()
          expectTypeOf(args.connectionId).toEqualTypeOf<string>()
          // @ts-expect-error — the per-callback `rooms()` is gone (use `connections`/`memberships`.local instead)
          void args.rooms
          // @ts-expect-error — a CHANNEL handler's reply has no room
          void args.room
          return { echo: args.input.text }
        })
        .serverHandler()
      // bare form resolves the connection on its own; bound forms fix it by connection or by channel input
      expectTypeOf(announceHandler.sendToServer({ text: 'hi' })).toEqualTypeOf<Promise<{ echo: string }>>()
      expectTypeOf(announceHandler(connection).sendToServer({ text: 'hi' })).toEqualTypeOf<Promise<{ echo: string }>>()
      expectTypeOf(announceHandler({ workspaceId: 'w1' }).sendToServer({ text: 'hi' })).toEqualTypeOf<
        Promise<{ echo: string }>
      >()
      // @ts-expect-error — the connection is no longer the first argument of sendToServer
      void announceHandler.sendToServer(connection, { text: 'hi' })

      // flavors: the default is a mutation — useSocketMutation exists, the query family does not
      expectTypeOf(announceHandler.useSocketMutation().mutateAsync({ text: 'hi' })).toEqualTypeOf<
        Promise<{ echo: string }>
      >()
      // @ts-expect-error — a mutation-flavored handler has no useSocketQuery
      void announceHandler.useSocketQuery
      // @ts-expect-error — a mutation-flavored handler has no fetchSocketQuery on the bound surface either
      void announceHandler(connection).fetchSocketQuery

      // the .query() flavor opens the query family and closes the mutation one
      const infoHandler = appChannel
        .lets('serverHandler', 'infoT')
        .clientSend(z.object({ q: z.string() }))
        .serverReply(({ input }) => ({ info: input.q }))
        .query({ staleTime: 60_000 })
        .serverHandler()
      expectTypeOf(infoHandler.useSocketQuery({ q: 'x' }).data).toEqualTypeOf<{ info: string } | undefined>()
      expectTypeOf(infoHandler(connection).fetchSocketQuery({ q: 'x' })).toEqualTypeOf<Promise<{ info: string }>>()
      expectTypeOf(infoHandler.getSocketQueryKey({ q: 'x' })).toEqualTypeOf<QueryKey>()
      // @ts-expect-error — a query-flavored handler has no useSocketMutation
      void infoHandler.useSocketMutation

      // a reply never streams — a generator .serverReply is a type error, sendToServer is always a Promise
      const botStage = appChannel.lets('serverHandler', 'botT').clientSend(z.object({ prompt: z.string() }))
      // @ts-expect-error — a generator .serverReply is not supported
      void botStage.serverReply(async function* ({ input }) {
        yield { token: input.prompt }
      })
      const botHandler = botStage.serverReply(async ({ input }) => ({ token: input.prompt })).serverHandler()
      expectTypeOf(botHandler.sendToServer({ prompt: 'x' })).toEqualTypeOf<Promise<{ token: string }>>()
      void botHandler.sendToServer({ prompt: 'x' }, { timeout: 1000, queue: false }) // scalar send options stay
      void botHandler.sendToServer({ prompt: 'x' }, { onReplyFromServer: () => {} }) // the reply callback too

      // customizers on a CHANNEL handler: identity is typed, there is no room, options are point-level (not per-send)
      const guardedT = appChannel
        .lets('serverHandler', 'guardedT')
        .clientSend(z.object({ n: z.number() }))
        .serverReply(({ input }) => ({ double: input.n * 2 }))
        .serverHandler({
          server: {
            onBeforeServerReply: (args) => {
              expectTypeOf(args.input).toEqualTypeOf<{ n: number }>()
              expectTypeOf(args.identity).toEqualTypeOf<{ userId: string; workspaceId: string }>()
              expectTypeOf(args.messageId).toEqualTypeOf<string>()
              expectTypeOf(args.connectionId).toEqualTypeOf<string>()
              // the guard reaches other server points the same way the stage callbacks do
              expectTypeOf(args.points).not.toBeNever()
              // @ts-expect-error — a CHANNEL handler customizer has no room
              void args.room
            },
            onAfterServerReply: ({ output, error }) => {
              expectTypeOf(output).toEqualTypeOf<{ double: number } | undefined>()
              expectTypeOf(error).toEqualTypeOf<ErrorPoint0 | undefined>()
            },
          },
          // the client reply callback correlates the reply with the send it answers
          client: {
            onReplyFromServer: ({ input, data }) => {
              expectTypeOf(input).toEqualTypeOf<{ n: number }>()
              expectTypeOf(data).toEqualTypeOf<{ double: number }>()
            },
          },
        })
      void guardedT
      // @ts-expect-error — the server customizers are point options, not per-call send options
      void announceHandler.sendToServer({ text: 'x' }, { onBeforeServerReply: () => {} })

      // the imperative reply: the EXPLICIT generic names the reply type and unlocks `reply` in the args
      const transcodeHandler = appChannel
        .lets('serverHandler', 'transcodeT')
        .clientSend(z.object({ fast: z.boolean() }))
        .serverReply<{ url: string }>(async ({ input, reply }) => {
          expectTypeOf(reply).toEqualTypeOf<(data: { url: string } | Error) => void>()
          if (input.fast) {
            return { url: 'cached' }
          }
          reply({ url: 'later' }) // answer now, keep working
          // @ts-expect-error — the imperative data must match the named reply type
          reply({ wrong: true })
          return undefined
        })
        .serverHandler()
      expectTypeOf(transcodeHandler.sendToServer({ fast: false })).toEqualTypeOf<Promise<{ url: string }>>()
      // @ts-expect-error — with the explicit generic the return must match the named type
      void appChannel.lets('serverHandler', 'transcodeBadT').serverReply<{ url: string }>(() => ({ wrong: true }))

      // without the generic there is no imperative reply — the return is the only answer
      void appChannel.lets('serverHandler', 'noImperativeT').serverReply((args) => {
        expectTypeOf(args).not.toHaveProperty('reply')
        return { ok: true }
      })

      // .serverReply<undefined>() — reply(undefined) is the early ack
      const fireAndAckHandler = appChannel
        .lets('serverHandler', 'fireAndAckT')
        .serverReply<undefined>(({ reply }) => {
          reply(undefined)
        })
        .serverHandler()
      // the pure ack types as EmptyData — the same shape a bare ack always had (runtime resolves undefined)
      expectTypeOf(fireAndAckHandler.sendToServer()).toEqualTypeOf<Promise<EmptyData>>()

      // CHANNEL clientHandler: sendToClient(input, target?, replies?) addresses CONNECTIONS — bare = everyone,
      // `connectionId` / a `$identity` sift narrow; never a room
      const announceClient = appChannel
        .lets('clientHandler', 'announceClientT')
        .serverSend(z.object({ text: z.string() }))
        .clientReply(
          ({ message, connection: clientConnection }) => {
            // the channel input types the client connection; a CHANNEL clientReply has no room
            expectTypeOf(clientConnection.input).toEqualTypeOf<{ workspaceId: string }>()
            // @ts-expect-error — a CHANNEL clientReply has no room
            void clientConnection.room
            return { ack: message.text }
          },
          z.object({ ack: z.string() }),
        )
        .clientHandler()
      expectTypeOf(announceClient.sendToClient({ text: 'hi' })).toEqualTypeOf<void>() // all (no replies collected)
      announceClient.sendToClient({ text: 'hi' }, { connectionId: 'cid1' }) // one cid
      announceClient.sendToClient({ text: 'hi' }, { connectionId: ['cid1', 'cid2'] }) // several cids
      announceClient.sendToClient({ text: 'hi' }, { $identity: { userId: '42' } }) // identity sift
      announceClient.sendToClient({ text: 'hi' }, { except: 'cid1' }) // all minus one
      // excess-property checks HOLD on the send's fresh literals — regression pins: the signature once inferred the
      // whole argument tuple into a type parameter, and freshness dies on inference (the overloads fixed it)
      // @ts-expect-error — a mistyped key in the message
      void announceClient.sendToClient({ text: 'hi', nope: 1 })
      // @ts-expect-error — a mistyped key in the target
      void announceClient.sendToClient({ text: 'hi' }, { connectionId: 'cid1', nope: 1 })
      // @ts-expect-error — a CHANNEL handler's target has no room key at all
      void announceClient.sendToClient({ text: 'hi' }, { room: { chatId: '5' } })
      // @ts-expect-error — the old single-options-bag form is gone: the message is the first positional argument
      void announceClient.sendToClient({ input: { text: 'hi' } })
      // @ts-expect-error — `identity:` is renamed `$identity` (the $-dictionary)
      void announceClient.sendToClient({ text: 'hi' }, { identity: { userId: '42' } })

      // a roomless pure-trigger channel clientHandler — bare send is allowed
      const pingedClient = appChannel.lets('clientHandler', 'pingedT').clientHandler()
      expectTypeOf(pingedClient.sendToClient()).toEqualTypeOf<void>()
      // @ts-expect-error — no .clientReply, no `replies` argument
      void pingedClient.sendToClient(undefined, {}, true)

      // listeners — bare and bound by connection; props carry the MESSAGE only (no `data`: the listeners are
      // decoupled from the `.clientReply` auto-responder), and a CHANNEL handler's listener has no room
      announceClient.useOnMessageFromServer((props) => {
        expectTypeOf(props.message).toEqualTypeOf<{ text: string }>()
        // @ts-expect-error — no `data` on listener props (react to the reply in `.clientReply` itself)
        void props.data
        // @ts-expect-error — a CHANNEL handler's listener has no room
        void props.room
      })
      const listener = announceClient.onMessageFromServer(({ message }) => {
        expectTypeOf(message).toEqualTypeOf<{ text: string }>()
      })
      expectTypeOf(listener.remove).toEqualTypeOf<() => void>()
      // @ts-expect-error — the connection is no longer the first argument of useOnMessageFromServer
      announceClient.useOnMessageFromServer(connection as AnyClientChannelConnection, () => {})

      // the closing guard: serverHandler without .serverReply is a type error
      const noReply = appChannel.lets('serverHandler', 'noReplyT')
      // @ts-expect-error — Point has no reply. Please add .serverReply() before calling .serverHandler()
      noReply.serverHandler()

      // handlers expose no loader/ctx/use
      const handlerStage = appChannel.lets('serverHandler', 'noLoaderT')
      expectTypeOf(handlerStage).not.toHaveProperty('loader')
      expectTypeOf(handlerStage).not.toHaveProperty('use')

      // ---- SPACE surface: rooms, membership, room-typed callbacks and targeting ----

      const chatSpace = appChannel
        .lets<{ chatId: string }>('space', 'chatSpaceT')
        .input(z.object({ chatId: z.string() }))
        .joiner(({ input, identity }) => {
          // the joiner gets the space input and the channel's frozen identity
          expectTypeOf(input).toEqualTypeOf<{ chatId: string }>()
          expectTypeOf(identity).toEqualTypeOf<{ userId: string; workspaceId: string }>()
          return { chatId: input.chatId }
        })
        .space()

      // join / useMembership return the membership facade — rooms typed by the joiner, connection typed by the channel
      const membership = chatSpace.join({ chatId: '5' })
      expectTypeOf(membership.status).toEqualTypeOf<SpaceMembershipStatus>()
      expectTypeOf(membership.rooms).toEqualTypeOf<Array<{ chatId: string }>>()
      expectTypeOf(membership.input).toEqualTypeOf<{ chatId: string }>()
      expectTypeOf(membership.isLoading).toEqualTypeOf<boolean>()
      expectTypeOf(membership.leave).toEqualTypeOf<() => void>()
      expectTypeOf(membership.connection.input).toEqualTypeOf<{ workspaceId: string }>()
      expectTypeOf(chatSpace.useMembership({ chatId: '5' }).rooms).toEqualTypeOf<Array<{ chatId: string }>>()
      expectTypeOf(chatSpace.getMembershipOrUndefined({ chatId: '5' })).toEqualTypeOf<typeof membership | undefined>()

      // SPACE serverHandler: the reply gets the typed room next to identity; the connection stays `{ id }`
      const messageSendHandler = chatSpace
        .lets('serverHandler', 'messageSendT')
        .clientSend(z.object({ text: z.string() }))
        .serverReply(({ input, identity, room, connectionId }) => {
          expectTypeOf(input).toEqualTypeOf<{ text: string }>()
          expectTypeOf(identity).toEqualTypeOf<{ userId: string; workspaceId: string }>()
          expectTypeOf(room).toEqualTypeOf<{ chatId: string }>()
          expectTypeOf(connectionId).toEqualTypeOf<string>()
          // the SPACE handler's own current rooms come from the synchronous local floor, typed by the joiner
          expectTypeOf(chatSpace.memberships.server.local.rooms({ connectionId })).toEqualTypeOf<
            Array<{ chatId: string }>
          >()
          return { echo: input.text }
        })
        .serverHandler()
      // a space handler is addressed by ROOM: bind the room object, a membership (= "use its single room"), or a room
      // plus a disambiguating channel input
      expectTypeOf(messageSendHandler.sendToServer({ text: 'hi' })).toEqualTypeOf<Promise<{ echo: string }>>()
      expectTypeOf(messageSendHandler(membership).sendToServer({ text: 'hi' })).toEqualTypeOf<
        Promise<{ echo: string }>
      >()
      expectTypeOf(messageSendHandler({ chatId: '5' }).sendToServer({ text: 'hi' })).toEqualTypeOf<
        Promise<{ echo: string }>
      >()
      expectTypeOf(
        messageSendHandler({ chatId: '5' }, { workspaceId: 'w1' }).sendToServer({ text: 'hi' }),
      ).toEqualTypeOf<Promise<{ echo: string }>>()
      // the binder takes the ROOM type — not any object
      // @ts-expect-error — `{ nope }` is neither a room nor a membership
      void messageSendHandler({ nope: '5' }).sendToServer({ text: 'hi' })
      // the `{ room }` CALL option is gone — binding is the one way to address a room
      // @ts-expect-error — `room` is not a send option any more; bind it instead: handler(room).sendToServer(...)
      void messageSendHandler.sendToServer({ text: 'hi' }, { room: { chatId: '5' } })
      // the surviving call options
      void messageSendHandler({ chatId: '5' }).sendToServer({ text: 'hi' }, { queue: false, timeout: 100 })

      // SPACE serverHandler customizer: room is typed
      chatSpace
        .lets('serverHandler', 'guardedSpaceT')
        .clientSend(z.object({ text: z.string() }))
        .serverReply(({ input }) => ({ echo: input.text }))
        .serverHandler({
          server: {
            onBeforeServerReply: ({ room, identity }) => {
              expectTypeOf(room).toEqualTypeOf<{ chatId: string }>()
              expectTypeOf(identity).toEqualTypeOf<{ userId: string; workspaceId: string }>()
            },
          },
        })

      // SPACE clientHandler: sendToClient(input, target?, replies?) addresses ROOMS — bare = the whole space (the
      // space-wide topic), `room` / `connectionId` / `$identity` narrow (parts AND-combine)
      const messageNewHandler = chatSpace
        .lets('clientHandler', 'messageNewT')
        .serverSend(z.object({ text: z.string() }))
        .clientReply(({ message, room }) => {
          expectTypeOf(message).toEqualTypeOf<{ text: string }>()
          // a SPACE clientReply gets the room
          expectTypeOf(room).toEqualTypeOf<{ chatId: string }>()
          return { ack: message.text }
        })
        .clientHandler()
      // a SPACE handler's listener props carry the typed room (the room the push addressed)
      messageNewHandler.useOnMessageFromServer(({ message, room }) => {
        expectTypeOf(message).toEqualTypeOf<{ text: string }>()
        expectTypeOf(room).toEqualTypeOf<{ chatId: string }>()
      })
      messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5' } })
      messageNewHandler.sendToClient({ text: 'hi' }, { room: [{ chatId: '5' }, { chatId: '7' }] }) // several rooms
      messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5' }, except: 'cid1' })
      messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5' }, except: { chatId: '7' } }) // room except
      expectTypeOf(messageNewHandler.sendToClient({ text: 'hi' })).toEqualTypeOf<void>() // bare = space-wide
      messageNewHandler.sendToClient({ text: 'hi' }, { connectionId: 'cid1' }) // narrowed to one connection
      messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5' }, $identity: { userId: '42' } })
      // `$room` — the explicit sift scan, allowed in pushes like everywhere targets are taken
      messageNewHandler.sendToClient({ text: 'hi' }, { $room: { chatId: '5' } })
      messageNewHandler.sendToClient({ text: 'hi' }, { $room: { chatId: { $in: ['5', '7'] } } })
      // @ts-expect-error — `rooms:` is gone; `room` takes the array
      void messageNewHandler.sendToClient({ text: 'hi' }, { rooms: [{ chatId: '5' }] })
      // @ts-expect-error — a mistyped key in a room snapshot is a wrong address, caught on the fresh literal
      void messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5', nope: 1 } })
      // @ts-expect-error — a mistyped key in an `except` room
      void messageNewHandler.sendToClient({ text: 'hi' }, { room: { chatId: '5' }, except: { chatId: '7', nope: 1 } })
      // @ts-expect-error — a mistyped key in the replies argument (a typo here would silently change the return type)
      void messageNewHandler.sendToClient({ text: 'x' }, { room: { chatId: '5' } }, { timeout: 1000, waitforAll: true })
      const iterable = messageNewHandler.sendToClient({ text: 'x' }, { room: { chatId: '5' } }, true)
      expectTypeOf(iterable).toEqualTypeOf<AsyncIterable<ClientHandlerReply<{ ack: string }>>>()
      const all = messageNewHandler.sendToClient({ text: 'x' }, { room: { chatId: '5' } }, { waitForAll: true })
      expectTypeOf(all).toEqualTypeOf<Promise<Array<ClientHandlerReply<{ ack: string }>>>>()
      const windowClosed = messageNewHandler.sendToClient(
        { text: 'x' },
        { room: { chatId: '5' } },
        {
          timeout: 1000,
          onReply: (reply) => {
            expectTypeOf(reply).toEqualTypeOf<ClientHandlerReply<{ ack: string }>>()
          },
        },
      )
      expectTypeOf(windowClosed).toEqualTypeOf<Promise<void>>()

      // ---- Infer: Identity reads the connector on a channel, the parent channel's on a space/handler; Room reads the
      //      joiner on a space, the parent space's on a space handler, and is `undefined` on channel-level points ----
      expectTypeOf<typeof appChannel.Infer.Identity>().toEqualTypeOf<{ userId: string; workspaceId: string }>()
      expectTypeOf<typeof appChannel.Infer.Room>().toEqualTypeOf<undefined>()
      expectTypeOf<typeof announceHandler.Infer.Identity>().toEqualTypeOf<{ userId: string; workspaceId: string }>()
      expectTypeOf<typeof announceHandler.Infer.Room>().toEqualTypeOf<undefined>()
      expectTypeOf<typeof chatSpace.Infer.Identity>().toEqualTypeOf<{ userId: string; workspaceId: string }>()
      expectTypeOf<typeof chatSpace.Infer.Room>().toEqualTypeOf<{ chatId: string }>()
      expectTypeOf<typeof messageSendHandler.Infer.Room>().toEqualTypeOf<{ chatId: string }>()
      expectTypeOf<typeof messageSendHandler.Infer.Identity>().toEqualTypeOf<{ userId: string; workspaceId: string }>()

      // ---- .with(channel): the DEFAULT render never waits — the connection may still be connecting ----
      root
        .lets('page', 'withChanT', '/with-chan')
        .with(appChannel, { workspaceId: 'w1' })
        .page(({ connections }) => {
          const [pageConnection] = connections
          expectTypeOf(pageConnection.id).toEqualTypeOf<string | undefined>()
          expectTypeOf(pageConnection.isLoading).toEqualTypeOf<boolean>()
          expectTypeOf(pageConnection.input).toEqualTypeOf<{ workspaceId: string }>()
          expectTypeOf(pageConnection.status).toEqualTypeOf<ChannelConnectionStatus>()
          // @ts-expect-error — a connection carries no data
          void pageConnection.data
          // @ts-expect-error — a connection carries no room
          void pageConnection.room
          return null
        })

      // .with(channel, input, options?, gate): the positional `gate` is a pure RENDER gate — it never narrows the
      // injected facade type, which always stays indeterminate (a connection carries no data and its status can flip)
      root
        .lets('page', 'withChanResolveT', '/with-chan-resolve')
        .with(appChannel, { workspaceId: 'w1' }, undefined, true)
        .loading(() => null)
        .page(({ connections }) => {
          const [pageConnection] = connections
          expectTypeOf(pageConnection.id).toEqualTypeOf<string | undefined>()
          expectTypeOf(pageConnection.isLoading).toEqualTypeOf<boolean>()
          return null
        })

      // the channel input is typed on .with — a wrong input is a type error
      root
        .lets('page', 'withChanBadT', '/with-chan-bad')
        // @ts-expect-error — the channel requires { workspaceId: string }
        .with(appChannel, { nope: true })

      // ---- .with(space): the DEFAULT render never waits — the membership may still be joining ----
      root
        .lets('page', 'withSpaceT', '/with-space')
        .with(appChannel, { workspaceId: 'w1' })
        .with(chatSpace, { chatId: '5' })
        .page(({ memberships }) => {
          const [pageMembership] = memberships
          expectTypeOf(pageMembership.status).toEqualTypeOf<SpaceMembershipStatus>()
          expectTypeOf(pageMembership.isLoading).toEqualTypeOf<boolean>()
          expectTypeOf(pageMembership.input).toEqualTypeOf<{ chatId: string }>()
          expectTypeOf(pageMembership.leave).toEqualTypeOf<() => void>()
          return null
        })

      // .with(space, input, options?, gate): the positional `gate` is a pure RENDER gate — the injected membership
      // facade type stays indeterminate too (no data, a status that can flip)
      root
        .lets('page', 'withSpaceResolveT', '/with-space-resolve')
        .with(appChannel, { workspaceId: 'w1' }, undefined, true)
        .with(chatSpace, { chatId: '5' }, undefined, true)
        .loading(() => null)
        .page(({ connections, memberships }) => {
          const [pageConnection] = connections
          const [pageMembership] = memberships
          expectTypeOf(pageConnection.id).toEqualTypeOf<string | undefined>()
          expectTypeOf(pageMembership.status).toEqualTypeOf<SpaceMembershipStatus>()
          expectTypeOf(pageMembership.isLoading).toEqualTypeOf<boolean>()
          expectTypeOf(pageMembership.rooms).toEqualTypeOf<Array<{ chatId: string }>>()
          return null
        })

      // the space input is typed on .with — a wrong input is a type error
      root
        .lets('page', 'withSpaceBadT', '/with-space-bad')
        .with(appChannel, { workspaceId: 'w1' })
        // @ts-expect-error — the space requires { chatId: string }
        .with(chatSpace, { nope: true })

      // ---- .with(queryHandler): a query-flavored serverHandler is read anywhere an ordinary query is — its reply
      //      lands as `data` on the mountable exactly like a query, and its input is typed by `.clientSend`. The one
      //      difference is invisible to the page: the fetch rides the socket connection a preceding `.with(channel)`
      //      / `.with(space)` holds, and (like every socket query) it is skipped during SSR. ----
      // a CHANNEL query handler — `infoHandler` above (input { q }, reply { info }); it rides the `.with(appChannel)`
      root
        .lets('page', 'withChanQueryHandlerT', '/with-chan-qh')
        .with(appChannel, { workspaceId: 'w1' }, undefined, true)
        .with(infoHandler, { q: 'x' })
        .loading(() => null)
        .page(({ data, connections }) => {
          const [pageConnection] = connections
          expectTypeOf(pageConnection.id).toEqualTypeOf<string | undefined>()
          // the handler's reply is delivered as `data`, non-nullable, exactly like an ordinary injected query
          expectTypeOf(data).toEqualTypeOf<{ info: string }>()
          return null
        })

      // a MUTATION-flavored handler is NOT a query — `.with` rejects it (no query surface to inject)
      root
        .lets('page', 'withMutHandlerBadT', '/with-mut-qh-bad')
        .with(appChannel, { workspaceId: 'w1' })
        // @ts-expect-error — messageSendHandler is the default mutation flavor, not injectable as a query
        .with(messageSendHandler, { text: 'x' })

      // a SPACE query handler composes with `.with(space)`: the reply's `data` carries the room-scoped shape
      const chatInfoHandler = chatSpace
        .lets('serverHandler', 'chatInfoT')
        .clientSend(z.object({ q: z.string() }))
        .serverReply(({ input, room }) => ({ hit: input.q, chatId: room.chatId }))
        .query()
        .serverHandler()
      root
        .lets('page', 'withSpaceQueryHandlerT', '/with-space-qh')
        .with(appChannel, { workspaceId: 'w1' }, undefined, true)
        .with(chatSpace, { chatId: '5' }, undefined, true)
        .with(chatInfoHandler, { q: 'x' })
        .loading(() => null)
        .page(({ data, memberships }) => {
          const [pageMembership] = memberships
          expectTypeOf(pageMembership.status).toEqualTypeOf<SpaceMembershipStatus>()
          expectTypeOf(data).toEqualTypeOf<{ hit: string; chatId: string }>()
          return null
        })
    }
    void typesOnly
  })

  it('type surface: a connectorless channel identity is STRICTLY empty — {} to read, {} to match', () => {
    // never called — tsc checks the body

    const typesOnly = () => {
      // no input, no connector: the sentinel resolves at the closer to the EXACT empty object — never any/unknown
      const bareChannel = root.lets('channel', 'bareT').channel()
      expectTypeOf<typeof bareChannel.Infer.Identity>().toEqualTypeOf<Record<never, never>>()

      // the joiner sees the empty identity — reading a field off it is a compile error
      const bareSpace = bareChannel
        .lets<{ chatId: string }>('space', 'bareSpaceT')
        .joiner(({ identity }) => {
          expectTypeOf(identity).toEqualTypeOf<Record<never, never>>()
          // @ts-expect-error — a connectorless channel's identity has no fields
          void identity.userId
          return { chatId: 'x' }
        })
        .space()
      void bareSpace

      // the enroller too
      void bareChannel.lets<{ userId: string }>('space', 'bareEnrollT').enroller(({ identity }) => {
        expectTypeOf(identity).toEqualTypeOf<Record<never, never>>()
        // @ts-expect-error — a connectorless channel's identity has no fields
        void identity.userId
        return undefined
      })

      // and a serverHandler's .serverReply
      void bareChannel.lets('serverHandler', 'bareEchoT').serverReply(({ identity }) => {
        expectTypeOf(identity).toEqualTypeOf<Record<never, never>>()
        // @ts-expect-error — a connectorless channel's identity has no fields
        void identity.me
        return { ok: true }
      })

      // the $identity matcher over the empty identity is a matcher over {}: only the $or/$and shell remains, and a
      // keyed matcher is rejected in EVERY position — sendToClient's inferred-tuple target included (the collapsed
      // mapped part is dropped from `IdentityMatcher` so the shell stays a weak type)
      expectTypeOf<keyof IdentityMatcher<typeof bareChannel.Infer.Identity>>().toEqualTypeOf<'$or' | '$and'>()
      const barePing = bareChannel.lets('clientHandler', 'barePingT').clientHandler()
      void barePing.sendToClient(undefined, { $identity: {} })
      void barePing.sendToClient(undefined, { $identity: { $or: [{}, {}] } })
      // @ts-expect-error — no identity fields exist to match over
      void barePing.sendToClient(undefined, { $identity: { userId: '1' } })
      void bareChannel.kick({ $identity: {} })
      // @ts-expect-error — no identity fields exist to match over
      void bareChannel.kick({ $identity: { userId: '1' } })

      // the same channel WITH a connector: every surface above compiles with the exact connector-named identity
      const userChannel = root
        .lets('channel', 'userT')
        .connector(() => ({ userId: '1' }))
        .channel()
      expectTypeOf<typeof userChannel.Infer.Identity>().toEqualTypeOf<{ userId: string }>()
      void userChannel.lets<{ userId: string }>('space', 'userSpaceT').joiner(({ identity }) => {
        expectTypeOf(identity).toEqualTypeOf<{ userId: string }>()
        return { userId: identity.userId }
      })
      void userChannel
        .lets<{ userId: string }>('space', 'userEnrollT')
        .enroller(({ identity }) => ({ userId: identity.userId }))
      void userChannel.lets('serverHandler', 'userEchoT').serverReply(({ identity }) => ({ me: identity.userId }))
      const userPing = userChannel.lets('clientHandler', 'userPingT').clientHandler()
      void userPing.sendToClient(undefined, { $identity: { userId: { $in: ['1', '2'] } } })
      void userChannel.kick({ $identity: { userId: '1' } })
      void userChannel.amendIdentity({ connectionId: 'c1' }, { userId: '2' })
      // @ts-expect-error — `plan` is not a field of { userId: string }
      void userChannel.amendIdentity({ connectionId: 'c1' }, { plan: 'pro' })

      // amendIdentity on the CONNECTORLESS channel is a compile error: `Partial<Record<never, never>>` is `{}` and
      // would take ANY patch (nothing to check against), so the ban rides the target argument
      // (`AssertIdentityAmendable`) — the runtime twin is pinned in socket-connectorless.int.test.ts
      // @ts-expect-error — a connectorless channel has nothing to amend
      void bareChannel.amendIdentity({ $identity: {} }, { plan: 'pro' })
      // @ts-expect-error — the ban is the identity's, not the matcher's: the bare-target spelling is refused too
      void bareChannel.amendIdentity({}, {})
    }
    void typesOnly
  })

  it('the handler export is a callable binder for channel and space handlers alike', () => {
    const channel = root
      .lets('channel', 'bindRt')
      .input(z.object({ workspaceId: z.string() }))
      .connector(({ input }) => ({ userId: input.workspaceId }))
      .channel()
    const channelHandler = channel
      .lets('serverHandler', 'bindSendRt')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    expect(typeof channelHandler).toBe('function')
    expect(channelHandler.type).toBe('serverHandler')
    expect(channelHandler.id).toBe('root:serverHandler:bindSendRt')
    const bound = (channelHandler as unknown as (target: unknown) => Record<string, unknown>)({ workspaceId: 'w1' })
    expect(typeof bound.sendToServer).toBe('function')
    expect(typeof bound.useSocketMutation).toBe('function')
    expect(bound.point).toBe(channelHandler.point)
    // the compiled path (`._tail(decoy)`) hands back the SAME callable the closer returned
    expect((channelHandler as unknown as { _tail: (decoy: unknown) => unknown })._tail(() => null)).toBe(channelHandler)

    const space = channel
      .lets<{ chatId: string }>('space', 'bindSpaceRt')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    const spaceHandler = space
      .lets('serverHandler', 'bindSpaceSendRt')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    expect(typeof spaceHandler).toBe('function')
    // a space handler binds by membership input (+ optional channel input)
    const boundSpace = (
      spaceHandler as unknown as (target: unknown, channelInput?: unknown) => Record<string, unknown>
    )({ chatId: '5' }, { workspaceId: 'w1' })
    expect(typeof boundSpace.sendToServer).toBe('function')
    expect(boundSpace.point).toBe(spaceHandler.point)

    const clientHandler = channel.lets('clientHandler', 'bindReceiveRt').clientHandler()
    expect(typeof clientHandler).toBe('function')
    const boundClient = (clientHandler as unknown as (target: unknown) => Record<string, unknown>)({
      workspaceId: 'w1',
    })
    expect(typeof boundClient.useOnMessageFromServer).toBe('function')
    // on the server the imperative listener is an inert remover — nothing resolves, nothing throws
    const listener = (boundClient.onMessageFromServer as (cb: () => void) => { remove: () => void })(() => {})
    expect(typeof listener.remove).toBe('function')
    listener.remove()
  })

  // strict client-side target resolution (no live connection → throw) is covered by the engine's
  // socket-client.int.test.ts, which runs the real client runtime
  it('imperative connection-query methods on the server throw the client-side guard', () => {
    const channel = root
      .lets('channel', 'bindStrictRt')
      .input(z.object({ workspaceId: z.string() }))
      .channel()
    const handler = channel
      .lets('serverHandler', 'bindStrictQueryRt')
      .clientSend(z.object({ q: z.string() }))
      .serverReply(({ input }) => ({ info: input.q }))
      .query()
      .serverHandler()
    const bound = (handler as unknown as (target: unknown) => Record<string, unknown>)({ workspaceId: 'nope' })
    expect(() => (bound.getSocketQueryKey as (input?: unknown) => unknown)({ q: 'x' })).toThrow(/client-side/)
  })

  it('socket query flavor guards mirror the types at runtime', () => {
    const channel = root.lets('channel', 'flavorRt').channel()
    const mutationHandler = channel
      .lets('serverHandler', 'flavorMutRt')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    expect(() => (mutationHandler as unknown as { useSocketQuery: () => unknown }).useSocketQuery()).toThrow(
      /useSocketQuery\(\) needs the \.query\(\) flavor on root:serverHandler:flavorMutRt — this serverHandler is a mutation/,
    )
    // the key/cache family pairs with its flavor (getSocketQueryKey ↔ .query(), getSocketInfiniteQueryKey ↔
    // .infiniteQuery()) — a mutation handler has neither
    expect(() => (mutationHandler as unknown as { getSocketQueryKey: () => unknown }).getSocketQueryKey()).toThrow(
      /needs the \.query\(\) flavor/,
    )

    const queryHandler = channel
      .lets('serverHandler', 'flavorQueryRt')
      .serverReply(() => ({ ok: true }))
      .query()
      .serverHandler()
    expect(queryHandler.point._queryResultType).toBe('query')
    expect(() => (queryHandler as unknown as { useSocketMutation: () => unknown }).useSocketMutation()).toThrow(
      /useSocketMutation\(\) needs the \.mutation\(\) flavor .+ this serverHandler is a query/,
    )
  })

  // `.with(queryHandler)` builds a `type: 'with'` mount action whose fn reads the handler as a query. A serverHandler
  // has NO loader, so the ordinary `useQuery`/`useInfiniteQuery` a query injection would call throw "No loader found";
  // the fetch must ride the socket connection instead — the fn has to route to `useSocketQuery` /
  // `useSocketInfiniteQuery`. This locks that routing in without a live socket.
  it('.with(queryHandler) routes the injected read through the socket query hooks, not the loader hooks', () => {
    const channel = root
      .lets('channel', 'withRouteRt')
      .input(z.object({ workspaceId: z.string() }))
      .connector(({ input }) => ({ userId: input.workspaceId }))
      .channel()
    const queryHandler = channel
      .lets('serverHandler', 'withRouteQueryRt')
      .clientSend(z.object({ q: z.string() }))
      .serverReply(({ input }) => ({ info: input.q }))
      .query()
      .serverHandler()
    const infiniteHandler = channel
      .lets('serverHandler', 'withRouteInfRt')
      .clientSend(z.object({ q: z.string(), cursor: z.number().optional() }))
      .serverReply(({ input }) => ({ info: input.q }))
      .infiniteQuery({ pageParamFromInput: 'cursor', getNextPageParam: () => undefined, initialPageParam: undefined })
      .serverHandler()

    // pull the last `type: 'with'` mount action's fn off a built page (the `.with(channel)` adds a `connection` action,
    // never a `with` one, so the handler's withQueryFn is the only `with` action)
    const lastWithFn = (p: unknown): ((options: unknown) => unknown) => {
      const point = (p as { point?: { _mountActions?: unknown } }).point ?? (p as { _mountActions?: unknown })
      const actions = (point as { _mountActions: Array<{ type: string; fn?: (o: unknown) => unknown }> })._mountActions
      const withActions = actions.filter((a) => a.type === 'with')
      return withActions[withActions.length - 1]!.fn!
    }

    const queryPage = root
      .lets('page', 'withRouteQueryPage', '/with-route-query')
      .with(channel, { workspaceId: 'w' })
      .with(queryHandler, { q: 'x' })
      .page(() => null)
    const qh = queryHandler.point as unknown as {
      useSocketQuery: (i?: unknown, o?: unknown) => unknown
      useQuery: (i?: unknown, o?: unknown) => unknown
    }
    const rtQuerySpy = mock((_input?: unknown, _options?: unknown) => ({ __socket: 'query' }))
    qh.useSocketQuery = rtQuerySpy
    qh.useQuery = mock(() => {
      throw new Error('useQuery must not run on a query-flavored serverHandler — it has no loader')
    })
    const queryResult = lastWithFn(queryPage)({})
    expect(rtQuerySpy).toHaveBeenCalledTimes(1)
    expect(rtQuerySpy.mock.calls[0]![0]).toEqual({ q: 'x' })
    expect(queryResult).toEqual({ __socket: 'query' })

    const infinitePage = root
      .lets('page', 'withRouteInfPage', '/with-route-inf')
      .with(channel, { workspaceId: 'w' })
      .with(infiniteHandler, { q: 'x' })
      .page(() => null)
    const ih = infiniteHandler.point as unknown as {
      useSocketInfiniteQuery: (i?: unknown, o?: unknown) => unknown
      useInfiniteQuery: (i?: unknown, o?: unknown) => unknown
    }
    const rtInfSpy = mock((_input?: unknown, _options?: unknown) => ({ __socket: 'infinite' }))
    ih.useSocketInfiniteQuery = rtInfSpy
    ih.useInfiniteQuery = mock(() => {
      throw new Error('useInfiniteQuery must not run on an infiniteQuery-flavored serverHandler — it has no loader')
    })
    const infiniteResult = lastWithFn(infinitePage)({})
    expect(rtInfSpy).toHaveBeenCalledTimes(1)
    expect(rtInfSpy.mock.calls[0]![0]).toEqual({ q: 'x' })
    expect(infiniteResult).toEqual({ __socket: 'infinite' })
  })

  it('channel.kick without a running socket server throws "Socket server is not running"', async () => {
    const channel = root
      .lets('channel', 'noServer')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    await expect(channel.kick({ $identity: { userId: 'u1' } })).rejects.toThrow(/Socket server is not running/)
  })

  it('a $where identity matcher is rejected before the adapter is touched, even nested under $or', async () => {
    const adapter = makeAdapter({
      kick: async () => {
        throw new Error('adapter.kick must not be reached')
      },
    })
    const channel = root.lets('channel', 'whereGuard').channel()
    registerSocketServerAdapter('root', adapter)
    try {
      await expect(channel.kick({ $identity: { $or: [{ $where: 'return true' }] } as never })).rejects.toThrow(
        /\$where is not allowed/,
      )
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('a $where room matcher on a space.kick is rejected before the adapter is touched', async () => {
    const adapter = makeAdapter({
      kick: async () => {
        throw new Error('adapter.kick must not be reached')
      },
    })
    const channel = root
      .lets('channel', 'whereGuardSpaceChan')
      .connector(() => ({ userId: 'u1' }))
      .channel()
    const space = channel
      .lets<{ chatId: string }>('space', 'whereGuardSpace')
      .input(z.object({ chatId: z.string() }))
      .space()
    registerSocketServerAdapter('root', adapter)
    try {
      await expect(space.kick({ $room: { $where: 'return true' } as never })).rejects.toThrow(/\$where is not allowed/)
    } finally {
      unregisterSocketServerAdapter('root')
    }
  })

  it('admin surface type surface', () => {
    // never called — tsc checks the body

    const typesOnly = () => {
      const appChannel = root
        .lets('channel', 'chatAdminT')
        .input(z.object({ workspaceId: z.string() }))
        .connector(({ input }) => ({ userId: 'u1', workspaceId: input.workspaceId }))
        .channel()
      const chatSpace = appChannel
        .lets<{ chatId: string }>('space', 'chatAdminSpaceT')
        .input(z.object({ chatId: z.string() }))
        .joiner(({ input }) => ({ chatId: input.chatId }))
        .space()

      // CHANNEL admin: the $-dictionary — `connectionId` exact, `$identity` a sift matcher; no room part
      expectTypeOf(appChannel.kick({ $identity: { userId: { $ne: 'u1' } } })).toEqualTypeOf<Promise<void>>()
      expectTypeOf(appChannel.kick({ connectionId: 'cid1', reason: 'signed-out' })).toEqualTypeOf<Promise<void>>()
      expectTypeOf(appChannel.refresh({ $identity: { userId: 'u1' } })).toEqualTypeOf<Promise<void>>()
      // @ts-expect-error — a channel admin target has no room
      void appChannel.kick({ room: { chatId: '5' } })
      // @ts-expect-error — `identity:` is renamed `$identity` (the $-dictionary)
      void appChannel.kick({ identity: { userId: 'u1' } })

      // amendIdentity: channel-only, the patch is a partial identity
      expectTypeOf(appChannel.amendIdentity({ $identity: { userId: 'u1' } }, { workspaceId: 'w2' })).toEqualTypeOf<
        Promise<void>
      >()
      // @ts-expect-error — the patch must be a partial identity
      void appChannel.amendIdentity({ connectionId: 'cid1' }, { nope: true })
      // @ts-expect-error — amendIdentity lives on channel points only
      void chatSpace.amendIdentity({ connectionId: 'cid1' }, {})

      // `connections` is a NAMESPACE now — the old method-call form is gone
      // @ts-expect-error — connections is a namespace, not a method
      void appChannel.connections()
      expectTypeOf(appChannel.connections.server.count()).toEqualTypeOf<Promise<number>>()
      expectTypeOf(
        appChannel.connections.server.list({ $identity: { userId: 'u1' } }, { timeout: 200 }),
      ).resolves.toEqualTypeOf<Array<ChannelConnectionListed<{ userId: string; workspaceId: string }>>>()
      // a channel item is { connectionId, identity, spaces } — the per-space parsed rooms record
      expectTypeOf(appChannel.connections.server.list()).resolves.toEqualTypeOf<
        Array<{
          connectionId: string
          identity: { userId: string; workspaceId: string }
          spaces: Record<string, unknown[]>
        }>
      >()
      expectTypeOf(appChannel.connections.server.forEach({}, { onConnection: () => {} })).toEqualTypeOf<
        Promise<number>
      >()
      expectTypeOf(appChannel.connections.server.forEach()).toEqualTypeOf<
        AsyncIterable<ChannelConnectionListed<{ userId: string; workspaceId: string }>>
      >()
      // the SYNCHRONOUS local floor — plain values, no promise; same item shape, this process only
      expectTypeOf(appChannel.connections.server.local.count()).toEqualTypeOf<number>()
      expectTypeOf(appChannel.connections.server.local.list({ $identity: { userId: 'u1' } })).toEqualTypeOf<
        Array<ChannelConnectionListed<{ userId: string; workspaceId: string }>>
      >()
      // @ts-expect-error — a channel's local floor has no `rooms` (that is a membership read)
      void appChannel.connections.server.local.rooms
      // the CLIENT floor — synchronous, no targets, items are the connection FACADES this tab holds
      expectTypeOf(appChannel.connections.client.count()).toEqualTypeOf<number>()
      expectTypeOf(appChannel.connections.client.list()).toEqualTypeOf<
        Array<ClientChannelConnection<{ workspaceId: string }, ErrorPoint0>>
      >()
      // @ts-expect-error — the client floor takes no target (a bare call is this tab's whole channel)
      void appChannel.connections.client.list({ $identity: { userId: 'u1' } })
      // the flat names are GONE — every enumeration names its floor now
      // @ts-expect-error — `connections.count` moved to `connections.server.count`
      void appChannel.connections.count
      // @ts-expect-error — `connections.list` moved to `connections.server.list`
      void appChannel.connections.list
      // @ts-expect-error — `connections.forEach` moved to `connections.server.forEach`
      void appChannel.connections.forEach
      // @ts-expect-error — `connections.local` moved to `connections.server.local`
      void appChannel.connections.local
      // the crossed namespaces are closed off at the type level — the facades simply do not carry them
      // @ts-expect-error — a channel has no memberships namespace (its spaces do)
      void appChannel.memberships
      // @ts-expect-error — a space has no connections namespace (its channel does)
      void chatSpace.connections

      // SPACE admin: `room` is an exact snapshot (or array), `$room` the sift matcher — different keys, different ops
      expectTypeOf(chatSpace.kick({ room: { chatId: '5' }, $identity: { userId: '42' } })).toEqualTypeOf<
        Promise<void>
      >()
      expectTypeOf(chatSpace.kick({ room: [{ chatId: '5' }, { chatId: '7' }] })).toEqualTypeOf<Promise<void>>()
      expectTypeOf(chatSpace.kick({ $room: { chatId: '5' }, reason: 'room closed' })).toEqualTypeOf<Promise<void>>()
      // @ts-expect-error — `room` takes exact snapshots; matchers live under `$room`
      void chatSpace.kick({ room: { chatId: { $ne: '5' } } })

      // memberships namespace: items are { connectionId, identity, rooms }
      expectTypeOf(chatSpace.memberships.server.count({ room: { chatId: '5' } })).toEqualTypeOf<Promise<number>>()
      expectTypeOf(chatSpace.memberships.server.list({ room: { chatId: '5' } })).resolves.toEqualTypeOf<
        Array<SpaceMembershipListed<{ chatId: string }, { userId: string; workspaceId: string }>>
      >()
      expectTypeOf(chatSpace.memberships.server.list()).resolves.toEqualTypeOf<
        Array<{
          connectionId: string
          identity: { userId: string; workspaceId: string }
          rooms: Array<{ chatId: string }>
        }>
      >()
      expectTypeOf(chatSpace.memberships.server.forEach({}, { onMembership: () => {} })).toEqualTypeOf<
        Promise<number>
      >()
      expectTypeOf(chatSpace.memberships.server.forEach()).toEqualTypeOf<
        AsyncIterable<SpaceMembershipListed<{ chatId: string }, { userId: string; workspaceId: string }>>
      >()
      // the SYNCHRONOUS local floor — plain values; `rooms` is the flat deduped room set (typed by the joiner)
      expectTypeOf(chatSpace.memberships.server.local.count({ room: { chatId: '5' } })).toEqualTypeOf<number>()
      expectTypeOf(chatSpace.memberships.server.local.list()).toEqualTypeOf<
        Array<SpaceMembershipListed<{ chatId: string }, { userId: string; workspaceId: string }>>
      >()
      expectTypeOf(chatSpace.memberships.server.local.rooms({ connectionId: 'c1' })).toEqualTypeOf<
        Array<{ chatId: string }>
      >()
      // the CLIENT floor — this tab's membership facades (enrolled ones included), synchronous, no targets
      expectTypeOf(chatSpace.memberships.client.count()).toEqualTypeOf<number>()
      expectTypeOf(chatSpace.memberships.client.list()).toEqualTypeOf<
        Array<ClientSpaceMembership<{ chatId: string }, { chatId: string }, ErrorPoint0, { workspaceId: string }>>
      >()
      // @ts-expect-error — the client floor takes no target (a bare call is this tab's whole space)
      void chatSpace.memberships.client.list({ room: { chatId: '5' } })
      // @ts-expect-error — `memberships.count` moved to `memberships.server.count`
      void chatSpace.memberships.count
      // @ts-expect-error — `memberships.list` moved to `memberships.server.list`
      void chatSpace.memberships.list
      // @ts-expect-error — `memberships.forEach` moved to `memberships.server.forEach`
      void chatSpace.memberships.forEach
      // @ts-expect-error — `memberships.local` moved to `memberships.server.local`
      void chatSpace.memberships.local
    }
    void typesOnly
  })

  it('wave-5 explicit generics and room-slot type surface', () => {
    // never called — tsc checks the body

    const typesOnly = () => {
      // .connector<TIdentity>: the explicit generic fixes the identity — nothing is inferred from the callback
      const explicitChannel = root
        .lets('channel', 'explicitIdT')
        .connector<{ userId: string; role: 'admin' | 'member' }>(() => ({ userId: 'u1', role: 'member' }))
        .channel()
      expectTypeOf<typeof explicitChannel.Infer.Identity>().toEqualTypeOf<{
        userId: string
        role: 'admin' | 'member'
      }>()

      // the OPENER declares the room — `.lets<TRoom>('space', name)`. The joiner is CHECKED against it, never asked
      const explicitSpace = explicitChannel
        .lets<{ chatId: string; kind: 'dm' | 'group' }>('space', 'explicitRoomT')
        .input(z.object({ chatId: z.string() }))
        .joiner(({ input }) => ({ chatId: input.chatId, kind: 'dm' }))
        .space()
      expectTypeOf<typeof explicitSpace.Infer.Room>().toEqualTypeOf<{ chatId: string; kind: 'dm' | 'group' }>()
      void explicitSpace

      // the explicit per-callback generics are gone — with a declared room there is nothing left to name
      const noCallbackGenerics = explicitChannel
        .lets<{ chatId: string }>('space', 'noCallbackGenericsT')
        .input(z.object({ chatId: z.string() }))
      // @ts-expect-error — .joiner takes no type arguments any more; the room is declared at the opener
      void noCallbackGenerics.joiner<{ chatId: string }>(({ input }) => ({ chatId: input.chatId }))
      // @ts-expect-error — .enroller takes no type arguments any more either
      void noCallbackGenerics.enroller<{ chatId: string }>(() => ({ chatId: 'general' }))

      // a room that does not match the declared shape is a type error on BOTH declaring callbacks
      const mismatched = explicitChannel.lets<{ chatId: string }>('space', 'mismatchedRoomT')
      // @ts-expect-error — the declared room is { chatId: string }, not { deskId: string }
      void mismatched.joiner(() => ({ deskId: 'd1' }))
      // @ts-expect-error — same check on the enroller
      void mismatched.enroller(() => ({ deskId: 'd1' }))
      // @ts-expect-error — the declared key must keep its declared type
      void mismatched.joiner(() => ({ chatId: 5 }))

      // a room WIDER than the declared shape is a type error too — the snapshot is the room's address, so an extra key
      // is a different pub/sub topic and every `sendToClient(…, { room: { chatId } })` would miss it. Assignability
      // alone never catches this (a wider object IS a `{ chatId: string }`) and neither does the excess-property check:
      // it does not fire on a callback's return in ANY TypeScript version, so the keys are compared explicitly
      const wider = explicitChannel.lets<{ chatId: string }>('space', 'widerRoomT')
      // @ts-expect-error — `extra` was never declared on the room
      void wider.joiner(() => ({ chatId: 'c1', extra: 1 }))
      // @ts-expect-error — inside the ARRAY form as well
      void wider.joiner(() => [{ chatId: 'c1', extra: 1 }])
      // @ts-expect-error — and on the enroller
      void wider.enroller(() => ({ chatId: 'c1', extra: 1 }))
      const roomWithExtra: { chatId: string; extra: number } = { chatId: 'c1', extra: 1 }
      // @ts-expect-error — a value rather than a fresh literal: same undeclared key, same different room
      void wider.joiner(() => roomWithExtra)
      // @ts-expect-error — the realistic shape of it: a spread that drags along keys nobody declared
      void wider.joiner(() => ({ ...roomWithExtra }))

      // every legitimate return shape compiles: the exact snapshot, an array of them, a conditional deny, an empty
      // array, nothing at all, and a joiner that only ever throws
      const exact = explicitChannel.lets<{ chatId: string }>('space', 'exactRoomT').input(z.object({ c: z.string() }))
      void exact.joiner(({ input }) => ({ chatId: input.c }))
      void exact.joiner(async ({ input }) => ({ chatId: input.c }))
      void exact.joiner(({ input }) => [{ chatId: input.c }, { chatId: 'general' }])
      void exact.joiner(({ input }) => (input.c === 'general' ? { chatId: input.c } : undefined))
      void exact.joiner(() => [])
      void exact.joiner(() => {})
      void exact.joiner(() => {
        throw new Error('denied')
      })
      void exact.enroller(({ identity }) => ({ chatId: identity.userId }))

      // the enroller declares nothing either — the opener's room is what its handlers see
      const enrolledSpace = explicitChannel
        .lets<{ userId: string }>('space', 'enrolledRoomT')
        .enroller(({ identity }) => ({ userId: identity.userId }))
        .space()
      expectTypeOf<typeof enrolledSpace.Infer.Room>().toEqualTypeOf<{ userId: string }>()
      void enrolledSpace

      // a second .enroller is a type error (AssertEnrollerNotDefined)
      const enrollerStage = explicitChannel.lets<{ a: string }>('space', 'twoEnrollersT').enroller(() => ({ a: '1' }))
      // @ts-expect-error — a space takes at most one .enroller
      enrollerStage.enroller(() => ({ b: '2' }))

      // NO generic on the opener = the STRICT empty room: one global room `{}`, and anything keyed is a type error —
      // which is the nudge to declare the generic
      const globalSpace = explicitChannel
        .lets('space', 'globalRoomT')
        .joiner(() => ({}))
        .space()
      expectTypeOf<typeof globalSpace.Infer.Room>().toEqualTypeOf<EmptyObjectOnly>()
      void globalSpace
      // @ts-expect-error — the default room is the empty object; a keyed room needs the opener generic
      void explicitChannel.lets('space', 'defaultKeyedRoomT').joiner(() => ({ chatId: '5' }))

      // a joinerless (and enrollerless) space: nothing can join it from the client, and its room is whatever the
      // opener declared — the input is just the join input, it never becomes the room
      const joinerlessSpace = explicitChannel
        .lets<{ deskId: string }>('space', 'joinerlessRoomT')
        .input(z.object({ deskId: z.string() }))
        .space({
          server: {
            onBeforeJoiner: ({ input, connectionId }) => {
              expectTypeOf(input).toEqualTypeOf<{ deskId: string }>()
              // the per-callback `rooms()` is gone — the current rooms come from the local floor keyed by connectionId
              expectTypeOf(connectionId).toEqualTypeOf<string>()
            },
          },
        })
      expectTypeOf<(typeof joinerlessSpace.Infer)['SpaceInput']>().toEqualTypeOf<{ deskId: string }>()
      expectTypeOf<(typeof joinerlessSpace.Infer)['Room']>().toEqualTypeOf<{ deskId: string }>()
      // `enroll` is the third WRITE path for rooms — the same wider-room verdict as the joiner/enroller returns
      const widerDesk = { deskId: 'd1', extra: 1 }
      // @ts-expect-error — a room with keys the space never declared, even through a variable
      void joinerlessSpace.enroll({ connectionId: 'cid1' }, widerDesk)
      // @ts-expect-error — same through the array form
      void joinerlessSpace.enroll({ connectionId: 'cid1' }, [widerDesk])
      // @ts-expect-error — a mistyped key on the fresh literal
      void joinerlessSpace.enroll({ connectionId: 'cid1' }, { deskId: 'd1', nope: 1 })
      void joinerlessSpace.enroll({ connectionId: 'cid1' }, { deskId: 'd1' }) // the declared shape passes
      void joinerlessSpace.enroll({ connectionId: 'cid1' }, [{ deskId: 'd1' }, { deskId: 'd2' }])
      const joinerlessHandler = joinerlessSpace
        .lets('serverHandler', 'joinerlessHandlerT')
        .serverReply(({ room }) => {
          // the derived handler reads the opener's room, whoever fills it (here: `space.enroll()`)
          expectTypeOf(room).toEqualTypeOf<{ deskId: string }>()
          return { ok: true }
        })
        .serverHandler()
      void joinerlessHandler
      void joinerlessSpace

      // a no-input point takes `undefined` and `{}` interchangeably (both normalize to `{}` inside) — uniform across
      // connections, memberships and the query surfaces
      const bareChannel = root
        .lets('channel', 'bareInputT')
        .connector(() => ({ userId: 'u1' }))
        .channel()
      const bareSpace = bareChannel.lets('space', 'bareInputSpaceT').space()
      const bareConnectionA = bareChannel.useConnection()
      const bareConnectionB = bareChannel.useConnection(undefined)
      const bareConnectionC = bareChannel.useConnection({})
      void bareChannel.connect({})
      const bareMembershipA = bareSpace.useMembership()
      const bareMembershipB = bareSpace.useMembership(undefined)
      const bareMembershipC = bareSpace.useMembership({})
      void bareSpace.join({})
      void bareSpace.getMembership({})
      void [bareConnectionA, bareConnectionB, bareConnectionC, bareMembershipA, bareMembershipB, bareMembershipC]
      // excess properties are still rejected — `{}` opens the door, arbitrary objects stay out
      // @ts-expect-error — a no-input space takes only the empty object
      void bareSpace.useMembership({ nope: 1 })
      // @ts-expect-error — a no-input channel takes only the empty object
      void bareChannel.useConnection({ nope: 1 })
    }
    void typesOnly
  })

  it('preventTransformer: true makes the whole channel subtree SOCKET wire plain JSON, resolved at .channel()', () => {
    const superjsonish = {
      serialize: (data: unknown) => ({ json: data, marker: 'superjsonish' }),
      deserialize: (raw: unknown) => (raw as { json: unknown }).json,
    }
    const richRoot = Point0.lets('root', 'transformerRoot').transformer(superjsonish).root()
    const plainChannel = richRoot.lets('channel', 'plainChannel').channel({ preventTransformer: true })
    const plainSpace = plainChannel.lets('space', 'plainSpace').space()
    const plainHandler = plainSpace
      .lets('serverHandler', 'plainEcho')
      .serverReply(() => ({ ok: true }))
      .serverHandler()
    const richQuery = richRoot
      .lets('query', 'richQuery')
      .loader(() => ({ ok: true }))
      .query()
    // the channel and everything chained off it speak plain JSON on the SOCKET wire — what a raw external consumer reads
    expect(plainChannel.point._getSocketTransformer().stringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}')
    expect(plainSpace.point._getSocketTransformer().stringify({ room: 'general' })).toBe('{"room":"general"}')
    expect(plainHandler.point._getSocketTransformer().stringify({ text: 'hi' })).toBe('{"text":"hi"}')
    // …while `_transformer` itself stays the ROOT's — the option is a fact the socket sites honor, not an override
    expect(plainChannel.point._getTransformer().stringify({ a: 1 })).toContain('superjsonish')
    // the HTTP surface of the same root keeps the root transformer
    expect(richQuery.point._getTransformer().stringify({ a: 1 })).toContain('superjsonish')
    // a channel WITHOUT the option speaks the root transformer on the socket too
    const richChannel = richRoot.lets('channel', 'richChannel').channel()
    expect(richChannel.point._getSocketTransformer().stringify({ a: 1 })).toContain('superjsonish')
    // the scope default rides `.channelOptions()` and resolves at the closer, like every channel option
    const optedRoot = Point0.lets('root', 'optedTransformerRoot')
      .transformer(superjsonish)
      .channelOptions({ preventTransformer: true })
      .root()
    const optedChannel = optedRoot.lets('channel', 'optedChannel').channel()
    expect(optedChannel.point._getSocketTransformer().stringify({ a: 1 })).toBe('{"a":1}')
    // an explicit closer value overrides the scope default (last wins, the option merge)
    const richAgainChannel = optedRoot.lets('channel', 'richAgain').channel({ preventTransformer: false })
    expect(richAgainChannel.point._getSocketTransformer().stringify({ a: 1 })).toContain('superjsonish')
    const typesOnly = () => {
      // @ts-expect-error — `.transformer` is root-only; a channel opts out through `preventTransformer`
      void richRoot.lets('channel', 'noChainTransformer').transformer(superjsonish)
      // @ts-expect-error — `preventTransformer` is a declaration fact, not a call-site option
      void plainChannel.useConnection({}, { preventTransformer: false })
    }
    void typesOnly
  })

  it('resumable is a DECLARATION-ONLY option of all three levels — top-level, resolved chain -> closer, on both bundles', () => {
    // channel: `resumable: true` sits next to `preventTransformer` (both sides read it) and resolves like it
    const resumableChannel = root.lets('channel', 'resumableOpted').channel({ resumable: true })
    expect(resumableChannel.point._getChannelPointOptions().resumable).toBe(true)
    // unset = off, and the scope default rides `.channelOptions()` with the closer overriding (last wins)
    expect(root.lets('channel', 'resumableUnset').channel().point._getChannelPointOptions().resumable).toBeUndefined()
    const defaultedRoot = Point0.lets('root', 'resumableDefaultedRoot').channelOptions({ resumable: true }).root()
    expect(defaultedRoot.lets('channel', 'inherited').channel().point._getChannelPointOptions().resumable).toBe(true)
    expect(
      defaultedRoot.lets('channel', 'optedOut').channel({ resumable: false }).point._getChannelPointOptions().resumable,
    ).toBe(false)

    // space: `resumable: false` is the opt-out (rooms out of the passport, not restored) — top-level too
    const optedOutSpace = resumableChannel
      .lets<{ chatId: string }>('space', 'resumableOptedOutSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space({ resumable: false })
    expect(optedOutSpace.point._getSpacePointOptions().resumable).toBe(false)
    const plainSpace = resumableChannel
      .lets<{ chatId: string }>('space', 'resumablePlainSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space()
    expect(plainSpace.point._getSpacePointOptions().resumable).toBeUndefined()

    // clientHandler: `resumable` opts its pushes into the replay buffer — a number names the ceiling, true defaults it
    const buffered = plainSpace.lets('clientHandler', 'resumableBuffered').clientHandler({ resumable: 16 })
    expect(buffered.point._getClientHandlerPointOptions().resumable).toBe(16)
    const bufferedDefault = resumableChannel
      .lets('clientHandler', 'resumableBufferedDefault')
      .clientHandler({ resumable: true })
    expect(bufferedDefault.point._getClientHandlerPointOptions().resumable).toBe(true)

    const typesOnly = () => {
      // @ts-expect-error — resumable is declaration-only: not a call-site connection option
      void resumableChannel.useConnection({}, { resumable: true })
      // @ts-expect-error — top-level, never inside the `server` group
      void root.lets('channel', 'wrongGroupServer').channel({ server: { resumable: true } })
      // @ts-expect-error — top-level, never inside the `client` group
      void root.lets('channel', 'wrongGroupClient').channel({ client: { resumable: true } })
      // @ts-expect-error — a space only OPTS OUT: `resumable: true` is not a thing (the channel decides)
      void resumableChannel.lets<{ chatId: string }>('space', 'wrongTrue').space({ resumable: true })
      // @ts-expect-error — the ceiling is a number or true, never a string
      void resumableChannel.lets('clientHandler', 'wrongCeiling').clientHandler({ resumable: 'many' })
      // @ts-expect-error — resumable is declaration-only: not a join call-site option
      void plainSpace.useMembership({ chatId: '1' }, { resumable: false })
    }
    void typesOnly
  })

  it('the resume markers ride every lifecycle props object, typed: resumed + gapless booleans next to the index', () => {
    const markedChannel = root.lets('channel', 'markedChannel').channel({
      resumable: true,
      client: {
        onConnect: ({ resumed, gapless, connectionIndex }) => {
          expectTypeOf(resumed).toEqualTypeOf<boolean>()
          expectTypeOf(gapless).toEqualTypeOf<boolean>()
          expectTypeOf(connectionIndex).toEqualTypeOf<number>()
        },
        onDisconnect: ({ resumed, gapless }) => {
          expectTypeOf(resumed).toEqualTypeOf<boolean>()
          expectTypeOf(gapless).toEqualTypeOf<boolean>()
        },
        onError: ({ resumed, gapless }) => {
          expectTypeOf(resumed).toEqualTypeOf<boolean>()
          expectTypeOf(gapless).toEqualTypeOf<boolean>()
        },
      },
    })
    const markedSpace = markedChannel
      .lets<{ chatId: string }>('space', 'markedSpace')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space({
        client: {
          onEnter: ({ resumed, gapless, membershipIndex, membership }) => {
            expectTypeOf(resumed).toEqualTypeOf<boolean>()
            expectTypeOf(gapless).toEqualTypeOf<boolean>()
            expectTypeOf(membershipIndex).toEqualTypeOf<number>()
            // the membership is the CONCRETE facade, not the any-typed one — rooms/input keep their types
            expectTypeOf(membership.rooms).toEqualTypeOf<Array<{ chatId: string }>>()
            expectTypeOf(membership.input).toEqualTypeOf<{ chatId: string }>()
          },
          onLeave: ({ resumed, gapless }) => {
            expectTypeOf(resumed).toEqualTypeOf<boolean>()
            expectTypeOf(gapless).toEqualTypeOf<boolean>()
          },
        },
      })
    expect(markedSpace.point.type).toBe('space')
  })

  it('the resumable validation cascade fails the closer: a buffer needs a resumable channel, never an opted-out space', () => {
    const plainChannel = root.lets('channel', 'resumableValidationPlain').channel()
    // a buffering handler on a NON-resumable channel is a config lie — nothing could ever replay the buffer
    expect(() => plainChannel.lets('clientHandler', 'bufferedOnPlain').clientHandler({ resumable: true })).toThrow(
      'resumable: true',
    )
    const resumableChannel = root.lets('channel', 'resumableValidationOpted').channel({ resumable: true })
    const optedOutSpace = resumableChannel
      .lets<{ chatId: string }>('space', 'resumableValidationOptOut')
      .input(z.object({ chatId: z.string() }))
      .joiner(({ input }) => ({ chatId: input.chatId }))
      .space({ resumable: false })
    // a buffering handler of an opted-out space — the resume never restores those rooms, nowhere to replay to
    expect(() => optedOutSpace.lets('clientHandler', 'bufferedOnOptOut').clientHandler({ resumable: 8 })).toThrow(
      'resumable: false',
    )
    // the chain-declared default trips the same gate — the resolution is chain -> closer, not the closer alone
    const chainDefaultedChannel = root
      .lets('channel', 'resumableValidationChain')
      .clientHandlerOptions({ resumable: 4 })
      .channel()
    expect(() => chainDefaultedChannel.lets('clientHandler', 'bufferedViaChain').clientHandler()).toThrow(
      'resumable: true',
    )
    // and the legal combinations close clean
    expect(resumableChannel.lets('clientHandler', 'legalBuffered').clientHandler({ resumable: 32 }).point.type).toBe(
      'clientHandler',
    )
    expect(optedOutSpace.lets('clientHandler', 'legalPlainOnOptOut').clientHandler().point.type).toBe('clientHandler')
  })

  it("…and the space's leg of the cascade: the opt-out needs a resumable channel, and refuses an enroller", () => {
    const plainChannel = root.lets('channel', 'resumableSpaceCascadePlain').channel()
    // `resumable: false` on a NON-resumable channel is a config lie too — there is no resume to opt out of
    expect(() =>
      plainChannel
        .lets<{ chatId: string }>('space', 'optOutOnPlain')
        .input(z.object({ chatId: z.string() }))
        .joiner(({ input }) => ({ chatId: input.chatId }))
        .space({ resumable: false }),
    ).toThrow('resumable: true')
    const resumableChannel = root.lets('channel', 'resumableSpaceCascadeOpted').channel({ resumable: true })
    // `.enroller` + the opt-out is self-defeating: a resume drops the enrollments and the enroller only re-runs on a
    // FULL connect — the enrollment silently degrades to "until the first blip"
    expect(() =>
      resumableChannel
        .lets<{ userId: string }>('space', 'enrollerOnOptOut')
        .enroller(() => ({ userId: 'u-1' }))
        .space({ resumable: false }),
    ).toThrow('.enroller is not allowed')
    // the chain-declared default trips the same gates — the resolution is chain -> closer, not the closer alone
    const chainOptOutChannel = root
      .lets('channel', 'resumableSpaceCascadeChain')
      .spaceOptions({ resumable: false })
      .channel({ resumable: true })
    expect(() =>
      chainOptOutChannel
        .lets<{ userId: string }>('space', 'enrollerOnChainOptOut')
        .enroller(() => ({ userId: 'u-1' }))
        .space(),
    ).toThrow('.enroller is not allowed')
    // and the legal combinations close clean: an enroller WITHOUT the opt-out, and the opt-out WITHOUT an enroller
    expect(
      resumableChannel
        .lets<{ userId: string }>('space', 'legalEnroller')
        .enroller(() => ({ userId: 'u-1' }))
        .space().point.type,
    ).toBe('space')
    expect(
      resumableChannel
        .lets<{ chatId: string }>('space', 'legalOptOut')
        .input(z.object({ chatId: z.string() }))
        .joiner(({ input }) => ({ chatId: input.chatId }))
        .space({ resumable: false }).point.type,
    ).toBe('space')
  })

  it('upgradable is a client channel option (scope default, closer, call site); fetchOptions lives on the channel chain', () => {
    // the scope default rides `.channelOptions()` like every channel option
    const root = Point0.lets('root', 'upgradableRoot')
      .channelOptions({ client: { upgradable: true } })
      .root()
    // the ticket connect is a plain fetch — channel-level fetch options apply to it, so the chain takes them
    const optedChannel = root
      .lets('channel', 'optedUp')
      .fetchOptions({ credentials: 'include' })
      .channel({ client: { upgradable: false } })
    expect(optedChannel.point.type).toBe('channel')
    const typesOnly = () => {
      // a client option — the connection call sites override it per call, like `reconnect`
      void optedChannel.useConnection({}, { upgradable: true })
      void optedChannel.connect({}, { upgradable: true })
    }
    void typesOnly
  })
})

/**
 * A connection/membership is keyed by its serialized input — a transformer that refuses the input would merge every
 * connection of the channel under one `undefined` key, and a fresh object literal per render would stop being
 * comparable at all. The key is built BEFORE the first React hook, so calling these outside a component is safe here
 * (the same plain-JS bypass `point0-no-loader-guard` uses).
 */
describe('socket keys refuse an unserializable input', () => {
  const refusingRoot = Point0.lets('root', 'sockSerFail')
    .transformer({ serialize: () => undefined, deserialize: (data: unknown) => data })
    .root()
  // called through a non-`use` binding so the rules-of-hooks lint stays out of a deliberate bypass
  const callConnection = useSocketConnection as (...args: never[]) => unknown
  const callMembership = useSpaceMembership as (...args: never[]) => unknown

  const codeOf = (call: () => unknown): unknown => {
    try {
      call()
    } catch (error) {
      return (error as ErrorPoint0).code
    }
    return undefined
  }

  it('a channel connection key throws POINT0_SERIALIZE_FAILED instead of keying on undefined', () => {
    const chan = refusingRoot.lets('channel', 'badChan').channel()
    expect(codeOf(() => callConnection(chan.point as never, { a: 1 } as never, undefined as never))).toBe(
      POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED,
    )
  })

  it('a space membership key throws too — including the absent input coerced to {}', () => {
    const chan = refusingRoot.lets('channel', 'badChan2').channel()
    const space = chan.lets('space', 'badSpace').space()
    expect(codeOf(() => callMembership(space.point as never, undefined as never, undefined as never))).toBe(
      POINT0_ERROR_CODES_MAP.SERIALIZE_FAILED,
    )
  })
})

/**
 * `onSendError` — the point-of-call twin of `onReplyFromServer`: one of the two fires for every `sendToServer`, from
 * the send's single failure choke point (`failSend`, which also emits `pointHandlerSendClient*`). Driven with the side
 * flipped to `client` and NO connection to ride, which is the cheapest failure a send can take.
 */
describe('serverHandler onSendError', () => {
  const withClientSide = async (run: () => Promise<void>): Promise<void> => {
    const originalSide = process.env.POINT0_SIDE
    process.env.POINT0_SIDE = 'client'
    try {
      await run()
    } finally {
      if (originalSide === undefined) {
        delete process.env.POINT0_SIDE
      } else {
        process.env.POINT0_SIDE = originalSide
      }
    }
  }

  it('fires on a failed send with the raw input and the typed error — the reply callback stays silent', async () => {
    const failures: Array<{ input: unknown; error: ErrorPoint0; connection: unknown; point: unknown }> = []
    const replies: unknown[] = []
    const errorEvents: string[] = []
    const sendRoot = Point0.lets('root', 'onSendErrRoot')
      .clientOn('pointHandlerSendClientError', (event) => {
        errorEvents.push(event.name)
      })
      .root()
    const channel = sendRoot
      .lets('channel', 'onSendErrChannel')
      .connector(() => ({ me: 'u1' }))
      .channel()
    const handler = channel
      .lets('serverHandler', 'onSendErrPoke')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input }) => ({ echo: input.text }))
      .serverHandler({
        client: {
          onReplyFromServer: () => {
            replies.push('replied')
          },
          onSendError: (props) => {
            failures.push(props as never)
          },
        },
      })
    await withClientSide(async () => {
      // nothing is connected — the target resolution is the first thing that can fail, and it goes through failSend
      await expect(handler.sendToServer({ text: 'hi' })).rejects.toThrow(/No live connection/)
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
    expect(failures).toHaveLength(1)
    expect(failures[0]!.input).toEqual({ text: 'hi' })
    // the same instance the transport error event carries, and the connection is undefined — there was none to ride
    expect(failures[0]!.error.message).toMatch(/No live connection/)
    expect(failures[0]!.connection).toBeUndefined()
    expect(failures[0]!.point).toBe(handler.point as never)
    expect(errorEvents).toEqual(['pointHandlerSendClientError'])
    // the two callbacks are exclusive: a send that never got an answer is not a reply
    expect(replies).toEqual([])
  })

  it('the callbacks stack chain → closer → call site, and a throw inside one only logs', async () => {
    const order: string[] = []
    const sendRoot = Point0.lets('root', 'onSendErrThrowRoot').root()
    const channel = sendRoot
      .lets('channel', 'onSendErrThrowChannel')
      .serverHandlerOptions({
        client: {
          onSendError: () => {
            order.push('chain')
          },
        },
      })
      .channel()
    const handler = channel
      .lets('serverHandler', 'onSendErrThrowPoke')
      .serverReply(() => ({ ok: true }))
      .serverHandler({
        client: {
          onSendError: () => {
            order.push('closer')
          },
        },
      })
    const consoleError = spyOn(console, 'error').mockImplementation(() => {})
    try {
      await withClientSide(async () => {
        await expect(
          handler.sendToServer(undefined, {
            onSendError: () => {
              order.push('call-site')
              throw new Error('callback boom')
            },
          }),
        ).rejects.toThrow(/No live connection/)
        await new Promise((resolve) => setTimeout(resolve, 10))
      })
      // every level runs, in order; the throw reaches nothing but the log — the send still rejects with its own error
      expect(order).toEqual(['chain', 'closer', 'call-site'])
      expect(consoleError.mock.calls.some((call) => String(call[0]).includes('onSendError callback threw'))).toBe(true)
    } finally {
      consoleError.mockRestore()
    }
  })
})
