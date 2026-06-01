import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { ErrorPoint0 } from './error.js'
import type { Request0 } from './request0.js'
import type {
  AnyNiceReadyPoint,
  Data,
  FetcherFetchDetailedResult,
  FetchOptions,
  FetchServerDetailedOutput,
  InputRaw,
  LoaderOutput,
  PointsScope,
  PrefetchPagePolicy,
  QueryKey,
} from './types.js'
import type { RedirectTask } from './navigation.js'

export type EventerSide = 'client' | 'server'

/** A log-friendly projection of an event's `data`: a plain record you can hand straight to any logger. */
export type EventerEventMeta = Record<string, unknown>

export type EventerEvent<TSide extends EventerSide, TName extends string, TData extends object> = {
  side: TSide
  name: TName
  /** The raw event payload — rich, but not always pleasant to serialize/log. */
  data: TData
  /**
   * A log-friendly projection of `data`, assembled explicitly at each emit site: points become ids, requests become `{
   * method, path }`, errors/redirects are serialized, binaries in the input are replaced with placeholders. Can be
   * nested. Safe to dump into any logger as-is.
   */
  meta: EventerEventMeta
}

export type EventerEmitFn<TError extends ErrorPoint0> = <TName extends AnyEventerEventName>(
  name: TName,
  data: Extract<AnyEventerEvent<TError>, { name: TName }>['data'],
  meta: EventerEventMeta,
) => void

export type AnyEventerSubscriptionCallback<
  TName extends AnyEventerEventName | '*' = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = (
  event: TName extends '*' ? AnyEventerEvent<TError> : Extract<AnyEventerEvent<TError>, { name: TName }>,
) => void | Promise<void>

export type ServerEventerSubscriptionCallback<
  TName extends ServerEventerEventName | '*' = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = (
  event: TName extends '*'
    ? ServerEventerEvent<TError>
    : Omit<Extract<ServerEventerEvent<TError>, { name: TName }>, 'side'> & { side: 'server' },
) => void | Promise<void>

export type ClientEventerSubscriptionCallback<
  TName extends ClientEventerEventName | '*' = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = (
  event: TName extends '*'
    ? ClientEventerEvent<TError>
    : Omit<Extract<ClientEventerEvent<TError>, { name: TName }>, 'side'> & { side: 'client' },
) => void | Promise<void>

export type EventerSubscription<
  TName extends AnyEventerEventName | '*' = any,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  side: EventerSide | undefined
  name: TName
  callback: AnyEventerSubscriptionCallback<TName, TError>
}

// pointFetchServer
export type EventerEventPointFetchServerStart = EventerEvent<
  'client' | 'server',
  'pointFetchServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointFetchServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointFetchServerSettled',
  FetchServerDetailedOutput<any, TError> & {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointFetchServerSuccess = EventerEvent<
  'client' | 'server',
  'pointFetchServerSuccess',
  Extract<FetchServerDetailedOutput<any, any>, { error: undefined }> & {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointFetchServerError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointFetchServerError',
  Extract<FetchServerDetailedOutput<any, TError>, { error: TError }> & {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>

// pointMutation
export type EventerEventPointMutationStart = EventerEvent<
  'client' | 'server',
  'pointMutationStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointMutationSettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointMutationSettled',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
  } & (
    | {
        output: LoaderOutput
        error: undefined
        redirect: undefined
      }
    | {
        output: undefined
        error: TError
        redirect: undefined
      }
    | {
        output: undefined
        error: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointMutationSuccess = EventerEvent<
  'client' | 'server',
  'pointMutationSuccess',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    error: undefined
  } & (
    | {
        output: LoaderOutput
        redirect: undefined
      }
    | {
        output: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointMutationError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointMutationError',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    error: TError
    output: undefined
    redirect: undefined
  }
>

// pointQuery
export type EventerEventPointQueryStart = EventerEvent<
  'client' | 'server',
  'pointQueryStart',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client' | 'combined'
  }
>
export type EventerEventPointQuerySettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointQuerySettled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client' | 'combined'
  } & (
    | {
        data: Data
        error: undefined
        redirect: undefined
      }
    | {
        data: undefined
        error: TError
        redirect: undefined
      }
    | {
        data: undefined
        error: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointQuerySuccess = EventerEvent<
  'client' | 'server',
  'pointQuerySuccess',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: undefined
    mode: 'server' | 'client' | 'combined'
  } & (
    | {
        data: Data
        redirect: undefined
      }
    | {
        data: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointQueryError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointQueryError',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: TError
    data: undefined
    mode: 'server' | 'client' | 'combined'
  }
>

// pointInfiniteQuery
export type EventerEventPointInfiniteQueryStart = EventerEvent<
  'client' | 'server',
  'pointInfiniteQueryStart',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client' | 'combined'
  }
>
export type EventerEventPointInfiniteQuerySettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointInfiniteQuerySettled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client' | 'combined'
  } & (
    | {
        data: Data
        error: undefined
        redirect: undefined
      }
    | {
        data: undefined
        error: TError
        redirect: undefined
      }
    | {
        data: undefined
        error: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointInfiniteQuerySuccess = EventerEvent<
  'client' | 'server',
  'pointInfiniteQuerySuccess',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: undefined
    mode: 'server' | 'client' | 'combined'
  } & (
    | {
        data: Data
        redirect: undefined
      }
    | {
        data: undefined
        redirect: RedirectTask
      }
  )
>
export type EventerEventPointInfiniteQueryError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointInfiniteQueryError',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: TError
    data: undefined
    mode: 'server' | 'client' | 'combined'
  }
>

// pointPrefetchPage
export type EventerEventPointPrefetchPageStart = EventerEvent<
  'client' | 'server',
  'pointPrefetchPageStart',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    options: {
      location?: AnyLocation
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      force?: boolean
      policy?: PrefetchPagePolicy
    }
  }
>
export type EventerEventPointPrefetchPageSettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointPrefetchPageSettled',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    options: {
      location?: AnyLocation
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      force?: boolean
      policy?: PrefetchPagePolicy
    }
    error: TError | undefined
  }
