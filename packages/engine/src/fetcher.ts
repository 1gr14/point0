import type { AnyLocation, AnyRoute, ExactLocation, KnownLocation } from '@devp0nt/route0'
import * as flat0 from '@devp0nt/flat0'
import type {
  ActionPoint,
  ClassLikeError0,
  Data,
  DataTransformerExtended,
  FetcherFetchDetailedResult,
  FetcherFetchDetailedResultGeneral,
  FetcherFetchDetailedResultNoMiddleware,
  InputRawUnknown,
  MiddlewareFn,
  MiddlewareFnOptionsBase,
  PagePoint,
  PointsScope,
  ReadyPoint,
  RequiredCtx,
  SuperStoreInternalValuesOrErrors,
} from '@point0/core'
import {
  _getSsItemsWithRestErrors,
  _point0_env,
  _ssItems,
  _ssRunWithServerStorageState,
  blankDataTransformerExtended,
  ErrorPoint0,
  generateId,
} from '@point0/core'
import { Effects } from '@point0/core/effects'
import { Request0 } from '@point0/core/request0'
import type { EngineClient } from './client.js'
import type { Engine } from './engine.js'
import type { ExecuteOptionsKnownInput } from './executor.js'
import { Executor } from './executor.js'
import type { Publicdir } from './publicdir.js'
import type { EngineServer } from './server.js'

export class Fetcher<TError extends ErrorPoint0> {
  engine: Engine<RequiredCtx, TError, true>
  server: EngineServer<true>

  private constructor({
    engine,
    server,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    server: EngineServer<true, any>
  }) {
    this.engine = engine
    this.server = server
  }

  static create<TError extends ErrorPoint0>({
    engine,
    server,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    server: EngineServer<true, TError>
  }): Fetcher<TError> {
    return new Fetcher({ engine, server })
  }

  static fetchAbsFilePathOnDevServer = async ({ request }: { request: Request0 }): Promise<Response | undefined> => {
    // if it is client bun dev server and assets was imported on ssr it returns abs file paths not bun assets, so just in dev we try to fetch them
    if (process.env.NODE_ENV === 'production') {
      return undefined
    }
    const absPath = request.location.pathname
    const bunFile = Bun.file(absPath)
    if (await bunFile.exists()) {
      return new Response(Bun.file(absPath))
    }
    return undefined
  }

  private _transformers = new Map<PointsScope, DataTransformerExtended>()
  private getTransformer = ({
    scope,
    point,
    transform,
  }: {
    scope: PointsScope
    point: ReadyPoint | undefined
    transform: boolean
  }): DataTransformerExtended => {
    if (!transform) {
      return blankDataTransformerExtended
    }
    if (point?._transformer) {
      return point._transformer
    }
    const exTransformer = this._transformers.get(scope)
    if (exTransformer) {
      return exTransformer
    }
    const transformer =
      this.server.points?.getTransformerByScope({
        scope,
      }) || blankDataTransformerExtended
    this._transformers.set(scope, transformer)
    return transformer
  }

  private readonly _getPointInputFromEndpointRequest = async ({
    request,
    location,
    point,
    transform,
  }: {
    request: Request0
    location: KnownLocation
    point: ReadyPoint | undefined
    transform: boolean
  }): Promise<InputRawUnknown> => {
    if (!point) {
      return { body: {}, search: {}, params: {}, input: {} }
    }
    const isAction = point.type === 'action'
    const isPage = point.type === 'page'
    const isLayout = point.type === 'layout'
    const shouldReadBody =
      !!point && isAction ? point._serverExecuteActions.some((action) => action.type === 'body') : !isPage && !isLayout
    const body = await (async () => {
      if (!shouldReadBody) {
        return {}
      }
      try {
        if (request.original.headers.get('Content-Type')?.includes('multipart/form-data')) {
          const formData = await request.original.formData()
          const parsed = [...formData.entries()].reduce<Record<string, unknown>>((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? (transform ? JSON.parse(value) : value) : value
            return acc
          }, {})
          const unflattened = flat0.deserialize(parsed)
          return unflattened
        }
        return await request.original.json()
      } catch {
        return {}
      }
    })()
    const bodyParsed = transform
      ? this.getTransformer({ scope: point.scope, point, transform }).deserialize(body)
      : body
    if (isAction) {
      return { body: bodyParsed, search: location.search, params: location.params, input: {} }
    }
    if (isPage || isLayout) {
      return { body: {}, search: location.search, params: location.params, input: {} }
    }
    return { body: {}, search: {}, params: {}, input: bodyParsed }
  }
  getPointInputFromEndpointRequest = async ({
    request,
    location,
    point,
    transform,
  }: {
    request: Request0
    location: KnownLocation
    point: ReadyPoint | undefined
    transform: boolean
  }): Promise<ExecuteOptionsKnownInput> => {
    if (request.state.__POINT0_RAW_KNOWN_INPUT__) {
      return request.state.__POINT0_RAW_KNOWN_INPUT__ as ExecuteOptionsKnownInput
    }
    const result = await this._getPointInputFromEndpointRequest({ request, location, point, transform })
    request.state.__POINT0_RAW_KNOWN_INPUT__ = result
    return result
  }

