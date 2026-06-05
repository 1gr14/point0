import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * End-to-end tests for `@point0/create-app`.
 *
 * Each test scaffolds a real app from the template (one Bun-bundled, one Vite-bundled), generates its artifacts and
 * asserts `tsc` passes on it, then runs `point0 dev` and opens the home page in a real (headless) Chromium via
 * Playwright to assert it renders.
 *
 * No `bun install` on purpose — same approach as the engine's dev tests. The scaffolded app lives inside the workspace
 * (`tests/temp/...`), so its `workspace:*` / `catalog:` deps resolve up the monorepo's hoisted `node_modules`. Skipping
 * install also avoids running native postinstall binaries (prisma engines, etc.) that some endpoint-security setups
 * flag.
 */

const packageRoot = resolve(import.meta.dir, '..')
const cliPath = resolve(packageRoot, 'src/index.ts')
const tempDir = resolve(packageRoot, 'tests/temp')

setDefaultTimeout(120_000)

type Mode = { id: 'bun' | 'vite'; viteFlag: string; serverPort: number; clientPort: number }

// Distinct ports per mode; off 3000/3001 (local dev) and 3200-3299 (engine dev tests).
const MODES: Mode[] = [
  { id: 'bun', viteFlag: '--no-vite', serverPort: 3310, clientPort: 3311 },
  { id: 'vite', viteFlag: '--vite', serverPort: 3312, clientPort: 3313 },
]

type DevProcess = { proc: Bun.Subprocess; output: () => string }

function spawnDev(cwd: string): DevProcess {
  const chunks: Uint8Array[] = []
  const proc = Bun.spawn(['bun', 'run', 'dev'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
  })
  const collect = (stream: ReadableStream<Uint8Array> | number | undefined | null) => {
    if (stream && typeof stream !== 'number') {
      void stream.pipeTo(
        new WritableStream({
          write: (chunk) => {
            chunks.push(chunk)
          },
        }),
      )
    }
  }
  collect(proc.stdout)
  collect(proc.stderr)
  return { proc, output: () => new TextDecoder().decode(Buffer.concat(chunks)) }
}

async function waitForOutput(dev: DevProcess, needle: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (dev.output().includes(needle)) return
    await Bun.sleep(150)
  }
  throw new Error(`Timed out waiting for "${needle}".\n--- dev output ---\n${dev.output()}`)
}

async function getDescendantPids(rootPid: number): Promise<number[]> {
  const collected = new Set<number>()
  const queue = [rootPid]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) continue
    const result = await Bun.$`pgrep -P ${current}`.nothrow().quiet()
    if (result.exitCode !== 0) continue
    for (const child of result
      .text()
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)) {
      if (!collected.has(child)) {
        collected.add(child)
        queue.push(child)
      }
    }
  }
  return [...collected]
}

async function killTree(pid: number | undefined): Promise<void> {
  if (!pid) return
  const pids = [...(await getDescendantPids(pid)), pid].reverse()
  for (const target of pids) {
    await Bun.$`kill -9 ${target}`.nothrow().quiet()
  }
}

async function killPorts(ports: number[]): Promise<void> {
  const result = await Bun.$`lsof ${ports.flatMap((port) => ['-ti', `:${port}`])}`.nothrow().quiet()
  for (const pid of result
    .text()
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0)) {
    await Bun.$`kill -9 ${pid}`.nothrow().quiet()
  }
}

async function writeAppEnv(appDir: string, mode: Mode): Promise<void> {
  await writeFile(
    resolve(appDir, '.env'),
    [
      `SERVER_PORT=${mode.serverPort}`,
      `CLIENT_PORT=${mode.clientPort}`,
      `SERVER_URL=http://localhost:${mode.serverPort}`,
      'DATABASE_URL=file:./dev.db',
      'OPENAPI_CREDENTIALS=admin:admin',
      '',
    ].join('\n'),
  )
}

