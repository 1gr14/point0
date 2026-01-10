import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'

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
    write: async (content: string | (() => any)) => await Bun.write(path, await toText(content)),
  })
}

const helper = (callback: ({ files, walker }: { files: TestFile[]; walker: Walker }) => any, deleteFiles = true) => {
  return async () => {
    const walker = new Walker({ routes: undefined })
    const files = Array.from({ length: 11 }, prepareRandomFile)
    try {
      await callback({
        files,
        walker,
      })
    } finally {
      await Promise.allSettled(
        files.map(async (file) => {
          if (deleteFiles) await file.delete()
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
                          export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
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
      'can recognize page point in current file, when root point in another file',
      helper(async ({ files: [file0, file1], walker }) => {
        await file0.write(`import {Point0} from '@point0/core'
                        export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        await file1.write(`import {myrootvariable} from '${file0.importpath}'
                        export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
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

    it.only(
      'can recognize flat points in same file with single parent',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
          export const root = Point0.lets('root', 'root').root()
          export const page = root.lets('page', 'home', '/').page(() => <div>MY_CLIENT_SERVER</div>)
          export const page1 = root.lets('page1', 'page1', '/1').clientLoader(() => ({x:1})).page(() => <div>MY_CLIENT_ONLY</div>)
          export const page2 = root.lets('page2', 'page2', '/2').ssr(false).page(() => <div>MY_CLIENT_ONLY</div>)
          export const page3 = root.lets('page3', 'page3', '/3').page(() => (env.target.is.server ? <div>MY_SERVER_WRONG_HOPE</div> : <div>MY_CLIENT_WRONG_HOPE</div>))
          export const page4 = root.lets('page4', 'page4', '/4').page(() => { if (env.target.is.server) { return <div>MY_SERVER_ONLY</div> } else { return <div>MY_CLIENT_ONLY</div> } })
          export const page5 = root.lets('page5', 'page5', '/5').loader(() => { console.info('MY_SERVER_ONLY'); return {y:2} }).page(() => <div>MY_CLIENT_SERVER</div>)
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
      'can recognize nested points in same file',
      helper(async ({ files: [f0], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const rootV = Point0.lets('root', 'rootN').root()
                      export const rootV2 = rootV.lets('root', 'rootN2').root()
                      export const pageV = rootV2.lets('page', 'pageN').page(() => <div>Hello</div>)
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
                      export const pageV = rootV2.lets('page', 'pageN').page(() => <div>Hello</div>)
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
      'can recognize nested points in different files, when base was reexported',
      helper(async ({ files: [f0, f1, f2], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').root()                      
        `)
        await f1.write(`export {root} from '${f0.importpath}'
        `)
        await f2.write(`import {root} from '${f1.importpath}'
                      export const page = root.lets('page', 'page').page(() => <div>Hello</div>)
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
                      export const page = root2.lets('page', 'page').page(() => <div>Hello</div>)
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
                      export const page = root2.lets('page', 'page').page(() => <div>Hello</div>)
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
      helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').ctx({}).loader(() => ({})).root()                      
        `)
        await f1.write(`import {root} from '${f0.importpath}'
                        export const root2 = root
                        export const root3 = root2
        `)
        await f2.write(`import {root3} from '${f1.importpath}'
                      export const page = root3.lets('page', 'page').ctx({}).clientLoader(() => ({})).page(() => <div>Hello</div>)
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

    it.concurrent(
      'can parse files in parallel reusing cache',
      helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const rootV = Point0.lets('root', 'rootN').root()                      
        `)
        await f1.write(`import {rootV} from '${f0.importpath}'
                      export const rootV2 = rootV.lets('root', 'rootN2').root()
        `)
        await f2.write(`import {rootV2} from '${f1.importpath}'
                      export const pageV = rootV2.lets('page', 'pageN').page(() => <div>Hello</div>)
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
        await walker.readManyAsync({
          files: [
            f5.path,
            f0.path,
            f1.path,
            f2.path,
            f3.path,
            f4.path,
            f5.path,
            f5.path,
            f5.path,
            f5.path,
            f5.path,
            f5.path,
            f6.path,
            f7.path,
            f8.path,
            f9.path,
            f10.path,
            f5.path,
          ],
          fresh: false,
        })
        const results = [
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f0.path }),
          walker.collectPointsFromFile({ file: f1.path }),
          walker.collectPointsFromFile({ file: f2.path }),
          walker.collectPointsFromFile({ file: f3.path }),
          walker.collectPointsFromFile({ file: f4.path }),
          // one file multiple times
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f5.path }),
          walker.collectPointsFromFile({ file: f6.path }),
          walker.collectPointsFromFile({ file: f7.path }),
          walker.collectPointsFromFile({ file: f8.path }),
          walker.collectPointsFromFile({ file: f9.path }),
          walker.collectPointsFromFile({ file: f10.path }),
          walker.collectPointsFromFile({ file: f5.path }),
        ]
        const resultFirst = results[0]
        const resultLast = results[results.length - 1]
        expect(resultFirst.errors).toHaveLength(0)
        expect(resultFirst.points).toHaveLength(1)
        expect(resultFirst.points.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'mutationV',
            type: 'mutation',
            name: 'mutationN',
          },
        ])
        expect(resultFirst.points[0].simplify()).toMatchObject(resultLast.points[0].simplify())

        const parents0 = walker.collectParentPointsByPoint({ point: resultFirst.points[0] })
        expect(parents0.errors).toHaveLength(0)
        expect(parents0.parents).toHaveLength(5)
        expect(parents0.parents.map((p) => p.extraSimplify())).toMatchObject([
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
  })
})
