import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type {
  MutationOptions,
  QueryClient,
  QueryOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import qs from 'qs'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type z from 'zod'
import { mergeHeaders, mergeResolvableHead } from './utils.js'
import { useIsInitalSsrLocation, useLocation } from './router.js'

export class Point0<
  TPointType extends PointType,
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
> {
  Infer: Infer<TRequiredCtx, TCtx, TData, TClientData, TInputSchema> & {
    Input: Input<TRoute, TInputSchema>
  } = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static _prevUnstableId = 0
  static _getNextUnstableId(): number {
    return Point0._prevUnstableId++
  }

  _base: BasePoint<any, TRequiredCtx> | undefined
  _sourceBaseUrl: string | undefined
  _pointType: TPointType
  _inputSchema: TInputSchema
  _responseFn: TResponseOutput extends ResponseOutput
    ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
    : undefined
  _rootId: RootId
  _staticHeads: StaticHeadsCollection
  _queryOptions: QueryOptionsSettings
  _pageQueryOptions: QueryOptionsSettings
  // TODO: remove or use wrapper
  _wrapper: WrapperComponentType | undefined
  _hasSourceBase: TConnectedSourceBasePoint extends UndefinedInferredRootSourcePoint ? false : true
  _extendFns: ExtendFnRecord[]
  _clientExtendFns: ClientExtendFnRecord[]
  _route: TRoute
  _page: PageComponent<TData, TClientData, TRoute> | UndefinedPageComponent
  _layout: LayoutComponent<TData, TClientData, TRoute> | UndefinedLayoutComponent
  _layouts: LayoutPoint[]
  _layoutPagesRoutes: Route0.AnyRoute[]
  _id: Id | UndefinedId
  _unstableId: number
  _method: Method | UndefinedMethod
  _fetchOptions: FetchOptionsFn

  _errorComponent: ErrorComponentType
  _pageErrorComponent?: ErrorComponentType<'page'>
  _componentErrorComponent?: ErrorComponentType<'component'>
  _loaderComponent: LoaderComponentType
  _pageLoaderComponent?: LoaderComponentType<'page'>
  _componentLoaderComponent?: LoaderComponentType<'component'>
  _appLoaderComponent?: LoaderComponentType<'app'>

  private constructor(props: {
    _pointType: TPointType
    _base?: BasePoint<any, TRequiredCtx> | undefined
    // _useLocation?: () => Route0.Location
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
      : undefined
    _rootId: RootId
    _wrapper?: WrapperComponentType | undefined
    _staticHeads?: StaticHeadsCollection
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _hasSourceBase?: TConnectedSourceBasePoint extends UndefinedInferredRootSourcePoint ? false : true
    _extendFns?: ExtendFnRecord[]
    _clientExtendFns?: ClientExtendFnRecord[]
    _route?: TRoute
    _page?: PageComponent<TData, TClientData, TRoute> | UndefinedPageComponent
    _layout?: LayoutComponent<TData, TClientData, TRoute> | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _layoutPagesRoutes?: Route0.AnyRoute[]
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType
    _pageErrorComponent?: ErrorComponentType<'page'>
    _componentErrorComponent?: ErrorComponentType<'component'>
    _loaderComponent?: LoaderComponentType
    _pageLoaderComponent?: LoaderComponentType<'page'>
    _componentLoaderComponent?: LoaderComponentType<'component'>
    _appLoaderComponent?: LoaderComponentType<'app'>
  }) {
    // persistent
    this._rootId = props._rootId

    // overridable
    this._base = props._base ?? undefined
    this._inputSchema = (props._inputSchema ?? undefined) as TInputSchema
    this._sourceBaseUrl = props._sourceBaseUrl ?? undefined
    this._responseFn = (props._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
      : undefined
    this._pointType = props._pointType
    this._wrapper = props._wrapper
    this._staticHeads = props._staticHeads ?? []
    this._queryOptions = props._queryOptions ?? {}
    this._pageQueryOptions = props._pageQueryOptions ?? {}
    this._hasSourceBase = props._hasSourceBase as TConnectedSourceBasePoint extends UndefinedInferredRootSourcePoint
      ? false
      : true
    this._extendFns = props._extendFns ?? []
    this._clientExtendFns = props._clientExtendFns ?? []
    this._route = props._route ?? (undefined as TRoute)
    this._page = props._page ?? undefined
    this._layout = props._layout ?? undefined
    this._layouts = props._layouts ?? []
    this._layoutPagesRoutes = props._layoutPagesRoutes ?? []
    this._id = props._id
    this._method = props._method ?? (undefined as Method | UndefinedMethod)
    this._fetchOptions = props._fetchOptions ?? (() => ({}))
    this._errorComponent =
      props._errorComponent ??
      ((({ error }) =>
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'pre',
            null,
            JSON.stringify(error.toJSON(), null, 2), // `null, 2` makes it pretty-printed
          ),
        )) as ErrorComponentType)
    this._pageErrorComponent = props._pageErrorComponent
    this._componentErrorComponent = props._componentErrorComponent
    this._pageLoaderComponent = props._pageLoaderComponent
    this._loaderComponent =
      props._loaderComponent ?? ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoaderComponentType)
    this._componentLoaderComponent = props._componentLoaderComponent
    this._appLoaderComponent = props._appLoaderComponent

    // calculated
    this._unstableId = Point0._getNextUnstableId()
  }

  _continue<
    TPointType extends PointType,
    TSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TData extends Data | UndefinedData,
    TClientData extends Data | UndefinedData,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  >(overrides: {
    _pointType: TPointType
    _base?: BasePoint<any, TRequiredCtx> | undefined
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _useLocation?: () => Route0.Location
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
      : undefined
    _staticHeads?: StaticHeadsCollection
    _queryOptions?: QueryOptionsSettings | undefined
    _pageQueryOptions?: QueryOptionsSettings | undefined
    _wrapper?: WrapperComponentType | undefined
    _extendFns?: ExtendFnRecord[]
    _clientExtendFns?: ClientExtendFnRecord[]
    _route?: Route0.AnyRoute | UndefinedRoute
    _page?: PageComponent | UndefinedPageComponent
    _layout?: LayoutComponent | UndefinedLayoutComponent
    _id?: Id | UndefinedId
    _method?: Method | UndefinedMethod
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType
    _pageErrorComponent?: ErrorComponentType<'page'>
    _componentErrorComponent?: ErrorComponentType<'component'>
    _loaderComponent?: LoaderComponentType
    _pageLoaderComponent?: LoaderComponentType<'page'>
    _componentLoaderComponent?: LoaderComponentType<'component'>
    _appLoaderComponent?: LoaderComponentType<'app'>
  }): Point0<
    TPointType,
    TSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    const wasEndpoint = this._isEndpoint()

    return new Point0<
      TPointType,
      TSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      // persistent
      _rootId: this._rootId,

      // overridable
      _base: (overrides._base ?? this._base) as BasePoint<any, TRequiredCtx> | undefined,
      _pointType: overrides._pointType,
      _sourceBaseUrl:
        overrides._sourceBaseUrl ??
        (wasEndpoint ? (this._base ? this._base._sourceBaseUrl : this._sourceBaseUrl) : this._sourceBaseUrl),
      _inputSchema: (overrides._inputSchema ?? this._inputSchema) as TInputSchema,
      _responseFn: (overrides._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
        ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
        : undefined, // remove end artefact on continue
      // _useLocation: overrides._useLocation ?? this._useLocation,
      _wrapper: overrides._wrapper ?? this._wrapper,
      _staticHeads:
        overrides._staticHeads ??
        (wasEndpoint ? (this._base ? this._base._staticHeads : this._staticHeads) : this._staticHeads),
      _queryOptions:
        overrides._queryOptions ??
        (wasEndpoint ? (this._base ? this._base._queryOptions : { ...this._queryOptions }) : { ...this._queryOptions }),
      _pageQueryOptions:
        overrides._pageQueryOptions ??
        (wasEndpoint
          ? this._base
            ? { ...this._base._pageQueryOptions }
            : { ...this._pageQueryOptions }
          : { ...this._pageQueryOptions }),
      _hasSourceBase: this._hasSourceBase as TSourceBasePoint extends UndefinedInferredRootSourcePoint ? false : true,
      _extendFns: overrides._extendFns ?? this._extendFns,
      _clientExtendFns: overrides._clientExtendFns ?? this._clientExtendFns,
      _route: (overrides._route ?? (wasEndpoint ? undefined : this._route)) as TRoute, // remove stale artefact on continue
      _page: (overrides._page ?? undefined) as PageComponent<TData, TClientData, TRoute> | UndefinedPageComponent, // remove end artefact on continue
      _layout: (overrides._layout ?? undefined) as
        | LayoutComponent<TData, TClientData, TRoute>
        | UndefinedLayoutComponent, // remove end artefact on continue
      _layouts: !this._layout ? this._layouts : [...this._layouts, this as unknown as LayoutPoint], // add layout to self layouts on continue
      _id: overrides._id ?? (wasEndpoint || this._pointType === 'base' ? undefined : this._id), // remove stale artefact on continue
      _method: overrides._method ?? (wasEndpoint ? undefined : this._method), // remove stale artefact on continue
      _fetchOptions:
        overrides._fetchOptions ??
        (wasEndpoint ? (this._base ? this._base._fetchOptions : this._fetchOptions) : this._fetchOptions),
      _errorComponent:
        overrides._errorComponent ??
        (wasEndpoint ? (this._base ? this._base._errorComponent : this._errorComponent) : this._errorComponent),
      _pageErrorComponent:
        overrides._pageErrorComponent ??
        (wasEndpoint
          ? this._base
            ? this._base._pageErrorComponent
            : this._pageErrorComponent
          : this._pageErrorComponent),
      _componentErrorComponent: overrides._componentErrorComponent ?? this._componentErrorComponent,
      _loaderComponent:
        overrides._loaderComponent ??
        (wasEndpoint ? (this._base ? this._base._loaderComponent : this._loaderComponent) : this._loaderComponent),
      _pageLoaderComponent:
        overrides._pageLoaderComponent ??
        (wasEndpoint
          ? this._base
            ? this._base._pageLoaderComponent
            : this._pageLoaderComponent
          : this._pageLoaderComponent),
      _componentLoaderComponent:
        overrides._componentLoaderComponent ??
        (wasEndpoint
          ? this._base
            ? this._base._componentLoaderComponent
            : this._componentLoaderComponent
          : this._componentLoaderComponent),
      _appLoaderComponent:
        overrides._appLoaderComponent ??
        (wasEndpoint
          ? this._base
            ? this._base._appLoaderComponent
            : this._appLoaderComponent
          : this._appLoaderComponent),
    })
  }

  _isEndpoint(): boolean {
    return (
      this._pointType === 'page' ||
      this._pointType === 'layout' ||
      this._pointType === 'response' ||
      this._pointType === 'query' ||
      this._pointType === 'mutation' ||
      this._pointType === 'component'
    )
  }

  // base

  static source(
    rootId: string,
  ): Point0<
    'middleware',
    UndefinedInferredRootSourcePoint,
    UndefinedCtx,
    EmptyCtx,
    UndefinedData,
    UndefinedData,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput
  > {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _rootId: rootId,
    })
  }

  static connect<TConnectedSourceBasePoint extends InferredRootSourcePoint>(
    rootId: string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TConnectedSourceBasePoint['Infer']['RequiredCtx'],
    TConnectedSourceBasePoint['Infer']['Ctx'],
    TConnectedSourceBasePoint['Infer']['Data'],
    TConnectedSourceBasePoint['Infer']['ClientData'],
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput
  > {
    return new Point0<
      'middleware',
      TConnectedSourceBasePoint,
      TConnectedSourceBasePoint['Infer']['RequiredCtx'],
      TConnectedSourceBasePoint['Infer']['Ctx'],
      TConnectedSourceBasePoint['Infer']['Data'],
      TConnectedSourceBasePoint['Infer']['ClientData'],
      UndefinedRoute,
      UndefinedInputSchema,
      UndefinedResponseOutput
    >({
      _pointType: 'middleware',
      _hasSourceBase: true as never,
      _rootId: rootId,
    })
  }

  // middlewares

  base(): Point0<
    'base',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'base',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'base',
      _base: this as BasePoint<any, TRequiredCtx>,
    })
  }

  id(
    id: Id,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _id: id,
    })
  }

  sourceBaseUrl(
    sourceBaseUrl: string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _sourceBaseUrl: sourceBaseUrl,
    })
  }

  setUseLocation(
    useLocation: () => Route0.Location,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _useLocation: useLocation,
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  errorComponent(
    errorComponent: ErrorComponentType,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _errorComponent: errorComponent,
    })
  }

  pageErrorComponent(
    pageErrorComponent: ErrorComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentErrorComponent(
    componentErrorComponent: ErrorComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoaderComponent(
    pageLoaderComponent: LoaderComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _pageLoaderComponent: pageLoaderComponent,
    })
  }

  componentLoaderComponent(
    componentLoaderComponent: LoaderComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _componentLoaderComponent: componentLoaderComponent,
    })
  }

  appLoaderComponent(
    appLoaderComponent: LoaderComponentType<'app'>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _appLoaderComponent: appLoaderComponent,
    })
  }

  loaderComponent(
    loaderComponent: LoaderComponentType,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _loaderComponent: loaderComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
    })
  }

  // use<TChain extends Chain<TCtx, TData>(
  //   chain: TChain,
  // ): Point0<
  //   'middleware',
  //   TConnectedSourceBasePoint,
  //   TRequiredCtx,
  //   TChain['Infer']['Ctx'],
  //   TChain['Infer']['Data'],
  //   TRoute,
  //   TChain['Infer']['InputSchema'],
  //   TResponseOutput
  // > {
  //   const mergedExtendFns = [...this._extendFns, ...chain._extendFns].reduce<ExtendFnRecord[]>((acc, record) => {
  //     if (acc.find((f) => f.unstableId === record.unstableId)) {
  //       return acc
  //     }
  //     return [...acc, record]
  //   }, [])
  //   const mergedHeads = [...this._heads, ...chain._heads].reduce<HeadsCollection>((acc, head) => {
  //     if (typeof head === 'function') {
  //       // functions in head, mean that it use data, so we omit them, else it is static object that can be merged
  //       return acc
  //     }
  //     if (acc.find((h) => h === head)) {
  //       return acc
  //     }
  //     return [...acc, head]
  //   }, [])
  //   const layouts = (
  //     chain._layout
  //       ? [...this._layouts, ...chain._layouts, chain._layout]
  //       : [...this._layouts, ...chain._layouts]
  //   ).reduce<Array<LayoutComponent<TData, TRoute>>>((acc, layout) => {
  //     if (acc.find((l) => l === layout)) {
  //       return acc
  //     }
  //     return [...acc, layout]
  //   }, [])
  //   return this._clone<
  //     'middleware',
  //     TConnectedSourceBasePoint,
  //     TRequiredCtx,
  //     TChain['Infer']['Ctx'],
  //     TChain['Infer']['Data'],
  //     TRoute,
  //     TChain['Infer']['InputSchema'],
  //     TResponseOutput
  //   >({
  //     _pointType: 'middleware',
  //     _extendFns: mergedExtendFns,
  //     _heads: mergedHeads,
  //     _appLoaderComponent,
  //     _componentErrorComponent,
  //     _componentLoaderComponent,
  //     _errorComponent,
  //     _fetchOptions,
  //     _id,
  //     _inputSchema,
  //     _layout,
  //     _loaderComponent,
  //     _method,
  //     _page,
  //     _pageErrorComponent,
  //     _pageLoaderComponent,
  //     _pageQueryOptions,
  //     _queryOptions,
  //     _responseFn,
  //     _route,
  //     _sourceBaseUrl,
  //     _useLocation,
  //     _wrapper,
  //   })
  // }

  ctx<TNewCtx extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtx, TData, TRoute, TInputSchema, TNewCtx>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctx: TNewCtx,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctxOrFn: TNewCtx,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TNewCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _extendFns: [...this._extendFns, { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() }] as never,
    })
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TNewRoute0,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TNewRoute0,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _route: route,
    })
  }

  loader<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'middleware',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'middleware',
      _extendFns: [
        ...this._extendFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  head(
    headFn: HeadFn<TData, TRoute>,
  ): Point0<
    'client-middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  head(
    head: ResolvableHead,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  head(headFnOrHead: HeadFn<TData, TRoute> | ResolvableHead) {
    if (typeof headFnOrHead === 'function') {
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtendFns: [
          ...this._clientExtendFns,
          { type: 'head', fn: headFnOrHead as never, unstableId: Point0._getNextUnstableId() },
        ],
      }) as never
    } else {
      return this._continue({
        _pointType: 'middleware',
        _staticHeads: [...this._staticHeads, headFnOrHead],
      }) as never
    }
  }

  title(
    titleFn: TitleFn<TData, TRoute>,
  ): Point0<
    'client-middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  title(
    title: string,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  >
  title(titleFnOrTitle: TitleFn<TData, TRoute> | string) {
    if (typeof titleFnOrTitle === 'function') {
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtendFns: [
          ...this._clientExtendFns,
          { type: 'head', fn: titleFnOrTitle as never, unstableId: Point0._getNextUnstableId() },
        ],
      }) as never
    } else {
      return this._continue({
        _pointType: 'middleware',
        _staticHeads: [...this._staticHeads, { title: titleFnOrTitle }],
      }) as never
    }
  }

  input<TNewInputSchema extends InputSchemaZod>(
    inputSchema: TNewInputSchema,
  ): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TNewInputSchema,
    TResponseOutput
  >
  input<TNewInputSchema extends InputSchemaObject>(): Point0<
    'middleware',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TNewInputSchema,
    TResponseOutput
  >
  input(...args: [InputSchemaZod] | []) {
    return this._continue({
      _pointType: 'middleware',
      ...(args.length === 1 ? { _inputSchema: args[0] } : {}),
    }) as never
  }

  // end points

  page<TPage extends PageComponent<TData, TClientData, TRoute>>(
    page: TPage,
  ): Point0<
    'page',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .page() function')
    }
    for (const layout of this._layouts) {
      layout._layoutPagesRoutes.push(this._route)
    }
    return this._continue<
      'page',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'page',
      _page: page as PageComponent,
      _method: 'get',
    })
  }

  layout<TLayout extends LayoutComponent<TData, TClientData, TRoute>>(
    layout: TLayout,
  ): Point0<
    'layout',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .layout() function')
    }
    return this._continue<
      'layout',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'layout',
      _layout: layout as LayoutComponent,
      _method: 'get',
    })
  }

  response<TResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>,
  ): Point0<
    'response',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'response',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'response',
      _responseFn: responseFn as TResponseOutput extends ResponseOutput
        ? ResponseFn<TCtx, TData, TRoute, TInputSchema, TResponseOutput>
        : undefined,
      _method: 'post',
    })
  }

  query<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'query',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'query',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'query',
      _extendFns: [
        ...this._extendFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _method: 'get',
    })
  }

  mutation<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'mutation',
    TConnectedSourceBasePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput
  > {
    return this._continue<
      'mutation',
      TConnectedSourceBasePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >({
      _pointType: 'mutation',
      _extendFns: [
        ...this._extendFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _method: 'post',
    })
  }

  // end points

  _getErrorComponent<TType extends DestinationComponentType>({ type }: { type: TType }): ErrorComponentType<TType> {
    return ({
      app: this._errorComponent,
      page: this._pageErrorComponent,
      component: this._componentErrorComponent,
    }[type] ?? this._errorComponent) as ErrorComponentType<TType>
  }

  _getLoaderComponent<TType extends DestinationComponentType>({ type }: { type: TType }): LoaderComponentType<TType> {
    return ({
      app: this._loaderComponent,
      page: this._pageLoaderComponent,
      component: this._componentLoaderComponent,
    }[type] ?? this._loaderComponent) as LoaderComponentType<TType>
  }

  _hasLoader(): boolean {
    return this._extendFns.some((fn) => fn.type === 'loader')
  }

  _clientExtendFnsHasOnlyHeadFnsOrEmpty(): boolean {
    return this._clientExtendFns.length === 0 || this._clientExtendFns.every((fn) => fn.type === 'head')
  }

  _hasClientLoader(): boolean {
    return this._clientExtendFns.some((fn) => fn.type === 'loader')
  }

  _getRouteAbsPath = (input?: Record<string, string>): string => {
    if (!this._sourceBaseUrl) {
      throw new Error('No source base url provided for this point')
    }
    const route = this._getRoute()
    return new URL(route.get(input || {}), this._sourceBaseUrl).toString()
  }

  _getRoute = (): Route0.AnyRoute => {
    if (this._route) {
      return this._route
    }
    if (this._id) {
      return Route0.create(`/endpoints/${this._id}`)
    }
    throw new Error('No route or id provided for this point')
  }

  _getRouteDefinition = (): string => {
    return this._getRoute().getDefinition()
  }

  _PageInner: React.ComponentType<{
    data: FinalData<TData>
    location: Route0.Location<CurrentRoute<TRoute>>
  }> = ({ data, location }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })

    if (!this._page) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No page component'), location })
    }

    for (const staticHead of this._staticHeads) {
      useHead(staticHead)
    }

    if (this._clientExtendFnsHasOnlyHeadFnsOrEmpty()) {
      for (const headFn of this._clientExtendFns) {
        useHead((headFn.fn as HeadFn)({ data, location }))
      }
      return React.createElement(this._page, { data: data as FinalClientData<TData, TClientData>, location })
    }

    const [clientHead, setClientHead] = React.useState<ResolvableHead>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [finalClientData, setFinalClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          let currentClientData: Data = data
          let currentClientHead: ResolvableHead = {}
          for (const clientExtendFn of this._clientExtendFns) {
            // nextClientData = await clientExtendFn.fn({ data: nextClientData, location })
            switch (clientExtendFn.type) {
              case 'head': {
                currentClientHead = mergeResolvableHead(
                  currentClientHead,
                  clientExtendFn.fn({ data: currentClientData, location }),
                )
                break
              }
              case 'loader': {
                currentClientData = await clientExtendFn.fn({ data: currentClientData, location })
                break
              }
              // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
              default: {
                throw new Error(`Unknown client extend fn type: ${(clientExtendFn as any).type}`)
              }
            }
          }
          setClientHead(currentClientHead)
          setFinalClientData(currentClientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])
    useHead(clientHead)

    if (loading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'page', error, location })
    }
    return React.createElement(this._page, { data: finalClientData as FinalClientData<TData, TClientData>, location })
  }

  _Page: React.ComponentType = () => {
    const location = useLocation<CurrentRoute<TRoute>>()
    if (!this._hasLoader()) {
      return React.createElement(this._PageInner, { data: {} as FinalData<TData>, location })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const isInitalSsrLocation = useIsInitalSsrLocation()
    const queryClient = useQueryClient()
    const cache = queryClient.getQueryCache()
    const queryKey = this.getQueryKey({ ...location.query, ...location.params } as never)
    const query = cache.find({ queryKey })
    const result = useQuery<TData>({
      queryKey,
      queryFn: async () => {
        const fetchOptions = this._fetchOptions()
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
      enabled: !isInitalSsrLocation || query?.state.status !== 'error',
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      ...this._queryOptions,
      ...this._pageQueryOptions,
    })
    if (result.error) {
      return React.createElement(errorComponent, { type: 'page', error: Error0.from(result.error), location })
    }
    if (result.isLoading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (!result.data) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No data'), location })
    }
    return React.createElement(this._PageInner, { data: result.data as FinalData<TData>, location })
  }

  _LayoutInner: React.ComponentType<{
    children: React.ReactNode
    location: Route0.Location<CurrentRoute<TRoute>>
    data: FinalData<TData>
  }> = ({ children, location, data }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    if (!this._layout) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No layout component'), location })
    }

    if (!this._hasLoader()) {
      return React.createElement(this._layout, { data: {} as FinalClientData<TData, TClientData>, location, children })
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [finalClientData, setFinalClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          let currentClientData: Data = data
          for (const clientExtendFn of this._clientExtendFns) {
            // nextClientData = await clientExtendFn.fn({ data: nextClientData, location })
            switch (clientExtendFn.type) {
              case 'head': {
                break
              }
              case 'loader': {
                currentClientData = await clientExtendFn.fn({ data: currentClientData, location })
                break
              }
              // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
              default: {
                throw new Error(`Unknown client extend fn type: ${(clientExtendFn as any).type}`)
              }
            }
          }
          setFinalClientData(currentClientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    if (loading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'page', error, location })
    }
    return React.createElement(this._layout, {
      data: finalClientData as FinalClientData<TData, TClientData>,
      location,
      children,
    })
  }

  _Layout: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
    if (!this._hasLoader()) {
      return React.createElement(this._LayoutInner, {
        data: {} as FinalData<TData>,
        location: useLocation<CurrentRoute<TRoute>>(),
        children,
      })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const location = useLocation<CurrentRoute<TRoute>>()
    const isInitalSsrLocation = useIsInitalSsrLocation()
    const queryClient = useQueryClient()
    const cache = queryClient.getQueryCache()
    const queryKey = this.getQueryKey({ ...location.query, ...location.params } as never)
    const query = cache.find({ queryKey })
    const result = useQuery<TData>({
      queryKey,
      queryFn: async () => {
        const fetchOptions = this._fetchOptions()
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
      enabled: !isInitalSsrLocation || query?.state.status !== 'error',
      retry: false,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      ...this._queryOptions,
      ...this._pageQueryOptions,
    })
    if (result.error) {
      return React.createElement(errorComponent, { type: 'page', error: Error0.from(result.error), location })
    }
    if (result.isLoading) {
      return React.createElement(loaderComponent, { type: 'page', location })
    }
    if (!result.data) {
      return React.createElement(errorComponent, { type: 'page', error: new Error0('No data'), location })
    }
    return React.createElement(this._LayoutInner, { data: result.data as FinalData<TData>, location, children })
  }

  fetch = (async (input: Record<string, any> = {}) => {
    const route = this._getRoute()
    const { routeParams, routeQuery, inputSelf } = (() => {
      const { query: routeQuery, ...restInput } = input
      const paramsKeys = Object.keys(route.paramsDefinition)
      const routeParams = paramsKeys.reduce<Record<string, string>>((acc, key) => {
        acc[key] = input[key]
        return acc
      }, {})
      const inputSelf = Object.keys(restInput).reduce<Record<string, string>>((acc, key) => {
        if (paramsKeys.includes(key)) {
          return acc
        }
        acc[key] = restInput[key]
        return acc
      }, {})
      return { routeParams, routeQuery, inputSelf }
    })()

    const fetchOptions = this._fetchOptions()
    const headers = mergeHeaders(fetchOptions.headers, { Accept: 'application/json' })
    const routeAbsPath = this._getRouteAbsPath({ ...routeParams, query: routeQuery })
    const url = new URL(routeAbsPath)
    const method = this._method

    let body: string | undefined = undefined
    if (method === 'get' || method === 'head' || method === 'options') {
      url.search = qs.stringify({ ...routeQuery, ...inputSelf })
    } else {
      headers.set('Content-Type', 'application/json')
      url.search = qs.stringify({ ...routeQuery })
      body = JSON.stringify({ ...inputSelf })
    }
    const res = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      method,
      body,
    })
    if (this._pointType === 'response') {
      return res
    }
    const json = await res.json()
    if (res.ok) {
      return json
    }
    throw Error0.from(json, {
      httpStatus: res.status,
    })
  }) as FetcherFn<TRoute, TInputSchema, Promise<FetchOutput<TResponseOutput, TData>>>

  getQueryKey = ((input?: Record<string, any>): QueryKey => {
    const keyParts: [string, ...string[]] = [this._getRouteDefinition()]
    if (input) {
      const serialized = stringify(input)
      keyParts.push(serialized)
    }
    return keyParts
  }) as FetcherFn<TRoute, TInputSchema, QueryKey>

  getQueryOptions = ((input: Record<string, any> = {}) => {
    const queryKey = this.getQueryKey(input as never)
    const queryFn = async () => {
      const data = await this.fetch(input as never)
      return data
    }
    return {
      queryKey,
      queryFn,
      ...this._queryOptions,
    }
  }) as never as FetcherFn<TRoute, TInputSchema, QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>>

  getMutationOptions = (() => {
    const mutationFn = async (props: Record<string, any> = {}) => {
      const data = await this.fetch(props as never)
      return data
    }
    return {
      mutationFn,
      // TODO: add mutation options
    }
  }) as () => MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, Input<TRoute, TInputSchema>>

  useQuery = ((props: Record<string, any> = {}) => {
    return useQuery(this.getQueryOptions(props as never) as never)
  }) as FetcherFn<TRoute, TInputSchema, UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0>>

  useMutation = (() => {
    return useMutation(this.getMutationOptions() as never) as never
  }) as () => UseMutationResult<FetchOutput<TResponseOutput, TData>, Error0, Input<TRoute, TInputSchema>>

  prefetchQuery = async ({
    queryClient,
    location,
    input,
    force,
  }: {
    queryClient: QueryClient
    location?: Route0.Location
    input?: Record<string, any>
    force?: boolean
  }): Promise<void> => {
    if (!this._hasLoader()) {
      return
    }
    const suitablePointTypes = ['page', 'query', 'component', 'client-ctx']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryOptions = this.getQueryOptions({ ...location?.query, ...location?.params, ...input } as never)
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await queryClient.prefetchQuery(queryOptions as never)
  }
}

