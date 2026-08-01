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

// pointSubscription — one subscription stream attempt, split by side: the SERVER family fires per streamed response
// (the loader running), the CLIENT family per fetch attempt (`attempt` counts the reconnects — 0 is the first; there
// is no separate reconnect event, a reconnect is the next Start with `attempt > 0`; the consumer's own deliberate
// stop — an unmount, breaking out of the loop — emits nothing further). `Data` fires on every streamed
// value — the eventer is in-process, per-yield granularity is deliberate.
export type EventerEventPointSubscriptionServerStart = EventerEvent<
  'server',
  'pointSubscriptionServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointSubscriptionServerData = EventerEvent<
  'server',
  'pointSubscriptionServerData',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** one streamed value — a loader yield, as it goes out */
    value: unknown
  }
>
export type EventerEventPointSubscriptionServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointSubscriptionServerSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  } & (
    | {
        /** the loader completed (`d` line) — an answer */
        outcome: 'completed'
        error: undefined
      }
    | {
        /** a typed error (loader throw) — an answer */
        outcome: 'failed'
        error: TError
      }
    | {
        /** the consumer went away mid-stream */
        outcome: 'broken'
        error: undefined
      }
  )
>
export type EventerEventPointSubscriptionServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointSubscriptionServerError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    error: TError
  }
>
export type EventerEventPointSubscriptionClientStart = EventerEvent<
  'client',
  'pointSubscriptionClientStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** 0 on the first attempt; a reconnect after a BROKEN stream increments it */
    attempt: number
  }
>
export type EventerEventPointSubscriptionClientData = EventerEvent<
  'client',
  'pointSubscriptionClientData',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** one streamed value, as it arrives */
    value: unknown
  }
>
export type EventerEventPointSubscriptionClientSettled<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointSubscriptionClientSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  } & (
    | {
        /** the loader completed (`d` line) — an answer, never restarted */
        outcome: 'completed'
        error: undefined
      }
    | {
        /** a typed error (`e` line / non-2xx) — an answer, never restarted */
        outcome: 'failed'
        error: TError
      }
    | {
        /** the bytes just stopped (a network drop) — what `reconnect` retries */
        outcome: 'broken'
        error: undefined
      }
  )
>
export type EventerEventPointSubscriptionClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointSubscriptionClientError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    error: TError
  }
>

// pointChannelConnect — a channel connect, split by side: the SERVER family fires around the connector execution (its
// data carries the identity the connector produced), the CLIENT family around the connect request. Two different
// operations — two event families, not one name on two sides.
//
// The CLIENT family settles at the CLAIM, not at the connect request's answer: a connect POST only earns a ticket, and
// what the claim answers is the connect's real outcome — `Success` therefore means a LIVE connection (its markers are
// the ones `onConnect` just read, not a guess made a round trip earlier), and `Error` covers the claim refusals too (a
// throwing `.enroller`, the `maxConnections` cap, a lapsed connection record, a ticket that no longer resolves) next
// to the connect request's own failures. That is why the claim needs no client event of its own — the family already
// reports it; the server's `pointChannelClaimServerError` exists because the SERVER family cannot (it fires at
// connector time, before the claim). Every `Start` gets exactly one settle: from the claim (the cold-start upgrade
// reaches the same one), from a connect request that never earned a ticket, or from a socket that died with the claim
// unanswered. The single exception is a connection DISPOSED mid-attempt (unmount, `disconnect()`, a logout), which
// abandons its family the way a cancelled operation does.
//
// The family carries the same counters/markers as the lifecycle callbacks: `connectionIndex` on every phase
// (successful claims BEFORE this operation — 0 = the first connect, > 0 = a re-connect), `resumed`/`gapless` on the
// successful outcome only (they are the ENTRY's verdict — a failed connect has no entry to describe, and a refused
// resume falls back into the full connect silently). A landed RESUME closes the family with `Settled`/`Success`
// (`resumed: true`, `gapless` = the server's proof) WITHOUT a `Start`: the resume is one shared frame at the socket's
// open, not a per-connection client operation, and its fallback path runs the full family cycle — a resume `Start`
// would dangle there.
export type EventerEventPointChannelConnectServerStart = EventerEvent<
  'server',
  'pointChannelConnectServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointChannelConnectServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointChannelConnectServerSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  } & (
    | {
        connectionId: string
        /** the connector's return — the connection's identity (server knowledge, never on the client family) */
        identity: unknown
        error: undefined
      }
    | {
        connectionId: undefined
        identity: undefined
        error: TError
      }
  )
