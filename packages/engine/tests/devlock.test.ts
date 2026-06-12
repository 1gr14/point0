import { afterEach, describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import {
  isProcessAlive,
  readDevLock,
  removeDevLockSync,
  reapDevTree,
  stopAllDevTrees,
  writeDevLock,
  type DevLock,
} from '../src/devlock.js'
import { killPort } from '../src/port.js'
import { getProcessInfo, parsePsEtimeLine } from '../src/proc.js'

// The whole point of the devlock identity checks is "never kill what is not provably ours": a stale lockfile's PID may
// have been recycled by an unrelated process, and a recorded port may be held by someone else's server by now. These
// tests exercise the kill paths against real spawned processes — each scenario spawns one tiny child, so the suite
// stays in the fast bucket (no dev trees, no Playwright).

const trackedChildren: Bun.Subprocess<any, any, any>[] = []
const trackedLocks: Array<{ cwd: string; ports: number[] }> = []
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
  for (const lock of trackedLocks) {
    removeDevLockSync(lock.cwd, lock.ports)
  }
  trackedLocks.length = 0
  for (const dir of trackedDirs) {
    nodeFs.rmSync(dir, { recursive: true, force: true })
  }
  trackedDirs.length = 0
})

const makeTmpDir = (prefix: string): string => {
  const dir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), prefix))
  trackedDirs.push(dir)
  return dir
}

const writeTrackedLock = async (lock: DevLock): Promise<void> => {
  await writeDevLock(lock)
  trackedLocks.push({ cwd: lock.cwd, ports: lock.ports })
}

/** A PID that is guaranteed dead: spawn a no-op child and wait for it to exit. */
const getDeadPid = async (): Promise<number> => {
  const child = Bun.spawn(['bun', '-e', ''], { stdout: 'ignore', stderr: 'ignore' })
  await child.exited
  return child.pid
}

