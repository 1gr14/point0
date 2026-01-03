import { Executor } from '@point0/engine/executor'
import { describe, expect, it } from 'bun:test'
import { ideaPage } from './idea'
import { engine } from '@/engine'

describe('idea page', () => {
  // it.concurrent('should work with point.execute', async () => {
  //   const result = await ideaPage.point.execute({
  //     input: { id: '1' },
  //     requiredCtx: { request: new Request('/') },
  //   })
  //   expect(result.status).toBe(202)
  // })
  it.concurrent('should work with Executor.execute', async () => {
    const result = await Executor.execute({
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: { zxc: 123 },
    })
    expect(result.status).toBe(202)
  })
  it.concurrent('should work with engine.execute', async () => {
    await engine.init({ preventClientDevServers: true })
    const result = await engine.execute({
      // TODO: allow guess request by point and input
      point: ideaPage.point,
      input: { id: '1' },
      requiredCtx: { zxc: 123 },
    })
    expect(result.status).toBe(202)
  })
})
