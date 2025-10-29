import { Error0 } from '@devp0nt/error0'
import { Route0 } from '@devp0nt/route0'
import type { MutationOptions, QueryClient, QueryOptions, UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useHead } from '@unhead/react'
import qs from 'qs'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type { EversionRun } from './eversion.js'
import { useIsInitalSsrLocation, useLocation } from './router.js'
import type {
  AnyPoint,
  AppendCtx,
  BasePoint,
  ClientExtractFnRecord,
  ClientLoaderFn,
  ComponentComponent,
  ComponentMountable,
  ComponentMountableProps,
  ComponentWithPoint,
  Ctx,
  CtxFn,
  CurrentRoute,
  Data,
  DestinationComponentType,
  EmptyCtx,
  ErrorComponentType,
  ExtractFn,
  ExtractFnRecord,
  FetchFn,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FinalClientData,
  FinalData,
  FinalProps,
  GetMutationOptionsFn,
  GetQueryKeyFn,
  GetQueryOptionsFn,
  HeadFn,
  Id,
  Infer,
  InferredRootSourcePoint,
  Input,
  InputSchema,
  InputSchemaObject,
  InputSchemaZod,
  IsEndPointType,
  LayoutComponent,
  LayoutPoint,
  LoaderComponentType,
  LoaderFn,
  Method,
  PageComponent,
  PointType,
  PrefetchQueryFn,
  PrependCtx,
  Props,
  QueryKey,
  QueryOptionsSettings,
  RequiredCtx,
  ResponseFn,
  ResponseOutput,
  RootId,
  StaticHeadsCollection,
  TitleFn,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedData,
  UndefinedId,
  UndefinedInferredRootSourcePoint,
  UndefinedInputSchema,
  UndefinedLayoutComponent,
  UndefinedMethod,
  UndefinedPageComponent,
  UndefinedProps,
  UndefinedResponseOutput,
  UndefinedRoute,
  UseMutationFn,
  UseQueryFn,
  WrapperComponentType,
} from './types.js'
import { mergeHeaders, mergeResolvableHead } from './utils.js'

