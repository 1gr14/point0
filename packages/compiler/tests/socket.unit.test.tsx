import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Compiler } from '../src/compiler.js'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/socket')

const prepareRandomFile = () => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), {
    path,
    basename,
    importpath,
    write: async (content: string | (() => void)) => await Bun.write(path, await toText(content)),
  })
}

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>
type HelperCallback = ({ files, walker }: { files: TestFile[]; walker: Walker }) => void | Promise<void>
type HelperOptions = { preserve?: boolean; ssr?: boolean }
function helper(callback: HelperCallback): ItFn
function helper(options: HelperOptions, callback: HelperCallback): ItFn
function helper(...args: [HelperCallback] | [HelperOptions, HelperCallback]): ItFn {
  return async () => {
    const [options, callback] = args.length === 1 ? [{}, args[0]] : args
    const { preserve = false, ssr = false } = options
    const walker = new Walker({ routes: undefined, ssrEnabled: ssr })
    const files = Array.from({ length: 3 }, prepareRandomFile)
    try {
      await callback({
        files,
        walker,
      })
    } finally {
      await Promise.allSettled(
        files.map(async (file) => {
          if (!preserve) await file.delete()
        }),
      )
    }
  }
}

// one realistic file carrying all three point kinds — the channel and both handlers grown from it
const socketFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
import { serverSecret } from './server-secret.js'
import { clientNotify } from './client-notify.js'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ chatId: z.string() }))
  .connector(async ({ input }) => ({ room: { chatId: input.chatId, secret: serverSecret }, ctx: { me: 'me' } }))
  .channel()
export const messageSendHandler = chatChannel.lets('serverHandler', 'messageSendHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => ({ ok: serverSecret, text: input.text }))
  .serverHandler()
export const pingHandler = chatChannel.lets('clientHandler', 'pingHandler')
  .serverSend(z.object({ ask: z.string() }))
  .clientReply(({ message }) => ({ answer: clientNotify(message.ask) }), z.object({ answer: z.string() }))
  .clientHandler()
`

// a space with an `.enroller` next to its `.joiner` — the enrollment callback runs server-side at connection setup,
// so its args (and the import only it uses) are server code, stripped from the client bundle exactly like `.joiner`
const socketEnrollerFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
import { personalRoom } from './personal-room.js'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const inboxSpace = chatChannel.lets<{ userId: string }>('space', 'inboxSpace')
  .input(z.object({ userId: z.string() }))
  .enroller(({ identity, connectionId }) => personalRoom(identity, connectionId))
  .joiner(async ({ input }) => ({ userId: input.userId }))
  .space()
`

// a space grown from the channel (its `.joiner` runs the join, server-only like the channel's `.connector`) and a
// handler grown FROM the space — its callbacks get the room, so the handler tracks the space up its parent chain
const socketSpaceFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
import { serverSecret } from './server-secret.js'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const chatSpace = chatChannel.lets<{ chatId: string; seenBy: unknown; secret: unknown }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input, identity }) => ({ chatId: input.chatId, seenBy: identity, secret: serverSecret }))
  .space()
