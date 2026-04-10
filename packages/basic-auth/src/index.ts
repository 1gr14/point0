import type { MiddlewareFn } from '@point0/core'
import type { Request0 } from '@point0/core/request0'

export const getBasicAuthHeader = (username: string, password: string): string =>
  `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`

export type BasicAuthOptionsInputUsers = Record<string, string> | string | string[]

export type BasicAuthOptionsUsers = Record<string, string>

type OnUnauthorizedOptions = {
  request: Request0
  username: string | undefined
  ip: string | undefined
}
type OnUnauthorizedFn = (options: OnUnauthorizedOptions) => void | Promise<void>
type OnWrongCredentialsOptions = {
  request: Request0
  username: string | undefined
  ip: string | undefined
}
type OnWrongCredentialsFn = (options: OnWrongCredentialsOptions) => void | Promise<void>
type OnLimitExceededOptions = {
  request: Request0
  username: string | undefined
  ip: string | undefined
  limitPerUser: number
  limitPerIp: number
  staleTimeMs: number
}
type OnLimitExceededFn = (options: OnLimitExceededOptions) => void | Promise<void>
type ValidatorFn = ({
  username,
  password,
  request,
}: {
  username: string
  password: string
  request: Request0
}) => boolean | Promise<boolean>
export type BasicAuthOptionsInput = {
  limitPerUser?: number
  limitPerIp?: number
  memorySize?: number
  staleTimeMs?: number
  challenge?: boolean
  onUnauthorized?: OnUnauthorizedFn
  onWrongCredentials?: OnWrongCredentialsFn
  onLimitExceeded?: OnLimitExceededFn
} & ({ users: BasicAuthOptionsInputUsers; validator?: undefined } | { users?: undefined; validator: ValidatorFn })
export type BasicAuthUsers = Record<string, string>

export type BasicAuthValidationResult =
  | {
      ok: true
      username: string
    }
  | {
      ok: false
      username: string | undefined
      ip: string | undefined
      response: Response
      reason: 'unauthorized' | 'wrong-credentials' | 'limit-exceeded'
    }

type MemoryItem = {
  dateMs: number
  username: string
  ip: string
}

const HTTP_AUTH_CHALLENGE = 'Basic realm="Restricted", charset="UTF-8"'
const BASIC_CREDENTIALS_REGEXP = /^ *(?:[Bb][Aa][Ss][Ii][Cc]) +([A-Za-z0-9._~+/-]+=*) *$/
const BASIC_USER_PASS_REGEXP = /^([^:]+):(.*)$/

const normalizeUserString = (user: string): { username: string; password: string } => {
  const separatorIndex = user.indexOf(':')
  if (separatorIndex <= 0 || separatorIndex === user.length - 1) {
    throw new Error('Invalid user string format. Expected "username:password".')
  }
  return {
    username: user.slice(0, separatorIndex),
    password: user.slice(separatorIndex + 1),
  }
}

const normalizeUsers = (users: BasicAuthOptionsInputUsers): BasicAuthUsers => {
  if (Array.isArray(users)) {
    const output: BasicAuthUsers = {}
    for (const item of users) {
      const normalized = normalizeUserString(item)
      output[normalized.username] = normalized.password
    }
    return output
  }
  if (typeof users === 'string') {
    const normalized = normalizeUserString(users)
    return { [normalized.username]: normalized.password }
  }
  return users
}

export class BasicAuth {
  users: BasicAuthUsers
  validator: ValidatorFn | undefined
  staleTimeMs: number
  limitPerUser: number
  limitPerIp: number
  memorySize: number
  challenge: boolean

  onUnauthorized?: OnUnauthorizedFn
  onLimitExceeded?: OnLimitExceededFn
  onWrongCredentials?: OnWrongCredentialsFn

  memory: MemoryItem[]

  private constructor(options: BasicAuthOptionsInput) {
    this.users = normalizeUsers(options.users || {})
    this.staleTimeMs = options.staleTimeMs ?? 1000 * 60 * 60 * 24
    this.limitPerUser = options.limitPerUser ?? 100
    this.limitPerIp = options.limitPerIp ?? 100
    this.memorySize = options.memorySize ?? 1000
    this.challenge = options.challenge ?? true
    this.onUnauthorized = options.onUnauthorized
    this.onLimitExceeded = options.onLimitExceeded
    this.onWrongCredentials = options.onWrongCredentials
    this.validator = options.validator
    this.memory = []
  }

  static create(options: BasicAuthOptionsInput): BasicAuth {
    return new BasicAuth(options)
  }

