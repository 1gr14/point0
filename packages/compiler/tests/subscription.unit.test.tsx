import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/subscription')

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

// one realistic file carrying both subscription shapes — the named opener and the action opener
const subscriptionFileContent = `import {Point0} from '@point0/core'
import { z } from 'zod'
import { serverSecret } from './server-secret.js'
export const root = Point0.lets('root', 'root').root()
export const progressSubscription = root.lets('subscription', 'progress')
  .input(z.object({ taskId: z.string() }))
  .loader(async function* ({ input, signal }) {
    yield { p: 1, taskId: input.taskId, secret: serverSecret }
  })
  .subscription()
export const feedSubscription = root.lets('GET', '/api/feed')
  .loader(async function* () { yield { item: 'x' } })
  .subscription()
`

// a subscription closer carrying the module-level listener and lifecycle callbacks (client code) next to `reconnect`
// (plain data) and the tracked-cursor pair (client-read), plus the `.subscriptionOptions()` scope default — both
// option objects split the same way
const listenerFileContent = `import {Point0} from '@point0/core'
import { toast } from './client-toast.js'
export const root = Point0.lets('root', 'root').root()
export const beatSubscription = root.lets('subscription', 'beat')
  .subscriptionOptions({ onConnect: () => toast('open') })
  .loader(async function* () { yield { beat: 1, id: 'b1' } })
  .subscription({
    reconnect: { delay: 100 },
    cursorParamFromInput: 'lastEventId',
    cursorParamFromData: 'id',
    onMessageFromServer: (message) => toast(message.beat),
    onDisconnect: ({ connectionIndex }) => toast(connectionIndex),
  })
`

