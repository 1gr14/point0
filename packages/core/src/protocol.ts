/**
 * The wire vocabulary — every string on which two independently compiled sides must agree.
 *
 * A point0 app is built by three separate compilations that never see each other's source: the client bundle, the
 * server bundle, and the compiler's codegen. Whenever one of them writes a string the other reads back — a header name,
 * a URL path, a global the SSR html injects and the browser picks up — the two halves are joined by nothing but the
 * string itself. A typo does not fail the build; it fails at runtime, silently, in the half nobody was looking at.
 *
 * So all of those strings live here, together, and every side imports them. Reading this file top to bottom shows the
 * whole contract at once, which is the point: the previous split — where `x-point0-stream` sat in `rsc.ts` and
 * `X-Point0-Client-Build` in `stale.ts` — let the two drift into different casing without anyone noticing.
 *
 * This module imports nothing. That is a requirement, not an accident: it is pulled into the browser bundle, the server
 * runtime, AND the compiler's build-time code, so it must never drag a module graph behind it.
 *
 * Strings that never cross a package boundary do NOT belong here — the engine's dev-only orchestration headers live in
 * `@point0/engine`'s own protocol module, the compiler's virtual-module ids in `@point0/compiler`'s.
 */

/**
 * Header names are lowercase, always.
 *
 * Every path that puts one of these on the wire normalizes it: `Headers.set`/`get` are case-insensitive and emit
 * lowercase, `mergeHeaders` returns a real `Headers`, and `Effects.set.headers` lowercases the key on the way into its
 * record. So lowercase is what actually travels, and a constant spelled `X-Point0-Transform` would be describing
 * something that never exists. One spelling per header, and it is the true one — including in the generated OpenAPI
 * document, where header parameter names are case-insensitive by specification.
 */

/**
 * Gates streamed (NDJSON) client fetches for holes — `defer()` subtrees and promise props alike. Symmetric: the client
 * sends it on a data/query/mutation fetch to say "I can read a streamed body"; the server echoes it on the response to
 * say "this body IS NDJSON — line 1 is the payload, each following line fills a hole". Absent on both sides → a plain
 * single JSON body, so foreign clients, OpenAPI, and server-to-server SSR fetches are untouched (a hole degrades to
 * inline). Also the `Vary` value on a streamed response.
 */
export const POINT0_STREAM_HEADER = 'x-point0-stream'

/**
 * Response header carrying the serving client build version, set by the engine on every response attributable to a
 * client scope (SSR HTML, endpoint JSON, static files). Value format: `<scope>:<buildVersion>` — self-describing, so a
 * client runtime only reacts to headers of its OWN scope (a cross-scope fetch must not mark this client stale). Built
 * by `buildClientBuildHeaderValue`, parsed by `compareClientBuildHeaderValue`.
 */
export const POINT0_CLIENT_BUILD_HEADER = 'x-point0-client-build'

/**
 * Scope the fetch originates from, set by the client when it knows its own scope (a mounted client or a fake client).
 * The server reads it off {@link Request0} to attribute the request to a client scope — that attribution is what makes
 * {@link POINT0_CLIENT_BUILD_HEADER} scope-correct on the response.
 */
export const POINT0_FROM_SCOPE_HEADER = 'x-point0-from-scope'

/** Scope the fetch is addressed to — the scope of the point whose endpoint is being called. */
export const POINT0_TO_SCOPE_HEADER = 'x-point0-to-scope'

/**
 * Per-fetch id minted by the client. Its PRESENCE is the signal that the caller is a point0 client rather than a
 * foreign HTTP client, and the engine branches on that: a page redirect comes back as a 200 carrying
 * {@link POINT0_REDIRECT_HEADER} instead of an HTTP redirect, and a raw `Response` output is flagged with
 * {@link POINT0_NOT_JSON_DATA_HEADER}. Echoed back on the response so a client can pair the two.
 */
export const POINT0_CLIENT_REQUEST_ID_HEADER = 'x-point0-client-request-id'

