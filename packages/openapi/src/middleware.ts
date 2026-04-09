import { env, mergeMiddlewares } from '@point0/core'
import type { AnyNiceRequestableReadyPoint, MiddlewareFn } from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import type { ApiReferenceConfigurationWithSource } from '@scalar/types/api-reference'
import { getScalarHtml, type ScalarOptions } from './scalar.js'
import { getOpenapiSchemaFromPoints, type OpenapiOptions } from './utils.js'

export type OpenapiMiddlewareOptionsGeneral = {
  route: string
  cache?: string | boolean
  before?: MiddlewareFn<any> | MiddlewareFn<any>[]
  filter?: ((point: AnyNiceRequestableReadyPoint) => boolean) | 'all' | 'action'
  scalar?: (ScalarOptions & { route: string }) | string
}

export type OpenapiMiddlewareOptions<TOpenapiVersion extends string> = OpenapiOptions<TOpenapiVersion> &
  OpenapiMiddlewareOptionsGeneral

export const openapi = <TOpenapiVersion extends string>(
  options: OpenapiMiddlewareOptions<TOpenapiVersion>,
): MiddlewareFn<any> => {
  if (env.side.is.client) {
    return async ({ next }) => {
      return await next()
    }
  } else {
    const { route: jsonRoute, filter: filterProvided, scalar, before, cache, ...openapiOptions } = options
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

    type RequestType = 'json' | 'scalar' | undefined
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
      return undefined
    }

    const getFinalMiddleware =
      (requestType: RequestType): MiddlewareFn<any> =>
      async ({ next, points }) => {
        if (!requestType) {
          return await next()
        }

        if (requestType === 'json') {
          const filterdPoints = points.filter(filter)
          const schema = getOpenapiSchemaFromPoints(filterdPoints, { ...openapiOptions, cache: cacheKey } as never)
          return new Response(JSON.stringify(schema), {
            headers: {
              'Content-Type': 'application/json',
            },
          })
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (requestType === 'scalar' && scalarOptionsNormalized) {
          const scalarHtml = getScalarHtml(scalarOptionsNormalized as never)
          return new Response(scalarHtml, {
            headers: {
              'Content-Type': 'text/html',
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
