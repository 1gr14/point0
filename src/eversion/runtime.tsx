import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { DehydratedState } from '@tanstack/react-query'
import {
  dehydrate,
  hashKey,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as React from 'react'
import { useEffect } from 'react'
import type { ResolvableHead } from 'unhead/types'
import type {
  AnyPoint,
  BaseConnectionPoint,
  BaseId,
  BasePoint,
  BaseSourcePoint,
  Ctx,
  Data,
  EmptyCtx,
  EmptyData,
  EndPoint,
  EndPointType,
  Method,
  PageComponent,
  PagePoint,
  RequiredCtx,
  UndefinedCtx,
} from '../core/index.js'
import { mergeHeaders } from '../core/utils.js'

// TODO: when find suitable allow porvide "baseId", then it will find only inside that
// so remove force
export class Eversion0<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  base: BasePoint<TRequiredCtx>
  source: Eversion0<TRequiredCtx> | undefined
  points: PointsCollection
  connections: Array<Eversion0<TRequiredCtx>>

  private constructor({
    base,
    source,
    points,
    connections,
  }: {
    base: BasePoint<TRequiredCtx>
    source?: Eversion0<TRequiredCtx> | undefined
    points?: PointsCollection
    connections?: Array<Eversion0<TRequiredCtx>>
  }) {
    this.base = base
    this.points = points ?? []
    this.connections = connections ?? []
    this.source = source
  }

  static create<TBasePoint extends BasePoint>({
    base,
    points,
  }: {
    base: TBasePoint
    points?: PointsCollection
  }): Eversion0<TBasePoint['Infer']['RequiredCtx']> {
    return new Eversion0<TBasePoint['Infer']['RequiredCtx']>({ base, points })
  }

  connect({
    base,
    points,
  }: {
    base: BaseConnectionPoint<any, TRequiredCtx>
    points?: PointsCollection
  }): Eversion0<TRequiredCtx> {
    const connection = new Eversion0<TRequiredCtx>({
      base,
      points,
      source: this,
    })
    this.connections.push(connection)
    return connection
  }

  getParents(): [BaseSourcePoint, ...BaseConnectionPoint[]] | [] {
    const sources: Array<BaseSourcePoint | BaseConnectionPoint> = []
    let current: Eversion0<TRequiredCtx> | undefined = this.source
    while (current) {
      sources.push(current.base)
      current = current.source
    }
    return sources.reverse() as [BaseSourcePoint, ...BaseConnectionPoint[]] | []
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
        point: EndPoint
        location: Route0.Location
        eversion: Eversion0<TRequiredCtx>
      }
    | undefined {
    if (baseId && this.base._baseId !== baseId) {
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
    const suitableConnectionPoint = (() => {
      for (const connection of this.connections) {
        const result = connection.getSuitablePoint({ method: providedMethod, location, baseId })
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

  _getSuitableSelfEversionByLocation({
    method: providedMethod,
    baseId,
    ...locationProps
  }: {
    method: Method
    baseId?: BaseId | undefined
  } & LocationInput): Eversion0<TRequiredCtx> | undefined {
    const location = this.normalizeLocation(locationProps)
    const route = this.base._route
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
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByLocation({ method: providedMethod, location, baseId })
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
  _getSuitableEversionByBaseId({ baseId }: { baseId: BaseId | undefined }): Eversion0<TRequiredCtx> | undefined {
    const suitableSelfEversion = this.base._baseId === baseId ? this : undefined
    if (suitableSelfEversion) {
      return suitableSelfEversion
    }
    const suitableConnectionEversion = (() => {
      for (const connection of this.connections) {
        const result = connection._getSuitableEversionByBaseId({ baseId })
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
    const headOutput: ResolvableHead[] = []
    const extendFns = [
      ...this.getParents().flatMap((source) => source._extendFns),
      ...this.base._extendFns,
      ...(point?._extendFns ?? []),
    ]
    const location = this.normalizeLocation(locationProps)
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
          case 'head':
            headOutput.push(await extendFn.fn({ data: { ...dataOutput }, location }))
            break
          // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
          default:
            throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
        }
      }
      if (point) {
        return this.withDehydratedState({
          ctx: ctxOutput,
          payload: { data: dataOutput, head: headOutput, location },
          point,
          error: undefined,
          status: 200,
          base: this.base,
          eversion: this,
        })
      } else {
        return this.withDehydratedState({
          ctx: ctxOutput,
          payload: { data: dataOutput, head: headOutput, location },
          point,
          error: new Error0(`Point Not Found: ${location.pathname}`),
          status: 404,
          base: this.base,
          eversion: this,
        })
      }
    } catch (error) {
      return this.withDehydratedState({
        ctx: ctxOutput,
        payload: { data: dataOutput, head: headOutput, location },
        point,
        error,
        status: 500,
        base: this.base,
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

  // TODO: make it also work for nested connections, and respect base id
  // but for now we use it only in hidration where all pages in root eversion
  async getSuitablePagePoint({
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    baseId?: BaseId | undefined
    fallbackBaseId: BaseId | undefined
  } & LocationInput): Promise<GetSuitablePageComponentResult<TRequiredCtx>> {
    const location = this.normalizeLocation(locationProps)
    for (const record of this.points) {
      if (record.type !== 'page') {
        continue
      }
      const match = Route0.getMatch(record.route, location)
      if (match.exact) {
        return { point: record.point as PagePoint, base: this.base, location: match.location, eversion: this }
      }
    }
    return { point: undefined, base: this.base, location, eversion: this }
  }

  wrapElementWithEversionContextProvider({ children }: { children: React.ReactNode }): React.ReactElement {
    return React.createElement(EversionContextProvider, { children })
  }

  wrapComponentEversionContextInitialPageWatcher<T extends React.ComponentType<any>>(component: T): T {
    return function EversionContextInitialPageWatcher(props) {
      const { setIsInitialPage } = useEversionContext()
      useEffect(() => {
        return () => {
          setIsInitialPage(false)
        }
      }, [setIsInitialPage])
      return React.createElement(component, { ...props })
    } as T
  }

  wrapElementWithReactQueryProvider({
    queryClient,
    dehydratedState,
    children,
  }: {
    queryClient: QueryClient
    dehydratedState?: DehydratedState
    children: React.ReactNode
  }): React.ReactElement {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(HydrationBoundary, { state: dehydratedState }, children),
    )
  }

  async wrapElementWithUnheadProvider({ children }: { children: React.ReactNode }) {
    if (typeof window !== 'undefined') {
      const { UnheadProvider, createHead } = await import('@unhead/react/client')
      return React.createElement(UnheadProvider, { head: createHead(), children })
    } else {
      const { UnheadProvider, createHead } = await import('@unhead/react/server')
      return React.createElement(UnheadProvider, { value: createHead(), children })
    }
  }

  wrapComponentWithReactQueryFetcher({
    component,
    point,
  }: {
    component: PageComponent
    point: AnyPoint
  }): PageComponent {
    if (!point.hasLoader()) {
      return component
    }
    function PageComponent({ location }: { location: Route0.Location }): React.ReactElement {
      // TODO: get location from useLocation, which in ssr mode is useLoaderData().location else it is from expo or react router
      const { isInitialPage } = useEversionContext()
      const queryClient = useQueryClient()
      const cache = queryClient.getQueryCache()
      const queryKey = point.getQueryKey({ location })
      const query = cache.find({ queryKey })
      const result = useQuery<Payload['data']>({
        queryKey,
        queryFn: async () => {
          const fetchOptions = point._fetchOptions({ location })
          const headers = mergeHeaders(fetchOptions.headers, { Accept: 'application/json' })
          const res = await fetch(location.pathname, {
            ...fetchOptions,
            headers,
          })
          const json = await res.json()
          if (res.ok) {
            return json
          }
          throw Error0.from(json, {
            httpStatus: res.status,
          })
        },
        enabled: !isInitialPage || query?.state.status !== 'error',
        ...point._queryOptions,
        ...point._pageQueryOptions,
      })
      const loaderComponent = point.getLoaderComponent({ type: 'page' })
      const errorComponent = point.getErrorComponent({ type: 'page' })
      if (result.error) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(result.error), location })
      }
      if (result.isLoading) {
        return React.createElement(loaderComponent, { type: 'page', location })
      }
      if (!result.data) {
        return React.createElement(errorComponent, { type: 'page', error: new Error0('No data1'), location })
      }
      return React.createElement(component, { data: result.data, location })
    }
    return PageComponent
  }

  getBasePageElement({
    location,
    pageComponent,
    payload,
    error,
  }: {
    location: Route0.Location
    payload?: Payload
    pageComponent?: PageComponent
    error?: unknown
  }): React.ReactElement {
    const errorComponent = this.base.getErrorComponent({ type: 'page' })
    if (error) {
      return React.createElement(errorComponent, {
        type: 'page',
        error: Error0.from(error),
        location,
      })
    }
    if (!payload) {
      return React.createElement(errorComponent, {
        type: 'page',
        error: new Error0('No payload'),
        location,
      })
    }
    if (pageComponent) {
      return React.createElement(pageComponent, { data: payload.data, location })
    }
    return React.createElement(errorComponent, {
      type: 'page',
      error: new Error0('No component'),
      location,
    })
  }

  async getFullPageElement({
    point,
    base,
    location,
    payload,
    error,
  }: {
    point?: AnyPoint | undefined
    base: BasePoint
    location: Route0.Location
    payload?: Payload
    error?: unknown
  }): Promise<React.ReactElement> {
    let pageComponent = point?._page
    pageComponent &&= this.wrapComponentEversionContextInitialPageWatcher(pageComponent)
    pageComponent =
      point?._queryClient && pageComponent
        ? this.wrapComponentWithReactQueryFetcher({ component: pageComponent, point })
        : pageComponent
    let pageElement = this.getBasePageElement({
      location,
      payload,
      pageComponent,
      error,
    })
    if (base.hasHead()) {
      pageElement = await this.wrapElementWithUnheadProvider({ children: pageElement })
    }
    if (base._wrapper) {
      pageElement = React.createElement(base._wrapper, { children: pageElement })
    }
    if (base._queryClient) {
      pageElement = this.wrapElementWithReactQueryProvider({
        queryClient: base._queryClient,
        dehydratedState: payload?.dehydratedState,
        children: pageElement,
      })
    }
    pageElement = this.wrapElementWithEversionContextProvider({ children: pageElement })
    return pageElement
  }

  withDehydratedState<T extends { payload: Payload; error: unknown; point: AnyPoint | undefined }>(input: T): T {
    const queryClient = new QueryClient()
    if (input.point) {
      const queryKey = input.point.getQueryKey({ location: input.payload.location })
      const query = queryClient.getQueryCache().build(queryClient, { queryKey, queryHash: hashKey(queryKey) })
      if (input.error) {
        query.setState({
          data: undefined,
          error: { ...Error0.toJSON(input.error), name: 'Error0' },
          status: 'error',
          fetchStatus: 'idle',
        })
      } else {
        const query = queryClient.getQueryCache().build(queryClient, { queryKey, queryHash: hashKey(queryKey) })
        query.setState({
          data: input.payload.data,
          error: null,
          status: 'success',
          fetchStatus: 'idle',
        })
      }
    }
    const dehydratedState = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => {
        // This will include all queries, including failed ones
        return true
      },
    })
    return {
      ...input,
      payload: {
        ...input.payload,
        dehydratedState,
      },
    }
  }

  async fillPageComponent<TPoint extends AnyPoint | undefined = undefined>({
    point,
    base,
    error,
    status,
    payload,
    location,
  }: {
    point?: TPoint | undefined
    base: BasePoint
    payload?: Payload
    error?: unknown
    status?: number | undefined
    location: Route0.Location
  }): Promise<FillPageResult> {
    // TODO: use provided errors
    if (error) {
      return {
        element: await this.getFullPageElement({
          point,
          base,
          location,
          error,
          payload,
        }),
        error,
        status,
      }
    }
    return {
      element: await this.getFullPageElement({
        point,
        base,
        location,
        payload,
      }),
      error: undefined,
      status,
    }
  }

  // TODO: respect base id and connections
  async fillSuitablePageComponent({
    payload,
    error,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    payload?: Payload
    error?: unknown
    baseId?: BaseId | undefined
    fallbackBaseId?: BaseId | undefined
  } & LocationInput): Promise<FillPageResult> {
    const location = payload?.location || this.normalizeLocation(locationProps)
    const suitable = await this.getSuitablePagePoint({ location, baseId, fallbackBaseId })
    return await this.fillPageComponent({
      point: suitable.point,
      base: suitable.base,
      payload,
      error,
      location: suitable.location,
    })
  }
}

type EversionContextValue = {
  isInitialPage: boolean
  setIsInitialPage: React.Dispatch<React.SetStateAction<boolean>>
}
const EversionContext = React.createContext<EversionContextValue | undefined>(undefined)
function EversionContextProvider({ children }: { children: React.ReactNode }) {
  const [isInitialPage, setIsInitialPage] = React.useState(true)
  const value = React.useMemo(() => ({ isInitialPage, setIsInitialPage }), [isInitialPage])
  return React.createElement(EversionContext.Provider, { value }, children)
}
function useEversionContext(): EversionContextValue {
  const ctx = React.useContext(EversionContext)
  if (!ctx) throw new Error('useEversionContext must be used inside EversionContextProvider')
  return ctx
}

export type CreateEversionInput<TRequiredCtx extends RequiredCtx> = {
  base: BasePoint<TRequiredCtx>
  source?: null
  points?: PointsCollection
}

export type GetSuitablePointResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitableResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: EndPoint | undefined
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type GetSuitablePageComponentResult<TRequiredCtx extends RequiredCtx = RequiredCtx> = {
  point: PagePoint | undefined
  base: BasePoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type FillPageResult = {
  element: React.ReactElement
  error: unknown
  status: number | undefined
}

export type PointsCollectionRecord = {
  type: EndPointType
  method: Method
  route: Route0.AnyRoute
  point: EndPoint
}
export type PointsCollection = PointsCollectionRecord[]

export type LocationInput = { path: string } | { location: Route0.Location } | { id: string }

export type WithRequiredCtx<TRequiredCtx extends RequiredCtx = UndefinedCtx> = TRequiredCtx extends Ctx
  ? {
      requiredCtx: TRequiredCtx
    }
  : { requiredCtx?: undefined }

export type Payload<TData extends Data = Data> = {
  location: Route0.Location
  data: TData
  head: ResolvableHead[]
  dehydratedState?: DehydratedState
}
export type ExtractResult<TOutputCtx extends Ctx = Ctx, TOutputData extends Data = Data> = {
  ctx: TOutputCtx
  payload: Payload<TOutputData>
  error: unknown
  status: number
  base: BasePoint
  point: AnyPoint | undefined
  eversion: Eversion0
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>