>
export type EventerEventPointChannelConnectServerSuccess = EventerEvent<
  'server',
  'pointChannelConnectServerSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the connector's return — the connection's identity (server knowledge, never on the client family) */
    identity: unknown
    error: undefined
  }
>
export type EventerEventPointChannelConnectServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointChannelConnectServerError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: undefined
    identity: undefined
    error: TError
  }
>
export type EventerEventPointChannelConnectClientStart = EventerEvent<
  'client',
  'pointChannelConnectClientStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** successful claims before this operation — 0 = the first connect, > 0 = a re-connect */
    connectionIndex: number
  }
>
export type EventerEventPointChannelConnectClientSettled<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointChannelConnectClientSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** successful claims before this operation — 0 = the first connect, > 0 = a re-connect */
    connectionIndex: number
  } & (
    | {
        connectionId: string
        /** the entry rode the resume path — no connect request, no connector run */
        resumed: boolean
        /**
         * the proof that nothing was missed — `true` on the first entry and on a fully-covered resume (the server's
         * verdict there; on the full path the claim reads it as `index === 0`)
         */
        gapless: boolean
        error: undefined
      }
    | {
        /** no connection went live — a refused connect request and a refused CLAIM alike name none */
        connectionId: undefined
        error: TError
      }
  )
>
export type EventerEventPointChannelConnectClientSuccess = EventerEvent<
  'client',
  'pointChannelConnectClientSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** successful claims before this operation — 0 = the first connect, > 0 = a re-connect */
    connectionIndex: number
    /** the entry rode the resume path — no connect request, no connector run */
    resumed: boolean
    /**
     * the proof that nothing was missed — `true` on the first entry and on a fully-covered resume (the server's verdict
     * there; on the full path the claim reads it as `index === 0`)
     */
    gapless: boolean
    error: undefined
  }
>
export type EventerEventPointChannelConnectClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointChannelConnectClientError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: undefined
    /** successful claims before this operation — 0 = the first connect, > 0 = a re-connect */
    connectionIndex: number
    error: TError
  }
>

// pointChannelOpenServer / pointChannelCloseServer — a connection actually became live (its ticket was claimed on a socket) /
// went away. Server-only, single events (state transitions, not operations): pointChannelConnectServer* fires at
// connector time, which is BEFORE the claim, so "connect succeeded" does not yet mean a live connection.
export type EventerEventPointChannelOpenServer = EventerEvent<
  'server',
  'pointChannelOpenServer',
  {
    point: AnyNiceReadyPoint
    connectionId: string
    identity: unknown
    /** the connection came back through a RESUME (an unpark or a KV restore) — no connector ran for this open */
    resumed: boolean
  }
>
export type EventerEventPointChannelCloseServer = EventerEvent<
  'server',
  'pointChannelCloseServer',
  {
    point: AnyNiceReadyPoint
    connectionId: string
    identity: unknown
    /** what closed it: the client (`close`), the socket dying (`socket`), or a server-side kick (`kick`) */
    reason: 'close' | 'socket' | 'kick'
  }
>
/**
 * A connection failed to CLAIM its place on the socket — every refusal the client meets as a `claimErr` frame: an
 * unknown, expired, already-claiming or foreign-scope ticket, a connection record that lapsed (the cold-start upgrade's
 * seed included), a channel point the record names and this server does not have, the channel's `maxConnections` cap,
 * and an `.enroller` that threw during the connection setup. Server-only, single event: nothing started, so there is
 * nothing to settle. It fills the gap `pointChannelConnectServer*` cannot cover — that family fires at connector time,
 * BEFORE the claim, so a connect that succeeded is not yet a live connection and a claim that never landed would
 * otherwise be invisible to the server. The client side needs no single of its own: its family SETTLES at the claim, so
 * the same refusal closes `pointChannelConnectClient*` with `Settled`/`Error` right where the connect it belongs to
 * ends. How much the payload knows depends on how early the refusal came — a refused ticket names neither channel nor
 * connection.
 */
export type EventerEventPointChannelClaimServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointChannelClaimServerError',
  {
    scope: PointsScope
    /** the channel the claim was for — `undefined` when the refusal came before the record resolved to a point */
    point: AnyNiceReadyPoint | undefined
    /** the connection the claim was for — `undefined` when the refusal came before a cid was known */
    connectionId: string | undefined
    /**
     * what refused it: the `ticket` (unknown, expired, racing, or minted for another scope — one answer, no oracle),
     * the `connection` record (lapsed, or a cold-start upgrade seed that timed out), the `channel` point (gone from
     * this build), `maxConnections` (the channel's per-socket cap), or an `enroller` throw
     */
    reason: 'ticket' | 'connection' | 'channel' | 'maxConnections' | 'enroller'
    error: TError
  }
>

// pointHandler — a socket message, split by side: the SERVER family fires around `.serverReply` (its data carries
// the sender's identity), the CLIENT family around a clientHandler dispatch. Different operations — different events.
// The payload field is `input` on BOTH sides on purpose — the one family shared with the server side keeps the wire
// vocabulary (the payload-naming law's deliberate lower-layer exception; the user-facing push surfaces say `message`).
// The SERVER family covers a message that reached its point: `Start` fires above the `.clientSend` parse, so a refused
// input closes the family with Settled/Error like any other failure. A message the ENGINE refused before that — an
// unknown connection, an oversized frame, a handler that does not exist, a room the sender is not in — never reaches a
// point and rides `socketServerSendRefused` instead.
export type EventerEventPointHandlerServerStart = EventerEvent<
  'server',
  'pointHandlerServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the sending connection's identity (server knowledge, never on the client family) */
    identity: unknown
  }
>
export type EventerEventPointHandlerServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointHandlerServerSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the sending connection's identity (server knowledge, never on the client family) */
    identity: unknown
  } & (
    | {
        output: unknown
        error: undefined
      }
    | {
        output: undefined
        error: TError
      }
  )
>
export type EventerEventPointHandlerServerSuccess = EventerEvent<
  'server',
  'pointHandlerServerSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the sending connection's identity (server knowledge, never on the client family) */
    identity: unknown
    output: unknown
    error: undefined
  }
>
export type EventerEventPointHandlerServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointHandlerServerError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the sending connection's identity (server knowledge, never on the client family) */
    identity: unknown
    output: undefined
    error: TError
  }
>
/**
 * A `.serverReply` threw AFTER its imperative `reply()` had already answered the client. This is the ONE serverHandler
 * failure that escapes `pointHandlerServerError`: the message settled the moment `reply()` fired (`Settled`/`Success`
 * with the replied output already emitted, the envelope already framed), so the throw that follows cannot change the
 * answer, cannot reach the sender, and must not re-settle the operation. It fires here instead — the late half of a
 * message whose visible half succeeded, and the one way an app's `.on('error')` (and through it Sentry) learns that the
 * work after the reply — the writes, the pushes, the fan-out an early `reply()` exists to keep going — actually failed.
 * Server-only, single event: no phases, nothing to settle, `onAfterServerReply` already ran with the replied output.
 */
export type EventerEventPointHandlerServerLateError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointHandlerServerLateError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the sending connection's identity (server knowledge, never on the client family) */
    identity: unknown
    error: TError
  }
>
export type EventerEventPointHandlerClientStart = EventerEvent<
  'client',
  'pointHandlerClientStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
  }
>
export type EventerEventPointHandlerClientSettled<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointHandlerClientSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
  } & (
    | {
        output: unknown
        error: undefined
      }
    | {
        output: undefined
        error: TError
      }
  )
>
export type EventerEventPointHandlerClientSuccess = EventerEvent<
  'client',
  'pointHandlerClientSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    output: unknown
    error: undefined
  }
>
export type EventerEventPointHandlerClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointHandlerClientError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    output: undefined
    error: TError
  }
>

