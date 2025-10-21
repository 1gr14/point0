import { Route0 } from '@devp0nt/route0'
import * as React from 'react'
import type {
  AnyPoint,
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
export class Eversion0<TRequiredCtx extends RequiredCtx = UndefinedCtx> {
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

  _getSuitableChildPoint({
    method: providedMethod,
    ...locationProps
  }: {
    method: Method
  } & LocationInput):
    | {
        point: ReadyPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    const location = this.normalizeLocation(locationProps)
    for (const child of this.children) {
      const result = child.getSuitablePoint({ method: providedMethod, location })
      if (result) {
        return result
      }
    }
    return undefined
  }
  _getSuitableSelfPoint({
    method: providedMethod,
    ...locationProps
  }: {
    method: Method
  } & LocationInput):
    | {
        point: ReadyPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
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
    ...locationProps
  }: {
    method: Method
  } & LocationInput):
    | {
        point: ReadyPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableChildPoint = this._getSuitableChildPoint({ method: providedMethod, location })
    if (suitableChildPoint) {
      return suitableChildPoint
    }
    const suitableSelfPoint = this._getSuitableSelfPoint({ method: providedMethod, location })
    if (suitableSelfPoint) {
      return suitableSelfPoint
    }
    return undefined
  }

  _getSuitableChildEversion<TForce extends boolean = false>({
    method: providedMethod,
    force = false,
    ...locationProps
  }: {
    method: Method
    force?: boolean
  } & LocationInput): TForce extends true ? Eversion0<TRequiredCtx> : Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    for (const child of this.children) {
      const result = child.getSuitableEversion({ method: providedMethod, location, force })
      if (result) {
        return result
      }
    }
    if (force) {
      return this
    }
    return undefined as never
  }
  _getSuitableSelfEversion<TForce extends boolean = false>({
    method: providedMethod,
    force = false as TForce,
    ...locationProps
  }: {
    method: Method
    force?: TForce
  } & LocationInput): TForce extends true ? Eversion0<TRequiredCtx> : Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const route = this.base.getRoute()
    if (!route) {
      if (force) {
        return this
      }
      return undefined as never
    }
    const match = Route0.getMatch(route, location)
    if (match.parent || match.exact) {
      return this
    }
    return undefined as never
  }
  getSuitableEversion<TForce extends boolean = false>({
    method: providedMethod,
    force = false,
    ...locationProps
  }: {
    method: Method
    force?: boolean
  } & LocationInput): TForce extends true ? Eversion0<TRequiredCtx> : Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableChildEversion = this._getSuitableChildEversion({ method: providedMethod, location })
    if (suitableChildEversion) {
      return suitableChildEversion
    }
    const suitableSelfEversion = this._getSuitableSelfEversion({ method: providedMethod, location })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    if (force) {
      const suitableChildEversion = this._getSuitableChildEversion({ method: providedMethod, location, force: true })
      if (suitableChildEversion) {
        return suitableChildEversion
      }
      return this
    }
    return undefined as never
  }

  getSuitable<TForce extends boolean = false>({
    method: providedMethod,
    force = false as TForce, // return self (if no children) or first child eversion without nested child, if no one suitable found
    ...locationProps
  }: {
    method: Method
    force?: TForce
  } & LocationInput): TForce extends true
    ? {
        point: ReadyPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    :
        | {
            point: ReadyPoint | undefined
            location: Route0.Location
            eversion: Eversion0<TRequiredCtx> | undefined
          }
        | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitablePoint = this.getSuitablePoint({ method: providedMethod, location })
    if (suitablePoint) {
      return suitablePoint
    }
    const suitableEversion = this.getSuitableEversion({ method: providedMethod, location, force })
    if (suitableEversion) {
      return { point: undefined, location, eversion: suitableEversion } as never
    }
    return undefined as never
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
        return { ctx: ctxOutput, payload: { data: dataOutput, meta, location }, error: undefined, status: 200 }
      } else {
        return {
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          error: new Error(`Point Not Found: ${location.pathname}`),
          status: 404,
        }
      }
    } catch (error) {
      return { ctx: ctxOutput, payload: { data: dataOutput, meta, location }, error, status: 500 }
    }
  }

  async extractSuitable({
    method: providedMethod,
    requiredCtx,
    ...locationProps
  }: WithRequiredCtx<TRequiredCtx> & {
    method: Method
    point?: AnyPoint | undefined
  } & LocationInput): Promise<ExtractResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = this.getSuitable({ method: providedMethod, location, force: true })
    return await this.extract({ point: suitable.point, requiredCtx, location: suitable.location } as never)
  }

  // TODO: make it also work for nested children
  // but for now we use it only in hidration where all pages in root eversion
  async getSuitablePageComponent({ ...locationProps }: {} & LocationInput): Promise<
    | {
        component: PageComponent
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined
  > {
    const location = this.normalizeLocation(locationProps)
    for (const record of this.pages) {
      const match = Route0.getMatch(record.route, location)
      if (match.exact) {
        const component = 'component' in record ? record.component : await record.lazy()
        return { component, location: match.location, eversion: this }
      }
    }
    return undefined
  }

  // TODO
  // not async getSuitablePage(), becouse we here check only by route and it is work with pages collection not points collection

  fillPage<TPoint extends AnyPoint | undefined = undefined>({
    component,
    point,
    // TODO: use provided error to show correct page
    error,
    status,
    payload,
    ...locationProps
  }: {
    component?: PageComponent | undefined
    point?: TPoint | undefined
    payload: Payload
    error?: unknown
    status?: number | undefined
  } & LocationInput): {
    element: React.ReactElement
    status: number | undefined
    error: unknown
    location: Route0.Location
  } {
    const location = this.normalizeLocation(locationProps)
    if (error) {
      const element = <div>Error: {(error as Error).message}</div>
      return { element, error, status, location }
    }
    if (point) {
      const componentFromPoint = point.getPageComponent()
      if (!componentFromPoint) {
        // TODO: use provided errors
        return {
          element: <div>Point has no page element</div>,
          error: new Error(`Point has no page element`),
          status: 404,
          location,
        }
      } else {
        return {
          element: React.createElement(componentFromPoint, { data: payload.data, location }),
          error: new Error(`Point has no page element`),
          status: 404,
          location,
        }
      }
    } else if (component) {
      return {
        element: React.createElement(component, { data: payload.data, location }),
        error: undefined,
        status,
        location,
      }
    }
    return {
      element: <div>Page not found</div>,
      error: new Error(`Page not found: ${location.pathname}`),
      status: 404,
      location,
    }
  }

  async fillSuitablePage({
    payload,
    error,
    ...locationProps
  }: {
    payload: Payload
    error?: unknown
  } & LocationInput): Promise<{
    element: React.ReactElement
    error: unknown
    location: Route0.Location
  }> {
    const location = this.normalizeLocation(locationProps)
    const suitable = await this.getSuitablePageComponent({ location })
    if (!suitable) {
      return {
        element: <div>Page not found</div>,
        error: new Error(`Page not found: ${location.pathname}`),
        location,
      }
    }
    return {
      element: React.createElement(suitable.component, { data: payload.data, location }),
      error: undefined,
      location,
    }
  }
}

export type CreateEversionInput<TRequiredCtx extends RequiredCtx> = {
  base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
  parent?: null
  points?: PointsCollection
  pages?: PagesCollection
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

// export type WithRequiredCtx<TBasePoint extends AnyPoint = AnyPoint<any, Ctx> | AnyPoint<any, UndefinedCtx>> =
//   TBasePoint extends AnyPoint
//     ? TBasePoint['Infer']['RequiredCtx'] extends Ctx
//       ? {
//           requiredCtx: TBasePoint['Infer']['RequiredCtx']
//         }
//       : { requiredCtx?: undefined }
//     : { requiredCtx?: undefined }
// export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = TRequiredCtx extends Ctx
//   ? {
//       requiredCtx: TRequiredCtx
//     }
//   : { requiredCtx?: undefined }

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
  status: number | undefined
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>
