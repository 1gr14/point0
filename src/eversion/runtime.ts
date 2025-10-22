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
  PagePoint,
  ReadyPoint,
  ReadyPointType,
  RequiredCtx,
  UndefinedCtx,
} from '../core/index.js'
import { useEffect } from 'react'

// TODO: when find suitable allow porvide "baseId", then it will find only inside that
// so remove force
export class Eversion0<TRequiredCtx extends RequiredCtx = RequiredCtx> {
  base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
  parent: Eversion0<TRequiredCtx> | undefined
  points: PointsCollection
  children: Array<Eversion0<TRequiredCtx>>

  private constructor({
    base,
    parent,
    points,
    children,
  }: {
    base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
    parent?: Eversion0<TRequiredCtx> | undefined
    points?: PointsCollection
    children?: Array<Eversion0<TRequiredCtx>>
  }) {
    this.base = base
    this.points = points ?? []
    this.children = children ?? []
    this.parent = parent
  }

  static create<
    TBasePoint extends InitialBasePoint,
    TRequiredCtx extends RequiredCtx = TBasePoint['Infer']['RequiredCtx'],
  >({ base, points }: CreateEversionInput<TRequiredCtx>): Eversion0<TRequiredCtx> {
    return new Eversion0<TRequiredCtx>({ base, points })
  }

  addChild(input: CreateEversionInput<TRequiredCtx>) {
    const child = new Eversion0<TRequiredCtx>({
      base: input.base,
      points: input.points,
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
          point,
          error: undefined,
          status: 200,
          base: this.base,
          eversion: this,
        })
      } else {
        return this.withDehydratedState({
          ctx: ctxOutput,
          payload: { data: dataOutput, meta, location },
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
        payload: { data: dataOutput, meta, location },
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

  // TODO: make it also work for nested children, and respect base id
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
        return { point: record.point, base: this.base, location: match.location, eversion: this }
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

  wrapComponentWithReactQueryFetcher({
    component,
    point,
  }: {
    component: PageComponent
    point: AnyPoint
  }): PageComponent {
    if (!point.hasLoaders()) {
      return component
    }
    function mergeHeaders(base?: HeadersInit, extra?: Record<string, string>): Headers {
      const merged = new Headers(base)
      if (extra) {
        for (const [key, value] of Object.entries(extra)) {
          merged.set(key, value)
        }
      }
      return merged
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

  getFullPageElement({
    point,
    base,
    location,
    payload,
    queryClient,
    error,
    dehydratedState,
  }: {
    point?: AnyPoint | undefined
    base: InitialBasePoint | ExtendedBasePoint
    location: Route0.Location
    payload?: Payload
    queryClient: QueryClient | undefined
    error?: unknown
    dehydratedState?: DehydratedState
  }): React.ReactElement {
    let pageComponent = point?.getPageComponent()
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
    if (this.base._wrapper) {
      pageElement = React.createElement(this.base._wrapper, { children: pageElement })
    }
    if (queryClient) {
      pageElement = this.wrapElementWithReactQueryProvider({ queryClient, dehydratedState, children: pageElement })
    }
    pageElement = this.wrapElementWithEversionContextProvider({ children: pageElement })
    return pageElement
  }

  withDehydratedState<T extends { payload: Payload; error: unknown; point: AnyPoint | undefined }>(
    input: T,
  ): T & { dehydratedState: DehydratedState } {
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
      },
      dehydratedState,
    }
  }

  fillPageComponent<TPoint extends AnyPoint | undefined = undefined>({
    point,
    base,
    error,
    status,
    payload,
    location,
    dehydratedState,
  }: {
    point?: TPoint | undefined
    base: InitialBasePoint | ExtendedBasePoint
    payload?: Payload
    error?: unknown
    status?: number | undefined
    location: Route0.Location
    dehydratedState?: DehydratedState
  }): FillPageResult {
    // TODO: use provided errors
    if (error) {
      return {
        element: this.getFullPageElement({
          point,
          base,
          location,
          error,
          queryClient: base._queryClient,
          payload,
          dehydratedState,
        }),
        error,
        status,
      }
    }
    return {
      element: this.getFullPageElement({
        point,
        base,
        location,
        queryClient: base._queryClient,
        payload,
        dehydratedState,
      }),
      error: undefined,
      status,
    }
  }

  // TODO: respect base id and children
  async fillSuitablePageComponent({
    payload,
    dehydratedState,
    error,
    baseId,
    fallbackBaseId,
    ...locationProps
  }: {
    payload: Payload
    dehydratedState: DehydratedState
    error?: unknown
    baseId?: BaseId | undefined
    fallbackBaseId?: BaseId | undefined
  } & LocationInput): Promise<FillPageResult> {
    const location = this.normalizeLocation(locationProps)
    const suitable = await this.getSuitablePagePoint({ location, baseId, fallbackBaseId })
    return this.fillPageComponent({
      point: suitable.point,
      base: suitable.base,
      payload,
      error,
      location: suitable.location,
      dehydratedState,
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
  base: InitialBasePoint<undefined, TRequiredCtx> | ExtendedBasePoint<any, TRequiredCtx>
  parent?: null
  points?: PointsCollection
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
  point: PagePoint | undefined
  base: InitialBasePoint | ExtendedBasePoint
  location: Route0.Location
  eversion: Eversion0<TRequiredCtx>
}
export type FillPageResult = {
  element: React.ReactElement
  error: unknown
  status: number | undefined
}

export type PointsCollectionRecord = {
  type: ReadyPointType
  method: Method
  route: Route0.AnyRoute
  point: ReadyPoint
}
export type PointsCollection = PointsCollectionRecord[]

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
  dehydratedState?: DehydratedState
  base: InitialBasePoint | ExtendedBasePoint
  point: AnyPoint | undefined
  eversion: Eversion0
}
export type InferExtractResult<TPoint extends AnyPoint> =
  TPoint extends AnyPoint<any, any, infer TOutputCtx, infer TOutputData, any, any>
    ? ExtractResult<TOutputCtx, TOutputData>
    : ExtractResult<EmptyCtx, EmptyData>
