import { _point0_env } from './env.js'
import { superstore } from './super-store.js'

export type LoggerOptions = {
  level: 'info' | 'error' | 'warn' | 'debug'
  topic: string
  message: string
  error?: unknown
  meta?: Record<string, unknown>
}
export type LoggerFn = (options: LoggerOptions) => void
export const _defaultLoggerFn: LoggerFn = (options: LoggerOptions) => {
  // eslint-disable-next-line no-console
  console[options.level](
    `[${options.topic}] ${options.message}`,
    ...(options.error ? [options.error] : []),
    ...(options.meta ? [options.meta] : []),
  )
}

export const _ssClientLogger = superstore.define<LoggerFn>(
  '__POINT0_CLIENT_LOGGER__',
  () => _defaultLoggerFn,
  'clientOnly',
)
export const _ssServerLogger = superstore.define<LoggerFn>(
  '__POINT0_SERVER_LOGGER__',
  () => _defaultLoggerFn,
  'serverOnlyGlobal',
)
export const logger: LoggerFn = (options) => {
  const _logger =
    (_point0_env.side.is.client ? _ssClientLogger.getWeak() : _ssServerLogger.getWeak()) ?? _defaultLoggerFn
  _logger(options)
}

/** Use when you have a point in context: prefers point/root logger, else global logger. Keeps global suitable to current context. */
export const getLoggerForPoint = (point: { _getLogger?: () => LoggerFn | undefined } | undefined): LoggerFn => {
  const fromPoint = point?._getLogger?.()
  return fromPoint ?? logger
}
