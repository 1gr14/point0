import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { PlaywrightPage } from './utils/playwright.js'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProject, TestProjectFactoryCreateProjectOptions } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'
import type { Engine } from '../src/engine.js'

setDefaultTimeout(20000)

const tpf = TestProjectFactory.create({
  namespace: 'navigate',
  portsRange: [3500, 3599],
})

const loaderDuration = 300
const hoverBiggerThanLoaderDuration = 400
const hoverSmallerThanLoaderDuration = 50

const layoutNavTsx = `import { root } from '../lib/root.js'
import { SimpleLink } from '@point0/wouter'
import { useOnNavigate, useLocation, useRouterContext } from '@point0/core'
import { useState } from 'react'
import { AnyLocation } from '@devp0nt/route0'
export const navLayout = root.lets('layout', 'navLayout').layout(({ children }) => {
  const location = useLocation()
  const routerContext = useRouterContext()
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
        <SimpleLink to="/">home</SimpleLink>
        <SimpleLink to="/about">about</SimpleLink>
        <SimpleLink to="/posts">posts</SimpleLink>
      </nav>
      <div id="info">
        <div id="route">{location.route || 'undefined'}</div>
        <div id="status">{routerContext.status}</div>
        <div id="is-navigating">
          {state.isNavigating === true ? 'true' : state.isNavigating === false ? 'false' : 'undefined'}
        </div>
        <div id="from">{state.prevLocation?.route || 'undefined'}</div>
        <div id="to">{state.nextLocation?.route || 'undefined'}</div>
      </div>
      {children}
    </>
  )
})
`

const pageHomeTsx = `import { navLayout } from '../layouts/nav.js'
export const homePage = navLayout.lets('page', 'home', '/').page(() => <div id="home">home</div>)
`

const aboutPageTsx = `import { navLayout } from '../layouts/nav.js'
export const aboutPage = navLayout.lets('page', 'about', '/about').page(() => <div id="about">about</div>)
`

const postsPageTsx = `import { navLayout } from '../layouts/nav.js'
import { SimpleLink } from '@point0/wouter'
export const postsPage = navLayout
  .lets('page', 'posts', '/posts')
  .loader(async () => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { posts: [1, 2] }
  })
  .page(({ data }) => (
    <div id="posts">
      {data.posts.map((post) => (
        <SimpleLink id={\`post-preview-\${post}\`} key={post} to={\`/posts/\${post}\`}>
          post {post}
        </SimpleLink>
      ))}
    </div>
  ))

`

const postPageTsx = `import { navLayout } from '../layouts/nav.js'
export const postPage = navLayout
  .lets('page', 'post', '/posts/:id')
  .loader(async ({ input }) => {
    await new Promise((r) => setTimeout(r, ${loaderDuration}))
    return { post: input.id }
  })
  .page(({ data }) => <div id="post">post {data.post}</div>)
`

async function writePages(tp: TestProject) {
  await tp.write('src/layouts/nav.tsx', layoutNavTsx)
  await tp.write('src/pages/home.tsx', pageHomeTsx)
  await tp.write('src/pages/about.tsx', aboutPageTsx)
  await tp.write('src/pages/posts.tsx', postsPageTsx)
  await tp.write('src/pages/post.tsx', postPageTsx)
}

const getTale = (page: PlaywrightPage) => {
  const originalTale = page.tale
  return originalTale.replaceAll(
    `
  #nav:
    a: home
    a: about
    a: posts`,
    '',
  )
}

type ItFn = (done: (err?: unknown) => any) => any

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
): ItFn
// function wrp(callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any): ItFn
function wrp(
  ...args: // | [callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any]
  [
    options: TestProjectFactoryCreateProjectOptions & { preserve?: boolean },
    callback: ({ tp, engine }: { tp: TestProject; engine: Engine }) => any,
  ]
): ItFn {
  // const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const [options, callback] = args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      const tries = 3
      for (let tryIndex = 0; tryIndex < tries; tryIndex++) {
        try {
          await tp.cleanup('ports')
          await tp.init()
          await writePages(tp)
          tp.spawn(['bun', 'run', 'dev'])
          await tp.waitStarted()
        } catch (error) {
          if (tryIndex === tries - 1) {
            throw error
          }
          continue
        }
        break
      }
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

describe('navigate', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
  })

  afterAll(async () => {
    await tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: true })
  })

  // in tests we see that status changes faster then is-navigating, becouse status we get right from context, while other state trigger after status changes

  it.only(
    'navigate from home to about',
    wrp({}, async ({ tp }) => {
      const page = await tp.gotoServer('/')
      await page.waitContent('#home')
      await page.original.getByRole('link', { name: 'about', exact: true }).click()
      await page.waitContent('#about')
      console.log(page.tale)
      expect(getTale(page)).toMatchInlineSnapshot(`
        "/
          #info:
            #route: /
            #status: idle
            #is-navigating: false
            #from: undefined
            #to: undefined
          #home: home
          
          #info:
            #route: /
            #status: prefetching
            #is-navigating: false
            #from: undefined
            #to: undefined
          #home: home
          
        /about
          #info:
            #route: /about
            #status: transitioning
            #is-navigating: true
            #from: /
            #to: /about
          #about: about
          
          #info:
            #route: /about
            #status: idle
            #is-navigating: true
            #from: /
            #to: /about
          #about: about
          
          #info:
            #route: /about
            #status: idle
            #is-navigating: false
            #from: undefined
            #to: undefined
          #about: about
          "
      `)
    }),
  )

  it(
    'navigate from about to news',
    wrp({}, async ({ tp }) => {}),
  )

  it(
    'navigate from page to children page',
    wrp({}, async ({ tp }) => {}),
  )

  it(
    'navigate from page to same page',
    wrp({}, async ({ tp }) => {}),
  )
})
