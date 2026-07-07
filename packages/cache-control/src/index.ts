import type { FetcherFetchDetailedResult, FetcherFetchDetailedResultSpecific, MiddlewareFn } from '@point0/core'

/**
 * The ready-made `Cache-Control` values {@link cacheControl} uses as defaults. Exported so a callback can reuse them
 * instead of retyping header strings:
 *
 *     cacheControl({
 *       publicdir: ({ request }) =>
 *         request.location.pathname.endsWith('.pdf') ? cacheControlValues.immutable : cacheControlValues.revalidate,
 *     })
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export const cacheControlValues = {
  /** Content-hashed URLs can never serve different bytes — cache forever, never revalidate. */
  immutable: 'public, max-age=31536000, immutable',
  /** Stable names with mutable content — cache briefly, then revalidate. */
  revalidate: 'public, max-age=3600',
  /** Personalized output — no cache (shared or private) may store it. */
  noStore: 'private, no-store',
} as const

/**
 * A `Cache-Control` decision: a header string to SET, `false` to DELETE the header, or `undefined` to SKIP (leave it
 * untouched). Deleting overrides a header the app already set — a deliberate act, so only
 * {@link CacheControlOptions.override} takes the full set; the per-variant slots take {@link CacheControlSlotValue} (set
 * / skip, no delete).
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export type CacheControlValue = string | false | undefined

/**
 * A per-variant slot's value: a header string to SET, or `undefined` to SKIP (leave the response's header untouched).
 * No `false`: deleting a header would override an app-set one, which is reserved for the deliberate
 * {@link CacheControlOptions.override}, not the safe per-variant slots.
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export type CacheControlSlotValue = string | undefined

/**
 * A {@link CacheControlOptions} slot: a fixed {@link CacheControlSlotValue}, or a callback deciding per response. The
 * callback receives the same detailed result object the middleware got back from `next()` — `response`, `request`,
 * `variant` (already narrowed to the slot's variant), `scope`, `error` — and returns a string to SET or `undefined` to
 * SKIP. `undefined` means skip, not "use the default": the built-in default applies only when the slot is left
 * unconfigured; to keep it from a callback, return that value explicitly (e.g. from {@link cacheControlValues}).
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export type CacheControlValueOrFn<TVariantType extends CacheControlVariantType> =
  | CacheControlSlotValue
  | ((
      result: FetcherFetchDetailedResultSpecific<TVariantType>,
    ) => CacheControlSlotValue | Promise<CacheControlSlotValue>)

/**
 * The request variants {@link cacheControl} has a slot for. `middleware` / `options` responses have no slot (only
 * {@link CacheControlOptions.override} can touch them).
 */
export type CacheControlVariantType = 'asset' | 'publicdir' | 'page' | 'error' | 'endpoint'

/**
 * The top-level {@link CacheControlOptions.override} callback: runs for EVERY response, before anything else and above
 * the "a `Cache-Control` the app already set wins" rule. Receives the detailed result the middleware got back from
 * `next()` (`response`, `request`, `variant` — any variant, not narrowed — `scope`, `error`). Returns a header string
 * to set (overwriting any existing value), `false` to DELETE the header, or `undefined` to fall through to the normal
 * per-variant procedure. Because it bypasses the existing-header rule, an override that wants to respect a header the
 * app set must check `result.response.headers` itself.
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export type CacheControlOverrideFn = (
  result: FetcherFetchDetailedResult<any>,
) => CacheControlValue | Promise<CacheControlValue>

/**
 * Options for {@link cacheControl} — one slot per request variant (each a fixed value or a per-response callback, see
 * {@link CacheControlValueOrFn}), plus a top-level {@link CacheControlOverrideFn} escape hatch.
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export type CacheControlOptions = {
  /**
   * `asset` responses — content-hashed client-build files (bundler chunks incl. the entry, `/_point0/assets/*`), which
   * the framework marks exactly, not by guessing file names. Default `'public, max-age=31536000, immutable'`.
   */
  asset?: CacheControlValueOrFn<'asset'>
  /**
   * `publicdir` responses — stable-name static files (favicons, `robots.txt`, …). Default `'public, max-age=3600'`
   * (cache briefly, let caches revalidate).
   */
  publicdir?: CacheControlValueOrFn<'publicdir'>
  /**
   * `page` responses — server-rendered HTML. Default `'private, no-store'`: the SSR HTML embeds the dehydrated store,
   * the current user's data, so no shared cache may store and re-serve it.
   */
  page?: CacheControlValueOrFn<'page'>
  /** `error` responses — rendered the same way as pages. Default `'private, no-store'`. */
  error?: CacheControlValueOrFn<'error'>
  /**
   * `endpoint` responses — query / mutation / action. Default: untouched (unconfigured leaves them alone); set cache
   * headers in the endpoint itself when you want them.
   */
  endpoint?: CacheControlValueOrFn<'endpoint'>
  /**
   * Top-level escape hatch (see {@link CacheControlOverrideFn}): runs for every response, above the per-variant slots
   * and the existing-header rule — a string sets (overwriting), `false` deletes, `undefined` falls through to the
   * normal procedure. Use it to reach variants without a slot, or to force a policy over app-set headers.
   */
  override?: CacheControlOverrideFn
}