export type QueryOptionsSettings = Omit<QueryOptions<any, any, any, any, any>, 'queryFn' | 'queryKey'>
// used to avoid circular depedencies
type Infer<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  RequiredCtx: TRequiredCtx
  Ctx: TCtx
  Data: TData
  ClientData: TClientData
  InputSchema: TInputSchema
}

export type HasPageTure = true
export type HasPageFalse = false
export type HasPage = boolean
export type IsClientTrue = true
export type IsClientFalse = false
export type IsClient = boolean

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
export type UndefinedMethod = undefined
export type Id = string
export type UndefinedId = undefined
export type RootId = string
export type UndefinedRootId = undefined

export type AnyPoint<
  TPointType extends PointType = PointType,
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = Point0<
  TPointType,
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type BasePoint<
  TConnectedSourceBasePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type RootSourcePoint<
  TConnectedSourceBasePoint extends UndefinedInferredRootSourcePoint = UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base' | 'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type RootConnectedPoint<
  TConnectedSourceBasePoint extends InferredRootSourcePoint = InferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> = AnyPoint<
  'base' | 'middleware',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>
export type RootPoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends UndefinedResponseOutput = UndefinedResponseOutput,
> =
  | RootSourcePoint<
      UndefinedInferredRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >
  | RootConnectedPoint<
      InferredRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput
    >

