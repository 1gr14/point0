import { Routes } from '@1gr14/route0'
import type { AnyLocation, AnyRoute, ExactLocation, RoutesPretty } from '@1gr14/route0'
import { PointsManager } from '@point0/core'
import type {
  DataTransformerExtended,
  ErrorPoint0,
  LogFn,
  MiddlewareFn,
  PagePoint,
  PointName,
  PointSsrResolved,
  PointsDefinition,
  PointsDefinitionSource,
  PointsScope,
  PointType,
  ReadyPoint,
  RequestableReadyPoint,
  RequiredCtx,
  RootPoint,
} from '@point0/core'
import type { WideRequestMethod } from '@point0/core/request0'

export class ServerPoints<TError extends ErrorPoint0> {
  manager: PointsManager<true, RequiredCtx, TError>

  transformers = new Map<PointsScope, DataTransformerExtended>()
  roots = new Map<PointsScope, RootPoint>()
  scopes = new Set<PointsScope>()
  middlewares = new Map<PointsScope, MiddlewareFn<any>[]>()
  // Authoritative per-scope SSR (server scope + every client), set by EngineServer after these points are loaded. The
  // ambient `_getSsrEnabled()` on the server reflects the server's SSR, not the owning client's — the openapi spec resolves a
  // point's SSR through this map instead. See NiceServerPoints.ssrDefaultOptionsByScope.
  ssrDefaultOptionsByScope?: Map<PointsScope, PointSsrResolved>

  // <method, Routes0>
  private readonly endpointsRoutesByMethods = new Map<WideRequestMethod, RoutesPretty>()
  // <method, <route.definition, point>>
  private readonly endpointsByDefinitionsByMethods = new Map<WideRequestMethod, Map<string, ReadyPoint>>()
  // <scope, <type, <name, point>>>
  private readonly pointsByNamesByTypesByScopes = new Map<PointsScope, Map<PointType, Map<PointName, ReadyPoint>>>()
  // <scope, Routes0>
  private readonly pagesRoutesByScopes = new Map<PointsScope, RoutesPretty>()
  // <scope, <route.definition, page point>>
  private readonly pagesByDefinitionsByScopes = new Map<PointsScope, Map<string, PagePoint>>()
  private indexGenerated = false

  private constructor({ manager }: { manager: PointsManager }) {
    this.manager = manager as never
  }

  static createFromDefinition<TError extends ErrorPoint0>(
    points: PointsDefinition<RequiredCtx, TError> | PointsManager<boolean, RequiredCtx, TError>,
    options: { log?: LogFn } = {},
  ): ServerPoints<TError> {
    const manager = PointsManager.createFromDefinition(points, options)
    const instance = new ServerPoints<TError>({ manager })
    const roots = manager.getRoots()
    for (const root of roots) {
      instance.roots.set(root.scope, root)
      instance.transformers.set(root.scope, root._getTransformer())
      instance.scopes.add(root.scope)
      instance.middlewares.set(root.scope, root._middlewares)
    }
    return instance as ServerPoints<TError>
  }

  static async createFromSource<TError extends ErrorPoint0>(
    source: PointsDefinitionSource<RequiredCtx, TError>,
    options: { log?: LogFn } = {},
  ): Promise<ServerPoints<TError>> {
    const manager = await PointsManager.createFromSource(source, options)
    return ServerPoints.createFromDefinition(manager)
  }

