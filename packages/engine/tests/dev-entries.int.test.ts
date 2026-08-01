import { mkdir, rm, writeFile } from 'node:fs/promises'
import nodePath from 'node:path'
import { afterAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { resolveDevEntries } from '../src/engine.js'
import { TestProcess } from './utils/process.js'

setDefaultTimeout(60000)

// A dev tree with TWO server entries, one of which is a one-shot program: it runs, prints, and exits 0. The contract is
// that a clean exit is a FINISHED entry, not a dead tree — dev keeps serving the other entry, says so, and re-runs the
// finished one when ITS OWN code changes.
//
// The harness is deliberately tiny: no project template, no build, no client, no browser and no fixed ports. The dev
// orchestrator is imported from source into a temp runner script, and the "entries" it starts are two hand-written bun
// scripts (the server one binds port 0 and writes the port it got). That is everything this contract needs, and it
// boots in a second instead of a minute.
const tempRoot = nodePath.resolve(__dirname, 'temp', 'dev-entries')
const engineSrcFromProject = '../../../../src/engine.js'

const processes: TestProcess[] = []

const writeProject = async ({
  id,
  entries,
  devEntries,
}: {
  id: string
  /** What the runner passes as `engine.dev({ entries })` — omitted entirely when undefined (the default resolution). */
  entries?: string[] | '*'
  /** The server config's `devEntries` option — omitted when undefined. */
  devEntries?: string | string[] | '*'
}): Promise<{ dir: string; runner: string; syncDep: string; portFile: string }> => {
  const dir = nodePath.resolve(tempRoot, id)
  await mkdir(dir, { recursive: true })
  const portFile = nodePath.join(dir, 'port.txt')
  await writeFile(
    nodePath.join(dir, 'main.server.ts'),
    `import { mainDep } from './main-dep.js'
const server = Bun.serve({ port: 0, fetch: () => new Response(mainDep) })
await Bun.write(${JSON.stringify(portFile)}, String(server.port))
// The orchestrator scrapes this exact marker to know the child bound its port.
console.info('Server started http://localhost:' + server.port)
`,
  )
  await writeFile(nodePath.join(dir, 'main-dep.ts'), `export const mainDep = 'MAIN_OK'\n`)
  await writeFile(
    nodePath.join(dir, 'sync.server.ts'),
    `import { syncMessage } from './sync-dep.js'
console.info(syncMessage)
`,
  )
  await writeFile(nodePath.join(dir, 'sync-dep.ts'), `export const syncMessage = 'SYNC_RAN_1'\n`)
  const entriesLine = entries === undefined ? '' : `entries: ${JSON.stringify(entries)}, `
  const devEntriesLine = devEntries === undefined ? '' : `, devEntries: ${JSON.stringify(devEntries)}`
  const runner = nodePath.join(dir, 'runner.ts')
  await writeFile(
    runner,
    `import { Engine } from '${engineSrcFromProject}'
const engine = Engine.create({
  file: import.meta.url,
  server: { scope: 'root', entry: { main: './main.server.ts', sync: './sync.server.ts' }${devEntriesLine} },
  clients: [],
} as never)
await engine.dev({ generateFiles: false, side: 'server', ${entriesLine}})
`,
  )
  return { dir, runner, syncDep: nodePath.join(dir, 'sync-dep.ts'), portFile }
}

const startDev = (runner: string): TestProcess => {
  const testProcess = TestProcess.spawn(['bun', 'run', runner], {
    cwd: nodePath.dirname(runner),
    env: { ...process.env, NODE_ENV: 'development' },
  })
  processes.push(testProcess)
  return testProcess
}

const countOf = (haystack: string, needle: string): number => haystack.split(needle).length - 1

/**
 * Poll until `fn` is true. Needed where a log follows a child's own output: the child prints, THEN exits, and only the
 * exit makes the orchestrator log — so asserting straight after the print races that gap.
 */
const waitUntil = async (fn: () => boolean, timeoutMs = 15000): Promise<void> => {
  const start = Date.now()
  while (!fn() && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

// Each test tears its own tree down as soon as it is done asserting — a dev tree left running keeps watching files and
// would compete with the next test for the machine. `afterAll` is the backstop for a test that threw.
afterAll(async () => {
  for (const testProcess of processes) {
    await testProcess.killTree()
  }
  await rm(tempRoot, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
})

describe('dev entries', () => {
  // The pure ladder behind `point0 dev`'s entry selection: explicit request → `devEntries` option → the single main
  // entry. Unit-level so the default is nailed down without booting anything.
  describe('resolveDevEntries', () => {
    it('defaults to the main entry, and to the first declared key when there is no main', () => {
      expect(resolveDevEntries({ declaredNames: ['main', 'sync'] })).toEqual(['main'])
      expect(resolveDevEntries({ declaredNames: ['sync', 'main'] })).toEqual(['main'])
      expect(resolveDevEntries({ declaredNames: ['worker', 'sync'] })).toEqual(['worker'])
      expect(resolveDevEntries({ declaredNames: [] })).toEqual([])
    })

    it('takes the configured devEntries when nothing is requested', () => {
      expect(resolveDevEntries({ configured: ['sync'], declaredNames: ['main', 'sync'] })).toEqual(['sync'])
      expect(resolveDevEntries({ configured: '*', declaredNames: ['main', 'sync'] })).toEqual(['main', 'sync'])
      // An empty list is not a choice — fall through to the default.
      expect(resolveDevEntries({ configured: [], declaredNames: ['main', 'sync'] })).toEqual(['main'])
      expect(resolveDevEntries({ configured: null, declaredNames: ['main', 'sync'] })).toEqual(['main'])
    })

    it('lets an explicit request win over the configured devEntries', () => {
      expect(resolveDevEntries({ requested: ['sync'], configured: '*', declaredNames: ['main', 'sync'] })).toEqual([
        'sync',
      ])
      expect(resolveDevEntries({ requested: '*', configured: ['sync'], declaredNames: ['main', 'sync'] })).toEqual([
        'main',
        'sync',
      ])
      // Paths are passed through untouched — `toEntryPath` resolves them.
      expect(resolveDevEntries({ requested: ['./scripts/sync.ts'], declaredNames: ['main'] })).toEqual([
        './scripts/sync.ts',
      ])
      // An empty request is no request.
      expect(resolveDevEntries({ requested: [], configured: ['sync'], declaredNames: ['main', 'sync'] })).toEqual([
        'sync',
      ])
    })
  })

  it('keeps dev alive when an entry exits 0, and re-runs it on a change in its own graph', async () => {
    const { runner, syncDep, portFile } = await writeProject({ id: 'finishes', entries: '*' })
    const dev = startDev(runner)

    // The one-shot entry ran and finished; the server entry booted. Neither is a teardown.
    await dev.waitOutput(['SYNC_RAN_1', '!Tearing down dev'], 30000)
    await dev.waitOutput(['Entry "sync" finished', '!Tearing down dev'], 30000)
    await dev.waitOutput(['Server started http://localhost:', '!Tearing down dev'], 30000)

    // The server child is genuinely still serving — not merely un-torn-down.
    const port = (await Bun.file(portFile).text()).trim()
    expect(await (await fetch(`http://localhost:${port}/`)).text()).toBe('MAIN_OK')

    expect(dev.output).not.toContain('Tearing down dev')
    expect(dev.output).not.toContain('Server failed to boot')
    expect(dev.process.exitCode).toBe(null)

    // A finished entry watches its OWN import graph and re-runs on a change there.
    await writeFile(syncDep, `export const syncMessage = 'SYNC_RAN_2'\n`)
    await dev.waitOutput(['Entry "sync" re-running...', '!Tearing down dev'], 30000)
    await dev.waitOutput(['SYNC_RAN_2', '!Tearing down dev'], 30000)
    await waitUntil(() => countOf(dev.output, 'Entry "sync" finished') === 2)
    expect(countOf(dev.output, 'Entry "sync" finished')).toBe(2)
    // ...and it is the finished entry alone that re-runs: the server child was never restarted.
    expect(countOf(dev.output, 'Server started http://localhost:')).toBe(1)
    expect(dev.output).not.toContain('Server failed to boot')
    expect(dev.process.exitCode).toBe(null)
    await dev.killTree()
  })

  it('starts only the main entry by default', async () => {
    const { runner } = await writeProject({ id: 'default' })
    const dev = startDev(runner)

    await dev.waitOutput(['Server started http://localhost:', '!Tearing down dev'], 30000)
    // Give the (unstarted) second entry every chance to print before asserting it never ran.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(dev.output).not.toContain('SYNC_RAN_1')
    expect(dev.output).not.toContain('Entry "sync" finished')
    await dev.killTree()
  })

  it('starts what the devEntries option asks for, by name or by path', async () => {
    // The path form resolves exactly like the `entry` record's own value, so the entry is recognised as the declared
    // `sync` (the log says so by name) rather than run as some unrelated file.
    const { runner } = await writeProject({ id: 'configured', devEntries: ['main', './sync.server.ts'] })
    const dev = startDev(runner)

    await dev.waitOutput(['Entry "sync" finished', '!Tearing down dev'], 30000)
    await dev.waitOutput(['Server started http://localhost:', '!Tearing down dev'], 30000)
    expect(dev.output).toContain('SYNC_RAN_1')
    await dev.killTree()
  })
})
