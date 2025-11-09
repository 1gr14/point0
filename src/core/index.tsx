import { Error0 } from '@devp0nt/error0'
import type { AnyLocation, AnyRoute, CallabelRoute, Extended, KnownLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import type {
  DehydratedState,
  InfiniteData,
  MutationOptions,
  QueryKey as OriginalQueryKey,
  UseInfiniteQueryResult,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query'
import {
  QueryClient,
  dehydrate,
  hydrate,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as React from 'react'
import { stringify } from 'safe-stable-stringify'
import type { ResolvableHead } from 'unhead/types'
import type { Context } from 'use-context-selector'
import { createContext, useContextSelector } from 'use-context-selector'
import type { EversionRun, ExtractResult } from './eversion.js'
import type { LazyPointsModule, ReadyPointsModule } from './points.js'
import { Points } from './points.js'
import { useLocation } from './router.js'
import type { SuperDefinedItem } from './super-store.js'
import { SuperStore } from './super-store.js'
import type {
  AnyDataOrInfiniteData,
  AnyPoint,
  AppendCtx,
  BasePoint,
  ClientExtractFnRecord,
  ClientLoaderFn,
  ComponentComponent,
  Ctx,
  CtxFn,
  CurrentRouteDefinition,
  Data,
  DestinationComponentType,
  EmptyCtx,
  EndPointType,
  ErrorComponentType,
  ExtraUseInfiniteQueryOptions,
  ExtraUseQueryOptions,
  ExtractFnRecord,
  FetchOptions,
  FetchOptionsFn,
  FetchOptionsOrFn,
  FetchOutput,
  FetchOutputType,
  FinalClientData,
  FinalData,
  FinalProps,
  HeadFn,
  IfAnyThenElse,
  Infer,
  InferredRootSourcePoint,
  InputParsed,
  InputRaw,
  InputSchema,
  InputSchemaZod,
  IsInputOptional,
  LayoutComponent,
  LayoutPoint,
  LoaderFn,
  LoadingComponentType,
  MountableComponent,
  PageComponent,
  PartialUseInfiniteQueryOptions,
  PointName,
  PointType,
  PrependCtx,
  Props,
  ProviderValueSetterFn,
  QueryKey,
  QueryResultType,
  RequiredCtx,
  ResponseFn,
  ResponseOutput,
  RootId,
  RouteDefinition,
  StaticHeadsCollection,
  TitleFn,
  UndefinedComponentComponent,
  UndefinedCtx,
  UndefinedData,
  UndefinedEndPointType,
  UndefinedInferredRootSourcePoint,
  UndefinedInputSchema,
  UndefinedLayoutComponent,
  UndefinedPageComponent,
  UndefinedPointName,
  UndefinedProps,
  UndefinedQueryResultType,
  UndefinedResponseOutput,
  UndefinedRoute,
  UndefinedRouteDefinition,
  UseInfiniteQueryOptions,
  UseLoaderResult,
  UsePointQueryResult,
  UseQueryOptions,
  WrapperComponentType,
} from './types.js'
import { mergeHeaders, mergeResolvableHead } from './utils.js'

export class Point0<
  TPointType extends PointType,
  TLetsEndPointType extends EndPointType | UndefinedEndPointType,
  TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
  TRequiredCtx extends RequiredCtx,
  TCtx extends Ctx,
  TData extends Data | UndefinedData,
  TClientData extends Data | UndefinedData,
  TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
  TInputSchema extends InputSchema | UndefinedInputSchema,
  TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
  TQueryResultType extends QueryResultType | UndefinedQueryResultType,
  TProps extends Props | UndefinedProps,
> {
  Infer: Infer<TRequiredCtx, TCtx, TData, TClientData, TInputSchema, TQueryResultType> & {
    Input: InputParsed<TRouteDefinition, TInputSchema>
  } = {} as never

  // TODO: may it help somebody?
  // static readyPoints: ReadyPoint[] = []
  // static pagePoints: PagePoint[] = []
  static _prevUnstableId = 0
  static _getNextUnstableId(): number {
    return Point0._prevUnstableId++
  }

  point: typeof this // this, needed for generator to collect points

  _base: BasePoint<any, any, TRequiredCtx> | undefined
  _sourceBaseUrl: string | undefined
  _pointType: TPointType
  _letsEndPointType: TLetsEndPointType
  _inputSchema: TInputSchema
  _responseFn: TResponseOutput extends ResponseOutput
    ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
    : undefined
  _rootId: RootId
  _staticHeads: StaticHeadsCollection
  _defaultQueryOptions: ExtraUseQueryOptions
  _defaultInfiniteQueryOptions: PartialUseInfiniteQueryOptions
  _defaultPageQueryOptions: ExtraUseQueryOptions
  _defaultLayoutQueryOptions: ExtraUseQueryOptions
  _defaultComponentQueryOptions: ExtraUseQueryOptions
  _defaultProviderQueryOptions: ExtraUseQueryOptions
  _queryOptions: ExtraUseQueryOptions
  _infiniteQueryOptions: ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>>
  _queryResultType: TQueryResultType
  // TODO: remove or use wrapper
  _wrapper: WrapperComponentType | undefined
  _hasSourceBase: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
  _extractFns: ExtractFnRecord[]
  _clientExtractFns: ClientExtractFnRecord[]
  _providerValueSetter: ProviderValueSetterFn<any, any, any, FinalClientData<TData, TClientData>> | undefined
  _useValue: undefined | ((point: AnyPoint, keys?: string | string[] | undefined) => any)
  _route: TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute
  _prevRoute: TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute
  _page:
    | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
    | UndefinedPageComponent
  _component:
    | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
    | UndefinedComponentComponent
  _layout:
    | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
    | UndefinedLayoutComponent
  _layouts: LayoutPoint[]
  _name: PointName | UndefinedPointName
  _unstableId: number
  _fetchOptions: FetchOptionsFn
  _ProviderReactContext: Context<FinalClientData<TData, TClientData>> | undefined

  // TODO: meybe add prefix default? and in places of edpoint use just errorComponent and loadingComponent
  _errorComponent: ErrorComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >
  _pageErrorComponent?: ErrorComponentType<
    'page',
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >
  _componentErrorComponent?: ErrorComponentType<
    'component',
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >
  _loadingComponent: LoadingComponentType<
    DestinationComponentType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >
  _pageLoadingComponent?: LoadingComponentType<
    'page',
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >
  _componentLoadingComponent?: LoadingComponentType<
    'component',
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  >

  private constructor(props: {
    _pointType: TPointType
    _letsEndPointType: TLetsEndPointType
    _base?: BasePoint<any, any, TRequiredCtx> | undefined
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _rootId: RootId
    _wrapper?: WrapperComponentType | undefined
    _staticHeads?: StaticHeadsCollection
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
    _defaultQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultPageQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultComponentQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultProviderQueryOptions?: ExtraUseQueryOptions | undefined
    _queryOptions?: ExtraUseQueryOptions | undefined
    _infiniteQueryOptions?: ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>> | undefined
    _queryResultType?: TQueryResultType
    _hasSourceBase?: TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint ? false : true
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any>
    _ProviderReactContext?: Context<FinalClientData<TData, TClientData>> | undefined
    _useValue?: any
    _route?: TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute
    _prevRoute?: TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute
    _page?:
      | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _name?: PointName | UndefinedPointName
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _pageErrorComponent?: ErrorComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _componentErrorComponent?: ErrorComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _pageLoadingComponent?: LoadingComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _componentLoadingComponent?: LoadingComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _unstableId?: number
  }) {
    this.point = this
    this._rootId = props._rootId
    this._base = props._base ?? undefined
    this._inputSchema = (props._inputSchema ?? undefined) as TInputSchema
    this._sourceBaseUrl = props._sourceBaseUrl ?? undefined
    this._responseFn = (props._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    this._pointType = props._pointType
    this._letsEndPointType = props._letsEndPointType
    this._wrapper = props._wrapper
    this._staticHeads = props._staticHeads ?? []
    this._defaultQueryOptions = props._defaultQueryOptions ?? {}
    this._defaultInfiniteQueryOptions = props._defaultInfiniteQueryOptions ?? {}
    this._defaultLayoutQueryOptions = props._defaultLayoutQueryOptions ?? {}
    this._defaultComponentQueryOptions = props._defaultComponentQueryOptions ?? {}
    this._defaultProviderQueryOptions = props._defaultProviderQueryOptions ?? {}
    this._defaultPageQueryOptions = props._defaultPageQueryOptions ?? {}
    this._queryOptions = props._queryOptions ?? {}
    this._infiniteQueryOptions = props._infiniteQueryOptions ?? ({} as never)
    this._queryResultType = (props._queryResultType ?? undefined) as TQueryResultType
    this._hasSourceBase = props._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
      ? false
      : true
    this._extractFns = props._extractFns ?? []
    this._clientExtractFns = props._clientExtractFns ?? []
    this._providerValueSetter = props._providerValueSetter ?? undefined
    this._ProviderReactContext = props._ProviderReactContext ?? undefined
    this._useValue = props._useValue ? props._useValue.bind(this) : undefined
    this._route =
      props._route ??
      (undefined as TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute)
    this._prevRoute =
      props._prevRoute ??
      (undefined as TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute)
    this._page = props._page ?? undefined
    this._component = props._component ?? undefined
    this._layout = props._layout ?? undefined
    this._layouts = props._layouts ?? []
    this._name = props._name
    this._fetchOptions = props._fetchOptions ?? (() => ({}))
    this._errorComponent =
      props._errorComponent ??
      ((({ error }) => {
        const { stack, ...json } = error.toJSON()
        console.error(error)
        return React.createElement(
          React.Fragment,
          null,
          React.createElement('pre', null, JSON.stringify(json, null, 2)),
          React.createElement('pre', null, stack),
        )
      }) as ErrorComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition
      >)
    this._pageErrorComponent = props._pageErrorComponent
    this._componentErrorComponent = props._componentErrorComponent
    this._pageLoadingComponent = props._pageLoadingComponent
    this._loadingComponent =
      props._loadingComponent ??
      ((() => React.createElement(React.Fragment, null, 'Loading...')) as LoadingComponentType<
        DestinationComponentType,
        TQueryResultType,
        TData,
        TResponseOutput,
        TClientData,
        TInputSchema,
        TRouteDefinition
      >)
    this._componentLoadingComponent = props._componentLoadingComponent

    // calculated
    this._unstableId = props._unstableId ?? Point0._getNextUnstableId()
  }

  _continue<
    TPointType extends PointType,
    TLetsEndPointType extends EndPointType | UndefinedEndPointType,
    TConnectedRootSourcePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
    TRequiredCtx extends RequiredCtx,
    TCtx extends Ctx,
    TData extends Data | UndefinedData,
    TClientData extends Data | UndefinedData,
    TRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TPrevRouteDefinition extends RouteDefinition | UndefinedRouteDefinition,
    TInputSchema extends InputSchema | UndefinedInputSchema,
    TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
    TQueryResultType extends QueryResultType | UndefinedQueryResultType,
    TProps extends Props | UndefinedProps,
  >(overrides: {
    _pointType: TPointType
    _letsEndPointType?: TLetsEndPointType
    _base?: BasePoint<any, any, TRequiredCtx> | undefined
    _sourceBaseUrl?: string | undefined
    _inputSchema?: TInputSchema
    _responseFn?: TResponseOutput extends ResponseOutput
      ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
      : undefined
    _staticHeads?: StaticHeadsCollection
    _defaultInfiniteQueryOptions?: PartialUseInfiniteQueryOptions | undefined
    _defaultQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultPageQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultComponentQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultLayoutQueryOptions?: ExtraUseQueryOptions | undefined
    _defaultProviderQueryOptions?: ExtraUseQueryOptions | undefined
    _queryOptions?: ExtraUseQueryOptions | undefined
    _infiniteQueryOptions?: ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>> | undefined
    _queryResultType?: TQueryResultType
    _wrapper?: WrapperComponentType | undefined
    _extractFns?: ExtractFnRecord[]
    _clientExtractFns?: ClientExtractFnRecord[]
    _providerValueSetter?: ProviderValueSetterFn<any, any, any, any> | undefined
    _ProviderReactContext?: Context<FinalClientData<TData, TClientData>> | undefined
    _useValue?: any
    _route?: IfAnyThenElse<
      TRouteDefinition extends RouteDefinition ? CallabelRoute<TRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _prevRoute?: IfAnyThenElse<
      TPrevRouteDefinition extends RouteDefinition ? CallabelRoute<TPrevRouteDefinition> : UndefinedRoute,
      AnyRoute
    >
    _page?:
      | PageComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedPageComponent
    _component?:
      | ComponentComponent<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TProps>
      | UndefinedComponentComponent
    _layout?:
      | LayoutComponent<TQueryResultType, TData, TResponseOutput, TClientData, TRouteDefinition, TInputSchema, TProps>
      | UndefinedLayoutComponent
    _layouts?: LayoutPoint[]
    _name?: PointName | UndefinedPointName
    _fetchOptions?: FetchOptionsFn
    _errorComponent?: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _pageErrorComponent?: ErrorComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _componentErrorComponent?: ErrorComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _loadingComponent?: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _pageLoadingComponent?: LoadingComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
    _componentLoadingComponent?: LoadingComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >
  }): Point0<
    TPointType,
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return new Point0<
      TPointType,
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      // persistent
      _rootId: this._rootId,

      // overridable
      _base: (overrides._base ?? this._base) as BasePoint<any, any, TRequiredCtx> | undefined,
      _pointType: overrides._pointType,
      _letsEndPointType: (overrides._letsEndPointType ?? this._letsEndPointType) as TLetsEndPointType,
      _sourceBaseUrl: overrides._sourceBaseUrl ?? this._sourceBaseUrl,
      _inputSchema: (overrides._inputSchema ?? this._inputSchema) as TInputSchema,
      _responseFn: (overrides._responseFn ?? undefined) as TResponseOutput extends ResponseOutput
        ? ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TResponseOutput>
        : undefined, // remove end artefact on continue
      // _useLocation: overrides._useLocation ?? this._useLocation,
      _wrapper: overrides._wrapper ?? this._wrapper,
      _staticHeads: overrides._staticHeads ?? this._staticHeads,
      _defaultQueryOptions: overrides._defaultQueryOptions ?? { ...this._defaultQueryOptions },
      _defaultInfiniteQueryOptions: overrides._defaultInfiniteQueryOptions ?? { ...this._defaultInfiniteQueryOptions },
      _defaultPageQueryOptions: overrides._defaultPageQueryOptions ?? { ...this._defaultPageQueryOptions },
      _defaultLayoutQueryOptions: overrides._defaultLayoutQueryOptions ?? { ...this._defaultLayoutQueryOptions },
      _defaultComponentQueryOptions: overrides._defaultComponentQueryOptions ?? {
        ...this._defaultComponentQueryOptions,
      },
      _defaultProviderQueryOptions: overrides._defaultProviderQueryOptions ?? {
        ...this._defaultProviderQueryOptions,
      },
      _queryOptions: overrides._queryOptions ?? { ...this._queryOptions },
      _infiniteQueryOptions: (overrides._infiniteQueryOptions ?? {
        ...this._infiniteQueryOptions,
      }) as ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>>,
      _queryResultType: (overrides._queryResultType ?? this._queryResultType) as TQueryResultType,
      _hasSourceBase: this._hasSourceBase as TConnectedRootSourcePoint extends UndefinedInferredRootSourcePoint
        ? false
        : true,
      _extractFns: overrides._extractFns ?? this._extractFns,
      _clientExtractFns: overrides._clientExtractFns ?? this._clientExtractFns,
      _providerValueSetter: overrides._providerValueSetter ?? this._providerValueSetter,
      _ProviderReactContext: (overrides._ProviderReactContext ?? this._ProviderReactContext) as never,
      _useValue: overrides._useValue ?? this._useValue,
      _route: (overrides._route ?? this._route) as never,
      _prevRoute: (overrides._prevRoute ?? this._prevRoute) as never,
      _page: (overrides._page ?? this._page) as never,
      _component: (overrides._component ?? this._component) as never,
      _layout: (overrides._layout ?? this._layout) as never,
      _layouts: overrides._layouts ?? this._layouts,
      _name: overrides._name ?? this._name,
      _fetchOptions: overrides._fetchOptions ?? this._fetchOptions,
      _errorComponent: (overrides._errorComponent ?? this._errorComponent) as
        | ErrorComponentType<
            DestinationComponentType,
            TQueryResultType,
            TData,
            TResponseOutput,
            TClientData,
            TInputSchema,
            TRouteDefinition
          >
        | undefined,
      _pageErrorComponent: (overrides._pageErrorComponent ?? this._pageErrorComponent) as never,
      _componentErrorComponent: (overrides._componentErrorComponent ?? this._componentErrorComponent) as never,
      _loadingComponent: (overrides._loadingComponent ?? this._loadingComponent) as never,
      _pageLoadingComponent: (overrides._pageLoadingComponent ?? this._pageLoadingComponent) as never,
      _componentLoadingComponent: (overrides._componentLoadingComponent ?? this._componentLoadingComponent) as never,
    })
  }

  static _isEndPointType(pointType: PointType): boolean {
    return (
      pointType === 'base' ||
      pointType === 'page' ||
      pointType === 'layout' ||
      pointType === 'response' ||
      pointType === 'query' ||
      pointType === 'infiniteQuery' ||
      pointType === 'mutation' ||
      pointType === 'component' ||
      pointType === 'provider'
    )
  }
  _isEndpoint(): boolean {
    return Point0._isEndPointType(this._pointType)
  }

  // base

  static source(
    rootId: string,
  ): Point0<
    'middleware',
    'base',
    UndefinedInferredRootSourcePoint,
    UndefinedCtx,
    EmptyCtx,
    UndefinedData,
    UndefinedData,
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedQueryResultType,
    UndefinedProps
  > {
    return new Point0({
      _pointType: 'middleware',
      _hasSourceBase: false,
      _rootId: rootId,
      _letsEndPointType: 'base',
    })
  }

  static connect<TConnectedRootSourcePoint extends InferredRootSourcePoint>(
    rootId: string,
  ): Point0<
    'middleware',
    'base',
    TConnectedRootSourcePoint,
    TConnectedRootSourcePoint['Infer']['RequiredCtx'],
    TConnectedRootSourcePoint['Infer']['Ctx'],
    TConnectedRootSourcePoint['Infer']['Data'],
    TConnectedRootSourcePoint['Infer']['ClientData'],
    UndefinedRoute,
    UndefinedRoute,
    UndefinedInputSchema,
    UndefinedResponseOutput,
    UndefinedQueryResultType,
    UndefinedProps
  > {
    return new Point0<
      'middleware',
      'base',
      TConnectedRootSourcePoint,
      TConnectedRootSourcePoint['Infer']['RequiredCtx'],
      TConnectedRootSourcePoint['Infer']['Ctx'],
      TConnectedRootSourcePoint['Infer']['Data'],
      TConnectedRootSourcePoint['Infer']['ClientData'],
      UndefinedRoute,
      UndefinedRoute,
      UndefinedInputSchema,
      UndefinedResponseOutput,
      UndefinedQueryResultType,
      UndefinedProps
    >({
      _pointType: 'middleware',
      _letsEndPointType: 'base',
      _hasSourceBase: true as never,
      _rootId: rootId,
    })
  }

  // middlewares

  base(): Point0<
    'base',
    TLetsEndPointType extends 'base' ? undefined : TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'base',
      TLetsEndPointType extends 'base' ? undefined : TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'base',
      _base: this as never as BasePoint<any, any, TRequiredCtx>,
      _name: this._name ?? this._rootId,
      // _letsEndPointType: undefined,
      _letsEndPointType: (this._letsEndPointType === 'base'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'base' ? undefined : TLetsEndPointType,
    })
  }

  lets<TNewLetsEndPointType extends EndPointType>(
    letsEndPointType: TNewLetsEndPointType,
    pointName: PointName,
  ): Point0<
    'middleware',
    TNewLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    UndefinedData, // drop client data
    UndefinedRouteDefinition, // drop current route
    TRouteDefinition, // and use it as prev route
    TInputSchema,
    UndefinedResponseOutput, // drop response output
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TNewLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      UndefinedData,
      UndefinedRouteDefinition,
      TRouteDefinition,
      TInputSchema,
      UndefinedResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _letsEndPointType: letsEndPointType,
      _name: pointName,
      _route: undefined,
      _prevRoute: this._route as never,
      _page: undefined,
      _component: undefined,
      _layout: undefined,
      _ProviderReactContext: undefined,
      _providerValueSetter: undefined,
      _useValue: undefined,
      _layouts: this._pointType === 'layout' ? [...this._layouts, this as LayoutPoint] : [...this._layouts],
      _sourceBaseUrl: this._base?._sourceBaseUrl,
      _staticHeads: this._base?._staticHeads,
      _defaultQueryOptions: this._base?._defaultQueryOptions,
      _defaultInfiniteQueryOptions: this._base?._defaultInfiniteQueryOptions,
      _defaultPageQueryOptions: this._base?._defaultPageQueryOptions,
      _defaultComponentQueryOptions: this._base?._defaultComponentQueryOptions,
      _defaultProviderQueryOptions: this._base?._defaultProviderQueryOptions,
      _defaultLayoutQueryOptions: this._base?._defaultLayoutQueryOptions,
      _queryOptions: {},
      _infiniteQueryOptions: {} as never,
      _queryResultType: undefined,
      _clientExtractFns: [],
      _fetchOptions: this._base?._fetchOptions,
      _errorComponent: this._base?._errorComponent as never,
      _pageErrorComponent: this._base?._pageErrorComponent as never,
      _componentErrorComponent: this._base?._componentErrorComponent as never,
      _loadingComponent: this._base?._loadingComponent as never,
      _pageLoadingComponent: this._base?._pageLoadingComponent as never,
      _componentLoadingComponent: this._base?._componentLoadingComponent as never,
    })
  }

  sourceBaseUrl(
    sourceBaseUrl: string,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _sourceBaseUrl: sourceBaseUrl,
    })
  }

  queryOptions(
    queryOptions: ExtraUseQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultQueryOptions: queryOptions,
    })
  }

  infiniteQueryOptions(
    infiniteQueryOptions: PartialUseInfiniteQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultInfiniteQueryOptions: infiniteQueryOptions,
    })
  }

  pageQueryOptions(
    pageQueryOptions: UseQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultPageQueryOptions: pageQueryOptions,
    })
  }

  componentQueryOptions(
    componentQueryOptions: UseQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultComponentQueryOptions: componentQueryOptions,
    })
  }

  providerQueryOptions(
    providerQueryOptions: UseQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultProviderQueryOptions: providerQueryOptions,
    })
  }

  layoutQueryOptions(
    layoutQueryOptions: UseQueryOptions,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _defaultLayoutQueryOptions: layoutQueryOptions,
    })
  }

  fetchOptions(
    fetchOptionsOrFn: FetchOptionsOrFn,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _fetchOptions: typeof fetchOptionsOrFn === 'function' ? fetchOptionsOrFn : () => fetchOptionsOrFn,
    })
  }

  error(
    errorComponent: ErrorComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _errorComponent: errorComponent,
    })
  }

  pageError(
    pageErrorComponent: ErrorComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _pageErrorComponent: pageErrorComponent,
    })
  }

  componentError(
    componentErrorComponent: ErrorComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _componentErrorComponent: componentErrorComponent,
    })
  }

  pageLoading(
    pageLoadingComponent: LoadingComponentType<
      'page',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _pageLoadingComponent: pageLoadingComponent,
    })
  }

  componentLoading(
    componentLoadingComponent: LoadingComponentType<
      'component',
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _componentLoadingComponent: componentLoadingComponent,
    })
  }

  loading(
    loadingComponent: LoadingComponentType<
      DestinationComponentType,
      TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TRouteDefinition
    >,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _loadingComponent: loadingComponent,
    })
  }

  requireCtx<TExtraRequiredCtx extends Ctx>(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
    PrependCtx<TCtx, TExtraRequiredCtx>,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      AppendCtx<TRequiredCtx, TExtraRequiredCtx>,
      PrependCtx<TCtx, TExtraRequiredCtx>,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
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
  //     _appLoadingComponent,
  //     _componentErrorComponent,
  //     _componentLoadingComponent,
  //     _errorComponent,
  //     _fetchOptions,
  //     _name,
  //     _inputSchema,
  //     _layout,
  //     _loadingComponent,
  //     _page,
  //     _pageErrorComponent,
  //     _pageLoadingComponent,
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
    ctxFn: CtxFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewCtx>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctx: TNewCtx,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  ctx<TNewCtx extends Ctx = Ctx>(
    ctxOrFn: TNewCtx,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TNewCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    const ctxFn = typeof ctxOrFn === 'function' ? ctxOrFn : ({ ctx }: { ctx: TCtx }) => ({ ...ctx, ...ctxOrFn })
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TNewCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [...this._extractFns, { type: 'ctx', fn: ctxFn, unstableId: Point0._getNextUnstableId() }] as never,
    })
  }

  route<TNewRoute extends AnyRoute>(
    route: TNewRoute,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TNewRoute['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  route<TNewRouteDefinition extends `/${string}`>(
    routeDefinition: TNewRouteDefinition,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    Route0<TNewRouteDefinition>['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  route<TNewRouteDefinition extends string>(
    relativeRouteDefinition: TNewRouteDefinition,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TPrevRouteDefinition extends RouteDefinition
      ? Extended<TPrevRouteDefinition, TNewRouteDefinition>['definition']
      : Route0<TNewRouteDefinition>['definition'],
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  route(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TPrevRouteDefinition extends RouteDefinition ? TPrevRouteDefinition : never,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  route(route?: CallabelRoute | RouteDefinition) {
    const prevRoute = this._prevRoute
    const newRoute = (() => {
      if (typeof route === 'undefined') {
        if (!prevRoute) {
          throw new Error('Parent of this point have no route, so you cannot use .route() without argument')
        }
        return prevRoute.clone()
      }
      if (typeof route === 'string') {
        if (route.startsWith('/')) {
          return Route0.from(route)
        }
        return prevRoute ? prevRoute.extend(route) : Route0.from(route)
      }
      return route
    })()
    return this._continue({
      _pointType: 'middleware',
      _route: newRoute as CallabelRoute,
    }) as never
  }

  loader(): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  loader<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  loader<TNewData extends Data = Data>(
    loaderFn?: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'middleware',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn ?? ((c: any) => c.data), unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  clientLoader<TNewClientData extends Data = Data>(
    clientLoaderFn: ClientLoaderFn<
      TLetsEndPointType,
      TRouteDefinition,
      TInputSchema,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'client-middleware',
      TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TNewClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'client-middleware',
      _clientExtractFns: [
        ...this._clientExtractFns,
        { type: 'loader', fn: clientLoaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
    })
  }

  head(
    headFn: HeadFn<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData>,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  head(
    head: ResolvableHead,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  head(headFnOrHead: HeadFn<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData> | ResolvableHead) {
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
    titleFn: TitleFn<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData>,
  ): Point0<
    'client-middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  title(
    title: string,
  ): Point0<
    'middleware',
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  title(titleFnOrTitle: TitleFn<TLetsEndPointType, TRouteDefinition, TInputSchema, TData, TClientData> | string) {
    if (typeof titleFnOrTitle === 'function') {
      const headFn: HeadFn<any, any, any, any, any> = (props) => ({ title: titleFnOrTitle(props as never) })
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
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
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
    TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TNewInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  >
  input(inputSchema: InputSchemaZod) {
    return this._continue({
      _pointType: 'middleware',
      _inputSchema: inputSchema,
    }) as never
  }

  // end points

  _isRoot(): boolean {
    return this._name === this._rootId
  }

  page<
    TPage extends PageComponent<
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    page: TPage,
  ): MountableComponent<TInputSchema, TProps, false> &
    Pick<
      Point0<
        'page',
        UndefinedEndPointType,
        TConnectedRootSourcePoint,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
        TProps
      >,
      'lets' | 'point'
    > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .page() function')
    }
    const point = this._continue<
      'page',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TProps
    >({
      _pointType: 'page',
      _page: page as never,
      _letsEndPointType: undefined,
      _queryResultType: (this._queryResultType === undefined
        ? this._hasLoader()
          ? 'query'
          : undefined
        : this._queryResultType) as TQueryResultType extends undefined
        ? TData extends undefined
          ? undefined
          : 'query'
        : TQueryResultType,
    })
    const pageWithPoint = point._Page
    Object.assign(pageWithPoint, { point })
    return pageWithPoint as never
  }

  component<
    TComponent extends ComponentComponent<
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TInputSchema,
      TProps
    >,
  >(
    component: TComponent,
  ): MountableComponent<TInputSchema, TProps, false> &
    Pick<
      Point0<
        'component',
        UndefinedEndPointType,
        TConnectedRootSourcePoint,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
        TProps
      >,
      'lets' | 'point'
    > {
    const point = this._continue<
      'component',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TProps
    >({
      _pointType: 'component',
      _component: component as never,
      _letsEndPointType: undefined,
      _queryResultType: (this._queryResultType === undefined
        ? this._hasLoader()
          ? 'query'
          : undefined
        : this._queryResultType) as TQueryResultType extends undefined
        ? TData extends undefined
          ? undefined
          : 'query'
        : TQueryResultType,
    })
    const componentWithPoint = point._Component
    Object.assign(componentWithPoint, { point })
    return componentWithPoint as never
  }

  layout<
    TLayout extends LayoutComponent<
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TData,
      TResponseOutput,
      TClientData,
      TRouteDefinition,
      TInputSchema,
      TProps
    >,
  >(
    layout: TLayout,
  ): MountableComponent<TInputSchema, TProps, true> &
    Pick<
      Point0<
        'layout',
        UndefinedEndPointType,
        TConnectedRootSourcePoint,
        TRequiredCtx,
        TCtx,
        TData,
        TClientData,
        TRouteDefinition,
        TPrevRouteDefinition,
        TInputSchema,
        TResponseOutput,
        TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
        TProps
      >,
      'lets' | 'point'
    > {
    if (!this._route) {
      throw new Error('add .route() to chain to use .layout() function')
    }
    const point = this._continue<
      'layout',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
      TProps
    >({
      _pointType: 'layout',
      _layout: layout as never,
      _letsEndPointType: undefined,
      _queryResultType: (this._queryResultType === undefined
        ? this._hasLoader()
          ? 'query'
          : undefined
        : this._queryResultType) as TQueryResultType extends undefined
        ? TData extends undefined
          ? undefined
          : 'query'
        : TQueryResultType,
    })
    const layoutWithPoint = point._Layout
    Object.assign(layoutWithPoint, { point, lets: point.lets.bind(point) })
    return layoutWithPoint as never
  }

  provider<TNewClientData extends Data = Data>(
    valueSetter: ProviderValueSetterFn<
      TLetsEndPointType,
      TRouteDefinition,
      FinalClientData<TData, TClientData>,
      TNewClientData
    >,
  ): Point0<
    'provider',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TNewClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
    TProps
  >
  provider(): Point0<
    'provider',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType extends undefined ? (TData extends undefined ? undefined : 'query') : TQueryResultType,
    TProps
  >
  provider(providerValueSetter?: ProviderValueSetterFn<any, any, any, any>) {
    const point = this._continue({
      _pointType: 'provider',
      _letsEndPointType: undefined,
      _queryResultType: (this._queryResultType === undefined
        ? this._hasLoader()
          ? 'query'
          : undefined
        : this._queryResultType) as TQueryResultType extends undefined
        ? TData extends undefined
          ? undefined
          : 'query'
        : TQueryResultType,
      _providerValueSetter: providerValueSetter || (({ data }) => data),
      _ProviderReactContext: createContext<FinalClientData<TData, TClientData>>(null as never) as never,
      _useValue: (point: AnyPoint, keys?: string | string[] | undefined) => {
        if (!point._ProviderReactContext) {
          throw new Error('ProviderReactContext 2 not found on point: ' + point._name)
        }

        if (keys == null) {
          // no keys — return full context
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx) throw new Error('useValue must be used within a Provider.')
            return ctx
          })
        }

        if (Array.isArray(keys)) {
          // multiple keys — build a memoized object
          return useContextSelector(point._ProviderReactContext, (ctx) => {
            if (!ctx) throw new Error('useValue must be used within a Provider.')
            const picked = {} as any
            for (const key of keys) {
              picked[key] = ctx[key]
            }
            return picked
          })
        }

        // single key
        return useContextSelector(point._ProviderReactContext, (ctx) => {
          if (!ctx) throw new Error('useValue must be used within a Provider.')
          return ctx[keys]
        })
      },
    })
    return point as never
  }

  response<TNewResponseOutput extends ResponseOutput = ResponseOutput>(
    responseFn: ResponseFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewResponseOutput>,
  ): Point0<
    'response',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TNewResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'response',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TNewResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'response',
      _responseFn: responseFn as never,
      _letsEndPointType: undefined,
    })
  }

  query(
    queryOptions: ExtraUseQueryOptions<
      FinalClientData<TData, TClientData>,
      Error0,
      FinalClientData<TData, TClientData>,
      QueryKey
    > = {},
  ): Point0<
    'query',
    TLetsEndPointType extends 'query' ? undefined : TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    'query',
    TProps
  > {
    return this._continue<
      'query',
      TLetsEndPointType extends 'query' ? undefined : TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      'query',
      TProps
    >({
      _pointType: 'query',
      _letsEndPointType: (this._letsEndPointType === 'query'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'query' ? undefined : TLetsEndPointType,
      _queryResultType: 'query',
      _queryOptions: queryOptions,
    })
  }

  infiniteQuery(
    infiniteQueryOptions: ExtraUseInfiniteQueryOptions<
      InputRaw<TRouteDefinition, TInputSchema>,
      FinalClientData<TData, TClientData>,
      Error0,
      FinalClientData<TData, TClientData>,
      QueryKey,
      unknown
    >,
  ): Point0<
    'infiniteQuery',
    TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    'infiniteQuery',
    TProps
  > {
    return this._continue<
      'infiniteQuery',
      TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      'infiniteQuery',
      TProps
    >({
      _pointType: 'infiniteQuery',
      _letsEndPointType: (this._letsEndPointType === 'infiniteQuery'
        ? undefined
        : this._letsEndPointType) as TLetsEndPointType extends 'infiniteQuery' ? undefined : TLetsEndPointType,
      _queryResultType: 'infiniteQuery',
      _infiniteQueryOptions: infiniteQueryOptions,
    })
  }

  mutation<TNewData extends Data = Data>(
    loaderFn: LoaderFn<TCtx, TData, TRouteDefinition, TInputSchema, TNewData>,
  ): Point0<
    'mutation',
    UndefinedEndPointType,
    TConnectedRootSourcePoint,
    TRequiredCtx,
    TCtx,
    TNewData,
    TClientData,
    TRouteDefinition,
    TPrevRouteDefinition,
    TInputSchema,
    TResponseOutput,
    TQueryResultType,
    TProps
  > {
    return this._continue<
      'mutation',
      UndefinedEndPointType,
      TConnectedRootSourcePoint,
      TRequiredCtx,
      TCtx,
      TNewData,
      TClientData,
      TRouteDefinition,
      TPrevRouteDefinition,
      TInputSchema,
      TResponseOutput,
      TQueryResultType,
      TProps
    >({
      _pointType: 'mutation',
      _extractFns: [
        ...this._extractFns,
        { type: 'loader', fn: loaderFn, unstableId: Point0._getNextUnstableId() },
      ] as never,
      _letsEndPointType: undefined,
    })
  }

  // getters

  _getErrorComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): ErrorComponentType<TType, TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition> {
    return ({
      page: this._pageErrorComponent,
      component: this._componentErrorComponent,
    }[type] ?? this._errorComponent) as never
  }

  _getLoadingComponent<TType extends DestinationComponentType>({
    type,
  }: {
    type: TType
  }): LoadingComponentType<
    TType,
    TQueryResultType,
    TData,
    TResponseOutput,
    TClientData,
    TInputSchema,
    TRouteDefinition
  > {
    return ({
      page: this._pageLoadingComponent,
      component: this._componentLoadingComponent,
    }[type] ?? this._loadingComponent) as never
  }

  _hasLoader(): boolean {
    return this._extractFns.some((fn) => fn.type === 'loader')
  }

  _clientExtractFnsHasOnlyHeadFnsOrEmpty(): boolean {
    return this._clientExtractFns.length === 0 || this._clientExtractFns.every((fn) => fn.type === 'head')
  }

  _getClientHeadFnsUntilFirstClientLoader(): Array<ClientExtractFnRecord<'head'>> {
    const result: Array<ClientExtractFnRecord<'head'>> = []
    for (const fn of this._clientExtractFns) {
      if (fn.type === 'head') {
        result.push(fn)
      } else {
        break
      }
    }
    return result
  }

  _hasClientLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader')
  }

  _hasClientAsyncLoader(): boolean {
    return this._clientExtractFns.some((fn) => fn.type === 'loader' && fn.fn.constructor.name === 'AsyncFunction')
  }

  _getRouteForce = (): CallabelRoute<NonNullable<TRouteDefinition>> => {
    if (!this._route) {
      throw new Error(`No client route provided for this point. Name: ${this._name}.`)
    }
    return this._route as CallabelRoute<NonNullable<TRouteDefinition>>
  }

  _extractClientAsync = async ({
    data,
    location,
    skipHeads,
    input,
  }: {
    data: Data
    location?: AnyLocation
    skipHeads: boolean
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): Promise<{ clientData: Data; clientHeadMerged: ResolvableHead }> => {
    let currentClientData: Data = data
    let clientHeadMerged: ResolvableHead = {}
    const { parsedInput, inputError } = (() => {
      if (this._inputSchema) {
        const parseResult = this._inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: {}, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    location ??= this._getSelfLocationByAnotherLocationOrInput(location, input)
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHeadMerged = mergeResolvableHead(
            clientHeadMerged,
            clientExtractFn.fn({ data: currentClientData, location, input: parsedInput }),
          )
          break
        }
        case 'loader': {
          currentClientData = await clientExtractFn.fn({
            data: currentClientData,
            location,
            input: parsedInput,
          })
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
    input,
  }: {
    data: AnyDataOrInfiniteData
    location?: AnyLocation
    skipHeads: boolean
    input: InputRaw<TRouteDefinition, TInputSchema>
  }): { clientData: AnyDataOrInfiniteData; clientHead: ResolvableHead[] } => {
    let currentClientData: AnyDataOrInfiniteData = data
    const clientHead: ResolvableHead[] = []
    const { parsedInput, inputError } = (() => {
      if (this._inputSchema) {
        const parseResult = this._inputSchema.safeParse(input)
        if (parseResult.success) {
          return { parsedInput: parseResult.data, inputError: undefined }
        }
        return { parsedInput: {}, inputError: parseResult.error }
      }
      return { parsedInput: input, inputError: undefined }
    })()
    if (inputError) {
      throw new Error(`Input error: ${inputError.message}`)
    }
    location ??= this._getSelfLocationByAnotherLocationOrInput(location, input)
    for (const clientExtractFn of this._clientExtractFns) {
      switch (clientExtractFn.type) {
        case 'head': {
          if (skipHeads) {
            continue
          }
          clientHead.push(clientExtractFn.fn({ data: currentClientData, location, input: parsedInput }))
          break
        }
        case 'loader': {
          currentClientData = clientExtractFn.fn({
            data: currentClientData,
            location,
            input: parsedInput,
          }) as Data
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

  _getSelfLocationByAnotherLocation(location: AnyLocation): AnyLocation {
    const route = this._route
    if (!route) {
      return Point0._currentLocation.get()
    }
    return route.getLocation(route.flat({ ...location.searchParams, ...location.params })) as KnownLocation<
      CurrentRouteDefinition<TRouteDefinition>
    >
  }

  _getSelfLocationByAnotherLocationOrInput(
    location?: AnyLocation | undefined,
    input?: InputRaw<TRouteDefinition, TInputSchema>,
  ): AnyLocation {
    const route = this._route
    if (!route) {
      return location ?? Point0._currentLocation.get()
    }
    if (!input && !location) {
      return Point0._currentLocation.get()
    }
    if (location) {
      return route.getLocation(route.flat({ ...location.searchParams, ...location.params, ...input }))
    }
    return route.getLocation(route.flat({ ...input }))
  }

  _getUnsafeInputRawByLocation(location: AnyLocation): InputRaw<TRouteDefinition, TInputSchema> {
    const selfLocation = this._getSelfLocationByAnotherLocation(location)
    return { ...selfLocation.searchParams, ...selfLocation.params } as InputRaw<TRouteDefinition, TInputSchema>
  }

  useQuery = (
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UsePointQueryResult<TQueryResultType, TData, TResponseOutput, TClientData, any> => {
    const [input = {}, queryOptions, fetchOptions] = args
    const location = useLocation()
    const serverQueryEnabled = this._hasLoader()
    const clientQueryEnabled = this._hasClientLoader()
    const isInfiniteQuery = this._queryResultType === 'infiniteQuery'
    if (!serverQueryEnabled && !clientQueryEnabled) {
      return { data: {}, query: undefined, clientQuery: undefined } as never
    }

    if (serverQueryEnabled && !clientQueryEnabled) {
      // const isInitalSsrLocation = useIsInitalSsrLocation()
      // const useQueryCacheMethod = isServerInfiniteQuery ? this.useInfiniteQueryCache : this.useQueryCache
      // const { queryCache } = useQueryCacheMethod(input as never)
      // const { queryCache } = this.useQueryCache(input as never, 'data')
      const useServerQueryMethod = isInfiniteQuery ? this._useServerInfiniteQuery : this._useServerQuery
      const query = useServerQueryMethod({
        input: input as never,
        queryOptions: queryOptions as any,
        fetchOptions,
      })
      return query as never
    }

    if (!serverQueryEnabled && clientQueryEnabled) {
      const useClientQueryMethod =
        this._queryResultType === 'infiniteQuery' ? this._useClientInfiniteQuery : this._useClientQuery
      const query = useClientQueryMethod({
        input,
        data: {},
        skipHeads: false,
        queryOptions: {
          ...queryOptions,
        },
        location,
      } as never)
      return query as never
    }

    const useClientQueryMethod =
      this._queryResultType === 'infiniteQuery' ? this._useCombinedInfiniteQuery : this._useCombinedQuery
    const query = useClientQueryMethod({
      input,
      queryOptions,
      location,
      fetchOptions,
    } as never)
    return query as never
  }

  _useLoader = (
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [
          input?: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
      : [
          input: InputRaw<TRouteDefinition, TInputSchema>,
          queryOptions?: ExtraUseQueryOptions | undefined,
          fetchOptions?: FetchOptions | undefined,
        ]
  ): UseLoaderResult<TQueryResultType, TData, TResponseOutput, TClientData, TInputSchema, TRouteDefinition, any> => {
    const query = this.useQuery(...args)
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const result = React.useMemo(() => {
      return {
        data: query?.data,
        loading: query?.isLoading,
        error: query?.error ? Error0.from(query.error) : null,
        query: query as never,
        location,
        input: args[0] || {},
      }
    }, [query, query?.data, query?.error, query?.isLoading])
    return result as never
  }

  _Page: MountableComponent<TInputSchema, TProps, false> = (props) => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._page) {
      return React.createElement(errorComponent, {
        type: 'page',
        data: undefined as FinalClientData<TData, TClientData> | undefined,
        error: new Error0('No page component'),
        loading: false,
        location,
        query: undefined as never,
        input: {} as InputParsed<TRouteDefinition, TInputSchema>,
      } as never)
    }

    if (!this._hasClientLoader() && !this._hasLoader()) {
      return React.createElement(this._page, {
        ...(props as any),
        location,
      })
    }

    const { input, restProps } = React.useMemo<{
      input: InputRaw<TRouteDefinition, TInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const input = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { input, restProps }
    }, [props, location])

    const result = this._useLoader(input, this._defaultPageQueryOptions)
    if (result.error) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (result.loading) {
      return React.createElement(loadingComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (!result.data) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
        error: new Error0('No data'),
      })
    }
    return React.createElement(this._page, {
      ...(result as any),
      props: restProps,
    })
  }

  _Component: MountableComponent<TInputSchema, TProps, false> = (props) => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._component) {
      return React.createElement(errorComponent, {
        type: 'page',
        data: undefined as FinalClientData<TData, TClientData> | undefined,
        error: new Error0('No component component'),
        loading: false,
        location,
        query: undefined as never,
        input: {} as InputParsed<TRouteDefinition, TInputSchema>,
      } as never)
    }

    const { input, restProps } = React.useMemo<{
      input: InputRaw<TRouteDefinition, TInputSchema>
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput, ...restProps } = props as any
      const input = { ...providedInput }
      return { input, restProps }
    }, [props])
    const result = this._useLoader(input, this._defaultComponentQueryOptions)
    if (result.error) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (result.loading) {
      return React.createElement(loadingComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (!result.data) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
        error: new Error0('No data'),
      })
    }
    return React.createElement(this._component, {
      ...(result as any),
      props: restProps as unknown as FinalProps<TProps>,
    })
  }

  _Layout: MountableComponent<TInputSchema, TProps, true> = (props) => {
    const location = useLocation<CurrentRouteDefinition<TRouteDefinition>>()
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._layout) {
      return React.createElement(errorComponent, {
        type: 'page',
        data: undefined as never,
        error: new Error0('No layout component'),
        loading: false,
        location,
        query: undefined as never,
        input: {} as InputParsed<TRouteDefinition, TInputSchema>,
      })
    }

    const { input, children, restProps } = React.useMemo<{
      input: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode
      restProps: FinalProps<TProps>
    }>(() => {
      const { input: providedInput = {}, children, ...restProps } = props as any
      const input = { ...this._getUnsafeInputRawByLocation(location), ...providedInput }
      return { input, children, restProps }
    }, [props, location])
    const result = this._useLoader(input, this._defaultLayoutQueryOptions)
    if (result.error) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (result.loading) {
      return React.createElement(loadingComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (!result.data) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
        error: new Error0('No data'),
      })
    }
    return React.createElement(this._layout, {
      ...result,
      children,
      props: restProps,
    } as never)
  }

  getValue(input?: InputRaw<TRouteDefinition, TInputSchema>): FinalClientData<TData, TClientData> {
    const value = SuperStore.getWeak<FinalClientData<TData, TClientData>>(
      `__PROVIDER_VALUE_${this._rootId}_${this._name}_${stringify(input || {})}`,
    )
    if (!value) {
      throw new Error(
        `Provider value not found on point: provider.${this._name}. You should call getValue only after Provider component is mounted and loaded.`,
      )
    }
    return value
  }

  getValueSafe(input?: InputRaw<TRouteDefinition, TInputSchema>): FinalClientData<TData, TClientData> | undefined {
    const value = SuperStore.getWeak<FinalClientData<TData, TClientData>>(
      `__PROVIDER_VALUE_${this._rootId}_${this._name}_${stringify(input || {})}`,
    )
    return value
  }

  Provider: MountableComponent<TInputSchema, UndefinedProps, true> = (props) => {
    const loadingComponent = this._getLoadingComponent({ type: 'page' })
    const errorComponent = this._getErrorComponent({ type: 'page' })

    if (!this._ProviderReactContext) {
      throw new Error('ProviderReactContext not found on point: ' + this._name)
    }
    if (!this._providerValueSetter) {
      throw new Error('providerValueSetter not found on point: ' + this._name)
    }

    const { input, children } = React.useMemo<{
      input: InputRaw<TRouteDefinition, TInputSchema>
      children: React.ReactNode
    }>(() => {
      const { input: providedInput = {}, children } = props as any
      const input = { ...providedInput }
      return { input, children }
    }, [props])
    const result = this._useLoader(input as never, this._defaultProviderQueryOptions)
    if (result.error) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (result.loading) {
      return React.createElement(loadingComponent, {
        ...(result as any),
        type: 'page',
      })
    }
    if (!result.data) {
      return React.createElement(errorComponent, {
        ...(result as any),
        type: 'page',
        error: new Error0('No data'),
      })
    }
    const value = this._providerValueSetter(result)
    SuperStore.setWeak(`__PROVIDER_VALUE_${this._rootId}_${this._name}_${stringify(input)}`, value)
    return React.createElement(this._ProviderReactContext.Provider, {
      value,
      children,
    })
  }

  useValue<K extends keyof FinalClientData<TData, TClientData>>(key: K): FinalClientData<TData, TClientData>[K]
  useValue<K extends keyof FinalClientData<TData, TClientData>>(keys: K[]): Pick<FinalClientData<TData, TClientData>, K>
  useValue(): FinalClientData<TData, TClientData>
  useValue(keys?: keyof FinalClientData<TData, TClientData> | Array<keyof FinalClientData<TData, TClientData>>) {
    if (!this._useValue) {
      throw new Error('useValue not found on point: ' + this._name)
    }
    return (this as any)._useValue(this, keys)
  }

  // bun crashes just when see this code, even if it is not executed, so we need hack with _useValue
  // lets check time to time if crashes no more exists, then uncomment

  // useValue<K extends keyof FinalClientData<TData, TClientData>>(key: K): FinalClientData<TData, TClientData>[K]
  // useValue<K extends keyof FinalClientData<TData, TClientData>>(keys: K[]): Pick<FinalClientData<TData, TClientData>, K>
  // useValue(): FinalClientData<TData, TClientData>
  // useValue(keys?: keyof FinalClientData<TData, TClientData> | Array<keyof FinalClientData<TData, TClientData>>) {
  //   if (!this._ProviderReactContext) {
  //     throw new Error('ProviderReactContext not found on point: ' + this._name)
  //   }

  //   if (keys == null) {
  //     // no keys — return full context
  //     return useContextSelector(this._ProviderReactContext, (ctx) => {
  //       // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //       if (!ctx) throw new Error('useValue must be used within a Provider.')
  //       return ctx
  //     })
  //   }

  //   if (Array.isArray(keys)) {
  //     // multiple keys — build a memoized object
  //     return useContextSelector(this._ProviderReactContext, (ctx) => {
  //       // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //       if (!ctx) throw new Error('useValue must be used within a Provider.')
  //       const picked = {} as any
  //       for (const key of keys) {
  //         picked[key] = ctx[key]
  //       }
  //       return picked
  //     })
  //   }

  //   // single key
  //   return useContextSelector(this._ProviderReactContext, (ctx) => {
  //     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  //     if (!ctx) throw new Error('useValue must be used within a Provider.')
  //     return ctx[keys]
  //   })
  //   return null
  // }

  async fetch(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, fetchOptions?: FetchOptions, _outputType?: FetchOutputType]
  ): Promise<FetchOutput<TResponseOutput, TData>> {
    const [input = {}, options] = args
    const fetchOptions = { ...this._fetchOptions(), ...options }
    const headers = mergeHeaders(fetchOptions.headers, options?.headers, { Accept: 'application/json' })
    const url = new URL('/_point0', this._sourceBaseUrl)
    const method = 'post'

    headers.set('Content-Type', 'application/json')
    const outputType = args[2] ?? (this._pointType === 'response' ? 'response' : 'data')
    const body = stringify({
      outputType,
      rootId: this._rootId,
      pointInput: input,
      pointType: this._pointType,
      pointName: this._name,
    })
    const res = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      method,
      body,
    })
    if (this._pointType === 'response') {
      return res as FetchOutput<TResponseOutput, TData>
    }
    const json = await res.json()
    if (res.ok) {
      return json
    }
    throw Error0.from(json, {
      httpStatus: res.status,
    })
  }

  async extract(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [eversionRun: EversionRun<TRequiredCtx>, input?: InputRaw<TRouteDefinition, TInputSchema>]
      : [eversionRun: EversionRun<TRequiredCtx>, input: InputRaw<TRouteDefinition, TInputSchema>]
  ): Promise<ExtractResult<TCtx, FinalData<TData>, TResponseOutput>> {
    const [eversionRun, input = {}] = args
    return (await eversionRun.extract({
      point: this as never,
      input,
    })) as ExtractResult<TCtx, FinalData<TData>, TResponseOutput>
  }

  static parseQueryKey(queryKey: OriginalQueryKey | QueryKey):
    | {
        isServer: boolean
        isClient: boolean
        pointType: EndPointType
        pointName: PointName
        outputType: string
        isInfiniteQuery: boolean
        input: InputRaw
      }
    | undefined {
    const [check, serverOrClient, pointType, pointName, outputType, finiteOrInfinite, input] = queryKey
    if (
      check !== 'point0' ||
      typeof serverOrClient !== 'string' ||
      typeof pointType !== 'string' ||
      typeof pointName !== 'string' ||
      typeof outputType !== 'string' ||
      typeof finiteOrInfinite !== 'string' ||
      typeof input !== 'string'
    ) {
      return undefined
    }
    return {
      isServer: serverOrClient === 'server' || serverOrClient === 'combined',
      isClient: serverOrClient === 'client' || serverOrClient === 'combined',
      pointType: pointType as EndPointType,
      pointName,
      outputType,
      isInfiniteQuery: finiteOrInfinite === 'infinite',
      input: JSON.parse(input) as InputRaw,
    }
  }

  _getServerQueryKey({
    input,
    outputType = this._pointType === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'server',
      this._pointType,
      this._name,
      outputType,
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  _getClientQueryKey({
    input = {} as never,
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'client',
      this._pointType,
      this._name,
      'data',
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  _getCombinedQueryKey({
    input = {} as never,
    outputType = this._pointType === 'response' ? 'response' : 'data',
    isInfiniteQuery,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    outputType?: FetchOutputType
    isInfiniteQuery: boolean
  }): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    return [
      'point0',
      'combined',
      this._pointType,
      this._name,
      outputType,
      isInfiniteQuery ? 'infinite' : 'finite',
      stringify(input),
    ]
  }

  getQueryKey(
    ...args: IsInputOptional<TRouteDefinition, TInputSchema> extends true
      ? [input?: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
      : [input: InputRaw<TRouteDefinition, TInputSchema>, _outputType?: FetchOutputType]
  ): QueryKey {
    if (!this._name) {
      throw new Error('Point name is not provided')
    }
    const [input, outputType] = args
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
    if (hasClientLoader && hasServerLoader) {
      return this._getCombinedQueryKey({
        input: input as never,
        outputType,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    if (hasClientLoader) {
      return this._getClientQueryKey({
        input: input as never,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    if (hasServerLoader) {
      return this._getServerQueryKey({
        input: input as never,
        outputType,
        isInfiniteQuery: this._queryResultType === 'infiniteQuery',
      })
    }
    throw new Error('No loader found')
  }

  _getServerQueryOptions({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryOptions<FetchOutput<TResponseOutput, TData>, Error0, FetchOutput<TResponseOutput, TData>, QueryKey> {
    const queryKey = this._getServerQueryKey({ input, outputType, isInfiniteQuery: false })
    const queryFn = async () => {
      const data = await this.fetch(input as never, fetchOptions, outputType)
      return data
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
    return result
  }

  _getClientQueryOptions({
    input,
    queryOptions,
    location,
    data,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    data?: Data
  }): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: false })
    const queryFn = this._hasClientAsyncLoader()
      ? async () => {
          const clientData = await this._extractClientAsync({ data: data || {}, location, skipHeads: false, input })
          return clientData
        }
      : () => {
          const clientData = this._extractClientSync({ data: data || {}, location, skipHeads: false, input })
          return clientData
        }
    return {
      ...this._defaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
  }

  _getCombinedQueryOptions({
    input,
    location,
    queryClient,
    queryOptions,
    fetchOptions,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    queryClient ??= Point0.getQueryClient()
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
    const queryFn = async () => {
      const serverData = await (async () => {
        const serverKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
        const cachedServerData = queryClient.getQueryData(serverKey)
        if (cachedServerData) {
          return cachedServerData
        }
        const serverOpts = this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType: 'data' })
        return await queryClient.fetchQuery(serverOpts as any)
      })()

      const clientOpts = this._getClientQueryOptions({
        input: input as never,
        queryOptions,
        location,
        data: serverData as never,
      })
      return await queryClient.fetchQuery(clientOpts as any)
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._queryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as any
    return result
  }

  getQueryOptions({
    input,
    location,
    queryClient,
    queryOptions,
    fetchOptions,
    outputType,
    mode = 'any',
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
    mode?: 'server' | 'client' | 'any'
  }): UseQueryOptions<FinalClientData<TData, TClientData>, Error0, FinalClientData<TData, TClientData>, QueryKey> {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'any')) {
      return this._getCombinedQueryOptions({
        input: input as never,
        queryClient,
        queryOptions,
        fetchOptions,
        location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'any')) {
      return this._getClientQueryOptions({
        input: input as never,
        queryOptions,
        location,
      }) as never
    }
    if (hasServerLoader && (mode === 'server' || mode === 'any')) {
      return this._getServerQueryOptions({
        input: input as never,
        queryOptions,
        fetchOptions,
        outputType,
      }) as never
    }
    throw new Error('No loader found')
  }

  _getServerInfiniteQueryOptions({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalData<TData>,
          Error0,
          FinalData<TData>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryOptions<
    InfiniteData<FetchOutput<TResponseOutput, TData>>,
    Error0,
    FetchOutput<TResponseOutput, TData>,
    QueryKey
  > {
    const queryKey = this._getServerQueryKey({ input: input as never, outputType, isInfiniteQuery: true })
    const queryFn = async ({ pageParam }: { pageParam: unknown }) => {
      const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
      const data = await this.fetch(
        { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam } as never,
        fetchOptions,
        outputType,
      )
      return data
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    }
    return result as never
  }

  _getClientInfiniteQueryOptions({
    input,
    queryOptions,
    data,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    data?: Data
    location?: AnyLocation
    queryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryOptions<
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const queryKey = this._getClientQueryKey({ input, isInfiniteQuery: true })
    const queryFn = this._hasClientAsyncLoader()
      ? async ({ pageParam }: { pageParam: unknown }) => {
          const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
          const { clientData } = await this._extractClientAsync({
            data: data || {},
            location,
            skipHeads: false,
            input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
          })
          return clientData
        }
      : ({ pageParam }: { pageParam: unknown }) => {
          const pageParamFromInput = this._infiniteQueryOptions.pageParamFromInput
          const { clientData } = this._extractClientSync({
            data: data || {},
            location,
            skipHeads: false,
            input: { ...input, [pageParamFromInput]: pageParam ?? this._infiniteQueryOptions.initialPageParam },
          })
          return clientData
        }
    return {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
  }

  _getCombinedInfiniteQueryOptions({
    input,
    queryOptions,
    fetchOptions,
    location,
    queryClient,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    fetchOptions?: FetchOptions | undefined
    queryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
  }): UseInfiniteQueryOptions<
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const queryKey = this._getCombinedQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
    const queryFn = async (ctx: { pageParam: unknown }) => {
      const pageParam = ctx.pageParam ?? this._infiniteQueryOptions.initialPageParam
      const serverData = await (async () => {
        queryClient ??= Point0.getQueryClient()
        const infiniteServerKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: true })
        const infiniteCachedServerData = queryClient.getQueryData(infiniteServerKey)
        if (infiniteCachedServerData) {
          const pageParamIndex = (infiniteCachedServerData as any).pageParams.findIndex((p: unknown) => p === pageParam)
          if (pageParamIndex !== -1) {
            return (infiniteCachedServerData as any).pages[pageParamIndex]
          }
        }
        const inputWithPageParam = { ...input, [this._infiniteQueryOptions.pageParamFromInput]: pageParam }
        const finiteServerKey = this._getServerQueryKey({ input, outputType: 'data', isInfiniteQuery: false })
        const finiteCachedServerData = queryClient.getQueryData(finiteServerKey)
        if (finiteCachedServerData) {
          return finiteCachedServerData
        }
        const serverFinityOpts = this._getServerQueryOptions({
          input: inputWithPageParam as never,
          queryOptions,
          fetchOptions,
          outputType: 'data',
        })
        const serverFinityResult = await queryClient.fetchQuery(serverFinityOpts as any)
        queryClient.setQueryData(infiniteServerKey, (data: { pages: any[]; pageParams: unknown[] } | undefined) => {
          const pageParamIndex = data?.pageParams.findIndex((p: unknown) => p === pageParam)
          if (pageParamIndex === undefined || pageParamIndex === -1) {
            return data
          }
          return {
            pages: [...(data?.pages || []), serverFinityResult],
            pageParams: [...(data?.pageParams || []), pageParam],
          }
        })
        return serverFinityResult
      })()

      const clientOpts = this._getClientInfiniteQueryOptions({
        input: input as never,
        data: serverData as never,
        queryOptions,
        location,
      })
      return await (clientOpts as any).queryFn({ ...input, pageParam })
    }
    const result = {
      ...this._defaultQueryOptions,
      ...this._defaultInfiniteQueryOptions,
      ...this._infiniteQueryOptions,
      ...queryOptions,
      queryKey,
      queryFn,
    } as never
    return result
  }

  getInfiniteQueryOptions({
    input,
    location,
    queryOptions,
    queryClient,
    fetchOptions,
    outputType,
    mode = 'any',
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema> | undefined
    location?: AnyLocation
    queryOptions:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    queryClient?: QueryClient
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
    mode?: 'server' | 'client' | 'any'
  }): UseInfiniteQueryOptions<
    InputRaw<TRouteDefinition, TInputSchema>,
    FinalClientData<TData, TClientData>,
    Error0,
    InfiniteData<FinalClientData<TData, TClientData>>,
    QueryKey
  > {
    const hasClientLoader = this._hasClientLoader()
    const hasServerLoader = this._hasLoader()
    if (hasClientLoader && hasServerLoader && (mode === 'client' || mode === 'any')) {
      return this._getCombinedInfiniteQueryOptions({
        input: input as never,
        queryOptions,
        fetchOptions,
        queryClient,
        location,
      }) as never
    }
    if (hasClientLoader && (mode === 'client' || mode === 'any')) {
      return this._getClientInfiniteQueryOptions({
        input: input as never,
        queryOptions: queryOptions as any,
        location,
      }) as never
    }
    if (hasServerLoader && (mode === 'server' || mode === 'any')) {
      return this._getServerInfiniteQueryOptions({
        input: input as never,
        queryOptions: queryOptions as any,
        fetchOptions,
        outputType,
      }) as never
    }
    throw new Error('No loader found')
  }

  _useServerQuery = ({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0> => {
    return useQuery(this._getServerQueryOptions({ input, queryOptions, fetchOptions, outputType }))
  }

  _useClientQuery = ({
    input,
    queryOptions,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
  }): UseQueryResult<FinalClientData<TData, TClientData>, Error0> => {
    return useQuery(
      this._getClientQueryOptions({
        input,
        queryOptions,
        location,
      }),
    )
  }

  _useCombinedQuery = ({
    input,
    queryOptions,
    location,
    fetchOptions,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?: ExtraUseQueryOptions | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseQueryResult<FinalClientData<TData, TClientData>, Error0> => {
    const queryClient = useQueryClient()
    return useQuery(
      this._getCombinedQueryOptions({
        input,
        queryOptions,
        location,
        queryClient,
        fetchOptions,
      }),
    )
  }

  _useServerInfiniteQuery = ({
    input,
    queryOptions,
    fetchOptions,
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryOptions: ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>> | undefined
    fetchOptions?: FetchOptions | undefined
    outputType?: FetchOutputType
  }): UseInfiniteQueryResult<InfiniteData<FetchOutput<TResponseOutput, TData>>, Error0> => {
    const infiniteQueryOptions = this._getServerInfiniteQueryOptions({ input, queryOptions, fetchOptions, outputType })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  _useClientInfiniteQuery = ({
    input,
    queryOptions,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0> => {
    const infiniteQueryOptions = this._getClientInfiniteQueryOptions({
      input,
      queryOptions: queryOptions as any,
      location,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  _useCombinedInfiniteQuery = ({
    input,
    queryOptions,
    fetchOptions,
    location,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryOptions?:
      | ExtraUseInfiniteQueryOptions<
          InputRaw<TRouteDefinition, TInputSchema>,
          FinalClientData<TData, TClientData>,
          Error0,
          InfiniteData<FinalClientData<TData, TClientData>>,
          QueryKey,
          unknown
        >
      | undefined
    fetchOptions?: FetchOptions | undefined
  }): UseInfiniteQueryResult<InfiniteData<FinalClientData<TData, TClientData>>, Error0> => {
    const queryClient = useQueryClient()
    const infiniteQueryOptions = this._getCombinedInfiniteQueryOptions({
      input,
      queryOptions: queryOptions as any,
      queryClient,
      location,
      fetchOptions,
    })
    return useInfiniteQuery(infiniteQueryOptions) as never
  }

  getMutationOptions(
    mutationOptions?: MutationOptions,
    fetchOptions?: FetchOptions,
  ): MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>> {
    const mutationFn = async (input: Record<string, any> = {}) => {
      const data = await this.fetch(input as never, fetchOptions)
      return data
    }
    return {
      ...mutationOptions,
      mutationFn,
      // TODO: add .mutationOptions helper
    } as MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>>
  }

  useMutation = (
    mutationOptions?: MutationOptions | undefined,
    fetchOptions?: FetchOptions | undefined,
  ): UseMutationResult<FetchOutput<TResponseOutput, TData>, Error0, InputParsed<TRouteDefinition, TInputSchema>> => {
    return useMutation(this.getMutationOptions(mutationOptions, fetchOptions))
  }

  // TODO: add option to allow prefetch only server or only client, or combined query
  async prefetchQuery({
    input,
    location,
    queryClient,
    queryOptions: providedQueryOptions,
    fetchOptions,
    force,
    mode = 'any',
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    force?: boolean
    mode?: 'server' | 'client' | 'any'
    outputType?: FetchOutputType
  }): Promise<undefined | QueryKey> {
    if (!this._hasLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasLoader() && mode === 'server') {
      return
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryOptions = this.getQueryOptions({
      input: input as never,
      location,
      queryOptions: providedQueryOptions as any,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    queryClient ??= Point0.getQueryClient()
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await queryClient.prefetchQuery(queryOptions as never)
    return queryOptions.queryKey
  }

  // TODO: add option to allow prefetch only server or only client, or combined query
  async prefetchInfiniteQuery({
    input,
    location,
    queryClient,
    queryOptions: providedQueryOptions,
    fetchOptions,
    force,
    mode = 'any',
    outputType,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location?: AnyLocation
    queryClient?: QueryClient
    queryOptions?: ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>>
    fetchOptions?: FetchOptions
    force?: boolean
    mode?: 'server' | 'client' | 'any'
    outputType?: FetchOutputType
  }): Promise<undefined | QueryKey> {
    if (!this._hasLoader() && !this._hasClientLoader()) {
      return
    }
    if (!this._hasClientLoader() && mode === 'client') {
      return
    }
    if (!this._hasLoader() && mode === 'server') {
      return
    }
    const suitablePointTypes = ['page', 'query', 'infiniteQuery', 'component', 'layout', 'provider']
    if (!suitablePointTypes.includes(this._pointType)) {
      return
    }
    const queryOptions = this.getInfiniteQueryOptions({
      input: input as never,
      location,
      queryOptions: providedQueryOptions as any,
      queryClient,
      fetchOptions,
      outputType,
      mode,
    })
    queryClient ??= Point0.getQueryClient()
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryOptions.queryKey as never })
    if (query && !force) {
      return
    }
    await queryClient.prefetchInfiniteQuery(queryOptions as never)
    return queryOptions.queryKey
  }

  async prefetchPageDehydratedState({
    input,
    queryClient,
    queryOptions,
    fetchOptions,
    force,
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    queryClient?: QueryClient
    queryOptions?: ExtraUseQueryOptions
    fetchOptions?: FetchOptions
    force?: boolean
  }): Promise<void> {
    if (this._pointType !== 'page') {
      throw new Error('Point type is not page')
    }
    queryClient ??= Point0.getQueryClient()
    const _queryOptions = this._getServerQueryOptions({
      input,
      queryOptions,
      fetchOptions,
      outputType: 'dehydratedState',
    })
    const queryKey = _queryOptions.queryKey
    const cache = queryClient.getQueryCache()
    const query = cache.find({ queryKey: queryKey as never })
    const cachedData = query?.state.data as { dehydratedState: DehydratedState } | undefined
    if (cachedData?.dehydratedState && !force) {
      return
    }
    const data = (await queryClient.fetchQuery(_queryOptions as never)) as any
    if (!data?.dehydratedState) {
      throw new Error('Dehydrated state not found')
    }
    hydrate(queryClient, data.dehydratedState)
  }

  async prefetchPage({
    input,
    location,
    queryClient,
    queryOptions,
    fetchOptions,
    force,
    mode = 'any',
  }: {
    input: InputRaw<TRouteDefinition, TInputSchema>
    location: AnyLocation
    queryClient?: QueryClient
    queryOptions?:
      | Partial<ExtraUseQueryOptions>
      | Partial<ExtraUseInfiniteQueryOptions<InputRaw<TRouteDefinition, TInputSchema>>>
      | undefined
    fetchOptions?: FetchOptions
    force?: boolean
    mode?: 'server' | 'client' | 'any' | 'dehydratedState' | 'all'
  }): Promise<void> {
    if (mode === 'dehydratedState' || mode === 'all') {
      await this.prefetchPageDehydratedState({ queryClient, input, queryOptions, fetchOptions, force })
      if (mode === 'dehydratedState') {
        return
      }
    }

    // TODO: alse fetch all attached components

    await Promise.all(
      [this, ...this._layouts].flatMap(async (p) => {
        if (mode === 'all' && !p._hasClientLoader()) {
          return []
        }
        if (mode === 'client' && !p._hasClientLoader()) {
          return []
        }
        const method = p._queryResultType === 'infiniteQuery' ? 'prefetchInfiniteQuery' : 'prefetchQuery'
        return await p[method]({
          queryClient,
          input: p === this ? input : p._getUnsafeInputRawByLocation(location),
          location,
          queryOptions: queryOptions as any,
          fetchOptions,
          force,
          mode: mode === 'all' ? 'client' : mode,
        })
      }),
    )
  }

  // super store

  static define = SuperStore.define.bind(SuperStore)

  static defineQueryClient(init: () => QueryClient): SuperDefinedItem<QueryClient, DehydratedState> {
    Point0._queryClient.config.init = init
    return Point0._queryClient
  }

  static getQueryClient(): QueryClient {
    return Point0._queryClient.get()
  }

  static _ssrLocation = SuperStore.define<AnyLocation | undefined, true>('__SSR_LOCATION__', () => undefined, true)
  static _currentLocation = SuperStore.define<AnyLocation, true>(
    '__CURRENT_LOCATION__',
    () => Route0.getLocation('/'),
    true,
  )
  static _queryClient = SuperStore.define<QueryClient, DehydratedState>(
    '__QUERY_CLIENT__',
    () => new QueryClient(),
    (queryClient) =>
      dehydrate(queryClient, {
        shouldDehydrateQuery: () => {
          // This will include all queries, including failed ones
          return true
        },
      }),
    (dehydratedState, createQueryClient) => {
      const queryClient = createQueryClient()
      hydrate(queryClient, dehydratedState)

      const prefetchPageQuery = queryClient
        .getQueryCache()
        .getAll()
        .find((q: any) => q.state?.data && typeof q.state.data === 'object' && 'dehydratedState' in q.state.data)

      if (!prefetchPageQuery) {
        return queryClient
      }

      const relatedQueriesDehydratedState = (prefetchPageQuery.state.data as { dehydratedState: DehydratedState })
        .dehydratedState
      hydrate(queryClient, relatedQueriesDehydratedState)

      return queryClient
    },
  )

  // points

  static _points: Points | undefined
  static setPoints = (points: LazyPointsModule | ReadyPointsModule) => {
    Point0._points = Points.create(points)
  }
  static getPoints = (): Points => {
    // const points = SuperStore.getWeak<Points>('__POINTS__')
    const points = Point0._points
    if (!points) {
      throw new Error('Points not found. Forget to call Point0.setPoints()?')
    }
    return points
  }
}
