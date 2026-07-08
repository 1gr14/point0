import * as flat from '@1gr14/flat'
import nodePath from 'node:path'
import { Route0, type AnyLocation, type AnyRoute, type ExactLocation, type KnownLocation } from '@1gr14/route0'
import { ASSET_URL_PREFIX, assetNameRegex, resolveAssetsCacheDir } from '@point0/compiler'
import {
  POINT0_ERROR_CODES_MAP,
  POINT0_QUERY_GET_INPUT_SEARCH_PARAM,
  _getSsItemsWithRestErrors,
  _point0_env,
  _ss,
  _ssRunWithServerStorageState,
  blankDataTransformerExtended,
  generateId,
  POINT0_STREAM_HEADER,
  RscHoleRegistry,
  serializeErrorsInDehydratedState,
  wrapTransformerWithRsc,
} from '@point0/core'
import type {
  AnyPoint,
  ClassLikeError0,
  Data,
  DataTransformerExtended,
  ErrorPoint0,
  EventerEmitFn,
  FetcherFetchDetailedResult,
  FetcherFetchDetailedResultError,
  FetcherFetchDetailedResultGeneral,
  FetcherFetchDetailedResultMiddleware,
  FetcherFetchDetailedResultNoMiddleware,
  InputRawUnknown,
  MiddlewareFn,
  MiddlewareFnOptionsBase,
  NiceServerPoints,
  PagePoint,
  PointsScope,
  ReadyPoint,
  RequiredCtx,
  SuperStoreInternalValuesOrErrors,
} from '@point0/core'
import { Effects } from '@point0/core/effects'
import { buildClientBuildHeaderValue, POINT0_CLIENT_BUILD_HEADER, RedirectTask } from '@point0/core/navigation'
import { Request0 } from '@point0/core/request0'
import type {
  RequestVariantAsset,
  RequestVariantEndpoint,
  RequestVariantError,
  RequestVariantPage,
  RequestVariantPublicdir,
  RequestVariantUnknown,
} from '@point0/core/request0'
import type { EngineClient } from './client.js'
import type { Engine } from './engine.js'
import { Executor } from './executor.js'
import type { ExecuteOptionsKnownInput } from './executor.js'
import { createHoleNdjsonStream } from './rsc-stream.js'
import type { Publicdir } from './publicdir.js'
import type { EngineServer } from './server.js'
// import { renderToReadableStream } from 'react-dom/server'

export class Fetcher<TError extends ErrorPoint0> {
  engine: Engine<RequiredCtx, TError, true>
  server: EngineServer<true, TError>

