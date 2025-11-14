// import { renderToReadableStream } from 'react-dom/server'
// import type { Eversion, EversionRun } from '../core/eversion.js'
// import type { AppComponent } from '../core/mount.js'
// import type { RootId } from '../core/types.js'
// import { renderAppAsReadableStream } from '../engine-shared/render.js'

// // eslint-disable-next-line @typescript-eslint/no-extraneous-class
// export class ClientViteUtils {
//   static prefetchAppPagePointDeepByUrl = async (
//     App: AppComponent,
//     {
//       eversion,
//       rootId,
//       url,
//     }: {
//       eversion: Eversion
//       rootId: RootId
//       url: string
//     },
//   ): Promise<EversionRun> => {
//     const { eversionRun, suitable, input } = await eversion.preparePageEversionRunByUrl({
//       url,
//       rootId,
//       requiredCtx: undefined,
//       fallbackRootId: rootId,
//     })
//     await eversionRun.prefetchAppPagePointDeep({
//       App,
//       renderToReadableStream,
//       pagePoint: suitable.point,
//       input,
//     })
//     return eversionRun
//   }

//   static renderAppAsReadableStreamByUrl = async (
//     App: AppComponent,
//     {
//       eversion,
//       rootId,
//       url,
//       env,
//       originalIndexHtml,
//       domRootElementId,
//     }: {
//       eversion: Eversion
//       rootId: RootId
//       url: string
//       env: Record<string, any>
//       originalIndexHtml: string
//       domRootElementId: string | undefined
//     },
//   ): Promise<ReadableStream> => {
//     const { eversionRun, suitable, input, location } = await eversion.preparePageEversionRunByUrl({
//       url,
//       rootId,
//       requiredCtx: undefined,
//       fallbackRootId: rootId,
//     })
//     console.log(1111114)
//     eversionRun.setSsrLocation(location)
//     eversionRun.setCurrentLocation(location)
//     console.log(1111115, eversionRun.serverGlobalState)
//     return await renderAppAsReadableStream({
//       App,
//       // getApp: async () => await this.loadAppComponent({ eversionRun }),
//       eversionRun,
//       // head: extractResult.head,
//       head: [],
//       pagePoint: suitable.point,
//       input,
//       env,
//       originalIndexHtml,
//       domRootElementId,
//     })
//   }
// }
