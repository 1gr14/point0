import { beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'
import assert from 'node:assert'

setDefaultTimeout(10000)

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/walker')

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
    const walker = new Walker({ routes: undefined, ssr })
    const files = Array.from({ length: 11 }, prepareRandomFile)
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

describe('Walker', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe('#collectPointsFromFile', () => {
    it.concurrent(
      'can recognize root point in current file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          file: file.basename,
          exportName: 'myrootvariable',
          isBasePoint0: true,
        })
      }),
    )

    it.concurrent(
      'can recognize page point in current file, when root point in same file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
                          export const mypagevariable = myrootvariable.lets('page', 'mypage', '/').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(2)
        expect(result.points[0].simplify()).toMatchObject({
          file: file.basename,
          type: 'root',
          name: 'myroot',
          exportName: 'myrootvariable',
          isBasePoint0: true,
        })
        expect(result.points[1].simplify()).toMatchObject({
          file: file.basename,
          type: 'page',
          name: 'mypage',
          exportName: 'mypagevariable',
          isBasePoint0: false,
        })

        const parents1 = walker.collectParentPointsByPoint({ point: result.points[1] })
        expect(parents1.errors).toHaveLength(0)
        expect(parents1.parents).toHaveLength(1)
        expect(parents1.parents[0].simplify()).toMatchObject({
          name: 'myroot',
        })
      }),
    )

    it.concurrent(
      'desugars lets.<type>() for named exports and infers point names',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const mainRoot = Point0.lets.root().root()
export const ideaPage = mainRoot.lets.page('/idea/:id').page(() => <div>Hello</div>)
export const idea_layout = mainRoot.lets.layout('/idea').layout()
export const ideaX = mainRoot.lets.page('/x').page(() => <div>X</div>)
export const page = mainRoot.lets.page('/page-fallback').page(() => <div>PageFallback</div>)
export const layout = mainRoot.lets.layout('/layout-fallback').layout()
export const ideasQuery = mainRoot.lets.infiniteQuery().infiniteQuery()
export const saveAction = mainRoot.lets.action('POST', '/save').loader(() => ({ ok: true })).action()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(8)
        const simplified = result.points.map((p) => p.simplify())
        const byExportName = Object.fromEntries(simplified.map((p) => [p.exportName, p]))
        expect(byExportName.mainRoot).toMatchObject({ type: 'root', name: 'main', valid: true })
        expect(byExportName.ideaPage).toMatchObject({ type: 'page', name: 'idea', route: '/idea/:id', valid: true })
        expect(byExportName.idea_layout).toMatchObject({ type: 'layout', name: 'idea', route: '/idea', valid: true })
        expect(byExportName.ideaX).toMatchObject({ type: 'page', name: 'ideaX', route: '/x', valid: true })
        expect(byExportName.page).toMatchObject({
          type: 'page',
          name: file.basename,
          route: '/page-fallback',
          valid: true,
        })
        expect(byExportName.layout).toMatchObject({
          type: 'layout',
          name: file.basename,
          route: '/layout-fallback',
          valid: true,
        })
        expect(byExportName.ideasQuery).toMatchObject({
          type: 'infiniteQuery',
          name: 'ideas',
          valid: true,
        })
        expect(byExportName.saveAction).toMatchObject({
          type: 'action',
          name: 'save',
          route: '/save',
          endpoint: { method: 'POST', route: '/save' },
          valid: true,
        })
      }),
    )

    it.concurrent(
      'desugars lets.root() with export const root name to root',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets.root().root()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          type: 'root',
          name: 'root',
          exportName: 'root',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'desugars lets.root() with export const root name to root (separated lines)',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0
  .lets
  .root()
  .root()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          type: 'root',
          name: 'root',
          exportName: 'root',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'desugars lets.root() with export const root name to root (separated lines and generics)',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0
  .lets
  .root()
  .root()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          type: 'root',
          name: 'root',
          exportName: 'root',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'desugars lets.<type>() for default export and infers name from filename',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets.root().root()
export default root.lets.page('/idea').page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const point = result.points.find((p) => p.exportName === 'default')?.simplify()
        expect(point).toBeDefined()
        expect(point).toMatchObject({
          type: 'page',
          name: file.basename,
          exportName: 'default',
          route: '/idea',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'desugars lets.<type>() default export in index file and uses directory basename',
      helper(async ({ walker }) => {
        const dirname = `nested-${crypto.randomUUID()}`
        const dirpath = nodePath.join(tempDir, dirname)
        const filepath = nodePath.join(dirpath, 'index.tsx')
        nodeFs.mkdirSync(dirpath, { recursive: true })
        try {
          await Bun.write(
            filepath,
            await toText(`import {Point0} from '@point0/core'
export const root = Point0.lets.root().root()
export default root.lets.layout('/idea').layout()
          `),
          )
          const result = walker.collectPointsFromFile({ file: filepath })
          expect(result.errors).toHaveLength(0)
          const point = result.points.find((p) => p.exportName === 'default')?.simplify()
          expect(point).toBeDefined()
          expect(point).toMatchObject({
            type: 'layout',
            name: dirname,
            exportName: 'default',
            route: '/idea',
            valid: true,
          })
        } finally {
          nodeFs.rmSync(dirpath, { recursive: true, force: true })
        }
      }),
    )

    it.concurrent(
      'does not collect non-Point0 lets sugar calls',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
const fake = { lets: { page: (_route) => ({ page: () => null }) } }
export const root = Point0.lets.root().root()
const notRelated = fake.lets.page('/ignore')
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified).toHaveLength(1)
        expect(simplified[0]).toMatchObject({
          type: 'root',
          name: 'root',
          exportName: 'root',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'resolves sugar parents across files without broad desugar',
      helper(async ({ files: [file0, file1], walker }) => {
        await file0.write(`import {Point0} from '@point0/core'
export const appRoot = Point0.lets.root().root()
        `)
        await file1.write(`import {appRoot} from '${file0.importpath}'
export const dashboardPage = appRoot.lets.page('/dashboard').page(() => <div>Dashboard</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file1.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          type: 'page',
          name: 'dashboard',
          exportName: 'dashboardPage',
          route: '/dashboard',
          valid: true,
        })

        const parents = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents.errors).toHaveLength(0)
        expect(parents.parents).toHaveLength(1)
        expect(parents.parents[0].simplify()).toMatchObject({
          type: 'root',
          name: 'app',
          exportName: 'appRoot',
          valid: true,
        })
      }),
    )

    it.concurrent(
      'can recognize page point in current file, when root point in another file',
      helper(async ({ files: [file0, file1], walker }) => {
        await file0.write(`import {Point0} from '@point0/core'
                        export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        await file1.write(`import {myrootvariable} from '${file0.importpath}'
                        export const mypagevariable = myrootvariable.lets('page', 'mypage', '/mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file1.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points[0].simplify()).toMatchObject({
          file: file1.basename,
          type: 'page',
          name: 'mypage',
          exportName: 'mypagevariable',
          isBasePoint0: false,
        })

        const parents2 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents2.errors).toHaveLength(0)
        expect(parents2.parents).toHaveLength(1)
        expect(parents2.parents[0].simplify()).toMatchObject({
          name: 'myroot',
        })
      }),
    )

    it.concurrent(
      'can recognize flat points in same file with single parent',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').root()
          export const page = root.lets('page', 'home', '/').page(() => <div>MY_CLIENT_SERVER</div>)
          export const page1 = root.lets('page', 'page1', '/1').clientLoader(() => ({x:1})).page(() => <div>MY_CLIENT_ONLY</div>)
          export const page2 = root.lets('page', 'page2', '/2').clientOnly().page(() => <div>MY_CLIENT_ONLY</div>)
          export const page3 = root.lets('page', 'page3', '/3').page(() => (env.side.is.server ? <div>MY_SERVER_WRONG_HOPE</div> : <div>MY_CLIENT_WRONG_HOPE</div>))
          export const page4 = root.lets('page', 'page4', '/4').page(() => { if (env.side.is.server) { return <div>MY_SERVER_ONLY</div> } else { return <div>MY_CLIENT_ONLY</div> } })
          export const page5 = root.lets('page', 'page5', '/5').loader(() => { console.info('MY_SERVER_ONLY'); return {y:2} }).page(() => <div>MY_CLIENT_SERVER</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(7)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'root',
          },
          {
            exportName: 'page',
          },
          {
            exportName: 'page1',
          },
          {
            exportName: 'page2',
          },
          {
            exportName: 'page3',
          },
          {
            exportName: 'page4',
          },
          {
            exportName: 'page5',
          },
        ])
      }),
    )

    it.concurrent(
      'recognize usual action',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').root()
          export const a1 = root.lets('action', 'action1', 'GET', '/users').loader(() => ({ ok: true })).query()
          export const a2 = root.lets('action', 'action2', 'POST', '/users').loader(() => ({ ok: true })).mutation()
          export const a3 = root.lets('action', 'action3', 'DELETE', '/users/:id').loader(() => ({ ok: true })).action()
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(4)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified[1]).toMatchObject({
          type: 'action',
          name: 'action1',
          exportName: 'a1',
          route: '/users',
          valid: true,
          endpoint: { method: 'GET', route: '/users' },
        })
        expect(simplified[2]).toMatchObject({
          type: 'action',
          name: 'action2',
          exportName: 'a2',
          route: '/users',
          valid: true,
          endpoint: { method: 'POST', route: '/users' },
        })
        expect(simplified[3]).toMatchObject({
          type: 'action',
          name: 'action3',
          exportName: 'a3',
          route: '/users/:id',
          valid: true,
          endpoint: { method: 'DELETE', route: '/users/:id' },
        })
      }),
    )

    it.concurrent(
      'can recognize action shorthand points',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').root()
          export const a1 = root.lets('GET', '/users').loader(() => ({ ok: true })).query()
          export const a2 = root.lets('POST', '/users').loader(() => ({ ok: true })).mutation()
          export const a3 = root.lets('DELETE', '/users/:id').loader(() => ({ ok: true })).action()
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(4)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified[1]).toMatchObject({
          type: 'action',
          name: 'GET /users',
          exportName: 'a1',
          route: '/users',
          valid: true,
          endpoint: { method: 'GET', route: '/users' },
        })
        expect(simplified[2]).toMatchObject({
          type: 'action',
          name: 'POST /users',
          exportName: 'a2',
          route: '/users',
          valid: true,
          endpoint: { method: 'POST', route: '/users' },
        })
        expect(simplified[3]).toMatchObject({
          type: 'action',
          name: 'DELETE /users/:id',
          exportName: 'a3',
          route: '/users/:id',
          valid: true,
          endpoint: { method: 'DELETE', route: '/users/:id' },
        })
      }),
    )

    it.concurrent(
      'recognize usual action with basePath',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').basePath('/api').basePath('/:x').root()
          export const a1 = root.lets('action', 'action1', 'GET', '/users').loader(() => ({ ok: true })).query()
          export const a2 = root.lets('action', 'action2', 'POST', '/users').loader(() => ({ ok: true })).mutation()
          export const a3 = root.lets('action', 'action3', 'DELETE', '/users/:id').loader(() => ({ ok: true })).action()
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(4)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified[1]).toMatchObject({
          type: 'action',
          name: 'action1',
          exportName: 'a1',
          route: '/api/:x/users',
          valid: true,
          endpoint: { method: 'GET', route: '/api/:x/users' },
        })
        expect(simplified[2]).toMatchObject({
          type: 'action',
          name: 'action2',
          exportName: 'a2',
          route: '/api/:x/users',
          valid: true,
          endpoint: { method: 'POST', route: '/api/:x/users' },
        })
        expect(simplified[3]).toMatchObject({
          type: 'action',
          name: 'action3',
          exportName: 'a3',
          route: '/api/:x/users/:id',
          valid: true,
          endpoint: { method: 'DELETE', route: '/api/:x/users/:id' },
        })
      }),
    )

    it.concurrent(
      'can recognize action shorthand points with basePath',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').basePath('/api').basePath('/:x').root()
          export const a1 = root.lets('GET', '/users').loader(() => ({ ok: true })).query()
          export const a2 = root.lets('POST', '/users').loader(() => ({ ok: true })).mutation()
          export const a3 = root.lets('DELETE', '/users/:id').loader(() => ({ ok: true })).action()
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(4)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified[1]).toMatchObject({
          type: 'action',
          name: 'GET /api/:x/users',
          exportName: 'a1',
          route: '/api/:x/users',
          valid: true,
          endpoint: { method: 'GET', route: '/api/:x/users' },
        })
        expect(simplified[2]).toMatchObject({
          type: 'action',
          name: 'POST /api/:x/users',
          exportName: 'a2',
          route: '/api/:x/users',
          valid: true,
          endpoint: { method: 'POST', route: '/api/:x/users' },
        })
        expect(simplified[3]).toMatchObject({
          type: 'action',
          name: 'DELETE /api/:x/users/:id',
          exportName: 'a3',
          route: '/api/:x/users/:id',
          valid: true,
          endpoint: { method: 'DELETE', route: '/api/:x/users/:id' },
        })
      }),
    )

    it.concurrent(
      'recognize non action endpoints',
      helper({ ssr: true }, async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').basePath('/api').basePath('/:x').root()
          export const q1 = root.lets('query', 'query1').loader(() => ({ ok: true })).query()
          export const q2 = root.lets('query', 'query2').query()
          export const m1 = root.lets('mutation', 'mutation1').loader(() => ({ ok: true })).mutation()
          export const m2 = root.lets('mutation', 'mutation2').mutation()
          export const iq1 = root.lets('infiniteQuery', 'infiniteQuery1').loader(() => ({ ok: true })).infiniteQuery()
          export const iq2 = root.lets('infiniteQuery', 'infiniteQuery2').infiniteQuery()
          export const pr1 = root.lets('provider', 'provider1').loader(() => ({ ok: true })).provider()
          export const pr2 = root.lets('provider', 'provider2').provider()
          export const l1 = root.lets('layout', 'layout1', '/zxc/:x').loader(() => ({ ok: true })).layout(() => <div>Hello</div>)
          export const l2 = root.lets('layout', 'layout2', '/zxc/:x').layout(() => <div>Hello</div>)
          export const c1 = root.lets('component', 'component1').loader(() => ({ ok: true })).component(() => <div>Hello</div>)
          export const c2 = root.lets('component', 'component2').component(() => <div>Hello</div>)
          export const p1 = l1.lets('page', 'page1', '/abc/:y').loader(() => ({ ok: true })).page(() => <div>Hello</div>)
          export const p2 = l2.lets('page', 'page2', '/abc/:y').page(() => <div>Hello</div>)
          export const l3 = l1.lets('layout', 'layout3', '/qqq/:y').loader(() => ({ ok: true })).layout(() => <div>Hello</div>)
          export const l4 = l2.lets('layout', 'layout4', '/qqq/:y').layout(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(17)
        const simplified = result.points.map((p) => p.simplify())
        expect(simplified[1]).toMatchObject({
          type: 'query',
          name: 'query1',
          endpoint: { method: 'POST', route: '/_point0/root/query/query1' },
        })
        expect(simplified[2]).toMatchObject({
          type: 'query',
          name: 'query2',
          endpoint: undefined,
        })
        expect(simplified[3]).toMatchObject({
          type: 'mutation',
          name: 'mutation1',
          endpoint: { method: 'POST', route: '/_point0/root/mutation/mutation1' },
        })
        expect(simplified[4]).toMatchObject({
          type: 'mutation',
          name: 'mutation2',
          endpoint: undefined,
        })
        expect(simplified[5]).toMatchObject({
          type: 'infiniteQuery',
          name: 'infiniteQuery1',
          endpoint: { method: 'POST', route: '/_point0/root/infiniteQuery/infiniteQuery1' },
        })
        expect(simplified[6]).toMatchObject({
          type: 'infiniteQuery',
          name: 'infiniteQuery2',
          endpoint: undefined,
        })
        expect(simplified[7]).toMatchObject({
          type: 'provider',
          name: 'provider1',
          endpoint: { method: 'POST', route: '/_point0/root/provider/provider1' },
        })
        expect(simplified[8]).toMatchObject({
          type: 'provider',
          name: 'provider2',
          endpoint: undefined,
        })
        expect(simplified[9]).toMatchObject({
          type: 'layout',
          name: 'layout1',
          endpoint: { method: 'GET', route: '/_point0/root/layout/layout1/api/:x/zxc/:x' },
        })
        expect(simplified[10]).toMatchObject({
          type: 'layout',
          name: 'layout2',
          endpoint: undefined,
        })
        expect(simplified[11]).toMatchObject({
          type: 'component',
          name: 'component1',
          endpoint: { method: 'POST', route: '/_point0/root/component/component1' },
        })
        expect(simplified[12]).toMatchObject({
          type: 'component',
          name: 'component2',
          endpoint: undefined,
        })
        expect(simplified[13]).toMatchObject({
          type: 'page',
          name: 'page1',
          endpoint: { method: 'GET', route: '/_point0/root/page/page1/api/:x/zxc/:x/abc/:y' },
        })
        // pages always has endpoint, becouse they can be called to get queryClientDehydratedState
        expect(simplified[14]).toMatchObject({
          type: 'page',
          name: 'page2',
          endpoint: { method: 'GET', route: '/_point0/root/page/page2/api/:x/zxc/:x/abc/:y' },
        })
        expect(simplified[15]).toMatchObject({
          type: 'layout',
          name: 'layout3',
          endpoint: { method: 'GET', route: '/_point0/root/layout/layout3/api/:x/zxc/:x/qqq/:y' },
        })
        expect(simplified[16]).toMatchObject({
          type: 'layout',
          name: 'layout4',
          endpoint: undefined,
        })
      }),
    )

    it.concurrent(
      'can recognize nested points in same file',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const rootV = Point0.lets('root', 'rootN').root()
                      export const rootV2 = rootV.lets('root', 'rootN2').root()
                      export const pageV = rootV2.lets('page', 'pageN', '/pageN').page(() => <div>Hello</div>)
                      export const layoutV = pageV.lets('layout', 'layoutN').layout(() => <div>Hello</div>)
                      export const componentV = layoutV.lets('component', 'componentN').component(() => <div>Hello</div>)
                      export const mutationV = componentV.lets('mutation', 'mutationN').loader().mutation()
                      export const queryV = mutationV.lets('query', 'queryN').loader().query()
                      export const infiniteQueryV = queryV.lets('infiniteQuery', 'infiniteQueryN').loader().infiniteQuery()
                      export const providerV = infiniteQueryV.lets('provider', 'providerN').loader().provider()
                      export const baseV = providerV.lets('base', 'baseN').base()
                      export const baseV2 = baseV.lets('base', 'baseN2').loader().base()
        `)
        const result = walker.collectPointsFromFile({ file: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(11)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'rootV',
          },
          {
            exportName: 'rootV2',
          },
          {
            exportName: 'pageV',
            file: f0.basename,
          },
          {
            exportName: 'layoutV',
          },
          {
            exportName: 'componentV',
            type: 'component',
            name: 'componentN',
          },
          {
            exportName: 'mutationV',
          },
          {
            exportName: 'queryV',
          },
          {
            exportName: 'infiniteQueryV',
          },
          {
            exportName: 'providerV',
          },
          {
            exportName: 'baseV',
          },
          {
            exportName: 'baseV2',
          },
        ])

        const parents5 = walker.collectParentPointsByPoint({ point: result.points[5] })
        expect(parents5.errors).toHaveLength(0)
        expect(parents5.parents).toHaveLength(5)
        expect(parents5.parents.map((p) => p.extraSimplify())).toMatchObject([
          {
            name: 'componentN',
          },
          {
            name: 'layoutN',
          },
          {
            name: 'pageN',
          },
          {
            name: 'rootN2',
          },
          {
            name: 'rootN',
          },
        ])
      }),
    )

    it.concurrent(
      'can recognize nested points in different files',
      helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const rootV = Point0.lets('root', 'rootN').root()                      
        `)
        await f1.write(`import {rootV} from '${f0.importpath}'
                      export const rootV2 = rootV.lets('root', 'rootN2').root()
        `)
        await f2.write(`import {rootV2} from '${f1.importpath}'
                      export const pageV = rootV2.lets('page', 'pageN', '/pageN').page(() => <div>Hello</div>)
        `)
        await f3.write(`import {pageV} from '${f2.importpath}'
                      export const layoutV = pageV.lets('layout', 'layoutN').layout(() => <div>Hello</div>)
        `)
        await f4.write(`import {layoutV} from '${f3.importpath}'
                      export const componentV = layoutV.lets('component', 'componentN').component(() => <div>Hello</div>)
        `)
        await f5.write(`import {componentV} from '${f4.importpath}'
                      export const mutationV = componentV.lets('mutation', 'mutationN').loader().mutation()
        `)
        await f6.write(`import {mutationV} from '${f5.importpath}'
                      export const queryV = mutationV.lets('query', 'queryN').loader().query()
        `)
        await f7.write(`import {queryV} from '${f6.importpath}'
                      export const infiniteQueryV = queryV.lets('infiniteQuery', 'infiniteQueryN').loader().infiniteQuery()
        `)
        await f8.write(`import {infiniteQueryV} from '${f7.importpath}'
                      export const providerV = infiniteQueryV.lets('provider', 'providerN').loader().provider()
        `)
        await f9.write(`import {providerV} from '${f8.importpath}'
                      export const baseV = providerV.lets('base', 'baseN').base()
        `)
        await f10.write(`import {baseV} from '${f9.importpath}'
                      export const baseV2 = baseV.lets('base', 'baseN2').loader().base()
        `)
        const result = walker.collectPointsFromFile({ file: f9.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'baseV',
            file: f9.basename,
            type: 'base',
            name: 'baseN',
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(9)
        expect(parents0.parents.map((p) => p.extraSimplify())).toMatchObject([
          {
            name: 'providerN',
          },
          {
            name: 'infiniteQueryN',
          },
          {
            name: 'queryN',
          },
          {
            name: 'mutationN',
          },
          {
            name: 'componentN',
          },
          {
            name: 'layoutN',
          },
          {
            name: 'pageN',
          },
          {
            name: 'rootN2',
          },
          {
            name: 'rootN',
          },
        ])
      }),
    )

    it.concurrent(
      'can recognize nested points in different files with chaotic sugar lets calls',
      helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const rootNRoot = Point0.lets.root().root()                      
        `)
        await f1.write(`import {rootNRoot} from '${f0.importpath}'
                      export const rootV2 = rootNRoot.lets('root', 'rootN2').root()
        `)
        await f2.write(`import {rootV2} from '${f1.importpath}'
                      export const pageV = rootV2.lets('page', 'pageN', '/pageN').page(() => <div>Hello</div>)
        `)
        await f3.write(`import {pageV} from '${f2.importpath}'
                      export const layoutNLayout = pageV.lets.layout().layout(() => <div>Hello</div>)
        `)
        await f4.write(`import {layoutNLayout} from '${f3.importpath}'
                      export const componentNComponent = layoutNLayout.lets.component().component(() => <div>Hello</div>)
        `)
        await f5.write(`import {componentNComponent} from '${f4.importpath}'
                      export const mutationV = componentNComponent.lets('mutation', 'mutationN').loader().mutation()
        `)
        await f6.write(`import {mutationV} from '${f5.importpath}'
                      export const queryV = mutationV.lets('query', 'queryN').loader().query()
        `)
        await f7.write(`import {queryV} from '${f6.importpath}'
                      export const infiniteQueryV = queryV.lets('infiniteQuery', 'infiniteQueryN').loader().infiniteQuery()
        `)
        await f8.write(`import {infiniteQueryV} from '${f7.importpath}'
                      export const providerV = infiniteQueryV.lets('provider', 'providerN').loader().provider()
        `)
        await f9.write(`import {providerV} from '${f8.importpath}'
                      export const baseV = providerV.lets('base', 'baseN').base()
        `)
        await f10.write(`import {baseV} from '${f9.importpath}'
                      export const baseV2 = baseV.lets('base', 'baseN2').loader().base()
        `)
        const result = walker.collectPointsFromFile({ file: f9.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'baseV',
            file: f9.basename,
            type: 'base',
            name: 'baseN',
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(9)
        expect(parents0.parents.map((p) => p.extraSimplify())).toMatchObject([
          {
            name: 'providerN',
          },
          {
            name: 'infiniteQueryN',
          },
          {
            name: 'queryN',
          },
          {
            name: 'mutationN',
          },
          {
            name: 'componentN',
          },
          {
            name: 'layoutN',
          },
          {
            name: 'pageN',
          },
          {
            name: 'rootN2',
          },
          {
            name: 'rootN',
          },
        ])
      }),
    )

    it.concurrent(
      'can recognize nested points in different files, when base was reexported',
      helper(async ({ files: [f0, f1, f2], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').root()                      
        `)
        await f1.write(`export {root} from '${f0.importpath}'
        `)
        await f2.write(`import {root} from '${f1.importpath}'
                      export const page = root.lets('page', 'page', '/page').page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(1)
        expect(parents0.parents[0].simplify()).toMatchObject({
          name: 'root',
        })
      }),
    )

    it.concurrent(
      'can recognize nested points in different files, when base was reexported renamed',
      helper(async ({ files: [f0, f1, f2], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').root()                      
        `)
        await f1.write(`export {root as root2} from '${f0.importpath}'
        `)
        await f2.write(`import {root2} from '${f1.importpath}'
                      export const page = root2.lets('page', 'page', '/page').page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(1)
        expect(parents0.parents.map((p) => p.extraSimplify())).toMatchObject([
          {
            name: 'root',
          },
        ])
      }),
    )

    it.concurrent(
      'can recognize nested points in different files, when base was imported, renamed, exported',
      helper(async ({ files: [f0, f1, f2], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').root()                      
        `)
        await f1.write(`import {root} from '${f0.importpath}'
                        export const root2 = root
        `)
        await f2.write(`import {root2} from '${f1.importpath}'
                      export const page = root2.lets('page', 'page', '/page').page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(1)
        expect(parents0.parents[0].simplify()).toMatchObject({
          name: 'root',
        })
      }),
    )

    it.concurrent(
      'can recognize nested points in different files, when base was imported, renamed twice, exported',
      helper(async ({ files: [f0, f1, f2], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').ctx({}).loader(() => ({})).root()                      
        `)
        await f1.write(`import {root} from '${f0.importpath}'
                        export const root2 = root
                        export const root3 = root2
        `)
        await f2.write(`import {root3} from '${f1.importpath}'
                      export const page = root3.lets('page', 'page', '/page').ctx({}).clientLoader(() => ({})).page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(1)
        expect(result.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            selfMethods: [
              {
                index: 0,
                name: 'ctx',
              },
              {
                index: 1,
                name: 'clientLoader',
              },
              {
                index: 2,
                name: 'page',
              },
            ],
            chainMethods: [
              {
                index: 0,
                chainIndex: 0,
                name: 'ctx',
                point: 'root',
              },
              {
                index: 1,
                chainIndex: 1,
                name: 'loader',
                point: 'root',
              },
              {
                index: 2,
                chainIndex: 2,
                name: 'root',
                point: 'root',
              },
              {
                index: 0,
                chainIndex: 3,
                name: 'ctx',
                point: 'page',
              },
              {
                index: 1,
                chainIndex: 4,
                name: 'clientLoader',
                point: 'page',
              },
              {
                index: 2,
                chainIndex: 5,
                name: 'page',
                point: 'page',
              },
            ],
          },
        ])

        const parents0 = walker.collectParentPointsByPoint({ point: result.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(1)
        expect(parents0.parents[0].extraSimplify()).toMatchObject({
          name: 'root',
        })
      }),
    )

    // it.concurrent(
    //   'can parse files in parallel reusing cache',
    //   helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
    //     await f0.write(`import {Point0} from '@point0/core'
    //                   export const rootV = Point0.lets('root', 'rootN').root()
    //     `)
    //     await f1.write(`import {rootV} from '${f0.importpath}'
    //                   export const rootV2 = rootV.lets('root', 'rootN2').root()
    //     `)
    //     await f2.write(`import {rootV2} from '${f1.importpath}'
    //                   export const pageV = rootV2.lets('page', 'pageN', '/pageN').page(() => <div>Hello</div>)
    //     `)
    //     await f3.write(`import {pageV} from '${f2.importpath}'
    //                   export const layoutV = pageV.lets('layout', 'layoutN').layout(() => <div>Hello</div>)
    //     `)
    //     await f4.write(`import {layoutV} from '${f3.importpath}'
    //                   export const componentV = layoutV.lets('component', 'componentN').component(() => <div>Hello</div>)
    //     `)
    //     await f5.write(`import {componentV} from '${f4.importpath}'
    //                   export const mutationV = componentV.lets('mutation', 'mutationN').loader().mutation()
    //     `)
    //     await f6.write(`import {mutationV} from '${f5.importpath}'
    //                   export const queryV = mutationV.lets('query', 'queryN').loader().query()
    //     `)
    //     await f7.write(`import {queryV} from '${f6.importpath}'
    //                   export const infiniteQueryV = queryV.lets('infiniteQuery', 'infiniteQueryN').loader().infiniteQuery()
    //     `)
    //     await f8.write(`import {infiniteQueryV} from '${f7.importpath}'
    //                   export const providerV = infiniteQueryV.lets('provider', 'providerN').loader().provider()
    //     `)
    //     await f9.write(`import {providerV} from '${f8.importpath}'
    //                   export const baseV = providerV.lets('base', 'baseN').base()
    //     `)
    //     await f10.write(`import {baseV} from '${f9.importpath}'
    //                   export const baseV2 = baseV.lets('base', 'baseN2').loader().base()
    //     `)
    //     await walker.readManyAsync({
    //       files: [
    //         f5.path,
    //         f0.path,
    //         f1.path,
    //         f2.path,
    //         f3.path,
    //         f4.path,
    //         f5.path,
    //         f5.path,
    //         f5.path,
    //         f5.path,
    //         f5.path,
    //         f5.path,
    //         f6.path,
    //         f7.path,
    //         f8.path,
    //         f9.path,
    //         f10.path,
    //         f5.path,
    //       ],
    //       fresh: false,
    //     })
    //     const results = [
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f0.path }),
    //       walker.collectPointsFromFile({ file: f1.path }),
    //       walker.collectPointsFromFile({ file: f2.path }),
    //       walker.collectPointsFromFile({ file: f3.path }),
    //       walker.collectPointsFromFile({ file: f4.path }),
    //       // one file multiple times
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //       walker.collectPointsFromFile({ file: f6.path }),
    //       walker.collectPointsFromFile({ file: f7.path }),
    //       walker.collectPointsFromFile({ file: f8.path }),
    //       walker.collectPointsFromFile({ file: f9.path }),
    //       walker.collectPointsFromFile({ file: f10.path }),
    //       walker.collectPointsFromFile({ file: f5.path }),
    //     ]
    //     const resultFirst = results[0]
    //     const resultLast = results[results.length - 1]
    //     expect(resultFirst.errors).toHaveLength(0)
    //     expect(resultFirst.points).toHaveLength(1)
    //     expect(resultFirst.points.map((p) => p.simplify())).toMatchObject([
    //       {
    //         exportName: 'mutationV',
    //         type: 'mutation',
    //         name: 'mutationN',
    //       },
    //     ])
    //     expect(resultFirst.points[0].simplify()).toMatchObject(resultLast.points[0].simplify())

    //     const parents0 = walker.collectParentPointsByPoint({ point: resultFirst.points[0] })
    //     expect(parents0.errors).toHaveLength(0)
    //     expect(parents0.parents).toHaveLength(5)
    //     expect(parents0.parents.map((p) => p.extraSimplify())).toMatchObject([
    //       {
    //         name: 'componentN',
    //       },
    //       {
    //         name: 'layoutN',
    //       },
    //       {
    //         name: 'pageN',
    //       },
    //       {
    //         name: 'rootN2',
    //       },
    //       {
    //         name: 'rootN',
    //       },
    //     ])
    //   }),
    // )
  })

  it.concurrent(
    'not stuck in loop when points references to itself in current file',
    helper(async ({ files: [f0], walker }) => {
      await f0.write(`import {Point0} from '@point0/core'
                    export const root1 = Point0.lets('root', 'root1').root()  
                    export const root2 = root2.lets('root', 'root2').root()                     
      `)
      const result = walker.collectPointsFromFile({ file: f0.path })
      const selfReferencedPoint = result.points.find((p) => p.name === 'root2')
      assert(selfReferencedPoint)
      expect(selfReferencedPoint.valid).toBe(false)
      expect(selfReferencedPoint.errors.length).toBe(2)
      const error1 = selfReferencedPoint.errors[0]
      assert(error1 instanceof Error)
      expect(error1.message).toContain('Circular parent relation detected while resolving point chain at')
      const error2 = selfReferencedPoint.errors[1]
      assert(error2 instanceof Error)
      expect(error2.message).toContain('Earliest point is not related to Point0')
    }),
  )

  it.concurrent(
    'not stuck in loop when points bases references to itself in different files',
    helper(async ({ files: [f0, f1, f2], walker }) => {
      await f0.write(`import {Point0} from '@point0/core'
                    export const root1 = Point0.lets('root', 'root1').root()                      
      `)
      await f1.write(`import {root1} from '${f0.importpath}'
                    import {root3} from '${f2.importpath}'
                    export const root2 = root3.lets('root', 'root2').root()
      `)
      await f2.write(`import {root2} from '${f1.importpath}'
                    export const root3 = root2.lets('root', 'root3').root()
      `)
      const result = walker.collectPointsFromFile({ file: f2.path })
      expect(result.points).toHaveLength(1)
      expect(result.points[0].name).toBe('root3')
      expect(result.points[0].valid).toBe(false)
      expect(result.points[0].errors.length).toBe(2)
      const error1 = result.points[0].errors[0]
      assert(error1 instanceof Error)
      expect(error1.message).toContain('Circular parent relation detected while resolving point chain at')
      const error2 = result.points[0].errors[1]
      assert(error2 instanceof Error)
      expect(error2.message).toContain('Earliest point is not related to Point0')
    }),
  )
})
