import { describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import nodePath from 'node:path'
import { FilesWatcher, isJunkPath } from '../src/watcher.js'

// Pure unit tests for the watcher pieces the dev orchestrator's stability rests on. No real @parcel/watcher
// subscription: events are fed straight into `enqueue`, the same entry point the subscription callback uses, so the
// junk filter, the dedupe, and the one-at-a-time drain are exercised exactly as in production.

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A temp dir with one real file, so the drain's exists-check resolves naturally.
const makeDir = (): { dir: string; file: (name: string) => string } => {
  const dir = mkdtempSync(nodePath.join(tmpdir(), 'point0-watcher-test-'))
  return {
    dir,
    file: (name: string) => {
      const abs = nodePath.join(dir, name)
      writeFileSync(abs, '// test\n')
      return abs
    },
  }
}

describe('isJunkPath', () => {
  it('flags atomic-write and editor save artifacts', () => {
    expect(isJunkPath('/app/src/pages/support.tsx.tmp.20171.4a2655829367')).toBe(true) // bun/agent atomic write
    expect(isJunkPath('/app/src/manifest.json.tmp')).toBe(true)
    expect(isJunkPath('/app/src/page.tsx.vsctmp')).toBe(true)
    expect(isJunkPath('/app/src/page.tsx.crswap')).toBe(true)
    expect(isJunkPath('/app/src/page.tsx___jb_tmp___')).toBe(true)
    expect(isJunkPath('/app/src/page.tsx___jb_old___')).toBe(true)
    expect(isJunkPath('/app/src/.page.tsx.swp')).toBe(true)
    expect(isJunkPath('/app/src/4913')).toBe(true) // vim write-probe
    expect(isJunkPath('/app/src/.#page.tsx')).toBe(true) // emacs lock
    expect(isJunkPath('/app/src/page.tsx~')).toBe(true)
    expect(isJunkPath('/app/src/.DS_Store')).toBe(true)
  })

  it('keeps real source paths', () => {
    expect(isJunkPath('/app/src/pages/support.tsx')).toBe(false)
    expect(isJunkPath('/app/src/tmp.ts')).toBe(false) // a file merely NAMED tmp
    expect(isJunkPath('/app/src/x.tmp.ts')).toBe(false) // .tmp mid-name, real extension
    expect(isJunkPath('/app/src/generated/points.server.ts')).toBe(false)
    expect(isJunkPath('/app/src/49131.ts')).toBe(false)
  })
})

describe('FilesWatcher.enqueue', () => {
  it('drops junk paths before they reach the handler', async () => {
    const { dir, file } = makeDir()
    try {
      const real = file('page.tsx')
      const junk = file('page.tsx.tmp.123.abcdef')
      const watcher = FilesWatcher.create({ cwd: dir, patterns: ['**/*'] })
      const seen: string[] = []
      // start()+stop(): installs the callbacks, then drops the live subscription — events are fed via enqueue below.
      await watcher.start({ onEvent: (event) => void seen.push(event.path) })
      await watcher.stop()
      watcher.enqueue([
        { type: 'update', path: junk },
        { type: 'update', path: real },
      ])
      await sleep(50)
      expect(seen).toEqual([real])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('never runs onEvent concurrently, across batches too', async () => {
    const { dir, file } = makeDir()
    try {
      const a = file('a.tsx')
      const b = file('b.tsx')
      const c = file('c.tsx')
      const watcher = FilesWatcher.create({ cwd: dir, patterns: ['**/*'] })
      let active = 0
      let maxActive = 0
      let calls = 0
      await watcher.start({
        onEvent: async () => {
          active++
          calls++
          maxActive = Math.max(maxActive, active)
          await sleep(20)
          active--
        },
      })
      await watcher.stop()
      // Three "batches" delivered while the previous one is still processing — the storm shape.
      watcher.enqueue([{ type: 'update', path: a }])
      watcher.enqueue([{ type: 'update', path: b }])
      watcher.enqueue([{ type: 'update', path: c }])
      await sleep(150)
      expect(calls).toBe(3)
      expect(maxActive).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('coalesces repeated events for the same path while queued', async () => {
    const { dir, file } = makeDir()
    try {
      const a = file('a.tsx')
      const b = file('b.tsx')
      const watcher = FilesWatcher.create({ cwd: dir, patterns: ['**/*'] })
      const seen: string[] = []
      await watcher.start({
        onEvent: async (event) => {
          seen.push(nodePath.basename(event.path))
          await sleep(30)
        },
      })
      await watcher.stop()
      // First event starts processing; the rest pile up while it runs — duplicates of `b` must collapse to one.
      watcher.enqueue([{ type: 'update', path: a }])
      watcher.enqueue([{ type: 'update', path: b }])
      watcher.enqueue([{ type: 'update', path: b }])
      watcher.enqueue([{ type: 'create', path: b }])
      await sleep(200)
      expect(seen).toEqual(['a.tsx', 'b.tsx'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('normalizes an update for a vanished file to a delete', async () => {
    const { dir, file } = makeDir()
    try {
      const a = file('a.tsx')
      const gone = nodePath.join(dir, 'gone.tsx') // never created
      const watcher = FilesWatcher.create({ cwd: dir, patterns: ['**/*'] })
      const seen: Array<{ type: string; path: string }> = []
      await watcher.start({ onEvent: (event) => void seen.push({ type: event.type, path: event.path }) })
      await watcher.stop()
      watcher.enqueue([
        { type: 'update', path: a },
        { type: 'update', path: gone },
      ])
      await sleep(50)
      expect(seen).toEqual([
        { type: 'update', path: a },
        { type: 'delete', path: gone },
      ])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('swaps patterns on restart without touching the subscription and keeps matching correctly', async () => {
    const { dir, file } = makeDir()
    try {
      const a = file('a.tsx')
      const b = file('b.md')
      const watcher = FilesWatcher.create({ cwd: dir, patterns: ['**/*.tsx'] })
      const seen: string[] = []
      await watcher.start({ onEvent: (event) => void seen.push(nodePath.basename(event.path)) })
      await watcher.stop()
      watcher.enqueue([
        { type: 'update', path: a },
        { type: 'update', path: b },
      ])
      await sleep(50)
      expect(seen).toEqual(['a.tsx'])
      // Narrow/extend the pattern set — the restart path the dev orchestrator hits after every event.
      await watcher.restart({ cwd: dir, patterns: ['**/*.md'] })
      await watcher.stop()
      watcher.enqueue([
        { type: 'update', path: a },
        { type: 'update', path: b },
      ])
      await sleep(50)
      expect(seen).toEqual(['a.tsx', 'b.md'])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