// pointHandlerSend — the TRANSPORT altitude of a socket message: the act of TRANSMITTING one, named for the side that
// transmits. `pointHandlerSendClient*` wraps a client's `serverHandler.sendToServer()`; `pointHandlerSendServer*` wraps
// a server's `clientHandler.sendToClient()`. The altitude split is the socket's answer to `engineFetch*` vs
// `pointQuery*` on the HTTP side: the execution families above (`pointHandlerServer*` / `pointHandlerClient*`) report
// the RECEIVING side RUNNING the message — a `.serverReply` that ran, a clientHandler dispatch that dispatched — and
// they can only fire once a frame arrived somewhere. A send that never left (no connection, a dead socket, a timeout, a
// refused claim) produces no execution event anywhere, and until these families existed it produced nothing at all: the
// one thing every family described was work, and nothing described the wire. Now the transmitting side always closes
// its own operation, whatever the transport did.
//
// Both keep the family's `input` vocabulary (the wire's word for the payload; the user-facing push surfaces say
// `message`) and the four phases, `Settled` on either outcome. What "success" means is per side and deliberately
// modest: the CLIENT family succeeds when the server's `reply` frame resolves the send (the round trip is the client's
// contract — `sendToServer` resolves with the `.serverReply` return), the SERVER family succeeds when the engine
// ACCEPTED the frame for delivery. A push is fire-and-forget by design: nothing on the server waits for a client to
// receive it, so `pointHandlerSendServerSuccess` says "handed to the transport", never "delivered" (the collect window
// of `sendToClient(..., replies)` is the surface for answers, and it is not this family's business).
export type EventerEventPointHandlerSendClientStart = EventerEvent<
  'client',
  'pointHandlerSendClientStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** the connection the send rides — `undefined` while it is still unresolved (the target is picked after `Start`) */
    connectionId: string | undefined
  }
>
export type EventerEventPointHandlerSendClientSettled<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointHandlerSendClientSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    /** the connection the send rode — `undefined` when it failed before one could be resolved */
    connectionId: string | undefined
  } & (
    | {
        /** the `.serverReply` return, as the sender received it */
        output: unknown
        error: undefined
      }
    | {
        output: undefined
        error: TError
      }
  )
>
export type EventerEventPointHandlerSendClientSuccess = EventerEvent<
  'client',
  'pointHandlerSendClientSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string | undefined
    /** the `.serverReply` return, as the sender received it */
    output: unknown
    error: undefined
  }
>
/**
 * A `serverHandler.sendToServer()` that never resolved — every failure mode of the transmit converges here: no live
 * connection to ride, the socket dying before or after the frame left, a `queue: false` send meeting a closed socket, a
 * refused claim, the send timeout, and the server's own `sendErr` (the `.serverReply` refusal, arriving as the typed
 * error the sender would have thrown). This is what gives the documented fire-and-forget call — `void
 * handler.sendToServer(...)`, where nobody awaits the promise — a place to be seen: the name sits in
 * `uniqEventerErrorEventNames`, so one `.on('error')` on the root reports it like any other failure.
 */
export type EventerEventPointHandlerSendClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointHandlerSendClientError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string | undefined
    output: undefined
    error: TError
  }
>
export type EventerEventPointHandlerSendServerStart = EventerEvent<
  'server',
  'pointHandlerSendServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  }
>
export type EventerEventPointHandlerSendServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointHandlerSendServerSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
  } & ({ error: undefined } | { error: TError })
>
export type EventerEventPointHandlerSendServerSuccess = EventerEvent<
  'server',
  'pointHandlerSendServerSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    error: undefined
  }
>
/**
 * A `clientHandler.sendToClient()` that never reached the transport: an untargetable push (a room on a handler with no
 * space, a `$where` in a matcher), a message the transformer could not serialize, or the engine's dispatch throwing —
 * no socket adapter on this process, say. It does NOT fire for a push that reached nobody: an addressed room with no
 * members is an ordinary successful send, exactly like a broadcast into an empty channel.
 */
export type EventerEventPointHandlerSendServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointHandlerSendServerError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    error: TError
  }
>

