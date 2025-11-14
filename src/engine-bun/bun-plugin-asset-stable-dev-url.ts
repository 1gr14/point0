// import { plugin } from 'bun'
// import type { BunPlugin } from 'bun'
// import { createHash } from 'node:crypto'
// import { mkdir, writeFile, stat } from 'node:fs/promises'
// import path from 'node:path'

// export interface AssetStableUrlOptions {
//   /** Absolute path to directory where assets will be copied */
//   distDirPath?: string

//   /** Public URL route, e.g. "/", "/static", "/assets", etc */
//   distRoutePath?: string

//   /** Regex for files to process */
//   filter?: RegExp
// }

// // export function assetStableUrlPlugin(options?: AssetStableUrlOptions): BunPlugin {
// //   const {
// //     distDirPath = path.resolve(process.cwd(), 'development-assets'),
// //     distRoutePath = '/',
// //     filter = /\.(svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|avif|pdf|txt|bin|webm|mp4|mp3|woff|woff2|ttf|eot|otf)$/i,
// //   } = options ?? {}

// //   console.log(234234234234, distDirPath)

// //   return {
// //     name: 'asset-stable-url',

// //     setup(build) {
// //       console.log('setup')
// //       // STEP 1 — RESOLVE (namespace = "stable-asset")
// //       build.onResolve({ filter }, (args) => {
// //         const resolved = path.resolve(args.importer ? path.dirname(args.importer) : '', args.path)
// //         console.log(3434343434, resolved)
// //         return {
// //           path: resolved,
// //           namespace: 'stable-asset',
// //         }
// //       })

// //       // STEP 2 — LOAD (copy file & export URL)
// //       build.onLoad({ filter, namespace: 'stable-asset' }, async (args) => {
// //         console.log('onLoad')
// //         const assetPath = args.path
// //         const file = Bun.file(assetPath)
// //         const buffer = await file.arrayBuffer()

// //         // Compute stable hash
// //         const hash = createHash('sha1').update(Buffer.from(buffer)).digest('hex').slice(0, 16)

// //         const ext = path.extname(assetPath)
// //         const basename = path.basename(assetPath, ext)

// //         const outFile = `${basename}-${hash}${ext}`
// //         const outPath = path.join(distDirPath, outFile)

// //         // Ensure target directory exists
// //         try {
// //           await stat(distDirPath)
// //         } catch {
// //           await mkdir(distDirPath, { recursive: true })
// //         }

// //         // Write file only if missing (cache)
// //         try {
// //           await stat(outPath)
// //         } catch {
// //           await writeFile(outPath, Buffer.from(buffer))
// //         }

// //         // Final public URL
// //         const normalizedRoute = distRoutePath.endsWith('/') ? distRoutePath.slice(0, -1) : distRoutePath

// //         const publicUrl = `${normalizedRoute}/${outFile}`

// //         return {
// //           contents: `export default ${JSON.stringify(publicUrl)};`,
// //           loader: 'js',
// //         }
// //       })
// //     },
// //   }
// // }

// // const plugin = assetStableUrlPlugin()

// // console.log(plugin)

// const distDirPath = path.resolve(process.cwd(), 'development-assets')
// const distRoutePath = '/'
// const filter = /\.(svg|png|jpg|jpeg|gif|webp|ico|bmp|tiff|avif|pdf|txt|bin|webm|mp4|mp3|woff|woff2|ttf|eot|otf)$/i

// export const pluginAssetStableDevUrl: BunPlugin = {
//   name: 'asset-stable-dev-url',
//   setup(build) {
//     console.log('setup')
//     // build.onResolve({ filter, namespace: 'file' }, (args) => {
//     //   console.log(3434343434, args.path, args)
//     //   if (args.path.startsWith('images/')) {
//     //     return {
//     //       path: args.path.replace('images/', './public/images/'),
//     //     }
//     //   }
//     //   return undefined
//     // })

//     // build.onResolve({ filter }, (args) => {
//     //   const distAbs = path.resolve(args.importer ? path.dirname(args.importer) : '', args.path)
//     //   const dist
//     //   console.log(3434343434, distAbs)
//     //   return {
//     //     path: distAbs,
//     //     // namespace: 'file',
//     //   }
//     // })

//     // STEP 2 — LOAD (copy file & export URL)
//     build.onLoad({ filter, namespace: 'file' }, async (args) => {
//       console.log('onLoad', args)
//       const assetPath = args.path
//       const file = Bun.file(assetPath)
//       const buffer = await file.arrayBuffer()
//       // Compute stable hash
//       const hash = createHash('sha1').update(Buffer.from(buffer)).digest('hex').slice(0, 16)
//       const ext = path.extname(assetPath)
//       const basename = path.basename(assetPath, ext)
//       const outFile = `${basename}-${hash}${ext}`
//       const outPath = path.join(distDirPath, outFile)
//       // Ensure target directory exists
//       try {
//         await stat(distDirPath)
//       } catch {
//         await mkdir(distDirPath, { recursive: true })
//       }
//       // Write file only if missing (cache)
//       try {
//         await stat(outPath)
//       } catch {
//         await writeFile(outPath, Buffer.from(buffer))
//       }
//       // Final public URL
//       const normalizedRoute = distRoutePath.endsWith('/') ? distRoutePath.slice(0, -1) : distRoutePath
//       const publicUrl = `${normalizedRoute}/${outFile}`
//       return {
//         contents: `export default ${JSON.stringify(publicUrl)};`,
//         loader: 'js',
//       }
//     })
//   },
// }

// console.log(123)

// export default pluginAssetStableDevUrl

// void plugin(pluginAssetStableDevUrl)
