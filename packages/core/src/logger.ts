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
  // eslint-disable-next-line no-console
  console[options.level](
    `[${options.category.join(':')}] ${options.message}`,
    ...(options.error ? [options.error] : []),
    ...(options.meta ? [options.meta] : []),
  )
}

export const _ssClientLog = superstore.define<LogFn>('__POINT0_CLIENT_LOGGER__', () => _defaultLogFn, 'clientOnly')
export const _ssServerLog = superstore.define<LogFn>(
  '__POINT0_SERVER_LOGGER__',
  () => _defaultLogFn,
  'serverOnlyGlobal',
)
export const log: LogFn = (options) => {
  const _log = (_point0_env.side.is.client ? _ssClientLog.getWeak() : _ssServerLog.getWeak()) ?? _defaultLogFn
  _log(options)
}

/** Use when you have a point in context: prefers point/root logger, else global logger. Keeps global suitable to current context. */
export const getLogFnForPoint = (point: { _getLogFn?: () => LogFn | undefined } | undefined): LogFn => {
  const fromPoint = point?._getLogFn?.()
  return fromPoint ?? log
}
