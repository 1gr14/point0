import { env, mergeMiddlewares } from '@point0/core'
import type { AnyNiceRequestableReadyPoint, MiddlewareFn } from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import type { ApiReferenceConfigurationWithSource } from '@scalar/types/api-reference'
import { getScalarHtml, type ScalarOptions } from './scalar.js'
import { getSwaggerHtml, type SwaggerOptions } from './swagger.js'
import { getOpenapiSchemaFromPoints, type OpenapiOptions } from './utils.js'

/**
 * Options for the {@link openapi} middleware that are specific to serving the spec (the rest come from
 * {@link OpenapiOptions} — document-level fields like `info`, `servers`, `openapi` version).
 *
 * - `route` — where the raw JSON spec is served (required).
 * - `filter` — which points to include: `'action'` (default, actions only), `'all'`, or a predicate run after the
 *   endpoint check.
 * - `scalar` / `swagger` — a route string (or options object with a `route`) to serve that UI; omit to not serve it.
 * - `before` — middleware run only on the doc routes (the place for auth, e.g. `@point0/basic-auth`).
 * - `cache` — spec caching, on by default keyed by `route`; `false` rebuilds every hit, a string sets a custom key.
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export type OpenapiMiddlewareOptionsGeneral = {
  route: string
  cache?: string | boolean
  before?: MiddlewareFn<any> | MiddlewareFn<any>[]
  filter?: ((point: AnyNiceRequestableReadyPoint) => boolean) | 'all' | 'action'
  scalar?: (ScalarOptions & { route: string }) | string
  swagger?: (SwaggerOptions & { route: string }) | string
}

export type OpenapiMiddlewareOptions<TOpenapiVersion extends string> = OpenapiOptions<TOpenapiVersion> &
  OpenapiMiddlewareOptionsGeneral

/**
 * Middleware that turns every endpoint point — queries, mutations, actions, and SSR pages — into an OpenAPI document,
 * served as raw JSON plus optional Scalar and Swagger UIs. Request and response schemas are read from each point's
 * validation schemas (`.params`/`.search`/`.body`/`.input`/`.response`); nothing is written by hand. Add it as one
 * `.middleware()` on the root. Server-only: on the client it's a no-op pass-through, shipping nothing to the browser.
 *
 *     export const root = Point0.lets
 *       .root()
 *       .schemaHelper(zodSchemaHelper())
 *       .middleware(openapi({ route: '/openapi.json', scalar: '/scalar', swagger: '/swagger', filter: 'all' }))
 *       .root()
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export const openapi = <TOpenapiVersion extends string>(
  options: OpenapiMiddlewareOptions<TOpenapiVersion>,
): MiddlewareFn<any> => {
  if (env.side.is.client) {
    return async ({ next }) => {
      return await next()
    }
  } else {
    const { route: jsonRoute, filter: filterProvided, scalar, swagger, before, cache, ...openapiOptions } = options
    const cacheKey = cache === true ? jsonRoute : cache === false ? undefined : (cache ?? jsonRoute)
    const middlewares = !before ? [] : Array.isArray(before) ? before : [before]
    const filter =
      filterProvided === 'all'
        ? () => true
        : filterProvided === 'action'
          ? (point: AnyNiceRequestableReadyPoint) => point.type === 'action'
          : (filterProvided ?? ((point: AnyNiceRequestableReadyPoint) => point.type === 'action'))

    const { route: scalarRouteProvided, ...scalarOptions } = (
      typeof scalar === 'string' ? { route: scalar } : scalar || {}
    ) as Partial<ApiReferenceConfigurationWithSource> & { route: string }
    const scalarOptionsNormalized = !scalar
      ? undefined
      : {
          ...scalarOptions,
          url: scalarOptions.url ?? jsonRoute,
        }
    const scalarRoute = !scalar ? undefined : scalarRouteProvided

    const { route: swaggerRouteProvided, ...swaggerOptions } = (
      typeof swagger === 'string' ? { route: swagger } : swagger || {}
    ) as SwaggerOptions & { route: string }
    const swaggerOptionsNormalized = !swagger
      ? undefined
      : {
          ...swaggerOptions,
          url: swaggerOptions.url ?? jsonRoute,
        }
    const swaggerRoute = !swagger ? undefined : swaggerRouteProvided

    type RequestType = 'json' | 'scalar' | 'swagger' | undefined
    const checkRequestType = (request: Request0): RequestType => {
      if (request.method !== 'GET') {
        return undefined
      }
      if (request.location.pathname === jsonRoute) {
        return 'json'
      }
      if (!scalarRoute) {
        return undefined
      }
      if (request.location.pathname === scalarRoute) {
        return 'scalar'
      }
      if (!swaggerRoute) {
        return undefined
      }
      if (request.location.pathname === swaggerRoute) {
        return 'swagger'
      }
      return undefined
    }

    const getFinalMiddleware =
      (requestType: RequestType): MiddlewareFn<any> =>
      async ({ next, points }) => {
        if (!requestType) {
          return await next()
        }

        if (requestType === 'json') {
          const filterdPoints = (
            points.collection.filter((p) => p.point._endpoint) as AnyNiceRequestableReadyPoint[]
          ).filter(filter)
          const schema = getOpenapiSchemaFromPoints(filterdPoints, {
            ...openapiOptions,
            cache: cacheKey,
            ssrDefaultOptionsByScope: points.ssrDefaultOptionsByScope,
          } as never)
          return new Response(JSON.stringify(schema), {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        }

        if (requestType === 'scalar' && scalarOptionsNormalized) {
          const scalarHtml = getScalarHtml(scalarOptionsNormalized as never)
          return new Response(scalarHtml, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          })
        }

        if (requestType === 'swagger' && swaggerOptionsNormalized) {
          const swaggerHtml = getSwaggerHtml(swaggerOptionsNormalized)
          return new Response(swaggerHtml, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          })
        }

        return await next()
      }

    const combinedMiddlewares: MiddlewareFn<any> = async (props) => {
      const requestType = checkRequestType(props.request)
      if (!requestType) {
        return await props.next()
      }
      return await mergeMiddlewares([...middlewares, getFinalMiddleware(requestType)])(props)
    }

    return combinedMiddlewares
  }
}
