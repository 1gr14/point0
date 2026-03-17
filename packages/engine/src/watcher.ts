import type { AsyncSubscription } from '@parcel/watcher'
import { minimatch } from 'minimatch'
import * as nodeFs from 'node:fs/promises'
import * as nodePath from 'node:path'
import { getDirByPaths } from './utils.js'

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

export type FilesWatcherOptions = {
  watchDir?: string
  ignore: string[]
  patterns: string[]
}

export class FilesWatcher {
  readonly watchDir: string
  readonly ignore: string[]
  readonly patterns: string[]

  private subscription: AsyncSubscription | undefined
  private callbacks: FilesWatcherCallbacks | undefined

  private constructor(options: FilesWatcherOptions) {
    this.watchDir = options.watchDir || getDirByPaths({ paths: options.patterns })
    this.ignore = options.ignore
    this.patterns = options.patterns
  }

  static create(options: FilesWatcherOptions) {
    return new FilesWatcher(options)
  }

  async start(callbacks: FilesWatcherCallbacks): Promise<void> {
    this.callbacks = callbacks
    if (this.subscription) {
      await this.stop()
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
            if (!this.matchesPatterns(path)) {
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
        ignore: this.ignore,
      },
    )
  }

  async stop(): Promise<void> {
    if (!this.subscription) {
      return
    }
    await this.subscription.unsubscribe()
    this.subscription = undefined
  }

  private matchesPatterns(path: string): boolean {
    return this.patterns.some((pattern) => {
      const resolvedPattern = nodePath.resolve(this.watchDir, pattern)
      const relativePath = nodePath.relative(this.watchDir, path)
      const relativePattern = nodePath.relative(this.watchDir, resolvedPattern)
      return minimatch(relativePath, relativePattern, { dot: true }) || minimatch(path, resolvedPattern, { dot: true })
    })
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
