import { Route0 } from '@devp0nt/route0'
import * as React from 'react'
import type {
  AnyPoint,
  BaseId,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  ExtendedBasePoint,
  InitialBasePoint,
  MetaMap,
  Method,
  PageComponent,
  ReadyPoint,
  RequiredCtx,
  UndefinedCtx,
} from '../core/index.js'

// TODO: when find suitable allow porvide "baseId", then it will find only inside that
// so remove force
export class Eversion0<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
  parent: Eversion0<TRequiredCtx> | undefined
  points: PointsCollection
  pages: PagesCollection
  children: Array<Eversion0<TRequiredCtx>>

  private constructor({
    base,
    parent,
    points,
    pages,
    children,
  }: {
    base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
    parent?: Eversion0<TRequiredCtx> | undefined
    points?: PointsCollection
    pages?: PagesCollection
    children?: Array<Eversion0<TRequiredCtx>>
  }) {
    this.base = base
    this.points = points ?? []
    this.pages = pages ?? []
    this.children = children ?? []
    this.parent = parent
  }

  static create<
    TBasePoint extends InitialBasePoint,
    TRequiredCtx extends RequiredCtx = TBasePoint['Infer']['RequiredCtx'],
  >({ base, points, pages }: CreateEversionInput<TRequiredCtx>): Eversion0<TRequiredCtx> {
    return new Eversion0<TRequiredCtx>({ base, points, pages })
  }

  addChild(input: CreateEversionInput<TRequiredCtx>) {
    const child = new Eversion0<TRequiredCtx>({
      base: input.base,
      points: input.points,
      pages: input.pages,
      parent: input.parent === null ? undefined : this,
    })
    this.children.push(child)
  }

  getParents(): [InitialBasePoint, ...ExtendedBasePoint[]] | [] {
    const parents: Array<InitialBasePoint | ExtendedBasePoint> = []
    let current: Eversion0<TRequiredCtx> | undefined = this.parent
    while (current) {
      parents.push(current.base)
      current = current.parent
    }
    return parents.reverse() as [InitialBasePoint, ...ExtendedBasePoint[]] | []
  }

  idToLocation(id: string): Route0.Location {
    return Route0.getLocation(`/endpoints/${id}`)
  }

  normalizeLocation(input: LocationInput): Route0.Location {
    const location = 'location' in input ? input.location : 'path' in input ? Route0.getLocation(input.path) : undefined
    if (location) {
      return location
    }
    const id = 'id' in input ? input.id : undefined
    if (id) {
      return this.idToLocation(id)
    }
    throw new Error('location or path or id is required')
  }

  _getSuitableSelfPoint({
    method: providedMethod,
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
  } & LocationInput):
    | {
        point: ReadyPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    if (baseId && this.base.getId() !== baseId) {
      return undefined
    }
    const location = this.normalizeLocation(locationProps)
    for (const { method, route, point } of this.points) {
      if (providedMethod.toLowerCase() !== method.toLowerCase()) {
        continue
      }
      const match = Route0.getMatch(route, location)
      if (!match.exact) {
        continue
      }
      return {
        point,
        location: match.location,
        eversion: this,
      }
    }
    return undefined
  }
  getSuitablePoint({
    method: providedMethod,
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
  } & LocationInput): GetSuitablePointResult<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfPoint = this._getSuitableSelfPoint({ method: providedMethod, location, baseId })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    const suitableChildPoint = (() => {
      for (const child of this.children) {
        const result = child.getSuitablePoint({ method: providedMethod, location, baseId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableChildPoint) {
      return suitableChildPoint
    }
    return undefined
  }

  _getSuitableSelfEversion({
    method: providedMethod,
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const route = this.base.getRoute()
    if (!route) {
      return undefined
    }
    const match = Route0.getMatch(route, location)
    if (match.parent || match.exact) {
      return this
    }
    return undefined
  }

  _getSuitableEversion(
    props: {
      method: Method
      baseId?: BaseId | undefined
      force: true
      fallbackBaseId?: BaseId
    } & LocationInput,
  ): Eversion0<TRequiredCtx>
  _getSuitableEversion(
    props: {
      method: Method
      baseId?: BaseId | undefined
      force?: boolean
      fallbackBaseId?: BaseId
    } & LocationInput,
  ): Eversion0<TRequiredCtx> | undefined
  _getSuitableEversion({
    method: providedMethod,
    baseId,
    fallbackBaseId,
    force,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
    force?: boolean
    fallbackBaseId?: BaseId
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfEversion = this._getSuitableSelfEversion({ method: providedMethod, location, baseId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableChildEversion = (() => {
      for (const child of this.children) {
        const result = child._getSuitableEversion({ method: providedMethod, location, baseId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableChildEversion) {
      return suitableChildEversion
    }
    if (fallbackBaseId) {
      return this._getSuitableEversion({ method: providedMethod, location, baseId: fallbackBaseId })
    }
    if (force) {
      throw new Error(
        `No suitable eversion found for method "${providedMethod}" at location "${location.pathname}" and base id "${baseId}" and fallback base id "${fallbackBaseId}"`,
      )
    }
    return undefined
  }

  getSuitable({
    method: providedMethod,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId
    fallbackBaseId: BaseId
  } & LocationInput): GetSuitableResult<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitablePoint = this.getSuitablePoint({ method: providedMethod, location, baseId })
    if (suitablePoint) {
      return suitablePoint
    }
    const suitableEversion = this._getSuitableEversion({
      method: providedMethod,
      location,
      baseId,
      fallbackBaseId,
      force: true,
    })
    return { point: undefined, location, eversion: suitableEversion }
  }

  async extract({
    point,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    point?: AnyPoint | undefined
  } & LocationInput): Promise<ExtractResult> {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [
      ...this.getParents().flatMap((parent) => parent.getExtendFns()),
      ...this.base.getExtendFns(),
      ...(point?._extendFns ?? []),
    ]
    const location = this.normalizeLocation(locationProps)
    // TODO: get real meta
    const meta = { title: 'Hello, world!' }
    // TODO: get status from real point data

    try {
      for (const extendFn of extendFns) {
        switch (extendFn.type) {
          case 'ctx':
            ctxOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
            break
          case 'loader':
            dataOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
            break
          // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
          default:
            throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
        }
      }
      if (point) {
        return {
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          pageComponent: point.getPageComponent(),
          error: undefined,
          status: 200,
          base: this.base,
          eversion: this,
        }
      } else {
        return {
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          pageComponent: undefined,
          error: new Error(`Point Not Found: ${location.pathname}`),
          status: 404,
          base: this.base,
          eversion: this,
        }
      }
    } catch (error) {
      return {
        ctx: ctxOutput,
        payload: { data: dataOutput, meta, location },
        pageComponent: undefined,
        error,
        status: 500,
        base: this.base,
        eversion: this,
      }
    }
  }

  async extractSuitable({
    method: providedMethod,
    requiredCtx,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    method: Method
    baseId?: BaseId | undefined
    fallbackBaseId: BaseId
    point?: AnyPoint | undefined
  } & LocationInput): Promise<ExtractResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = this.getSuitable({ method: providedMethod, location, baseId, fallbackBaseId })
    return await this.extract({ point: suitable.point, requiredCtx, location: suitable.location } as never)
  }

  // TODO: make it also work for nested children, and respect base id
  // but for now we use it only in hidration where all pages in root eversion
  async getSuitablePageComponent({
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    baseId?: BaseId | undefined
    fallbackBaseId?: BaseId | undefined
  } & LocationInput): Promise<GetSuitablePageComponentResult | undefined> {
    const location = this.normalizeLocation(locationProps)
    for (const record of this.pages) {
      const match = Route0.getMatch(record.route, location)
      if (match.exact) {
        const component = 'component' in record ? record.component : await record.lazy()
        return { component, location: match.location, eversion: this }
      }
    }
    return undefined as never
  }

  fillPage<TPoint extends AnyPoint | undefined = undefined>({
    component,
    point,
    error,
    status,
    payload,
  }: {
    component?: PageComponent | undefined
    point?: TPoint | undefined
    payload?: Payload
    error?: unknown
    status?: number | undefined
  }): FillPageResult {
    // TODO: use provided errors
    if (error) {
      const element = <div>Error: {(error as Error).message}</div>
      return { element, error, status }
    }
    if (!payload) {
      return {
        element: <div>No payload</div>,
        error: new Error(`No payload`),
        status: 500,
      }
    }
    if (component) {
      return {
        element: React.createElement(component, { data: payload.data, location: payload.location }),
        error: undefined,
        status,
      }
    }
    if (point) {
      const componentFromPoint = point.getPageComponent()
      if (componentFromPoint) {
        return {
          element: React.createElement(componentFromPoint, { data: payload.data, location: payload.location }),
          error: undefined,
          status,
        }
      } else {
        return {
          element: <div>Point has no page element</div>,
          error: new Error(`Point has no page element`),
          status: 404,
        }
      }
    }
    return {
      element: <div>Page not found</div>,
      error: new Error(`Page not found: ${payload.location.pathname}`),
      status: 404,
    }
  }

  // TODO: respect base id and children
  async fillSuitablePage({
    payload,
    error,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    payload: Payload
    error?: unknown
    baseId?: BaseId | undefined
    fallbackBaseId?: BaseId | undefined
  } & LocationInput): Promise<FillPageResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = await this.getSuitablePageComponent({ location, baseId, fallbackBaseId })
    if (!suitable) {
      return {
        element: <div>Page not found</div>,
        error: new Error(`Page not found: ${location.pathname}`),
        status: 404,
      }
    }
    return {
      element: React.createElement(suitable.component, { data: payload.data, location: payload.location }),
      error: undefined,
      status: 200,
    }
  }
}

export type CreateEversionInput<TRequiredCtx extends RequiredCtx> = {
  base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
  parent?: null
  points?: PointsCollection
  pages?: PagesCollection
}

export type GetSuitablePointResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: ReadyPoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: ReadyPoint | undefined
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitablePageComponentResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  component: PageComponent
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type FillPageResult = {
  element: React.ReactElement
  error: unknown
  status: number | undefined
}

export type PointsCollectionRecord = {
  method: Method
  route: Route0.AnyRoute
  point: ReadyPoint
}
export type PointsCollection = PointsCollectionRecord[]
export type PagesCollectionRecord = {
  route: Route0.AnyRoute
} & ({ component: PageComponent } | { lazy: () => Promise<PageComponent> })
export type PagesCollection = PagesCollectionRecord[]

export type LocationInput = { path: string } | { location: Route0.Location } | { id: string }

export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = TRequiredCtx extends Ctx
  ? {
      requiredCtx: TRequiredCtx
    }
  : { requiredCtx?: undefined }

export type Payload<TData extends Data = Data> = { location: Route0.Location; data: TData; meta: MetaMap | MetaMap[] }
export type ExtractResult<TOutputCtx extends Ctx = Ctx, TOutputData extends Data = Data> = {
  ctx: TOutputCtx
  payload: Payload<TOutputData>
  error: unknown
  status: number
  base: InitialBasePoint | ExtendedBasePoint
  pageComponent: PageComponent | undefined
  eversion: Eversion0
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>
