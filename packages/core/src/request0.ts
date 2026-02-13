import type { AnyLocation } from '@devp0nt/route0'
import { Route0 } from '@devp0nt/route0'
import { _point0_env } from './env.js'
import { _ssItems } from './internals.js'
import type { InputParsed, InputRawUnknown, InputSchema, UndefinedInputSchema } from './types.js'

export class Request0<
  TInputWasExtracted extends boolean = boolean,
  TServerInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> {
  // export class Request0<
  //   TInputWasExtracted extends boolean,
  //   TServerInputSchema extends InputSchema | UndefinedInputSchema,
  // > {
  original: Request
  headers: RequestHeaders
  cookies: RequestCookies
  location: AnyLocation
  method: RequestMethod
  from: RequestFrom
  id: string
  state: Record<string, unknown>
  input: RequestInput<TInputWasExtracted, TServerInputSchema>
  body: RequestBody<TInputWasExtracted>

  constructor({
    original,
    headers,
    cookies,
    location,
    method,
    from,
    id,
    state,
    input,
    body,
  }: {
    original: Request
    headers: RequestHeaders
    cookies: RequestCookies
    location: AnyLocation
    method: RequestMethod
    from: RequestFrom
    id: string
    state: Record<string, unknown>
    input: RequestInput<TInputWasExtracted, TServerInputSchema>
    body: RequestBody<TInputWasExtracted>
  }) {
    this.original = original
    this.headers = headers
    this.cookies = cookies
    this.location = location
    this.method = method
    this.from = from
    this.state = state
    this.id = id
    this.input = input
    this.body = body
  }

  static create(
    original: Request,
    options: {
      bunServer?: { requestIP: (request: Request) => { address: string } | null }
      id: string
      isFromServer: boolean
      state?: Record<string, unknown>
    },
  ): Request0 {
    const { bunServer, id, isFromServer, state = {} } = options
    // Parse headers
    const headers: RequestHeaders = {}
    original.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Parse cookies
    const cookies: RequestCookies = {}
    const cookieHeader = original.headers.get('cookie')
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie) => {
        const [name, ...valueParts] = cookie.trim().split('=')
        if (name) {
          cookies[name] = valueParts.join('=')
        }
      })
    }

    // Get location from URL
    const location = Route0.getLocation(original.url)

    // Extract method
    const method = original.method.toUpperCase() as RequestMethod

    // Extract IP addresses
    // Prioritize Bun's requestIP (more trusted, can't be spoofed)
    const ipsSet = new Set<string>()
    if (bunServer) {
      try {
        const requestIP = bunServer.requestIP(original)
        if (requestIP?.address) {
          ipsSet.add(requestIP.address)
        }
      } catch {
        // Ignore errors if requestIP is not available
      }
    }

    // Also collect IPs from headers (Bun's requestIP is prioritized as ips[0])
    const forwardedFor = original.headers.get('x-forwarded-for')
    if (forwardedFor) {
      forwardedFor.split(',').forEach((ip) => ipsSet.add(ip.trim()))
    }
    const realIp = original.headers.get('x-real-ip')
    if (realIp) {
      ipsSet.add(realIp)
    }
    const cfConnectingIp = original.headers.get('cf-connecting-ip')
    if (cfConnectingIp) {
      ipsSet.add(cfConnectingIp)
    }

    // Extract user agent
    const userAgent = original.headers.get('user-agent') || null

    // Extract from scope from headers (if available)
    const fromScope = original.headers.get('X-Point0-From-Scope') || null

    // Extract referrer location
    const referrerUrl = original.referrer || original.headers.get('referer')
    const referrerLocation = referrerUrl ? Route0.getLocation(referrerUrl) : null

    const ips = Array.from(ipsSet)
    const from: RequestFrom = {
      ips,
      ip: ips[0] || null,
      userAgent,
      location: referrerLocation,
      scope: fromScope,
      server: isFromServer,
    }

    const body = Object.defineProperties(
      {
        // original: original.body,
        // used: false,
        raw: undefined,
        arrayBuffer: original.arrayBuffer.bind(original),
        blob: original.blob.bind(original),
        bytes: original.bytes.bind(original),
        formData: original.formData.bind(original),
        json: original.json.bind(original),
        text: original.text.bind(original),
      } as never,
      {
        original: {
          get: () => original.body,
        },
        used: {
          get: () => original.bodyUsed,
        },
      },
    ) as RequestBody

    return new Request0({
      original,
      headers,
      cookies,
      location,
      method,
      from,
      id,
      state,
      body,
      input: {
        raw: undefined,
        parse: async () => {
          return {} as never
        },
        extract: async () => {
          return {} as never
        },
      },
    })
  }

  static get(): Request0<boolean, InputSchema | UndefinedInputSchema> {
    if (!_point0_env.target.is.server) {
      throw new Error(
        'You can not get request0 not in server. Please call Request0.get() only in server, inside .loader() or .ctx() or .middleware() or inside ssr code, it only exists there',
      )
    }
    const request0 = _ssItems.__POINT0_REQUEST0__.get()
    return request0
  }

  static getWeak(): Request0<boolean, InputSchema | UndefinedInputSchema> | undefined {
    try {
      return _ssItems.__POINT0_REQUEST0__.getWeak()
    } catch {
      return undefined
    }
  }
}

export type RequestMethod =
  | 'ACL'
  | 'BIND'
  | 'CHECKOUT'
  | 'CONNECT'
  | 'COPY'
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'LINK'
  | 'LOCK'
  | 'M-SEARCH'
  | 'MERGE'
  | 'MKACTIVITY'
  | 'MKCALENDAR'
  | 'MKCOL'
  | 'MOVE'
  | 'NOTIFY'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'PURGE'
  | 'PUT'
  | 'REBIND'
  | 'REPORT'
  | 'SEARCH'
  | 'SOURCE'
  | 'SUBSCRIBE'
  | 'TRACE'
  | 'UNBIND'
  | 'UNLINK'
  | 'UNLOCK'
  | 'UNSUBSCRIBE'

export interface RequestFrom {
  ips: string[]
  ip: string | null
  userAgent: string | null
  location: AnyLocation | null
  scope: string | null
  server: boolean
}

export type RequestHeaders = Record<string, string | undefined>
export type RequestCookies = Record<string, string | undefined>

export type RequestState = {
  startedAt: number

  [key: string]: unknown
}

type RequestInputExtracted<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  raw: InputRawUnknown
  extract: () => Promise<InputRawUnknown>
  parse: () => Promise<InputParsed<TInputSchema>>
}
type RequestInputMaybeExtracted<
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = {
  raw: undefined | InputRawUnknown
  extract: () => Promise<InputRawUnknown>
  parse: () => Promise<InputParsed<TInputSchema>>
}

export type RequestInput<
  TInputWasExtracted extends boolean = boolean,
  TInputSchema extends InputSchema | UndefinedInputSchema = InputSchema | UndefinedInputSchema,
> = boolean extends TInputWasExtracted
  ? RequestInputExtracted<TInputSchema> | RequestInputMaybeExtracted<TInputSchema>
  : TInputWasExtracted extends true
    ? RequestInputExtracted<TInputSchema>
    : RequestInputMaybeExtracted<TInputSchema>

export type RequestBody<TInputWasExtracted extends boolean = boolean> = Omit<Body, 'bodyUsed' | 'body'> & {
  original: Body['body']
  used: TInputWasExtracted extends true ? true : boolean
  raw: TInputWasExtracted extends true ? string : undefined | string
}
