import { Route0, Routes } from '@devp0nt/route0'
import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'
import { toText } from './utils.js'
import type { CompilerPoint } from '../src/point.js'

type TestFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/point')

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

const helper = (callback: ({ files, walker }: { files: TestFile[]; walker: Walker }) => any, preserve = false) => {
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
          if (!preserve) await file.delete()
        }),
      )
    }
  }
}

describe('CompilerPoint', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe.concurrent('#parse', () => {
    const fix = (point: CompilerPoint) => {
      const simplified = point.simplify()
      return simplified
    }
    it.concurrent(
      'root point',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
export const myrootvariable = Point0.lets('root', 'myroot').root()
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[0].parse()
        expect(fix(parsed)).toMatchObject({
          file: expect.any(String),
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
          chainMethods: [
            {
              index: 0,
              name: 'root',
              point: 'myroot',
            },
          ],
          selfMethods: [
            {
              index: 0,
              name: 'root',
            },
          ],
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points[1].parse()
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

    const fix1 = (point: CompilerPoint) => {
      const simplified = point.simplify()
      return {
        valid: simplified.valid,
        name: simplified.name,
        route: simplified.route,
      }
    }

    it.concurrent(
      'page point with first level route',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page').map((p) => fix1(p.parse()))
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page').map((p) => fix1(p.parse()))
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
      'page point with very deep level route',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page')
        const fixed = parsed.map((p) => fix1(p))
        expect(fixed[0]).toMatchObject({
          valid: true,
          name: 'p1',
          route: '/l3/o/k/l',
        })
        expect(fixed[1]).toMatchObject({
          valid: true,
          name: 'p2',
          route: '/l3/o/k/l/r2',
        })
        expect(fixed[2]).toMatchObject({
          valid: true,
          name: 'p3',
          route: '/l3/o/k/l/r3',
        })
        expect(fixed[3]).toMatchObject({
          valid: true,
          name: 'p4',
          route: '/r4',
        })
        expect(fixed[4]).toMatchObject({
          valid: true,
          name: 'p5',
          route: '/r5',
        })
      }),
    )

    const fix2 = (point: CompilerPoint) => {
      return {
        valid: point.valid,
        name: point.name,
        layouts: point.layouts,
      }
    }

    it.concurrent(
      'page point layouts chained',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page').map((p) => fix2(p.parse()))
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
      'page point layouts cia .layout(layout)',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
export const p1 = myrootvariable.lets('page', 'p1', '/').layout(l1).page(() => <div>Hello</div>)
export const p2 = myrootvariable.lets('page', 'p2', 'r2').layout(l2).page(() => <div>Hello</div>)
export const p3 = myrootvariable.lets('page', 'p3', '/r3').layout(l3).page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page').map((p) => fix2(p.parse()))
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
      'page point layouts cia .layout(layout) and chained combined',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
export const p0 = l2.lets('page', 'p0', '/').layout(l3).page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'page').map((p) => fix2(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'p0',
          layouts: ['l1', 'l2', 'l3'],
        })
      }),
    )

    it.concurrent(
      'layout point layouts',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.filter((p) => p.type === 'layout').map((p) => fix2(p.parse()))
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

    const fix3 = (point: CompilerPoint) => {
      return {
        valid: point.valid,
        name: point.name,
        polh: point.polh,
        baseurl: point.baseurl,
      }
    }

    it.concurrent(
      'page point prefetchOnLinkHover (polh)',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.map((p) => fix3(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'root',
          polh: true,
          baseurl: undefined,
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p1',
          polh: false,
          baseurl: undefined,
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'p2',
          polh: false,
          baseurl: undefined,
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p3',
          polh: 100,
          baseurl: undefined,
        })
      }),
    )

    it.concurrent(
      'point baseurl',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
          routes: {
            myroot: Routes.create({
              r5: Route0.create('/r5'),
              r6: Route0.create('/r6'),
            }),
          },
        })
        await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').baseurl('http://localhost/').root()
