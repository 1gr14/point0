import type { DehydratedState, Mutation, Query, UseInfiniteQueryResult, UseQueryResult } from '@tanstack/react-query'
import { stringify } from 'safe-stable-stringify'
import type { ErrorPoint0 } from './error.js'
import type { Props, QuerySuccess, UseQueryOrInfiniteQueryResult } from './mountable.js'
import type {
  Data,
  DataTransformer,
  DataTransformerExtended,
  ExtraUseInfiniteQueryOptions,
  ExtraUseMutationOptions,
  ExtraUseQueryOptions,
  FetchServerOutputType,
  MiddlewareFn,
  MutationKey,
  NormalizedEndpoindOpenapiSchema,
  PointName,
  PointsScope,
  PointType,
  QueryKey,
  QueryMode,
  QueryResultType,
  ScrollPositionGetter,
  ScrollPositionSetter,
  UseInfiniteQueryOptions,
  UseMutationOptions,
  UseQueryOptions,
} from './types.js'

export function mergeHeaders(base?: HeadersInit, ...extras: Array<HeadersInit | undefined>): Headers {
  const merged = new Headers(base)
  for (const extra of extras) {
    if (!extra) continue
    const normalized = new Headers(extra)
    normalized.forEach((value, key) => {
      merged.set(key, value)
    })
  }
  return merged
}

export function isPlainObject(obj: unknown): obj is Record<string, any> {
  return !!obj && typeof obj === 'object' && !Array.isArray(obj)
}

export const emptyDehydratedState: DehydratedState = {
  queries: [],
  mutations: [],
}

export const parseUrl = (url: string) => {
  const urlObj = new URL(url)
  return {
    urlObj,
    urlStr: url,
  }
}
export type ParsedUrl = {
  urlObj: URL
  urlStr: string
}

export const prependAndDeappendSlash = <T extends string | undefined | null>(path: T): T => {
  if (!path) {
    return undefined as T
  }
  let result = '/' + path.replace(/^\//, '')
  result = result.replace(/\/\/+/g, '/')
  result = result.replace(/\/$/, '')
  return result as T
}

export const windowScrollPositionGetter: ScrollPositionGetter = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { x: 0, y: 0 }
  }
  const doc = document.documentElement
  const body = document.body
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const x = window.pageXOffset !== undefined ? window.pageXOffset : doc.scrollLeft || body.scrollLeft || 0
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const y = window.pageYOffset !== undefined ? window.pageYOffset : doc.scrollTop || body.scrollTop || 0
  return { x, y }
}

export const windowScrollPositionSetter: ScrollPositionSetter = ({ x, y }: { x: number; y: number }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  x ??= 0
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  y ??= 0
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  if (typeof window.scrollTo === 'function') {
    window.scrollTo(x, y)
    return
  }
  const doc = document.documentElement
  const body = document.body
  doc.scrollLeft = body.scrollLeft = x
  doc.scrollTop = body.scrollTop = y
}

export const getWindowScrollPositionGetterByElementGetter = (elementGetter: () => HTMLElement | null) => {
  return () => {
    const element = elementGetter()
    if (!element) {
      return { x: 0, y: 0 }
    }
    return { x: element.scrollLeft, y: element.scrollTop }
  }
}

export const getWindowScrollPositionSetterByElementGetter = (elementGetter: () => HTMLElement | null) => {
  return (position: { x: number; y: number }) => {
    const element = elementGetter()
    if (!element) {
      return
    }
    element.scrollLeft = position.x
    element.scrollTop = position.y
  }
}

export const getWindowScrollPositionGetterBySelector = (selector: string) => {
  return getWindowScrollPositionGetterByElementGetter(() => document.querySelector(selector))
}

export const getWindowScrollPositionSetterBySelector = (selector: string) => {
  return getWindowScrollPositionSetterByElementGetter(() => document.querySelector(selector))
}

