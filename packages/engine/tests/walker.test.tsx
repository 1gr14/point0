import { afterEach, beforeEach, describe, it, expect, beforeAll, afterAll } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
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

describe('walker', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  it(
    'should collect points from file',
    helper(async ({ files: [file], walker }) => {
      await file.write(`import {Point0} from '@point0/core'
export const root = Point0.create('server').root()
export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
    `)
      const points = await walker.collectPointsFromFile({ fileAbs: file.path })
      expect(points.collectedPoints).toMatchObject([
        {
          type: 'root',
          name: 'server',
        },
        {
          type: 'page',
          name: 'mypage',
        },
      ])
    }),
  )

  it(
    'should collect points from file, when root in another file',
    helper(async ({ files: [file0, file1], walker }) => {
      await file0.write(`import {Point0} from '@point0/core'
export const root = Point0.create('server').root()
    `)
      await file1.write(`import {root} from '${file0.importpath}'
export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
    `)
      const points = await walker.collectPointsFromFile({ fileAbs: file1.path })
      expect(points.collectedPoints).toMatchObject([
        {
          type: 'page',
          name: 'mypage',
        },
      ])
    }),
  )
})
