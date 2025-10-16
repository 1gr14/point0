import { Route0 } from '@devp0nt/route0'
import { afterEach, beforeEach, describe, it, expect } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import React from 'react'
import { ServerPage0 } from '../server/page.js'
import { serve, HeadersInit } from 'bun'
import { renderToReadableStream } from 'react-dom/server'
import { Elysia, HTTPHeaders } from 'elysia'

describe('Page0', () => {
  const testDir = nodePath.join(__dirname, 'test-temp')

  beforeEach(() => {
    nodeFs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    nodeFs.rmSync(testDir, { recursive: true, force: true })
  })

  // three modes
  // 1. ClientPage0<> — client only
  // 2. ClientPage0<typeof serverPage0> — server only
  // 3. ClientPage0<typeof serverPage0, true> — server first call, then client routing

  // it('should work with server and client in same time', () => {
  //   // fake
  //   const fakeIdaes = Array.from({ length: 10 }, (_, i) => ({
  //     id: i,
  //     title: `Idea ${i}`,
  //     description: `Description of idea ${i}`,
  //   }))
  //   type Idea = (typeof fakeIdaes)[number]
  //   const fakeUsers = Array.from({ length: 10 }, (_, i) => ({
  //     id: i,
  //     name: `User ${i}`,
  //     password: `password${i}`,
  //     email: `user${i}@example.com`,
  //   }))
  //   type User = (typeof fakeUsers)[number]

  //   // server/lib/prisma.ts
  //   const prisma = {
  //     idea: {
  //       count: async () => fakeIdaes.length,
  //       findUniqueOrThrow: async (id: number) => fakeIdaes.find((idea) => idea.id === id),
  //       findMany: async () => fakeIdaes,
  //     },
  //     user: {
  //       count: async () => fakeUsers.length,
  //       findUniqueOrThrow: async (id: number) => fakeUsers.find((user) => user.id === id),
  //       findMany: async () => fakeUsers,
  //     },
  //   }

  //   // server/lib/page.ts
  //   const serverPage0 = new ServerPage0<{ user: User | null }>()
  //     .ctx({
  //       prisma,
  //     })
  //     // this will preset data which will come to the client
  //     .loader(async (ctx) => {
  //       return {
  //         user: ctx.user && {
  //           id: ctx.user.id,
  //           name: ctx.user.name,
  //           email: ctx.user.email,
  //         },
  //       }
  //     })
  //     .loader(async (ctx, data) => {
  //       return {
  //         ...data,
  //         someDataFromServer: 'exists',
  //       }
  //     })
  //     // this overrides server ctx
  //     .ctx(async (ctx) => {
  //       return {
  //         ...ctx,
  //         word: 'server',
  //         num: 0,
  //         hello: (person: string) => `server says hello to ${person}`,
  //         bye: (person: string) => `server says bye to ${person}`,
  //       }
  //     })

  //   // client/lib/api.ts
  //   const api = {
  //     idea: {
  //       count: async () => fakeIdaes.length,
  //       get: async (id: number) => fakeIdaes.find((idea) => idea.id === id),
  //       list: async () => fakeIdaes,
  //     },
  //     user: {
  //       me: async () => fakeUsers.find((user) => user.id === 0),
  //     },
  //   }

  //   // client/layouts/general.tsx
  //   const GeneralLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  //     return (
  //       <div>
  //         <h1>IdeaNick</h1>
  //         <ul>
  //           <li>
  //             <a href="/">Home</a>
  //           </li>
  //           <li>
  //             <a href="/ideas">Ideas</a>
  //           </li>
  //         </ul>
  //         <hr />
  //         <div>{props.children}</div>
  //       </div>
  //     )
  //   }
  //   // client/layouts/ideas.tsx
  //   const IdeasLayout: React.FC<{ children: React.ReactNode }> = (props) => {
  //     const ideasCount = page0.useCtx((ctx) => ctx.ideasCount)
  //     return (
  //       <div>
  //         <h1>There are {ideasCount} ideas</h1>
  //         <hr />
  //         <div>{props.children}</div>
  //       </div>
  //     )
  //   }

  //   // client/lib/page.ts
  //   // import type { serverPage0 } from 'server/lib/page.ts'
  //   const page0 = new ClientPage0<typeof serverPage0>()
  //     // this overrides client ctx
  //     .ctx({
  //       num: 1,
  //       hello: (person: string) => `client says hello to ${person}`,
  //     })
  //     .loaderServer(async (ctx, data) => {
  //       return {
  //         ...data,
  //         loaderServerResult: 'exists',
  //       }
  //     })
  //     .loader(async (ctx, data) => {
  //       return {
  //         ...data,
  //         loaderUniversalResult: 'exists',
  //       }
  //     })
  //     .loaderClient(async (ctx, data) => {
  //       return {
  //         ...data,
  //         loaderClientResult: 'exists',
  //       }
  //     })
  //     .loaderServer(async (ctx, data) => {
  //       return {
  //         ...data,
  //         loaderServerResultAgain: 'exists',
  //       }
  //     })
  //     .ctx(async (ctx) => {
  //       return {
  //         ...ctx,
  //         ciao: (person: string) => `client says ciao to ${person}`,
  //       }
  //     })
  //     .layout({
  //       base: async () => GeneralLayout, // always used
  //       default: async () => GeneralLayout, // will be set if none provided
  //       general: async () => GeneralLayout, // alias
  //       ideas: async () => IdeasLayout, // alias
  //     })
  //     .widget({
  //       Loading: () => <div>Loading...</div>,
  //       ErrorComponent: (error: unknown) => <div>Error: {(error as any).message}</div>,
  //     })
  //   const ideasPage0 = page0.layout('ideas')

  //   // client/routes.ts
  //   const homeRoute = Route0.create('/')
  //   const ideasRoute = homeRoute.extend('/ideas')
  //   const ideaRoute = ideasRoute.extend('/:id')

  //   // client/pages/home.ts
  //   const UsualComponent = async (ctx) => {
  //     const x = page0.useCtx(async () => {
  //       return await ctx.server.prisma.idea.count()
  //     })
  //     return <div>Usual {x}.</div>
  //   }
  //   const homePage = page0.route(homeRoute).component((ctx) => {
  //     const x = ctx.server.hello('world')
  //     return (
  //       <div>
  //         <UsualComponent /> <div>Change the world with your ideas! {x}</div>
  //       </div>
  //     )
  //   })
  //   // client/pages/ideas.ts
  //   const ideasPage = page0
  //     .route(ideasRoute)
  //     .layout('ideas')
  //     .component(() => {
  //       return <div>Ideas</div>
  //     })
  //   // client/pages/idea.ts
  //   const ideaPage = ideasPage0
  //     .route(ideaRoute)
  //     .loaderServer(async (ctx, data, route) => {
  //       return {
  //         ...data,
  //         idea: await ctx.prisma.idea.findUniqueOrThrow(route.params.id),
  //         serverHelloResult: ctx.hello('world'),
  //         serverByeResult: ctx.bye('world'),
  //       }
  //     })
  //     .loader(async (ctxs, data, route) => {
  //       if (ctxs.server) {
  //         return {
  //           ...data,
  //           universalHelloResult: ctxs.server.hello('world'),
  //           universalByeResult: ctxs.server.bye('world'),
  //         }
  //       } else {
  //         return {
  //           ...data,
  //           universalHelloResult: ctxs.client.hello('world'),
  //           universalByeResult: ctxs.client.bye('world'),
  //         }
  //       }
  //     })
  //     .loader(async (ctxs, data, location) => {
  //       return {
  //         ...data,
  //         // server context overrided by client context
  //         universalHelloResult: ctxs.server.client.hello('world'),
  //         // client context overrided by server context
  //         universalByeResult: ctxs.client.server.bye('world'),
  //       }
  //     })
  //     .loaderClient(async (ctx, data, location) => {
  //       return {
  //         ...data,
  //         idea: await ctx.prisma.idea.findUniqueOrThrow(location.params.id),
  //       }
  //     })
  //     .component(() => {
  //       return <div>Idea</div>
  //     })

  //   // client/lib/pages.ts
  //   const pages = [
  //     [homeRoute, async () => homePage],
  //     [ideasRoute, async () => ideasPage],
  //     [ideaRoute, async () => ideaPage],
  //   ]

  //   // client/index.ts
  //   const App = () => {
  //     return (
  //       <div>
  //         <page0.Provider pages={pages}>
  //           <span>something before</span>
  //           <page0.Outlet />
  //           <span>something after</span>
  //         </page0.Provider>
  //       </div>
  //     )
  //   }

  //   // server/index.ts
  //   // import { pages } from 'client/lib/pages.ts'
  //   serve({
  //     port: process.env.PORT,
  //     routes: {
  //       '/*': async ({ url }) => {
  //
  //         const pageRendered = serverPage0.render({url, pages})
  //         const stream = await renderToReadableStream(pageRendered)
  //         return new Response(stream, {
  //           headers: { 'Content-Type': 'text/html' },
  //         })
  //       },
  //     },
  //   })
  // })
})

// const App = () => {
//   return (
//     <page0.router
//       pages={[
//         [homeRoute, async () => homePage, async () => GeneralLayout],
//         [ideasRoute, async () => ideasPage, async () => IdeasLayout, async () => GeneralLayout],
//         [ideaRoute, async () => ideaPage, async () => IdeasLayout, async () => GeneralLayout],
//       ]}
//     />
//   )
// }

//         const renderedPage0 = renderServerPage0({ url, pages })
//         const stream = await renderToReadableStream(renderedPage0)
//         return new Response(stream, {
//           headers: { 'Content-Type': 'text/html' },
//         })