// pointSpaceJoin — a space join, split by side: the SERVER family fires around the `.joiner`/`.enroller` execution
// (its data carries the identity), the CLIENT family around the join frame. `Success` carries the rooms the server
// admitted the client into (`[]` = a clean deny). The CLIENT family carries the lifecycle counters/markers like the
// connect family: `membershipIndex` on every phase, `resumed`/`gapless` on the successful outcome (a landed resume
// closes with `Settled`/`Success` and no `Start` — no join frame was sent). The SERVER family carries `resumed` on the
// phases a resume can reach (`Start`, `Settled`'s success side, `Success`): the resume re-announces (an unpark, a KV
// restore) ride the family `Start` included, so the flag is what tells a re-announce from a real `.joiner`/`.enroller`
// run. An errored join is never a resume (a refused resume never reaches the family), so the error side carries none.
export type EventerEventPointSpaceJoinServerStart = EventerEvent<
  'server',
  'pointSpaceJoinServerStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the joining connection's identity (server knowledge, never on the client family) */
    identity: unknown
    /** a resume re-announce (an unpark or a KV restore) — the rooms were restored, no `.joiner`/`.enroller` ran */
    resumed: boolean
  }
>
export type EventerEventPointSpaceJoinServerSettled<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointSpaceJoinServerSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the joining connection's identity (server knowledge, never on the client family) */
    identity: unknown
  } & (
    | {
        rooms: unknown[]
        error: undefined
        /** a resume re-announce (an unpark or a KV restore) — the rooms were restored, no `.joiner`/`.enroller` ran */
        resumed: boolean
      }
    | {
        rooms: undefined
        error: TError
      }
  )
>
export type EventerEventPointSpaceJoinServerSuccess = EventerEvent<
  'server',
  'pointSpaceJoinServerSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the joining connection's identity (server knowledge, never on the client family) */
    identity: unknown
    /** a resume re-announce (an unpark or a KV restore) — the rooms were restored, no `.joiner`/`.enroller` ran */
    resumed: boolean
    rooms: unknown[]
    error: undefined
  }
>
export type EventerEventPointSpaceJoinServerError<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'pointSpaceJoinServerError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** the joining connection's identity (server knowledge, never on the client family) */
    identity: unknown
    rooms: undefined
    error: TError
  }
>
export type EventerEventPointSpaceJoinClientStart = EventerEvent<
  'client',
  'pointSpaceJoinClientStart',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** successful joins before this operation — 0 = the first join, > 0 = a replay */
    membershipIndex: number
  }
>
export type EventerEventPointSpaceJoinClientSettled<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointSpaceJoinClientSettled',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** successful joins before this operation — 0 = the first join, > 0 = a replay */
    membershipIndex: number
  } & (
    | {
        rooms: unknown[]
        /** the entry rode the resume path — no join frame, no `.joiner` run */
        resumed: boolean
        /**
         * the proof that nothing was missed — `true` on the first entry and on a fully-covered resume (the server's
         * verdict there; on the full path the client computes it as `index === 0`)
         */
        gapless: boolean
        error: undefined
      }
    | {
        rooms: undefined
        error: TError
      }
  )
>
export type EventerEventPointSpaceJoinClientSuccess = EventerEvent<
  'client',
  'pointSpaceJoinClientSuccess',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** successful joins before this operation — 0 = the first join, > 0 = a replay */
    membershipIndex: number
    rooms: unknown[]
    /** the entry rode the resume path — no join frame, no `.joiner` run */
    resumed: boolean
    /**
     * the proof that nothing was missed — `true` on the first entry and on a fully-covered resume (the server's verdict
     * there; on the full path the client computes it as `index === 0`)
     */
    gapless: boolean
    error: undefined
  }
>
export type EventerEventPointSpaceJoinClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'pointSpaceJoinClientError',
  {
    input: InputRaw
    point: AnyNiceReadyPoint
    connectionId: string
    /** successful joins before this operation — 0 = the first join, > 0 = a replay */
    membershipIndex: number
    rooms: undefined
    error: TError
  }
>

// pointSpaceLeaveServer — a membership leaving its rooms. Server-only, single event (a state transition): the client
// released its last hold (`leave`), the socket died (`socket`), a room was closed by a kick (`kick`), or the
// connection itself closed (`close`).
export type EventerEventPointSpaceLeaveServer = EventerEvent<
  'server',
  'pointSpaceLeaveServer',
  {
    point: AnyNiceReadyPoint
    connectionId: string
    identity: unknown
    /** the rooms that LEFT in this change (parsed) — not the rooms the connection still holds */
    rooms: unknown[]
    /**
     * what took them out: the client's `leave` frame, the socket dying, a `space.kick`/`channel.kick`, or the
     * connection itself closing
     */
    reason: 'leave' | 'socket' | 'kick' | 'close'
  }