  async validateRequest(request: Request0): Promise<BasicAuthValidationResult> {
    this.removeOld()

    const ip = request.from.ip || undefined
    const parsedAuth = this.parseAuthorizationHeader(request.headers.authorization)
    if (!parsedAuth) {
      return await this.unauthorized({ request, ip, username: undefined })
    }

    const attemptedUsername = parsedAuth.username

    if (this.isLimitExceeded({ ip, username: attemptedUsername })) {
      return await this.limitExceeded({ request, ip, username: attemptedUsername })
    }

    const validator =
      this.validator ||
      (({ username, password }) => {
        const hasUsername = Object.prototype.hasOwnProperty.call(this.users, username)
        return hasUsername && this.users[username] === password
      })
    const isValid = await validator({ username: parsedAuth.username, password: parsedAuth.password, request })

    if (!isValid) {
      this.addAttempt({ ip, username: parsedAuth.username })
      if (this.isLimitExceeded({ ip, username: parsedAuth.username })) {
        return await this.limitExceeded({ request, ip, username: parsedAuth.username })
      }
      return await this.wrongCredentials({ request, ip, username: parsedAuth.username })
    }

    this.clearAttemptsByIpAndUsername({ ip, username: parsedAuth.username })
    return {
      ok: true,
      username: parsedAuth.username,
    }
  }

  async getFailureResponse(request: Request0): Promise<Response | undefined> {
    const validation = await this.validateRequest(request)
    if (validation.ok) {
      return undefined
    }
    return validation.response
  }

  private parseAuthorizationHeader(value: string | undefined): { username: string; password: string } | undefined {
    if (!value) {
      return undefined
    }

    const match = BASIC_CREDENTIALS_REGEXP.exec(value)
    if (!match) {
      return undefined
    }

    const decoded = Buffer.from(match[1], 'base64').toString('utf8')

    const userPass = BASIC_USER_PASS_REGEXP.exec(decoded)
    if (!userPass) {
      return undefined
    }

    return {
      username: userPass[1],
      password: userPass[2],
    }
  }

  private addAttempt({ ip = 'unknown', username }: { ip: string | undefined; username: string }): void {
    this.memory.push({
      dateMs: Date.now(),
      ip: ip || 'unknown',
      username,
    })
    this.removeOld()
  }

  private removeOld(): void {
    const minDateMs = Date.now() - this.staleTimeMs
    this.memory = this.memory.filter((item) => item.dateMs > minDateMs)
    if (this.memory.length > this.memorySize) {
      this.memory = this.memory.slice(-this.memorySize)
    }
  }

  private countByIp({ ip = 'unknown' }: { ip?: string | undefined }): number {
    return this.memory.filter((item) => item.ip === ip).length
  }

  private countByUsername({ username }: { username: string }): number {
    return this.memory.filter((item) => item.username === username).length
  }

  // private clearAttemptsByIp({ ip = 'unknown' }: { ip?: string | undefined }): void {
  //   this.memory = this.memory.filter((item) => item.ip !== ip)
  // }

  // private clearAttemptsByUsername({ username }: { username: string }): void {
  //   this.memory = this.memory.filter((item) => item.username !== username)
  // }

  private clearAttemptsByIpAndUsername({
    ip = 'unknown',
    username,
  }: {
    ip?: string | undefined
    username: string
  }): void {
    this.memory = this.memory.filter((item) => item.ip !== ip && item.username !== username)
  }

  private isLimitExceeded({ ip = 'unknown', username }: { ip?: string | undefined; username: string }): boolean {
    return this.countByIp({ ip }) >= this.limitPerIp || this.countByUsername({ username }) >= this.limitPerUser
  }

  private async unauthorized({
    request,
    username,
    ip,
  }: {
    request: Request0
    username: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onUnauthorized) {
      await this.onUnauthorized({
        request,
        username,
        ip,
      })
    }
    const responseHeaders: HeadersInit = this.challenge
      ? {
          'WWW-Authenticate': HTTP_AUTH_CHALLENGE,
        }
      : {}
    return {
      ok: false,
      reason: 'unauthorized',
      username,
      ip,
      response: new Response('Unauthorized', {
        status: 401,
        headers: responseHeaders,
      }),
    }
  }

  private async wrongCredentials({
    request,
    username,
    ip,
  }: {
    request: Request0
    username: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onWrongCredentials) {
      await this.onWrongCredentials({
        request,
        username,
        ip,
      })
    }
    const responseHeaders: HeadersInit = this.challenge
      ? {
          'WWW-Authenticate': HTTP_AUTH_CHALLENGE,
        }
      : {}
    return {
      ok: false,
      reason: 'wrong-credentials',
      username,
      ip,
      response: new Response('Unauthorized', {
        status: 401,
        headers: responseHeaders,
      }),
    }
  }

  private async limitExceeded({
    request,
    username,
    ip,
  }: {
    request: Request0
    username: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onLimitExceeded) {
      await this.onLimitExceeded({
        request,
        username,
        ip,
        limitPerUser: this.limitPerUser,
        limitPerIp: this.limitPerIp,
        staleTimeMs: this.staleTimeMs,
      })
    }
    return {
      ok: false,
      reason: 'limit-exceeded',
      username,
      ip,
      response: new Response('Too many failed HTTP auth attempts. Limit exceeded.', {
        status: 429,
      }),
    }
  }

  get middleware(): MiddlewareFn<any, any> {
    return async ({ request, next }) => {
      const validation = await this.validateRequest(request)
      if (validation.ok) {
        return await next()
      }
      return validation.response
    }
  }
}

export const basicAuth = (options: BasicAuthOptionsInput): MiddlewareFn<any, any> => {
  return BasicAuth.create(options).middleware
}
