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
