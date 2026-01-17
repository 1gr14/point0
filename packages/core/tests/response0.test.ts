import { describe, expect, it } from 'bun:test'
import { Response0 } from '../src/response0.js'

describe('Response0', () => {
  describe('create', () => {
    it('create a new Response0 instance', () => {
      const response0 = Response0.create()
      expect(response0).toBeInstanceOf(Response0)
      expect(response0.headers).toEqual({})
      expect(response0.cookies).toEqual({})
      expect(response0.status).toBeUndefined()
    })
  })

  describe('set headers', () => {
    it('set header with name and value', () => {
      const response0 = Response0.create()
      response0.set.headers('Content-Type', 'application/json')
      // Headers are normalized to lowercase
      expect(response0.headers['content-type']).toBe('application/json')
    })

    it('set headers from object', () => {
      const response0 = Response0.create()
      response0.set.headers({
        'Content-Type': 'application/json',
        'X-Custom': 'value',
      })
      // Headers are normalized to lowercase
      expect(response0.headers['content-type']).toBe('application/json')
      expect(response0.headers['x-custom']).toBe('value')
    })

    it('set headers from Headers object', () => {
      const response0 = Response0.create()
      const headers = new Headers()
      headers.set('Content-Type', 'application/json')
      headers.set('X-Custom', 'value')
      response0.set.headers(headers)
      // Headers are normalized to lowercase
      expect(response0.headers['content-type']).toBe('application/json')
      expect(response0.headers['x-custom']).toBe('value')
    })
  })

  describe('set cookies', () => {
    it('set cookie with name and value', () => {
      const response0 = Response0.create()
      response0.set.cookies('session', 'abc123')
      expect(response0.cookies.session).toEqual({
        name: 'session',
        value: 'abc123',
        path: '/',
        sameSite: 'lax',
      })
    })

    it('set cookie with options', () => {
      const response0 = Response0.create()
      response0.set.cookies('session', 'abc123', {
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        maxAge: 3600,
      })
      expect(response0.cookies.session).toEqual({
        name: 'session',
        value: 'abc123',
        path: '/',
        sameSite: 'lax',
        domain: 'example.com',
        secure: true,
        httpOnly: true,
        maxAge: 3600,
      })
    })

    it('set cookie with CookieOptionsInput', () => {
      const response0 = Response0.create()
      response0.set.cookies({
        name: 'token',
        value: 'xyz789',
        path: '/api',
        sameSite: 'strict',
        partitioned: true,
      })
      expect(response0.cookies.token).toEqual({
        name: 'token',
        value: 'xyz789',
        path: '/api',
        sameSite: 'strict',
        partitioned: true,
      })
    })
  })

  describe('set status', () => {
    it('set status code', () => {
      const response0 = Response0.create()
      response0.set.status(404)
      expect(response0.status).toBe(404)
    })
  })

  describe('apply', () => {
    it('apply effects to response', () => {
      const response0 = Response0.create()
      response0.set.headers('X-Custom', 'test')
      response0.set.cookies('session', 'abc123')
      response0.set.status(201)

      const originalResponse = new Response('body', { status: 200 })
      const newResponse = response0.apply(originalResponse)

      expect(newResponse.status).toBe(201)
      expect(newResponse.headers.get('X-Custom')).toBe('test')
      expect(newResponse.headers.get('Set-Cookie')).toContain('session=abc123')
    })

    it('merge cookies from response and effects', () => {
      const response0 = Response0.create()
      response0.set.cookies('newCookie', 'newValue')

      const originalResponse = new Response('body')
      originalResponse.headers.append('Set-Cookie', 'existingCookie=existingValue; Path=/')
      const newResponse = response0.apply(originalResponse)

      const setCookies = newResponse.headers.getAll('Set-Cookie')
      expect(setCookies).toContain('existingCookie=existingValue; Path=/')
      expect(setCookies.some((c) => c.includes('newCookie=newValue'))).toBe(true)
    })
  })

  describe('parseCookies', () => {
    it('return empty array when no set-cookie header', () => {
      const response = new Response('body')
      const cookies = Response0.parseCookies(response)
      expect(cookies).toEqual([])
    })

    it('parse simple cookie', () => {
      const response = new Response('body')
      response.headers.append('Set-Cookie', 'session=abc123')
      const cookies = Response0.parseCookies(response)
      expect(cookies).toHaveLength(1)
      expect(cookies[0]).toEqual({
        name: 'session',
        value: 'abc123',
        path: '/',
        sameSite: 'lax',
      })
    })

    it('parse cookie with all attributes', () => {
      const response = new Response('body')
      response.headers.append(
        'Set-Cookie',
        'token=xyz789; Path=/api; Domain=example.com; Max-Age=3600; Expires=Wed, 21 Oct 2025 07:28:00 GMT; Secure; HttpOnly; SameSite=strict; Partitioned',
      )
      const cookies = Response0.parseCookies(response)
      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('token')
      expect(cookies[0].value).toBe('xyz789')
      expect(cookies[0].path).toBe('/api')
      expect(cookies[0].domain).toBe('example.com')
      expect(cookies[0].maxAge).toBe(3600)
      expect(cookies[0].secure).toBe(true)
      expect(cookies[0].httpOnly).toBe(true)
      expect(cookies[0].sameSite).toBe('strict')
      expect(cookies[0].partitioned).toBe(true)
      expect(cookies[0].expires).toBeInstanceOf(Date)
    })

    it('parse multiple cookies', () => {
      const response = new Response('body')
      response.headers.append('Set-Cookie', 'cookie1=value1; Path=/')
      response.headers.append('Set-Cookie', 'cookie2=value2; Path=/api')
      const cookies = Response0.parseCookies(response)
      expect(cookies).toHaveLength(2)
      expect(cookies[0].name).toBe('cookie1')
      expect(cookies[1].name).toBe('cookie2')
    })
  })

  describe('inspect', () => {
    it('return current effects state', () => {
      const response0 = Response0.create()
      response0.set.headers('X-Test', 'value')
      response0.set.cookies('test', 'cookie')
      response0.set.status(500)

      const effects = response0.set.inspect
      // Headers are normalized to lowercase
      expect(effects.headers['x-test']).toBe('value')
      expect(effects.cookies.test).toBeDefined()
      expect(effects.status).toBe(500)
    })
  })
})