export type PagePoint<
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  'page',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type LayoutPoint<
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  'layout',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type ResponsePoint<
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute = Route0.AnyRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = AnyPoint<
  'response',
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type EndPoint<
  TPointType extends EndPointType = EndPointType,
  TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint =
    | InferredRootSourcePoint
    | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
  TRoute extends Route0.AnyRoute | UndefinedRoute = any,
  TInputSchema extends InputSchema | UndefinedInputSchema = any,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = any,
> = AnyPoint<
  TPointType,
  TConnectedSourceBasePoint,
  TRequiredCtx,
  TCtx,
  TData,
  TClientData,
  TRoute,
  TInputSchema,
  TResponseOutput
>

export type InferredRootSourcePoint<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TCtx extends Ctx = any,
  TData extends Data | UndefinedData = any,
  TClientData extends Data | UndefinedData = any,
> = {
  Infer: Infer<TRequiredCtx, TCtx, TData, TClientData>
  _extendFns: ExtendFnRecord[]
}
export type UndefinedInferredRootSourcePoint = undefined

export type InferCtx<TPoint extends AnyPoint | InferredRootSourcePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, infer TCtx, any, any, any, any>
    ? TCtx
    : TPoint extends InferredRootSourcePoint
      ? TPoint['Infer']['Ctx']
      : EmptyCtx
