import { Routes } from '@devp0nt/route0'
import type { AnyLocation } from '@devp0nt/route0'
import { Point0, useLocation, useOnNavigate } from '@point0/core'
import { createLink, createNavigate, createNavLink, createUseNavigate, SimpleLink } from '@point0/wouter'
import { beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import React, { useState } from 'react'
import { navigate as nativeNavigate } from 'wouter/use-browser-location'
import { createTestThings } from './utils/internal-testing.js'
import '@testing-library/react/dont-cleanup-after-each'

setDefaultTimeout(20000)

const root = Point0.lets('root', 'root')
  .ssr(true)
  .baseurl('http://localhost/')
  .loading(() => <div id="loading">...</div>)
  .error(({ error }) => <div id="error">{error.message}</div>)
  .prefetchPageOnNavigate(true)
  .prefetchPageOnLinkHover(true)
  .queryOptions({
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
  })
  .root()

const routes = Routes.create({
  home: '/',
  about: '/about',
  posts: '/posts',
  post: '/posts/:id',
})

export const Link = createLink(routes)
export const NavLink = createNavLink(routes)
export const useNavigate = createUseNavigate(routes)
export const navigate = createNavigate(routes, nativeNavigate)

const getClassNames = (defaultClassName: string) => ({
  default: defaultClassName,
  exact: 'exact',
  same: 'same',
  ancestor: 'ancestor',
  descendant: 'descendant',
  unmatched: 'unmatched',
})

const layout = root.lets('layout', 'layout').layout(({ children }) => {
  const location = useLocation()
  // const routerContext = useRouterContext()
  const [state, setState] = useState<{
    prevLocation: AnyLocation | null
    nextLocation: AnyLocation | null
    isNavigating: boolean
  }>({
    prevLocation: null,
    nextLocation: null,
    isNavigating: false,
  })
  useOnNavigate(({ prevLocation, nextLocation }) => {
    setState({
      prevLocation,
      nextLocation,
      isNavigating: true,
    })
    return () => {
      setState({
        prevLocation: null,
        nextLocation: null,
        isNavigating: false,
      })
    }
  })
  return (
    <>
      <nav id="nav">
        <NavLink route="home" className={({ type }) => `link-home ${type}`}>
          home
        </NavLink>
        <NavLink route="about" className={getClassNames('link-about')}>
          about
        </NavLink>
        <NavLink to="/posts" className={getClassNames('link-posts')}>
          posts
        </NavLink>
        <NavLink route="post" input={{ id: '1' }} className={getClassNames('link-post-1')}>
          post 1
        </NavLink>
        <NavLink route="post" input={{ id: '2' }} className={getClassNames('link-post-2')}>
          post 2
        </NavLink>
      </nav>
      <div id="info">
        <div id="route">{location.route || 'undefined'}</div>
        <div id="href">{location.hrefRel || 'undefined'}</div>
        <div id="is-navigating">{state.isNavigating ? 'true' : 'false'}</div>
        <div id="from">{state.prevLocation?.hrefRel || 'undefined'}</div>
        <div id="to">{state.nextLocation?.hrefRel || 'undefined'}</div>
      </div>
      {children}
    </>
  )
})
const homePage = layout.lets('page', 'home', '/').page(() => <div id="home">home</div>)
const aboutPage = layout.lets('page', 'about', '/about').page(() => <div id="about">about</div>)
const postsPage = layout
  .lets('page', 'posts', '/posts')
  .loader(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { posts: [1, 2] }
  })
  .page(({ data }) => {
    const navigateByUseNavigate = useNavigate()
    return (
      <div id="posts">
        {data.posts.map((post) => (
          <React.Fragment key={post}>
            <NavLink className={getClassNames(`link-post-preview-${post}`)} route="post" input={{ id: post }}>
              link post {post}
            </NavLink>
            {post === 1 && (
              <>
                <SimpleLink className={`simple-link-post-preview-${post}`} to={`/posts/${post}`}>
                  simple link post {post}
                </SimpleLink>
                <button
                  className={`use-navigate-post-preview-${post}`}
                  onClick={() => {
                    void navigateByUseNavigate('post', { id: post })
                  }}
                >
                  useNavigate post {post}
                </button>
                <button
                  className={`navigate-post-preview-${post}`}
                  onClick={() => {
                    void navigate('post', { id: post })
                  }}
                >
                  navigate post {post}
                </button>
              </>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  })
const postPage = layout
  .lets('page', 'post', '/posts/:id')
  .loader(async ({ input }) => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { post: input.id }
  })
  .page(({ data }) => <div id="post">post {data.post}</div>)

let t: Awaited<ReturnType<typeof createTestThings>>
// const cut = async (tale: any) => {
//   const result = await tale()
//   return result.replaceAll(
//     `
// #nav:
//   a: home
//   a: about
//   a: posts`,
//     '',
//   )
// }

describe('navigate', () => {
  // beforeAll(async () => {
  //   await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  //   tpf.setBrowser(await PlaywrightBrowser.init())
  // })

  // afterAll(async () => {
  //   await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  // })

  beforeAll(async () => {
    t = await createTestThings({
      points: [root, layout, homePage, aboutPage, postsPage, postPage],
    })
  })

  it('navigate from home to about', async () => {
    await t.render(homePage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#home')
      await click('.link-about')
      await waitContent('#about')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #nav:
            .link-home.exact: home
            .link-about.unmatched: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /
            #href: /
            #is-navigating: false
            #from: undefined
            #to: undefined
          #home: home

        /about
          #nav:
            .link-home.exact: home
            .link-about.unmatched: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /
            #href: /
            #is-navigating: true
            #from: /
            #to: /about
          #home: home

          #nav:
            .link-home.ancestor: home
            .link-about.exact: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /about
            #href: /about
            #is-navigating: false
            #from: undefined
            #to: undefined
          #about: about
        "
      `)
    })
  })

  it('navigate from about to posts', async () => {
    await t.render(aboutPage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#about')
      await click('.link-posts')
      await waitContent('#posts')
      expect(await tale()).toMatchInlineSnapshot(`
        "/about
          #nav:
            .link-home.ancestor: home
            .link-about.exact: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /about
            #href: /about
            #is-navigating: false
            #from: undefined
            #to: undefined
          #about: about

          #nav:
            .link-home.ancestor: home
            .link-about.exact: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /about
            #href: /about
            #is-navigating: true
            #from: /about
            #to: /posts
          #about: about

        /posts
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: true
            #from: /about
            #to: /posts
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2
        "
      `)
    })
  })

  it('navigate from posts to post', async () => {
    await t.render(postsPage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#posts')
      await click('.link-post-preview-1')
      await waitContent('#post')
      expect(await tale()).toMatchInlineSnapshot(`
        "/posts
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #loading: ...

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

        /posts/1
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #post: post 1

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: false
            #from: undefined
            #to: undefined
          #post: post 1
        "
      `)
    })
  })

  it('navigate from post to post via link', async () => {
    await t.render(postPage.route({ id: '1' }), async ({ waitContent, tale, click }) => {
      await waitContent('#post')
      await click('.link-post-2')
      await waitContent('#post')
      expect(await tale()).toMatchInlineSnapshot(`
        "/posts/1
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: false
            #from: undefined
            #to: undefined
          #loading: ...

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: false
            #from: undefined
            #to: undefined
          #post: post 1

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: true
            #from: /posts/1
            #to: /posts/2
          #post: post 1

        /posts/2
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.same: post 1
            .link-post-2.exact: post 2
          #info:
            #route: /posts/:id
            #href: /posts/2
            #is-navigating: true
            #from: /posts/1
            #to: /posts/2
          #post: post 2

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.same: post 1
            .link-post-2.exact: post 2
          #info:
            #route: /posts/:id
            #href: /posts/2
            #is-navigating: false
            #from: undefined
            #to: undefined
          #post: post 2
        "
      `)
    })
  })

  it('navigate from post to post via useNavigate', async () => {
    await t.render(postsPage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#posts')
      await click('.use-navigate-post-preview-1')
      await waitContent('#post')
      expect(await tale()).toMatchInlineSnapshot(`
        "/posts
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #loading: ...

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

        /posts/1
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #post: post 1

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: false
            #from: undefined
            #to: undefined
          #post: post 1
        "
      `)
    })
  })

  it('navigate from post to post via navigate', async () => {
    await t.render(postsPage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#posts')
      await click('.navigate-post-preview-1')
      await waitContent('#post')
      expect(await tale()).toMatchInlineSnapshot(`
        "/posts
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #loading: ...

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: false
            #from: undefined
            #to: undefined
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.exact: posts
            .link-post-1.descendant: post 1
            .link-post-2.descendant: post 2
          #info:
            #route: /posts
            #href: /posts
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #posts:
            .link-post-preview-1.descendant: link post 1
            .simple-link-post-preview-1: simple link post 1
            .use-navigate-post-preview-1: useNavigate post 1
            .navigate-post-preview-1: navigate post 1
            .link-post-preview-2.descendant: link post 2

        /posts/1
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: true
            #from: /posts
            #to: /posts/1
          #post: post 1

          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.ancestor: posts
            .link-post-1.exact: post 1
            .link-post-2.same: post 2
          #info:
            #route: /posts/:id
            #href: /posts/1
            #is-navigating: false
            #from: undefined
            #to: undefined
          #post: post 1
        "
      `)
    })
  })

  it('visit to 404', async () => {
    await t.render(homePage.route() + '404', async ({ waitContent, tale, click }) => {
      await waitContent('Page Not Found')
      expect(await tale()).toMatchInlineSnapshot(`
        "/404
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: undefined
            #href: /404
            #is-navigating: false
            #from: undefined
            #to: undefined
          text: Page Not Found
        "
      `)
    })
  })

  it('navigate to 404', async () => {
    await t.render(homePage.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#home')
      await navigate.to('/404')
      await waitContent('Page Not Found')
      expect(await tale()).toMatchInlineSnapshot(`
        "/
          #nav:
            .link-home.exact: home
            .link-about.unmatched: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: /
            #href: /
            #is-navigating: false
            #from: undefined
            #to: undefined
          #home: home

        /404
          #nav:
            .link-home.ancestor: home
            .link-about.unmatched: about
            .link-posts.unmatched: posts
            .link-post-1.unmatched: post 1
            .link-post-2.unmatched: post 2
          #info:
            #route: undefined
            #href: /404
            #is-navigating: false
            #from: undefined
            #to: undefined
          text: Page Not Found
        "
      `)
    })
  })
})
