import { compilerBunPlugin } from './bun.js'
import type { CompilerOptions } from '../compiler.js'

/**
 * Locator the native dev server passes alongside (or instead of) `POINT0_STATIC_COMPILER_OPTIONS`, so this plugin can
 * re-import the engine in-process and read back the *function* plugin refs that JSON can't carry.
 */
export type StaticCompilerRef = {
  engineFile: string
  clientIndex: number
  built?: boolean
}

/**
 * The slice of a re-imported engine we rely on: each client's parsed compiler config (whose `markdown`/`babel` still
 * hold live plugin functions) plus its `getCompilerOptions` for the no-JSON-base case.
 */
type EngineLike = {
  clients: Array<{
    compiler: { markdown?: CompilerOptions['markdown']; babel?: CompilerOptions['babel'] } | false
    getCompilerOptions: (opts: { built?: boolean }) => CompilerOptions | false
  }>
}

type LoadEngine = (engineFile: string) => Promise<EngineLike>

const defaultLoadEngine: LoadEngine = async (engineFile) => {
  // `@point0/engine` is a peer dep — imported lazily so the compiler package keeps no hard edge back to the engine.
  const { Engine } = (await import('@point0/engine')) as {
    Engine: { findAndImportSelf: (o: { engineFile: string }) => Promise<{ engine: EngineLike }> }
  }
  const { engine } = await Engine.findAndImportSelf({ engineFile })
  return engine
}

/**
 * Resolve the compiler options for the native bun dev server's compiler plugin (this module).
 *
 * The dev server hands options to the spawned bun child over env vars. `POINT0_STATIC_COMPILER_OPTIONS` is a
 * `JSON.stringify` of the options — correct for everything except *function* plugin refs in `compiler.markdown`
 * (remark/rehype/recma) and `compiler.babel`: `JSON.stringify` silently turns functions into `null`, which then makes
 * unified/MDX compilation fail and emit empty `.mdx` modules (page export becomes `undefined`). The companion
 * `POINT0_STATIC_COMPILER_REF` lets us re-import the engine *in the same process* and read those plugins back as live
 * functions. We keep the JSON as the env-resolved base (consts, importer cwd, …) and re-attach only the function-bearing
 * `markdown`/`babel` from the live config. With only the ref (no JSON base) we reconstruct the full options.
 *
 * @tags compiler, dev-server, mdx
 * @related compilerBunPlugin, resolvePluginRef
 */
export const resolveStaticCompilerOptions = async ({
  optionsJson,
  refJson,
  loadEngine = defaultLoadEngine,
}: {
  optionsJson: string | undefined
  refJson: string | undefined
  loadEngine?: LoadEngine
}): Promise<CompilerOptions> => {
  let options = optionsJson ? (JSON.parse(optionsJson) as CompilerOptions) : undefined

  if (refJson) {
    const ref = JSON.parse(refJson) as StaticCompilerRef
    const engine = await loadEngine(ref.engineFile)
    const client = engine.clients[ref.clientIndex] as EngineLike['clients'][number] | undefined
    const live = client && client.compiler !== false ? client.compiler : undefined
    if (live) {
      if (options) {
        // Re-attach the plugin lists JSON.stringify nulled out; every other (already env-resolved) field stays.
        if (live.markdown !== undefined) options.markdown = live.markdown
        if (live.babel !== undefined) options.babel = live.babel
      } else {
        const reconstructed = client?.getCompilerOptions({ built: ref.built })
        if (reconstructed) {
          options = reconstructed
        }
      }
    }
  }

  if (!options) {
    throw new Error(
      'point0 bun-static: neither POINT0_STATIC_COMPILER_OPTIONS nor a usable POINT0_STATIC_COMPILER_REF was provided',
    )
  }
  return options
}

const options = await resolveStaticCompilerOptions({
  optionsJson: process.env.POINT0_STATIC_COMPILER_OPTIONS,
  refJson: process.env.POINT0_STATIC_COMPILER_REF,
})

export default compilerBunPlugin(options)