// The value used for a variant whose slot is left UNCONFIGURED (the key absent from options). A configured slot — even
// one set to `undefined` — takes control and never falls back here (see resolveSlot).
const defaults: { [TVariantType in CacheControlVariantType]: CacheControlSlotValue } = {
  asset: cacheControlValues.immutable,
  publicdir: cacheControlValues.revalidate,
  page: cacheControlValues.noStore,
  error: cacheControlValues.noStore,
  endpoint: undefined,
}

// Resolve a slot to its `string | undefined` value. Unconfigured → the built-in default; configured → the value as
// written (string → set, `undefined` → skip), or the callback's return (same). `undefined` is always "skip" here,
// never "use the default" — the default is reached only by leaving the slot out.
const resolveSlot = async <TVariantType extends CacheControlVariantType>(
  configured: boolean,
  valueOrFn: CacheControlValueOrFn<TVariantType> | undefined,
  defaultValue: CacheControlSlotValue,
  result: FetcherFetchDetailedResultSpecific<TVariantType>,
): Promise<CacheControlSlotValue> => {
  if (!configured) {
    return defaultValue
  }
  if (typeof valueOrFn === 'function') {
    return await valueOrFn(result)
  }
  return valueOrFn
}

/**
 * Build a `Cache-Control` Point0 middleware. Point0's handlers leave `Cache-Control` unset, so browsers and CDNs are
 * left to guess; mount this on your `root` and every response variant gets a correct value: content-hashed build files
 * (the `asset` variant) cache forever, stable-name `publicdir` files revalidate, SSR `page`/`error` HTML — which embeds
 * the current user's dehydrated store — is `private, no-store`, and `endpoint` responses stay untouched. A
 * `Cache-Control` the app already set always wins (an auth action's or a download's `no-store` is never overwritten) —
 * except through `override`, the top-level escape hatch that runs above that rule. Each slot takes a header string
 * (set), `undefined` (skip), or a per-response callback — see {@link CacheControlOptions}. Server-only by construction:
 * the compiler strips `.middleware(...)` arguments from the client bundle.
 *
 *     export const root = Point0.lets.root().middleware(cacheControl()).root()
 *
 * Full reference: https://1gr14.dev/point0/latest/cache-control
 */
export const cacheControl = (options: CacheControlOptions = {}): MiddlewareFn<any> => {
  return async ({ next }) => {
    const result = await next()
    // override runs first, for every variant, ABOVE the existing-header rule: a string sets (overwriting), `false`
    // deletes, `undefined` falls through to the normal procedure below.
    if (options.override) {
      const overridden = await options.override(result)
      if (overridden === false) {
        result.response.headers.delete('cache-control')
        return result
      }
      if (typeof overridden === 'string') {
        result.response.headers.set('Cache-Control', overridden)
        return result
      }
    }
    // A cache-control the app already set always wins (auth / stream / download → no-store).
    if (result.response.headers.has('cache-control')) {
      return result
    }
    const value = await (async (): Promise<CacheControlSlotValue> => {
      switch (result.variant.type) {
        case 'asset':
          return await resolveSlot<'asset'>(
            'asset' in options,
            options.asset,
            defaults.asset,
            result as FetcherFetchDetailedResultSpecific<'asset'>,
          )
        case 'publicdir':
          return await resolveSlot<'publicdir'>(
            'publicdir' in options,
            options.publicdir,
            defaults.publicdir,
            result as FetcherFetchDetailedResultSpecific<'publicdir'>,
          )
        case 'page':
          return await resolveSlot<'page'>(
            'page' in options,
            options.page,
            defaults.page,
            result as FetcherFetchDetailedResultSpecific<'page'>,
          )
        case 'error':
          return await resolveSlot<'error'>(
            'error' in options,
            options.error,
            defaults.error,
            result as FetcherFetchDetailedResultSpecific<'error'>,
          )
        case 'endpoint':
          return await resolveSlot<'endpoint'>(
            'endpoint' in options,
            options.endpoint,
            defaults.endpoint,
            result as FetcherFetchDetailedResultSpecific<'endpoint'>,
          )
        case 'middleware':
        case 'options':
          return undefined
      }
    })()
    if (typeof value === 'string') {
      result.response.headers.set('Cache-Control', value)
    }
    return result
  }
}
