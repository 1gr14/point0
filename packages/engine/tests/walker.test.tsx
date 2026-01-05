import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { ParsedAstPoint } from '../src/walker.js'
import { Walker } from '../src/walker.js'
import { Route0, Routes } from '@devp0nt/route0'

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

  describe('Walker#getAstPointsFromFile()', () => {
    it(
      'can recognize root point in current file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
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

    it(
      'can recognize page point in current file, when root point in same file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
                          export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
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
    it(
      'can recognize page point in current file, when root point in another file',
      helper(async ({ files: [file0, file1], walker }) => {
        await file0.write(`import {Point0} from '@point0/core'
                        export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        await file1.write(`import {myrootvariable} from '${file0.importpath}'
                        export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file1.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f0.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f9.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f2.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f2.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f2.path })
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
        const result = await walker.getAstPointsFromFile({ fileAbs: f2.path })
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

    it(
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
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f0.path }),
          walker.getAstPointsFromFile({ fileAbs: f1.path }),
          walker.getAstPointsFromFile({ fileAbs: f2.path }),
          walker.getAstPointsFromFile({ fileAbs: f3.path }),
          walker.getAstPointsFromFile({ fileAbs: f4.path }),
          // one file multiple times
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
          walker.getAstPointsFromFile({ fileAbs: f6.path }),
          walker.getAstPointsFromFile({ fileAbs: f7.path }),
          walker.getAstPointsFromFile({ fileAbs: f8.path }),
          walker.getAstPointsFromFile({ fileAbs: f9.path }),
          walker.getAstPointsFromFile({ fileAbs: f10.path }),
          walker.getAstPointsFromFile({ fileAbs: f5.path }),
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

  describe('AstPoint#parse()', () => {
    const fix = (parsed: ParsedAstPoint) => {
      return {
        ...parsed,
        route: parsed.route ? parsed.route.definition : undefined,
      }
    }
    it(
      'root point',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints[0].parse()
        expect(parsed).toMatchObject({
          valid: true,
          scope: 'myroot',
          scopes: ['myroot'],
          type: 'root',
          name: 'myroot',
          exportName: 'myrootvariable',
          route: undefined,
          polh: false,
          layouts: [],
          pos: {
            line: 2,
            column: 30,
          },
          errors: [],
        })
      }),
    )

    it(
      'page point',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints[1].parse()
        expect(fix(parsed)).toMatchObject({
          valid: true,
          scope: 'myroot',
          type: 'page',
          name: 'mypage',
          exportName: 'mypagevariable',
          route: '/mypage',
          polh: false,
          layouts: [],
          pos: {
            line: 3,
            column: 30,
          },
          errors: [],
        })
      }),
    )

    const fix1 = (parsed: ParsedAstPoint) => {
      return {
        valid: parsed.valid,
        name: parsed.name,
        route: parsed.route ? parsed.route.definition : undefined,
      }
    }

    it(
      'page point with first level route',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
const routes = Routes.create({
  r5: Route0.create('/r5'),
  r6: Route0.create('/r6'),
})
export const p1 = myrootvariable.lets('page', 'p1', '/').page(() => <div>Hello</div>)
export const p2 = myrootvariable.lets('page', 'p2', 'r2').page(() => <div>Hello</div>)
export const p3 = myrootvariable.lets('page', 'p3', '/r3').page(() => <div>Hello</div>)
export const p4 = myrootvariable.lets('page', 'p4', Route0.create('/r4')).page(() => <div>Hello</div>)
export const p5 = myrootvariable.lets('page', 'p5', routes.r5).page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'p1',
          route: '/',
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p2',
          route: '/r2',
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p3',
          route: '/r3',
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p4',
          route: '/r4',
        })
        expect(parsed[4]).toMatchObject({
          valid: true,
          name: 'p5',
          route: '/r5',
        })
      }),
    )

    it(
      'page point with deep level route',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const l1 = myrootvariable.lets('layout', 'l1', '/x').layout()
export const l2 = l1.lets('layout', 'l2').layout()
const routes = Routes.create({
  r5: Route0.create('/r5'),
  r6: Route0.create('/r6'),
})
export const p1 = l2.lets('page', 'p1', '/').page(() => <div>Hello</div>)
export const p2 = l2.lets('page', 'p2', 'r2').page(() => <div>Hello</div>)
export const p3 = l2.lets('page', 'p3', '/r3').page(() => <div>Hello</div>)
export const p4 = l2.lets('page', 'p4', Route0.create('/r4')).page(() => <div>Hello</div>)
export const p5 = l2.lets('page', 'p5', routes.r5).page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'p1',
          route: '/x',
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p2',
          route: '/x/r2',
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p3',
          route: '/x/r3',
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p4',
          route: '/r4',
        })
        expect(parsed[4]).toMatchObject({
          valid: true,
          name: 'p5',
          route: '/r5',
        })
      }),
    )

    it(
      'parse page point with very deep level route',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const l1 = myrootvariable.lets('layout', 'l1', '/x').layout()
export const l2 = l1.lets('layout', 'l2').layout()
export const b2 = l2.lets('base', 'b2').base()
export const l3 = b2.lets('layout', 'l3', Route0.create('/l3')).layout()
export const l4 = l3.lets('layout', 'l4').layout()
export const l5 = l4.lets('layout', 'l5', 'o/k').layout()
export const l6 = l5.lets('layout', 'l6', 'l').layout()
const routes = Routes.create({
  r5: Route0.create('/r5'),
  r6: Route0.create('/r6'),
})
export const p1 = l6.lets('page', 'p1', '/').page(() => <div>Hello</div>)
export const p2 = l6.lets('page', 'p2', 'r2').page(() => <div>Hello</div>)
export const p3 = l6.lets('page', 'p3', '/r3').page(() => <div>Hello</div>)
export const p4 = l6.lets('page', 'p4', Route0.create('/r4')).page(() => <div>Hello</div>)
export const p5 = l6.lets('page', 'p5', routes.r5).page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'p1',
          route: '/l3/o/k/l',
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p2',
          route: '/l3/o/k/l/r2',
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p3',
          route: '/l3/o/k/l/r3',
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p4',
          route: '/r4',
        })
        expect(parsed[4]).toMatchObject({
          valid: true,
          name: 'p5',
          route: '/r5',
        })
      }),
    )

    const fix2 = (parsed: ParsedAstPoint) => {
      return {
        valid: parsed.valid,
        name: parsed.name,
        layouts: parsed.layouts,
      }
    }

    it(
      'page point layouts',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const l1 = myrootvariable.lets('layout', 'l1', '/x').layout()
export const l2 = l1.lets('layout', 'l2').layout()
export const b2 = l2.lets('base', 'b2').base()
export const l3 = b2.lets('layout', 'l3').layout()
export const p0 = myrootvariable.lets('page', 'p0', '/').page(() => <div>Hello</div>)
export const p1 = l1.lets('page', 'p1', '/').page(() => <div>Hello</div>)
export const p2 = l2.lets('page', 'p2', 'r2').page(() => <div>Hello</div>)
export const p3 = l3.lets('page', 'p3', '/r3').page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix2(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'p0',
          layouts: [],
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p1',
          layouts: ['l1'],
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p2',
          layouts: ['l1', 'l2'],
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p3',
          layouts: ['l1', 'l2', 'l3'],
        })
      }),
    )

    it(
      'layout point layouts',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const l1 = myrootvariable.lets('layout', 'l1', '/x').layout()
export const l2 = l1.lets('layout', 'l2').layout()
export const b2 = l2.lets('base', 'b2').base()
export const l3 = b2.lets('layout', 'l3').layout()
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'layout').map((p) => fix2(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'l1',
          layouts: [],
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'l2',
          layouts: ['l1'],
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'l3',
          layouts: ['l1', 'l2'],
        })
      }),
    )

    const fix3 = (parsed: ParsedAstPoint) => {
      return {
        valid: parsed.valid,
        name: parsed.name,
        polh: parsed.polh,
      }
    }

    it(
      'page point prefetchOnLinkHover (polh)',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').prefetchOnLinkHover(true).root()
export const p1 = root.lets('page', 'p1', '/').prefetchOnLinkHover(false).page(() => <div>Hello</div>)
export const p2 = p1.lets('page', 'p2', 'r2').page(() => <div>Hello</div>)
export const p3 = p2.lets('page', 'p3', '/r3').prefetchOnLinkHover(100).page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.map((p) => fix3(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'root',
          polh: true,
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p1',
          polh: false,
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p2',
          polh: false,
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p3',
          polh: 100,
        })
      }),
    )

    it(
      'error when last called method name does not match point type',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const root0 = Point0.lets('root', 'root0').prefetchOnLinkHover(true)
export const root1 = Point0.lets('root', 'root1')
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(2)

        const parsed0 = result.astPoints[0].parse()
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(
          `Last called method name 'prefetchOnLinkHover' does not match point type 'root'. Please, use .root() in end of point chain`,
        )

        const parsed1 = result.astPoints[1].parse()
        expect(parsed1.valid).toBe(false)
        expect(parsed1.errors).toHaveLength(1)
        expect(parsed1.name).toBe('root1')
        expect((parsed1.errors[0] as Error).message).toBe(
          `Last called method name 'undefined' does not match point type 'root'. Please, use .root() in end of point chain`,
        )
      }),
    )

    const fix4 = (parsed: ParsedAstPoint) => {
      return {
        valid: parsed.valid,
        name: parsed.name,
        scope: parsed.scope,
        scopes: parsed.scopes,
      }
    }

    it(
      'point scopes',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root0 = Point0.lets('root', 'root0').root()
export const root1 = root0.lets('root', 'root1').root()
export const page0 = root0.lets('page', 'page0', '/').page(() => <div>Hello</div>)
export const page1 = root1.lets('page', 'page1', 'r1').page(() => <div>Hello</div>)
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.map((p) => fix4(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'root0',
          scope: 'root0',
          scopes: ['root0'],
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'root1',
          scope: 'root1',
          scopes: ['root1', 'root0'],
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'page0',
          scope: 'root0',
          scopes: ['root0'],
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'page1',
          scope: 'root1',
          scopes: ['root1', 'root0'],
        })
      }),
    )

    it(
      'error when point not exported',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          cwd: tempDir,
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
const root0 = Point0.lets('root', 'root0').root()
const page0 = root0.lets('page', 'page0', '/').page(() => <div>Hello</div>) 
        `)
        const result = await walker.getAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(2)

        const parsed0 = result.astPoints[0].parse()
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)

        const parsed1 = result.astPoints[1].parse()
        expect(parsed1.valid).toBe(false)
        expect(parsed1.errors).toHaveLength(1)
        expect((parsed1.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)
      }),
    )
  })
})
