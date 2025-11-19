import { Route0, type AnyLocation, type ExactLocation } from '@devp0nt/route0'
import { EversionRun } from './eversion-run.js'
import type { Points } from './points.js'
import type {
  EndPoint,
  EndPointType,
  InputParsed,
  PointName,
  PointsScope,
  RequiredCtx,
  RootConnectedPoint,
  RootPoint,
  RootSourcePoint,
} from './types.js'
import { parseUrl, type ParsedUrl } from './utils.js'

// TODO: when find suitable allow porvide "scope", then it will find only inside that
// so remove force
// TODO: add generic and type EversionSource, and EversionConnection so we can understand which ine used now
export class Eversion<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  source: Eversion<TRequiredCtx> | undefined
  points: Points<true>
  connections: Array<Eversion<TRequiredCtx>>

  private constructor({
    source,
    points,
    connections,
  }: {
    source?: Eversion<TRequiredCtx> | undefined
    points: Points<true>
    connections?: Array<Eversion<TRequiredCtx>>
  }) {
    this.points = points
    this.connections = connections ?? []
    this.source = source
  }

  static async create<TRootPoint extends RootPoint>({
    points,
  }: {
    points: Points
  }): Promise<Eversion<TRootPoint['Infer']['RequiredCtx']>> {
    return new Eversion<TRootPoint['Infer']['RequiredCtx']>({
      points: await points.load(),
    })
  }

  async connect({ points }: { points: Points }): Promise<Eversion<TRequiredCtx>> {
    const connection = new Eversion<TRequiredCtx>({
      points: await points.load(),
      source: this,
    })
    await connection.points.read()
    this.connections.push(connection)
    return connection
  }

  async forEachEversion(
    callback: (eversion: Eversion<TRequiredCtx>) => Promise<void>,
    skipSource = false,
  ): Promise<void> {
    if (this.source && !skipSource) {
      await this.source.forEachEversion(callback, false)
    }
    await callback(this)
    for (const connection of this.connections) {
      await connection.forEachEversion(callback, true)
    }
  }

  async readPoints(): Promise<void> {
    await this.forEachEversion(async (eversion) => {
      await eversion.points.read()
    })
  }

  async createRun({
    pageLocation,
    currentLocation,
    requiredCtx,
  }: {
    pageLocation: AnyLocation | undefined
    currentLocation: AnyLocation
    requiredCtx: TRequiredCtx
  }): Promise<EversionRun<TRequiredCtx>> {
    return await EversionRun.create({
      eversion: this,
      pageLocation,
      currentLocation,
      requiredCtx,
    })
  }

  _getParents(): [RootSourcePoint, ...RootConnectedPoint[]] | [] {
    const sources: Array<RootSourcePoint | RootConnectedPoint> = []
    let current: Eversion<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.points.root)
      current = current.source
    }
    return sources.reverse() as [RootSourcePoint, ...RootConnectedPoint[]] | []
  }

  _getSuitableSelfPoint({
    scope,
    pageLocation,
    pointType,
    pointName,
    input,
  }: {
    scope?: PointsScope
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }):
    | {
        point: EndPoint
        pageLocation: ExactLocation | undefined
        eversion: Eversion<TRequiredCtx>
      }
    | undefined {
    if (scope && this.points.root._scope !== scope) {
      return undefined
    }
    const suitablePoint = this.points.getSuitablePoint({ pageLocation, pointType, pointName, input })
    if (suitablePoint) {
      return {
        point: suitablePoint.point,
        pageLocation: suitablePoint.pageLocation,
        eversion: this,
      }
    }
    return undefined
  }
  _getSuitablePoint({
    scope,
    pageLocation,
    pointType,
    pointName,
    input,
  }: {
    scope?: PointsScope
    pageLocation?: AnyLocation | undefined
    pointType?: EndPointType | undefined
    pointName?: PointName | undefined
    input?: InputParsed | undefined
  }): GetSuitablePointResult<TRequiredCtx> | undefined {
    const suitableSelfPoint = this._getSuitableSelfPoint({ pageLocation, scope, pointType, pointName, input })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitablePoint({ pageLocation, scope, pointType, pointName, input })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionPoint) {
      return suitableConnectionPoint
    }
    return undefined
  }

  _getSuitableSelfEversionByPageLocation({
    scope,
    pageLocation,
  }: {
    scope?: PointsScope | undefined
    pageLocation: AnyLocation
  }): Eversion<TRequiredCtx> | undefined {
    // TODO: fix it later, it now not used
    if (scope && this.points.root._scope !== scope) {
      return undefined
    }
    const route = this.points.root._route
    if (!route) {
      return undefined
    }
    const match = route.getLocation(pageLocation)
    if (match.parent || match.exact) {
      return this
    }
    return undefined
  }
  _getSuitableEversionByPageLocationOrUndefined({
    scope,
    pageLocation,
  }: {
    scope?: PointsScope | undefined
    pageLocation: AnyLocation
  }): Eversion<TRequiredCtx> | undefined {
    const suitableSelfEversion = this._getSuitableSelfEversionByPageLocation({ pageLocation, scope })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByPageLocationOrUndefined({
          pageLocation,
          scope,
        })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionEversion) {
      return suitableConnectionEversion
    }
    return undefined
  }
  _getSuitableEversionByScope({ scope }: { scope: PointsScope | undefined }): Eversion<TRequiredCtx> | undefined {
    const suitableSelfEversion = this.points.root._scope === scope ? this : undefined
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByScope({ scope })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableConnectionEversion) {
      return suitableConnectionEversion
    }
    return undefined
  }
  _getSuitableEversionByPageLocation({
    scope,
    fallbackScope,
    pageLocation,
  }: {
    scope?: PointsScope | undefined
    fallbackScope: PointsScope | undefined
    pageLocation?: AnyLocation | undefined
  }): Eversion<TRequiredCtx> {
    if (!pageLocation) {
      throw new Error('Page location is required')
    }
    const suitableEversionByLoaction = this._getSuitableEversionByPageLocationOrUndefined({
      pageLocation,
      scope,
    })
    if (suitableEversionByLoaction) {
      return suitableEversionByLoaction
    }
    const suitableEversionByScope = this._getSuitableEversionByScope({ scope })
    if (suitableEversionByScope) {
      return suitableEversionByScope
    }
    const suitableEversionByFallbackScope = this._getSuitableEversionByScope({ scope: fallbackScope })
    if (suitableEversionByFallbackScope) {
      return suitableEversionByFallbackScope
    }
    throw new Error(
      `No suitable eversion found at location "${pageLocation.pathname}" and scope "${scope}" and fallback scope "${fallbackScope}"`,
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
  }): GetSuitableResult<TRequiredCtx> {
    const suitablePoint = this._getSuitablePoint({ pageLocation, scope, pointType, pointName, input })
    if (suitablePoint) {
      return suitablePoint
    }
    // TODO: allow find just by fallbackScope
    if (pageLocation) {
      const suitableEversion = this._getSuitableEversionByPageLocation({
        pageLocation,
        scope,
        fallbackScope,
      })
      return { point: undefined, pageLocation, eversion: suitableEversion }
    }
    const suitableEversion = this._getSuitableEversionByScope({ scope })
    if (!suitableEversion) {
      throw new Error(`No suitable eversion found at scope "${scope}"`)
    }
    return { point: undefined, pageLocation, eversion: suitableEversion }
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
          scope: scope as string,
          pointName: pointName as string,
        }
      })()
      if (scope && parsed.scope !== scope) {
        throw new Error(`Root id "${parsed.scope}" does not match "${scope}"`)
      }
      return parsed
    })()
    const location = Route0.getLocation(parsedUrl.urlStr)
    const suitable = this.getSuitable({
      // TODO:ASAP add allowedScopes, so in engine fetch we will filter them by basepath and hostname. And better have .hostname() and .basepath() in root point
      pointType: task?.pointType ?? 'page',
      scope: task?.scope || scope,
      pointName: task?.pointName,
      pageLocation: !task ? location : undefined,
      input: task?.pointInput,
      fallbackScope,
    })
    const eversionRun = await suitable.eversion.createRun({
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
  eversion: Eversion<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  pageLocation: AnyLocation | undefined
  eversion: Eversion<TRequiredCtx>
}

export type FetchTask = {
  pointType: EndPointType
  outputType: 'data' | 'response' | 'dehydratedState'
  pointInput: InputParsed
  scope: PointsScope
  pointName: PointName
}