export const isContainsBinary = (value: unknown): boolean => {
  if (value instanceof File || value instanceof Blob) {
    return true
  }
  if (Array.isArray(value)) {
    return value.some(isContainsBinary)
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(isContainsBinary)
  }
  return false
}

export const blankDataTransformer: DataTransformer = {
  serialize: (data) => data,
  deserialize: (data) => data,
}

export const toExtendedTransformer = (transformer: DataTransformer): DataTransformerExtended => {
  return {
    serialize: transformer.serialize.bind(transformer),
    deserialize: transformer.deserialize.bind(transformer) as <TData>(data: unknown) => TData,
    stringify: (data) => stringify(transformer.serialize(data)),
    parse: <TData>(stringified: string): TData => transformer.deserialize(JSON.parse(stringified)) as TData,
  }
}

export const blankDataTransformerExtended: DataTransformerExtended = toExtendedTransformer(blankDataTransformer)

const WORD_SEP = /[_\-.:/\\\s]+/g

const splitWords = (str: string): string[] => {
  return (
    str
      .normalize('NFKD')
      // split camelCase / PascalCase boundaries
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(WORD_SEP, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  )
}

export const toCapitalized = (str: string): string => (str ? str[0].toUpperCase() + str.slice(1) : '')

export const toCamelCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => toCapitalized(w.toLowerCase()))
      .join('')
  )
}

export const toPascalCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  const pascal = words.map((w) => toCapitalized(w.toLowerCase())).join('')
  return /^[A-Za-z_$]/.test(pascal) ? pascal : `_${pascal}`
}

export const toKebabCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  return words.map((w) => w.toLowerCase()).join('-')
}

export const toHumanCase = (str: string): string => {
  const words = splitWords(str)
  if (words.length === 0) return ''

  return words.map((w) => toCapitalized(w.toLowerCase())).join(' ')
}

export const generateId = (): string => {
  try {
    // for server and modern clients
    return crypto.randomUUID()
  } catch {
    // for old clients
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export const getCallerLocation = (skip = 2): FsLocation | undefined => {
  const stack = new Error().stack
  if (!stack) return undefined

  const lines = stack.split('\n')
  const target = lines[skip]
  if (!target) return undefined

  // Matches:
  // at fn (/path/file.ts:10:5)
  // at /path/file.ts:10:5
  const match = target.match(/\((.*):(\d+):(\d+)\)/) || target.match(/at (.*):(\d+):(\d+)/)

  if (!match) return undefined

  return {
    path: match[1],
    line: Number(match[2]),
    column: Number(match[3]),
  }
}
export type FsLocation = {
  path: string
  line: number
  column: number
}

const toPathParts = (path: string): string[] => path.split('.').filter(Boolean)
const isArrayIndex = (part: string): boolean => /^\d+$/.test(part)

// inspired by https://github.com/envindavsorg/ts-safe-path/blob/main/src/types.ts

type PathKeys<T> =
  T extends Record<string, unknown>
    ? {
        [K in keyof T]-?: K extends string
          ? NonNullable<T[K]> extends Record<string, unknown>
            ? K | `${K}.${PathKeys<NonNullable<T[K]>>}`
            : K
          : never
      }[keyof T]
    : never

export type SetByPath = <T extends Record<string, unknown>>(target: T, path: PathKeys<T>, value: unknown) => void
export const setByPath: SetByPath = (target, path, value) => {
  const parts = toPathParts(path)
  if (parts.length === 0) return

  let current: unknown = target
  for (let i = 0; i < parts.length; i += 1) {
    if (current === null || typeof current !== 'object') return

    const part = parts[i]!
    const key: string | number = isArrayIndex(part) ? Number(part) : part
    const currentObject = current as Record<string | number, unknown>
    const isLast = i === parts.length - 1

    if (isLast) {
      currentObject[key] = value
      return
    }

    const nextPart = parts[i + 1]!
    const shouldBeArray = isArrayIndex(nextPart)
    const nextValue = currentObject[key]
    if (nextValue === null || typeof nextValue !== 'object') {
      currentObject[key] = shouldBeArray ? [] : {}
    }
    current = currentObject[key]
  }
}

export type GetByPath = <T extends Record<string, unknown>>(target: T, path: PathKeys<T>) => unknown
export const getByPath: GetByPath = (target, path) => {
  const parts = toPathParts(path)
  if (parts.length === 0) return target

  let current: unknown = target
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined

    const key: string | number = isArrayIndex(part) ? Number(part) : part
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

export const withLetsSugar = (fn: any) => {
  const throwErrorFn = () => {
    throw new Error('lets[type] notation can not work without compiler, please use compiler')
  }
  // Object.assign(fn, {
  //   plugin: throwErrorFn,
  //   page: throwErrorFn,
  //   layout: throwErrorFn,
  //   component: throwErrorFn,
  //   provider: throwErrorFn,
  //   mutation: throwErrorFn,
  //   query: throwErrorFn,
  //   infiniteQuery: throwErrorFn,
  //   action: throwErrorFn,
  //   base: throwErrorFn,
  //   root: throwErrorFn,
  // })
  const wrapped = new Proxy(fn, {
    apply(target, thisArg, argArray) {
      return Reflect.apply(target, thisArg, argArray)
    },
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver)
      }
      if (prop in target) {
        return Reflect.get(target, prop, receiver)
      }
      return throwErrorFn
    },
  })
  return wrapped
}

