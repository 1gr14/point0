import type { AnyLocation } from '@devp0nt/route0'
import type { InputRawUnknown } from '@point0/core'

export class PointRequest {
  original: Request
  headers: PointRequestHeaders
  cookies: PointRequestCookies
  input: InputRawUnknown
  location: AnyLocation
  method: RequestMethod
  from: RequestFrom

  constructor(original: Request) {
    // TODO:ASAP
    this.original = original
    this.headers = {} as never
    this.cookies = {} as never
    this.input = {} as never
    this.location = {} as never
    this.method = 'get' as RequestMethod
    this.from = {} as RequestFrom
  }

  static create(original: Request | PointRequest): PointRequest {
    if (original instanceof PointRequest) {
      return original
    }
    return new PointRequest(original)
  }
}

export type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

export interface RequestFrom {
  ips: string[]
  ip: string | null
  userAgent: string | null
  location: AnyLocation | null
  scope: string | null
}

export type PointRequestHeaders = Record<string, string>
export type PointRequestCookies = Record<string, string>
