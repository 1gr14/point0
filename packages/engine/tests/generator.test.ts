import { beforeAll, describe, expect, it, jest } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { EngineLogger } from '../src/config.js'
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

const helper = (
  callback: ({
    dir,
    files,
    fixPaths,
    logger,
    getLogs,
  }: {
    dir: string
    files: TestFile[]
    fixPaths: (content: string) => string
    logger: EngineLogger
    getLogs: () => unknown[][]
    getLastLog: () => unknown[]
    getLastLogFirstArg: () => unknown
  }) => any,
  preserve = false,
) => {
  return async () => {
    const dir = prepareRandomTempDir()
    const files = Array.from({ length: 11 }, (_, i) => prepareRandomFile(dir))
    const fixPaths = (content: string) => {
      for (const [index, file] of files.entries()) {
        content = content.replaceAll(file.basename, `file${index}`)
      }
      return content
    }
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    }
    const getLogs = () => {
      return [
        ...logger.info.mock.calls,
        ...logger.error.mock.calls,
        ...logger.warn.mock.calls,
        ...logger.debug.mock.calls,
      ]
    }
    const getLastLog = () => {
      return getLogs()[getLogs().length - 1]
    }
    const getLastLogFirstArg = () => {
      return getLastLog()[0]
    }
    try {
      await callback({
        dir,
        files,
        fixPaths,
        logger,
        getLogs,
        getLastLog,
        getLastLogFirstArg,
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
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, logger, getLastLogFirstArg, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
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
              side: 'server',
            },
          ],
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
        expect(getLastLogFirstArg()).toBe('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )
    it.concurrent(
      'generates lazy points file for client',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, logger, getLastLogFirstArg, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const query = root.lets('query', 'myquery').loader(() => ({hello: 'World'})).query()
export const page = root.lets('page', 'mypage').query(query).page(({data}) => <div>Hello, {data.hello}</div>)
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
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
        expect(getLastLogFirstArg()).toBe('4 points processed')
        expect(getLogs()).toHaveLength(1)
      }),
    )

    it(
      'generates lazy points file, and log errors for invalid points',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, logger, getLastLogFirstArg, getLogs }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage')
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
          logger,
          routes: {},
        })
        await generator.sync()

        const content = fixPaths(await pointsFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import type { PointsDefinition } from '@point0/core'
          import { root as root_0 } from './file0.js'
          export default [
            root_0,
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
        expect(getLogs()[0][0]).toBe('2 points processed')
        expect(getLogs()[1][0]).toBe(
          `page.mypage: Last called method name 'undefined' does not match point type 'page'. Please, use .page() in end of point chain in ${rootFile.path}:3:20`,
        )
        expect(getLogs()).toHaveLength(2)
      }),
    )

    it.concurrent(
      'generates lazy points file',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const layout1 = root.lets('layout', 'layout1').layout(() => <div>Layout1</div>)
export const layout2 = layout1.lets('layout', 'layout2').layout(() => <div>Layout2</div>)
export const page = layout2.lets('page', 'mypage').page(() => <div>Hello</div>)
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
          logger,
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
              layouts: ['layout1', 'layout2'],
              point: async () => (await import('./file0.js')).page,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
      }),
    )

    it.concurrent(
      'generates ready points file',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
        `)

        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          tasks: [
            {
              scope: 'myroot',
              what: 'points',
              outfile: pointsFile.path,
              lazy: false,
              side: 'server',
            },
          ],
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
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
          logger,
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
      'generates routes file with baseurl without path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl('https://example.com').root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          }, { baseurl: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with baseurl with path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl('https://example.com/my/path').root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/news',
          }, { baseurl: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with baseurl with extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl('https://example.com', 'my/path').root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/news',
          }, { baseurl: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with baseurl with path and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl('https://example.com/my/path', 'extra/path').root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/my/path/extra/path/news',
          }, { baseurl: 'https://example.com' })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with baseurl as process.env.BASE_URL',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl(process.env.BASE_URL).root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/news',
          }, { baseurl: process.env.BASE_URL })
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with baseurl as process.env.BASE_URL and extra path as string',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').baseurl(process.env.BASE_URL, 'extra/path').root()
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
          logger,
          routes: {},
        })

        await generator.sync()

        const content = fixPaths(await routesFile.text())
        expect(content).toMatchInlineSnapshot(`
          "import { Routes } from '@devp0nt/route0'

          export const routes = Routes.create({
            'mypage': '/extra/path/news',
          }, { baseurl: process.env.BASE_URL })
          "
        `)
      }),
    )

    it.concurrent(
      'generates all three file types',
      helper(async ({ dir, files: [rootFile, lazyFile, readyFile, routesFile], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
export const layout = root.lets('layout', 'mylayout', '/layout').layout(() => <div>Layout</div>)
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
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
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
      helper(async ({ dir, files: [rootFile, pointsFile0, pointsFile1], fixPaths, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage', '/news').page(() => <div>Hello</div>)
        `)

        const banner = '// This file is auto-generated\n// Do not edit manually'
        const generator = FilesGenerator.create({
          cwd: dir,
          glob: '**/*.tsx',
          banner,
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
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
      }),
    )

    it.concurrent(
      'generates routes file with empty routes when no pages',
      helper(async ({ dir, files: [rootFile, routesFile], fixPaths, logger }) => {
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
          logger,
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
      helper(async ({ dir, files: [root0File, root1File, lazy0File, lazy1File, lazy2File], fixPaths, logger }) => {
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
          logger,
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)
      }),
    )
  })

  describe('#watch', () => {
    it.concurrent(
      'watches files and updates points',
      helper(async ({ dir, files: [rootFile, pointsFile], fixPaths, getLogs, logger }) => {
        await rootFile.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'myroot').root()
export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
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
          logger,
          routes: {},
        })

        expect(getLogs()).toHaveLength(0)
        await generator.sync()
        expect(getLogs()[0][0]).toBe('2 points processed')
        await generator.watch()
        expect(getLogs()[1][0]).toBe('generator watcher started')

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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)

        await rootFile.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'myroot').root()
          export const page = root.lets('page', 'mypage2').page(() => <div>Hello</div>)
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
          ] as PointsDefinition<typeof root_0['Infer']['RequiredCtx']>
          "
        `)

        expect(getLogs()[2][0]).toBe('➖ page.mypage')
        expect(getLogs()[3][0]).toBe('➕ page.mypage2')
      }),
    )
  })
})