/** The server's own id for the request, set on the response alongside the echoed {@link POINT0_CLIENT_REQUEST_ID_HEADER}. */
export const POINT0_REQUEST_ID_HEADER = 'x-point0-request-id'

/**
 * Which output a page endpoint should produce — `html`, `data`, or `queryClientDehydratedState`. Sent by the client
 * when it wants something other than the endpoint's default, and surfaced as a header parameter in the generated
 * OpenAPI document for SSR pages.
 */
export const POINT0_OUTPUT_TYPE_HEADER = 'x-point0-output-type'

/**
 * `'true'` when the body is encoded by the app's transformer rather than plain JSON. The client sets it on the request
 * so the server decodes the input the same way; it is a header parameter in the generated OpenAPI document so a foreign
 * client can opt in.
 */
export const POINT0_TRANSFORM_HEADER = 'x-point0-transform'

/**
 * `'true'` when the point returned a raw `Response` instead of point0-shaped data — the client must hand the body back
 * untouched rather than decode it. Set only for point0 clients (see {@link POINT0_CLIENT_REQUEST_ID_HEADER}).
 */
export const POINT0_NOT_JSON_DATA_HEADER = 'x-point0-not-json-data'

/**
 * `'true'` when a 200 response body is a serialized `RedirectTask` rather than the point's output. A page redirect must
 * not become an HTTP redirect for a point0 client — the client navigates instead — so it rides as a normal 200 that the
 * query layer recognizes as an error. Foreign clients never see this: they get the redirect as a real error response.
 */
export const POINT0_REDIRECT_HEADER = 'x-point0-redirect'

/**
 * The reserved path segment under which point0 serves everything it owns: the point endpoints
 * (`/_point0/<scope>/<type>/<name>`), the content-addressed assets (`/_point0/assets/<hash>.<ext>`), and the per-client
 * build metadata (`/_point0/<scope>/build-version.json` and friends). One segment, reserved once, so an app's own
 * routes can never collide with the framework's.
 *
 * It is a constant, not an option. The compiler bakes it into generated endpoint routes, the build writes it into the
 * output directory tree, the browser runtime fetches through it, and the server matches on it — four compilations that
 * would have to be reconfigured in lockstep. (A `_endpointPrefix` option used to exist on `Point0` and reached exactly
 * one of those four places; setting it silently broke the other three, and nothing ever set it.)
 */
export const POINT0_INTERNAL_PATH_PREFIX = '_point0'

/** {@link POINT0_INTERNAL_PATH_PREFIX} as a URL path prefix — leading and trailing slash, ready for `startsWith`. */
export const POINT0_INTERNAL_URL_PREFIX = `/${POINT0_INTERNAL_PATH_PREFIX}/`

/**
 * Directory (and URL segment) of the compiler's content-addressed assets, under {@link POINT0_INTERNAL_PATH_PREFIX}.
 * Unscoped on purpose — the bytes are addressed by their own hash, so two client builds emitting the same asset merge
 * instead of colliding.
 */
export const POINT0_ASSETS_DIR_NAME = 'assets'

/** Per-client build version file, emitted into the client build output at `_point0/<scope>/`. */
export const POINT0_BUILD_VERSION_FILE_NAME = 'build-version.json'

/** Per-client build assets file, read only by the server's fetcher to classify a request as an immutable asset. */
export const POINT0_BUILD_ASSETS_FILE_NAME = 'build-assets.json'

/** Per-client preload manifest, written at build time and read by the document render to emit preload links. */
export const POINT0_PRELOAD_MANIFEST_FILE_NAME = 'preload-manifest.json'

/**
 * URL path (and outdir-relative file path) of a client's build version file. It is emitted INTO the client build output
 * at build time, so it travels with the chunks wherever they are hosted — the point0 server, a static host, or a CDN —
 * and is always fetchable from the same base the chunks load from.
 */
export const getClientBuildVersionRoutePath = (scope: string): string =>
  `${POINT0_INTERNAL_URL_PREFIX}${scope}/${POINT0_BUILD_VERSION_FILE_NAME}`