export const p1 = root.lets('page', 'p1', '/').page(() => <div>Hello</div>)
export const root2 = root.lets('root', 'root2').baseurl(process.env.BASE_URL).root()
export const p2 = root2.lets('page', 'p2', '/').page(() => <div>Hello</div>)
export const root3 = root.lets('root', 'root3').baseurl(env.vars.BASE_URL).root()
export const p3 = root3.lets('page', 'p3', '/').page(() => <div>Hello</div>)
        `)
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.map((p) => fix3(p.parse()))
        expect(parsed[0]).toMatchObject({
          valid: true,
          name: 'root',
          baseurl: 'http://localhost/',
        })
        expect(parsed[1]).toMatchObject({
          valid: true,
          name: 'p1',
          baseurl: 'http://localhost/',
        })
        expect(parsed[2]).toMatchObject({
          valid: true,
          name: 'root2',
          baseurl: 'process.env.BASE_URL',
        })
        expect(parsed[3]).toMatchObject({
          valid: true,
          name: 'p2',
          baseurl: 'process.env.BASE_URL',
        })
        expect(parsed[4]).toMatchObject({
          valid: true,
          name: 'root3',
          baseurl: 'process.env.BASE_URL',
        })
        expect(parsed[5]).toMatchObject({
          valid: true,
          name: 'p3',
          baseurl: 'process.env.BASE_URL',
        })
      }),
    )

    it.concurrent(
      'error when last called method name does not match point type',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(2)

        const parsed0 = result.points[0].parse()
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(
          `Last called method name 'prefetchOnLinkHover' does not match point type 'root'. Please, use .root() in end of point chain`,
        )

        const parsed1 = result.points[1].parse()
        expect(parsed1.valid).toBe(false)
        expect(parsed1.errors).toHaveLength(1)
        expect(parsed1.name).toBe('root1')
        expect((parsed1.errors[0] as Error).message).toBe(
          `Last called method name 'undefined' does not match point type 'root'. Please, use .root() in end of point chain`,
        )
      }),
    )

    const fix4 = (point: CompilerPoint) => {
      return {
        valid: point.valid,
        name: point.name,
        scope: point.scope,
        scopes: point.scopes,
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        const parsed = result.points.map((p) => fix4(p.parse()))
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
          scopes: ['root0', 'root1'],
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
          scopes: ['root0', 'root1'],
        })
      }),
    )

    it.concurrent(
      'error when point not exported',
      helper(async ({ files: [file] }) => {
        const walker = new Walker({
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
        const result = walker.collectPointsFromFile({ file: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.points).toHaveLength(2)

        const parsed0 = result.points[0].parse()
        expect(parsed0.valid).toBe(false)
        expect(parsed0.errors).toHaveLength(1)
        expect((parsed0.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)

        const parsed1 = result.points[1].parse()
        expect(parsed1.valid).toBe(false)
        expect(parsed1.errors).toHaveLength(1)
        expect((parsed1.errors[0] as Error).message).toBe(`Point not exported. Please, add export to the point.`)
      }),
    )
  })

  describe('#shakeMethods', () => {
    describe('client', () => {
      it.concurrent(
        'removes ctx args',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').ctx(() => ({ a: 1 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').ctx().root()
            "
          `)
        }),
      )

      it.concurrent(
        'removes loader args if not boolean literal',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').loader(() => ({ b: 2 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').loader().root()
            "
          `)
        }),
      )

      it.concurrent(
        'keeps loader args if boolean literal',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').loader(true).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').loader(true).root()
            "
          `)
        }),
      )

      it.concurrent(
        'handles ctx and loader in chain',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').ctx(() => ({ a: 1 })).loader(() => ({ b: 2 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').ctx().loader().root()
            "
          `)
        }),
      )

      it.concurrent(
        'handles multiple ctx calls',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').ctx(() => ({ a: 1 })).ctx(() => ({ b: 2 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').ctx().ctx().root()
            "
          `)
        }),
      )

      it.concurrent(
        'handles loader with boolean literal and non-boolean',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').loader(true).loader(() => ({ b: 2 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').loader(true).loader().root()
            "
          `)
        }),
      )

      it.concurrent(
        'handles page point with ctx and loader',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'page', '/').ctx(() => ({ a: 1 })).loader(() => ({ b: 2 })).page(() => <div>Hello</div>)
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').root()
            export const page = root
              .lets('page', 'page', '/')
              .ctx()
              .loader()
              .page(() => <div>Hello</div>)
            "
          `)
        }),
      )

      it.concurrent(
        'correctly understand when it is underSsr',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'page', '/')