  private readonly throwIfNotReady = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!this.manager.ready) {
      throw new Error('Points are not ready')
    }
  }

  load = async (): Promise<typeof this> => {
    await this.manager.load()
    this.generateIndex()
    this._collection = undefined
    return this
  }

  private generateIndex = (): void => {
    this.endpointsRoutesByMethods.clear()
    this.endpointsByDefinitionsByMethods.clear()
    this.pointsByNamesByTypesByScopes.clear()
    this.pagesRoutesByScopes.clear()
    this.pagesByDefinitionsByScopes.clear()
    const routesByMethod = new Map<WideRequestMethod, Record<string, AnyRoute>>()
    const pagesRoutesByScope = new Map<PointsScope, Record<string, AnyRoute>>()
    for (const { point } of this.manager.collection) {
      this.indexPoint(point)
      if (point.type === 'page' && point.route) {
        const existingPagesByDefinitions = this.pagesByDefinitionsByScopes.get(point.scope)
        if (existingPagesByDefinitions) {
          for (const existingPoint of existingPagesByDefinitions.values()) {
            if (point.route.isConflict(existingPoint.route)) {
              throw new Error(
                `Conflicted page routes for scope "${point.scope}": ${point.toStringWithLocation()} conflicts with ${existingPoint.toStringWithLocation()}`,
              )
            }
          }
          existingPagesByDefinitions.set(point.route.definition, point)
        } else {
          this.pagesByDefinitionsByScopes.set(point.scope, new Map([[point.route.definition, point]]))
        }
        const pagesRoutes = pagesRoutesByScope.get(point.scope)
        if (pagesRoutes) {
          pagesRoutes[point.route.definition] = point.route
        } else {
          pagesRoutesByScope.set(point.scope, { [point.route.definition]: point.route })
        }
      }
      const endpoint = point._endpoint
      if (!endpoint) {
        continue
      }
      // A query endpoint answers to both GET (input in the URL, cacheable) and POST (the client's fallback for a
      // binary or over-long input); every other endpoint answers to its single method. `endpoint.methods` is
      // precomputed at endpoint generation, so the router here stays a plain per-method registration.
      for (const method of endpoint.methods) {
        this.indexEndpoint({
          point,
          method,
          route: endpoint.route,
          routesByMethod,
        })
      }
    }
    for (const [method, routes] of routesByMethod.entries()) {
      this.endpointsRoutesByMethods.set(method, Routes.create(routes))
    }
    for (const [scope, routes] of pagesRoutesByScope.entries()) {
      this.pagesRoutesByScopes.set(scope, Routes.create(routes))
    }
    this.indexGenerated = true
  }

  private indexPoint = (point: ReadyPoint): void => {
    const pointsByTypes = this.pointsByNamesByTypesByScopes.get(point.scope)
    if (pointsByTypes) {
      const pointsByNames = pointsByTypes.get(point.type)
      if (pointsByNames) {
        const existingPoint = pointsByNames.get(point.name)
        if (existingPoint) {
          throw new Error(
            `Conflicted point identity for scope "${point.scope}", type "${point.type}", name "${point.name}": ${point.toStringWithLocation()} conflicts with ${existingPoint.toStringWithLocation()}`,
          )
        }
        pointsByNames.set(point.name, point)
      } else {
        pointsByTypes.set(point.type, new Map([[point.name, point]]))
      }
    } else {
      this.pointsByNamesByTypesByScopes.set(point.scope, new Map([[point.type, new Map([[point.name, point]])]]))
    }
  }

  private indexEndpoint = ({
    point,
    method,
    route,
    routesByMethod,
  }: {
    point: ReadyPoint
    method: WideRequestMethod
    route: AnyRoute
    routesByMethod: Map<WideRequestMethod, Record<string, AnyRoute>>
  }): void => {
    const pointsByDefinitions = this.endpointsByDefinitionsByMethods.get(method)
    if (pointsByDefinitions) {
      for (const existingPoint of pointsByDefinitions.values()) {
        const existingRoute = existingPoint._endpoint?.route
        if (existingRoute && route.isConflict(existingRoute)) {
          throw new Error(
            `Conflicted endpoint routes for method "${method}": ${point.toStringWithLocation()} conflicts with ${existingPoint.toStringWithLocation()}`,
          )
        }
      }
      pointsByDefinitions.set(route.definition, point)
    } else {
      this.endpointsByDefinitionsByMethods.set(method, new Map([[route.definition, point]]))
    }

    const routes = routesByMethod.get(method)
    if (routes) {
      routes[route.definition] = route
    } else {
      routesByMethod.set(method, { [route.definition]: route })
    }
  }

  findPoint = ({
    type,
    name,
    scope,
  }: {
    type: PointType
    name: PointName
    scope: PointsScope
  }): ReadyPoint | undefined => {
    this.throwIfNotReady()
    if (!this.indexGenerated) {
      this.generateIndex()
    }
    return this.pointsByNamesByTypesByScopes.get(scope)?.get(type)?.get(name)
  }

  findEndpoint = (
    options:
      | { method: string; location: AnyLocation; url?: undefined }
      | {
          method: string
          url: string
          location?: undefined
        },
  ):
    | {
        point: RequestableReadyPoint
        location: ExactLocation
      }
    | undefined => {
    this.throwIfNotReady()
    if (!this.indexGenerated) {
      this.generateIndex()
    }
    const method = options.method as WideRequestMethod
    const routes = this.endpointsRoutesByMethods.get(method)
    if (!routes) {
      return undefined
    }
    const location = routes._.getLocation(options.location ?? options.url)
    if (!location.route) {
      return undefined
    }
    const point = this.endpointsByDefinitionsByMethods.get(method)?.get(location.route)
    if (!point) {
      return undefined
    }
    return {
      point: point as RequestableReadyPoint,
      location,
    }
  }

  findPage = (
    options:
      | { url: string | URL; scope?: PointsScope; location?: undefined }
      | { location: AnyLocation; scope?: PointsScope; url?: undefined },
  ): undefined | { point: PagePoint; location: ExactLocation } => {
    this.throwIfNotReady()
    if (!this.indexGenerated) {
      this.generateIndex()
    }
    if (!options.scope && this.scopes.size > 1) {
      throw new Error('Scope is required when multiple scopes exist')
    }
    const scope = options.scope ?? this.scopes.values().next().value
    if (!scope) {
      return undefined
    }
    const routes = this.pagesRoutesByScopes.get(scope)
    if (!routes) {
      return undefined
    }
    const pathname = options.location
      ? options.location.pathname
      : options.url instanceof URL
        ? options.url.pathname
        : new URL(options.url, 'http://localhost').pathname
    const location = routes._.getLocation(pathname)
    if (!location.route) {
      return undefined
    }
    const point = this.pagesByDefinitionsByScopes.get(scope)?.get(location.route)
    if (!point) {
      return undefined
    }
    return {
      point,
      location,
    }
  }

  getTransformerByScope = ({ scope }: { scope: PointsScope }): DataTransformerExtended => {
    const transformerByScope = this.transformers.get(scope)
    if (transformerByScope) {
      return transformerByScope
    }
    throw new Error(`Transformer not found for scope "${scope}"`)
  }

  private _collection: ReadyPoint[] | undefined
  get collection(): ReadyPoint[] {
    if (this._collection) {
      return this._collection
    }
    this._collection = this.manager.collection.map((p) => p.point)
    return this._collection
  }
}