export const roomMessageHandler = chatSpace.lets('serverHandler', 'roomMessageHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input, room }) => ({ ok: serverSecret, text: input.text, room }))
  .serverHandler()
`

describe('CompilerPoint socket', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe.concurrent('#parse', () => {
    it.concurrent(
      'channel point gets a POST connect endpoint',
      helper(async ({ files: [file], walker }) => {
        await file.write(socketFileContent)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[1].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'channel',
          name: 'chatChannel',
          scope: 'root',
          scopes: ['root'],
          exportName: 'chatChannel',
          endpoint: {
            // GET is the nominal method — the real connect is GET-first (`?input=`, the GET+Upgrade cold start),
            // POST is the binary/over-long fallback (mirrors core)
            method: 'GET',
            route: '/_point0/root/channel/chat-channel',
            methods: ['GET', 'POST'],
          },
        })
      }),
    )

    it.concurrent(
      'loaderless channel still gets its connect endpoint',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const ideasChannel = root.lets('channel', 'ideasChannel').channel()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[1].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'channel',
          endpoint: {
            method: 'GET',
            route: '/_point0/root/channel/ideas-channel',
            methods: ['GET', 'POST'],
          },
        })
      }),
    )

    it.concurrent(
      'handlers grown from a channel variable track it as a parent and get no endpoint',
      helper(async ({ files: [file], walker }) => {
        await file.write(socketFileContent)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const serverHandler = result.points[2].parse()
        expect(serverHandler.simplify()).toMatchObject({
          valid: true,
          type: 'serverHandler',
          name: 'messageSendHandler',
          scope: 'root',
          endpoint: undefined,
          parents: [
            { name: 'chatChannel', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
        const clientHandler = result.points[3].parse()
        expect(clientHandler.simplify()).toMatchObject({
          valid: true,
          type: 'clientHandler',
          name: 'pingHandler',
          scope: 'root',
          endpoint: undefined,
          parents: [
            { name: 'chatChannel', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
      }),
    )

    it.concurrent(
      'handlers resolve the channel across files',
      helper(async ({ files: [channelFile, handlerFile], walker }) => {
        await channelFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
        `)
        await handlerFile.write(`import { chatChannel } from '${channelFile.importpath}'
export const typingHandler = chatChannel.lets('clientHandler', 'typingHandler').clientHandler()
        `)
        const result = walker.collectPointsFromFile({ file: handlerFile.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[0].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'clientHandler',
          name: 'typingHandler',
          scope: 'root',
          parents: [
            { name: 'chatChannel', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
      }),
    )

    it.concurrent(
      'lets sugar infers the name from the variable',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const notificationsChannel = root.lets.channel().channel()
export const notifyHandler = notificationsChannel.lets.clientHandler().clientHandler()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        // the type suffix is stripped from the variable name, like everywhere: notificationsChannel -> notifications
        const channel = result.points[1].parse()
        expect(channel.simplify()).toMatchObject({
          valid: true,
          type: 'channel',
          name: 'notifications',
          exportName: 'notificationsChannel',
        })
        const handler = result.points[2].parse()
        expect(handler.simplify()).toMatchObject({
          valid: true,
          type: 'clientHandler',
          name: 'notify',
          exportName: 'notifyHandler',
          parents: [
            { name: 'notifications', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
      }),
    )

    it.concurrent(
      'a space grows from a channel: type space, no endpoint, tracks the channel as a parent',
      helper(async ({ files: [file], walker }) => {
        await file.write(socketSpaceFileContent)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        // a space is endpoint-less like a handler — join/leave ride the socket, there is no HTTP route to connect
        const space = result.points[2].parse()
        expect(space.simplify()).toMatchObject({
          valid: true,
          type: 'space',
          name: 'chatSpace',
          scope: 'root',
          scopes: ['root'],
          exportName: 'chatSpace',
          endpoint: undefined,
          parents: [
            { name: 'chatChannel', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
        // a handler grown from the space tracks BOTH the space and the channel up its chain, and still gets no endpoint
        const handler = result.points[3].parse()
        expect(handler.simplify()).toMatchObject({
          valid: true,
          type: 'serverHandler',
          name: 'roomMessageHandler',
          scope: 'root',
          endpoint: undefined,
          parents: [
            { name: 'chatSpace', file: expect.any(String) },
            { name: 'chatChannel', file: expect.any(String) },
            { name: 'root', file: expect.any(String) },
          ],
        })
      }),
    )

    it.concurrent(
      'lets sugar strips the Space suffix from the variable name, like every other point type',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const notificationsChannel = root.lets.channel().channel()
export const alertsSpace = notificationsChannel.lets.space<{ alertId: string }>().space()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const space = result.points[2].parse()
        expect(space.simplify()).toMatchObject({
          valid: true,
          type: 'space',
          name: 'alerts',
          exportName: 'alertsSpace',
        })
      }),
    )
  })

  describe.concurrent('#shakeMethods', () => {
    describe.concurrent('client', () => {
      it.concurrent(
        'strips channel .input and .loader, handler .clientSend and .serverReply, and the .clientReply schema',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            import { clientNotify } from './client-notify.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root
              .lets('channel', 'chatChannel')
              .input()
              .connector()
              .channel()
            export const messageSendHandler = chatChannel
              .lets('serverHandler', 'messageSendHandler')
              .clientSend()
              .serverReply()
              .serverHandler()
            export const pingHandler = chatChannel
              .lets('clientHandler', 'pingHandler')
              .serverSend(
                z.object({
                  ask: z.string(),
                }),
              )
              .clientReply(({ message }) => ({
                answer: clientNotify(message.ask),
              }))
              .clientHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'strips the space .input and .joiner args, keeping the .space() closer — the join callback is server-only',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketSpaceFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const chatSpace = chatChannel
              .lets<{
                chatId: string
                seenBy: unknown
                secret: unknown
              }>('space', 'chatSpace')
              .input()
              .joiner()
              .space()
            export const roomMessageHandler = chatSpace
              .lets('serverHandler', 'roomMessageHandler')
              .clientSend()
              .serverReply()
              .serverHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'strips the .enroller args like .joiner — enrollment runs on the server, the client learns the rooms from the connect frame',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketEnrollerFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { personalRoom } from './personal-room.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const inboxSpace = chatChannel
              .lets<{
                userId: string
              }>('space', 'inboxSpace')
              .input()
              .enroller()
              .joiner()
              .space()
            "
          `)
        }),
      )

      it.concurrent(
        'client bundle prunes an import used only by the stripped .enroller; the server bundle keeps it',
        helper(async ({ files: [file] }) => {
          await file.write(socketEnrollerFileContent)
          const client = Compiler.create({ side: 'client', scope: 'root' }).compile({ file: file.path })
          expect(client.errors).toHaveLength(0)
          expect(client.code).not.toContain(`from './personal-room.js'`)
          expect(client.code).toContain('.enroller()')

          const server = Compiler.create({ side: 'server', scope: 'root' }).compile({ file: file.path })
          expect(server.errors).toHaveLength(0)
          expect(server.code).toContain(`from './personal-room.js'`)
          expect(server.code).toContain('personalRoom(identity, connectionId)')
        }),
      )
    })

    describe.concurrent('server', () => {
      it.concurrent(
        'replaces the .clientReply callback with () => {} keeping the schema, and blanks .serverSend',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            import { clientNotify } from './client-notify.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root
              .lets('channel', 'chatChannel')
              .input(
                z.object({
                  chatId: z.string(),
                }),
              )
              .connector(async ({ input }) => ({
                room: {
                  chatId: input.chatId,
                  secret: serverSecret,
                },
                ctx: {
                  me: 'me',
                },
              }))
              .channel()
            export const messageSendHandler = chatChannel
              .lets('serverHandler', 'messageSendHandler')
              .clientSend(
                z.object({
                  text: z.string(),
                }),
              )
              .serverReply(async ({ input }) => ({
                ok: serverSecret,
                text: input.text,
              }))
              .serverHandler()
            export const pingHandler = chatChannel
              .lets('clientHandler', 'pingHandler')
              .serverSend()
              .clientReply(
                () => {},
                z.object({
                  answer: z.string(),
                }),
              )
              .clientHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'keeps a schemaless .clientReply callback replaced and nothing else',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const pingHandler = chatChannel.lets('clientHandler', 'pingHandler')
  .clientReply(({ message }) => ({ pong: true }))
  .clientHandler()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const pingHandler = chatChannel
              .lets('clientHandler', 'pingHandler')
              .clientReply(() => {})
              .clientHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'keeps the space .input and .joiner on the server — the join callback runs there',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketSpaceFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const chatSpace = chatChannel
              .lets<{
                chatId: string
                seenBy: unknown
                secret: unknown
              }>('space', 'chatSpace')
              .input(
                z.object({
                  chatId: z.string(),
                }),
              )
              .joiner(async ({ input, identity }) => ({
                chatId: input.chatId,
                seenBy: identity,
                secret: serverSecret,
              }))
              .space()
            export const roomMessageHandler = chatSpace
              .lets('serverHandler', 'roomMessageHandler')
              .clientSend(
                z.object({
                  text: z.string(),
                }),
              )
              .serverReply(async ({ input, room }) => ({
                ok: serverSecret,
                text: input.text,
                room,
              }))
              .serverHandler()
            "
          `)
        }),
      )
    })

    describe.concurrent('options split', () => {
      // The four socket families group their point options by side, so the split is STRUCTURAL: the client bundle
      // loses the whole `server` property, the server bundle the whole `client` one. Options both sides read
      // (`preventTransformer`) sit top-level next to the groups and survive on both.
      const optionsFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
import { onOpen } from './on-open.js'
export const root = Point0.lets('root', 'root')
  .channelOptions({ server: { maxConnections: 10 }, client: { linger: 500, onConnect: () => {} } })
  .root()
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ chatId: z.string() }))
  .channel({
    server: { maxMessageSize: 2048, maxConnections: 5, connectionTtl: 1000 },
    client: { linger: 700, onConnect: () => onOpen() },
    preventTransformer: true,
  })
`

      it.concurrent(
        'client bundle drops the whole server group from .channel and .channelOptions, keeps client and the top level',
        helper(async ({ files: [file], walker }) => {
          await file.write(optionsFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          const code = await result.points[0].file.toCompressedPrettyCode()
          expect(code).not.toContain('server:')
          expect(code).not.toContain('maxMessageSize')
          expect(code).not.toContain('maxConnections')
          expect(code).not.toContain('connectionTtl')
          expect(code).toContain('linger: 500')
          expect(code).toContain('linger: 700')
          expect(code).toContain('onConnect')
          // a both-sides option is top-level, not in a group — it survives the cut
          expect(code).toContain('preventTransformer: true')
        }),
      )

      it.concurrent(
        'server bundle drops the whole client group from .channel and .channelOptions, keeps server and the top level',
        helper(async ({ files: [file], walker }) => {
          await file.write(optionsFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          const code = await result.points[0].file.toCompressedPrettyCode()
          expect(code).not.toContain('client:')
          expect(code).not.toContain('onConnect')
          expect(code).not.toContain('linger')
          expect(code).toContain('maxConnections: 10')
          expect(code).toContain('maxMessageSize: 2048')
          expect(code).toContain('maxConnections: 5')
          expect(code).toContain('connectionTtl: 1000')
          expect(code).toContain('preventTransformer: true')
        }),
      )

      it.concurrent(
        'server bundle prunes an import used only by a stripped onConnect; the client bundle keeps it',
        helper(async ({ files: [file] }) => {
          await file.write(optionsFileContent)
          const server = Compiler.create({ side: 'server', scope: 'root' }).compile({ file: file.path })
          expect(server.errors).toHaveLength(0)
          expect(server.code).not.toContain(`from './on-open.js'`)
          expect(server.code).toContain('maxMessageSize')

          const client = Compiler.create({ side: 'client', scope: 'root' }).compile({ file: file.path })
          expect(client.errors).toHaveLength(0)
          expect(client.code).toContain(`from './on-open.js'`)
          expect(client.code).not.toContain('maxMessageSize')
        }),
      )

      it.concurrent(
        'handler options split by group — the two timeouts follow their own side',
        helper(async ({ files: [file], walker }) => {
          const handlerOptionsFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
export const root = Point0.lets('root', 'root')
  .serverHandlerOptions({ client: { timeout: 9000, onReplyFromServer: () => {} }, server: { onBeforeServerReply: () => {} } })
  .clientHandlerOptions({ server: { timeout: 8000 }, client: { onMessageFromServer: () => {} } })
  .root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const sendHandler = chatChannel.lets('serverHandler', 'sendHandler')
  .serverReply(async () => ({ ok: true }))
  .serverHandler({ client: { timeout: 7000, queue: false, onReplyFromServer: () => {} }, server: { onAfterServerReply: () => {} } })
export const pushHandler = chatChannel.lets('clientHandler', 'pushHandler')
  .clientHandler({ server: { timeout: 6000 }, client: { onMessageFromServer: () => {} } })
`
          for (const side of ['client', 'server'] as const) {
            await file.write(handlerOptionsFileContent)
            const result = walker.collectPointsFromFile({ file: file.path })
            for (const point of result.points) {
              point.shakeMethods({ side, scope: 'root' })
            }
            const code = await result.points[0].file.toCompressedPrettyCode()
            if (side === 'server') {
              expect(code).not.toContain('onReplyFromServer')
              expect(code).not.toContain('onMessageFromServer')
              expect(code).not.toContain('queue: false')
              // the serverHandler send windows are CLIENT options — gone with their group
              expect(code).not.toContain('timeout: 9000')
              expect(code).not.toContain('timeout: 7000')
              // the clientHandler reply-collection windows are SERVER options — kept
              expect(code).toContain('timeout: 8000')
              expect(code).toContain('timeout: 6000')
              expect(code).toContain('onBeforeServerReply')
              expect(code).toContain('onAfterServerReply')
            } else {
              expect(code).toContain('onReplyFromServer')
              expect(code).toContain('onMessageFromServer')
              expect(code).toContain('queue: false')
              expect(code).toContain('timeout: 9000')
              expect(code).toContain('timeout: 7000')
              expect(code).not.toContain('timeout: 8000')
              expect(code).not.toContain('timeout: 6000')
              expect(code).not.toContain('onBeforeServerReply')
              expect(code).not.toContain('onAfterServerReply')
            }
          }
        }),
      )

      it.concurrent(
        'resumable is top-level at every level (channel, space, clientHandler) — both bundles keep it, like preventTransformer',
        helper(async ({ files: [file], walker }) => {
          // the resume contract is declaration-only: the client keeps the key and offers the resume, the server
          // verifies and restores — a bundle missing the option would silently break its half
          const resumableFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ chatId: z.string() }))
  .channel({ resumable: true, server: { maxMessageSize: 2048 }, client: { linger: 700 } })
