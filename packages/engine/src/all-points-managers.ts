import { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import type {
  EndPoint,
  EndPointType,
  InputRawUnknown,
  PointName,
  PointsManager,
  PointsScope,
  RequiredCtx,
  DataTransformerExtended,
  FetchFn,
} from '@point0/core'

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

  getFirstScope(): PointsScope | undefined {
    return this.pointsManagers.at(0)?.scope
  }

  getFirstServerurl(): string | undefined {
    for (const pointsManager of this.pointsManagers) {
      if (pointsManager.root._serverurl) {
        return pointsManager.root._serverurl
      }
    }
    return undefined
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
    // TODO: InputRaw here
    input?: InputRawUnknown | undefined
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

  getTransformerByScope({
    scope,
    fallbackScope,
  }: {
    scope?: PointsScope | null
    fallbackScope?: PointsScope
  }): DataTransformerExtended {
    const result = (this.pointsManagers.find(
      (pointsManager) => pointsManager.scope === scope || pointsManager.scope === fallbackScope,
    )?.transformer ?? this.pointsManagers[0].transformer) as DataTransformerExtended | undefined
    if (!result) {
      throw new Error(`No transformer found for scope "${scope}" or fallback scope "${fallbackScope}"`)
    }
    return result
  }

  getPointsManagerByScope({
    scope,
    fallbackScope,
  }: {
    scope?: PointsScope | null
    fallbackScope?: PointsScope
  }): PointsManager<true, TRequiredCtx> {
    const pointsManager = this.pointsManagers.find(
      (pointsManager) => pointsManager.scope === scope || pointsManager.scope === fallbackScope,
    )
    if (!pointsManager) {
      throw new Error(`No points manager found for scope "${scope}" or fallback scope "${fallbackScope}"`)
    }
    return pointsManager as PointsManager<true, TRequiredCtx>
  }

  // async prepareExecutorByRequest({
  //   request,
  //   parsedUrl,
  //   fallbackScope,
  //   scope,
  //   requiredCtx,
  // }: {
  //   request: Request
  //   parsedUrl?: ParsedUrl
  //   fallbackScope: PointsScope
  //   scope?: PointsScope
  // } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
  //   task: FetchTask | undefined
  //   input: InputRaw
  //   suitable: GetSuitableResult
  //   executor: Executor
  // }> {
  //   parsedUrl ??= parseUrl(request.url)
  //   const task: FetchTask | undefined = await (async () => {
  //     if (parsedUrl.urlObj.pathname !== '/_point0') {
  //       return undefined
  //     }
  //     const bodyRaw = await (async () => {
  //       if (request.headers.get('Content-Type')?.includes('multipart/form-data')) {
  //         const formData = await request.formData()
  //         const parsed = [...formData.entries()].reduce<Record<string, unknown>>((acc, [key, value]) => {
  //           if (typeof value === 'string') {
  //             acc[key] = JSON.parse(value)
  //           } else {
  //             acc[key] = value
  //           }
  //           return acc
  //         }, {})
  //         const unflattened = unflatten(parsed)
  //         return unflattened
  //       }
  //       try {
  //         return await request.json()
  //       } catch (error) {
  //         return {}
  //       }
  //     })()
  //     const parsed = (() => {
  //       const validPointTypes = [
  //         'page',
  //         'layout',
  //         'component',
  //         'query',
  //         'infiniteQuery',
  //         'mutation',
  //         'provider',
  //       ] as const
  //       const validOutputTypes = ['data', 'queryClientDehydratedState'] as const
  //       if (!bodyRaw || typeof bodyRaw !== 'object') {
  //         throw new Error('Invalid request body: must be an object')
  //       }
  //       const {
  //         type: pointType,
  //         output: outputType,
  //         input: pointInputNotTransformed,
  //         scope,
  //         name: pointName,
  //       } = bodyRaw as Record<string, unknown>
  //       if (typeof scope !== 'string' || scope.length === 0) {
  //         throw new Error(`Invalid scope: must be a non-empty string, got ${typeof scope}`)
  //       }
  //       if (!validPointTypes.includes(pointType as (typeof validPointTypes)[number])) {
  //         throw new Error(`Invalid pointType: must be one of ${validPointTypes.join(', ')}, got ${typeof pointType}`)
  //       }
  //       if (typeof pointName !== 'string' || pointName.length === 0) {
  //         throw new Error(`Invalid pointName: must be a non-empty string, got ${typeof pointName}`)
  //       }
  //       if (!validOutputTypes.includes(outputType as (typeof validOutputTypes)[number])) {
  //         throw new Error(`Invalid outputType: must be one of ${validOutputTypes.join(', ')}, got ${typeof outputType}`)
  //       }
  //       if (
  //         !pointInputNotTransformed ||
  //         typeof pointInputNotTransformed !== 'object' ||
  //         Array.isArray(pointInputNotTransformed)
  //       ) {
  //         throw new Error(`Invalid pointInput: must be an object, got ${typeof pointInputNotTransformed}`)
  //       }
  //       const transformer = this.getTransformerByScope({ scope, fallbackScope: scope || fallbackScope })
  //       const pointInput = transformer.deserialize<InputRaw>(pointInputNotTransformed)
  //       try {
  //         return {
  //           pointType: pointType as (typeof validPointTypes)[number],
  //           outputType: outputType as (typeof validOutputTypes)[number],
  //           pointInput,
  //           scope,
  //           pointName,
  //         }
  //       } catch (error) {
  //         throw new Error0(`Invalid pointInput: ${error instanceof Error ? error.message : String(error)}`, {
  //           cause: error,
  //         })
  //       }
  //     })()
  //     if (scope && parsed.scope !== scope) {
  //       throw new Error(`Parsed scope "${parsed.scope}" does not match provided scope "${scope}"`)
  //     }
  //     return parsed
  //   })()
  //   const location = Route0.getLocation(parsedUrl.urlStr)
  //   const suitable = this.getSuitable({
  //     pointType: task?.pointType ?? 'page',
  //     scope: task?.scope || scope,
  //     pointName: task?.pointName,
  //     pageLocation: !task ? location : undefined,
  //     input: task?.pointInput,
  //     fallbackScope,
  //   })
  //   const executor = await Executor.create({
  //     request,
  //     points: suitable.pointsManager,
  //     pageLocation: suitable.pageLocation,
  //     currentLocation: suitable.pageLocation ?? Route0.toRelLocation(location),
  //     requiredCtx,
  //   })
  //   const input = task?.pointInput ?? { ...location.searchParams, ...suitable.pageLocation?.params }
  //   return {
  //     task,
  //     input,
  //     suitable,
  //     executor,
  //   }
  // }

  // async prepareExecutorByUrl({
  //   url,
  //   fallbackScope,
  //   scope,
  //   requiredCtx,
  // }: {
  //   url: string
  //   fallbackScope: PointsScope
  //   scope?: PointsScope
  // } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
  //   task: FetchTask | undefined
  //   input: InputRaw
  //   suitable: GetSuitableResult
  //   executor: Executor
  // }> {
  //   const parsedUrl = parseUrl(url)
  //   return await this.prepareExecutorByRequest({
  //     request: new Request(url),
  //     parsedUrl,
  //     fallbackScope,
  //     scope,
  //     ...((requiredCtx ? { requiredCtx } : {}) as WithMaybeOptionalReqiredCtx<TRequiredCtx>),
  //   })
  // }

  // async prepareExecutorByPointAndInput<TPoint extends EndPoint>({
  //   point,
  //   input,
  //   requiredCtx,
  // }: {
  //   point: TPoint
  //   input: TPoint['Infer']['InputRaw']
  // } & WithMaybeOptionalReqiredCtx<TPoint['Infer']['RequiredCtx']>): Promise<{
  //   input: TPoint['Infer']['InputRaw']
  //   suitable: GetSuitableResult
  //   executor: Executor
  // }> {
  //   // TODO: fix autogenerated request
  //   const location = point._route ? point._route.flat(input) : Route0.getLocation('/')
  //   const suitable = this.getSuitable({
  //     pointType: point.type,
  //     scope: point.scope,
  //     pointName: point.name,
  //     input,
  //     fallbackScope: point.scope,
  //   })
  //   const executor = await Executor.create({
  //     request: Executor.createRequestByPointAndInput({ point, input }),
  //     points: suitable.pointsManager,
  //     pageLocation: suitable.pageLocation,
  //     currentLocation: location,
  //     requiredCtx,
  //   })
  //   return {
  //     input,
  //     suitable,
  //     executor,
  //   }
  // }

  // async prepareExecutorByPointScopeTypeNameInput<TPoint extends EndPoint>({
  //   scope,
  //   pointType,
  //   pointName,
  //   input,
  //   requiredCtx,
  // }: {
  //   scope: PointsScope
  //   pointType: EndPointType
  //   pointName: PointName
  //   input: TPoint['Infer']['InputRaw']
  // } & WithMaybeOptionalReqiredCtx<TRequiredCtx>): Promise<{
  //   input: TPoint['Infer']['InputRaw']
  //   suitable: GetSuitableResult
  //   executor: Executor
  // }> {
  //   const suitable = this.getSuitable({
  //     pointType,
  //     scope,
  //     pointName,
  //     input,
  //     fallbackScope: scope,
  //   })
  //   const executor = await Executor.create({
  //     request: Executor.createRequestByPointScopeTypeNameInput({ scope, pointType, pointName, input }),
  //     points: suitable.pointsManager,
  //     pageLocation: suitable.pageLocation,
  //     currentLocation: suitable.pageLocation || Route0.getLocation('/'),
  //     requiredCtx,
  //   })
  //   return {
  //     input,
  //     suitable,
  //     executor,
  //   }
  // }
}

export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  pointsManager: PointsManager<true, TRequiredCtx>
}
