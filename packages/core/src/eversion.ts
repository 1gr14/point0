import { Route0, type AnyLocation, type ExactLocation } from '@devp0nt/route0'
import { EversionRun } from './eversion-run.js'
import type { Points } from './points.js'
import type { EndPoint, EndPointType, InputParsed, PointName, PointsScope, RequiredCtx } from './types.js'
import { parseUrl, type ParsedUrl } from './utils.js'

// TODO: when find suitable allow porvide "scope", then it will find only inside that
// so remove force
// TODO: add generic and type EversionSource, and EversionConnection so we can understand which ine used now
export class Eversion<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  scopedPoints: Array<Points<true>>

  private constructor(scopedPoints: Array<Points<true, TRequiredCtx>>) {
    this.scopedPoints = scopedPoints
  }

  static create<TRequiredCtx extends RequiredCtx>(
    ...points: Array<Points<true, TRequiredCtx>>
  ): Eversion<TRequiredCtx> {
    return new Eversion<TRequiredCtx>(points)
  }

  async add(...points: Array<Points<boolean, TRequiredCtx>>): Promise<typeof this> {
    this.scopedPoints.push(...(await Promise.all(points.map(async (p) => await p.load()))))
    return this
  }

  async readPoints(): Promise<void> {
    await Promise.all(
      this.scopedPoints.map(async (scopedPoints) => {
        await scopedPoints.read()
      }),
    )
  }

  getSuitable({
    scope,
    fallbackScope,
    pageLocation,
    pointType,
    pointName,
    input,
  }: {
    scope?: PointsScope
    fallbackScope: PointsScope
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }): GetSuitableResult {
    // find exact match
    for (const points of this.scopedPoints) {
      const suitablePoint = points.getSuitablePoint({ pageLocation, pointType, pointName, input })
      if (suitablePoint) {
        return {
          point: suitablePoint.point,
          pageLocation: suitablePoint.pageLocation,
          points,
        }
      }
    }

    // find root by scope
    if (scope) {
      for (const points of this.scopedPoints) {
        if (points.scope === scope) {
          return {
            point: undefined,
            pageLocation: undefined,
            points,
          }
        }
      }
      throw new Error(`No points found with scope "${scope}"`)
    }

    // find root by page location
    if (pageLocation) {
      for (const points of this.scopedPoints) {
        if (points.isPageLocationSuitable({ pageLocation })) {
          return {
            point: undefined,
            pageLocation,
            points,
          }
        }
      }
    }

    // find by fallback scope
    if (fallbackScope) {
      for (const points of this.scopedPoints) {
        if (points.scope === fallbackScope) {
          return {
            point: undefined,
            pageLocation: undefined,
            points,
          }
        }
      }
    }

    throw new Error(
      `No suitable eversion found at scope "${scope}" and fallback scope "${fallbackScope}" and page location "${pageLocation?.href || pageLocation?.pathname || 'undefined'}"`,
    )
  }

  async prepareEversionRunByRequest({
    request,
    parsedUrl,
    fallbackScope,
    scope,
    requiredCtx,
  }: {
    request: Request
    parsedUrl?: ParsedUrl
    fallbackScope: PointsScope
    scope?: PointsScope
    requiredCtx: TRequiredCtx
  }): Promise<{
    task: FetchTask | undefined
    // TODO: it is not parsed input it is raw input
    input: InputParsed
    suitable: GetSuitableResult
    eversionRun: EversionRun
  }> {
    parsedUrl ??= parseUrl(request.url)
    const task = await (async () => {
      if (parsedUrl.urlObj.pathname !== '/_point0') {
        return undefined
      }
      const bodyRaw = await (async () => {
        try {
          return await request.json()
        } catch (error) {
          return {}
        }
      })()
      const parsed = (() => {
        const validPointTypes = [
          'page',
          'layout',
          'component',
          'response',
          'query',
          'infiniteQuery',
          'mutation',
          'provider',
        ] as const
        const validOutputTypes = ['data', 'response', 'dehydratedState'] as const
        if (!bodyRaw || typeof bodyRaw !== 'object') {
          throw new Error('Invalid request body: must be an object')
        }
        const { pointType, outputType, pointInput, scope, pointName } = bodyRaw as Record<string, unknown>
        if (!validPointTypes.includes(pointType as (typeof validPointTypes)[number])) {
          throw new Error(
            `Invalid pointType: must be one of ${validPointTypes.join(', ')}, got ${JSON.stringify(pointType).slice(0, 100)}`,
          )
        }
        if (!validOutputTypes.includes(outputType as (typeof validOutputTypes)[number])) {
          throw new Error(
            `Invalid outputType: must be one of ${validOutputTypes.join(', ')}, got ${JSON.stringify(outputType).slice(0, 100)}`,
          )
        }
        if (!pointInput || typeof pointInput !== 'object' || Array.isArray(pointInput)) {
          throw new Error(`Invalid pointInput: must be an object, got ${JSON.stringify(pointInput).slice(0, 100)}`)
        }
        if (typeof scope !== 'string' || scope.length === 0) {
          throw new Error(`Invalid scope: must be a non-empty string, got ${JSON.stringify(scope).slice(0, 100)}`)
        }
        if (typeof pointName !== 'string' || pointName.length === 0) {
          throw new Error(
            `Invalid pointName: must be a non-empty string, got ${JSON.stringify(pointName).slice(0, 100)}`,
          )
        }
        return {
          pointType: pointType as (typeof validPointTypes)[number],
          outputType: outputType as (typeof validOutputTypes)[number],
          pointInput: pointInput as Record<string, unknown>,
          scope,
          pointName,
        }
      })()
      if (scope && parsed.scope !== scope) {
        throw new Error(`Parsed scope "${parsed.scope}" does not match provided scope "${scope}"`)
      }
      return parsed
    })()
    const location = Route0.getLocation(parsedUrl.urlStr)
    const suitable = this.getSuitable({
      pointType: task?.pointType ?? 'page',
      scope: task?.scope || scope,
      pointName: task?.pointName,
      pageLocation: !task ? location : undefined,
      input: task?.pointInput,
      fallbackScope,
    })
    const eversionRun = await EversionRun.create({
      points: suitable.points,
      pageLocation: suitable.pageLocation,
      currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
      requiredCtx,
    })
    const input = task?.pointInput ?? { ...location.searchParams, ...suitable.pageLocation?.params }
    return {
      task,
      input,
      suitable,
      eversionRun,
    }
  }

  // async preparePageEversionRunByUrl({
  //   url,
  //   fallbackScope,
  //   scope,
  //   requiredCtx,
  // }: {
  //   url: string
  //   fallbackScope: Scope
  //   scope?: Scope
  //   requiredCtx: TRequiredCtx
  // }): Promise<{
  //   suitable: GetSuitableResult
  //   eversionRun: EversionRun
  //   input: InputParsed
  //   location: AnyLocation
  // }> {
  //   const location = Route0.getLocation(url)
  //   const suitable = this.getSuitable({
  //     pointType: 'page',
  //     scope,
  //     pageLocation: location,
  //     fallbackScope,
  //   })
  //   const eversionRun = await suitable.eversion.createRun({
  //     pageLocation: suitable.pageLocation,
  //     currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
  //     requiredCtx,
  //   })
  //   const input = { ...location.searchParams, ...suitable.pageLocation?.params }
  //   return {
  //     suitable,
  //     eversionRun,
  //     input,
  //     location: suitable.pageLocation || location,
  //   }
  // }
}

export type GetSuitablePointResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint
  pageLocation: ExactLocation | undefined
  points: Points<true, TRequiredCtx>
}

export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  points: Points<true, TRequiredCtx>
}

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'dehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}
