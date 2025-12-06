import { Extractor } from '@point0/core/extractor'
import { describe, expect, it } from 'bun:test'
import { ideaPage } from './idea'
import { engine } from '@/engine'

describe('idea page', () => {
  it('should work with Extractor.extract', async () => {
    const result = await Extractor.extract({
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: undefined,
    })
    expect(result.status).toBe(202)
  })
  it('should work with engine.extract', async () => {
    await engine.init({ preventClientDevServers: true })
    const result = await engine.extract({
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: undefined,
    })
    expect(result.status).toBe(202)
  })
})
