import { _point0_env } from './env.js'
import { RedirectTask } from './redirect.js'

// Walk an error and its `cause` chain, invoking the global stacktrace-fixer hook on each link.
// The hook (installed by @point0/engine when running under vite dev) follows the single-error
// contract — it remaps one Error's `.stack` in place. We walk causes here so every error in
// the chain gets its stack remapped. Idempotent and safe for circular chains (seen-set).
const fixStackChain = (start: unknown): void => {
  if (_point0_env.build.was) return
  const hook = (globalThis as unknown as Record<string, unknown>).__ERROR0_FIX_STACKTRACE__
  if (typeof hook !== 'function') return
  const seen = new Set<unknown>()
  const maxDepth = 99
  let next: unknown = start
  let depth = 0
  while (next && depth < maxDepth && !seen.has(next)) {
    seen.add(next)
    try {
      ;(hook as (v: unknown) => void)(next)
    } catch {}
    next = (next as { cause?: unknown }).cause
    depth += 1
  }
}

export class ErrorPoint0 extends Error {
  status?: number
  code?: string
  redirect?: RedirectTask
  response?: Response
  headers?: Record<string, string | undefined>
  meta?: Record<string, unknown>

  constructor(
    message?: string,
    options: {
      cause?: unknown
      status?: number
      code?: string
      redirect?: RedirectTask
      response?: Response
      headers?: Record<string, string | undefined>
      meta?: Record<string, unknown>
    } = {},
  ) {
    super(message || 'Unknown error', { cause: options.cause })
    if (options.status) {
      this.status = options.status
    }
    if (options.code) {
      this.code = options.code
    }
    if (options.redirect) {
      this.redirect = options.redirect
    }
    if (options.response) {
      this.response = options.response
    }
    if (options.headers) {
      this.headers = options.headers
    }
    if (options.meta) {
      this.meta = options.meta
    }
    this.name = 'ErrorPoint0'
    Object.defineProperty(this, 'toJSON', {
      value: () => ErrorPoint0.serialize(this),
      writable: false,
      enumerable: false,
      configurable: false,
    })
    // Walk `this` and the cause chain so every link's stack is remapped (when the engine
    // installed the hook under vite dev).
    fixStackChain(this)
  }

  static from(error: unknown): ErrorPoint0 {
    if (error instanceof ErrorPoint0) {
      return error
    }
    // Mutate the original error's `.stack` chain in place before we wrap it — that way the
    // wrapped `cause` (which IS the original error) keeps a meaningful stack downstream.
    fixStackChain(error)
    const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
    const redirect = RedirectTask.is(error)
      ? error
      : record.redirect
        ? RedirectTask.from(record.redirect as never)
        : undefined
    const message =
      typeof record.message === 'string'
        ? record.message
        : typeof error === 'string'
          ? error
          : redirect
            ? 'Page Redirect'
            : 'Unknown error'
    const isErrorInstance = error instanceof Error
    const isOriginalError = isErrorInstance && error.constructor === Error
    const cause: unknown = isOriginalError || !isErrorInstance ? undefined : error
    const status = typeof record.status === 'number' ? record.status : undefined
    const code = typeof record.code === 'string' ? record.code : undefined
    const stack = typeof record.stack === 'string' ? record.stack : undefined
    const meta =
      record.meta && typeof record.meta === 'object' && !Array.isArray(record.meta)
        ? (record.meta as Record<string, unknown>)
        : undefined
    const error0 = new ErrorPoint0(message, {
      cause,
      status,
      code,
      redirect,
      meta,
    })
    if (stack) {
      error0.stack = stack
    }
    return error0
  }

  static serialize(error: ErrorPoint0): Record<string, unknown> {
    const meta = (() => {
      if (!error.meta) {
        return undefined
      }
      if (process.env.NODE_ENV === 'production') {
        return undefined
      }
      try {
        return JSON.parse(JSON.stringify(error.meta)) as Record<string, unknown>
      } catch {
        return undefined
      }
    })()
    const isStacktracePublic = process.env.NODE_ENV !== 'production'
    return {
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(meta ? { meta } : {}),
      ...(!isStacktracePublic || !error.stack ? {} : { stack: error.stack }),
      ...(error.redirect ? { redirect: error.redirect.serialize() } : {}),
    }
  }
}

export type ClassLikeError0<T extends ErrorPoint0 = ErrorPoint0> = {
  new (
    message?: string,
    options?: {
      cause?: unknown
      status?: number
      code?: any
      redirect?: RedirectTask
      response?: Response
      headers?: Record<string, string | undefined>
      meta?: Record<string, unknown>
    },
  ): T
  from(error: unknown): T
  serialize(error: T): Record<string, unknown>
}

/**
 * Registry of all `POINT0_*` error codes the framework attaches (via `error.code`) to the errors it creates. This is
 * the single source of truth: every code is written here exactly once. Keep it in sync when adding a new coded error —
 * the throw sites reference {@link POINT0_ERROR_CODES_MAP}, derived from this list, and userland can document, grep, or
 * match against it.
 */
export const POINT0_ERROR_CODES = [
  // input schema (@point0/core)
  'POINT0_INPUT_SCHEMA_PROMISE_NOT_ALLOWED',
  'POINT0_INPUT_SCHEMA_UNKNOWN',
  'POINT0_INPUT_SCHEMA_INVALID',
  'POINT0_INPUT_SCHEMA_NOT_ALLOWED',
  'POINT0_PARAMS_SCHEMA_NOT_ALLOWED',
  'POINT0_SEARCH_SCHEMA_NOT_ALLOWED',
  // prefetch (@point0/core)
  'POINT0_ROUTE_NOT_SET',
  // fetch / execute (@point0/engine)
  'POINT0_POINT_NOT_FOUND',
  'POINT0_POINT_NO_SERVER_LOADER',
  'POINT0_POINT_NO_ROUTE',
  'POINT0_CLIENT_NOT_FOUND',
  'POINT0_CLIENT_NO_INDEX_HTML',
  'POINT0_HTML_OUTPUT_UNSUPPORTED_POINT_TYPE',
  'POINT0_DEHYDRATED_STATE_UNSUPPORTED_POINT_TYPE',
  'POINT0_RSC_NOT_SUPPORTED',
  'POINT0_NO_OUTPUT',
  'POINT0_NOT_FOUND',
  'POINT0_REDIRECT',
  'POINT0_ERROR_STRINGIFY_FAILED',
] as const

export type Point0ErrorCode = (typeof POINT0_ERROR_CODES)[number]

/**
 * The same codes as {@link POINT0_ERROR_CODES}, keyed by their short name (the `POINT0_` prefix stripped) so the throw
 * sites can reference them ergonomically and stay in sync by construction: `POINT0_ERROR_CODES_MAP.NOT_FOUND ===
 * 'POINT0_NOT_FOUND'`. Built from the array above (each code written once); the assertion narrows
 * `Object.fromEntries`'s widened `{ [k: string]: string }` back to the precise key → code mapping.
 */
export const POINT0_ERROR_CODES_MAP = Object.fromEntries(
  POINT0_ERROR_CODES.map((code) => [code.replace(/^POINT0_/, ''), code]),
) as { [C in Point0ErrorCode as C extends `POINT0_${infer TShort}` ? TShort : C]: C }
