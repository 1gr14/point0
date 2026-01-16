import type {
  EndPointType,
  FetcherFetchDetailedResult,
  FetcherFetchDetailedResultSpecific,
  PointsScope,
  Request0,
} from '@point0/core'

export class FetchRecorder {
  records: FetchRecorderRecord[]
  limit: number
  enabled: boolean

  private constructor({ limit, enabled }: { limit: number; enabled: boolean }) {
    this.limit = limit
    this.records = []
    this.enabled = true
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

  recordResult(result: FetcherFetchDetailedResult) {
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
      if (filter.pointType && record.result.variant === 'point' && record.result.point?.type !== filter.pointType) {
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
  ): Array<FetcherFetchDetailedResultSpecific<TVariant>> {
    return this.getRecords(filter).map((record) => record.result) as never
  }

  async waitFinishedResults<TVariant extends FetchRecorderVariant | undefined = undefined>(
    filter?: FetchRecorderFilter<TVariant>,
  ): Promise<Array<FetcherFetchDetailedResultSpecific<TVariant>>> {
    await this.waitStable()
    return this.getFinishedResults(filter) as never
  }

  async waitStable(minDuration = 100, maxDuration = 1000): Promise<void> {
    const startTime = Date.now()
    const wait = async () => {
      return await new Promise((resolve) => setTimeout(resolve, 10))
    }
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

  // private static recordToPreview(record: FetchRecorderRecord): string {
  //   if (!record.result
  // }

  // getTale(): string {
  //   const lines: string[] = []
  //   for (const record of this.records) {
  //     if (record.result) {
  //       lines.push(``)
  //     }
  //   }
  //   return lines.join('\n')
  // }
}

export type FetchRecorderVariant = FetcherFetchDetailedResult['variant']
export type FetchRecorderFilter<TVariant extends FetchRecorderVariant | undefined = undefined> = {
  variant?: TVariant
  scope?: PointsScope
  pointType?: EndPointType
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
export type FetchRecorderRecordFinished<TVariant extends FetchRecorderVariant | undefined = undefined> = {
  time: {
    start: number
    end: number
    duration: number
  }
  request: Request0
  result: FetcherFetchDetailedResultSpecific<TVariant>
}

export type FetchRecorderRecord = FetchRecorderRecordStarted | FetchRecorderRecordFinished
