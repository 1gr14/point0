import * as flat0 from '@devp0nt/flat0'
import { Route0, type AnyLocation, type AnyRoute } from '@devp0nt/route0'
import { _ss, _ssRunWithServerStorageState, isQueryClientDehydratedStateQuery } from '@point0/core'
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
import { Effects } from '@point0/core/effects'
import { RedirectTask } from '@point0/core/navigation'
import type { Request0 } from '@point0/core/request0'
import { dehydrate } from '@tanstack/react-query'
import type { DehydratedState, QueryKey as OriginalQueryKey } from '@tanstack/react-query'
import { createHead } from '@unhead/react/server'
import * as React from 'react'
import type { renderToReadableStream as RenderToReadableStream } from 'react-dom/server'
import { stringify } from 'safe-stable-stringify'
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
    // serverExecuteActionsWithOutput,
    serverStorageState,
    effects,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    request: Request0<any, TError>
    requiredCtx: TRequiredCtx
    // serverExecuteActionsWithOutput: Array<ServerExecuteActionWithOutput<any>>
    serverStorageState: SuperStoreInternalValues
    effects: Effects
  }) {
    this.engine = engine
    this.request = request
    this.effects = effects
    this.requiredCtx = requiredCtx
    // this.serverExecuteActionsWithOutput = serverExecuteActionsWithOutput
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
      __POINT0_HYDRATION_FINISHED__: false,
      __POINT0_FAKE_CLIENT__: undefined,
      __POINT0_FETCH_FN__: engine.fetch.bind(engine),
      __POINT0_REQUEST0__: request,
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
      // __POINT0_NAVIGATION_CONTEXT__: new Error('Navigation context will exists only on ssr phase') as never,
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
      // serverExecuteActionsWithOutput: [],
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

  // async execute<
  //   TPoint extends NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>,
  // >(
  //   point: TPoint,
  //   ...args: TPoint['Infer']['IsServerInputOptional'] extends true
  //     ? [input?: TPoint['Infer']['ServerInputRaw'], effects?: Effects]
  //     : [input: TPoint['Infer']['ServerInputRaw'], effects?: Effects]
  // ): Promise<
  //   ServerExecuteResult<TPoint['Infer']['Ctx'], TPoint['Infer']['ServerLoaderOutput'], TPoint['Infer']['Error']>
  // >
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
      // TPoint extends NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
      //   ? TPoint['Infer']['Error']
      //   : unknown
      IfAnyThenElse<InstanceType<TErrorClass>, ErrorPoint0, InstanceType<TErrorClass>>
    >
  >
  async execute(
    ...args: [options: ExecuteOptions<any, ClassLikeError0<ErrorPoint0>>]
    // | [
    //     point:
    //       | ReadyPoint
    //       | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
    //       | undefined,
    //     input?: InputRaw,
    //     effects?: Effects,
    //   ]
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
      // if (args[0] === undefined || 'Infer' in args[0]) {
      //   // so it is NiceReadyPoint provided like first argument
      //   return { point: args[0]?.point, input: args[1] as InputRaw, effects: args[2] }
      // }
      // so it is ReadyPoint provided in object
      return {
        point: args[0].point,
        inputProvided: args[0].input,
        _known: args[0]._known,
        effects: args[0].effects,
        ErrorClass: args[0].ErrorClass,
      }
    })()
    // const search = (point?.type === 'action' ? (input.search) : undefined) as Record<string, unknown>
    // const params = (point?.type === 'action' ? (input.params) : undefined) as Record<string, unknown>
    // const body = (point?.type === 'action' ? (input.body) : undefined) as Record<string, unknown>
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
        data: UnknownData | UndefinedData
        response: Response | undefined
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
          const error0 = new ErrorClass(`Point Not Found`, { status })
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
          const error0 = new ErrorClass(`Point "${point.toString()}" has no server loader`, { status })
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
              // const ex = this.serverExecuteActionsWithOutput.find(
              //   (e) => e.record.unstableId === serverExecuteAction.unstableId && e.record.type === 'ctx',
              // ) as ServerExecuteActionWithOutput<'ctx'> | undefined
              // if (ex) {
              //   if (Array.isArray(ex.output)) {
              //     const appendCtxExposedKeys =
              //       ex.output.length > 1 ? (ex.output.slice(1) as string[]) : Object.keys(ex.output[0])
              //     currentCtxExposedKeys = [...new Set([...currentCtxExposedKeys, ...appendCtxExposedKeys])]
              //     currentCtx = { ...currentCtx, ...ex.output[0] }
              //     // eslint-disable-next-line @typescript-eslint/no-loop-func
              //     currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              //   } else {
              //     currentCtx = { ...currentCtx, ...ex.output }
              //     // eslint-disable-next-line @typescript-eslint/no-loop-func
              //     currentCtxExposed = Object.fromEntries(currentCtxExposedKeys.map((key) => [key, currentCtx[key]]))
              //   }
              // } else {
              const result = await serverExecuteAction.fn({
                ...layers[0].ctxExposed,
                ctx: { ...layers[0].ctx },
                // execute: (
                //   point:
                //     | ReadyPoint
                //     | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
                //     | undefined,
                //   input?: InputRaw,
                // ) => {
                //   return this.execute({ point, input, ErrorClass })
                // },
                request: this.request,
                set: effects.set,
                // point,
                ...getParsed(),
              })
              if (result instanceof RedirectTask) {
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
              // } else {
              //   layers.forEach((layer) => {
              //     layer.ctx = { ...layer.ctx, ...result }
              //     layer.ctxExposed = Object.fromEntries(layer.ctxExposedKeys.map((key) => [key, layer.ctx[key]]))
              //   })
              // }
              // this.serverExecuteActionsWithOutput.push({
              //   output: result,
              //   record: serverExecuteAction,
              // })
              // }
              break
            }
            case 'loader': {
              // const ex = this.serverExecuteActionsWithOutput.find(
              //   (e) => e.record.unstableId === serverExecuteAction.unstableId && e.record.type === 'loader',
              // ) as ServerExecuteActionWithOutput<'loader'> | undefined
              // if (ex) {
              //   if (Array.isArray(ex.output)) {
              //     this.effects.set.status(ex.output[0])
              //     if (ex.output[1] instanceof Response) {
              //       currentResponse = ex.output[1]
              //       currentOutput = ex.output[1]
              //     } else {
              //       currentData = ex.output[1]
              //       currentOutput = ex.output[1]
              //     }
              //   } else {
              //     if (ex.output instanceof Response) {
              //       currentResponse = ex.output
              //       currentOutput = ex.output
              //     } else {
              //       currentData = ex.output
              //       currentOutput = ex.output
              //     }
              //   }
              // } else {
              const promise = serverExecuteAction.fn({
                ...layers[0].ctxExposed,
                ctx: { ...layers[0].ctx },
                data: { ...layers[0].data },
                // execute: (
                //   point:
                //     | ReadyPoint
                //     | NiceReadyPoint<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>
                //     | undefined,
                //   input?: InputRaw,
                // ) => {
                //   return this.execute({ point, input, ErrorClass })
                // },
                request: this.request as never,
                set: effects.set,
                // point,
                ...getParsed(),
              })
              const result = (await (promise as any)) as
                | [number, Data | Response | undefined | RedirectTask]
                | Data
                | Response
                | RedirectTask
                | undefined
              if (Array.isArray(result)) {
                if (result[1] instanceof RedirectTask) {
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
                if (result instanceof RedirectTask) {
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
              // this.serverExecuteActionsWithOutput.push({
              //   output: result,
              //   record: serverExecuteAction,
              // })
              // }
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
          response: layers[0].response,
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
        isCombined: boolean
        scope: PointsScope
        pointType: ReadyPointType
        pointName: PointName
        outputType: string
        isInfiniteQuery: boolean
        input: InputRaw
        serverHash: string
      }
    | undefined {
    const [check, scope, pointType, pointName, serverOrClient, finiteOrInfinite, inputStringified, outputType] =
      queryKey
    if (
      check !== 'point0' ||
      typeof serverOrClient !== 'string' ||
      typeof pointType !== 'string' ||
      typeof pointName !== 'string' ||
      typeof outputType !== 'string' ||
      typeof finiteOrInfinite !== 'string' ||
      typeof inputStringified !== 'string' ||
      typeof scope !== 'string'
    ) {
      return undefined
    }
    const isServer = serverOrClient === 'server' || serverOrClient === 'combined'
    const isClient = serverOrClient === 'client' || serverOrClient === 'combined'
    const isCombined = serverOrClient === 'combined'
    const isInfiniteQuery = finiteOrInfinite === 'infinite'
    const serverHash =
      stringify({
        isServer,
        scope,
        pointType,
        pointName,
        outputType,
        isInfiniteQuery,
        inputStringified,
      }) ?? 'unknown'
    return {
      isServer,
      isClient,
      isCombined,
      scope,
      pointType: pointType as ReadyPointType,
      pointName,
      outputType,
      isInfiniteQuery,
      input: transformer.parse<InputRaw>(inputStringified),
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
    level = 0,
    redirectPolicy,
  }: {
    App: AppComponent
    clientPoints: ClientPoints<any>
    renderToReadableStream: typeof RenderToReadableStream
    pagePoint: PagePoint | undefined
    pageLocation: AnyLocation
    seenQueryHashes?: Set<string>
    seenRedirectTo?: Map<string, number>
    level?: number
    redirectPolicy: 'continue' | 'throw'
  }): Promise<void> {
    if (level === 0) {
      this.serverStorageState.__POINT0_CURRENT_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_SSR_LOCATION__ = pageLocation
      this.serverStorageState.__POINT0_CLIENT_POINTS__ = clientPoints
      this.serverStorageState.__POINT0_IS_SSR_IN_PROGRESS__ = true
      this.serverStorageState.__POINT0_SSR_REDIRECT_TASK__ = undefined
    }
    await this.withServerGlobalState(async () => {
      // console.dir(await this.getQueryClientReadyDehydratedState({ withPagesDehydratedState: false }), { depth: null })
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
          await this.prefetchAppPagePointDeep({
            App,
            renderToReadableStream,
            pagePoint: redirectTask.pagePoint,
            pageLocation: redirectTask.pageLocation,
            clientPoints,
            seenQueryHashes,
            seenRedirectTo,
            level: level + 1,
            redirectPolicy,
          })
          return
        }
      }

      const queryClientState = _ss.__POINT0_QUERY_CLIENT__.get().getQueryCache().findAll()
      const suitableMarkers = queryClientState.flatMap((query) => {
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
          // for (const suitableMarker of suitableMarkers) {
          const exactPoint = this.engine.server.points?.findExact({
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
            if (suitableMarker.isInfiniteQuery) {
              await exactPoint.prefetchInfiniteQuery(fixedInput, undefined, { force: true, mode: 'server' })
            } else {
              await exactPoint.prefetchQuery(fixedInput, undefined, { force: true, mode: 'server' })
            }
          }
          // }
        }),
      )

      if (suitableMarkers.length > 0) {
        await this.prefetchAppPagePointDeep({
          App,
          renderToReadableStream,
          pagePoint,
          pageLocation,
          clientPoints,
          seenQueryHashes,
          seenRedirectTo,
          level: level + 1,
          redirectPolicy,
        })
      } else {
        if (pagePoint) {
          await this.addPrefetchPageDehydratedStateToQueryClient({
            pagePoint,
            pageLocation,
            redirectTask: undefined,
            ErrorClass: clientPoints.manager.root._Error,
          })
        }
      }
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
      // do not uncomment it. If page itself has no loaders, it does not mean, that it not has any components which has loaders
      // if (!pagePoint._hasLoader()) {
      //   return
      // }
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
      // TODO: filter out duplicates from different pages causes by redirects
      const queryClient = _ss.__POINT0_QUERY_CLIENT__.get()
      const { queryKey, ...restOptions } = prefetchPageQueryOptions
      queryClient.setQueryDefaults(queryKey, {
        ...(restOptions as any),
      })
      queryClient.setQueryData(queryKey, {
        dehydratedState: relatedQueriesDehydratedState,
      })
      if (redirectTask) {
        // replace last element with 'queryClientDehydratedStateRedirect'
        const redirectQueryKey = queryKey.slice(0, -1).concat('queryClientDehydratedStateRedirect')
        queryClient.setQueryDefaults(redirectQueryKey, {
          ...(restOptions as any),
        })
        const redirectError = new ErrorClass(`Redirect to "${redirectTask.to}"`, {
          redirect: redirectTask,
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