export type InferData<TPoint extends AnyPoint | InferredRootSourcePoint | undefined> =
  TPoint extends AnyPoint<any, any, any, any, infer TData, any, any, any>
    ? TData
    : TPoint extends InferredRootSourcePoint
      ? TPoint['Infer']['Data']
      : EmptyData
export type InferSourceBase<TPoint extends AnyPoint | undefined> =
  TPoint extends AnyPoint<infer TSourceBasePoint> ? TSourceBasePoint : undefined

export type PageComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalClientData<TData, TClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type PageComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<PageComponentProps<TData, TClientData, TRoute>>
export type UndefinedPageComponent = undefined

export type LayoutComponentProps<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = {
  data: FinalClientData<TData, TClientData>
  location: Route0.Location<CurrentRoute<TRoute>>
  children: React.ReactNode
}
export type LayoutComponent<
  TData extends Data | UndefinedData = Data | UndefinedData,
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<LayoutComponentProps<TData, TClientData, TRoute>>
export type UndefinedLayoutComponent = undefined

export type DestinationComponentType = 'app' | 'page' | 'component'
export type ErrorComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  error: Error0
  location: Route0.Location
}
export type LoaderComponentProps<TType extends DestinationComponentType = DestinationComponentType> = {
  type: TType
  location: Route0.Location
}
export type LoaderComponentType<TType extends DestinationComponentType = DestinationComponentType> =
  React.ComponentType<LoaderComponentProps<TType>>
