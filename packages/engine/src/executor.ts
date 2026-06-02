import * as flat0 from '@devp0nt/flat0'
import { Route0, type AnyLocation, type AnyRoute } from '@devp0nt/route0'
import type {
  AnyPoint,
  AppComponent,
  ClassLikeError0,
  ClientPoints,
  Ctx,
  Data,
  DataTransformerExtended,
  ErrorPoint0,
  IfAnyThenElse,
  InputParsed,
  InputRaw,
  InputSchema,
  IsSchemaOptional,
  LoaderOutput,
  NiceServerPoints,
  PagePoint,
  PointName,
  PointsScope,
  QueryKey,
  ReadyPoint,
  ReadyPointType,
  RequiredCtx,
  // ServerExecuteAction,
  ServerExecuteResult,
  SimpleSafeParseInputResult,
  SuperStoreInternalValues,
  SuperStoreInternalValuesOrErrors,
  UndefinedData,
  UndefinedLoaderOutput,
  UnknownCtx,
  UnknownData,
} from '@point0/core'
import {
  _point0_env,
  _ss,
  _ssRunWithServerStorageState,
  getEffects,
  isQueryClientDehydratedStateQuery,
  parseQueryKey,
} from '@point0/core'
import { CookieStore } from '@point0/core/cookie-store'
import { Effects } from '@point0/core/effects'
import { RedirectTask } from '@point0/core/navigation'
import type { Request0 } from '@point0/core/request0'
import { SsrStore } from '@point0/core/ssr-store'
import type { DehydratedState, QueryKey as OriginalQueryKey } from '@tanstack/react-query'
import { dehydrate } from '@tanstack/react-query'
import { createHead } from '@unhead/react/server'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import { stringify } from 'safe-stable-stringify'
import type { SsrOptionsResolved } from './config.js'
import type { Engine } from './engine.js'

export class Executor<TRequiredCtx extends RequiredCtx = RequiredCtx, TError extends ErrorPoint0 = ErrorPoint0> {
  engine: Engine<RequiredCtx, TError, true>
  request: Request0<any, TError>
  effects: Effects
  requiredCtx: TRequiredCtx
  serverStorageState: SuperStoreInternalValues

  private constructor({
    engine,
    request,
    requiredCtx,
    serverStorageState,
    effects,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    request: Request0<any, TError>
    requiredCtx: TRequiredCtx
    serverStorageState: SuperStoreInternalValues
    effects: Effects
  }) {
    this.engine = engine
    this.request = request
    this.effects = effects
    this.requiredCtx = requiredCtx
    this.serverStorageState = serverStorageState
  }