.iamNotUnderSsrByDefault()
.ssr(true)
.iamUnderSsr()
.ssr(false)
.iamNotUnderSsr()
.clientLoader(true)
.iamNotUnderSsr()
.ssr(true)
.iamUnderSsr()
.page(() => <div>Hello</div>)
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.shakeMethods({ target: 'client' })
          expect(point.chainMethods.map((m) => `${m.name}: underSsr=${m.underSsr ? 'true' : 'false'}`))
            .toMatchInlineSnapshot(`
            [
              "root: underSsr=false",
              "iamNotUnderSsrByDefault: underSsr=false",
              "ssr: underSsr=true",
              "iamUnderSsr: underSsr=true",
              "ssr: underSsr=false",
              "iamNotUnderSsr: underSsr=false",
              "clientLoader: underSsr=false",
              "iamNotUnderSsr: underSsr=false",
              "ssr: underSsr=true",
              "iamUnderSsr: underSsr=true",
              "page: underSsr=true",
            ]
          `)
        }),
      )

      it.concurrent(
        'correcttly prune rest for client',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
              export const root = Point0.lets('root', 'root').ssr(true).clientLoader(true).root()
              export const page = root.lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error(() => console.info('fake'))
              .layoutError(() => console.info('fake'))
              .pageError(() => console.info('fake'))
              .componentError(() => console.info('fake'))
              .layoutLoading(() => console.info('fake'))
              .pageLoading(() => console.info('fake'))
              .componentLoading(() => console.info('fake'))
              .loading(() => console.info('fake'))
              .wrapper(() => console.info('fake'))
              .outer(() => console.info('fake'))
              .scrollPosition(() => console.info('fake'))
              .scrollRestore(() => console.info('fake'))
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch(() => console.info('fake'))
              .prefetchOnLinkHover(() => console.info('fake'))
              .transformer(() => console.info('fake'))
              .ctx(() => console.info('fake'))
              .loader(() => console.info('fake'))
              .clientLoader(() => console.info('fake'))
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => console.info('fake'))
              .clientInput(() => console.info('fake'))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => console.info('fake'))
              .component(() => console.info('fake'))
              .layout(() => console.info('fake'))
              .provider(() => console.info('fake'))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()

        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.shakeMethods({ target: 'client' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .ssr(true)
              .clientLoader(true)
              .root()
            export const page = root
              .lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error(() => console.info('fake'))
              .layoutError(() => console.info('fake'))
              .pageError(() => console.info('fake'))
              .componentError(() => console.info('fake'))
              .layoutLoading(() => console.info('fake'))
              .pageLoading(() => console.info('fake'))
              .componentLoading(() => console.info('fake'))
              .loading(() => console.info('fake'))
              .wrapper(() => console.info('fake'))
              .outer(() => console.info('fake'))
              .scrollPosition(() => console.info('fake'))
              .scrollRestore(() => console.info('fake'))
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch(() => console.info('fake'))
              .prefetchOnLinkHover(() => console.info('fake'))
              .transformer(() => console.info('fake'))
              .ctx()
              .loader()
              .clientLoader(() => console.info('fake'))
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => ({}))
              .clientInput(() => console.info('fake'))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => console.info('fake'))
              .component(() => console.info('fake'))
              .layout(() => console.info('fake'))
              .provider(() => console.info('fake'))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()
            "
          `)
        }),
      )

      it.concurrent(
        'correcttly prune rest for server without ssr',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
              export const root = Point0.lets('root', 'root').ssr(false).clientLoader(true).root()
              export const page = root.lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error(() => console.info('fake'))
              .layoutError(() => console.info('fake'))
              .pageError(() => console.info('fake'))
              .componentError(() => console.info('fake'))
              .layoutLoading(() => console.info('fake'))
              .pageLoading(() => console.info('fake'))
              .componentLoading(() => console.info('fake'))
              .loading(() => console.info('fake'))
              .wrapper(() => console.info('fake'))
              .outer(() => console.info('fake'))
              .scrollPosition(() => console.info('fake'))
              .scrollRestore(() => console.info('fake'))
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch(() => console.info('fake'))
              .prefetchOnLinkHover(() => console.info('fake'))
              .transformer(() => console.info('fake'))
              .ctx(() => console.info('fake'))
              .loader(() => console.info('fake'))
              .clientLoader(() => console.info('fake'))
              .clientLoader(false)
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => console.info('fake'))
              .clientInput(() => console.info('fake'))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => console.info('fake'))
              .page({title: 'Fake'}, () => console.info('fake'))
              .component(() => console.info('fake'))
              .layout(() => console.info('fake'))
              .provider(() => console.info('fake'))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()

        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.shakeMethods({ target: 'server' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .ssr(false)
              .clientLoader(true)
              .root()
            export const page = root
              .lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error()
              .layoutError()
              .pageError()
              .componentError()
              .layoutLoading()
              .pageLoading()
              .componentLoading()
              .loading()
              .wrapper()
              .outer()
              .scrollPosition()
              .scrollRestore()
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch()
              .prefetchOnLinkHover()
              .transformer(() => console.info('fake'))
              .ctx(() => console.info('fake'))
              .loader(() => console.info('fake'))
              .clientLoader()
              .clientLoader(false)
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => console.info('fake'))
              .clientInput(() => ({}))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => null)
              .page({ title: 'Fake' }, () => null)
              .component()
              .layout()
              .provider(() => ({}))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()
            "
          `)
        }),
      )

      it.concurrent(
        'correcttly prune rest for server with ssr',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
              export const root = Point0.lets('root', 'root').ssr(true).clientLoader(true).root()
              export const page = root.lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error(() => console.info('fake'))
              .layoutError(() => console.info('fake'))
              .pageError(() => console.info('fake'))
              .componentError(() => console.info('fake'))
              .layoutLoading(() => console.info('fake'))
              .pageLoading(() => console.info('fake'))
              .componentLoading(() => console.info('fake'))
              .loading(() => console.info('fake'))
              .wrapper(() => console.info('fake'))
              .outer(() => console.info('fake'))
              .scrollPosition(() => console.info('fake'))
              .scrollRestore(() => console.info('fake'))
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch(() => console.info('fake'))
              .prefetchOnLinkHover(() => console.info('fake'))
              .transformer(() => console.info('fake'))
              .ctx(() => console.info('fake'))
              .loader(() => console.info('fake'))
              .clientLoader(() => console.info('fake'))
              .clientLoader(false)
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => console.info('fake'))
              .clientInput(() => ({}))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => console.info('fake'))
              .page({title: 'Fake'}, () => console.info('fake'))
              .component(() => console.info('fake'))
              .layout(() => console.info('fake'))
              .provider(() => console.info('fake'))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()

        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.shakeMethods({ target: 'server' })
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .ssr(true)
              .clientLoader(true)
              .root()
            export const page = root
              .lets('page', 'page', '/')
              .serverurl(() => console.info('fake'))
              .baseurl(() => console.info('fake'))
              .ssr(() => console.info('fake'))
              .mutationOptions(() => console.info('fake'))
              .queryOptions(() => console.info('fake'))
              .infiniteQueryOptions(() => console.info('fake'))
              .pageQueryOptions(() => console.info('fake'))
              .componentQueryOptions(() => console.info('fake'))
              .providerQueryOptions(() => console.info('fake'))
              .layoutQueryOptions(() => console.info('fake'))
              .fetchOptions(() => console.info('fake'))
              .error(() => console.info('fake'))
              .layoutError(() => console.info('fake'))
              .pageError(() => console.info('fake'))
              .componentError(() => console.info('fake'))
              .layoutLoading(() => console.info('fake'))
              .pageLoading(() => console.info('fake'))
              .componentLoading(() => console.info('fake'))
              .loading(() => console.info('fake'))
              .wrapper(() => console.info('fake'))
              .outer(() => console.info('fake'))
              .scrollPosition()
              .scrollRestore()
              .prefetchPolicy(() => console.info('fake'))
              .onPrefetch()
              .prefetchOnLinkHover()
              .transformer(() => console.info('fake'))
              .ctx(() => console.info('fake'))
              .loader(() => console.info('fake'))
              .clientLoader()
              .clientLoader(false)
              .mapper(() => console.info('fake'))
              .head(() => console.info('fake'))
              .props(() => console.info('fake'))
              .input(() => console.info('fake'))
              .clientInput(() => ({}))
              .combinedInput(() => console.info('fake'))
              .root(() => console.info('fake'))
              .base(() => console.info('fake'))
              .page(() => console.info('fake'))
              .page({ title: 'Fake' }, () => console.info('fake'))
              .component(() => console.info('fake'))
              .layout(() => console.info('fake'))
              .provider(() => console.info('fake'))
              .query(() => console.info('fake'))
              .infiniteQuery(() => console.info('fake'))
              .mutation(() => console.info('fake'))
              .page()
            "
          `)
        }),
      )
    })
  })

  describe('#addHmrFix', () => {
    describe('client', () => {
      it.concurrent(
        'adds HMR fix to root point',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.addHmrFix()
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .root()
              ._tail(() => {
                return null
              })
            "
          `)
        }),
      )

      it.concurrent(
        'adds HMR fix to page point without functional component',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'page', '/').page()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[1]
          point.addHmrFix()
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root').root()
            export const page = root
              .lets('page', 'page', '/')
              .page()
              ._tail(() => {
                return null
              })
            "
          `)
        }),
      )

      describe('external function extraction', () => {
        it.concurrent(
          'extracts wrapper/loading/error and page component arrows to external functions',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
function MySpecialComponent() {
  return <div>MySpecialComponent</div>
}
export const root = Point0.lets('root', 'root')
  .pageLoading(() => <div>Loading</div>)
  .pageError(() => <div>Error</div>)
  .layoutLoading(() => <div>Loading</div>)
  .layoutError(() => <div>Error</div>)
  .componentLoading(() => <div>Loading</div>)
  .componentError(() => <div>Error</div>)
  .loading(() => <div>Loading</div>)
  .loading(MySpecialComponent)
  .error(() => <div>Error</div>)
  .page(() => <div>Hello</div>)
  .root()
export const page = root
  .lets('page', 'home', '/')
  .wrapper(() => <div>Wrapper</div>)
  .loading(() => <div>Loading</div>)
  .error(() => <div>Error</div>)
  .page(() => <div>Hello</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const rootPoint = result.points[0]
            const pagePoint = result.points[1]
            pagePoint.addHmrFix()
            rootPoint.addHmrFix()
            expect(await pagePoint.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              function MySpecialComponent() {
                return <div>MySpecialComponent</div>
              }
              function RootRootPageLoading() {
                return <div>Loading</div>
              }
              function RootRootPageError() {
                return <div>Error</div>
              }
              function RootRootLayoutLoading() {
                return <div>Loading</div>
              }
              function RootRootLayoutError() {
                return <div>Error</div>
              }
              function RootRootComponentLoading() {
                return <div>Loading</div>
              }
              function RootRootComponentError() {
                return <div>Error</div>
              }
              function RootRootLoading() {
                return <div>Loading</div>
              }
              function RootRootError() {
                return <div>Error</div>
              }
              export const root = Point0.lets('root', 'root')
                .pageLoading(RootRootPageLoading)
                .pageError(RootRootPageError)
                .layoutLoading(RootRootLayoutLoading)
                .layoutError(RootRootLayoutError)
                .componentLoading(RootRootComponentLoading)
                .componentError(RootRootComponentError)
                .loading(RootRootLoading)
                .loading(MySpecialComponent)
                .error(RootRootError)
                .page(() => <div>Hello</div>)
                .root()
                ._tail(() => {
                  return null
                })
              function PageHomeWrapper() {
                return <div>Wrapper</div>
              }
              function PageHomeLoading() {
                return <div>Loading</div>
              }
              function PageHomeError() {
                return <div>Error</div>
              }
              function PageHome() {
                return <div>Hello</div>
              }
              export const page = root
                .lets('page', 'home', '/')
                .wrapper(PageHomeWrapper)
                .loading(PageHomeLoading)
                .error(PageHomeError)
                .page(PageHome)
              "
            `)
            expect(pagePoint.file.modified).toBe(true)
          }),
        )

        it.concurrent(
          'extracts arrow function to external function for page point',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              export const root = Point0.lets('root', 'root').root()
              function PageHome() {
                return <div>Hello</div>
              }
              export const page = root.lets('page', 'home', '/').page(PageHome)
              "
            `)
            expect(point.file.modified).toBe(true)
          }),
        )

        it.concurrent(
          'extracts arrow function to external function for export default',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
const root = Point0.lets('root', 'root').root()
export default root.lets('page', 'home', '/').page(() => <div>Hello</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              const root = Point0.lets('root', 'root').root()
              function PageHome() {
                return <div>Hello</div>
              }
              export default root.lets('page', 'home', '/').page(PageHome)
              "
            `)
            expect(point.file.modified).toBe(true)
          }),
        )

        it.concurrent(
          'extracts arrow function to external function for layout point',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const layout = root.lets('layout', 'main', '/').layout(() => <div>Layout</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              export const root = Point0.lets('root', 'root').root()
              function LayoutMain() {
                return <div>Layout</div>
              }
              export const layout = root.lets('layout', 'main', '/').layout(LayoutMain)
              "
            `)
            expect(point.file.modified).toBe(true)
          }),
        )

        it.concurrent(
          'extracts arrow function to external function for component point',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const component = root.lets('component', 'myComponent', '/').component(() => <div>Component</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              export const root = Point0.lets('root', 'root').root()
              function ComponentMyComponent() {
                return <div>Component</div>
              }
              export const component = root
                .lets('component', 'myComponent', '/')
                .component(ComponentMyComponent)
              "
            `)
            expect(point.file.modified).toBe(true)
          }),
        )

        it.concurrent(
          'keeps existing function expression component unchanged',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'home', '/').page(function MyPage() {return <div>Hello</div>})
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              export const root = Point0.lets('root', 'root').root()
              export const page = root.lets('page', 'home', '/').page(function MyPage() {
                return <div>Hello</div>
              })
              "
            `)
            expect(point.file.modified).toBe(false)
          }),
        )

        it.concurrent(
          'generates unique function name when name already exists',
          helper(async ({ files: [file], walker }) => {
            await file.write(`import {Point0} from '@point0/core'
