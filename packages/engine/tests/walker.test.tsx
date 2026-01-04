import { afterEach, beforeEach, describe, it, expect } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { Walker } from '../src/walker.js'

// TODO: move all tests to separate files in test dir and refactor it

describe('walker', () => {
  const cwd = nodePath.join(__dirname, 'temp/walker')

  const wrap = (callback: ({ file, path, walker }: { file: Bun.BunFile; path: string; walker: Walker }) => any) => {
    return async () => {
      const path = nodePath.join(cwd, Math.random().toString(36).substring(2, 15))
      const file = Bun.file(path)
      const walker = new Walker({ cwd })
      try {
        await callback({ file, path, walker })
      } finally {
        await file.delete()
      }
    }
  }

  beforeEach(() => {
    nodeFs.mkdirSync(cwd, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(cwd, { recursive: true, force: true })
  })

  it(
    'should collect points from file',
    wrap(async ({ file, path, walker }) => {
      await file.write(`import {Point0} from '@point0/core'
export const root = Point0.create('server').root()
export const page = root.lets('page', 'mypage').page(() => <div>Hello</div>)
    `)
      const points = await walker.collectPointsFromFile({ fileAbs: path })
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
})
