import type { AnyLocation } from '@1gr14/route0'
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
   * The event's error, hoisted to the envelope so handlers (especially `.on('error')`) can take it directly. Always
   * present: the error instance on error events, `undefined` on the rest. The same object also stays at `data.error`
   * wherever the raw payload carries one. (The conditional lives on the field, not the event object — making the whole
   * event distributive breaks `Extract<..., { name }>` while `TError` is still an unresolved generic.)
   */
  error: TData extends { error: infer TEventError } ? TEventError : undefined
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
  // `ErrorPoint0` (not `any`) on purpose: with `any` the `Extract` keeps the `error: any` branch (any is assignable to
  // `undefined`), so the "success" payload would leak an error member and untype the envelope `error` to `any`.
  Extract<FetchServerDetailedOutput<any, ErrorPoint0>, { error: undefined }> & {
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
/**
 * A server fetch that was CANCELLED (its `AbortSignal` fired) rather than failing — a settled, non-error outcome. Not
 * in {@link uniqEventerErrorEventNames}, so `.on('error')` never sees it. See {@link isAbortCancellation}.
 */
export type EventerEventPointFetchServerCancelled = EventerEvent<
  'client' | 'server',
  'pointFetchServerCancelled',
  {
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
    mode: 'server' | 'client'
  }
>
export type EventerEventPointQuerySettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointQuerySettled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client'
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
    mode: 'server' | 'client'
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
    mode: 'server' | 'client'
  }
>
/**
 * A query whose in-flight fetch was CANCELLED (the `AbortSignal` fired — navigation away, an unmount, a `cancelRefetch`
 * supersede) rather than failing. It is a settled, non-error outcome: TanStack reverts the query (no error in cache),
 * so this is emitted INSTEAD of `pointQueryError` and is deliberately absent from {@link uniqEventerErrorEventNames} —
 * `.on('error')` (and reporters keyed off it) stay quiet, while apps that want to count cancellations can still
 * listen.
 */
export type EventerEventPointQueryCancelled = EventerEvent<
  'client' | 'server',
  'pointQueryCancelled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client'
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
    mode: 'server' | 'client'
  }
>
export type EventerEventPointInfiniteQuerySettled<TError extends ErrorPoint0> = EventerEvent<
  'client' | 'server',
  'pointInfiniteQuerySettled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client'
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
    mode: 'server' | 'client'
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
    mode: 'server' | 'client'
  }
>
/** Infinite-query analogue of {@link EventerEventPointQueryCancelled} — a cancelled fetch, settled non-error outcome. */
export type EventerEventPointInfiniteQueryCancelled = EventerEvent<
  'client' | 'server',
  'pointInfiniteQueryCancelled',
  {
    queryKey: QueryKey
    point: AnyNiceReadyPoint
    input: InputRaw
    mode: 'server' | 'client'
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

// rsc
/**
 * A deferred subtree (see `defer`) threw while rendering on the server. This is the ONE RSC failure that ESCAPES the
 * loader error events (`pointQueryError` / `engineFetchError`): the loader already returned its shell, and the subtree
 * resolves asynchronously afterward, so its error is caught in the per-request hole registry and streamed to the client
 * (as an error fill, or replaced by a per-hole error fallback) instead of propagating out of the loader. This event
 * restores server-side observability for it — normalize/encode failures DO propagate and already surface as loader
 * errors, so they are deliberately NOT re-emitted here. Always server-side: deferred subtrees resolve and stream from
 * the server, on the initial SSR render and on client fetches alike.
 */
export type EventerEventRscError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'rscError',
  {
    error: TError
    /** The point whose loader produced the deferred subtree, e.g. `page "home"` — undefined when the label is unknown. */
    label: string | undefined
    /** The deferred hole's id (see `defer`). */
    holeId: string
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
  | EventerEventRscError<TError>
  | EventerEventPointFetchServerStart
  | EventerEventPointFetchServerSettled<TError>
  | EventerEventPointFetchServerSuccess
  | EventerEventPointFetchServerError<TError>
  | EventerEventPointFetchServerCancelled
  | EventerEventPointQueryStart
  | EventerEventPointQuerySettled<TError>
  | EventerEventPointQuerySuccess
  | EventerEventPointQueryError<TError>
  | EventerEventPointQueryCancelled
  | EventerEventPointInfiniteQueryStart
  | EventerEventPointInfiniteQuerySettled<TError>
  | EventerEventPointInfiniteQuerySuccess
  | EventerEventPointInfiniteQueryError<TError>
  | EventerEventPointInfiniteQueryCancelled
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
  'rscError',
] satisfies Array<AnyEventerEventName>
export type AnyEventerEventName = AnyEventerEvent<any>['name']
export type UniqEventerErrorEventName = (typeof uniqEventerErrorEventNames)[number]