  // private readonly _getPointInputFormSuitablePageLocation = ({
  //   pageLocation,
  // }: {
  //   pageLocation: ExactLocation | AnyLocation
  // }): InputRawUnknown => {
  //   return { ...pageLocation.searchParams, ...pageLocation.params }
  // }
  // getPointInputFormSuitablePageLocation = ({
  //   pageLocation,
  //   request,
  // }: {
  //   pageLocation: ExactLocation | AnyLocation
  //   request: Request0
  // }): InputRawUnknown => {
  //   const result = this._getPointInputFormSuitablePageLocation({ pageLocation })
  //   request.state.__POINT0_RAW_KNOWN_INPUT__ = result
  //   return result
  // }

  prepareFetch = async ({
    originalRequest,
    bunServer,
  }: {
    originalRequest: Request
    bunServer?: Bun.Server<unknown>
  }): Promise<PrepareFetchResult<TError>> => {
    const effects = Effects.create()
    const isFromServer =
      '__POINT0_IS_SERVER_REQUEST__' in originalRequest && originalRequest.__POINT0_IS_SERVER_REQUEST__ === true
    const request = Request0.create(originalRequest, {
      bunServer: bunServer || this.server.bunServer,
      id: generateId(),
      isFromServer,
    })
    const transform = request.headers['x-point0-transform'] === 'true'
    if (request.headers['x-point0-client-request-id']) {
      effects.set.headers('x-point0-request-id', request.id)
      effects.set.headers('x-point0-client-request-id', request.headers['x-point0-client-request-id'])
    }
    try {
      const redirectToDifferentDevClientIfNotThatPort = (scope: string): Response | undefined => {
        // we keep current browser connection for pages on correct url, so we can recieve corret bun hmr updates
        if (process.env.NODE_ENV === 'production') {
          return undefined
        }
        const thatClient = this.server.clients.find((c) => c.scope === scope)
        if (!thatClient) {
          return undefined
        }

        const currentPort = Number(request.location.port)
        const currentClient = Number.isNaN(currentPort)
          ? undefined
          : this.server.clients.find((c) => c.port === currentPort)

        if (currentClient === thatClient) {
          return undefined
        }
        return new Response('Redirecting to different dev client', {
          status: 302,
          headers: {
            Location: `http://localhost:${thatClient.port}${request.location.pathname}${request.location.searchString}`,
          },
        })
      }

      if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
        for (const publicdir of this.server.publicdirs) {
          const staticResponse = await publicdir.fetch({ request })
          if (staticResponse) {
            const scope = publicdir.scope
            return {
              variant: 'publicdir',
              transform,
              scope,
              request,
              effects,
              middlewares:
                this.server.points?.middlewares.get(publicdir.scope) ??
                this.server.points?.middlewares.get(this.server.scope) ??
                [],
              middlewareOptions: {
                request,
                set: effects.set,
                point: undefined,
                scope,
                variant: 'publicdir',
              },
              publicdirResult: { publicdir, response: staticResponse },
              endpointResult: undefined,
              pageResult: undefined,
              errorResult: undefined,
              optionsResult: undefined,
              redirectResult: undefined,
            }
          }
        }
      }

      const endpoint = this.server.points?.findEndpoint({
        method: request.method,
        location: request.location,
      })

      if (endpoint) {
        const outputTypeRaw = request.headers['x-point0-output-type'] as
          | 'html'
          | 'data'
          | 'queryClientDehydratedState'
          | undefined
        const outputType =
          outputTypeRaw === 'queryClientDehydratedState'
            ? 'queryClientDehydratedState'
            : outputTypeRaw === 'html'
              ? 'html'
              : 'data'
        return {
          variant: 'endpoint',
          transform,
          scope: endpoint.point.scope,
          request,
          effects,
          middlewares: endpoint.point._middlewares,
          middlewareOptions: {
            request,
            set: effects.set,
            point: endpoint.point,
            scope: endpoint.point.scope,
            variant: 'endpoint',
          },
          publicdirResult: undefined,
          endpointResult: { location: endpoint.location, point: endpoint.point, outputType },
          pageResult: undefined,
          errorResult: undefined,
          optionsResult: undefined,
          redirectResult: undefined,
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        const responseFromAbsFilePath = await Fetcher.fetchAbsFilePathOnDevServer({ request })
        if (responseFromAbsFilePath) {
          return {
            variant: 'publicdir',
            transform,
            scope: this.engine.server.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              point: undefined,
              scope: this.engine.server.scope,
              variant: '' as never, // it is dev only thing, lets forget about it
            },
            publicdirResult: { publicdir: undefined, response: responseFromAbsFilePath },
            endpointResult: undefined,
            pageResult: undefined,
            errorResult: undefined,
            optionsResult: undefined,
            redirectResult: undefined,
          }
        }
      }

      const pageLocation = request.location

      const foundExactPage = await (async () => {
        for (const client of this.server.clients) {
          if (!client.points) {
            continue
          }
          if (!client.isServingRequest({ request })) {
            continue
          }
          const found = await client.points.loadPage({ location: pageLocation })
          if (found) {
            return {
              page: found.page,
              client,
              pageLocation: found.pageLocation,
            }
          }
        }
        return undefined
      })()
      if (foundExactPage) {
        const redirectResponse = redirectToDifferentDevClientIfNotThatPort(foundExactPage.page.scope)
        if (redirectResponse) {
          return {
            variant: 'redirect',
            transform,
            scope: foundExactPage.page.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              point: undefined,
              scope: foundExactPage.page.scope,
              variant: 'redirect',
            },
            publicdirResult: undefined,
            endpointResult: undefined,
            pageResult: undefined,
            errorResult: undefined,
            optionsResult: undefined,
            redirectResult: { response: redirectResponse },
          }
        }
        return {
          variant: 'page',
          transform,
          scope: foundExactPage.client.scope,
          request,
          effects,
          middlewares: foundExactPage.page._middlewares,
          middlewareOptions: {
            request,
            set: effects.set,
            point: foundExactPage.page,
            scope: foundExactPage.client.scope,
            variant: 'page',
          },
          publicdirResult: undefined,
          endpointResult: undefined,
          pageResult: {
            client: foundExactPage.client,
            pageLocation: foundExactPage.pageLocation,
            point: foundExactPage.page,
          },
          errorResult: undefined,
          optionsResult: undefined,
          redirectResult: undefined,
        }
      }

