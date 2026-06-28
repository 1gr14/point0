import assert from 'assert'
import { existsSync, readdirSync } from 'node:fs'
import { rename, rm } from 'node:fs/promises'
import nodePath from 'node:path'
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { resolveServerHotStoreDir } from '../src/server-hot-store.js'
import { bundlers } from './utils/focus.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(80000)

// Resolve the server-hot store dir the way the dev child actually does: walk up from its cwd (the test project dir) to
// the nearest `node_modules`, then `.cache/server-hot/<scope>-<port>`. The engine resolves it with
// `resolveCacheDirPath` from `process.cwd()`; replicating that walk from the project dir keeps the test robust to
// node_modules hoisting. A fully-hoisted install (fresh git worktree, CI) has NO `packages/engine/node_modules`, so the
// store lands in the REPO-ROOT `node_modules/.cache` — a fixed `__dirname/../node_modules` path missed it and read 0.
const resolveStoreDirFromProject = (projectDir: string, scope: string, port: number | string): string => {
  let dir = projectDir
  let lastDir = ''
  while (dir !== lastDir) {
    const nodeModules = nodePath.join(dir, 'node_modules')
    if (existsSync(nodeModules)) {
      return nodePath.join(nodeModules, '.cache', 'server-hot', `${scope}-${port}`)
    }
    lastDir = dir
    dir = nodePath.dirname(dir)
  }
  throw new Error(`No node_modules found above ${projectDir}`)
}

const tpf = TestProjectOneClientFactory.create({
  namespace: 'dev',
  portsRange: [3200, 3299],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>]
    | [
        options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      await tp.cleanup('ports')
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

// Poll `fn` every 250ms until it returns a defined value (then return it) or `timeoutMs` elapses (then throw). Shared by
// the hot-reload and source-map suites, where a value only becomes available after the dev child restarts / re-imports.
const waitFor = async <T>(fn: () => Promise<T | undefined>, timeoutMs: number): Promise<T> => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const result = await fn()
    if (result !== undefined) {
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`)
}

describe('dev', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  describe('dev source maps (bun-native)', () => {
    // A page whose SERVER loader throws on a KNOWN line (line 4 of the written file). The dev error response serializes
    // the error stack (NODE_ENV !== production); source-map-support (installed in the bun dev child) must remap that
    // stack back to the ORIGINAL source — `page.tsx:4` — not the compiled store / onLoad-transformed location.
    const throwingPage = `import { root } from './lib/root.js'
export const page = root.lets('page', 'home', '/')
  .loader(() => {
    throw new Error('SMAP_REMAP_TEST')
  })
  .page(() => <div>SMAP_PAGE</div>)`

    const assertRemapped = async (tp: TestProjectOneClient): Promise<void> => {
      const body = await waitFor(async () => {
        const html = await tp.fetchServerHtml('/').catch(() => '')
        return html.includes('SMAP_REMAP_TEST') ? html : undefined
      }, 15000)
      expect(body).toMatch(/page\.tsx:4\b/) // original file + original throw line, not the compiled line
      expect(body).not.toContain('server-hot') // not the content-addressed store path
    }

    it(
      'remaps a thrown stack to the original source in hot mode (--hot, store inline maps)',
      wrp({ ssr: true, vite: false }, async ({ tp }) => {
        await tp.waitPortsFree()
        await tp.write('src/page.tsx', throwingPage)
        tp.spawn(['bun', 'run', 'dev', '--hot'])
        await tp.waitStarted()
        expect(tp.output).toContain('hot-reload store ready')
        await assertRemapped(tp)
      }),
      { retry: 2, timeout: 90000 },
    )

    it(
      'remaps a thrown stack to the original source in non-hot mode (onLoad map registry)',
      wrp({ ssr: true, vite: false }, async ({ tp }) => {
        await tp.waitPortsFree()
        await tp.write('src/page.tsx', throwingPage)
        tp.spawn(['bun', 'run', 'dev'])
        await tp.waitStarted()
        await assertRemapped(tp)
      }),
      { retry: 2, timeout: 90000 },
    )

    it(
      'remaps a thrown stack with a user babel plugin (react-compiler) in the store',
      wrp({ ssr: true, vite: false }, async ({ tp }) => {
        await tp.waitPortsFree()
        // react-compiler regenerates the file (a user babel plugin), so toCode() chains its `intermediate → original`
        // map before the store appends it inline. Assert that chain still resolves the throw to the ORIGINAL line.
        await tp.replace(
          'src/engine.ts',
          "entry: { main: './index.server.ts' },",
          "entry: { main: './index.server.ts' },\n    compiler: { babel: ['babel-plugin-react-compiler'] },",
        )
        await tp.write('src/page.tsx', throwingPage)
        tp.spawn(['bun', 'run', 'dev', '--hot'])
        await tp.waitStarted()
        expect(tp.output).toContain('hot-reload store ready')
        await assertRemapped(tp)
      }),
      { retry: 2, timeout: 90000 },
    )
  })
})