export const isErrorCode = (code: number): boolean => {
  return code >= 400 && code < 500
}

export const mergeEndpointOpenapiSchemas = (
  prevSchema: NormalizedEndpoindOpenapiSchema | undefined,
  nextSchema: NormalizedEndpoindOpenapiSchema | undefined,
): NormalizedEndpoindOpenapiSchema | undefined => {
  if (!prevSchema) {
    return nextSchema
  }
  if (!nextSchema) {
    return prevSchema
  }
  const tags = (() => {
    const prevTags = prevSchema.tags
    const nextTags = nextSchema.tags
    if (!prevTags && !nextTags) {
      return undefined
    }
    if (!prevTags) {
      return nextTags
    }
    if (!nextTags) {
      return prevTags
    }
    return Array.from(new Set([...prevTags, ...nextTags]))
  })()
  return {
    ...prevSchema,
    ...nextSchema,
    ...(tags ? { tags } : {}),
  }
}

export const mergeMiddlewares = <TError extends ErrorPoint0>(
  middlewares: MiddlewareFn<TError>[],
): MiddlewareFn<TError> => {
  if (middlewares.length === 0) {
    return async (options) => options.next()
  }
  if (middlewares.length === 1) {
    return middlewares[0]
  }
  return async (options) => {
    let index = -1

    async function dispatch(i: number): Promise<any> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      if (i === middlewares.length) {
        return await options.next()
      }

      const middleware = middlewares.at(i)
      if (!middleware) {
        throw new Error('Middleware is undefined')
      }

      return await middleware({
        ...options,
        next: async () => {
          const result = await dispatch(i + 1)
          if (result instanceof Response) {
            return {
              request: options.request,
              scope: options.scope,
              response: result,
              error: undefined,
              variant: { type: 'middleware' },
            }
          }
          return result
        },
      })
    }

    return await dispatch(0)
  }
}

export const mergeQueryOptions = (
  ...options: Array<(UseQueryOptions | ExtraUseQueryOptions) | undefined>
): UseQueryOptions => {
  return mergeOptionsWithCallbacks(['onSuccess', 'onError', 'onSettled'], ...options) as never
}

export const mergeInfiniteQueryOptions = (
  ...options: Array<(UseInfiniteQueryOptions<any> | ExtraUseInfiniteQueryOptions<any>) | undefined>
): UseInfiniteQueryOptions<any> => {
  return mergeOptionsWithCallbacks(['onSuccess', 'onError', 'onSettled'], ...options) as never
}

