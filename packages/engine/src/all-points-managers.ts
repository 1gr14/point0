import { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type {
  EndPoint,
  EndPointType,
  InputParsed,
  InputRaw,
  ParsedUrl,
  PointName,
  PointsManager,
  PointsScope,
  RequiredCtx,
  WithMaybeOptionalReqiredCtx,
} from '@point0/core'
import { parseUrl } from '@point0/core'
import { unflatten } from 'flat'
import { ServerExtractor } from './server-extractor.js'

export class AllPointsManagers<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  pointsManagers: Array<PointsManager<true>>

  private constructor(pointsManagers: Array<PointsManager<true, TRequiredCtx>>) {
    this.pointsManagers = pointsManagers
  }

  static create<TRequiredCtx extends RequiredCtx>(
    ...points: Array<PointsManager<true, TRequiredCtx>>
  ): AllPointsManagers<TRequiredCtx> {
    return new AllPointsManagers<TRequiredCtx>(points)
  }

  async add(...points: Array<PointsManager<boolean, TRequiredCtx>>): Promise<typeof this> {
    this.pointsManagers.push(...(await Promise.all(points.map(async (p) => await p.load()))))
    return this
  }

  async readPoints(): Promise<void> {
    await Promise.all(
      this.pointsManagers.map(async (pointsManager) => {
        await pointsManager.read()
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
    for (const points of this.pointsManagers) {
      const suitablePoint = points.getSuitablePoint({ pageLocation, pointType, pointName, input, scope })
      if (suitablePoint) {
        return {
          point: suitablePoint.point,
          pageLocation: suitablePoint.pageLocation,
          pointsManager: points,
        }
      }
    }

    // find root by scope
    if (scope) {
      for (const points of this.pointsManagers) {
        if (points.scope === scope) {
          return {
            point: undefined,
            pageLocation: undefined,
            pointsManager: points,
          }
        }
      }
      throw new Error0(`No points found with scope "${scope}"`, { httpStatus: 404 })
    }

    // find root by page location
    if (pageLocation) {
      for (const points of this.pointsManagers) {
        if (points.isPageLocationSuitable({ pageLocation })) {
          return {
            point: undefined,
            pageLocation,
            pointsManager: points,
          }
        }
      }
    }

    // find by fallback scope
    if (fallbackScope) {
      for (const points of this.pointsManagers) {
        if (points.scope === fallbackScope) {
          return {
            point: undefined,
            pageLocation: undefined,
            pointsManager: points,
          }
        }
      }
    }

    throw new Error(
      `No suitable points manager found at scope "${scope}" and fallback scope "${fallbackScope}" and page location "${pageLocation?.href || pageLocation?.pathname || 'undefined'}"`,
    )
  }

  async prepareExtractorByRequest({
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
  } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
    task: FetchTask | undefined
    input: InputRaw
    suitable: GetSuitableResult
    extractor: ServerExtractor
  }> {
    parsedUrl ??= parseUrl(request.url)
    const task = await (async () => {
      if (parsedUrl.urlObj.pathname !== '/_point0') {
        return undefined
      }
      const bodyRaw = await (async () => {
        if (request.headers.get('Content-Type')?.includes('multipart/form-data')) {
          const formData = await request.formData()
          const parsed = [...formData.entries()].reduce<Record<string, unknown>>((acc, [key, value]) => {
            if (typeof value === 'string') {
              acc[key] = JSON.parse(value)
            } else {
              acc[key] = value
            }
            return acc
          }, {})
          const unflattened = unflatten(parsed)
          return unflattened
        }
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
        const validOutputTypes = ['data', 'response', 'queryClientDehydratedState'] as const
        if (!bodyRaw || typeof bodyRaw !== 'object') {
          throw new Error('Invalid request body: must be an object')
        }
        const { pointType, outputType, pointInput, scope, pointName } = bodyRaw as Record<string, unknown>
        if (!validPointTypes.includes(pointType as (typeof validPointTypes)[number])) {
          throw new Error(
            `Invalid pointType: must be one of ${validPointTypes.join(', ')}, got ${JSON.stringify(pointType ?? 'undefined').slice(0, 100)}`,
          )
        }
        if (!validOutputTypes.includes(outputType as (typeof validOutputTypes)[number])) {
          throw new Error(
            `Invalid outputType: must be one of ${validOutputTypes.join(', ')}, got ${JSON.stringify(outputType ?? 'undefined').slice(0, 100)}`,
          )
        }
        if (!pointInput || typeof pointInput !== 'object' || Array.isArray(pointInput)) {
          throw new Error(
            `Invalid pointInput: must be an object, got ${JSON.stringify(pointInput ?? 'undefined').slice(0, 100)}`,
          )
        }
        if (typeof scope !== 'string' || scope.length === 0) {
          throw new Error(
            `Invalid scope: must be a non-empty string, got ${JSON.stringify(scope ?? 'undefined').slice(0, 100)}`,
          )
        }
        if (typeof pointName !== 'string' || pointName.length === 0) {
          throw new Error(
            `Invalid pointName: must be a non-empty string, got ${JSON.stringify(pointName ?? 'undefined').slice(0, 100)}`,
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
    const extractor = await ServerExtractor.create({
      points: suitable.pointsManager,
      pageLocation: suitable.pageLocation,
      currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
      requiredCtx,
    })
    const input = task?.pointInput ?? { ...location.searchParams, ...suitable.pageLocation?.params }
    return {
      task,
      input,
      suitable,
      extractor,
    }
  }

  async prepareExtractorByUrl({
    url,
    fallbackScope,
    scope,
    requiredCtx,
  }: {
    url: string
    fallbackScope: PointsScope
    scope?: PointsScope
  } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
    task: FetchTask | undefined
    input: InputRaw
    suitable: GetSuitableResult
    extractor: ServerExtractor
  }> {
    const parsedUrl = parseUrl(url)
    return await this.prepareExtractorByRequest({
      request: new Request(url),
      parsedUrl,
      fallbackScope,
      scope,
      ...((requiredCtx ? { requiredCtx } : {}) as WithMaybeOptionalReqiredCtx<TRequiredCtx>),
    })
  }

  async prepareExtractorByPointAndInput<TPoint extends EndPoint>({
    point,
    input,
    requiredCtx,
  }: {
    point: TPoint
    input: TPoint['Infer']['InputRaw']
  } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<{
    input: TPoint['Infer']['InputRaw']
    suitable: GetSuitableResult
    extractor: ServerExtractor
  }> {
    const location = point._route ? point._route.flat(input) : Route0.getLocation('/')
    const suitable = this.getSuitable({
      pointType: point._pointType,
      scope: point._scope,
      pointName: point._name,
      input,
      fallbackScope: point._scope,
    })
    const extractor = await ServerExtractor.create({
      points: suitable.pointsManager,
      pageLocation: suitable.pageLocation,
      currentLocation: location,
      requiredCtx,
    })
    return {
      input,
      suitable,
      extractor,
    }
  }

  async prepareExtractorByPointScopeTypeNameInput<TPoint extends EndPoint>({
    scope,
    pointType,
    pointName,
    input,
    requiredCtx,
  }: {
    scope: PointsScope
    pointType: EndPointType
    pointName: PointName
    input: TPoint['Infer']['InputRaw']
  } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
    input: TPoint['Infer']['InputRaw']
    suitable: GetSuitableResult
    extractor: ServerExtractor
  }> {
    const suitable = this.getSuitable({
      pointType,
      scope,
      pointName,
      input,
      fallbackScope: scope,
    })
    const extractor = await ServerExtractor.create({
      points: suitable.pointsManager,
      pageLocation: suitable.pageLocation,
      currentLocation: suitable.pageLocation || Route0.getLocation('/'),
      requiredCtx,
    })
    return {
      input,
      suitable,
      extractor,
    }
  }
}

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'queryClientDehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}

export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  pointsManager: PointsManager<true, TRequiredCtx>
}
