import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Collector } from '../src/compiler/collector.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/walker')

const prepareRandomFile = () => {
  const basename = crypto.randomUUID()
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), { path, basename, importpath })
}

const helper = (callback: ({ files, walker }: { files: TestFile[]; walker: Collector }) => any, deleteFiles = true) => {
  return async () => {
    const walker = new Collector({ cwd: tempDir })
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

  describe('#getAstPointsFromFile', () => {
    it.concurrent(
      'can recognize root point in current file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = await walker.collectPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints[0].simplify()).toMatchObject({
          file: file.basename,
          exportName: 'myrootvariable',
          baseNodePath: true,
          letsNodePath: true,
          isBasePoint0: true,
          parents: [],
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
        const result = await walker.collectPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(2)
        expect(result.astPoints[0].simplify()).toMatchObject({
          file: file.basename,
          pointType: 'root',
          pointName: 'myroot',
          exportName: 'myrootvariable',
          baseNodePath: true,
          letsNodePath: true,
          isBasePoint0: true,
          parents: [],
        })
        expect(result.astPoints[1].simplify()).toMatchObject({
          file: file.basename,
          pointType: 'page',
          pointName: 'mypage',
          exportName: 'mypagevariable',
          baseNodePath: true,
          letsNodePath: true,
          isBasePoint0: false,
          parents: [
            {
              exportName: 'myrootvariable',
            },
          ],
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
        const result = await walker.collectPointsFromFile({ fileAbs: file1.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints[0].simplify()).toMatchObject({
          file: file1.basename,
          pointType: 'page',
          pointName: 'mypage',
          exportName: 'mypagevariable',
          baseNodePath: true,
          letsNodePath: true,
          isBasePoint0: false,
          parents: [
            {
              exportName: 'myrootvariable',
            },
          ],
        })
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
        const result = await walker.collectPointsFromFile({ fileAbs: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(11)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
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
            pointType: 'component',
            pointName: 'componentN',
          },
          {
            exportName: 'mutationV',
            parents: [
              {
                exportName: 'componentV',
              },
              {
                exportName: 'layoutV',
              },
              {
                exportName: 'pageV',
              },
              {
                exportName: 'rootV2',
              },
              {
                exportName: 'rootV',
              },
            ],
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
        const result = await walker.collectPointsFromFile({ fileAbs: f9.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'baseV',
            file: f9.basename,
            pointType: 'base',
            pointName: 'baseN',
            parents: [
              {
                exportName: 'providerV',
              },
              {
                exportName: 'infiniteQueryV',
              },
              {
                exportName: 'queryV',
              },
              {
                exportName: 'mutationV',
              },
              {
                exportName: 'componentV',
              },
              {
                exportName: 'layoutV',
              },
              {
                exportName: 'pageV',
              },
              {
                exportName: 'rootV2',
              },
              {
                exportName: 'rootV',
              },
            ],
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
        const result = await walker.collectPointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parents: [
              {
                exportName: 'root',
              },
            ],
          },
        ])
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
        const result = await walker.collectPointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parents: [
              {
                exportName: 'root',
              },
            ],
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
        const result = await walker.collectPointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parents: [
              {
                exportName: 'root',
              },
            ],
          },
        ])
      }),
    )

    it.concurrent(
      'can recognize nested points in different files, when base was imported, renamed twice, exported',
      helper(async ({ files: [f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10], walker }) => {
        await f0.write(`import {Point0} from '@point0/core'
                      export const root = Point0.lets('root', 'root').root()                      
        `)
        await f1.write(`import {root} from '${f0.importpath}'
                        export const root2 = root
                        export const root3 = root2
        `)
        await f2.write(`import {root3} from '${f1.importpath}'
                      export const page = root3.lets('page', 'page').page(() => <div>Hello</div>)
        `)
        const result = await walker.collectPointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(1)
        expect(result.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parents: [
              {
                exportName: 'root',
              },
            ],
          },
        ])
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
        const results = await Promise.all([
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f0.path }),
          walker.collectPointsFromFile({ fileAbs: f1.path }),
          walker.collectPointsFromFile({ fileAbs: f2.path }),
          walker.collectPointsFromFile({ fileAbs: f3.path }),
          walker.collectPointsFromFile({ fileAbs: f4.path }),
          // one file multiple times
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
          walker.collectPointsFromFile({ fileAbs: f6.path }),
          walker.collectPointsFromFile({ fileAbs: f7.path }),
          walker.collectPointsFromFile({ fileAbs: f8.path }),
          walker.collectPointsFromFile({ fileAbs: f9.path }),
          walker.collectPointsFromFile({ fileAbs: f10.path }),
          walker.collectPointsFromFile({ fileAbs: f5.path }),
        ])
        const resultFirst = results[0]
        const resultLast = results[results.length - 1]
        expect(resultFirst.errors).toHaveLength(0)
        expect(resultFirst.astPoints).toHaveLength(1)
        expect(resultFirst.astPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'mutationV',
            pointType: 'mutation',
            pointName: 'mutationN',
            parents: [
              {
                exportName: 'componentV',
              },
              {
                exportName: 'layoutV',
              },
              {
                exportName: 'pageV',
              },
              {
                exportName: 'rootV2',
              },
              {
                exportName: 'rootV',
              },
            ],
          },
        ])
        expect(resultFirst.astPoints[0].simplify()).toMatchObject(resultLast.astPoints[0].simplify())
      }),
    )
  })
})