export class Point0<
  TPointType extends PointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TRoute extends Route0.AnyRoute | UndefinedRoute,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TProps extends Props | UndefinedProps,
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
  _hasSourceBase: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
  _extractFns: ExtractFnRecord[]
  _clientExtractFns: ClientExtractFnRecord[]
  _route: TRoute
  _page: PageComponent<TData, TClientData, TRoute> | UndefinedPageComponent
  _component: ComponentComponent<TData, TClientData, TRoute, TProps> | UndefinedComponentComponent
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
    _hasSourceBase?: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _route?: TRoute
    _page?: PageComponent<TData, TClientData, TRoute> | UndefinedPageComponent
    _component?: ComponentComponent<TData, TClientData, TRoute, TProps> | UndefinedComponentComponent
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
    _unstableId?: number
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
    this._hasSourceBase = props._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
      ? false
      : true
    this._extractFns = props._extractFns ?? []
    this._clientExtractFns = props._clientExtractFns ?? []
    this._route = props._route ?? (undefined as TRoute)
    this._page = props._page ?? undefined
    this._component = props._component ?? undefined
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
    this._unstableId = props._unstableId ?? Point0._getNextUnstableId()
  }

  _continue<
    TPointType extends PointType,
    TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TData extends Data | UndefinedData,
    TClientData extends Data | UndefinedData,
    TRoute extends Route0.AnyRoute | UndefinedRoute,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
    TProps extends Props | UndefinedProps,
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
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _route?: Route0.AnyRoute | UndefinedRoute
    _page?: PageComponent | UndefinedPageComponent
    _component?: ComponentComponent | UndefinedComponentComponent
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
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    const wasEndpoint = this._isEndpoint()

    return new Point0<
      TPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput,
      TProps
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
      _hasSourceBase: this._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
        ? false
        : true,
      _extractFns: overrides._extractFns ?? this._extractFns,
      _clientExtractFns: wasEndpoint ? [] : (overrides._clientExtractFns ?? this._clientExtractFns),
      _route: (overrides._route ?? (wasEndpoint ? undefined : this._route)) as TRoute, // remove stale artefact on continue
      _page: (overrides._page ?? undefined) as PageComponent<TData, TClientData, TRoute> | undefined, // remove end artefact on continue
      _component: (overrides._component ?? undefined) as
        | ComponentComponent<TData, TClientData, TRoute, TProps>
        | undefined, // remove end artefact on continue
      _layout: (overrides._layout ?? undefined) as LayoutComponent<TData, TClientData, TRoute> | undefined, // remove end artefact on continue
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
      this._pointType === 'component' ||
      this._pointType === 'client-ctx'
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
    UndefinedResponseOutput,
    UndefinedProps
  > {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _rootId: rootId,
    })
  }

  static connect<TConnectedRootSourcePoint extends InferredRootSourcePoint>(
    rootId: string,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TConnectedRootSourcePoint['Infer']['RequiredCtx'],
    TConnectedRootSourcePoint['Infer']['Ctx'],
    TConnectedRootSourcePoint['Infer']['Data'],
    TConnectedRootSourcePoint['Infer']['ClientData'],
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedProps
  > {
    return new Point0<
      'middleware',
      TConnectedRootSourcePoint,
      TConnectedRootSourcePoint['Infer']['RequiredCtx'],
      TConnectedRootSourcePoint['Infer']['Ctx'],
      TConnectedRootSourcePoint['Infer']['Data'],
      TConnectedRootSourcePoint['Infer']['ClientData'],
      UndefinedRoute,
      UndefinedInputSchema,
      UndefinedResponseOutput,
      UndefinedProps
    >({
      _pointType: 'middleware',
      _hasSourceBase: true as never,
      _rootId: rootId,
    })
  }

  // middlewares

  base(): Point0<
    'base',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'base',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'base',
      _base: this as never as BasePoint<any, TRequiredCtx>,
    })
  }

  id(
    id: Id,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _id: id,
    })
  }

  sourceBaseUrl(
    sourceBaseUrl: string,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _sourceBaseUrl: sourceBaseUrl,
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  errorComponent(
    errorComponent: ErrorComponentType,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _errorComponent: errorComponent,
    })
  }

  pageErrorComponent(
    pageErrorComponent: ErrorComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentErrorComponent(
    componentErrorComponent: ErrorComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      TRoute,
      TInputSchema,
      TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoaderComponent(
    pageLoaderComponent: LoaderComponentType<'page'>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _pageLoaderComponent: pageLoaderComponent,
    })
  }

  componentLoaderComponent(
    componentLoaderComponent: LoaderComponentType<'component'>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _componentLoaderComponent: componentLoaderComponent,
    })
  }

  appLoaderComponent(
    appLoaderComponent: LoaderComponentType<'app'>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _appLoaderComponent: appLoaderComponent,
    })
  }

  loaderComponent(
    loaderComponent: LoaderComponentType,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _loaderComponent: loaderComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
    })
  }

  // use<TChain extends Chain<TCtx, TData>(
  //   chain: TChain,
  // ): Point0<
  //   'middleware',
  //   TConnectedRootSourcePoint,
  //   TRequiredCtx,
  //   TChain['Infer']['Ctx'],
  //   TChain['Infer']['Data'],
  //   TRoute,
  //   TChain['Infer']['InputSchema'],
  //   TResponseOutput
  // > {
  //   const mergedExtractFns = [...this._extractFns, ...chain._extractFns].reduce<ExtractFnRecord[]>((acc, record) => {
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
  //     TConnectedRootSourcePoint,
  //     TRequiredCtx,
  //     TChain['Infer']['Ctx'],
  //     TChain['Infer']['Data'],
  //     TRoute,
  //     TChain['Infer']['InputSchema'],
  //     TResponseOutput
  //   >({
  //     _pointType: 'middleware',
  //     _extractFns: mergedExtractFns,
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
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctx: TNewCtx,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctxOrFn: TNewCtx,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TNewCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [...this._extractFns, { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() }] as never,
    })
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    TNewRoute0,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      TNewRoute0,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _route: route,
    })
  }

  loader<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  clientLoader<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<FinalClientData<TData, TClientData>, TRoute, TNewClientData>,
  ): Point0<
    'client-middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'client-middleware',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TNewClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'client-middleware',
      _clientExtractFns: [
        ...this._clientExtractFns,
        { type: 'loader', fn: clientLoaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  clientCtx<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<FinalClientData<TData, TClientData>, TRoute, TNewClientData>,
  ): Point0<
    'client-ctx',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  clientCtx(): Point0<
    'client-ctx',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  clientCtx(clientLoaderFn?: ClientLoaderFn<any, any, any>) {
    return this._continue({
      _pointType: 'client-ctx',
      _clientExtractFns: clientLoaderFn
        ? [...this._clientExtractFns, { type: 'loader', fn: clientLoaderFn, unstableId: Point0._getNextUnstableId() }]
        : this._clientExtractFns,
    }) as never
  }

  head(
    headFn: HeadFn<TData, TClientData, TRoute>,
  ): Point0<
    'client-middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  head(
    head: ResolvableHead,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    TRoute,
    TInputSchema,
    TResponseOutput,
    TProps
  >
  head(headFnOrHead: HeadFn<TData, TClientData, TRoute> | ResolvableHead) {
    if (typeof headFnOrHead === 'function') {
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtractFns: [
          ...this._clientExtractFns,
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
    titleFn: TitleFn<TData, TClientData, TRoute>,
  ): Point0<
    'client-middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  title(
    title: string,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  title(titleFnOrTitle: TitleFn<TData, TClientData, TRoute> | string) {
    if (typeof titleFnOrTitle === 'function') {
      const headFn: HeadFn = (props) => ({ title: titleFnOrTitle(props as never) })
      return this._continue({
        _pointType: 'client-middleware',
        _clientExtractFns: [
          ...this._clientExtractFns,
          { type: 'head', fn: headFn, unstableId: Point0._getNextUnstableId() },
        ],
      }) as never
    } else {
      return this._continue({
        _pointType: 'middleware',
        _staticHeads: [...this._staticHeads, { title: titleFnOrTitle }],
      }) as never
    }
  }

  props<TNewProps extends Props>(): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TNewProps
  > {
    return this._continue({
      _pointType: 'middleware',
    }) as never
  }

  input<TNewInputSchema extends InputSchemaZod>(
    inputSchema: TNewInputSchema,
  ): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TNewInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  >
  input<TNewInputSchema extends InputSchemaObject>(): Point0<
    'middleware',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TNewInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
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
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .page() function')
    }
    for (const layout of this._layouts) {
      layout._layoutPagesRoutes.push(this._route)
    }
    return this._continue<
      'page',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'page',
      _page: page as PageComponent,
      _method: 'get',
    })
  }

  component<TComponent extends ComponentComponent<TData, TClientData, TRoute, TProps>>(
    component: TComponent,
  ): ComponentMountable<TInputSchema, TProps> & {
    point: Point0<
      'component',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >
  } {
    if (!this._route) {
      throw new Error('add .route() to chain to use .component() function')
    }
    const point = this._continue<
      'component',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'component',
      _component: component as ComponentComponent,
      _method: 'get',
    })
    const componentWithPoint = point._Component
    Object.assign(componentWithPoint, { point })
    return componentWithPoint as never
  }

  layout<TLayout extends LayoutComponent<TData, TClientData, TRoute>>(
    layout: TLayout,
  ): Point0<
    'layout',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .layout() function')
    }
    return this._continue<
      'layout',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'layout',
      _layout: layout as LayoutComponent,
      _method: 'get',
    })
  }

  response<TNewResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TCtx, TData, TRoute, TInputSchema, TNewResponseOutput>,
  ): Point0<
    'response',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    TNewResponseOutput,
    TProps
  > {
    return this._continue<
      'response',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      TNewResponseOutput,
      TProps
    >({
      _pointType: 'response',
      _responseFn: responseFn as never,
      _method: 'post',
    })
  }

  query<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'query',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'query',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'query',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _method: 'get',
    })
  }

  mutation<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRoute, TInputSchema, TNewData>,
  ): Point0<
    'mutation',
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
    IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
    TInputSchema,
    IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
    TProps
  > {
    return this._continue<
      'mutation',
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      IsEndPointType<TPointType> extends true ? UndefinedData : TClientData,
      IsEndPointType<TPointType> extends true ? UndefinedRoute : TRoute,
      TInputSchema,
      IsEndPointType<TPointType> extends true ? UndefinedResponseOutput : TResponseOutput,
      TProps
    >({
      _pointType: 'mutation',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _method: 'post',
    })
  }

  // getters

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
    return this._extractFns.some((fn) => fn.type === 'loader')
  }

  _clientExtractFnsHasOnlyHeadFnsOrEmpty(): boolean {
    return this._clientExtractFns.length === 0 || this._clientExtractFns.every((fn) => fn.type === 'head')
  }

  _hasClientLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader')
  }

  _hasClientAsyncLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
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

  _extractClientAsync = async ({
    data,
    location,
    skipHeads,
  }: {
    data: Data
    location: Route0.Location<CurrentRoute<TRoute>>
    skipHeads: boolean
  }): Promise<{ clientData: Data; clientHeadMerged: ResolvableHead }> => {
    let currentClientData: Data = data
    let clientHeadMerged: ResolvableHead = {}
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHeadMerged = mergeResolvableHead(
            clientHeadMerged,
            clientExtractFn.fn({ data: currentClientData, location }),
          )
          break
        }
        case 'loader': {
          currentClientData = await clientExtractFn.fn({ data: currentClientData, location })
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractFn as any).type}`)
        }
      }
    }
    return { clientData: currentClientData, clientHeadMerged }
  }

  _extractClientSync = ({
    data,
    location,
    skipHeads,
  }: {
    data: Data
    location: Route0.Location<CurrentRoute<TRoute>>
    skipHeads: boolean
  }): { clientData: Data; clientHead: ResolvableHead[] } => {
    let currentClientData: Data = data
    const clientHead: ResolvableHead[] = []
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHead.push(clientExtractFn.fn({ data: currentClientData, location }))
          break
        }
        case 'loader': {
          currentClientData = clientExtractFn.fn({ data: currentClientData, location }) as Data
          break
        }
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default: {
          throw new Error(`Unknown client extend fn type: ${(clientExtractFn as any).type}`)
        }
      }
    }
    return { clientData: currentClientData, clientHead }
  }

  _getSelfLocationByAnotherLocation(location: Route0.Location) {
    const route = this._getRoute()
    const routePath = route.get({ ...location.params, query: { ...location.query } } as never)
    return route.match(routePath).location
  }

  _getInputByLocation(location: Route0.Location) {
    const selfLocation = this._getSelfLocationByAnotherLocation(location)
    return { ...selfLocation.query, ...selfLocation.params }
  }

  static _SsrNonfetchedPointsCollectorContext = React.createContext<{
    register: (point: AnyPoint) => void
  } | null>(null)
  _useRegisterSelfInSsrNonfetchedPointsCollector = (isFetched: boolean): void => {
    const ssrNonfetchedPointsCollectorContext = React.useContext(Point0._SsrNonfetchedPointsCollectorContext)
    const registeredRef = React.useRef(false)
    if (isFetched) {
      return
    }
    // Safe to do during render in SSR (pattern used by CSS-in-JS)
    if (ssrNonfetchedPointsCollectorContext?.register && !registeredRef.current) {
      registeredRef.current = true
      ssrNonfetchedPointsCollectorContext.register(this as never)
    }
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

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      for (const headFn of this._clientExtractFns) {
        useHead((headFn.fn as HeadFn)({ data, location }))
      }
      return React.createElement(this._page, { data: data as FinalClientData<TData, TClientData>, location })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData, clientHead } = this._extractClientSync({ data, location, skipHeads: false })
        for (const head of clientHead) {
          useHead(head)
        }
        return React.createElement(this._page, { data: clientData as FinalClientData<TData, TClientData>, location })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    const [clientHead, setClientHead] = React.useState<ResolvableHead>({})
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData, clientHeadMerged } = await this._extractClientAsync({ data, location, skipHeads: false })
          setClientHead(clientHeadMerged)
          setClientData(clientData)
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
    return React.createElement(this._page, { data: clientData as FinalClientData<TData, TClientData>, location })
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
    const queryKey = (this.getQueryKey as any)({ ...this._getInputByLocation(location) }) as QueryKey
    const query = cache.find({ queryKey })
    this._useRegisterSelfInSsrNonfetchedPointsCollector(!!query)
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

  _ComponentInner: React.ComponentType<{
    data: FinalData<TData>
    location: Route0.Location<CurrentRoute<TRoute>>
    props: FinalProps<TProps>
  }> = ({ data, location, props }) => {
    const errorComponent = this._getErrorComponent({ type: 'component' })
    const loaderComponent = this._getLoaderComponent({ type: 'component' })

    if (!this._component) {
      return React.createElement(errorComponent, {
        type: 'component',
        error: new Error0('No component component'),
        location,
      })
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._component, {
        data: data as FinalClientData<TData, TClientData>,
        location,
        props,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._component, {
          data: clientData as FinalClientData<TData, TClientData>,
          location,
          props,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'component', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({ data, location, skipHeads: true })
          setClientData(clientData)
          setLoading(false)
        } catch (error) {
          setError(Error0.from(error))
          setLoading(false)
        }
      })()
    }, [data, location])

    if (loading) {
      return React.createElement(loaderComponent, { type: 'component', location })
    }
    if (error) {
      return React.createElement(errorComponent, { type: 'component', error, location })
    }
    return React.createElement(this._component, {
      data: clientData as FinalClientData<TData, TClientData>,
      location,
      props,
    })
  }

  _Component: ComponentMountable<TInputSchema, TProps> = (props) => {
    const { input, ...restProps } = props as ComponentMountableProps<Record<string, any>, TProps>
    const location = useLocation<CurrentRoute<TRoute>>()
    if (!this._hasLoader()) {
      return React.createElement(this._ComponentInner, {
        data: {} as FinalData<TData>,
        location,
        props: restProps as unknown as FinalProps<TProps>,
      })
    }

    const loaderComponent = this._getLoaderComponent({ type: 'component' })
    const errorComponent = this._getErrorComponent({ type: 'component' })
    const result = (this.useQuery as any)(input) as UseQueryResult
    // TODO: add it to this.useQeruy
    const queryClient = useQueryClient()
    const cache = queryClient.getQueryCache()
    const queryKey = (this.getQueryKey as any)({ ...this._getInputByLocation(location), ...input }) as QueryKey
    const query = cache.find({ queryKey })
    console.log('query', query, queryKey)
    this._useRegisterSelfInSsrNonfetchedPointsCollector(
      query?.state.status === 'error' || query?.state.status === 'success',
    )

    if (result.error) {
      return React.createElement(errorComponent, { type: 'component', error: Error0.from(result.error), location })
    }
    if (result.isLoading) {
      return React.createElement(loaderComponent, { type: 'component', location })
    }
    if (!result.data) {
      return React.createElement(errorComponent, { type: 'component', error: new Error0('No data'), location })
    }
    return React.createElement(this._ComponentInner, {
      data: result.data as FinalData<TData>,
      location,
      props: restProps as unknown as FinalProps<TProps>,
    })
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

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._layout, {
        data: data as FinalClientData<TData, TClientData>,
        location,
        children,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._layout, {
          data: clientData as FinalClientData<TData, TClientData>,
          location,
          children,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({ data, location, skipHeads: true })
          setClientData(clientData)
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
      data: clientData as FinalClientData<TData, TClientData>,
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
    const queryKey = (this.getQueryKey as any)({ ...this._getInputByLocation(location) }) as QueryKey
    const query = cache.find({ queryKey })
    this._useRegisterSelfInSsrNonfetchedPointsCollector(!!query)
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

  _ClientCtxReactContext: React.Context<FinalClientData<TData, TClientData>> = React.createContext<
    FinalClientData<TData, TClientData>
  >(null as never)

  _ClientCtxProviderInner: React.ComponentType<{
    children: React.ReactNode
    location: Route0.Location<CurrentRoute<TRoute>>
    data: FinalData<TData>
  }> = ({ children, location, data }) => {
    const errorComponent = this._getErrorComponent({ type: 'page' })
    const loaderComponent = this._getLoaderComponent({ type: 'page' })

    if (this._pointType !== 'client-ctx') {
      return React.createElement(errorComponent, {
        type: 'page',
        error: new Error0('Point type is not client-ctx'),
        location,
      })
    }

    if (this._clientExtractFnsHasOnlyHeadFnsOrEmpty()) {
      return React.createElement(this._ClientCtxReactContext.Provider, {
        value: data as FinalClientData<TData, TClientData>,
        children,
      })
    }

    if (!this._hasClientAsyncLoader()) {
      try {
        const { clientData } = this._extractClientSync({ data, location, skipHeads: true })
        return React.createElement(this._ClientCtxReactContext.Provider, {
          value: clientData as FinalClientData<TData, TClientData>,
          children,
        })
      } catch (error: unknown) {
        return React.createElement(errorComponent, { type: 'page', error: Error0.from(error), location })
      }
    }

    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState<Error0 | undefined>(undefined)
    const [clientData, setClientData] = React.useState<Data>({})
    React.useEffect(() => {
      void (async () => {
        setLoading(true)
        try {
          const { clientData } = await this._extractClientAsync({ data, location, skipHeads: true })
          setClientData(clientData)
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
    return React.createElement(this._ClientCtxReactContext.Provider, {
      value: clientData as FinalClientData<TData, TClientData>,
      children,
    })
  }

  Provider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => {
    if (!this._hasLoader()) {
      return React.createElement(this._ClientCtxProviderInner, {
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
    const queryKey = (this.getQueryKey as any)({ ...this._getInputByLocation(location) }) as QueryKey
    const query = cache.find({ queryKey })
    this._useRegisterSelfInSsrNonfetchedPointsCollector(!!query)
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
    return React.createElement(this._ClientCtxProviderInner, {
      data: result.data as FinalData<TData>,
      location,
      children,
    })
  }

  useClientCtx = (): FinalClientData<TData, TClientData> => {
    const ctx = React.useContext(this._ClientCtxReactContext)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!ctx) {
      throw new Error(`useClientCtx on must be used within a ClientCtxProvider`)
    }
    return ctx
  }

  fetch = (async (input: Record<string, any> = {}, options?: FetchOptions | undefined) => {
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

    const fetchOptions = { ...this._fetchOptions(), ...options }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, { Accept: 'application/json' })
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
  }) as never as FetchFn<TRoute, TInputSchema, TResponseOutput, TData>

  extract = (async (eversionRun: EversionRun<TRequiredCtx>, input: Record<string, any> = {}) => {
    if (process.env.CLIENT_ONLY) {
      throw new Error(
        'Extract is not available on client, call it inside server points fn like ctx or loader. In client you should use fetch() instead',
      )
    }
    return await eversionRun.extract({
      point: this as never,
      input,
    })
  }) as never as ExtractFn<TRoute, TInputSchema, TRequiredCtx, TCtx, TData, TResponseOutput>

  getQueryKey = ((input?: Record<string, any>): QueryKey => {
    const keyParts: [string, ...string[]] = [this._pointType, this._getRouteDefinition()]
    if (input) {
      const serialized = stringify(input)
      keyParts.push(serialized)
    }
    return keyParts
  }) as never as GetQueryKeyFn<TRoute, TInputSchema>

  getQueryOptions = ((
    input: Record<string, any> = {},
    queryOptions?: QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>,
    fetchOptions?: FetchOptions,
  ) => {
    const queryKey = (this.getQueryKey as any)(input) as QueryKey
    const queryFn = async () => {
      const data = (await (this.fetch as any)(input, fetchOptions)) as FetchOutput<TResponseOutput, TData>
      return data
    }
    return {
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    }
  }) as never as GetQueryOptionsFn<TRoute, TInputSchema, TResponseOutput, TData>

  getMutationOptions = ((mutationOptions?: MutationOptions, fetchOptions?: FetchOptions) => {
    const mutationFn = async (props: Record<string, any> = {}) => {
      const data = (await (this.fetch as any)(props as never, fetchOptions)) as FetchOutput<TResponseOutput, TData>
      return data
    }
    return {
      ...mutationOptions,
      mutationFn,
      // TODO: add mutation options
    }
  }) as GetMutationOptionsFn<TRoute, TInputSchema, TResponseOutput, TData>

  useQuery = ((
    input: Record<string, any> = {},
    queryOptions?: QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>,
    fetchOptions?: FetchOptions,
  ) => {
    return useQuery((this.getQueryOptions as any)(input as never, queryOptions, fetchOptions) as never)
  }) as never as UseQueryFn<TRoute, TInputSchema, TResponseOutput, TData>

  useMutation = ((mutationOptions?: MutationOptions, fetchOptions?: FetchOptions) => {
    return useMutation((this.getMutationOptions as any)(mutationOptions, fetchOptions) as never) as never
  }) as never as UseMutationFn<TRoute, TInputSchema, TResponseOutput, TData>

  prefetchQuery = (async ({
    queryClient,
    queryOptions: providedQueryOptions,
    fetchOptions,
    location,
    input,
    force,
  }: {
    queryClient: QueryClient
    queryOptions?: QueryOptions
    fetchOptions?: FetchOptions
    location?: Route0.Location
    input?: Record<string, any>
    force?: boolean
  }): Promise<void> => {
    if (!this._hasLoader()) {
      return
    }
    const suitablePointTypes = ['page', 'query', 'component', 'layout', 'client-ctx']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryOptions = (this.getQueryOptions as any)(
      {
        ...(location ? this._getInputByLocation(location) : {}),
        ...input,
      } as never,
      providedQueryOptions,
      fetchOptions,
    ) as QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await queryClient.prefetchQuery(queryOptions as never)
  }) as PrefetchQueryFn<TRoute, TInputSchema>
}