>

// socket — socket-level lifecycle, split by side: the SERVER family is a socket landing on / leaving this process,
// the CLIENT family is the one client WebSocket opening, closing, and coming back.
/**
 * The bare `websocket` endpoint (`GET /_point0/<scope>/websocket` + `Upgrade`) accepted an upgrade — emitted when the
 * fetch pipeline's handler answers the upgrade-marker response, i.e. after every middleware passed it through. The
 * socket itself lands as `socketServerConnect` once the handshake completes.
 */
export type EventerEventSocketServerUpgrade = EventerEvent<
  'server',
  'socketServerUpgrade',
  {
    scope: PointsScope
  }
>
export type EventerEventSocketServerConnect = EventerEvent<
  'server',
  'socketServerConnect',
  {
    scope: PointsScope
  }
>
export type EventerEventSocketServerDisconnect = EventerEvent<
  'server',
  'socketServerDisconnect',
  {
    scope: PointsScope
  }
>
/**
 * The engine refused an incoming `sendToServer` BEFORE any point ran: the frame named a connection this socket does not
 * hold, it went past the channel's `maxMessageSize`, its serverHandler does not exist — or belongs to another channel,
 * which is the same refusal (no oracle) — or the connection is not in the room the send addressed. Server-only, single
 * event: nothing executed, so there is nothing to settle. Distinct from `pointHandlerServerError`, which is a
 * `.serverReply` that RAN and threw; this one never reached the point. The sender sees the same `sendErr` either way
 * and reports it as `pointHandlerSendClientError` on its side — this is what puts the refusal in front of the SERVER's
 * `.on('error')`, where abuse and misconfiguration are the readings that matter.
 */
export type EventerEventSocketServerSendRefused<TError extends ErrorPoint0> = EventerEvent<
  'server',
  'socketServerSendRefused',
  {
    scope: PointsScope
    /**
     * what refused it: the cid named a connection this socket does not hold (`unknownConnection`), the frame was over
     * the channel's `maxMessageSize` (`tooLarge`), no serverHandler of this channel answers that name
     * (`handlerNotFound`), or the space membership does not cover the addressed room (`notInRoom`)
     */
    reason: 'unknownConnection' | 'tooLarge' | 'handlerNotFound' | 'notInRoom'
    /** the serverHandler the frame named, as it came off the wire — on `handlerNotFound` it resolves to nothing */
    handlerName: string | undefined
    /** the connection the frame claimed to ride — on `unknownConnection` this socket holds no such cid */
    connectionId: string | undefined
    error: TError
  }
>
/**
 * The one client WebSocket completed its handshake — fired on every successful open, the first and the re-opens alike
 * (there is no separate reconnect event; `socketIndex` is the first-vs-repeat distinction, mirroring the lifecycle
 * callbacks' `connectionIndex`/`membershipIndex`). No `resumed`/`gapless` here: those are per-connection entry verdicts
 * — the transport itself always opens with a fresh handshake. The emit rides a channel point of the scope, so a socket
 * held with ZERO connections (a bare `<Socket>` hold before any channel connects) opens silently — the event exists
 * from the first connection on.
 */
export type EventerEventSocketClientConnect = EventerEvent<
  'client',
  'socketClientConnect',
  {
    scope: PointsScope
    /** successful opens of the socket before this one — 0 = the first open, > 0 = a reopen */
    socketIndex: number
  }
>
export type EventerEventSocketClientDisconnect = EventerEvent<
  'client',
  'socketClientDisconnect',
  {
    scope: PointsScope
  }
>
/**
 * The one client WebSocket failed as a TRANSPORT: it never came up (`reason: 'open'` — the browser's `error` event,
 * which carries no detail by design, so the payload's error is the framework's own typed one), or its reconnect backoff
 * ran out of attempts (`reason: 'exhausted'` — every held connection flips to `closed` and nothing re-opens the socket
 * until a `reconnectAll()` or a remount). Client-only, single event. Distinct from `socketClientDisconnect`, which is a
 * socket that WAS up and closed — an ordinary drop the reconnect answers, not a failure. Like the other client socket
 * singles the emit rides a channel point of the scope, so a socket held with ZERO connections (a bare `<Socket>` hold)
 * fails silently — there is no point to emit through.
 */