export type ErrorComponentType<TType extends DestinationComponentType = DestinationComponentType> = React.ComponentType<
  ErrorComponentProps<TType>
>

export type CurrentRoute<TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute> =
  TRoute extends Route0.AnyRoute ? TRoute : Route0.AnyRoute

// TODO: unknown and undefined objects
export type UndefinedRoute = undefined
export type EmptyCtx = Record<string, unknown> // Record<string, never>
export type UnknownCtx = Record<string, unknown>
export type UndefinedCtx = undefined
export type RequiredCtx = UnknownCtx | UndefinedCtx
export type Ctx = UnknownCtx | EmptyCtx
export type EmptyData = Record<string, unknown> // Record<string, never>
export type UnknownData = Record<string, unknown>
export type UndefinedData = undefined
export type Data = UnknownData | EmptyData
export type FinalData<TData extends Data | UndefinedData> = TData extends UndefinedData ? EmptyData : TData
export type FinalClientData<
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
> = TClientData extends Data ? TClientData : FinalData<TData>

export type FetchOptionsFn = () => FetchOptions
export type FetchOptionsOrFn = FetchOptionsFn | FetchOptions
export type FetchOptions = RequestInit

export type WrapperComponentType = React.ComponentType<{ children: React.ReactNode }>

export type InputSchemaZod = z.ZodObject<any>
export type InputSchemaObject = Record<string, any>
export type InputSchema = InputSchemaZod | InputSchemaObject
export type UndefinedInputSchema = undefined
export type Input<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = TRoute extends Route0.AnyRoute
  ? TInputSchema extends InputSchemaZod
    ? z.infer<TInputSchema> & Omit<Route0.Params<TRoute>, keyof z.infer<TInputSchema>> & { query: Route0.Query<TRoute> }
    : TInputSchema extends InputSchemaObject
      ? TInputSchema & Omit<Route0.Params<TRoute>, keyof TInputSchema> & { query: Route0.Query<TRoute> }
      : Route0.Params<TRoute> & { query: Route0.Query<TRoute> }
  : TInputSchema extends InputSchemaZod
    ? z.infer<TInputSchema>
    : TInputSchema extends InputSchemaObject
      ? TInputSchema
      : Record<never, never>
