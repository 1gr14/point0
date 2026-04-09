import type { Request0 } from '@point0/core/request0'
import { describe, expect, test } from 'bun:test'
import { basicAuth, BasicAuth, getBasicAuthHeader } from '../src/index.js'
import { Point0 } from '@point0/core'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'

const getRequest = ({ authHeader, ip = '127.0.0.1' }: { authHeader?: string; ip?: string | null }): Request0 =>
  ({
    headers: {
      authorization: authHeader,
    },
    from: {
      ip,
    },
  }) as unknown as Request0

describe('basic-auth', () => {
  test('allows valid credentials', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'secret'),
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.username).toBe('admin')
    }
  })

  test('allows users as one string "username:password"', async () => {
    const auth = BasicAuth.create({
      users: 'admin:secret',
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'secret'),
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.username).toBe('admin')
    }
  })

  test('allows users as array of "username:password" strings', async () => {
    const auth = BasicAuth.create({
      users: ['admin:secret', 'john:pass123'],
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('john', 'pass123'),
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.username).toBe('john')
    }
  })

  test('allows users as array of { username, password } objects', async () => {
    const auth = BasicAuth.create({
      users: [
        { username: 'admin', password: 'secret' },
        { username: 'john', password: 'pass123' },
      ],
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('john', 'pass123'),
      }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.username).toBe('john')
    }
  })

  test('accepts case-insensitive Basic auth scheme', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
    })

    const lowercaseScheme = await auth.validateRequest(
      getRequest({
        authHeader: `basic ${getBasicAuthHeader('admin', 'secret').slice('Basic '.length)}`,
      }),
    )
    const uppercaseScheme = await auth.validateRequest(
      getRequest({
        authHeader: `BASIC ${getBasicAuthHeader('admin', 'secret').slice('Basic '.length)}`,
      }),
    )

    expect(lowercaseScheme.ok).toBe(true)
    expect(uppercaseScheme.ok).toBe(true)
  })

  test('rejects malformed basic auth token payload', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: 'Basic ***',
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('unauthorized')
      expect(result.response.status).toBe(401)
    }
  })

  test('returns 401 with auth challenge for wrong credentials', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
      limitPerIp: 3,
      limitPerUser: 3,
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong'),
      }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.reason).toBe('wrong-credentials')
      expect(result.response.status).toBe(401)
      expect(result.response.headers.get('WWW-Authenticate')).toContain('Basic')
    }
  })

  test('returns 401 without auth challenge when challenge is disabled', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
      challenge: false,
      limitPerIp: 3,
      limitPerUser: 3,
    })

    const wrongCredentials = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong'),
      }),
    )
    const missingCredentials = await auth.validateRequest(getRequest({}))

    expect(wrongCredentials.ok).toBe(false)
    if (!wrongCredentials.ok) {
      expect(wrongCredentials.reason).toBe('wrong-credentials')
      expect(wrongCredentials.response.status).toBe(401)
      expect(wrongCredentials.response.headers.get('WWW-Authenticate')).toBeNull()
    }

    expect(missingCredentials.ok).toBe(false)
    if (!missingCredentials.ok) {
      expect(missingCredentials.reason).toBe('unauthorized')
      expect(missingCredentials.response.status).toBe(401)
      expect(missingCredentials.response.headers.get('WWW-Authenticate')).toBeNull()
    }
  })

  test('returns 429 without WWW-Authenticate when limit exceeded', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
      limitPerIp: 2,
      limitPerUser: 2,
    })

    await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-1'),
        ip: '10.0.0.1',
      }),
    )
    const second = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-2'),
        ip: '10.0.0.1',
      }),
    )

    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.reason).toBe('limit-exceeded')
      expect(second.response.status).toBe(429)
      expect(second.response.headers.get('WWW-Authenticate')).toBeNull()
    }
  })

  test('allows custom validator function', async () => {
    const auth = BasicAuth.create({
      validator: ({ username, password }) => username === 'admin' && password === 'secret-token',
    })

    const allowed = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'secret-token'),
      }),
    )
    const denied = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-token'),
      }),
    )

    expect(allowed.ok).toBe(true)
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.reason).toBe('wrong-credentials')
      expect(denied.response.status).toBe(401)
    }
  })

  test('allows async custom validator function', async () => {
    const auth = BasicAuth.create({
      validator: async ({ username, password }) => username === 'admin' && password === 'secret-async',
    })

    const result = await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'secret-async'),
      }),
    )

    expect(result.ok).toBe(true)
  })

  test('trims memory to memorySize after cleanup', async () => {
    const auth = BasicAuth.create({
      users: { admin: 'secret' },
      memorySize: 2,
      limitPerIp: 100,
      limitPerUser: 100,
    })

    await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-1'),
        ip: '10.0.0.1',
      }),
    )
    await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-2'),
        ip: '10.0.0.2',
      }),
    )
    await auth.validateRequest(
      getRequest({
        authHeader: getBasicAuthHeader('admin', 'wrong-3'),
        ip: '10.0.0.3',
      }),
    )

    expect(auth.memory).toHaveLength(2)
    expect(auth.memory.map((item) => item.ip)).toEqual(['10.0.0.2', '10.0.0.3'])
  })

  test('middleware', async () => {
    const root = Point0.lets('root', 'root')
      .middleware(basicAuth({ users: { admin: 'secret' } }))
      .root()

    const action = root.lets('action', 'action1', 'GET', '/api/test').action(() => {
      return {
        x: 'test',
      }
    })

    const { fetch } = await createTestThings({ points: [root, action], ssr: true })

    const response1 = await fetch(action.route.get({}, 'http://localhost:3000'))
    expect(response1.status).toBe(401)
    expect(response1.headers.get('WWW-Authenticate')).toBe('Basic realm="Restricted", charset="UTF-8"')

    const response2 = await fetch(action.route.get({}, 'http://localhost:3000'), {
      headers: {
        Authorization: getBasicAuthHeader('admin', 'secret'),
      },
    })
    expect(response2.status).toBe(200)
    expect(await response2.json()).toEqual({ x: 'test' })
  })
})
