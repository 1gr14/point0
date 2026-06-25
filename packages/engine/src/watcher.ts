import type { Compiler } from '@point0/compiler'
import type { AsyncSubscription } from '@parcel/watcher'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { parseGlobs, registerOnProcessExit } from './utils.js'

/**
 * The set of files to watch for an entry's import graph: the caller's `userPatterns` plus every in-app module the entry
 * imports (transitively), with `node_modules` excluded by default. This is the "watch by import tree" model — shared by
 * the dev orchestrator ({@link EngineServer.startBunDevProcess}) and `build --watch` ({@link Engine.buildWatch}) so both
 * watch the real dependency graph rather than a hardcoded glob. The entry roots themselves are NOT included (dev relies
 * on `bun --watch` for the boot entry); callers that need the roots watched add them. Returns `userPatterns` unchanged
 * when no compiler is available.
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

// Atomic-write / editor save artifacts. Editors and agents save "safely": write `<file>.tmp.<pid>.<hex>` (or a swap
// file), then rename it over the target — so every real save also emits create/delete events for a short-lived junk
// path. Reacting to those is pure poison for dev: the junk path is never a hot-store node, so each one triggers a FULL
// server restart, and a burst of agent edits becomes a restart storm. Filtered at the watcher source so every consumer
// (dev restarts, the generator, build --watch) is immune.
const JUNK_PATH_RES: RegExp[] = [
  /\.tmp\.\d+\.[0-9a-zA-Z]+$/, // bun / Claude Code atomic write: <file>.tmp.<pid>.<hex>
  /\.tmp$/, // generic atomic-write suffix (our own manifest.json.tmp pattern and friends)
  /\.vsctmp$/, // VS Code safe-write
  /\.crswap$/, // Chrome OS safe-write
  /___jb_(tmp|old)___$/, // JetBrains safe-write
  /\.sw[pox]$/, // vim swap
  /(^|\/)4913$/, // vim write-probe file
  /(^|\/)\.#[^/]*$/, // emacs lock files
  /[^/]~$/, // backup files
  /(^|\/)\.DS_Store$/,
]

/**
 * True for transient save artifacts (atomic-write temp files, editor swap/backup files) that must never drive watch
 * events.
 */
export const isJunkPath = (path: string): boolean => JUNK_PATH_RES.some((re) => re.test(path))

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
  /** The dir + excludes the live subscription was created with — `restart` resubscribes only when these change. */
  private subscribedDir: string | undefined
  private subscribedExcludes: string[] = []
  private callbacks: FilesWatcherCallbacks | undefined
  private exitHookRegistered = false
  /**
   * Raw events waiting to be processed, deduped by path (the LATEST raw event for a path wins — its true current state
   * is re-checked at processing time anyway). One queue per watcher, drained strictly one event at a time.
   */
  private pending: Array<{ rawType: 'create' | 'update' | 'delete'; path: string }> = []
  private draining = false
  /**
   * Serializes subscribe/unsubscribe transitions. `start`/`restart`/`stop` may be called from inside an `onEvent`
   * handler while another call is mid-flight (the dev orchestrator refreshes its watch set on every event); without
   * this lock two concurrent starts both replace `this.subscription` and the loser's subscription LEAKS — it keeps
   * firing forever and every future event is processed twice (then 3×, 4×, … as leaks accumulate).
   */
  private lifecycle: Promise<void> = Promise.resolve()

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

  /** Chain a subscribe/unsubscribe transition onto the lifecycle lock so transitions never interleave. */
  private withLifecycle<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lifecycle.then(fn)
    this.lifecycle = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /**
   * Accept a batch of raw events into the pending queue and kick the drain loop. Junk paths (atomic-write/editor save
   * artifacts) and non-matching paths are dropped at the door; a path already queued is REPLACED by its newer event
   * (its real state — exists or not — is checked at processing time, so collapsing a create+update+delete burst to the
   * last event is lossless).
   */
  enqueue(events: Array<{ type: 'create' | 'update' | 'delete'; path: string }>): void {
    for (const event of events) {
      const path = nodePath.resolve(event.path)
      if (isJunkPath(path) || !this.matches(path)) {
        continue
      }
      const queuedIndex = this.pending.findIndex((pendingEvent) => pendingEvent.path === path)
      if (queuedIndex !== -1) {
        this.pending.splice(queuedIndex, 1)
      }
      this.pending.push({ rawType: event.type, path })
    }
    void this.drain()
  }

  /**
   * Process pending events strictly one at a time — across batches too. @parcel/watcher invokes its callback per batch
   * with no regard for an earlier callback still being awaited, so without this queue two bursts of saves run `onEvent`
   * concurrently (concurrent server respawns, concurrent watch-set refreshes — the dev-storm failure mode).
   */
  private async drain(): Promise<void> {
    if (this.draining) {
      return
    }
    this.draining = true
    try {
      while (this.pending.length > 0) {
        const raw = this.pending.shift() as { rawType: 'create' | 'update' | 'delete'; path: string }
        try {
          const exists = await this.exists(raw.path)
          const normalizedType = this.getEventType(raw.rawType, exists)
          if (!normalizedType) {
            continue
          }
          const changeEvent: FilesWatcherEvent = {
            type: normalizedType,
            rawType: raw.rawType,
            path: raw.path,
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
    } finally {
      this.draining = false
    }
  }

  async start(callbacks: FilesWatcherCallbacks): Promise<void> {
    this.callbacks = callbacks
    if (!this.exitHookRegistered) {
      this.exitHookRegistered = true
      registerOnProcessExit(() => {
        void this.stop()
      })
    }
    await this.ensureSubscribed()
  }

  /**
   * (Re)subscribe only when the subscription's OS-level identity — the watched dir + the native exclude list — has
   * actually changed. Patterns/includes are matched in-process per event, so a `restart` that only swaps patterns (the
   * dev orchestrator does this after every event) touches no subscription at all: no churn, nothing to race, nothing to
   * leak.
   */
  private async ensureSubscribed(): Promise<void> {
    await this.withLifecycle(async () => {
      const sameSubscription =
        this.subscription !== undefined &&
        this.subscribedDir === this.watchDir &&
        this.subscribedExcludes.length === this.excludes.length &&
        this.subscribedExcludes.every((exclude, i) => exclude === this.excludes[i])
      if (sameSubscription) {
        return
      }
      if (this.subscription) {
        const oldSubscription = this.subscription
        this.subscription = undefined
        await oldSubscription.unsubscribe()
      }
      const { subscribe } = await import('@parcel/watcher')
      const subscription = await subscribe(
        this.watchDir,
        (error, events) => {
          if (error) {
            void this.emitError(error)
            return
          }
          this.enqueue(events)
        },
        {
          ignore: this.excludes,
        },
      )
      this.subscription = subscription
      this.subscribedDir = this.watchDir
      this.subscribedExcludes = [...this.excludes]
    })
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
    await this.withLifecycle(async () => {
      if (!this.subscription) {
        return
      }
      const subscription = this.subscription
      this.subscription = undefined
      this.subscribedDir = undefined
      this.subscribedExcludes = []
      await subscription.unsubscribe()
    })
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
