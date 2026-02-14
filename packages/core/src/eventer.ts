import type { Error0 } from '@devp0nt/error0'
import type {
  AnyNiceReadyPoint,
  Data,
  FetcherFetchDetailedResult,
  FetchOptions,
  FetchServerDetailedOutput,
  InputRaw,
  LoaderOutput,
  MiddlewareFnOptions,
  PrefetchPagePolicy,
  PointsScope,
  QueryKey,
} from './types.js'
import type { AnyLocation } from '@devp0nt/route0'
import type { QueryClient } from '@tanstack/react-query'
import type { Request0 } from './request0.js'

export type EventerTarget = 'client' | 'server'

export type EventerEvent<TTarget extends EventerTarget, TName extends string, TData extends object> = {
  target: TTarget
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
    : Omit<Extract<ServerEventerEvent, { name: TName }>, 'target'> & { target: 'server' },
) => void | Promise<void>
export type ClientEventerSubscriptionCallback<TName extends ClientEventerEvent['name'] | '*' = any> = (
  event: TName extends '*'
    ? ClientEventerEvent
    : Omit<Extract<ClientEventerEvent, { name: TName }>, 'target'> & { target: 'client' },
) => void | Promise<void>

export type EventerSubscription<TName extends AnyEventerEvent['name'] | '*' = any> = {
  target: EventerTarget | undefined
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
export type EventerEventFetcherStart = EventerEvent<
  'server',
  'fetcherStart',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
  }
>
export type EventerEventFetcherSettled = EventerEvent<
  'server',
  'fetcherSettled',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
    result: FetcherFetchDetailedResult
    error: Error0 | undefined
  }
>
export type EventerEventFetcherSuccess = EventerEvent<
  'server',
  'fetcherSuccess',
  {
    request: Request0
    scope: PointsScope
    variant: MiddlewareFnOptions['variant']
    point: AnyNiceReadyPoint | undefined
    result: FetcherFetchDetailedResult
    error: undefined
  }
>
export type EventerEventFetcherError = EventerEvent<
  'server',
  'fetcherError',
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
  | EventerEventFetcherStart
  | EventerEventFetcherSettled
  | EventerEventFetcherSuccess
  | EventerEventFetcherError

export type ClientEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' } | { target: 'client' }>

export type ServerEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' } | { target: 'server' }>

export type UniversalEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' }>
