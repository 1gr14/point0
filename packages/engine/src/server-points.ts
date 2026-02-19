import type { AnyRoute } from '@devp0nt/route0'
import type {
  DataTransformerExtended,
  LayoutPoint,
  MiddlewareFn,
  PagePoint,
  PointName,
  PointsDefinition,
  PointsDefinitionSource,
  PointsScope,
  PointType,
  ReadyPoint,
  RootPoint,
} from '@point0/core'
import { PointsManager } from '@point0/core'

export class ServerPoints {
  manager: PointsManager<true>

  baseurl: string | null

  transformers = new Map<PointsScope, DataTransformerExtended>()
  roots = new Map<PointsScope, RootPoint>()
  scopes = new Set<PointsScope>()
  middlewares = new Map<PointsScope, MiddlewareFn[]>()

  private constructor({ manager, baseurl }: { manager: PointsManager; baseurl: string | null }) {
    this.baseurl = baseurl
    this.manager = manager as never
  }

  static createFromDefinition(points: PointsDefinition | PointsManager): ServerPoints {
    const manager = PointsManager.createFromDefinition(points)
    const baseurl = manager.root._baseurl ?? null
    const instance = new ServerPoints({ manager, baseurl })
    const roots = manager.getRoots()
    for (const root of roots) {
      instance.roots.set(root.scope, root)
      instance.transformers.set(root.scope, root._getTransformer())
      instance.scopes.add(root.scope)
      instance.middlewares.set(root.scope, root._middlewares)
    }
    return instance
  }

  static async createFromSource(source: PointsDefinitionSource): Promise<ServerPoints> {
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
