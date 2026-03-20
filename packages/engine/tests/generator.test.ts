import type { LogFn } from '@point0/core'
import { beforeAll, describe, expect, it, jest } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { FilesGenerator } from '../src/generator.js'
import { waitUntilFileChanged } from './utils/other.js'

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
    it.concurrent(
      'generates lazy points file for server',
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'server',
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
            {
              type: 'query',
              name: 'myquery',
              point: async () => (await import('./file0.js')).query,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
        expect(getLastLogMessage()).toBe('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )
    it.concurrent(
      'generates lazy points file for client',
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'client',
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
        expect(getLastLogMessage()).toBe('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates lazy points file, and log errors for invalid points',
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'server',
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
        expect(getLogs()[1][0].message).toBe('2 points processed')
        expect(getLogs()[0][0].message).toContain(
          `page.mypage: Last called method name 'undefined' does not match point type 'page'.`,
        )
        expect(getLogs()).toHaveLength(2)
      }),
    )

    it.concurrent(
      'generates lazy points file (ssr)',
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'server',
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
              name: 'pageNoLoader',
              route: '/pageNoLoader',
              polh: false,
              layouts: ['layout1', 'layout2'],
              point: async () => (await import('./file0.js')).pageNoLoader,
            },
            {
              type: 'page',
              name: 'pageWithLoader',
              route: '/pageWithLoader',
              polh: false,
              layouts: ['layout1', 'layout2'],
              point: async () => (await import('./file0.js')).pageWithLoader,
            },
            {
              type: 'layout',
              name: 'layout1',
              route: '/',
              point: async () => (await import('./file0.js')).layout1,
            },
            {
              type: 'layout',
              name: 'layout2',
              route: '/',
              point: async () => (await import('./file0.js')).layout2,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it.concurrent(
      'generates lazy points file (no ssr)',
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'server',
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
              name: 'pageWithLoader',
              route: '/pageWithLoader',
              polh: false,
              layouts: ['layout1', 'layout2'],
              point: async () => (await import('./file0.js')).pageWithLoader,
            },
            {
              type: 'layout',
              name: 'layout1',
              route: '/',
              point: async () => (await import('./file0.js')).layout1,
            },
            {
              type: 'layout',
              name: 'layout2',
              route: '/',
              point: async () => (await import('./file0.js')).layout2,
            },
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx'], typeof root_0['Infer']['Error']>
          "
        `)
      }),
    )

    it.concurrent(
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: false,
              side: 'server',
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

    it.concurrent(
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          })
          "
        `)
      }),
    )

    it.concurrent(
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with origin with path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basepath('/my/path').root()
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with origin with extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basepath('/my/path').root()
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with origin with path and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basepath('/my/path/extra/path').root()
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/extra/path/news',
          }, { origin: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          }, { origin: process.env.BASE_URL })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with origin as process.env.BASE_URL and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, log: log }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').basepath('/extra/path').root()
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/extra/path/news',
          }, { origin: process.env.BASE_URL })
          "
        `)
      }),
    )

    it.concurrent(
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
              what: 'points',
              outfile: lazyFile.path,
              lazy: true,
              side: 'server',
            },
            {
              scope: 'myroot',
              what: 'points',
              outfile: readyFile.path,
              lazy: false,
              side: 'server',
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          })
          "
        `)
      }),
    )

    it.concurrent(
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
              what: 'points',
              outfile: pointsFile0.path,
              lazy: true,
              banner: '// Target-specific banner 0',
              side: 'server',
            },
            {
              scope: 'myroot',
              what: 'points',
              outfile: pointsFile1.path,
              lazy: false,
              banner: '// Target-specific banner 1',
              side: 'server',
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

    it.concurrent(
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
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({})
          "
        `)
      }),
    )

    it.concurrent(
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
              what: 'points',
              outfile: lazy0File.path,
              lazy: true,
              side: 'server',
            },
            {
              scope: 'root1',
              what: 'points',
              outfile: lazy1File.path,
              lazy: true,
              side: 'server',
            },
            {
              scope: 'root2',
              what: 'points',
              outfile: lazy2File.path,
              lazy: true,
              side: 'server',
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
  })

  describe('#watch', () => {
    it.concurrent(
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
              what: 'points',
              outfile: pointsFile.path,
              lazy: true,
              side: 'server',
            },
          ],
          log,
          routes: {},
        })

        expect(getLogs()).toHaveLength(0)
        await generator.sync()
        expect(getLogs()[0][0].message).toBe('2 points processed')
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
    )
  })
})
