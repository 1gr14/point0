import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { _defaultLogFn, isLogLevelEnabled } from '../src/logger.js'

const originalLogLevel = process.env.POINT0_LOG_LEVEL

describe('isLogLevelEnabled (POINT0_LOG_LEVEL)', () => {
  beforeEach(() => {
    delete process.env.POINT0_LOG_LEVEL
  })
  afterEach(() => {
    if (originalLogLevel === undefined) {
      delete process.env.POINT0_LOG_LEVEL
    } else {
      process.env.POINT0_LOG_LEVEL = originalLogLevel
    }
  })

  it('unset env → debug threshold, everything passes', () => {
    expect(isLogLevelEnabled('debug')).toBe(true)
    expect(isLogLevelEnabled('info')).toBe(true)
    expect(isLogLevelEnabled('warn')).toBe(true)
    expect(isLogLevelEnabled('error')).toBe(true)
  })

  it('filters entries below the configured level', () => {
    process.env.POINT0_LOG_LEVEL = 'warn'
    expect(isLogLevelEnabled('debug')).toBe(false)
    expect(isLogLevelEnabled('info')).toBe(false)
    expect(isLogLevelEnabled('warn')).toBe(true)
    expect(isLogLevelEnabled('error')).toBe(true)
  })

  it('invalid env value falls back to debug threshold', () => {
    process.env.POINT0_LOG_LEVEL = 'verbose'
    expect(isLogLevelEnabled('debug')).toBe(true)
  })

  it('the default log fn drops entries below the threshold', () => {
    process.env.POINT0_LOG_LEVEL = 'info'
    const debugSpy = spyOn(console, 'debug').mockImplementation(() => {})
    const infoSpy = spyOn(console, 'info').mockImplementation(() => {})
    try {
      _defaultLogFn({ level: 'debug', category: ['test'], message: 'dropped' })
      _defaultLogFn({ level: 'info', category: ['test'], message: 'kept' })
      expect(debugSpy).not.toHaveBeenCalled()
      expect(infoSpy).toHaveBeenCalledTimes(1)
    } finally {
      debugSpy.mockRestore()
      infoSpy.mockRestore()
    }
  })
})

describe('_defaultLogFn json mode error serialization', () => {
  const originalLogMode = process.env.LOG_MODE
  beforeEach(() => {
    process.env.LOG_MODE = 'json'
  })
  afterEach(() => {
    if (originalLogMode === undefined) {
      delete process.env.LOG_MODE
    } else {
      process.env.LOG_MODE = originalLogMode
    }
  })

  const logAndParse = (error: unknown): Record<string, any> => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    try {
      _defaultLogFn({ level: 'error', category: ['test'], message: 'boom', error })
      expect(errorSpy).toHaveBeenCalledTimes(1)
      return JSON.parse(errorSpy.mock.calls[0]?.[0] as string)
    } finally {
      errorSpy.mockRestore()
    }
  }

  it('a foreign error keeps its real name, message, and stack verbatim', () => {
    const error = new Error('[\n  {"code": "invalid_type"}\n]')
    error.name = 'ZodError'
    const payload = logAndParse(error)
    expect(payload.error).toMatchObject({
      name: 'ZodError',
      message: '[\n  {"code": "invalid_type"}\n]',
      stack: error.stack,
    })
  })

  it('a foreign error without a stack still logs name and message', () => {
    const error = new Error('no stack')
    error.stack = undefined
    const payload = logAndParse(error)
    expect(payload.error).toEqual({ name: 'Error', message: 'no stack' })
  })

  it('a foreign error logs its cause chain', () => {
    const deep = new Error('deep')
    const error = new Error('top', { cause: deep })
    const payload = logAndParse(error)
    expect(payload.error.cause).toMatchObject({ name: 'Error', message: 'deep' })
    expect(typeof payload.error.cause.stack).toBe('string')
  })

  it('toJSON is ignored for logs — the wire projection must not shape the log line', () => {
    const error = new Error('native')
    ;(error as any).toJSON = () => ({ message: 'public only' })
    const payload = logAndParse(error)
    expect(payload.error).toMatchObject({ name: 'Error', message: 'native', stack: error.stack })
  })

  it('serializePrivate() owns the log shape when present', () => {
    const error = new Error('boom')
    ;(error as any).serializePrivate = () => ({ name: 'AppError', message: 'boom', code: 'X', stack: 'custom' })
    const payload = logAndParse(error)
    expect(payload.error).toEqual({ name: 'AppError', message: 'boom', code: 'X', stack: 'custom' })
  })

  it('identity fields are backfilled when serializePrivate omits them', () => {
    const error = new Error('boom')
    error.name = 'ZodError'
    ;(error as any).serializePrivate = () => ({ code: 'X' })
    const payload = logAndParse(error)
    expect(payload.error).toMatchObject({ name: 'ZodError', message: 'boom', code: 'X', stack: error.stack })
  })

  it('a throwing serializePrivate does not kill the log entry', () => {
    const error = new Error('boom')
    ;(error as any).serializePrivate = () => {
      throw new Error('serializer broke')
    }
    const payload = logAndParse(error)
    expect(payload.error).toEqual({ message: 'serializer broke' })
  })

  it('a non-error value logs as its string form', () => {
    const payload = logAndParse('plain failure')
    expect(payload.error).toEqual({ message: 'plain failure' })
  })
})