/**
 * Base URL path of a point's endpoint: the three segments joined under the reserved prefix, and nothing else. Segments
 * must arrive already kebab-cased — this module imports nothing, so it cannot normalize them itself. Both callers (the
 * core runtime at mount time, the compiler when baking the generated points meta) kebab-case identically before
 * calling, because the server mounts only the kebab path; any other casing in the meta would describe a URL that 404s.
 */
export const getPointEndpointRoutePath = ({
  scope,
  type,
  name,
}: {
  scope: string
  type: string
  name: string
}): string => `${POINT0_INTERNAL_URL_PREFIX}${scope}/${type}/${name}`

/**
 * First element of every point0 query and mutation key. It namespaces point0's keys inside a React Query cache the app
 * may also use for its own queries — `parseQueryKey`/`parseMutationKey` recognize a key by this element alone.
 */
export const POINT0_QUERY_KEY_NAMESPACE = 'point0'

/**
 * Search-param name that carries a query endpoint's input on a GET request. Query-family reads (query, infiniteQuery,
 * and the queries behind component and provider loaders) default to GET so a CDN can cache them; the input rides in the
 * URL as `?<this>=<json>` — the exact transformer-serialized JSON a POST would put in the body, moved to the URL.
 * Shared between the client that writes it (core) and the server that reads it (engine), so the two never drift.
 */
export const POINT0_QUERY_GET_INPUT_SEARCH_PARAM = 'input'

/**
 * Globals the server render injects into the HTML and the client runtime reads back.
 *
 * These cross the widest gap in the framework: the engine writes them as text inside a `<script>` it generates, and the
 * browser bundle — compiled separately, months of commits apart in principle — reads them off `globalThis`. Nothing
 * type-checks that join, so the name is the whole contract.
 *
 * Every value here must stay a valid JS identifier: the generated scripts do not only assign to `window.<name>`, they
 * also declare `const <name> = …` locally and hand it over (see the engine's env-script bodies). A name that needs
 * bracket access would silently produce a script that does not parse.
 */

/**
 * Runtime env vars, injected per request. Read by `getEnvVars` on the client; also the target of the client build's
 * `process.env.X` define.
 */
export const POINT0_ENV_VARS_GLOBAL = '__POINT0_ENV_VARS__'

/** Build-time env consts, baked into the document (and into a statically hosted `index.html`). Read by `getEnvVars`. */
export const POINT0_ENV_CONSTS_GLOBAL = '__POINT0_ENV_CONSTS__'

/** The serving client build version, injected into every document so a loaded tab knows which build it is running. */
export const POINT0_CLIENT_BUILD_VERSION_GLOBAL = '__POINT0_CLIENT_BUILD_VERSION__'

/**
 * The SSR push channel for query results: the render emits an inline `<script>` calling it right before each resolved
 * Suspense boundary's content. A bootstrap defined ahead of the store buffers pushes until `mount()` installs the real
 * receiver — inline push scripts execute both before and after the bundle loads.
 */
export const POINT0_PUSH_QUERY_GLOBAL = '__POINT0_PUSH_QUERY__'

/** Where {@link POINT0_PUSH_QUERY_GLOBAL}'s bootstrap parks pushes that land before `mount()` installs the real receiver. */
export const POINT0_PUSH_QUERY_BUFFER_GLOBAL = '__POINT0_PUSH_QUERY_BUFFER__'

/**
 * The same channel as {@link POINT0_PUSH_QUERY_GLOBAL}, for deferred RSC subtrees — each resolving hole arrives as one
 * call.
 */
export const POINT0_PUSH_RSC_GLOBAL = '__POINT0_PUSH_RSC__'

/** Where {@link POINT0_PUSH_RSC_GLOBAL}'s bootstrap parks pushes that land before `mount()` installs the real receiver. */
export const POINT0_PUSH_RSC_BUFFER_GLOBAL = '__POINT0_PUSH_RSC_BUFFER__'

/** The dehydrated super-store, injected by the document render and consumed by `mount()` before hydration. */
export const POINT0_DEHYDRATED_SUPER_STORE_GLOBAL = '__POINT0_DEHYDRATED_SUPER_STORE__'