export type EventerEventSocketClientError<TError extends ErrorPoint0> = EventerEvent<
  'client',
  'socketClientError',
  {
    scope: PointsScope
    /** successful opens of the socket before this failure — 0 = it never opened at all */
    socketIndex: number
    /** the socket never opened (`open`), or the reconnect policy gave up on re-opening it (`exhausted`) */
    reason: 'open' | 'exhausted'
    error: TError
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
    /**
     * The point whose loader produced the deferred subtree, e.g. `root:page:home` — undefined when the label is
     * unknown.
     */
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
  | EventerEventPointSubscriptionServerStart
  | EventerEventPointSubscriptionServerData
  | EventerEventPointSubscriptionServerSettled<TError>
  | EventerEventPointSubscriptionServerError<TError>
  | EventerEventPointSubscriptionClientStart
  | EventerEventPointSubscriptionClientData
  | EventerEventPointSubscriptionClientSettled<TError>
  | EventerEventPointSubscriptionClientError<TError>
  | EventerEventPointChannelConnectServerStart
  | EventerEventPointChannelConnectServerSettled<TError>
  | EventerEventPointChannelConnectServerSuccess
  | EventerEventPointChannelConnectServerError<TError>
  | EventerEventPointChannelConnectClientStart
  | EventerEventPointChannelConnectClientSettled<TError>
  | EventerEventPointChannelConnectClientSuccess
  | EventerEventPointChannelConnectClientError<TError>
  | EventerEventPointChannelOpenServer
  | EventerEventPointChannelCloseServer
  | EventerEventPointChannelClaimServerError<TError>
  | EventerEventPointHandlerServerStart
  | EventerEventPointHandlerServerSettled<TError>
  | EventerEventPointHandlerServerSuccess
  | EventerEventPointHandlerServerError<TError>
  | EventerEventPointHandlerServerLateError<TError>
  | EventerEventPointHandlerClientStart
  | EventerEventPointHandlerClientSettled<TError>
  | EventerEventPointHandlerClientSuccess
  | EventerEventPointHandlerClientError<TError>
  | EventerEventPointHandlerSendClientStart
  | EventerEventPointHandlerSendClientSettled<TError>
  | EventerEventPointHandlerSendClientSuccess
  | EventerEventPointHandlerSendClientError<TError>
  | EventerEventPointHandlerSendServerStart
  | EventerEventPointHandlerSendServerSettled<TError>
  | EventerEventPointHandlerSendServerSuccess
  | EventerEventPointHandlerSendServerError<TError>
  | EventerEventPointSpaceJoinServerStart
  | EventerEventPointSpaceJoinServerSettled<TError>
  | EventerEventPointSpaceJoinServerSuccess
  | EventerEventPointSpaceJoinServerError<TError>
  | EventerEventPointSpaceJoinClientStart
  | EventerEventPointSpaceJoinClientSettled<TError>
  | EventerEventPointSpaceJoinClientSuccess
  | EventerEventPointSpaceJoinClientError<TError>
  | EventerEventPointSpaceLeaveServer
  | EventerEventSocketServerUpgrade
  | EventerEventSocketServerConnect
  | EventerEventSocketServerDisconnect
  | EventerEventSocketServerSendRefused<TError>
  | EventerEventSocketClientConnect
  | EventerEventSocketClientDisconnect
  | EventerEventSocketClientError<TError>
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
  'pointChannelConnectServerError',
  'pointChannelConnectClientError',
  'pointChannelClaimServerError',
  'pointHandlerServerError',
  'pointHandlerServerLateError',
  'pointHandlerClientError',
  'pointHandlerSendClientError',
  'pointHandlerSendServerError',
  'pointSpaceJoinServerError',
  'pointSpaceJoinClientError',
  'pointSubscriptionServerError',
  'pointSubscriptionClientError',
  'socketServerSendRefused',
  'socketClientError',
  'engineFetchError',
  'rscError',
] satisfies Array<AnyEventerEventName>
export type AnyEventerEventName = AnyEventerEvent<any>['name']
export type UniqEventerErrorEventName = (typeof uniqEventerErrorEventNames)[number]
