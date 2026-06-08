import type { Compiler } from '@point0/compiler'
import type { AsyncSubscription } from '@parcel/watcher'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { parseGlobs, registerOnProcessExit } from './utils.js'

/**
 * The set of files to watch for an entry's import graph: the caller's `userPatterns` plus every in-app module the
 * entry imports (transitively), with `node_modules` excluded by default. This is the "watch by import tree" model —
 * shared by the dev orchestrator ({@link EngineServer.startBunDevProcess}) and `build --watch`
 * ({@link Engine.buildWatch}) so both watch the real dependency graph rather than a hardcoded glob. The entry roots
 * themselves are NOT included (dev relies on `bun --watch` for the boot entry); callers that need the roots watched add
 * them. Returns `userPatterns` unchanged when no compiler is available.
 */
export function collectImportGraphPatterns({
  compiler,
  entries,
  userPatterns = [],
  skip = (resolved) => resolved.pathResolved === undefined || resolved.pathResolved.includes('/node_modules/'),
}: {
  compiler: Compiler | undefined
  entries: string[]
  userPatterns?: string[]
  skip?: (resolved: { pathResolved: string | undefined }) => boolean
}): string[] {
  const importFiles = new Set<string>()
  if (compiler) {
    for (const entry of entries) {
      for (const item of compiler.collectImportsDeep({ target: entry, skip })) {
        if (item.pathResolved) {
          importFiles.add(item.pathResolved)
        }
      }
    }
  }
  return [...userPatterns, ...importFiles]
}

export type FilesWatcherEvent = {
  type: 'update' | 'delete'
  rawType: 'create' | 'update' | 'delete'
  path: string
  exists: boolean
}

export type FilesWatcherCallbacks = {
  isSuitable?: (event: FilesWatcherEvent) => Promise<boolean> | boolean
  onEvent: (event: FilesWatcherEvent) => Promise<void> | void
  onError?: (error: unknown) => Promise<void> | void
}

export type FilesWatcherOptions =
  | {
      cwd: string
      dir?: undefined
      patterns: string[]
      excludes?: undefined
      includes?: undefined
    }
  | {
      cwd?: undefined
      dir: string
      patterns: string[]
      excludes: string[]
      includes: string[]
    }

export class FilesWatcher {
  watchDir: string
  includes: string[]
  excludes: string[]
  patterns: string[]

  private subscription: AsyncSubscription | undefined
  private callbacks: FilesWatcherCallbacks | undefined
  private exitHookRegistered = false

  private constructor(options: FilesWatcherOptions) {
    const parsed = FilesWatcher.parseOptions(options)
    this.watchDir = parsed.watchDir
    this.includes = parsed.includes
    this.excludes = parsed.excludes
    this.patterns = parsed.patterns
  }

  static create(options: FilesWatcherOptions) {
    return new FilesWatcher(options)
  }

  private static parseOptions(options: FilesWatcherOptions): {
    watchDir: string
    includes: string[]
    excludes: string[]
    patterns: string[]
  } {
    if (options.dir !== undefined) {
      return {
        watchDir: options.dir,
        includes: options.includes,
        excludes: options.excludes,
        patterns: options.patterns,
      }
    }
    const parsed = parseGlobs({ cwd: options.cwd, globs: options.patterns })
    return {
      watchDir: parsed.dir,
      includes: parsed.includes,
      excludes: parsed.excludes,
      patterns: parsed.patterns,
    }
  }

  async start(callbacks: FilesWatcherCallbacks): Promise<void> {
    this.callbacks = callbacks
    if (this.subscription) {
      await this.stop()
    }
    if (!this.exitHookRegistered) {
      this.exitHookRegistered = true
      registerOnProcessExit(() => {
        void this.stop()
      })
    }
    const { subscribe } = await import('@parcel/watcher')
    this.subscription = await subscribe(
      this.watchDir,
      async (error, events) => {
        if (error) {
          await this.emitError(error)
          return
        }
        for (const event of events) {
          try {
            const path = nodePath.resolve(event.path)
            if (!this.matches(path)) {
              continue
            }
            const exists = await this.exists(path)
            const normalizedType = this.getEventType(event.type, exists)
            if (!normalizedType) {
              continue
            }
            const changeEvent: FilesWatcherEvent = {
              type: normalizedType,
              rawType: event.type,
              path,
              exists,
            }
            const suitable = this.callbacks?.isSuitable ? await this.callbacks.isSuitable(changeEvent) : true
            if (!suitable) {
              continue
            }
            await this.callbacks?.onEvent(changeEvent)
          } catch (err) {
            await this.emitError(err)
          }
        }
      },
      {
        ignore: this.excludes,
      },
    )
  }

  async restart(options: FilesWatcherOptions, callbacks?: FilesWatcherCallbacks) {
    const parsed = FilesWatcher.parseOptions(options)
    this.watchDir = parsed.watchDir
    this.includes = parsed.includes
    this.excludes = parsed.excludes
    this.patterns = parsed.patterns
    const callbacksResolved = callbacks ?? this.callbacks
    if (!callbacksResolved) {
      throw new Error('Callbacks are not set')
    }
    await this.start(callbacksResolved)
  }

  async stop(): Promise<void> {
    if (!this.subscription) {
      return
    }
    await this.subscription.unsubscribe()
    this.subscription = undefined
  }

  matches(path: string): boolean {
    const relativePath = nodePath.relative(this.watchDir, path)
    const matchPositive = this.patterns.some((pattern) => {
      const resolvedPattern = nodePath.resolve(this.watchDir, pattern)
      const relativePattern = nodePath.relative(this.watchDir, resolvedPattern)
      return minimatch(relativePath, relativePattern, { dot: true }) || minimatch(path, resolvedPattern, { dot: true })
    })
    const matchNegative = this.excludes.some((pattern) => {
      const resolvedPattern = nodePath.resolve(this.watchDir, pattern)
      const relativePattern = nodePath.relative(this.watchDir, resolvedPattern)
      return minimatch(relativePath, relativePattern, { dot: true }) || minimatch(path, resolvedPattern, { dot: true })
    })
    return matchPositive && !matchNegative
  }

  private async emitError(error: unknown): Promise<void> {
    if (!this.callbacks?.onError) {
      return
    }
    await this.callbacks.onError(error)
  }

  private async exists(path: string): Promise<boolean> {
    try {
      await nodeFs.access(path)
      return true
    } catch {
      return false
    }
  }

  private getEventType(type: 'create' | 'update' | 'delete', exists: boolean): 'update' | 'delete' | undefined {
    if (type === 'delete' || (!exists && type === 'update')) {
      return 'delete'
    }
    if (exists) {
      return 'update'
    }
    return undefined
  }
}
