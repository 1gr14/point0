import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import { dehydrate, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import * as React from 'react'
import type {
  AnyPoint,
  BaseId,
  Ctx,
  Data,
  DestinationComponentType,
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
  WrapperComponentType,
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

  _getSuitableSelfEversionByLocation({
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
  _getSuitableEversionByLocation({
    method: providedMethod,
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const suitableSelfEversion = this._getSuitableSelfEversionByLocation({ method: providedMethod, location, baseId })
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableChildEversion = (() => {
      for (const child of this.children) {
        const result = child._getSuitableEversionByLocation({ method: providedMethod, location, baseId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableChildEversion) {
      return suitableChildEversion
    }
    return undefined
  }
  _getSuitableEversionByBaseId({ baseId }: { baseId: BaseId | undefined }): Eversion0<TRequiredCtx> | undefined {
    const suitableSelfEversion = this.base._baseId === baseId ? this : undefined
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableChildEversion = (() => {
      for (const child of this.children) {
        const result = child._getSuitableEversionByBaseId({ baseId })
        if (result) {
          return result
        }
      }
      return undefined
    })()
    if (suitableChildEversion) {
      return suitableChildEversion
    }
    return undefined
  }
  getSuitableEversionByLocation({
    method: providedMethod,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
    fallbackBaseId: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> {
    const location = this.normalizeLocation(locationProps)
    const suitableEversionByLoaction = this._getSuitableEversionByLocation({ method: providedMethod, location, baseId })
    if (suitableEversionByLoaction) {
      return suitableEversionByLoaction
    }
    const suitableEversionByBaseId = this._getSuitableEversionByBaseId({ baseId })
    if (suitableEversionByBaseId) {
      return suitableEversionByBaseId
    }
    const suitableEversionByFallbackBaseId = this._getSuitableEversionByBaseId({ baseId: fallbackBaseId })
    if (suitableEversionByFallbackBaseId) {
      return suitableEversionByFallbackBaseId
    }
    throw new Error(
      `No suitable eversion found for method "${providedMethod}" at location "${location.pathname}" and base id "${baseId}" and fallback base id "${fallbackBaseId}"`,
    )
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
    // TODO: allow find just by id
    const suitableEversion = this.getSuitableEversionByLocation({
      method: providedMethod,
      location,
      baseId,
      fallbackBaseId,
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
        return this.withDehydratedState({
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          pageComponent: point.getPageComponent(),
          error: undefined,
          status: 200,
          base: this.base,
          wrapper: this.base._wrapper,
          eversion: this,
        })
      } else {
        return this.withDehydratedState({
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
          pageComponent: undefined,
          error: new Error0(`Point Not Found: ${location.pathname}`),
          status: 404,
          base: this.base,
          wrapper: this.base._wrapper,
          eversion: this,
        })
      }
    } catch (error) {
      return this.withDehydratedState({
        ctx: ctxOutput,
        payload: { data: dataOutput, meta, location },
        pageComponent: undefined,
        error,
        status: 500,
        base: this.base,
        wrapper: this.base._wrapper,
        eversion: this,
      })
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
    return await suitable.eversion.extract({ point: suitable.point, requiredCtx, location: suitable.location } as never)
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

  wrapWithReactQuery({
    type,
    location,
    component,
    wrapper,
    error,
    queryClient,
  }: {
    type: DestinationComponentType
    location: Route0.Location
    component?: PageComponent
    wrapper?: WrapperComponentType | undefined
    error?: unknown
    queryClient: QueryClient
  }): React.ReactElement {
    const ReactQueryClientProvider = ({ children }: { children: React.ReactNode }) => {
      return React.createElement(QueryClientProvider, { client: queryClient }, children)
    }
    const ReactQueryFetcher = () => {
      const result = useQuery<Payload>({
        queryKey: this.base.getQueryKey({ location }),
        queryFn: async () => await fetch(location.pathname, {}).then(async (res) => await res.json()),
      })
      const loaderComponent = this.base.getLoaderComponent({ type })
      const errorComponent = this.base.getErrorComponent({ type })
      if (error) {
        return React.createElement(errorComponent, { type, error: Error0.from(error), location })
      }
      if (result.isLoading) {
        return React.createElement(loaderComponent, { type, location })
      }
      if (result.error) {
        return React.createElement(errorComponent, { type, error: Error0.from(result.error), location })
      }
      if (!result.data) {
        return React.createElement(errorComponent, { type, error: new Error0('No data'), location })
      }
      if (!component) {
        return React.createElement(errorComponent, { type, error: new Error0('No component'), location })
      }
      return React.createElement(component, { data: result.data, location })
    }
    if (wrapper) {
      return React.createElement(wrapper, {
        children: React.createElement(ReactQueryClientProvider, undefined, React.createElement(ReactQueryFetcher)),
      })
    }
    return React.createElement(ReactQueryClientProvider, undefined, React.createElement(ReactQueryFetcher))
  }

  notWrapWithReactQuery({
    type,
    location,
    component,
    payload,
    wrapper,
    error,
  }: {
    type: DestinationComponentType
    location: Route0.Location
    payload?: Payload
    component?: PageComponent
    wrapper?: WrapperComponentType | undefined
    error?: unknown
  }): React.ReactElement {
    const errorComponent = this.base.getErrorComponent({ type })
    const ComponentProvider = () => {
      if (error) {
        return React.createElement(errorComponent, { type, error: Error0.from(error), location })
      }
      if (!payload) {
        return React.createElement(errorComponent, { type, error: new Error0('No payload'), location })
      }
      if (component) {
        return React.createElement(component, { data: payload.data, location })
      }
      return React.createElement(errorComponent, { type, error: new Error0('No component'), location })
    }
    if (wrapper) {
      return React.createElement(wrapper, { children: React.createElement(ComponentProvider) })
    }
    return React.createElement(ComponentProvider)
  }

  wrapOrNotWrapWithReactQuery({
    type,
    location,
    payload,
    component,
    wrapper,
    error,
  }: {
    type: DestinationComponentType
    location: Route0.Location
    payload?: Payload
    component?: PageComponent
    queryClient: QueryClient | undefined
    wrapper?: WrapperComponentType | undefined
    error?: unknown
  }): React.ReactElement {
    if (this.base._queryClient) {
      return this.wrapWithReactQuery({ type, location, component, wrapper, error, queryClient: this.base._queryClient })
    }
    return this.notWrapWithReactQuery({ type, location, payload, component, wrapper, error })
  }

  withDehydratedState<T extends { payload: Payload; error: unknown }>(
    input: T,
  ): T & { dehydratedState: DehydratedState } {
    const queryClient = new QueryClient()
    const queryKey = this.base.getQueryKey({ location: input.payload.location })
    queryClient.setQueryData(queryKey, input.payload)
    const queryCache = queryClient.getQueryCache().find({ queryKey })
    if (!queryCache) {
      throw new Error('Query cache not found, it is unbelievable')
    }
    if (input.error) {
      queryCache.state.error = { ...Error0.toJSON(input.error), name: 'Error0' }
    }
    queryCache.state.status = input.error ? 'error' : 'success'
    const dehydratedState = dehydrate(queryClient)
    return {
      ...input,
      payload: {
        ...input.payload,
      },
      dehydratedState,
    }
  }

  fillPageComponent<TPoint extends AnyPoint | undefined = undefined>({
    wrapper,
    component,
    point,
    error,
    status,
    payload,
    location,
  }: {
    wrapper?: WrapperComponentType | undefined
    component?: PageComponent | undefined
    point?: TPoint | undefined
    payload?: Payload
    error?: unknown
    status?: number | undefined
    location: Route0.Location
  }): FillPageResult {
    // TODO: use provided errors
    if (error) {
      return {
        element: this.wrapOrNotWrapWithReactQuery({
          type: 'page',
          location,
          error,
          wrapper,
          queryClient: this.base._queryClient,
          component,
          payload,
        }),
        error,
        status,
      }
    }
    if (!payload) {
      const error = new Error0(`No payload`)
      return {
        element: this.wrapOrNotWrapWithReactQuery({
          type: 'page',
          location,
          error,
          wrapper,
          queryClient: this.base._queryClient,
          component,
          payload,
        }),
        error,
        status: 500,
      }
    }
    if (component) {
      return {
        element: this.wrapOrNotWrapWithReactQuery({
          type: 'page',
          location: payload.location,
          component,
          wrapper,
          queryClient: this.base._queryClient,
          payload,
        }),
        error: undefined,
        status,
      }
    }
    if (point) {
      const componentFromPoint = point.getPageComponent()
      if (componentFromPoint) {
        return {
          element: this.wrapOrNotWrapWithReactQuery({
            type: 'page',
            location: payload.location,
            component: componentFromPoint,
            wrapper,
            queryClient: this.base._queryClient,
            payload,
          }),
          error: undefined,
          status,
        }
      } else {
        return {
          element: this.wrapOrNotWrapWithReactQuery({
            type: 'page',
            location: payload.location,
            error: new Error0(`Point has no page element`),
            wrapper,
            queryClient: this.base._queryClient,
            payload,
          }),
          error: new Error(`Point has no page element`),
          status: 404,
        }
      }
    }
    const error1 = new Error0(`No compoentn, no point: ${payload.location.pathname}`)
    return {
      element: this.wrapOrNotWrapWithReactQuery({
        type: 'page',
        location: payload.location,
        error: error1,
        wrapper,
        queryClient: this.base._queryClient,
        payload,
      }),
      error: error1,
      status: 404,
    }
  }

  // TODO: respect base id and children
  async fillSuitablePageComponent({
    wrapper,
    payload,
    error,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    wrapper?: React.ComponentType<{ children: React.ReactNode }>
    payload: Payload
    error?: unknown
    baseId?: BaseId | undefined
    fallbackBaseId?: BaseId | undefined
  } & LocationInput): Promise<FillPageResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = await this.getSuitablePageComponent({ location, baseId, fallbackBaseId })
    return this.fillPageComponent({ wrapper, component: suitable?.component, payload, error, location })
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
  dehydratedState: DehydratedState
  base: InitialBasePoint | ExtendedBasePoint
  pageComponent: PageComponent | undefined
  eversion: Eversion0
  wrapper: WrapperComponentType | undefined
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>
