import { describe, expect, it, spyOn } from 'bun:test'
import { teardownStep } from '../other.js'

describe('teardownStep', () => {
  it('returns as soon as the step finishes, and says nothing', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      let done = false
      await teardownStep('quick', async () => {
        done = true
      })
      expect(done).toBe(true)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('abandons a step that never settles, and names it', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const started = Date.now()
      await teardownStep('browser.close()', () => new Promise<void>(() => {}), 50)
      // The point of the bound: the wait ends on OUR clock, not the step's. Without it this await never returns and
      // bun charges the whole hook budget to a file whose assertions already passed.
      expect(Date.now() - started).toBeLessThan(5_000)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('browser.close()')
    } finally {
      warn.mockRestore()
    }
  })

  it('reports a step that fails fast, and still returns — a failed teardown never fails a green file', async () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await teardownStep('killTree(pid 42)', () => Promise.reject(new Error('kill: no such process')))
      expect(warn).toHaveBeenCalledTimes(1)
      const reported = String(warn.mock.calls[0]?.[0])
      expect(reported).toContain('killTree(pid 42)')
      expect(reported).toContain('kill: no such process')
    } finally {
      warn.mockRestore()
    }
  })
})
