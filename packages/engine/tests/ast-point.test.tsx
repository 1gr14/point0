import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'
import { Route0, Routes } from '@devp0nt/route0'
import type { ParsedAstPoint } from '../src/ast-point.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/ast-point')

const createRandomFile = () => {
  const basename = crypto.randomUUID()
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

describe('AstPoint', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe('#parse', () => {
    const fix = (parsed: ParsedAstPoint) => {
      return {
        ...parsed,
        route: parsed.route ? parsed.route.definition : undefined,
      }
    }
    it.concurrent(
      'root point',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints[0].parsed
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

    it.concurrent(
      'page point',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
export const mypagevariable = myrootvariable.lets('page', 'mypage').z().x().c().page(() => <div>Hello</div>)
        `)
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints[1].parsed
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix1(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'page').map((p) => fix2(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.filter((p) => p.pointType === 'layout').map((p) => fix2(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.map((p) => fix3(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(2)

        const parsed0 = result.astPoints[0].parsed
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(
          `Last called method name 'prefetchOnLinkHover' does not match point type 'root'. Please, use .root() in end of point chain`,
        )

        const parsed1 = result.astPoints[1].parsed
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

    it.concurrent(
      'point scopes',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const root0 = Point0.lets('root', 'root0').root()
export const root1 = root0.lets('root', 'root1').root()
export const page0 = root0.lets('page', 'page0', '/').page(() => <div>Hello</div>)
export const page1 = root1.lets('page', 'page1', 'r1').page(() => <div>Hello</div>)
        `)
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.astPoints.map((p) => fix4(p.parsed))
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

    it.concurrent(
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
        const result = await walker.collectAstPointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.astPoints).toHaveLength(2)

        const parsed0 = result.astPoints[0].parsed
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)

        const parsed1 = result.astPoints[1].parsed
        expect(parsed1.valid).toBe(false)
        expect(parsed1.errors).toHaveLength(1)
        expect((parsed1.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)
      }),
    )
  })
})
