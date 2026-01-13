// import fetchCookie from 'fetch-cookie'
// import { CookieJar } from 'tough-cookie'
// import { Engine } from './engine.js'
// import type { FetchFn } from '@point0/core'

// export class Fetch0 {
//   scope: string
//   serverurl: string
//   engine: Engine
//   jar: CookieJar
//   fetch: FetchFn

//   private constructor({
//     engine,
//     jar,
//     fetch,
//     scope,
//     serverurl,
//   }: {
//     engine: Engine
//     jar: CookieJar
//     fetch: FetchFn
//     scope: string
//     serverurl: string
//   }) {
//     this.engine = engine
//     this.jar = jar
//     this.fetch = fetch
//     this.scope = scope
//     this.serverurl = serverurl
//   }

//   static create(
//     options:
//       | {
//           engine: Engine
//           scope?: string
//           serverurl?: string
//         }
//       | Engine,
//   ): Fetch0 {
//     const {
//       engine,
//       scope: scopeOrUndefined,
//       serverurl: serverurlOrUndefined,
//     } = (() => {
//       if (options instanceof Engine) {
//         return { engine: options }
//       }
//       return options
//     })()
//     const scope = scopeOrUndefined ?? engine.allPointsManagers.getFirstScope()
//     if (!scope) {
//       throw new Error('No scope found in engine. Provide one here, or add points to engine first')
//     }
//     const serverurl = serverurlOrUndefined ?? engine.allPointsManagers.getFirstServerurl()
//     if (!serverurl) {
//       throw new Error('No serverurl found in engine. Provide one here, or add serverurl to one of points')
//     }
//     const jar = new CookieJar()
//     const baseFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
//       const req = input instanceof Request ? input : new Request(input, init)
//       const res = await engine.fetch(req)
//       if (!res) {
//         throw new Error(
//           'No response from engine. It basically means that dev server http upgraded, should never happen',
//         )
//       }
//       return res
//     }
//     const finalFetch = fetchCookie(baseFetch, jar)
//     return new Fetch0({ engine, jar, fetch: finalFetch, scope, serverurl })
//   }

//   static apply(options: { engine: Engine; scope?: string; serverurl?: string } | Engine): Fetch0 {
//     const fetch0 = Fetch0.create(options)
//     fetch0.apply()
//     return fetch0
//   }

//   apply() {
//     for (const pm of this.engine.allPointsManagers.pointsManagers) {
//       for (const point of pm.collection) {
//         point.point._fetchFn = this.fetch.bind(this)
//       }
//     }
//   }
// }