export const mergeMutationOptions = (
  ...options: Array<(UseMutationOptions | ExtraUseMutationOptions) | undefined>
): UseMutationOptions => {
  return mergeOptionsWithCallbacks(['onMutate', 'onSuccess', 'onError', 'onSettled'], ...options) as never
}

export const mergeCallbacks = <TCallback extends ((...args: any[]) => any) | undefined>(
  ...callbacks: TCallback[]
): TCallback => {
  const definedCallbacks = callbacks.filter(Boolean) as Exclude<TCallback, undefined>[]
  if (definedCallbacks.length === 0) {
    return undefined as TCallback
  }
  if (definedCallbacks.length === 1) {
    return definedCallbacks[0] as TCallback
  }
  return (async (...args: Parameters<Exclude<TCallback, undefined>>) => {
    let result: unknown = undefined
    for (const callback of definedCallbacks) {
      result = await callback(...args)
    }
    return result
  }) as TCallback
}

const mergeOptionsWithCallbacks = <TOptions extends Record<string, any>>(
  callbackKeys: readonly string[],
  ...options: Array<TOptions | undefined>
): TOptions => {
  const merged = Object.assign({}, ...options.filter(Boolean)) as TOptions
  for (const callbackKey of callbackKeys) {
    const callback = mergeCallbacks(
      ...options.map((option) => (option as Record<string, any> | undefined)?.[callbackKey]),
    )
    if (!callback) {
      continue
    }
    ;(merged as Record<string, any>)[callbackKey] = callback
  }
  return merged
}

export const parseQueryKey = (queryKey: readonly unknown[]): QueryKey[1] | undefined => {
  if (queryKey.at(0) !== 'point0') {
    return undefined
  }
  return queryKey[1] as QueryKey[1]
}

export const parseMutationKey = (mutationKey: readonly unknown[] | undefined): MutationKey[1] | undefined => {
  if (mutationKey?.at(0) !== 'point0') {
    return undefined
  }
  return mutationKey[1] as MutationKey[1]
}

export type QueryPredicateOptions = {
  // input?: ((input: InputRaw) => boolean) | undefined
  tags?: string | string[] | ((tags: string[]) => boolean) | undefined
  finiteness?: 'finite' | 'infinite'
  output?: FetchServerOutputType | undefined
  mode?: QueryMode | undefined
  scope?: PointsScope | undefined
  type?: PointType | undefined
  name?: PointName | undefined
}
export const getQueryPredicate = (options: QueryPredicateOptions): ((query: Query) => boolean) => {
  const optionsTags = options.tags
  const tagsFunction = !optionsTags
    ? undefined
    : typeof optionsTags === 'function'
      ? optionsTags
      : Array.isArray(optionsTags)
        ? (tags: string[]) => optionsTags.every((tag) => tags.includes(tag))
        : (tags: string[]) => tags.some((tag) => optionsTags === tag)

  return (query: Query) => {
    const obj = parseQueryKey(query.queryKey)
    if (!obj) {
      return false
    }
    if (tagsFunction) {
      const checkResult = tagsFunction(obj.tags)
      if (checkResult === false) {
        return false
      }
    }
    if (options.finiteness && options.finiteness !== obj.finiteness) {
      return false
    }
    if (options.output && options.output !== obj.output) {
      return false
    }
    if (options.mode && options.mode !== obj.mode) {
      return false
    }
    if (options.scope && options.scope !== obj.scope) {
      return false
    }
    if (options.type && options.type !== obj.type) {
      return false
    }
    if (options.name && options.name !== obj.name) {
      return false
    }
    return true
  }
}

