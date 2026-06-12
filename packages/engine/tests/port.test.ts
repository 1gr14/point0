import { afterEach, describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import { describePortHolders } from '../src/port.js'

const trackedChildren: Bun.Subprocess<any, any, any>[] = []
const trackedDirs: string[] = []

afterEach(() => {
  for (const child of trackedChildren) {
    try {
      child.kill('SIGKILL')
    } catch {
      // already gone
    }
  }
  trackedChildren.length = 0
  for (const dir of trackedDirs) {
    nodeFs.rmSync(dir, { recursive: true, force: true })
  }
  trackedDirs.length = 0
})

const getFreePort = (): number => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response('') })
  const port = probe.port
  void probe.stop(true)
  if (port === undefined) {
    throw new Error('Could not allocate a free port')
  }
  return port
}

describe('describePortHolders', () => {
  it('names the pid and command of a port holder, and stays read-only', async () => {
    const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'p0-port-'))
    trackedDirs.push(dir)
    const scriptPath = nodePath.join(dir, 'holder.js')
    const port = getFreePort()
    nodeFs.writeFileSync(
      scriptPath,
      `Bun.serve({ port: ${port}, fetch: () => new Response('x') })\nsetInterval(() => {}, 1000)\n`,
    )
    const child = Bun.spawn(['bun', scriptPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' })
    trackedChildren.push(child)
    // Wait until the child actually binds.
    const deadline = Date.now() + 5000
    let described = ''
    while (Date.now() < deadline) {
      described = await describePortHolders([port])
      if (described) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    expect(described).toContain(`pid ${child.pid}`)
    expect(described).toContain(scriptPath)
    // Read-only: the holder must still be alive afterwards.
    expect(child.exitCode).toBeNull()
  })

  it('returns an empty string for a free port', async () => {
    expect(await describePortHolders([getFreePort()])).toBe('')
  })
})
