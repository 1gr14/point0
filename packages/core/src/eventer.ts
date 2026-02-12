import type { Error0 } from '@devp0nt/error0'
import type { AnyPoint, FetchServerDetailedOutput, InputRaw } from './types.js'

export type EventerTarget = 'client' | 'server'

export type EventerEvent<TTarget extends EventerTarget, TName extends string, TData extends object> = {
  target: TTarget
  name: TName
  data: TData
}

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

export type EventerEventPointFetchServerStart = EventerEvent<
  'client' | 'server',
  'pointFetchServerStart',
  {
    input: InputRaw
    point: AnyPoint
  }
>
export type EventerEventPointFetchServerSettled = EventerEvent<
  'client' | 'server',
  'pointFetchServerSettled',
  FetchServerDetailedOutput<any> & {
    input: InputRaw
    point: AnyPoint
  }
>
export type EventerEventPointFetchServerSuccess = EventerEvent<
  'client' | 'server',
  'pointFetchServerSuccess',
  Extract<FetchServerDetailedOutput<any>, { error: null }> & {
    input: InputRaw
    point: AnyPoint
  }
>
export type EventerEventPointFetchServerError = EventerEvent<
  'client' | 'server',
  'pointFetchServerError',
  Extract<FetchServerDetailedOutput<any>, { error: Error0 }> & {
    input: InputRaw
    point: AnyPoint
  }
>

export type AnyEventerEvent =
  | EventerEventPointFetchServerStart
  | EventerEventPointFetchServerSettled
  | EventerEventPointFetchServerSuccess
  | EventerEventPointFetchServerError

export type ClientEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' } | { target: 'client' }>

export type ServerEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' } | { target: 'server' }>

export type UniversalEventerEvent = Extract<AnyEventerEvent, { target: 'client' | 'server' }>
