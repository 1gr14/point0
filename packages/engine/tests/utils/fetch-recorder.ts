import type {
  FetcherFetchDetailedResult,
  FetcherFetchDetailedResultSpecific,
  MiddlewareFn,
  PointsScope,
  ReadyPointType,
  ErrorPoint0,
} from '@point0/core'
import type { Request0 } from '@point0/core/request0'

export class FetchRecorder<TError extends ErrorPoint0 = ErrorPoint0> {
  records: FetchRecorderRecord[]
  limit: number
  enabled: boolean

  private constructor({ limit, enabled }: { limit: number; enabled: boolean }) {
    this.limit = limit
    this.records = []
    this.enabled = enabled
  }

  static create({ limit, enabled }: { limit: number; enabled?: boolean }): FetchRecorder {
    return new FetchRecorder({ limit, enabled: enabled !== false })
  }

  recordRequest(request: Request0) {
    this.records.push({
      time: {
        start: Date.now(),
        end: undefined,
        duration: undefined,
      },
      request,
      result: undefined,
    })
    if (this.records.length > this.limit) {
      this.records.shift()
    }
  }

  recordResult(result: FetcherFetchDetailedResult<TError>) {
    const record = this.records.find((record) => record.request.id === result.request.id)
    if (!record) {
      return
    }
    record.time.end = Date.now()
    record.time.duration = record.time.end - record.time.start
    record.result = result
  }

  getRecords<TVariant extends FetchRecorderVariant | undefined = undefined>(
    filter?: FetchRecorderFilter<TVariant>,
  ): TVariant extends FetchRecorderVariant
    ? Array<FetchRecorderRecordFinished<TVariant>>
    : FetchRecorderRecordFinished[] {
    const results = this.records.filter((record) => record.result !== undefined)
    if (!filter) {
      return results as never
    }
    return results.filter((record) => {
      if (filter.variant && record.result.variant !== filter.variant) {
        return false
      }
      if (filter.scope && record.result.scope !== filter.scope) {
        return false
      }
      if (filter.pointType && record.result.variant === 'task' && record.result.point?.type !== filter.pointType) {
        return false
      }
      return true
    }) as never
  }

  prune() {
    this.records.splice(0, this.records.length)
  }

  getFinishedResults<TVariant extends FetchRecorderVariant | undefined = undefined>(
    filter?: FetchRecorderFilter<TVariant>,
  ): Array<FetcherFetchDetailedResultSpecific<TVariant, TError>> {
    return this.getRecords(filter).map((record) => record.result) as never
  }

  async waitFinishedResults<TVariant extends FetchRecorderVariant | undefined = undefined>(
    filter?: FetchRecorderFilter<TVariant>,
  ): Promise<Array<FetcherFetchDetailedResultSpecific<TVariant, TError>>> {
    await this.waitStable()
    return this.getFinishedResults(filter) as never
  }

  async waitStable(minDuration = 100, maxDuration = 2000): Promise<void> {
    const startTime = Date.now()
    const wait = async () => {
      return await new Promise((resolve) => setTimeout(resolve, 10))
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      if (Date.now() - startTime > maxDuration) {
        throw new Error('Timeout waiting for fetch recorder to be stable')
      }
      const hasNoRecords = this.records.length === 0
      if (hasNoRecords) {
        if (Date.now() - startTime > minDuration) {
          return
        }
        await wait()
        continue
      }
      const hasNotFinishedRecords = this.records.some((record) => record.time.end === undefined)
      if (hasNotFinishedRecords) {
        await wait()
        continue
      }
      const finishedRecords = this.records.filter((record) => record.result !== undefined)
      const latestRecordEndedAt = finishedRecords.sort((a, b) => b.time.end - a.time.end).at(0)?.time.end
      if (!latestRecordEndedAt) {
        if (Date.now() - startTime > minDuration) {
          return
        }
        await wait()
        continue
      }
      if (Date.now() - Math.max(startTime, latestRecordEndedAt) >= minDuration) {
        return
      }
      await wait()
    }
  }

  get middleware(): MiddlewareFn<TError> {
    return async ({ request, next }) => {
      this.recordRequest(request)
      const result = await next()
      this.recordResult(result)
      return result
    }
  }

  tale = async () => {
    const results = await this.waitFinishedResults()
    const lines = results.flatMap((result) => {
      if (result.variant !== 'page' && result.variant !== 'task') {
        return []
      }
      const pointString = 'point' in result && result.point ? `${result.point.type}.${result.point.name}` : 'unknown'
      const inputString = 'input' in result && result.input ? JSON.stringify(result.input) : 'undefined'
      const serverOrClient = result.request.from.server ? 'server' : 'client'
      if (result.variant === 'page') {
        return `${pointString} (${serverOrClient}) (page) < ${inputString}`
      }
      return `${pointString} (${serverOrClient}) < ${inputString}`
    })
    return '\n' + lines.join('\n') + '\n'
  }
}

export type FetchRecorderVariant = FetcherFetchDetailedResult<any>['variant']
export type FetchRecorderFilter<TVariant extends FetchRecorderVariant | undefined = undefined> = {
  variant?: TVariant
  scope?: PointsScope
  pointType?: ReadyPointType
}

export type FetchRecorderRecordStarted = {
  time: {
    start: number
    end: undefined
    duration: undefined
  }
  request: Request0
  result: undefined
}
export type FetchRecorderRecordFinished<
  TVariant extends FetchRecorderVariant | undefined = undefined,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  time: {
    start: number
    end: number
    duration: number
  }
  request: Request0
  result: FetcherFetchDetailedResultSpecific<TVariant, TError>
}

export type FetchRecorderRecord<TError extends ErrorPoint0 = ErrorPoint0> =
  | FetchRecorderRecordStarted
  | FetchRecorderRecordFinished<undefined, TError>