// > = TInputSchema extends InputSchema ? z.infer<TInputSchema> : Record<string, unknown>
export type UndefinedInput = undefined

export type ResponseOutput = Response
export type UndefinedResponseOutput = undefined
export type ResponseFnProps<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  input: Input<TRoute, TInputSchema>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type ResponseFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput = ResponseOutput,
> = (props: ResponseFnProps<TCtx, TData, TRoute0, TInputSchema>) => Promise<TResponseOutput> | TResponseOutput
export type ResponseFnOutput<TResponseFn extends ResponseFn> = Awaited<ReturnType<TResponseFn>>

export type AppendCtx<TCtx extends UnknownCtx | UndefinedCtx, TAppend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TCtx, keyof TAppend> & TAppend
  : TAppend
export type PrependCtx<TCtx extends UnknownCtx | UndefinedCtx, TPrepend extends UnknownCtx> = TCtx extends Ctx
  ? Omit<TPrepend, keyof TCtx> & TPrepend
  : TPrepend

export type CtxFnProps<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtxInput
  data: FinalData<TData>
  input: Input<TRoute, TInputSchema>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type CtxFn<
  TCtxInput extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TCtxOutput extends Ctx = Ctx,
> = (props: CtxFnProps<TCtxInput, TData, TRoute, TInputSchema>) => Promise<TCtxOutput> | TCtxOutput
export type CtxFnOutput<TCtxFn extends CtxFn> = Awaited<ReturnType<TCtxFn>>
export type InferCtxFnOutput<TCtxFn> = TCtxFn extends CtxFn<any, any, any, infer TCtxFnOutput> ? TCtxFnOutput : never

