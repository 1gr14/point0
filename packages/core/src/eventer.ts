import type { Error0 } from '@devp0nt/error0'
import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { Request0 } from './request0.js'
import type {
  AnyNiceReadyPoint,
  Data,
  FetcherFetchDetailedResult,
  FetchOptions,
  FetchServerDetailedOutput,
  InputRaw,
  LoaderOutput,
  MiddlewareFnOptions,
  PointsScope,
  PrefetchPagePolicy,
  QueryKey,
} from './types.js'

export type EventerSide = 'client' | 'server'

export type EventerEvent<TSide extends EventerSide, TName extends string, TData extends object> = {
  side: TSide
  name: TName
  data: TData
}

export type EventerEmitFn = <TName extends AnyEventerEvent['name']>(
  name: TName,
  data: Extract<AnyEventerEvent, { name: TName }>['data'],
) => void

export type AnyEventerSubscriptionCallback<TName extends AnyEventerEvent['name'] | '*' = any> = (
  event: TName extends '*' ? AnyEventerEvent : Extract<AnyEventerEvent, { name: TName }>,
) => void | Promise<void>

export type ServerEventerSubscriptionCallback<TName extends ServerEventerEvent['name'] | '*' = any> = (
  event: TName extends '*'
    ? ServerEventerEvent
    : Omit<Extract<ServerEventerEvent, { name: TName }>, 'side'> & { side: 'server' },
) => void | Promise<void>

export type ClientEventerSubscriptionCallback<TName extends ClientEventerEvent['name'] | '*' = any> = (
  event: TName extends '*'
    ? ClientEventerEvent
    : Omit<Extract<ClientEventerEvent, { name: TName }>, 'side'> & { side: 'client' },
) => void | Promise<void>

export type EventerSubscription<TName extends AnyEventerEvent['name'] | '*' = any> = {
  side: EventerSide | undefined
  name: TName
  callback: AnyEventerSubscriptionCallback<TName>
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
export type EventerEventPointFetchServerSettled = EventerEvent<
  'client' | 'server',
  'pointFetchServerSettled',
  FetchServerDetailedOutput<any> & {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointFetchServerSuccess = EventerEvent<
  'client' | 'server',
  'pointFetchServerSuccess',
  Extract<FetchServerDetailedOutput<any>, { error: undefined }> & {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointFetchServerError = EventerEvent<
  'client' | 'server',
  'pointFetchServerError',
  Extract<FetchServerDetailedOutput<any>, { error: Error0 }> & {
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
export type EventerEventPointMutationSettled = EventerEvent<
  'client' | 'server',
  'pointMutationSettled',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
  } & (
    | {
        output: LoaderOutput
        error: undefined
      }
    | {
        output: undefined
        error: Error0
      }
  )
>
export type EventerEventPointMutationSuccess = EventerEvent<
  'client' | 'server',
  'pointMutationSuccess',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    output: LoaderOutput
    error: undefined
  }
>
export type EventerEventPointMutationError = EventerEvent<
  'client' | 'server',
  'pointMutationError',
  {
    point: AnyNiceReadyPoint
    input: InputRaw
    error: Error0
    output: undefined
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
export type EventerEventPointQuerySettled = EventerEvent<
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
      }
    | {
        data: undefined
        error: Error0
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
    data: Data
    error: undefined
    mode: 'server' | 'client' | 'combined'
  }
>
export type EventerEventPointQueryError = EventerEvent<
  'client' | 'server',
  'pointQueryError',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: Error0
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
export type EventerEventPointInfiniteQuerySettled = EventerEvent<
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
      }
    | {
        data: undefined
        error: Error0
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
    data: Data
    error: undefined
    mode: 'server' | 'client' | 'combined'
  }
>
export type EventerEventPointInfiniteQueryError = EventerEvent<
  'client' | 'server',
  'pointInfiniteQueryError',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    error: Error0
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
export type EventerEventPointPrefetchPageSettled = EventerEvent<
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
    error: Error0 | undefined
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
export type EventerEventPointPrefetchPageError = EventerEvent<
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
    error: Error0
  }
>

// fetcher
export type EventerEventEngineFetchStart = EventerEvent<
  'server',
  'engineFetchStart',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
  }
>
export type EventerEventEngineFetchSettled = EventerEvent<
  'server',
  'engineFetchSettled',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
    result: FetcherFetchDetailedResult
    error: Error0 | undefined
  }
>
export type EventerEventEngineFetchSuccess = EventerEvent<
  'server',
  'engineFetchSuccess',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
    result: FetcherFetchDetailedResult
    error: undefined
  }
>
export type EventerEventEngineFetchError = EventerEvent<
  'server',
  'engineFetchError',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
    result: FetcherFetchDetailedResult
    error: Error0
  }
>

export type AnyEventerEvent =
  | EventerEventPointFetchServerStart
  | EventerEventPointFetchServerSettled
  | EventerEventPointFetchServerSuccess
  | EventerEventPointFetchServerError
  | EventerEventPointQueryStart
  | EventerEventPointQuerySettled
  | EventerEventPointQuerySuccess
  | EventerEventPointQueryError
  | EventerEventPointInfiniteQueryStart
  | EventerEventPointInfiniteQuerySettled
  | EventerEventPointInfiniteQuerySuccess
  | EventerEventPointInfiniteQueryError
  | EventerEventPointMutationStart
  | EventerEventPointMutationSettled
  | EventerEventPointMutationSuccess
  | EventerEventPointMutationError
  | EventerEventPointPrefetchPageStart
  | EventerEventPointPrefetchPageSettled
  | EventerEventPointPrefetchPageSuccess
  | EventerEventPointPrefetchPageError
  | EventerEventEngineFetchStart
  | EventerEventEngineFetchSettled
  | EventerEventEngineFetchSuccess
  | EventerEventEngineFetchError

export type ClientEventerEvent = Extract<AnyEventerEvent, { side: 'client' | 'server' } | { side: 'client' }>

export type ServerEventerEvent = Extract<AnyEventerEvent, { side: 'client' | 'server' } | { side: 'server' }>

export type UniversalEventerEvent = Extract<AnyEventerEvent, { side: 'client' | 'server' }>

export const uniqEventerErrorEventNames = [
  'pointMutationError',
  'pointQueryError',
  'pointInfiniteQueryError',
  'engineFetchError',
] satisfies Array<AnyEventerEvent['name']>
export type UniqEventerErrorEventName = (typeof uniqEventerErrorEventNames)[number]
