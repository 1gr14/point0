// import { ClientViteUtils } from 'point0/engine-bun/client-vite-utils.js'
// import App from './src/app.js'

// export const prefetchAppPagePointDeepByUrl = ClientViteUtils.prefetchAppPagePointDeepByUrl.bind(ClientViteUtils, App)
// export const renderAppAsReadableStreamByUrl = ClientViteUtils.renderAppAsReadableStreamByUrl.bind(ClientViteUtils, App)

// export const prefetchAppPagePointDeep = async ({
//   eversion,
//   rootId,
//   url,
// }: {
//   eversion: Eversion
//   rootId: RootId
//   url: string
// }): Promise<EversionRun> => {
//   const { eversionRun, suitable, input } = await eversion.preparePageEversionRunByUrl({
//     url,
//     rootId,
//     requiredCtx: undefined,
//     fallbackRootId: rootId,
//   })
//   await eversionRun.prefetchAppPagePointDeep({
//     App,
//     renderToReadableStream,
//     pagePoint: suitable.point,
//     input,
//   })
//   return eversionRun
// }

// export const renderAsReadableStream = async ({
//   eversion,
//   rootId,
//   url,
//   env,
//   originalIndexHtml,
//   domRootElementId,
// }: {
//   eversion: Eversion
//   rootId: RootId
//   url: string
//   env: Record<string, any>
//   originalIndexHtml: string
//   domRootElementId: string | undefined
// }): Promise<ReadableStream> => {
//   const { eversionRun, suitable, input, location } = await eversion.preparePageEversionRunByUrl({
//     url,
//     rootId,
//     requiredCtx: undefined,
//     fallbackRootId: rootId,
//   })
//   eversionRun.setSsrLocation(location)
//   eversionRun.setCurrentLocation(location)
//   return await renderAppAsReadableStream({
//     App,
//     // getApp: async () => await this.loadAppComponent({ eversionRun }),
//     eversionRun,
//     // head: extractResult.head,
//     head: [],
//     pagePoint: suitable.point,
//     input,
//     env,
//     originalIndexHtml,
//     domRootElementId,
//   })
// }