export type MutationPredicateOptions = {
  // input?: ((input: InputRaw) => boolean) | undefined
  tags?: string | string[] | ((tags: string[]) => boolean) | undefined
  scope?: PointsScope | undefined
  type?: PointType | undefined
  name?: PointName | undefined
}
export const getMutationPredicate = (options: MutationPredicateOptions): ((mutation: Mutation) => boolean) => {
  const optionsTags = options.tags
  const tagsFunction = !optionsTags
    ? undefined
    : typeof optionsTags === 'function'
      ? optionsTags
      : Array.isArray(optionsTags)
        ? (tags: string[]) => tags.some((tag) => optionsTags.includes(tag))
        : (tags: string[]) => tags.some((tag) => optionsTags === tag)
  return (mutation: Mutation) => {
    const obj = parseMutationKey(mutation.options.mutationKey)
    if (!obj) {
      return false
    }
    if (tagsFunction) {
      const checkResult = tagsFunction(obj.tags)
      if (checkResult === false) {
        return false
      }
    }
    if (options.scope && options.scope !== obj.scope) {
      return false
    }
    if (options.type && options.type !== obj.type) {
      return false
    }
    if (options.name && options.name !== obj.name) {
      return false
    }
    return true
  }
}

export const singletonize = <T>(key: string, value: T): T => {
  const fixedKey = `__POINT0_AVOID_MULTIPLE_INSTANCES_${key}`
  const bindedValue = (globalThis as any)[fixedKey]
  if (bindedValue) {
    return bindedValue
  }
  ;(globalThis as any)[fixedKey] = value
  return value
}

export type ResolveQueryCallback<
  TQueryResultType extends QueryResultType,
  TQueriedData extends Data,
  TError extends Error,
  TMapped extends Props | undefined,
> = (
  success: TQueryResultType extends 'query'
    ? QuerySuccess<UseQueryResult<TQueriedData, TError>>
    : TQueryResultType extends 'infiniteQuery'
      ? QuerySuccess<UseInfiniteQueryResult<TQueriedData, TError>>
      : never,
) => TMapped
// export type ResolveQueryCallback<
//   TQueryResultType extends QueryResultType,
//   TQueriedData extends Data,
//   TError extends Error,
//   TMapped extends Props | undefined,
// > = (success: number) => TMapped

// Anything query-like: only needs isLoading / error / data. Real react-query
// results satisfy this, but so do custom wrappers. Inside resolve `data` is
// known to be non-nullable (we wait until loaded), so its generic is preserved.
export type QueryLikeResult<TData = unknown> = {
  isLoading: boolean
  error: Error | null | undefined
  data: TData
}

// The query as seen inside the resolver: data narrowed to non-nullable. Real
// react-query results keep their precise success type; anything else gets the
// structural narrowing.
type ResolveQuerySuccess<TQuery extends QueryLikeResult> = TQuery extends UseQueryOrInfiniteQueryResult
  ? QuerySuccess<TQuery>
  : Omit<TQuery, 'data'> & {
      data: NonNullable<TQuery['data']>
    }
type ResolveQueryData<TQuery> = TQuery extends QueryLikeResult ? NonNullable<TQuery['data']> : never
type ResolveQuerySpread<TA, TB> = Omit<TA, keyof TB> & TB

// `{ ...data1, ...data2 }` for an array of queries (later wins), up to 5 entries.
type ResolveQueriesData<TQueries extends readonly QueryLikeResult[]> = TQueries extends readonly [
  infer Q1,
  infer Q2,
  infer Q3,
  infer Q4,
  infer Q5,
]
  ? ResolveQuerySpread<
      ResolveQuerySpread<
        ResolveQuerySpread<ResolveQuerySpread<ResolveQueryData<Q1>, ResolveQueryData<Q2>>, ResolveQueryData<Q3>>,
        ResolveQueryData<Q4>
      >,
      ResolveQueryData<Q5>
    >
  : TQueries extends readonly [infer Q1, infer Q2, infer Q3, infer Q4]
    ? ResolveQuerySpread<
        ResolveQuerySpread<ResolveQuerySpread<ResolveQueryData<Q1>, ResolveQueryData<Q2>>, ResolveQueryData<Q3>>,
        ResolveQueryData<Q4>
      >
    : TQueries extends readonly [infer Q1, infer Q2, infer Q3]
      ? ResolveQuerySpread<ResolveQuerySpread<ResolveQueryData<Q1>, ResolveQueryData<Q2>>, ResolveQueryData<Q3>>
      : TQueries extends readonly [infer Q1, infer Q2]
        ? ResolveQuerySpread<ResolveQueryData<Q1>, ResolveQueryData<Q2>>
        : TQueries extends readonly [infer Q1]
          ? ResolveQueryData<Q1>
          : Record<string, unknown>

