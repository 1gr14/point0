import type { MiddlewareFn } from '@point0/core'
import type { Request0 } from '@point0/core/request0'

export const getBasicAuthHeader = (login: string, password: string): string =>
  `Basic ${Buffer.from(`${login}:${password}`, 'utf8').toString('base64')}`

export type BasicAuthOptionsInputUser =
  | string
  | { login: string; password: string | ((password: string) => boolean | Promise<boolean>) }
export type BasicAuthOptionsInputUsers =
  | Record<string, string | ((password: string) => boolean | Promise<boolean>)>
  | BasicAuthOptionsInputUser
  | BasicAuthOptionsInputUser[]
export type BasicAuthOptionsInput = {
  users: BasicAuthOptionsInputUsers
  limitPerUser?: number
  limitPerIp?: number
  memorySize?: number
  staleTimeMs?: number
  onUnauthorized?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }) => void | Promise<void>
  onWrongCredentials?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }) => void | Promise<void>
  onLimitExceeded?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
    limitPerUser: number
    limitPerIp: number
    staleTimeMs: number
  }) => void | Promise<void>
}
export type BasicAuthUsers = Record<string, (password: string) => boolean | Promise<boolean>>

export type BasicAuthValidationResult =
  | {
      ok: true
      login: string
    }
  | {
      ok: false
      login: string | undefined
      ip: string | undefined
      response: Response
      reason: 'unauthorized' | 'wrong-credentials' | 'limit-exceeded'
    }

type MemoryItem = {
  dateMs: number
  login: string
  ip: string
}

const HTTP_AUTH_CHALLENGE = 'Basic realm="Restricted", charset="UTF-8"'

const toPasswordChecker = (
  password: string | ((password: string) => boolean | Promise<boolean>),
): ((password: string) => boolean | Promise<boolean>) => {
  if (typeof password === 'function') {
    return password
  }
  return (value: string) => value === password
}

const normalizeSingleUser = (
  user: BasicAuthOptionsInputUser,
): { login: string; password: (password: string) => boolean | Promise<boolean> } => {
  if (typeof user === 'string') {
    const separatorIndex = user.indexOf(':')
    if (separatorIndex <= 0 || separatorIndex === user.length - 1) {
      throw new Error('Invalid user string format. Expected "login:password".')
    }
    return {
      login: user.slice(0, separatorIndex),
      password: toPasswordChecker(user.slice(separatorIndex + 1)),
    }
  }
  if (!user.login || !user.password) {
    throw new Error('Invalid user object format. Expected { login, password }.')
  }
  return {
    login: user.login,
    password: toPasswordChecker(user.password),
  }
}

const normalizeUsers = (users: BasicAuthOptionsInputUsers): BasicAuthUsers => {
  if (Array.isArray(users)) {
    const output: BasicAuthUsers = {}
    for (const item of users) {
      const normalized = normalizeSingleUser(item)
      output[normalized.login] = normalized.password
    }
    return output
  }
  if (typeof users === 'string' || ('login' in users && 'password' in users)) {
    const normalized = normalizeSingleUser(users as BasicAuthOptionsInputUser)
    return { [normalized.login]: normalized.password }
  }
  const output: BasicAuthUsers = {}
  for (const [login, password] of Object.entries(users)) {
    output[login] = toPasswordChecker(password)
  }
  return output
}

export class BasicAuth {
  users: BasicAuthUsers
  staleTimeMs: number
  limitPerUser: number
  limitPerIp: number
  memorySize: number

