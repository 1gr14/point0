import { _point0_env } from './env.js'
import { superstore } from './super-store.js'

export type LoggerOptions = {
  lever: 'info' | 'error' | 'warn' | 'debug'
  topic: string
  message: string
  error?: unknown
}
export type LoggerFn = (options: LoggerOptions) => void
export const _defaultLoggerFn: LoggerFn = (options: LoggerOptions) => {
  console[options.lever](`[${options.topic}] ${options.message}`, ...(options.error ? [options.error] : []))
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