function PageHome() { return null }
export const root = Point0.lets('root', 'root').root()
export const page = root.lets('page', 'home', '/').page(() => <div>Hello</div>)
        `)
            const result = walker.collectPointsFromFile({ file: file.path })
            const point = result.points[1]
            point.addHmrFix()
            expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
              "import { Point0 } from '@point0/core'
              function PageHome() {
                return null
              }
              export const root = Point0.lets('root', 'root').root()
              function PageHome0() {
                return <div>Hello</div>
              }
              export const page = root.lets('page', 'home', '/').page(PageHome0)
              "
            `)
            expect(point.file.modified).toBe(true)
          }),
        )
      })

      it.concurrent(
        'adds HMR fix to point with method chain',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').ctx(() => ({ a: 1 })).loader(() => ({ b: 2 })).root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.addHmrFix()
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .ctx(() => ({ a: 1 }))
              .loader(() => ({ b: 2 }))
              .root()
              ._tail(() => {
                return null
              })
            "
          `)
        }),
      )

      it.concurrent(
        'is idempotent - does not add HMR fix twice',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.addHmrFix()
          point.addHmrFix()
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .root()
              ._tail(() => {
                return null
              })
            "
          `)
        }),
      )
    })

    describe('server', () => {
      it.concurrent(
        'adds HMR fix to root point on server',
        helper(async ({ files: [file], walker }) => {
          await file.write(`import {Point0} from '@point0/core'
export const root = Point0.lets('root', 'root').root()
        `)
          const result = walker.collectPointsFromFile({ file: file.path })
          const point = result.points[0]
          point.addHmrFix()
          expect(await point.file.toCompressedPrettyCode()).toMatchInlineSnapshot(`
            "import { Point0 } from '@point0/core'
            export const root = Point0.lets('root', 'root')
              .root()
              ._tail(() => {
                return null
              })
            "
          `)
        }),
      )
    })
  })
})