  static async create<TRequiredCtx extends RequiredCtx = RequiredCtx, TError extends ErrorPoint0 = ErrorPoint0>({
    engine,
    request,
    requiredCtx,
    effects,
    serverStorageState: providedServerStorageState,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    request: Request0<any, TError>
    requiredCtx: TRequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<Executor<TRequiredCtx, TError>> {
    const serverStorageState = Object.assign(providedServerStorageState, {
      __POINT0_SSR_STORE_PENDING__: new Map(),
      __POINT0_COOKIE_STORE_PENDING__: new Map(),
      __POINT0_HYDRATION_FINISHED__: false,
      __POINT0_FAKE_CLIENT__: undefined,
      __POINT0_FETCH_FN__: engine.fetch.bind(engine),
      __POINT0_REQUEST0__: request,
      __POINT0_SERVER_PORT__: engine.server.port,
      __POINT0_EFFECTS__: effects,
      __POINT0_CLIENT_POINTS__: undefined,
      // in case of recursive server response we want preserve query client to keep state
      __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: undefined,
      __POINT0_QUERY_CLIENT__:
        _ss.__POINT0_QUERY_CLIENT_FROM_PARENT_RUN__.getWeak() || _ss.__POINT0_QUERY_CLIENT__.config.init(),
      __POINT0_SSR_LOCATION__: undefined,
      __POINT0_SSR_REDIRECT_TASK__: undefined,
      __POINT0_IS_SSR_IN_PROGRESS__: false,
      __POINT0_CURRENT_LOCATION__: new Error('Current location will exists only on ssr phase') as never,
      __POINT0_NAVIGATION_HELPERS__: new Error('Navigation helpers will exists only on ssr phase') as never,
      __POINT0_NAVIGATION_PAGE_STATE__: new Error('Navigation page state will exists only on ssr phase') as never,
      __POINT0_CURRENT_NAVIGATE_ID__: new Error('Current navigate id will exists only on ssr phase') as never,
      __POINT0_NAVIGATION_TRANSITION_STATE__: new Error(
        'Navigation transition state will exists only on ssr phase',
      ) as never,
      __POINT0_LOAD_PAGE_COMPONENT_PROMISES__: new Error(
        'Load page component promises will exists only on ssr phase',
      ) as never,
      __POINT0_PREFETCH_PAGE_PROMISES__: new Error('Prefetch page promises will exists only on ssr phase') as never,
      __POINT0_UNHEAD_SERVER_HEAD__: createHead(),
    } satisfies SuperStoreInternalValues)
    return new Executor<TRequiredCtx, TError>({
      engine,
      request,
      requiredCtx,
      effects,
      serverStorageState,
    })
  }

  async withServerGlobalState<T>(callback: () => Promise<T>): Promise<T> {
    return await _ssRunWithServerStorageState(this.serverStorageState, callback)
  }

  // First level key is schema validator object, second level key is input reference.
  private _parseInputSafeAsyncCache = new WeakMap<object, Map<unknown, Promise<SimpleSafeParseInputResult>>>()

  private static async parseInputSafeAsyncUncached<TInputSchema extends InputSchema>(
    { schema }: { schema: TInputSchema },
    ...args: IsSchemaOptional<TInputSchema> extends true
      ? [input?: InputRaw<TInputSchema>]
      : [input: InputRaw<TInputSchema>]
  ): Promise<SimpleSafeParseInputResult> {
    const [input = {}] = args
    try {
      const result = await schema['~standard'].validate(input)

      if ('value' in result) {
        return {
          success: true,
          data: result.value as InputParsed<TInputSchema>,
          error: undefined,
        }
      }

      const firstIssue = result.issues.at(0)
      if (!firstIssue) {
        return {
          success: false,
          data: undefined,
          error: new Error('Unknown input schema error'),
        }
      }
      const path = firstIssue.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
      const message = [path, firstIssue.message].filter(Boolean).join(': ')
      const error = new Error(message)
      return {
        success: false,
        data: undefined,
        error,
      }
    } catch (error) {
      return { success: false, data: undefined, error }
    }
  }

  private async parseInputSafeAsync<TInputSchema extends InputSchema>(
    { schema }: { schema: TInputSchema },
    input: InputRaw,
  ): Promise<SimpleSafeParseInputResult> {
    const schemaValidator = schema['~standard'] as object
    let schemaCache = this._parseInputSafeAsyncCache.get(schemaValidator)
    if (!schemaCache) {
      schemaCache = new Map()
      this._parseInputSafeAsyncCache.set(schemaValidator, schemaCache)
    }
    const cachedResult = schemaCache.get(input)
    if (cachedResult) {
      return cachedResult as Promise<SimpleSafeParseInputResult>
    }
    const parsePromise = Executor.parseInputSafeAsyncUncached({ schema }, input as InputRaw<TInputSchema>)
    schemaCache.set(input, parsePromise)
    return parsePromise
  }

  private async validatePointInputSafeAsync<TPoint extends AnyPoint>({
    point,
    input,
    body,
    params,
    search,
    headers,
    cookies,
  }: {
    point: TPoint
    input: InputRaw
    body: InputRaw
    params: InputRaw
    search: InputRaw
    headers: InputRaw
    cookies: InputRaw
  }): Promise<{ success: true; error: undefined } | { success: false; error: unknown }> {
    for (const serverExecuteAction of point._serverExecuteActions) {
      if (serverExecuteAction.type === 'input') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, point.type === 'action' ? search : input)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
      if (serverExecuteAction.type === 'params') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, params)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
      if (serverExecuteAction.type === 'search') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, search)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
      if (serverExecuteAction.type === 'body') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, body)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
      if (serverExecuteAction.type === 'headers') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, headers)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
      if (serverExecuteAction.type === 'cookies') {
        const result = await this.parseInputSafeAsync(serverExecuteAction, cookies)
        if (!result.success) {
          return { success: false, error: result.error }
        }
      }
    }
    return { success: true, error: undefined }
  }

  async execute<TPoint extends ReadyPoint | undefined, TErrorClass extends ClassLikeError0<ErrorPoint0>>({
    point,
    input,
    effects,
    ErrorClass,
  }: ExecuteOptions<TPoint, TErrorClass>): Promise<
    ServerExecuteResult<
      TPoint extends { Infer: { Ctx: Ctx } } ? TPoint['Infer']['Ctx'] : UnknownCtx,
      TPoint extends { Infer: { ServerLoaderOutput: LoaderOutput | UndefinedLoaderOutput } }
        ? TPoint['Infer']['ServerLoaderOutput']
        : UnknownData,
      IfAnyThenElse<InstanceType<TErrorClass>, ErrorPoint0, InstanceType<TErrorClass>>
    >
  >
  async execute(
    ...args: [options: ExecuteOptions<any, ClassLikeError0<ErrorPoint0>>]
  ): Promise<ServerExecuteResult<any, any, any>> {
    const {
      point,
      inputProvided = {},
      _known,
      effects = Effects.create(),
      ErrorClass,
    } = ((): {
      point: ReadyPoint | undefined
      inputProvided: Record<string, unknown>
      _known?: {
        input?: InputRaw
        search?: Record<string, unknown>
        params?: Record<string, unknown>
        body?: Record<string, unknown>
      }
      effects?: Effects
      ErrorClass: ClassLikeError0<ErrorPoint0>
    } => {
      return {
        point: args[0].point,
        inputProvided: args[0].input,
        _known: args[0]._known,
        effects: args[0].effects,
        ErrorClass: args[0].ErrorClass,
      }
    })()
    const { search, params, body, input } = (() => {
      if (_known) {
        return {
          search: _known.search || {},
          params: _known.params || {},
          body: _known.body || {},
          input: _known.input || {},
        }
      }
      if (point?.type === 'action') {
        return {
          search: inputProvided.search || {},
          params: inputProvided.params || {},
          body: inputProvided.body || {},
          input: {},
        }
      }
      if (point?.type === 'page' || point?.type === 'layout') {
        const route = point.point.route as AnyRoute | undefined
        if (!route) {
          return {
            search: {},
            params: {},
            body: {},
            input: {},
          }
        }
        const {
          '?': search,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          '#': _hash,
          ...params
        } = flat0.parse(flat0.stringify(inputProvided)) as Record<string, unknown>
        return {
          search: search || {},
          params: params,
          body: {},
          input: {},
        }
      }
      return { search: {}, params: {}, body: {}, input: inputProvided }
    })()
    const headers = this.request.headers
    const cookies = this.request.cookies
    return await this.withServerGlobalState(async () => {
      const { inputError } = await (async () => {
        if (!point) {
          // we will throw 404 later, so input unused
          return { inputError: undefined }
        }
        const result = await this.validatePointInputSafeAsync({
          point,
          input,
          body,
          params,
          search,
          headers,
          cookies,
        })
        if (!result.success) {
          return { inputError: result.error }
        }
        return { inputError: undefined }
      })()
      if (inputError) {
        const status = 422
        effects.set.status(status)
        const error0 = ErrorClass.from(inputError)
        error0.status = status
        return {
          ctx: this.requiredCtx ?? {},
          data: {},
          error: error0,
          status,
          response: undefined,
          redirect: undefined,
          output: {},
          effects: effects.values,
          point,
        }
      }

      type Branch = {
        ctx: UnknownCtx
        ctxExposedKeys: string[]
        ctxExposed: UnknownCtx
        // data: UnknownData | UndefinedData | React.ReactElement
        data: UnknownData | UndefinedData
        response: Response | undefined
        // output: LoaderOutput | UndefinedLoaderOutput | React.ReactElement
        output: LoaderOutput | UndefinedLoaderOutput
        inputParsed: InputParsed | undefined
        paramsParsed: InputParsed | undefined
        searchParsed: InputParsed | undefined
        headersParsed: InputParsed | undefined
        cookiesParsed: InputParsed | undefined
        bodyParsed: InputParsed | undefined
      }
      const getCleanLayer = (): Branch => {
        return {
          ctx: this.requiredCtx ?? {},
          ctxExposedKeys: [],
          ctxExposed: {},
          data: undefined,
          response: undefined,
          output: undefined,
          inputParsed: undefined,
          paramsParsed: undefined,
          searchParsed: undefined,
          headersParsed: undefined,
          cookiesParsed: undefined,
          bodyParsed: undefined,
        }
      }
      const layers = [getCleanLayer()]

      try {
        if (!point) {
          const status = 404
          const error0 = new ErrorClass(`Point Not Found`, { status, code: 'POINT0_POINT_NOT_FOUND' })
          effects.set.status(status)
          return {
            ctx: layers[0].ctx,
            data: layers[0].data,
            error: error0,
            status,
            response: layers[0].response,
            redirect: undefined,
            output: layers[0].output,
            effects: effects.values,
            point: undefined,
          }
        }

        if (!point._hasServerLoader) {
          const status = 500
          const error0 = new ErrorClass(`Point "${point.toString()}" has no server loader`, {
            status,
            code: 'POINT0_POINT_NO_SERVER_LOADER',
            meta: { point: point.toString() },
          })
          effects.set.status(status)
          return {
            ctx: layers[0].ctx,
            data: layers[0].data,
            error: error0,
            status,
            response: layers[0].response,
            redirect: undefined,
            output: layers[0].output,
            effects: effects.values,
            point,
          }
        }

        const triggerSchemaParseError = (safeParseResult: Extract<SimpleSafeParseInputResult, { success: false }>) => {
          const status = 422
          const error0 = ErrorClass.from(safeParseResult.error)
          error0.status = status
          effects.set.status(status)
          return {
            ctx: this.requiredCtx ?? {},
            data: layers[0].data,
            error: error0,
            status,
            response: layers[0].response,
            redirect: undefined,
            output: layers[0].output,
            effects: effects.values,
            point,
          }
        }

        const getParsed = () => {
          const { inputParsed, paramsParsed, searchParsed, headersParsed, cookiesParsed, bodyParsed } = layers[0]
          return {
            ...(inputParsed ? { input: inputParsed } : {}),
            ...(paramsParsed ? { params: paramsParsed } : {}),
            ...(searchParsed ? { search: searchParsed } : {}),
            ...(headersParsed ? { headers: headersParsed } : {}),
            ...(cookiesParsed ? { cookies: cookiesParsed } : {}),
            ...(bodyParsed ? { body: bodyParsed } : {}),
          }
        }

        for (const serverExecuteAction of point._serverExecuteActions) {
          switch (serverExecuteAction.type) {
            case 'pluginStart': {
              layers.unshift(getCleanLayer())
              break
            }
            case 'pluginEnd': {
              layers.shift()
              break
            }
            case 'params': {
              const safeParseResult = await this.parseInputSafeAsync(serverExecuteAction, params)
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.inputParsed = {
                  ...layer.inputParsed,
                  ...safeParseResult.data,
                }
                layer.paramsParsed = {
                  ...layer.paramsParsed,
                  ...safeParseResult.data,
                }
              })
              break
            }
            case 'search': {
              const safeParseResult = await this.parseInputSafeAsync(serverExecuteAction, search)
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.inputParsed = {
                  ...layer.inputParsed,
                  ...safeParseResult.data,
                }
                layer.searchParsed = {
                  ...layer.searchParsed,
                  ...safeParseResult.data,
                }
              })
              break
            }
            case 'headers': {
              const safeParseResult = await this.parseInputSafeAsync(serverExecuteAction, headers)
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.headersParsed = {
                  ...layer.headersParsed,
                  ...safeParseResult.data,
                }
              })
              break
            }
            case 'cookies': {
              const safeParseResult = await this.parseInputSafeAsync(serverExecuteAction, cookies)
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.cookiesParsed = {
                  ...layer.cookiesParsed,
                  ...safeParseResult.data,
                }
              })
              break
            }
            case 'body': {
              const safeParseResult = await this.parseInputSafeAsync(serverExecuteAction, body)
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.inputParsed = {
                  ...layer.inputParsed,
                  ...safeParseResult.data,
                }
                layer.bodyParsed = {
                  ...layer.bodyParsed,
                  ...safeParseResult.data,
                }
              })
              break
            }
            case 'input': {
              const safeParseResult = await this.parseInputSafeAsync(
                serverExecuteAction,
                point.type === 'action' ? search : input,
              )
              if (!safeParseResult.success) {
                return triggerSchemaParseError(safeParseResult)
              }
              layers.forEach((layer) => {
                layer.inputParsed = {
                  ...layer.inputParsed,
                  ...safeParseResult.data,
                }
              })
              if (point.type === 'action') {
                layers.forEach((layer) => {
                  layer.searchParsed = {
                    ...layer.searchParsed,
                    ...safeParseResult.data,
                  }
                })
              }
              break
            }
            case 'ctx': {
              const result = await serverExecuteAction.fn({
                ...layers[0].ctxExposed,
                ctx: { ...layers[0].ctx },
                request: this.request,
                set: effects.set,
                points: this.engine.server.points as NiceServerPoints,
                ...getParsed(),
              })
              if (RedirectTask.is(result)) {
                throw result
              }
              if (result instanceof Error) {
                throw result
              }
              const appendCtxExposedKeys = !serverExecuteAction.expose
                ? []
                : serverExecuteAction.expose === true
                  ? Object.keys(result ?? {})
                  : serverExecuteAction.expose
              layers.forEach((layer) => {
                layer.ctxExposedKeys = [...new Set([...layer.ctxExposedKeys, ...appendCtxExposedKeys])]
                layer.ctx = { ...layer.ctx, ...result }
                layer.ctxExposed = Object.fromEntries(layer.ctxExposedKeys.map((key) => [key, layer.ctx[key]]))
              })
              break
            }
            case 'loader': {
              const promise = serverExecuteAction.fn({
                ...layers[0].ctxExposed,
                ctx: { ...layers[0].ctx },
                data: { ...layers[0].data },
                request: this.request as never,
                set: effects.set,
                points: this.engine.server.points as NiceServerPoints,
                ...getParsed(),
              })
              const result = (await (promise as any)) as
                | [number, Data | Response | undefined | RedirectTask]
                | Data
                | Response
                | RedirectTask
                | undefined
              if (Array.isArray(result)) {
                if (RedirectTask.is(result[1])) {
                  throw result[1]
                }
                if (result[1] instanceof Error) {
                  throw result[1]
                }
                effects.set.status(result[0])
                if (result[1] instanceof Response) {
                  layers.forEach((layer) => {
                    layer.response = result[1]
                    layer.output = result[1]
                  })
                } else {
                  layers.forEach((layer) => {
                    layer.data = result[1] ?? {}
                    layer.output = result[1] ?? {}
                  })
                }
              } else {
                if (RedirectTask.is(result)) {
                  throw result
                }
                if (result instanceof Error) {
                  throw result
                }
                if (result instanceof Response) {
                  layers.forEach((layer) => {
                    layer.response = result
                    layer.output = result
                  })
                } else {
                  layers.forEach((layer) => {
                    layer.data = result ?? {}
                    layer.output = result ?? {}
                  })
                }
              }
              break
            }

            default:
              throw new Error(`Unknown extend function type: ${(serverExecuteAction as any).type}`)
          }
        }

        if (layers.length !== 1) {
          throw new Error(`Unexpected layers length: ${layers.length}, please report this as a bug`)
        }

        if (layers[0].response) {
          // if we have response, then we can not have data by design
          layers[0].data = undefined
        }

        return {
          ctx: layers[0].ctx,
          data: layers[0].data,
          response: layers[0].response,
          redirect: undefined,
          error: undefined,
          output: layers[0].output,
          effects: effects.values,
          point,
        }
      } catch (error) {
        const error0 = ErrorClass.from(error)
        if (error0.status) {
          effects.set.status(error0.status)
        }
        return {
          ctx: layers[0].ctx,
          data: layers[0].data,
          error: error0,
          response: error0.response ?? layers[0].response,
          redirect: error0.redirect,
          output: layers[0].output,
          effects: effects.values,
          point,
        }
      }
    })
  }

  static parseQueryKey({
    queryKey,
    transformer,
  }: {
    queryKey: OriginalQueryKey | QueryKey
    transformer: DataTransformerExtended
  }):
    | {
        isServer: boolean
        isClient: boolean
        scope: PointsScope
        pointType: ReadyPointType
        pointName: PointName
        outputType: string
        isInfiniteQuery: boolean
        input: InputRaw
        serverHash: string
      }
    | undefined {
    const obj = parseQueryKey(queryKey)
    if (!obj) {
      return undefined
    }
    const { scope, type, name, mode, finiteness, input, output, tags } = obj
    if (
      typeof mode !== 'string' ||
      typeof type !== 'string' ||
      typeof name !== 'string' ||
      typeof output !== 'string' ||
      typeof finiteness !== 'string' ||
      typeof input !== 'string' ||
      typeof scope !== 'string' ||
      !Array.isArray(tags)
    ) {
      return undefined
    }
    const isServer = mode === 'server'
    const isClient = mode === 'client'
    const isInfiniteQuery = finiteness === 'infinite'
    const serverHash =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      stringify(obj) ?? 'unknown'
    return {
      isServer,
      isClient,
      scope,
      pointType: type as ReadyPointType,
      pointName: name,
      outputType: output,
      isInfiniteQuery,
      input: transformer.parse<InputRaw>(input),
      serverHash,
    }
  }

  async handleRedirectTask({
    clientPoints,
    redirectPolicy,
  }: {
    clientPoints: ClientPoints<any>
    redirectPolicy: 'continue' | 'throw'
  }): Promise<{ redirectTask: RedirectTask; pagePoint: PagePoint | undefined; pageLocation: AnyLocation } | undefined> {
    const redirectTaskHolder = _ss.__POINT0_SSR_REDIRECT_TASK__.get()
    if (redirectTaskHolder && !redirectTaskHolder.handled) {
      redirectTaskHolder.handled = true
      const newLocation = clientPoints.routes._.getLocation(redirectTaskHolder.task.to)
      this.serverStorageState.__POINT0_CURRENT_LOCATION__ = newLocation
      this.serverStorageState.__POINT0_SSR_LOCATION__ = newLocation
      if (redirectPolicy === 'throw') {
        throw redirectTaskHolder.task
      } else {
        const toLocation = Route0.getLocation(redirectTaskHolder.task.to)
        const result = await clientPoints.loadPage({ location: toLocation })
        const pageLocation = result?.pageLocation ?? toLocation
        const pagePoint = result?.page
        return {
          redirectTask: redirectTaskHolder.task,
          pagePoint,
          pageLocation,
        }
      }
    }
    return undefined
  }

  async prefetchAppPagePointDeep({
    App,
    clientPoints,
    renderToReadableStream,
    pagePoint,
    pageLocation,
    seenQueryHashes = new Set<string>(),
    seenRedirectTo = new Map<string, number>(),
    rendersCount = 0,
    locationRendersCount = 0,
    // ssrStoresRerenderCount = 0,
    redirectPolicy,
    ssrOptions,
  }: {
    App: AppComponent
    clientPoints: ClientPoints<any>
    renderToReadableStream: typeof RenderToReadableStream
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    seenQueryHashes?: Set<string>
    seenRedirectTo?: Map<string, number>
    rendersCount?: number
    locationRendersCount?: number
    // ssrStoresRerenderCount?: number
    redirectPolicy: 'continue' | 'throw'
    ssrOptions: SsrOptionsResolved
  }): Promise<{ rendersCount: number }> {
    if (rendersCount === 0) {
      this.serverStorageState.__POINT0_CURRENT_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_SSR_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_CLIENT_POINTS__ = clientPoints
      this.serverStorageState.__POINT0_IS_SSR_IN_PROGRESS__ = true
      this.serverStorageState.__POINT0_SSR_REDIRECT_TASK__ = undefined
    }
    return await this.withServerGlobalState(async () => {
      // Apply any values staged by the PREVIOUS render pass before we render again. On the
      // server `set()` only stages a `nextValue`; reads (`get()`/`use()`) return the
      // committed value. Committing here — at the start of every pass — means this render,
      // and every query it issues, sees the latest committed store/cookie values. That is
      // what lets a query feed an SsrStore (via useEffectSsr) whose value is then the INPUT
      // of another query: once the store is committed, the dependent query is issued with
      // the real input and discovered/prefetched on this pass (in both the HTML and the
      // data-only paths). At level 0 nothing is staged yet, so this is a no-op.
      SsrStore.commitPending()
      CookieStore.commitPending()

      // Optionally warm the query client before the very first render: prefetch the
      // page and its layouts (their onPrefetch hooks + server queries, inputs derived
      // from the route) so the render finds the data in cache and needs fewer — often
      // zero — re-render passes. Opt-in; the render-to-discover loop below still
      // handles ad-hoc queries whose params are only known at render time.
      if (rendersCount === 0 && pagePoint && ssrOptions.prefetchBeforePageRender) {
        const input = {
          ...pageLocation.params,
          ...(pageLocation.searchString ? { '?': pageLocation.search } : {}),
        }
        // Call `_prefetchPage` (not the public `prefetchPage`): the latter dedupes via
        // `__POINT0_PREFETCH_PAGE_PROMISES__`, which the SSR executor intentionally
        // disables (it is a client-navigation concept). `_prefetchPage` does the actual
        // declarative prefetch — onPrefetch hooks + page/layout server queries.
        await pagePoint._prefetchPage({ input, options: { policy: 'serverQuery' } })
      }

      const stream = await renderToReadableStream(React.createElement(App))
      await stream.allReady
      const redirectTask = await this.handleRedirectTask({ clientPoints, redirectPolicy })

      if (redirectTask) {
        const redirectToKey = JSON.stringify(redirectTask.redirectTask.to)
        const redirectToSeenCount = seenRedirectTo.get(redirectToKey) ?? 0
        const shouldHandleRedirect = redirectToSeenCount < 10
        if (shouldHandleRedirect) {
          seenRedirectTo.set(redirectToKey, redirectToSeenCount + 1)
          if (pagePoint) {
            await this.addPrefetchPageDehydratedStateToQueryClient({
              pagePoint,
              pageLocation,
              redirectTask: redirectTask.redirectTask,
              ErrorClass: clientPoints.manager.root._Error,
            })
          }
          const { rendersCount: newRendersCount } = await this.prefetchAppPagePointDeep({
            App,
            renderToReadableStream,
            pagePoint: redirectTask.pagePoint,
            pageLocation: redirectTask.pageLocation,
            clientPoints,
            seenQueryHashes,
            seenRedirectTo,
            rendersCount: rendersCount + 1,
            locationRendersCount: 0,
            // ssrStoresRerenderCount,
            redirectPolicy,
            ssrOptions,
          })
          return { rendersCount: newRendersCount }
        }
      }

      const queryClientState = _ss.__POINT0_QUERY_CLIENT__.get().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
        // it is exists runtime, but types in react query is wrong
        if ((query.options as any).enabled === false) {
          return []
        }
        if (query.state.status !== 'pending') {
          return []
        }
        const parsedQueryKey = Executor.parseQueryKey({
          queryKey: query.queryKey,
          transformer: clientPoints.transformer,
        })
        if (!parsedQueryKey) {
          return []
        }
        if (seenQueryHashes.has(parsedQueryKey.serverHash)) {
          return []
        }
        if (!parsedQueryKey.isServer) {
          return []
        }
        if (parsedQueryKey.outputType !== 'data') {
          return []
        }
        seenQueryHashes.add(parsedQueryKey.serverHash)
        return parsedQueryKey
      })

      await Promise.all(
        suitableMarkers.map(async (suitableMarker) => {
          const exactPoint = this.engine.server.points.findPoint({
            scope: suitableMarker.scope,
            type: suitableMarker.pointType,
            name: suitableMarker.pointName,
          })
          const isThisPageSelfPoint = pagePoint?.point && exactPoint?.point === pagePoint.point
          const isThisPageLayoutPoint =
            !isThisPageSelfPoint &&
            pagePoint?.point &&
            pagePoint._layouts.some((layout) => layout.point === exactPoint?.point)
          const fixedInput = (() => {
            if (isThisPageSelfPoint || isThisPageLayoutPoint) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { '?': _search, ...params } = suitableMarker.input as Record<string, unknown>
              return {
                ...params,
                '?': pageLocation.search,
              } as never as InputRaw
            }
            return suitableMarker.input
          })()
          if (exactPoint) {
            // suitableMarkers are already filtered to server queries, and each point has a single
            // loader, so the prefetch resolves to the server loader automatically.
            if (suitableMarker.isInfiniteQuery) {
              await exactPoint.prefetchInfiniteQuery(fixedInput, undefined)
            } else {
              await exactPoint.prefetchQuery(fixedInput, undefined)
            }
          }
        }),
      )

      if (suitableMarkers.length > 0) {
        const { rendersCount: newRendersCount } = await this.prefetchAppPagePointDeep({
          App,
          renderToReadableStream,
          pagePoint,
          pageLocation,
          clientPoints,
          seenQueryHashes,
          seenRedirectTo,
          rendersCount: rendersCount + 1,
          locationRendersCount: locationRendersCount + 1,
          // ssrStoresRerenderCount,
          redirectPolicy,
          ssrOptions,
        })
        return { rendersCount: newRendersCount }
      }

      // No new server queries to prefetch. If a page staged an SsrStore change during
      // this render (e.g. overrode a layout default via `useEffectSsr` -> item.set()),
      // commit it and render again so ancestors pick up the new value. Two caps govern
      // this:
      //  - allowedRerendersCount (soft, default Infinity): once reached we stop quietly
      //    WITHOUT committing the staged SsrStore changes — set low (0/1) to opt out of
      //    re-rendering for performance.
      //  - forbiddenRerendersCount (hard, default 25): reaching it stops the loop, leaves
      //    the staged SsrStore changes uncommitted, AND logs an error — the safety net
      //    for non-deterministic values (e.g. Date.now()) that never stabilize.
      // Cookies drive re-renders too: on the server `get()` prefers the committed (effects)
      // value over the incoming request, so a `set()` deeper in the tree must re-render
      // ancestors that read it via `use()` (same SSR reactivity as SsrStore).
      //
      // We DON'T commit here — the commit happens at the START of the next pass (see the top
      // of this callback). We only decide whether another pass is warranted. This applies to
      // both the HTML and the data-only (queryClientDehydratedState) paths: data requests
      // must re-render too, otherwise a store-derived dependent query is never discovered.
      const ssrStoresChanged = SsrStore.hasPendingChanges()
      const cookiesChanged = CookieStore.hasPendingChanges()
      if (ssrStoresChanged || cookiesChanged) {
        const { allowedRerendersCount, forbiddenRerendersCount } = ssrOptions
        if (locationRendersCount >= forbiddenRerendersCount) {
          this.engine.log({
            level: 'error',
            category: ['ssr'],
            message: `SSR stores/cookies did not stabilize after ${forbiddenRerendersCount} re-renders (forbiddenRerendersCount); using the last render. Check for non-deterministic SsrStore or cookie values (e.g. Date.now(), Math.random()).`,
            meta: { location: pageLocation },
          })
        } else if (locationRendersCount < allowedRerendersCount) {
          const { rendersCount: newRendersCount } = await this.prefetchAppPagePointDeep({
            App,
            renderToReadableStream,
            pagePoint,
            pageLocation,
            clientPoints,
            seenQueryHashes,
            seenRedirectTo,
            rendersCount: rendersCount + 1,
            locationRendersCount: locationRendersCount + 1,
            // ssrStoresRerenderCount: ssrStoresRerenderCount + 1,
            redirectPolicy,
            ssrOptions,
          })
          return { rendersCount: newRendersCount }
        }
        // else: reached allowedRerendersCount (soft cap) — stop quietly, staged
        // SsrStore changes are intentionally left uncommitted.
      }

      // We are NOT re-rendering. Always flush staged cookies into the response — unlike
      // SsrStore, a cookie must never be dropped (a lost cookie is worse than a hydration
      // mismatch), so we commit even on the final pass.
      CookieStore.commitPending()

      if (pagePoint) {
        await this.addPrefetchPageDehydratedStateToQueryClient({
          pagePoint,
          pageLocation,
          redirectTask: undefined,
          ErrorClass: clientPoints.manager.root._Error,
        })
      }

      const finalRendersCount = rendersCount + 1
      if (!_point0_env.mode.is.production) {
        getEffects().set.headers({
          'X-Point0-Renders-Count': finalRendersCount.toString(),
        })
      }

      return { rendersCount: finalRendersCount }
    })
  }

  async getQueryClientReadyDehydratedState({
    withPagesDehydratedState,
  }: {
    withPagesDehydratedState: boolean
  }): Promise<DehydratedState> {
    const result = await this.withServerGlobalState(async () => {
      const dehydratedState = dehydrate(_ss.__POINT0_QUERY_CLIENT__.get(), {
        shouldDehydrateQuery: (_query) => {
          // This will include all queries, including failed ones
          return true
        },
      })
      return dehydratedState
    })
    result.queries = result.queries.filter((query) => query.state.status !== 'pending')
    if (withPagesDehydratedState) {
      return result
    }
    result.queries = result.queries.filter((query) => !isQueryClientDehydratedStateQuery(query))
    return result
  }

  async addPrefetchPageDehydratedStateToQueryClient({
    pagePoint,
    pageLocation,
    redirectTask,
    ErrorClass,
  }: {
    pagePoint: ReadyPoint
    pageLocation: AnyLocation
    redirectTask: RedirectTask | undefined
    ErrorClass: ClassLikeError0<ErrorPoint0>
  }): Promise<void> {
    await this.withServerGlobalState(async () => {
      const input = {
        ...pageLocation.params,
        ...(pageLocation.searchString ? { '?': pageLocation.search } : {}),
      }
      const prefetchPageQueryOptions = pagePoint._getServerQueryOptions({
        input,
        queryOptions: undefined,
        fetchOptions: undefined,
        outputType: 'queryClientDehydratedState',
      })
      const relatedQueriesDehydratedState = await this.getQueryClientReadyDehydratedState({
        withPagesDehydratedState: false,
      })
      // TODO: maybe we should filter out duplicates from different pages causes by redirects
      const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
      const { queryKey, ...restOptions } = prefetchPageQueryOptions
      queryClient.setQueryDefaults(queryKey, {
        ...(restOptions as any),
      })
      queryClient.setQueryData(queryKey, {
        dehydratedState: relatedQueriesDehydratedState,
      })
      if (redirectTask) {
        const redirectQueryKey: QueryKey = [
          'point0',
          {
            ...queryKey[1],
            output: 'queryClientDehydratedStateRedirect',
          },
        ]
        queryClient.setQueryDefaults(redirectQueryKey, {
          ...(restOptions as any),
        })
        const redirectError = new ErrorClass(`Redirect to "${redirectTask.to}"`, {
          redirect: redirectTask,
          code: 'POINT0_REDIRECT',
        })
        const redirectQuery =
          queryClient.getQueryCache().find({ queryKey: redirectQueryKey }) ||
          queryClient.getQueryCache().build(queryClient, {
            queryKey: redirectQueryKey,
            ...(restOptions as any),
          })
        redirectQuery.setState({
          status: 'error',
          fetchStatus: 'idle',
          error: redirectError,
          errorUpdatedAt: Date.now(),
        })
      }
    })
  }
}

export type ExecuteOptions<TPoint extends ReadyPoint | undefined, TErrorClass extends ClassLikeError0<ErrorPoint0>> = {
  point?: TPoint | undefined
  input: TPoint extends { Infer: { ServerInputRaw: any } } ? TPoint['Infer']['ServerInputRaw'] : InputRaw
  effects?: Effects
  ErrorClass: TErrorClass
  _known?: ExecuteOptionsKnownInput
}

export type ExecuteOptionsKnownInput = {
  input?: InputRaw
  search?: Record<string, unknown>
  params?: Record<string, unknown>
  body?: Record<string, unknown>
}
