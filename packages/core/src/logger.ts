import { _point0_env } from './env.js'
import { superstore } from './super-store.js'

// Ordered by severity — the order drives the `POINT0_LOG_LEVEL` filtering below.
const logLevelsBySeverity = ['debug', 'info', 'warn', 'error'] as const
export type LogLevel = (typeof logLevelsBySeverity)[number]

export type LogOptions = {
  level: LogLevel
  category: string[]
  message: string
  error?: unknown
  meta?: Record<string, unknown>
}
export type LogFn = (options: LogOptions) => void

/**
 * Whether entries of this level pass the `POINT0_LOG_LEVEL` threshold. Unset or invalid env → `debug`, i.e. everything
 * passes. The default log fn checks it on every entry; a custom log fn receives all entries regardless — call this
 * helper inside your receiver to honor the same env var.
 */
export const isLogLevelEnabled = (level: LogLevel): boolean => {
  const minLevel =
    process.env.POINT0_LOG_LEVEL && logLevelsBySeverity.includes(process.env.POINT0_LOG_LEVEL as LogLevel)
      ? (process.env.POINT0_LOG_LEVEL as LogLevel)
      : 'debug'
  return logLevelsBySeverity.indexOf(level) >= logLevelsBySeverity.indexOf(minLevel)
}

// A foreign Error for the json log: identity and stack verbatim, plus the cause chain (with
// cycle and depth guards) — nothing the operator needs is dropped.
const _serializeErrorForLog = (error: Error, seen = new Set<unknown>(), depth = 0): Record<string, unknown> => {
  seen.add(error)
  const record: Record<string, unknown> = { name: error.name, message: error.message }
  if (error.stack) {
    record.stack = error.stack
  }
  const cause = (error as { cause?: unknown }).cause
  if (cause instanceof Error && !seen.has(cause) && depth < 99) {
    record.cause = _serializeErrorForLog(cause, seen, depth + 1)
  }
  return record
}

export const _defaultLogFn: LogFn = (options: LogOptions) => {
  if (!isLogLevelEnabled(options.level)) {
    return
  }
  const valideModes = ['json', 'pretty'] as const
  type ValidMode = (typeof valideModes)[number]
  const modeByProcessEnv =
    process.env.LOG_MODE && valideModes.includes(process.env.LOG_MODE as ValidMode)
      ? (process.env.LOG_MODE as ValidMode)
      : undefined
  const mode: ValidMode = modeByProcessEnv ?? (_point0_env.mode.is.production ? 'json' : 'pretty')
  if (mode === 'json') {
    const serializedError = (() => {
      try {
        if (!options.error) {
          return undefined
        }
        const error = options.error
        // The log contract is serializePrivate() (ErrorPoint0, error0, any custom class) — never
        // toJSON, which is the public wire projection and strips exactly what an operator needs.
        // Identity fields are backfilled so a misconfigured serializer can't produce an
        // anonymous log line. A foreign error keeps its real name, message, stack, and cause
        // chain verbatim — dropping them makes an uncaught exception undiagnosable from json logs.
        const record =
          typeof error === 'object' &&
          'serializePrivate' in error &&
          typeof (error as { serializePrivate: unknown }).serializePrivate === 'function'
            ? ((error as { serializePrivate: () => unknown }).serializePrivate() as Record<string, unknown>)
            : undefined
        if (record && typeof record === 'object') {
          if (error instanceof Error) {
            record.name ??= error.name
            record.message ??= error.message
            if (record.stack === undefined && error.stack) {
              record.stack = error.stack
            }
          }
          return record
        }
        return error instanceof Error ? _serializeErrorForLog(error) : { message: String(error) }
      } catch (error) {
        return {
          message: error instanceof Error ? error.message : String(error),
        }
      }
    })()
    const payload = {
      level: options.level,
      category: options.category.join(':'),
      message: options.message,
      ...(options.error !== undefined ? { error: serializedError } : {}),
      ...(options.meta ? { meta: options.meta } : {}),
    }
    // eslint-disable-next-line no-console
    console[options.level](JSON.stringify(payload))
    return
  }

  const categoryPrefix = `[${options.category.join(':')}]`
  const trailingArgs = [...(options.error ? [options.error] : []), ...(options.meta ? [options.meta] : [])]

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Browser console supports `%c` to apply CSS styles.
    // eslint-disable-next-line no-console
    console[options.level](`%c${categoryPrefix}%c ${options.message}`, 'font-weight: bold;', '', ...trailingArgs)
    return
  }

  const boldPrefix = `\u001b[1m${categoryPrefix}\u001b[22m`
  // eslint-disable-next-line no-console
  console[options.level](`${boldPrefix} ${options.message}`, ...trailingArgs)
}

export const _ssClientLog = superstore.define<LogFn>('__POINT0_CLIENT_LOGGER__', () => _defaultLogFn, 'clientOnly')
export const _ssServerLog = superstore.define<LogFn>(
  '__POINT0_SERVER_LOGGER__',
  () => _defaultLogFn,
  'serverOnlyGlobal',
)
export const log: LogFn = (options) => {
  const _log =
    (_point0_env.side.is.client ? _ssClientLog.getOrUndefined() : _ssServerLog.getOrUndefined()) ?? _defaultLogFn
  _log(options)
}

/**
 * Use when you have a point in context: prefers point/root logger, else global logger. Keeps global suitable to current
 * context.
 */
export const getLogFnForPoint = (point: { _getLogFn?: () => LogFn | undefined } | undefined): LogFn => {
  const fromPoint = point?._getLogFn?.()
  return fromPoint ?? log
}
