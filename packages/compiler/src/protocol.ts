/**
 * The compiler's own vocabulary — ids and names it writes into one bundler pass and reads back in another.
 *
 * None of these travel over HTTP or reach a user's source, so they are NOT part of the framework's wire contract (that
 * one lives in `@point0/core`'s `protocol.ts`). They still deserve names: each is written in one file and matched in
 * another, and a bundler answers a mistyped id by silently not resolving the module.
 */

/** Plugin name reported to both bundlers. Shows up in their error messages and plugin ordering. */
export const POINT0_COMPILER_PLUGIN_NAME = 'point0-compiler'

/** Bun bundler namespace the virtual modules resolve into, and the one their loader is registered under. */
export const POINT0_VIRTUAL_MODULE_NAMESPACE = 'point0-virtual'

/**
 * Scheme of a virtual module id. The full id is `<scheme>?options=<uri-encoded json>` — see
 * {@link POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX}. Deliberately shaped like a bare package specifier so a bundler that has
 * not been taught about it fails loudly at resolve time instead of reading a file off disk.
 */
export const POINT0_VIRTUAL_MODULE_SCHEME = '@point0/virtual'

/** Everything before the encoded options in a virtual module id — what construction appends and parsing splits on. */
export const POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX = `${POINT0_VIRTUAL_MODULE_SCHEME}?options=`

/**
 * Matches a virtual module id. Built from {@link POINT0_VIRTUAL_MODULE_SCHEME}, which carries no regex metacharacters —
 * only the `?` that follows it needs escaping.
 */
export const virtualModulePathRegex = new RegExp(`^${POINT0_VIRTUAL_MODULE_SCHEME}\\?`)

/**
 * Prefix of the synthetic source label for a file's pre-user-babel state, used as a `sources` entry when remapping
 * source maps. `\0`-prefixed on purpose: downstream source-map consumers (Vite, bun, devtools) treat such a string as
 * an opaque identifier rather than a path, so nothing tries to URL-decode, normalize, or resolve it.
 */
export const POINT0_INTERMEDIATE_SOURCE_LABEL_PREFIX = '\0point0-pre-user-babel:'
