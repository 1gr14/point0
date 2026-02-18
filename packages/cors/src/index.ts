import type { MiddlewareFnOptionsBase, NicePristinePluginReadyPoint } from '@point0/core'
import type { RequestMethod } from '@point0/core/request0'

import { Point0, env } from '@point0/core'

// inspired by https://github.com/elysiajs/elysia-cors/tree/main
// thanks a lot, SaltyAom https://saltyaom.com/

type CorsOriginCheck = (context: MiddlewareFnOptionsBase) => boolean | undefined | Promise<boolean | undefined>
type CorsOriginValue = string | RegExp | CorsOriginCheck

export type HTTPMethod = RequestMethod | (string & {})

export type CorsOptions = {
  origin?: boolean | CorsOriginValue | CorsOriginValue[]
  methods?: boolean | undefined | null | '' | '*' | HTTPMethod | HTTPMethod[]
  allowedHeaders?: true | string | string[] | null | undefined
  exposeHeaders?: true | string | string[] | null | undefined
  credentials?: boolean
  maxAge?: number
  preflight?: boolean
}

export const cors = (options: CorsOptions = {}): NicePristinePluginReadyPoint => {
  if (env.target.is.client) {
    return Point0.lets('plugin', 'cors').plugin()
  }

  // everything below will not exists on client becouse of compiler
  const normalizeHeaderList = (value: string | string[] | null | undefined): string | undefined =>
    value === undefined || value === null || value === '' ? undefined : Array.isArray(value) ? value.join(', ') : value

  const headerKeysFromHeaders = (headers: Headers): string => {
    const keys: string[] = []
    headers.forEach((_, key) => {
      keys.push(key)
    })
    return keys.join(', ')
  }

  const normalizeOriginForDomainCompare = (origin: string): string => {
    const protocolIndex = origin.indexOf('://')
    return protocolIndex === -1 ? origin : origin.slice(protocolIndex + 3)
  }

  const hasProtocol = (origin: string): boolean => origin.includes('://')

  const appendVaryValue = (existing: string | undefined, valueToAdd: string): string => {
    if (!existing) {
      return valueToAdd
    }

    const normalized = existing
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (normalized.includes(valueToAdd.toLowerCase())) {
      return existing
    }
    return `${existing}, ${valueToAdd}`
  }

  const resolveAllowOrigin = async ({
    requestOrigin,
    originOption,
    context,
  }: {
    requestOrigin: string | null
    originOption: CorsOptions['origin']
    context: MiddlewareFnOptionsBase
  }): Promise<string | undefined> => {
    const evaluate = async (candidate: CorsOriginValue): Promise<string | undefined> => {
      if (typeof candidate === 'string') {
        if (!requestOrigin) {
          return undefined
        }
        if (candidate === requestOrigin) {
          return requestOrigin
        }
        if (hasProtocol(candidate)) {
          return undefined
        }
        return normalizeOriginForDomainCompare(candidate) === normalizeOriginForDomainCompare(requestOrigin)
          ? requestOrigin
          : undefined
      }

      if (candidate instanceof RegExp) {
        return requestOrigin && candidate.test(requestOrigin) ? requestOrigin : undefined
      }

      const allowed = await candidate(context)
      return allowed && requestOrigin ? requestOrigin : undefined
    }

    const origin = originOption ?? true
    if (origin === true) {
      return requestOrigin ?? '*'
    }
    if (origin === false) {
      return undefined
    }

    const items = Array.isArray(origin) ? origin : [origin]

    for (const item of items) {
      const allowedOrigin = await evaluate(item)
      if (allowedOrigin !== undefined) {
        return allowedOrigin
      }
    }

    return undefined
  }

  const methods = options.methods ?? true
  const allowedHeaders = options.allowedHeaders ?? true
  const exposeHeaders = options.exposeHeaders ?? true
  const normalizedMethods = normalizeHeaderList(typeof methods === 'boolean' ? undefined : methods)
  const normalizedAllowedHeaders = normalizeHeaderList(
    allowedHeaders === true ? undefined : (allowedHeaders as string | string[] | null | undefined),
  )
  const normalizedExposeHeaders = normalizeHeaderList(
    exposeHeaders === true ? undefined : (exposeHeaders as string | string[] | null | undefined),
  )
  const shouldAllowCredentials = options.credentials ?? true
  const shouldHandlePreflight = options.preflight ?? true
  const maxAge = typeof options.maxAge === 'number' && Number.isFinite(options.maxAge) ? String(options.maxAge) : '5'

  return Point0.lets('plugin', 'cors')
    .middleware(async (middlewareOptions) => {
      const { request, set, next } = middlewareOptions
      const requestOrigin = request.original.headers.get('origin')
      const isOptionsRequest =
        middlewareOptions.variant === 'options' || request.original.method.toUpperCase() === 'OPTIONS'
      const isPreflightRequest = shouldHandlePreflight && isOptionsRequest
      if (isOptionsRequest && !shouldHandlePreflight) {
        return await next()
      }

      const allowOrigin = await resolveAllowOrigin({
        requestOrigin,
        originOption: options.origin,
        context: middlewareOptions,
      })

      if (allowOrigin) {
        const allowOriginValue =
          allowOrigin === '*' && shouldAllowCredentials && requestOrigin ? requestOrigin : allowOrigin
        set.headers('Access-Control-Allow-Origin', allowOriginValue)
        if (allowOriginValue !== '*') {
          set.headers('Vary', appendVaryValue(request.headers.vary, 'Origin'))
        } else {
          set.headers('Vary', '*')
        }
      }

      if (methods === true) {
        const methodFromRequest =
          request.original.headers.get('access-control-request-method') ?? request.method.toUpperCase()
        set.headers('Access-Control-Allow-Methods', methodFromRequest)
      } else if (methods !== false && normalizedMethods !== undefined) {
        set.headers('Access-Control-Allow-Methods', normalizedMethods)
      }

      if (allowedHeaders === true) {
        const requested = request.original.headers.get('access-control-request-headers')
        set.headers('Access-Control-Allow-Headers', requested ?? headerKeysFromHeaders(request.original.headers))
      } else if (normalizedAllowedHeaders !== undefined) {
        set.headers('Access-Control-Allow-Headers', normalizedAllowedHeaders)
      }

      if (exposeHeaders === true) {
        set.headers('Access-Control-Expose-Headers', headerKeysFromHeaders(request.original.headers))
      } else if (normalizedExposeHeaders !== undefined) {
        set.headers('Access-Control-Expose-Headers', normalizedExposeHeaders)
      }

      if (shouldAllowCredentials) {
        set.headers('Access-Control-Allow-Credentials', 'true')
      }

      if (maxAge !== '0') {
        set.headers('Access-Control-Max-Age', maxAge)
      }

      if (isPreflightRequest) {
        return new Response(null, { status: 204 })
      }

      return await next()
    })
    .plugin()
}
