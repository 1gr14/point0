import { _point0_env } from './env.js'
import { superstore } from './super-store.js'

export type LogOptions = {
  level: 'info' | 'error' | 'warn' | 'debug'
  category: string[]
  message: string
  error?: unknown
  meta?: Record<string, unknown>
}
export type LogFn = (options: LogOptions) => void
export const _defaultLogFn: LogFn = (options: LogOptions) => {
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
        return !options.error
          ? undefined
          : typeof options.error === 'object' && 'toJSON' in options.error && typeof options.error.toJSON === 'function'
            ? options.error.toJSON()
            : { message: options.error instanceof Error ? options.error.message : String(options.error) }
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

/** Use when you have a point in context: prefers point/root logger, else global logger. Keeps global suitable to current
context. */
export const getLogFnForPoint = (point: { _getLogFn?: () => LogFn | undefined } | undefined): LogFn => {
  const fromPoint = point?._getLogFn?.()
  return fromPoint ?? log
}
