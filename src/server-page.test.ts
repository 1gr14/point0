/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { UndefinedCtx, EmptyData, EmptyCtx } from './server-page.js'
import { ServerPage0 } from './server-page.js'

describe('ServerPage0', () => {
  const testDir = nodePath.join(__dirname, 'test-temp')

  beforeEach(() => {
    nodeFs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(testDir, { recursive: true, force: true })
  })

  it('creates an empty instance', () => {
    const serverPage0 = new ServerPage0()
    expect(serverPage0).toBeInstanceOf(ServerPage0)
    expectTypeOf(serverPage0).toEqualTypeOf<ServerPage0>()

    expectTypeOf(serverPage0).toEqualTypeOf<ServerPage0<UndefinedCtx, EmptyCtx, EmptyData>>()
    expect(serverPage0.extendFns).toEqual([])
  })

  it('extends with ctx fn', () => {
    const serverPage0 = new ServerPage0()
    const serverPage01 = serverPage0.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(serverPage01).toBeInstanceOf(ServerPage0)

    expectTypeOf(serverPage01).toEqualTypeOf<ServerPage0<UndefinedCtx, { a: number; b: number }, EmptyData>>()
    expect(serverPage01.extendFns).toHaveLength(1)
    // not modified original serverPage0
    expect(serverPage0.extendFns).toHaveLength(0)
    const serverPage02 = serverPage01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(serverPage02).toBeInstanceOf(ServerPage0)

    expectTypeOf(serverPage02).toEqualTypeOf<
      ServerPage0<UndefinedCtx, { a: number; b: number; c: number }, EmptyData>
    >()
    expect(serverPage02.extendFns).toHaveLength(2)
    // not modified original serverPage01
    expect(serverPage01.extendFns).toHaveLength(1)
    // not modified original serverPage0
    expect(serverPage0.extendFns).toHaveLength(0)
  })

  it('extends with loader fn', () => {
    const serverPage0 = new ServerPage0()
    const serverPage01 = serverPage0.loader(() => ({
      a: 1,
      b: 2,
    }))
    expect(serverPage01).toBeInstanceOf(ServerPage0)
    expectTypeOf(serverPage01).toEqualTypeOf<ServerPage0<UndefinedCtx, EmptyCtx, { a: number; b: number }>>()
    expect(serverPage01.extendFns).toHaveLength(1)
    // not modified original serverPage0
    expect(serverPage0.extendFns).toHaveLength(0)
    const serverPage02 = serverPage01.loader(({ data }) => ({
      ...data,
      a: 3,
      c: 4,
    }))
    expect(serverPage02).toBeInstanceOf(ServerPage0)
    expectTypeOf(serverPage02).toEqualTypeOf<ServerPage0<UndefinedCtx, EmptyCtx, { a: number; b: number; c: number }>>()
    expect(serverPage02.extendFns).toHaveLength(2)
    // not modified original serverPage01
    expect(serverPage01.extendFns).toHaveLength(1)
    // not modified original serverPage0
    expect(serverPage0.extendFns).toHaveLength(0)
  })

  it('extract ctx', async () => {
    const serverPage0 = new ServerPage0()
    const url = '/z/x/c'
    const serverPage01 = serverPage0.ctx(() => ({
      a: 1,
      b: 2,
    }))
    expect(await serverPage01.prepare(url)).toEqual({
      output: {
        ctx: {
          a: 1,
          b: 2,
        },
        data: {},
      },
      error: undefined,
    })
    const serverPage02 = serverPage01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(await serverPage02.prepare(url)).toEqual({
      output: {
        ctx: {
          a: 3,
          b: 2,
          c: 4,
        },
        data: {},
      },
      error: undefined,
    })
    const serverPage03 = serverPage01.ctx(({ ctx }) => ({
      c: 5,
    }))
    expect(await serverPage03.prepare(url)).toEqual({
      output: {
        ctx: {
          c: 5,
        },
        data: {},
      },
      error: undefined,
    })
  })

  it('extract ctx with required ctx input', async () => {
    const serverPage0 = new ServerPage0<{ r: string }>()
    const url = '/z/x/c'
    const serverPage01 = serverPage0.ctx(({ ctx }) => ({
      ...ctx,
      a: 1,
      b: 2,
    }))
    expect(await serverPage01.prepare(url, { r: 'str' })).toEqual({
      output: {
        ctx: {
          r: 'str',
          a: 1,
          b: 2,
        },
        data: {},
      },
      error: undefined,
    })
    const serverPage02 = serverPage01.ctx(({ ctx }) => ({
      ...ctx,
      a: 3,
      c: 4,
    }))
    expect(await serverPage02.prepare(url, { r: 'str' })).toEqual({
      output: {
        ctx: {
          r: 'str',
          a: 3,
          b: 2,
          c: 4,
        },
        data: {},
      },
      error: undefined,
    })
    const serverPage03 = serverPage01.ctx(({ ctx }) => ({
      r: ctx.r,
      c: 5,
    }))
    expect(await serverPage03.prepare(url, { r: 'str' })).toEqual({
      output: {
        ctx: {
          r: 'str',
          c: 5,
        },
        data: {},
      },
      error: undefined,
    })
  })
})
