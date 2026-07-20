import type { LogFn } from '@point0/core'
import { beforeAll, describe, expect, it, jest } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { FilesGenerator } from '../src/generator.js'
import { waitUntilFileChanged } from './utils/other.js'
import { toCamelCase } from '@point0/core'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string; isExists: () => boolean }

const generalTempDir = nodePath.join(__dirname, 'temp/generator')

const prepareRandomTempDir = () => {
  const tempDir = nodePath.join(generalTempDir, crypto.randomUUID())
  return tempDir
}

const prepareRandomFile = (tempDir: string) => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), {
    path,
    basename,
    importpath,
    isExists: () => nodeFs.existsSync(path),
  })
}

type HelperOptions = {
  preserve?: boolean
}
type HelperCallback = (options: {
  dir: string
  files: TestFile[]
  fixPaths: (content: string) => string
  log: LogFn
  getLogs: () => Array<[{ level: string; category: string[]; message: string }]>
  getLastLog: () => [{ level: string; category: string[]; message: string }]
  getLastLogMessage: () => string
}) => void | Promise<void>
type ItFn = (done: (err?: unknown) => void) => void | Promise<void>
function helper(callback: HelperCallback): ItFn
function helper(options: HelperOptions, callback: HelperCallback): ItFn
function helper(...args: [HelperCallback] | [HelperOptions, HelperCallback]): ItFn {
  return async () => {
    const [options, callback] = args.length === 1 ? [{}, args[0]] : args
    const { preserve = false } = options
    const dir = prepareRandomTempDir()
    const files = Array.from({ length: 11 }, () => prepareRandomFile(dir))
    const fixPaths = (content: string) => {
      for (const [index, file] of files.entries()) {
        content = content.replaceAll(file.basename, `file${index}`)
      }
      return content
    }
    const log = jest.fn<LogFn>()
    const getLogs = () => {
      return [...log.mock.calls]
    }
    const getLastLog = () => {
      return getLogs()[getLogs().length - 1]
    }
    const getLastLogMessage = () => {
      return getLastLog()[0].message
    }
    try {
      await callback({
        dir,
        files,
        fixPaths,
        log: log,
        getLogs,
        getLastLog,
        getLastLogMessage,
      })
    } finally {
      if (!preserve) {
        await Promise.allSettled(
          files.map(async (file) => {
            try {
              await file.delete()
            } catch {
              // Ignore errors
            }
          }),
        )
        nodeFs.rmdirSync(dir, { recursive: true })
      }
    }
  }
}