  onUnauthorized?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }) => void | Promise<void>
  onLimitExceeded?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
    limitPerUser: number
    limitPerIp: number
    staleTimeMs: number
  }) => void | Promise<void>
  onWrongCredentials?: (options: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }) => void | Promise<void>

  memory: MemoryItem[]

  private constructor(options: BasicAuthOptionsInput) {
    this.users = normalizeUsers(options.users)
    this.staleTimeMs = options.staleTimeMs ?? 1000 * 60 * 60 * 24
    this.limitPerUser = options.limitPerUser ?? 100
    this.limitPerIp = options.limitPerIp ?? 100
    this.memorySize = options.memorySize ?? 1000
    this.onUnauthorized = options.onUnauthorized
    this.onLimitExceeded = options.onLimitExceeded
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
      return await this.unauthorized({ request, ip, login: undefined })
    }

    const attemptedLogin = parsedAuth.login

    if (this.isLimitExceeded({ ip, login: attemptedLogin })) {
      return await this.limitExceeded({ request, ip, login: attemptedLogin })
    }

    const hasLogin = Object.prototype.hasOwnProperty.call(this.users, parsedAuth.login)
    const isPasswordCorrect = hasLogin && (await this.users[parsedAuth.login](parsedAuth.password))

    if (!isPasswordCorrect) {
      this.addAttempt({ ip, login: parsedAuth.login })
      if (this.isLimitExceeded({ ip, login: parsedAuth.login })) {
        return await this.limitExceeded({ request, ip, login: parsedAuth.login })
      }
      return await this.wrongCredentials({ request, ip, login: parsedAuth.login })
    }

    this.clearAttemptsByIpAndLogin({ ip, login: parsedAuth.login })
    return {
      ok: true,
      login: parsedAuth.login,
    }
  }

  async getFailureResponse(request: Request0): Promise<Response | undefined> {
    const validation = await this.validateRequest(request)
    if (validation.ok) {
      return undefined
    }
    return validation.response
  }

  private parseAuthorizationHeader(value: string | undefined): { login: string; password: string } | undefined {
    if (!value || !value.startsWith('Basic ')) {
      return undefined
    }

    const encoded = value.slice('Basic '.length).trim()
    if (!encoded) {
      return undefined
    }

    let decoded = ''
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8')
    } catch {
      return undefined
    }

    const separatorIndex = decoded.indexOf(':')
    if (separatorIndex <= 0) {
      return undefined
    }

    return {
      login: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    }
  }

  private addAttempt({ ip = 'unknown', login }: { ip: string | undefined; login: string }): void {
    this.memory.push({
      dateMs: Date.now(),
      ip: ip || 'unknown',
      login,
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

  private countByLogin({ login }: { login: string }): number {
    return this.memory.filter((item) => item.login === login).length
  }

  // private clearAttemptsByIp({ ip = 'unknown' }: { ip?: string | undefined }): void {
  //   this.memory = this.memory.filter((item) => item.ip !== ip)
  // }

  // private clearAttemptsByLogin({ login }: { login: string }): void {
  //   this.memory = this.memory.filter((item) => item.login !== login)
  // }

  private clearAttemptsByIpAndLogin({ ip = 'unknown', login }: { ip?: string | undefined; login: string }): void {
    this.memory = this.memory.filter((item) => item.ip !== ip && item.login !== login)
  }

  private isLimitExceeded({ ip = 'unknown', login }: { ip?: string | undefined; login: string }): boolean {
    return this.countByIp({ ip }) >= this.limitPerIp || this.countByLogin({ login }) >= this.limitPerUser
  }

  private async unauthorized({
    request,
    login,
    ip,
  }: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onUnauthorized) {
      await this.onUnauthorized({
        request,
        login,
        ip,
      })
    }
    return {
      ok: false,
      reason: 'unauthorized',
      login,
      ip,
      response: new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': HTTP_AUTH_CHALLENGE,
        },
      }),
    }
  }

  private async wrongCredentials({
    request,
    login,
    ip,
  }: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onWrongCredentials) {
      await this.onWrongCredentials({
        request,
        login,
        ip,
      })
    }
    return {
      ok: false,
      reason: 'wrong-credentials',
      login,
      ip,
      response: new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': HTTP_AUTH_CHALLENGE,
        },
      }),
    }
  }

  private async limitExceeded({
    request,
    login,
    ip,
  }: {
    request: Request0
    login: string | undefined
    ip: string | undefined
  }): Promise<BasicAuthValidationResult> {
    if (this.onLimitExceeded) {
      await this.onLimitExceeded({
        request,
        login,
        ip,
        limitPerUser: this.limitPerUser,
        limitPerIp: this.limitPerIp,
        staleTimeMs: this.staleTimeMs,
      })
    }
    return {
      ok: false,
      reason: 'limit-exceeded',
      login,
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
