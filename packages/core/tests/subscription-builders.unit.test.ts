import { describe, expect, expectTypeOf, it } from 'bun:test'
import { z } from 'zod'
import { Point0 } from '../src/point0.js'
import { zodSchemaHelper } from '../src/schema/zod.js'
import type { SubscriptionStatus } from '../src/types.js'

const root = Point0.lets('root', 'root').root()

describe('subscription builders', () => {
  it('closes with a GET query endpoint (POST fallback included)', () => {
    const tickSubscription = root
      .lets('subscription', 'tick')
      .input(z.object({ from: z.number() }))
      .loader(async function* ({ input }) {
        yield { n: input.from }
      })
      .subscription()
    expect(tickSubscription.type).toBe('subscription')
    expect(tickSubscription.id).toBe('root:subscription:tick')
    expect(tickSubscription.point._endpoint?.method).toBe('GET')
    expect(tickSubscription.point._endpoint?.methods).toEqual(['GET', 'POST'])
    expect(tickSubscription.point._endpoint?.route.definition).toBe('/_point0/root/subscription/tick')
    expect(tickSubscription.point._queryResultType).toBe('subscription')
  })

  it('stores the closing options as the point-level defaults', () => {
    const quietSubscription = root
      .lets('subscription', 'quiet')
      .loader(async function* () {
        yield { ok: true }
      })
      .subscription({ reconnect: false })
    expect(quietSubscription.point._subscriptionOptions).toEqual({ reconnect: false })
  })

  it('an action opener with a generator loader STAYS an action — the stream is its flavor, on its own method/route', () => {
    const feedSubscription = root
      .lets('GET', '/api/feed')
      .loader(async function* () {
        yield { item: 'x' }
      })
      .subscription()
    // exactly as `.query()`/`.mutation()` closers keep an action an action — the flavor names the surface
    expect(feedSubscription.type).toBe('action')
    expect(feedSubscription.point._queryResultType).toBe('subscription')
    expect(feedSubscription.point._isHttpSubscription()).toBe(true)
    expect(feedSubscription.point._endpoint?.method).toBe('GET')
    expect(feedSubscription.point._endpoint?.methods).toEqual(['GET'])
    expect(feedSubscription.point._endpoint?.route.definition).toBe('/api/feed')
  })

  it('.subscriptionOptions() folds through a plugin into the consumer scope', () => {
    const plugin = (Point0.lets('plugin', 'subOptsPlugin') as any).subscriptionOptions({ reconnect: false }).plugin()
    const pluggedRoot = (Point0.lets('root', 'subOptsRoot') as any).use(plugin).root()
    const ticking = pluggedRoot
      .lets('subscription', 'pluggedTick')
      .loader(async function* () {
        yield { ok: true }
      })
      .subscription()
    expect(ticking.point._subscriptionOptions).toEqual({ reconnect: false })
    // the closing options merge OVER the scope defaults
    const overriding = pluggedRoot
      .lets('subscription', 'pluggedTickOverride')
      .loader(async function* () {
        yield { ok: true }
      })
      .subscription({ reconnect: { delay: 50 } })
    expect(overriding.point._subscriptionOptions).toEqual({ reconnect: { delay: 50 } })
  })

  it('a loaderless subscription close throws', () => {
    const stage = root.lets('subscription', 'empty') as any
    expect(() => stage.subscription()).toThrow(/Point has no loader/)
  })

  it('the tracked-cursor pair is stored in the point-level options', () => {
    const tracked = root
      .lets('subscription', 'trackedPair')
      .input(z.object({ channelId: z.string(), lastEventId: z.string().optional() }))
      .loader(async function* ({ input }) {
        yield { id: input.lastEventId ?? '0', text: 'x' }
      })
      .subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
    expect(tracked.point._subscriptionOptions).toEqual({
      cursorParamFromInput: 'lastEventId',
      cursorParamFromData: 'id',
    })
  })

  it('one cursor option without the other throws at the close — the pair is validated on the merged options', () => {
    let n = 0
    const make = (options: Record<string, unknown>) =>
      (root.lets('subscription', `trackedUnpaired${n++}`) as any)
        .input(z.object({ lastEventId: z.string().optional() }))
        .loader(async function* () {
          yield { id: '1' }
        })
        .subscription(options)
    expect(() => make({ cursorParamFromInput: 'lastEventId' })).toThrow(/come as a pair/)
    expect(() => make({ cursorParamFromData: 'id' })).toThrow(/come as a pair/)
    expect(() => make({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })).not.toThrow()
  })

  it('the input cursor path must start inside the input schema when the root can introspect it', () => {
    const introspectiveRoot = Point0.lets('root', 'introspectiveRoot').schemaHelper(zodSchemaHelper()).root()
    let n = 0
    const make = (cursorParamFromInput: string) =>
      (introspectiveRoot.lets('subscription', `trackedKeyed${n++}`) as any)
        .input(
          z.object({ lastEventId: z.string().optional(), nested: z.object({ since: z.date().optional() }).optional() }),
        )
        .loader(async function* () {
          yield { id: '1', meta: { at: new Date() } }
        })
        .subscription({ cursorParamFromInput, cursorParamFromData: 'id' })
    expect(() => make('nope')).toThrow(/does not exist in the input schema/)
    expect(() => make('lastEventId')).not.toThrow()
    // a deep path checks its FIRST segment — the deeper segments are the type level's job
    expect(() => make('nested.since')).not.toThrow()
    // without a schema helper the check is skipped — best-effort, like the search-key collection
    expect(() =>
      (root.lets('subscription', 'trackedUnintrospected') as any)
        .input(z.object({ lastEventId: z.string().optional() }))
        .loader(async function* () {
          yield { id: '1' }
        })
        .subscription({ cursorParamFromInput: 'nope', cursorParamFromData: 'id' }),
    ).not.toThrow()
  })

  it('an action-opened tracked subscription cursors into the ACTION input shape — params, search or body', () => {
    let n = 0
    const make = (cursorParamFromInput: string) =>
      (root.lets('GET', `/api/tracked-feed-${n++}`) as any)
        .search(z.object({ after: z.coerce.number().optional() }))
        .loader(async function* () {
          yield { seq: 1 }
        })
        .subscription({ cursorParamFromInput, cursorParamFromData: 'seq' })
    expect(() => make('after')).toThrow(/must start with params, search or body/)
    expect(() => make('search.after')).not.toThrow()
  })

  it('fetchSubscription is client-only and useSubscription guards the point kind', () => {
    const tickSubscription = root
      .lets('subscription', 'guarded')
      .loader(async function* () {
        yield { ok: true }
      })
      .subscription()
    // this test process runs server-side — the imperative consumer must refuse
    expect(() => tickSubscription.fetchSubscription()).toThrow(/client only/)
    const notSubscription = root
      .lets('query', 'plain')
      .loader(() => ({ ok: true }))
      .query() as any
    expect(() => notSubscription.useSubscription()).toThrow(/subscription points only/)
  })

  it('.subscription() is HTTP-only — sockets refuse it, every clientHandler iterates natively', () => {
    const channel = root.lets('channel', 'chatSub').channel()
    // a serverHandler never streams and never iterates — the message surface is the clientHandler's
    const plain = channel
      .lets('serverHandler', 'plainHandler')
      .serverReply(async () => ({ ok: true }))
      .serverHandler() as any
    expect(() => plain.iterateMessagesFromServer()).toThrow(/lives on clientHandler points only/)
    // a generator .serverReply is refused outright — stream through a clientHandler's pushes instead
    const generatorStage = channel.lets('serverHandler', 'genHandler') as any
    expect(() =>
      generatorStage.serverReply(async function* () {
        yield { tick: 1 }
      }),
    ).toThrow(/generator \.serverReply is not supported/)
    // .subscription() closes HTTP subscription points only — server and client handler chains alike refuse
    const serverStage = channel.lets('serverHandler', 'noFlavor').serverReply(async () => ({ ok: true })) as any
    expect(() => serverStage.subscription()).toThrow(/closes a subscription point/)
    const clientStage = channel
      .lets('clientHandler', 'noFlavorClient')
      .serverSend(z.object({ tick: z.number() })) as any
    expect(() => clientStage.subscription()).toThrow(/closes a subscription point/)
    // the iterator needs no flavor — it is every clientHandler's, and it is client-only (this process is the server)
    const ticks = channel
      .lets('clientHandler', 'ticks')
      .serverSend(z.object({ tick: z.number() }))
      .clientHandler()
    expect(ticks.point._queryResultType).toBe(undefined)
    expect(() => ticks.iterateMessagesFromServer()).toThrow(/client only/)
  })

  it('type surface', () => {
    // never called — tsc checks the body
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const typesOnly = () => {
      const progressSubscription = root
        .lets('subscription', 'progressT')
        .input(z.object({ taskId: z.string() }))
        .loader(async function* ({ input, signal }) {
          expectTypeOf(input).toEqualTypeOf<{ taskId: string }>()
          expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
          yield { percent: 0 }
          yield { percent: 100 }
        })
        .subscription()

      // the default result has no `data` — messages ride `onMessageFromServer`, nothing re-renders
      const bareResult = progressSubscription.useSubscription(
        { taskId: 't1' },
        { onMessageFromServer: (tick) => void expectTypeOf(tick).toEqualTypeOf<{ percent: number }>() },
      )
      expectTypeOf(bareResult).not.toHaveProperty('data')
      expectTypeOf(bareResult.status).toEqualTypeOf<SubscriptionStatus>()
      expectTypeOf(bareResult.isLoading).toEqualTypeOf<boolean>()
      // `lastMessageFromServerAsData: true` opts into the query-shaped result — the data type is the union of yields
      const result = progressSubscription.useSubscription({ taskId: 't1' }, { lastMessageFromServerAsData: true })
      expectTypeOf(result.data).toEqualTypeOf<{ percent: number } | undefined>()
      expectTypeOf(result.status).toEqualTypeOf<SubscriptionStatus>()
      expectTypeOf(result.isLoading).toEqualTypeOf<boolean>()
      // the point-level module listener types its message off the yields too
      const declListenerSubscription = root
        .lets('subscription', 'declListenerT')
        .loader(async function* () {
          yield { beat: 1 }
        })
        .subscription({
          onMessageFromServer: (message) => void expectTypeOf(message).toEqualTypeOf<{ beat: number }>(),
        })
      void declListenerSubscription
      expectTypeOf(progressSubscription.fetchSubscription({ taskId: 't1' })).toEqualTypeOf<
        AsyncIterable<{ percent: number }>
      >()
      // the input requiredness follows the schema
      // @ts-expect-error — the input is required
      void progressSubscription.useSubscription()

      // a generator loader locks the action family out — the stream closes with .subscription() only
      const generatorStage = root.lets('GET', '/api/feed-t').loader(async function* () {
        yield { item: 'x' }
      })
      // @ts-expect-error — a generator loader cannot close with .action()
      void generatorStage.action()
      // @ts-expect-error — a generator loader cannot close with .query()
      void generatorStage.query()
      // @ts-expect-error — a generator loader cannot close with .mutation()
      void generatorStage.mutation()

      // a subscription's .loader must be an async generator — a plain loader is rejected at the loader itself
      // @ts-expect-error — the subscription stage takes only the generator loader
      void root.lets('subscription', 'plainT').loader(() => ({ ok: true }))

      // every clientHandler iterates: the message type is the handler's serverSend input, bare and bound alike
      const chatChannel = root
        .lets('channel', 'chatSubT')
        .input(z.object({ chatId: z.string() }))
        .channel()
      const tickerHandler = chatChannel
        .lets('clientHandler', 'tickerT')
        .serverSend(z.object({ tick: z.number() }))
        .clientHandler()
      const connection = chatChannel.connect({ chatId: '5' })
      expectTypeOf(tickerHandler.iterateMessagesFromServer()).toEqualTypeOf<
        AsyncGenerator<{ tick: number }, void, undefined>
      >()
      expectTypeOf(tickerHandler(connection).iterateMessagesFromServer()).toEqualTypeOf<
        AsyncGenerator<{ tick: number }, void, undefined>
      >()
      void tickerHandler.iterateMessagesFromServer({ signal: new AbortController().signal })
      // .subscription() is an HTTP concept — a clientHandler chain refuses it at the type level (the method does
      // not exist on the handler stage surface at all)
      const noSubStage = chatChannel.lets('clientHandler', 'noSubT').serverSend(z.object({ tick: z.number() }))
      // @ts-expect-error — no .subscription() on a clientHandler chain
      void noSubStage.subscription()

      // the tracked-cursor pair: both paths type against their schemas (deep dot-paths included — the
      // pageParamFromInput rule), the data cursor must fit the input field, and the pair comes only together
      const trackedStage = () =>
        root
          .lets('subscription', 'trackedT')
          .input(
            z.object({
              channelId: z.string(),
              lastEventId: z.string().optional(),
              nested: z.object({ since: z.date().optional() }).optional(),
            }),
          )
          .loader(async function* () {
            yield { id: 'e1', text: 'hello', meta: { at: new Date() } }
          })
      void trackedStage().subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'id' })
      // deep dot-paths on both sides — a Date cursor into a Date input field
      void trackedStage().subscription({ cursorParamFromInput: 'nested.since', cursorParamFromData: 'meta.at' })
      // @ts-expect-error — the input path must exist in the input schema
      void trackedStage().subscription({ cursorParamFromInput: 'nope', cursorParamFromData: 'id' })
      // @ts-expect-error — the data path must exist in the yield union
      void trackedStage().subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'nope' })
      // @ts-expect-error — the Date at meta.at does not fit the string input field (the cross-type constraint)
      void trackedStage().subscription({ cursorParamFromInput: 'lastEventId', cursorParamFromData: 'meta.at' })
      // @ts-expect-error — cursorParamFromInput without cursorParamFromData (the pair comes only together)
      void trackedStage().subscription({ cursorParamFromInput: 'lastEventId' })
      // @ts-expect-error — cursorParamFromData without cursorParamFromInput
      void trackedStage().subscription({ cursorParamFromData: 'id' })
      // the pair is point-level only: not per call, not scope-wide — the cursor names schema fields, a point contract
      const trackedForCalls = trackedStage().subscription({
        cursorParamFromInput: 'lastEventId',
        cursorParamFromData: 'id',
      })
      // @ts-expect-error — no cursorParamFromInput at the useSubscription call site
      void trackedForCalls.useSubscription({ channelId: 'c' }, { cursorParamFromInput: 'lastEventId' })
      // @ts-expect-error — no cursor pair on the scope-wide .subscriptionOptions()
      void Point0.lets('root', 'cursorScopeRootT').subscriptionOptions({ cursorParamFromInput: 'lastEventId' })

      // lastMessageFromServerAsData is a USE-level option only — it shapes the hook's RETURNED TYPE and its
      // reactivity, which no point-level options place can carry
      void root
        .lets('subscription', 'lmPointT')
        .loader(async function* () {
          yield { a: 1 }
        })
        // @ts-expect-error — not a point-level subscription option
        .subscription({ lastMessageFromServerAsData: true })
      // @ts-expect-error — not a scope-default subscription option
      void Point0.lets('root', 'lmScopeRootT').subscriptionOptions({ lastMessageFromServerAsData: true })
      void chatChannel
        .lets('clientHandler', 'lmChT')
        .serverSend(z.object({ tick: z.number() }))
        // @ts-expect-error — not a clientHandler point option
        .clientHandler({ lastMessageFromServerAsData: true })

      // a generator .serverReply is a type error — a reply answers one send
      const genStage = chatChannel.lets('serverHandler', 'genT').clientSend(z.object({ speed: z.number() }))
      // @ts-expect-error — a generator .serverReply is not supported
      void genStage.serverReply(async function* () {
        yield { tick: 0 }
      })
      // .subscription() is gone from the serverHandler chain
      const promiseStage = chatChannel.lets('serverHandler', 'promiseT').serverReply(async () => ({ ok: true }))
      // @ts-expect-error — a serverHandler chain has no .subscription()
      void promiseStage.subscription()
      // a serverHandler's sendToServer is always a Promise — never a stream
      const plainSend = promiseStage.serverHandler()
      expectTypeOf(plainSend.sendToServer()).toEqualTypeOf<Promise<{ ok: boolean }>>()
      // @ts-expect-error — the message iterator is the clientHandler's, a serverHandler has none
      void plainSend.iterateMessagesFromServer

      const plainHandlerStage = chatChannel
        .lets('clientHandler', 'plainHandlerT')
        .serverSend(z.object({ text: z.string() }))
      const plainHandler = plainHandlerStage.clientHandler()

      // useOnMessageFromServer: void by default; `data` (the latest message) with lastMessageFromServerAsData
      expectTypeOf(plainHandler.useOnMessageFromServer(({ message }) => void message)).toEqualTypeOf<void>()
      const latest = plainHandler.useOnMessageFromServer(() => {}, { lastMessageFromServerAsData: true })
      expectTypeOf(latest.data).toEqualTypeOf<{ text: string } | undefined>()
      expectTypeOf(
        plainHandler(connection).useOnMessageFromServer(() => {}, { lastMessageFromServerAsData: true }).data,
      ).toEqualTypeOf<{ text: string } | undefined>()
      expectTypeOf(plainHandler(connection).useOnMessageFromServer(() => {})).toEqualTypeOf<void>()
    }
  })
})
