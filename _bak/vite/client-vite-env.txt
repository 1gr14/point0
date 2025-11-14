// import crypto from 'node:crypto'
// import { promises as fs } from 'node:fs'
// import { tmpdir } from 'node:os'
// import { join } from 'node:path'
// import type { ViteDevServer } from 'vite'

// export async function createViteEnvironment(vite: ViteDevServer, options: { ssr?: boolean; sandbox?: boolean } = {}) {
//   const cache = new Map<string, any>()

//   async function transformAndImport(id: string) {
//     const result = await vite.transformRequest(id, { ssr: !!options.ssr })
//     if (!result?.code) throw new Error(`Failed to transform ${id}`)

//     // создаём уникальное имя файла
//     const hash = crypto.createHash('md5').update(id).digest('hex')
//     const tmpPath = join(tmpdir(), `vite-env-${hash}.mjs`)

//     await fs.writeFile(tmpPath, result.code, 'utf8')

//     // импортируем как обычный ESM
//     const mod = await import(tmpPath + `?t=${Date.now()}`)

//     cache.set(id, mod)
//     return mod
//   }

//   vite.watcher.on('change', (file) => {
//     const normalized = '/' + file.replace(vite.config.root, '').replace(/\\/g, '/')
//     if (cache.has(normalized)) {
//       console.log(`[HMR] Reloading ${normalized}`)
//       cache.delete(normalized)
//       transformAndImport(normalized).catch(console.error)
//     }
//   })

//   return {
//     importModule: transformAndImport,
//     dispose() {
//       cache.clear()
//     },
//   }
// }

// export async function viteImport(vite: ViteDevServer, id: string) {
//   // ⚠️ Без SSR — тогда Vite вернёт чистый JS без хелперов
//   const res = await vite.transformRequest(id, { ssr: false })
//   if (!res?.code) throw new Error(`Failed to transform ${id}`)

//   // чистим sourcemap
//   const code = res.code.replace(/\/\/# sourceMappingURL=.*$/gm, '')

//   // сохраняем во временный .mjs
//   const hash = crypto.createHash('md5').update(id).digest('hex')
//   const tmpPath = join(tmpdir(), `vite-${hash}.mjs`)
//   await fs.writeFile(tmpPath, code, 'utf8')

//   // выполняем как обычный ESM в текущем контексте
//   const mod = await import(tmpPath + `?t=${Date.now()}`)
//   return mod
// }
