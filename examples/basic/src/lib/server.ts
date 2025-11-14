// import 'server-only'

import { Point0 } from 'point0/core/index.js'
import { prisma } from './prisma.js'

export const source = Point0.source('server')
  .requireCtx<{
    request: Bun.BunRequest
  }>()
  .onRequest(async ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
      return new Response('{}', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  })
  // .onRequest(async ({ request }) => {
  //   if (request.method === 'OPTIONS') {
  //     const origin = request.headers.get('Origin') || '*'
  //     const allowHeaders = request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization'

  //     return new Response(null, {
  //       status: 204, // or 200
  //       headers: {
  //         'Access-Control-Allow-Origin': origin,
  //         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  //         'Access-Control-Allow-Headers': allowHeaders,
  //         'Access-Control-Max-Age': '600',
  //         Vary: 'Origin',
  //       },
  //     })
  //   }
  // })
  // .onResponse(({ response, request }) => {
  //   const origin = request.headers.get('Origin') || '*'
  //   response.headers.set('Access-Control-Allow-Origin', origin)
  //   response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  //   response.headers.set(
  //     'Access-Control-Allow-Headers',
  //     request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization',
  //   )
  //   response.headers.set('Vary', 'Origin')
  //   return response
  // })
  .ctx({
    prisma,
    env: process.env,
    Bun,
  })
  .base()
// .loader(async ({ ctx }) => {
//   return { ideasCount: await ctx.prisma.idea.count() }
// })
