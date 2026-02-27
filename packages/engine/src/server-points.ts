import type { AnyRoute } from '@devp0nt/route0'
import { PointsManager } from '@point0/core'
import type {
  DataTransformerExtended,
  ErrorPoint0,
  LayoutPoint,
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

export class ServerPoints<TError extends ErrorPoint0> {
  manager: PointsManager<true, RequiredCtx, TError>

  transformers = new Map<PointsScope, DataTransformerExtended>()
  roots = new Map<PointsScope, RootPoint>()
  scopes = new Set<PointsScope>()
  middlewares = new Map<PointsScope, MiddlewareFn<any>[]>()

  private constructor({ manager }: { manager: PointsManager }) {
    this.manager = manager as never
  }

  static createFromDefinition<TError extends ErrorPoint0>(
    points: PointsDefinition<RequiredCtx, TError> | PointsManager<boolean, RequiredCtx, TError>,
  ): ServerPoints<TError> {
    const manager = PointsManager.createFromDefinition(points)
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
  ): Promise<ServerPoints<TError>> {
    const manager = await PointsManager.createFromSource(source)
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
    return this
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
