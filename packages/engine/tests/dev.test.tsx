import { describe, expect, it } from 'bun:test'
import { TestProjectFactory } from './utils/project.js'

const tpf = TestProjectFactory.create({
  namespace: 'dev',
})

describe('dev', () => {
  it('should copy template to temp dir', async () => {
    const tp = await tpf.init()
    expect(await tp.files.packageJson.text()).toContain(tp.name)
  })
})