export type LoaderFnProps<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  ctx: TCtx
  data: FinalData<TData>
  location: Route0.Location<CurrentRoute<TRoute>>
  input: Input<TRoute, TInputSchema>
}
export type LoaderFn<
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TDataOutput extends Data = Data,
> = (props: LoaderFnProps<TCtx, TData, TRoute, TInputSchema>) => Promise<TDataOutput> | TDataOutput

export type ExtendFnRecord<
  TType extends 'ctx' | 'loader' | 'head' = 'ctx' | 'loader' | 'head',
  TCtx extends Ctx = Ctx,
  TData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'ctx'
  ? { type: 'ctx'; fn: CtxFn<TCtx, TData, TRoute, TInputSchema, TOutput>; unstableId: number }
  : TType extends 'loader'
    ? { type: 'loader'; fn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TOutput>; unstableId: number }
    : TType extends 'head'
      ? { type: 'head'; fn: HeadFn<TData, TRoute>; unstableId: number }
      : never

export type ClientExtendFnRecord<
  TType extends 'loader' | 'head' = 'head' | 'loader',
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TOutput extends Ctx | Data = Ctx | Data,
> = TType extends 'loader'
  ? { type: 'loader'; fn: ClientLoaderFn<TClientData, TRoute, TOutput>; unstableId: number }
  : TType extends 'head'
    ? { type: 'head'; fn: HeadFn<TClientData, TRoute>; unstableId: number }
    : never