      const foundSuitableClient = await (async () => {
        for (const client of this.server.clients) {
          // we can not do nothing wit this client on server if it has no indexHtml
          if (!client.isServingRequest({ request })) {
            continue
          }
          if (client.isPageLocationSuitable({ pageLocation })) {
            return client
          }
        }
        return undefined
      })()

      const accept = request.headers['accept']
      const isMayBePage = !accept || accept.includes('text/html')

      if (foundSuitableClient && isMayBePage) {
        const redirectResponse = redirectToDifferentDevClientIfNotThatPort(foundSuitableClient.scope)
        if (redirectResponse) {
          return {
            variant: 'redirect',
            transform,
            scope: foundSuitableClient.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              point: undefined,
              scope: foundSuitableClient.scope,
              variant: 'redirect',
            },
            publicdirResult: undefined,
            endpointResult: undefined,
            pageResult: undefined,
            errorResult: undefined,
            optionsResult: undefined,
            redirectResult: { response: redirectResponse },
          }
        }
        return {
          variant: 'page',
          transform,
          scope: foundSuitableClient.scope,
          request,
          effects,
          middlewares: foundSuitableClient.points?.middlewares ?? [],
          middlewareOptions: {
            request,
            set: effects.set,
            point: undefined,
            scope: foundSuitableClient.scope,
            variant: 'page',
          },
          publicdirResult: undefined,
          endpointResult: undefined,
          pageResult: {
            client: foundSuitableClient,
            pageLocation,
            point: undefined,
          },
          errorResult: undefined,
          optionsResult: undefined,
          redirectResult: undefined,
        }
      }

      const toScope = request.headers['x-point0-to-scope']
      const clientByToScope = toScope ? this.server.clients.find((client) => client.scope === toScope) : undefined
      const ErrorClass =
        clientByToScope?.points?.manager.root._Error ?? this.server.points?.manager.root._Error ?? ErrorPoint0

      return {
        variant: 'error',
        transform,
        scope: this.server.scope,
        request,
        effects,
        middlewares: this.server.points?.middlewares.get(this.server.scope) ?? [],
        middlewareOptions: {
          request,
          set: effects.set,
          point: undefined,
          scope: this.server.scope,
          variant: 'error',
        },
        publicdirResult: undefined,
        endpointResult: undefined,
        pageResult: undefined,
        errorResult: new ErrorClass(`Not Found`, { status: 404 }),
        optionsResult: undefined,
        redirectResult: undefined,
      }
    } catch (error) {
      const ErrorClass = this.server.points?.manager.root._Error ?? ErrorPoint0
      const error0 = ErrorClass.from(error)
      return {
        variant: 'error',
        transform,
        scope: this.server.scope,
        request,
        effects,
        middlewares: this.server.points?.middlewares.get(this.server.scope) ?? [],
        middlewareOptions: {
          request,
          set: effects.set,
          point: undefined,
          scope: this.server.scope,
          variant: 'error',
        },
        publicdirResult: undefined,
        endpointResult: undefined,
        pageResult: undefined,
        errorResult: error0,
        optionsResult: undefined,
        redirectResult: undefined,
      }
    }
  }

  private readonly fetchEndpoint = async ({
    point,
    transform,
    location,
    request,
    requiredCtx,
    effects,
    serverStorageState,
    outputType,
  }: {
    point: ReadyPoint
    transform: boolean
    location: KnownLocation
    request: Request0
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
    outputType: 'html' | 'data' | 'queryClientDehydratedState'
  }): Promise<FetcherFetchEndpointResult> => {
    const client = this.server.clients.find((client) => client.scope === point.scope)
    const partialResult = {
      request,
      scope: point.scope,
      point,
      client,
      variant: 'endpoint' as const,
      data: undefined,
      error: undefined,
    }
    const transformer = this.getTransformer({ scope: point.scope, point, transform })
    const ErrorClass = client?.points?.manager.root._Error ?? this.server.points?.manager.root._Error ?? ErrorPoint0

    try {
      const input = await this.getPointInputFromEndpointRequest({ request, location, point, transform })
      if (outputType === 'html') {
        if (point.type !== 'page') {
          throw new ErrorClass(`Point type "${point.type}" is not supported for html output type`)
        }
        if (!client) {
          throw new ErrorClass(`Client for scope "${point.scope}" not found while requested page html via endpoint`)
        }
        const route = point.route as AnyRoute | undefined
        if (!route) {
          throw new ErrorClass(`Point "${point.toString()}" has no route while requested page html via task`)
        }
        const pageLocation = route.getLocation(route.get({ ...input.params, '?': input.search } as never))
        const result = await this.fetchPage({
          client,
          point: point as PagePoint | undefined,
          pageLocation: pageLocation as ExactLocation | AnyLocation,
          request,
          effects,
          serverStorageState,
          requiredCtx,
          transform,
        })
        return {
          ...partialResult,
          ...result,
          point,
        }
      }

      const executor = await Executor.create({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })

      if (outputType === 'queryClientDehydratedState') {
        if (point.type !== 'page') {
          throw new ErrorClass(`Point type "${point.type}" is not supported for queryClientDehydratedState output type`)
        }
        if (!client) {
          throw new ErrorClass(`Client for scope "${point.scope}" not found while requested page html via endpoint`)
        }
        const route = point.route as AnyRoute | undefined
        if (!route) {
          throw new ErrorClass(`Point "${point.toString()}" has no route while requested page html via endpoint`)
        }
        const pageLocation = route.getLocation(route.get({ ...input.params, '?': input.search } as never))
        await client.prefetchAppPagePointDeep({
          executor,
          pagePoint: point as PagePoint,
          pageLocation: pageLocation as ExactLocation | AnyLocation,
        })
        const dehydratedState = await executor.getQueryClientReadyDehydratedState()
        dehydratedState.queries = dehydratedState.queries.filter(
          (query) => query.queryKey.at(-1) !== 'queryClientDehydratedState',
        )
        const response = new Response(transformer.stringify({ dehydratedState }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
        return {
          ...partialResult,
          response,
          data: { dehydratedState },
        }
      }

      const executeResult = await executor.execute({
        point,
        input: null as never,
        _known: input,
        effects: executor.effects, // here we pass executor effects, becouse we want to apply status and effects to it
        ErrorClass,
      })

      if (executeResult.error) {
        const response = this.toJsonErrorResponse({
          ErrorClass,
          error: executeResult.error,
          // status: executeResult.effects.status >=  ?? 500,
          status:
            executeResult.error.status ??
            (!executeResult.effects.status ||
            (executeResult.effects.status >= 200 && executeResult.effects.status < 400)
              ? undefined
              : executeResult.effects.status),
          transformer,
        })
        return {
          ...partialResult,
          response,
          error: executeResult.error,
        }
      }

      if (executeResult.output instanceof Response) {
        if (request.headers['x-point0-client-request-id']) {
          executeResult.output.headers.set('X-Point0-Not-Json-Data', 'true')
        }
        return {
          ...partialResult,
          response: executeResult.output,
        }
      }

      if (!executeResult.output) {
        const error = new ErrorClass('No output')
        const response = this.toJsonErrorResponse({
          ErrorClass,
          error,
          status: 404,
          transformer,
        })
        return {
          ...partialResult,
          response,
          error,
        }
      }

      // else we try to get endpoint json
      const response = new Response(transformer.stringify(executeResult.output), {
        headers: { 'Content-Type': 'application/json' },
        status: executeResult.effects.status ?? 200,
      })
      return {
        ...partialResult,
        response,
        data: executeResult.output,
      }
    } catch (error) {
      const error0 = ErrorClass.from(error)
      const response = this.toJsonErrorResponse({
        ErrorClass,
        error: error0,
        status: 500,
        transformer,
      })
      return {
        ...partialResult,
        response,
        error: error0,
      }
    }
  }

  private readonly fetchPage = async ({
    transform,
    client,
    point,
    pageLocation,
    request,
    requiredCtx,
    effects,
    serverStorageState,
  }: {
    transform: boolean
    client: EngineClient<true>
    point: PagePoint | undefined
    pageLocation: AnyLocation | ExactLocation
    request: Request0
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchPageResult> => {
    const partialResult = {
      client,
      pageLocation,
      request,
      scope: client.scope,
      point,
      variant: 'page' as const,
      data: undefined,
      error: undefined,
    }
    const ErrorClass = client.points?.manager.root._Error ?? this.server.points?.manager.root._Error ?? ErrorPoint0

    try {
      // TODO: lets provide here wrapResponse and wrapRequest and call it
      // TODO: also there on error fo input not throw it but return as error

      const executor = await Executor.create<RequiredCtx, any>({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })

      if (client.ssr) {
        try {
          const readableStream = await client.renderAsReadableStream({
            executor,
            pagePoint: point,
            pageLocation,
          })
          const response = new Response(readableStream, {
            headers: { 'Content-Type': 'text/html' },
          })
          return {
            ...partialResult,
            response,
          }
        } catch (error) {
          // in case if entry provided in index.html is not correct, we fallback to original index.html with provided bun error
          if (error instanceof Error && error.message.includes('<!-- __Target__ --> not found')) {
            const indexHtml = await client.getOriginalIndexHtmlWithEnvs(request.original.url)
            const response = new Response(indexHtml, {
              headers: { 'Content-Type': 'text/html' },
              status: 500,
            })
            // const ErrorClass =
            //   client.points?.manager.root._Error ?? this.server.points?.manager.root._Error ?? ErrorPoint0
            const error0 = ErrorClass.from(error)
            return {
              ...partialResult,
              response,
              error: error0,
            }
          }
          throw error
        }
      } else if (client.indexHtml) {
        const indexHtml = await client.getOriginalIndexHtmlWithEnvs(request.original.url)
        const response = new Response(indexHtml, {
          headers: { 'Content-Type': 'text/html' },
          status: !point && client.points ? 404 : 200,
        })
        return {
          ...partialResult,
          response,
        }
      } else {
        throw new ErrorClass(`Client "${client.scope}" has no indexHtml`)
      }
    } catch (error) {
      // const ErrorClass = client.points?.manager.root._Error ?? this.server.points?.manager.root._Error ?? ErrorPoint0
      const error0 = ErrorClass.from(error)
      const transformer = this.getTransformer({ scope: client.scope, point, transform })
      const response = this.toJsonErrorResponse({
        ErrorClass,
        error: error0,
        status: 500,
        transformer,
      })
      return {
        ...partialResult,
        response,
        error: error0,
      }
    }
  }

  private async _composeMiddlewares({
    middlewares,
    finalHandler,
    baseOptions,
    transform,
  }: {
    middlewares: MiddlewareFn<any>[]
    finalHandler: () => Promise<FetcherFetchDetailedResultNoMiddleware<any>>
    baseOptions: MiddlewareFnOptionsBase<any>
    transform: boolean
  }): Promise<FetcherFetchDetailedResult<any>> {
    let index = -1
    let isMiddleware = true as boolean

    async function dispatch(i: number): Promise<Response | FetcherFetchDetailedResult<any>> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      if (i === middlewares.length) {
        isMiddleware = false
        return await finalHandler()
        // // eslint-disable-next-line @typescript-eslint/only-throw-error
        // throw finishSymbol
      }

      const mw = middlewares.at(i)

      if (!mw) {
        throw new Error('Middleware is undefined')
      }

      return await mw({
        ...baseOptions,
        next: async () => {
          const result = await dispatch(i + 1)
          if (result instanceof Response) {
            return {
              request: baseOptions.request,
              scope: baseOptions.scope,
              response: result,
              variant: 'middleware',
              error: undefined,
            }
          }
          return result
        },
      })
    }

    try {
      const result = await dispatch(0)
      if (result instanceof Response) {
        return {
          request: baseOptions.request,
          scope: baseOptions.scope,
          response: result,
          variant: 'middleware',
          error: undefined,
        }
      }
      return result
    } catch (error) {
      const ErrorClass = this.server.points?.manager.root._Error ?? ErrorPoint0
      const error0 = ErrorClass.from(error)
      const transformer = this.getTransformer({
        scope: baseOptions.scope,
        point: undefined,
        transform,
      })
      return {
        request: baseOptions.request,
        scope: baseOptions.scope,
        response: this.toJsonErrorResponse({
          ErrorClass,
          error: error0,
          status: 500,
          transformer,
        }),
        variant: isMiddleware ? 'middleware' : 'error',
        error: error0,
      }
    }
  }

  private async _fetchDetailed({
    requiredCtx,
    prepareFetchResult,
    serverStorageState,
  }: {
    requiredCtx: RequiredCtx
    prepareFetchResult: PrepareFetchResult<TError>
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchDetailedResultNoMiddleware<TError>> {
    try {
      if (prepareFetchResult.publicdirResult) {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: prepareFetchResult.publicdirResult.response,
          variant: 'publicdir',
          error: undefined,
        }
      }

      if (prepareFetchResult.endpointResult) {
        const fetchEndpointResult = await this.fetchEndpoint({
          point: prepareFetchResult.endpointResult.point,
          location: prepareFetchResult.endpointResult.location,
          request: prepareFetchResult.request,
          requiredCtx,
          effects: prepareFetchResult.effects,
          serverStorageState,
          transform: prepareFetchResult.transform,
          outputType: prepareFetchResult.endpointResult.outputType,
        })
        return {
          ...fetchEndpointResult,
          variant: 'endpoint',
        }
      }

      if (prepareFetchResult.request.original.method === 'OPTIONS') {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: new Response(null, { status: 204 }),
          variant: 'options',
          error: undefined,
        }
      }

      if (prepareFetchResult.errorResult) {
        const ErrorClass = this.server.points?.manager.root._Error ?? ErrorPoint0
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: this.toJsonErrorResponse({
            ErrorClass,
            error: prepareFetchResult.errorResult,
            transformer: this.getTransformer({
              scope: prepareFetchResult.scope,
              point: undefined,
              transform: prepareFetchResult.transform,
            }),
          }),
          variant: 'error',
          error: prepareFetchResult.errorResult,
        }
      }

      // if (prepareFetchResult.actionPointResult) {
      //   const error = new Error0(`Not Implemented`, { httpStatus: 501 })
      //   return {
      //     request: prepareFetchResult.request,
      //     scope: prepareFetchResult.scope,
      //     response: toJsonErrorResponse(error),
      //     variant: 'unknown',
      //     error,
      //   }
      // }

      if (prepareFetchResult.pageResult) {
        const fetchPagePointResult = await this.fetchPage({
          client: prepareFetchResult.pageResult.client,
          point: prepareFetchResult.pageResult.point,
          pageLocation: prepareFetchResult.pageResult.pageLocation,
          request: prepareFetchResult.request,
          requiredCtx,
          effects: prepareFetchResult.effects,
          serverStorageState,
          transform: prepareFetchResult.transform,
        })
        return {
          ...fetchPagePointResult,
          variant: 'page',
        }
      }

      if (prepareFetchResult.redirectResult) {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: prepareFetchResult.redirectResult.response,
          variant: 'redirect',
          error: undefined,
        }
      }

      const ErrorClass = (this.server.points?.manager.root._Error ?? ErrorPoint0) as ClassLikeError0<TError>
      const error = new ErrorClass(`Critical Error: Not Found`, { status: 404 })
      return {
        request: prepareFetchResult.request,
        scope: prepareFetchResult.scope,
        response: this.toJsonErrorResponse({
          ErrorClass,
          error,
          status: 404,
          transformer: this.getTransformer({
            scope: prepareFetchResult.scope,
            point: undefined,
            transform: prepareFetchResult.transform,
          }),
        }),
        variant: 'error',
        error,
      }
    } catch (error) {
      const ErrorClass = (this.server.points?.manager.root._Error ?? ErrorPoint0) as ClassLikeError0<TError>
      const error0 = ErrorClass.from(error)
      return {
        request: prepareFetchResult.request,
        scope: prepareFetchResult.scope,
        response: this.toJsonErrorResponse({
          ErrorClass,
          error: error0,
          transformer: this.getTransformer({
            scope: prepareFetchResult.scope,
            point: undefined,
            transform: prepareFetchResult.transform,
          }),
        }),
        variant: 'error',
        error: error0,
      }
    }
  }

  async fetchDetailed({
    request,
    requiredCtx,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    bunServer?: Bun.Server<unknown>
  }): Promise<FetcherFetchDetailedResult<TError>> {
    if (!_point0_env.mode.is.production) {
      // Keep it. Vite server updates will not work for points without it.
      await this.server.readServerPoints()
    }
    const prepareFetchResult = await this.prepareFetch({
      originalRequest: request,
      bunServer,
    })
    const _eventData = {
      request: prepareFetchResult.request,
      scope: prepareFetchResult.scope,
      variant: prepareFetchResult.middlewareOptions.variant,
      point: prepareFetchResult.middlewareOptions.point,
      error: undefined,
    }
    // const emit =
    //   prepareFetchResult.middlewareOptions.point?.point._emit.bind(prepareFetchResult.middlewareOptions.point.point) ??
    //   this.server.points?.roots
    //     .get(prepareFetchResult.scope)
    //     ?._emit.bind(this.server.points.roots.get(prepareFetchResult.scope)) ??
    //   this.server.points?._emit.bind(this.server.points)
    const emit = this.engine.getEmit({
      point: prepareFetchResult.middlewareOptions.point,
      scope: prepareFetchResult.scope,
    })

    const serverStorageState = _getSsItemsWithRestErrors(
      {
        __POINT0_FAKE_CLIENT__: undefined,
        __POINT0_REQUEST0__: prepareFetchResult.request,
        __POINT0_EFFECTS__: prepareFetchResult.effects,
        // in case of recursive server response we want preserve query client to keep state
        __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: _ssItems.__POINT0_QUERY_CLIENT__.getWeak(),
      },
      'Not exists in middleware call, this value accessible only in loader, ctx, components etc',
    )

    const middlewares = prepareFetchResult.middlewares
    const middlewareOptions = prepareFetchResult.middlewareOptions

    return await _ssRunWithServerStorageState(serverStorageState, async () => {
      emit?.('engineFetchStart', _eventData)
      try {
        const result = await this._composeMiddlewares({
          middlewares,
          finalHandler: async () =>
            await this._fetchDetailed({
              requiredCtx,
              prepareFetchResult,
              serverStorageState,
            }),
          baseOptions: middlewareOptions,
          transform: prepareFetchResult.transform,
        })
        const response = prepareFetchResult.effects.apply(result.response)
        const finalResult = {
          ...result,
          response,
        } as FetcherFetchDetailedResult<TError>
        const error = result.error
        emit?.('engineFetchSettled', { ..._eventData, error, result: finalResult })
        if (error) {
          emit?.('engineFetchError', { ..._eventData, error, result: finalResult })
        } else {
          emit?.('engineFetchSuccess', { ..._eventData, error: undefined, result: finalResult })
        }
        return finalResult
      } catch (error) {
        const ErrorClass = (this.server.points?.manager.root._Error ?? ErrorPoint0) as ClassLikeError0<TError>
        const error0 = ErrorClass.from(error)
        const finalResult = {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: this.toJsonErrorResponse({
            ErrorClass,
            error: error0,
            transformer: this.getTransformer({
              scope: prepareFetchResult.scope,
              point: undefined,
              transform: prepareFetchResult.transform,
            }),
          }),
          variant: 'error' as const,
          error: error0,
        }
        emit?.('engineFetchSettled', { ..._eventData, error: error0, result: finalResult })
        emit?.('engineFetchError', { ..._eventData, error: error0, result: finalResult })
        return finalResult
      }
    })
  }

  async fetch({
    request,
    requiredCtx,
    bunServer,
  }: {
    request: Request
    requiredCtx: RequiredCtx
    bunServer?: Bun.Server<unknown>
  }): Promise<Response | undefined> {
    const fetchDetailedResult = await this.fetchDetailed({ request, requiredCtx, bunServer })
    return fetchDetailedResult.response
  }

  toJsonErrorResponse = ({
    ErrorClass,
    error,
    status,
    transformer,
  }: {
    ErrorClass: ClassLikeError0
    error: unknown
    status?: number
    transformer: DataTransformerExtended | false
  }) => {
    try {
      const error0 = ErrorClass.from(error)
      status = status ?? error0.status ?? 500
      if (error0.status !== status) {
        error0.status = status
      }
      const serialized = ErrorClass.serialize(error0)
      const stringified = transformer ? transformer.stringify(serialized) : JSON.stringify(serialized)
      if (!stringified) {
        throw new ErrorClass('Failed to stringify error', { cause: error0 })
      }
      return new Response(stringified, {
        headers: { 'Content-Type': 'application/json' },
        status,
      })
    } catch (e) {
      this.server.logger({
        level: 'error',
        message: 'Error serialization failed',
        error: e,
        category: ['server'],
      })
      return new Response(JSON.stringify({ message: 'Error serialization failed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      })
    }
  }
}

type PrepareFetchResult<TError extends ErrorPoint0> =
  | {
      variant: 'publicdir'
      transform: boolean
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn<any>[]
      middlewareOptions: MiddlewareFnOptionsBase<any>
      publicdirResult: { publicdir: Publicdir<true> | undefined; response: Response } // in case if it is bun dev server try to fetch abs path
      endpointResult: undefined
      pageResult: undefined
      errorResult: undefined
      optionsResult: undefined
      redirectResult: undefined
    }
  | {
      variant: 'endpoint'
      transform: boolean
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn<any>[]
      middlewareOptions: MiddlewareFnOptionsBase<any>
      publicdirResult: undefined
      endpointResult: {
        location: KnownLocation
        // params: Record<string, unknown> | undefined
        // search: Record<string, unknown> | undefined
        // body: unknown | undefined
        // input: InputRawUnknown | undefined
        point: ActionPoint
        outputType: 'html' | 'data' | 'queryClientDehydratedState'
        // outputType: undefined | 'queryClientDehydratedState'
      }
      pageResult: undefined
      errorResult: undefined
      optionsResult: undefined
      redirectResult: undefined
    }
  | {
      variant: 'page'
      transform: boolean
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn<any>[]
      middlewareOptions: MiddlewareFnOptionsBase<any>
      publicdirResult: undefined
      endpointResult: undefined
      pageResult: {
        pageLocation: ExactLocation | AnyLocation
        point: PagePoint | undefined
        client: EngineClient<true>
      }
      errorResult: undefined
      optionsResult: undefined
      redirectResult: undefined
    }
  | {
      variant: 'redirect'
      transform: boolean
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn<any>[]
      middlewareOptions: MiddlewareFnOptionsBase<any>
      publicdirResult: undefined
      endpointResult: undefined
      pageResult: undefined
      errorResult: undefined
      optionsResult: undefined
      redirectResult: { response: Response }
    }
  | {
      variant: 'error'
      transform: boolean
      scope: PointsScope
      request: Request0
      effects: Effects
      middlewares: MiddlewareFn<any>[]
      middlewareOptions: MiddlewareFnOptionsBase<any>
      publicdirResult: undefined
      endpointResult: undefined
      pageResult: undefined
      errorResult: TError
      optionsResult: undefined
      redirectResult: undefined
    }

type FetcherFetchPageResult = FetcherFetchDetailedResultGeneral<any> & {
  response: Response
  point: ReadyPoint | undefined
  pageLocation: AnyLocation
  client: EngineClient<true>
}
type FetcherFetchEndpointResult = FetcherFetchDetailedResultGeneral<any> & {
  response: Response
  point: ReadyPoint
  client: EngineClient<true> | undefined
  data: Data | undefined
}
