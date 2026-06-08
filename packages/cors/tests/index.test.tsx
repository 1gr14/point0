import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { cors } from '../src/index.js'

// inspired by https://github.com/elysiajs/elysia-cors/tree/main
// thanks a lot, SaltyAom https://1gr14.dev/

describe('cors', () => {
  const prepare = async (options?: Parameters<typeof cors>[0]) => {
    const root = Point0.lets('root', 'root').middleware(cors(options)).root()
    const page = root
      .lets('page', 'home', '/')
      .loader(({ request }) => ({ headers: request.headers }))
      .page(({ data }) => {
        return (
          <div id="headers">
            {Object.entries(data.headers).map(([key, value]) => {
              return <div id={key}>{value}</div>
            })}
          </div>
        )
      })
    const tt = await createTestThings({ points: [root, page] })
    const fetch = async (options?: RequestInit) => {
      return await tt.fetch(page.route.get({}, { origin: 'http://localhost:3001' }), options)
    }
    return { root, page, fetch }
  }

  const preflight = (headers?: Record<string, string>) => {
    return {
      method: 'OPTIONS',
      headers,
    } satisfies RequestInit
  }

  it('accept all CORS by default', async () => {
    const { fetch } = await prepare()
    const response = await fetch({
      headers: {
        origin: 'https://1gr14.dev',
      },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://1gr14.dev')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
    expect(response.headers.get('access-control-allow-methods')).toBe('GET')
    expect(response.headers.get('access-control-allow-headers')).toContain('origin')
    expect(response.headers.get('access-control-expose-headers')).toContain('origin')
  })

  it('origin accepts string', async () => {
    const { fetch } = await prepare({
      origin: '1gr14.dev',
    })
    const response = await fetch({
      headers: {
        origin: 'https://1gr14.dev',
      },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://1gr14.dev')
  })

  it('origin accepts boolean', async () => {
    const { fetch } = await prepare({
      origin: true,
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('origin accepts regexp', async () => {
    const { fetch } = await prepare({
      origin: /\.com/g,
    })
    const deniedResponse = await fetch({
      headers: {
        origin: 'https://example.org',
      },
    })
    expect(deniedResponse.headers.get('access-control-allow-origin')).toBeNull()

    const allowedResponse = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(allowedResponse.headers.get('access-control-allow-origin')).toBe('https://example.com')
  })

  it('origin accepts function', async () => {
    const { fetch } = await prepare({
      origin: () => true,
    })
    const response = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com')
  })

  it('origin accepts string[]', async () => {
    const { fetch } = await prepare({
      origin: ['gehenna.sh', '1gr14.dev'],
    })
    const response = await fetch({
      headers: {
        origin: 'https://1gr14.dev',
      },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe('https://1gr14.dev')
  })

  it('origin accepts mixed array', async () => {
    const { fetch } = await prepare({
      origin: ['https://demo.app', () => false, /.com/g],
    })
    const response = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe('https://example.com')
  })

  it('origin strictly checks includes', async () => {
    const { fetch } = await prepare({
      origin: 'example.com',
    })
    const response = await fetch({
      headers: {
        origin: 'http://notexample.com',
      },
    })
    expect(response.headers.has('access-control-allow-origin')).toBeFalse()
  })

  it('origin strictly checks protocol when configured with protocol', async () => {
    const { fetch } = await prepare({
      origin: 'http://example.com',
    })

    const passResponse = await fetch({
      headers: {
        origin: 'http://example.com',
      },
    })
    expect(passResponse.headers.has('access-control-allow-origin')).toBeTrue()

    const failResponse = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(failResponse.headers.has('access-control-allow-origin')).toBeFalse()
  })

  it('methods accepts single method', async () => {
    const { fetch } = await prepare({
      methods: 'GET',
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-methods')).toBe('GET')
  })

  it('methods accepts array', async () => {
    const { fetch } = await prepare({
      methods: ['GET', 'POST'],
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-methods')).toBe('GET, POST')
  })

  it('methods accepts star', async () => {
    const { fetch } = await prepare({
      methods: '*',
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-methods')).toBe('*')
  })

  it('methods mirrors request method when true', async () => {
    const { fetch } = await prepare({
      methods: true,
    })

    const getResponse = await fetch()
    expect(getResponse.headers.get('access-control-allow-methods')).toBe('GET')

    const postResponse = await fetch({
      method: 'POST',
    })
    expect(postResponse.headers.get('access-control-allow-methods')).toBe('POST')
  })

  it('methods with preflight still returns successful preflight', async () => {
    const { fetch } = await prepare({
      methods: true,
    })
    const response = await fetch(
      preflight({
        origin: 'http://localhost/',
        'access-control-request-method': 'PUT',
      }),
    )
    expect(response.status).toBe(204)
  })

  it('allowedHeaders accepts single header', async () => {
    const { fetch } = await prepare({
      allowedHeaders: 'Content-Type',
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type')
  })

  it('allowedHeaders accepts array', async () => {
    const { fetch } = await prepare({
      allowedHeaders: ['Content-Type', 'X-Imaginary-Value'],
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-headers')).toBe('Content-Type, X-Imaginary-Value')
  })

  it('exposeHeaders accepts single header', async () => {
    const { fetch } = await prepare({
      exposeHeaders: 'Content-Type',
    })
    const response = await fetch()
    expect(response.headers.get('access-control-expose-headers')).toBe('Content-Type')
  })

  it('exposeHeaders accepts array', async () => {
    const { fetch } = await prepare({
      exposeHeaders: ['Content-Type', 'X-Imaginary-Value'],
    })
    const response = await fetch()
    expect(response.headers.get('access-control-expose-headers')).toBe('Content-Type, X-Imaginary-Value')
  })

  it('credentials allow', async () => {
    const { fetch } = await prepare({
      credentials: true,
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('credentials disallow', async () => {
    const { fetch } = await prepare({
      credentials: false,
    })
    const response = await fetch()
    expect(response.headers.get('access-control-allow-credentials')).toBeNull()
  })

  it('maxAge sets value', async () => {
    const { fetch } = await prepare({
      maxAge: 5,
    })
    const response = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(response.headers.get('access-control-max-age')).toBe('5')
  })

  it('maxAge skips if falsey', async () => {
    const { fetch } = await prepare({
      maxAge: 0,
    })
    const response = await fetch(preflight())
    expect(response.headers.get('access-control-max-age')).toBeNull()
  })

  it('preflight enabled returns 204', async () => {
    const { fetch } = await prepare({
      preflight: true,
    })
    const response = await fetch(preflight())
    expect(response.status).toBe(204)
  })

  it('preflight disabled skips CORS headers for options requests', async () => {
    const { fetch } = await prepare({
      preflight: false,
    })
    const response = await fetch(preflight())
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('preflight responds before regular handlers', async () => {
    const { fetch } = await prepare()
    const response = await fetch(
      preflight({
        origin: 'https://example.com',
        'access-control-request-method': 'GET',
      }),
    )
    expect(response.status).toBe(204)
  })

  it('non-options request still works', async () => {
    const { fetch } = await prepare()
    const response = await fetch({
      headers: {
        origin: 'https://example.com',
      },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBeTruthy()
  })
})