describe('CompilerPoint subscription', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe.concurrent('#parse', () => {
    it.concurrent(
      'subscription point gets a GET endpoint with the POST fallback',
      helper(async ({ files: [file], walker }) => {
        await file.write(subscriptionFileContent)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[1].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'subscription',
          name: 'progress',
          scope: 'root',
          scopes: ['root'],
          exportName: 'progressSubscription',
          endpoint: {
            method: 'GET',
            route: '/_point0/root/subscription/progress',
            methods: ['GET', 'POST'],
          },
        })
      }),
    )

    it.concurrent(
      'action-opened subscription STAYS an action (the stream is its flavor) and keeps the declared method and route',
      helper(async ({ files: [file], walker }) => {
        await file.write(subscriptionFileContent)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[2].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'action',
          scope: 'root',
          exportName: 'feedSubscription',
          endpoint: {
            method: 'GET',
            route: '/api/feed',
            methods: ['GET'],
          },
        })
      }),
    )

    it.concurrent(
      'an action opener closed with .action() stays an action',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const feedAction = root.lets('GET', '/api/feed')
  .loader(async () => ({ item: 'x' }))
  .action()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[1].parse()
        expect(parsed.simplify()).toMatchObject({
          valid: true,
          type: 'action',
          endpoint: {
            method: 'GET',
            route: '/api/feed',
            methods: ['GET'],
          },
        })
      }),
    )
  })

  describe.concurrent('#shakeMethods', () => {
    describe.concurrent('client', () => {
      it.concurrent(
        'keeps the module-level onMessageFromServer, the lifecycle callbacks (and their imports) and the tracked-cursor pair on the client',
        helper(async ({ files: [file], walker }) => {
          await file.write(listenerFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          const code = await result.points[0].file.toCompressedPrettyCode()
          expect(code).toContain('onMessageFromServer')
          expect(code).toContain('onConnect')
          expect(code).toContain('onDisconnect')
          expect(code).toContain('client-toast')
          expect(code).toContain('reconnect: {')
          // the client runtime plucks the cursor and rewrites the reconnect input by these two paths
          expect(code).toContain("cursorParamFromInput: 'lastEventId'")
          expect(code).toContain("cursorParamFromData: 'id'")
        }),
      )

      it.concurrent(
        'strips .input and the generator .loader, keeps the .subscription() closer',
        helper(async ({ files: [file], walker }) => {
          await file.write(subscriptionFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'client', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            export const root = Point0.lets('root', 'root').root()
            export const progressSubscription = root
              .lets('subscription', 'progress')
              .input()
              .loader()
              .subscription()
            export const feedSubscription = root
              .lets('GET', '/api/feed')
              .loader()
              .subscription()
            "
          `)
        }),
      )
    })

    describe.concurrent('server', () => {
      it.concurrent(
        'drops the module-level onMessageFromServer and the lifecycle callbacks from the server (the .subscriptionOptions() scope default included), keeps reconnect and the tracked-cursor pair',
        helper(async ({ files: [file], walker }) => {
          await file.write(listenerFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          const code = await result.points[0].file.toCompressedPrettyCode()
          // the properties are gone — the now-unreferenced import falls to the bundler's tree-shake
          expect(code).not.toContain('onMessageFromServer')
          expect(code).not.toContain('onConnect')
          expect(code).not.toContain('onDisconnect')
          // the cursor pair survives BOTH sides (the `reconnect` precedent — plain data is never stripped): the
          // server is the one side holding the real input schema, so its close guard can check the input path
          expect(code).toContain("cursorParamFromInput: 'lastEventId'")
          expect(code).toContain("cursorParamFromData: 'id'")
          expect(code).toContain('reconnect: {')
        }),
      )

      it.concurrent(
        'the surviving pair arms the close guard in the COMPILED server bundle: an input path outside the schema throws at import',
        helper(async ({ files: [file, compiled], walker }) => {
          // the schema-introspection half of the guard needs a registered schema helper — the fixture registers the
          // zod one like a real app's root does. Imported RELATIVELY from core's src: the tsconfig paths map only the
          // four specifiers the compiler itself imports, and the bare \`@point0/core/schema/zod\` would silently load
          // a stale built dist instead
          await file.write(`import {Point0} from '@point0/core'
import { zodSchemaHelper } from '../../../../core/src/schema/zod.js'
import { z } from 'zod'
export const root = Point0.lets('root', 'root').schemaHelper(zodSchemaHelper()).root()
export const wrongPathSubscription = root.lets('subscription', 'wrongPath')
  .input(z.object({ taskId: z.string() }))
  .loader(async function* () { yield { id: 'x' } })
  .subscription({ cursorParamFromInput: 'nope', cursorParamFromData: 'id' })
`)
          const result = walker.collectPointsFromFile({ file: file.path })
          expect(result.errors).toHaveLength(0)
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          await compiled.write(await result.points[0].file.toCompressedPrettyCode())
          // the pair + the real input schema coexist on the compiled server — the guard fires at module load
          await expect(import(compiled.path)).rejects.toThrow('does not exist in the input schema')
        }),
      )

      it.concurrent(
        'preserves the generator loader bodies verbatim',
        helper(async ({ files: [file], walker }) => {
          await file.write(subscriptionFileContent)
          const result = walker.collectPointsFromFile({ file: file.path })
          for (const point of result.points) {
            point.shakeMethods({ side: 'server', scope: 'root' })
          }
          expect(await result.points[0].file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            import { z } from 'zod'
            import { serverSecret } from './server-secret.js'
            export const root = Point0.lets('root', 'root').root()
            export const progressSubscription = root
              .lets('subscription', 'progress')
              .input(
                z.object({
                  taskId: z.string(),
                }),
              )
              .loader(async function* ({ input, signal }) {
                yield {
                  p: 1,
                  taskId: input.taskId,
                  secret: serverSecret,
                }
              })
              .subscription()
            export const feedSubscription = root
              .lets('GET', '/api/feed')
              .loader(async function* () {
                yield {
                  item: 'x',
                }
              })
              .subscription()
            "
          `)
        }),
      )
    })
  })
})