  private constructor({
    engine,
    server,
  }: {
    engine: Engine<RequiredCtx, TError, true>
    server: EngineServer<true, TError>
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

  /**
   * Dev + Bun only. The asset pipeline (part of the compiler plugin — see `@point0/compiler` `applyAssetsBunPlugin`)
   * rewrites `file`-loader asset imports (on both the browser bundle and the SSR runtime) to a
   * `/_point0/assets/<hash>.<ext>` URL and caches the bytes content-addressed. Here we serve those URLs back from that
   * same cache. Safe by construction: only names that match `<hash>.<ext>` (no slashes, no `..`) are accepted, so there
   * is no path traversal and no arbitrary file read — we only ever serve assets that were actually imported. Replaces
   * the old `POINT0_UNSAFE_FIX_BUN_STATIC_SERVE` hack, which served arbitrary files by absolute path. In prod the
   * static `dist/client` publicdir serves these instead.
   */
  static fetchDevAsset = async ({ request }: { request: Request0 }): Promise<Response | undefined> => {
    // Dev-only: `build.was` is statically `true` in a built bundle (this route shakes out; prod serves the bytes from
    // the `dist/client` publicdir) and `false` in the unbuilt dev server — the single, sufficient gate.
    if (_point0_env.build.was) {
      return undefined
    }
    const pathname = request.location.pathname
    if (!pathname.startsWith(ASSET_URL_PREFIX)) {
      return undefined
    }
    const name = pathname.slice(ASSET_URL_PREFIX.length)
    if (!assetNameRegex.test(name)) {
      return undefined
    }
    const filePath = nodePath.join(resolveAssetsCacheDir(), name)
    const bunFile = Bun.file(filePath)
    if (await bunFile.exists()) {
      return new Response(bunFile)
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
    const transformer = this.server.points.getTransformerByScope({
      scope,
    })
    this._transformers.set(scope, transformer)
    return transformer
  }

  /**
   * The transformer for OUTPUT payloads — the app transformer wrapped with the RSC element codec, so normalized React
   * elements in loader/query/mutation outputs (and dehydrated state) encode into wire markers. Input parsing must stay
   * on `getTransformer` (raw): the server never decodes elements from client-sent bytes.
   */
  private getTransformerWithRsc = (options: {
    scope: PointsScope
    point: ReadyPoint | undefined
    transform: boolean
  }): DataTransformerExtended => {
    return wrapTransformerWithRsc(this.getTransformer(options))
  }

  private readonly _getPointInputFromEndpointRequest = async ({
    request,
    location,
    point,
    transform,
  }: {
    request: Request0
    location: ExactLocation
    point: ReadyPoint | undefined
    transform: boolean
  }): Promise<InputRawUnknown> => {
    if (!point) {
      return { body: {}, search: {}, params: {}, input: {} }
    }
    const isAction = point.type === 'action'
    const isPage = point.type === 'page'
    const isLayout = point.type === 'layout'
    // A query endpoint reached over GET carries its input in the ?input= search param (JSON), not the body — the
    // client only POSTs it as a body on the binary/over-long fallback. So we skip the body read for a GET query
    // endpoint and pick the input up from the URL below.
    const isQueryInputFromSearch = point._canHaveQueryEndpoint() && request.method === 'GET'
    const shouldReadBody = isAction
      ? point._serverExecuteActions.some((action) => action.type === 'body')
      : !isPage && !isLayout && !isQueryInputFromSearch
    // Parse a JSON input carrier (a request body, a FormData field value, or the ?input= search param) and throw our
    // coded 400 on malformed JSON — the sender gets a clear error instead of a silently-empty input. Shared by every
    // input parse site below so body and search fail the same way.
    const parseInputJson = (raw: string): unknown => {
      try {
        return JSON.parse(raw)
      } catch (error) {
        throw new point._Error('Failed to parse the request input as JSON', {
          status: 400,
          code: POINT0_ERROR_CODES_MAP.INPUT_PARSE_FAILED,
          cause: error,
        })
      }
    }
    const body = await (async () => {
      if (!shouldReadBody) {
        return {}
      }
      if (request.original.headers.get('Content-Type')?.includes('multipart/form-data')) {
        const formData =
          request.rawBody !== undefined
            ? (() => {
                if (request.rawBody instanceof FormData) {
                  return request.rawBody
                }
                throw new Error('For multipart/form-data, request.rawBody must be FormData')
              })()
            : await request.original.formData()
        if (request.rawBody === undefined) {
          request.rawBody = formData
        }
        const parsed = [...formData.entries()].reduce<Record<string, unknown>>((acc, [key, value]) => {
          acc[key] = typeof value === 'string' ? (transform ? parseInputJson(value) : value) : value
          return acc
        }, {})
        return flat.deserialize(parsed)
      }
      const rawBody = request.rawBody !== undefined ? request.rawBody : await request.original.text()
      if (request.rawBody === undefined) {
        request.rawBody = rawBody
      }
      if (typeof rawBody !== 'string') {
        return rawBody
      }
      if (!rawBody.trim()) {
        return {}
      }
      return parseInputJson(rawBody)
    })()
    const transformer = this.getTransformer({ scope: point.scope, point, transform })
    const bodyParsed = transform ? transformer.deserialize(body) : body
    if (isAction) {
      return { body: bodyParsed, search: location.search, params: location.params, input: {} }
    }
    if (isPage || isLayout) {
      return { body: {}, search: location.search, params: location.params, input: {} }
    }
    // Query endpoint (query / infiniteQuery / component / provider) or mutation. A GET query endpoint took its input
    // from the ?input= search param above (JSON, same bytes a POST would put in the body); everything else read it
    // from the body.
    const inputRaw = ((): unknown => {
      if (!isQueryInputFromSearch) {
        return body
      }
      const rawSearchInput = (location.search as Record<string, unknown> | undefined)?.[
        POINT0_QUERY_GET_INPUT_SEARCH_PARAM
      ]
      if (rawSearchInput === undefined || rawSearchInput === '') {
        return {}
      }
      return parseInputJson(typeof rawSearchInput === 'string' ? rawSearchInput : String(rawSearchInput))
    })()
    const inputParsed = isQueryInputFromSearch ? (transform ? transformer.deserialize(inputRaw) : inputRaw) : bodyParsed
    return { body: {}, search: {}, params: {}, input: inputParsed }
  }

  getPointInputFromEndpointRequest = async ({
    request,
    location,
    point,
    transform,
  }: {
    request: Request0
    location: ExactLocation
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
    const prevRequest =
      '__POINT0_PREV_REQUEST__' in originalRequest ? (originalRequest.__POINT0_PREV_REQUEST__ as Request0) : undefined
    const request = Request0.create<TError>(originalRequest, {
      bunServer: bunServer || this.server.bunServer,
      id: generateId(),
      isFromServer,
      prev: prevRequest,
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
        if (_point0_env.build.was) {
          return undefined
        }
        if (process.env.POINT0_PREVENT_REDIRECT_TO_DEV_CLIENT === 'true') {
          return undefined
        }
        if (request.location.hostname !== 'localhost') {
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
            // Content-hashed names — the built client's emitted files (chunks including the entry) and the asset
            // pipeline's `/_point0/assets/*` — are the `asset` variant: their URL can never serve different bytes.
            // Stable-name files (favicons, `robots.txt`, `index.html`, …) stay `publicdir`.
            const pathname = request.location.pathname
            const isAsset =
              pathname.startsWith(ASSET_URL_PREFIX) ||
              ((await publicdir.client?.isClientBuildAssetPath(pathname)) ?? false)
            const general = {
              transform,
              scope,
              request,
              effects,
              middlewares:
                this.server.points.middlewares.get(publicdir.scope) ??
                this.server.points.middlewares.get(this.server.scope) ??
                [],
              middlewareOptions: {
                request,
                set: effects.set,
                scope,
                points: this.server.points as NiceServerPoints,
              },
            }
            if (isAsset) {
              const variant: RequestVariantAsset<Publicdir<true, TError> | undefined> = {
                type: 'asset',
                publicdir,
                response: staticResponse,
              }
              request.variant = variant
              return { ...general, variant }
            }
            const variant: RequestVariantPublicdir<Publicdir<true, TError> | undefined> = {
              type: 'publicdir',
              publicdir,
              response: staticResponse,
            }
            request.variant = variant
            return { ...general, variant }
          }
        }
      }

      const endpoint = this.server.points.findEndpoint({
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
        const variant: RequestVariantEndpoint = {
          type: 'endpoint',
          location: endpoint.location,
          point: endpoint.point,
          outputType,
        }
        request.variant = variant
        return {
          variant,
          transform,
          scope: endpoint.point.scope,
          request,
          effects,
          middlewares: endpoint.point._middlewares,
          middlewareOptions: {
            request,
            set: effects.set,
            scope: endpoint.point.scope,
            points: this.server.points as NiceServerPoints,
          },
        }
      }

      if (!this.server.itWasBuilt) {
        const assetResponse = await Fetcher.fetchDevAsset({ request })
        if (assetResponse) {
          // The dev asset pipeline is content-addressed by construction, so these are always the `asset` variant.
          const variant: RequestVariantAsset<undefined> = {
            type: 'asset',
            publicdir: undefined,
            response: assetResponse,
          }
          request.variant = variant
          return {
            variant,
            transform,
            scope: this.engine.server.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              scope: this.engine.server.scope,
              points: this.server.points as NiceServerPoints,
            },
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
          const variant: RequestVariantPage<EngineClient<true, TError>> = {
            type: 'page',
            pageLocation: foundExactPage.pageLocation,
            point: foundExactPage.page,
            client: foundExactPage.client,
            redirect: redirectResponse,
          }
          request.variant = variant
          return {
            variant,
            transform,
            scope: foundExactPage.page.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              scope: foundExactPage.page.scope,
              points: this.server.points as NiceServerPoints,
            },
          }
        }
        const variant: RequestVariantPage<EngineClient<true, TError>> = {
          type: 'page',
          pageLocation: foundExactPage.pageLocation,
          point: foundExactPage.page,
          client: foundExactPage.client,
          redirect: undefined,
        }
        request.variant = variant
        return {
          variant,
          transform,
          scope: foundExactPage.client.scope,
          request,
          effects,
          middlewares: foundExactPage.page._middlewares,
          middlewareOptions: {
            request,
            set: effects.set,
            scope: foundExactPage.client.scope,
            points: this.server.points as NiceServerPoints,
          },
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
          const variant: RequestVariantPage<EngineClient<true, TError>> = {
            type: 'page',
            pageLocation: pageLocation,
            point: undefined,
            client: foundSuitableClient,
            redirect: redirectResponse,
          }
          request.variant = variant
          return {
            variant,
            transform,
            scope: foundSuitableClient.scope,
            request,
            effects,
            middlewares: [],
            middlewareOptions: {
              request,
              set: effects.set,
              scope: foundSuitableClient.scope,
              points: this.server.points as NiceServerPoints,
            },
          }
        }
        const variant: RequestVariantPage<EngineClient<true, TError>> = {
          type: 'page',
          pageLocation: pageLocation,
          point: undefined,
          client: foundSuitableClient,
          redirect: undefined,
        }
        request.variant = variant
        return {
          variant,
          transform,
          scope: foundSuitableClient.scope,
          request,
          effects,
          middlewares: foundSuitableClient.points?.middlewares ?? [],
          middlewareOptions: {
            request,
            set: effects.set,
            scope: foundSuitableClient.scope,
            points: this.server.points as NiceServerPoints,
          },
        }
      }

      const variant: RequestVariantUnknown = { type: 'unknown' }
      request.variant = variant
      return {
        variant,
        transform,
        scope: this.server.scope,
        request,
        effects,
        middlewares: this.server.points.middlewares.get(this.server.scope) ?? [],
        middlewareOptions: {
          request,
          set: effects.set,
          scope: this.server.scope,
          points: this.server.points as NiceServerPoints,
        },
      }
    } catch (error) {
      const ErrorClass = this.server.points.manager.root._Error
      const error0 = ErrorClass.from(error)
      const variant: RequestVariantError<TError> = { type: 'error', error: error0 }
      request.variant = variant
      return {
        variant,
        transform,
        scope: this.server.scope,
        request,
        effects,
        middlewares: this.server.points.middlewares.get(this.server.scope) ?? [],
        middlewareOptions: {
          request,
          set: effects.set,
          scope: this.server.scope,
          points: this.server.points as NiceServerPoints,
        },
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
    location: ExactLocation
    request: Request0<any, TError>
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
    outputType: 'html' | 'data' | 'queryClientDehydratedState'
  }): Promise<FetcherFetchEndpointResult<TError>> => {
    const client = this.server.clients.find((client) => client.scope === point.scope)
    const partialResult = {
      request,
      scope: point.scope,
      point,
      client,
      data: undefined,
      error: undefined,
    }
    const transformer = this.getTransformerWithRsc({ scope: point.scope, point, transform })
    const ErrorClass = client?.points?.manager.root._Error ?? this.server.points.manager.root._Error
    // A failed deferred hole reports `rscError` through this root's `_emit` (the same root the errors project against).
    // Cast like `Engine.getEmit` does — `EventerEmitFn` doesn't unify a specific `_emit` with the erased param type.
    const rscHoleRoot = client?.points?.manager.root ?? this.server.points.manager.root
    const rscHoleEmit = rscHoleRoot._emit.bind(rscHoleRoot) as EventerEmitFn<ErrorPoint0>

    try {
      const input = await this.getPointInputFromEndpointRequest({ request, location, point, transform })
      // Whether the caller can read a streamed (NDJSON) body for deferred holes (see `defer`). A point0 client advertises
      // it on every data-carrying fetch; a server-to-server SSR nested fetch and any foreign client never do, so they
      // keep the single-JSON body where a hole degraded to inline.
      const clientWantsStream = !!request.headers[POINT0_STREAM_HEADER]
      if (outputType === 'html') {
        if (point.type !== 'page') {
          throw new ErrorClass(`Point type "${point.type}" is not supported for html output type`, {
            code: POINT0_ERROR_CODES_MAP.HTML_OUTPUT_UNSUPPORTED_POINT_TYPE,
            meta: { point: point.toString(), pointType: point.type },
          })
        }
        if (!client) {
          throw new ErrorClass(`Client for scope "${point.scope}" not found while requested page html via endpoint`, {
            code: POINT0_ERROR_CODES_MAP.CLIENT_NOT_FOUND,
            meta: { scope: point.scope },
          })
        }
        const route = point.route as AnyRoute | undefined
        if (!route) {
          throw new ErrorClass(`Point "${point.toString()}" has no route while requested page html via task`, {
            code: POINT0_ERROR_CODES_MAP.POINT_NO_ROUTE,
            meta: { point: point.toString() },
          })
        }
        const pageUrl = route.get({ ...input.params, '?': input.search } as never, {
          origin: request.from.location?.origin,
        })
        const pageLocation = Object.assign(Route0.getLocation(pageUrl), {
          params: input.params,
          route: route.definition,
        } satisfies Partial<KnownLocation>)
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

      const executor = await Executor.create<RequiredCtx, TError>({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })

      if (outputType === 'queryClientDehydratedState') {
        if (point.type !== 'page') {
          throw new ErrorClass(
            `Point type "${point.type}" is not supported for queryClientDehydratedState output type`,
            {
              code: POINT0_ERROR_CODES_MAP.DEHYDRATED_STATE_UNSUPPORTED_POINT_TYPE,
              meta: { point: point.toString(), pointType: point.type },
            },
          )
        }
        if (!client) {
          throw new ErrorClass(`Client for scope "${point.scope}" not found while requested page html via endpoint`, {
            code: POINT0_ERROR_CODES_MAP.CLIENT_NOT_FOUND,
            meta: { scope: point.scope },
          })
        }
        const route = point.route as AnyRoute | undefined
        if (!route) {
          throw new ErrorClass(`Point "${point.toString()}" has no route while requested page html via endpoint`, {
            code: POINT0_ERROR_CODES_MAP.POINT_NO_ROUTE,
            meta: { point: point.toString() },
          })
        }
        const pageUrl = route.get({ ...input.params, '?': input.search } as never, {
          origin: request.from.location?.origin,
        })
        const pageLocation = Object.assign(Route0.getLocation(pageUrl), {
          params: input.params,
          route: route.definition,
        } satisfies Partial<KnownLocation>)
        await client.prefetchAppPagePointDeep({
          executor,
          pagePoint: point as PagePoint,
          pageLocation: pageLocation as ExactLocation | AnyLocation,
          redirectPolicy: 'continue',
          target: 'data',
          // Data-only render: there is no stream to push a streamed result into — don't even
          // start `suspend: 'server' | true` loaders (`ssr: false` ones never run on the server
          // anyway), the client fetches them after navigating.
          suspenseQueryPolicy: 'skip',
        })
        const originalDehydratedState = await executor.getQueryClientReadyDehydratedState({
          withPagesDehydratedState: false,
        })
        const dehydratedState = serializeErrorsInDehydratedState(originalDehydratedState, ErrorClass)
        effects.set.status(200)
        const firstLine = transformer.stringify({ dehydratedState })
        // A prefetched loader deferred a subtree (see `defer`): the dehydrated query state carries `{ t: 2 }` holes, so
        // stream them in as NDJSON exactly like the plain data path — client navigation gets the shell-first, slow-parts-
        // stream-in experience too, and an island inside such a hole renders fresh (interactive). `prefetchAppPagePointDeep`
        // always mints the registry; frame only when the client can read the stream, else the single JSON below (with a
        // hole degraded to inline is the transform-off / non-point0 case).
        const holeRegistry = executor.serverStorageState.__POINT0_RSC_HOLES__
        if (clientWantsStream && holeRegistry && holeRegistry.entries.size > 0) {
          const response = new Response(
            createHoleNdjsonStream({
              firstLine,
              holeRegistry,
              transformer,
              ErrorClass,
              emit: rscHoleEmit,
            }),
            {
              headers: { 'Content-Type': 'application/x-ndjson', [POINT0_STREAM_HEADER]: '1' },
            },
          )
          return {
            ...partialResult,
            response,
            data: { dehydratedState },
          }
        }
        const response = new Response(firstLine, {
          headers: { 'Content-Type': 'application/json' },
        })
        return {
          ...partialResult,
          response,
          data: { dehydratedState },
        }
      }

      // Streamed client fetch (see `defer`): a top-level client fetch that advertises it can read a streamed body gets a
      // fresh per-request hole registry, so a loader/mutation `defer()` produces a `{ t: 2 }` hole (normalizeHole) that
      // the NDJSON framing below fills line by line. Only mint when the header is present AND nothing was inherited — a
      // server-to-server SSR nested fetch already carries the outer render's registry (whose pump drains the fills), and
      // must keep it; a foreign / non-streaming client never sends the header, so its `defer` degrades to inline.
      if (clientWantsStream && !executor.serverStorageState.__POINT0_RSC_HOLES__) {
        executor.serverStorageState.__POINT0_RSC_HOLES__ = new RscHoleRegistry()
      }

      const executeResult = await executor.execute({
        point,
        input: null as never,
        _known: input,
        effects: executor.effects, // here we pass executor effects, becouse we want to apply status and effects to it
        ErrorClass,
      })

      if (executeResult.redirect && request.headers['x-point0-client-request-id']) {
        // it is page redirect, not repsonse redirect
        // if request was sent from point0 cleint we send in with usual response 200 and special header (in this block), but will recoginze as error in query itself
        // if it was requested via foreign client, then it is unexpected and we return response as error (in next block: if (executeResult.error) ...)

        const response = new Response(transformer.stringify(executeResult.redirect.serialize()), {
          headers: { 'Content-Type': 'application/json', 'X-Point0-Redirect': 'true' },
          status: executeResult.effects.status ?? 200,
        })
        return {
          ...partialResult,
          response,
          data: undefined,
        }
      }

      if (executeResult.error) {
        const response =
          executeResult.error.response ??
          this.toJsonErrorResponse({
            ErrorClass,
            error: executeResult.error,
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
          error: executeResult.error as TError,
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
        const error = new ErrorClass('No output', { code: POINT0_ERROR_CODES_MAP.NO_OUTPUT })
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
      const firstLine = transformer.stringify(executeResult.output)
      const holeRegistry = executor.serverStorageState.__POINT0_RSC_HOLES__
      // The output deferred a subtree (see `defer`): stream the response as NDJSON — line 1 is this payload (holes as
      // `{ t: 2 }`), each following line fills one as it resolves. Gated on the request header so only a stream-capable
      // point0 client gets a framed body; a nested SSR fetch (no header, but an inherited registry) and a foreign client
      // both fall through to the single-JSON body, where `defer` already degraded to inline.
      if (clientWantsStream && holeRegistry && holeRegistry.entries.size > 0) {
        const response = new Response(
          createHoleNdjsonStream({
            firstLine,
            holeRegistry,
            transformer,
            ErrorClass,
            emit: rscHoleEmit,
          }),
          {
            headers: { 'Content-Type': 'application/x-ndjson', [POINT0_STREAM_HEADER]: '1' },
            status: executeResult.effects.status ?? 200,
          },
        )
        return {
          ...partialResult,
          response,
          data: executeResult.output,
        }
      }
      const response = new Response(firstLine, {
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
      // Respect a coded error's own status — e.g. a 400 from a malformed input (POINT0_INPUT_PARSE_FAILED) — and fall
      // back to 500 only for an unexpected error that carries none (toJsonErrorResponse applies `error0.status ?? 500`).
      const response = this.toJsonErrorResponse({
        ErrorClass,
        error: error0,
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
    client: EngineClient<true, TError>
    point: PagePoint | undefined
    pageLocation: AnyLocation | ExactLocation
    request: Request0<any, TError>
    requiredCtx: RequiredCtx
    effects: Effects
    serverStorageState: SuperStoreInternalValuesOrErrors
  }): Promise<FetcherFetchPageResult<TError>> => {
    const partialResult = {
      client,
      pageLocation,
      request,
      scope: client.scope,
      point,
      data: undefined,
      error: undefined,
    }
    const ErrorClass = client.points?.manager.root._Error ?? this.server.points.manager.root._Error

    try {
      const executor = await Executor.create<RequiredCtx, any>({
        engine: this.engine,
        request,
        requiredCtx,
        effects,
        serverStorageState,
      })

      // SSR the page when the client SSRs AND this page did not opt out with `.ssr(false)`. An opted-out page (or a
      // fully-SPA client) ships the shell — matching the compiler, which strips its render from the server build.
      if (client.ssrDefaultOptions.enabled && point?._ssr?.enabled !== false) {
        try {
          const readableStream = await client.renderAsReadableStream({
            executor,
            pagePoint: point,
            pageLocation,
            redirectPolicy: 'throw',
            // Whole-HTML by default; switches to streaming (shell first, suspended Suspense
            // boundaries follow in-order) when the final render may suspend: the page declared
            // `suspend: 'server' | true` queries, or the discover loop stopped with pending
            // suspendable ones.
            waitForAllReady: 'auto',
          })
          const response = new Response(readableStream, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
          if (!point) {
            effects.set.status(404)
          }
          return {
            ...partialResult,
            response,
          }
        } catch (error) {
          if (RedirectTask.is(error)) {
            const validRedirectStatuses = [301, 302, 303, 307, 308]
            const providedRedirectStatus = error.status ?? effects.status
            const finalRedirectStatus =
              providedRedirectStatus !== undefined && validRedirectStatuses.includes(providedRedirectStatus)
                ? providedRedirectStatus
                : 302
            effects.set.status(finalRedirectStatus)
            const response = new Response(null, {
              headers: {
                Location: error.to,
              },
              status: finalRedirectStatus,
            })
            return {
              ...partialResult,
              response,
            }
          }
          const indexHtml = await client.getDocumentShellHtml(request.original.url)
          const response = new Response(indexHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
          const error0 = ErrorClass.from(error)
          return {
            ...partialResult,
            response,
            error: error0,
          }
        }
      } else if (client.indexHtml) {
        const indexHtml = await client.getDocumentShellHtml(request.original.url)
        const response = new Response(indexHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: !point && client.points ? 404 : 200,
        })
        return {
          ...partialResult,
          response,
        }
      } else {
        throw new ErrorClass(`Client "${client.scope}" has no indexHtml`, {
          code: POINT0_ERROR_CODES_MAP.CLIENT_NO_INDEX_HTML,
          meta: { scope: client.scope },
        })
      }
    } catch (error) {
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

  private async _composeMiddlewares<TError extends ErrorPoint0>({
    middlewares,
    finalHandler,
    baseOptions,
    transform,
  }: {
    middlewares: MiddlewareFn<TError>[]
    finalHandler: () => Promise<FetcherFetchDetailedResultNoMiddleware<TError>>
    baseOptions: MiddlewareFnOptionsBase<TError>
    transform: boolean
  }): Promise<FetcherFetchDetailedResult<TError>> {
    let index = -1
    let isMiddleware = true as boolean

    async function dispatch(i: number): Promise<Response | FetcherFetchDetailedResult<TError>> {
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
              error: undefined,
              variant: { type: 'middleware' },
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
          variant: { type: 'middleware' },
          error: undefined,
        }
      }
      return result
    } catch (error) {
      const ErrorClass = this.server.points.manager.root._Error
      const error0 = ErrorClass.from(error)
      const transformer = this.getTransformer({
        scope: baseOptions.scope,
        point: undefined,
        transform,
      })
      return {
        request: baseOptions.request,
        scope: baseOptions.scope,
        response:
          error0.response ??
          this.toJsonErrorResponse({
            ErrorClass,
            error: error0,
            status: error0.status,
            transformer,
          }),
        variant: isMiddleware ? { type: 'middleware' } : { type: 'error', error: error0 },
        error: error0,
      } as FetcherFetchDetailedResultMiddleware<TError> | FetcherFetchDetailedResultError<TError>
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
      if (prepareFetchResult.variant.type === 'publicdir') {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: prepareFetchResult.variant.response,
          variant: prepareFetchResult.variant,
          error: undefined,
        }
      }

      if (prepareFetchResult.variant.type === 'asset') {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: prepareFetchResult.variant.response,
          variant: prepareFetchResult.variant,
          error: undefined,
        }
      }

      if (prepareFetchResult.variant.type === 'endpoint') {
        const fetchEndpointResult = await this.fetchEndpoint({
          point: prepareFetchResult.variant.point,
          location: prepareFetchResult.variant.location,
          request: prepareFetchResult.request,
          requiredCtx,
          effects: prepareFetchResult.effects,
          serverStorageState,
          transform: prepareFetchResult.transform,
          outputType: prepareFetchResult.variant.outputType,
        })
        return {
          ...fetchEndpointResult,
          variant: { ...prepareFetchResult.variant, data: fetchEndpointResult.data },
        }
      }

      if (prepareFetchResult.request.original.method === 'OPTIONS') {
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: new Response(null, { status: 204 }),
          variant: { type: 'options' },
          error: undefined,
        }
      }

      if (prepareFetchResult.variant.type === 'error') {
        const ErrorClass = this.server.points.manager.root._Error
        return {
          request: prepareFetchResult.request,
          scope: prepareFetchResult.scope,
          response: this.toJsonErrorResponse({
            ErrorClass,
            error: prepareFetchResult.variant.error,
            transformer: this.getTransformer({
              scope: prepareFetchResult.scope,
              point: undefined,
              transform: prepareFetchResult.transform,
            }),
          }),
          variant: { type: 'error', error: prepareFetchResult.variant.error },
          error: prepareFetchResult.variant.error,
        }
      }

      if (prepareFetchResult.variant.type === 'page') {
        if (prepareFetchResult.variant.redirect) {
          return {
            ...prepareFetchResult.variant,
            request: prepareFetchResult.request,
            scope: prepareFetchResult.scope,
            variant: prepareFetchResult.variant,
            error: undefined,
            response: prepareFetchResult.variant.redirect,
          }
        }
        const fetchPagePointResult = await this.fetchPage({
          client: prepareFetchResult.variant.client,
          point: prepareFetchResult.variant.point,
          pageLocation: prepareFetchResult.variant.pageLocation,
          request: prepareFetchResult.request,
          requiredCtx,
          effects: prepareFetchResult.effects,
          serverStorageState,
          transform: prepareFetchResult.transform,
        })
        return {
          ...fetchPagePointResult,
          variant: prepareFetchResult.variant,
        }
      }

      const ErrorClass = this.server.points.manager.root._Error
      const error = new ErrorClass(`Not Found`, { status: 404, code: POINT0_ERROR_CODES_MAP.NOT_FOUND })
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
        variant: { type: 'error', error },
        error,
      }
    } catch (error) {
      const ErrorClass = this.server.points.manager.root._Error
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
        variant: { type: 'error', error: error0 },
        error: error0,
      }
    }
  }

  /**
   * Deploy invalidation: a BUILT server (dev has no build to be stale against) sets `X-Point0-Client-Build:
   * <scope>:<version>` on every response attributable to a client scope. The client fetch layer compares it against its
   * own version; a mismatch marks the running build stale and the next client navigation becomes a full document
   * navigation (see `@point0/core`'s stale module). Cache headers are deliberately NOT set here — caching policy
   * belongs to the app (a middleware / a proxy); the handshake doesn't need it, since the client fetches
   * `build-version.json` with `cache: 'no-store'`.
   */
  // The `<scope>:<buildVersion>` value for the deploy-invalidation header, or undefined when not attributable to a built
  // client scope (dev, unknown scope, no version). Shared by the effect path (success) and the direct-set path (the
  // uncaught-throw 500 below) so BOTH carry the header — every response the engine can attribute to a client scope must,
  // or a stale tab misses the proactive channel on that response.
  private async getClientBuildHeaderValue(scope: string): Promise<string | undefined> {
    if (!this.server.itWasBuilt) {
      return undefined
    }
    const client = this.server.clients.find((c) => c.scope === scope)
    if (!client) {
      return undefined
    }
    const buildVersion = await client.getClientBuildVersion()
    if (!buildVersion) {
      return undefined
    }
    return buildClientBuildHeaderValue({ scope, buildVersion })
  }

  private async setClientBuildHeaderEffect({
    prepareFetchResult,
  }: {
    prepareFetchResult: PrepareFetchResult<TError>
  }): Promise<void> {
    const value = await this.getClientBuildHeaderValue(prepareFetchResult.scope)
    if (value) {
      prepareFetchResult.effects.set.headers({ [POINT0_CLIENT_BUILD_HEADER]: value })
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
    if (!this.server.itWasBuilt && (this.server.viteConfig || this.server.hotStore)) {
      // Vite: re-import points per request so its HMR module-graph updates are picked up.
      // Server-dev hot reload (bun-native store mode): re-import the aggregators per request — each readPoints is
      // gated by the manifest hash, so an unchanged store is a cheap cache hit and a changed one swaps in fresh
      // modules (singletons preserved). This is the manifest hook.
      await this.engine.readEverything()
    }
    const prepareFetchResult = await this.prepareFetch({
      originalRequest: request,
      bunServer,
    })
    const _eventData = {
      request: prepareFetchResult.request,
      scope: prepareFetchResult.scope,
      error: undefined,
    }
    const meta = {
      request: {
        method: prepareFetchResult.request.method,
        path: prepareFetchResult.request.location.pathname,
      },
      scope: prepareFetchResult.scope,
    }

    const emit = this.engine.getEmit({
      point: (prepareFetchResult.request.variant as { point?: AnyPoint }).point,
      scope: prepareFetchResult.scope,
    })

    const serverStorageState = _getSsItemsWithRestErrors(
      {
        __POINT0_SSR_STORE_PENDING__: _ss.__POINT0_SSR_STORE_PENDING__.getOrUndefined() || new Map(),
        __POINT0_COOKIE_STORE_PENDING__: _ss.__POINT0_COOKIE_STORE_PENDING__.getOrUndefined() || new Map(),
        __POINT0_SERVER_PORT__: this.server.port,
        __POINT0_FAKE_CLIENT__: undefined,
        __POINT0_SSR_PHASE__: 'none',
        __POINT0_SSR_TARGET__: 'none',
        __POINT0_SSR_REDIRECT_TASK__: undefined,
        __POINT0_REQUEST0__: prepareFetchResult.request,
        __POINT0_EFFECTS__: prepareFetchResult.effects,
        // in case of recursive server response we want preserve query client to keep state
        __POINT0_QUERY_CLIENT_FROM_PARENT_RUN__: _ss.__POINT0_QUERY_CLIENT__.getOrUndefined(),
        // …and the deferred-hole registry (see `defer`): a page/layer loader's data is fetched in this
        // nested run, but its holes must land in the OUTER render's per-request registry so the render
        // pump streams and drains them. Absent outside an SSR render (a plain data fetch) → undefined.
        __POINT0_RSC_HOLES__: _ss.__POINT0_RSC_HOLES__.getOrUndefined(),
      },
      'Value "%s" not exists in middleware call, this value accessible only in loader, ctx, components etc',
    )

    const middlewares = prepareFetchResult.middlewares
    const middlewareOptions = prepareFetchResult.middlewareOptions

    return await _ssRunWithServerStorageState(serverStorageState, async () => {
      emit?.('engineFetchStart', _eventData, meta)
      try {
        const result = await this._composeMiddlewares<TError>({
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
        if (result.error?.headers) {
          prepareFetchResult.effects.set.headers(result.error.headers)
        }
        await this.setClientBuildHeaderEffect({ prepareFetchResult })
        const response = prepareFetchResult.effects.apply(result.response)
        const finalResult = {
          ...result,
          response,
        } as FetcherFetchDetailedResult<TError>
        const error = (result as { error?: TError }).error
        // The settled-family meta carries the SSR render-pass total — known only now (`meta`
        // was built before anything rendered and is reused by `engineFetchStart` as is) and
        // only when the SSR loop actually ran (page HTML / data-only page fetches), so plain
        // endpoint lines stay clean. In `data` the count is not duplicated: it travels on the
        // request itself — `data.request.renders`, the same object as `data.result.request`.
        const renders = prepareFetchResult.request.renders
        const settledMeta = renders > 0 ? { ...meta, request: { ...meta.request, renders } } : meta
        emit?.('engineFetchSettled', { ..._eventData, error, result: finalResult }, settledMeta)
        if (error) {
          emit?.('engineFetchError', { ..._eventData, error, result: finalResult }, settledMeta)
        } else {
          emit?.('engineFetchSuccess', { ..._eventData, error: undefined, result: finalResult }, settledMeta)
        }
        return finalResult
      } catch (error) {
        const ErrorClass = this.server.points.manager.root._Error
        const error0 = ErrorClass.from(error) as TError
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
          variant: { type: 'error' as const, error: error0 },
          error: error0,
        }
        // The success path sets this through the effects; an uncaught throw bypasses them, so set it directly — a
        // scope-attributable 500 must still echo its client build for the proactive stale-detection channel.
        const clientBuildHeader = await this.getClientBuildHeaderValue(prepareFetchResult.scope)
        if (clientBuildHeader) {
          finalResult.response.headers.set(POINT0_CLIENT_BUILD_HEADER, clientBuildHeader)
        }
        const renders = prepareFetchResult.request.renders
        const settledMeta = renders > 0 ? { ...meta, request: { ...meta.request, renders } } : meta
        emit?.('engineFetchSettled', { ..._eventData, error: error0, result: finalResult }, settledMeta)
        emit?.('engineFetchError', { ..._eventData, error: error0, result: finalResult }, settledMeta)
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
      // Public projection for an untrusted client in production; the full private one in dev,
      // so the developer sees the stack right in the browser.
      const serialized = _point0_env.mode.is.production
        ? ErrorClass.serializePublic(error0)
        : ErrorClass.serializePrivate(error0)
      const stringified = transformer ? transformer.stringify(serialized) : JSON.stringify(serialized)
      if (!stringified) {
        throw new ErrorClass('Failed to stringify error', {
          cause: error0,
          code: POINT0_ERROR_CODES_MAP.ERROR_STRINGIFY_FAILED,
        })
      }
      return new Response(stringified, {
        headers: { 'Content-Type': 'application/json' },
        status,
      })
    } catch (e) {
      this.server.log({
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

type PrepareFetchResultGeneral<TError extends ErrorPoint0> = {
  transform: boolean
  scope: PointsScope
  request: Request0<any, TError>
  effects: Effects
  middlewares: MiddlewareFn<TError>[]
  middlewareOptions: MiddlewareFnOptionsBase<TError>
}
type PrepareFetchResult<TError extends ErrorPoint0> =
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantPublicdir<Publicdir<true, TError> | undefined>
    })
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantAsset<Publicdir<true, TError> | undefined>
    })
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantEndpoint
    })
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantPage<EngineClient<true, TError>>
    })
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantUnknown
    })
  | (PrepareFetchResultGeneral<TError> & {
      variant: RequestVariantError<TError>
    })

type FetcherFetchPageResult<TError extends ErrorPoint0> = FetcherFetchDetailedResultGeneral<TError> & {
  point: ReadyPoint | undefined
  pageLocation: AnyLocation
  client: EngineClient<true, TError>
}
type FetcherFetchEndpointResult<TError extends ErrorPoint0> = FetcherFetchDetailedResultGeneral<TError> & {
  point: ReadyPoint
  client: EngineClient<true, TError> | undefined
  data: Data | undefined
}
