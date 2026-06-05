import { compilerBunPlugin } from './bun.js'
import type { CompilerOptions } from '../compiler.js'

/**
 * Locator the native dev server passes alongside (or instead of) `POINT0_STATIC_COMPILER_OPTIONS`, so this plugin can
 * re-import the engine in-process and read back the _function_ plugin refs that JSON can't carry.
 */
export type StaticCompilerRef = {
  engineFile: string
  clientIndex: number
  built?: boolean
}

/**
 * The slice of a re-imported engine we rely on: each client's `getCompilerOptions`, which rebuilds the plugin-shaped
 * `CompilerOptions` in-process — with the live plugin functions for `markdown` / `babel` / `assets.svgr` that JSON
 * can't carry — or returns `false` when that client's compiler is disabled.
 */
type EngineLike = {
  clients: Array<{
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
 * `JSON.stringify` of the options — correct for everything except _function_ refs in `compiler.markdown`
 * (remark/rehype/recma), `compiler.babel`, and `compiler.assets.svgr`: `JSON.stringify` silently turns functions into
 * `null`, which then makes unified/MDX compilation fail and emit empty `.mdx` modules (page export becomes
 * `undefined`). The companion `POINT0_STATIC_COMPILER_REF` lets us re-import the engine _in the same process_ and read
 * those plugins back as live functions. We keep the JSON as the env-resolved base (consts, importer cwd, …) and
 * re-attach only the function-bearing fields from the live `getCompilerOptions()` — `markdown`, `babel`, and
 * `assets.svgr`. With only the ref (no JSON base) we reconstruct the full options.
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
    // One plugin-shaped, in-process rebuild with the live functions JSON can't carry (`false` if disabled).
    const liveOptions = client ? client.getCompilerOptions({ built: ref.built }) : false
    if (liveOptions) {
      if (options) {
        // Re-attach only the function-bearing fields `JSON.stringify` nulled out — the `markdown`/`babel` plugin
        // lists and `assets.svgr` (SVGR template / custom plugins) — all from the same live result; every other
        // (already env-resolved) field on the JSON base stays.
        if (liveOptions.markdown !== undefined) options.markdown = liveOptions.markdown
        if (liveOptions.babel !== undefined) options.babel = liveOptions.babel
        if (liveOptions.assets !== undefined) options.assets = liveOptions.assets
      } else {
        // No JSON base (only the ref) → use the freshly rebuilt options wholesale.
        options = liveOptions
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