export const liveSpace = chatChannel.lets('space', 'liveSpace')
  .input(z.object({ id: z.string() }))
  .joiner(async ({ input }) => ({ id: input.id }))
  .space({ resumable: false, server: { maxRooms: 4 }, client: { linger: 300 } })
export const feedHandler = chatChannel.lets('clientHandler', 'feedHandler')
  .clientHandler({ resumable: 128, server: { timeout: 6000 }, client: { onMessageFromServer: () => {} } })
`
          for (const side of ['client', 'server'] as const) {
            await file.write(resumableFileContent)
            const result = walker.collectPointsFromFile({ file: file.path })
            for (const point of result.points) {
              point.shakeMethods({ side, scope: 'root' })
            }
            const code = await result.points[0].file.toCompressedPrettyCode()
            expect(code).toContain('resumable: true')
            expect(code).toContain('resumable: false')
            expect(code).toContain('resumable: 128')
            // …while the groups still fall on their own side
            if (side === 'server') {
              expect(code).not.toContain('linger')
              expect(code).toContain('maxRooms: 4')
            } else {
              expect(code).toContain('linger: 700')
              expect(code).not.toContain('maxRooms')
            }
          }
        }),
      )

      it.concurrent(
        'space options split by group: the client drops the join guards and the cap, the server the membership lifecycle',
        helper(async ({ files: [file], walker }) => {
          const spaceOptionsFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
export const root = Point0.lets('root', 'root')
  .spaceOptions({ server: { onBeforeJoiner: () => {}, onAfterJoiner: () => {} }, client: { onEnter: () => {} } })
  .root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const chatSpace = chatChannel.lets('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => ({ chatId: input.chatId }))
  .space({
    server: {
      maxRooms: 4,
      onBeforeJoiner: ({ connectionId }) => { if (chatSpace.memberships.server.local.rooms({ connectionId }).length > 3) throw new Error('cap') },
      onAfterJoiner: ({ error }) => { if (error) console.error(error) },
    },
    client: { linger: 2000, onEnter: () => {}, onLeave: () => {} },
  })
`
          for (const side of ['client', 'server'] as const) {
            await file.write(spaceOptionsFileContent)
            const result = walker.collectPointsFromFile({ file: file.path })
            for (const point of result.points) {
              point.shakeMethods({ side, scope: 'root' })
            }
            const code = await result.points[0].file.toCompressedPrettyCode()
            if (side === 'server') {
              expect(code).toContain('onBeforeJoiner')
              expect(code).toContain('onAfterJoiner')
              expect(code).toContain('maxRooms: 4')
              expect(code).not.toContain('linger: 2000')
              expect(code).not.toContain('onEnter')
              expect(code).not.toContain('onLeave')
            } else {
              expect(code).not.toContain('onBeforeJoiner')
              expect(code).not.toContain('onAfterJoiner')
              expect(code).not.toContain('maxRooms')
              expect(code).toContain('linger: 2000')
              expect(code).toContain('onEnter')
              expect(code).toContain('onLeave')
            }
          }
        }),
      )

      it.concurrent(
        'client bundle prunes an import used only by the stripped join guards; the server bundle keeps it',
        helper(async ({ files: [file] }) => {
          const guardImportFileContent = `import {Point0} from '@point0/core'
import { auditJoin } from './audit-join.js'
export const root = Point0.lets('root', 'root')
  .spaceOptions({ server: { onAfterJoiner: () => auditJoin() } })
  .root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const chatSpace = chatChannel.lets('space', 'chatSpace')
  .space({ server: { onBeforeJoiner: () => auditJoin() } })
`
          await file.write(guardImportFileContent)
          const client = Compiler.create({ side: 'client', scope: 'root' }).compile({ file: file.path })
          expect(client.errors).toHaveLength(0)
          expect(client.code).not.toContain(`from './audit-join.js'`)
          expect(client.code).not.toContain('onBeforeJoiner')
          expect(client.code).not.toContain('onAfterJoiner')

          const server = Compiler.create({ side: 'server', scope: 'root' }).compile({ file: file.path })
          expect(server.errors).toHaveLength(0)
          expect(server.code).toContain(`from './audit-join.js'`)
          expect(server.code).toContain('onBeforeJoiner')
          expect(server.code).toContain('onAfterJoiner')
        }),
      )

      it.concurrent(
        'a GROUP value may be any expression — the whole property is dropped, the variable goes with it',
        helper(async ({ files: [file] }) => {
          const groupVarFileContent = `import {Point0} from '@point0/core'
import { caps } from './caps.js'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel({ server: caps, client: { linger: 700 } })
`
          await file.write(groupVarFileContent)
          const client = Compiler.create({ side: 'client', scope: 'root' }).compile({ file: file.path })
          expect(client.errors).toHaveLength(0)
          expect(client.code).not.toContain('server:')
          expect(client.code).not.toContain(`from './caps.js'`)
          expect(client.code).toContain('linger: 700')

          const server = Compiler.create({ side: 'server', scope: 'root' }).compile({ file: file.path })
          expect(server.errors).toHaveLength(0)
          expect(server.code).toContain(`from './caps.js'`)
          expect(server.code).toContain('server: caps')
          expect(server.code).not.toContain('linger')
        }),
      )
    })

    describe.concurrent('options literal enforcement', () => {
      const collectErrors = (points: Array<{ errors: unknown[] }>): string[] =>
        points.flatMap((point) => point.errors.map((error) => (error instanceof Error ? error.message : String(error))))

      it.concurrent(
        'a non-literal options argument (a variable) is a compile error naming the method',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
const chOpts = { server: { maxMessageSize: 4096 } }
export const varChannel = root.lets('channel', 'varChannel').channel(chOpts)
`)
          const result = walker.collectPointsFromFile({ file: file.path })
          const messages = collectErrors(result.points)
          expect(messages).toHaveLength(1)
          expect(messages[0]).toContain('.channel() options must be written as an object literal')
          expect(messages[0]).toContain('a variable (`chOpts`)')
          expect(result.points.find((point) => point.name === 'varChannel')?.valid).toBe(false)
        }),
      )

      it.concurrent(
        'a top-level spread in the options literal is a compile error naming the method',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
const base = { client: { linger: 700 } }
export const root = Point0.lets('root', 'root').spaceOptions({ ...base, server: { maxRooms: 4 } }).root()
`)
          const result = walker.collectPointsFromFile({ file: file.path })
          const messages = collectErrors(result.points)
          expect(messages).toHaveLength(1)
          expect(messages[0]).toContain('.spaceOptions() options must be an object literal WITHOUT a top-level spread')
        }),
      )

      it.concurrent(
        'a function call as the options argument is a compile error naming the method',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
import { makeOptions } from './make-options.js'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel').channel()
export const pushHandler = chatChannel.lets('clientHandler', 'pushHandler').clientHandler(makeOptions())
`)
          const result = walker.collectPointsFromFile({ file: file.path })
          const messages = collectErrors(result.points)
          expect(messages).toHaveLength(1)
          expect(messages[0]).toContain('.clientHandler() options must be written as an object literal')
          expect(messages[0]).toContain('a function call')
        }),
      )

      it.concurrent(
        'a spread INSIDE a group is fine — the group is dropped or kept whole',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
const caps = { maxRooms: 4 }
export const root = Point0.lets('root', 'root').spaceOptions({ server: { ...caps }, client: { linger: 700 } }).root()
`)
          const result = walker.collectPointsFromFile({ file: file.path })
          expect(collectErrors(result.points)).toHaveLength(0)
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          const code = await result.points[0].file.toCompressedPrettyCode()
          expect(code).not.toContain('server:')
          expect(code).toContain('linger: 700')
        }),
      )

      it.concurrent(
        'an absent options argument is fine',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          expect(collectErrors(result.points)).toHaveLength(0)
        }),
      )
    })

    describe.concurrent('another scope', () => {
      it.concurrent(
        'strips both sides of every socket method',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'anotherscope' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            import { clientNotify } from './client-notify.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root
              .lets('channel', 'chatChannel')
              .input()
              .connector()
              .channel()
            export const messageSendHandler = chatChannel
              .lets('serverHandler', 'messageSendHandler')
              .clientSend()
              .serverReply()
              .serverHandler()
            export const pingHandler = chatChannel
              .lets('clientHandler', 'pingHandler')
              .serverSend()
              .clientReply()
              .clientHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'blanks the space .input and .joiner, and its handler methods, for another scope',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketSpaceFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'anotherscope' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const chatSpace = chatChannel
              .lets<{
                chatId: string
                seenBy: unknown
                secret: unknown
              }>('space', 'chatSpace')
              .input()
              .joiner()
              .space()
            export const roomMessageHandler = chatSpace
              .lets('serverHandler', 'roomMessageHandler')
              .clientSend()
              .serverReply()
              .serverHandler()
            "
          `)
        }),
      )

      it.concurrent(
        'blanks the .enroller args for another scope, like .joiner',
        helper(async ({ files: [file], walker }) => {
          await file.write(socketEnrollerFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'anotherscope' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { personalRoom } from './personal-room.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const inboxSpace = chatChannel
              .lets<{
                userId: string
              }>('space', 'inboxSpace')
              .input()
              .enroller()
              .joiner()
              .space()
            "
          `)
        }),
      )

      it.concurrent(
        'blanks the sided options entirely for another scope — BOTH groups and their imports go',
        helper(async ({ files: [file], walker }) => {
          await file.write(`
            import { Point0 } from '@point0/core'
            import { serverGuard } from './server-guard.js'
            import { clientToast } from './client-toast.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const chatSpace = chatChannel
              .lets<{ chatId: string }>('space', 'chatSpace')
              .joiner(() => ({ chatId: '1' }))
              .space({
                server: { onBeforeJoiner: () => serverGuard() },
                client: { onEnter: () => clientToast() },
              })
          `)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'anotherscope' })
          }
          // the imports stay as unreferenced bindings (the another-scope shake blanks args only — same as the
          // serverSecret import in the sibling snapshots); the CODE that used them is gone
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { serverGuard } from './server-guard.js'
            import { clientToast } from './client-toast.js'
            export const root = Point0.lets('root', 'root').root()
            export const chatChannel = root.lets('channel', 'chatChannel').channel()
            export const chatSpace = chatChannel
              .lets<{
                chatId: string
              }>('space', 'chatSpace')
              .joiner()
              .space()
            "
          `)
        }),
      )
    })
  })

  describe.concurrent('#compiled facade', () => {
    it.concurrent(
      'the COMPILED cross-file facade is LIVE: the admin set is bound and space.enroll() actually executes',
      helper(async ({ files: [pointsFile, compiledFile, consumerFile], walker }) => {
        // A channel + a space DEFINED in one file and IMPORTED from another. The compiled export of a non-mountable
        // point is the `._tail` decoy decorated by `_assignNicePointMethodsToComponent` — a method missing from that
        // bind map is invisible to every same-file test (the raw point still has it) and surfaces only here, where
        // the consumer holds nothing but the facade.
        await pointsFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const chatChannel = root.lets('channel', 'chatChannel')
  .connector(() => ({ userId: 'u1' }))
  .channel()
export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .joiner(() => ({ chatId: 'c1' }))
  .space()
`)
        const result = walker.collectPointsFromFile({ file: pointsFile.path })
        expect(result.errors).toHaveLength(0)
        // the dev-server shape of the transform, the same two per-point calls `Compiler.compile` makes: the side
        // shake plus `addHmrFix()` — the `._tail(function X() { return null })` decoy is what turns a non-mountable
        // export into the method facade at runtime
        for (const point of result.points) {
          point.shakeMethods({ side: 'server', scope: 'root' })
          point.addHmrFix()
        }
        await compiledFile.write(await result.points[0].file.toCompressedPrettyCode())
        const compiledCode = await compiledFile.text()
        expect(compiledCode).toContain('._tail(')
        // the consumer is a SECOND module — it sees only what the compiled file exports
        await consumerFile.write(`import { chatChannel, chatSpace } from '${compiledFile.importpath}'
export { chatChannel, chatSpace }
export const callEnroll = async (): Promise<void> => {
  await chatSpace.enroll({ connectionId: 'c-1' }, { chatId: 'c1' })
}
`)
        const consumer = (await import(consumerFile.path)) as {
          chatChannel: Record<string, unknown>
          chatSpace: Record<string, unknown>
          callEnroll: () => Promise<void>
        }
        // the whole admin set of the facade, pinned as a list — a bind dropped from the map fails here by name
        expect(typeof consumer.chatChannel.kick).toBe('function')
        expect(typeof consumer.chatChannel.refresh).toBe('function')
        expect(typeof consumer.chatChannel.amendIdentity).toBe('function')
        expect(typeof consumer.chatChannel.connections).toBe('object')
        expect(typeof consumer.chatSpace.kick).toBe('function')
        expect(typeof consumer.chatSpace.enroll).toBe('function')
        expect(typeof consumer.chatSpace.memberships).toBe('object')
        // …and the CALL is the proof the bind is live — a lost bind would be a TypeError on `undefined`, while a
        // bound `enroll` runs the point's own server logic all the way to its honest no-engine refusal
        await expect(consumer.callEnroll()).rejects.toThrow('Socket server is not running')
      }),
    )
  })
})