describe('FilesGenerator', () => {
  beforeAll(() => {
    nodeFs.rmSync(generalTempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(generalTempDir, { recursive: true })
  })

  describe('#sync', () => {
    it(
      'generates server points file',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log, getLastLogMessage, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage', '/mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
export const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: pointsFile.path,
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0, page as page_1, query as query_2 } from './file0.js'
          export default [
            root_0,
            page_1,
            query_2,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
        expect(getLastLogMessage()).toStartWith('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates lazy client points file',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log, getLastLogMessage, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage', '/mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
export const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'clientPoints',
              outfile: pointsFile.path,
              lazy: true,
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'mypage',
              route: '/mypage',
              polh: false,
              point: async () => (await import('./file0.js')).page,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
        expect(getLastLogMessage()).toStartWith('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates lazy clients points file, and log errors for invalid points',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/mypage')
const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'clientPoints',
              outfile: pointsFile.path,
              lazy: true,
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
        expect(getLogs()[1][0].message).toStartWith('2 points processed')
        expect(getLogs()[0][0].message).toContain(
          `page.mypage: Last called method name 'undefined' does not match point type 'page'.`,
        )
        expect(getLogs()).toHaveLength(2)
      }),
    )

    it(
      'generates server points file (ssr)',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log }) => {
        // with all pages come to server, becouse some of them have loaders, but even if it has no loader, it can be used to retrieve queryClientDehydratedState
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const layout1 = root.lets('layout', 'layout1').loader(() => ({x:1})).layout(() => <div>Layout1</div>)
export const layout2 = layout1.lets('layout', 'layout2').loader(() => ({x:1})).layout(() => <div>Layout2</div>)
export const layoutNoLoader = layout2.lets('layout', 'layoutNoLoader').layout(() => <div>Layout3</div>)
export const pageWithLoader = layout2.lets('page', 'pageWithLoader', '/pageWithLoader').loader(() => ({x:1})).page(() => <div>Hello</div>)
export const pageNoLoader = layout2.lets('page', 'pageNoLoader', '/pageNoLoader').page(() => <div>Hello</div>)
export const queryWithoutLoader = layout2.lets('query', 'queryWithoutLoader').query()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: pointsFile.path,
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0, pageNoLoader as pageNoLoader_1, pageWithLoader as pageWithLoader_2, layout1 as layout1_3, layout2 as layout2_4 } from './file0.js'
          export default [
            root_0,
            pageNoLoader_1,
            pageWithLoader_2,
            layout1_3,
            layout2_4,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it(
      'generates server points file (no ssr)',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log }) => {
        // without ssr only pages with loaders come to server, becouse they have endpoints
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const layout1 = root.lets('layout', 'layout1').loader(() => ({x:1})).layout(() => <div>Layout1</div>)
export const layout2 = layout1.lets('layout', 'layout2').loader(() => ({x:1})).layout(() => <div>Layout2</div>)
export const layoutNoLoader = layout2.lets('layout', 'layoutNoLoader').layout(() => <div>Layout3</div>)
export const pageWithLoader = layout2.lets('page', 'pageWithLoader', '/pageWithLoader').loader(() => ({x:1})).page(() => <div>Hello</div>)
export const pageNoLoader = layout2.lets('page', 'pageNoLoader', '/pageNoLoader').page(() => <div>Hello</div>)
export const queryWithoutLoader = layout2.lets('query', 'queryWithoutLoader').query()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: false,
          tasks: [
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: pointsFile.path,
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0, pageWithLoader as pageWithLoader_1, layout1 as layout1_2, layout2 as layout2_3 } from './file0.js'
          export default [
            root_0,
            pageWithLoader_1,
            layout1_2,
            layout2_3,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it(
      'generates ready points file',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/mypage').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: pointsFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0, page as page_1 } from './file0.js'
          export default [
            root_0,
            page_1,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it(
      'generates routes file',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          })
          "
        `)
      }),
    )

    it(
      // Mirrors Prettier's `quoteProps: 'as-needed'`: a route name that is not a valid JS
      // identifier (e.g. contains a dash) must stay quoted, while valid identifiers do not.
      'quotes the route key when the name is not a valid identifier',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const valid = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
export const dashed = root.lets('page', 'my-page', '/news/dashed').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            'my-page': '/news/dashed',
            mypage: '/news',
          })
          "
        `)
      }),
    )

    it(
      // Typed search routes are intentionally disabled (see emitRoutesPointsFile) — a page that
      // declares its own search must still emit a plain bare-path route. Regression guard.
      'emits a plain route for a page that declares its own search (typed search disabled)',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
import {z} from 'zod'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').search(z.object({ q: z.string() })).page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          })
          "
        `)
      }),
    )

    it(
      // Typed search routes are intentionally disabled (see emitRoutesPointsFile) — pages with and
      // without a search schema must all emit plain bare-path routes. Regression guard.
      'emits plain routes for pages with and without search (typed search disabled)',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
import {z} from 'zod'
export const root = Point0.lets('root', 'myroot').root()
export const home = root.lets('page', 'home', '/').page(() => <div>Home</div>)
export const list = root.lets('page', 'list', '/list').search(z.object({ page: z.coerce.number().default(0) })).page(() => <div>List</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'https://example.com',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            home: '/',
            list: '/list',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it(
      // Typed search routes are intentionally disabled (see emitRoutesPointsFile) — a page that
      // inherits search from its layout must still emit a plain bare-path route. Regression guard.
      'emits a plain route for a page that inherits search from its layout (typed search disabled)',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
import {z} from 'zod'
export const root = Point0.lets('root', 'myroot').root()
export const layout = root.lets('layout', 'mylayout').search(z.object({ q: z.string() })).layout(() => <div>Layout</div>)
export const page = layout.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin without path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'https://example.com',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin with path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basePath('/my/path').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'https://example.com',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/my/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin with extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basePath('/my/path').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'https://example.com',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/my/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin with path and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basePath('/my/path/extra/path').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'https://example.com',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/my/path/extra/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin as process.env.BASE_URL',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'process.env.BASE_URL',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          }, { origin: process.env.BASE_URL })
          "
        `)
      }),
    )

    it(
      'generates routes file with origin as process.env.BASE_URL and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basePath('/extra/path').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
              origin: 'process.env.BASE_URL',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/extra/path/news',
          }, { origin: process.env.BASE_URL })
          "
        `)
      }),
    )

    it(
      'generates all three file types',
      helper(async ({ dir, files: [rootFile, lazyFile, readyFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').loader(() => ({x:1})).page(() => <div>Hello</div>)
export const layout = root.lets('layout', 'mylayout', '/layout').loader(() => ({x:1})).layout(() => <div>Layout</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'clientPoints',
              outfile: lazyFile.path,
              lazy: true,
            },
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: readyFile.path,
            },
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const lazyContent = fixPaths(await lazyFile.text())
        expect(lazyContent).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'mypage',
              route: '/news',
              polh: false,
              point: async () => (await import('./file0.js')).page,
            },
            {
              type: 'layout',
              name: 'mylayout',
              route: '/layout',
              point: async () => (await import('./file0.js')).layout,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        const readyContent = fixPaths(await readyFile.text())
        expect(readyContent).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0, page as page_1, layout as layout_2 } from './file0.js'
          export default [
            root_0,
            page_1,
            layout_2,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        const routesContent = fixPaths(await routesFile.text())
        expect(routesContent).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({
            mypage: '/news',
          })
          "
        `)
      }),
    )

    it(
      'generates files with banner',
      helper(async ({ dir, files: [rootFile, pointsFile0, pointsFile1], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const banner = '// This file is auto-generated\n// Do not edit manually'
        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          banner,
          ssr: true,
          tasks: [
            {
              scope: 'myroot',
              what: 'clientPoints',
              outfile: pointsFile0.path,
              lazy: true,
              banner: '// Target-specific banner 0',
            },
            {
              scope: 'myroot',
              what: 'serverPoints',
              outfile: pointsFile1.path,
              banner: '// Target-specific banner 1',
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content0 = fixPaths(await pointsFile0.text())
        const content1 = fixPaths(await pointsFile1.text())
        expect(content0).toMatchInlineSnapshot(`
          "// This file is auto-generated
          // Do not edit manually
          // Target-specific banner 0
          import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'mypage',
              route: '/news',
              polh: false,
              point: async () => (await import('./file0.js')).page,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
        expect(content1).toMatchInlineSnapshot(`
          "// This file is auto-generated
          // Do not edit manually
          // Target-specific banner 1
          import type { PointsDefinition } from '@point0/core'
          import { root as root_0, page as page_1 } from './file0.js'
          export default [
            root_0,
            page_1,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it(
      'generates routes file with empty routes when no pages',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'routes',
              outfile: routesFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@1gr14/route0'

          export const routes = Routes.create({})
          "
        `)
      }),
    )

    it(
      'handles multiple scopes',
      helper(async ({ dir, files: [root0File, root1File, lazy0File, lazy1File, lazy2File], fixPaths, log: log }) => {
        await root0File.write(`import {Point0} from '@point0/core'
export const root0 = Point0.lets('root', 'root0').root()
export const page0 = root0.lets('page', 'page0', '/page0').page(() => <div>Page0</div>)
        `)

        await root1File.write(`import {Point0} from '@point0/core'
export const root1 = Point0.lets('root', 'root1').root()
export const page1 = root1.lets('page', 'page1', '/page1').page(() => <div>Page1</div>)
export const root2 = root1.lets('root', 'root2').root()
export const page2 = root2.lets('page', 'page2', '/page2').page(() => <div>Page2</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              scope: 'root0',
              what: 'clientPoints',
              outfile: lazy0File.path,
              lazy: true,
            },
            {
              scope: 'root1',
              what: 'clientPoints',
              outfile: lazy1File.path,
              lazy: true,
            },
            {
              scope: 'root2',
              what: 'clientPoints',
              outfile: lazy2File.path,
              lazy: true,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const lazy0Content = fixPaths(await lazy0File.text())
        expect(lazy0Content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root0 as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'page0',
              route: '/page0',
              polh: false,
              point: async () => (await import('./file0.js')).page0,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        const lazy1Content = fixPaths(await lazy1File.text())
        expect(lazy1Content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root1 as root_0 } from './file1.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'page1',
              route: '/page1',
              polh: false,
              point: async () => (await import('./file1.js')).page1,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        const lazy2Content = fixPaths(await lazy2File.text())
        expect(lazy2Content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root2 as root_0 } from './file1.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'page2',
              route: '/page2',
              polh: false,
              point: async () => (await import('./file1.js')).page2,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it(
      'generates meta file',
      helper(async ({ dir, files: [rootFile, metaFile], fixPaths, log: log, getLastLogMessage, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').tag('root-tag').description('root description').root()
export const layout = root.lets('layout', 'mylayout').tag('layout-tag').description('layout description').layout(() => <div>Layout</div>)
export const page = layout.lets('page', 'mypage', '/mypage').tag('page-tag-a', 'page-tag-b').description('page description').page(() => <div>Hello</div>)
export const action = root.lets('action', 'myaction', 'GET', '/myaction').tag('action-tag').description('action description').action()
export const invalidPage = root.lets('page', 'page3').tag('invalid-tag').description('invalid page description')
const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              what: 'meta',
              engine: {
                file: '/engine.ts',
                server: {
                  scope: 'myroot',
                },
                clients: [
                  {
                    scope: 'myroot',
                  },
                ],
              },
              scopes: ['myroot'],
              outfile: metaFile.path,
            },
          ],
          log,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await metaFile.text())
        expect(
          content
            .replaceAll(/file: '[^']*'/g, `file: '<file>'`)
            .replaceAll(/engineFile: '[^']*'/g, `engineFile: '<file>'`),
        ).toMatchInlineSnapshot(`
          "import { Route0 } from '@1gr14/route0'
          import { Engine } from '@point0/engine'
          export default {
            engine: {
              file: '<file>',
              import: async () => (await Engine.findAndImportSelf({ engineFile: '<file>' })).engine,
              server: {
                scope: 'myroot',
              },
              clients: [
                {
                  scope: 'myroot',
                },
              ],
            },
            points: [
              {
                scope: 'myroot',
                type: 'root',
                name: 'myroot',
                id: 'myroot:root:myroot',
                tags: ['root-tag'],
                description: \`root description\`,
                route: undefined,
                endpoint: undefined,
                pos: {
                  file: '<file>',
                  line: 2,
                  column: 20,
                },
                import: async () => (await import('./file0.js')).root,
                valid: true,
                errors: [],
                ssr: false,
                parents: [],
                layouts: [],
              },
              {
                scope: 'plugin',
                type: 'plugin',
                name: 'myplugin',
                id: 'plugin:plugin:myplugin',
                tags: [],
                description: undefined,
                route: undefined,
                endpoint: undefined,
                pos: {
                  file: '<file>',
                  line: 7,
                  column: 15,
                },
                import: undefined,
                valid: true,
                errors: [],
                ssr: false,
                parents: [],
                layouts: [],
              },
              {
                scope: 'myroot',
                type: 'page',
                name: 'page3',
                id: 'myroot:page:page3',
                tags: ['root-tag', 'invalid-tag'],
                description: \`root description

          invalid page description\`,
                route: undefined,
                endpoint: undefined,
                pos: {
                  file: '<file>',
                  line: 6,
                  column: 27,
                },
                import: async () => (await import('./file0.js')).invalidPage,
                valid: false,
                errors: [
                  \`Invalid route argument undefined\`,
                  \`Last called method name 'description' does not match point type 'page'. Please, use .page() in end of point chain\`,
                ],
                ssr: false,
                parents: [
                  {
                    scope: 'myroot',
                    type: 'root',
                    name: 'myroot',
                    id: 'myroot:root:myroot',
                    pos: {
                      file: '<file>',
                      line: 2,
                      column: 20,
                    },
                  },
                ],
                layouts: [],
              },
              {
                scope: 'myroot',
                type: 'page',
                name: 'mypage',
                id: 'myroot:page:mypage',
                tags: ['root-tag', 'layout-tag', 'page-tag-a', 'page-tag-b'],
                description: \`root description

          layout description

          page description\`,
                route: Route0.create('/mypage'),
                endpoint: undefined,
                pos: {
                  file: '<file>',
                  line: 4,
                  column: 20,
                },
                import: async () => (await import('./file0.js')).page,
                valid: true,
                errors: [],
                ssr: false,
                parents: [
                  {
                    scope: 'myroot',
                    type: 'layout',
                    name: 'mylayout',
                    id: 'myroot:layout:mylayout',
                    pos: {
                      file: '<file>',
                      line: 3,
                      column: 22,
                    },
                  },
                  {
                    scope: 'myroot',
                    type: 'root',
                    name: 'myroot',
                    id: 'myroot:root:myroot',
                    pos: {
                      file: '<file>',
                      line: 2,
                      column: 20,
                    },
                  },
                ],
                layouts: [
                  {
                    scope: 'myroot',
                    type: 'layout',
                    name: 'mylayout',
                    id: 'myroot:layout:mylayout',
                    pos: {
                      file: '<file>',
                      line: 3,
                      column: 22,
                    },
                  },
                ],
              },
              {
                scope: 'myroot',
                type: 'layout',
                name: 'mylayout',
                id: 'myroot:layout:mylayout',
                tags: ['root-tag', 'layout-tag'],
                description: \`root description

          layout description\`,
                route: Route0.create('/'),
                endpoint: undefined,
                pos: {
                  file: '<file>',
                  line: 3,
                  column: 22,
                },
                import: async () => (await import('./file0.js')).layout,
                valid: true,
                errors: [],
                ssr: false,
                parents: [
                  {
                    scope: 'myroot',
                    type: 'root',
                    name: 'myroot',
                    id: 'myroot:root:myroot',
                    pos: {
                      file: '<file>',
                      line: 2,
                      column: 20,
                    },
                  },
                ],
                layouts: [],
              },
              {
                scope: 'myroot',
                type: 'action',
                name: 'myaction',
                id: 'myroot:action:myaction',
                tags: ['root-tag', 'action-tag'],
                description: \`root description

          action description\`,
                route: undefined,
                endpoint: {
                  method: 'GET',
                  methods: ['GET'],
                  route: Route0.create('/myaction'),
                },
                pos: {
                  file: '<file>',
                  line: 5,
                  column: 22,
                },
                import: async () => (await import('./file0.js')).action,
                valid: true,
                errors: [],
                ssr: false,
                parents: [
                  {
                    scope: 'myroot',
                    type: 'root',
                    name: 'myroot',
                    id: 'myroot:root:myroot',
                    pos: {
                      file: '<file>',
                      line: 2,
                      column: 20,
                    },
                  },
                ],
                layouts: [],
              },
            ],
          }
          "
        `)

        expect(getLastLogMessage()).toStartWith('5 points processed')
        expect(getLogs()).toHaveLength(2)
      }),
    )

    it(
      'generates custom file',
      helper(async ({ dir, files: [rootFile, customFile], fixPaths, log: log, getLastLogMessage, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage', '/mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
export const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              what: 'customFile',
              outfile: customFile.path,
              handler: async ({ points }) => {
                return `export const pointsNames = [${points.map((p) => `'${p.name}'`).join(', ')}]`
              },
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await customFile.text())
        expect(content).toMatchInlineSnapshot(
          `"export const pointsNames = ['myroot', 'myplugin', 'mypage', 'myquery']"`,
        )
        expect(getLastLogMessage()).toStartWith('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates custom file with imports',
      helper(async ({ dir, files: [rootFile, customFile], fixPaths, log: log, getLastLogMessage, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage', '/mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
export const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              what: 'customFile',
              outfile: customFile.path,
              handler: async ({ points, emitPointsImports }) => {
                const { importLines, importedPoints } = emitPointsImports({ points })
                const lines: string[] = []
                lines.push(...importLines)
                for (const { point, renamedExportName } of importedPoints) {
                  lines.push(`export const ${toCamelCase(`${point.name}_${point.type}`)} = ${renamedExportName}`)
                }
                return lines.join('\n') + '\n'
              },
            },
          ],
          log,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await customFile.text())
        expect(content).toMatchInlineSnapshot(
          `
            "import { root as root_0, plugin as plugin_1, page as page_2, query as query_3 } from './file0.js'
            export const myrootRoot = root_0
            export const mypluginPlugin = plugin_1
            export const mypagePage = page_2
            export const myqueryQuery = query_3
            "
          `,
        )
        expect(getLastLogMessage()).toStartWith('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates custom by controlled handler',
      helper(
        async ({
          dir,
          files: [rootFile, customFile1, customFile2],
          fixPaths,
          log: log,
          getLastLogMessage,
          getLogs,
        }) => {
          await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage', '/mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
export const plugin = Point0.lets('plugin', 'myplugin').input().plugin()
        `)

          const generator = FilesGenerator.create({
            cwd: dir,
            glob: '**/*.tsx',
            ssr: true,
            tasks: [
              {
                what: 'customControlled',
                handler: async ({ points }) => {
                  const content1 = `export const pointsNames = [${points.map((p) => `'${p.name}'`).join(', ')}]`
                  const content2 = `export const pointsCount = ${points.length}`
                  await customFile1.write(content1)
                  await customFile2.write(content2)
                },
              },
            ],
            log,
            routes: {},
          })
          await generator.sync()

          const content1 = fixPaths(await customFile1.text())
          const content2 = fixPaths(await customFile2.text())
          expect(content1).toMatchInlineSnapshot(
            `"export const pointsNames = ['myroot', 'myplugin', 'mypage', 'myquery']"`,
          )
          expect(content2).toMatchInlineSnapshot(`"export const pointsCount = 4"`)
          expect(getLastLogMessage()).toStartWith('4 points processed')
          expect(getLogs()).toHaveLength(1)
        },
      ),
    )
  })

  describe('#watch', () => {
    it(
      'watches files and updates points',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, getLogs, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/mypage').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          ssr: true,
          tasks: [
            {
              scope: 'myroot',
              what: 'clientPoints',
              outfile: pointsFile.path,
              lazy: true,
            },
          ],
          log,
          routes: {},
        })

        expect(getLogs()).toHaveLength(0)
        await generator.sync()
        expect(getLogs()[0][0].message).toStartWith('2 points processed')
        await generator.watch()
        expect(getLogs()[1][0].message).toBe('Watcher started')

        expect(fixPaths(await pointsFile.text())).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'mypage',
              route: '/mypage',
              polh: false,
              point: async () => (await import('./file0.js')).page,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        await rootFile.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'myroot').root()
          export const page = root.lets('page', 'mypage2', '/mypage2').page(() => <div>Hello</div>)
        `)

        await waitUntilFileChanged(pointsFile)

        expect(fixPaths(await pointsFile.text())).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
            {
              type: 'page',
              name: 'mypage2',
              route: '/mypage2',
              polh: false,
              point: async () => (await import('./file0.js')).page,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)

        expect(getLogs()[2][0].message).toBe('remove: page.mypage')
        expect(getLogs()[3][0].message).toBe('add: page.mypage2')
      }),
      {
        retry: 3,
      },
    )
  })
})