>
export type EventerEventPointPrefetchPageSuccess = EventerEvent<
  'client' | 'server',
  'pointPrefetchPageSuccess',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    options: {
      location?: AnyLocation
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      force?: boolean
      policy?: PrefetchPagePolicy
    }
    error: undefined
  }
>
export type EventerEventPointPrefetchPageError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointPrefetchPageError',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    options: {
      location?: AnyLocation
      queryClient?: QueryClient
      fetchOptions?: FetchOptions
      force?: boolean
      policy?: PrefetchPagePolicy
    }
    error: TError
  }
>

// fetcher
export type EventerEventEngineFetchStart<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'engineFetchStart',
  {
    request: Request0<any, TError>
    scope: PointsScope
  }
>
export type EventerEventEngineFetchSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'engineFetchSettled',
  {
    request: Request0<any, TError>
    scope: PointsScope
    result: FetcherFetchDetailedResult<TError>
    error: TError | undefined
  }
>
export type EventerEventEngineFetchSuccess<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'engineFetchSuccess',
  {
    request: Request0<any, TError>
    scope: PointsScope
    result: FetcherFetchDetailedResult<TError>
    error: undefined
  }
>
export type EventerEventEngineFetchError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'engineFetchError',
  {
    request: Request0<any, TError>
    scope: PointsScope
    result: FetcherFetchDetailedResult<TError>
    error: TError
  }
>

// emit
export type EventerEventEmitError<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'emitError',
  { error: TError; event: Exclude<AnyEventerEvent<TError>, EventerEventEmitError<TError>> }
>

export type AnyEventerEvent<TError extends ErrorPoint0> =
  | EventerEventEmitError<TError>
  | EventerEventPointFetchServerStart
  | EventerEventPointFetchServerSettled<TError>
  | EventerEventPointFetchServerSuccess
  | EventerEventPointFetchServerError<TError>
  | EventerEventPointQueryStart
  | EventerEventPointQuerySettled<TError>
  | EventerEventPointQuerySuccess
  | EventerEventPointQueryError<TError>
  | EventerEventPointInfiniteQueryStart
  | EventerEventPointInfiniteQuerySettled<TError>
  | EventerEventPointInfiniteQuerySuccess
  | EventerEventPointInfiniteQueryError<TError>
  | EventerEventPointMutationStart
  | EventerEventPointMutationSettled<TError>
  | EventerEventPointMutationSuccess
  | EventerEventPointMutationError<TError>
  | EventerEventPointPrefetchPageStart
  | EventerEventPointPrefetchPageSettled<TError>
  | EventerEventPointPrefetchPageSuccess
  | EventerEventPointPrefetchPageError<TError>
  | EventerEventEngineFetchStart<TError>
  | EventerEventEngineFetchSettled<TError>
  | EventerEventEngineFetchSuccess<TError>
  | EventerEventEngineFetchError<TError>

export type ClientEventerEvent<TError extends ErrorPoint0> = Extract<
  AnyEventerEvent<TError>,
  { side: 'client' | 'server' } | { side: 'client' }
>
export type ClientEventerEventName = ClientEventerEvent<any>['name']

export type ServerEventerEvent<TError extends ErrorPoint0> = Extract<
  AnyEventerEvent<TError>,
  { side: 'client' | 'server' } | { side: 'server' }
>
export type ServerEventerEventName = ServerEventerEvent<any>['name']

export type UniversalEventerEvent<TError extends ErrorPoint0> = Extract<
  AnyEventerEvent<TError>,
  { side: 'client' | 'server' }
>
export type UniversalEventerEventName = UniversalEventerEvent<any>['name']

export const uniqEventerErrorEventNames = [
  'pointMutationError',
  'pointQueryError',
  'pointInfiniteQueryError',
  'engineFetchError',
] satisfies Array<AnyEventerEventName>
export type AnyEventerEventName = AnyEventerEvent<any>['name']
export type UniqEventerErrorEventName = (typeof uniqEventerErrorEventNames)[number]