// The tuple of success-queries passed to an array resolver, up to 5 entries.
type ResolveQuerySuccessTuple<TQueries extends readonly QueryLikeResult[]> = TQueries extends readonly [
  infer Q1,
  infer Q2,
  infer Q3,
  infer Q4,
  infer Q5,
]
  ? [SQ<Q1>, SQ<Q2>, SQ<Q3>, SQ<Q4>, SQ<Q5>]
  : TQueries extends readonly [infer Q1, infer Q2, infer Q3, infer Q4]
    ? [SQ<Q1>, SQ<Q2>, SQ<Q3>, SQ<Q4>]
    : TQueries extends readonly [infer Q1, infer Q2, infer Q3]
      ? [SQ<Q1>, SQ<Q2>, SQ<Q3>]
      : TQueries extends readonly [infer Q1, infer Q2]
        ? [SQ<Q1>, SQ<Q2>]
        : TQueries extends readonly [infer Q1]
          ? [SQ<Q1>]
          : Array<ResolveQuerySuccess<TQueries[number]>>
type SQ<TQuery> = TQuery extends QueryLikeResult ? ResolveQuerySuccess<TQuery> : never

// resolve(query)                          -> waits, contributes nothing to props (default false)
// resolve(query, false)                    -> same as above
// resolve(query, true)                     -> waits, then spreads data into props
// resolve(query, (success) => props)       -> waits, maps success to props
// (and the array variants of all four)
export type ResolveQueryFn = {
  <TQuery extends QueryLikeResult>(query: TQuery): undefined | Error | 'loading'
  <TQuery extends QueryLikeResult>(query: TQuery, resolve: false): undefined | Error | 'loading'
  <TQuery extends QueryLikeResult>(query: TQuery, resolve: true): NonNullable<TQuery['data']> | Error | 'loading'
  <TQuery extends QueryLikeResult, TMapped extends Props | undefined>(
    query: TQuery,
    resolve: (success: ResolveQuerySuccess<TQuery>) => TMapped,
  ): TMapped | Error | 'loading'
  <const TQueries extends readonly QueryLikeResult[]>(queries: TQueries): undefined | Error | 'loading'
  <const TQueries extends readonly QueryLikeResult[]>(
    queries: TQueries,
    resolve: false,
  ): undefined | Error | 'loading'
  <const TQueries extends readonly QueryLikeResult[]>(
    queries: TQueries,
    resolve: true,
  ): ResolveQueriesData<TQueries> | Error | 'loading'
  <const TQueries extends readonly QueryLikeResult[], TMapped extends Props | undefined>(
    queries: TQueries,
    resolve: (success: ResolveQuerySuccessTuple<TQueries>) => TMapped,
  ): TMapped | Error | 'loading'
}

export const resolveQuery = ((
  query: QueryLikeResult | readonly QueryLikeResult[],
  resolve: boolean | ((success: QueryLikeResult | readonly QueryLikeResult[]) => Props | undefined) = false,
): Props | undefined | Error | 'loading' => {
  const queries: readonly QueryLikeResult[] = Array.isArray(query) ? query : [query]
  if (queries.some((q) => q.isLoading)) {
    return 'loading'
  }
  const error = queries.find((q) => q.error)?.error
  if (error) {
    return error
  }
  if (resolve === false) {
    return undefined
  }
  if (typeof resolve === 'function') {
    return resolve(Array.isArray(query) ? query : queries[0])
  }
  return Object.assign({}, ...queries.map((q) => q.data))
}) as ResolveQueryFn

export const isAbsoluteUrl = (value: string): boolean => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
