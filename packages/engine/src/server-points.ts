import type { AnyLocation, AnyRoute, KnownLocation, RoutesPretty } from '@devp0nt/route0'
import { Routes } from '@devp0nt/route0'
import type {
  ActionPoint,
  DataTransformerExtended,
  ErrorPoint0,
  LayoutPoint,
  LoggerFn,
  MiddlewareFn,
  PagePoint,
  PointName,
  PointsDefinition,
  PointsDefinitionSource,
  PointsScope,
  PointType,
  ReadyPoint,
  RequiredCtx,
  RootPoint,
} from '@point0/core'
import { PointsManager } from '@point0/core'
import type { WideRequestMethod } from '@point0/core/request0'

export class ServerPoints<TError extends ErrorPoint0> {
  manager: PointsManager<true, RequiredCtx, TError>

  transformers = new Map<PointsScope, DataTransformerExtended>()
  roots = new Map<PointsScope, RootPoint>()
  scopes = new Set<PointsScope>()
  middlewares = new Map<PointsScope, MiddlewareFn<any>[]>()

  // <method, Routes0>
  private readonly endpointsRoutesByMethods = new Map<WideRequestMethod, RoutesPretty>()
  // <method, <route.definition, point>>
  private readonly endpointsByDefinitionsByMethods = new Map<WideRequestMethod, Map<string, ReadyPoint>>()
  private endpointsGenerated = false

  private constructor({ manager }: { manager: PointsManager }) {
    this.manager = manager as never
  }

  static createFromDefinition<TError extends ErrorPoint0>(
    points: PointsDefinition<RequiredCtx, TError> | PointsManager<boolean, RequiredCtx, TError>,
    options: { logger?: LoggerFn } = {},
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
    options: { logger?: LoggerFn } = {},
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
    this.generateAndValidateRoutes()
    return this
  }

  private generateAndValidateRoutes = (): void => {
    this.endpointsRoutesByMethods.clear()
    this.endpointsByDefinitionsByMethods.clear()
    const routesByMethod = new Map<WideRequestMethod, Record<string, AnyRoute>>()
    for (const { point } of this.manager.collection) {
      if (!point._endpoint) {
        continue
      }
      const method = point._endpoint.method
      const route = point._endpoint.route
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
    for (const [method, routes] of routesByMethod.entries()) {
      this.endpointsRoutesByMethods.set(method, Routes.create(routes))
    }
    this.endpointsGenerated = true
  }

  findExact = ({
    type,
    name,
    scope,
  }: {
    type: PointType
    name: PointName
    scope: PointsScope
  }): ReadyPoint | undefined => {
    this.throwIfNotReady()
    for (const { point } of this.manager.collection) {
      if (point.type === type && point.name === name && point.scope === scope) {
        return point
      }
    }
    return undefined
  }

  // findAction = ({
  //   method,
  //   hrefRel,
  // }: {
  //   method: string
  //   hrefRel: string
  // }):
  //   | {
  //       point: ActionPoint
  //       location: KnownLocation
  //     }
  //   | undefined => {
  //   this.throwIfNotReady()
  //   for (const { point } of this.manager.collection) {
  //     // TODO: optimize it later
  //     if (point.type !== 'action') {
  //       continue
  //     }
  //     if (point.method !== method) {
  //       continue
  //     }
  //     const location = (point.route as AnyRoute).getLocation(hrefRel)
  //     if (location.exact) {
  //       return {
  //         point: point as ActionPoint,
  //         location,
  //       }
  //     }
  //   }
  //   return undefined
  // }

  findEndpoint = (
    options:
      | { method: string; location: AnyLocation }
      | {
          method: string
          url: string
        },
  ):
    | {
        point: ActionPoint
        location: KnownLocation
      }
    | undefined => {
    this.throwIfNotReady()
    if (!this.endpointsGenerated) {
      this.generateAndValidateRoutes()
    }
    const method = options.method as WideRequestMethod
    const routes = this.endpointsRoutesByMethods.get(method)
    if (!routes) {
      return undefined
    }
    const location = routes._.getLocation('location' in options ? options.location : options.url)
    if (!location.exact) {
      return undefined
    }
    const point = this.endpointsByDefinitionsByMethods.get(method)?.get(location.route)
    if (!point) {
      return undefined
    }
    return {
      point: point as ActionPoint,
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
}

export type PagesTreeSourceRecord = {
  layout: string | undefined
  pages: string[]
  nested: undefined | PagesTreeSourceRecord[]
}
export type PagesTreeSource = PagesTreeSourceRecord[]

export type PagesTreeRecord = {
  layoutName?: PointName
  layoutPoint?: LayoutPoint | (() => Promise<LayoutPoint>) | undefined
  Layout?:
    | React.ComponentType<{ children: React.ReactNode }>
    | React.LazyExoticComponent<React.ComponentType<{ children: React.ReactNode }>>
    | undefined
  pages: Array<{
    pageName: PointName
    pageRoute: AnyRoute
    pagePoint: PagePoint | (() => Promise<PagePoint>)
    Page: React.ComponentType | React.LazyExoticComponent<React.ComponentType<any>>
  }>
  nested: undefined | PagesTreeRecord[]
}
export type PagesTree = PagesTreeRecord[]