/** Spawn a long-lived child whose command line is the given script path. */
const spawnKeepAlive = (scriptPath: string, scriptContent: string): Bun.Subprocess<'ignore', 'ignore', 'ignore'> => {
  nodeFs.writeFileSync(scriptPath, scriptContent)
  const child = Bun.spawn(['bun', scriptPath], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' })
  trackedChildren.push(child)
  return child
}

const KEEP_ALIVE_SCRIPT = `process.on('SIGTERM', () => process.exit(0))\nsetInterval(() => {}, 1000)\n`

const serverScript = (port: number): string =>
  `process.on('SIGTERM', () => process.exit(0))\nBun.serve({ port: ${port}, fetch: () => new Response('x') })\nsetInterval(() => {}, 1000)\n`

const getFreePort = (): number => {
  const probe = Bun.serve({ port: 0, fetch: () => new Response('') })
  const port = probe.port
  void probe.stop(true)
  if (port === undefined) {
    throw new Error('Could not allocate a free port')
  }
  return port
}

const waitFor = async (check: () => boolean, timeoutMs = 5000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (check()) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return check()
}

const isPortBound = (port: number): boolean => {
  try {
    const probe = Bun.serve({ port, fetch: () => new Response('') })
    void probe.stop(true)
    return false
  } catch {
    return true
  }
}

const waitForPortBound = async (port: number): Promise<void> => {
  const bound = await waitFor(() => isPortBound(port))
  expect(bound).toBe(true)
}

const baseLock = (overrides: Partial<DevLock> & Pick<DevLock, 'pid' | 'cwd' | 'ports'>): DevLock => ({
  ppid: 1,
  startedAt: new Date().toISOString(),
  pidStartedAt: new Date().toISOString(),
  cli: '/definitely/not/a/real/path/point0',
  ...overrides,
})

describe('parsePsEtimeLine', () => {
  const now = 1_000_000_000_000
  it('parses mm:ss', () => {
    expect(parsePsEtimeLine('   01:23 bun run x', now)).toEqual({ command: 'bun run x', startedAtMs: now - 83_000 })
  })
  it('parses hh:mm:ss', () => {
    expect(parsePsEtimeLine('12:34:56 /usr/bin/foo --bar', now)).toEqual({
      command: '/usr/bin/foo --bar',
      startedAtMs: now - (12 * 3600 + 34 * 60 + 56) * 1000,
    })
  })
  it('parses dd-hh:mm:ss', () => {
    expect(parsePsEtimeLine('2-03:04:05 srv', now)).toEqual({
      command: 'srv',
      startedAtMs: now - (2 * 86_400 + 3 * 3600 + 4 * 60 + 5) * 1000,
    })
  })
  it('rejects garbage', () => {
    expect(parsePsEtimeLine('not a ps line', now)).toBeUndefined()
    expect(parsePsEtimeLine('', now)).toBeUndefined()
  })
})

describe('getProcessInfo', () => {
  it('reports a live process command and a recent start time', async () => {
    const dir = makeTmpDir('p0-proc-')
    const scriptPath = nodePath.join(dir, 'keep-alive.js')
    const child = spawnKeepAlive(scriptPath, KEEP_ALIVE_SCRIPT)
    const info = await getProcessInfo(child.pid)
    expect(info).toBeDefined()
    expect(info!.command).toContain(scriptPath)
    expect(Math.abs(info!.startedAtMs - Date.now())).toBeLessThan(15_000)
  })
  it('returns undefined for a dead pid', async () => {
    expect(await getProcessInfo(await getDeadPid())).toBeUndefined()
  })
})

describe('dev lockfile', () => {
  it('round-trips the identity fields and tolerates locks from older versions', async () => {
    const cwd = makeTmpDir('p0-lock-')
    const lock = baseLock({ pid: 12345, cwd, ports: [4001, 4002] })
    await writeTrackedLock(lock)
    expect(readDevLock(cwd, [4001, 4002])).toEqual(lock)
    // Older lock shape: no pidStartedAt / cli. Overwrite the same file with the old shape.
    await writeTrackedLock({ ...lock, pidStartedAt: undefined, cli: undefined })
    const reread = readDevLock(cwd, [4001, 4002])
    expect(reread?.pid).toBe(12345)
    expect(reread?.pidStartedAt).toBeUndefined()
    expect(reread?.cli).toBeUndefined()
  })
})

describe('stopAllDevTrees', () => {
  it('removes a stale lock (dead pid, no ports) without claiming anything was stopped', async () => {
    const cwd = makeTmpDir('p0-stale-')
    await writeTrackedLock(baseLock({ pid: await getDeadPid(), cwd, ports: [] }))
    const results = await stopAllDevTrees({ cwd })
    expect(results).toHaveLength(1)
    expect(results[0].stopped).toBe(false)
    expect(results[0].staleLockRemoved).toBe(true)
    expect(results[0].orchestratorStopped).toBe(false)
    expect(results[0].orphansKilled).toEqual([])
    expect(readDevLock(cwd, [])).toBeUndefined()
  })

  it('never signals a recycled pid (live process whose command does not match)', async () => {
    const cwd = makeTmpDir('p0-recycled-')
    const dir = makeTmpDir('p0-recycled-other-')
    const child = spawnKeepAlive(nodePath.join(dir, 'innocent.js'), KEEP_ALIVE_SCRIPT)
    // The lock claims this pid is a point0 orchestrator — but the live process is an unrelated script.
    await writeTrackedLock(baseLock({ pid: child.pid, cwd, ports: [] }))
    const results = await stopAllDevTrees({ cwd })
    expect(results[0].stopped).toBe(false)
    expect(results[0].staleLockRemoved).toBe(true)
    expect(isProcessAlive(child.pid)).toBe(true)
  })

  it('never signals a point0-looking pid whose start time does not match the lock', async () => {
    const cwd = makeTmpDir('p0-time-')
    const dir = makeTmpDir('p0-time-stub-')
    // The command line matches (the script path contains "point0") but the lock says the orchestrator
    // was born an hour ago — a recycled PID from a long-dead tree.
    const scriptPath = nodePath.join(dir, 'point0-stub.js')
    const child = spawnKeepAlive(scriptPath, KEEP_ALIVE_SCRIPT)
    await writeTrackedLock(
      baseLock({
        pid: child.pid,
        cwd,
        ports: [],
        cli: scriptPath,
        pidStartedAt: new Date(Date.now() - 3_600_000).toISOString(),
      }),
    )
    const results = await stopAllDevTrees({ cwd })
    expect(results[0].stopped).toBe(false)
    expect(results[0].staleLockRemoved).toBe(true)
    expect(isProcessAlive(child.pid)).toBe(true)
  })

  it('SIGTERMs a verified live orchestrator and reports it stopped', async () => {
    const cwd = makeTmpDir('p0-live-')
    const dir = makeTmpDir('p0-live-stub-')
    const scriptPath = nodePath.join(dir, 'point0-stub.js')
    const child = spawnKeepAlive(scriptPath, KEEP_ALIVE_SCRIPT)
    await writeTrackedLock(baseLock({ pid: child.pid, cwd, ports: [], cli: scriptPath }))
    const results = await stopAllDevTrees({ cwd })
    expect(results[0].stopped).toBe(true)
    expect(results[0].orchestratorStopped).toBe(true)
    await child.exited
    expect(isProcessAlive(child.pid)).toBe(false)
    expect(readDevLock(cwd, [])).toBeUndefined()
  })

  it('leaves an unrelated process alone even when it sits on a recorded port', async () => {
    const cwd = makeTmpDir('p0-innocent-')
    const otherProjectDir = makeTmpDir('p0-innocent-other-')
    const port = getFreePort()
    const child = spawnKeepAlive(nodePath.join(otherProjectDir, 'their-server.js'), serverScript(port))
    await waitForPortBound(port)
    await writeTrackedLock(baseLock({ pid: await getDeadPid(), cwd, ports: [port] }))
    const results = await stopAllDevTrees({ cwd })
    expect(results[0].stopped).toBe(false)
    expect(results[0].staleLockRemoved).toBe(true)
    expect(results[0].orphansKilled).toEqual([])
    expect(isProcessAlive(child.pid)).toBe(true)
    expect(isPortBound(port)).toBe(true)
  })

  it('kills an orphaned dev child off a recorded port (its command carries the project cwd)', async () => {
    const cwd = makeTmpDir('p0-orphan-')
    const port = getFreePort()
    // The orphan's command line is `bun <script under the project cwd>` — exactly how a dev server child looks.
    const child = spawnKeepAlive(nodePath.join(cwd, 'src-server.js'), serverScript(port))
    await waitForPortBound(port)
    await writeTrackedLock(baseLock({ pid: await getDeadPid(), cwd, ports: [port] }))
    const results = await stopAllDevTrees({ cwd })
    expect(results[0].stopped).toBe(true)
    expect(results[0].orchestratorStopped).toBe(false)
    expect(results[0].orphansKilled).toEqual([child.pid])
    await child.exited
    expect(await waitFor(() => !isPortBound(port))).toBe(true)
  })
})

describe('dev lock dir candidates', () => {
  it('finds and removes a lock written before a nearer node_modules materialized (vite dep-optimizer case)', async () => {
    const base = makeTmpDir('p0-shift-')
    const cwd = nodePath.join(base, 'app')
    nodeFs.mkdirSync(cwd, { recursive: true })
    nodeFs.mkdirSync(nodePath.join(base, 'node_modules'), { recursive: true })
    const lock = baseLock({ pid: await getDeadPid(), cwd, ports: [4111] })
    const lockPath = await writeDevLock(lock)
    trackedLocks.push({ cwd, ports: [4111] })
    expect(lockPath.startsWith(nodePath.join(base, 'node_modules'))).toBe(true)
    // The app-local node_modules appears mid-session (vite's dep optimizer creates one for its .vite cache), shifting
    // the nearest-node_modules anchor. Reads must still find the lock at the outer level.
    nodeFs.mkdirSync(nodePath.join(cwd, 'node_modules'), { recursive: true })
    expect(readDevLock(cwd, [4111])).toEqual(lock)
    const results = await stopAllDevTrees({ cwd })
    expect(results).toHaveLength(1)
    expect(results[0].staleLockRemoved).toBe(true)
    expect(nodeFs.existsSync(lockPath)).toBe(false)
  })
})

describe('reapDevTree', () => {
  it('only touches the lock with the exact same ports', async () => {
    const cwd = makeTmpDir('p0-reap-')
    await writeTrackedLock(baseLock({ pid: await getDeadPid(), cwd, ports: [4101] }))
    await writeTrackedLock(baseLock({ pid: await getDeadPid(), cwd, ports: [4102] }))
    const result = await reapDevTree({ cwd, ports: [4101] })
    expect(result.staleLockRemoved).toBe(true)
    expect(readDevLock(cwd, [4101])).toBeUndefined()
    expect(readDevLock(cwd, [4102])).toBeDefined()
  })

  it('returns an empty result when there is no lock', async () => {
    const cwd = makeTmpDir('p0-reap-none-')
    const result = await reapDevTree({ cwd, ports: [4103] })
    expect(result.stopped).toBe(false)
    expect(result.staleLockRemoved).toBe(false)
    expect(result.orphansKilled).toEqual([])
  })
})

describe('killPort', () => {
  it('with graceMs lets the holder exit on SIGTERM (no SIGKILL needed)', async () => {
    const dir = makeTmpDir('p0-grace-')
    const port = getFreePort()
    const child = spawnKeepAlive(nodePath.join(dir, 'graceful-server.js'), serverScript(port))
    await waitForPortBound(port)
    const { killedPids } = await killPort([port], { verifyCommandMarkers: [dir], graceMs: 3000 })
    expect(killedPids).toEqual([child.pid])
    // The server script exits 0 on SIGTERM — a SIGKILL would surface as a signal instead.
    expect(await child.exited).toBe(0)
  })

  it('reports killedPids only for holders it actually killed', async () => {
    const dir = makeTmpDir('p0-verify-')
    const port = getFreePort()
    const child = spawnKeepAlive(nodePath.join(dir, 'spared-server.js'), serverScript(port))
    await waitForPortBound(port)
    const spared = await killPort([port], { verifyCommandMarkers: ['/no/such/marker/anywhere'] })
    expect(spared.killedPids).toEqual([])
    expect(isProcessAlive(child.pid)).toBe(true)
    const free = await killPort([getFreePort()], {})
    expect(free.killedPids).toEqual([])
  })
})
