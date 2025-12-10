import { ServerExtractor } from '@point0/engine/server-extractor'
import { describe, expect, it } from 'bun:test'
import { ideaPage } from './idea'
import { engine } from '@/engine'

describe('idea page', () => {
  // it.concurrent('should work with point.extract', async () => {
  //   const result = await ideaPage.point.extract({
  //     input: { id: '1' },
  //     requiredCtx: { request: new Request('/') },
  //   })
  //   expect(result.status).toBe(202)
  // })
  it.concurrent('should work with Extractor.extract', async () => {
    const result = await ServerExtractor.extract({
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: { request: new Request('/') },
    })
    expect(result.status).toBe(202)
  })
  it.concurrent('should work with engine.extract', async () => {
    await engine.init({ preventClientDevServers: true })
    const result = await engine.extract({
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: { request: new Request('/') },
    })
    expect(result.status).toBe(202)
  })
})