export type ClientLoaderFnProps<
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = {
  data: FinalData<TClientData>
  location: Route0.Location<CurrentRoute<TRoute>>
}
export type ClientLoaderFn<
  TClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TClientDataOutput extends Data = Data,
> = (props: ClientLoaderFnProps<TClientData, TRoute>) => Promise<TClientDataOutput> | TClientDataOutput

export type HeadFnProps<
  TDataOrClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalData<TDataOrClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type HeadFn<
  TDataOrClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: HeadFnProps<TDataOrClientData, TRoute>) => ResolvableHead
export type StaticHeadsCollection = ResolvableHead[]

export type TitleFnProps<
  TDataOrClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = { data: FinalData<TDataOrClientData>; location: Route0.Location<CurrentRoute<TRoute>> }
export type TitleFn<
  TDataOrClientData extends Data | UndefinedData = Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = (props: TitleFnProps<TDataOrClientData, TRoute>) => string

export type PointType =
  | 'base'
  | 'middleware'
  | 'page'
  | 'component'
  | 'response'
  | 'query'
  | 'mutation'
  | 'layout'
  | 'client-middleware'
  | 'client-ctx'
export type EndPointType = Exclude<PointType, 'middleware' | 'base' | 'client-middleware'>

export type QueryKey = readonly [string, ...string[]]
export type FetcherFn<
  TRoute extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
  TFnOutput = any,
> = TRoute extends Route0.AnyRoute
  ? TInputSchema extends InputSchema
    ? (input: Input<TRoute, TInputSchema>) => TFnOutput
    : Route0.HasParams<TRoute> extends true
      ? (input: Input<TRoute, TInputSchema>) => TFnOutput
      : (input?: Input<TRoute, TInputSchema>) => TFnOutput
  : TInputSchema extends InputSchema
    ? (input: Input<TRoute, TInputSchema>) => TFnOutput
    : () => TFnOutput

export type FetchOutput<
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput = ResponseOutput | UndefinedResponseOutput,
  TData extends Data | UndefinedData = Data | UndefinedData,
> = TResponseOutput extends ResponseOutput ? TResponseOutput : FinalData<TData>