function run(cmd: string[], cwd: string, label: string): void {
  const result = Bun.spawnSync(cmd, { cwd, env: { ...process.env } })
  if (result.exitCode !== 0) {
    throw new Error(
      `${label} failed (exit ${result.exitCode}):\n${result.stdout.toString()}\n${result.stderr.toString()}`,
    )
  }
}

beforeAll(async () => {
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })
})

describe('create-app e2e', () => {
  afterAll(async () => {
    await Promise.all(MODES.map((mode) => killPorts([mode.serverPort, mode.clientPort])))
    await rm(tempDir, { recursive: true, force: true })
  })

  for (const mode of MODES) {
    test(`creates a ${mode.id} app and serves the home page in a browser`, async () => {
      const appName = `${mode.id}-app`
      const appDir = resolve(tempDir, appName)
      const serverUrl = `http://localhost:${mode.serverPort}`

      let dev: DevProcess | undefined
      try {
        // 1. Scaffold from the template via the real CLI (no install — deps resolve up the workspace).
        const scaffold = Bun.spawnSync(['bun', cliPath, appName, mode.viteFlag, '--no-install', '--no-interactive'], {
          cwd: tempDir,
          env: { ...process.env },
        })
        if (scaffold.exitCode !== 0) {
          throw new Error(`scaffold failed:\n${scaffold.stdout.toString()}\n${scaffold.stderr.toString()}`)
        }

        // The bundler-specific patching ran: vite gets a vite.config.ts, bun does not.
        expect(await Bun.file(resolve(appDir, 'vite.config.ts')).exists()).toBe(mode.id === 'vite')
        // Both keep the new bootstrap from the template.
        expect(await Bun.file(resolve(appDir, 'bunfig.toml')).exists()).toBe(true)
        expect(await Bun.file(resolve(appDir, 'src/preload.ts')).exists()).toBe(true)
        expect(await Bun.file(resolve(appDir, 'src/index.server.ts')).exists()).toBe(false)

        await writeAppEnv(appDir, mode)

        // 2. Generate the point0 artifacts and the prisma client, then assert the scaffolded app type-checks cleanly.
        run(['bun', 'run', 'generate'], appDir, `point0 generate (${mode.id})`)
        run(['bun', 'run', 'prisma:generate'], appDir, `prisma generate (${mode.id})`)
        const typecheck = Bun.spawnSync(['bun', 'run', 'types'], { cwd: appDir, env: { ...process.env } })
        if (typecheck.exitCode !== 0) {
          throw new Error(
            `type check failed (${mode.id}):\n${typecheck.stdout.toString()}\n${typecheck.stderr.toString()}`,
          )
        }
        expect(typecheck.exitCode).toBe(0)

        // 3. Start the dev server (point0 dev regenerates on startup, then serves).
        await killPorts([mode.serverPort, mode.clientPort])
        dev = spawnDev(appDir)
        await waitForOutput(dev, `started http://localhost:${mode.clientPort}`, 30_000)
        await waitForOutput(dev, `started http://localhost:${mode.serverPort}`, 30_000)

        // 4. SSR check: the server URL 302-redirects to the client dev server, which renders the page.
        const html = await fetch(serverUrl, { redirect: 'follow' }).then((response) => response.text())
        expect(html).toContain('Welcome to My App')

        // 5. Open it in a real browser and assert the rendered page.
        const { chromium } = await import('playwright')
        const browser = await chromium.launch()
        try {
          const page = await browser.newPage()
          await page.goto(serverUrl, { waitUntil: 'networkidle' })
          expect(await page.locator('body').textContent()).toContain('Welcome to My App!')
          expect(await page.title()).toBe('My App Forever!')
        } finally {
          await browser.close()
        }
      } finally {
        await killTree(dev?.proc.pid)
        await killPorts([mode.serverPort, mode.clientPort])
      }
    })
  }
})
