import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/walker')

const createRandomFile = () => {
  const basename = Math.random().toString(36).substring(2, 15)
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), { path, basename, importpath })
}

const helper = (callback: ({ files, walker }: { files: TestFile[]; walker: Walker }) => any, deleteFiles = true) => {
  return async () => {
    const walker = new Walker({ cwd: tempDir })
    const files = Array.from({ length: 11 }, createRandomFile)
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

describe('walker', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe('parsePointsFromFile', () => {
    it(
      'can recognize root point in current file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = await walker.parsePointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints[0].simplify()).toMatchObject({
          file: 'string',
          letsPosition: { line: expect.any(Number), column: expect.any(Number) },
          exportName: 'myrootvariable',
          lastCalledMethod: 'root',
          baseNodePath: true,
          letsNodePath: true,
          firstLetsArgNodePath: true,
          secondLetsArgNodePath: true,
          thirdLetsArgNodePath: false,
          isBasePoint0: true,
          parsedBasePoint: undefined,
        })
      }),
    )

    it(
      'can recognize page point in current file, when root point in same file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
                          export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.parsePointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(2)
        expect(result.parsedPoints[0].simplify()).toMatchObject({
          file: 'string',
          letsPosition: { line: expect.any(Number), column: expect.any(Number) },
          exportName: 'myrootvariable',
          lastCalledMethod: 'root',
          baseNodePath: true,
          letsNodePath: true,
          firstLetsArgNodePath: true,
          secondLetsArgNodePath: true,
          thirdLetsArgNodePath: false,
          isBasePoint0: true,
          parsedBasePoint: undefined,
        })
        expect(result.parsedPoints[1].simplify()).toMatchObject({
          file: 'string',
          letsPosition: { line: expect.any(Number), column: expect.any(Number) },
          exportName: 'mypagevariable',
          lastCalledMethod: 'page',
          baseNodePath: true,
          letsNodePath: true,
          firstLetsArgNodePath: true,
          secondLetsArgNodePath: true,
          thirdLetsArgNodePath: false,
          isBasePoint0: false,
          parsedBasePoint: {
            exportName: 'myrootvariable',
          },
        })
      }),
    )
    it(
      'can recognize page point in current file, when root point in another file',
      helper(async ({ files: [file0, file1], walker }) => {
        await file0.write(`import {Point0} from '@point0/core'
                        export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        await file1.write(`import {myrootvariable} from '${file0.importpath}'
                        export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.parsePointsFromFile({ fileAbs: file1.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints[0].simplify()).toMatchObject({
          file: 'string',
          letsPosition: { line: expect.any(Number), column: expect.any(Number) },
          exportName: 'mypagevariable',
          lastCalledMethod: 'page',
          baseNodePath: true,
          letsNodePath: true,
          firstLetsArgNodePath: true,
          secondLetsArgNodePath: true,
          thirdLetsArgNodePath: false,
          isBasePoint0: false,
          parsedBasePoint: {
            exportName: 'myrootvariable',
          },
        })
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f0.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(11)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'rootV',
          },
          {
            exportName: 'rootV2',
          },
          {
            exportName: 'pageV',
          },
          {
            exportName: 'layoutV',
          },
          {
            exportName: 'componentV',
          },
          {
            exportName: 'mutationV',
            parsedBasePoint: {
              exportName: 'componentV',
            },
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
            parsedBasePoint: {
              exportName: 'baseV',
            },
          },
        ])
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f9.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'baseV',
            parsedBasePoint: {
              exportName: 'providerV',
            },
          },
        ])
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parsedBasePoint: {
              exportName: 'root',
            },
          },
        ])
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parsedBasePoint: {
              exportName: 'root',
            },
          },
        ])
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parsedBasePoint: {
              exportName: 'root',
            },
          },
        ])
      }),
    )

    it(
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
        const result = await walker.parsePointsFromFile({ fileAbs: f2.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(result.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'page',
            parsedBasePoint: {
              exportName: 'root',
            },
          },
        ])
      }),
    )

    it.only(
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
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f0.path }),
          walker.parsePointsFromFile({ fileAbs: f1.path }),
          walker.parsePointsFromFile({ fileAbs: f2.path }),
          walker.parsePointsFromFile({ fileAbs: f3.path }),
          walker.parsePointsFromFile({ fileAbs: f4.path }),
          // one file multiple times
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
          walker.parsePointsFromFile({ fileAbs: f6.path }),
          walker.parsePointsFromFile({ fileAbs: f7.path }),
          walker.parsePointsFromFile({ fileAbs: f8.path }),
          walker.parsePointsFromFile({ fileAbs: f9.path }),
          walker.parsePointsFromFile({ fileAbs: f10.path }),
          walker.parsePointsFromFile({ fileAbs: f5.path }),
        ])
        const resultFirst = results[0]
        const resultLast = results[results.length - 1]
        expect(resultFirst.errors).toHaveLength(0)
        expect(resultFirst.parsedPoints).toHaveLength(1)
        expect(resultFirst.parsedPoints.map((p) => p.simplify())).toMatchObject([
          {
            exportName: 'mutationV',
            parsedBasePoint: {
              exportName: 'componentV',
            },
          },
        ])
        expect(resultFirst.parsedPoints[0].simplify()).toMatchObject(resultLast.parsedPoints[0].simplify())
      }),
    )

    //   it(
    //     'should collect points from file',
    //     helper(async ({ files: [file], walker }) => {
    //       await file.write(`import {Point0} from '@point0/core'
    // export const root = Point0.lets('root', 'server').root()
    // export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
    //     `)
    //       const points = await walker.collectPointsFromFile({ fileAbs: file.path })
    //       expect(points.collectedPoints).toMatchObject([
    //         {
    //           type: 'root',
    //           name: 'server',
    //         },
    //         {
    //           type: 'page',
    //           name: 'mypage',
    //         },
    //       ])
    //     }),
    //   )

    //   it(
    //     'should collect points from file, when root in another file',
    //     helper(async ({ files: [file0, file1], walker }) => {
    //       await file0.write(`import {Point0} from '@point0/core'
    // export const root = Point0.lets('root', 'server').root()
    //     `)
    //       await file1.write(`import {root} from '${file0.importpath}'
    // export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
    //     `)
    //       const points = await walker.collectPointsFromFile({ fileAbs: file1.path })
    //       expect(points.collectedPoints).toMatchObject([
    //         {
    //           type: 'page',
    //           name: 'mypage',
    //         },
    //       ])
    //     }),
    //   )
  })
})
