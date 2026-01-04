import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import type { ParsedPoint } from '../src/walker.js'
import { Walker } from '../src/walker.js'

type MyFile = Bun.BunFile & { path: string; basename: string; importpath: string }

const tempDir = nodePath.join(__dirname, 'temp/walker')

const createRandomFile = () => {
  const basename = Math.random().toString(36).substring(2, 15)
  const path = nodePath.join(tempDir, basename + '.tsx')
  const importpath = './' + basename + '.js'
  return Object.assign(Bun.file(path), { path, basename, importpath })
}

const helper = (callback: ({ files, walker }: { files: MyFile[]; walker: Walker }) => any, deleteFiles = true) => {
  return async () => {
    const walker = new Walker({ cwd: tempDir })
    const files = [createRandomFile(), createRandomFile(), createRandomFile()]
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

type ParsedPointPrettified = Omit<
  ParsedPoint,
  | 'baseNodePath'
  | 'letsNodePath'
  | 'firstLetsArgNodePath'
  | 'secondLetsArgNodePath'
  | 'thirdLetsArgNodePath'
  | 'parsedBasePoint'
> & {
  baseNodePath: boolean
  letsNodePath: boolean
  firstLetsArgNodePath: boolean
  secondLetsArgNodePath: boolean
  thirdLetsArgNodePath: boolean
  parsedBasePoint: ParsedPointPrettified | undefined
}
const prettifyParsedPoint = (parsedPoint: ParsedPoint): ParsedPointPrettified => {
  return {
    ...parsedPoint,
    baseNodePath: !!parsedPoint.baseNodePath,
    letsNodePath: !!parsedPoint.letsNodePath,
    firstLetsArgNodePath: !!parsedPoint.firstLetsArgNodePath,
    secondLetsArgNodePath: !!parsedPoint.secondLetsArgNodePath,
    thirdLetsArgNodePath: !!parsedPoint.thirdLetsArgNodePath,
    fileAbs: !parsedPoint.fileAbs ? parsedPoint.fileAbs : typeof parsedPoint.fileAbs,
    parsedBasePoint: parsedPoint.parsedBasePoint && prettifyParsedPoint(parsedPoint.parsedBasePoint),
  }
}

describe('walker', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  describe('readAndParsePointsFromFile', () => {
    it(
      'can recognize root point in current file',
      helper(async ({ files: [file], walker }) => {
        await file.write(`import {Point0} from '@point0/core'
                          export const myrootvariable = Point0.lets('root', 'myroot').root()
      `)
        const result = await walker.parsePointsFromFile({ fileAbs: file.path })
        expect(result.errors).toHaveLength(0)
        expect(result.parsedPoints).toHaveLength(1)
        expect(prettifyParsedPoint(result.parsedPoints[0])).toMatchObject({
          fileAbs: 'string',
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
        expect(prettifyParsedPoint(result.parsedPoints[1])).toMatchObject({
          fileAbs: 'string',
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
  })

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
      expect(prettifyParsedPoint(result.parsedPoints[0])).toMatchObject({
        fileAbs: 'string',
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
