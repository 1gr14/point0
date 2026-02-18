import { Point0, queryClient } from '@point0/core'
import { createTestThings } from '../../engine/tests/utils/internal-testing.js'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import superjson from 'superjson'
import * as z from 'zod'
import { CookiesStore } from '../src/index.js'

describe('cookies-store', () => {
  let fakeClient: Awaited<ReturnType<typeof createTestThings>>['client']
  const inClient = (fn: () => any) => {
    return async () => {
      await fakeClient.run(async () => {
        await fn()
      })
    }
  }

  beforeAll(async () => {
    const tt = await createTestThings({})
    fakeClient = tt.client
  })

  describe('client document cookie helpers', () => {
    const captureDocumentCookieWrite = (fn: () => void): string => {
      let writtenCookie = ''
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie')
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() {
          return ''
        },
        set(value: string) {
          writtenCookie = value
        },
      })
      try {
        fn()
        return writtenCookie
      } finally {
        if (originalCookieDescriptor) {
          Object.defineProperty(document, 'cookie', originalCookieDescriptor)
        } else {
          delete (document as any).cookie
        }
      }
    }

    const withDocumentCookieString = <TResult,>(cookie: string, fn: () => TResult): TResult => {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie')
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get() {
          return cookie
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set() {},
      })
      try {
        return fn()
      } finally {
        if (originalCookieDescriptor) {
          Object.defineProperty(document, 'cookie', originalCookieDescriptor)
        } else {
          delete (document as any).cookie
        }
      }
    }

    it(
      'serialize cookie once with encoded values and sanitized attributes',
      inClient(() => {
        const writtenCookie = captureDocumentCookieWrite(() => {
          CookiesStore.clientDocumentCookieSetter({
            name: 'user name',
            value: 'hello world',
            path: '/app;bad=true',
            domain: 'example.com;bad=true',
            sameSite: 'lax',
            maxAge: 10.9,
          })
        })

        expect(writtenCookie).toContain('user%20name=hello%20world')
        expect(writtenCookie).toContain('Path=/app')
        expect(writtenCookie).toContain('Domain=example.com')
        expect(writtenCookie).toContain('SameSite=lax')
        expect(writtenCookie).toContain('Max-Age=10')
        expect(writtenCookie).not.toContain('bad=true')
      }),
    )

    it(
      'normalize invalid sameSite to lax in document setter',
      inClient(() => {
        const writtenCookie = captureDocumentCookieWrite(() => {
          CookiesStore.clientDocumentCookieSetter({
            name: 'x',
            value: '1',
            sameSite: 'weird' as never,
          })
        })
        expect(writtenCookie).toContain('SameSite=lax')
      }),
    )

    it(
      'read decoded value for encoded cookie name',
      inClient(() => {
        const value = withDocumentCookieString('user%20name=hello%20world; plain=value', () => {
          return CookiesStore.clientDocumentCookieGetter('user name')
        })
        expect(value).toBe('hello world')
      }),
    )

    it(
      'return cookie map when called without name',
      inClient(() => {
        const result = withDocumentCookieString('user%20name=hello%20world; plain=value', () => {
          return CookiesStore.clientDocumentCookieGetter()
        })
        expect(result).toEqual({
          'user name': 'hello world',
          plain: 'value',
        })
      }),
    )
  })

  describe('define unit possibilities', () => {
    // const originalPoint0Side = process.env.POINT0_SIDE
    const originalClientGetter = CookiesStore.clientCookieGetter
    const originalClientSetter = CookiesStore.clientCookieSetter
    const originalTransformer = CookiesStore.transformer
    // const originalDocument = globalThis.document
    // const originalWindow = globalThis.window
    // const originalNavigator = globalThis.navigator

    let cookieState: Record<string, string>

    beforeEach(() => {
      // process.env.POINT0_SIDE = 'client'
      // ;(globalThis as any).window = {}
      // ;(globalThis as any).document = {}
      // ;(globalThis as any).navigator = {}
      cookieState = {}
      CookiesStore.items.clear()
      CookiesStore.configure({
        clientCookieGetter: ((name?: string) => {
          if (name === undefined) {
            return { ...cookieState }
          }
          return cookieState[name]
        }) as any,
        clientCookieSetter: (options) => {
          cookieState[options.name] = options.value
        },
        transformer: {
          serialize: (value: unknown) => value,
          deserialize: (value: unknown) => value,
        },
      })
    })

    afterEach(() => {
      // if (originalPoint0Target === undefined) {
      //   delete process.env.POINT0_SIDE
      // } else {
      //   process.env.POINT0_SIDE = originalPoint0Side
      // }
      // ;(globalThis as any).document = originalDocument
      // ;(globalThis as any).window = originalWindow
      // ;(globalThis as any).navigator = originalNavigator
      CookiesStore.items.clear()
      CookiesStore.clientCookieGetter = originalClientGetter
      CookiesStore.clientCookieSetter = originalClientSetter
      CookiesStore.transformer = originalTransformer
    })

    it(
      'define with string uses auto transformer and keeps string values',
      inClient(() => {
        const nick = CookiesStore.define('nick')
        nick.set('m1xer')
        expect(cookieState.nick).toBe('m1xer')
        expect(nick.get()).toBe('m1xer')
      }),
    )

    it(
      'define with fallback returns fallback when cookie is missing',
      inClient(() => {
        const nick = CookiesStore.define<string>({ name: 'nick', fallback: 'guest' })
        expect(nick.get()).toBe('guest')
      }),
    )

    it(
      'define with transformer=false keeps raw string values',
      inClient(() => {
        const data = CookiesStore.define<string>({ name: 'data', transformer: false })
        data.set('raw-string')
        expect(cookieState.data).toBe('raw-string')
        cookieState.data = '{"role":"user"}'
        expect(data.get()).toBe('{"role":"user"}')
      }),
    )

    it(
      'define with transformer=true always uses configured transformer',
      inClient(() => {
        const data = CookiesStore.define<{ role: string }>({ name: 'data', transformer: true })
        data.set({ role: 'admin' })
        expect(cookieState.data).toBe('{"role":"admin"}')
        expect(data.get()).toEqual({ role: 'admin' })
      }),
    )

    it(
      'define with transformer="auto" parses non-string values and keeps strings',
      inClient(() => {
        const data = CookiesStore.define<{ role: string } | string>({ name: 'data', transformer: 'auto' })
        data.set('raw-string')
        expect(cookieState.data).toBe('raw-string')
        expect(data.get()).toBe('raw-string')

        data.set({ role: 'admin' })
        expect(cookieState.data).toBe('{"role":"admin"}')
        expect(data.get()).toEqual({ role: 'admin' })
      }),
    )

    it(
      'define with default auto policy parses string cookies that look like json',
      inClient(() => {
        const data = CookiesStore.define<{ role: string } | string>('data')
        data.set('{"role":"admin"}')
        expect(cookieState.data).toBe('{"role":"admin"}')
        expect(data.get()).toEqual({ role: 'admin' })
      }),
    )

    it(
      'define without default auto policy not parses string cookies that look like json',
      inClient(() => {
        const data = CookiesStore.define<string>({ name: 'data', transformer: false })
        data.set('{"role":"admin"}')
        expect(cookieState.data).toBe('{"role":"admin"}')
        expect(data.get()).toBe('{"role":"admin"}')
      }),
    )

    it(
      'define with custom transformer object uses that transformer',
      inClient(() => {
        const data = CookiesStore.define<{ role: string }>({
          name: 'data',
          transformer: {
            serialize: (value: unknown) => ({ wrapped: value }),
            deserialize: (value: any) => value.wrapped,
          },
        })
        data.set({ role: 'admin' })
        expect(cookieState.data).toBe('{"wrapped":{"role":"admin"}}')
        expect(data.get()).toEqual({ role: 'admin' })
      }),
    )

    it(
      'define with superjson supports richer values',
      inClient(() => {
        const session = CookiesStore.define<{ createdAt: Date }>({
          name: 'session',
          transformer: superjson,
        })
        const value = { createdAt: new Date('2024-02-02T00:00:00.000Z') }
        session.set(value)
        expect(cookieState.session).toContain('"meta"')
        const parsed = session.get()
        expect(parsed).toBeDefined()
        if (!parsed) {
          throw new Error('expected parsed session')
        }
        expect(parsed.createdAt).toBeInstanceOf(Date)
        expect(parsed.createdAt.toISOString()).toBe('2024-02-02T00:00:00.000Z')
      }),
    )

    it(
      'define with httpOnly=true blocks client read/write/delete',
      inClient(() => {
        const secret = CookiesStore.define<string>({ name: 'secret', httpOnly: true })
        expect(() => secret.set('token')).toThrow('httpOnly cookies are server-only')
        expect(() => secret.get()).toThrow('httpOnly cookies are server-only')
        expect(() => secret.delete()).toThrow('httpOnly cookies are server-only')
      }),
    )
  })

  describe('integration', () => {
    it('without', async () => {
      const root = Point0.lets('root', 'root').baseurl('http://localhost/').ssr(true).root()
      const login = root
        .lets('mutation', 'authorize')
        .input(z.object({ nick: z.string() }))
        .loader(({ set, input }) => {
          set.cookies('nick', input.nick)
          return { success: true }
        })
        .mutation({
          onSuccess: (data) => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const logout = root
        .lets('mutation', 'logout')
        .loader(({ set }) => {
          set.cookies('nick', undefined)
          return { success: true }
        })
        .mutation({
          onSuccess: () => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const page = root
        .lets('page', 'home', '/')
        .loader(({ request }) => ({ nick: request.cookies.nick }))
        .page(({ data }) => (
          <div id="page">
            <div id="content">Hello, {data.nick || 'guest'}!</div>
            {data.nick ? (
              <button
                id="logout"
                onClick={() => {
                  void logout.fetch()
                }}
              >
                Logout
              </button>
            ) : (
              <button
                id="login"
                onClick={() => {
                  void login.fetch({ nick: 'm1xer' })
                }}
              >
                Login
              </button>
            )}
          </div>
        ))
      const { render } = await createTestThings({ points: [root, page, login, logout] })
      await render(page.route(), async ({ waitContent, click, tale }) => {
        await waitContent('#login')
        await click('#login')
        await waitContent('#logout')
        await click('#logout')
        await waitContent('#login')
        expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          Loading...

          #page:
            #content: Hello, guest!
            #login: Login

          #page:
            #content: Hello, m1xer!
            #logout: Logout

          #page:
            #content: Hello, guest!
            #login: Login
        "
      `)
      })
    })

    it('with', async () => {
      const root = Point0.lets('root', 'root').baseurl('http://localhost/').ssr(true).use(CookiesStore.plugin()).root()
      const nickCookie = CookiesStore.define('nick')
      const login = root
        .lets('mutation', 'authorize')
        .input(z.object({ nick: z.string() }))
        .loader(({ input }) => {
          nickCookie.set(input.nick)
          return { success: true }
        })
        .mutation({
          onSuccess: (data) => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const logout = root
        .lets('mutation', 'logout')
        .loader(() => {
          nickCookie.delete()
          return { success: true }
        })
        .mutation({
          onSuccess: () => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const page = root
        .lets('page', 'home', '/')
        .loader(({ request }) => ({ nick: request.cookies.nick }))
        .page(({ data }) => {
          return (
            <div id="page">
              <div id="content">Hello, {data.nick || 'guest'}!</div>
              {data.nick ? (
                <button
                  id="logout"
                  onClick={() => {
                    void logout.fetch()
                  }}
                >
                  Logout
                </button>
              ) : (
                <button
                  id="login"
                  onClick={() => {
                    void login.fetch({ nick: 'm1xer' })
                  }}
                >
                  Login
                </button>
              )}
            </div>
          )
        })
      const { render } = await createTestThings({ points: [root, page, login, logout] })
      await render(page.route(), async ({ waitContent, click, tale }) => {
        await waitContent('#login')
        await click('#login')
        await waitContent('#logout')
        await click('#logout')
        await waitContent('#login')
        expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          Loading...

          #page:
            #content: Hello, guest!
            #login: Login

          #page:
            #content: Hello, m1xer!
            #logout: Logout

          #page:
            #content: Hello, guest!
            #login: Login
        "
      `)
      })
    })

    it('use', async () => {
      const root = Point0.lets('root', 'root').baseurl('http://localhost/').ssr(true).use(CookiesStore.plugin()).root()
      const nickCookie = CookiesStore.define('nick')
      const login = root
        .lets('mutation', 'authorize')
        .input(z.object({ nick: z.string() }))
        .loader(({ input }) => {
          nickCookie.set(input.nick)
          return { success: true }
        })
        .mutation({
          onSuccess: (data) => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const logout = root
        .lets('mutation', 'logout')
        .loader(() => {
          nickCookie.delete()
          return { success: true }
        })
        .mutation({
          onSuccess: () => {
            void queryClient.get().refetchQueries()
          },
          onError: (error) => {
            console.error(error)
          },
        })
      const page = root
        .lets('page', 'home', '/')
        .loader(({ request }) => ({ nick: request.cookies.nick }))
        .page(() => {
          const nick = nickCookie.use()
          return (
            <div id="page">
              <div id="content">Hello, {nick || 'guest'}!</div>
              {nick ? (
                <button
                  id="logout"
                  onClick={() => {
                    void logout.fetch()
                  }}
                >
                  Logout
                </button>
              ) : (
                <button
                  id="login"
                  onClick={() => {
                    void login.fetch({ nick: 'm1xer' })
                  }}
                >
                  Login
                </button>
              )}
            </div>
          )
        })
      const { render } = await createTestThings({ points: [root, page, login, logout] })
      await render(page.route(), async ({ waitContent, click, tale }) => {
        await waitContent('#login')
        await click('#login')
        await waitContent('#logout')
        await click('#logout')
        await waitContent('#login')
        expect(await tale()).toMatchInlineSnapshot(`
        "
        /
          Loading...

          #page:
            #content: Hello, guest!
            #login: Login

          #page:
            #content: Hello, m1xer!
            #logout: Logout

          #page:
            #content: Hello, guest!
            #login: Login
        "
      `)
      })
    })
  })
})
