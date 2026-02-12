import { Point0, queryClient } from '@point0/core'
import { createTestThings } from '@point0/engine/tests/utils'
import { describe, expect, it } from 'bun:test'
import * as z from 'zod'
import { CookiesStore } from '../src/index.js'

describe('cookies-store', () => {
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
        "/
          (Empty)

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
    // TODO:ASAP add plugin for cookies store
    const root = Point0.lets('root', 'root').baseurl('http://localhost/').ssr(true).root()
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
        const nick = nickCookie.use()
        return (
          <div id="page">
            <div id="content">Hello, {data.nick || 'guest'}!</div>
            <div id="cookie">We know your cookies: nick={nick}</div>
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
        "/
          (Empty)

          #page:
            #content: Hello, guest!
            #cookie: We know your cookies: nick=
            #login: Login

          #page:
            #content: Hello, m1xer!
            #cookie: We know your cookies: nick=
            #logout: Logout

          #page:
            #content: Hello, guest!
            #cookie: We know your cookies: nick=
            #login: Login
        "
      `)
    })
  })
})
